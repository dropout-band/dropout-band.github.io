// pwa : service worker et aide à l'installation. pas de pop-up à l'arrivée, l'action est dans le pied de page et le menu

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
  // en local : pas de service worker, on retire les anciens et leurs caches (cf. LOCAL dans sw.js)
  if (/^(localhost|127.|192.168.|10.|172.(1[6-9]|2d|3[01]).)/.test(location.hostname)) {
    navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    window.caches?.keys().then((ns) => ns.forEach((n) => caches.delete(n)));
    window.addEventListener("beforeinstallprompt", (e) => e.preventDefault());
    return;
  }
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    // chemin relatif pour marcher aussi dans un sous-dossier github pages
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service worker non enregistré :", e));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde l'événement pour le bouton du pied de page
    demandeInstallation = e;
  });
  window.addEventListener("appinstalled", () => { demandeInstallation = null; majBoutons(); });

  document.querySelectorAll("button[data-installer]").forEach((b) => b.addEventListener("click", installer));
  majBoutons();
}
