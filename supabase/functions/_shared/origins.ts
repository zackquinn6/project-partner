/**
 * Resolve a trusted application origin for Stripe return URLs and similar links.
 * Never trust a raw Origin header alone.
 */
export function resolveAppOrigin(req: Request): string {
  const allowed = [
    Deno.env.get('PUBLIC_APP_URL') ?? '',
    Deno.env.get('APP_ORIGIN') ?? '',
    'https://toolio.us',
    'https://projectpartner.toolio.us',
    'https://project-partner-prime.lovable.app',
    'http://localhost:8080',
    'http://localhost:3000',
  ]
    .map((o) => o.replace(/\/+$/, ''))
    .filter(Boolean);

  const requestOrigin = (req.headers.get('origin') ?? '').replace(/\/+$/, '');
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  return (
    Deno.env.get('PUBLIC_APP_URL')?.replace(/\/+$/, '') ||
    Deno.env.get('APP_ORIGIN')?.replace(/\/+$/, '') ||
    'https://projectpartner.toolio.us'
  );
}
