import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { devGateway } from "../../tools/vite-plugin-dev-gateway.mjs";

// The app is served below /v2/ (nginx `location /v2` aliases the build output).
export default defineConfig({
  base: "/v2/",
  plugins: [
    vue(),
    // https certificate, /config.js and the proxy options below (see tools/vite-plugin-dev-gateway.mjs)
    devGateway({
      noTLSVerify: true,
      xForwardedHost: true,
      runtimeConfig: () => ({ organisationRegistryApiEndpoint: "/api" }), // relative: the page's own origin
    }),
  ],
  resolve: {
    // webpack resolved extensionless .vue imports (import X from "./X")
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"],
    alias: [
      // webpack-style `~pkg/...` in scss @import / url() (src/scss/base.scss)
      { find: /^~/, replacement: "" },
      // pinia imports vue-demi, whose postinstall script picks the Vue 2.7 build; point at it directly so
      // the build does not depend on that script having run
      {
        find: /^vue-demi$/,
        replacement: fileURLToPath(new URL("./node_modules/vue-demi/lib/v2.7/index.mjs", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        // @govflanders scss still uses @import, global functions and slash division
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "slash-div", "color-functions"],
      },
    },
  },
  server: {
    // the API, reached through this server (the same /api the Angular dev server offers)
    proxy: {
      "/api": { target: process.env.API_ENDPOINT || "https://localhost:9003", rewrite: (p) => p.replace(/^\/api/, "") },
    },
    // the Angular dev server proxies /v2 here (VUE_SERVER there); override with `npm run serve -- --port <port>`
    port: 8443,
    strictPort: true,
  },
  // `npm run preview` serves the build on the same port, so the Angular dev server's /v2 proxy finds it
  preview: { port: 8443, strictPort: true },
});
