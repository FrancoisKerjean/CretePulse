import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FAFAF8", color: "#1A1A2E" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <p style={{ fontSize: "96px", fontWeight: "bold", color: "rgba(27, 73, 101, 0.2)", marginBottom: "16px" }}>404</p>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>Page not found</h1>
            <p style={{ color: "#6B7280", marginBottom: "32px" }}>The page you are looking for does not exist.</p>
            <a href="/en" style={{ display: "inline-block", background: "#1B4965", color: "white", padding: "12px 24px", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}>
              Go to Crete Direct
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
