/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    // version.json: read by the app with no caching to detect a stuck service worker (see src/main.tsx)
    { name: "version-json", generateBundle() { this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: pkg.version }) }); } },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // registered in main.tsx with update checks
      manifest: {
        name: "Pilzdex",
        short_name: "Pilzdex",
        description: "A Pokédex for the mushrooms you find",
        theme_color: "#d9262b",
        background_color: "#0b0e17",
        display: "standalone",
        start_url: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Network first for the app itself: the page is never served from a stale copy when online.
        // index.html is not precached; navigations go to the network (bypassing the HTTP cache) and fall back
        // to the last good copy only when offline / no answer within 4 s. JS/CSS are hashed, so never stale.
        globIgnores: ["**/data/**", "**/models/**", "**/litert/**", "**/refs/**", "**/*.html"],
        navigateFallback: null,
        // take over as soon as installed: without this the new worker waited for a SKIP_WAITING message that never
        // came (measured), so phones kept running old versions and offline pages mismatched their scripts
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          { urlPattern: ({ request }) => request.mode === "navigate", handler: "NetworkFirst",
            options: { cacheName: "pages", networkTimeoutSeconds: 4, fetchOptions: { cache: "no-store" } } },
          { urlPattern: /\/data\/.*\.json$/, handler: "NetworkFirst", options: { cacheName: "data", networkTimeoutSeconds: 5 } },
          // reference photos (v0.13.0): fetched the first time they are shown, then kept for offline use
          { urlPattern: /\/refs\/.*\.jpg$/, handler: "CacheFirst", options: { cacheName: "refs", expiration: { maxEntries: 1200 } } },
          // photo identifier: big, rarely changes, only fetched when first used, then works offline
          { urlPattern: /\/(models|litert)\/.*$/, handler: "CacheFirst", options: { cacheName: "identifier", expiration: { maxEntries: 10 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: "CacheFirst", options: { cacheName: "fonts" } },
        ],
      },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"] },
});
