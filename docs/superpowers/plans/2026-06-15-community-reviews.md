# Community Reviews — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship V1 community reviews on crete.direct place pages (clickable stars → `/avis` page with 1–5★ rating, magic-link e-mail, anonymous votes for sorting, admin secret moderation, dynamic community average from ≥1 review).

**Architecture:** PostgREST self-hosted (5 tables + 1 view + RLS), 12 Next.js API routes (newsletter pattern with `supabaseAdmin` Proxy), server page `/avis` with 3 client components, `RatingTile` wrapper around existing `Tile` (Tile signature unchanged, one new variant). Tag-based revalidation (`place-<slug>`) invalidates 22 locales in one call. Cron daily purge required V1.

**Tech Stack:** Next.js 16 App Router + TypeScript + Tailwind v4 + Supabase service_role via PostgREST VPS + Resend + `isomorphic-dompurify` (new dep) + vitest. Source spec: `docs/superpowers/specs/2026-06-15-community-reviews-design.md`.

**Worktree convention (read this first):** This plan must be executed in an isolated worktree `cretepulse-reviews` on branch `feat/community-reviews` cut from `origin/master`. Task 1 creates it. Spec lives currently in `cretepulse-build/` (untracked); Task 1 copies it into the new worktree.

---

## Phase A — Setup

### Task 1: Create worktree + install deps + spec import

**Files:**
- Create: `C:\Users\fkerj\cretepulse-reviews\` (worktree dir)
- Modify: `package.json` (add `isomorphic-dompurify`)
- Create: `docs/superpowers/specs/2026-06-15-community-reviews-design.md` (copy from cretepulse-build)
- Create: `docs/superpowers/plans/2026-06-15-community-reviews.md` (this file)

- [ ] **Step 1: Create the worktree from origin/master**

```powershell
git -C C:\Users\fkerj\cretepulse-build fetch origin
git -C C:\Users\fkerj\cretepulse-build worktree add -b feat/community-reviews C:\Users\fkerj\cretepulse-reviews origin/master
```

Expected: `Preparing worktree (new branch 'feat/community-reviews')` + `HEAD is now at <sha> ...`.

- [ ] **Step 2: Symlink node_modules to avoid re-install (Windows: dir junction)**

```powershell
cmd /c mklink /J C:\Users\fkerj\cretepulse-reviews\node_modules C:\Users\fkerj\cretepulse-build\node_modules
```

Expected: `Junction created`.

- [ ] **Step 3: Copy spec + plan into the new worktree**

```powershell
New-Item -ItemType Directory -Force C:\Users\fkerj\cretepulse-reviews\docs\superpowers\specs | Out-Null
New-Item -ItemType Directory -Force C:\Users\fkerj\cretepulse-reviews\docs\superpowers\plans | Out-Null
Copy-Item C:\Users\fkerj\cretepulse-build\docs\superpowers\specs\2026-06-15-community-reviews-design.md C:\Users\fkerj\cretepulse-reviews\docs\superpowers\specs\
Copy-Item C:\Users\fkerj\cretepulse-build\docs\superpowers\plans\2026-06-15-community-reviews.md C:\Users\fkerj\cretepulse-reviews\docs\superpowers\plans\
```

- [ ] **Step 4: Install `isomorphic-dompurify`**

```powershell
cd C:\Users\fkerj\cretepulse-reviews
npm install isomorphic-dompurify
```

Expected: `added 1 package` (or more if transitive). Check `package.json` shows `"isomorphic-dompurify": "^2.x"`.

- [ ] **Step 5: tsc baseline**

```powershell
npx tsc --noEmit
```

Expected: same number of errors as `origin/master` baseline (≈5 pre-existing). Note count for later comparison.

- [ ] **Step 6: Commit setup**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add docs/superpowers/specs/2026-06-15-community-reviews-design.md docs/superpowers/plans/2026-06-15-community-reviews.md package.json package-lock.json
git -C C:\Users\fkerj\cretepulse-reviews commit -m "chore(reviews): worktree setup, spec+plan import, +isomorphic-dompurify"
```

---

## Phase B — Database

### Task 2: SQL migration `cb_reviews` and friends

**Files:**
- Create: `supabase/migrations/20260615120000_cb_reviews.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260615120000_cb_reviews.sql

CREATE TABLE cb_reviews (
  id                  bigserial PRIMARY KEY,
  place_slug          text   NOT NULL,
  rating              int    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text   CHECK (comment IS NULL OR length(comment) <= 1000),
  author_name         text   NOT NULL CHECK (length(author_name) BETWEEN 1 AND 40),
  email               text   NOT NULL,
  status              text   NOT NULL CHECK (status IN ('pending','published','removed','expired','pending_review')),
  confirm_token_hash  text,
  delete_token_hash   text,
  consent_at          timestamptz NOT NULL,
  consent_text_hash   text   NOT NULL,
  ip_hash             text   NOT NULL,
  salt_version        int    NOT NULL DEFAULT 1,
  locale              text   NOT NULL CHECK (locale IN ('en','fr','de','el','it','nl','pl','es','pt','ru','ja','ko','zh','tr','sv','da','no','fi','cs','hu','ro','ar')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz,
  removed_at          timestamptz,
  removed_reason      text,
  UNIQUE (place_slug, email)
);
CREATE INDEX idx_cb_reviews_slug_status   ON cb_reviews(place_slug, status);
CREATE INDEX idx_cb_reviews_status_created ON cb_reviews(status, created_at);
CREATE UNIQUE INDEX idx_cb_reviews_confirm_token_hash ON cb_reviews(confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_cb_reviews_delete_token_hash  ON cb_reviews(delete_token_hash)  WHERE delete_token_hash  IS NOT NULL;

CREATE TABLE cb_review_votes (
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash      text   NOT NULL,
  value        int    NOT NULL CHECK (value IN (-1, 1)),
  salt_version int    NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_reports (
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash      text   NOT NULL,
  reason       text   CHECK (reason IN ('spam','abuse','offtopic')),
  salt_version int    NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_admin_log (
  id           bigserial PRIMARY KEY,
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('remove','restore','review_pending')),
  reason       text,
  admin_ip     text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cb_review_banned_emails (
  email_hash  text NOT NULL,
  place_slug  text NOT NULL,
  banned_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email_hash, place_slug)
);

CREATE VIEW cb_reviews_with_counts AS
SELECT
  r.*,
  COALESCE(SUM(CASE WHEN v.value =  1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
  COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
FROM cb_reviews r
LEFT JOIN cb_review_votes v ON v.review_id = r.id
GROUP BY r.id;

ALTER TABLE cb_reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_admin_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_banned_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails FROM anon;
REVOKE ALL ON cb_reviews_with_counts FROM anon;
GRANT  ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails TO service_role;
GRANT  SELECT ON cb_reviews_with_counts TO service_role;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Apply on PostgREST VPS**

```powershell
scp C:\Users\fkerj\cretepulse-reviews\supabase\migrations\20260615120000_cb_reviews.sql kairos-vps:/tmp/
ssh kairos-vps "psql `$DATABASE_URL -f /tmp/20260615120000_cb_reviews.sql"
```

Expected: a series of `CREATE TABLE` / `CREATE INDEX` / `ALTER TABLE` / `GRANT` / `NOTIFY` lines, no `ERROR`.

- [ ] **Step 3: Sanity probe**

```powershell
ssh kairos-vps "psql `$DATABASE_URL -c \"SELECT count(*) FROM cb_reviews;\""
ssh kairos-vps "psql `$DATABASE_URL -c \"SELECT count(*) FROM cb_reviews_with_counts;\""
```

Expected: `count = 0` for both.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add supabase/migrations/20260615120000_cb_reviews.sql
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): add cb_reviews + votes + reports + admin_log + banned_emails + view + RLS"
```

---

## Phase C — Libs

### Task 3: `banlist.ts` (containsBanned + looksLikeSpam) + tests

**Files:**
- Create: `src/lib/reviews/banlist.ts`
- Create: `src/lib/reviews/__tests__/banlist.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/reviews/__tests__/banlist.test.ts
import { describe, it, expect } from "vitest";
import { containsBanned, looksLikeSpam } from "../banlist";

describe("containsBanned", () => {
  it("matches whole word lowercase", () => {
    expect(containsBanned("you are an idiot")).toBe(true);
  });
  it("matches with diacritics stripped", () => {
    expect(containsBanned("Tu es un crétin")).toBe(true); // 'cretin' in banlist
  });
  it("does not match a substring inside another word", () => {
    expect(containsBanned("assassinated")).toBe(false); // 'ass' is a substring, not a word
  });
  it("returns false for clean text", () => {
    expect(containsBanned("Belle plage, eau cristalline")).toBe(false);
  });
});

describe("looksLikeSpam", () => {
  it("detects two URLs", () => {
    expect(looksLikeSpam("check http://a.com and https://b.com")).toBe(true);
  });
  it("detects e-mail leak in comment", () => {
    expect(looksLikeSpam("contact me at x@y.com")).toBe(true);
  });
  it("detects mostly non-alphanum", () => {
    expect(looksLikeSpam("!!!!@@@@####$$$$")).toBe(true);
  });
  it("accepts normal review", () => {
    expect(looksLikeSpam("Lieu agréable, parking facile.")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test (expected FAIL)**

```powershell
cd C:\Users\fkerj\cretepulse-reviews
npx vitest run src/lib/reviews/__tests__/banlist.test.ts
```

Expected: FAIL with `Cannot find module '../banlist'`.

- [ ] **Step 3: Implement `banlist.ts`**

```typescript
// src/lib/reviews/banlist.ts

// Lowercase, NFD-normalized banned words across FR/EN/DE/EL.
// Keep the list short and curated. LLM-level toxicity is V2.
const BANLIST: readonly string[] = [
  // FR
  "connard","connasse","salope","pute","enculé","encule","cretin","con",
  // EN
  "idiot","moron","retard","asshole","bitch","fuck","cunt","whore",
  // DE
  "arsch","arschloch","schlampe","fotze","wichser",
  // EL (transliterated)
  "malakas","malaka","gamoto","poutana",
  // spam patterns (kept as whole words too)
  "viagra","cialis","casino","crypto","onlyfans",
];

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase();
}

const BAN_REGEX = new RegExp(
  "\\b(" + BANLIST.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
);

export function containsBanned(text: string): boolean {
  if (!text) return false;
  return BAN_REGEX.test(norm(text));
}

export function looksLikeSpam(text: string): boolean {
  if (!text) return false;
  const urlCount = (text.match(/https?:\/\//gi) ?? []).length;
  if (urlCount >= 2) return true;
  const emailCount = (text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) ?? []).length;
  if (emailCount >= 1) return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const nonAlnum = (trimmed.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
  return nonAlnum / trimmed.length > 0.5;
}
```

- [ ] **Step 4: Run test (expected PASS)**

```powershell
npx vitest run src/lib/reviews/__tests__/banlist.test.ts
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/banlist.ts src/lib/reviews/__tests__/banlist.test.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): banlist (containsBanned + looksLikeSpam) + tests"
```

---

### Task 4: `disposable-domains.ts`

**Files:**
- Create: `src/lib/reviews/disposable-domains.ts`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/reviews/disposable-domains.ts
// Snapshot of the most common disposable e-mail domains.
// MAJ trimestrielle manuelle (cf spec, Hors périmètre V1: auto-MAJ).
// Source de réf: github.com/disposable-email-domains/disposable-email-domains
// Stocké en Set lowercase pour lookup O(1).

const DOMAINS: readonly string[] = [
  "0-mail.com","027168.com","0815.ru","0clickemail.com","0wnd.net","0wnd.org",
  "10minutemail.co.uk","10minutemail.com","10minutemail.de","10minutemail.net",
  "1secmail.com","1secmail.net","1secmail.org",
  "20minutemail.com","2prong.com","30minutemail.com","33mail.com","3d-painting.com",
  "4warding.com","4warding.net","4warding.org",
  "anonbox.net","anonymbox.com","antichef.com","antichef.net","antispam.de","antispammail.de",
  "binkmail.com","bobmail.info","bofthew.com","bouncr.com","breakthru.com","brefmail.com",
  "byom.de",
  "chacuo.net","chammy.info","cool.fr.nf","correo.blogos.net","cosmorph.com","courriel.fr.nf",
  "courrieltemporaire.com","crapmail.org","cust.in","cuvox.de",
  "dacoolest.com","dandikmail.com","dayrep.com","deadaddress.com","deagot.com","despam.it",
  "devnullmail.com","dfgh.net","digitalsanctuary.com","disposableaddress.com","disposablemail.com",
  "disposeamail.com","disposemail.com","dispostable.com","dodgeit.com","dodgit.com","dodgit.org",
  "dogit.com","donemail.ru","dontreg.com","dontsendmespam.de","drdrb.net",
  "easytrashmail.com","einrot.com","email60.com","emailgo.de","emailias.com","emailinfive.com",
  "emaillox.com","emailmiser.com","emailproxsy.com","emailsensei.com","emailtemporario.com.br",
  "emailto.de","emailwarden.com","emailx.at.hm","emailxfer.com","emeil.in","emeil.ir",
  "emz.net","ero-tube.org","etranquil.com","etranquil.net","etranquil.org","explodemail.com",
  "fakeinbox.com","fakeinformation.com","fastacura.com","fastchevy.com","fastchrysler.com",
  "fastkawasaki.com","fastmazda.com","fastmitsubishi.com","fastnissan.com","fastsubaru.com",
  "fastsuzuki.com","fasttoyota.com","fastyamaha.com","filzmail.com","fixmail.tk","fizmail.com",
  "fr33mail.info","frapmail.com","front14.org","fuckingduh.com",
  "garliclife.com","get1mail.com","get2mail.fr","getairmail.com","getmails.eu","getonemail.com",
  "ghosttexter.de","girlsundertheinfluence.com","gishpuppy.com","goemailgo.com","gotmail.net",
  "gotmail.org","gotti.otherinbox.com","great-host.in","greensloth.com","grr.la","gsrv.co.uk",
  "guerillamail.biz","guerillamail.com","guerillamail.de","guerillamail.info","guerillamail.net",
  "guerillamail.org","guerillamailblock.com","guerrillamail.biz","guerrillamail.com",
  "guerrillamail.de","guerrillamail.info","guerrillamail.net","guerrillamail.org","guerrillamailblock.com",
  "haltospam.com","harakirimail.com","hidemail.de","hidzz.com","hmamail.com","hopemail.biz",
  "ieh-mail.de","ikbenspamvrij.nl","imails.info","inboxalias.com","inboxclean.com","inboxclean.org",
  "incognitomail.com","incognitomail.net","incognitomail.org","insorg-mail.info","ip6.li",
  "ipoo.org","irish2me.com","iwi.net",
  "jetable.com","jetable.fr.nf","jetable.net","jetable.org","jnxjn.com","jourrapide.com",
  "kasmail.com","keepmymail.com","killmail.com","killmail.net","kir.ch.tc","klassmaster.com",
  "klzlk.com","koszmail.pl","kurzepost.de",
  "lawlita.com","letthemeatspam.com","lhsdv.com","lifebyfood.com","link2mail.net",
  "linuxmail.so","litedrop.com","lol.ovpn.to","lookugly.com","lortemail.dk","lr78.com","lroid.com",
  "lukop.dk",
  "m21.cc","maboard.com","mail-temporaire.fr","mail.by","mail.mezimages.net","mail.zp.ua",
  "mail1a.de","mail2rss.org","mail333.com","mail4trash.com","mailbidon.com","mailbiz.biz",
  "mailblocks.com","mailbucket.org","mailcat.biz","mailcatch.com","maildrop.cc","mailexpire.com",
  "mailfa.tk","mailforspam.com","mailfreeway.com","mailguard.me","mailhz.me","mailimate.com",
  "mailin8r.com","mailinator.com","mailinater.com","mailinator.net","mailinator2.com",
  "mailinator2.net","mailincubator.com","mailismagic.com","mailme.lv","mailme24.com",
  "mailmetrash.com","mailmoat.com","mailms.com","mailnesia.com","mailnull.com","mailorg.org",
  "mailpick.biz","mailrock.biz","mailscrap.com","mailshell.com","mailsiphon.com","mailtothis.com",
  "mailtrash.net","mailtv.net","mailtv.tv","mailzilla.com","mailzilla.org","makemetheking.com",
  "manybrain.com","mbx.cc","mega.zik.dj","meinspamschutz.de","meltmail.com","messagebeamer.de",
  "mintemail.com","misterpinball.de","moncourrier.fr.nf","monemail.fr.nf","monmail.fr.nf",
  "msa.minsmail.com","mt2009.com","mt2014.com","mycard.net.ua","mycleaninbox.net",
  "mymailoasis.com","mypartyclip.de","myphantomemail.com","mysamp.de","mytempemail.com",
  "mytempmail.com","mytrashmail.com",
  "nabuma.com","neomailbox.com","nepwk.com","nervmich.net","nervtmich.net","netmails.com",
  "netmails.net","neverbox.com","no-spam.ws","nobulk.com","noclickemail.com","nogmailspam.info",
  "nomail.xl.cx","nomail2me.com","nomorespamemails.com","nospam.ze.tc","nospam4.us","nospamfor.us",
  "nospammail.net","notmailinator.com","nowhere.org","nowmymail.com","nurfuerspam.de",
  "objectmail.com","obobbo.com","odnorazovoe.ru","oneoffemail.com","onewaymail.com",
  "online.ms","oopi.org","ordinaryamerican.net","otherinbox.com","ourklips.com",
  "outlawspam.com","ovpn.to","owlpic.com",
  "pancakemail.com","pjjkp.com","plexolan.de","poczta.onet.pl","politikerclub.de","poofy.org",
  "pookmail.com","privacy.net","privatdemail.net","proxymail.eu","prtnx.com","punkass.com",
  "putthisinyourspamdatabase.com","pwrby.com",
  "quickinbox.com",
  "rcpt.at","reallymymail.com","recode.me","recursor.net","reliable-mail.com","rhyta.com",
  "rmqkr.net","royal.net","rppkn.com","rtrtr.com","s0ny.net","safe-mail.net","safersignup.de",
  "safetymail.info","safetypost.de","sandelf.de","saynotospams.com","schafmail.de","schrott-email.de",
  "secretemail.de","secure-mail.biz","selfdestructingmail.com","sendspamhere.com","sharedmailbox.org",
  "sharklasers.com","shieldedmail.com","shieldemail.com","shiftmail.com","shitmail.me","shitmail.org",
  "shitware.nl","shmeriously.com","shortmail.net","sibmail.com","skeefmail.com","slapsfromlastnight.com",
  "slaskpost.se","smashmail.de","smellfear.com","snakemail.com","sneakemail.com","sneakmail.de",
  "snkmail.com","sofimail.com","sofort-mail.de","softpls.asia","sogetthis.com","soodonims.com",
  "spam.la","spam.su","spam4.me","spamavert.com","spambob.com","spambob.net","spambob.org",
  "spambog.com","spambog.de","spambog.net","spambog.ru","spambox.info","spambox.org","spambox.us",
  "spamcannon.com","spamcannon.net","spamcero.com","spamcorptastic.com","spamcowboy.com",
  "spamcowboy.net","spamcowboy.org","spamday.com","spamex.com","spamfree.eu","spamfree24.com",
  "spamfree24.de","spamfree24.eu","spamfree24.info","spamfree24.net","spamfree24.org","spamgoes.in",
  "spamgourmet.com","spamgourmet.net","spamgourmet.org","spamherelots.com","spamhereplease.com",
  "spamhole.com","spamify.com","spaml.com","spaml.de","spammotel.com","spamobox.com","spamoff.de",
  "spamslicer.com","spamspot.com","spamthis.co.uk","spamthisplease.com","spamtrail.com",
  "spamtroll.net","speed.1s.fr","supergreatmail.com","supermailer.jp","superrito.com",
  "superstachel.de","suremail.info","svk.jp",
  "tafmail.com","tagyourself.com","talkinator.com","tapchicongnghe.net","teewars.org",
  "teleworm.com","teleworm.us","temp-mail.com","temp-mail.org","temp-mail.ru","tempail.com",
  "tempemail.biz","tempemail.com","tempinbox.co.uk","tempinbox.com","tempmail.eu","tempmaildemand.com",
  "tempmailer.com","tempmailer.de","tempomail.fr","temporarily.de","temporarioemail.com.br",
  "temporaryemail.net","temporaryforwarding.com","temporaryinbox.com","temporarymailaddress.com",
  "tempymail.com","thanksnospam.info","thankyou2010.com","thc.st","thelimestones.com","thismail.net",
  "throwawayemailaddress.com","throwawaymail.com","tilien.com","tittbit.in","tizi.com","tmail.ws",
  "tmailinator.com","toomail.biz","topranklist.de","tradermail.info","trash-mail.at","trash-mail.com",
  "trash-mail.de","trash2009.com","trashdevil.com","trashemail.de","trashinbox.com","trashmail.at",
  "trashmail.com","trashmail.de","trashmail.me","trashmail.net","trashmail.org","trashmail.ws",
  "trashmailer.com","trashymail.com","trashymail.net","trbvm.com","trialmail.de","trillianpro.com",
  "twinmail.de","tyldd.com",
  "uggsrock.com","umail.net","upliftnow.com","uplipht.com","uroid.com","us.af","venompen.com",
  "veryrealemail.com","viditag.com","viralplays.com","vpn.st","vsimcard.com","vubby.com",
  "wasteland.rfc822.org","webemail.me","weg-werf-email.de","wegwerf-emails.de","wegwerfadresse.de",
  "wegwerfemail.com","wegwerfemail.de","wegwerfmail.de","wegwerfmail.info","wegwerfmail.net",
  "wegwerfmail.org","wh4f.org","whatpaas.com","whatiaas.com","whyspam.me","willhackforfood.biz",
  "willselfdestruct.com","winemaven.info","wronghead.com","wuzup.net","wuzupmail.net",
  "www.e4ward.com","www.gishpuppy.com","www.mailinator.com","wwwnew.eu",
  "x.ip6.li","xagloo.com","xemaps.com","xents.com","xmaily.com","xoxy.net","yep.it",
  "yogamaven.com","yopmail.com","yopmail.fr","yopmail.net","yourdomain.com","ypmail.webarnak.fr.eu.org",
  "yuurok.com","z1p.biz","za.com","zehnminuten.de","zehnminutenmail.de","zetmail.com",
  "zippymail.info","zoaxe.com","zoemail.org",
];

export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set(DOMAINS.map((d) => d.toLowerCase()));

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.trim().toLowerCase());
}
```

- [ ] **Step 2: Quick sanity check (no test file — data module)**

```powershell
node -e "const m=require('./src/lib/reviews/disposable-domains.ts'); console.log(m)"
```

(If ts not directly runnable, skip — used at runtime in `submit/route.ts` and tested there.)

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/disposable-domains.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): disposable e-mail domains snapshot"
```

---

### Task 5: `sanitize.ts` + tests

**Files:**
- Create: `src/lib/reviews/sanitize.ts`
- Create: `src/lib/reviews/__tests__/sanitize.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/reviews/__tests__/sanitize.test.ts
import { describe, it, expect } from "vitest";
import { normalizeEmail, sanitizeText, sanitizeAuthorName } from "../sanitize";

describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("Alice@Example.COM")).toBe("alice@example.com");
  });
  it("strips Gmail +tag", () => {
    expect(normalizeEmail("alice+spam@gmail.com")).toBe("alice@gmail.com");
  });
  it("strips Gmail dot", () => {
    expect(normalizeEmail("a.l.i.c.e@gmail.com")).toBe("alice@gmail.com");
  });
  it("does NOT strip dots/plus on non-Gmail", () => {
    expect(normalizeEmail("a.b+c@outlook.com")).toBe("a.b+c@outlook.com");
  });
});

describe("sanitizeText", () => {
  it("strips script tag", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello");
  });
  it("strips img onerror", () => {
    expect(sanitizeText('<img src=x onerror="alert(1)">ok')).toBe("ok");
  });
  it("keeps plain text", () => {
    expect(sanitizeText("Belle plage, calme.")).toBe("Belle plage, calme.");
  });
});

describe("sanitizeAuthorName", () => {
  it("strips newlines", () => {
    expect(sanitizeAuthorName("Alice\nBob")).toBe("AliceBob");
  });
  it("keeps Unicode letters and accents", () => {
    expect(sanitizeAuthorName("Hélène Müller")).toBe("Hélène Müller");
  });
  it("rejects HTML brackets", () => {
    expect(sanitizeAuthorName("Alice<b>X</b>")).toBe("AliceX");
  });
  it("truncates above 40 chars", () => {
    expect(sanitizeAuthorName("a".repeat(50)).length).toBe(40);
  });
});
```

- [ ] **Step 2: Run test (expected FAIL)**

```powershell
npx vitest run src/lib/reviews/__tests__/sanitize.test.ts
```

Expected: FAIL `Cannot find module '../sanitize'`.

- [ ] **Step 3: Implement `sanitize.ts`**

```typescript
// src/lib/reviews/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain] = email.trim().toLowerCase().split("@");
  if (!rawLocal || !rawDomain) return email.trim().toLowerCase();
  let local = rawLocal;
  if (rawDomain === "gmail.com" || rawDomain === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx >= 0) local = local.slice(0, plusIdx);
    local = local.replace(/\./g, "");
  }
  return `${local}@${rawDomain}`;
}

export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeAuthorName(name: string): string {
  // Strip newlines + any HTML, then keep only Unicode L/N/P/Z (separators) + space.
  const stripped = sanitizeText(name).replace(/[\r\n]/g, "");
  const allowed = stripped.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "");
  return allowed.slice(0, 40);
}
```

- [ ] **Step 4: Run test (expected PASS)**

```powershell
npx vitest run src/lib/reviews/__tests__/sanitize.test.ts
```

Expected: 10 passed.

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/sanitize.ts src/lib/reviews/__tests__/sanitize.test.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): sanitize (normalizeEmail Gmail-aware + DOMPurify text/name) + tests"
```

---

### Task 6: `sec.ts` (hashIp, hashToken, getClientIp, rateLimit, fakeAwaitEmail) + tests

**Files:**
- Create: `src/lib/reviews/sec.ts`
- Create: `src/lib/reviews/__tests__/sec.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/reviews/__tests__/sec.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { hashIp, hashToken } from "../sec";

beforeAll(() => {
  process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
});

describe("hashIp", () => {
  it("is deterministic for same input + salt", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });
  it("returns a 64-char hex string", () => {
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs when salt changes", () => {
    const a = hashIp("1.2.3.4");
    process.env.REVIEWS_SALT = "different-salt-32-characters-bbbb";
    const b = hashIp("1.2.3.4");
    expect(a).not.toBe(b);
    process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
  });
});

describe("hashToken", () => {
  it("is deterministic and 64-hex", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("does NOT depend on salt (token is already secret)", () => {
    const a = hashToken("xyz");
    process.env.REVIEWS_SALT = "yet-another-salt-32-chars-cccccccc";
    const b = hashToken("xyz");
    expect(a).toBe(b);
    process.env.REVIEWS_SALT = "test-salt-32-characters-aaaaaaaaaa";
  });
});
```

- [ ] **Step 2: Run test (expected FAIL)**

```powershell
npx vitest run src/lib/reviews/__tests__/sec.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `sec.ts`**

```typescript
// src/lib/reviews/sec.ts
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const CURRENT_SALT_VERSION = 1;

export function hashIp(ip: string): string {
  const salt = process.env.REVIEWS_SALT ?? "";
  return createHash("sha256").update(ip + salt).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export const SALT_VERSION = CURRENT_SALT_VERSION;

export async function rateLimit(opts: {
  table: "cb_reviews" | "cb_review_votes" | "cb_review_reports";
  filter: { column: string; value: string };
  limit: number;
  windowSec: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString();
  const { count, error } = await supabase
    .from(opts.table)
    .select("*", { count: "exact", head: true })
    .eq(opts.filter.column, opts.filter.value)
    .gte("created_at", since);
  if (error) return false; // fail-open: don't block legitimate users on transient DB error
  return (count ?? 0) >= opts.limit;
}

export async function fakeAwaitEmail(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
}
```

- [ ] **Step 4: Run test (expected PASS)**

```powershell
npx vitest run src/lib/reviews/__tests__/sec.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/sec.ts src/lib/reviews/__tests__/sec.test.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): sec helpers (hashIp + hashToken + getClientIp + rateLimit + fakeAwaitEmail)"
```

---

### Task 7: `consent-text.ts`

**Files:**
- Create: `src/lib/reviews/consent-text.ts`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/reviews/consent-text.ts
import { hashToken } from "./sec";

export const CONSENT_VERSION = "v1-20260615";

export const CONSENT_TEXTS = {
  en: "I consent to the publication of my review on crete.direct. My e-mail is used only to confirm and manage my review.",
  fr: "J'accepte la publication de mon avis sur crete.direct. Mon e-mail sert uniquement à confirmer et à gérer mon avis.",
  de: "Ich stimme der Veröffentlichung meiner Bewertung auf crete.direct zu. Meine E-Mail wird ausschließlich zur Bestätigung und Verwaltung verwendet.",
  el: "Συναινώ στη δημοσίευση της κριτικής μου στο crete.direct. Το email μου χρησιμοποιείται μόνο για επιβεβαίωση και διαχείριση.",
} as const;

type SupportedLocale = keyof typeof CONSENT_TEXTS;

export function consentTextFor(locale: string): { text: string; hash: string } {
  const l = (locale in CONSENT_TEXTS ? locale : "en") as SupportedLocale;
  const text = CONSENT_TEXTS[l];
  const hash = hashToken(`${CONSENT_VERSION}:${text}`);
  return { text, hash };
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/consent-text.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): consent texts 4 locales + hashed version stamp"
```

---

### Task 8: `aggregate.ts` (moyenne + distribution) + tests

**Files:**
- Create: `src/lib/reviews/aggregate.ts`
- Create: `src/lib/reviews/__tests__/aggregate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/reviews/__tests__/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { computeAggregate } from "../aggregate";

describe("computeAggregate", () => {
  it("returns zeros on empty input", () => {
    expect(computeAggregate([])).toEqual({ avg: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });
  it("computes average to 2 decimals", () => {
    expect(computeAggregate([5, 4, 3]).avg).toBe(4);
    expect(computeAggregate([5, 4]).avg).toBe(4.5);
  });
  it("counts distribution", () => {
    expect(computeAggregate([5, 5, 4, 3, 1]).distribution).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1, 5: 2 });
  });
});
```

- [ ] **Step 2: Run test (FAIL)**

```powershell
npx vitest run src/lib/reviews/__tests__/aggregate.test.ts
```

- [ ] **Step 3: Implement `aggregate.ts`**

```typescript
// src/lib/reviews/aggregate.ts
export type Distribution = { 1: number; 2: number; 3: number; 4: number; 5: number };
export type Aggregate = { avg: number | null; count: number; distribution: Distribution };

export function computeAggregate(ratings: number[]): Aggregate {
  const distribution: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (ratings.length === 0) return { avg: null, count: 0, distribution };
  let sum = 0;
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++;
      sum += r;
    }
  }
  return { avg: Math.round((sum / ratings.length) * 100) / 100, count: ratings.length, distribution };
}
```

- [ ] **Step 4: Run test (PASS)** — expect 3 passed.

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/reviews/aggregate.ts src/lib/reviews/__tests__/aggregate.test.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): aggregate (avg + count + distribution) + tests"
```

---

## Phase D — Email

### Task 9: `sendReviewConfirmationEmail` in `lib/email.ts`

**Files:**
- Modify: `src/lib/email.ts` (append function)

- [ ] **Step 1: Read existing `sendConfirmationEmail` to mirror its signature/style**

```powershell
Get-Content C:\Users\fkerj\cretepulse-reviews\src\lib\email.ts
```

- [ ] **Step 2: Append `sendReviewConfirmationEmail`**

Add at the end of `src/lib/email.ts`:

```typescript
type ReviewMailLocale = "en" | "fr" | "de" | "el";

const REVIEW_SUBJECT: Record<ReviewMailLocale, string> = {
  en: "Confirm your review on crete.direct",
  fr: "Confirme ton avis sur crete.direct",
  de: "Bestätige deine Bewertung auf crete.direct",
  el: "Επιβεβαίωσε την κριτική σου στο crete.direct",
};

const REVIEW_BODY: Record<ReviewMailLocale, (placeName: string, confirmUrl: string, deleteUrl: string) => string> = {
  en: (p, c, d) => `Hi,\n\nThanks for reviewing ${p} on crete.direct.\n\nConfirm your review (one click):\n${c}\n\nChanged your mind? Delete it:\n${d}\n\n— crete.direct`,
  fr: (p, c, d) => `Bonjour,\n\nMerci pour ton avis sur ${p} sur crete.direct.\n\nConfirme ton avis (un clic) :\n${c}\n\nTu as changé d'avis ? Supprime-le :\n${d}\n\n— crete.direct`,
  de: (p, c, d) => `Hallo,\n\nDanke für deine Bewertung von ${p} auf crete.direct.\n\nBewertung bestätigen (ein Klick):\n${c}\n\nMeinung geändert? Löschen:\n${d}\n\n— crete.direct`,
  el: (p, c, d) => `Γεια,\n\nΕυχαριστούμε για την κριτική σου για το ${p} στο crete.direct.\n\nΕπιβεβαίωσε (ένα κλικ):\n${c}\n\nΆλλαξες γνώμη; Διαγραφή:\n${d}\n\n— crete.direct`,
};

export async function sendReviewConfirmationEmail(opts: {
  email: string;
  confirmToken: string;
  deleteToken: string;
  locale: string;
  placeName: string;
}): Promise<void> {
  const l = (["en", "fr", "de", "el"].includes(opts.locale) ? opts.locale : "en") as ReviewMailLocale;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const confirmUrl = `${base}/api/reviews/confirm?token=${encodeURIComponent(opts.confirmToken)}`;
  const deleteUrl  = `${base}/api/reviews/delete?token=${encodeURIComponent(opts.deleteToken)}`;
  // Reuse the same Resend client/init as sendConfirmationEmail above.
  await resend.emails.send({
    from: `crete.direct <${process.env.RESEND_FROM ?? "noreply@crete.direct"}>`,
    to: opts.email,
    subject: REVIEW_SUBJECT[l],
    text: REVIEW_BODY[l](opts.placeName, confirmUrl, deleteUrl),
  });
}
```

> NOTE: If `resend` instance is not exported at module top in the current file, declare/import it identically to how `sendConfirmationEmail` does. Do not reinvent.

- [ ] **Step 3: tsc check**

```powershell
npx tsc --noEmit
```

Expected: baseline error count (no new errors in `src/lib/email.ts`).

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/lib/email.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): sendReviewConfirmationEmail (4 locales) in lib/email"
```

---

## Phase E — Public API routes

> **Shared scaffold for every route in this phase:** same imports + `EMAIL_REGEX` + `supabaseAdmin` Proxy + honeypot + JSON body try/catch + silent success patterns as `src/app/api/newsletter/subscribe/route.ts`. Re-read that file once before starting Task 10 if the pattern isn't fresh.

### Task 10: `POST /api/reviews/submit`

**Files:**
- Create: `src/app/api/reviews/submit/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as dns } from "node:dns";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendReviewConfirmationEmail } from "@/lib/email";
import { normalizeEmail, sanitizeText, sanitizeAuthorName } from "@/lib/reviews/sanitize";
import { containsBanned, looksLikeSpam } from "@/lib/reviews/banlist";
import { isDisposable } from "@/lib/reviews/disposable-domains";
import { hashIp, hashToken, getClientIp, rateLimit, fakeAwaitEmail, SALT_VERSION } from "@/lib/reviews/sec";
import { consentTextFor } from "@/lib/reviews/consent-text";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OK = NextResponse.json({ ok: true, requires_confirmation: true });
const OK_SILENT = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: silent success + fake-await (anti latency enumeration)
  if (body.website && String(body.website).trim() !== "") {
    await fakeAwaitEmail();
    return OK_SILENT;
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const placeName = typeof body.place_name === "string" ? body.place_name.trim().slice(0, 120) : slug;
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 1000) : "";
  const authorRaw = typeof body.author_name === "string" ? body.author_name : "";
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";

  if (!slug || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating or slug" }, { status: 422 });
  }
  if (!EMAIL_REGEX.test(emailRaw)) {
    return NextResponse.json({ error: "Invalid e-mail" }, { status: 422 });
  }

  const email = normalizeEmail(emailRaw);
  const [, domain] = email.split("@");
  if (!domain || isDisposable(domain)) {
    await fakeAwaitEmail();
    return OK_SILENT;
  }

  // MX lookup
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) { await fakeAwaitEmail(); return OK_SILENT; }
  } catch { await fakeAwaitEmail(); return OK_SILENT; }

  // Sanitize + content filter
  const safeComment = comment ? sanitizeText(comment) : "";
  const safeAuthor = sanitizeAuthorName(authorRaw);
  if (!safeAuthor) return NextResponse.json({ error: "Invalid name" }, { status: 422 });
  if (containsBanned(safeComment) || containsBanned(safeAuthor) || looksLikeSpam(safeComment)) {
    return NextResponse.json({ error: "Review rejected" }, { status: 422 });
  }

  const ip = getClientIp(req);
  const ip_hash = hashIp(ip);

  // Rate-limits
  const ipBurst = await rateLimit({ table: "cb_reviews", filter: { column: "ip_hash", value: ip_hash }, limit: 5, windowSec: 3600 });
  if (ipBurst) { await fakeAwaitEmail(); return OK_SILENT; }
  const emailDay = await rateLimit({ table: "cb_reviews", filter: { column: "email", value: email }, limit: 5, windowSec: 86400 });
  if (emailDay) { await fakeAwaitEmail(); return OK_SILENT; }
  // Domain rate-limit: count today's confirmed rows whose email ends with @domain
  const sinceDay = new Date(Date.now() - 86400 * 1000).toISOString();
  const { count: domainCount } = await supabase
    .from("cb_reviews")
    .select("id", { count: "exact", head: true })
    .like("email", `%@${domain}`)
    .gte("created_at", sinceDay);
  if ((domainCount ?? 0) >= 3) { await fakeAwaitEmail(); return OK_SILENT; }

  // Per-slug burst → pending_review auto
  const sinceHour = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: slugBurst } = await supabase
    .from("cb_reviews")
    .select("id", { count: "exact", head: true })
    .eq("place_slug", slug)
    .gte("created_at", sinceHour);
  const initialStatus = (slugBurst ?? 0) >= 20 ? "pending_review" : "pending";

  // Banned per-slug?
  const email_hash = hashToken(email);
  const { data: bannedRow } = await supabase
    .from("cb_review_banned_emails")
    .select("email_hash")
    .eq("email_hash", email_hash)
    .eq("place_slug", slug)
    .maybeSingle();
  if (bannedRow) { await fakeAwaitEmail(); return OK_SILENT; }

  // Existing row?
  const { data: existing } = await supabase
    .from("cb_reviews")
    .select("id, status")
    .eq("place_slug", slug)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status === "published" || existing.status === "removed") {
      await fakeAwaitEmail();
      return OK_SILENT;
    }
    if (existing.status === "pending" || existing.status === "expired") {
      // Mark old as expired (idempotent if already expired), then continue to insert a new pending.
      await supabase.from("cb_reviews").update({ status: "expired" }).eq("id", existing.id);
    }
    // pending_review existant: silent success, Kami devra trancher.
    if (existing.status === "pending_review") { await fakeAwaitEmail(); return OK_SILENT; }
  }

  const confirm_token = randomUUID();
  const delete_token = randomUUID();
  const { text: consent_text, hash: consent_text_hash } = consentTextFor(locale);

  const { error } = await supabase.from("cb_reviews").insert({
    place_slug: slug,
    rating,
    comment: safeComment || null,
    author_name: safeAuthor,
    email,
    status: initialStatus,
    confirm_token_hash: hashToken(confirm_token),
    delete_token_hash: hashToken(delete_token),
    consent_at: new Date().toISOString(),
    consent_text_hash,
    ip_hash,
    salt_version: SALT_VERSION,
    locale: ["en","fr","de","el","it","nl","pl","es","pt","ru","ja","ko","zh","tr","sv","da","no","fi","cs","hu","ro","ar"].includes(locale) ? locale : "en",
  });
  if (error) {
    // Unique violation = race with another submit → silent success
    if ((error as { code?: string }).code === "23505") { await fakeAwaitEmail(); return OK_SILENT; }
    console.error("[reviews/submit] insert failed:", error.message);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  try {
    await sendReviewConfirmationEmail({ email, confirmToken: confirm_token, deleteToken: delete_token, locale, placeName });
  } catch (e) {
    console.error("[reviews/submit] mail failed:", e);
    // Don't fail the submission — user can request resend later.
  }

  void consent_text; // tracked for audit, not returned
  return OK;
}
```

- [ ] **Step 2: tsc check**

```powershell
npx tsc --noEmit
```

Expected: baseline (no new errors in `submit/route.ts`).

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/submit/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/reviews/submit (filter+rate-limit+magic link)"
```

---

### Task 11: `GET /api/reviews/confirm`

**Files:**
- Create: `src/app/api/reviews/confirm/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(`${base}/`, 303);
  const token_hash = hashToken(token);

  const { data: row, error } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, status, locale")
    .eq("confirm_token_hash", token_hash)
    .maybeSingle();

  if (error || !row) return NextResponse.redirect(`${base}/`, 303);
  const locale = row.locale ?? "en";

  if (row.status === "pending") {
    await supabase.from("cb_reviews").update({
      status: "published",
      published_at: new Date().toISOString(),
      confirm_token_hash: null,
    }).eq("id", row.id);
    revalidateTag(`place-${row.place_slug}`);
    return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis?confirmed=1`, 303);
  }

  if (row.status === "expired") {
    return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis?expired=1`, 303);
  }

  // already published / removed / pending_review → benign redirect
  return NextResponse.redirect(`${base}/${locale}/explore/${row.place_slug}/avis`, 303);
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/confirm/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/reviews/confirm (magic link + revalidateTag)"
```

---

### Task 12: `GET /api/reviews/delete`

**Files:**
- Create: `src/app/api/reviews/delete/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(`${base}/`, 303);
  const token_hash = hashToken(token);

  const { data: row } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, locale")
    .eq("delete_token_hash", token_hash)
    .maybeSingle();
  if (!row) return NextResponse.redirect(`${base}/`, 303);

  await supabase.from("cb_reviews").update({
    status: "removed",
    removed_at: new Date().toISOString(),
    removed_reason: "user_request",
    email: "",
    delete_token_hash: null,
  }).eq("id", row.id);

  revalidateTag(`place-${row.place_slug}`);
  return NextResponse.redirect(`${base}/${row.locale ?? "en"}/explore/${row.place_slug}?deleted=1`, 303);
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/delete/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/reviews/delete (user art.17 erasure)"
```

---

### Task 13: `POST /api/reviews/request-deletion`

**Files:**
- Create: `src/app/api/reviews/request-deletion/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/request-deletion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { sendReviewConfirmationEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/reviews/sanitize";
import { hashToken, fakeAwaitEmail } from "@/lib/reviews/sec";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OK = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const raw = typeof body.email === "string" ? body.email : "";
  if (!EMAIL_REGEX.test(raw)) { await fakeAwaitEmail(); return OK; }
  const email = normalizeEmail(raw);

  const { data: rows } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, locale")
    .eq("email", email)
    .eq("status", "published");

  if (!rows || rows.length === 0) { await fakeAwaitEmail(); return OK; }

  for (const r of rows) {
    const newToken = randomUUID();
    await supabase.from("cb_reviews").update({ delete_token_hash: hashToken(newToken) }).eq("id", r.id);
    try {
      await sendReviewConfirmationEmail({
        email,
        confirmToken: "noop", // not used (we send only delete here)
        deleteToken: newToken,
        locale: r.locale ?? "en",
        placeName: r.place_slug,
      });
    } catch (e) {
      console.error("[request-deletion] mail failed", e);
    }
  }
  return OK;
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/request-deletion/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/reviews/request-deletion (recovery if e-mail lost)"
```

---

### Task 14: `GET /api/reviews/export`

**Files:**
- Create: `src/app/api/reviews/export/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/reviews/sec";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const { data: row } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, rating, comment, author_name, locale, created_at, published_at, consent_at")
    .eq("delete_token_hash", hashToken(token))
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ review: row });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/export/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/reviews/export (RGPD art.15)"
```

---

### Task 15: `GET /api/reviews/list`

**Files:**
- Create: `src/app/api/reviews/list/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ reviews: [] });
  const { data, error } = await supabase
    .from("cb_reviews_with_counts")
    .select("id, rating, comment, author_name, locale, created_at, upvotes, downvotes")
    .eq("place_slug", slug)
    .eq("status", "published")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[reviews/list]", error.message);
    return NextResponse.json({ reviews: [] });
  }
  return NextResponse.json({ reviews: data ?? [] });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/list/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/reviews/list (published, sorted by util)"
```

---

### Task 16: `GET /api/reviews/aggregate`

**Files:**
- Create: `src/app/api/reviews/aggregate/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/aggregate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { computeAggregate } from "@/lib/reviews/aggregate";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ avg: null, count: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } });
  const { data, error } = await supabase
    .from("cb_reviews")
    .select("rating")
    .eq("place_slug", slug)
    .eq("status", "published");
  if (error) return NextResponse.json({ avg: null, count: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } });
  const ratings = (data ?? []).map((r) => r.rating as number);
  return NextResponse.json(computeAggregate(ratings));
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/aggregate/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/reviews/aggregate (avg+count+distribution)"
```

---

### Task 17: `POST /api/reviews/vote`

**Files:**
- Create: `src/app/api/reviews/vote/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/vote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashIp, getClientIp, rateLimit, SALT_VERSION } from "@/lib/reviews/sec";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const review_id = Number(body.review_id);
  const value = Number(body.value);
  if (!Number.isInteger(review_id) || ![-1,0,1].includes(value)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const ip_hash = hashIp(getClientIp(req));
  const burst = await rateLimit({ table: "cb_review_votes", filter: { column: "ip_hash", value: ip_hash }, limit: 60, windowSec: 3600 });
  if (burst) return NextResponse.json({ ok: true });
  if (value === 0) {
    await supabase.from("cb_review_votes").delete().eq("review_id", review_id).eq("ip_hash", ip_hash);
  } else {
    await supabase.from("cb_review_votes").upsert({ review_id, ip_hash, value, salt_version: SALT_VERSION });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/vote/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/reviews/vote (anonymous, upsert)"
```

---

### Task 18: `POST /api/reviews/report`

**Files:**
- Create: `src/app/api/reviews/report/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reviews/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashIp, getClientIp, rateLimit, SALT_VERSION } from "@/lib/reviews/sec";

const REASONS = new Set(["spam","abuse","offtopic"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const review_id = Number(body.review_id);
  const reason = typeof body.reason === "string" && REASONS.has(body.reason) ? body.reason : "spam";
  if (!Number.isInteger(review_id)) return NextResponse.json({ ok: true });
  const ip_hash = hashIp(getClientIp(req));
  const burst = await rateLimit({ table: "cb_review_reports", filter: { column: "ip_hash", value: ip_hash }, limit: 10, windowSec: 3600 });
  if (burst) return NextResponse.json({ ok: true });
  await supabase.from("cb_review_reports").upsert({ review_id, ip_hash, reason, salt_version: SALT_VERSION });

  // Auto-flag at 5 distinct ip_hash
  const { count } = await supabase.from("cb_review_reports").select("ip_hash", { count: "exact", head: true }).eq("review_id", review_id);
  if ((count ?? 0) >= 5) {
    await supabase.from("cb_reviews").update({ status: "pending_review" }).eq("id", review_id);
    await supabase.from("cb_review_admin_log").insert({ review_id, action: "review_pending", reason: "auto: 5+ reports" });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/reviews/report/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/reviews/report (+ auto-quarantine at 5)"
```

---

## Phase F — Admin + cron

### Task 19: `GET /api/admin/reviews/list`

**Files:**
- Create: `src/app/api/admin/reviews/list/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/admin/reviews/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || secret !== process.env.REVIEWS_ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Quarantined first, then heavily-reported published.
  const { data: pending } = await supabase
    .from("cb_reviews")
    .select("id, place_slug, rating, comment, author_name, status, created_at")
    .in("status", ["pending_review"])
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: reported } = await supabase
    .from("cb_review_reports")
    .select("review_id, ip_hash")
    .limit(2000);
  const counts: Record<string, number> = {};
  for (const r of reported ?? []) counts[r.review_id] = (counts[r.review_id] ?? 0) + 1;
  return NextResponse.json({ pending: pending ?? [], report_counts: counts });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/admin/reviews/list/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): GET /api/admin/reviews/list (?secret)"
```

---

### Task 20: `POST /api/admin/reviews/remove`

**Files:**
- Create: `src/app/api/admin/reviews/remove/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/admin/reviews/remove/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { getClientIp, hashToken } from "@/lib/reviews/sec";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (secret !== process.env.REVIEWS_ADMIN_SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = Number(body.id);
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : null;
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 422 });

  const { data: row } = await supabase.from("cb_reviews").select("id, place_slug, email").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email_hash = hashToken(row.email ?? "");
  await supabase.from("cb_reviews").update({
    status: "removed",
    removed_at: new Date().toISOString(),
    removed_reason: reason ?? "admin",
    email: "",
    delete_token_hash: null,
  }).eq("id", id);

  if (email_hash) {
    await supabase.from("cb_review_banned_emails").upsert({ email_hash, place_slug: row.place_slug });
  }
  await supabase.from("cb_review_admin_log").insert({ review_id: id, action: "remove", reason, admin_ip: getClientIp(req) });
  revalidateTag(`place-${row.place_slug}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/admin/reviews/remove/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/admin/reviews/remove (+ban+audit+revalidate)"
```

---

### Task 21: `POST /api/admin/reviews/restore`

**Files:**
- Create: `src/app/api/admin/reviews/restore/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/admin/reviews/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { getClientIp } from "@/lib/reviews/sec";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  if (secret !== process.env.REVIEWS_ADMIN_SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 422 });

  const { data: row } = await supabase.from("cb_reviews").select("id, place_slug").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await supabase.from("cb_reviews").update({ status: "published", removed_at: null, removed_reason: null }).eq("id", id);
  await supabase.from("cb_review_admin_log").insert({ review_id: id, action: "restore", admin_ip: getClientIp(req) });
  revalidateTag(`place-${row.place_slug}`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/admin/reviews/restore/route.ts
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): POST /api/admin/reviews/restore"
```

---

### Task 22: Cron `reviews-cleanup` + `vercel.json` + env vars

**Files:**
- Create: `src/app/api/cron/reviews-cleanup/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Read existing `vercel.json` to know merge shape**

```powershell
Get-Content C:\Users\fkerj\cretepulse-reviews\vercel.json
```

- [ ] **Step 2: Write the cron route**

```typescript
// src/app/api/cron/reviews-cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const now = Date.now();
  const d7  = new Date(now - 7  * 86400_000).toISOString();
  const d30 = new Date(now - 30 * 86400_000).toISOString();
  const d90 = new Date(now - 90 * 86400_000).toISOString();
  const a = await supabase.from("cb_reviews").delete().eq("status", "pending").lt("created_at", d7);
  const b = await supabase.from("cb_reviews").delete().eq("status", "expired").lt("created_at", d30);
  const c = await supabase.from("cb_review_votes").delete().lt("created_at", d90);
  const d = await supabase.from("cb_review_reports").delete().lt("created_at", d90);
  return NextResponse.json({ a: a.error?.message ?? "ok", b: b.error?.message ?? "ok", c: c.error?.message ?? "ok", d: d.error?.message ?? "ok" });
}
```

- [ ] **Step 3: Merge into `vercel.json`**

If file exists with `crons` array, append `{ "path": "/api/cron/reviews-cleanup", "schedule": "0 3 * * *" }`. If file does not exist, create it with:

```json
{
  "crons": [
    { "path": "/api/cron/reviews-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

- [ ] **Step 4: Add Vercel env vars (one-shot via CLI; user may also do it in dashboard)**

```powershell
cd C:\Users\fkerj\cretepulse-reviews
# Generate strong values once, store them locally for now:
$saltVal   = -join ((1..48) | ForEach-Object { [char](Get-Random -Min 33 -Max 127) })
$secretVal = -join ((1..48) | ForEach-Object { [char](Get-Random -Min 33 -Max 127) })
"REVIEWS_SALT=$saltVal" | Out-File -Append -Encoding utf8 .env.local
"REVIEWS_ADMIN_SECRET=$secretVal" | Out-File -Append -Encoding utf8 .env.local
# Then push to Vercel (requires Vercel CLI auth)
vercel env add REVIEWS_SALT production
vercel env add REVIEWS_ADMIN_SECRET production
# Same for preview + development envs.
```

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/api/cron/reviews-cleanup/route.ts vercel.json
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): cron /api/cron/reviews-cleanup + vercel.json schedule"
```

---

## Phase G — Front

### Task 23: `ReviewCard.tsx`

**Files:**
- Create: `src/components/reviews/ReviewCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useState } from "react";

export type ReviewPublic = {
  id: number;
  rating: number;
  comment: string | null;
  author_name: string;
  locale: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

export function ReviewCard({ review, locale }: { review: ReviewPublic; locale: string }) {
  const stored = typeof window !== "undefined" ? (window.localStorage.getItem("cd-review-votes") ?? "{}") : "{}";
  const initial: Record<string, -1 | 0 | 1> = (() => { try { return JSON.parse(stored); } catch { return {}; } })();
  const [vote, setVote] = useState<-1 | 0 | 1>(initial[review.id] ?? 0);
  const [score, setScore] = useState(review.upvotes - review.downvotes);
  const [reported, setReported] = useState(false);

  async function castVote(next: -1 | 0 | 1) {
    const delta = next - vote;
    setScore((s) => s + delta);
    setVote(next);
    const map = { ...initial, [review.id]: next };
    try { window.localStorage.setItem("cd-review-votes", JSON.stringify(map)); } catch {}
    try {
      await fetch("/api/reviews/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_id: review.id, value: next }) });
    } catch {}
  }

  async function report(reason: "spam" | "abuse" | "offtopic") {
    setReported(true);
    try { await fetch("/api/reviews/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_id: review.id, reason }) }); } catch {}
  }

  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(review.created_at));

  return (
    <article className="rounded-2xl border border-sand-warm bg-white p-4">
      <header className="flex items-center justify-between text-sm">
        <span className="font-heading text-base">{review.author_name}</span>
        <span className="opacity-60">{date}</span>
      </header>
      <div className="mt-1 text-aegean">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
      {review.comment && <p className="mt-2 whitespace-pre-line">{review.comment}</p>}
      <footer className="mt-3 flex items-center gap-3 text-sm">
        <button onClick={() => castVote(vote === 1 ? 0 : 1)} className={vote === 1 ? "text-aegean font-bold" : "opacity-70"}>▲</button>
        <span>{score}</span>
        <button onClick={() => castVote(vote === -1 ? 0 : -1)} className={vote === -1 ? "text-terra font-bold" : "opacity-70"}>▼</button>
        <span className="ml-auto">
          {reported ? <em className="opacity-60">signalé</em> : (
            <details>
              <summary className="cursor-pointer opacity-60">signaler</summary>
              <div className="mt-1 flex gap-1">
                <button onClick={() => report("spam")}>spam</button>
                <button onClick={() => report("abuse")}>abus</button>
                <button onClick={() => report("offtopic")}>hors-sujet</button>
              </div>
            </details>
          )}
        </span>
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/components/reviews/ReviewCard.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): ReviewCard (vote optimistic + report menu)"
```

---

### Task 24: `ReviewForm.tsx`

**Files:**
- Create: `src/components/reviews/ReviewForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useState } from "react";

const T = {
  en: { rate:"Your rating", name:"Name", email:"E-mail", comment:"Comment (optional)", submit:"Submit", check:"Check your inbox to publish your review.", err:"Could not submit. Try again later.", consent:"I consent to the publication of my review on crete.direct." },
  fr: { rate:"Ta note", name:"Nom",   email:"E-mail", comment:"Commentaire (facultatif)", submit:"Envoyer", check:"Vérifie ta boîte mail pour publier ton avis.", err:"Échec de l'envoi. Réessaie plus tard.", consent:"J'accepte la publication de mon avis sur crete.direct." },
  de: { rate:"Bewertung", name:"Name",email:"E-Mail", comment:"Kommentar (optional)", submit:"Senden", check:"Schau in dein Postfach, um zu veröffentlichen.", err:"Senden fehlgeschlagen.", consent:"Ich stimme der Veröffentlichung meiner Bewertung zu." },
  el: { rate:"Βαθμολογία", name:"Όνομα", email:"E-mail", comment:"Σχόλιο (προαιρετικά)", submit:"Υποβολή", check:"Έλεγξε το email σου για δημοσίευση.", err:"Η υποβολή απέτυχε.", consent:"Συναινώ στη δημοσίευση της κριτικής μου." },
} as const;
type L = keyof typeof T;

export function ReviewForm({ slug, placeName, locale }: { slug: string; placeName: string; locale: string }) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];
  const [state, setState] = useState<"idle"|"submitting"|"check-email"|"error">("idle");
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting" || !consent || rating < 1 || rating > 5) return;
    setState("submitting");
    try {
      const r = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, place_name: placeName, rating, comment, author_name: name, email, locale, website }),
      });
      if (r.ok) setState("check-email");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "check-email") return <p className="rounded-2xl border border-sand-warm bg-white p-4">{t.check}</p>;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-sand-warm bg-white p-4 space-y-3">
      <div>
        <label className="block text-sm">{t.rate}</label>
        <div className="flex gap-1 text-2xl">
          {[1,2,3,4,5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-aegean" : "opacity-40"} aria-label={`${n}★`}>★</button>
          ))}
        </div>
      </div>
      <input className="w-full rounded-lg border p-2" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      <input className="w-full rounded-lg border p-2" placeholder={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <textarea className="w-full rounded-lg border p-2" placeholder={t.comment} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} />
      <input type="text" name="website" tabIndex={-1} aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} autoComplete="off" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>{t.consent}</span>
      </label>
      <button type="submit" disabled={state === "submitting" || !consent || rating < 1} className="rounded-lg bg-aegean px-4 py-2 text-white disabled:opacity-50">{t.submit}</button>
      {state === "error" && <p className="text-terra text-sm">{t.err}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/components/reviews/ReviewForm.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): ReviewForm (rating + name + email + consent + honeypot)"
```

---

### Task 25: `ReviewsPage.tsx` (client wrapper)

**Files:**
- Create: `src/components/reviews/ReviewsPage.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { ReviewCard, type ReviewPublic } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";

type Agg = { avg: number | null; count: number; distribution: { 1:number;2:number;3:number;4:number;5:number } };

const T = {
  en: { title:"Reviews", empty:"Be the first to review this place.", leave:"Leave a review" },
  fr: { title:"Avis",     empty:"Sois le premier à laisser un avis.", leave:"Laisser un avis" },
  de: { title:"Bewertungen", empty:"Schreibe die erste Bewertung.", leave:"Bewertung schreiben" },
  el: { title:"Κριτικές", empty:"Γίνε ο πρώτος που γράφει κριτική.", leave:"Άφησε κριτική" },
} as const;
type L = keyof typeof T;

export function ReviewsPage({ slug, placeName, locale, reviews, aggregate }: {
  slug: string; placeName: string; locale: string;
  reviews: ReviewPublic[]; aggregate: Agg;
}) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];
  const max = Math.max(1, ...Object.values(aggregate.distribution));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-3xl">{t.title} · {placeName}</h1>
      <section className="mt-4 rounded-2xl border border-sand-warm bg-white p-4">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-4xl">{aggregate.avg?.toFixed(1) ?? "—"}</span>
          <span className="opacity-70">({aggregate.count})</span>
        </div>
        <ul className="mt-3 space-y-1">
          {[5,4,3,2,1].map((n) => (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="w-4">{n}</span>
              <div className="h-2 flex-1 rounded bg-sand">
                <div className="h-2 rounded bg-aegean" style={{ width: `${(aggregate.distribution[n as 1|2|3|4|5] / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right opacity-70">{aggregate.distribution[n as 1|2|3|4|5]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6 space-y-3">
        {reviews.length === 0 ? <p>{t.empty}</p> : reviews.map((r) => <ReviewCard key={r.id} review={r} locale={locale} />)}
      </section>
      <section className="mt-8">
        <h2 className="font-heading text-2xl mb-3">{t.leave}</h2>
        <ReviewForm slug={slug} placeName={placeName} locale={locale} />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/components/reviews/ReviewsPage.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): ReviewsPage (header + distribution + list + form)"
```

---

### Task 26: Page `/[locale]/explore/[slug]/avis/page.tsx`

**Files:**
- Create: `src/app/[locale]/explore/[slug]/avis/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/[locale]/explore/[slug]/avis/page.tsx
import type { Metadata } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { ReviewsPage } from "@/components/reviews/ReviewsPage";

export const revalidate = 60;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return {
    title: `Avis · ${slug} · crete.direct`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/${locale}/explore/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [{ data: place }, { data: rows }, { data: agg }] = await Promise.all([
    supabase.from("cb_places").select("slug, name").eq("slug", slug).maybeSingle(),
    supabase.from("cb_reviews_with_counts")
      .select("id, rating, comment, author_name, locale, created_at, upvotes, downvotes")
      .eq("place_slug", slug).eq("status", "published")
      .order("upvotes", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("cb_reviews").select("rating").eq("place_slug", slug).eq("status", "published"),
  ]);
  const placeName = place?.name ?? slug;
  const ratings = (agg ?? []).map((r) => r.rating as number);
  const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  for (const r of ratings) if (r>=1 && r<=5) distribution[r as 1|2|3|4|5]++;
  const aggregate = ratings.length === 0
    ? { avg: null, count: 0, distribution }
    : { avg: Math.round((ratings.reduce((a,b)=>a+b,0) / ratings.length) * 100) / 100, count: ratings.length, distribution };
  return <ReviewsPage slug={slug} placeName={placeName} locale={locale} reviews={(rows ?? []) as never} aggregate={aggregate} />;
}
```

- [ ] **Step 2: tsc + dev test**

```powershell
npx tsc --noEmit
```

Expected: baseline (no new errors).

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/[locale]/explore/[slug]/avis/page.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): page /[locale]/explore/[slug]/avis (server, ISR 60, noindex)"
```

---

## Phase H — RatingTile + Bento wiring

### Task 27: Add `community` variant to `Tile.tsx`

**Files:**
- Modify: `src/components/explore/bento/shared/Tile.tsx`

- [ ] **Step 1: Edit Tile**

In `src/components/explore/bento/shared/Tile.tsx`, change the `TileVariant` type and `VARIANT` object:

```typescript
export type TileVariant = "sand" | "terra" | "sun" | "lagoon" | "aegean" | "community";

const VARIANT: Record<TileVariant, string> = {
  sand: "bg-sand text-aegean border-sand-warm",
  terra: "bg-terra text-white border-terra",
  sun: "bg-sun text-night border-sun",
  lagoon: "bg-lagoon text-white border-lagoon",
  aegean: "bg-aegean text-white border-aegean",
  community: "bg-lagoon-deep text-white border-lagoon-deep",
};
```

Nothing else changes (signature untouched).

- [ ] **Step 2: tsc**

```powershell
npx tsc --noEmit
```

Expected: baseline.

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/components/explore/bento/shared/Tile.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): Tile +variant community (lagoon-deep)"
```

---

### Task 28: `RatingTile.tsx`

**Files:**
- Create: `src/components/explore/bento/shared/RatingTile.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/explore/bento/shared/RatingTile.tsx
import { Link } from "@/i18n/navigation";
import { Tile } from "./Tile";

const T = {
  en: { rating: "Rating", reviews: "Reviews" },
  fr: { rating: "Note",   reviews: "Avis" },
  de: { rating: "Bewertung", reviews: "Bewertungen" },
  el: { rating: "Βαθμός", reviews: "Κριτικές" },
} as const;
type L = keyof typeof T;

export function RatingTile({
  slug, scrapedRating, communityAvg, communityCount, locale,
}: {
  slug: string;
  scrapedRating: number | null;
  communityAvg: number | null;
  communityCount: number;
  locale: string;
}) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];

  if (communityCount === 0 && (!scrapedRating || scrapedRating === 0)) return null;

  if (communityCount === 0) {
    return (
      <Tile icon="★" big={scrapedRating!.toFixed(1)} label={t.rating} variant="sand" className="col-span-2 md:col-span-1" />
    );
  }

  return (
    <Link href={`/explore/${slug}/avis`} className="col-span-2 md:col-span-1 block">
      <Tile icon="★" big={(communityAvg ?? 0).toFixed(1)} label={`${t.reviews} (${communityCount})`} variant="community" />
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/components/explore/bento/shared/RatingTile.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): RatingTile (Link+Tile, null-safe, locale aware)"
```

---

### Task 29: Modify `[slug]/page.tsx` to fetch aggregate with tag + pass to Bento

**Files:**
- Modify: `src/app/[locale]/explore/[slug]/page.tsx`

- [ ] **Step 1: Read current page to locate the data-fetch + Bento selection**

```powershell
Get-Content C:\Users\fkerj\cretepulse-reviews\src\app\[locale]\explore\[slug]\page.tsx
```

- [ ] **Step 2: Edit — add aggregate fetch alongside existing place fetch**

At the top of the function body where the place is fetched, **add in parallel** a call to the internal aggregate API with tag-based revalidation. Inside `Promise.all` (or next to the existing fetch), insert:

```typescript
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
const aggPromise = fetch(`${base}/api/reviews/aggregate?slug=${encodeURIComponent(slug)}`, {
  next: { tags: [`place-${slug}`] },
}).then((r) => r.json()).catch(() => ({ avg: null, count: 0, distribution: { 1:0,2:0,3:0,4:0,5:0 } }));
const aggregate = await aggPromise; // or await alongside other awaits
const communityAvg: number | null = aggregate.avg;
const communityCount: number = aggregate.count;
```

Then pass `communityAvg={communityAvg} communityCount={communityCount}` to whichever Bento is selected in the JSX return. Keep the existing rating fallback variable so old code that compares `place.rating` still works.

- [ ] **Step 3: tsc**

```powershell
npx tsc --noEmit
```

Expected: baseline.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add src/app/[locale]/explore/[slug]/page.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): explore [slug] fetches aggregate w/ place-<slug> tag, passes to Bento"
```

---

### Task 30: Wire `<RatingTile>` into the 5 Bento components

**Files:**
- Modify: `src/components/explore/bento/BeachBento.tsx`
- Modify: `src/components/explore/bento/HeritageBento.tsx`
- Modify: `src/components/explore/bento/NatureBento.tsx`
- Modify: `src/components/explore/bento/VillageBento.tsx`
- Modify: `src/components/explore/bento/DefaultBento.tsx`

- [ ] **Step 1: For each of the 5 files, add the prop and replace the rating Tile**

Add to the component props type:

```typescript
communityAvg?: number | null;
communityCount?: number;
```

Replace the existing rating block. Each Bento currently has something like:

```tsx
{place.rating != null && place.rating > 0 && (
  <Tile icon="★" big={place.rating.toFixed(1)} label={bentoLabel("rating", locale)} variant="sun" className="col-span-2 md:col-span-1" />
)}
```

Replace with:

```tsx
<RatingTile
  slug={place.slug}
  scrapedRating={place.rating ?? null}
  communityAvg={communityAvg ?? null}
  communityCount={communityCount ?? 0}
  locale={locale}
/>
```

And add the import:

```typescript
import { RatingTile } from "./shared/RatingTile";
```

- [ ] **Step 2: tsc + spot-check via dev server**

```powershell
npx tsc --noEmit
npm run dev
```

Browse `http://localhost:3000/en/explore/<known-slug>` — confirm the rating tile renders unchanged (no community data yet → fallback variant `sand`).

- [ ] **Step 3: Commit (5 files at once for atomicity)**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews add `
  src/components/explore/bento/BeachBento.tsx `
  src/components/explore/bento/HeritageBento.tsx `
  src/components/explore/bento/NatureBento.tsx `
  src/components/explore/bento/VillageBento.tsx `
  src/components/explore/bento/DefaultBento.tsx
git -C C:\Users\fkerj\cretepulse-reviews commit -m "feat(reviews): wire RatingTile in 5 Bento (Beach/Heritage/Nature/Village/Default)"
```

---

## Phase I — Verification

### Task 31: Build + smoke tests on Vercel preview

**Files:** (no code, runs verification)

- [ ] **Step 1: Full tsc + build**

```powershell
cd C:\Users\fkerj\cretepulse-reviews
npx tsc --noEmit
npm run build
```

Expected: baseline tsc count (no new errors in my files), `next build` green.

- [ ] **Step 2: Vitest full**

```powershell
npx vitest run src/lib/reviews
```

Expected: all 4 test files green (≈26 cases).

- [ ] **Step 3: Push preview**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews push -u origin feat/community-reviews
```

Wait for the Vercel preview URL.

- [ ] **Step 4: Smoke test the 10 scenarios on the preview URL**

For each of the 10 scenarios from the spec ("Tests · Manuel (Playwright preview Vercel)"), execute and screenshot.

- [ ] **Step 5: Report to Kami**

Post a single message with: preview URL, screenshots, list of scenarios passed/failed, list of TODOs before prod merge.

- [ ] **Step 6: Only on green Kami GO: merge to master + main**

```powershell
git -C C:\Users\fkerj\cretepulse-reviews fetch origin
git -C C:\Users\fkerj\cretepulse-reviews push origin feat/community-reviews:master
git -C C:\Users\fkerj\cretepulse-reviews push origin feat/community-reviews:main
```

---

## Spec coverage self-check

- [x] Decision 1 (1-5★ + upvotes for sorting) — Task 8 (aggregate), Task 17 (vote), Task 23 (ReviewCard), Task 25 (ReviewsPage)
- [x] Decision 2 (e-mail + magic link, 1/email/place) — Task 2 (UNIQUE), Task 10 (submit), Task 11 (confirm), Task 9 (email)
- [x] Decision 3 (direct publish + filter + report) — Task 10 (filter), Task 18 (report)
- [x] Decision 4 (V1 fiche-lieu only) — RatingTile (no list/map prop), page `/avis` server
- [x] Decision 5 (≥1 review threshold + mitigations) — RatingTile fallback logic, rate-limit multi-axes, pending_review auto
- [x] Decision 6 (anonymous votes, sort-only) — Task 17 (vote), Task 23 (ReviewCard)
- [x] Decision 7 (admin secret, no UI) — Tasks 19-21 with `?secret=`
- [x] Decision 8 (LLM V2, V1 banlist) — Task 3 (banlist)
- [x] DB schema with all tables + view + RLS — Task 2
- [x] All 12 routes — Tasks 10-22
- [x] RGPD art. 15/17 + recovery — Tasks 12, 13, 14
- [x] DOMPurify + Gmail normalize + MX + disposable — Tasks 4, 5, 10
- [x] rate-limit IP/email/domain/slug — Task 10
- [x] hashed tokens — Tasks 6, 10, 11, 12, 14
- [x] revalidateTag → 22 locales — Tasks 11, 12, 20, 21, 29
- [x] noindex + canonical /avis — Task 26
- [x] cron purge V1 — Task 22
- [x] consent_at + consent_text_hash — Tasks 7, 10
- [x] salt_version columns — Task 2 (in DDL), Tasks 6, 10, 17, 18 (writes)
- [x] cb_review_banned_emails — Tasks 2, 10, 20
- [x] cb_review_admin_log — Tasks 2, 18, 20, 21

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-community-reviews.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
