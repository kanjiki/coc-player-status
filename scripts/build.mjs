import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const publicDir = path.join(root, "public");

await rm(docs, { recursive: true, force: true });
await mkdir(docs, { recursive: true });
const localTsc = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
const tscCommand = await import("node:fs").then(({ existsSync }) => existsSync(localTsc) ? localTsc : (process.platform === "win32" ? "tsc.cmd" : "tsc"));
execFileSync(tscCommand, ["-p", "tsconfig.json"], { cwd: root, stdio: "inherit" });
await cp(publicDir, docs, { recursive: true });

const index = await readFile(path.join(docs, "index.html"), "utf8");
await writeFile(path.join(docs, "404.html"), index, "utf8");
await writeFile(path.join(docs, ".nojekyll"), "", "utf8");

const buildInfo = {
  version: "1.0.0-beta.1",
  builtAt: new Date().toISOString(),
  coreVersion: "0.5.0"
};
await writeFile(path.join(docs, "build-info.json"), JSON.stringify(buildInfo, null, 2), "utf8");

const devDir = path.join(docs, "dev");
await mkdir(devDir, { recursive: true });
const cacheBust = `?build=${Date.now()}`;
const [{ renderMermaid }, { SCENES }, { ENDINGS }, { KURAMOCHI_CARDS }] = await Promise.all([
  import(pathToFileURL(path.join(docs, "core", "flow.js")).href + cacheBust),
  import(pathToFileURL(path.join(docs, "core", "scenes.js")).href + cacheBust),
  import(pathToFileURL(path.join(docs, "core", "endings.js")).href + cacheBust),
  import(pathToFileURL(path.join(docs, "core", "cards.js")).href + cacheBust)
]);
await writeFile(path.join(devDir, "flow.mmd"), renderMermaid(), "utf8");
await writeFile(path.join(devDir, "scenes.json"), JSON.stringify(SCENES, null, 2), "utf8");
await writeFile(path.join(devDir, "endings.json"), JSON.stringify(ENDINGS, null, 2), "utf8");
await writeFile(path.join(devDir, "kuramochi-cards.json"), JSON.stringify(KURAMOCHI_CARDS, null, 2), "utf8");
console.log(`Built static site: ${docs}`);
