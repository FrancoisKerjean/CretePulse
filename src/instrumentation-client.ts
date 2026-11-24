// Chargé par Next avant l'hydratation, sur toutes les pages.
// BotID : le défi navigateur accompagne les POST vers ces routes, que
// `checkBotId()` vérifie côté serveur. Ajouté le 24/11/2026 contre le
// « subscription bombing » de la newsletter (voir src/lib/newsletter-signup.ts).
import { initBotId } from "botid/client/core";

initBotId({
  protect: [{ path: "/api/newsletter/subscribe", method: "POST" }],
});
