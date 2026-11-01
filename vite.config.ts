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
    VitePWA({
      registerType: "autoUpdate",
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
        globIgnores: ["**/data/**"],
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: "NetworkFirst", options: { cacheName: "data", networkTimeoutSeconds: 5 } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: "CacheFirst", options: { cacheName: "fonts" } },
        ],
      },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"] },
});
