// Programme des concerts : chargement, tri (heure de Paris), affichage.
import { esc, urlSure, attrsLien, apercuConcerts, FLECHE } from "./outils.js";

const FUSEAU = "Europe/Paris";
const STATUTS = {
  "entree-libre": "Entrée libre",
  complet: "Complet",
  annule: "Annulé",
};

// Date et heure actuelles à Paris, quel que soit le fuseau de l'appareil.
export function maintenantParis() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}

// Les dates du fichier sont des dates calendaires françaises :
// on les formate en UTC à midi pour éviter tout décalage de jour.
function dateCivile(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j, 12));
}
const fmt = (options) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options });
const fmtJourSemaine = fmt({ weekday: "long" });
const fmtMoisCourt = fmt({ month: "short" });
const fmtComplet = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function heureFr(h) {
  if (!h) return "";
  const [hh, mm] = h.split(":");
  return `${Number(hh)} h${mm && mm !== "00" ? ` ${mm}` : ""}`;
}

function normaliser(brut) {
  const liste = Array.isArray(brut?.concerts) ? brut.concerts : [];
  return liste.filter((c, i) => {
    const ok = c && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && !Number.isNaN(dateCivile(c.date).getTime()) && c.lieu;
    if (!ok) console.warn(`[concerts] Entrée n°${i + 1} ignorée : il faut au moins "date" (AAAA-MM-JJ) et "lieu".`, c);
    if (ok && c.heure && !/^\d{1,2}:\d{2}$/.test(c.heure)) {
      console.warn(`[concerts] Heure invalide pour ${c.date} (format attendu HH:MM) — heure ignorée.`);
      c.heure = "";
    }
    return ok;
  }).map((c) => ({
    date: c.date,
    nom: String(c.nom ?? "").trim(),
    heure: c.heure ? c.heure.padStart(5, "0") : "",
    lieu: String(c.lieu).trim(),
    ville: String(c.ville ?? "").trim(),
    info: String(c.info ?? "").trim(),
    lien: urlSure(c.lien),
    lienTexte: String(c.lienTexte ?? "").trim(),
    statut: STATUTS[c.statut] ? c.statut : "",
    affiche: urlSure(c.affiche),
  }));
}

export function trier(concerts) {
  const { date: aujourdhui } = maintenantParis();
  const cle = (c) => `${c.date}T${c.heure || "00:00"}`;
  const aVenir = concerts.filter((c) => c.date >= aujourdhui).sort((a, b) => cle(a).localeCompare(cle(b)));
  const passes = concerts.filter((c) => c.date < aujourdhui).sort((a, b) => cle(b).localeCompare(cle(a)));
  const prochain = aVenir.find((c) => c.statut !== "annule") || null;
  return { aVenir, passes, prochain, aujourdhui };
}

// Chargement : le service worker sert la version réseau si possible,
// sinon la dernière version enregistrée (signalée par un en-tête).
export async function chargerConcerts() {
  const url = apercuConcerts ? "data/concerts.exemple.json" : "data/concerts.json";
  const rep = await fetch(url, { cache: "no-cache" });
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  const donnees = await rep.json();
  const depuisCache = rep.headers.get("x-sw-depuis-cache") === "1";
  const enregistreLe = Number(rep.headers.get("x-sw-enregistre")) || null;
  return { concerts: normaliser(donnees), depuisCache, enregistreLe };
}

const libelleStatut = (c) => (c.statut ? ` <span class="statut statut--${c.statut}">${STATUTS[c.statut]}</span>` : "");
const jour2 = (d) => String(d.getUTCDate()).padStart(2, "0");
const lienActif = (c) => c.lien && c.statut !== "annule";

// Itinéraire : ouvre l'application de cartes de l'appareil (ou Google Maps) vers le lieu, sans rien charger au préalable.
export const itineraireUrl = (c) =>
  "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent([c.lieu, c.ville].filter(Boolean).join(", "));
const peutAller = (c) => c.lieu && c.statut !== "annule";
const lienItineraire = (c, classe) =>
  peutAller(c) ? `<a class="${classe}" href="${esc(itineraireUrl(c))}" target="_blank" rel="noopener noreferrer" aria-label="Itinéraire vers ${esc(c.lieu)} (nouvelle fenêtre)">Itinéraire</a>` : "";
const boutonPartage = (c, classe) =>
  c.statut !== "annule" ? `<button type="button" class="${classe}" data-partager-date="${esc(JSON.stringify(c))}" aria-label="Partager le concert ${esc(descriptionAccessible(c))}">Partager</button>` : "";
const descriptionAccessible = (c) => `${c.lieu}, ${fmtComplet.format(dateCivile(c.date))}`;

const fmtJourCourt = fmt({ weekday: "short" });
const fmtMoisCourt2 = fmt({ month: "short" });

// La carte de l'annonce : une petite affiche, la date en grand, le lieu et l'horaire.
// Une date sans horaire affiche « Horaire à confirmer ».
function blocProchain(c, aujourdhui) {
  const d = dateCivile(c.date);
  const quand = c.date === aujourdhui
    ? "Ce soir"
    : `${fmtJourCourt.format(d)} ${d.getUTCDate()} ${fmtMoisCourt2.format(d)}${d.getUTCFullYear() !== dateCivile(aujourdhui).getUTCFullYear() ? " " + d.getUTCFullYear() : ""}`;
  const lieu = [c.lieu, c.ville && c.ville !== c.lieu ? c.ville : ""].filter(Boolean).map(esc).join("<br>"); // salle, puis ville à la ligne
  const horaire = c.heure ? heureFr(c.heure) : "";
  const legende = [c.lieu, c.ville].filter(Boolean).join(", ");
  const affiche = c.affiche
    ? `<button type="button" class="prochaine__affiche" data-affiche="${esc(c.affiche)}-1200.webp" data-legende="${esc(legende)}" aria-label="Agrandir l’affiche">
        <img src="${esc(c.affiche)}-480.webp" alt="Affiche : ${esc(descriptionAccessible(c))}" decoding="async">
      </button>`
    : "";
  const lien = lienActif(c)
    ? `<a class="bouton bouton--plein" href="${esc(c.lien)}"${attrsLien(c.lien)}>${esc(c.lienTexte || (c.statut === "complet" ? "Infos" : "Billetterie"))} ${FLECHE}</a>`
    : "";
  return `
    <article class="prochaine${affiche ? "" : " prochaine--sans-affiche"}" aria-labelledby="prochain-quand">
      ${affiche}
      <div class="prochaine__corps">
        <p class="prochaine__label">${c.date === aujourdhui ? "C’est ce soir" : "Prochain concert"}${libelleStatut(c)}</p>
        ${c.nom ? `<p class="prochaine__nom">${esc(c.nom)}</p>` : ""}
        <button type="button" class="prochaine__voir" data-annonce="${esc(JSON.stringify(c))}">★ Voir l’annonce</button>
        <p class="visuellement-cache">${esc(fmtComplet.format(d))}</p>
        <h3 class="prochaine__date" id="prochain-quand" aria-hidden="true">${esc(quand)}</h3>
        <p class="prochaine__lieu">${lieu}</p>
        <p class="prochaine__heure${horaire ? "" : " est-vide"}">${horaire ? esc(horaire) : "Horaire à confirmer"}</p>
        ${c.info ? `<p class="prochaine__info">${esc(c.info)}</p>` : ""}
      </div>
      <div class="prochaine__actions">
        ${lien}
        <button type="button" class="bouton bouton--trait" data-ics="${esc(JSON.stringify(c))}">Ajouter à l’agenda</button>
        ${lienItineraire(c, "bouton bouton--trait")}
        ${boutonPartage(c, "bouton bouton--trait")}
      </div>
    </article>`;
}

// Quand rien n'est annoncé : seulement « À venir… » et une affiche vide, au point d'interrogation
// qui bouge (la carte « avec une date » reprend la même mise en page).
function blocAttente() {
  // Deux projecteurs de part et d'autre du titre « Prochaine date », dont les faisceaux se rejoignent
  // sur un micro. Tout est graphique, sauf « À venir… ».
  return `
    <article class="prochaine prochaine--attente" aria-label="Aucune date annoncée pour le moment">
      <div class="scene-cadre">
        <svg class="scene" viewBox="0 0 360 114" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="faisceau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d6" stop-opacity=".6"/><stop offset=".8" stop-color="#ffd48a" stop-opacity=".1"/><stop offset="1" stop-color="#ffd48a" stop-opacity="0"/></linearGradient>
            <linearGradient id="sol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eeebe4" stop-opacity="0"/><stop offset=".5" stop-color="#eeebe4" stop-opacity=".8"/><stop offset="1" stop-color="#eeebe4" stop-opacity="0"/></linearGradient>
          </defs>
          <rect x="20" y="108" width="320" height="1.6" fill="url(#sol)"/>
          <g class="scene__lampe scene__lampe--g"><polygon points="12,2 28,2 214,110 146,110" fill="url(#faisceau)"/></g>
          <g class="scene__lampe scene__lampe--d"><polygon points="332,2 348,2 214,110 146,110" fill="url(#faisceau)"/></g>
          <g class="scene__poussiere" fill="#fff3d6" transform="translate(0 12)"><circle cx="150" cy="70" r="1.2"/><circle cx="168" cy="52" r="1"/><circle cx="196" cy="62" r="1.3"/><circle cx="210" cy="78" r="1"/><circle cx="135" cy="80" r="1"/><circle cx="222" cy="56" r="1.1"/><circle cx="180" cy="40" r="1"/></g>
          <g transform="translate(180 108.5) scale(.72) translate(-180 -94)"><g class="scene__micro" fill="none" stroke="#eeebe4" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M180 94V62"/><path d="M166 94h28"/><path d="M180 62c0-7-7-8-7-14"/>
            <rect x="165" y="28" width="16" height="25" rx="8" transform="rotate(-18 173 40)" fill="#151514"/>
            <path d="M166 40l15 5.5M167 47l15 5.5" transform="rotate(-18 173 40)" stroke-width="1.3" opacity=".55"/>
          </g></g>
          <g class="scene__tetes" fill="#eeebe4"><rect x="8" y="-2" width="24" height="6" rx="2"/><rect x="328" y="-2" width="24" height="6" rx="2"/></g>
        </svg>
      </div>
      <h3 class="prochaine__stay">À venir…</h3>
    </article>`;
}

// Une ligne de la liste des dates à venir (sous la carte du prochain concert).
export function ligneDate(c) {
  const d = dateCivile(c.date);
  const meta = [esc(c.ville), heureFr(c.heure)].filter(Boolean).join(" · ");
  const lien = lienActif(c)
    ? `<a class="date__lien" href="${esc(c.lien)}"${attrsLien(c.lien)}>${FLECHE}<span class="visuellement-cache">${esc(c.lienTexte || "Billetterie et infos")} — ${esc(descriptionAccessible(c))}</span></a>`
    : "<span></span>";
  return `
    <li class="date${c.statut === "annule" ? " est-annule" : ""}">
      <p class="date__quand">
        <span class="visuellement-cache">${esc(fmtComplet.format(d))}</span>
        <span aria-hidden="true"><span class="date__jour">${jour2(d)}</span><span class="date__mois">${esc(fmtMoisCourt.format(d))} ${String(d.getUTCFullYear()).slice(2)}</span></span>
      </p>
      <div>
        <h4 class="date__lieu">${esc(c.lieu)}</h4>
        <p class="date__meta">${meta}${libelleStatut(c)}${c.info ? `<br>${esc(c.info)}` : ""}</p>
        ${peutAller(c) ? `<p class="date__actions">${lienItineraire(c, "date__action")}${boutonPartage(c, "date__action")}</p>` : ""}
      </div>
      ${lien}
    </li>`;
}

// Annonce centrée sous l'en-tête : affiche + billet du prochain concert,
// ou la carte vide « À venir… » quand rien n'est annoncé.
export function rendreConcerts(conteneur, listeSuivantes, { aVenir, prochain, aujourdhui }) {
  conteneur.innerHTML = prochain ? blocProchain(prochain, aujourdhui) : blocAttente();

  const autres = aVenir.filter((c) => c !== prochain);
  listeSuivantes.innerHTML = autres.map(ligneDate).join("");
  listeSuivantes.hidden = !autres.length;
}

// Affiches des dates passées : une tuile par affiche (une affiche peut couvrir plusieurs dates).
const fmtCourt = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(2, 4);
export function tuilesAffiches(passes) {
  const groupes = new Map();
  for (const c of passes) {
    if (!c.affiche) continue;
    if (!groupes.has(c.affiche)) groupes.set(c.affiche, []);
    groupes.get(c.affiche).push(c);
  }
  return [...groupes].map(([base, dates]) => {
    const legende = dates.slice().reverse().map((c) => `${fmtCourt(c.date)} ${c.ville || c.lieu}`).join(" · ");
    const alt = `Affiche : ${dates.map((c) => `${c.lieu}, ${fmtComplet.format(dateCivile(c.date))}`).join(" ; ")}`;
    return `
      <li class="affiche">
        <button type="button" data-affiche="${esc(base)}-1200.webp" data-legende="${esc(legende)}">
          <img src="${esc(base)}-480.webp" alt="${esc(alt)}" loading="lazy" decoding="async">
        </button>
      </li>`;
  }).join("");
}

// Fichier agenda (.ics) généré localement, heure de Paris.
export function telechargerIcs(c, nomGroupe) {
  const echap = (t) => String(t).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const compact = (iso) => iso.replaceAll("-", "");
  const lendemain = new Date(dateCivile(c.date).getTime() + 864e5).toISOString().slice(0, 10);
  let debut, fin;
  if (c.heure) {
    const [h, m] = c.heure.split(":").map(Number);
    const finH = h + 2; // durée indicative : 2 h
    const pad = (n) => String(n).padStart(2, "0");
    debut = `DTSTART;TZID=${FUSEAU}:${compact(c.date)}T${pad(h)}${pad(m)}00`;
    fin = `DTEND;TZID=${FUSEAU}:${compact(finH >= 24 ? lendemain : c.date)}T${pad(finH % 24)}${pad(m)}00`;
  } else {
    debut = `DTSTART;VALUE=DATE:${compact(c.date)}`;
    fin = `DTEND;VALUE=DATE:${compact(lendemain)}`;
  }
  const lignes = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Drop Out//Concerts//FR", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${compact(c.date)}-${c.lieu.replace(/\W+/g, "").toLowerCase()}@dropout`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    debut, fin,
    `SUMMARY:${echap(`${nomGroupe} — ${c.lieu}`)}`,
    `LOCATION:${echap([c.lieu, c.ville].filter(Boolean).join(", "))}`,
    c.info || c.lien ? `DESCRIPTION:${echap([c.info, c.lien].filter(Boolean).join("\n"))}` : "",
    c.lien ? `URL:${c.lien}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lignes.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  a.download = `drop-out-${c.date}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Données structurées (moteurs de recherche) pour les dates à venir.
export function donneesStructurees(aVenir, nomGroupe) {
  document.querySelector("script[data-jsonld-concerts]")?.remove();
  if (!aVenir.length || apercuConcerts) return;
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.dataset.jsonldConcerts = "";
  s.textContent = JSON.stringify(aVenir.map((c) => ({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `${nomGroupe} — ${c.lieu}`,
    startDate: c.heure ? `${c.date}T${c.heure}` : c.date,
    eventStatus: c.statut === "annule" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: c.lieu, address: c.ville || undefined },
    performer: { "@type": "MusicGroup", name: nomGroupe },
    ...(c.lien ? { url: c.lien } : {}),
  })));
  document.head.append(s);
}

export const formatEnregistrement = (ts) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    .format(new Date(ts)).replace(":", " h ");
