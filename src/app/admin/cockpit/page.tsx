// COCKPIT.EXE : launcher d'outils Kairos, lecture seule absolue (aucun fetch,
// aucune donnée, aucune server action). Un clic = la vraie page de l'outil.
// Auth = même secret/cookie que /admin/car-rental et /admin/flux (isCarAdmin),
// entrée via /admin/cockpit/auth?key= ; les liens /admin/* réutilisent le cookie.
// Ajouter/retirer un raccourci = éditer ZONES ci-dessous, rien d'autre.
import { notFound, redirect } from "next/navigation";
import { isCarAdmin } from "@/lib/car-admin-auth";

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

      <div className="win">
        <div className="tbar">
          COCKPIT.EXE — À propos <span className="sp" />
          <span className="wbtn">_</span>
          <span className="wbtn">□</span>
          <span className="wbtn">×</span>
        </div>
        <div className="body">
          <p>
            <b>Launcher, pas dashboard.</b> Un clic = la vraie page de l&apos;outil.
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
