// envoie une notification à tous les abonnés.
//   node tools/notifier.mjs "Titre" "Texte" [adresse]     message libre
//   node tools/notifier.mjs --date 2026-11-21              annonce le concert de cette date (affiche, lieu, itinéraire)
//   node tools/notifier.mjs --nouvelles ancien.json        annonce les dates absentes de l'ancien fichier (utilisé par github)
//   --essai pour voir ce qui serait envoyé sans rien envoyer
// réglages : variables NOTIF_SERVEUR, NOTIF_MDP et NOTIF_SITE, ou notifications/.secret.json :
//   { "serveur": "https://drop-out-notifications.xxx.workers.dev", "mdp": "mot-de-passe-ADMIN", "site": "https://monnom.github.io/drop-out/" }
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const essai = args.includes("--essai");
const libres = args.filter((a) => a !== "--essai");

let fichier = {};
try { fichier = JSON.parse(readFileSync(new URL("../notifications/.secret.json", import.meta.url), "utf8")); } catch { /* variables d'environnement */ }
const serveur = process.env.NOTIF_SERVEUR || fichier.serveur;
const mdp = process.env.NOTIF_MDP || fichier.mdp;
const site = (process.env.NOTIF_SITE || fichier.site || "").replace(/\/?$/, "/");
if (!essai && !/^https:\/\//.test(site)) { console.error("Adresse du site manquante (NOTIF_SITE ou « site » dans notifications/.secret.json, en https)."); process.exit(1); }
if (!essai && (!serveur || !mdp)) { console.error("Serveur ou mot de passe manquant (voir notifications/LISEZ-MOI.md)."); process.exit(1); }

const lireConcerts = (chemin) => JSON.parse(readFileSync(chemin, "utf8")).concerts || [];
const cle = (c) => `${c.date}|${c.lieu}`;
const jourCourt = (iso) => {
  const [a, m, j] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};
const heureFr = (h) => (h ? h.replace(":", " h ").replace(/ h 00$/, " h") : "");

// lien « Ajouter à Google Agenda » : l'événement arrive rempli (titre, date, heure de Paris, lieu), il reste à valider.
// mêmes règles que le .ics du site : 2 h sans autre indication, journée entière sans heure
function lienAgenda(c) {
  const compact = (iso) => iso.replaceAll("-", "");
  const lendemain = (iso) => new Date(Date.parse(iso + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
  let dates;
  if (c.heure) {
    const [h, m] = c.heure.split(":").map(Number), pad = (x) => String(x).padStart(2, "0");
    const fin = h + 2;
    dates = `${compact(c.date)}T${pad(h)}${pad(m)}00/${compact(fin >= 24 ? lendemain(c.date) : c.date)}T${pad(fin % 24)}${pad(m)}00`;
  } else {
    dates = `${compact(c.date)}/${compact(lendemain(c.date))}`;
  }
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Drop Out — ${c.nom || c.lieu}`,
    dates,
    ctz: "Europe/Paris",
    location: [c.lieu, c.ville].filter(Boolean).join(", "),
    details: [c.info, c.lien].filter(Boolean).join("\n"),
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

// un concert devient un message : titre, texte, lien dans l'appli, affiche, agenda, itinéraire
function messageDe(c, plusieurs = false) {
  const quand = jourCourt(c.date) + (c.heure ? " à " + heureFr(c.heure) : "");
  return {
    titre: plusieurs ? "Nouvelles dates — Drop Out" : (c.nom || "Nouvelle date — Drop Out"),
    texte: `${quand} · ${[c.lieu, c.ville && c.ville !== c.lieu ? c.ville : ""].filter(Boolean).join(", ")}`,
    url: `${site}?annonce=${encodeURIComponent(cle(c))}#dates`,
    image: c.affiche ? `${site}${c.affiche}-1200.webp` : "",
    agenda: lienAgenda(c), // bouton « Ajouter à l'agenda » (android)
    itineraire: c.lieu ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent([c.lieu, c.ville].filter(Boolean).join(", ")) : "",
  };
}

let messages;
const iDate = args.indexOf("--date"), iNouv = args.indexOf("--nouvelles");
if (iDate >= 0) {
  const iLieu = args.indexOf("--lieu");
  const c = lireConcerts(new URL("../data/concerts.json", import.meta.url)).find((x) => x.date === args[iDate + 1] && (iLieu < 0 || x.lieu === args[iLieu + 1]));
  if (!c) { console.error("Aucun concert à cette date dans data/concerts.json."); process.exit(1); }
  messages = [messageDe(c)];
} else if (iNouv >= 0) {
  const avant = new Set(lireConcerts(args[iNouv + 1]).map(cle));
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const nouvelles = lireConcerts(new URL("../data/concerts.json", import.meta.url))
    .filter((c) => !avant.has(cle(c)) && c.date >= aujourdhui && c.statut !== "annule")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!nouvelles.length) { console.log("Aucune nouvelle date à annoncer."); process.exit(0); }
  // une seule notification même si plusieurs dates arrivent : la première, avec le total dans le texte
  const m = messageDe(nouvelles[0], nouvelles.length > 1);
  if (nouvelles.length > 1) m.texte += ` (et ${nouvelles.length - 1} autre${nouvelles.length > 2 ? "s" : ""})`;
  messages = [m];
} else {
  const [titre, texte = "", url = ""] = libres;
  if (!titre) { console.error('Usage : node tools/notifier.mjs "Titre" "Texte" [adresse]   |   --date AAAA-MM-JJ   |   --nouvelles ancien.json'); process.exit(1); }
  messages = [{ titre, texte, url: url ? new URL(url, site || "https://exemple.invalid/").href : "" }];
}

for (const message of messages) {
  if (essai) { console.log("[essai] message :", JSON.stringify(message, null, 2)); continue; }
  let curseur = null, envoyes = 0, supprimes = 0, echecs = 0;
  do {
    const rep = await fetch(serveur.replace(/\/$/, "") + "/envoyer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + mdp },
      body: JSON.stringify({ ...message, curseur }),
    });
    if (!rep.ok) { console.error("Refusé par le serveur :", rep.status, await rep.text()); process.exit(1); }
    const r = await rep.json();
    envoyes += r.envoyes; supprimes += r.supprimes; echecs += r.echecs; curseur = r.curseur;
  } while (curseur);
  console.log(`« ${message.titre} » envoyée à ${envoyes} appareil(s)${supprimes ? `, ${supprimes} abonnement(s) périmé(s) retiré(s)` : ""}${echecs ? `, ${echecs} échec(s)` : ""}.`);
}
