import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const required = [
  "index.html",
  "404.html",
  "styles.css",
  "app.js",
  "site-config.js",
  "manifest.webmanifest",
  "favicon.svg",
  ".nojekyll",
  "core/engine.js",
  "core/scenes.js",
  "core/endings.js"
];
for (const file of required) await access(path.join(docs, file));
const html = await readFile(path.join(docs, "index.html"), "utf8");
for (const fragment of ["id=\"app\"", "./app.js", "./styles.css", "./site-config.js"]) {
  if (!html.includes(fragment)) throw new Error(`index.html missing ${fragment}`);
}
const files = await readdir(path.join(docs, "core"));
if (files.length < 10) throw new Error("core build appears incomplete");
console.log(`Build validation passed (${required.length} required files, ${files.length} core files).`);
