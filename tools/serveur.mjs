// serveur local sans dépendance : node tools/serveur.mjs [port]
// sert le site à la racine (http://localhost:8080/) et dans un sous-dossier qui simule github pages (http://localhost:8080/drop-out/)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

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
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
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
    const entetes = { "Content-Type": TYPES[extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache", "Accept-Ranges": "bytes" };
    // vidéo et audio : le navigateur lit par morceaux (en-tête Range), indispensable pour la boucle et le déplacement dans le média
    const plage = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (plage && (plage[1] || plage[2])) {
      const fin = plage[2] ? Math.min(Number(plage[2]), corps.length - 1) : corps.length - 1;
      const debut = plage[1] ? Number(plage[1]) : corps.length - Number(plage[2]);
      if (debut > fin || debut < 0) { res.writeHead(416, { "Content-Range": `bytes */${corps.length}` }); return res.end(); }
      res.writeHead(206, { ...entetes, "Content-Range": `bytes ${debut}-${fin}/${corps.length}`, "Content-Length": fin - debut + 1 });
      return res.end(corps.subarray(debut, fin + 1));
    }
    // texte compressé en gzip, comme sur github pages (pour que les mesures de vitesse en local soient réalistes)
    if (/^(text\/|application\/(json|manifest)|image\/svg)/.test(entetes["Content-Type"]) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      const zip = gzipSync(corps);
      res.writeHead(200, { ...entetes, "Content-Encoding": "gzip", "Content-Length": zip.length, Vary: "Accept-Encoding" });
      return res.end(zip);
    }
    res.writeHead(200, entetes);
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
