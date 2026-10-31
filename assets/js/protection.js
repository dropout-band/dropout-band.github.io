// Dissuasion : bloque les gestes courants pour enregistrer photos et vidéos.
// Ne rend rien inviolable (le navigateur doit recevoir les fichiers pour les afficher).

const MEDIAS = "img, video, picture, canvas, svg";

function habille(video) {
  video.setAttribute("controlslist", "nodownload noremoteplayback");
  video.setAttribute("disablepictureinpicture", "");
  video.disablePictureInPicture = true;
}

export function initProtection() {
  // clic droit / appui long sur un média
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest?.(MEDIAS)) e.preventDefault();
  });

  // glisser-déposer d'une image vers le bureau
  document.addEventListener("dragstart", (e) => {
    if (e.target.closest?.(MEDIAS)) e.preventDefault();
  });

  // vidéos présentes et créées plus tard (liste des clips générée en JS)
  document.querySelectorAll("video").forEach(habille);
  new MutationObserver((lots) => {
    for (const lot of lots) for (const n of lot.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches("video")) habille(n);
      n.querySelectorAll?.("video").forEach(habille);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
