import assert from "node:assert";
import { validateProjetLead } from "../src/lib/projet-lead.ts";

// honeypot
assert.equal(validateProjetLead({ kind: "institution", hp: "x", name: "A", email: "a@b.co", org: "R" }).kind, "honeypot");
// kind invalide
assert.equal(validateProjetLead({ kind: "spam", name: "A", email: "a@b.co" }).kind, "error");
// email invalide
assert.equal(validateProjetLead({ kind: "sponsor", name: "A", email: "nope", company: "C" }).kind, "error");
// institution sans organisme
assert.equal(validateProjetLead({ kind: "institution", name: "A", email: "a@b.co" }).kind, "error");
// sponsor sans entreprise
assert.equal(validateProjetLead({ kind: "sponsor", name: "A", email: "a@b.co" }).kind, "error");
// ok institution
const okI = validateProjetLead({ kind: "institution", name: "  Maria ", email: "M@Org.GR", org: "Region", role: "Dir", message: "hello", locale: "fr" });
assert.equal(okI.kind, "ok");
assert.equal(okI.lead.email, "m@org.gr");
assert.equal(okI.lead.name, "Maria");
assert.equal(okI.lead.org, "Region");
// ok sponsor
const okS = validateProjetLead({ kind: "sponsor", name: "Jo", email: "jo@co.com", company: "Co", website: "https://co.com" });
assert.equal(okS.kind, "ok");
assert.equal(okS.lead.company, "Co");
console.log("check-projet-lead OK");
