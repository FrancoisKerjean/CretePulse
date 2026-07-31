# Facturation automatique de la commission loueur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Émettre automatiquement, le premier jour de la location, une facture numérotée de commission au loueur qui a gagné la demande, avec lien de paiement, sans aucun geste manuel.

**Architecture:** Un cron quotidien sélectionne les locations qui démarrent, bascule la demande en « louée » sur le prix du devis accepté, crée une facture numérotée dans une série dédiée et envoie au loueur un lien vers une page facture publique. La session Stripe naît au clic sur cette page, jamais dans le cron. Le socle Stripe livré le 29/07 est conservé ; `requestCommission` est seulement scindé pour que la création de session sorte du chemin nocturne.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase/PostgREST sur Postgres auto-hébergé, Stripe (compte plateforme, sans Connect), Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-31-car-commission-invoice-design.md`

---

## Préalables, à lire avant la tâche 1

⛔ **Partir de `origin/master` à jour.** Le socle commission du 29/07 n'existe que là.
`git fetch origin && git checkout -b feat/car-commission-invoice origin/master`

⛔ **Six terminaux travaillent sur ce dépôt.** Jamais de `git add -A`, jamais de `git stash`.
Ajouter fichier par fichier, chemin explicite.

⛔ **CRLF.** Avant chaque commit, comparer `git diff --shortstat` et
`git diff --shortstat --ignore-cr-at-eol`. Si les deux diffèrent, le diff contient du bruit
de fin de ligne : ne committer que les fichiers réellement touchés.

⛔ **Ne rien armer.** `CAR_COMMISSION_ENABLED` reste absent de l'environnement pendant tout
ce plan. Aucune tâche ne le pose.

**Vérifications à passer à chaque commit :**
```bash
npx vitest run
npx tsc --noEmit
```

**Fichiers touchés, vue d'ensemble :**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260801_car_commission_invoices.sql` | Créer | Table facture, compteur annuel, fonction de numérotation |
| `src/lib/car-invoice.ts` | Créer | Logique pure : éligibilité d'une ligne, formatage du numéro, corps de l'avoir |
| `src/lib/car-invoice-server.ts` | Créer | I/O facture : création idempotente, lecture par hash de token, marquage payé et avoir |
| `src/lib/car-commission-server.ts` | Modifier | Scinder : la facture et l'email d'un côté, `ensureCommissionCheckout` de l'autre |
| `src/lib/email.ts:1814` | Modifier | `sendPartnerCommissionRequest` doit rendre un booléen |
| `src/app/api/cron/car-commission-invoice/route.ts` | Créer | Le cron |
| `src/app/[locale]/invoice/[token]/page.tsx` | Créer | Page facture publique |
| `src/app/api/car-rental/commission/checkout/route.ts` | Créer | Crée la session au clic |
| `src/app/api/car-rental/commission/webhook/route.ts` | Modifier | Écrire aussi `paid_at` sur la facture |
| `src/app/admin/car-rental/actions.ts` | Modifier | Action « la location n'a pas eu lieu » |
| `vercel.json` | Modifier | 7ᵉ cron |

---

### Task 1: Migration — table facture, compteur annuel, numérotation atomique

**Files:**
- Create: `supabase/migrations/20260801_car_commission_invoices.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Facture de commission loueur. Serie DEDIEE `NOVAI-CD-<annee>-NNN`, separee de
-- la sequence societe `NOVAI-2026-NNN` tenue a la main : sans cela un cron de 5h
-- du matin et une facture emise a la main le meme jour se disputeraient un numero.
-- Plusieurs series sont licites des lors que chacune est continue.

create table if not exists public.car_commission_invoices (
  id               bigint generated always as identity primary key,
  number           text not null unique,
  -- UNIQUE : idempotence STRUCTURELLE. Le verrou applicatif
  -- `commission_requested_at` est relache par releaseLock() en cas d'echec, donc
  -- il ne peut pas porter cette garantie a lui seul.
  request_id       bigint not null unique references public.car_requests(id),
  partner_id       bigint not null references public.car_partners(id),
  base_amount_eur  numeric(10,2) not null check (base_amount_eur > 0),
  rate             numeric(5,4)  not null check (rate > 0 and rate <= 0.5),
  amount_eur       numeric(10,2) not null check (amount_eur > 0),
  -- Le token n'est jamais stocke en clair : meme convention que
  -- car_requests.quote_token_hash.
  token_hash       text not null unique,
  issued_at        timestamptz not null default now(),
  -- NULL = numerotee mais jamais partie. Cet etat doit rester rattrapable.
  sent_at          timestamptz,
  paid_at          timestamptz,
  credited_at      timestamptz,
  credit_number    text unique,
  credit_reason    text
);

create index if not exists car_commission_invoices_partner_idx
  on public.car_commission_invoices (partner_id);

-- Compteur PAR ANNEE. Une sequence Postgres nue ne connait pas l'annee : elle
-- continuerait de compter le 1er janvier et produirait NOVAI-CD-2026-012 en 2027.
create table if not exists public.car_commission_invoice_counters (
  year     int primary key,
  last_seq int not null default 0
);

-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING est atomique : deux appels
-- concurrents obtiennent deux numeros distincts, sans verrou explicite.
create or replace function public.next_car_invoice_number(prefix text default 'NOVAI-CD')
returns text language plpgsql as $$
declare
  y int := extract(year from (now() at time zone 'UTC'))::int;
  s int;
begin
  insert into public.car_commission_invoice_counters as c (year, last_seq)
  values (y, 1)
  on conflict (year) do update set last_seq = c.last_seq + 1
  returning c.last_seq into s;
  return prefix || '-' || y::text || '-' || lpad(s::text, 3, '0');
end;
$$;

-- PostgREST self-hosted : sans ce reload, la table reste invisible du client.
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Appliquer sur le Postgres du VPS**

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -v ON_ERROR_STOP=1' \
  < supabase/migrations/20260801_car_commission_invoices.sql
```
Attendu : `CREATE TABLE`, `CREATE INDEX`, `CREATE FUNCTION`, `NOTIFY`.

- [ ] **Step 3: Vérifier l'atomicité de la numérotation en conditions réelles**

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -t -A' <<'SQL'
select public.next_car_invoice_number() from generate_series(1,3);
select count(*), count(distinct n) from (
  select public.next_car_invoice_number() as n from generate_series(1,50)
) t;
SQL
```
Attendu : les 3 premiers numéros sont `NOVAI-CD-2026-001`, `-002`, `-003`, puis `50|50`
— autant de numéros distincts que d'appels, aucun doublon.

- [ ] **Step 3bis: Vérifier le passage d'année**

⛔ C'est le défaut qu'une séquence Postgres nue aurait introduit sans qu'on le voie avant
le 1er janvier. Le compteur est par année, donc il doit repartir à 1.

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -t -A' <<'SQL'
-- Simuler une annee precedente deja bien remplie.
insert into public.car_commission_invoice_counters (year, last_seq) values (2025, 87)
  on conflict (year) do update set last_seq = 87;
select public.next_car_invoice_number();
select year, last_seq from public.car_commission_invoice_counters order by year;
SQL
```
Expected : le numéro rendu porte **l'année courante** et un compteur qui ignore
totalement les 87 de 2025. La table montre bien deux lignes indépendantes.

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -c "delete from public.car_commission_invoice_counters where year = 2025"'
```

- [ ] **Step 4: Remettre le compteur à zéro après le test**

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -c "delete from public.car_commission_invoice_counters"'
```
Attendu : `DELETE 1`. Sans cette remise à zéro, la première vraie facture porterait
le numéro 54 et la série commencerait avec un trou de 53 numéros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260801_car_commission_invoices.sql
git commit -m "feat(car-commission): table facture, compteur annuel, numerotation atomique"
```

---

### Task 2: Logique pure d'éligibilité

**Files:**
- Create: `src/lib/car-invoice.ts`
- Test: `src/lib/car-invoice.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { isInvoiceable, invoiceAmounts, type InvoiceCandidate } from "./car-invoice";

const START = "2026-08-05";
const TODAY = "2026-08-07";

const ok: InvoiceCandidate = {
  id: 39,
  accepted_at: "2026-07-26T12:00:00Z",
  outcome: null,
  date_from: "2026-08-07",
  booking_paid_at: null,
  quoted_by_partner_id: 16,
  quoted_price: 200,
};

describe("isInvoiceable", () => {
  it("facture une location qui demarre aujourd hui", () => {
    expect(isInvoiceable(ok, TODAY, START)).toBe(true);
  });

  it("rattrape une location dont le depart est passe", () => {
    // Le cron est son propre rattrapage : une journee de panne ne doit pas
    // perdre une facture definitivement.
    expect(isInvoiceable({ ...ok, date_from: "2026-08-06" }, TODAY, START)).toBe(true);
  });

  it("ne facture pas une location qui n a pas encore demarre", () => {
    expect(isInvoiceable({ ...ok, date_from: "2026-08-08" }, TODAY, START)).toBe(false);
  });

  it("ne rattrape jamais l historique anterieur a la mise en service", () => {
    // car_requests id=27 a ete facturee a la main le 30/07 (NOVAI-2026-003).
    expect(isInvoiceable({ ...ok, date_from: "2026-07-30" }, TODAY, START)).toBe(false);
  });

  it("ne ressuscite pas une location deja perdue", () => {
    // Sans cette garde, une location marquee « lost » garde son accepted_at et
    // sa date_from passee : le cron la repasserait en « rented » et facturerait
    // un loueur pour une location dont on sait qu elle n a pas eu lieu.
    expect(isInvoiceable({ ...ok, outcome: "lost" }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, outcome: "rented" }, TODAY, START)).toBe(false);
  });

  it("ne facture pas une location deja payee en ligne", () => {
    // Commission deja prelevee par le tunnel de paiement : facturer serait
    // encaisser deux fois.
    expect(isInvoiceable({ ...ok, booking_paid_at: "2026-08-01T09:00:00Z" }, TODAY, START)).toBe(false);
  });

  it("ne facture rien sans loueur gagnant ni sans prix accepte", () => {
    expect(isInvoiceable({ ...ok, quoted_by_partner_id: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, quoted_price: null }, TODAY, START)).toBe(false);
    expect(isInvoiceable({ ...ok, accepted_at: null }, TODAY, START)).toBe(false);
  });
});

describe("invoiceAmounts", () => {
  it("calcule la commission sur le prix du devis accepte", () => {
    expect(invoiceAmounts(200, 0.1)).toEqual({ base: 200, rate: 0.1, amount: 20 });
  });

  it("arrondit au centime", () => {
    expect(invoiceAmounts(333.33, 0.1)).toEqual({ base: 333.33, rate: 0.1, amount: 33.33 });
  });

  it("rend null sous le minimum encaissable par Stripe", () => {
    expect(invoiceAmounts(4, 0.1)).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/car-invoice.test.ts`
Expected: FAIL, `Failed to resolve import "./car-invoice"`.

- [ ] **Step 3: Écrire l'implémentation minimale**

```ts
// Logique pure de la facturation de commission : aucune I/O, aucun acces base.
// Tout ce qui decide « faut-il facturer cette ligne » vit ici pour etre teste
// sans Supabase ni Stripe.
import { STRIPE_MIN_CHARGE_EUR } from "./car-commission";

export interface InvoiceCandidate {
  id: number;
  accepted_at: string | null;
  outcome: string | null;
  date_from: string;
  booking_paid_at: string | null;
  quoted_by_partner_id: number | null;
  quoted_price: number | null;
}

/**
 * `today` et `start` sont des dates ISO `YYYY-MM-DD`. La comparaison est
 * lexicographique, exacte sur ce format, et sans fuseau : la date de depart est
 * une date civile, pas un instant.
 */
export function isInvoiceable(r: InvoiceCandidate, today: string, start: string): boolean {
  if (!r.accepted_at) return false;
  // Une demande deja tranchee ne se refacture pas, et surtout ne se ressuscite pas.
  if (r.outcome !== null) return false;
  if (r.booking_paid_at) return false;
  if (r.quoted_by_partner_id == null) return false;
  if (r.quoted_price == null || r.quoted_price <= 0) return false;
  if (r.date_from < start) return false;
  // `<=` et non `=` : le cron est son propre rattrapage.
  return r.date_from <= today;
}

export interface InvoiceAmounts {
  base: number;
  rate: number;
  amount: number;
}

/** Rend null quand la commission tombe sous le minimum encaissable par Stripe. */
export function invoiceAmounts(base: number, rate: number): InvoiceAmounts | null {
  const amount = Math.round(base * rate * 100) / 100;
  if (amount < STRIPE_MIN_CHARGE_EUR) return null;
  return { base, rate, amount };
}
```

- [ ] **Step 4: Vérifier que ça passe**

Run: `npx vitest run src/lib/car-invoice.test.ts && npx tsc --noEmit`
Expected: tous les tests PASS, 0 erreur TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-invoice.ts src/lib/car-invoice.test.ts
git commit -m "feat(car-commission): eligibilite et montants de facture, logique pure"
```

---

### Task 3: Retoucher le corps de l'email et ajouter le numéro d'avoir

**Files:**
- Modify: `src/lib/car-commission.ts` (`CommissionMail`, `commissionRequestBody`)
- Modify: `src/lib/car-commission.test.ts`
- Modify: `src/lib/car-invoice.ts`
- Modify: `src/lib/car-invoice.test.ts`

⛔ **On RETOUCHE `commissionRequestBody`, on n'écrit pas un second rédacteur d'email.**
Deux fonctions qui composent le même message dériveraient l'une de l'autre, et le dépôt a
déjà payé ce défaut (`SHARED_OFFER_COPY`, commit `5d959fe`).

- [ ] **Step 1: Ajouter les tests dans `car-commission.test.ts`**

```ts
const mail = {
  requestId: 39,
  partnerName: "Luxtrans Crete",
  commissionEur: 20,
  finalAmountEur: 200,
  dateFrom: "2026-08-07",
  dateTo: "2026-08-14",
  payUrl: "https://crete.direct/en/invoice/abc",
  invoiceNumber: "NOVAI-CD-2026-004",
};

describe("commissionRequestBody apres retouche", () => {
  it("annonce le prix du devis accepte, jamais un montant encaisse", () => {
    // Au premier jour de location on ignore ce que le loueur a encaisse :
    // ecrire « the amount you collected » serait faux.
    const body = commissionRequestBody(mail);
    expect(body).toContain("quoted and accepted");
    expect(body).not.toContain("you collected");
  });

  it("porte le numero de facture", () => {
    expect(commissionRequestBody(mail)).toContain("NOVAI-CD-2026-004");
  });

  it("pointe vers la page facture et jamais vers Stripe", () => {
    const body = commissionRequestBody(mail);
    expect(body).toContain("/invoice/");
    expect(body).not.toContain("stripe.com");
  });

  it("rappelle que l argent de la location reste chez le loueur", () => {
    expect(commissionRequestBody(mail)).toContain("Your rental money stays with you");
  });

  it("dit au loueur comment faire annuler une location qui n a pas eu lieu", () => {
    expect(commissionRequestBody(mail)).toContain("did not take place");
  });
});
```

- [ ] **Step 1bis: Ajouter le test d'avoir dans `car-invoice.test.ts`**

```ts
import { creditNumberFor, creditMailBody } from "./car-invoice";

describe("creditNumberFor", () => {
  it("derive le numero d avoir de la facture, sans consommer la serie", () => {
    expect(creditNumberFor("NOVAI-CD-2026-004")).toBe("NOVAI-CD-2026-004-A");
  });
});

describe("creditMailBody", () => {
  it("nomme la facture annulee et la raison", () => {
    const body = creditMailBody({
      creditNumber: "NOVAI-CD-2026-004-A",
      number: "NOVAI-CD-2026-004",
      partnerName: "Luxtrans Crete",
      amountEur: 20,
      reason: "rental did not take place",
    });
    expect(body).toContain("NOVAI-CD-2026-004-A");
    expect(body).toContain("NOVAI-CD-2026-004");
    expect(body).toContain("rental did not take place");
    expect(body).toContain("nothing to pay");
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/car-commission.test.ts src/lib/car-invoice.test.ts`
Expected: FAIL sur les deux fichiers — `invoiceNumber` inconnu de `CommissionMail`,
`creditNumberFor is not a function`.

- [ ] **Step 3: Retoucher `src/lib/car-commission.ts`**

Ajouter le champ à l'interface existante :

```ts
export interface CommissionMail {
  requestId: number;
  partnerName: string;
  commissionEur: number;
  finalAmountEur: number;
  dateFrom: string;
  dateTo: string;
  payUrl: string;
  /** Numero de la facture. Le loueur en a besoin pour son rapprochement. */
  invoiceNumber: string;
}
```

Remplacer `commissionRequestBody` par :

```ts
export function commissionRequestBody(m: CommissionMail): string {
  return [
    `Hi ${m.partnerName},`,
    ``,
    `Your rental ${m.dateFrom} to ${m.dateTo} starts today, so here is the commission invoice.`,
    ``,
    `Invoice: ${m.invoiceNumber}`,
    `Rental reference: ${m.requestId}`,
    // ⛔ « quoted and accepted », jamais « collected » : au premier jour de
    // location nous ignorons ce que le loueur a encaisse.
    `Rental price quoted and accepted by the traveller: ${m.finalAmountEur.toFixed(2)} EUR`,
    `crete.direct commission: ${m.commissionEur.toFixed(2)} EUR`,
    ``,
    `View and pay the invoice here:`,
    m.payUrl,
    ``,
    `You can pay by card on that page, or by bank transfer to the IBAN shown on it.`,
    `Your rental money stays with you, we never touch it.`,
    ``,
    `If this rental did not take place, reply to this email and we will cancel the invoice.`,
  ].join("\n");
}
```

- [ ] **Step 3bis: Ajouter l'avoir dans `src/lib/car-invoice.ts`**

```ts
/**
 * L avoir porte le numero de sa facture suffixe `-A`. Il ne consomme donc pas
 * la serie : le rapprochement facture/avoir se lit a l oeil, et un trou dans la
 * numerotation des factures ne peut pas apparaitre a cause d un avoir.
 */
export function creditNumberFor(invoiceNumber: string): string {
  return `${invoiceNumber}-A`;
}

export interface CreditMail {
  creditNumber: string;
  number: string;
  partnerName: string;
  amountEur: number;
  reason: string;
}

export function creditMailBody(m: CreditMail): string {
  return [
    `Hi ${m.partnerName},`,
    ``,
    `Credit note ${m.creditNumber} cancels invoice ${m.number} in full (${m.amountEur.toFixed(2)} EUR).`,
    `Reason: ${m.reason}.`,
    ``,
    `There is nothing to pay for this rental.`,
  ].join("\n");
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. ⛔ `tsc` va signaler tous les appelants de `CommissionMail` qui ne
passent pas encore `invoiceNumber` : c'est voulu, la tâche 6 les corrige. S'il reste des
erreurs ailleurs que dans `car-commission-server.ts`, les traiter ici.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-commission.ts src/lib/car-commission.test.ts src/lib/car-invoice.ts src/lib/car-invoice.test.ts
git commit -m "feat(car-commission): corps d email retouche vers la facture, numero d avoir"
```

---

### Task 4: `sendPartnerCommissionRequest` doit rendre un booléen

**Files:**
- Modify: `src/lib/email.ts:1814-1829`
- Test: `src/lib/email-commission.test.ts` (créer)

**Pourquoi :** la fonction actuelle rend `void` et avale ses erreurs dans un `catch`.
`sent_at` ne peut donc pas être renseigné honnêtement : on écrirait « envoyée » sur un
envoi refusé. ⛔ Rappel dépôt : **Resend ne lève pas sur refus**, il faut lire `error`.

- [ ] **Step 1: Écrire le test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));

beforeEach(() => { send.mockReset(); });

describe("sendPartnerCommissionRequest", () => {
  it("rend true quand Resend accepte", async () => {
    send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", {
      requestId: 1, partnerName: "X", commissionEur: 20, finalAmountEur: 200,
      dateFrom: "2026-08-07", dateTo: "2026-08-14", payUrl: "https://x",
    })).resolves.toBe(true);
  });

  it("rend false quand Resend refuse, sans lever", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", {
      requestId: 1, partnerName: "X", commissionEur: 20, finalAmountEur: 200,
      dateFrom: "2026-08-07", dateTo: "2026-08-14", payUrl: "https://x",
    })).resolves.toBe(false);
  });

  it("rend false quand l appel jette", async () => {
    send.mockRejectedValue(new Error("network"));
    const { sendPartnerCommissionRequest } = await import("./email");
    await expect(sendPartnerCommissionRequest("a@b.c", {
      requestId: 1, partnerName: "X", commissionEur: 20, finalAmountEur: 200,
      dateFrom: "2026-08-07", dateTo: "2026-08-14", payUrl: "https://x",
    })).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/email-commission.test.ts`
Expected: FAIL, la fonction rend `undefined` et non `true`.

- [ ] **Step 3: Modifier `src/lib/email.ts`**

Remplacer le corps de `sendPartnerCommissionRequest` (ligne 1814) par :

```ts
/**
 * Rend true si Resend a accepte le message. Le retour n est pas cosmetique :
 * `car_commission_invoices.sent_at` ne doit se remplir que sur un envoi accepte,
 * sinon une facture jamais partie serait comptee comme envoyee et ne serait
 * jamais rattrapee. Resend NE LEVE PAS sur refus, d ou la lecture de `error`.
 */
export async function sendPartnerCommissionRequest(
  partnerEmail: string,
  m: CommissionMail,
): Promise<boolean> {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to: partnerEmail,
      replyTo: "hello@crete.direct",
      subject: commissionRequestSubject(m),
      text: commissionRequestBody(m),
    });
    reportSend(res, "demande de commission loueur");
    return !res.error;
  } catch (e) {
    console.error("[sendPartnerCommissionRequest] échec:", e);
    return false;
  }
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. Aucun appelant existant ne casse : passer de `void` à `Promise<boolean>`
n'oblige personne à lire le retour.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email-commission.test.ts
git commit -m "fix(email): la demande de commission rend son succes, sent_at en depend"
```

---

### Task 5: I/O facture — création idempotente et lectures

**Files:**
- Create: `src/lib/car-invoice-server.ts`
- Test: `src/lib/car-invoice-server.test.ts`

- [ ] **Step 1: Écrire les tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...a) } }));

beforeEach(() => { rpc.mockReset(); from.mockReset(); });

/** Construit un faux builder PostgREST qui rend `result` au bout de la chaine. */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "is", "limit"]) {
    b[m] = () => b;
  }
  b.maybeSingle = () => Promise.resolve(result);
  b.single = () => Promise.resolve(result);
  b.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
  return b;
}

describe("createInvoiceForRequest", () => {
  it("reutilise une facture existante au lieu d en creer une seconde", async () => {
    // Cas reel : requestCommission a relache son verrou apres un echec, la ligne
    // redevient eligible. Creer une seconde facture buterait sur request_id UNIQUE.
    from.mockReturnValue(builder({ data: { id: 7, number: "NOVAI-CD-2026-004", sent_at: null } }));
    const { createInvoiceForRequest } = await import("./car-invoice-server");
    const res = await createInvoiceForRequest({ requestId: 39, partnerId: 16, base: 200, rate: 0.1, amount: 20 });
    expect(res.reused).toBe(true);
    expect(res.invoice.number).toBe("NOVAI-CD-2026-004");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ne consomme un numero que lorsqu il faut vraiment creer", async () => {
    from
      .mockReturnValueOnce(builder({ data: null }))
      .mockReturnValue(builder({ data: { id: 8, number: "NOVAI-CD-2026-005", sent_at: null } }));
    rpc.mockResolvedValue({ data: "NOVAI-CD-2026-005", error: null });
    const { createInvoiceForRequest } = await import("./car-invoice-server");
    const res = await createInvoiceForRequest({ requestId: 40, partnerId: 16, base: 200, rate: 0.1, amount: 20 });
    expect(rpc).toHaveBeenCalledWith("next_car_invoice_number");
    expect(res.reused).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/car-invoice-server.test.ts`
Expected: FAIL, `Failed to resolve import "./car-invoice-server"`.

- [ ] **Step 3: Implémenter**

```ts
// Acces base de la facture de commission. Separe de car-invoice.ts pour que la
// logique de decision reste testable sans Supabase.
import { supabaseAdmin } from "./supabase-admin";
import { newToken, hashToken } from "./car-quote";
import { creditNumberFor } from "./car-invoice";

export interface InvoiceRow {
  id: number;
  number: string;
  request_id: number;
  partner_id: number;
  base_amount_eur: number;
  rate: number;
  amount_eur: number;
  issued_at: string;
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  credit_number: string | null;
  credit_reason: string | null;
}

const COLS =
  "id, number, request_id, partner_id, base_amount_eur, rate, amount_eur, issued_at, sent_at, paid_at, credited_at, credit_number, credit_reason";

export async function invoiceForRequest(requestId: number): Promise<InvoiceRow | null> {
  const { data } = await supabaseAdmin
    .from("car_commission_invoices")
    .select(COLS)
    .eq("request_id", requestId)
    .maybeSingle();
  return (data as InvoiceRow) ?? null;
}

export async function invoiceByToken(token: string): Promise<InvoiceRow | null> {
  const { data } = await supabaseAdmin
    .from("car_commission_invoices")
    .select(COLS)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as InvoiceRow) ?? null;
}

export interface CreateInvoiceInput {
  requestId: number;
  partnerId: number;
  base: number;
  rate: number;
  amount: number;
}

export interface CreateInvoiceResult {
  invoice: InvoiceRow;
  /** Le token en clair n est disponible qu a la creation, jamais relu ensuite. */
  token: string | null;
  reused: boolean;
}

/**
 * Cree la facture, ou rend celle qui existe deja. Le numero n est demande a la
 * base QUE si une creation a lieu : un numero consomme pour rien laisserait un
 * trou dans une serie qui doit rester continue.
 */
export async function createInvoiceForRequest(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const existing = await invoiceForRequest(input.requestId);
  if (existing) return { invoice: existing, token: null, reused: true };

  const { data: number, error: numErr } = await supabaseAdmin.rpc("next_car_invoice_number");
  if (numErr || !number) throw new Error(`numerotation impossible: ${numErr?.message ?? "vide"}`);

  const token = newToken();
  const { data, error } = await supabaseAdmin
    .from("car_commission_invoices")
    .insert({
      number,
      request_id: input.requestId,
      partner_id: input.partnerId,
      base_amount_eur: input.base,
      rate: input.rate,
      amount_eur: input.amount,
      token_hash: hashToken(token),
    })
    .select(COLS)
    .maybeSingle();

  if (error || !data) {
    // Course perdue contre un autre appel : la contrainte UNIQUE a fait son
    // travail, on rend la facture de l autre plutot que d echouer.
    const other = await invoiceForRequest(input.requestId);
    if (other) return { invoice: other, token: null, reused: true };
    throw new Error(`creation de facture impossible: ${error?.message ?? "vide"}`);
  }
  return { invoice: data as InvoiceRow, token, reused: false };
}

export async function markInvoiceSent(id: number): Promise<void> {
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .select();
}

export async function markInvoicePaid(requestId: number): Promise<void> {
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({ paid_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .is("paid_at", null)
    .select();
}

export async function creditInvoice(id: number, number: string, reason: string): Promise<string> {
  const creditNumber = creditNumberFor(number);
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({
      credited_at: new Date().toISOString(),
      credit_number: creditNumber,
      credit_reason: reason,
    })
    .eq("id", id)
    .is("credited_at", null)
    .select();
  return creditNumber;
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/lib/car-invoice-server.test.ts && npx tsc --noEmit`
Expected: PASS, 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/lib/car-invoice-server.ts src/lib/car-invoice-server.test.ts
git commit -m "feat(car-commission): creation idempotente de la facture et lectures"
```

---

### Task 6: Scinder `requestCommission`, sortir Stripe du chemin nocturne

**Files:**
- Modify: `src/lib/car-commission-server.ts`
- Modify: `src/lib/car-commission-server.test.ts`

**Pourquoi :** une session Checkout expire en 24 h. Celle créée par un cron de 5 h du matin
serait morte avant que le loueur ouvre son courrier.

- [ ] **Step 1: Ajouter les tests**

```ts
describe("requestCommission apres scission", () => {
  it("ne parle plus a Stripe", async () => {
    // La session naitra au clic sur la page facture. Si ce test echoue, le cron
    // enverra des liens de paiement morts.
    const { requestCommission } = await import("./car-commission-server");
    process.env.CAR_COMMISSION_ENABLED = "on";
    await requestCommission(39);
    expect(stripeSessionsCreate).not.toHaveBeenCalled();
  });

  it("envoie le lien vers la page facture, pas vers Stripe", async () => {
    const { requestCommission } = await import("./car-commission-server");
    process.env.CAR_COMMISSION_ENABLED = "on";
    await requestCommission(39);
    const payUrl = sendPartnerCommissionRequest.mock.calls[0][1].payUrl as string;
    expect(payUrl).toContain("/invoice/");
    expect(payUrl).not.toContain("stripe.com");
  });

  it("ne marque la facture envoyee que si Resend a accepte", async () => {
    sendPartnerCommissionRequest.mockResolvedValue(false);
    const { requestCommission } = await import("./car-commission-server");
    process.env.CAR_COMMISSION_ENABLED = "on";
    const res = await requestCommission(39);
    expect(res.status).toBe("failed");
    expect(markInvoiceSent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/car-commission-server.test.ts`
Expected: FAIL, `stripeSessionsCreate` a bien été appelé.

- [ ] **Step 3: Réécrire la fin de `requestCommission`**

Remplacer tout le bloc qui va de `let session:` jusqu'au `return { status: "requested", ... }`
par :

```ts
  const amounts = {
    base: Number(row.final_amount_eur) || 0,
    rate: 0,
    amount: row.commission_eur as number,
  };
  amounts.rate = amounts.base > 0 ? amounts.amount / amounts.base : 0;

  let created;
  try {
    created = await createInvoiceForRequest({
      requestId: row.id,
      partnerId: row.quoted_by_partner_id as number,
      base: amounts.base,
      rate: amounts.rate,
      amount: amounts.amount,
    });
  } catch (err) {
    console.error("[car/commission] facture impossible", { requestId, err });
    await releaseLock();
    return { status: "failed", code: "invoice_creation_failed" };
  }

  // Une facture reutilisee n a plus son token en clair : elle a deja ete envoyee
  // une fois, le renvoi se fait depuis le back-office.
  if (created.reused && created.invoice.sent_at) {
    return { status: "already_requested" };
  }
  if (!created.token) {
    console.error("[car/commission] facture sans token exploitable", { requestId });
    return { status: "failed", code: "invoice_without_token" };
  }

  const invoiceUrl = `${siteBase()}/en/invoice/${created.token}`;
  const ok = await sendPartnerCommissionRequest(partner.email, {
    ...mailBase,
    payUrl: invoiceUrl,
    invoiceNumber: created.invoice.number,
  });

  if (!ok) {
    // La facture EXISTE et porte son numero : on ne la detruit pas, on la laisse
    // avec sent_at NULL, renvoyable depuis le back-office. Une facture numerotee
    // non envoyee se rattrape ; une facture envoyee non enregistree est perdue.
    console.error("[car/commission] facture creee mais email refuse", {
      requestId,
      invoice: created.invoice.number,
    });
    return { status: "failed", code: "invoice_mail_refused" };
  }

  await markInvoiceSent(created.invoice.id);
  return { status: "requested", invoiceNumber: created.invoice.number };
```

Ajouter en tête de fichier :

```ts
import { createInvoiceForRequest, markInvoiceSent, invoiceByToken } from "./car-invoice-server";
```

Adapter le type de retour :

```ts
export type CommissionOutcome =
  | { status: "requested"; invoiceNumber: string }
  | { status: "disabled" }
  | { status: "skipped" }
  | { status: "already_requested" }
  | { status: "failed"; code: string };
```

- [ ] **Step 4: Ajouter `ensureCommissionCheckout`**

```ts
/**
 * Cree la session Stripe au moment ou le loueur ouvre sa facture et clique.
 * Appelee par la route de paiement, jamais par le cron : une session expire en
 * 24 h. Reutilise la session deja enregistree si elle est encore ouverte.
 */
export async function ensureCommissionCheckout(
  token: string,
): Promise<{ url: string } | { error: string }> {
  const invoice = await invoiceByToken(token);
  if (!invoice) return { error: "not_found" };
  if (invoice.paid_at) return { error: "already_paid" };
  if (invoice.credited_at) return { error: "credited" };

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("id, date_from, date_to, commission_session_id")
    .eq("id", invoice.request_id)
    .maybeSingle();
  if (!req) return { error: "not_found" };

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();
  if (!partner?.email) return { error: "partner_without_email" };

  if (req.commission_session_id) {
    try {
      const existing = await stripeClient().checkout.sessions.retrieve(req.commission_session_id);
      if (existing.status === "open" && existing.url) return { url: existing.url };
    } catch {
      // Session introuvable ou expiree : on en cree une neuve juste apres.
    }
  }

  let session: { id: string; url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildCommissionCheckoutParams({
        requestId: invoice.request_id,
        partnerName: partner.name ?? "",
        partnerEmail: partner.email,
        commissionEur: Number(invoice.amount_eur),
        finalAmountEur: Number(invoice.base_amount_eur),
        dateFrom: req.date_from,
        dateTo: req.date_to,
      }),
    );
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/commission] session refusee au clic", {
      invoice: invoice.number,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    return { error: failure.code };
  }

  await supabaseAdmin
    .from("car_requests")
    .update({ commission_session_id: session.id })
    .eq("id", invoice.request_id)
    .select();

  return session.url ? { url: session.url } : { error: "session_without_url" };
}
```

- [ ] **Step 5: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. ⛔ Vérifier que `setOutcome` compile toujours : il lit
`result.status === "failed"`, ce qui reste vrai.

- [ ] **Step 6: Commit**

```bash
git add src/lib/car-commission-server.ts src/lib/car-commission-server.test.ts
git commit -m "refactor(car-commission): la session Stripe nait au clic, plus a l emission"
```

---

### Task 7: Le cron

**Files:**
- Create: `src/app/api/cron/car-commission-invoice/route.ts`
- Test: `src/app/api/cron/car-commission-invoice/route.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Écrire les tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const update = vi.fn(() => ({ eq: () => ({ select: () => Promise.resolve({ data: [] }) }) }));
const requestCommission = vi.fn();
vi.mock("@/lib/car-commission-server", () => ({ requestCommission }));
vi.mock("@/lib/cron-auth", () => ({ assertCron: () => null }));

beforeEach(() => {
  update.mockClear();
  requestCommission.mockReset();
  delete process.env.CAR_COMMISSION_ENABLED;
});

describe("cron car-commission-invoice", () => {
  it("n ecrit RIEN quand l interrupteur est eteint", async () => {
    // ⛔ Le defaut le plus grave du design initial : le cron ecrivait outcome,
    // final_amount_eur et commission_eur AVANT d appeler requestCommission, seul
    // porteur de la garde. Eteint, il polluait donc les donnees en silence.
    const { GET } = await import("./route");
    const res = await GET(new Request("https://x") as never);
    expect(await res.json()).toEqual({ disabled: true });
    expect(update).not.toHaveBeenCalled();
    expect(requestCommission).not.toHaveBeenCalled();
  });

  it("reste eteint sur une valeur approchante", async () => {
    for (const v of ["true", "1", "ON", "yes"]) {
      process.env.CAR_COMMISSION_ENABLED = v;
      const { GET } = await import("./route");
      const res = await GET(new Request("https://x") as never);
      expect(await res.json()).toEqual({ disabled: true });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("bascule en rented puis facture, dans cet ordre", async () => {
    process.env.CAR_COMMISSION_ENABLED = "on";
    requestCommission.mockResolvedValue({ status: "requested", invoiceNumber: "NOVAI-CD-2026-004" });
    const { GET } = await import("./route");
    const res = await GET(new Request("https://x") as never);
    const body = await res.json();
    expect(body.invoiced).toBe(1);
    // shouldRequestCommission exige outcome === "rented" : l ordre n est pas negociable.
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      requestCommission.mock.invocationCallOrder[0],
    );
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/app/api/cron/car-commission-invoice/route.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter**

```ts
// Facturation automatique de la commission au premier jour de location.
// Remplace le clic « louée » du back-office comme declencheur : celui-ci reste
// disponible et emprunte exactement le meme chemin.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { assertCron } from "@/lib/cron-auth";
import { isInvoiceable, invoiceAmounts, type InvoiceCandidate } from "@/lib/car-invoice";
import { requestCommission } from "@/lib/car-commission-server";

export const dynamic = "force-dynamic";

/**
 * Borne de mise en service. ⛔ SANS ELLE le premier tir rattrape tout
 * l historique et refacture car_requests id=27, deja facturee a la main le
 * 30/07 (NOVAI-2026-003). Ne jamais la reculer.
 */
const START = process.env.COMMISSION_INVOICING_START || "2026-08-05";

/**
 * ⛔ Garde d armement, testee ICI et pas seulement dans requestCommission.
 * Un interrupteur qui protege deux appelants doit etre verifie par chacun, et
 * un systeme desarme n ecrit RIEN, pas meme un champ d etat.
 */
function enabled(): boolean {
  return process.env.CAR_COMMISSION_ENABLED === "on";
}

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;
  if (!enabled()) return NextResponse.json({ disabled: true });

  // 05:00 UTC = 08:00 a Athenes : meme jour civil des deux cotes. Deplacer ce
  // cron en soiree UTC facturerait un jour trop tot cote grec.
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("car_requests")
    .select(
      "id, accepted_at, outcome, date_from, booking_paid_at, quoted_by_partner_id, quoted_price",
    )
    .not("accepted_at", "is", null)
    .is("outcome", null)
    .is("booking_paid_at", null)
    .lte("date_from", today)
    .gte("date_from", START);

  let invoiced = 0;
  const skipped: number[] = [];

  for (const row of (rows ?? []) as InvoiceCandidate[]) {
    if (!isInvoiceable(row, today, START)) continue;

    // Deja facturee : le NOT EXISTS ne peut pas s exprimer cote PostgREST, il se
    // fait ici. C est le vrai filtre d idempotence, `commission_requested_at` ne
    // peut pas l etre puisque releaseLock() le remet a NULL.
    const { data: already } = await supabase
      .from("car_commission_invoices")
      .select("id, sent_at")
      .eq("request_id", row.id)
      .maybeSingle();
    if (already?.sent_at) continue;

    const { data: partner } = await supabase
      .from("car_partners")
      .select("commission")
      .eq("id", row.quoted_by_partner_id as number)
      .maybeSingle();
    if (!partner) { skipped.push(row.id); continue; }

    const amounts = invoiceAmounts(row.quoted_price as number, Number(partner.commission));
    if (!amounts) { skipped.push(row.id); continue; }

    // Bascule AVANT l appel : shouldRequestCommission exige outcome === "rented".
    await supabase
      .from("car_requests")
      .update({
        outcome: "rented",
        outcome_at: new Date().toISOString(),
        final_amount_eur: amounts.base,
        commission_eur: amounts.amount,
      })
      .eq("id", row.id)
      .select();

    const res = await requestCommission(row.id);
    if (res.status === "requested") invoiced += 1;
    else skipped.push(row.id);
  }

  return NextResponse.json({ invoiced, skipped, today, start: START });
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Ajouter le cron à `vercel.json`**

Dans le tableau `crons`, après la ligne `car-relance` :

```json
    { "path": "/api/cron/car-commission-invoice", "schedule": "0 5 * * *" },
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/car-commission-invoice/route.ts src/app/api/cron/car-commission-invoice/route.test.ts vercel.json
git commit -m "feat(car-commission): cron quotidien de facturation au premier jour de location"
```

---

### Task 8: Page facture publique et route de paiement

**Files:**
- Create: `src/app/[locale]/invoice/[token]/page.tsx`
- Create: `src/app/api/car-rental/commission/checkout/route.ts`
- Test: `src/app/api/car-rental/commission/checkout/route.test.ts`

- [ ] **Step 1: Écrire le test de la route de paiement**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const ensureCommissionCheckout = vi.fn();
vi.mock("@/lib/car-commission-server", () => ({ ensureCommissionCheckout }));

beforeEach(() => ensureCommissionCheckout.mockReset());

describe("POST /api/car-rental/commission/checkout", () => {
  it("redirige vers Stripe quand la session est creee", async () => {
    ensureCommissionCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    const { POST } = await import("./route");
    const res = await POST(new Request("https://x", {
      method: "POST", body: new URLSearchParams({ token: "abc" }),
    }) as never);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://checkout.stripe.com/x");
  });

  it("rend 404 sur un token inconnu, sans rien reveler", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "not_found" });
    const { POST } = await import("./route");
    const res = await POST(new Request("https://x", {
      method: "POST", body: new URLSearchParams({ token: "nope" }),
    }) as never);
    expect(res.status).toBe(404);
  });

  it("refuse de repayer une facture deja reglee", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "already_paid" });
    const { POST } = await import("./route");
    const res = await POST(new Request("https://x", {
      method: "POST", body: new URLSearchParams({ token: "abc" }),
    }) as never);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/app/api/car-rental/commission/checkout/route.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémenter la route**

```ts
// La session Stripe naît ICI, au clic du loueur sur sa facture, et jamais dans
// le cron : une session Checkout expire en 24 h.
import { NextRequest, NextResponse } from "next/server";
import { ensureCommissionCheckout } from "@/lib/car-commission-server";

export const dynamic = "force-dynamic";

const STATUS: Record<string, number> = {
  not_found: 404,
  already_paid: 409,
  credited: 409,
};

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const res = await ensureCommissionCheckout(token);
  if ("url" in res) return NextResponse.redirect(res.url, 303);
  return NextResponse.json({ error: res.error }, { status: STATUS[res.error] ?? 502 });
}
```

- [ ] **Step 4: Écrire la page facture**

```tsx
// Page facture, PUBLIQUE PAR CONCEPTION : le loueur n a pas de compte. La
// protection est l imprevisibilite du token, comme pour les pages de devis.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { invoiceByToken } from "@/lib/car-invoice-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const EUR = (n: number) => `${Number(n).toFixed(2)} EUR`;

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const invoice = await invoiceByToken(token);
  if (!invoice) notFound();

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("date_from, date_to, pickup_slug")
    .eq("id", invoice.request_id)
    .maybeSingle();

  const state = invoice.credited_at ? "credited" : invoice.paid_at ? "paid" : "due";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-night">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-lagoon-deep">Invoice</p>
        <h1 className="font-display text-2xl font-extrabold">{invoice.number}</h1>
        <p className="text-sm text-muted">
          Issued {new Date(invoice.issued_at).toISOString().slice(0, 10)} · payment due on receipt
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-edge bg-white p-5 text-sm">
        <p className="font-bold">SAS NovAI</p>
        <p>15 rue Berthollet, 29200 Brest, France</p>
        <p>SIREN 994 765 857 · VAT FR45994765857</p>
        <p className="mt-3 text-muted">Billed to</p>
        <p className="font-bold">{partner?.name}</p>
      </section>

      <table className="mb-6 w-full text-sm">
        <tbody>
          <tr className="border-b border-edge">
            <td className="py-2">
              Commission on rental {invoice.request_id}
              {req ? ` · ${req.date_from} → ${req.date_to}` : ""}
              <br />
              <span className="text-muted">
                {EUR(invoice.base_amount_eur)} quoted and accepted ·{" "}
                {(Number(invoice.rate) * 100).toFixed(0)}%
              </span>
            </td>
            <td className="py-2 text-right font-bold">{EUR(invoice.amount_eur)}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold">Total due</td>
            <td className="py-2 text-right font-extrabold">{EUR(invoice.amount_eur)}</td>
          </tr>
        </tbody>
      </table>

      {state === "due" && (
        <form action="/api/car-rental/commission/checkout" method="post" className="mb-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-xl bg-lagoon-deep px-5 py-3 font-bold text-white"
          >
            Pay {EUR(invoice.amount_eur)} by card
          </button>
        </form>
      )}
      {state === "paid" && (
        <p className="mb-6 rounded-xl bg-go/10 px-5 py-3 font-bold text-go">
          Paid on {new Date(invoice.paid_at as string).toISOString().slice(0, 10)}. Nothing left to do.
        </p>
      )}
      {state === "credited" && (
        <p className="mb-6 rounded-xl bg-edge px-5 py-3 font-bold">
          Cancelled by credit note {invoice.credit_number}. Nothing to pay.
        </p>
      )}

      <section className="mb-6 rounded-2xl border border-edge bg-surface p-5 text-sm">
        <p className="mb-2 font-bold">Bank transfer</p>
        <p className="text-muted">
          Use the reference {invoice.number}. Bank details are sent with this invoice by email.
        </p>
      </section>

      <footer className="text-xs leading-relaxed text-muted">
        <p>VAT not applicable, article 293 B of the French General Tax Code.</p>
        <p>
          Late payment gives rise to penalties at three times the French legal interest rate plus a
          fixed recovery indemnity of 40 EUR, with no reminder required (articles L441-10 and D441-5
          of the French Commercial Code). No discount for early payment.
        </p>
      </footer>
    </main>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS, build succès.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/invoice src/app/api/car-rental/commission/checkout
git commit -m "feat(car-commission): page facture publique et paiement au clic"
```

---

### Task 9: Webhook — marquer la facture payée

**Files:**
- Modify: `src/app/api/car-rental/commission/webhook/route.ts:89-101`
- Modify: `src/app/api/car-rental/commission/webhook/route.test.ts`

- [ ] **Step 1: Ajouter le test**

```ts
it("marque aussi la facture payee, pas seulement la demande", async () => {
  // Sans cela la page facture continuerait d afficher « due » sur une facture
  // reglee, et le loueur paierait deux fois.
  await postEvent(checkoutCompleted({ car_request_id: "39" }));
  expect(markInvoicePaid).toHaveBeenCalledWith(39);
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/app/api/car-rental/commission/webhook/route.test.ts`
Expected: FAIL, `markInvoicePaid` jamais appelé.

- [ ] **Step 3: Modifier la route**

Après le bloc `update` sur `car_requests` (ligne 97), ajouter :

```ts
    // La facture porte son propre etat : la page se lit sans jointure.
    await markInvoicePaid(requestId);
```

et l'import en tête :

```ts
import { markInvoicePaid } from "@/lib/car-invoice-server";
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/car-rental/commission/webhook
git commit -m "fix(car-commission): le webhook marque aussi la facture payee"
```

---

### Task 10: Avoir depuis le back-office

**Files:**
- Modify: `src/app/admin/car-rental/actions.ts`
- Test: `src/lib/car-invoice-credit.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { creditNumberFor } from "@/lib/car-invoice";

const creditInvoice = vi.fn();
const sendCreditNote = vi.fn();
vi.mock("@/lib/car-invoice-server", () => ({
  creditInvoice, invoiceForRequest: () =>
    Promise.resolve({ id: 7, number: "NOVAI-CD-2026-004", amount_eur: 20, paid_at: null, credited_at: null }),
}));
vi.mock("@/lib/email", () => ({ sendCreditNote }));

beforeEach(() => { creditInvoice.mockReset(); sendCreditNote.mockReset(); });

describe("creditCommissionInvoice", () => {
  it("emet un avoir suffixe -A et previent le loueur", async () => {
    creditInvoice.mockResolvedValue("NOVAI-CD-2026-004-A");
    const { creditCommissionInvoice } = await import("@/lib/car-invoice-credit");
    const res = await creditCommissionInvoice(39, "rental did not take place");
    expect(res).toEqual({ creditNumber: "NOVAI-CD-2026-004-A" });
    expect(creditNumberFor("NOVAI-CD-2026-004")).toBe("NOVAI-CD-2026-004-A");
    expect(sendCreditNote).toHaveBeenCalled();
  });

  it("refuse d avoirer une facture deja reglee", async () => {
    // Remboursement Stripe : hors perimetre, manuel et rare.
    const mod = await import("@/lib/car-invoice-credit");
    vi.doMock("@/lib/car-invoice-server", () => ({
      creditInvoice,
      invoiceForRequest: () => Promise.resolve({ id: 7, number: "N", amount_eur: 20, paid_at: "2026-08-08T10:00:00Z", credited_at: null }),
    }));
    const res = await mod.creditCommissionInvoice(39, "x");
    expect("error" in res).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier que ça échoue**

Run: `npx vitest run src/lib/car-invoice-credit.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Créer `src/lib/car-invoice-credit.ts`**

```ts
import { supabaseAdmin } from "./supabase-admin";
import { invoiceForRequest, creditInvoice } from "./car-invoice-server";
import { sendCreditNote } from "./email";

export async function creditCommissionInvoice(
  requestId: number,
  reason: string,
): Promise<{ creditNumber: string } | { error: string }> {
  const invoice = await invoiceForRequest(requestId);
  if (!invoice) return { error: "no_invoice" };
  if (invoice.credited_at) return { error: "already_credited" };
  // Un remboursement Stripe se fait a la main : trop rare pour justifier du code.
  if (invoice.paid_at) return { error: "already_paid" };

  const creditNumber = await creditInvoice(invoice.id, invoice.number, reason);

  await supabaseAdmin
    .from("car_requests")
    .update({ outcome: "lost", outcome_at: new Date().toISOString(), commission_paid_at: null })
    .eq("id", requestId)
    .select();

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();

  if (partner?.email) {
    await sendCreditNote(partner.email, {
      creditNumber,
      number: invoice.number,
      partnerName: partner.name ?? "",
      amountEur: Number(invoice.amount_eur),
      reason,
    });
  }
  return { creditNumber };
}
```

- [ ] **Step 4: Ajouter `sendCreditNote` dans `src/lib/email.ts`**

À la suite de `sendPartnerCommissionRequest` :

```ts
export async function sendCreditNote(
  partnerEmail: string,
  m: import("./car-invoice").CreditMail,
): Promise<boolean> {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to: partnerEmail,
      replyTo: "hello@crete.direct",
      subject: `crete.direct credit note ${m.creditNumber}`,
      text: creditMailBody(m),
    });
    reportSend(res, "avoir de commission loueur");
    return !res.error;
  } catch (e) {
    console.error("[sendCreditNote] échec:", e);
    return false;
  }
}
```

et l'import `import { creditMailBody } from "./car-invoice";` en tête de `email.ts`.

- [ ] **Step 5: Brancher l'action dans le back-office**

Dans `src/app/admin/car-rental/actions.ts`, ajouter :

```ts
export async function creditInvoiceAction(id: number, formData: FormData) {
  await guard();
  const reason = String(formData.get("reason") ?? "rental did not take place");
  const res = await creditCommissionInvoice(id, reason);
  if ("error" in res) {
    redirect(`${PATH}?error=${encodeURIComponent(`Avoir impossible : ${res.error}`)}`);
  }
  revalidatePath(PATH);
}
```

avec `import { creditCommissionInvoice } from "@/lib/car-invoice-credit";`.

- [ ] **Step 6: Vérifier**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: PASS, build succès.

- [ ] **Step 7: Commit**

```bash
git add src/lib/car-invoice-credit.ts src/lib/car-invoice-credit.test.ts src/lib/email.ts src/app/admin/car-rental/actions.ts
git commit -m "feat(car-commission): avoir depuis le back-office quand la location n a pas eu lieu"
```

---

### Task 11: Déploiement, sans armer

**Files:** aucun changement de code.

- [ ] **Step 1: Vérification complète**

```bash
npx vitest run && npx tsc --noEmit && npm run build
```
Expected: tous verts. Noter le nombre de tests avant/après pour le journal.

- [ ] **Step 2: Pousser et déployer**

```bash
git push origin feat/car-commission-invoice
```
Puis, après revue :
```bash
git checkout master && git pull origin master
git merge --no-ff feat/car-commission-invoice
git push origin master
```
⛔ **Sur ce dépôt, `master` déploie en production.** Ne pousser que sur des tests verts.
Le déploiement est sans risque tant que `CAR_COMMISSION_ENABLED` n'est pas posé : c'est
exactement la raison d'être de l'interrupteur.

- [ ] **Step 3: Vérifier que le cron répond et ne fait rien**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://crete.direct/api/cron/car-commission-invoice
curl -s -H "Authorization: Bearer $CRON_SECRET" https://crete.direct/api/cron/car-commission-invoice
```
Expected : **403** sans jeton, puis `{"disabled":true}` avec le jeton.
⛔ Ce second retour est la preuve que l'interrupteur tient : le système est déployé et
n'écrit rien.

- [ ] **Step 4: Vérifier qu'aucune donnée n'a bougé**

```bash
ssh kairos-vps 'docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -t -A' <<'SQL'
select count(*) from car_commission_invoices;
select id, outcome, final_amount_eur, commission_eur from car_requests where accepted_at is not null order by id;
SQL
```
Expected : `0` facture, et les quatre demandes toujours avec `outcome` vide. Si `outcome`
vaut `rented` quelque part, la garde d'armement du cron a été mal implémentée : revenir à
la tâche 7.

- [ ] **Step 5: Décision d'armement — pour Kami, pas pour l'implémenteur**

⚠️ **`car_requests id=39` part le 07/08** (Luxtrans, 200 €, commission 20 €) et la mémoire
prévoit sa facture « à la main après le 14/08 ». Armer avant le 07/08 la facture
automatiquement : il faut alors **renoncer à la facture manuelle**, sinon Luxtrans reçoit
deux fois la même commission.

Préconisation : armer si et seulement si tout est vert **au plus tard le 05/08**, avec
`COMMISSION_INVOICING_START=2026-08-05`. Le cron tourne alors deux jours à vide avant son
premier tir réel sur un petit montant, chez un partenaire qui connaît déjà le mécanisme.
Sinon, facture manuelle pour `id=39` et armement pour le départ du 08/09.

Pour armer :
```bash
vercel env add CAR_COMMISSION_ENABLED production   # valeur exacte : on
vercel env add COMMISSION_INVOICING_START production   # valeur : 2026-08-05
```
⛔ **Puis redéployer** : la variable est figée dans l'image du déploiement.

---

## Ce que ce plan ne fait pas

- Aucune génération PDF. La page s'imprime. Si un comptable réclame une pièce jointe,
  ajouter `@sparticuz/chromium` sans rien jeter.
- Aucune relance de facture impayée.
- Aucun remboursement Stripe automatique sur avoir.
- Aucune régularisation automatique d'un écart entre le devis et le montant encaissé.
- Aucune facturation des verticales activités et van, qui ont leurs propres modèles.
