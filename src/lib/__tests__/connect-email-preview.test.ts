// Generateur d'apercu visuel des mails de mise en relation, cote voiture ET
// activite, dans les 4 langues rendues. Il tourne dans la suite pour que
// l'apercu ne puisse JAMAIS deriver du code reel : le fichier produit est
// toujours le rendu du commit en cours.
// Sortie : <tmp>/crete-connect-preview.html, chemin affiche a l'execution.
// Le test lui-meme verrouille qu'aucun des 8 rendus n'est vide ou tronque.
import { describe, it, expect, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const email = await import("../email");
const OK = { data: { id: "preview" }, error: null };
const LANGUES = ["en", "fr", "de", "el"] as const;

const loueur = { name: "Zakros Tours", email: "info@zakrostours.com", phone: "+30 28970 22137", whatsapp: "+30 6978 186250" };
const presta = { name: "Io Tours", email: "info@iotours.gr", phone: "+30 28420 00000", whatsapp: "+30 6900 000000" };

describe("apercu des mails de mise en relation", () => {
  it("rend les 8 mails client et ecrit l'apercu", async () => {
    const blocs: { titre: string; html: string; replyTo: string }[] = [];

    for (const locale of LANGUES) {
      sendMock.mockReset();
      sendMock.mockResolvedValue(OK);
      await email.sendConnectionEmails({
        partner: loueur,
        customer: { name: "Firmino Facchin", email: "client@example.com", phone: "+39 333 1234567", locale },
        quote: {
          pickupLabel: "Heraklion", dateFrom: "2026-09-08", dateTo: "2026-09-16",
          carTypeLabel: "City car", price: 280, currency: "EUR", partnerName: loueur.name, days: 8,
        },
      });
      const envoi = sendMock.mock.calls[1][0];
      blocs.push({ titre: `Voiture · ${locale}`, html: envoi.html, replyTo: [envoi.replyTo].flat().join(", ") });
    }

    for (const locale of LANGUES) {
      sendMock.mockReset();
      sendMock.mockResolvedValue(OK);
      await email.sendActivityConnectionEmails({
        partner: presta,
        customer: { name: "Anna Rossi", email: "client@example.com", phone: "+39 333 1234567", locale },
        quote: {
          categoryLabel: "Boat trip", cityLabel: "Ierapetra", date: "2026-08-12",
          adults: 2, children: 0, price: 180, currency: "EUR", partnerName: presta.name,
        },
      });
      const envoi = sendMock.mock.calls[1][0];
      blocs.push({ titre: `Activité · ${locale}`, html: envoi.html, replyTo: [envoi.replyTo].flat().join(", ") });
    }

    expect(blocs).toHaveLength(8);
    for (const b of blocs) {
      expect(b.html.length, b.titre).toBeGreaterThan(500);
      expect(b.replyTo, b.titre).toContain("@");
    }

    const page = `<!doctype html><meta charset="utf-8"><title>Aperçu mails de mise en relation</title>
<style>body{margin:0;background:#eef3f5;font-family:system-ui,sans-serif;padding:24px 0}
h2{margin:0;padding:14px 18px;background:#07374A;color:#fff;font-size:15px}
.meta{padding:8px 18px;background:#0B3954;color:#9fd7e0;font-size:12px;font-family:monospace}
.bloc{max-width:720px;margin:0 auto 34px;box-shadow:0 2px 14px rgba(0,0,0,.12);background:#fff}</style>
${blocs.map((b) => `<div class="bloc"><h2>${b.titre}</h2><div class="meta">replyTo: ${b.replyTo}</div>${b.html}</div>`).join("\n")}`;

    const out = join(tmpdir(), "crete-connect-preview.html");
    writeFileSync(out, page, "utf-8");
    console.log(`[apercu] 8 rendus ecrits dans ${out}`);
  });
});
