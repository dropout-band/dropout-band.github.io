/*
 * Service worker — Drop Out
 *
 * Stratégie :
 * - Pages, CSS, JS, contenu et concerts : RÉSEAU D'ABORD.
 *   Une version en ligne est toujours prioritaire ; le cache ne sert
 *   qu'en cas d'absence de réseau (ou de réseau très lent).
 * - Images et polices : cache d'abord (elles changent rarement).
 *
 * Tous les chemins sont relatifs à ce fichier : le site fonctionne
 * à la racine d'un domaine comme dans un sous-dossier GitHub Pages.
 *
 * Alertes « nouvelle date » : sans serveur, via la synchronisation
 * périodique du navigateur (Chrome / Edge / Samsung Internet sur Android,
 * site installé sur l'écran d'accueil). Le navigateur décide de la
 * fréquence réelle (en général quelques fois par jour au plus).
 *
 * Après avoir ajouté des fichiers essentiels, augmentez VERSION.
 */
const VERSION = "v180";
const CACHE_PAGES = `dropout-pages-${VERSION}`;
const CACHE_MEDIAS = `dropout-medias-${VERSION}`;
const DELAI_RESEAU = 4000; // ms avant de se rabattre sur le cache

const ESSENTIELS = [
  "./",
  "app/",
  "assets/css/application.css",
  "assets/js/installer.js",
  "assets/js/aide-installation.js",
  "assets/js/oeil.js",
  "assets/js/intro.js",
  "assets/js/navigation.js",
  "offline.html",
  "manifest.webmanifest",
  "assets/css/style.css",
  "assets/js/main.js",
  "assets/js/outils.js",
  "assets/js/concerts.js",
  "assets/js/pwa.js",
  "assets/js/alertes.js",
  "content/site.js",
  "data/concerts.json",
];
const MEDIAS_ESSENTIELS = [
  "assets/fonts/bricolage-grotesque.woff2", // page hors connexion (offline.html)
  "assets/fonts/anton.woff2",
  "assets/fonts/barlow-condensed-400.woff2",
  "assets/fonts/barlow-condensed-500.woff2",
  "assets/fonts/barlow-condensed-700.woff2",
  "assets/logo/logo-blanc-600.webp",
  "assets/logo/logo-sans-oeil-600.webp",
  "assets/logo/logo-oeil-76.webp",
  "assets/icons/icon-192.png",
  "assets/img/hero-groupe-800.webp",
  "assets/img/hero-groupe-1400.webp",
];

// Copie la réponse en y ajoutant la date d'enregistrement.
async function enregistrer(cache, requete, reponse) {
  const entetes = new Headers(reponse.headers);
  entetes.set("x-sw-enregistre", String(Date.now()));
  const copie = new Response(await reponse.clone().blob(), {
    status: reponse.status, statusText: reponse.statusText, headers: entetes,
  });
  await cache.put(requete, copie);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const pages = await caches.open(CACHE_PAGES);
    await Promise.all(ESSENTIELS.map(async (url) => {
      const rep = await fetch(url, { cache: "reload" });
      if (rep.ok) await enregistrer(pages, url, rep);
    }));
    const medias = await caches.open(CACHE_MEDIAS);
    await medias.addAll(MEDIAS_ESSENTIELS).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const garder = [CACHE_PAGES, CACHE_MEDIAS];
    for (const nom of await caches.keys()) {
      if (nom.startsWith("dropout-") && !garder.includes(nom)) await caches.delete(nom);
    }
    await self.clients.claim();
  })());
});

function depuisCache(reponse) {
  const entetes = new Headers(reponse.headers);
  entetes.set("x-sw-depuis-cache", "1");
  return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: entetes });
}

function cleNavigation(adresse) {
  const u = new URL(adresse);
  u.search = "";
  u.hash = "";
  u.pathname = u.pathname.replace(/index\.html$/, "");
  return u.href;
}

async function reseauDabord(event, requete) {
  const cache = await caches.open(CACHE_PAGES);
  // Une page = une entrée de cache, sans ?paramètres ni #ancre (?apercu, ?agenda…) : l'accueil et
  // la page « application » ne s'écrasent pas. « …/index.html » et « …/ » sont la même page.
  const cle = requete.mode === "navigate" ? cleNavigation(requete.url) : requete.url.split("?")[0];

  // Appareil explicitement hors ligne : inutile d'attendre le réseau.
  if (self.navigator.onLine === false) {
    const enCache = await cache.match(cle);
    if (enCache) return depuisCache(enCache);
  }

  const reseau = fetch(requete).then(async (rep) => {
    if (rep.ok && rep.type === "basic") {
      await enregistrer(cache, cle, rep.clone());
      // Le visiteur voit le programme : ces dates ne déclencheront pas d'alerte.
      if (cle.endsWith("/data/concerts.json")) await memoriserDates(await rep.clone().json().catch(() => null));
    }
    return rep;
  });
  // La mise à jour du cache continue même si l'on répond avec le cache.
  event.waitUntil(reseau.catch(() => {}));

  const delai = new Promise((resolve) => setTimeout(resolve, DELAI_RESEAU, "delai"));
  try {
    const gagnant = await Promise.race([reseau, delai]);
    if (gagnant !== "delai") return gagnant;
    const enCache = await cache.match(cle);
    return enCache ? depuisCache(enCache) : await reseau;
  } catch {
    const enCache = await cache.match(cle);
    if (enCache) return depuisCache(enCache);
    if (requete.mode === "navigate") {
      const horsLigne = await cache.match("offline.html") || await cache.match(new URL("offline.html", self.registration.scope).href);
      if (horsLigne) return horsLigne;
    }
    return new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheDabord(requete) {
  const cache = await caches.open(CACHE_MEDIAS);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  try {
    const rep = await fetch(requete);
    if (rep.ok && rep.type === "basic") cache.put(requete, rep.clone());
    return rep;
  } catch {
    return new Response("", { status: 504 });
  }
}

/* ---------- Alertes « nouvelle date » ---------- */

const CACHE_ALERTES = "alertes-dropout"; // hors versions : survit aux mises à jour
const TAG_ALERTES = "dropout-nouvelles-dates";

async function lireEtat() {
  const rep = await (await caches.open(CACHE_ALERTES)).match("etat");
  return rep ? rep.json() : { actif: false, connues: null };
}
async function ecrireEtat(etat) {
  await (await caches.open(CACHE_ALERTES)).put("etat", new Response(JSON.stringify(etat), { headers: { "Content-Type": "application/json" } }));
}

// Dates à venir (heure de Paris), identifiées par « date|lieu ».
function datesAVenir(donnees) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const aujourdhui = `${p.year}-${p.month}-${p.day}`;
  return (Array.isArray(donnees?.concerts) ? donnees.concerts : [])
    .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.lieu && c.date >= aujourdhui && c.statut !== "annule")
    .sort((a, b) => a.date.localeCompare(b.date));
}
const idDate = (c) => `${c.date}|${c.lieu}`;

// Lien Google Agenda : l'événement s'ouvre déjà rempli (titre, jour, heure de Paris, lieu),
// il ne reste qu'à toucher « Enregistrer ». Durée indicative de 2 h, comme le fichier .ics.
function lienGoogleAgenda(c) {
  const compact = (iso) => iso.replaceAll("-", "");
  const lendemain = new Date(Date.parse(`${c.date}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  let dates = `${compact(c.date)}/${compact(lendemain)}`; // sans heure : toute la journée
  const h = /^(\d{1,2}):(\d{2})$/.exec(c.heure || "");
  if (h) {
    const [hh, mm] = [Number(h[1]), Number(h[2])], fin = hh + 2;
    dates = `${compact(c.date)}T${pad(hh)}${pad(mm)}00/${compact(fin >= 24 ? lendemain : c.date)}T${pad(fin % 24)}${pad(mm)}00`;
  }
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Drop Out — ${c.lieu}`,
    dates,
    ctz: "Europe/Paris",
    location: [c.lieu, c.ville].filter(Boolean).join(", "),
    details: [c.info, c.lien, self.registration.scope].filter(Boolean).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

async function memoriserDates(donnees) {
  if (!donnees) return;
  const etat = await lireEtat();
  etat.connues = [...new Set([...(etat.connues || []), ...datesAVenir(donnees).map(idDate)])];
  await ecrireEtat(etat);
}

async function verifierNouvellesDates() {
  const etat = await lireEtat();
  if (!etat.actif) return;
  const rep = await fetch(new URL("data/concerts.json", self.registration.scope), { cache: "no-store" });
  if (!rep.ok) return;
  const aVenir = datesAVenir(await rep.json());
  const connues = new Set(etat.connues || []);
  const nouvelles = aVenir.filter((c) => !connues.has(idDate(c)));
  etat.connues = [...new Set([...connues, ...aVenir.map(idDate)])];
  await ecrireEtat(etat);
  if (!nouvelles.length) return;

  const c = nouvelles[0];
  const [a, m, j] = c.date.split("-").map(Number);
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(a, m - 1, j, 12)));
  await self.registration.showNotification(nouvelles.length > 1 ? `${nouvelles.length} nouvelles dates — Drop Out` : "Nouvelle date — Drop Out", {
    body: nouvelles.length > 1 ? `Dont ${quand} · ${c.lieu}${c.ville ? `, ${c.ville}` : ""}` : `${quand} · ${c.lieu}${c.ville ? `, ${c.ville}` : ""}`,
    icon: new URL("assets/icons/icon-192.png", self.registration.scope).href,
    tag: "dropout-nouvelle-date",
    // Une seule nouvelle date : un bouton « Ajouter à l’agenda », et un toucher sur la notification
    // ouvrent le site sur cette date (?agenda=…), où un seul geste l’ajoute à l’agenda du téléphone.
    // Plusieurs dates : on ouvre simplement la liste.
    actions: nouvelles.length === 1 ? [{ action: "agenda", title: "Ajouter à l’agenda" }] : [],
    data: { agenda: nouvelles.length === 1 ? lienGoogleAgenda(c) : "", url: new URL(nouvelles.length === 1 ? `./?agenda=${encodeURIComponent(idDate(c))}#dates` : "./?site#dates", self.registration.scope).href },
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === TAG_ALERTES) event.waitUntil(verifierNouvellesDates().catch(() => {}));
});

// La page active ou coupe les alertes.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "alertes") return;
  event.waitUntil((async () => {
    const etat = await lireEtat();
    etat.actif = Boolean(event.data.actif);
    await ecrireEtat(etat);
  })());
});

// Notification « push » envoyée par le serveur (tools/notifier.mjs) : { titre, texte, url }.
// Le navigateur exige qu'une notification soit toujours affichée à la réception d'un message.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { texte: event.data ? event.data.text() : "" }; }
  let url = new URL("./?site#dates", self.registration.scope).href;
  try { const u = new URL(d.url || "", self.registration.scope); if (u.origin === self.location.origin) url = u.href; } catch { /* adresse illisible : accueil */ }
  // Affiche en grand et bouton « Itinéraire » : affichés par Android ; ignorés ailleurs (iPhone : titre et texte).
  let itineraire = "";
  try { const u = new URL(d.itineraire || ""); if (u.protocol === "https:") itineraire = u.href; } catch { /* pas d'itinéraire */ }
  let image = "";
  try { const u = new URL(d.image || ""); if (u.origin === self.location.origin) image = u.href; } catch { /* pas d'affiche */ }
  event.waitUntil(self.registration.showNotification(d.titre || "Drop Out", {
    body: d.texte || "",
    icon: new URL("assets/icons/icon-192.png", self.registration.scope).href,
    ...(image ? { image } : {}),
    ...(itineraire ? { actions: [{ action: "itineraire", title: "Itinéraire" }] } : {}),
    tag: "dropout-push",
    data: { url, itineraire },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const donnees = event.notification.data || {};
  // Bouton « Ajouter à l'agenda » : Google Agenda s'ouvre avec l'événement déjà rempli
  // (nouvel onglet : le site reste ouvert à côté). Sinon : le site, sur cette date.
  if (event.action === "itineraire" && donnees.itineraire) { event.waitUntil(self.clients.openWindow(donnees.itineraire)); return; }
  if (event.action === "agenda" && donnees.agenda) { event.waitUntil(self.clients.openWindow(donnees.agenda)); return; }
  const url = donnees.url || self.registration.scope;
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const ouverte = fenetres.find((f) => f.url.startsWith(self.registration.scope));
    if (ouverte) { await ouverte.navigate(url).catch(() => {}); return ouverte.focus(); }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // YouTube, plateformes… : non gérés
  // Audio et vidéo : le navigateur gère lui-même la lecture en flux et le déplacement dans le média
  if (/\.(mp3|ogg|oga|m4a|aac|wav|opus|mp4|webm|m4v|mov)$/i.test(url.pathname)) return;

  if (/\.(webp|avif|jpe?g|png|svg|gif|woff2?|pdf)$/i.test(url.pathname)) {
    event.respondWith(cacheDabord(requete));
  } else {
    event.respondWith(reseauDabord(event, requete));
  }
});
