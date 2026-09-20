import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La liste était recopiée ici : elle vaut `routing.locales`, et une copie dérive. Elle est
// passée de 22 à 4 le 20/09/2026, donc `all=1` revalide 4 accueils au lieu de 22.
const LOCALES = routing.locales;

// Trigger via:
//   curl -X POST 'https://crete.direct/api/revalidate?secret=...&path=/fr'
//   curl -X POST 'https://crete.direct/api/revalidate?secret=...&all=1'
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const all = req.nextUrl.searchParams.get("all") === "1";
  const path = req.nextUrl.searchParams.get("path");

  const revalidated: string[] = [];
  if (all) {
    for (const loc of LOCALES) {
      const p = `/${loc}`;
      revalidatePath(p);
      revalidated.push(p);
    }
    revalidatePath("/sitemap.xml");
    revalidatePath("/sitemap-news.xml");
    revalidatePath("/feed.xml");
    revalidatePath("/feed.json");
    revalidatePath("/llms.txt");
    revalidated.push("/sitemap.xml", "/sitemap-news.xml", "/feed.xml", "/feed.json", "/llms.txt");
  } else if (path) {
    revalidatePath(path);
    revalidated.push(path);
  } else {
    return NextResponse.json({ error: "missing path or all=1" }, { status: 400 });
  }

  return NextResponse.json({ revalidated, count: revalidated.length });
}
