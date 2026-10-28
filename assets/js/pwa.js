// PWA : service worker et aide « Ajouter à l'écran d'accueil ».
// Aucune sollicitation à l'arrivée : l'action reste dans le pied de page et le menu.

let demandeInstallation = null;

const estAutonome = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const estIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS se présente comme un Mac

const AIDE_IOS = `
  <ol>
    <li>Ouvrez ce site dans Safari.</li>
    <li>Touchez le bouton Partager (carré avec une flèche vers le haut), en bas ou en haut de l’écran.</li>
    <li>Choisissez « Sur l’écran d’accueil », puis « Ajouter ».</li>
  </ol>
  <p class="note">Sur iPhone et iPad, l’ajout se fait uniquement par ce menu. Dans certains navigateurs autres que Safari, l’option peut ne pas être proposée.</p>`;

const AIDE_GENERALE = `
  <p>Votre navigateur ne propose pas d’ajout direct depuis cette page.</p>
  <ol>
    <li>Ouvrez le menu du navigateur (⋮ ou ⋯).</li>
    <li>Cherchez « Ajouter à l’écran d’accueil » ou « Installer l’application ».</li>
  </ol>
  <p class="note">Selon l’appareil et le navigateur, cette option peut ne pas exister. Le site reste utilisable normalement.</p>`;

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
  dialogue.querySelector("[data-aide-contenu]").innerHTML = estIos() ? AIDE_IOS : AIDE_GENERALE;
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
