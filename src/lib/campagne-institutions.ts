import type { ProCopy } from "./campagne-pro.ts";

export function getInstitutionsCopyFR(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Notre projet, pour les institutions · crete.direct",
      description: "crete.direct, le premier referentiel unifie du transport cretois. Partenariat de donnees et co-financement, a la veille de Kastelli 2028.",
    },
    hero: {
      kicker: "le projet", kickerVariant: "go",
      title: "Le bus cretois, enfin <hl>sur une seule carte</hl>.",
      sub: "crete.direct est le premier referentiel unifie du transport de l'ile. Gratuit pour le public, ouvert au dialogue avec les autorites.",
    },
    stats: [
      { n: "2", l: "reseaux KTEL non relies" },
      { n: "6 M+", l: "visiteurs par an" },
      { n: "18 M", l: "pax Kastelli 2028" },
      { n: "1er", l: "agregateur bus de l'ile" },
    ],
    hook: "Le transport public d'une des plus grandes destinations d'Europe n'a aucune couche numerique unifiee. Nous l'avons batie, gratuite pour le public, et nous voulons la mettre au service de la gestion des flux.",
    beats: [
      { id: "constat", kicker: "le constat", kickerVariant: "terracotta", emoji: "\u{1F410}", emojiCap: "on attend... le bus arrive quand ?", flip: true,
        title: "Deux reseaux qui ne se parlent pas.",
        body: "Le bus interurbain cretois repose sur deux societes KTEL en silos : pas d'API, pas de donnee ouverte. Google Maps lui-meme ne sait pas y router un trajet. Et <hl>Kastelli 2028</hl> arrive sans plan de desserte collective." },
      { id: "bati", kicker: "ce qu'on a fait", kickerVariant: "go", scene: "signpost",
        title: "Le referentiel, on l'a deja <hl>construit</hl>.",
        body: "Le seul planificateur unifie des deux KTEL : 292 lignes, horaires, prix, en 22 langues. Une carte temps reel, et une traction reelle (trafic multiplie par 26 en 28 jours). Trafic aeroportuaire officiel, hebergements agreges, 2 296 points d'interet, meteo et mer en direct." },
    ],
    frise: {
      kicker: "notre cap",
      title: "De la donnee d'aujourd'hui aux lignes de <hl>2028</hl>.",
      sub: "On collecte, on relie, on anticipe. L'horizon : aider a dessiner des dessertes et lisser les flux touristiques de toute l'ile.",
      steps: [
        { year: "Aujourd'hui", title: "On collecte", text: "Horaires des deux KTEL, frequentation, trafic aerien, meteo et mer, unifies et multilingues." },
        { year: "Demain", title: "On modelise", text: "Croiser aeroport, hebergement, saison et evenements pour anticiper la pression par zone et par jour." },
        { year: "2028", title: "On propose des lignes", text: "Calibrer des dessertes a partir de la donnee, dont Kastelli, pour repartir les flux.", future: true },
      ],
    },
    ask: {
      kicker: "notre demande", title: "Construisons cette couche <hl>ensemble</hl>.",
      body: "Un rendez-vous pour explorer un partenariat de donnees (acces aux horaires KTEL), une reconnaissance comme partenaire flux de la Region, et le co-financement de l'infrastructure qui garde le service gratuit.",
      dossierLabel: "Telecharger le dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-fr.pdf",
    },
    form: {
      variant: "institution",
      title: "Prendre contact", lead: "On repond sous 48h. Vos coordonnees servent uniquement a vous recontacter.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "org", label: "Organisme", required: true, placeholder: "Region, office de tourisme, KTEL..." },
        { name: "role", label: "Fonction", placeholder: "Votre fonction" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@organisme.gr" },
        { name: "message", label: "Objet", type: "textarea", placeholder: "En quelques mots, ce que vous aimeriez explorer avec nous." },
      ],
      submit: "Envoyer la demande", sending: "Envoi...", sent: "Message envoye. Merci !", error: "Echec de l'envoi. Reessayez ou ecrivez a contact@kairosguest.com.",
    },
  };
}

export function getInstitutionsCopyEN(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Our project, for institutions · crete.direct",
      description: "crete.direct, the first unified reference of Cretan transport. Data partnership and co-funding, ahead of Kastelli 2028.",
    },
    hero: {
      kicker: "the project", kickerVariant: "go",
      title: "Crete's buses, finally <hl>on one map</hl>.",
      sub: "crete.direct is the first unified reference of the island's transport. Free for the public, open to dialogue with the authorities.",
    },
    stats: [
      { n: "2", l: "unconnected KTEL networks" },
      { n: "6 M+", l: "visitors per year" },
      { n: "18 M", l: "pax Kastelli 2028" },
      { n: "1st", l: "island-wide bus aggregator" },
    ],
    hook: "The public transport of one of Europe's largest destinations has no unified digital layer. We built it, free for the public, and we want to put it at the service of flow management.",
    beats: [
      { id: "constat", kicker: "the problem", kickerVariant: "terracotta", emoji: "\u{1F410}", emojiCap: "waiting... when is the bus coming?", flip: true,
        title: "Two networks that don't talk to each other.",
        body: "Cretan intercity buses run on two siloed KTEL companies: no API, no open data. Google Maps itself cannot route a trip. And <hl>Kastelli 2028</hl> is coming with no collective transport plan." },
      { id: "bati", kicker: "what we built", kickerVariant: "go", scene: "signpost",
        title: "The reference, we already <hl>built it</hl>.",
        body: "The only unified planner across both KTEL networks: 292 routes, timetables, fares, in 22 languages. A real-time map, and real traction (traffic up 26x in 28 days). Official airport traffic, aggregated accommodation, 2,296 points of interest, live weather and sea." },
    ],
    frise: {
      kicker: "our direction",
      title: "From today's data to the lines of <hl>2028</hl>.",
      sub: "We collect, connect, anticipate. The horizon: help design services and smooth tourist flows across the island.",
      steps: [
        { year: "Today", title: "We collect", text: "Timetables of both KTEL, footfall, air traffic, weather and sea, unified and multilingual." },
        { year: "Tomorrow", title: "We model", text: "Cross airport, accommodation, season and events to anticipate pressure by area and by day." },
        { year: "2028", title: "We propose lines", text: "Calibrate services from the data, including Kastelli, to redistribute flows.", future: true },
      ],
    },
    ask: {
      kicker: "our ask", title: "Let's build this layer <hl>together</hl>.",
      body: "A meeting to explore a data partnership (access to KTEL timetables), recognition as a flow partner of the Region, and co-funding of the infrastructure that keeps the service free.",
      dossierLabel: "Download the dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-en.pdf",
    },
    form: {
      variant: "institution",
      title: "Get in touch", lead: "We reply within 48h. Your details are only used to get back to you.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "org", label: "Organisation", required: true, placeholder: "Region, tourism board, KTEL..." },
        { name: "role", label: "Role", placeholder: "Your role" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@organisation.gr" },
        { name: "message", label: "Subject", type: "textarea", placeholder: "In a few words, what you would like to explore with us." },
      ],
      submit: "Send the request", sending: "Sending...", sent: "Message sent. Thank you!", error: "Sending failed. Try again or email contact@kairosguest.com.",
    },
  };
}
