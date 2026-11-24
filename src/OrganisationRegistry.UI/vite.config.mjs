import { cpSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import ts from "typescript5";
import { devGateway } from "./vite-plugin-dev-gateway.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));

// Replaces what angular2-template-loader did: templateUrl/styleUrls -> inline strings.
const angularResources = () => ({
  name: "angular-resources",
  enforce: "pre",
  // Templates are read without their BOM, like raw-loader did; a BOM renders as a stray text node.
  load(id) {
    if (!id.endsWith(".html?template")) return;
    const file = id.slice(0, -"?template".length);
    this.addWatchFile(file);
    return `export default ${JSON.stringify(readFileSync(file, "utf8").replace(/^\uFEFF/, ""))};`;
  },
  transform(code, id) {
    if (!id.endsWith(".ts") || id.includes("node_modules")) return;
    if (!/templateUrl|styleUrls/.test(code)) return;
    const imports = [];
    const load = (url, query) => {
      const name = `__res${imports.length}`;
      imports.push(`import ${name} from '${/^[./]/.test(url) ? url : "./" + url}${query}';`);
      return name;
    };
    const out = code
      .replace(/templateUrl\s*:\s*(['"`])(.+?)\1/g, (_, __, url) => `template: ${load(url, "?template")}`)
      .replace(/styleUrls\s*:\s*\[([^\]]*)\]/g, (_, list) => {
        const urls = [...list.matchAll(/(['"`])(.+?)\1/g)].map((m) => load(m[2], "?inline"));
        return `styles: [${urls.join(", ")}]`;
      });
    return { code: imports.join("\n") + "\n" + out, map: null };
  },
});

// Angular 2 needs design:paramtypes metadata, which esbuild does not emit.
const decorators = () => ({
  name: "ts-decorator-metadata",
  enforce: "pre",
  transform(code, id) {
    if (!id.endsWith(".ts") || id.includes("node_modules")) return;
    const r = ts.transpileModule(code, {
      fileName: id,
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.ESNext,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
        sourceMap: true,
        inlineSources: true,
      },
    });
    return {
      code: r.outputText.replace(/\/\/# sourceMappingURL=.*$/m, ""),
      map: r.sourceMapText ? JSON.parse(r.sourceMapText) : null,
    };
  },
});

// webpack's CopyWebpackPlugin({ from: 'assets', to: 'assets' })
const copyAssets = () => ({
  name: "copy-assets",
  apply: "build",
  closeBundle() {
    cpSync(`${root}assets`, `${root}wwwroot/assets`, { recursive: true });
  },
});

// Long stack traces are a development aid only.
const skipLongStackTrace = (mode) => ({
  name: "skip-long-stack-trace",
  enforce: "pre",
  resolveId(id) {
    if (mode === "production" && id === "zone.js/dist/long-stack-trace-zone") return "\0empty";
  },
  load: (id) => (id === "\0empty" ? "" : null),
});

// One origin for Angular (/), the API (/api) and Vue2 (/v2), so both apps share the login.
const gateway = {
  allowedHosts: ["organisatie.dev-vlaanderen.local", "oauth.pstmn.io", ".gitrebase.be"], // + wildcards
  proxy: {
    "/api": { target: process.env.API_ENDPOINT || "https://localhost:2443", rewrite: (p) => p.replace(/^\/api/, "") },
    "/v2": { target: process.env.VUE_SERVER || "https://localhost:8443", ws: true }, // npm run serve | preview
  },
};

export default defineConfig(({ mode }) => ({
  root,
  base: "/",
  // TypeScript is compiled by the decorators plugin; esbuild only minifies the output.
  esbuild: { exclude: /\.tsx?$/ },
  plugins: [
    skipLongStackTrace(mode),
    angularResources(),
    decorators(),
    copyAssets(),
    // Extras on top of the Vite server options below (see the plugin header)
    devGateway({
      sniCopy: true,
      noTLSVerify: true,
      xForwardedHost: true,
      httpsPorts: (process.env.HTTPS_PORTS ?? "443,9007").split(",").filter(Boolean).map(Number), // "" = none
      redirects: { "/v1/browser-callback": process.env.OIC_TARGET || "https://or-ui.gitrebase.be/#/oic" },
      // same keys as init.sh; the UI and API urls follow whatever host the browser used
      runtimeConfig: (origin, env) => ({
        organisationRegistryVersion: `v2-${env.API_VERSION ?? ""}`,
        organisationRegistryApiEndpoint: "/api", // relative: always the page's own scheme and host, never mixed content
        organisationRegistryUiEndpoint: origin,
        organisationRegistryInformatieVlaanderenLink: env.AIV_URI ?? "",
        otelServerUri: env.OTEL_SERVER_URI ?? "",
        otelDistributedTracingOrigins: env.OTEL_DISTRIBUTED_TRACING_ORIGINS ?? "",
        environmentName: env.ENV_NAME ?? "",
      }),
    }),
  ],
  resolve: {
    extensions: [".ts", ".js", ".json"],
    alias: [
      { find: /^(core|shared|services|organisation|body|people)(?=\/|$)/, replacement: `${root}app/$1` },
      { find: /^assets\//, replacement: `${root}assets/` },
    ],
  },
  define: {
    ENV: JSON.stringify(mode === "production" ? "production" : "development"),
    HMR: false,
    global: "window",
  },
  build: {
    cssMinify: false,
    outDir: "wwwroot",
    emptyOutDir: true,
    assetsDir: "static",
    target: "es2015",
    sourcemap: true,
  },
  server: gateway,
  preview: gateway,
}));
