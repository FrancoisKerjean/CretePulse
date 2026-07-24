import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SLUG = "/enquete/paradoxe-tourisme-crete";
type L = "fr" | "en" | "de" | "el";
const SUPPORTED: L[] = ["fr", "en", "de", "el"];
const pick = (locale: string): L => (SUPPORTED.includes(locale as L) ? (locale as L) : "en");

const META: Record<L, { title: string; description: string }> = {
  fr: { title: "Plus de touristes, moins d'argent : le paradoxe de l'été crétois 2026 | crete.direct", description: "La Crète accueille plus de visiteurs que jamais en 2026. Pourtant, les professionnels du tourisme constatent que les revenus ne suivent pas. Enquête et données." },
  en: { title: "More tourists, less money: the paradox of the Cretan summer 2026 | crete.direct", description: "Crete is welcoming more visitors than ever in 2026. Yet tourism professionals are finding that revenues are not following. Investigation and data." },
  de: { title: "Mehr Touristen, weniger Geld: das Paradox des kretischen Sommers 2026 | crete.direct", description: "Kreta empfängt 2026 mehr Besucher als je zuvor. Und doch stellen die Tourismusbetriebe fest, dass die Einnahmen nicht mithalten. Recherche und Daten." },
  el: { title: "Περισσότεροι τουρίστες, λιγότερα χρήματα : το παράδοξο του κρητικού καλοκαιριού 2026 | crete.direct", description: "Η Κρήτη υποδέχεται περισσότερους επισκέπτες από ποτέ το 2026. Κι όμως, οι επαγγελματίες του τουρισμού διαπιστώνουν ότι τα έσοδα δεν ακολουθούν. Έρευνα και δεδομένα." },
};

const ARTICLE_CSS = `
#cd-enq{
    --aegean:#0B5E78; --lagoon:#00C2D4; --lagoon-d:#03A7B7;
    --sun:#FFC83D; --sun-d:#F0B11F; --terra:#ED7A5C; --terra-d:#D9613F;
    --calm:#15C172; --calm-d:#0FA862;
    --ink:#0B3954; --ink-soft:#3C6178;
    --sand:#FFF6E5; --sand-2:#FFEFCF; --card:#FFFFFF;
    --shadow:6px 6px 0 var(--ink); --shadow-sm:4px 4px 0 var(--ink);
  }
  #cd-enq *{box-sizing:border-box;margin:0;padding:0}
  #cd-enq{
    font-family:'Baloo 2',system-ui,sans-serif;background:var(--sand);color:var(--ink);
    line-height:1.62;-webkit-font-smoothing:antialiased;padding:0 0 60px;
    background-image:radial-gradient(circle at 12% 6%,rgba(0,194,212,.07),transparent 30%),
                     radial-gradient(circle at 88% 40%,rgba(255,200,61,.09),transparent 32%);
  }
  #cd-enq .wrap{max-width:820px;margin:0 auto;padding:0 24px}

  #cd-enq .topbar{background:var(--ink);display:flex;justify-content:center;gap:10px;padding:11px;align-items:center}
  #cd-enq .topbar .brand{font-weight:800;color:#fff;font-size:16px;letter-spacing:.01em}
  #cd-enq .topbar .brand span{color:var(--sun)}
  #cd-enq .topbar .sec{color:#bfe6ef;font-size:13px;font-weight:600}

  #cd-enq header{position:relative;padding:40px 0 20px;overflow:hidden}
  #cd-enq .badge-line{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap}
  #cd-enq .pill{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:3px solid var(--ink);
    border-radius:100px;padding:6px 15px;font-weight:700;font-size:12.5px;box-shadow:var(--shadow-sm)}
  #cd-enq .pill .dot{width:9px;height:9px;border-radius:50%;background:var(--terra)}
  #cd-enq .pill.brand{background:var(--lagoon);color:#fff}
  #cd-enq .goat{position:absolute;top:26px;right:6px;width:104px;height:104px;animation:cd-enq-bob 4s ease-in-out infinite}
  @keyframes cd-enq-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(1deg)}}
  #cd-enq h1{font-size:clamp(30px,5.2vw,50px);font-weight:800;line-height:1.05;letter-spacing:-.01em;max-width:20ch;margin-top:6px}
  #cd-enq h1 .hl{background:var(--sun);border-radius:8px;padding:0 .16em;box-shadow:3px 3px 0 var(--ink);display:inline-block;transform:rotate(-1.2deg)}
  #cd-enq .deck{margin-top:22px;background:var(--card);border:3px solid var(--ink);border-radius:20px;
    padding:20px 24px;box-shadow:var(--shadow);position:relative}
  #cd-enq .deck .tag{position:absolute;top:-15px;left:22px;background:var(--terra);color:#fff;border:3px solid var(--ink);
    border-radius:100px;padding:3px 14px;font-size:11.5px;font-weight:800;letter-spacing:.05em;box-shadow:var(--shadow-sm)}
  #cd-enq .deck p{font-size:17px;font-weight:500}
  #cd-enq .byline{margin-top:14px;font-size:13px;color:var(--ink-soft);font-weight:600}

  #cd-enq .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:28px 0 8px}
  #cd-enq .stat{background:var(--card);border:3px solid var(--ink);border-radius:18px;padding:16px 18px;box-shadow:var(--shadow-sm)}
  #cd-enq .stat .n{font-size:30px;font-weight:800;line-height:1}
  #cd-enq .stat.a .n{color:var(--lagoon-d)} #cd-enq .stat.b .n{color:var(--terra-d)}
  #cd-enq .stat.c .n{color:var(--sun-d)} #cd-enq .stat.d .n{color:var(--aegean)}
  #cd-enq .stat .l{font-size:13px;font-weight:600;color:var(--ink-soft);margin-top:7px}

  #cd-enq article{font-size:16.5px}
  #cd-enq article h2{font-size:26px;font-weight:800;margin:34px 0 6px;line-height:1.12}
  #cd-enq article h2 .u{background:linear-gradient(transparent 62%,var(--sun) 62%);padding:0 2px}
  #cd-enq article p{margin:12px 0;font-weight:500}
  #cd-enq article strong{color:var(--aegean);font-weight:700}

  #cd-enq .quote{background:var(--aegean);color:#fff;border:3px solid var(--ink);border-radius:20px;padding:22px 26px;margin:22px 0;box-shadow:var(--shadow);position:relative}
  #cd-enq .quote p{font-size:19px;font-weight:600;margin:0}
  #cd-enq .quote .who{font-size:13.5px;color:#bfe6ef;font-weight:600;margin-top:10px}

  #cd-enq .exclusif{background:var(--sand-2);border:3px solid var(--ink);border-radius:22px;padding:24px 26px;margin:26px 0;box-shadow:var(--shadow)}
  #cd-enq .exclusif .head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
  #cd-enq .exclusif .chip{background:var(--calm);color:#fff;border:2px solid var(--ink);border-radius:100px;padding:3px 12px;font-size:11.5px;font-weight:800;letter-spacing:.04em}
  #cd-enq .exclusif h3{font-size:21px;font-weight:800}
  #cd-enq .bars{margin:16px 0 6px}
  #cd-enq .bar{display:grid;grid-template-columns:130px 1fr 58px;align-items:center;gap:10px;margin:8px 0}
  #cd-enq .bar .lb{font-size:13.5px;font-weight:700}
  #cd-enq .bar .tk{background:#fff;border:2px solid var(--ink);border-radius:8px;height:22px;overflow:hidden}
  #cd-enq .bar .fl{height:100%;display:block}
  #cd-enq .bar .vv{font-size:13.5px;font-weight:800;text-align:right}

  #cd-enq .tips{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:16px 0}
  #cd-enq .tip{background:var(--card);border:3px solid var(--ink);border-radius:18px;padding:16px 18px;box-shadow:var(--shadow-sm)}
  #cd-enq .tip .ico{font-size:24px}
  #cd-enq .tip h4{font-size:16px;font-weight:800;margin:6px 0 2px}
  #cd-enq .tip p{font-size:13.5px;color:var(--ink-soft);font-weight:600;margin:0}

  #cd-enq /* SUPPORT */
  .support{background:var(--sun);border:3px solid var(--ink);border-radius:22px;padding:24px 26px;margin:30px 0;box-shadow:var(--shadow);display:flex;align-items:center;gap:22px;flex-wrap:wrap}
  #cd-enq .support .txt{flex:1;min-width:240px}
  #cd-enq .support h3{font-size:22px;font-weight:800;margin-bottom:4px}
  #cd-enq .support p{font-size:15px;font-weight:600;color:var(--ink);margin:0}
  #cd-enq .support a{display:inline-block;background:var(--ink);color:#fff;font-weight:800;font-size:16px;
    border:3px solid var(--ink);border-radius:100px;padding:12px 26px;text-decoration:none;box-shadow:4px 4px 0 rgba(11,57,84,.35);white-space:nowrap}
  #cd-enq .support a:hover{background:var(--aegean)}

  #cd-enq /* NOVAI AD */
  .adnovai{background:var(--ink);color:#fff;border:3px solid var(--ink);border-radius:22px;padding:26px 28px;margin:34px 0;box-shadow:var(--shadow);position:relative;overflow:hidden}
  #cd-enq .adnovai::after{content:"";position:absolute;right:-40px;bottom:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(0,194,212,.35),transparent 70%)}
  #cd-enq .adnovai .sp{position:relative;z-index:2}
  #cd-enq .adnovai .spon{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7fbecf;font-weight:700}
  #cd-enq .adnovai .logo{font-size:26px;font-weight:800;margin:6px 0 4px}
  #cd-enq .adnovai .logo b{color:var(--lagoon)}
  #cd-enq .adnovai .tl{font-size:17px;font-weight:600;max-width:46ch}
  #cd-enq .adnovai p{font-size:14px;color:#cfe6ee;margin:10px 0 0;max-width:52ch;font-weight:500}
  #cd-enq .adnovai .cta{display:inline-block;margin-top:16px;background:var(--sun);color:var(--ink);font-weight:800;
    border:3px solid #000;border-radius:100px;padding:9px 22px;font-size:15px;box-shadow:4px 4px 0 rgba(0,0,0,.4);text-decoration:none}

  #cd-enq footer{text-align:center;margin-top:40px;padding-top:24px}
  #cd-enq footer .fb{font-weight:800;font-size:19px}
  #cd-enq footer .fb span{color:var(--terra-d)}
  #cd-enq footer p{font-size:13px;color:var(--ink-soft);font-weight:600;margin-top:6px}
  #cd-enq .src{font-size:12px;color:var(--ink-soft);font-weight:500;margin-top:18px;line-height:1.5}

  @media(max-width:620px){#cd-enq .stats, #cd-enq .tips{grid-template-columns:1fr}#cd-enq .bar{grid-template-columns:96px 1fr 50px}#cd-enq .goat{width:78px;top:20px}}
`;

const BODY: Record<L, string> = {
  fr: `
<header>
  <div class="wrap" style="position:relative">
    <svg class="goat" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="30" ry="7" fill="#0B3954" opacity=".12"/>
      <path d="M44 30 C30 18 22 26 26 40 C29 50 40 50 46 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M76 30 C90 18 98 26 94 40 C91 50 80 50 74 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 52 C40 34 52 26 60 26 C68 26 80 34 80 52 C80 72 70 84 60 84 C50 84 40 72 40 52Z" fill="#FFE9BF" stroke="#0B3954" stroke-width="4.5"/>
      <path d="M48 70 C52 80 68 80 72 70 L70 86 C66 92 54 92 50 86 Z" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="52" cy="56" r="4.6" fill="#0B3954"/><circle cx="68" cy="56" r="4.6" fill="#0B3954"/>
      <circle cx="53.4" cy="54.6" r="1.5" fill="#fff"/><circle cx="69.4" cy="54.6" r="1.5" fill="#fff"/>
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#ED7A5C" stroke="#0B3954" stroke-width="3"/>
      <path d="M58 86 C58 94 56 100 53 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 86 C62 94 64 100 67 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
    </svg>

    <div class="badge-line">
      <span class="pill"><span class="dot"></span>Enquête · Saison 2026</span>
      <span class="pill brand">crete.direct</span>
    </div>

    <h1>Plus de visiteurs que jamais. Et des commerçants qui <span class="hl">gagnent moins</span>.</h1>

    <div class="deck">
      <span class="tag">LE PARADOXE</span>
      <p>En 2026, la Crète accueille 13,8 % de visiteurs en plus, un record absolu. Au même moment, restaurateurs, loueurs et petits commerçants constatent l'inverse de ce que promettent ces chiffres : il rentre moins d'argent qu'avant. Comment le tourisme peut-il grimper et les revenus locaux baisser en même temps ? Enquête, chiffres à l'appui.</p>
    </div>
    <div class="byline">Par la rédaction crete.direct · 3 juillet 2026 · Lecture 4 min</div>
  </div>
</header>

<div class="wrap">

  <div class="stats">
    <div class="stat a"><div class="n">+13,8 %</div><div class="l">de visiteurs internationaux en Crète (janvier à mai 2026), la plus forte hausse de toute la Grèce</div></div>
    <div class="stat b"><div class="n">-20 %</div><div class="l">de recettes touristiques britanniques en Crète, alors même que les visiteurs sont plus nombreux</div></div>
    <div class="stat c"><div class="n">125-150 M€</div><div class="l">le nouveau resort Ikos Kissamos, plus gros investissement hôtelier de l'histoire de l'île, ouvert en avril 2026</div></div>
    <div class="stat d"><div class="n">-43 %</div><div class="l">l'écart de prix entre la Crète de l'Est, restée accessible, et le reste de l'île</div></div>
  </div>

  <article>

    <h2>Un été record, <span class="u">sur le papier</span></h2>
    <p>Les chiffres donnent le vertige. De janvier à mai 2026, la Crète a accueilli <strong>1,15 million de visiteurs internationaux</strong>, soit 13,8 % de plus qu'en 2025. C'est la plus forte hausse de toutes les régions grecques, près de trois fois la moyenne nationale, qui plafonne à 5 %. L'ouest de l'île mène la danse : Chania grimpe de 20,9 %, Héraklion de 11,3 %.</p>
    <p>Vu d'en haut, l'année est historique. L'île n'a jamais autant attiré. Le problème n'est donc pas le nombre de touristes. Il est ailleurs.</p>

    <h2>Alors pourquoi <span class="u">ça coince</span> ?</h2>
    <p>Parce que remplir les avions ne remplit plus les caisses. Le marché britannique en est l'exemple parfait : les visiteurs sont plus nombreux (<strong>+7,6 %</strong>), mais leurs dépenses en Crète ont, elles, chuté de <strong>20 %</strong>. Côté allemand, premier marché de l'île, même contradiction : les arrivées progressent, mais les recettes reculent de <strong>10,5 %</strong>.</p>
    <p>La cause tient en deux mots : <strong>séjours plus courts</strong>. Les touristes dépensent un peu plus par jour, 28 % de plus qu'en 2019, mais ils restent moins longtemps. Du coup, la dépense totale d'un voyage stagne autour de 620 euros pendant que le nombre de nuits fond. Moins de jours sur place, c'est moins de dîners, moins de balades, moins d'achats. Mécaniquement, l'argent qui irrigue le local se raréfie.</p>

    <h2>La vague du <span class="u">tout compris</span></h2>
    <p>Et il y a plus profond. En 2026, la Crète bascule vers l'hôtellerie tout compris haut de gamme. En avril a ouvert <strong>Ikos Kissamos</strong>, un resort à 125 ou 150 millions d'euros, le plus gros investissement hôtelier de toute l'histoire crétoise. Le Rosewood arrive à Elounda, le groupe Allsun monte cinq hôtels de luxe. Sept des quinze meilleurs resorts tout compris d'Europe sont aujourd'hui grecs, et les réservations de ce type ont bondi de <strong>35 % en deux ans</strong>.</p>
    <p>Le principe est imparable pour l'hôtel : le client paie tout d'avance, mange, boit et se divertit sans jamais franchir la grille. Mais pour la taverne du village ou le loueur de scooters, c'est un visiteur invisible. Chaque euro laissé au buffet est un euro qui ne rejoint jamais le commerce du coin. Les seuls à voir leur caisse se remplir ? Les supermarchés, où les vacanciers font le plein de snacks et de boissons à consommer au balcon de leur chambre.</p>

    <p>Le manque à gagner est vertigineux. Selon la vice-gouvernance au tourisme de Crète, les sommes laissées au commerce local ont fondu de <strong>30 % en deux ans</strong>, près d'<strong>un milliard d'euros</strong> évaporés, alors même que les compteurs d'arrivées battent des records.</p>

    <div class="quote">
      <p>« Ce qui compte, ce n'est pas le nombre de visiteurs, mais l'argent dépensé sur place. Ce modèle de tourisme doit changer. »</p>
      <div class="who">Kyriakos Kotsoglou, vice-gouverneur au tourisme de la Région de Crète</div>
    </div>

    <h2>Ce que <span class="u">nos données révèlent</span></h2>
    <p>Un mot sur qui vous parle. crete.direct est un service gratuit qui cartographie la mobilité de la Crète, des lignes de bus en temps réel aux itinéraires du quotidien. Cette position nous donne un observatoire du terrain que peu partagent, et une raison de nous pencher sur ce paradoxe : la façon dont les visiteurs circulent, ou ne circulent pas, décide de l'argent qui atteint le local.</p>
    <p>Ce constat national, nous avons donc voulu le vérifier à l'échelle qui nous tient à coeur : la Crète de l'Est. Le Lassithi, de Agios Nikolaos à Sitia, est un angle mort. Il n'apparaît presque pas dans les statistiques officielles. Nous avons analysé nous-mêmes <strong>1 902 hébergements crétois</strong>. Le résultat dessine une île à deux visages.</p>

    <div class="exclusif">
      <div class="head"><span class="chip">DONNÉE crete.direct</span></div>
      <h3>Prix moyen par nuit, selon la zone</h3>
      <div class="bars">
        <div class="bar"><span class="lb">Elounda</span><span class="tk"><i class="fl" style="width:96%;background:var(--terra)"></i></span><span class="vv">404 €</span></div>
        <div class="bar"><span class="lb">Reste de la Crète</span><span class="tk"><i class="fl" style="width:52%;background:var(--sun)"></i></span><span class="vv">217 €</span></div>
        <div class="bar"><span class="lb">Agios Nikolaos</span><span class="tk"><i class="fl" style="width:36%;background:var(--lagoon)"></i></span><span class="vv">152 €</span></div>
        <div class="bar"><span class="lb">Makrigialos</span><span class="tk"><i class="fl" style="width:28%;background:var(--lagoon)"></i></span><span class="vv">117 €</span></div>
        <div class="bar"><span class="lb">Ierapetra</span><span class="tk"><i class="fl" style="width:22%;background:var(--calm)"></i></span><span class="vv">91 €</span></div>
        <div class="bar"><span class="lb">Sitia</span><span class="tk"><i class="fl" style="width:21%;background:var(--calm)"></i></span><span class="vv">88 €</span></div>
      </div>
      <p style="font-size:14px;font-weight:600;color:var(--ink-soft);margin:6px 0 0">D'un côté Elounda, enclave de luxe à 404 euros la nuit, là où ouvre justement le prochain palace. De l'autre, Sitia, Ierapetra et le pays de Makrigialos, entre 88 et 117 euros : la Crète authentique et accessible.</p>
    </div>

    <p>L'écart saute aux yeux. Sur l'ensemble de l'île, un hébergement se loue en moyenne <strong>217 euros la nuit</strong>. À l'est, seulement <strong>123 euros, soit 43 % de moins</strong>, pour une qualité d'accueil identique : une note de 4,97 sur 5, contre 4,98 pour le reste de l'île. Autre signal parlant, la seule présence d'une piscine fait bondir le prix de 91 à 425 euros la nuit, près de <strong>cinq fois plus</strong>. C'est toute la fracture entre le resort fermé et la maison de village, résumée en un chiffre. Enfin, la Crète de l'Est reçoit <strong>deux fois moins d'avis</strong> par logement que le reste de l'île : un territoire aussi beau, mais deux fois moins fréquenté. Un trésor discret, encore à portée de tous.</p>

    <h2>Les professionnels <span class="u">tirent la sonnette</span></h2>
    <p>Ce n'est plus l'avis d'un seul homme. Sur le terrain, les hôteliers, d'abord confiants, affichent un pessimisme croissant, et les commerçants décrivent une activité d'achat effondrée. Des responsables régionaux aux fédérations hôtelières, tout le secteur fait le même diagnostic. La ministre grecque du Tourisme elle-même a fixé la priorité de 2026 : non pas gonfler le nombre de visiteurs, mais <strong>mieux répartir les bénéfices</strong> entre les territoires et les saisons. Les analystes résument la situation d'une formule : des arrivées solides, mais une rentabilité sous pression. Et la fragilité couve déjà : les réservations françaises pour l'été 2026 ont reculé de <strong>15,6 %</strong>, la Crète cédant du terrain au profit d'Athènes. Autrement dit, le plein ne suffit plus.</p>

    <h2>Le vrai levier : <span class="u">mieux répartir les flux</span></h2>
    <p>Le problème de la Crète n'est pas son nombre de visiteurs, c'est leur concentration. Concentration dans l'espace, sur une poignée de stations de l'ouest. Concentration dans le temps, sur huit semaines d'été. Concentration, enfin, dans le circuit fermé du tout compris. Redresser la courbe des revenus locaux ne suppose pas de freiner le tourisme, mais d'agir sur ces trois flux. Quatre leviers structurels le permettent.</p>

    <div class="tips">
      <div class="tip"><div class="ico">🗺️</div><h4>Redistribuer dans l'espace</h4><p>Orienter une part des flux vers l'est sous-fréquenté, où une capacité d'accueil de qualité reste deux fois moins sollicitée qu'à l'ouest.</p></div>
      <div class="tip"><div class="ico">🚌</div><h4>La mobilité comme levier</h4><p>Un réseau de transport lisible relie les resorts au reste du territoire et fait sortir la dépense de l'enceinte hôtelière.</p></div>
      <div class="tip"><div class="ico">🗓️</div><h4>Étaler la saison</h4><p>Faire vivre l'économie et l'emploi d'avril à octobre, plutôt que de tout concentrer sur le pic de juillet et août.</p></div>
      <div class="tip"><div class="ico">📊</div><h4>Mesurer pour piloter</h4><p>Instrumenter les zones aveugles, comme le Lassithi, pour orienter décisions publiques et investissements là où ils comptent.</p></div>
    </div>

    <p>C'est précisément le rôle que nous jouons. crete.direct n'est pas un guide de plus : c'est une infrastructure de mobilité et de données, conçue pour rendre le territoire lisible, relier ses zones et éclairer ce que personne ne mesure. La Crète n'a pas un problème de touristes. Elle a un enjeu de répartition. Et une bonne répartition, cela se pilote.</p>

    <div class="support">
      <div class="txt">
        <h3>Ce travail vous semble utile ?</h3>
        <p>crete.direct est gratuit et indépendant. Notre carte, nos données et nos analyses vivent grâce à celles et ceux qui les soutiennent.</p>
      </div>
      <a href="https://crete.direct/fr/projet">Nous soutenir →</a>
    </div>

    <!-- ENCART NOVAI -->
    <div class="adnovai">
      <div class="sp">
        <div class="spon">Contenu partenaire</div>
        <div class="logo">Nov<b>AI</b></div>
        <div class="tl">Cette enquête a été rendue possible par l'analyse de données. C'est notre métier.</div>
        <p>NovAI est une entreprise spécialisée dans la donnée et l'intelligence artificielle. Nous transformons des milliers de chiffres bruts en décisions claires : cartographie de marché, analyse de tendances, tableaux de bord sur mesure. Vous avez un jeu de données à faire parler ? Écrivez-nous, la première analyse est offerte.</p>
        <a class="cta" href="mailto:contact@nov-ai.xyz?subject=Analyse%20de%20donn%C3%A9es%20-%20demande%20d'information&amp;body=Bonjour%20NovAI%2C%0A%0AJ'ai%20lu%20votre%20analyse%20sur%20crete.direct%20et%20j'aimerais%20en%20savoir%20plus%20sur%20vos%20services%20d'analyse%20de%20donn%C3%A9es.%0A%0A">Nous écrire →</a>
      </div>
    </div>

  </article>

  <footer>
    <div class="fb">crete<span>.</span>direct</div>
    <p>La Crète, en vrai. Cartes, bus, bonnes adresses, gratuitement.</p>
    <p class="src">Sources : INSETE (rapport de juin 2026), Banque de Grèce, Fraport Greece, GTP Headlines, patris.gr et fonien.gr (juillet 2026, déclarations de la vice-gouvernance au tourisme de Crète), données propriétaires crete.direct (1 902 hébergements analysés, juin 2026). Les chiffres de prix reflètent les tarifs affichés et servent d'indicateur de tendance.</p>
  </footer>

</div>
`,
  en: `
<header>
  <div class="wrap" style="position:relative">
    <svg class="goat" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="30" ry="7" fill="#0B3954" opacity=".12"/>
      <path d="M44 30 C30 18 22 26 26 40 C29 50 40 50 46 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M76 30 C90 18 98 26 94 40 C91 50 80 50 74 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 52 C40 34 52 26 60 26 C68 26 80 34 80 52 C80 72 70 84 60 84 C50 84 40 72 40 52Z" fill="#FFE9BF" stroke="#0B3954" stroke-width="4.5"/>
      <path d="M48 70 C52 80 68 80 72 70 L70 86 C66 92 54 92 50 86 Z" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="52" cy="56" r="4.6" fill="#0B3954"/><circle cx="68" cy="56" r="4.6" fill="#0B3954"/>
      <circle cx="53.4" cy="54.6" r="1.5" fill="#fff"/><circle cx="69.4" cy="54.6" r="1.5" fill="#fff"/>
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#ED7A5C" stroke="#0B3954" stroke-width="3"/>
      <path d="M58 86 C58 94 56 100 53 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 86 C62 94 64 100 67 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
    </svg>

    <div class="badge-line">
      <span class="pill"><span class="dot"></span>Investigation · 2026 Season</span>
      <span class="pill brand">crete.direct</span>
    </div>

    <h1>More visitors than ever. And local businesses <span class="hl">earning less</span>.</h1>

    <div class="deck">
      <span class="tag">THE PARADOX</span>
      <p>In 2026, Crete is welcoming 13.8% more visitors, an all-time record. At the very same moment, restaurateurs, rental owners and small shopkeepers are seeing the opposite of what those figures promise: less money is coming in than before. How can tourism climb and local revenues fall at the same time? An investigation, backed by the numbers.</p>
    </div>
    <div class="byline">By the crete.direct newsroom · 3 July 2026 · 4 min read</div>
  </div>
</header>

<div class="wrap">

  <div class="stats">
    <div class="stat a"><div class="n">+13.8%</div><div class="l">more international visitors in Crete (January to May 2026), the strongest rise in all of Greece</div></div>
    <div class="stat b"><div class="n">-20%</div><div class="l">in British tourism revenue in Crete, even though visitor numbers are higher</div></div>
    <div class="stat c"><div class="n">125-150M€</div><div class="l">the new Ikos Kissamos resort, the biggest hotel investment in the island's history, opened in April 2026</div></div>
    <div class="stat d"><div class="n">-43%</div><div class="l">the price gap between eastern Crete, which has stayed affordable, and the rest of the island</div></div>
  </div>

  <article>

    <h2>A record summer, <span class="u">on paper</span></h2>
    <p>The figures are dizzying. From January to May 2026, Crete welcomed <strong>1.15 million international visitors</strong>, that is 13.8% more than in 2025. It is the strongest rise of any Greek region, nearly three times the national average, which is stuck at 5%. The west of the island is leading the way: Chania is up 20.9%, Heraklion up 11.3%.</p>
    <p>Seen from above, the year is historic. The island has never drawn so many. So the problem is not the number of tourists. It lies elsewhere.</p>

    <h2>So why is it <span class="u">not working</span>?</h2>
    <p>Because filling the planes no longer fills the tills. The British market is the perfect example: visitor numbers are higher (<strong>+7.6%</strong>), yet their spending in Crete has fallen by <strong>20%</strong>. On the German side, the island's top market, the same contradiction: arrivals are rising, but revenue is down by <strong>10.5%</strong>.</p>
    <p>The cause comes down to two words: <strong>shorter stays</strong>. Tourists are spending a little more per day, 28% more than in 2019, but they are staying for less time. As a result, the total spend of a trip is stagnating at around 620 euros while the number of nights melts away. Fewer days on site means fewer dinners, fewer outings, fewer purchases. Mechanically, the money that flows into the local economy is drying up.</p>

    <h2>The <span class="u">all-inclusive</span> wave</h2>
    <p>And it runs deeper still. In 2026, Crete is shifting towards upmarket all-inclusive hotels. April saw the opening of <strong>Ikos Kissamos</strong>, a resort worth 125 or 150 million euros, the biggest hotel investment in all of Cretan history. The Rosewood is arriving in Elounda, the Allsun group is building five luxury hotels. Seven of the fifteen best all-inclusive resorts in Europe are now Greek, and bookings of this kind have jumped by <strong>35% in two years</strong>.</p>
    <p>The logic is unbeatable for the hotel: the guest pays for everything in advance, eats, drinks and is entertained without ever stepping past the gate. But for the village taverna or the scooter rental, this is an invisible visitor. Every euro left at the buffet is a euro that never reaches the local shop. The only ones seeing their tills fill up? The supermarkets, where holidaymakers stock up on snacks and drinks to enjoy on the balcony of their room.</p>

    <p>The shortfall is staggering. According to the vice-governorate for tourism in Crete, the sums left with local businesses have shrunk by <strong>30% in two years</strong>, nearly <strong>one billion euros</strong> evaporated, even as the arrival counters break records.</p>

    <div class="quote">
      <p>"What matters is not the number of visitors, but the money spent on the ground. This model of tourism has to change."</p>
      <div class="who">Kyriakos Kotsoglou, vice-governor for tourism of the Region of Crete</div>
    </div>

    <h2>What <span class="u">our data reveals</span></h2>
    <p>A word on who is speaking to you. crete.direct is a free service that maps mobility across Crete, from real-time bus lines to everyday routes. That position gives us a view of the ground that few share, and a reason to look into this paradox: the way visitors move, or do not move, decides how much money reaches the local economy.</p>
    <p>So we wanted to test this national picture at the scale closest to our heart: eastern Crete. Lassithi, from Agios Nikolaos to Sitia, is a blind spot. It barely shows up in official statistics. We analysed <strong>1,902 Cretan accommodations</strong> ourselves. The result sketches an island with two faces.</p>

    <div class="exclusif">
      <div class="head"><span class="chip">crete.direct DATA</span></div>
      <h3>Average price per night, by zone</h3>
      <div class="bars">
        <div class="bar"><span class="lb">Elounda</span><span class="tk"><i class="fl" style="width:96%;background:var(--terra)"></i></span><span class="vv">404 €</span></div>
        <div class="bar"><span class="lb">Rest of Crete</span><span class="tk"><i class="fl" style="width:52%;background:var(--sun)"></i></span><span class="vv">217 €</span></div>
        <div class="bar"><span class="lb">Agios Nikolaos</span><span class="tk"><i class="fl" style="width:36%;background:var(--lagoon)"></i></span><span class="vv">152 €</span></div>
        <div class="bar"><span class="lb">Makrigialos</span><span class="tk"><i class="fl" style="width:28%;background:var(--lagoon)"></i></span><span class="vv">117 €</span></div>
        <div class="bar"><span class="lb">Ierapetra</span><span class="tk"><i class="fl" style="width:22%;background:var(--calm)"></i></span><span class="vv">91 €</span></div>
        <div class="bar"><span class="lb">Sitia</span><span class="tk"><i class="fl" style="width:21%;background:var(--calm)"></i></span><span class="vv">88 €</span></div>
      </div>
      <p style="font-size:14px;font-weight:600;color:var(--ink-soft);margin:6px 0 0">On one side Elounda, a luxury enclave at 404 euros a night, exactly where the next palace hotel is opening. On the other, Sitia, Ierapetra and the Makrigialos area, between 88 and 117 euros: authentic, affordable Crete.</p>
    </div>

    <p>The gap is striking. Across the whole island, an accommodation rents for an average of <strong>217 euros a night</strong>. In the east, only <strong>123 euros, that is 43% less</strong>, for identical hospitality quality: a rating of 4.97 out of 5, against 4.98 for the rest of the island. Another telling signal, the mere presence of a pool sends the price soaring from 91 to 425 euros a night, nearly <strong>five times more</strong>. It is the whole divide between the closed resort and the village house, summed up in a single figure. Finally, eastern Crete receives <strong>half as many reviews</strong> per property as the rest of the island: a place just as beautiful, but visited half as much. A quiet treasure, still within everyone's reach.</p>

    <h2>The professionals are <span class="u">sounding the alarm</span></h2>
    <p>This is no longer one man's opinion. On the ground, hoteliers, confident at first, are showing growing pessimism, and shopkeepers describe a collapse in purchasing activity. From regional officials to hotel federations, the whole sector reaches the same diagnosis. The Greek Tourism Minister herself has set the priority for 2026: not to inflate visitor numbers, but to <strong>better spread the benefits</strong> across regions and seasons. Analysts sum up the situation in a single phrase: solid arrivals, but profitability under pressure. And the fragility is already brewing: French bookings for summer 2026 have fallen by <strong>15.6%</strong>, with Crete losing ground to Athens. In other words, a full house is no longer enough.</p>

    <h2>The real lever: <span class="u">spreading the flows better</span></h2>
    <p>Crete's problem is not its number of visitors, it is their concentration. Concentration in space, on a handful of western resorts. Concentration in time, across eight weeks of summer. And concentration, finally, in the closed circuit of all-inclusive. Turning the local revenue curve around does not mean slowing tourism down, but acting on these three flows. Four structural levers make it possible.</p>

    <div class="tips">
      <div class="tip"><div class="ico">🗺️</div><h4>Redistribute across space</h4><p>Steer a share of the flows towards the under-visited east, where quality accommodation capacity is still used half as much as in the west.</p></div>
      <div class="tip"><div class="ico">🚌</div><h4>Mobility as a lever</h4><p>A legible transport network links the resorts to the rest of the territory and brings spending out from behind the hotel walls.</p></div>
      <div class="tip"><div class="ico">🗓️</div><h4>Spread the season</h4><p>Keep the economy and jobs alive from April to October, rather than concentrating everything on the July and August peak.</p></div>
      <div class="tip"><div class="ico">📊</div><h4>Measure to steer</h4><p>Instrument the blind zones, like Lassithi, to direct public decisions and investment where they count.</p></div>
    </div>

    <p>That is precisely the role we play. crete.direct is not just another guide: it is a mobility and data infrastructure, built to make the territory legible, connect its zones and shed light on what nobody measures. Crete does not have a tourist problem. It has a distribution challenge. And good distribution is something you steer.</p>

    <div class="support">
      <div class="txt">
        <h3>Does this work seem useful to you?</h3>
        <p>crete.direct is free and independent. Our map, our data and our analyses live thanks to those who support them.</p>
      </div>
      <a href="https://crete.direct/en/projet">Support us →</a>
    </div>

    <!-- ENCART NOVAI -->
    <div class="adnovai">
      <div class="sp">
        <div class="spon">Partner content</div>
        <div class="logo">Nov<b>AI</b></div>
        <div class="tl">This investigation was made possible by data analysis. That is what we do.</div>
        <p>NovAI is a company specialising in data and artificial intelligence. We turn thousands of raw figures into clear decisions: market mapping, trend analysis, bespoke dashboards. Have a dataset you want to make talk? Write to us, the first analysis is on the house.</p>
        <a class="cta" href="mailto:contact@nov-ai.xyz?subject=Data%20analysis%20-%20request%20for%20information&amp;body=Hello%20NovAI%2C%0A%0AI%20read%20your%20analysis%20on%20crete.direct%20and%20I'd%20like%20to%20learn%20more%20about%20your%20data%20analysis%20services.%0A%0A">Write to us →</a>
      </div>
    </div>

  </article>

  <footer>
    <div class="fb">crete<span>.</span>direct</div>
    <p>Crete, for real. Maps, buses, good spots, for free.</p>
    <p class="src">Sources: INSETE (June 2026 report), Bank of Greece, Fraport Greece, GTP Headlines, patris.gr and fonien.gr (July 2026, statements from the vice-governorate for tourism in Crete), crete.direct proprietary data (1,902 accommodations analysed, June 2026). Price figures reflect advertised rates and serve as a trend indicator.</p>
  </footer>

</div>
`,
  de: `
<header>
  <div class="wrap" style="position:relative">
    <svg class="goat" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="30" ry="7" fill="#0B3954" opacity=".12"/>
      <path d="M44 30 C30 18 22 26 26 40 C29 50 40 50 46 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M76 30 C90 18 98 26 94 40 C91 50 80 50 74 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 52 C40 34 52 26 60 26 C68 26 80 34 80 52 C80 72 70 84 60 84 C50 84 40 72 40 52Z" fill="#FFE9BF" stroke="#0B3954" stroke-width="4.5"/>
      <path d="M48 70 C52 80 68 80 72 70 L70 86 C66 92 54 92 50 86 Z" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="52" cy="56" r="4.6" fill="#0B3954"/><circle cx="68" cy="56" r="4.6" fill="#0B3954"/>
      <circle cx="53.4" cy="54.6" r="1.5" fill="#fff"/><circle cx="69.4" cy="54.6" r="1.5" fill="#fff"/>
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#ED7A5C" stroke="#0B3954" stroke-width="3"/>
      <path d="M58 86 C58 94 56 100 53 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 86 C62 94 64 100 67 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
    </svg>

    <div class="badge-line">
      <span class="pill"><span class="dot"></span>Recherche · Saison 2026</span>
      <span class="pill brand">crete.direct</span>
    </div>

    <h1>Mehr Besucher denn je. Und lokale Betriebe, die <span class="hl">weniger verdienen</span>.</h1>

    <div class="deck">
      <span class="tag">DAS PARADOX</span>
      <p>2026 empfängt Kreta 13,8 % mehr Besucher, ein absoluter Rekord. Zugleich stellen Gastronomen, Vermieter und kleine Händler das Gegenteil dessen fest, was diese Zahlen versprechen: Es kommt weniger Geld herein als früher. Wie kann der Tourismus steigen und die lokalen Einnahmen gleichzeitig sinken? Eine Recherche, mit Zahlen belegt.</p>
    </div>
    <div class="byline">Von der Redaktion crete.direct · 3. Juli 2026 · Lesezeit 4 Min.</div>
  </div>
</header>

<div class="wrap">

  <div class="stats">
    <div class="stat a"><div class="n">+13,8 %</div><div class="l">internationale Besucher auf Kreta (Januar bis Mai 2026), der stärkste Anstieg in ganz Griechenland</div></div>
    <div class="stat b"><div class="n">-20 %</div><div class="l">britische Tourismuseinnahmen auf Kreta, obwohl die Besucherzahlen steigen</div></div>
    <div class="stat c"><div class="n">125-150 Mio. €</div><div class="l">das neue Resort Ikos Kissamos, die größte Hotelinvestition in der Geschichte der Insel, eröffnet im April 2026</div></div>
    <div class="stat d"><div class="n">-43 %</div><div class="l">der Preisunterschied zwischen dem erschwinglich gebliebenen Osten Kretas und dem Rest der Insel</div></div>
  </div>

  <article>

    <h2>Ein Rekordsommer, <span class="u">auf dem Papier</span></h2>
    <p>Die Zahlen sind schwindelerregend. Von Januar bis Mai 2026 empfing Kreta <strong>1,15 Millionen internationale Besucher</strong>, also 13,8 % mehr als 2025. Es ist der stärkste Anstieg aller griechischen Regionen, fast dreimal so hoch wie der nationale Durchschnitt, der bei 5 % stagniert. Der Westen der Insel gibt den Ton an: Chania legt um 20,9 % zu, Heraklion um 11,3 %.</p>
    <p>Von oben betrachtet ist das Jahr historisch. Nie zog die Insel mehr Menschen an. Das Problem ist also nicht die Zahl der Touristen. Es liegt woanders.</p>

    <h2>Warum <span class="u">hakt es dann</span>?</h2>
    <p>Weil volle Flugzeuge die Kassen nicht mehr füllen. Der britische Markt ist das perfekte Beispiel: Die Besucher sind zahlreicher (<strong>+7,6 %</strong>), doch ihre Ausgaben auf Kreta sind um <strong>20 %</strong> gesunken. Auf deutscher Seite, dem wichtigsten Markt der Insel, derselbe Widerspruch: Die Ankünfte steigen, aber die Einnahmen gehen um <strong>10,5 %</strong> zurück.</p>
    <p>Die Ursache lässt sich in zwei Worten fassen: <strong>kürzere Aufenthalte</strong>. Die Touristen geben pro Tag etwas mehr aus, 28 % mehr als 2019, aber sie bleiben weniger lange. Dadurch stagnieren die Gesamtausgaben einer Reise bei rund 620 Euro, während die Zahl der Nächte schrumpft. Weniger Tage vor Ort bedeuten weniger Abendessen, weniger Ausflüge, weniger Einkäufe. Ganz mechanisch wird das Geld, das die lokale Wirtschaft versorgt, knapper.</p>

    <h2>Die Welle des <span class="u">All-inclusive</span></h2>
    <p>Und es geht noch tiefer. 2026 kippt Kreta in Richtung gehobene All-inclusive-Hotellerie. Im April eröffnete <strong>Ikos Kissamos</strong>, ein Resort für 125 oder 150 Millionen Euro, die größte Hotelinvestition der gesamten kretischen Geschichte. Das Rosewood kommt nach Elounda, die Gruppe Allsun baut fünf Luxushotels. Sieben der fünfzehn besten All-inclusive-Resorts Europas sind heute griechisch, und die Buchungen dieser Art sind in zwei Jahren um <strong>35 %</strong> in die Höhe geschnellt.</p>
    <p>Das Prinzip ist für das Hotel unschlagbar: Der Gast zahlt alles im Voraus, isst, trinkt und lässt sich unterhalten, ohne je das Tor zu passieren. Doch für die Taverne im Dorf oder den Rollervermieter ist das ein unsichtbarer Besucher. Jeder Euro, der am Buffet bleibt, ist ein Euro, der nie beim örtlichen Handel ankommt. Die Einzigen, deren Kassen sich füllen? Die Supermärkte, wo sich die Urlauber mit Snacks und Getränken eindecken, die sie auf dem Balkon ihres Zimmers verzehren.</p>

    <p>Der entgangene Gewinn ist schwindelerregend. Laut der Vize-Gouverneurschaft für Tourismus auf Kreta sind die dem lokalen Handel überlassenen Beträge in <strong>zwei Jahren um 30 %</strong> geschrumpft, fast <strong>eine Milliarde Euro</strong> verdampft, während die Ankunftszähler Rekorde brechen.</p>

    <div class="quote">
      <p>« Was zählt, ist nicht die Zahl der Besucher, sondern das vor Ort ausgegebene Geld. Dieses Tourismusmodell muss sich ändern. »</p>
      <div class="who">Kyriakos Kotsoglou, Vize-Gouverneur für Tourismus der Region Kreta</div>
    </div>

    <h2>Was <span class="u">unsere Daten zeigen</span></h2>
    <p>Ein Wort dazu, wer hier spricht. crete.direct ist ein kostenloser Dienst, der die Mobilität Kretas kartiert, von Buslinien in Echtzeit bis zu den Alltagsrouten. Diese Position verschafft uns eine Beobachtungsstelle vor Ort, die nur wenige teilen, und einen Grund, uns mit diesem Paradox zu befassen: Wie sich die Besucher bewegen, oder eben nicht bewegen, entscheidet darüber, welches Geld die lokale Wirtschaft erreicht.</p>
    <p>Diesen nationalen Befund wollten wir also auf der Ebene überprüfen, die uns am Herzen liegt: dem Osten Kretas. Das Lassithi, von Agios Nikolaos bis Sitia, ist ein blinder Fleck. Es taucht in den offiziellen Statistiken kaum auf. Wir haben selbst <strong>1.902 kretische Unterkünfte</strong> analysiert. Das Ergebnis zeichnet eine Insel mit zwei Gesichtern.</p>

    <div class="exclusif">
      <div class="head"><span class="chip">DATEN crete.direct</span></div>
      <h3>Durchschnittspreis pro Nacht, nach Zone</h3>
      <div class="bars">
        <div class="bar"><span class="lb">Elounda</span><span class="tk"><i class="fl" style="width:96%;background:var(--terra)"></i></span><span class="vv">404 €</span></div>
        <div class="bar"><span class="lb">Rest von Kreta</span><span class="tk"><i class="fl" style="width:52%;background:var(--sun)"></i></span><span class="vv">217 €</span></div>
        <div class="bar"><span class="lb">Agios Nikolaos</span><span class="tk"><i class="fl" style="width:36%;background:var(--lagoon)"></i></span><span class="vv">152 €</span></div>
        <div class="bar"><span class="lb">Makrigialos</span><span class="tk"><i class="fl" style="width:28%;background:var(--lagoon)"></i></span><span class="vv">117 €</span></div>
        <div class="bar"><span class="lb">Ierapetra</span><span class="tk"><i class="fl" style="width:22%;background:var(--calm)"></i></span><span class="vv">91 €</span></div>
        <div class="bar"><span class="lb">Sitia</span><span class="tk"><i class="fl" style="width:21%;background:var(--calm)"></i></span><span class="vv">88 €</span></div>
      </div>
      <p style="font-size:14px;font-weight:600;color:var(--ink-soft);margin:6px 0 0">Auf der einen Seite Elounda, Luxusenklave für 404 Euro pro Nacht, genau dort, wo der nächste Palast eröffnet. Auf der anderen Seite Sitia, Ierapetra und die Gegend um Makrigialos, zwischen 88 und 117 Euro: das authentische und erschwingliche Kreta.</p>
    </div>

    <p>Der Unterschied springt ins Auge. Auf der gesamten Insel wird eine Unterkunft im Schnitt für <strong>217 Euro pro Nacht</strong> vermietet. Im Osten nur <strong>123 Euro, also 43 % weniger</strong>, bei identischer Gastfreundschaft: eine Bewertung von 4,97 von 5, gegenüber 4,98 für den Rest der Insel. Ein weiteres deutliches Signal: Allein das Vorhandensein eines Pools lässt den Preis von 91 auf 425 Euro pro Nacht springen, fast <strong>fünfmal so viel</strong>. Das ist der ganze Bruch zwischen dem geschlossenen Resort und dem Dorfhaus, zusammengefasst in einer Zahl. Und schließlich erhält der Osten Kretas <strong>halb so viele Bewertungen</strong> pro Unterkunft wie der Rest der Insel: ein ebenso schönes Gebiet, aber halb so stark besucht. Ein stiller Schatz, noch für alle erreichbar.</p>

    <h2>Die Branche <span class="u">schlägt Alarm</span></h2>
    <p>Es ist nicht mehr die Meinung eines Einzelnen. Vor Ort zeigen die zunächst zuversichtlichen Hoteliers einen wachsenden Pessimismus, und die Händler beschreiben ein eingebrochenes Kaufgeschäft. Von regionalen Verantwortlichen bis zu den Hotelverbänden stellt die gesamte Branche dieselbe Diagnose. Die griechische Tourismusministerin selbst hat die Priorität für 2026 festgelegt: nicht die Zahl der Besucher aufzublähen, sondern die <strong>Gewinne besser zu verteilen</strong>, zwischen den Regionen und den Saisons. Die Analysten fassen die Lage in einer Formel zusammen: solide Ankünfte, aber eine Rentabilität unter Druck. Und die Fragilität schwelt bereits: Die französischen Buchungen für den Sommer 2026 sind um <strong>15,6 %</strong> zurückgegangen, wobei Kreta an Athen Boden verliert. Anders gesagt: Volle Häuser reichen nicht mehr.</p>

    <h2>Der echte Hebel: <span class="u">die Ströme besser verteilen</span></h2>
    <p>Das Problem Kretas ist nicht die Zahl seiner Besucher, sondern deren Konzentration. Konzentration im Raum, auf eine Handvoll Orte im Westen. Konzentration in der Zeit, auf acht Sommerwochen. Und schließlich Konzentration im geschlossenen Kreislauf des All-inclusive. Die Kurve der lokalen Einnahmen wieder aufzurichten bedeutet nicht, den Tourismus zu bremsen, sondern auf diese drei Ströme einzuwirken. Vier strukturelle Hebel machen das möglich.</p>

    <div class="tips">
      <div class="tip"><div class="ico">🗺️</div><h4>Im Raum umverteilen</h4><p>Einen Teil der Ströme in den wenig besuchten Osten lenken, wo eine hochwertige Aufnahmekapazität nur halb so stark ausgelastet ist wie im Westen.</p></div>
      <div class="tip"><div class="ico">🚌</div><h4>Mobilität als Hebel</h4><p>Ein verständliches Verkehrsnetz verbindet die Resorts mit dem übrigen Gebiet und trägt die Ausgaben aus dem Hotelgelände hinaus.</p></div>
      <div class="tip"><div class="ico">🗓️</div><h4>Die Saison strecken</h4><p>Wirtschaft und Beschäftigung von April bis Oktober beleben, statt alles auf die Spitze von Juli und August zu bündeln.</p></div>
      <div class="tip"><div class="ico">📊</div><h4>Messen, um zu steuern</h4><p>Die blinden Flecken wie das Lassithi mit Daten erfassen, um öffentliche Entscheidungen und Investitionen dorthin zu lenken, wo sie zählen.</p></div>
    </div>

    <p>Genau das ist die Rolle, die wir spielen. crete.direct ist kein weiterer Reiseführer: Es ist eine Mobilitäts- und Dateninfrastruktur, geschaffen, um das Gebiet lesbar zu machen, seine Zonen zu verbinden und sichtbar zu machen, was niemand misst. Kreta hat kein Touristenproblem. Es hat eine Frage der Verteilung. Und eine gute Verteilung, die lässt sich steuern.</p>

    <div class="support">
      <div class="txt">
        <h3>Erscheint Ihnen diese Arbeit nützlich?</h3>
        <p>crete.direct ist kostenlos und unabhängig. Unsere Karte, unsere Daten und unsere Analysen leben dank derjenigen, die sie unterstützen.</p>
      </div>
      <a href="https://crete.direct/de/projet">Unterstützen Sie uns →</a>
    </div>

    <!-- ENCART NOVAI -->
    <div class="adnovai">
      <div class="sp">
        <div class="spon">Partnerinhalt</div>
        <div class="logo">Nov<b>AI</b></div>
        <div class="tl">Diese Recherche wurde durch Datenanalyse möglich. Das ist unser Beruf.</div>
        <p>NovAI ist ein auf Daten und künstliche Intelligenz spezialisiertes Unternehmen. Wir verwandeln Tausende roher Zahlen in klare Entscheidungen: Marktkartierung, Trendanalyse, maßgeschneiderte Dashboards. Sie haben einen Datensatz, der sprechen soll? Schreiben Sie uns, die erste Analyse ist kostenlos.</p>
        <a class="cta" href="mailto:contact@nov-ai.xyz?subject=Datenanalyse%20-%20Informationsanfrage&amp;body=Guten%20Tag%20NovAI%2C%0A%0AIch%20habe%20Ihre%20Analyse%20auf%20crete.direct%20gelesen%20und%20m%C3%B6chte%20mehr%20%C3%BCber%20Ihre%20Datenanalyse-Dienste%20erfahren.%0A%0A">Schreiben Sie uns →</a>
      </div>
    </div>

  </article>

  <footer>
    <div class="fb">crete<span>.</span>direct</div>
    <p>Kreta, in echt. Karten, Busse, gute Adressen, kostenlos.</p>
    <p class="src">Quellen: INSETE (Bericht von Juni 2026), Bank von Griechenland, Fraport Greece, GTP Headlines, patris.gr und fonien.gr (Juli 2026, Aussagen der Vize-Gouverneurschaft für Tourismus auf Kreta), eigene Daten von crete.direct (1.902 analysierte Unterkünfte, Juni 2026). Die Preisangaben spiegeln die ausgewiesenen Tarife wider und dienen als Trendindikator.</p>
  </footer>

</div>
`,
  el: `
<header>
  <div class="wrap" style="position:relative">
    <svg class="goat" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="30" ry="7" fill="#0B3954" opacity=".12"/>
      <path d="M44 30 C30 18 22 26 26 40 C29 50 40 50 46 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M76 30 C90 18 98 26 94 40 C91 50 80 50 74 44" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <path d="M40 52 C40 34 52 26 60 26 C68 26 80 34 80 52 C80 72 70 84 60 84 C50 84 40 72 40 52Z" fill="#FFE9BF" stroke="#0B3954" stroke-width="4.5"/>
      <path d="M48 70 C52 80 68 80 72 70 L70 86 C66 92 54 92 50 86 Z" fill="#FFF6E5" stroke="#0B3954" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="52" cy="56" r="4.6" fill="#0B3954"/><circle cx="68" cy="56" r="4.6" fill="#0B3954"/>
      <circle cx="53.4" cy="54.6" r="1.5" fill="#fff"/><circle cx="69.4" cy="54.6" r="1.5" fill="#fff"/>
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#ED7A5C" stroke="#0B3954" stroke-width="3"/>
      <path d="M58 86 C58 94 56 100 53 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 86 C62 94 64 100 67 104" stroke="#0B3954" stroke-width="4" stroke-linecap="round"/>
    </svg>

    <div class="badge-line">
      <span class="pill"><span class="dot"></span>Έρευνα · Σεζόν 2026</span>
      <span class="pill brand">crete.direct</span>
    </div>

    <h1>Περισσότεροι επισκέπτες από ποτέ. Και τοπικές επιχειρήσεις που <span class="hl">κερδίζουν λιγότερα</span>.</h1>

    <div class="deck">
      <span class="tag">ΤΟ ΠΑΡΑΔΟΞΟ</span>
      <p>Το 2026, η Κρήτη υποδέχεται 13,8 % περισσότερους επισκέπτες, ένα απόλυτο ρεκόρ. Την ίδια στιγμή, εστιάτορες, ενοικιαστές και μικροί έμποροι διαπιστώνουν το αντίθετο απ' ό,τι υπόσχονται αυτά τα νούμερα : μπαίνουν λιγότερα χρήματα από πριν. Πώς μπορεί ο τουρισμός να ανεβαίνει και τα τοπικά έσοδα να πέφτουν την ίδια στιγμή ; Έρευνα, με τα νούμερα στο χέρι.</p>
    </div>
    <div class="byline">Από τη σύνταξη του crete.direct · 3 Ιουλίου 2026 · Ανάγνωση 4 λεπτά</div>
  </div>
</header>

<div class="wrap">

  <div class="stats">
    <div class="stat a"><div class="n">+13,8 %</div><div class="l">αύξηση διεθνών επισκεπτών στην Κρήτη (Ιανουάριος έως Μάιος 2026), η μεγαλύτερη άνοδος όλης της Ελλάδας</div></div>
    <div class="stat b"><div class="n">-20 %</div><div class="l">μείωση των βρετανικών τουριστικών εσόδων στην Κρήτη, τη στιγμή ακριβώς που οι επισκέπτες είναι περισσότεροι</div></div>
    <div class="stat c"><div class="n">125-150 εκατ. €</div><div class="l">το νέο resort Ikos Kissamos, η μεγαλύτερη ξενοδοχειακή επένδυση στην ιστορία του νησιού, με άνοιγμα τον Απρίλιο 2026</div></div>
    <div class="stat d"><div class="n">-43 %</div><div class="l">η διαφορά τιμής ανάμεσα στην Ανατολική Κρήτη, που παρέμεινε προσιτή, και στο υπόλοιπο νησί</div></div>
  </div>

  <article>

    <h2>Ένα καλοκαίρι ρεκόρ, <span class="u">στα χαρτιά</span></h2>
    <p>Τα νούμερα προκαλούν ίλιγγο. Από τον Ιανουάριο έως τον Μάιο του 2026, η Κρήτη υποδέχτηκε <strong>1,15 εκατομμύριο διεθνείς επισκέπτες</strong>, δηλαδή 13,8 % περισσότερους απ' ό,τι το 2025. Είναι η μεγαλύτερη άνοδος από όλες τις ελληνικές περιφέρειες, σχεδόν τρεις φορές ο εθνικός μέσος όρος, που σταματά στο 5 %. Η δυτική πλευρά του νησιού πρωτοστατεί : τα Χανιά ανεβαίνουν κατά 20,9 %, το Ηράκλειο κατά 11,3 %.</p>
    <p>Από ψηλά, η χρονιά είναι ιστορική. Το νησί δεν έχει προσελκύσει ποτέ τόσους. Το πρόβλημα, λοιπόν, δεν είναι ο αριθμός των τουριστών. Βρίσκεται αλλού.</p>

    <h2>Τότε γιατί <span class="u">κάτι δεν πάει καλά</span> ;</h2>
    <p>Επειδή το να γεμίζουν τα αεροπλάνα δεν γεμίζει πια τα ταμεία. Η βρετανική αγορά είναι το τέλειο παράδειγμα : οι επισκέπτες είναι περισσότεροι (<strong>+7,6 %</strong>), όμως οι δαπάνες τους στην Κρήτη έπεσαν κατά <strong>20 %</strong>. Από τη γερμανική πλευρά, την πρώτη αγορά του νησιού, ίδια αντίφαση : οι αφίξεις αυξάνονται, αλλά τα έσοδα υποχωρούν κατά <strong>10,5 %</strong>.</p>
    <p>Η αιτία χωράει σε δύο λέξεις : <strong>πιο σύντομες διαμονές</strong>. Οι τουρίστες ξοδεύουν λίγο περισσότερα ανά ημέρα, 28 % πάνω απ' ό,τι το 2019, αλλά μένουν λιγότερο. Έτσι, η συνολική δαπάνη ενός ταξιδιού στέκεται γύρω στα 620 ευρώ, ενώ ο αριθμός των διανυκτερεύσεων λιώνει. Λιγότερες μέρες στον τόπο σημαίνει λιγότερα δείπνα, λιγότερες βόλτες, λιγότερες αγορές. Μηχανικά, τα χρήματα που ποτίζουν την τοπική οικονομία σπανίζουν.</p>

    <h2>Το κύμα του <span class="u">all inclusive</span></h2>
    <p>Και υπάρχει κάτι βαθύτερο. Το 2026, η Κρήτη γέρνει προς την υψηλών προδιαγραφών all inclusive ξενοδοχεία. Τον Απρίλιο άνοιξε το <strong>Ikos Kissamos</strong>, ένα resort των 125 ή 150 εκατομμυρίων ευρώ, η μεγαλύτερη ξενοδοχειακή επένδυση σε όλη την κρητική ιστορία. Το Rosewood φτάνει στην Ελούντα, ο όμιλος Allsun ανεβάζει πέντε ξενοδοχεία πολυτελείας. Επτά από τα δεκαπέντε καλύτερα all inclusive resorts της Ευρώπης είναι σήμερα ελληνικά, και οι κρατήσεις αυτού του τύπου εκτοξεύτηκαν κατά <strong>35 % σε δύο χρόνια</strong>.</p>
    <p>Η αρχή είναι ακαταμάχητη για το ξενοδοχείο : ο πελάτης πληρώνει τα πάντα εκ των προτέρων, τρώει, πίνει και διασκεδάζει χωρίς ποτέ να περάσει την πύλη. Όμως για την ταβέρνα του χωριού ή τον ενοικιαστή σκούτερ, είναι ένας αόρατος επισκέπτης. Κάθε ευρώ που αφήνεται στον μπουφέ είναι ένα ευρώ που δεν φτάνει ποτέ στο μαγαζί της γειτονιάς. Οι μόνοι που βλέπουν το ταμείο τους να γεμίζει ; Τα σούπερ μάρκετ, όπου οι παραθεριστές εφοδιάζονται με σνακ και ποτά για να τα καταναλώσουν στο μπαλκόνι του δωματίου τους.</p>

    <p>Το διαφυγόν κέρδος προκαλεί ίλιγγο. Σύμφωνα με την αντιπεριφέρεια τουρισμού Κρήτης, τα ποσά που μένουν στο τοπικό εμπόριο έλιωσαν κατά <strong>30 % σε δύο χρόνια</strong>, σχεδόν <strong>ένα δισεκατομμύριο ευρώ</strong> εξανεμίστηκαν, τη στιγμή ακριβώς που οι μετρητές αφίξεων σπάνε ρεκόρ.</p>

    <div class="quote">
      <p>« Αυτό που μετράει δεν είναι ο αριθμός των επισκεπτών, αλλά τα χρήματα που ξοδεύονται στον τόπο. Αυτό το μοντέλο τουρισμού πρέπει να αλλάξει. »</p>
      <div class="who">Κυριάκος Κοτσόγλου, αντιπεριφερειάρχης τουρισμού της Περιφέρειας Κρήτης</div>
    </div>

    <h2>Τι <span class="u">αποκαλύπτουν τα δεδομένα μας</span></h2>
    <p>Δυο λόγια για το ποιος σας μιλά. Το crete.direct είναι μια δωρεάν υπηρεσία που χαρτογραφεί την κινητικότητα της Κρήτης, από τις γραμμές λεωφορείων σε πραγματικό χρόνο έως τις καθημερινές διαδρομές. Αυτή η θέση μάς δίνει ένα παρατηρητήριο του πεδίου που λίγοι μοιράζονται, και έναν λόγο να σκύψουμε πάνω σε αυτό το παράδοξο : ο τρόπος με τον οποίο κυκλοφορούν, ή δεν κυκλοφορούν, οι επισκέπτες κρίνει τα χρήματα που φτάνουν στον τόπο.</p>
    <p>Αυτή τη διαπίστωση σε εθνικό επίπεδο, λοιπόν, θελήσαμε να την επαληθεύσουμε στην κλίμακα που μας νοιάζει : την Ανατολική Κρήτη. Το Λασίθι, από τον Άγιο Νικόλαο έως τη Σητεία, είναι ένα τυφλό σημείο. Σχεδόν δεν εμφανίζεται στις επίσημες στατιστικές. Αναλύσαμε οι ίδιοι <strong>1.902 κρητικά καταλύματα</strong>. Το αποτέλεσμα σχηματίζει ένα νησί με δύο πρόσωπα.</p>

    <div class="exclusif">
      <div class="head"><span class="chip">ΔΕΔΟΜΕΝΟ crete.direct</span></div>
      <h3>Μέση τιμή ανά διανυκτέρευση, ανά ζώνη</h3>
      <div class="bars">
        <div class="bar"><span class="lb">Ελούντα</span><span class="tk"><i class="fl" style="width:96%;background:var(--terra)"></i></span><span class="vv">404 €</span></div>
        <div class="bar"><span class="lb">Υπόλοιπη Κρήτη</span><span class="tk"><i class="fl" style="width:52%;background:var(--sun)"></i></span><span class="vv">217 €</span></div>
        <div class="bar"><span class="lb">Άγιος Νικόλαος</span><span class="tk"><i class="fl" style="width:36%;background:var(--lagoon)"></i></span><span class="vv">152 €</span></div>
        <div class="bar"><span class="lb">Μακρύ Γιαλός</span><span class="tk"><i class="fl" style="width:28%;background:var(--lagoon)"></i></span><span class="vv">117 €</span></div>
        <div class="bar"><span class="lb">Ιεράπετρα</span><span class="tk"><i class="fl" style="width:22%;background:var(--calm)"></i></span><span class="vv">91 €</span></div>
        <div class="bar"><span class="lb">Σητεία</span><span class="tk"><i class="fl" style="width:21%;background:var(--calm)"></i></span><span class="vv">88 €</span></div>
      </div>
      <p style="font-size:14px;font-weight:600;color:var(--ink-soft);margin:6px 0 0">Από τη μία η Ελούντα, θύλακας πολυτελείας στα 404 ευρώ τη βραδιά, εκεί ακριβώς όπου ανοίγει το επόμενο παλάτι. Από την άλλη, η Σητεία, η Ιεράπετρα και ο τόπος του Μακρύ Γιαλού, ανάμεσα σε 88 και 117 ευρώ : η αυθεντική και προσιτή Κρήτη.</p>
    </div>

    <p>Η διαφορά χτυπά στο μάτι. Σε όλο το νησί, ένα κατάλυμα νοικιάζεται κατά μέσο όρο <strong>217 ευρώ τη βραδιά</strong>. Στα ανατολικά, μόλις <strong>123 ευρώ, δηλαδή 43 % λιγότερο</strong>, για ταυτόσημη ποιότητα φιλοξενίας : βαθμολογία 4,97 στα 5, έναντι 4,98 για το υπόλοιπο νησί. Άλλο σημάδι εύγλωττο, μόνο η παρουσία πισίνας εκτοξεύει την τιμή από 91 σε 425 ευρώ τη βραδιά, σχεδόν <strong>πέντε φορές πάνω</strong>. Είναι όλο το ρήγμα ανάμεσα στο κλειστό resort και στο σπίτι του χωριού, συνοψισμένο σε ένα νούμερο. Τέλος, η Ανατολική Κρήτη λαμβάνει <strong>τις μισές κριτικές</strong> ανά κατάλυμα σε σχέση με το υπόλοιπο νησί : ένας τόπος εξίσου όμορφος, αλλά με τη μισή προσέλευση. Ένας διακριτικός θησαυρός, ακόμη προσιτός σε όλους.</p>

    <h2>Οι επαγγελματίες <span class="u">χτυπούν καμπανάκι</span></h2>
    <p>Δεν είναι πια η άποψη ενός μόνο ανθρώπου. Στο πεδίο, οι ξενοδόχοι, αρχικά σίγουροι, εμφανίζουν ολοένα αυξανόμενη απαισιοδοξία, και οι έμποροι περιγράφουν μια κατακόρυφη πτώση της αγοραστικής δραστηριότητας. Από τους περιφερειακούς υπευθύνους έως τις ξενοδοχειακές ομοσπονδίες, όλος ο κλάδος κάνει την ίδια διάγνωση. Η ίδια η Ελληνίδα υπουργός Τουρισμού έθεσε την προτεραιότητα του 2026 : όχι να φουσκώσει τον αριθμό των επισκεπτών, αλλά να <strong>κατανείμει καλύτερα τα οφέλη</strong> ανάμεσα στους τόπους και στις εποχές. Οι αναλυτές συνοψίζουν την κατάσταση με μια φράση : γερές αφίξεις, αλλά κερδοφορία υπό πίεση. Και η ευθραυστότητα σιγοκαίει ήδη : οι γαλλικές κρατήσεις για το καλοκαίρι 2026 υποχώρησαν κατά <strong>15,6 %</strong>, με την Κρήτη να χάνει έδαφος υπέρ της Αθήνας. Με άλλα λόγια, η πληρότητα δεν αρκεί πια.</p>

    <h2>Ο πραγματικός μοχλός : <span class="u">καλύτερη κατανομή των ροών</span></h2>
    <p>Το πρόβλημα της Κρήτης δεν είναι ο αριθμός των επισκεπτών της, είναι η συγκέντρωσή τους. Συγκέντρωση στον χώρο, σε μια χούφτα θέρετρα της δύσης. Συγκέντρωση στον χρόνο, σε οκτώ εβδομάδες καλοκαιριού. Συγκέντρωση, τέλος, στο κλειστό κύκλωμα του all inclusive. Το να ισιώσει η καμπύλη των τοπικών εσόδων δεν προϋποθέτει να φρενάρει ο τουρισμός, αλλά να δράσουμε πάνω σε αυτές τις τρεις ροές. Τέσσερις διαρθρωτικοί μοχλοί το επιτρέπουν.</p>

    <div class="tips">
      <div class="tip"><div class="ico">🗺️</div><h4>Ανακατανομή στον χώρο</h4><p>Να στραφεί ένα μέρος των ροών προς τα υπο-επισκέψιμα ανατολικά, όπου μια ποιοτική δυναμικότητα φιλοξενίας παραμένει διπλάσια αναξιοποίητη σε σχέση με τα δυτικά.</p></div>
      <div class="tip"><div class="ico">🚌</div><h4>Η κινητικότητα ως μοχλός</h4><p>Ένα ευανάγνωστο δίκτυο μεταφορών συνδέει τα resorts με τον υπόλοιπο τόπο και βγάζει τη δαπάνη έξω από το ξενοδοχειακό περίβολο.</p></div>
      <div class="tip"><div class="ico">🗓️</div><h4>Άπλωμα της σεζόν</h4><p>Να ζωντανέψει η οικονομία και η απασχόληση από τον Απρίλιο έως τον Οκτώβριο, αντί να συγκεντρώνονται όλα στην αιχμή του Ιουλίου και του Αυγούστου.</p></div>
      <div class="tip"><div class="ico">📊</div><h4>Μέτρηση για πιλοτάρισμα</h4><p>Να μετρηθούν οι τυφλές ζώνες, όπως το Λασίθι, ώστε να κατευθυνθούν οι δημόσιες αποφάσεις και οι επενδύσεις εκεί που μετράνε.</p></div>
    </div>

    <p>Αυτόν ακριβώς τον ρόλο παίζουμε. Το crete.direct δεν είναι ένας ακόμη οδηγός : είναι μια υποδομή κινητικότητας και δεδομένων, σχεδιασμένη για να κάνει τον τόπο ευανάγνωστο, να συνδέει τις ζώνες του και να φωτίζει αυτό που κανείς δεν μετρά. Η Κρήτη δεν έχει πρόβλημα τουριστών. Έχει ένα ζήτημα κατανομής. Και μια καλή κατανομή, πιλοτάρεται.</p>

    <div class="support">
      <div class="txt">
        <h3>Σας φαίνεται χρήσιμη αυτή η δουλειά ;</h3>
        <p>Το crete.direct είναι δωρεάν και ανεξάρτητο. Ο χάρτης μας, τα δεδομένα μας και οι αναλύσεις μας ζουν χάρη σε όσες και όσους τα στηρίζουν.</p>
      </div>
      <a href="https://crete.direct/el/projet">Στηρίξτε μας →</a>
    </div>

    <!-- ENCART NOVAI -->
    <div class="adnovai">
      <div class="sp">
        <div class="spon">Περιεχόμενο συνεργάτη</div>
        <div class="logo">Nov<b>AI</b></div>
        <div class="tl">Αυτή η έρευνα έγινε δυνατή χάρη στην ανάλυση δεδομένων. Είναι η δουλειά μας.</div>
        <p>Η NovAI είναι μια εταιρεία εξειδικευμένη στα δεδομένα και στην τεχνητή νοημοσύνη. Μετατρέπουμε χιλιάδες ακατέργαστα νούμερα σε καθαρές αποφάσεις : χαρτογράφηση αγοράς, ανάλυση τάσεων, πίνακες ελέγχου στα μέτρα σας. Έχετε ένα σύνολο δεδομένων που θέλετε να μιλήσει ; Γράψτε μας, η πρώτη ανάλυση προσφέρεται.</p>
        <a class="cta" href="mailto:contact@nov-ai.xyz?subject=%CE%91%CE%BD%CE%AC%CE%BB%CF%85%CF%83%CE%B7%20%CE%B4%CE%B5%CE%B4%CE%BF%CE%BC%CE%AD%CE%BD%CF%89%CE%BD%20-%20%CE%B1%CE%AF%CF%84%CE%B7%CE%BC%CE%B1%20%CF%80%CE%BB%CE%B7%CF%81%CE%BF%CF%86%CF%8C%CF%81%CE%B7%CF%83%CE%B7%CF%82&amp;body=%CE%93%CE%B5%CE%B9%CE%B1%20%CF%83%CE%B1%CF%82%20NovAI%2C%0A%0A%CE%94%CE%B9%CE%AC%CE%B2%CE%B1%CF%83%CE%B1%20%CF%84%CE%B7%CE%BD%20%CE%B1%CE%BD%CE%AC%CE%BB%CF%85%CF%83%CE%AE%20%CF%83%CE%B1%CF%82%20%CF%83%CF%84%CE%BF%20crete.direct%20%CE%BA%CE%B1%CE%B9%20%CE%B8%CE%B1%20%CE%AE%CE%B8%CE%B5%CE%BB%CE%B1%20%CE%BD%CE%B1%20%CE%BC%CE%AC%CE%B8%CF%89%20%CF%80%CE%B5%CF%81%CE%B9%CF%83%CF%83%CF%8C%CF%84%CE%B5%CF%81%CE%B1%20%CE%B3%CE%B9%CE%B1%20%CF%84%CE%B9%CF%82%20%CF%85%CF%80%CE%B7%CF%81%CE%B5%CF%83%CE%AF%CE%B5%CF%82%20%CE%B1%CE%BD%CE%AC%CE%BB%CF%85%CF%83%CE%B7%CF%82%20%CE%B4%CE%B5%CE%B4%CE%BF%CE%BC%CE%AD%CE%BD%CF%89%CE%BD.%0A%0A">Γράψτε μας →</a>
      </div>
    </div>

  </article>

  <footer>
    <div class="fb">crete<span>.</span>direct</div>
    <p>Η Κρήτη, στ' αλήθεια. Χάρτες, λεωφορεία, καλές διευθύνσεις, δωρεάν.</p>
    <p class="src">Πηγές : INSETE (έκθεση Ιουνίου 2026), Τράπεζα της Ελλάδος, Fraport Greece, GTP Headlines, patris.gr και fonien.gr (Ιούλιος 2026, δηλώσεις της αντιπεριφέρειας τουρισμού Κρήτης), ιδιόκτητα δεδομένα crete.direct (1.902 καταλύματα αναλυμένα, Ιούνιος 2026). Τα νούμερα τιμών αντικατοπτρίζουν τις αναρτημένες τιμές και χρησιμεύουν ως δείκτης τάσης.</p>
  </footer>

</div>
`,
};

export const revalidate = 86400;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[pick(locale)];
  return {
    title: m.title,
    description: m.description,
    alternates: buildAlternates(locale, SLUG),
    robots: { index: true, follow: true },
    openGraph: {
      title: m.title,
      description: m.description,
      url: `${BASE_URL}/${locale}${SLUG}`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description },
  };
}

export default async function EnquetePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const key = pick(locale);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      <div id="cd-enq" dangerouslySetInnerHTML={{ __html: BODY[key] }} />
    </>
  );
}
