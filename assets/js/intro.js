// Écran de démarrage : fond noir uni, le logo apparaît au centre, puis vient se poser à sa
// place dans l'en-tête pendant que le fond s'efface.
// - Affiché quand on revient après plus de 5 minutes d'absence (ou à la toute première visite) :
//   le script de index.html décide avant le premier affichage, en posant la classe « intro-actif »
//   sur <html>, d'après l'heure de dernière présence enregistrée ici (localStorage « dropout-vu »).
//   Recharger la page ou revenir vite sur le site ne le rejoue donc pas. Le délai (5 minutes) se règle
//   dans le script en tête de index.html.
// - Jamais avec « réduire les animations », ni si l'adresse porte une ancre (#dates…) ou ?agenda.
// - ?intro force l'affichage ; ?intro=lent le ralentit trois fois (pour le mettre au point).
// - Filet de sécurité : si ce script ne se lance pas, le CSS efface l'écran de lui-même après 6 s.

// Enregistre « je suis là » : à l'ouverture, toutes les 30 s tant que la page est visible, et au
// moment où elle se cache ou se ferme. L'absence se mesure donc depuis la dernière présence réelle.
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
  racine.style.overflow = "hidden"; // pas de défilement pendant l'écran de démarrage

  // La page est prête : polices, première photo décodée, chargement terminé
  const photo = document.querySelector(".diapo.est-active");
  const prete = Promise.all([
    document.fonts?.ready,
    photo?.decode?.().catch(() => {}),
    document.readyState === "complete" ? null : new Promise((r) => addEventListener("load", r, { once: true })),
  ]);
  // Au moins 1,3 s (le temps de voir le logo), au plus 4,5 s (réseau lent : on ne bloque pas)
  Promise.race([Promise.all([attendre(1300 * k), prete]), attendre(4500 * k)]).then(() => {
    const depart = logo.getBoundingClientRect();
    const cible = logoSite.getBoundingClientRect(); // l'emplacement exact du logo de l'en-tête
    if (!depart.width || !cible.width) { fin(); return; }
    const dx = cible.left + cible.width / 2 - (depart.left + depart.width / 2);
    const dy = cible.top + cible.height / 2 - (depart.top + depart.height / 2);
    const echelle = cible.width / depart.width;

    logo.getAnimations().forEach((a) => a.cancel()); // l'animation d'entrée est finie : on repart de l'état affiché
    logo.style.opacity = "1";
    const deplacement = logo.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${echelle})` }],
      { duration: 950 * k, easing: "cubic-bezier(.65, 0, .2, 1)", fill: "forwards" },
    );
    // Le fond s'efface pendant que le logo voyage : la page apparaît derrière lui
    intro.animate(
      [{ backgroundColor: "rgb(10 10 10 / 1)" }, { backgroundColor: "rgb(10 10 10 / 0)" }],
      { duration: 750 * k, delay: 250 * k, easing: "ease-in-out", fill: "forwards" },
    );
    // Posé : le vrai logo prend le relais au pixel près, l'écran de démarrage disparaît
    deplacement.finished.then(fin, fin);
  });
}
