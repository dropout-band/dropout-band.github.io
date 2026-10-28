// Prépare une photo pour le site (facultatif — nécessite « sharp »).
// Installation unique :   npm install --prefix tools
// Utilisation :           node tools/optimiser-image.mjs <photo-source> <nom> [--nb]
// Exemple :               node tools/optimiser-image.mjs ~/Photos/chanteuse.jpg membre-2
//   → assets/img/membre-2-400.webp, -640.webp, -960.webp (format 4:5, cadré au centre)
// --nb : version noir et blanc. --format=paysage : 3:2 en 640/1000/1400 px.
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [source, nom, ...options] = process.argv.slice(2);
if (!source || !nom) {
  console.log("Usage : node tools/optimiser-image.mjs <photo-source> <nom> [--nb] [--format=paysage]");
  process.exit(1);
}
const paysage = options.includes("--format=paysage");
const largeurs = paysage ? [640, 1000, 1400] : [400, 640, 960];
const ratio = paysage ? 2 / 3 : 5 / 4; // hauteur / largeur
const sortie = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "img");

for (const l of largeurs) {
  let p = sharp(source).rotate().resize(l, Math.round(l * ratio), { fit: "cover", position: "attention" });
  if (options.includes("--nb")) p = p.grayscale().linear(1.12, -12);
  await p.webp({ quality: 72, effort: 6 }).toFile(join(sortie, `${nom}-${l}.webp`));
  console.log(`assets/img/${nom}-${l}.webp`);
}
