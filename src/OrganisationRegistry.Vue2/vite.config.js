import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import basicSsl from "@vitejs/plugin-basic-ssl";

// The app is served below /v2/ (nginx `location /v2` aliases the build output).
export default defineConfig({
  base: "/v2/",
  plugins: [vue(), basicSsl()],
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
    // the Angular dev server proxies /v2 here (VUE_DEV_SERVER there); override with `npm run serve -- --port <port>`
    port: 8443,
    strictPort: true,
  },
  // `npm run preview` serves the build on the same port, so the Angular dev server's /v2 proxy finds it
  preview: { port: 8443, strictPort: true },
});
