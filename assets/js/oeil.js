// Clignement du point (l'« œil » du logo) : un clignement rapide, déclenché seulement
// quand le regard est à l'arrêt — jamais pendant un déplacement.
// Le regard est animé en CSS par deux boucles indépendantes (@keyframes oeil-x : 4,5 s,
// oeil-y : 6,7 s, dans style.css). Ici, on lit où elles en sont (API Web Animations) et on ne
// cligne que si, pendant toute la durée du clignement, ni l'une ni l'autre ne bouge.
// Les pourcentages ci-dessous sont les passages d'une position à l'autre de ces @keyframes :
// si l'on modifie les déplacements dans style.css, il faut les mettre à jour ici.

const REGARD_X = { periode: 5900, mouvements: [[10, 14], [30, 34], [44, 48], [58, 62], [70, 74], [86, 90]] };
const REGARD_Y = { periode: 8800, mouvements: [[8, 12], [26, 30], [40, 44], [58, 62], [72, 76], [88, 92]] };

// Le regard bouge-t-il à un moment de [t, t + duree] ? (t et duree en ms ; la fenêtre peut déborder sur la boucle suivante)
function bouge({ periode, mouvements }, t, duree) {
  const pos = ((t % periode) + periode) % periode;
  return mouvements.some(([a, b]) => {
    const debut = (a / 100) * periode, fin = (b / 100) * periode;
    return [0, periode].some((decalage) => pos < fin + decalage && pos + duree > debut + decalage);
  });
}

export function initOeil() {
  const oeil = document.querySelector(".logo__oeil");
  if (!oeil || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SIMPLE = 260, DOUBLE = 560, MARGE = 260; // ms ; la marge évite de cligner juste avant un départ du regard
  // Rythme naturel : des clignements souvent rapprochés, parfois une pause plus longue (distribution
  // penchée vers le court, comme chez un humain : 1 à 4,5 s, moyenne vers 2,3 s).
  const delai = () => 900 + Math.pow(Math.random(), 1.7) * 3600;
  let prochain = performance.now() + 1400 + Math.random() * 1600;
  let enMouvement = false;
  // Seconde sécurité : la position réelle du point (lue dans le style calculé) ne doit pas avoir
  // changé depuis le contrôle précédent. Cela couvre tout décalage avec les valeurs ci-dessus.
  const position = () => { const s = getComputedStyle(oeil); return `${s.translate}|${s.transform}`; };
  let precedente = position();

  const cligner = (double) => oeil.animate(
    double
      ? [{ scale: "1 1" }, { scale: "1 .08", offset: 0.17 }, { scale: "1 1", offset: 0.4 }, { scale: "1 .08", offset: 0.62 }, { scale: "1 1" }]
      : [{ scale: "1 1" }, { scale: "1 .08", offset: 0.4 }, { scale: "1 1" }],
    { duration: double ? DOUBLE : SIMPLE, easing: "ease-in-out" },
  );

  setInterval(() => {
    if (document.hidden) return;
    const maintenant = position(), immobile = maintenant === precedente;
    precedente = maintenant;
    // Un regard qui se pose est souvent suivi d'un clignement : si le suivant approche, on le rapproche.
    if (immobile && enMouvement && prochain - performance.now() < 1500 && Math.random() < 0.55) prochain = performance.now() + 140 + Math.random() * 330;
    enMouvement = !immobile;
    if (!immobile || performance.now() < prochain) return;
    const animations = oeil.getAnimations();
    const x = animations.find((a) => a.animationName === "oeil-x");
    const y = animations.find((a) => a.animationName === "oeil-y");
    if (!x || !y) return; // logo posé dans la barre : le regard est arrêté, on ne cligne pas non plus
    const double = Math.random() < 0.22;
    const duree = (double ? DOUBLE : SIMPLE) + MARGE;
    if (bouge(REGARD_X, Number(x.currentTime), duree) || bouge(REGARD_Y, Number(y.currentTime), duree)) return; // on réessaie au prochain tour
    cligner(double);
    prochain = performance.now() + delai();
  }, 60);
}
