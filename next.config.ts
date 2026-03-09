import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",      value: "on" },
  { key: "Strict-Transport-Security",   value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",             value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",      value: "nosniff" },
  { key: "Referrer-Policy",             value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",          value: "camera=(), geolocation=(), microphone=(self)" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Supabase API + Auth
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // Scripts Next.js (inline chunks) + Google OAuth popup
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      // Styles Tailwind inline
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts Google
      "font-src 'self' https://fonts.gstatic.com",
      // Images : data: pour les photos base64, blob: pour l'audio
      "img-src 'self' data: blob: https://*.supabase.co",
      // Audio blob pour la lecture des notes vocales
      "media-src 'self' blob: https://*.supabase.co",
      // OAuth redirects Apple + Google
      "frame-src https://appleid.apple.com https://accounts.google.com",
      "form-action 'self'",
      "base-uri 'self'",
      // Service Worker (PWA)
      "worker-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Declare empty turbopack config so Next.js doesn't warn about
  // webpack-only plugins (e.g. @ducanh2912/next-pwa) when Turbopack
  // is detected. Production builds use --webpack explicitly.
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig);
