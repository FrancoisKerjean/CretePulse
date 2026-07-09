// Exit interstitial for /go/<slug> affiliate redirects.
//
// The affiliate program is self-serve: anyone can register an arbitrary
// redirect_url. A bare 302 from crete.direct would let that reputation be
// borrowed for phishing. This page shows the destination domain before leaving.
//
// SECURITY: redirect_url is attacker-controlled. Every interpolation into HTML
// MUST be escaped. We never place the raw URL into inline JS; the auto-redirect
// uses <meta http-equiv="refresh"> with an escaped attribute value only.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Safe hostname for display; empty string if the URL cannot be parsed. */
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function leavingPage(redirectUrl: string): string {
  const hrefAttr = escapeHtml(redirectUrl);
  const host = safeHostname(redirectUrl);
  const hostText = escapeHtml(host || redirectUrl);
  // Auto-redirect after 2s via meta refresh (no JS, attacker URL never touches script).
  const metaRefresh = `<meta http-equiv="refresh" content="2;url=${hrefAttr}">`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${metaRefresh}
<title>Leaving crete.direct</title>
<style>
  :root { --lagoon:#0e8ba8; --lagoon-dark:#0a6b82; --gold:#d4a537; --ink:#123; }
  * { box-sizing:border-box; }
  body {
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:"Baloo 2",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:linear-gradient(160deg,#e8f6fa 0%,#f5fbfc 60%,#fffdf6 100%);
    color:var(--ink); padding:24px;
  }
  .card {
    background:#fff; border-radius:20px; padding:36px 32px; max-width:420px; width:100%;
    box-shadow:0 12px 40px rgba(14,139,168,.16); text-align:center;
  }
  .dot { width:12px; height:12px; border-radius:50%; background:var(--gold); display:inline-block; margin-bottom:16px; }
  h1 { font-size:20px; margin:0 0 8px; color:var(--lagoon-dark); font-weight:700; }
  p { font-size:15px; line-height:1.5; margin:0 0 8px; color:#456; }
  .host {
    display:inline-block; margin:6px 0 22px; padding:8px 16px; border-radius:12px;
    background:#eef8fb; color:var(--lagoon-dark); font-weight:700; font-size:16px;
    word-break:break-all;
  }
  a.btn {
    display:inline-block; text-decoration:none; background:var(--lagoon); color:#fff;
    font-weight:700; font-size:16px; padding:13px 30px; border-radius:12px;
    transition:background .15s;
  }
  a.btn:hover { background:var(--lagoon-dark); }
  .small { font-size:12px; color:#89a; margin-top:20px; }
</style>
</head>
<body>
  <main class="card">
    <span class="dot"></span>
    <h1>You are leaving crete.direct</h1>
    <p>We are sending you to our partner:</p>
    <div class="host">${hostText}</div>
    <div><a class="btn" href="${hrefAttr}" rel="noopener noreferrer nofollow">Continue</a></div>
    <p class="small">Redirecting automatically&hellip; crete.direct is not responsible for external sites.</p>
  </main>
</body>
</html>`;
}
