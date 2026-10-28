// Prépare un morceau pour le lecteur du site (facultatif — nécessite « lamejs »).
// Installation unique :   npm install --prefix tools
// Utilisation :           node tools/onde.mjs <morceau.wav> <nom> [--duree=30] [--debut=75] [--kbps=192] [--sans-mp3]
//   --duree=30  ne garde qu'un extrait de 30 s (fondu au début et à la fin).
//   --debut=75  début de l'extrait, en secondes ; sans lui, le passage le plus intense est choisi.
// Exemple :               node tools/onde.mjs ~/Musique/mon-morceau.wav mon-morceau --duree=30
//   → assets/audio/mon-morceau.mp3   (léger, lisible partout)
//   → assets/audio/mon-morceau.json  (forme d'onde : le dessin affiché dans le lecteur)
// Ensuite, dans content/site.js (section musique) :
//   titres: [{ titre: "Mon morceau", fichier: "assets/audio/mon-morceau.mp3", onde: "assets/audio/mon-morceau.json" }]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [source, nom, ...options] = process.argv.slice(2);
if (!source || !nom) {
  console.log("Usage : node tools/onde.mjs <morceau.wav> <nom> [--duree=30] [--debut=75] [--kbps=192] [--sans-mp3]");
  process.exit(1);
}
const nombre = (n) => { const o = options.find((x) => x.startsWith(`--${n}=`)); return o ? Number(o.split("=")[1]) : NaN; };
const kbps = nombre("kbps") || 192;
const sortie = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "audio");
mkdirSync(sortie, { recursive: true });

/* ---------- Lecture du WAV (PCM 16/24/32 bits ou flottant 32 bits) ---------- */
const buf = readFileSync(source);
if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Ce fichier n'est pas un WAV.");
let fmt = null, debut = 0, taille = 0;
for (let p = 12; p + 8 <= buf.length;) {
  const id = buf.toString("ascii", p, p + 4), n = buf.readUInt32LE(p + 4);
  if (id === "fmt ") fmt = { tag: buf.readUInt16LE(p + 8), canaux: buf.readUInt16LE(p + 10), hz: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
  if (id === "data") { debut = p + 8; taille = Math.min(n, buf.length - debut); break; }
  p += 8 + n + (n % 2);
}
if (!fmt || !debut) throw new Error("WAV illisible (fmt ou data manquant).");
const octets = fmt.bits / 8, totalComplet = Math.floor(taille / (octets * fmt.canaux));
const flottant = fmt.tag === 3;
let depart = 0; // début de l'extrait, en images (échantillons par canal)
const lire = (i) => {
  const o = debut + (i + depart * fmt.canaux) * octets;
  if (flottant) return buf.readFloatLE(o);
  if (fmt.bits === 16) return buf.readInt16LE(o) / 32768;
  if (fmt.bits === 24) return buf.readIntLE(o, 3) / 8388608;
  if (fmt.bits === 32) return buf.readInt32LE(o) / 2147483648;
  throw new Error(`Profondeur ${fmt.bits} bits non gérée.`);
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
console.log(`${fmt.canaux} canal(aux), ${fmt.hz} Hz, ${fmt.bits} bits${flottant ? " (flottant)" : ""}, ${mmss(totalComplet / fmt.hz)}`);

/* ---------- Extrait (facultatif) ---------- */
const dureeExtrait = nombre("duree"), debutExtrait = nombre("debut");
const extrait = Number.isFinite(dureeExtrait) && dureeExtrait > 0;
let total = totalComplet;
if (extrait) {
  const longueur = Math.min(totalComplet, Math.round(dureeExtrait * fmt.hz));
  if (Number.isFinite(debutExtrait)) {
    depart = Math.min(Math.max(0, Math.round(debutExtrait * fmt.hz)), totalComplet - longueur);
  } else {
    // Sans --debut : la fenêtre la plus intense (énergie moyenne la plus forte)
    const bloc = Math.round(fmt.hz / 2), nb = Math.floor(totalComplet / bloc), energie = [];
    for (let b = 0; b < nb; b++) {
      let somme = 0, n = 0;
      for (let i = b * bloc; i < (b + 1) * bloc; i += 64) { const v = lire(i * fmt.canaux); somme += v * v; n++; }
      energie.push(somme / n);
    }
    const fen = Math.max(1, Math.min(nb, Math.round(longueur / bloc)));
    let courant = energie.slice(0, fen).reduce((a, b) => a + b, 0), meilleur = courant, ou = 0;
    for (let b = fen; b < nb; b++) {
      courant += energie[b] - energie[b - fen];
      if (courant > meilleur) { meilleur = courant; ou = b - fen + 1; }
    }
    depart = Math.min(ou * bloc, totalComplet - longueur);
  }
  total = longueur;
  console.log(`Extrait : de ${mmss(depart / fmt.hz)} à ${mmss((depart + total) / fmt.hz)} (${(total / fmt.hz).toFixed(1)} s)`);
}
const duree = total / fmt.hz;
// Fondu : 0,4 s à l'entrée, 2 s à la sortie (extrait seulement)
const fonduEntree = extrait ? Math.round(0.4 * fmt.hz) : 0, fonduSortie = extrait ? Math.round(2 * fmt.hz) : 0;
const gain = (i) => Math.min(1, fonduEntree ? i / fonduEntree : 1, fonduSortie ? (total - i) / fonduSortie : 1);

/* ---------- Forme d'onde : 300 pics normalisés ---------- */
const N = 300, pics = new Array(N).fill(0);
for (let b = 0; b < N; b++) {
  const a = Math.floor((b * total) / N), z = Math.floor(((b + 1) * total) / N);
  let max = 0;
  const pas = Math.max(1, Math.floor((z - a) / 400)); // échantillonnage suffisant, lecture rapide
  for (let i = a; i < z; i += pas) for (let c = 0; c < fmt.canaux; c++) {
    const v = Math.abs(lire(i * fmt.canaux + c)) * gain(i);
    if (v > max) max = v;
  }
  pics[b] = max;
}
const global = Math.max(...pics) || 1;
const normalises = pics.map((v) => Math.round(Math.pow(v / global, 0.75) * 100) / 100);
writeFileSync(join(sortie, `${nom}.json`), JSON.stringify({ duree: Math.round(duree * 10) / 10, pics: normalises }));
console.log(`assets/audio/${nom}.json`);

/* ---------- MP3 ---------- */
if (options.includes("--sans-mp3")) process.exit(0);
let lame;
try {
  // Le point d'entrée de lamejs est cassé sous Node : on charge sa version « tout-en-un ».
  const require = createRequire(import.meta.url);
  lame = new Function(readFileSync(require.resolve("lamejs/lame.all.js"), "utf8") + "; return lamejs;")();
} catch {
  console.log("MP3 non créé : « lamejs » n'est pas installé (npm install --prefix tools). La forme d'onde est prête ; convertissez le WAV en MP3 avec l'outil de votre choix.");
  process.exit(0);
}
const canaux = Math.min(2, fmt.canaux);
const enc = new lame.Mp3Encoder(canaux, fmt.hz, kbps);
const morceaux = [];
const BLOC = 1152;
const g = new Int16Array(BLOC), d = new Int16Array(BLOC);
const entier = (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
for (let a = 0; a < total; a += BLOC) {
  const n = Math.min(BLOC, total - a);
  for (let i = 0; i < n; i++) {
    const k = gain(a + i);
    g[i] = entier(lire((a + i) * fmt.canaux) * k);
    d[i] = canaux === 2 ? entier(lire((a + i) * fmt.canaux + 1) * k) : 0;
  }
  const out = canaux === 2 ? enc.encodeBuffer(g.subarray(0, n), d.subarray(0, n)) : enc.encodeBuffer(g.subarray(0, n));
  if (out.length) morceaux.push(Buffer.from(out));
}
const fin = enc.flush();
if (fin.length) morceaux.push(Buffer.from(fin));
const mp3 = Buffer.concat(morceaux);
writeFileSync(join(sortie, `${nom}.mp3`), mp3);
console.log(`assets/audio/${nom}.mp3  (${(mp3.length / 1048576).toFixed(1)} Mo, ${kbps} kb/s)`);
