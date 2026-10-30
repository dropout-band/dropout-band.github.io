// navigation façon appli sur téléphone : bouton retour (ferme la fenêtre ouverte au lieu de quitter), menu rapide au centre de la barre,
// partage du lien de la page de téléchargement (app/)
import { toast, copier, mouvementReduit } from "./outils.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* bouton retour */
// chaque fenêtre ouverte (contact, fiche, affiche, aide...) ajoute une étape à l'historique et « retour » la referme.
// fermée autrement (croix, clic à côté, échap), l'étape est retirée pour que « retour » ne soit pas sans effet
export function initRetour() {
  // fermer une fenêtre fait reculer l'historique ; sans ça le navigateur remet l'ancien défilement et casse par exemple le saut vers une section du menu
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  let silencieux = false; // le prochain popstate vient de nous, on l'ignore

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
    // comme échap : la fiche se ferme avec son animation
    const evt = new Event("cancel", { cancelable: true });
    d.dispatchEvent(evt);
    if (!evt.defaultPrevented) d.close();
  });
}

/* partager */
export async function partager() {
  const url = new URL("app/", location.href).href; // page de téléchargement
  const donnees = { title: "Drop Out", text: "Drop Out, rock alternatif d’Ardèche : installez l’appli pour les dates et les alertes.", url };
  if (navigator.share) {
    try { await navigator.share(donnees); return; }
    catch (e) { if (e?.name === "AbortError") return; /* annulé : rien ; autre erreur : on copie le lien */ }
  }
  toast((await copier(url)) ? "Lien de l’appli copié" : url);
}

/* menu rapide */
export function initMenu() {
  const dlg = $("#menu-rapide");
  const ouvrir = $("[data-menu-ouvrir]");
  if (!dlg || !ouvrir) return;
  const boutons = $$("[data-cible]", dlg);

  const ouvrirMenu = () => {
    let actif = null;
    for (const b of boutons) {
      const s = $(b.dataset.cible);
      b.hidden = !s || s.hidden; // la section musique n'apparaît que s'il y a des morceaux
      if (!b.hidden && s.getBoundingClientRect().top <= innerHeight * 0.4) actif = b;
    }
    boutons.forEach((b) => { b.classList.toggle("est-actif", b === actif); if (b === actif) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    dlg.showModal();
    $(".menu__panneau", dlg).focus({ preventScroll: true }); // pas de cadre de focus sur la croix à l'ouverture
  };
  ouvrir.addEventListener("click", ouvrirMenu);

  // fermeture en douceur : le tiroir repart vers la gauche et le fond s'éclaircit, puis la fenêtre se ferme vraiment
  let enFermeture = null;
  const fermer = () => {
    if (!dlg.open) return Promise.resolve();
    if (mouvementReduit()) { dlg.close(); return Promise.resolve(); }
    if (enFermeture) return enFermeture;
    enFermeture = new Promise((fini) => {
      const fin = () => { dlg.classList.remove("se-ferme"); enFermeture = null; if (dlg.open) dlg.close(); fini(); };
      dlg.classList.add("se-ferme");
      dlg.addEventListener("animationend", (e) => { if (e.target === dlg) fin(); }, { once: true });
      setTimeout(fin, 450); // filet de sécurité si l'animation ne se déclenche pas
    });
    return enFermeture;
  };
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); fermer(); }); // touche Échap ou geste « retour »

  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-menu-fermer]")) { fermer(); return; } // fond ou croix
    const b = e.target.closest("button");
    if (!b) return;
    fermer().then(() => {
      if (b.hasAttribute("data-partager")) { partager(); return; }
      if (b.hasAttribute("data-menu-booking")) { $("[data-booking]")?.click(); return; } // ouvre la fenêtre booking
      $(b.dataset.cible)?.scrollIntoView({ behavior: mouvementReduit() ? "auto" : "smooth", block: "start" });
    });
  });
}
