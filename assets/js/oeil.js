// clignement de l'œil du logo : les paupières se ferment, seulement quand le regard est à l'arrêt.
// le regard est animé en css par deux boucles indépendantes (oeil-x et oeil-y dans style.css). on lit où elles en sont (API Web Animations)
// et on ne cligne que si ni l'une ni l'autre ne bouge pendant tout le clignement.
// les pourcentages ci-dessous sont les paliers de ces keyframes : à mettre à jour si on les change dans le css

const REGARD_X = { periode: 5900, mouvements: [[10, 14], [30, 34], [44, 48], [58, 62], [70, 74], [86, 90]] };
const REGARD_Y = { periode: 8800, mouvements: [[8, 12], [26, 30], [40, 44], [58, 62], [72, 76], [88, 92]] };

// le regard bouge-t-il entre t et t + duree ? (ms ; la fenêtre peut déborder sur la boucle suivante)
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
  // rythme naturel : souvent rapprochés, parfois une longue pause (1 à 4,5 s, moyenne ~2,3 s)
  const delai = () => 900 + Math.pow(Math.random(), 1.7) * 3600;
  let prochain = performance.now() + 1400 + Math.random() * 1600;
  let enMouvement = false;
  // seconde sécurité : la position réelle du point (style calculé) ne doit pas avoir changé depuis le dernier contrôle
  const position = () => { const s = getComputedStyle(oeil); return `${s.translate}|${s.transform}`; };
  let precedente = position();

  // paupières du haut et du bas qui se rejoignent, l'œil garde sa taille et sa place ; fermeture plus vive que l'ouverture
  const OUVERT = "inset(0 0 0 0)", FERME = "inset(47% 0 47% 0)";
  const cligner = (double) => oeil.animate(
    double
      ? [{ clipPath: OUVERT }, { clipPath: FERME, offset: 0.15 }, { clipPath: OUVERT, offset: 0.4 }, { clipPath: FERME, offset: 0.57 }, { clipPath: OUVERT }]
      : [{ clipPath: OUVERT }, { clipPath: FERME, offset: 0.34 }, { clipPath: OUVERT }],
    { duration: double ? DOUBLE : SIMPLE, easing: "ease-in-out" },
  );

  setInterval(() => {
    if (document.hidden) return;
    const maintenant = position(), immobile = maintenant === precedente;
    precedente = maintenant;
    // un regard qui se pose est souvent suivi d'un clignement : on rapproche le suivant
    if (immobile && enMouvement && prochain - performance.now() < 1500 && Math.random() < 0.55) prochain = performance.now() + 140 + Math.random() * 330;
    enMouvement = !immobile;
    if (!immobile || performance.now() < prochain) return;
    const animations = oeil.getAnimations();
    const x = animations.find((a) => a.animationName === "oeil-x");
    const y = animations.find((a) => a.animationName === "oeil-y");
    if (!x || !y) return; // logo posé dans la barre : regard arrêté, pas de clignement
    const double = Math.random() < 0.22;
    const duree = (double ? DOUBLE : SIMPLE) + MARGE;
    if (bouge(REGARD_X, Number(x.currentTime), duree) || bouge(REGARD_Y, Number(y.currentTime), duree)) return; // on réessaie au prochain tour
    cligner(double);
    prochain = performance.now() + delai();
  }, 60);
}
