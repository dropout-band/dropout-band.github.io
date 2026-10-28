// Serveur local sans dépendance : node tools/serveur.mjs [port]
// Sert le site à la racine (http://localhost:8080/) et dans un
// sous-dossier simulant GitHub Pages (http://localhost:8080/drop-out/).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2]) || 8080;
const SOUS_DOSSIER = "/drop-out";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".ics": "text/calendar",
};

createServer(async (req, res) => {
  let chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (chemin === SOUS_DOSSIER) { res.writeHead(301, { Location: `${SOUS_DOSSIER}/` }); return res.end(); }
  if (chemin.startsWith(`${SOUS_DOSSIER}/`)) chemin = chemin.slice(SOUS_DOSSIER.length);
  const fichier = normalize(join(RACINE, chemin));
  if (!fichier.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
  try {
    let f = fichier;
    if ((await stat(f)).isDirectory()) f = join(f, "index.html");
    const corps = await readFile(f);
    res.writeHead(200, { "Content-Type": TYPES[extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(corps);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — fichier introuvable");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`\nDrop Out — serveur local\n`);
  console.log(`  Ordinateur :            http://localhost:${PORT}/`);
  console.log(`  Test sous-dossier :     http://localhost:${PORT}${SOUS_DOSSIER}/`);
  for (const adr of Object.values(networkInterfaces()).flat()) {
    if (adr?.family === "IPv4" && !adr.internal) console.log(`  Téléphone (même Wi-Fi) : http://${adr.address}:${PORT}/`);
  }
  console.log(`\n  Ctrl+C pour arrêter.\n`);
});
