import type { Locale } from "@/lib/types";
import { Flame, AlertTriangle, Phone, Shield } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaData: Record<string, { title: string; desc: string }> = {
    en: { title: "Fire Risk & Safety in Crete", desc: "Fire safety information and emergency contacts" },
    fr: { title: "Risque d'Incendie en Crète", desc: "Informations de sécurité incendie et contacts d'urgence" },
    de: { title: "Brandrisiko auf Kreta", desc: "Informationen zur Brandsicherheit und Notfallkontakte" },
    el: { title: "Κίνδυνος Πυρκαγιάς στην Κρήτη", desc: "Πληροφορίες ασφάλειας πυρκαγιάς και επαφές έκτακτης ανάγκης" },
  };
  const m = metaData[locale] || metaData.en;
  return { title: m.title, description: m.desc };
}

const CONTENT: Record<Locale, {
  title: string;
  subtitle: string;
  riskTitle: string;
  riskCurrentLevel: string;
  riskHighSeason: string;
  riskLowSeason: string;
  linkTitle: string;
  linkDesc: string;
  emergencyTitle: string;
  emergencyDesc: string;
  tipsTitle: string;
  tipsList: string[];
  disclaimerTitle: string;
  disclaimerText: string;
}> = {
  en: {
    title: "Fire Risk & Safety",
    subtitle: "Real-time information for your safety",
    riskTitle: "Current Fire Risk Level",
    riskCurrentLevel: "High Risk",
    riskHighSeason: "June to September: Peak fire season",
    riskLowSeason: "October to May: Low fire season",
    linkTitle: "EFFIS Copernicus Fire Map",
    linkDesc: "Official EU fire detection system - real-time satellite data",
    emergencyTitle: "Emergency Numbers",
    emergencyDesc: "Call immediately if you see smoke or fire",
    tipsTitle: "Fire Safety Tips for Tourists",
    tipsList: [
      "Never leave campfires or barbecues unattended",
      "Dispose of cigarettes safely in sand or water only",
      "Keep away from dry grass and pine forests during high winds",
      "Follow local evacuation orders immediately",
      "Report suspicious fires to emergency services",
    ],
    disclaimerTitle: "Disclaimer",
    disclaimerText: "This page provides general information. For real-time alerts and official updates, contact local authorities or dial 199.",
  },
  fr: {
    title: "Risque d'Incendie et Sécurité",
    subtitle: "Information en temps réel pour votre sécurité",
    riskTitle: "Niveau de Risque Actuel",
    riskCurrentLevel: "Risque Élevé",
    riskHighSeason: "Juin à septembre : Saison des incendies",
    riskLowSeason: "Octobre à mai : Saison à faible risque",
    linkTitle: "Carte Copernicus EFFIS",
    linkDesc: "Système officiel de détection d'incendies de l'UE - données satellites en temps réel",
    emergencyTitle: "Numéros d'Urgence",
    emergencyDesc: "Appelez immédiatement si vous voyez de la fumée ou un incendie",
    tipsTitle: "Conseils de Sécurité Incendie pour Touristes",
    tipsList: [
      "Ne laissez jamais les feux de camp ou les barbecues sans surveillance",
      "Jetez les cigarettes de manière sûre dans le sable ou l'eau uniquement",
      "Restez éloigné de l'herbe sèche et des forêts de pins par temps de vent",
      "Suivez immédiatement les ordres d'évacuation locaux",
      "Signalez les incendies suspects aux services d'urgence",
    ],
    disclaimerTitle: "Clause de Non-Responsabilité",
    disclaimerText: "Cette page fournit des informations générales. Pour les alertes en temps réel et les mises à jour officielles, contactez les autorités locales ou composez le 199.",
  },
  de: {
    title: "Brandrisiko und Sicherheit",
    subtitle: "Echtzeitinformationen für Ihre Sicherheit",
    riskTitle: "Aktuelles Brandrisiko",
    riskCurrentLevel: "Hohes Brandrisiko",
    riskHighSeason: "Juni bis September: Brandsaison",
    riskLowSeason: "Oktober bis Mai: Geringe Brandgefahr",
    linkTitle: "EFFIS Copernicus Brandkarte",
    linkDesc: "Amtliches EU-Branderkennungssystem - Echtzeit-Satellitendaten",
    emergencyTitle: "Nummern für Notfälle",
    emergencyDesc: "Rufen Sie sofort an, wenn Sie Rauch oder Feuer sehen",
    tipsTitle: "Brandschutztipps für Touristen",
    tipsList: [
      "Lagerfeuern oder Grills niemals unbeaufsichtigt lassen",
      "Zigaretten sicher nur in Sand oder Wasser entsorgen",
      "Meiden Sie trockenes Gras und Kiefernwälder bei starkem Wind",
      "Befolgen Sie lokale Evakuierungsbefehle sofort",
      "Melden Sie verdächtige Brände den Rettungsdiensten",
    ],
    disclaimerTitle: "Haftungsausschluss",
    disclaimerText: "Diese Seite enthält allgemeine Informationen. Für Echtzeitwarnungen und offizielle Aktualisierungen wenden Sie sich an die Behörden vor Ort oder wählen Sie 199.",
  },
  el: {
    title: "Κίνδυνος Πυρκαγιάς και Ασφάλεια",
    subtitle: "Πληροφορίες σε πραγματικό χρόνο για την ασφάλειά σας",
    riskTitle: "Τρέχον Επίπεδο Κινδύνου",
    riskCurrentLevel: "Υψηλός Κίνδυνος",
    riskHighSeason: "Ιούνιος έως Σεπτέμβριος: Εποχή πυρκαγιών",
    riskLowSeason: "Οκτώβριος έως Μάιος: Χαμηλός κίνδυνος",
    linkTitle: "Χάρτης Πυρκαγιών EFFIS Copernicus",
    linkDesc: "Επίσημο σύστημα ανίχνευσης πυρκαγιών της ΕΕ - δεδομένα δορυφόρων σε πραγματικό χρόνο",
    emergencyTitle: "Αριθμοί Έκτακτης Ανάγκης",
    emergencyDesc: "Καλέστε αμέσως εάν δείτε καπνό ή φωτιά",
    tipsTitle: "Συμβουλές Ασφάλειας Πυρκαγιάς για Τουρίστες",
    tipsList: [
      "Ποτέ μην αφήνετε φωτιές κατασκήνωσης ή μπάρμπεκιου χωρίς επίβλεψη",
      "Απορρίψτε τα τσιγάρα με ασφάλεια μόνο στην άμμο ή το νερό",
      "Μείνετε μακριά από στεγνό χόρτο και δάση πεύκων με ισχυρούς ανέμους",
      "Ακολουθήστε αμέσως τις τοπικές εντολές εκκένωσης",
      "Αναφέρετε υποψίαστες πυρκαγιές στις υπηρεσίες έκτακτης ανάγκης",
    ],
    disclaimerTitle: "Αποποίηση Ευθύνης",
    disclaimerText: "Αυτή η σελίδα παρέχει γενικές πληροφορίες. Για ειδοποιήσεις σε πραγματικό χρόνο και επίσημες ενημερώσεις, επικοινωνήστε με τις τοπικές αρχές ή καλέστε 199.",
  },
};

function isHighSeason(): boolean {
  const month = new Date().getMonth();
  // June = 5, September = 8 (0-indexed)
  return month >= 5 && month <= 8;
}

export default async function FireAlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;
  const content = CONTENT[loc];
  const highSeason = isHighSeason();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Flame className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-red-600">{content.title}</h1>
          </div>
          <p className="text-text-muted text-lg">{content.subtitle}</p>
        </div>

        {/* Risk Level Card */}
        <div className="mb-8 rounded-xl border-2 border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-text text-lg mb-4">{content.riskTitle}</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse" />
            <span className="text-2xl font-bold text-red-600">{content.riskCurrentLevel}</span>
          </div>
          <div className="space-y-2 text-text-muted">
            <p className={highSeason ? "font-semibold text-red-600" : ""}>
              {highSeason ? "🔥 " : "✓ "} {content.riskHighSeason}
            </p>
            <p className={!highSeason ? "font-semibold text-green-600" : ""}>
              {!highSeason ? "✓ " : ""} {content.riskLowSeason}
            </p>
          </div>
        </div>

        {/* EFFIS Link */}
        <div className="mb-8 rounded-xl border border-border bg-white p-6">
          <h2 className="font-semibold text-text text-lg mb-3">{content.linkTitle}</h2>
          <p className="text-text-muted mb-4">{content.linkDesc}</p>
          <a
            href="https://effis.jrc.ec.europa.eu/apps/effis_current_situation/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-5 h-5" />
            Open EFFIS Map
          </a>
        </div>

        {/* Emergency Numbers */}
        <div className="mb-8 rounded-xl border border-border bg-white p-6">
          <h2 className="font-semibold text-text text-lg mb-4">{content.emergencyTitle}</h2>
          <p className="text-text-muted mb-6">{content.emergencyDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { number: "199", label: "Fire Dept", labelEl: "Πυροσβεστική" },
              { number: "112", label: "Emergency", labelEl: "Έκτακτη Ανάγκη" },
              { number: "166", label: "Ambulance", labelEl: "Ασθενοφόρο" },
            ].map((item) => (
              <div key={item.number} className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <Phone className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{item.number}</div>
                  <div className="text-xs text-text-muted">
                    {loc === "el" ? item.labelEl : item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fire Safety Tips */}
        <div className="mb-8 rounded-xl border border-border bg-white p-6">
          <h2 className="font-semibold text-text text-lg mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            {content.tipsTitle}
          </h2>
          <ul className="space-y-3">
            {content.tipsList.map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-red-600 font-bold mt-0.5 shrink-0">•</span>
                <span className="text-text">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900 mb-2">{content.disclaimerTitle}</h3>
          <p className="text-sm text-amber-800">{content.disclaimerText}</p>
        </div>
      </div>
    </main>
  );
}
