// Alertes « nouvelle date », sans serveur.
// Le service worker vérifie data/concerts.json en arrière-plan (synchronisation
// périodique) et affiche une notification quand une date inédite apparaît.
// Disponible uniquement là où cela fonctionne vraiment : Chrome, Edge ou
// Samsung Internet sur Android, avec le site installé sur l'écran d'accueil.
import { toast } from "./outils.js";
import contenu from "../../content/site.js";

// Deux modes. Avec un serveur de notifications (content/site.js : notifications), de vraies notifications « push »
// arrivent sur le téléphone même site fermé (Android, ordinateur, et iPhone si l'appli est installée). Sans serveur,
// on garde la vérification en arrière-plan décrite ci-dessous.
const reglagesPush = contenu.notifications || {};
const avecServeur = Boolean(reglagesPush.serveur && reglagesPush.clePublique);

const TAG = "dropout-nouvelles-dates";
const INTERVALLE = 12 * 60 * 60 * 1000; // souhait : 2 fois par jour (le navigateur décide)
const CLE_CHOIX = "dropout-alertes"; // le choix de l'utilisateur, gardé sur l'appareil (jusqu'à ce qu'il le change)

const lireChoix = () => { try { return localStorage.getItem(CLE_CHOIX) === "1"; } catch { return false; } };
const ecrireChoix = (oui) => { try { oui ? localStorage.setItem(CLE_CHOIX, "1") : localStorage.removeItem(CLE_CHOIX); } catch { /* stockage indisponible */ } };

const prisEnCharge = () =>
  "serviceWorker" in navigator && "Notification" in window &&
  "ServiceWorkerRegistration" in window && "periodicSync" in ServiceWorkerRegistration.prototype;

async function estActif(reg) {
  if (Notification.permission !== "granted") return false;
  try { return (await reg.periodicSync.getTags()).includes(TAG); } catch { return false; }
}

// Interrupteur + encart : jaune quand les alertes sont activées
function afficher(bouton, actif) {
  bouton.setAttribute("aria-checked", String(actif));
  const zone = bouton.closest("[data-alertes-zone]");
  zone?.classList.toggle("est-active", actif);
  const texte = zone?.querySelector(".alertes__texte");
  if (texte) texte.textContent = actif ? "Alertes activées" : "Être prévenu des nouvelles dates";
}

// (Re)met en route la vérification en arrière-plan, sans geste de l'utilisateur : possible
// quand la permission est déjà accordée. Sert à retrouver l'état voulu si le navigateur
// a perdu l'inscription (mise à jour, nettoyage du cache…).
async function reprendre(reg) {
  try {
    const droit = await navigator.permissions?.query({ name: "periodic-background-sync" }).catch(() => null);
    if (droit && droit.state !== "granted") return;
    await reg.periodicSync.register(TAG, { minInterval: INTERVALLE });
  } catch { /* le choix de l'utilisateur est gardé ; on réessaiera à la prochaine visite */ }
  reg.active?.postMessage({ type: "alertes", actif: true });
}

const cleVersOctets = (t) => {
  const s = t.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const envoyerAuServeur = (chemin, donnees) =>
  fetch(reglagesPush.serveur.replace(/\/$/, "") + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(donnees) });
const surIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Mode serveur : abonnement « push » du navigateur, enregistré sur le serveur de notifications.
async function initPush(zone, bouton) {
  zone.hidden = false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    bouton.addEventListener("click", () => toast(surIphone()
      ? "Sur iPhone : ajoutez d’abord le site à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »), puis ouvrez-le depuis son icône."
      : "Ce navigateur ne gère pas les notifications. Suivez-nous sur Instagram ou Facebook."));
    return;
  }
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 2500, null))]);
  if (!reg) {
    bouton.addEventListener("click", () => toast("Les alertes fonctionnent sur le site en ligne (https), pas sur cette adresse."));
    return;
  }
  // Plus de vérification en arrière-plan : le serveur prévient, on évite les doublons.
  reg.periodicSync?.unregister(TAG).catch(() => {});
  reg.active?.postMessage({ type: "alertes", actif: false });

  const abonnement = () => reg.pushManager.getSubscription();
  afficher(bouton, Notification.permission === "granted" && Boolean(await abonnement()));

  bouton.addEventListener("click", async () => {
    if (bouton.getAttribute("aria-checked") === "true") {
      const sub = await abonnement();
      if (sub) { await envoyerAuServeur("/desabonner", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      afficher(bouton, false);
      toast("Alertes désactivées");
      return;
    }
    if ((await Notification.requestPermission()) !== "granted") {
      toast("Notifications refusées : vous pouvez les autoriser dans les réglages du navigateur.");
      return;
    }
    let sub;
    try {
      sub = (await abonnement()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersOctets(reglagesPush.clePublique) });
      const rep = await envoyerAuServeur("/abonner", sub.toJSON());
      if (!rep.ok) throw new Error("serveur " + rep.status);
    } catch (e) {
      console.warn("[alertes] abonnement impossible :", e.message);
      await (sub && sub.unsubscribe().catch(() => {}));
      toast("Impossible d’activer les alertes pour l’instant. Réessayez plus tard.");
      return;
    }
    afficher(bouton, true);
    reg.showNotification("Alertes activées — Drop Out", {
      body: "Vous serez prévenu dès qu’une nouvelle date est annoncée.",
      icon: "assets/icons/icon-192.png",
      tag: "dropout-confirmation",
    });
  });
}

export async function initAlertes() {
  const zone = document.querySelector("[data-alertes-zone]");
  if (!zone) return;
  const bouton = zone.querySelector("[data-alertes]");
  if (avecServeur) return initPush(zone, bouton);
  zone.hidden = false; // toujours visible : s'il ne peut pas marcher, il explique pourquoi

  if (!prisEnCharge()) {
    bouton.addEventListener("click", () =>
      toast("Ce navigateur ne gère pas les alertes. Essayez Chrome sur Android, ou suivez-nous sur Instagram ou Facebook."));
    return;
  }

  // Sans connexion sécurisée (https), le service worker n'existe pas : ne pas attendre indéfiniment.
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 2500, null))]);
  if (!reg) {
    bouton.addEventListener("click", () => toast("Les alertes fonctionnent sur le site en ligne (https), pas sur cette adresse."));
    return;
  }
  // Le choix de l'utilisateur reste, quel que soit le nombre de fois où il revient sur l'application.
  // Il tombe seulement si l'utilisateur retire lui-même l'autorisation de notifier dans les réglages.
  const reel = await estActif(reg);
  if (Notification.permission !== "granted") {
    ecrireChoix(false);
    afficher(bouton, false);
  } else if (reel || lireChoix()) {
    ecrireChoix(true);
    afficher(bouton, true);
    if (!reel) reprendre(reg);
  } else {
    afficher(bouton, false);
  }

  bouton.addEventListener("click", async () => {
    if (bouton.getAttribute("aria-checked") === "true") {
      await reg.periodicSync.unregister(TAG).catch(() => {});
      reg.active?.postMessage({ type: "alertes", actif: false });
      ecrireChoix(false);
      afficher(bouton, false);
      toast("Alertes désactivées");
      return;
    }

    if ((await Notification.requestPermission()) !== "granted") {
      toast("Notifications refusées : vous pouvez les autoriser dans les réglages du navigateur.");
      return;
    }
    // La synchronisation en arrière-plan n'est accordée qu'au site installé.
    const droit = await navigator.permissions?.query({ name: "periodic-background-sync" }).catch(() => null);
    if (droit?.state !== "granted") {
      toast("Installez d’abord le site sur l’écran d’accueil, puis réactivez les alertes.");
      document.querySelector("[data-installer]:not([hidden])")?.click();
      return;
    }
    try {
      await reg.periodicSync.register(TAG, { minInterval: INTERVALLE });
    } catch {
      toast("Votre appareil n’autorise pas les vérifications en arrière-plan.");
      return;
    }
    reg.active?.postMessage({ type: "alertes", actif: true });
    ecrireChoix(true);
    afficher(bouton, true);
    reg.showNotification("Alertes activées — Drop Out", {
      body: "Vous serez prévenu dès qu’une nouvelle date est annoncée.",
      icon: "assets/icons/icon-192.png",
      tag: "dropout-confirmation",
    });
  });
}
