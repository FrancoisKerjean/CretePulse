// Saisie de l identite legale d un loueur (formulaire du back-office). Pur,
// zero I/O : l ecriture vit dans la server action `updatePartnerIdentity`.
//
// ⛔ Ce module ne decide RIEN de la conformite d une facture. La seule autorite
// est `partnerBillingIdentity` (car-invoice.ts) : quels champs sont exiges,
// quelle forme a un numero de TVA exploitable, comment il s imprime. Tout ce qui
// s en approche ici est DERIVE d elle, jamais recopie, une seconde liste
// recopiee deriverait le jour ou la premiere bouge, et l ecran demanderait alors
// un champ que la garde n exige pas, ou pire, tairait un champ qu elle exige.
import { partnerBillingIdentity, type PartnerLegalRow } from "./car-invoice";

/** Colonnes texte de l identite legale, dans l ordre ou la facture les imprime. */
export const IDENTITY_TEXT_FIELDS = [
  "legal_name",
  "legal_form",
  "address_line",
  "postal_code",
  "city",
  "country",
  "vat_id",
] as const;

export type IdentityTextField = (typeof IDENTITY_TEXT_FIELDS)[number];

/** Libelles francais, partages par le formulaire ET par les messages d erreur :
 *  le champ nomme dans le bandeau doit etre celui affiche dans le formulaire. */
export const IDENTITY_FIELD_LABELS: Record<string, string> = {
  legal_name: "raison sociale",
  legal_form: "forme juridique",
  address_line: "adresse",
  postal_code: "code postal",
  city: "ville",
  country: "pays",
  vat_id: "numéro de TVA intracommunautaire",
};

/**
 * ⚠️ Tous prefixes « ex. », et ce n est pas cosmetique : la planche de relecture
 * a montre qu une fiche VIDE se lisait comme une fiche REMPLIE avec l identite
 * d un AUTRE loueur, les exemples sont ceux du seul loueur renseigne en base.
 * Sur un formulaire dont tout l objet est l exactitude juridique, confondre
 * « a remplir » et « deja rempli au nom de quelqu un d autre » est le pire
 * malentendu possible.
 */
const PLACEHOLDERS: Record<IdentityTextField, string> = {
  legal_name: "ex. Lux Trans IKE",
  legal_form: "ex. Private company (IKE), Greece",
  address_line: "ex. Leoforos Knossou 12",
  postal_code: "ex. 71306",
  city: "ex. Heraklion",
  country: "ex. Greece",
  vat_id: "ex. EL801122501",
};

export interface IdentityFormField {
  name: IdentityTextField;
  label: string;
  required: boolean;
  placeholder: string;
}

/**
 * Champs requis par la garde de facturation, LUS a la garde elle-meme : une
 * fiche vide rend exactement la liste des champs sans lesquels aucune facture
 * n est emise. `legal_form` n y figure pas, et c est voulu (cf. car-invoice.ts).
 */
function requiredFields(): string[] {
  const res = partnerBillingIdentity({});
  return res.ok ? [] : res.missing;
}

/** Description du formulaire : quoi saisir, et ce qui bloque la facturation. */
export function identityFormFields(): IdentityFormField[] {
  const required = new Set(requiredFields());
  return IDENTITY_TEXT_FIELDS.map((name) => ({
    name,
    label: IDENTITY_FIELD_LABELS[name],
    required: required.has(name),
    placeholder: PLACEHOLDERS[name],
  }));
}

export interface IdentityStatus {
  complete: boolean;
  /** Noms de colonnes manquantes, dans l ordre du bloc client de la facture. */
  missing: string[];
  /** Les memes, en francais, pour l ecran. */
  missingLabels: string[];
}

/** Etat d une fiche loueur vu du back-office : facturable, ou ce qui manque. */
export function identityStatus(partner: PartnerLegalRow | null | undefined): IdentityStatus {
  const res = partnerBillingIdentity(partner);
  if (res.ok) return { complete: true, missing: [], missingLabels: [] };
  return {
    complete: false,
    missing: res.missing,
    missingLabels: res.missing.map((f) => IDENTITY_FIELD_LABELS[f] ?? f),
  };
}

const trim = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

/**
 * Meme normalisation que celle appliquee a l impression par car-invoice.ts
 * (espaces retires, majuscules). Ce qui est STOCKE doit etre ce qui s IMPRIME :
 * sinon la facture porte « EL801122501 », la base « el 801 122 501 », et aucun
 * rapprochement (VIES, declaration europeenne de services) ne retrouve le
 * numero. L equivalence est verrouillee par un test qui compare la valeur
 * stockee a celle rendue par `partnerBillingIdentity`.
 */
const normalizeVat = (raw: string): string => trim(raw).replace(/\s+/g, "").toUpperCase();

/**
 * Un numero de TVA a-t-il la forme d un identifiant intracommunautaire ?
 * Delegue a la garde, qui ne place `vat_id` dans ses manquants QUE sur un
 * numero inexploitable, la regex n est pas dupliquee ici.
 *
 * ⛔ Ce n est PAS une verification VIES, et rien ici ne pretend l etre.
 */
function vatUsable(vat: string): boolean {
  const res = partnerBillingIdentity({ vat_id: vat });
  return res.ok || !res.missing.includes("vat_id");
}

/**
 * Date de la verification VIES a ecrire, ou null.
 *
 * ⛔ `vat_verified_at` n est pas un champ comme les autres : la page facture
 * imprime, et UNIQUEMENT si cette colonne est remplie, « verified against the
 * European Commission VIES database on <date> and returned as valid ». La poser
 * sans que le controle ait eu lieu fabrique un mensonge sur une piece comptable.
 * D ou les quatre regles ci-dessous.
 */
export function resolveVatVerifiedAt(input: {
  /** L admin declare avoir fait le controle (case cochee). */
  declared: boolean;
  /** Numero de TVA tel qu il va etre stocke (deja normalise). */
  vatId: string;
  /** Fiche telle qu elle est en base avant l enregistrement. */
  current: PartnerLegalRow | null | undefined;
  /** Date civile du jour a Athenes (YYYY-MM-DD). */
  today: string;
}): string | null {
  // 1. Non declare : aucune attestation. C est aussi le seul chemin pour
  //    retirer une attestation posee par erreur.
  if (!input.declared) return null;
  // 2. Un numero inexploitable ne se verifie pas contre VIES : « a demander »
  //    ou un numero grec sans prefixe ne peuvent pas etre declares valides.
  if (!vatUsable(input.vatId)) return null;
  // 3. Le numero a change : le controle portait sur l ANCIEN. Il est refait
  //    aujourd hui, il se date d aujourd hui.
  const previous = normalizeVat(trim(input.current?.vat_id));
  if (previous !== input.vatId) return input.today;
  // 4. Numero inchange et deja verifie : la verification a eu lieu CE jour-la.
  //    Re-dater a chaque enregistrement du formulaire ferait vieillir un
  //    controle reel en fausse fraicheur.
  return trim(input.current?.vat_verified_at) || input.today;
}

export interface IdentityPatchInput {
  values: Partial<Record<IdentityTextField, string>>;
  /** Case « je viens de verifier ce numero sur VIES ». */
  vatVerified: boolean;
  current: PartnerLegalRow | null | undefined;
  today: string;
}

/**
 * Patch a ecrire sur `car_partners`. Les HUIT colonnes y figurent toujours, y
 * compris celles laissees vides : un champ efface a l ecran doit s effacer en
 * base, sinon l ecran ment sur ce qui est stocke. Une valeur vide s ecrit null
 * et jamais chaine vide, une chaine vide se lit « renseigne » a l oeil.
 */
export function buildIdentityPatch(input: IdentityPatchInput): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  for (const field of IDENTITY_TEXT_FIELDS) {
    const raw = input.values[field] ?? "";
    const value = field === "vat_id" ? normalizeVat(raw) : trim(raw);
    patch[field] = value || null;
  }
  patch.vat_verified_at = resolveVatVerifiedAt({
    declared: input.vatVerified,
    vatId: patch.vat_id ?? "",
    current: input.current,
    today: input.today,
  });
  return patch;
}

/**
 * Date civile du jour a Athenes. `vat_verified_at` est une colonne `date` : la
 * calculer en UTC daterait de la veille tout controle fait apres 02h00 locales.
 */
export function todayAthens(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Athens" }).format(now);
}
