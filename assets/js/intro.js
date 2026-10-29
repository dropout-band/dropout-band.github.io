// écran de démarrage : fond noir, le logo apparaît au centre puis vient se poser dans l'en-tête pendant que le fond s'efface.
// affiché à la première visite ou après plus de 5 min d'absence (le script de index.html pose la classe intro-actif sur <html> d'après localStorage « dropout-vu »).
// jamais avec animations réduites, ni avec une ancre (#dates) ou ?agenda. ?intro force l'affichage, ?intro=lent le ralentit x3.
// filet : si ce script ne tourne pas, le css efface l'écran après 6 s

// note la présence : à l'ouverture, toutes les 30 s tant que la page est visible, et quand elle se cache ou se ferme
function suivrePresence() {
  const marquer = () => { try { localStorage.setItem("dropout-vu", String(Date.now())); } catch { /* stockage indisponible */ } };
  marquer();
  setInterval(() => { if (!document.hidden) marquer(); }, 30000);
  document.addEventListener("visibilitychange", marquer);
  addEventListener("pagehide", marquer);
}

export function initIntro() {
  suivrePresence();
  const racine = document.documentElement;
  if (!racine.classList.contains("intro-actif")) return;
  const intro = document.getElementById("intro");
  const logo = intro?.querySelector(".demarrage__logo");
  const logoSite = document.querySelector(".hero__logo");
  const fin = () => { racine.classList.remove("intro-actif"); racine.style.overflow = ""; intro?.remove(); };
  if (!intro || !logo || !logoSite) { fin(); return; }

  const k = new URLSearchParams(location.search).get("intro") === "lent" ? 3 : 1;
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  racine.style.overflow = "hidden"; // pas de défilement pendant l'intro

  // page prête : polices, première photo décodée, chargement fini
  const photo = document.querySelector(".diapo.est-active");
  const prete = Promise.all([
    document.fonts?.ready,
    photo?.decode?.().catch(() => {}),
    document.readyState === "complete" ? null : new Promise((r) => addEventListener("load", r, { once: true })),
  ]);
  // entre 0,7 s (le temps de voir le logo) et 3,5 s (réseau lent : on ne bloque pas)
  Promise.race([Promise.all([attendre(700 * k), prete]), attendre(3500 * k)]).then(() => {
    const depart = logo.getBoundingClientRect();
    const cible = logoSite.getBoundingClientRect(); // emplacement exact du logo de l'en-tête
    if (!depart.width || !cible.width) { fin(); return; }
    const dx = cible.left + cible.width / 2 - (depart.left + depart.width / 2);
    const dy = cible.top + cible.height / 2 - (depart.top + depart.height / 2);
    const echelle = cible.width / depart.width;

    logo.getAnimations().forEach((a) => a.cancel()); // animation d'entrée finie : on repart de l'état affiché
    logo.style.opacity = "1";
    const deplacement = logo.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${echelle})` }],
      { duration: 650 * k, easing: "cubic-bezier(.65, 0, .2, 1)", fill: "forwards" },
    );
    // le fond s'efface pendant que le logo voyage
    intro.animate(
      [{ backgroundColor: "rgb(10 10 10 / 1)" }, { backgroundColor: "rgb(10 10 10 / 0)" }],
      { duration: 500 * k, delay: 150 * k, easing: "ease-in-out", fill: "forwards" },
    );
    // posé : le vrai logo prend le relais, l'intro disparaît
    deplacement.finished.then(fin, fin);
  });
}
