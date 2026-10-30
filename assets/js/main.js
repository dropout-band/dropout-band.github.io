import contenu from "../../content/site.js";
import { esc, urlSure, attrsLien, aRenseigner, brouillon, apercuConcerts, mouvementReduit, toast, copier } from "./outils.js";
import { itineraireUrl, heureFr, chargerConcerts, trier, rendreConcerts, tuilesAffiches, telechargerIcs, donneesStructurees, formatEnregistrement } from "./concerts.js";
import { initPwa } from "./pwa.js";
import { initAlertes } from "./alertes.js";
import { initOeil } from "./oeil.js";
import { initIntro } from "./intro.js";
import { initRetour, initMenu } from "./navigation.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lire = (chemin) => chemin.split(".").reduce((o, k) => o?.[k], contenu);
const nomGroupe = contenu.groupe?.nom || "Drop Out";
const avecUrl = (liste) => (liste || []).map((l) => ({ ...l, url: urlSure(l.url) })).filter((l) => l.nom && l.url);

if (brouillon) {
  document.documentElement.classList.add("est-brouillon");
}

/* textes simples */

$$("[data-texte]").forEach((el) => {
  const valeur = lire(el.dataset.texte);
  if (valeur) el.textContent = valeur;
  else el.hidden = true;
});

/* icônes des liens externes : tracé fin, monochrome, 20 px, dans une zone cliquable de 44 px. l'icône dépend de l'adresse */

const trace = (contenuSvg) => `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${contenuSvg}</svg>`;
const ICONES = {
  instagram: trace('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.1" cy="6.9" r=".6" fill="currentColor"/>'),
  facebook: trace('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 8.2h-1.4a2 2 0 0 0-2 2v10.3M9.2 13.2h5"/>'),
  site: trace('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>'),
};
const iconeDe = (url) => (/instagram\.com/i.test(url) ? ICONES.instagram : /facebook\.com/i.test(url) ? ICONES.facebook : ICONES.site);
const lienIcone = (url, libelle) =>
  `<a class="lien-icone" href="${esc(url)}"${attrsLien(url)} aria-label="${esc(libelle)}" title="${esc(libelle)}">${iconeDe(url)}</a>`;

/* texte de présentation : accroche (1er paragraphe), paragraphes, chute (le dernier, mis en avant) */

function rendrePresentation() {
  const zone = $("[data-presentation]");
  const textes = (contenu.groupe?.presentation || []).map((t) => String(t).trim()).filter(Boolean);
  if (!zone || !textes.length) return;
  const dernier = textes.length - 1;
  zone.innerHTML = textes.map((t, i) => `<p class="presentation__${i === 0 ? "accroche" : i === dernier && dernier > 1 ? "chute" : "texte"}">${esc(t)}</p>`).join("");
  zone.hidden = false;
}

/* membres */

function photoMembre(ph) {
  if (!ph?.base && !ph?.src) return '<div class="membre__photo membre__photo--vide">Photo à venir</div>';
  const base = ph.base ? urlSure(ph.base) : "";
  const src = ph.src ? urlSure(ph.src) : `${base}-640.webp`;
  const srcset = ph.base ? ` srcset="${esc(`${base}-400.webp 400w, ${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1280.webp 1280w`)}"` : "";
  return `<div class="membre__photo"><img src="${esc(src)}"${srcset} sizes="(min-width: 64rem) 22rem, (orientation: landscape) and (max-height: 540px) 19vw, 46vw"
    width="800" height="1000" alt="${esc(ph.alt || "")}" loading="lazy" decoding="async"
    style="object-position:${esc(ph.position || "50% 25%")}"></div>`;
}

// couleur du membre (#rrggbb) et encre lisible dessus (noir ou blanc selon la luminance)
function styleCouleur(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return "";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const encre = (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? "#0a0a0a" : "#eeebe4";
  return ` style="--couleur:${hex};--encre:${encre}"`;
}

function rendreMembres() {
  $("[data-membres]").innerHTML = (contenu.membres || []).map((m, i) => `
    <li class="membre" data-i="${i}" tabindex="0"${styleCouleur(m.couleur).replace(/"$/, `;--n:${i}"`) || ` style="--n:${i}"`}>
      ${photoMembre(m.photo)}
      ${(m.traits || []).filter(Boolean).length ? `<ul class="membre__traits" aria-label="${esc(`${m.nom || "Ce membre"} en quelques mots`)}">${m.traits.filter(Boolean).map((t, j) => `<li style="--rang:${j}">${esc(t)}</li>`).join("")}</ul>` : ""}
      ${m.nom && m.role ? `<p class="membre__role">${esc(m.role)}</p>` : ""}
      <div class="membre__etiquette">
        <p class="membre__nom">${esc(m.nom || m.role || "Membre")}</p>
      </div>
      ${!m.nom || m.aConfirmer ? aRenseigner([!m.nom && "nom", m.aConfirmer && "rôle à confirmer"].filter(Boolean).join(", ")) : ""}
    </li>`).join("");
}

/* lien mailto */
// mailto avec objet et corps pré-remplis (le corps garde ses retours à la ligne)
function lienMail(c, objet, corps) {
  const email = String(c.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  const q = new URLSearchParams({ subject: objet || `Proposition de date — ${nomGroupe}`, body: corps || "" });
  return `mailto:${email}?${q.toString().replace(/\+/g, "%20")}`;
}

/* booking */
// le bouton booking de la barre ouvre une fenêtre sur fond flou : gros titre et « Nous contacter » qui ouvre la messagerie avec un message pré-rempli.
// clic à côté, croix ou échap la ferment

function initBooking() {
  const dlg = $("#booking-fenetre");
  const c = contenu.contact || {};
  const mailto = lienMail(c, c.objetBooking || `Demande de booking — ${nomGroupe}`, c.corpsBooking);
  const mail = $("[data-booking-mail]");
  if (mailto) { mail.href = mailto; mail.hidden = false; }
  else $("[data-booking-manque]").innerHTML = aRenseigner("contact.email (adresse du bouton « Nous contacter »)", "p");

  $$("[data-booking]").forEach((b) => { b.hidden = false; b.addEventListener("click", () => { dlg.showModal(); $("[data-booking-carte]", dlg).focus({ preventScroll: true }); }); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-booking-fermer]")) dlg.close(); }); // fond ou croix
  mail.addEventListener("click", () => setTimeout(() => dlg.close(), 400)); // la messagerie s'ouvre, la fenêtre se referme
}

/* formulaire de contact MKL.studio */
// le logo MKL.studio du pied de page ouvre une fenêtre (adresse + message). le message part au serveur de notifications (route /mkl-contact)
// qui le transmet par courriel à une adresse gardée secrète côté serveur
function initMkl() {
  const dlg = $("#mkl-fenetre");
  const ouvrirs = $$("[data-mkl]");
  if (!dlg || !ouvrirs.length) return;
  const form = $("[data-mkl-form]", dlg), etat = $("[data-mkl-etat]", dlg), envoi = $("[data-mkl-envoi]", dlg), merci = $("[data-mkl-merci]", dlg);
  const serveur = ((contenu.notifications || {}).serveur || "").replace(/\/$/, "");
  let ouvertA = 0;
  const reinitialiser = () => { form.hidden = false; merci.hidden = true; etat.textContent = ""; envoi.disabled = false; };
  ouvrirs.forEach((b) => b.addEventListener("click", () => {
    if (!dlg.open) { reinitialiser(); ouvertA = Date.now(); dlg.showModal(); $("[data-mkl-carte]", dlg).focus({ preventScroll: true }); }
  }));
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-mkl-fermer]")) dlg.close(); }); // fond ou croix
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim(), message = form.message.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { etat.textContent = "Cette adresse e-mail ne semble pas valide."; form.email.focus(); return; }
    if (message.length < 10) { etat.textContent = "Votre message est un peu court."; form.message.focus(); return; }
    if (!serveur) { etat.textContent = "L’envoi n’est pas disponible pour le moment."; return; }
    envoi.disabled = true; etat.textContent = "Envoi en cours…";
    try {
      const rep = await fetch(serveur + "/mkl-contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, piege: form.site.value, delai: Date.now() - ouvertA }),
      });
      if (!rep.ok) throw new Error(String(rep.status));
      form.reset(); form.hidden = true; merci.hidden = false; // remerciement à la place du formulaire
    } catch {
      etat.textContent = "Le message n’est pas parti. Réessayez dans un instant.";
      envoi.disabled = false;
    }
  });
}

/* musique */
// les morceaux sont lus depuis le site, aucun service tiers. une vidéo youtube ne se charge qu'au clic

const formatTemps = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");
const ICO_LIRE = '<svg aria-hidden="true" width="16" height="18" viewBox="0 0 16 18"><path d="M2 1.5v15l12-7.5z" fill="currentColor"/></svg>';
const ICO_PAUSE = '<svg aria-hidden="true" width="16" height="18" viewBox="0 0 16 18"><path d="M2 1h4v16H2zM10 1h4v16h-4z" fill="currentColor"/></svg>';

// forme d'onde dans un canvas : barres miroir, jaunes jusqu'à la position de lecture, grises ensuite. pics lus dans un petit json préparé par tools/onde.mjs,
// sinon le morceau est décodé dans le navigateur (plus lourd). le déplacement passe par un <input type=range> invisible posé dessus :
// clavier, toucher et lecteurs d'écran marchent sans code en plus
const NB_PICS = 300;
function picsDepuisAudio(audioBuffer) {
  const c = audioBuffer.getChannelData(0), n = c.length, pics = [];
  for (let b = 0; b < NB_PICS; b++) {
    const a = Math.floor((b * n) / NB_PICS), z = Math.floor(((b + 1) * n) / NB_PICS), pas = Math.max(1, Math.floor((z - a) / 400));
    let max = 0;
    for (let i = a; i < z; i += pas) { const v = Math.abs(c[i]); if (v > max) max = v; }
    pics.push(max);
  }
  const g = Math.max(...pics) || 1;
  return pics.map((v) => (v / g) ** 0.75);
}

function ondeDe(canvas, audio, piste) {
  const ctx = canvas.getContext("2d");
  let pics = null, raf = 0, largeur = 0, hauteur = 0;
  const couleur = (nom) => getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  // avant le chargement des pics : un dessin discret, toujours le même
  const attente = (i) => 0.18 + 0.12 * Math.sin(i * 0.7) * Math.sin(i * 0.23 + 1);

  const dessiner = () => {
    if (!largeur) return;
    const dpr = devicePixelRatio || 1, trait = 3 * dpr, ecart = 2 * dpr;
    const nb = Math.max(8, Math.floor((largeur + ecart) / (trait + ecart)));
    const progres = audio.duration ? audio.currentTime / audio.duration : 0;
    const lue = couleur("--jaune") || "#f2b929", reste = couleur("--gris-6") || "#4a4945";
    ctx.clearRect(0, 0, largeur, hauteur);
    for (let i = 0; i < nb; i++) {
      let amp;
      if (pics) { // plus grand pic parmi ceux que couvre cette barre
        const a = Math.floor((i * pics.length) / nb), z = Math.max(a + 1, Math.floor(((i + 1) * pics.length) / nb));
        amp = 0; for (let k = a; k < z; k++) amp = Math.max(amp, pics[k]);
      } else amp = attente(i);
      const h = Math.max(2 * dpr, amp * hauteur * 0.96), x = i * (trait + ecart), y = (hauteur - h) / 2;
      ctx.fillStyle = (i + 0.5) / nb <= progres ? lue : reste;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, trait, h, trait / 2); else ctx.rect(x, y, trait, h);
      ctx.fill();
    }
  };
  const dimensionner = () => {
    const dpr = devicePixelRatio || 1;
    largeur = Math.round(canvas.clientWidth * dpr); hauteur = Math.round(canvas.clientHeight * dpr);
    canvas.width = largeur; canvas.height = hauteur;
    dessiner();
  };
  // pendant la lecture : redessin à chaque image pour une progression fluide
  const suivre = () => {
    cancelAnimationFrame(raf);
    const pas = () => { dessiner(); if (!audio.paused) raf = requestAnimationFrame(pas); };
    pas();
  };
  new ResizeObserver(dimensionner).observe(canvas);

  const charger = async () => {
    try {
      if (piste.onde) {
        const rep = await fetch(urlSure(piste.onde));
        if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
        pics = (await rep.json()).pics;
      } else {
        const rep = await fetch(urlSure(piste.fichier));
        const buf = await rep.arrayBuffer();
        pics = picsDepuisAudio(await new OfflineAudioContext(1, 1, 44100).decodeAudioData(buf));
      }
    } catch (e) { console.warn("[onde] forme d'onde indisponible :", e.message); }
    dessiner();
  };
  // chargement à l'approche de la section (le décodage complet n'est utile que là)
  if (!("IntersectionObserver" in window)) charger();
  else {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); charger(); } }, { rootMargin: "400px 0px" });
    obs.observe(canvas);
  }
  return { dessiner, suivre };
}

function rendreMusique() {
  const m = contenu.musique || {};
  const titres = (m.titres || []).filter((t) => t.titre && urlSure(t.fichier));
  const liens = avecUrl(m.ecoute);
  const bloc = $("[data-bloc-ecouter]");
  if (!titres.length && !liens.length) return;
  bloc.hidden = false;
  const intro = $("[data-ecouter-texte]");
  if (m.texte) { intro.textContent = m.texte; intro.hidden = false; }
  const chute = $("[data-ecouter-chute]");
  if (m.chute) { chute.textContent = m.chute; chute.hidden = false; }

  $("[data-pistes]").innerHTML = titres.map((t) => `
    <li class="piste">
      <button type="button" class="piste__lire" data-piste-lire aria-label="Lire « ${esc(t.titre)} »">${ICO_LIRE}</button>
      <div class="piste__corps">
        <p class="piste__titre">${esc(t.titre)}</p>
        <div class="onde">
          <canvas class="onde__dessin" aria-hidden="true"></canvas>
          <input class="onde__curseur" type="range" min="0" max="1000" value="0" step="1" data-piste-barre aria-label="Position dans « ${esc(t.titre)} »">
        </div>
      </div>
      <span class="piste__temps" data-piste-temps>–:––</span>
      <audio preload="metadata" src="${esc(urlSure(t.fichier))}"></audio>
    </li>`).join("");

  const pistes = $$(".piste");
  pistes.forEach((li, rang) => {
    const audio = $("audio", li), lire = $("[data-piste-lire]", li), barre = $("[data-piste-barre]", li), temps = $("[data-piste-temps]", li);
    const onde = ondeDe($(".onde__dessin", li), audio, titres[rang]);
    const maj = () => {
      if (audio.duration) barre.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      temps.textContent = audio.duration ? formatTemps(audio.duration - audio.currentTime) : "–:––";
      onde.dessiner();
    };
    audio.addEventListener("play", () => onde.suivre());
    lire.addEventListener("click", () => {
      if (audio.paused) {
        $$("audio").forEach((a) => { if (a !== audio) a.pause(); });
        audio.play().catch(() => toast("Lecture impossible : fichier introuvable"));
      } else audio.pause();
    });
    audio.addEventListener("play", () => { li.classList.add("est-lecture"); lire.innerHTML = ICO_PAUSE; lire.setAttribute("aria-label", `Pause « ${$(".piste__titre", li).textContent} »`); });
    const arret = () => { li.classList.remove("est-lecture"); lire.innerHTML = ICO_LIRE; lire.setAttribute("aria-label", `Lire « ${$(".piste__titre", li).textContent} »`); };
    audio.addEventListener("pause", arret);
    audio.addEventListener("ended", () => { audio.currentTime = 0; arret(); maj(); });
    audio.addEventListener("loadedmetadata", maj);
    audio.addEventListener("timeupdate", maj);
    barre.addEventListener("input", () => {
      if (audio.duration) audio.currentTime = (barre.value / 1000) * audio.duration;
      maj();
    });
  });

  $("[data-ecoute]").innerHTML = liens.map((l) => `<li><a class="bouton bouton--trait" href="${esc(l.url)}"${attrsLien(l.url)}>${esc(l.nom)}</a></li>`).join("");
}

/* clip vidéo (dans « Médias ») */

const listeVideos = () => ((contenu.musique || {}).videos || []).filter((v) => urlSure(v.fichier));
const nbVideos = () => listeVideos().length;

function rendreVideos() {
  const videos = listeVideos();
  const zone = $("[data-videos]");
  // lecteur du navigateur, vidéo hébergée sur le site : rien n'est téléchargé avant la lecture (preload none), la vignette est l'affiche
  zone.innerHTML = videos.map((v) => `
    <div class="video">
      <canvas class="video__halo" width="32" height="18" aria-hidden="true"></canvas>
      <span class="video__rec" aria-hidden="true"><i></i>REC</span>
      <video controls playsinline preload="${v.affiche ? "none" : "metadata"}"${v.affiche ? ` poster="${esc(urlSure(v.affiche))}"` : ""} src="${esc(urlSure(v.fichier))}" aria-label="${esc(v.titre || "Clip de Drop Out")}"></video>
    </div>`).join("");
  // halo : les couleurs du clip (copiées en 32×18) s'étalent floutées derrière le lecteur. avant la lecture c'est l'affiche qui les donne, pendant la lecture une image toutes les 120 ms
  $$(".video", zone).forEach((bloc, i) => {
    const vid = $("video", bloc), toile = $("canvas", bloc), ctx = toile.getContext("2d");
    const peindre = (src) => { try { ctx.drawImage(src, 0, 0, 32, 18); } catch { /* image pas encore prête */ } };
    if (videos[i].affiche) { const im = new Image(); im.onload = () => peindre(im); im.src = urlSure(videos[i].affiche); }
    let derniere = 0, tour = 0;
    const boucle = (t) => {
      if (t - derniere > 120) { derniere = t; peindre(vid); }
      tour = vid.paused || vid.ended ? 0 : requestAnimationFrame(boucle);
    };
    vid.addEventListener("play", () => { if (!tour && !mouvementReduit()) tour = requestAnimationFrame(boucle); });
    // badge REC en haut à droite pendant la lecture
    const rec = (lecture) => bloc.classList.toggle("est-lecture", lecture);
    vid.addEventListener("play", () => rec(true));
    vid.addEventListener("pause", () => rec(false));
    vid.addEventListener("ended", () => rec(false));
    vid.addEventListener("seeked", () => peindre(vid));
    vid.addEventListener("loadeddata", () => peindre(vid));
  });
  // aperçu en noir et blanc, en couleur au toucher et dès que la lecture démarre (cf. .video video dans le css)
  $$("video", zone).forEach((vid) => vid.addEventListener("play", () => vid.classList.add("a-joue"), { once: true }));
  // une seule source sonore à la fois
  $$("video", zone).forEach((vid) => vid.addEventListener("play", () => {
    $$("audio").forEach((a) => a.pause());
    $$("video", zone).forEach((o) => { if (o !== vid) o.pause(); });
  }));
  $$("audio").forEach((a) => a.addEventListener("play", () => $$("video", zone).forEach((v) => v.pause())));
  return videos.length;
}

/* réseaux sociaux (icônes) */

function rendreReseaux() {
  const html = avecUrl(contenu.reseaux).map((r) => `<li>${lienIcone(r.url, `${nomGroupe} sur ${r.nom}`)}</li>`).join("");
  $$("[data-reseaux], [data-pied-reseaux]").forEach((ul) => { ul.innerHTML = html; ul.hidden = !html; });
  $("[data-suivez]").hidden = !html;
  const menu = $("[data-menu-reseaux]");
  if (menu) {
    const h = avecUrl(contenu.reseaux).filter((r) => /instagram.com|facebook.com/i.test(r.url)).map((r) => `<li>${lienIcone(r.url, `${nomGroupe} sur ${r.nom}`)}</li>`).join("");
    menu.innerHTML = h; menu.hidden = !h;
  }
}

// bouton du pied de page : remonte en haut
$("[data-haut]")?.addEventListener("click", () => scrollTo({ top: 0, behavior: mouvementReduit() ? "auto" : "smooth" }));

/* concerts */

// dates chargées, gardées pour le lien de la notification (?agenda=...)
let programme = null;

// le lien d'une notification « nouvelle date » ouvre le site avec ?agenda=date|lieu : on propose d'ajouter la date à l'agenda en un geste (.ics, géré par le clic « data-ics » plus bas).
// un site ne peut pas écrire dans l'agenda sans confirmation : la confirmation, c'est ce bouton
function ouvrirAgendaDepuisLien() {
  const id = new URLSearchParams(location.search).get("agenda");
  if (!id || !programme) return;
  const url = new URL(location.href);
  url.searchParams.delete("agenda");
  history.replaceState(null, "", url.pathname + url.search + url.hash); // pas de réouverture au rechargement
  const c = [...programme.aVenir, ...programme.passes].find((x) => `${x.date}|${x.lieu}` === id);
  if (!c) return;
  const dlg = $("#agenda-ajout");
  const [a, m, j] = c.date.split("-").map(Number);
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(a, m - 1, j, 12)));
  $("[data-agenda-lieu]", dlg).textContent = [c.lieu, c.ville].filter(Boolean).join(", ");
  $("[data-agenda-quand]", dlg).textContent = quand.charAt(0).toUpperCase() + quand.slice(1) + (c.heure ? ` · ${c.heure.replace(":", " h ")}` : "");
  $("[data-agenda-ajouter]", dlg).dataset.ics = JSON.stringify(c);
  dlg.showModal();
}

// encart annonce : affiche, nom, date, lieu et boutons (itinéraire, billetterie, agenda, partage).
// ouvert par la notification (?annonce=date|lieu) ou par « Voir l'annonce » dans « À l'affiche »
function ouvrirAnnonce(c) {
  const dlg = $("#annonce-fenetre");
  if (!dlg || !c) return;
  const [a, m, j] = c.date.split("-").map(Number);
  const quand = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(a, m - 1, j, 12)));
  const lieu = [c.lieu, c.ville && c.ville !== c.lieu ? c.ville : ""].filter(Boolean).join(", ");
  const img = $("[data-annonce-affiche]", dlg);
  if (c.affiche) { img.src = urlSure(c.affiche) + "-1200.webp"; img.alt = "Affiche : " + (c.nom || lieu); img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }
  $("[data-annonce-titre]", dlg).textContent = c.nom || c.lieu;
  $("[data-annonce-date]", dlg).textContent = quand.charAt(0).toUpperCase() + quand.slice(1) + (c.heure ? " · " + heureFr(c.heure) : "");
  $("[data-annonce-lieu]", dlg).textContent = c.nom ? lieu : (c.ville && c.ville !== c.lieu ? c.ville : "");
  const info = $("[data-annonce-info]", dlg);
  info.textContent = c.info || ""; info.hidden = !c.info;
  const json = esc(JSON.stringify(c));
  const lien = c.lien && c.statut !== "annule" ? urlSure(c.lien) : "";
  $("[data-annonce-actions]", dlg).innerHTML =
    '<a class="bouton bouton--plein" href="' + esc(itineraireUrl(c)) + '" target="_blank" rel="noopener noreferrer">Itinéraire</a>' +
    (lien ? '<a class="bouton bouton--trait" href="' + esc(lien) + '"' + attrsLien(lien) + '>' + esc(c.lienTexte || "Billetterie") + '</a>' : "") +
    '<button type="button" class="bouton bouton--trait" data-ics="' + json + '">Ajouter à l’agenda</button>' +
    '<button type="button" class="bouton bouton--trait" data-partager-date="' + json + '">Partager</button>';
  if (!dlg.open) dlg.showModal();
  $("[data-annonce-carte]", dlg).focus({ preventScroll: true });
}
function ouvrirAnnonceDepuisLien() {
  const id = new URLSearchParams(location.search).get("annonce");
  if (!id || !programme) return;
  const url = new URL(location.href);
  url.searchParams.delete("annonce");
  history.replaceState(null, "", url.pathname + url.search + url.hash); // pas de réouverture au rechargement
  const c = [...programme.aVenir, ...programme.passes].find((x) => x.date + "|" + x.lieu === id);
  if (c) ouvrirAnnonce(c);
}
(() => {
  const dlg = $("#annonce-fenetre");
  dlg?.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-annonce-fermer]")) dlg.close(); });
})();

// mode « ce soir » : le jour d'un concert, bandeau en haut avec lieu, heure et itinéraire
function rendreCeSoir({ aVenir, aujourdhui }) {
  const zone = $("[data-ce-soir]");
  if (!zone) return;
  const c = aVenir.find((x) => x.date === aujourdhui && x.statut !== "annule");
  zone.hidden = !c;
  if (!c) { zone.innerHTML = ""; return; }
  const lieu = [c.lieu, c.ville && c.ville !== c.lieu ? c.ville : ""].filter(Boolean).join(", ");
  const heure = c.heure ? c.heure.replace(":", " h ").replace(/ h 00$/, " h") : "";
  zone.innerHTML = '<span class="ce-soir__label">Ce soir</span><span class="ce-soir__lieu">' + esc(lieu) + (heure ? ' · ' + esc(heure) : "") + '</span>' +
    '<a class="ce-soir__lien" href="' + esc(itineraireUrl(c)) + '" target="_blank" rel="noopener noreferrer" aria-label="Itinéraire vers ' + esc(c.lieu) + ' (nouvelle fenêtre)">Itinéraire</a>';
}

// partager une date : feuille de partage de l'appareil, sinon copie du lien
async function partagerDate(c) {
  const d = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(...c.date.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))), 12)));
  const heure = c.heure ? " à " + c.heure.replace(":", " h ").replace(/ h 00$/, " h") : "";
  const lieu = [c.lieu, c.ville && c.ville !== c.lieu ? c.ville : ""].filter(Boolean).join(", ");
  const texte = nomGroupe + " en concert " + d + heure + " : " + lieu + ".";
  const url = location.origin + location.pathname;
  if (navigator.share) {
    try { await navigator.share({ title: nomGroupe + " — concert", text: texte, url }); return; }
    catch (e) { if (e?.name === "AbortError") return; /* annulé : rien ; autre erreur : on copie */ }
  }
  toast((await copier(texte + " " + url)) ? "Date copiée, prête à coller" : url);
}

async function rendreProgramme() {
  const zone = $("[data-concerts]");
  const etat = $("[data-concerts-etat]");
  try {
    const { concerts, depuisCache, enregistreLe } = await chargerConcerts();
    const tri = trier(concerts);
    programme = tri;
    rendreConcerts(zone, $("[data-dates-suivantes]"), tri);
    rendreCeSoir(tri);
    rendreDeja(tri.passes);
    donneesStructurees(tri.aVenir, nomGroupe);

    const notes = [];
    if (apercuConcerts) notes.push("Aperçu avec des dates fictives.");
    if (depuisCache) notes.push(`Hors connexion : dernière version enregistrée${enregistreLe ? ` (${formatEnregistrement(enregistreLe)})` : ""}. Le programme a pu changer.`);
    etat.textContent = notes.join(" ");
    etat.hidden = !notes.length;
    ouvrirAgendaDepuisLien();
    ouvrirAnnonceDepuisLien();
  } catch (e) {
    console.error("[concerts] Programme illisible :", e);
    zone.innerHTML = `
      <p class="annonce__titre">Programme indisponible</p>
      <p class="discret">${navigator.onLine ? "Réessayez dans un instant." : "Vous semblez hors connexion."}</p>
      ${aRenseigner("vérifiez la syntaxe de data/concerts.json (détail dans la console)", "p")}`;
  }
}

// dates passées : mur d'affiches
function rendreDeja(passes) {
  const bloc = $("[data-deja]");
  bloc.hidden = !passes.length;
  if (!passes.length) return;
  const piste = $("[data-affiches]");
  piste.innerHTML = tuilesAffiches(passes);
  $("[data-defile]").hidden = !piste.children.length;
}

/* partenaires : bandeau de logos défilant */
// le contenu est répété pour être plus large que l'écran et boucler sans coupure (deux moitiés identiques, la piste glisse d'une moitié)

function rendrePartenaires() {
  const bloc = $("[data-confiance]");
  const liste = (contenu.partenaires || []).filter((p) => p.nom && p.logo);
  if (!bloc || !liste.length) return;
  // chaque logo ouvre le site de l'organisme dans une nouvelle fenêtre. seule la première série est atteignable au clavier et lue par les lecteurs d'écran,
  // les copies de la boucle sont masquées
  const logo = (p, annonce) => {
    const taille = `style="--taille:${Number(p.taille) || 1}"`;
    const url = urlSure(p.url);
    const img = `<img src="${esc(urlSure(p.logo))}.webp" alt="${annonce && !url ? esc(p.nom) : ""}"${p.ratio ? ` width="${Math.round(120 * p.ratio)}"` : ""} height="120" decoding="async" ${taille}>`;
    const contenuLi = url
      ? `<a href="${esc(url)}"${attrsLien(url)} ${annonce ? `aria-label="${esc(p.nom)} (nouvelle fenêtre)"` : 'tabindex="-1"'}>${img}</a>`
      : img;
    return `<li class="confiance__logo"${annonce ? "" : ' aria-hidden="true"'}>${contenuLi}</li>`;
  };
  const repetitions = Math.max(2, Math.ceil(14 / liste.length));
  const moitie = (annonce) => `<ul class="confiance__moitie"${annonce ? "" : ' aria-hidden="true"'}>${Array.from({ length: repetitions }, (_, i) => liste.map((p) => logo(p, annonce && i === 0)).join("")).join("")}</ul>`;
  const piste = $("[data-confiance-piste]");
  piste.style.setProperty("--n", String(liste.length * repetitions));
  piste.innerHTML = moitie(true) + moitie(false);
  piste.addEventListener("click", (e) => { const a = e.target.closest("a"); if (a) setTimeout(() => a.blur(), 0); }); // le focus ne reste pas sur le logo cliqué
  bloc.hidden = false;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) piloterBandeau(piste, liste.length * repetitions);
}

// le bandeau défile seul mais on peut le faire glisser (doigt ou souris) : il suit le doigt, garde son élan au lâcher puis reprend sa course
function piloterBandeau(piste, n) {
  const fenetre = piste.parentElement;
  piste.classList.add("confiance__piste--doigt");
  let x = 0, largeur = 0, vitesse = 0, inertie = 0;
  let enCours = false, survol = false, visible = true, depart = null, deplace = false, dernier = 0, t0 = 0;
  const auto = () => largeur / (n * 3.4); // px par seconde
  const mesurer = () => { largeur = piste.scrollWidth / 2; };
  const poser = () => {
    if (largeur) x = ((x % largeur) - largeur) % largeur; // reste dans [-largeur, 0)
    piste.style.transform = `translate3d(${x}px,0,0)`;
  };
  const boucle = (t) => {
    const dt = Math.min((t - t0) / 1000, .05);
    t0 = t;
    if (visible && !document.hidden && largeur && !enCours) {
      if (Math.abs(inertie) > 1) { x += inertie * dt; inertie *= Math.pow(.04, dt); } // freine en ~1 s
      else { inertie = 0; if (!survol) x += auto() * dt; }
      poser();
    }
    requestAnimationFrame(boucle);
  };
  new ResizeObserver(mesurer).observe(piste);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(fenetre);
  mesurer();
  fenetre.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") survol = true; });
  fenetre.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") survol = false; });
  fenetre.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) survol = true; });
  fenetre.addEventListener("focusout", () => { survol = false; });
  fenetre.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    depart = { id: e.pointerId, x: e.clientX };
    deplace = false; enCours = true; inertie = 0; vitesse = 0; dernier = e.timeStamp;
  });
  fenetre.addEventListener("pointermove", (e) => {
    if (!depart || e.pointerId !== depart.id) return;
    if (!deplace && Math.abs(e.clientX - depart.x) > 6) {
      deplace = true;
      fenetre.setPointerCapture(e.pointerId);
      depart.x = e.clientX;
      fenetre.classList.add("confiance__fenetre--saisie");
    }
    if (!deplace) return;
    const dx = e.clientX - depart.x;
    depart.x = e.clientX;
    x += dx;
    const dt = Math.max(e.timeStamp - dernier, 1) / 1000;
    dernier = e.timeStamp;
    vitesse = vitesse * .6 + (dx / dt) * .4;
    poser();
  });
  const fin = (e) => {
    if (!depart || e.pointerId !== depart.id) return;
    depart = null; enCours = false;
    fenetre.classList.remove("confiance__fenetre--saisie");
    // élan du lâcher (limité) ; quasi nul : le défilement reprend aussitôt
    inertie = deplace && e.timeStamp - dernier < 100 ? Math.max(-2500, Math.min(2500, vitesse)) : 0;
  };
  fenetre.addEventListener("pointerup", fin);
  fenetre.addEventListener("pointercancel", fin);
  // un glissé ne doit pas ouvrir le lien sous le doigt
  fenetre.addEventListener("click", (e) => { if (deplace) { e.preventDefault(); e.stopPropagation(); deplace = false; } }, true);
  fenetre.addEventListener("dragstart", (e) => e.preventDefault());
  requestAnimationFrame((t) => { t0 = t; boucle(t); });
}

/* galerie */
// photos en slider, agrandies au toucher dans la même visionneuse que les affiches. noir et blanc au repos, couleur au toucher
function rendreGalerie(clip) {
  const photos = (contenu.galerie || []).filter((p) => p.photo);
  const liste = $("[data-galerie]");
  if (!photos.length) { if (!clip) $("[data-bloc-galerie]").hidden = true; return; }
  liste.innerHTML = photos.map((p, i) => {
    const base = esc(urlSure(p.photo));
    const taille = "(min-width: 56rem) 34vw, 82vw"; // le slider montre trois photos sur ordinateur, une et demie sur téléphone
    return `<li class="galerie__photo${i === 0 ? " galerie__photo--une" : ""}">
      <button type="button" data-affiche="${base}-1600.webp" aria-label="Agrandir la photo">
        <img src="${base}-560.webp" srcset="${base}-560.webp 560w, ${base}-1000.webp 1000w, ${base}-1600.webp 1600w" sizes="${taille}" alt="${esc(p.alt || "")}" loading="lazy" decoding="async">
      </button>
    </li>`;
  }).join("");
}

// slider : flèches (grands écrans) et glissement du doigt, qui s'aimante sur chaque photo
function initSliderGalerie() {
  const slider = $("[data-slider]");
  const liste = $("[data-galerie]");
  const [prec, suiv] = $$("[data-slide]", slider);
  const maj = () => {
    prec.disabled = liste.scrollLeft <= 2;
    suiv.disabled = liste.scrollLeft + liste.clientWidth >= liste.scrollWidth - 2;
    const photos = $$(".galerie__photo", liste);
    const largeur = photos[0] ? photos[0].getBoundingClientRect().width + 11 : 1;
    const vues = Math.max(1, Math.round(liste.clientWidth / largeur));
    const debut = Math.min(photos.length, Math.round(liste.scrollLeft / largeur) + 1);
    const fin = Math.min(photos.length, debut + vues - 1);
    $("[data-compteur]").textContent = photos.length > vues ? (vues > 1 ? debut + "–" + fin : debut) + " / " + photos.length : "";
  };
  [prec, suiv].forEach((b) => b.addEventListener("click", () => {
    const tuile = liste.querySelector(".galerie__photo");
    const pas = tuile ? tuile.getBoundingClientRect().width + 11 : liste.clientWidth * 0.8;
    const n = Math.max(1, Math.floor(liste.clientWidth / pas));
    liste.scrollBy({ left: Number(b.dataset.slide) * pas * n, behavior: mouvementReduit() ? "auto" : "smooth" });
  }));
  liste.addEventListener("scroll", maj, { passive: true });
  addEventListener("resize", maj, { passive: true });
  maj();
}

/* membres : flèches (ordinateur) */

function initFlechesMembres() {
  const liste = $("[data-membres]");
  const [prec, suiv] = $$("[data-defiler]");
  const maj = () => {
    prec.disabled = liste.scrollLeft <= 2;
    suiv.disabled = liste.scrollLeft + liste.clientWidth >= liste.scrollWidth - 2;
  };
  $$("[data-defiler]").forEach((b) => b.addEventListener("click", () => {
    const tuile = liste.querySelector(".membre");
    const pas = tuile ? tuile.getBoundingClientRect().width + 24 : liste.clientWidth * 0.8;
    liste.scrollBy({ left: Number(b.dataset.defiler) * pas, behavior: mouvementReduit() ? "auto" : "smooth" });
  }));
  liste.addEventListener("scroll", maj, { passive: true });
  addEventListener("resize", maj, { passive: true });
  maj();
}

/* visionneuse */

// ouverture simple : la photo (ou l'affiche) apparaît en fondu au centre de l'écran. la miniature s'affiche tout de suite (déjà chargée), puis la grande la remplace
function ouvrirAffiche(bouton) {
  const dlg = $("#visionneuse");
  const img = $("[data-visionneuse-img]");
  const mini = bouton.querySelector("img");
  const grande = bouton.dataset.affiche;
  img.style.setProperty("--ratio", mini && mini.naturalWidth ? mini.naturalWidth / mini.naturalHeight : ""); // taille fixée : elle ne bouge pas quand la grande version arrive
  img.src = mini?.currentSrc || grande;
  img.alt = mini?.alt || "";
  $("[data-visionneuse-legende]").textContent = bouton.dataset.legende || "";
  dlg.showModal();
  if (mini?.currentSrc && grande && mini.currentSrc !== grande) {
    const pre = new Image();
    pre.src = grande;
    pre.decode().then(() => { if (dlg.open) img.src = grande; }).catch(() => { /* la miniature reste affichée */ });
  }
}
// fond, bouton « Fermer » : fermeture directe (échap aussi, géré par le navigateur)
document.addEventListener("click", (e) => {
  const dlg = $("#visionneuse");
  if (!dlg?.open) return;
  if (e.target === dlg || e.target.closest(".visionneuse__fermer")) { e.preventDefault(); dlg.close(); }
}, true);

/* projecteurs de « À l'affiche » */
// --allume (0 à 1) est posée sur la scène : au chargement elle monte d'un coup avec un scintillement de néon (après l'intro), puis suit le défilement.
// éteints quand la scène sort de l'écran ou n'est pas encore arrivée, rallumés au retour (délai puis scintillement). sans animations : toujours allumés
function initProjecteurs() {
  if (mouvementReduit()) return;
  const SCINTILLE = [[0, 0], [.08, 1], [.16, .15], [.26, .85], [.34, .25], [.5, 1], [.62, .7], [1, 1]]; // [avancée, intensité]
  const DELAI = 1100; // ms d'obscurité : ils sont les derniers à apparaître au chargement (après logo, titre, annonce, partenaires et flèche)
  const DECALAGE = 350; // celui de droite s'allume 0,35 s après celui de gauche
  let demande = 0;
  const allumage = (t) => {
    for (let i = 1; i < SCINTILLE.length; i++) {
      const [t1, v1] = SCINTILLE[i], [t0, v0] = SCINTILLE[i - 1];
      if (t <= t1) return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
    return 1;
  };
  // chaque néon (scène de « À l'affiche », tirets de « Suivez-nous ») a son propre état
  const etats = new WeakMap();
  const tick = (maintenant) => {
    demande = 0;
    let encore = false;
    $$(".scene-cadre, [data-neon-scroll]").forEach((cadre) => {
      const st = etats.get(cadre) || etats.set(cadre, { debut: 0 }).get(cadre);
      const r = cadre.getBoundingClientRect(), H = innerHeight, zone = H * 0.3;
      const lisse = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
      const defilement = lisse((r.bottom - 30) / zone) * lisse((H - r.top - 30) / zone);
      const regler = (g, d) => { cadre.style.setProperty("--allume-g", g.toFixed(3)); cadre.style.setProperty("--allume-d", d.toFixed(3)); cadre.style.setProperty("--allume", Math.max(g, d).toFixed(3)); };
      // presque sorti de l'écran : éteint, il se rallumera au retour
      if (defilement < 0.1) { st.debut = 0; regler(0, 0); return; }
      let g = 0, d = 0;
      if (!document.documentElement.classList.contains("intro-actif")) {
        if (!st.debut) st.debut = maintenant;
        const depuis = maintenant - st.debut - (cadre.matches(".scene-cadre, .dates-zone [data-neon-scroll]") ? DELAI : 250); // ailleurs que sur la scène du haut, pas besoin d'attendre la fin du chargement
        g = allumage(Math.min(1, Math.max(0, depuis / 450)));
        d = allumage(Math.min(1, Math.max(0, (depuis - DECALAGE) / 450)));
      }
      regler(g * defilement, d * defilement);
      if (g < 1 || d < 1) encore = true;
    });
    if (encore) demande = requestAnimationFrame(tick);
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(tick); };
  addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", planifier, { passive: true });
  // la scène est créée après le chargement des dates : on la guette un instant
  new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true });
  planifier();
}

/* barre de progression de lecture */
// fine ligne blanche en haut de l'écran dont la longueur suit l'avancée dans la page (0 à 100 %), annoncée comme barre de progression (aria-valuenow)
function initProgression() {
  const barre = $("[data-progression]");
  if (!barre) return;
  const trait = $("i", barre);
  let demande = 0, derniere = -1;
  const maj = () => {
    demande = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    trait.style.transform = `scaleX(${p.toFixed(4)})`;
    const pct = Math.round(p * 100);
    if (pct !== derniere) { derniere = pct; barre.setAttribute("aria-valuenow", String(pct)); }
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(maj); };
  addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", planifier, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(planifier).observe(document.body);
  maj();
}

/* fond : une teinte par section */
// cinq nappes floues, une par section (rouge, ocre, violet, bleu, vert : la couleur du titre). fondu de l'une à l'autre quand le milieu de l'écran franchit le haut d'une section.
// sans animations la première reste fixe
const SECTIONS_FOND = [".dates-zone", "#groupe", "#ecouter", "#galerie", "#reseaux"];
function initFond() {
  const images = $$(".fond__img");
  if (!images.length) return;
  if (mouvementReduit()) { images[0].style.setProperty("--o", "1"); return; }
  const lisse = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  let demande = 0;
  const maj = () => {
    demande = 0;
    const ref = scrollY + innerHeight * 0.5, zone = innerHeight * 0.7;
    // haut de chaque section (une section masquée ou vide, comme la musique sans morceaux, est ignorée)
    const hauts = SECTIONS_FOND.map((s) => { const e = $(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.height ? r.top + scrollY : null; });
    const actives = hauts.map((h, i) => i).filter((i) => hauts[i] !== null);
    const poids = new Array(images.length).fill(0);
    actives.forEach((i, rang) => {
      // la première nappe (rouge) aussi : elle n'apparaît qu'à l'arrivée de « À l'affiche », sinon elle se voit à travers le fondu de la photo ou du clip d'en-tête
      const monte = lisse((ref - hauts[i]) / zone + (rang === 0 ? 0.12 : 0.5));
      const prochaine = actives[rang + 1];
      const descend = prochaine === undefined ? 1 : 1 - lisse((ref - hauts[prochaine]) / zone + 0.5);
      poids[i] = monte * descend;
    });
    images.forEach((im, i) => {
      const o = (poids[i] || 0).toFixed(3);
      if (im._o === o) return; // inchangé : pas de recalcul de style
      im._o = o;
      im.style.setProperty("--o", o);
      im.style.visibility = Number(o) > 0.004 ? "" : "hidden"; // nappe invisible : sortie de l'affichage (économise plusieurs calques plein écran)
    });
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(maj); };
  addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", planifier, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(planifier).observe(document.body);
  maj();
}

/* animations en pause hors de l'écran */
// celles qui tournent en continu (scène, photo d'en-tête, flèche) ne coûtent rien hors écran : le css les met en pause avec .hors-ecran
function pauseHorsEcran() {
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver((entrees) => entrees.forEach((e) => e.target.classList.toggle("hors-ecran", !e.isIntersecting)), { rootMargin: "80px" });
  $$(".scene, .hero__media, .hero__suite, .confiance__fenetre, .oeil, .titre-neon, .entete-neon, .prochaine--attente").forEach((el) => obs.observe(el)); // les néons et le glitch ne tournent que s'ils sont à l'écran
}

/* premier écran : ligne de style et profondeur */
// la ligne « Rock alternatif · Ardèche » apparaît lettre par lettre une fois le logo posé (après l'intro s'il y en a une).
// les lecteurs d'écran lisent le texte complet. sans animations : le texte est juste là
function animerTexteHero() {
  const p = $(".hero__style");
  if (!p || p.hidden || mouvementReduit()) return;
  const texte = p.textContent.trim();
  if (!texte) return;
  const base = document.documentElement.classList.contains("intro-actif") ? 1.5 : 0.4;
  let i = 0;
  p.innerHTML = `<span class="sr-seul">${esc(texte)}</span>` + texte.split(" ").map((mot) => `<span class="mot" aria-hidden="true">${[...mot].map((c) => `<span class="lettre" style="--i:${i++}">${esc(c)}</span>`).join("")}</span>`).join(" ");
  p.style.setProperty("--base", `${base}s`);
}

// la photo glisse un peu moins vite que la page (quelques % de sa hauteur)
function initParallaxeHero() {
  const media = $(".hero__media");
  if (!media || mouvementReduit() || matchMedia("(hover: none) and (pointer: coarse)").matches) return; // téléphone : pas de parallaxe
  let demande = 0;
  const maj = () => {
    demande = 0;
    media.style.setProperty("--defil", Math.min(1, Math.max(0, scrollY / (media.offsetHeight || 1))).toFixed(3));
  };
  addEventListener("scroll", () => { if (!demande) demande = requestAnimationFrame(maj); }, { passive: true });
  maj();
}

/* diaporama du premier écran */
// une photo toutes les 5,5 s en fondu, arrêt si l'onglet est caché. le fondu reste actif même avec animations réduites (seul le zoom est coupé, côté css).
// ordinateur seulement : deux photos s'ajoutent à la première (sur téléphone et tablette, le clip sert de fond)
const DIAPOS_ORDINATEUR = [
  { fichier: "hero-scene", h: 1156, alt: "Drop Out en concert : deux guitares, batterie, chanteuse et basse sur scène" },
  { fichier: "hero-plein-air", h: 1333, alt: "Drop Out en concert en plein air : basse, chanteuse au micro et guitare devant la banderole du groupe" },
];
function initDiaporama() {
  const cadre = $("[data-diaporama]");
  if (matchMedia("(min-width: 56rem) and (hover: hover)").matches && !$$(".diapo", cadre)[1]) {
    $$(".diapo", cadre).at(-1)?.insertAdjacentHTML("afterend", DIAPOS_ORDINATEUR.map((d) => `
        <img class="diapo" src="assets/img/${d.fichier}-1400.webp"
          srcset="assets/img/${d.fichier}-800.webp 800w, assets/img/${d.fichier}-1400.webp 1400w, assets/img/${d.fichier}-2000.webp 2000w"
          sizes="100vw" width="2000" height="${d.h}" alt="${d.alt}" loading="lazy" decoding="async">`).join(""));
  }
  const diapos = $$(".diapo", cadre);
  if (diapos.length < 2) return;
  const DUREE = 5500; // une photo toutes les 5,5 s
  let index = 0, minuteur;

  const montrer = async (i) => {
    const suivante = diapos[i];
    suivante.loading = "eager";
    try { await suivante.decode(); } catch { /* image non décodable : on passe quand même */ }
    diapos[index].classList.remove("est-active");
    suivante.classList.remove("est-active");
    suivante.classList.add("est-active");
    index = i;
  };
  const programmer = () => {
    clearTimeout(minuteur);
    if (!document.hidden) minuteur = setTimeout(async () => { await montrer((index + 1) % diapos.length); programmer(); }, DUREE);
  };

  document.addEventListener("visibilitychange", programmer);
  // précharge la photo suivante
  diapos[1].loading = "eager";
  programmer();
}

/* clip en fond du premier écran */
// vidéo muette en boucle (assets/video/) qui se fond par-dessus les photos quand elle est prête. pas chargée si animations ou données sont limitées, ni sur connexion lente : la photo reste seule.
// en pause quand le premier écran n'est plus visible ou que l'onglet est caché (batterie)
function initVideoFond() {
  const video = $("[data-video-fond]");
  // le choix d'afficher le clip est pris dès le chargement (classe video-fond posée dans le <head>)
  if (!video || !document.documentElement.classList.contains("video-fond")) return;
  const abandon = () => { // la photo reprend sa place (on la charge maintenant)
    document.documentElement.classList.remove("video-fond");
    video.remove();
    const photo = $(".diapo");
    if (photo && !photo.dataset.charge) { photo.srcset = photo.dataset.srcset; photo.src = photo.dataset.src; photo.dataset.charge = "1"; }
  };
  const demarrer = () => {
  const delai = setTimeout(abandon, 6000);
  const etroit = matchMedia("(max-width: 55.99rem) and (orientation: portrait)").matches; // cadre de l'en-tête sur téléphone (4 : 3,3)
  video.src = etroit ? "assets/video/fond-mobile.mp4" : "assets/video/fond.mp4";
  let visible = true;
  const maj = () => { if (visible && !document.hidden) video.play().catch(() => {}); else video.pause(); };
  video.addEventListener("playing", () => { clearTimeout(delai); video.classList.add("est-prete"); }, { once: true });
  video.addEventListener("error", () => { clearTimeout(delai); abandon(); }, { once: true });
  document.addEventListener("visibilitychange", maj);
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; maj(); }).observe(video);
  maj();
  };
  // la vidéo ne se charge qu'après le chargement de la page (l'image d'attente reste affichée entre-temps)
  if (document.readyState === "complete") setTimeout(demarrer, 600);
  else addEventListener("load", () => setTimeout(demarrer, 600), { once: true });
}

/* interactions */

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-agenda-ajouter]")) setTimeout(() => $("#agenda-ajout").close(), 300); // fenêtre refermée après l'ajout
  const affiche = e.target.closest("[data-affiche]");
  if (affiche) { ouvrirAffiche(affiche); return; }
  const ann = e.target.closest("[data-annonce]");
  if (ann) { try { ouvrirAnnonce(JSON.parse(ann.dataset.annonce)); } catch { /* données illisibles */ } return; }
  const part = e.target.closest("[data-partager-date]");
  if (part) { partagerDate(JSON.parse(part.dataset.partagerDate)); return; }
  const ics = e.target.closest("[data-ics]");
  if (ics) {
    telechargerIcs(JSON.parse(ics.dataset.ics), nomGroupe);
    toast("Fichier agenda téléchargé");
  }
});

/* apparitions et disparitions au défilement */
// deux niveaux, liés à la position à l'écran (donc réversibles) :
// 1. chaque section (et le mur d'affiches) s'estompe en entrant et en sortant (--v) ; la classe .est-visible suit sa présence à l'écran
// 2. chaque élément (tuiles, photos, affiches, icônes...) a sa propre animation : --ain (entrée), --aout (sortie), --a (le plus faible des deux).
// ils arrivent avec un léger décalage entre voisins, par le bas en descendant, par le haut en remontant, et repartent à l'inverse. le css dessine l'effet selon data-anim (monte, gauche, droite, zoom).
// animations réduites : tout reste affiché, sans fondu ni mouvement
const ELEMENTS_ANIMES = [
  [".presentation > p", "monte"],
  [".membres .membre", "monte"], // comme le texte de présentation : elles montent en fondu
  [".galerie__photo", "zoom"],
  [".affiche", "zoom"],
  [".piste, .video", "monte"],
  [".ecoute li", "monte"],
  [".actus .icones li, .actus .fb", "monte"],
  [".annonce__suivantes .date", "monte"],
];

function apparitionsAuDefilement() {
  const sections = $$(".bloc, .deja, .confiance");
  sections.forEach((c) => { c.dataset.reveal = ""; });
  const reduit = mouvementReduit();
  const lisse = (t) => t * t * (3 - 2 * t);
  const borne = (x) => Math.min(1, Math.max(0, x));
  let elements = [], demande = 0;

  // (re)constitue la liste des éléments animés : certains arrivent après coup (programme chargé)
  const rafraichir = () => {
    if (reduit) return;
    elements = [];
    for (const [selecteur, type] of ELEMENTS_ANIMES) {
      $$(selecteur).forEach((el, i) => {
        // rang dans la rangée (0, 1, 2) : sert à décaler un peu les voisins
        const rang = i % 3;
        el.dataset.anim = type;
        elements.push({ el, rang });
      });
    }
    planifier();
  };

  const maj = () => {
    demande = 0;
    const h = innerHeight, zone = h * 0.22; // fondu des sections : 22 % de la hauteur de l'écran
    for (const c of sections) {
      if (c.hidden) continue;
      const r = c.getBoundingClientRect();
      if (!r.height) continue;
      const entree = borne((h - r.top) / zone); // 0 : sous l'écran, 1 : bien entrée
      const sortie = borne(r.bottom / zone);    // 0 : sortie par le haut, 1 : encore là
      c.style.setProperty("--v", (reduit ? 1 : lisse(Math.min(entree, sortie))).toFixed(3));
      c.classList.toggle("est-visible", reduit || (entree > 0.25 && sortie > 0.05));
    }
    if (reduit) return;
    // on lit toutes les positions d'abord, puis on écrit (pas d'aller-retour de mise en page)
    const zoneEl = h * 0.2, lectures = elements.map(({ el, rang }) => ({ el, rang, r: el.getBoundingClientRect() }));
    for (const { el, rang, r } of lectures) {
      let ain = "1.000", aout = "1.000";
      if (r.height) {
        ain = lisse(borne((h - r.top - rang * h * 0.035) / zoneEl)).toFixed(3);
        aout = lisse(borne((r.bottom - rang * h * 0.01) / zoneEl)).toFixed(3);
      }
      // on n'écrit que ce qui a changé : un élément hors écran garde sa valeur, donc aucun recalcul de style pour lui
      if (el._ain !== ain) { el._ain = ain; el.style.setProperty("--ain", ain); }
      if (el._aout !== aout) { el._aout = aout; el.style.setProperty("--aout", aout); }
    }
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(maj); };
  addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", () => { rafraichir(); }, { passive: true });
  // le contenu change de hauteur (programme chargé, section affichée) : on recalcule
  if ("ResizeObserver" in window) new ResizeObserver(planifier).observe(document.body);
  rafraichir();
  maj();
  return { rafraichir };
}

/* crédit photo */

// pastille instagram aux couleurs d'instagram (dégradé jaune, orange, rose, violet, bleu, glyphe blanc)

function rendreCredits() {
  const cr = contenu.credits || {};
  const pied = [cr.photos && `Photos © ${cr.photos}`, cr.illustrations && `Illustrations © ${cr.illustrations}`].filter(Boolean).join(" · ");
  const zone = $("[data-credit]");
  if (pied) zone.textContent = pied; else zone.hidden = true;
  if (!cr.photos) return;
  const liste = avecUrl(cr.liens);
  const insta = liste.find((l) => /instagram.com/i.test(l.url)), site = liste.find((l) => l !== insta);
  const lien = (l, badge, nom, classe) => (l ? `<a class="credit__lien ${classe}" href="${esc(l.url)}"${attrsLien(l.url)} aria-label="${nom} de ${esc(cr.photos)}" title="${nom} de ${esc(cr.photos)}">${badge}</a>` : "");
  const icones = lien(insta, ICONES.instagram, "Instagram", "credit__lien--insta") + lien(site, ICONES.site, "Site web", "credit__lien--site");
  // le nom, puis instagram en dessous et le site web à côté. le pied de page garde la mention seule
  $("[data-credit-groupe]").innerHTML = `<span class="credit__nom">Photos © ${esc(cr.photos)}</span>${icones ? `<span class="credit__liens">${icones}</span>` : ""}`;
}

/* réseaux sociaux : petits encarts facebook et instagram */
// conforme CNIL : rien n'est chargé depuis facebook ou instagram (donc aucun cookie) avant un accord explicite, réseau par réseau.
// l'accord est gardé 6 mois sur l'appareil et se retire en un clic (sous l'encart ou dans les mentions légales).
// sans accord, le bouton « Ouvrir » (simple lien sans cookie) mène à la page du réseau

const DUREE_ACCORD = 182 * 24 * 60 * 60 * 1000; // ≈ 6 mois
const cleAccord = (reseau) => "dropout-" + (reseau === "facebook" ? "fb" : reseau) + "-accord";
const lireAccord = (reseau) => {
  try { return Date.now() - Number(localStorage.getItem(cleAccord(reseau)) || 0) < DUREE_ACCORD; } catch { return false; }
};
const ecrireAccord = (reseau, oui) => {
  try { oui ? localStorage.setItem(cleAccord(reseau), String(Date.now())) : localStorage.removeItem(cleAccord(reseau)); } catch { /* stockage indisponible */ }
};

// actus : les dernières publications facebook, lues par notre serveur (API Meta) puis affichées en articles.
// rien n'est chargé chez meta depuis le navigateur : pas de cookie, donc pas d'accord à demander.
// serveur non configuré ou muet : on garde les anciens encarts facebook / instagram
async function rendreActus() {
  const serveur = contenu.notifications?.serveur;
  const zone = $("[data-actus]");
  if (!serveur || !zone || !contenu.notifications?.actus) return false; // « actus: true » dans content/site.js une fois le jeton Meta posé sur le serveur
  try {
    const rep = await fetch(serveur.replace(/\/$/, "") + "/actus");
    if (!rep.ok) return false;
    const liste = ((await rep.json()).publications || []).slice(0, 6);
    if (!liste.length) return false;
    const jour = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d); };
    zone.innerHTML = liste.map((p) => {
      const url = urlSure(p.url), image = urlSure(p.image);
      const [titre, ...reste] = String(p.texte || "").trim().split(/\n+/);
      const court = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t);
      return `<article class="actu">${image ? `<a class="actu__image" href="${esc(url)}"${attrsLien(url)} tabindex="-1" aria-hidden="true"><img src="${esc(image)}" alt="" loading="lazy" decoding="async"></a>` : ""}
        <div class="actu__corps">
          <p class="actu__date">${esc(jour(p.date))}</p>
          ${titre ? `<h3 class="actu__titre">${esc(court(titre, 90))}</h3>` : ""}
          ${reste.join(" ").trim() || titre.length > 90 ? `<p class="actu__texte">${esc(court(reste.join(" ").trim() || titre, 220))}</p>` : ""}
          <a class="actu__lien" href="${esc(url)}"${attrsLien(url)}>Lire sur Facebook ${FLECHE_ACTU}</a>
        </div></article>`;
    }).join("");
    zone.hidden = false;
    // une publication à la fois qu'on fait glisser, avec des points pour se repérer
    const cartes = $$(".actu", zone);
    if (cartes.length > 1) {
      const points = document.createElement("div");
      points.className = "actus__points";
      points.setAttribute("aria-hidden", "true");
      points.innerHTML = cartes.map(() => "<i></i>").join("");
      zone.after(points);
      const maj = () => {
        const i = Math.round(zone.scrollLeft / (zone.clientWidth || 1));
        [...points.children].forEach((p, k) => p.classList.toggle("est-actif", k === i));
      };
      zone.addEventListener("scroll", () => requestAnimationFrame(maj), { passive: true });
      maj();
    }
    const embeds = $("[data-embeds]"); embeds?.replaceChildren(); embeds?.setAttribute("hidden", ""); // retire aussi le cadre facebook (et ce qu'il a chargé)
    $("[data-reso-onglets]")?.setAttribute("hidden", "");
    return true;
  } catch { return false; }
}
const FLECHE_ACTU = "→";

function rendreEmbeds() {
  const zone = $("[data-embeds]");
  if (!zone) return;
  // facebook seul : instagram n'a plus d'encart (ses icônes restent dans le menu et ailleurs)
  const reseaux = avecUrl(contenu.reseaux).filter((r) => /facebook\.com/i.test(r.url));
  if (!reseaux.length) { $("#reseaux").hidden = true; return; }
  reseaux.sort((a, b) => /instagram/i.test(b.url) - /instagram/i.test(a.url)); // instagram d'abord

  zone.innerHTML = reseaux.map((r) => {
    const cle = /instagram\.com/i.test(r.url) ? "instagram" : "facebook";
    return '<article class="embed embed--' + cle + '" data-embed="' + cle + '" aria-label="' + esc(r.nom) + '">' +
      '<header class="embed__tete"><span class="embed__icone">' + iconeDe(r.url) + '</span><h3 class="embed__nom">' + esc(r.nom) + '</h3>' +
      '<a class="embed__ouvrir" href="' + esc(r.url) + '"' + attrsLien(r.url) + ' aria-label="Ouvrir ' + esc(r.nom) + ' (nouvelle fenêtre)">Ouvrir</a></header>' +
      '<div class="embed__zone"></div></article>';
  }).join("");

  // deux « sections » côte à côte qu'on fait glisser (défilement tactile avec accroche) ; le logo de chaque réseau sert d'onglet : il montre la section affichée et y emmène d'un toucher
  const onglets = $("[data-reso-onglets]");
  if (onglets && reseaux.length < 2) onglets.hidden = true; // un seul réseau : pas d'onglet à choisir
  if (onglets && reseaux.length > 1) {
    onglets.innerHTML = reseaux.map((r) => {
      const cle = /instagram\.com/i.test(r.url) ? "instagram" : "facebook";
      return '<button type="button" class="reso__onglet" role="tab" data-onglet="' + cle + '" aria-selected="false">' + iconeDe(r.url) + '<span>' + esc(r.nom) + '</span></button>';
    }).join("");
    const cartes = $$("[data-embed]", zone);
    const choisir = (i) => $$(".reso__onglet", onglets).forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.classList.toggle("est-actif", k === i); });
    let attenteDefil = 0;
    zone.addEventListener("scroll", () => {
      cancelAnimationFrame(attenteDefil);
      attenteDefil = requestAnimationFrame(() => {
        const x = zone.scrollLeft + zone.clientWidth / 2;
        let proche = 0, ecart = Infinity;
        cartes.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - x); if (d < ecart) { ecart = d; proche = k; } });
        if (zone.scrollLeft + zone.clientWidth >= zone.scrollWidth - 2) proche = cartes.length - 1; // bout de course
        choisir(proche);
      });
    }, { passive: true });
    onglets.addEventListener("click", (e) => {
      const b = e.target.closest("[data-onglet]");
      if (!b) return;
      const c = $('[data-embed="' + b.dataset.onglet + '"]', zone);
      zone.scrollTo({ left: c.offsetLeft - parseFloat(getComputedStyle(zone).paddingLeft || 0), behavior: mouvementReduit() ? "auto" : "smooth" });
    });
    choisir(0);
  }

  reseaux.forEach((r) => {
    const insta = /instagram\.com/i.test(r.url);
    const cle = insta ? "instagram" : "facebook";
    const carte = $('[data-embed="' + cle + '"]', zone);
    const corps = $(".embed__zone", carte);

    const attente = () => {
      carte.classList.remove("est-charge");
      corps.innerHTML = '<div class="embed__accord"><p class="embed__info">Dernières publications ' + (insta ? "Instagram" : "Facebook") +
        '. En cliquant sur « Afficher », ' + (insta ? "Instagram (Meta)" : "Facebook (Meta)") + ' charge son contenu et peut déposer des cookies sur votre appareil.</p>' +
        '<button type="button" class="bouton bouton--plein embed__bouton" data-accepter>Afficher</button></div>';
      $("[data-accepter]", corps).addEventListener("click", () => { ecrireAccord(cle, true); charger(); });
    };

    const charger = () => {
      const largeur = Math.round(Math.min(340, Math.max(250, corps.clientWidth || 300)));
      let src;
      if (insta) {
        const compte = new URL(r.url).pathname.split("/").filter(Boolean)[0] || "";
        src = "https://www.instagram.com/" + encodeURIComponent(compte) + "/embed";
      } else {
        // les nouvelles pages (/p/nom-123456/) passent mieux par leur identifiant numérique
        const id = r.url.match(/\/p\/[^/]*?-(\d{6,})\/?/)?.[1];
        const params = new URLSearchParams({
          href: id ? "https://www.facebook.com/profile.php?id=" + id : r.url, tabs: "timeline", width: largeur, height: 380,
          small_header: "true", adapt_container_width: "true", hide_cover: "true", show_facepile: "false", locale: "fr_FR",
        });
        src = "https://www.facebook.com/plugins/page.php?" + params;
      }
      carte.classList.add("est-charge");
      corps.innerHTML = '<iframe src="' + esc(src) + '" width="' + largeur + '" height="380" title="Publications ' + esc(r.nom) + ' de ' + esc(nomGroupe) +
        '" loading="lazy" allow="encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        // le cadre ne capte pas le défilement tant qu'on ne l'a pas demandé : un voile le recouvre (le doigt fait défiler la page), un toucher l'active, « Terminer » ou un toucher ailleurs le rend à la page
        '<button type="button" class="embed__voile" data-voile aria-label="Parcourir les publications dans le cadre"><span>Toucher pour parcourir</span></button>' +
        '<button type="button" class="embed__terminer" data-terminer>Terminer</button>' +
        '<button type="button" class="lien-discret embed__retirer" data-retirer>Retirer l’accord</button>';
      const rendre = () => carte.classList.remove("est-interactif");
      $("[data-voile]", corps).addEventListener("click", () => carte.classList.add("est-interactif"));
      $("[data-terminer]", corps).addEventListener("click", rendre);
      document.addEventListener("pointerdown", (e) => { if (!carte.contains(e.target)) rendre(); }, { passive: true });
      if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { if (!e.isIntersecting) rendre(); }).observe(carte);
      $("[data-retirer]", corps).addEventListener("click", () => { ecrireAccord(cle, false); attente(); toast("Accord retiré : " + r.nom + " n’est plus chargé"); });
    };

    if (!lireAccord(cle)) { ecrireAccord(cle, false); attente(); return; }
    // accord déjà donné : chargement à l'approche de la section
    if (!("IntersectionObserver" in window)) { charger(); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); charger(); } }, { rootMargin: "600px 0px" });
    obs.observe(carte);
  });
}

/* mentions légales et confidentialité */
// contenu fixe pour ce que fait vraiment le site (aucun cookie, aucune mesure d'audience) ; les infos sur l'éditeur et l'hébergeur viennent de content/site.js (legal).
// fenêtre ouverte depuis le pied de page

function rendreMentions() {
  const dlg = $("#mentions-fenetre");
  const corps = $("[data-mentions-corps]");
  const ouvrir = $$("[data-mentions]");
  if (!dlg || !corps || !ouvrir.length) return;
  const l = contenu.legal || {};
  const ed = l.editeur || {}, he = l.hebergeur || {};
  const ligne = (libelle, valeur, aide) => '<li><strong>' + libelle + ' :</strong> ' + (valeur ? esc(valeur) : aRenseigner(aide || libelle, "span")) + '</li>';
  const mail = ed.email || contenu.contact?.email || "";
  const lienMail = mail ? '<a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>' : aRenseigner("legal.editeur.email", "span");
  const photos = contenu.credits?.photos;
  const illustrations = contenu.credits?.illustrations;
  corps.innerHTML =
    '<section><h3>Éditeur du site</h3><ul>' +
      ligne("Nom", ed.nom || nomGroupe, "legal.editeur.nom") +
      ligne("Statut", ed.statut, "legal.editeur.statut (association, groupe non constitué en société…)") +
      ligne("Responsable de la publication", ed.responsable, "legal.editeur.responsable") +
      ligne("Adresse", ed.adresse, "legal.editeur.adresse") +
      '<li><strong>Contact :</strong> ' + lienMail + '</li>' +
    '</ul></section>' +
    '<section><h3>Hébergeur</h3><ul>' +
      ligne("Société", he.nom, "legal.hebergeur.nom") +
      ligne("Adresse", he.adresse, "legal.hebergeur.adresse") +
      (he.site ? '<li><strong>Site :</strong> <a href="' + esc(urlSure(he.site)) + '"' + attrsLien(he.site) + '>' + esc(he.site.replace(/^https?:\/\//, "")) + '</a></li>' : "") +
    '</ul></section>' +
    '<section><h3>Propriété intellectuelle</h3><p>Le nom, le logo, les textes et les visuels de Drop Out sont la propriété du groupe. ' +
      (photos ? 'Les photographies sont © ' + esc(photos) + ', publiées avec son accord. ' : '') +
      (illustrations ? 'Les illustrations du groupe sont l’œuvre de ' + esc(illustrations) + ', © ' + esc(illustrations) + '. ' : '') +
      'Toute reproduction sans autorisation écrite est interdite. Les morceaux joués en concert qui sont des reprises restent la propriété de leurs auteurs.</p></section>' +
    '<section><h3>Données personnelles et cookies</h3>' +
      '<p><strong>Ce site ne dépose aucun cookie de suivi et n’utilise aucun outil de mesure d’audience.</strong> Il n’a pas de compte utilisateur. Il ne reçoit de données personnelles que si vous les envoyez vous-même : par le formulaire « Un projet ? » de MKL.studio ou en activant les alertes, comme détaillé ci-dessous.</p>' +
      '<p>Quelques informations techniques restent uniquement sur votre appareil (stockage local du navigateur), sans jamais être envoyées au groupe : le fait d’avoir déjà vu l’animation d’accueil, votre choix d’activer ou non les alertes « nouvelle date », et vos accords pour les encarts Facebook et Instagram. Elles sont nécessaires au fonctionnement du site et se suppriment en vidant les données du site dans votre navigateur.</p>' +
      '<p><strong>Facebook et Instagram.</strong> Ces deux encarts sont fournis par Meta Platforms Ireland Limited. Tant que vous n’avez pas cliqué sur « Afficher », rien n’est chargé depuis ces services. Après votre accord, ils peuvent déposer des cookies et recevoir votre adresse IP, selon leur propre politique de confidentialité. L’accord est conservé 6 mois et se retire à tout moment.</p>' +
      '<p><button type="button" class="bouton mentions__retirer" data-retirer-accords>Retirer mes accords</button></p>' +
      (contenu.notifications?.serveur ? '<p><strong>Alertes « nouvelle date ».</strong> Si vous activez les alertes, votre navigateur fournit une adresse technique propre à votre appareil, avec deux clés de chiffrement. Elles sont enregistrées sur un serveur de notifications (Cloudflare, Inc.) pour une seule finalité : vous envoyer les notifications du groupe. Aucun nom, courriel ou numéro n’est demandé. Cet enregistrement repose sur votre consentement : il est supprimé dès que vous désactivez les alertes, et automatiquement lorsque l’adresse n’est plus valide.</p>' : '') +
      (contenu.notifications?.serveur ? '<p><strong>Formulaire « Un projet ? » (MKL.studio).</strong> Si vous écrivez par ce formulaire, votre adresse e-mail et votre message sont transmis par un serveur relais (Cloudflare, Inc.) puis envoyés par courriel, via le service Resend, à ' + esc(ed.responsable || "MKL.studio") + ', responsable du traitement (' + lienMail + '). Ils servent uniquement à répondre à votre demande, sur la base de votre démarche. Le serveur du site n’en garde aucune copie : il ne retient qu’un compteur anonyme pour limiter les envois abusifs, sans adresse IP ni identifiant. Votre message reste dans la boîte de réception du responsable le temps de l’échange, puis est supprimé au plus tard 12 mois après le dernier contact. Ces prestataires peuvent traiter les données hors de l’Union européenne, notamment aux États-Unis, avec les garanties prévues par le RGPD. Vos données ne sont ni vendues ni utilisées à d’autres fins.</p>' : '') +
      '<p><strong>Contact par courriel.</strong> Si vous écrivez au groupe, votre adresse et votre message ne servent qu’à vous répondre ; ils ne sont ni transmis ni conservés au-delà de l’échange.</p>' +
      '<p><strong>Vos droits.</strong> Conformément au RGPD et à la loi Informatique et Libertés, vous pouvez demander l’accès, la rectification ou la suppression de vos données en écrivant à ' + lienMail + '. En cas de difficulté, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr</a>).</p></section>' +
    '<section><h3>Liens externes</h3><p>Le site renvoie vers des sites tiers (réseaux sociaux, partenaires, salles). Le groupe n’est pas responsable de leur contenu.</p></section>' +
    '<section><h3>Crédits</h3><p>Site conçu par Mikael G. pour Drop Out. Polices Anton et Barlow Condensed (licence SIL Open Font), hébergées sur le site lui-même.</p></section>' +
    (l.misAJour ? '<p class="mentions__maj">Dernière mise à jour : ' + esc(l.misAJour) + '</p>' : "");

  $("[data-retirer-accords]", corps).addEventListener("click", () => {
    ["facebook", "instagram"].forEach((c) => ecrireAccord(c, false));
    $$("[data-embed]").forEach((c) => { const b = $("[data-retirer]", c); if (b) b.click(); });
    toast("Accords retirés");
  });
  ouvrir.forEach((b) => b.addEventListener("click", () => { dlg.showModal(); $("[data-mentions-carte]", dlg).focus({ preventScroll: true }); }));
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-mentions-fermer]")) dlg.close(); });
}

/* membres : noir et blanc, couleur au défilement (tactile) */
// sans survol possible, une photo reste en noir et blanc presque tout son passage et ne prend ses couleurs que quand son centre arrive au milieu de l'écran (± 12 % de sa hauteur). simple fondu de filtre
const ZONE_COULEUR = 0.12;
function couleurAuDefilement() {
  const liste = $("[data-membres]");
  const tuiles = $$(".membre", liste);
  const etroit = matchMedia("(max-width: 39.99rem)");
  if (matchMedia("(hover: hover)").matches) return;
  let demande = 0;
  const maj = () => {
    demande = 0;
    if (etroit.matches) return; // grille à 2 colonnes : le toucher décide, pas le défilement
    const milieu = innerHeight / 2;
    const marge = innerHeight * ZONE_COULEUR;
    // plusieurs tuiles sur une rangée (tablette, paysage) : seule la plus proche du centre horizontal s'allume
    const centreX = innerWidth / 2;
    let elue = null, meilleure = Infinity;
    for (const t of tuiles) {
      const r = t.getBoundingClientRect();
      if (Math.abs(r.top + r.height / 2 - milieu) >= marge) continue;
      const d = Math.abs(r.left + r.width / 2 - centreX);
      if (d < meilleure) { meilleure = d; elue = t; }
    }
    tuiles.forEach((t) => t.classList.toggle("est-en-couleur", t === elue));
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(maj); };
  addEventListener("scroll", planifier, { passive: true });
  liste.addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", planifier, { passive: true });
  maj();
}

/* néons à côté des titres de section */
// trois petits tirets lumineux, les uns sous les autres, à droite de chaque titre (couleur du bandeau, via --accent)
function initNeonTitres() {
  const boites = [];
  $$(".bloc__titre").forEach((h) => {
    if (h.parentElement?.classList.contains("titre-neon")) return;
    const boite = document.createElement("div");
    boite.className = "titre-neon";
    h.before(boite);
    // le titre est posé dans une « bande » qui porte aussi les petits points BD autour du bandeau
    const bande = document.createElement("div");
    bande.className = "titre-bande";
    bande.innerHTML = '<span class="bd-points" aria-hidden="true"></span>';
    bande.append(h);
    boite.append(bande);
    // compos et clip : un triangle play en néon ; les autres sections : trois tirets
    boite.insertAdjacentHTML("beforeend", h.id === "ecouter-titre" || h.id === "clip-titre"
      ? '<span class="neon-play" aria-hidden="true"><svg viewBox="0 0 24 28" focusable="false"><path d="M4.5 3.5 L20.5 14 L4.5 24.5 Z"/></svg></span>'
      : '<span class="neon-pile" aria-hidden="true"><i></i><i></i><i></i></span>');
    boites.push(boite);
  });
  // les néons s'allument (petit délai, l'un après l'autre) quand le titre arrive à l'écran et s'éteignent quand on s'en éloigne. sans animations : toujours allumés
  if (mouvementReduit() || !("IntersectionObserver" in window)) { boites.forEach((b) => b.classList.add("est-allume")); return; }
  const obs = new IntersectionObserver((entrees) => {
    entrees.forEach((e) => e.target.classList.toggle("est-allume", e.isIntersecting));
  }, { rootMargin: "-5% 0px -5% 0px", threshold: 0.15 });
  boites.forEach((b) => obs.observe(b));
}

/* fiche d'un membre (téléphone) */
// un toucher sur une tuile ouvre une fiche en grand, en couleur, qui part de la tuile (animation FLIP : la carte glisse et grandit depuis la photo) ;
// les trois petits textes arrivent ensuite un par un (css). un toucher à côté de la carte ou échap la referme, pas de croix. tablette et ordinateur : inchangés
function initFiches() {
  const dlg = $("#fiche-membre");
  const liste = $("[data-membres]");
  if (!dlg || !liste) return;
  const carte = $("[data-fiche-carte]", dlg);
  const etroit = matchMedia("(max-width: 39.99rem), (orientation: landscape) and (max-height: 540px)"); // téléphone, y compris en paysage (où les tuiles n'affichent plus leurs mots)
  let tuile = null, ferme = true;

  const ouvrir = (t) => {
    const m = (contenu.membres || [])[Number(t.dataset.i)];
    if (!m) return;
    tuile = t; ferme = false;
    $(".fiche__logo", dlg)?.getAnimations().forEach((an) => an.cancel());
    carte.getAnimations().forEach((an) => an.cancel()); // efface l'animation de retour restée figée (fill: forwards) de la fiche précédente
    const base = m.photo?.base ? urlSure(m.photo.base) : "";
    const img = $("[data-fiche-img]", dlg);
    const grande = base ? `${base}-960.webp` : (m.photo?.src ? urlSure(m.photo.src) : "");
    // la photo de ce membre s'affiche tout de suite (version déjà chargée dans sa tuile), puis la grande la remplace. sans ça l'ancienne photo restait affichée jusqu'au chargement de la nouvelle
    const deja = $("img", t)?.currentSrc || "";
    img.removeAttribute("srcset");
    img.src = deja || grande;
    if (deja && grande && deja !== grande) {
      const pre = new Image();
      pre.src = grande;
      pre.decode().then(() => { if (tuile === t && !ferme) img.src = grande; }).catch(() => { /* la version de la tuile reste affichée */ });
    }
    img.alt = m.photo?.alt || "";
    img.style.objectPosition = m.photo?.position || "50% 25%";
    $("[data-fiche-role]", dlg).textContent = m.nom && m.role ? m.role : "";
    $("[data-fiche-nom]", dlg).textContent = m.nom || m.role || "Membre";
    $("[data-fiche-traits]", dlg).innerHTML = (m.traits || []).filter(Boolean).map((tr, j) => `<li style="--rang:${j}">${esc(tr)}</li>`).join("");
    carte.setAttribute("style", t.getAttribute("style") || ""); // reprend --couleur / --encre du membre
    dlg.showModal();
    carte.focus({ preventScroll: true }); // focus sur la carte (pas de contour au toucher)
    t.classList.add("est-ouverte"); // la tuile quitte sa place : c'est elle qui grandit au milieu, pas une deuxième
    if (mouvementReduit()) return;
    // la carte part de la photo de la tuile (même position, même taille) puis grandit jusqu'au milieu de l'écran
    const a = ($(".membre__photo", t) || t).getBoundingClientRect(), b = carte.getBoundingClientRect();
    carte.animate([
      { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` },
      { transform: "none" },
    ], { duration: 420, easing: "cubic-bezier(.2, .8, .2, 1)" });
    img.animate([{ filter: "grayscale(1) contrast(1.12)" }, { filter: "none" }], { duration: 700, easing: "ease-out", fill: "backwards" });
  };

  const fermer = () => {
    if (ferme) return;
    ferme = true;
    const logo = $(".fiche__logo", dlg);
    const fin = (pose) => {
      logo?.getAnimations().forEach((an) => an.cancel()); carte.getAnimations().forEach((an) => an.cancel());
      dlg.close(); tuile?.classList.remove("est-ouverte"); tuile?.focus({ preventScroll: true });
    };
    if (mouvementReduit() || !tuile) { fin(); return; }
    // le logo repart dans l'autre sens : il redescend en s'effaçant
    logo?.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(.6rem)" }], { duration: 220, easing: "ease-in", fill: "forwards" });
    // retour vers la tuile
    const a = ($(".membre__photo", tuile) || tuile).getBoundingClientRect(), b = carte.getBoundingClientRect();
    carte.animate([
      { transform: "none", opacity: 1 },
      { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, opacity: 1 },
    ], { duration: 300, easing: "cubic-bezier(.55, 0, .9, .45)", fill: "forwards" }).finished.then(() => fin(true), () => fin());
  };

  liste.addEventListener("click", (e) => {
    const t = e.target.closest(".membre");
    if (t && etroit.matches) ouvrir(t);
  });
  liste.addEventListener("keydown", (e) => {
    const t = e.target.closest(".membre");
    if (t && etroit.matches && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ouvrir(t); }
  });
  // un toucher n'importe où (carte, fond, logo) referme la fiche
  dlg.addEventListener("click", fermer);
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); fermer(); }); // échap
  addEventListener("resize", () => { if (!etroit.matches && dlg.open) { ferme = true; dlg.close(); tuile?.classList.remove("est-ouverte"); } }, { passive: true });
}

/* indicateur de défilement de l'en-tête */
// visible en haut de page, il s'efface dès qu'on défile
function initIndicateur() {
  const suite = $("[data-hero-suite]");
  if (!suite) return;
  const maj = () => suite.classList.toggle("est-cache", scrollY > 60);
  addEventListener("scroll", maj, { passive: true });
  maj();
  // un toucher fait descendre d'à peu près un écran (le lien #dates est déjà à l'écran sur téléphone)
  suite.addEventListener("click", (e) => {
    e.preventDefault();
    scrollBy({ top: innerHeight * 0.85, behavior: mouvementReduit() ? "auto" : "smooth" });
  });
}

/* Tom et Wil (de chaque côté de la prochaine date) n'apparaissent qu'une fois tout chargé : la page entière, les images, et l'écran de démarrage s'il y en a un. la classe persos-prets sur <html> les fait paraître en fondu (style.css) */
function initPersos() {
  const racine = document.documentElement;
  const montre = () => racine.classList.add("persos-prets");
  const attendIntro = () => {
    if (!racine.classList.contains("intro-actif")) { requestAnimationFrame(() => setTimeout(montre, 150)); return; }
    const obs = new MutationObserver(() => { if (!racine.classList.contains("intro-actif")) { obs.disconnect(); setTimeout(montre, 150); } });
    obs.observe(racine, { attributes: true, attributeFilter: ["class"] });
    setTimeout(() => { obs.disconnect(); montre(); }, 8000); // filet de sécurité
  };
  if (document.readyState === "complete") attendIntro();
  else addEventListener("load", attendIntro, { once: true });
}

/* barre fixe : le gros logo monte et se pose dedans */
// pendant le défilement le logo de l'en-tête se déplace et rétrécit jusqu'à l'emplacement du logo de la barre, qui s'assombrit en même temps (--p de 0 à 1).
// arrivé, il passe le relais au petit logo de la barre, placé exactement au même endroit. animations réduites : pas de déplacement, la barre apparaît quand le logo est sorti de l'écran
function initBarre() {
  const barre = $("[data-barre]");
  const logo = $(".hero__logo");
  const cible = $("[data-barre-logo]");
  if (!barre || !logo || !cible) return;
  const lisse = (t) => t * t * (3 - 2 * t);
  let depart = null, demande = 0;

  const mesurer = () => {
    logo.style.transform = "";
    const r = logo.getBoundingClientRect();
    depart = { x: r.left, y: r.top + scrollY, l: r.width, h: r.height };
  };
  const maj = () => {
    demande = 0;
    if (!depart) mesurer();
    const t = cible.getBoundingClientRect(); // emplacement fixe dans la barre
    const course = Math.max(1, depart.y - t.top);
    let p;
    if (mouvementReduit()) {
      p = scrollY > depart.y + depart.h ? 1 : 0;
      logo.style.transform = "";
    } else {
      p = Math.min(1, Math.max(0, scrollY / course));
      const e = lisse(p);
      const naturelY = depart.y - scrollY; // où serait le logo sans animation
      const x = depart.x + (t.left - depart.x) * e;
      const y = naturelY + (t.top - naturelY) * e;
      const echelle = 1 + (t.width / depart.l - 1) * e;
      logo.style.transform = p > 0 ? `translate(${(x - depart.x).toFixed(1)}px, ${(y - naturelY).toFixed(1)}px) scale(${echelle.toFixed(4)})` : "";
    }
    barre.style.setProperty("--p", p.toFixed(3));
    const arrive = p >= 1;
    barre.classList.toggle("est-arrivee", arrive);
    barre.classList.toggle("est-active", p > 0.6);
    logo.classList.toggle("est-pose", arrive && !mouvementReduit());
    logo.classList.toggle("en-vol", p > 0.02 && !mouvementReduit()); // l'œil se recentre dès que le logo part : plus de saut au moment du relais
  };
  const planifier = () => { if (!demande) demande = requestAnimationFrame(maj); };
  addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", () => { depart = null; planifier(); }, { passive: true });
  // les polices et le logo peuvent décaler la mise en page au chargement
  addEventListener("load", () => { depart = null; planifier(); });
  maj();
}

/* démarrage */

initIntro();
// filet : tout lien vers un autre site s'ouvre dans un nouvel onglet, même écrit sans target
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href]");
  if (!a || a.target || a.hasAttribute("download")) return;
  if (/^https?:/i.test(a.href) && new URL(a.href).origin !== location.origin) { a.target = "_blank"; a.rel = "noopener"; }
}, true);

initNeonTitres(); // tôt : les titres sont déjà dans la page
initProgression();
initFond();
animerTexteHero();
initParallaxeHero();
initDiaporama();
initVideoFond();
initOeil();
initIndicateur();
initPersos();
initBarre();
initProjecteurs();
rendrePresentation();
rendreMembres();
initFlechesMembres();
rendreGalerie(nbVideos());
rendreVideos();
initSliderGalerie();
$("[data-clip]").hidden = !nbVideos();
rendrePartenaires();
pauseHorsEcran();
couleurAuDefilement();
initFiches();
initBooking();
initMkl();
rendreMusique();
initMenu();
initRetour();
rendreReseaux();
rendreEmbeds(); // le cadre facebook s'affiche tout de suite ; les articles le remplacent si le serveur répond
rendreActus();
rendreMentions();
rendreCredits();
$("[data-annee]").textContent = new Date().getFullYear();
const apparitions = apparitionsAuDefilement();
initPwa();
initAlertes();
rendreProgramme().finally(() => apparitions.rafraichir()); // les affiches et dates arrivent après le chargement

// retour du réseau : on recharge le programme pour afficher la version à jour
addEventListener("online", rendreProgramme);
