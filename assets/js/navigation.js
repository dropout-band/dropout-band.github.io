// Navigation « application » sur téléphone :
// - bouton « retour » du téléphone : ferme la fenêtre ouverte au lieu de quitter l'appli ;
// - menu d'accès rapide : trois traits au centre de la barre du haut, qui ouvrent la liste des sections ;
// - « Partager » : envoie le lien de la page de téléchargement (app/), pas celui du site.
import { toast, copier, mouvementReduit } from "./outils.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- Bouton « retour » ---------- */
// Chaque fenêtre qui s'ouvre (Contact, fiche d'un membre, affiche agrandie, aide…) ajoute une
// étape à l'historique ; « retour » la referme. Fermée autrement (croix, toucher à côté, Échap),
// l'étape est retirée pour que « retour » ne reste pas sans effet.
export function initRetour() {
  // Fermer une fenêtre fait « reculer » l'historique : sans ceci, le navigateur remettrait la page
  // à l'ancien endroit de défilement et annulerait, par exemple, le saut vers une section du menu.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  let silencieux = false; // le prochain « popstate » vient de nous : on l'ignore

  const ouverte = (d) => d.hasAttribute("open");
  const suivre = (d) => {
    d._suivi = ouverte(d);
    new MutationObserver(() => {
      if (ouverte(d) && !d._suivi) { d._suivi = true; history.pushState({ dropoutFenetre: 1 }, ""); }
    }).observe(d, { attributes: true, attributeFilter: ["open"] });
    d.addEventListener("close", () => {
      d._suivi = false;
      if (history.state?.dropoutFenetre) { silencieux = true; history.back(); }
    });
  };
  $$("dialog").forEach(suivre);

  addEventListener("popstate", () => {
    if (silencieux) { silencieux = false; return; }
    const d = $$("dialog").filter(ouverte).pop();
    if (!d) return;
    // Même chemin que la touche Échap : la fiche d'un membre se referme avec son animation
    const evt = new Event("cancel", { cancelable: true });
    d.dispatchEvent(evt);
    if (!evt.defaultPrevented) d.close();
  });
}

/* ---------- Partager ---------- */
export async function partager() {
  const url = new URL("app/", location.href).href; // la page de téléchargement
  const donnees = { title: "Drop Out", text: "Drop Out, rock alternatif d’Ardèche : installez l’appli pour les dates et les alertes.", url };
  if (navigator.share) {
    try { await navigator.share(donnees); return; }
    catch (e) { if (e?.name === "AbortError") return; /* annulé : rien à faire ; autre erreur : on copie */ }
  }
  toast((await copier(url)) ? "Lien de l’appli copié" : url);
}

/* ---------- Menu d'accès rapide ---------- */
export function initMenu() {
  const dlg = $("#menu-rapide");
  const ouvrir = $("[data-menu-ouvrir]");
  if (!dlg || !ouvrir) return;
  const boutons = $$("[data-cible]", dlg);

  const ouvrirMenu = () => {
    let actif = null;
    for (const b of boutons) {
      const s = $(b.dataset.cible);
      b.hidden = !s || s.hidden; // « Écouter » n'apparaît que s'il y a de la musique
      if (!b.hidden && s.getBoundingClientRect().top <= innerHeight * 0.4) actif = b;
    }
    boutons.forEach((b) => { b.classList.toggle("est-actif", b === actif); if (b === actif) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    dlg.showModal();
    $(".menu__panneau", dlg).focus({ preventScroll: true }); // pas de cadre de focus sur la croix à l'ouverture
  };
  ouvrir.addEventListener("click", ouvrirMenu);

  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-menu-fermer]")) { dlg.close(); return; } // fond ou croix
    const b = e.target.closest("button");
    if (!b) return;
    dlg.close();
    if (b.hasAttribute("data-partager")) { partager(); return; }
    if (b.hasAttribute("data-menu-booking")) { $("[data-booking]")?.click(); return; } // ouvre la fenêtre Booking
    $(b.dataset.cible)?.scrollIntoView({ behavior: mouvementReduit() ? "auto" : "smooth", block: "start" });
  });
}
