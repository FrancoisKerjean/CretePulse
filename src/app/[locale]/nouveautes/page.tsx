// Alias FR de /updates. `revalidate` doit être une constante statique locale
// (Next.js ne sait pas parser un re-export de config de segment).
export const revalidate = 86400;

export { generateMetadata, generateStaticParams } from "../updates/page";
export { default } from "../updates/page";
