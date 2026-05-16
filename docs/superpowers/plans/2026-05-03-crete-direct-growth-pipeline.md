# Crete Direct Growth Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Câbler un pipeline full-auto qui transforme la production article SEO existante (cron VPS `writer-v2.py`) en vidéos verticales 45s publiées 3x/sem sur TikTok + YouTube Shorts + Pinterest, sans intervention quotidienne de Kami.

**Architecture:**
- **Existant déjà câblé** (ne pas retoucher) : scrapers + writer Haiku + traduction 22 langues + 24K pages SEO + Reddit/Bluesky auto-post (inactif credentials)
- **À ajouter** : (1) projet Remotion local `crete-direct-video/` qui pull 1 article/jour de Supabase et render MP4 vertical avec voix TTS EN ; (2) workflow n8n distribution multi-plateforme ; (3) bot Telegram digest KPI hebdo
- **Stratégie de livraison** : Phase 1 pilote end-to-end manuel sur 1 article pour valider format/qualité avant industrialisation (Phase 2+)

**Tech Stack:**
- Remotion 4.x (vidéo programmatique React)
- Coqui XTTS v2 (TTS local gratuit, voix EN) ou ElevenLabs API si Coqui qualité insuffisante
- Supabase JS (fetch article du jour depuis `cretepulse` DB self-hosted VPS)
- ffmpeg (concat audio + vidéo, normalize loudness)
- n8n (orchestration upload TikTok/YT/Pinterest, déjà déployé VPS)
- Bot Telegram via `kairos_telegram` module existant (KPI hebdo)

**Hors scope Phase 1** : industrialisation cron, distribution multi-plateforme automatisée, dashboard KPI. Voir Roadmap Phase 2-5 en bas.

---

## File Structure (Phase 1)

**Nouveau dossier projet vidéo (créé from scratch, séparé de `cretepulse-build`)** :
- `C:/Users/fkerj/crete-direct-video/`
  - `package.json` — scripts dev/render, deps Remotion + Supabase + dotenv
  - `remotion.config.ts` — fps=30, output mp4, CRF=18 (qualité TikTok)
  - `src/Root.tsx` — registre Remotion Compositions
  - `src/compositions/CreteShort.tsx` — composition principale 45s, 1080×1920
  - `src/scenes/Hook.tsx` — 0-3s intro accrocheuse
  - `src/scenes/Body.tsx` — 3-40s corps (3 stats + B-roll)
  - `src/scenes/Outro.tsx` — 40-45s CTA "more on crete.direct"
  - `src/lib/supabase.ts` — client read-only Supabase
  - `src/lib/article-loader.ts` — fetch 1 article slug → structured payload
  - `src/lib/tts.ts` — wrapper Coqui XTTS Python subprocess
  - `scripts/generate-voiceover.py` — produit `voice.wav` depuis script texte
  - `scripts/render-pilot.mjs` — orchestre TTS + render Remotion + concat ffmpeg
  - `public/brand/` — logo crete.direct watermark + 5-10 photos B-roll Crète libre de droits
  - `.env.local` — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - `out/pilot-001.mp4` — output Phase 1

**Documentation** :
- `cretepulse-build/docs/superpowers/plans/2026-05-03-crete-direct-growth-pipeline.md` — ce plan
- `crete-direct-video/README.md` — quickstart pour reprendre le projet

---

## Phase 1 — Pilote end-to-end (3-4h, livrable testable)

### Task 1 : Bootstrap projet Remotion

**Files:**
- Create: `C:/Users/fkerj/crete-direct-video/` (dossier)
- Create: `C:/Users/fkerj/crete-direct-video/package.json`

- [ ] **Step 1 : Créer le dossier et scaffolder Remotion**

```bash
cd C:/Users/fkerj && npx create-video@latest crete-direct-video --blank --no-install
```

Expected: dossier `crete-direct-video/` créé avec template blank (src/Root.tsx, src/Composition.tsx, remotion.config.ts).

- [ ] **Step 2 : Installer dépendances**

```bash
cd C:/Users/fkerj/crete-direct-video && npm install && npm install @supabase/supabase-js dotenv
```

Expected: `node_modules/` créé, pas d'erreur.

- [ ] **Step 3 : Vérifier que le studio Remotion démarre**

```bash
cd C:/Users/fkerj/crete-direct-video && npm run dev
```

Expected: serveur Remotion Studio démarre sur http://localhost:3000, browser ouvre automatiquement, composition par défaut affichée. Kill avec Ctrl+C après vérif.

- [ ] **Step 4 : Commit initial**

```bash
cd C:/Users/fkerj/crete-direct-video && git init && git add -A && git commit -m "chore: bootstrap remotion project for crete direct video pipeline"
```

Expected: commit créé. **Pas de push** (repo local seulement Phase 1).

---

### Task 2 : Fetch article depuis Supabase

**Files:**
- Create: `crete-direct-video/.env.local`
- Create: `crete-direct-video/src/lib/supabase.ts`
- Create: `crete-direct-video/src/lib/article-loader.ts`

- [ ] **Step 1 : Créer `.env.local` avec credentials Supabase**

```bash
cat > C:/Users/fkerj/crete-direct-video/.env.local <<'EOF'
SUPABASE_URL=https://kairos-n8n.duckdns.org/cretepulse-db
SUPABASE_SERVICE_KEY=<copier_depuis_/opt/cretepulse-db/.env_via_ssh>
EOF
```

Expected: fichier créé. Si le service key local n'est pas dispo, Kami doit `ssh root@kairos-vps "cat /opt/cretepulse-db/.env | grep SERVICE_KEY"` et copier la valeur.

- [ ] **Step 2 : Ajouter `.env.local` à `.gitignore`**

```bash
echo ".env.local" >> C:/Users/fkerj/crete-direct-video/.gitignore
```

Expected: `.env.local` listé dans `.gitignore`.

- [ ] **Step 3 : Créer le client Supabase**

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");

export const supabase = createClient(url, key, { auth: { persistSession: false } });
```

- [ ] **Step 4 : Créer le loader d'article**

```typescript
// src/lib/article-loader.ts
import { supabase } from "./supabase";

export type ArticleVideoPayload = {
  slug: string;
  title: string;
  hookLine: string;
  bullets: string[];
  ctaLine: string;
  heroImageUrl: string | null;
};

export async function loadArticleForVideo(slug: string): Promise<ArticleVideoPayload> {
  const { data, error } = await supabase
    .from("news")
    .select("slug,title_en,summary_en,body_en,hero_image_url")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error(`Article not found: ${slug} (${error?.message})`);

  const bodyEn = (data.body_en || "").toString();
  const sentences = bodyEn.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30 && s.length < 180);
  const bullets = sentences.slice(0, 3);

  return {
    slug: data.slug,
    title: data.title_en || "",
    hookLine: sentences[0] || data.summary_en || "",
    bullets,
    ctaLine: "Full story on crete.direct",
    heroImageUrl: data.hero_image_url || null,
  };
}
```

- [ ] **Step 5 : Smoke test du loader**

Créer `crete-direct-video/scripts/smoke-loader.mjs` :

```javascript
import "dotenv/config";
import { loadArticleForVideo } from "../src/lib/article-loader.ts";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/smoke-loader.mjs <slug>"); process.exit(1); }

const payload = await loadArticleForVideo(slug);
console.log(JSON.stringify(payload, null, 2));
```

Run:
```bash
cd C:/Users/fkerj/crete-direct-video && node --import tsx scripts/smoke-loader.mjs <slug-d-un-article-existant>
```

Expected: JSON imprimé avec title, hookLine, 3 bullets, ctaLine. Si aucun slug connu, prendre un récent via `ssh root@kairos-vps "psql ... -c \"select slug from news where rewritten=true order by published_at desc limit 5;\""`.

- [ ] **Step 6 : Commit**

```bash
git add -A && git commit -m "feat: add supabase article loader for video composition"
```

---

### Task 3 : Voix off TTS Coqui XTTS

**Files:**
- Create: `crete-direct-video/scripts/generate-voiceover.py`
- Modify: `crete-direct-video/package.json` (add `tts:gen` script)

- [ ] **Step 1 : Vérifier Coqui installé ou installer**

```bash
where coqui-tts 2>nul || pip install TTS==0.22.0
```

Expected: si déjà installé, chemin vers binaire. Sinon install (~3 min download). Si pip échoue, fallback ElevenLabs (cf Step 4 alternative).

- [ ] **Step 2 : Créer le script TTS Coqui**

```python
# scripts/generate-voiceover.py
"""Generate EN voiceover from text using Coqui XTTS v2.
Usage: python scripts/generate-voiceover.py "Text to speak" out/voice.wav
"""
import sys
from TTS.api import TTS

if len(sys.argv) < 3:
    print("usage: generate-voiceover.py <text> <output.wav>"); sys.exit(1)

text = sys.argv[1]
output = sys.argv[2]

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
tts.tts_to_file(
    text=text,
    file_path=output,
    speaker="Damien Black",
    language="en",
)
print(f"OK {output}")
```

- [ ] **Step 3 : Tester avec une phrase**

```bash
cd C:/Users/fkerj/crete-direct-video && mkdir -p out && python scripts/generate-voiceover.py "Crete is the largest island in Greece. In 2025 it received over 5 million tourists." out/voice-test.wav
```

Expected: fichier `out/voice-test.wav` créé, ~5-7 sec, voix EN claire. Lecteur Windows pour vérifier.

- [ ] **Step 4 (fallback) : Si Coqui qualité insuffisante, basculer ElevenLabs**

Créer `scripts/generate-voiceover-elevenlabs.mjs` :

```javascript
import "dotenv/config";
import fs from "node:fs";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("Missing ELEVENLABS_API_KEY"); process.exit(1); }

const [text, output] = process.argv.slice(2);
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella, EN neutral

const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
  method: "POST",
  headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5", output_format: "mp3_44100_128" }),
});
if (!r.ok) { console.error(`HTTP ${r.status}: ${await r.text()}`); process.exit(1); }

fs.writeFileSync(output, Buffer.from(await r.arrayBuffer()));
console.log(`OK ${output}`);
```

Si bascule ElevenLabs : ajouter `ELEVENLABS_API_KEY` dans `.env.local` (compte free tier 10K chars/mois suffit pour pilote).

- [ ] **Step 5 : Commit**

```bash
git add -A && git commit -m "feat: add tts voiceover generation script"
```

---

### Task 4 : Composition Remotion 45s

**Files:**
- Create: `crete-direct-video/src/Root.tsx` (replace template)
- Create: `crete-direct-video/src/compositions/CreteShort.tsx`
- Create: `crete-direct-video/src/scenes/Hook.tsx`
- Create: `crete-direct-video/src/scenes/Body.tsx`
- Create: `crete-direct-video/src/scenes/Outro.tsx`
- Create: `crete-direct-video/public/brand/watermark.png` (logo crete.direct white version, à fournir par Kami ou générer)

- [ ] **Step 1 : Réécrire `src/Root.tsx`**

```typescript
// src/Root.tsx
import { Composition, staticFile } from "remotion";
import { CreteShort, creteShortSchema } from "./compositions/CreteShort";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CreteShort"
        component={CreteShort}
        durationInFrames={45 * 30}
        fps={30}
        width={1080}
        height={1920}
        schema={creteShortSchema}
        defaultProps={{
          title: "5 Hidden Beaches in East Crete",
          hookLine: "These beaches see fewer than 50 visitors a day, even in August.",
          bullets: [
            "Xerokampos in Sitia: 3 km of white sand, no road sign.",
            "Kato Zakros: ancient Minoan palace 200m from the shore.",
            "Karoumes: only reachable by 40min hike through a gorge.",
          ],
          ctaLine: "Full guide on crete.direct",
          voiceoverSrc: staticFile("voice.wav"),
          heroImage: staticFile("brand/hero-default.jpg"),
        }}
      />
    </>
  );
};
```

- [ ] **Step 2 : Créer la composition principale avec schema Zod**

```typescript
// src/compositions/CreteShort.tsx
import { z } from "zod";
import { AbsoluteFill, Audio, Sequence, useVideoConfig, Img, staticFile } from "remotion";
import { Hook } from "../scenes/Hook";
import { Body } from "../scenes/Body";
import { Outro } from "../scenes/Outro";

export const creteShortSchema = z.object({
  title: z.string(),
  hookLine: z.string(),
  bullets: z.array(z.string()).length(3),
  ctaLine: z.string(),
  voiceoverSrc: z.string(),
  heroImage: z.string(),
});

export const CreteShort: React.FC<z.infer<typeof creteShortSchema>> = ({
  title, hookLine, bullets, ctaLine, voiceoverSrc, heroImage,
}) => {
  const { fps } = useVideoConfig();
  const HOOK_DUR = 3 * fps;
  const BODY_DUR = 37 * fps;
  const OUTRO_DUR = 5 * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1225" }}>
      <Audio src={voiceoverSrc} />
      <Sequence durationInFrames={HOOK_DUR}>
        <Hook hookLine={hookLine} title={title} heroImage={heroImage} />
      </Sequence>
      <Sequence from={HOOK_DUR} durationInFrames={BODY_DUR}>
        <Body bullets={bullets} heroImage={heroImage} />
      </Sequence>
      <Sequence from={HOOK_DUR + BODY_DUR} durationInFrames={OUTRO_DUR}>
        <Outro ctaLine={ctaLine} />
      </Sequence>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Img
          src={staticFile("brand/watermark.png")}
          style={{ position: "absolute", bottom: 60, right: 40, width: 200, opacity: 0.85 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3 : Créer `Hook.tsx`**

```typescript
// src/scenes/Hook.tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Hook: React.FC<{ hookLine: string; title: string; heroImage: string }> = ({
  hookLine, title, heroImage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, fps * 3], [1.05, 1.15]);

  return (
    <AbsoluteFill>
      <Img
        src={heroImage}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})`, filter: "brightness(0.55)" }}
      />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 80, paddingBottom: 200 }}>
        <div style={{ opacity, color: "#F5EDD8", fontFamily: "Georgia, serif", fontSize: 88, fontWeight: 700, lineHeight: 1.1, textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
          {title}
        </div>
        <div style={{ opacity, color: "#C8A35F", fontFamily: "system-ui, sans-serif", fontSize: 42, marginTop: 40, lineHeight: 1.3 }}>
          {hookLine}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4 : Créer `Body.tsx`**

```typescript
// src/scenes/Body.tsx
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const Bullet: React.FC<{ index: number; text: string; heroImage: string }> = ({ index, text, heroImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(frame, [0, fps * 0.4], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Img src={heroImage} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45)" }} />
      <AbsoluteFill style={{ justifyContent: "center", padding: 80 }}>
        <div style={{ opacity, transform: `translateY(${translateY}px)`, color: "#C8A35F", fontFamily: "system-ui, sans-serif", fontSize: 36, fontWeight: 600 }}>
          {String(index + 1).padStart(2, "0")} / 03
        </div>
        <div style={{ opacity, transform: `translateY(${translateY}px)`, color: "#F5EDD8", fontFamily: "Georgia, serif", fontSize: 72, fontWeight: 700, marginTop: 40, lineHeight: 1.25 }}>
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Body: React.FC<{ bullets: string[]; heroImage: string }> = ({ bullets, heroImage }) => {
  const { fps } = useVideoConfig();
  const dur = Math.floor((37 * fps) / 3);
  return (
    <AbsoluteFill>
      {bullets.map((b, i) => (
        <Sequence key={i} from={i * dur} durationInFrames={dur}>
          <Bullet index={i} text={b} heroImage={heroImage} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5 : Créer `Outro.tsx`**

```typescript
// src/scenes/Outro.tsx
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Outro: React.FC<{ ctaLine: string }> = ({ ctaLine }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1225", justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ opacity, color: "#C8A35F", fontFamily: "system-ui, sans-serif", fontSize: 32, letterSpacing: 4, textTransform: "uppercase" }}>
        Crete Direct
      </div>
      <div style={{ opacity, color: "#F5EDD8", fontFamily: "Georgia, serif", fontSize: 96, fontWeight: 700, marginTop: 60, textAlign: "center", lineHeight: 1.1 }}>
        {ctaLine}
      </div>
      <div style={{ opacity, color: "#F5EDD8", fontFamily: "system-ui, sans-serif", fontSize: 48, fontWeight: 600, marginTop: 80, padding: "20px 60px", border: "3px solid #C8A35F", borderRadius: 999 }}>
        crete.direct
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 6 : Ajouter assets brand**

Kami fournit ou génère :
- `public/brand/watermark.png` : logo Crete Direct blanc 400×120 transparent
- `public/brand/hero-default.jpg` : photo Crète libre de droits 1080×1920 (Unsplash + crédit, ou photo perso). Source rapide : `https://unsplash.com/s/photos/crete-coast` télécharger 1 image vertical.
- `public/voice.wav` : généré au Task 3, copié là pour preview studio

```bash
cd C:/Users/fkerj/crete-direct-video && mkdir -p public/brand && cp out/voice-test.wav public/voice.wav
```

Expected: `public/voice.wav` présent. Watermark + hero à fournir manuellement avant Step 7.

- [ ] **Step 7 : Lancer le studio Remotion et vérifier visuellement**

```bash
cd C:/Users/fkerj/crete-direct-video && npm run dev
```

Expected: studio ouvert, composition `CreteShort` visible, scrub timeline 45s, audio joue, watermark présent. Si bug typescript : `npx tsc --noEmit`.

**Si le visuel pue** : itérer sur Hook.tsx/Body.tsx/Outro.tsx jusqu'à validation Kami avant Step 8. Critères validation : lisibilité texte mobile, pas de générique IA-slop, watermark discret pas intrusif.

- [ ] **Step 8 : Commit**

```bash
git add -A && git commit -m "feat: add 45s vertical short composition with hook/body/outro scenes"
```

---

### Task 5 : Render MP4 final + concat audio

**Files:**
- Create: `crete-direct-video/scripts/render-pilot.mjs`

- [ ] **Step 1 : Créer le script orchestrateur**

```javascript
// scripts/render-pilot.mjs
import "dotenv/config";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { loadArticleForVideo } from "../src/lib/article-loader.ts";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/render-pilot.mjs <slug>"); process.exit(1); }

console.log(`[1/4] Loading article ${slug}`);
const payload = await loadArticleForVideo(slug);

const fullScript = [payload.hookLine, ...payload.bullets, payload.ctaLine].join(". ");
console.log(`[2/4] Generating voiceover (${fullScript.length} chars)`);
mkdirSync("out", { recursive: true });
mkdirSync("public", { recursive: true });
execSync(`python scripts/generate-voiceover.py "${fullScript.replace(/"/g, '\\"')}" public/voice.wav`, { stdio: "inherit" });

console.log(`[3/4] Writing props file`);
const propsPath = "out/props.json";
writeFileSync(propsPath, JSON.stringify({
  title: payload.title,
  hookLine: payload.hookLine,
  bullets: payload.bullets,
  ctaLine: payload.ctaLine,
  voiceoverSrc: "voice.wav",
  heroImage: payload.heroImageUrl ? payload.heroImageUrl : "brand/hero-default.jpg",
}));

console.log(`[4/4] Rendering MP4`);
const outFile = `out/${slug}.mp4`;
execSync(`npx remotion render src/Root.tsx CreteShort ${outFile} --props=${propsPath}`, { stdio: "inherit" });

console.log(`\n✓ Output: ${outFile}`);
```

- [ ] **Step 2 : Render le pilote**

```bash
cd C:/Users/fkerj/crete-direct-video && node --import tsx scripts/render-pilot.mjs <slug-test>
```

Expected: ~5-10 min (TTS Coqui + Remotion render). Output `out/<slug>.mp4` créé. Lecture Windows Media Player ou VLC pour vérifier.

**Critères acceptation Phase 1** :
- Durée 45s ±2s
- Audio synchro texte (voix off finit avant outro)
- Texte lisible smartphone (zoom Windows pour simuler)
- Watermark crete.direct visible mais discret
- Pas d'artefact IA-slop (texte coupé, accent EN bizarre)
- Format 1080×1920 portrait

- [ ] **Step 3 : Commit**

```bash
git add -A && git commit -m "feat: add render-pilot orchestrator script"
```

---

### Task 6 : Upload manuel TikTok pour validation format

**Files:** aucun (action manuelle Kami)

- [ ] **Step 1 : Créer compte TikTok @cretedirect**

Action Kami : aller sur tiktok.com, créer compte avec email dédié. Bio : "Crete travel intelligence • crete.direct". Lien bio : `https://crete.direct?utm_source=tiktok&utm_medium=bio`.

- [ ] **Step 2 : Upload manuel le pilote**

Action Kami : drag-drop `out/<slug>.mp4` dans uploader TikTok. Caption : `5 hidden beaches in East Crete most tourists never find. Full guide ↓ link in bio. #crete #greece #travel #hiddengems`. Cover image : auto.

- [ ] **Step 3 : Mesurer 48h**

Action Kami : noter à H+24 et H+48 : views, likes, follows, clics bio (TikTok analytics > Profile views + Source via UTM crete.direct GA4).

**Décision Phase 2 conditionnelle :**
- Si pilote >500 vues à H+48 → industrialiser (Phase 2)
- Si <100 vues → revoir format (hook plus accrocheur, B-roll vidéo au lieu d'image fixe)
- Si 100-500 → industrialiser quand même mais avec A/B test sur hook (Phase 2 inclut variante)

- [ ] **Step 4 : Logger résultat dans `session_log.md`**

Format :
```
- DD/MM HH:MM | DEPLOY | Crete Direct pilote vidéo TikTok publié [FACT 2026-05-?? source: tiktok analytics] - <stats> - décision Phase 2 = <go/iterate/kill>
```

---

## Roadmap Phase 2-5 (à détailler après validation Phase 1)

**Phase 2 — Industrialisation vidéo (3h estimées, à planifier après data Phase 1)**
- Déployer projet `crete-direct-video` sur VPS Hetzner (`/opt/crete-direct-video`)
- Cron systemd timer `crete-direct-video.timer` lun/mer/ven 16h Athens (rendu) + 18h (publish via n8n)
- Sélection slug auto : article du jour avec meilleur SEO score (champ `seo_priority` à ajouter table `news` ou heuristique title length + keywords)
- Buffer 4 semaines : pré-render 12 vidéos d'avance pour absorber semaines off Kami
- Variation hook : 3 templates rotatifs (`question`, `stat-shock`, `mystery`) pour éviter shadow ban patterns

**Phase 3 — Distribution multi-plateforme (4h estimées)**
- TikTok upload via Content Posting API (https://developers.tiktok.com/doc/content-posting-api-get-started)
  - Nécessite app TikTok Developer + audit OAuth
  - Si refusé : fallback Playwright auto-upload via cookie session (skill `web-scraping`)
- YouTube Shorts via YouTube Data API v3 (existant, OAuth simple)
- Pinterest via Pins API v5 (image vertical 1000×1500 extraite frame 0 du MP4 + lien article)
- Workflow n8n : trigger fichier MP4 prêt → fanout 3 plateformes → tag UTM différent par source
- Captions auto-générées (hook + 3 bullets + CTA + hashtags), prompt Haiku dédié

**Phase 4 — Dashboard KPI Telegram hebdo (2h estimées)**
- Cron dimanche 9h Athens via `kairos_telegram` module
- Pull APIs : TikTok analytics, YouTube reporting, Pinterest analytics, GA4 sessions crete.direct
- Format digest : top 3 vidéos semaine, top 5 articles SEO, total clics bio, comparaison sem-1, alerts si shadow ban suspecté (engagement < 0.5%)
- Bouton inline "Kill X" pour retirer vidéo trash en 1 clic

**Phase 5 — Optimisation continue (récurrent)**
- A/B test hook (random parmi 3 templates, mesure CTR vidéo > 50% à 3s)
- Veille format trending TikTok (skill `social-media-management` ?)
- Renouvellement banque B-roll (50 photos Crète libres de droits via Unsplash API auto)

**Critères kill (12 sem)** : si à fin août 2026 sessions organiques crete.direct via TikTok+YT+Pinterest <1000/mois cumulé → archive.

---

## Self-Review

**Spec coverage** :
- ✅ Article SEO quotidien : déjà existant (`writer-v2.py` cron horaire), pas dans plan
- ✅ Vidéo Remotion 45s : Tasks 1-5
- ✅ Voix TTS EN : Task 3 (Coqui + fallback ElevenLabs)
- ✅ Test format avant industrialisation : Task 6
- ✅ Distribution TikTok+YT+Pinterest : Phase 3 (roadmap, pas Phase 1)
- ✅ KPI Telegram : Phase 4 (roadmap)
- ✅ Engagement 12 sem + kill switch : Phase 5
- ✅ Pas d'Insta : exclu explicitement
- ✅ Pas voix Kami : Task 3 voix EN neutre

**Placeholders scan** : aucun TODO, code complet dans chaque step. Phases 2-5 marquées explicitement "roadmap, à détailler après Phase 1" → pas un placeholder, un découpage assumé.

**Type consistency** :
- `ArticleVideoPayload` défini Task 2.4, utilisé Task 4.1 (defaultProps cohérents)
- `creteShortSchema` Zod défini Task 4.2, props passées par `--props=props.json` Task 5.1 (champs alignés)
- `voiceoverSrc` toujours = `"voice.wav"` (staticFile dans Root, path relatif dans render)

**Note** : la voix off Coqui XTTS Phase 1 est un pari qualitatif. Si à Step 3.3 le résultat est inacceptable, basculer ElevenLabs (Step 3.4) — pas un blocker plan.

---

## Execution Handoff

Plan complet sauvegardé dans `cretepulse-build/docs/superpowers/plans/2026-05-03-crete-direct-growth-pipeline.md`.

**Deux options d'exécution Phase 1 :**

1. **Inline (recommandé Phase 1 pilote)** — j'enchaîne Tasks 1-5 dans cette session, checkpoint à Task 4 Step 7 (review visuelle Kami obligatoire) et Task 5 Step 2 (review MP4 final). Task 6 = manuelle Kami. Skill : `superpowers:executing-plans`.

2. **Subagent-driven** — un subagent par task, review entre chaque. Plus lent mais cleaner pour Phase 2+ industrialisation (multi-fichiers).

Pour Phase 1 = inline. Phase 2+ = subagent-driven quand on y arrivera.
