// transforme un dessin au trait (encre noire sur papier) en lignes blanches sur fond transparent, pour les fonds sombres du site.
// installation unique : npm install --prefix tools
// usage : node tools/lignes-blanches.mjs <dessin> <nom> <x,y,largeur,hauteur> [hauteur-finale] [efface=x,y,l,h ...]
//   <x,y,largeur,hauteur> : zone à garder (coupe signature, bords, marques parasites)
//   efface=... : rectangle à vider à l'intérieur de la zone (coordonnées de la zone)
// sortie : assets/illustrations/<nom>.webp
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [source, nom, zone, hauteurFinale = "900", ...efface] = process.argv.slice(2);
if (!source || !nom || !zone) {
  console.log("Usage : node tools/lignes-blanches.mjs <dessin> <nom> <x,y,l,h> [hauteur] [efface=x,y,l,h]");
  process.exit(1);
}
const [x, y, l, h] = zone.split(",").map(Number);
const noir = 85, papier = 185; // en dessous : trait plein, au dessus : papier

const { data, info } = await sharp(source).rotate().extract({ left: x, top: y, width: l, height: h })
  .grayscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const alpha = new Uint8Array(W * H);
for (let i = 0; i < alpha.length; i++) alpha[i] = Math.max(0, Math.min(255, Math.round((papier - data[i]) / (papier - noir) * 255)));
for (const e of efface) {
  const [ex, ey, el, eh] = e.replace("efface=", "").split(",").map(Number);
  for (let j = ey; j < Math.min(H, ey + eh); j++) for (let i = ex; i < Math.min(W, ex + el); i++) alpha[j * W + i] = 0;
}

// retire les petites poussières isolées (composantes connexes minuscules)
const vu = new Uint8Array(W * H), seuilPoussiere = Math.round(W * H * 0.00012);
for (let s = 0; s < alpha.length; s++) {
  if (vu[s] || alpha[s] < 100) continue;
  const pile = [s], membres = [];
  vu[s] = 1;
  while (pile.length) {
    const p = pile.pop(); membres.push(p);
    const px = p % W, py = (p / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!vu[n] && alpha[n] >= 100) { vu[n] = 1; pile.push(n); }
    }
  }
  if (membres.length < seuilPoussiere) for (const m of membres) alpha[m] = 0;
}
for (let i = 0; i < alpha.length; i++) if (alpha[i] < 40) alpha[i] = 0;

const rgba = Buffer.alloc(W * H * 4, 255);
for (let i = 0; i < alpha.length; i++) rgba[i * 4 + 3] = alpha[i];
const sortie = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "illustrations", `${nom}.webp`);
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 10 })
  .resize({ height: Number(hauteurFinale), withoutEnlargement: true })
  .webp({ quality: 85, alphaQuality: 100, effort: 6 })
  .toFile(sortie);
console.log(`assets/illustrations/${nom}.webp`);
