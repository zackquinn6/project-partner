import React, { useEffect } from 'react';

/**
 * Client-side defense-in-depth meta tags.
 *
 * Authoritative production headers live in `public/_headers` (and must also be
 * configured on hosts that ignore that file, e.g. Lovable CDN). Meta tags cannot
 * set frame-ancestors, HSTS, or X-Frame-Options reliably - do not treat this
 * provider as a substitute for HTTP response headers.
 */
export const SecurityHeadersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const setSecurityMeta = () => {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = [
        "default-src 'self'",
        // unsafe-inline remains for Vite/React; prefer host CSP without unsafe-eval in production.
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; ');

      const noSniffMeta = document.createElement('meta');
      noSniffMeta.httpEquiv = 'X-Content-Type-Options';
      noSniffMeta.content = 'nosniff';

      document.querySelectorAll('meta[http-equiv="X-Frame-Options"]').forEach((el) => el.remove());
      document.querySelectorAll('meta[http-equiv="Strict-Transport-Security"]').forEach((el) => el.remove());
      document.querySelectorAll('meta[http-equiv="Cross-Origin-Embedder-Policy"]').forEach((el) => el.remove());
      document.querySelectorAll('meta[http-equiv="Cross-Origin-Opener-Policy"]').forEach((el) => el.remove());

      const referrerMeta = document.createElement('meta');
      referrerMeta.name = 'referrer';
      referrerMeta.content = 'strict-origin-when-cross-origin';

      const permissionsMeta = document.createElement('meta');
      permissionsMeta.httpEquiv = 'Permissions-Policy';
      permissionsMeta.content =
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=()';

      const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!existingCSP) {
        document.head.appendChild(cspMeta);
      }

      const existingNoSniff = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
      if (!existingNoSniff) {
        document.head.appendChild(noSniffMeta);
      }

      const existingReferrer = document.querySelector('meta[name="referrer"]');
      if (!existingReferrer) {
        document.head.appendChild(referrerMeta);
      }

      const existingPermissions = document.querySelector('meta[http-equiv="Permissions-Policy"]');
      if (!existingPermissions) {
        document.head.appendChild(permissionsMeta);
      }
    };

    setSecurityMeta();
  }, []);

  return <>{children}</>;
};
