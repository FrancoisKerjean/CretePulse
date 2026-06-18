import { Fragment } from "react";

/**
 * Émet un (ou plusieurs) bloc(s) JSON-LD `<script type="application/ld+json">`.
 *
 * Centralise le seul `dangerouslySetInnerHTML` légitime du site et durcit la
 * sérialisation : `<` est échappé en `<` pour qu'une donnée scrapée
 * contenant `</script>` (descriptions cretanbeaches, news, events…) ne puisse
 * pas fermer la balise et injecter du HTML. Les parsers JSON-LD (Google inclus)
 * décodent `<` en `<` : aucun impact sur les rich results.
 *
 * Usage :
 *   <JsonLd data={schema} />
 *   <JsonLd data={[articleSchema, breadcrumb]} />   // plusieurs blocs
 */
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(block) }}
        />
      ))}
    </>
  );
}

export default JsonLd;
