// Ozly — Cloudflare Worker for dynamic OG tags on /v/:code
//
// Why: ozly.au is hosted on GitHub Pages, which serves static HTML —
// every URL gets the same `<meta og:*>` tags. When an affiliate shares
// `https://ozly.au/v/JOAO123` in WhatsApp, the preview shows generic
// "Ozly — Free Invoicing..." instead of "João te indicou pro Ozly".
// That kills CTR.
//
// What: this Worker sits in front of GH Pages. It intercepts /v/* and
// /me/*, sniffs the User-Agent, and:
//   - For social media crawlers (FB, WhatsApp, Twitter, etc.) → returns
//     a tiny HTML with personalized OG tags built from the affiliate
//     name fetched via the Supabase RPC `validate_referral_code`.
//   - For real browsers → transparently passes to the origin (GH Pages).
//
// The user-facing UX is unchanged. Only crawlers see the personalized
// HTML, which is exactly what they need to render the link preview.
//
// Deploy: see ../README.md.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const CRAWLER_UA_RE =
  /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|discordbot|slackbot|googlebot|bingbot|pinterest|skypeuripreview|redditbot|applebot|yahoobot|duckduckbot/i;

const STORE_LINKS = {
  ios: 'https://apps.apple.com/au/app/ozly/id6760398649',
  android: 'https://play.google.com/store/apps/details?id=com.augusto.ozly',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only intercept /v/:code (affiliate landing). /me/:code is the dashboard
    // for the affiliate — needs auth, no OG sense to personalize.
    if (!url.pathname.startsWith('/v/')) {
      return fetch(request);
    }

    const code = url.pathname.split('/')[2];
    if (!code || !/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      return fetch(request);
    }

    // Sniff UA. Real browsers fall through to origin.
    const ua = request.headers.get('User-Agent') ?? '';
    if (!CRAWLER_UA_RE.test(ua)) {
      return fetch(request);
    }

    // Crawler — fetch affiliate name and render personalized HTML.
    const affiliate = await fetchAffiliate(code, env);

    // If code is invalid/inactive, let the origin show its normal
    // "Invalid code" page (the SPA already handles this case).
    if (!affiliate || !affiliate.found) {
      return fetch(request);
    }

    const html = renderOgHtml(code.toUpperCase(), affiliate.name);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        // Cache 5min on edges — affiliate names rarely change. Still
        // re-validates often enough that name updates propagate quickly.
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-OG-Generated-By': 'ozly-og-worker',
      },
    });
  },
};

async function fetchAffiliate(
  code: string,
  env: Env,
): Promise<{ found: true; name: string } | { found: false } | null> {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rpc/validate_referral_code`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_code: code }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      valid?: boolean;
      kind?: string;
      owner_name?: string;
    };
    if (!data.valid || !data.owner_name) return { found: false };
    return { found: true, name: data.owner_name };
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(full: string): string {
  return (full.split(/\s+/)[0] ?? full).trim();
}

function renderOgHtml(code: string, ownerName: string): string {
  const first = firstName(ownerName);
  const title = `🎁 ${first} te indicou pro Ozly`;
  const description = `Use o código ${code} e baixe grátis. Ozly: invoicing, expenses e tax tracker pra Australian sole traders.`;
  const url = `https://ozly.au/v/${code}`;
  const image = 'https://ozly.au/OSLY.svg';

  // Body still has the title + store links so even if a crawler is dumb
  // and renders the body (e.g. some chat apps inline preview), the user
  // gets useful info. Real users hit the origin and see the full landing.
  return `<!DOCTYPE html>
<html lang="en-AU" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ozly">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="Ozly logo">
<meta property="og:locale" content="en_AU">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">

<!-- Mobile app links (smart redirect on FB / Twitter) -->
<meta property="al:ios:url" content="${url}">
<meta property="al:ios:app_store_id" content="6760398649">
<meta property="al:ios:app_name" content="Ozly">
<meta property="al:android:url" content="${url}">
<meta property="al:android:package" content="com.augusto.ozly">
<meta property="al:android:app_name" content="Ozly">
<meta property="al:web:url" content="${url}">
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p>
  <a href="${STORE_LINKS.ios}">Download iOS</a> ·
  <a href="${STORE_LINKS.android}">Download Android</a> ·
  <a href="${url}">${url}</a>
</p>
</body>
</html>`;
}
