import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mmd", "text/plain; charset=utf-8"]
]);

function resolveRequestPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  } catch {
    return null;
  }
  const normalized = path.posix.normalize(decoded).replace(/^\.\.(?:\/|$)/, "");
  const relative = normalized === "/" ? "index.html" : normalized.replace(/^\//, "");
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) return null;
  if (existsSync(absolute) && statSync(absolute).isDirectory()) return path.join(absolute, "index.html");
  if (existsSync(absolute)) return absolute;
  return path.join(root, "404.html");
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(filePath.endsWith("404.html") ? 404 : 200, {
    "Content-Type": mimeTypes.get(extension) ?? "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preview: http://${host}:${port}/`);
});
