// mode d'emploi pour ajouter l'icône à l'écran d'accueil, selon le navigateur.
// Chrome, Edge, Samsung Internet & co ouvrent direct la fenêtre d'install (beforeinstallprompt, voir pwa.js et installer.js).
// Safari/iPhone, Firefox et les navigateurs d'Instagram/Facebook n'ont pas de bouton possible : on montre les gestes à faire.

const ua = navigator.userAgent;

export const estIos = () =>
  /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS se fait passer pour un Mac
const estAndroid = () => /android/i.test(ua);
const estNavigateurIntegre = () => /instagram|fban|fbav|fb_iab|line\/|snapchat|tiktok|musical_ly|twitter/i.test(ua);

const liste = (...pas) => `<ol>${pas.map((p) => `<li>${p}</li>`).join("")}</ol>`;
const note = (t) => `<p class="note">${t}</p>`;

// renvoie { titre, html } : le navigateur et les gestes
export function aideInstallation() {
  // navigateur intégré (lien ouvert depuis Instagram, Facebook) : pas d'installation possible
  if (estNavigateurIntegre()) {
    return {
      titre: "Ouvrez d’abord dans votre navigateur",
      html: liste(
        "Touchez les trois points (⋯ ou ⋮), ou l’icône de boussole, en haut ou en bas de l’écran.",
        "Choisissez « Ouvrir dans le navigateur » (Safari ou Chrome).",
        "Revenez sur cette page et touchez de nouveau « Télécharger ».",
      ) + note("Le navigateur intégré à Instagram ou Facebook ne permet pas d’installer l’application."),
    };
  }

  if (estIos()) {
    if (/crios|edgios/i.test(ua)) {
      return {
        titre: "Sur iPhone ou iPad (Chrome, Edge)",
        html: liste(
          "Touchez le bouton Partager (le carré avec une flèche vers le haut), en haut à droite, dans la barre d’adresse.",
          "Faites défiler la liste, puis choisissez « Sur l’écran d’accueil ».",
          "Touchez « Ajouter » : l’icône Drop Out apparaît parmi vos applications.",
        ) + note("Si l’option n’apparaît pas, ouvrez ce site dans Safari : c’est le navigateur qui la propose toujours."),
      };
    }
    if (/fxios|opios|brave|duckduckgo|ddg/i.test(ua) || !/safari/i.test(ua)) {
      return {
        titre: "Sur iPhone ou iPad : ouvrez dans Safari",
        html: liste(
          "Copiez l’adresse de cette page, puis ouvrez-la dans <strong>Safari</strong>.",
          "Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l’écran.",
          "Choisissez « Sur l’écran d’accueil », puis « Ajouter ».",
        ) + note("Sur iPhone et iPad, Safari est le navigateur qui permet d’ajouter une application sur l’écran d’accueil."),
      };
    }
    return {
      titre: "Sur iPhone ou iPad (Safari)",
      html: liste(
        "Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l’écran.",
        "Faites défiler la liste, puis choisissez « Sur l’écran d’accueil ».",
        "Touchez « Ajouter » : l’icône Drop Out apparaît parmi vos applications.",
      ) + note("Sur iPhone et iPad, l’ajout se fait uniquement par ce menu : Apple ne permet pas de le déclencher depuis un bouton du site."),
    };
  }

  if (estAndroid()) {
    if (/firefox/i.test(ua)) {
      return {
        titre: "Sur Android (Firefox)",
        html: liste("Touchez le menu ⋮ du navigateur.", "Choisissez « Installer » (ou « Ajouter à l’écran d’accueil »).", "Confirmez : l’icône Drop Out apparaît parmi vos applications."),
      };
    }
    if (/samsungbrowser/i.test(ua)) {
      return {
        titre: "Sur Android (Samsung Internet)",
        html: liste("Touchez le menu ☰ en bas de l’écran.", "Choisissez « Ajouter la page à », puis « Écran d’accueil ».", "Confirmez : l’icône Drop Out apparaît parmi vos applications."),
      };
    }
    return {
      titre: "Sur Android",
      html: liste("Touchez le menu ⋮ du navigateur, en haut à droite.", "Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».", "Confirmez : l’icône Drop Out apparaît parmi vos applications.") +
        note("Si ces options n’apparaissent pas, ouvrez le site avec Chrome."),
    };
  }

  // ordi ou appareil inconnu
  return {
    titre: "Installer l’application",
    html: liste("Ouvrez le menu du navigateur (⋮ ou ⋯).", "Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».") +
      note("Selon le navigateur, cette option peut ne pas exister (Firefox sur ordinateur, par exemple). Le site reste utilisable normalement."),
  };
}
