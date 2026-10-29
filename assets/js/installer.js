// page « Télécharger l'application » (app/index.html).
// android/chrome/edge : le bouton ouvre l'install du navigateur. iPhone ou autre : il montre le mode d'emploi. déjà en appli : on file sur le site.

import { initOeil } from "./oeil.js";
import { aideInstallation } from "./aide-installation.js";

const $ = (s) => document.querySelector(s);
const bouton = $("[data-telecharger]");
const etat = $("[data-etat]");
const aide = $("[data-aide]");

const autonome = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
initOeil(); // le point du logo cligne à l'arrêt

// déjà dans l'appli : cette page ne sert plus, direction le site
if (autonome()) location.replace("../");

// le service worker est nécessaire à l'install ; chemin relatif pour le sous-dossier
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
  // pas d'install directe possible : on explique
  etat.textContent = window.isSecureContext ? "" : "L’installation fonctionne sur le site en ligne (https), pas sur cette adresse.";
  const mode = aideInstallation();
  aide.innerHTML = `<h2>${mode.titre}</h2>${mode.html}`;
  aide.hidden = false;
});
