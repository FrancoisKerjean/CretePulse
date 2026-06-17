import type { ProCopy } from "./campagne-pro.ts";

export function getEntreprisesCopyFR(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Notre projet, pour les entreprises · crete.direct",
      description: "Associez votre marque au compagnon pratique de la Crete. Soutenez le projet, ou rendez-vous visible aupres d'une audience qualifiee.",
    },
    hero: {
      kicker: "partenariat", kickerVariant: "terra",
      title: "Associez votre marque au <hl>compagnon de la Crete</hl>.",
      sub: "Des centaines de milliers de visiteurs preparent leur sejour avec crete.direct, dans leur langue.",
    },
    stats: [
      { n: "22", l: "langues servies" },
      { n: "x26", l: "trafic en 28 jours" },
      { n: "~74%", l: "du trafic sur les bus" },
      { n: "0 pub", l: "intrusive, 0 tracking" },
    ],
    hook: "crete.direct est independant, gratuit et le restera. Pour aller plus loin (plus de bus en direct, une application, l'horizon 2028), nous ouvrons deux facons de nous rejoindre.",
    beats: [
      { id: "audience", kicker: "l'audience", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "22 langues · x26 en 28 jours · ~74% sur les bus", flip: true,
        title: "Une audience qui <hl>prepare</hl>, pas qui zappe.",
        body: "Voyageurs et locaux qui cherchent un bus, une plage, la meteo. Une intention forte, captee dans 22 langues. Service independant, gratuit, zero pub intrusive, zero tracking. Votre marque dans un cadre propre." },
      { id: "independant", kicker: "notre modele", kickerVariant: "calm", scene: "community",
        title: "Independant, gratuit, <hl>ouvert aux partenaires</hl>.",
        body: "Aucun algorithme publicitaire, aucun tracking utilisateur. crete.direct vit de la confiance de ses utilisateurs. Vos soutiens financent l'infrastructure, pas la pub. Une association de marque propre, honnete, durable." },
    ],
    frise: {
      kicker: "pourquoi maintenant",
      title: "On construit la <hl>couche de mobilite</hl> de la Crete.",
      sub: "La donnee qu'on recolte aujourd'hui devient, a l'horizon 2028, un outil pour mieux repartir les flux. Un terrain ou une marque locale a tout interet a se positionner tot.",
      steps: [
        { year: "Aujourd'hui", title: "Une audience qui prepare", text: "Une intention forte, multilingue, sur les bus, les plages et la meteo." },
        { year: "Demain", title: "Plus de direct", text: "Davantage de bus en temps reel sur toute l'ile, et une application dediee." },
        { year: "2028", title: "La couche de mobilite", text: "La donnee qui aide a repartir les flux touristiques de l'ile.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1FAF6}", title: "Soutenir le projet",
        body: "Financez l'infrastructure (serveurs, donnees) qui garde le service gratuit. En echange, une mention Plateforme soutenue par votre marque, visible et honnete.",
        cta: "Devenir sponsor", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Etre visible",
        body: "Vous etes un acteur du tourisme (transport, location, activites) ? Apparaissez aupres de nos visiteurs via l'offre partenaires.",
        cta: "Voir l'offre partenaires", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Devenir sponsor", lead: "On revient vers vous pour caler les details. Aucune grille de prix imposee : on construit ensemble.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "company", label: "Entreprise", required: true, placeholder: "Nom de l'entreprise" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@entreprise.com" },
        { name: "website", label: "Site web (optionnel)", placeholder: "https://" },
        { name: "message", label: "Votre message", type: "textarea", placeholder: "Ce qui vous motive a soutenir crete.direct, et le niveau d'engagement envisage." },
      ],
      submit: "Envoyer ma proposition", sending: "Envoi...", sent: "Proposition envoyee. Merci !", error: "Echec de l'envoi. Reessayez ou ecrivez a contact@kairosguest.com.",
    },
    crossLabel: "Vous etes une institution ?",
  };
}

export function getEntreprisesCopyEN(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Our project, for businesses · crete.direct",
      description: "Put your brand alongside Crete's practical companion. Support the project, or get visible to a qualified audience.",
    },
    hero: {
      kicker: "partnership", kickerVariant: "terra",
      title: "Put your brand alongside <hl>Crete's companion</hl>.",
      sub: "Hundreds of thousands of visitors plan their trip with crete.direct, in their own language.",
    },
    stats: [
      { n: "22", l: "languages served" },
      { n: "x26", l: "traffic in 28 days" },
      { n: "~74%", l: "of traffic on buses" },
      { n: "0 ads", l: "intrusive, 0 tracking" },
    ],
    hook: "crete.direct is independent, free and will stay that way. To go further (more live buses, an app, the 2028 horizon), we open two ways to join us.",
    beats: [
      { id: "audience", kicker: "the audience", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "22 languages · x26 in 28 days · ~74% on buses", flip: true,
        title: "An audience that <hl>plans</hl>, not that zaps.",
        body: "Travellers and locals looking for a bus, a beach, the weather. Strong intent, captured in 22 languages. Independent, free, zero intrusive ads, zero tracking. Your brand in a clean setting." },
      { id: "independant", kicker: "our model", kickerVariant: "calm", scene: "community",
        title: "Independent, free, <hl>open to partners</hl>.",
        body: "No ad algorithms, no user tracking. crete.direct lives on user trust. Your support funds infrastructure, not advertising. A clean, honest, lasting brand association." },
    ],
    frise: {
      kicker: "why now",
      title: "We're building Crete's <hl>mobility layer</hl>.",
      sub: "The data we collect today becomes, by 2028, a tool to better distribute flows. A field where a local brand has every interest in getting in early.",
      steps: [
        { year: "Today", title: "An audience that plans", text: "Strong, multilingual intent on buses, beaches and weather." },
        { year: "Tomorrow", title: "More live", text: "More real-time buses across the island, and a dedicated app." },
        { year: "2028", title: "The mobility layer", text: "Data that helps redistribute the island's tourist flows.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1FAF6}", title: "Support the project",
        body: "Fund the infrastructure (servers, data) that keeps the service free. In return, a Platform supported by your brand mention, visible and honest.",
        cta: "Become a sponsor", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Get visible",
        body: "Are you a tourism player (transport, rental, activities)? Appear to our visitors through the partners offer.",
        cta: "See the partners offer", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Become a sponsor", lead: "We get back to you to sort out the details. No price grid imposed: we build it together.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "company", label: "Company", required: true, placeholder: "Company name" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com" },
        { name: "website", label: "Website (optional)", placeholder: "https://" },
        { name: "message", label: "Your message", type: "textarea", placeholder: "What motivates you to support crete.direct, and the level of engagement you have in mind." },
      ],
      submit: "Send my proposal", sending: "Sending...", sent: "Proposal sent. Thank you!", error: "Sending failed. Try again or email contact@kairosguest.com.",
    },
    crossLabel: "Are you an institution?",
  };
}
