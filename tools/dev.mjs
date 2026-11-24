// One command for both frontends (no dependencies):  node tools/dev.mjs serve | preview | build [--dev] | clean
//   serve    UI dev server + Vue2 dev server; the UI one proxies /v2 and /api (see vite-plugin-dev-gateway.mjs)
//   preview  UI + Vue2 preview of the builds, building first whatever has no build yet
//   build    both builds, production unless --dev
//   clean    removes node_modules and the build output (wwwroot / dist) of both
// Missing node_modules are installed first.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const projects = {
  ui: {
    dir: "src/OrganisationRegistry.UI",
    install: ["npm", "ci", "--legacy-peer-deps"],
    serve: ["npm", "run", "serve"],
    preview: ["npm", "run", "preview"],
    build: ["npm", "run", "build:prod"],
    buildDev: ["npm", "run", "build"],
    built: "wwwroot/index.html",
    clean: ["node_modules", "wwwroot"],
  },
  vue2: {
    dir: "src/OrganisationRegistry.Vue2",
    install: ["npm", "ci"],
    serve: ["npm", "run", "serve"],
    preview: ["npm", "run", "preview"],
    build: ["npm", "run", "build"],
    buildDev: ["npm", "run", "build", "--", "--mode", "development"],
    built: "dist/index.html",
    clean: ["node_modules", "dist"],
  },
};

const win = process.platform === "win32";
const children = new Set();
const run = (name, [cmd, ...args], cwd) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: win, // npm is npm.cmd there
      detached: !win, // own process group, so stop() takes npm and the server it started
      env: { ...process.env, ...(process.stdout.isTTY && { FORCE_COLOR: "1" }) },
    });
    children.add(child);
    for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      let rest = "";
      stream.on("data", (chunk) => {
        const lines = (rest + chunk).split("\n");
        rest = lines.pop();
        for (const line of lines) out.write(`[${name}] ${line}\n`);
      });
      stream.on("end", () => rest && out.write(`[${name}] ${rest}\n`));
    }
    child.on("close", (code) => {
      children.delete(child);
      resolve(code ?? 1);
    });
  });

const stop = () =>
  children.forEach((c) => {
    try {
      if (win) spawn("taskkill", ["/pid", c.pid, "/T", "/F"]);
      else process.kill(-c.pid, "SIGTERM");
    } catch {}
  });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// all at once; the first failure stops the rest
const all = async (jobs) => {
  const codes = await Promise.all(
    jobs.map(async (job) => {
      const code = await job();
      if (code) stop();
      return code;
    }),
  );
  return codes.find(Boolean) ?? 0;
};

const [command, ...flags] = process.argv.slice(2);
const dev = flags.includes("--dev");
const dir = (p) => join(root, p.dir);
const ensureInstalled = (name, p) => (existsSync(join(dir(p), "node_modules")) ? 0 : run(name, p.install, dir(p)));
const ensureBuilt = (name, p) => (existsSync(join(dir(p), p.built)) ? 0 : run(name, p.build, dir(p)));
const each = (fn) => Object.entries(projects).map(([name, p]) => async () => fn(name, p));
const then = (a, b) => async () => (await a()) || b();

const commands = {
  serve: each((name, p) => then(() => ensureInstalled(name, p), () => run(name, p.serve, dir(p)))()),
  preview: each((name, p) =>
    then(() => ensureInstalled(name, p), then(() => ensureBuilt(name, p), () => run(name, p.preview, dir(p))))(),
  ),
  build: each((name, p) =>
    then(() => ensureInstalled(name, p), () => run(name, dev ? p.buildDev : p.build, dir(p)))(),
  ),
};

if (command === "clean") {
  for (const p of Object.values(projects))
    for (const name of p.clean) {
      const path = join(dir(p), name);
      if (!existsSync(path)) continue;
      rmSync(path, { recursive: true, force: true });
      console.log(`removed ${p.dir}/${name}`);
    }
  process.exit(0);
}

if (!commands[command]) {
  console.error("usage: node tools/dev.mjs serve | preview | build [--dev] | clean");
  process.exit(2);
}
process.exit(await all(commands[command]));
