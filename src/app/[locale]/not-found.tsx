import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center bg-surface px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-aegean/20 mb-4" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>404</p>
        <h1 className="text-2xl font-bold text-text mb-3">Page not found</h1>
        <p className="text-text-muted mb-8">The page you are looking for does not exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-aegean text-white rounded-xl font-bold text-sm hover:bg-aegean-light transition-colors">
            Home
          </Link>
          <Link href="/beaches" className="px-6 py-3 bg-white text-aegean border border-aegean/20 rounded-xl font-bold text-sm hover:bg-aegean-faint transition-colors">
            Beaches
          </Link>
          <Link href="/events" className="px-6 py-3 bg-white text-terra border border-terra/20 rounded-xl font-bold text-sm hover:bg-terra-faint transition-colors">
            Events
          </Link>
        </div>
      </div>
    </main>
  );
}
