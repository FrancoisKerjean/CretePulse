// Échéances de l'acompte voiture, toutes les 15 minutes : libère (donc
// rembourse) les réservations que le loueur n'a pas confirmées à temps, le
// rappelle à mi-délai, finit les remboursements qu'un crash a laissés à
// moitié faits, et rapproche avec Stripe les paiements restés pending_payment
// (webhook completed ou expired perdu) : voir reconcilePendingDeposit.
//
// Un verrou pending_payment SANS session (fonction tuée entre le verrou et
// l'écriture de la session) est libéré quand sa date (booking_locked_at) a
// plus de 35 min : plus jeune, la création est peut-être en cours. Un verrou
// sans date (posé avant la migration 20261127) n'est pas touché.
// Volontairement sans CAR_CATALOGUE_ENABLED : une réservation déjà payée doit
// être traitée même si l'interrupteur est coupé.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertCron } from "@/lib/cron-auth";
import { notifyOps } from "@/lib/ops-notify";
import {
  releaseBooking, resumeClaimedRefund, remindPartner, reconcilePendingDeposit, releaseStaleLock, alertUnreadableDeposit,
} from "@/lib/car-deposit-server";
import { reminderDueMs, DEPOSIT_SWEEP_AGE_MS } from "@/lib/car-deposit";

export const dynamic = "force-dynamic";

// SHORTCUT: 50 lignes par passage, au-delà le reste attend 15 min ; passer à une pagination si une saison dépasse 50 demandes en attente.
const BATCH = 50;
/** Une prise de main plus jeune que ça est peut-être encore en vol : on n'y touche pas. */
const STUCK_MIN_AGE_MS = 15 * 60_000;
const ADMIN_URL = "https://crete.direct/admin/car-rental";

interface DueRow {
  id: number;
  booking_session_id?: string | null;
  booking_paid_at?: string | null;
  confirm_deadline_at?: string | null;
}

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function read(label: string, query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<DueRow[]> {
  const { data, error } = await query;
  if (error) throw new Error(`lecture ${label} refusée par la base: ${error.message}`);
  return (data ?? []) as DueRow[];
}

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const counts = { released: 0, reminded: 0, resumed: 0, reconciled: 0, unlocked: 0, failed: 0 };

  // Une ligne qui lève ne doit pas arrêter les suivantes : comptée, signalée.
  const fail = async (what: string, id: number, err: unknown) => {
    counts.failed++;
    console.error(`[cron/car-deposit-deadline] ${what}`, id, err);
    await notifyOps({
      title: `Acompte voiture : échéance non traitée (${what})`,
      lines: [`demande ${id}`, errText(err)],
      action: "le prochain passage (15 min) retentera ; sinon voir l'admin",
      url: ADMIN_URL,
    });
  };

  const table = () => supabaseAdmin.from("car_requests");
  try {
    const expired = await read("des échéances", table()
      .select("id")
      .eq("booking_status", "awaiting_partner")
      .lt("confirm_deadline_at", nowIso)
      .order("confirm_deadline_at", { ascending: true })
      .limit(BATCH));
    const waiting = await read("des rappels", table()
      .select("id, booking_paid_at, confirm_deadline_at")
      .eq("booking_status", "awaiting_partner")
      .is("confirm_reminded_at", null)
      .gt("confirm_deadline_at", nowIso)
      .order("confirm_deadline_at", { ascending: true })
      .limit(BATCH));
    const stuck = await read("des reprises", table()
      .select("id")
      .eq("booking_status", "refunded")
      .is("refund_id", null)
      .lt("cancelled_at", new Date(nowMs - STUCK_MIN_AGE_MS).toISOString())
      .order("cancelled_at", { ascending: true })
      .limit(BATCH));
    const pending = await read("des paiements ouverts", table()
      .select("id, booking_session_id")
      .eq("booking_status", "pending_payment")
      .not("booking_session_id", "is", null)
      .order("id", { ascending: true })
      .limit(BATCH));
    const unsessioned = await read("des verrous sans session", table()
      .select("id")
      .eq("booking_status", "pending_payment")
      .is("booking_session_id", null)
      .lt("booking_locked_at", new Date(nowMs - DEPOSIT_SWEEP_AGE_MS).toISOString())
      .order("booking_locked_at", { ascending: true })
      .limit(BATCH));

    for (const r of expired) {
      try {
        const out = await releaseBooking(r.id, "partner_timeout", nowMs);
        if (out === "refunded") counts.released++;
        else if (out === "refund_failed") counts.failed++;
      } catch (err) {
        await fail("libération", r.id, err);
      }
    }
    for (const r of waiting) {
      if (!r.booking_paid_at || !r.confirm_deadline_at) continue;
      if (nowMs < reminderDueMs(Date.parse(r.booking_paid_at), Date.parse(r.confirm_deadline_at))) continue;
      try {
        const out = await remindPartner(r.id, nowMs);
        if (out === "reminded") counts.reminded++;
        else if (out === "reminder_failed") counts.failed++;
      } catch (err) {
        await fail("rappel", r.id, err);
      }
    }
    for (const r of stuck) {
      try {
        const out = await resumeClaimedRefund(r.id, nowMs);
        if (out === "refunded") counts.resumed++;
        else if (out === "refund_failed") counts.failed++;
      } catch (err) {
        await fail("reprise", r.id, err);
      }
    }
    for (const r of pending) {
      try {
        const out = await reconcilePendingDeposit(r.id, r.booking_session_id as string, nowMs);
        if (out.state === "paid" || out.state === "released") counts.reconciled++;
        // Stripe illisible : rien écrit, le passage suivant retente. Au-delà
        // d'une heure de refus, une alerte ops, une seule (alertUnreadableDeposit).
        else if (out.state === "unreadable") {
          counts.failed++;
          await alertUnreadableDeposit(r.id, r.booking_session_id as string, nowMs);
        }
      } catch (err) {
        await fail("rapprochement", r.id, err);
      }
    }
    for (const r of unsessioned) {
      try {
        // false : un passage concurrent l'a déjà libéré, ou la session vient d'être écrite.
        if (await releaseStaleLock(r.id, nowMs)) counts.unlocked++;
      } catch (err) {
        await fail("verrou sans session", r.id, err);
      }
    }
  } catch (err) {
    // Lecture refusée : rien n'a été fait, le passage suivant recommence.
    console.error("[cron/car-deposit-deadline]", err);
    await notifyOps({
      title: "Acompte voiture : le cron des échéances n'a pas pu lire la base",
      lines: [errText(err)],
      action: "le prochain passage (15 min) retentera",
      url: ADMIN_URL,
    });
    return NextResponse.json({ ok: false, ...counts }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...counts });
}
