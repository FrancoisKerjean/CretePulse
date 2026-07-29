// Versement differe aux loueurs. Une passe quotidienne : chaque location payee
// dont l'echeance est atteinte declenche le PAYOUT du compte du loueur.
//
// L'argent est deja chez lui depuis le paiement (charge de destination) ; il est
// simplement bloque, son compte etant en versement `manual`. On ne transfere
// donc rien, on libere.
//
// L'echeance vaut la fermeture du droit au remboursement (booking-policy) : au
// moment ou l'argent part, le client ne peut plus etre rembourse. Aucune reprise
// de fonds n'est donc jamais necessaire.
//
// ⛔ Cette route est la SEULE du tunnel a exiger Stripe Connect pour tourner :
// `transfers.create` a besoin d'un compte connecte chez le loueur.
//
// Plan : docs/superpowers/plans/2026-07-29-car-rental-tunnel-voyageur.md
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { shouldTransferNow } from "@/lib/booking-policy";
import { bookingBreakdownCents } from "@/lib/car-booking";
import { stripeLogFields } from "@/lib/stripe-errors";

const enabled = (): boolean => process.env.CAR_BOOKING_ENABLED === "on";

interface Row {
  id: number;
  quoted_price: number | null;
  date_from: string;
  transfer_id: string | null;
  cancelled_at: string | null;
  car_partners: {
    name: string | null;
    commission: number | null;
    stripe_connect_account_id: string | null;
  } | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!enabled()) return NextResponse.json({ ok: true, disabled: true });

  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, quoted_price, date_from, transfer_id, cancelled_at, car_partners!inner(name, commission, stripe_connect_account_id)",
    )
    .eq("booking_status", "paid")
    .is("transfer_id", null)
    .lte("transfer_due_at", new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  let transferred = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of (data ?? []) as unknown as Row[]) {
    // Le filtre SQL est un pre-selecteur ; la regle fait foi cote code, une
    // seule fois, dans booking-policy.
    if (
      !shouldTransferNow({
        dateFrom: row.date_from,
        now,
        cancelledAt: row.cancelled_at,
        transferId: row.transfer_id,
      })
    ) {
      skipped++;
      continue;
    }

    const destination = row.car_partners?.stripe_connect_account_id;
    if (!destination) {
      // Le loueur n'a pas fini son onboarding : on garde les fonds et on le
      // signale. Ne pas faire echouer la passe pour les autres.
      console.error("[cron/car-transfers] loueur sans compte de versement", {
        requestId: row.id,
        partner: row.car_partners?.name,
      });
      skipped++;
      continue;
    }

    // Montant deja credite au loueur a l'encaissement : total moins la
    // commission et l'option, prelevees en application fee.
    const { partnerPayoutCents } = bookingBreakdownCents({
      quotedPriceEur: Number(row.quoted_price) || 0,
      hasOption: false,
      partnerRate: Number(row.car_partners?.commission) || 0,
    });

    try {
      // `stripeAccount` : on agit AU NOM du loueur pour liberer son propre
      // solde. C'est son argent, on ne fait que lever le blocage.
      const payout = await stripeClient().payouts.create(
        {
          amount: partnerPayoutCents,
          currency: "eur",
          metadata: { car_request_id: String(row.id), brand: "crete.direct" },
        },
        { stripeAccount: destination },
      );
      await supabaseAdmin
        .from("car_requests")
        .update({
          transfer_id: payout.id,
          transferred_at: new Date().toISOString(),
          booking_status: "transferred",
        })
        .eq("id", row.id);
      transferred++;
    } catch (err) {
      // Rien n'est ecrit : la ligne reste `paid` et la passe suivante la
      // reprendra. Un versement manque se rattrape, un versement fantome non.
      console.error("[cron/car-transfers] versement refuse", {
        requestId: row.id,
        ...stripeLogFields(err),
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, transferred, failed, skipped });
}
