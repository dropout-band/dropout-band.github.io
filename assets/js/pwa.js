// PWA : service worker et aide « Ajouter à l'écran d'accueil ».
// Aucune sollicitation à l'arrivée : l'action reste dans le pied de page et le menu.

import { aideInstallation } from "./aide-installation.js";

let demandeInstallation = null;

const estAutonome = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function majBoutons() {
  const visible = !estAutonome();
  document.querySelectorAll("[data-installer]").forEach((b) => { b.hidden = !visible; });
  document.querySelectorAll("[data-installer-zone]").forEach((z) => { z.hidden = !visible; });
}

async function installer() {
  if (demandeInstallation) {
    demandeInstallation.prompt();
    const { outcome } = await demandeInstallation.userChoice;
    demandeInstallation = null;
    if (outcome === "accepted") majBoutons();
    return;
  }
  const dialogue = document.getElementById("aide-installation");
  const aide = aideInstallation();
  dialogue.querySelector("[data-aide-contenu]").innerHTML = `<h3 class="aide__titre">${aide.titre}</h3>${aide.html}`;
  document.getElementById("menu")?.close();
  dialogue.showModal();
}

export function initPwa() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    // Chemin relatif : fonctionne aussi dans un sous-dossier GitHub Pages.
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service worker non enregistré :", e));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde la demande pour le bouton discret
    demandeInstallation = e;
  });
  window.addEventListener("appinstalled", () => { demandeInstallation = null; majBoutons(); });

  document.querySelectorAll("button[data-installer]").forEach((b) => b.addEventListener("click", installer));
  majBoutons();
}
