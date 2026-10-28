// Annonce une date en un seul geste : on donne les infos, l'outil fait tout le reste.
//   node tools/annoncer.mjs
// Il pose les questions (nom, date, heure, lieu, ville, affiche…), puis :
//   1. prépare l'affiche (versions 480 et 1200 px en WebP) dans assets/affiches/ ;
//   2. ajoute la date dans data/concerts.json ;
//   3. publie le site sur GitHub, puis attend qu'il soit à jour ;
//   4. envoie la notification (affiche, date, lieu, bouton Itinéraire) ; au toucher, le site ouvre l'encart de l'annonce.
// On peut aussi tout donner en une ligne (les infos non données sont demandées) :
//   node tools/annoncer.mjs --nom "Fête de la musique" --date 2026-11-21 --heure 20:30 --lieu "Salle des fêtes" --ville Lussas --affiche ~/Downloads/affiche.jpg
// Options : --info "texte" · --lien https://billetterie… · --essai (montre sans rien faire) · --sans-notif · --sans-publier
// Réglages (adresse du site, serveur, mot de passe) : notifications/.secret.json (voir notifications/LISEZ-MOI.md).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import readline from "node:readline/promises";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// ----- Lecture des options -----
const argv = process.argv.slice(2);
const drapeaux = new Set(["--essai", "--sans-notif", "--sans-publier"]);
const options = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) continue;
  if (drapeaux.has(argv[i])) options[argv[i].slice(2)] = true;
  else options[argv[i].slice(2)] = argv[++i];
}
const essai = Boolean(options.essai);

// ----- Questions pour ce qui manque -----
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const demander = async (cle, question, { obligatoire = false, defaut = "" } = {}) => {
  if (options[cle] !== undefined) return String(options[cle]).trim();
  if (!process.stdin.isTTY && !obligatoire) return defaut;
  for (;;) {
    const r = (await rl.question(question + (defaut ? ` [${defaut}]` : "") + " : ")).trim() || defaut;
    if (r || !obligatoire) return r;
    console.log("  → Cette information est nécessaire.");
  }
};

const nom = await demander("nom", "Nom de l'événement (facultatif, ex. Fête de la musique)");
let date = await demander("date", "Date (AAAA-MM-JJ)", { obligatoire: true });
while (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
  console.log("  → Format attendu : AAAA-MM-JJ, par exemple 2026-11-21.");
  delete options.date; date = await demander("date", "Date (AAAA-MM-JJ)", { obligatoire: true });
}
const heure = await demander("heure", "Heure (HH:MM, facultatif)");
const lieu = await demander("lieu", "Lieu (salle, bar, festival…)", { obligatoire: true });
const ville = await demander("ville", "Ville (facultatif)");
const info = await demander("info", "Info en plus (facultatif, ex. entrée libre, première partie…)");
const lien = await demander("lien", "Lien billetterie ou infos (facultatif)");
const affiche = await demander("affiche", "Fichier de l'affiche (glisse-le ici, facultatif)");
rl.close();

if (heure && !/^\d{1,2}:\d{2}$/.test(heure)) { console.error("Heure invalide : format HH:MM attendu (ex. 20:30)."); process.exit(1); }
if (lien && !/^https:\/\//.test(lien)) { console.error("Le lien doit commencer par https://"); process.exit(1); }

// ----- Réglages -----
let reglages = {};
try { reglages = JSON.parse(readFileSync(join(racine, "notifications", ".secret.json"), "utf8")); } catch { /* absents : seulement si on n'envoie pas */ }
const site = (reglages.site || "").replace(/\/?$/, "/");

// ----- 1. Affiche -----
const slug = lieu.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "concert";
const base = `assets/affiches/${date}-${slug}`;
let fichiers = [];
if (affiche) {
  const source = resolve(affiche.replace(/^["']|["']$/g, ""));
  if (!existsSync(source)) { console.error(`Affiche introuvable : ${source}`); process.exit(1); }
  fichiers = [`${base}-480.webp`, `${base}-1200.webp`];
  if (!essai) {
    const sharp = require(join(racine, "tools", "node_modules", "sharp"));
    mkdirSync(join(racine, "assets", "affiches"), { recursive: true });
    for (const [l, f] of [[480, fichiers[0]], [1200, fichiers[1]]]) {
      await sharp(source).rotate().resize({ width: l, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(join(racine, f));
    }
  }
}

// ----- 2. Programme -----
const concert = { date, ...(nom && { nom }), ...(heure && { heure: heure.padStart(5, "0") }), lieu, ...(ville && { ville }), ...(info && { info }), ...(lien && { lien }), statut: "", ...(affiche && { affiche: base }) };
const chemin = join(racine, "data", "concerts.json");
const programme = JSON.parse(readFileSync(chemin, "utf8"));
programme.concerts = (programme.concerts || []).filter((c) => !(c.date === date && c.lieu === lieu)); // même date et même lieu : on remplace
programme.concerts.push(concert);
programme.concerts.sort((a, b) => b.date.localeCompare(a.date));

console.log("\nAnnonce préparée :");
console.log(JSON.stringify(concert, null, 2));
if (essai) { console.log("\n[essai] Rien n'a été écrit, publié ni envoyé."); process.exit(0); }
writeFileSync(chemin, JSON.stringify(programme, null, 2) + "\n");

// ----- 3. Publication -----
const git = (...a) => execFileSync("git", a, { cwd: racine, stdio: ["ignore", "pipe", "pipe"] }).toString();
if (!options["sans-publier"]) {
  try {
    git("add", "data/concerts.json", ...(fichiers.length ? ["assets/affiches"] : []));
    const identite = ["-c", "user.name=" + (git("config", "user.name").trim() || "Drop Out"), "-c", "user.email=" + (git("config", "user.email").trim() || "dropout-band@users.noreply.github.com")];
    git(...identite, "commit", "-m", `Nouvelle date : ${nom || lieu} (${date})`);
    git("push");
    console.log("\nSite publié sur GitHub.");
  } catch (e) {
    console.error("\nLa publication a échoué :", (e.stderr || e.message).toString().trim().split("\n").slice(-3).join("\n"));
    console.error("La date est enregistrée dans data/concerts.json ; publie-la à la main, puis lance : node tools/notifier.mjs --date " + date + " --lieu \"" + lieu + "\"");
    process.exit(1);
  }
  // Attendre que le site en ligne contienne la date (GitHub met une à deux minutes)
  if (site) {
    process.stdout.write("Attente de la mise en ligne");
    let pret = false;
    for (let i = 0; i < 30 && !pret; i++) {
      try {
        const rep = await fetch(`${site}data/concerts.json?v=${Date.now()}`, { cache: "no-store" });
        pret = rep.ok && (await rep.text()).includes(`"${date}"`);
      } catch { /* réseau : on réessaie */ }
      if (!pret) { process.stdout.write("."); await new Promise((r) => setTimeout(r, 10000)); }
    }
    console.log(pret ? " en ligne." : " (délai dépassé : on envoie quand même).");
  }
}

// ----- 4. Notification -----
if (options["sans-notif"]) { console.log("\n--sans-notif : aucune notification envoyée."); process.exit(0); }
const envoi = spawnSync(process.execPath, [join(racine, "tools", "notifier.mjs"), "--date", date, "--lieu", lieu], { stdio: "inherit", env: process.env });
process.exit(envoi.status ?? 0);
