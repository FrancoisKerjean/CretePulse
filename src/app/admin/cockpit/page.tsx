// COCKPIT.EXE : launcher d'outils Kairos + radar lecture seule des outbounds.
// Aucun write, aucune server action. Un clic = la vraie page de l'outil.
// Auth = même secret/cookie que /admin/car-rental et /admin/flux (isCarAdmin),
// entrée via /admin/cockpit/auth?key= ; les liens /admin/* réutilisent le cookie.
// Ajouter/retirer un raccourci = éditer ZONES ci-dessous, rien d'autre.
import { notFound, redirect } from "next/navigation";
import { isCarAdmin } from "@/lib/car-admin-auth";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Shortcut = {
  icon: string;
  title: string;
  sub: string;
  href: string;
  external?: boolean;
};

const ZONES: { title: string; items: Shortcut[] }[] = [
  {
    title: "Analytics",
    items: [
      { icon: "📈", title: "Plausible — crete.direct", sub: "analytics.crete.direct", href: "https://analytics.crete.direct/crete.direct", external: true },
      { icon: "📈", title: "Plausible — kairosguest", sub: "kairosguest.com", href: "https://analytics.crete.direct/kairosguest.com", external: true },
      { icon: "📈", title: "Plausible — nov-ai.xyz", sub: "book /francois + /formation", href: "https://analytics.crete.direct/nov-ai.xyz", external: true },
      { icon: "📈", title: "Plausible — IEUF", sub: "iletaitunfut.com", href: "https://analytics.crete.direct/iletaitunfut.com", external: true },
    ],
  },
  {
    title: "crete.direct — Admin",
    items: [
      { icon: "≋", title: "FLUX_CRETE.EXE", sub: "stock touristes + capteurs", href: "/admin/flux" },
      { icon: "🚗", title: "CAR_ADMIN.EXE", sub: "demandes, devis, partenaires", href: "/admin/car-rental" },
      { icon: "⛵", title: "ACTIVITIES.EXE", sub: "demandes, devis, partenaires", href: "/admin/activities" },
    ],
  },
  {
    title: "Outils",
    items: [
      { icon: "🔍", title: "Search Console", sub: "crete.direct", href: "https://search.google.com/search-console?resource_id=sc-domain:crete.direct", external: true },
      { icon: "▲", title: "Vercel", sub: "déploiements", href: "https://vercel.com", external: true },
      { icon: "✉", title: "Resend", sub: "emails sortants / bounces", href: "https://resend.com/emails", external: true },
      { icon: "🐛", title: "Sentry", sub: "erreurs prod", href: "https://sentry.io", external: true },
    ],
  },
];

type OutboundStatus = {
  label: string;
  count: number;
  href?: string;
  alert?: boolean;
};

type OutboundPanel = {
  title: string;
  sub: string;
  href: string;
  total: number | null;
  statuses: OutboundStatus[];
  note?: string;
  error?: string;
};

type AffiliateProspect = {
  name: string | null;
  email: string | null;
  category: string | null;
  status: string | null;
  sent_at: string | null;
  updated_at: string | null;
};

const STATUS_ORDER = [
  "new",
  "queued",
  "sent",
  "followup_sent",
  "contacted",
  "replied",
  "converted",
  "inbound",
  "declined",
  "bounced",
  "optout",
  "skip",
];

function sortStatuses(statuses: OutboundStatus[]): OutboundStatus[] {
  return [...statuses].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a.label);
    const ib = STATUS_ORDER.indexOf(b.label);
    if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.label.localeCompare(b.label);
  });
}

async function loadPartnerPanel(opts: {
  table: "car_partners" | "activity_partners";
  title: string;
  sub: string;
  href: string;
}): Promise<OutboundPanel> {
  try {
    const { data, error } = await supabase
      .from(opts.table)
      .select("outreach_status, active")
      .limit(1000);
    if (error) throw error;

    const rows = (data ?? []) as { outreach_status?: string | null; active?: boolean | null }[];
    const byStatus = new Map<string, number>();
    let active = 0;
    for (const row of rows) {
      const status = row.outreach_status || "unknown";
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
      if (row.active) active++;
    }

    const statuses = sortStatuses(
      [...byStatus.entries()].map(([label, count]) => ({
        label,
        count,
        href: `${opts.href}?tab=partners&poutreach=${encodeURIComponent(label)}`,
        alert: label === "declined" || label === "bounced",
      })),
    );
    statuses.unshift({ label: "active", count: active, href: `${opts.href}?tab=partners&pactive=actifs` });

    return { title: opts.title, sub: opts.sub, href: opts.href, total: rows.length, statuses };
  } catch (e) {
    return {
      title: opts.title,
      sub: opts.sub,
      href: opts.href,
      total: null,
      statuses: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function loadAffiliatePanel(): Promise<{ panel: OutboundPanel; recent: AffiliateProspect[] }> {
  try {
    const { data, error } = await supabase
      .from("affiliate_prospects")
      .select("name, email, category, status, sent_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const rows = (data ?? []) as AffiliateProspect[];
    const byStatus = new Map<string, number>();
    for (const row of rows) {
      const status = row.status || "unknown";
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    }

    return {
      panel: {
        title: "Affiliés vitrine",
        sub: "affiliate_prospects · cold auto",
        href: "https://resend.com/emails",
        total: rows.length,
        statuses: sortStatuses(
          [...byStatus.entries()].map(([label, count]) => ({
            label,
            count,
            alert: label === "bounced" || label === "optout",
          })),
        ),
        note: "Pipeline VPS, détail brut dans Supabase/Resend.",
      },
      recent: rows.slice(0, 5),
    };
  } catch (e) {
    return {
      panel: {
        title: "Affiliés vitrine",
        sub: "affiliate_prospects · cold auto",
        href: "https://resend.com/emails",
        total: null,
        statuses: [],
        error: e instanceof Error ? e.message : String(e),
      },
      recent: [],
    };
  }
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
  });
}

// Horloge taskbar, seul JS de la page (décoratif, aucun accès réseau).
// Contraintes hydratation React : pas d'écriture avant hydratation (mismatch #418)
// et re-résolution de l'élément à chaque tick (le re-render remplace les nœuds).
const CLOCK_JS = `setInterval(function(){var c=document.getElementById('clk');if(c){var d=new Date();c.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}},1000);`;

export default async function CockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : undefined;
  if (key) {
    if (await isCarAdmin(key)) redirect(`/admin/cockpit/auth?key=${encodeURIComponent(key)}`);
    notFound();
  }
  if (!(await isCarAdmin())) notFound();

  const [carPanel, activityPanel, affiliateData] = await Promise.all([
    loadPartnerPanel({
      table: "car_partners",
      title: "Loueurs voiture",
      sub: "car_partners · outreach_status",
      href: "/admin/car-rental",
    }),
    loadPartnerPanel({
      table: "activity_partners",
      title: "Activités",
      sub: "activity_partners · outreach_status",
      href: "/admin/activities",
    }),
    loadAffiliatePanel(),
  ]);
  const outboundPanels = [carPanel, activityPanel, affiliateData.panel];

  return (
    <main>
      <div className="desktop">
        {ZONES.map((zone) => (
          <div className="zone" key={zone.title}>
            <h2>{zone.title}</h2>
            <div className="icons">
              {zone.items.map((s) => (
                <a
                  className="icon"
                  key={s.href}
                  href={s.href}
                  {...(s.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <span className="px">{s.icon}</span>
                  <span className="lbl">
                    <b>{s.title}</b>
                    <span>{s.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="radar" aria-labelledby="outbound-title">
        <div className="radar-titlebar" id="outbound-title">
          OUTBOUND_RADAR.EXE <span>lecture seule</span>
        </div>
        <div className="radar-body">
          <div className="radar-grid">
            {outboundPanels.map((panel) => (
              <article className="panel" key={panel.title}>
                <div className="panel-head">
                  <a href={panel.href}>{panel.title}</a>
                  <span>{panel.sub}</span>
                </div>
                {panel.error ? (
                  <p className="err">Erreur lecture : {panel.error}</p>
                ) : (
                  <>
                    <div className="total">
                      <b>{panel.total ?? "-"}</b>
                      <span>prospects</span>
                    </div>
                    <div className="badges">
                      {panel.statuses.map((s) =>
                        s.href ? (
                          <a className={s.alert ? "badge alert" : "badge"} href={s.href} key={s.label}>
                            {s.label} <b>{s.count}</b>
                          </a>
                        ) : (
                          <span className={s.alert ? "badge alert" : "badge"} key={s.label}>
                            {s.label} <b>{s.count}</b>
                          </span>
                        ),
                      )}
                    </div>
                    {panel.note ? <p className="note">{panel.note}</p> : null}
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="recent">
            <h3>Derniers affiliés touchés</h3>
            {affiliateData.recent.length > 0 ? (
              <table>
                <tbody>
                  {affiliateData.recent.map((p) => (
                    <tr key={`${p.email}-${p.updated_at}`}>
                      <td>{p.name || p.email || "prospect"}</td>
                      <td>{p.category || "-"}</td>
                      <td>{p.status || "-"}</td>
                      <td>{fmtDate(p.sent_at || p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="note">Aucun détail disponible côté cockpit.</p>
            )}
          </div>

          <div className="ops">
            <a href="https://resend.com/emails" target="_blank" rel="noreferrer">Resend emails</a>
            <a href="https://app.supabase.com" target="_blank" rel="noreferrer">Supabase tables</a>
            <span>Backlinks institutionnels : VPS /opt/backlink-outreach, pas encore branché en table cockpit.</span>
          </div>
        </div>
      </section>

      <div className="win">
        <div className="tbar">
          COCKPIT.EXE — À propos <span className="sp" />
          <span className="wbtn">_</span>
          <span className="wbtn">□</span>
          <span className="wbtn">×</span>
        </div>
        <div className="body">
          <p>
            <b>Launcher + radar.</b> Un clic = la vraie page de l&apos;outil.
          </p>
          <p>
            Cookie posé pour 30 j : les liens <code>/admin/*</code> s&apos;ouvrent sans ré-auth.
            Modifier les raccourcis = éditer <code>ZONES</code> dans <code>page.tsx</code>.
          </p>
        </div>
      </div>

      <div className="taskbar">
        <span className="start">▦ Démarrer</span>
        <span className="task">COCKPIT.EXE</span>
        {/* rempli par CLOCK_JS avant hydratation ; suppress = React ne l'écrase pas */}
        <span className="clock" id="clk" suppressHydrationWarning />
      </div>
      <script dangerouslySetInnerHTML={{ __html: CLOCK_JS }} />
    </main>
  );
}
