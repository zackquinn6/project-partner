import React, { useEffect } from 'react';

/**
 * Component that sets security headers and CSP meta tags
 * Implements Content Security Policy and other security headers
 */
export const SecurityHeadersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Set security headers via meta tags for client-side applications
    const setSecurityMeta = () => {
      // Content Security Policy
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      // X-Content-Type-Options
      const noSniffMeta = document.createElement('meta');
      noSniffMeta.httpEquiv = 'X-Content-Type-Options';
      noSniffMeta.content = 'nosniff';
      
      // X-Frame-Options
      const frameOptionsMeta = document.createElement('meta');
      frameOptionsMeta.httpEquiv = 'X-Frame-Options';
      frameOptionsMeta.content = 'DENY';
      
      // Referrer Policy
      const referrerMeta = document.createElement('meta');
      referrerMeta.name = 'referrer';
      referrerMeta.content = 'strict-origin-when-cross-origin';
      
      // Permissions Policy
      const permissionsMeta = document.createElement('meta');
      permissionsMeta.httpEquiv = 'Permissions-Policy';
      permissionsMeta.content = 'geolocation=(), microphone=(), camera=()';
      
      // Check if meta tags already exist before adding
      const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!existingCSP) {
        document.head.appendChild(cspMeta);
      }
      
      const existingNoSniff = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
      if (!existingNoSniff) {
        document.head.appendChild(noSniffMeta);
      }
      
      const existingFrameOptions = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (!existingFrameOptions) {
        document.head.appendChild(frameOptionsMeta);
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