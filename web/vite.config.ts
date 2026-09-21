import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      includeAssets: ["fonts/*.woff2", "icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Serenity",
        short_name: "Serenity",
        description: "Ton coffre de mots de passe, veillé par ton agent.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#13161d",
        theme_color: "#13161d",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only. The service worker never sees keys, and never caches the API:
        // the encrypted vault cache lives in IndexedDB, written by the app itself.
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,wasm}"],
        // 3455 brand logos have no business in the service worker: they would weigh the
        // install down, and caching only the ones you use would write your vault's sites to
        // disk. They are fetched on demand, so offline they fall back to the monogram.
        globIgnores: ["logos/**"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: false,
    // libsodium embeds its WebAssembly (~1 MB): one large chunk is expected.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      onwarn(warning, warn) {
        // React Server Components directives ("use client") are meaningless in a SPA.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
});
