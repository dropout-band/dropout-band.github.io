// Page « Télécharger l'application » (app/index.html).
// - Android, Chrome, Edge : le bouton ouvre la fenêtre d'installation du navigateur.
// - iPhone, ou navigateur sans installation directe : le bouton affiche le mode d'emploi.
// - Si l'application est déjà ouverte comme application : on file directement sur le site.
// L'application installée s'ouvre sur l'accueil du site (start_url du manifeste), pas ici.

import { initOeil } from "./oeil.js";
import { aideInstallation } from "./aide-installation.js";

const $ = (s) => document.querySelector(s);
const bouton = $("[data-telecharger]");
const etat = $("[data-etat]");
const aide = $("[data-aide]");

const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
initOeil(); // le point du logo cligne quand il est à l'arrêt

// Déjà dans l'application : cette page n'a plus d'intérêt, direction le site
if (autonome()) location.replace("../");

// Le service worker est nécessaire à l'installation ; chemin relatif : fonctionne aussi en sous-dossier GitHub Pages
if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  navigator.serviceWorker.register("../sw.js").catch((e) => console.warn("Service worker non enregistré :", e));
}

let invite = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // on garde l'invitation pour le bouton
  invite = e;
});
addEventListener("appinstalled", () => {
  invite = null;
  aide.hidden = true;
  etat.textContent = "C’est fait : l’application est sur votre écran d’accueil.";
  etat.classList.add("est-ok");
});

bouton.addEventListener("click", async () => {
  etat.classList.remove("est-ok");
  if (invite) {
    aide.hidden = true;
    invite.prompt();
    const { outcome } = await invite.userChoice;
    invite = null; // une invitation ne sert qu'une fois
    etat.textContent = outcome === "accepted" ? "Installation en cours…" : "Pas de souci : vous pouvez réessayer quand vous voulez.";
    return;
  }
  // Pas d'installation directe possible : on explique, sans promettre ce qui ne marchera pas
  etat.textContent = window.isSecureContext ? "" : "L’installation fonctionne sur le site en ligne (https), pas sur cette adresse.";
  const mode = aideInstallation();
  aide.innerHTML = `<h2>${mode.titre}</h2>${mode.html}`;
  aide.hidden = false;
});
