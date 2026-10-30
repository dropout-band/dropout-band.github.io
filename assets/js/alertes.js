// alertes « nouvelle date » : le service worker vérifie data/concerts.json en arrière-plan (sync périodique) et notifie quand une date inédite apparaît.
// dispo seulement sur Chrome, Edge ou Samsung Internet sous Android, avec le site installé sur l'écran d'accueil.
import { toast } from "./outils.js";
import contenu from "../../content/site.js";

// deux modes. avec un serveur de notifications (content/site.js : notifications) : vraies notifications push, même site fermé (Android, ordinateur, iPhone si l'appli est installée).
// sans serveur : vérification en arrière-plan, décrite plus bas.
const reglagesPush = contenu.notifications || {};
const avecServeur = Boolean(reglagesPush.serveur && reglagesPush.clePublique);

const TAG = "dropout-nouvelles-dates";
const INTERVALLE = 12 * 60 * 60 * 1000; // 2 fois par jour (le navigateur décide)
const CLE_CHOIX = "dropout-alertes"; // choix de l'utilisateur, gardé sur l'appareil

const lireChoix = () => { try { return localStorage.getItem(CLE_CHOIX) === "1"; } catch { return false; } };
const ecrireChoix = (oui) => { try { oui ? localStorage.setItem(CLE_CHOIX, "1") : localStorage.removeItem(CLE_CHOIX); } catch { /* stockage indisponible */ } };

const prisEnCharge = () =>
  "serviceWorker" in navigator && "Notification" in window &&
  "ServiceWorkerRegistration" in window && "periodicSync" in ServiceWorkerRegistration.prototype;

async function estActif(reg) {
  if (Notification.permission !== "granted") return false;
  try { return (await reg.periodicSync.getTags()).includes(TAG); } catch { return false; }
}

// interrupteur + encart : jaune quand les alertes sont activées
function afficher(bouton, actif, animer = true) {
  const avant = bouton.getAttribute("aria-checked") === "true";
  bouton.setAttribute("aria-checked", String(actif));
  const zone = bouton.closest("[data-alertes-zone]");
  zone?.classList.toggle("est-active", actif);
  if (animer && actif && !avant && zone) { // petit effet quand l'alerte s'active
    zone.classList.remove("s-allume"); void zone.offsetWidth; zone.classList.add("s-allume");
  }
  const texte = zone?.querySelector(".alertes__texte");
  if (texte) texte.textContent = actif ? "Activé" : "Prévenez-moi !";
}

// relance la vérification en arrière-plan sans geste de l'utilisateur (possible si la permission est déjà accordée).
// sert à retrouver l'état voulu si le navigateur a perdu l'inscription (mise à jour, cache vidé...)
async function reprendre(reg) {
  try {
    const droit = await navigator.permissions?.query({ name: "periodic-background-sync" }).catch(() => null);
    if (droit && droit.state !== "granted") return;
    await reg.periodicSync.register(TAG, { minInterval: INTERVALLE });
  } catch { /* le choix est gardé, on réessaiera à la prochaine visite */ }
  reg.active?.postMessage({ type: "alertes", actif: true });
}

const cleVersOctets = (t) => {
  const s = t.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const envoyerAuServeur = (chemin, donnees) =>
  fetch(reglagesPush.serveur.replace(/\/$/, "") + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(donnees) });
const surIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// mode serveur : abonnement push du navigateur, enregistré sur le serveur de notifications.
// l'interrupteur apparaît tout de suite dans le dernier état connu, répond au toucher sans attendre le service worker et passe en « activé » dès le geste (retour en arrière seulement si ça échoue)
async function initPush(zone, bouton) {
  zone.hidden = false;
  afficher(bouton, lireChoix() && "Notification" in window && Notification.permission === "granted", false);
  const manque = !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window);
  // le service worker se prépare en tâche de fond ; le toucher n'attend que s'il n'est pas prêt
  const pret = manque ? Promise.resolve(null)
    : Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 2500, null))]);
  let reg = null;
  pret.then(async (r) => {
    reg = r;
    if (!r) return;
    r.periodicSync?.unregister(TAG).catch(() => {}); // le serveur prévient : plus de vérification en arrière-plan (évite les doublons)
    r.active?.postMessage({ type: "alertes", actif: false });
    const reel = Notification.permission === "granted" && Boolean(await r.pushManager.getSubscription());
    ecrireChoix(reel);
    afficher(bouton, reel);
  });

  const abonnement = () => reg.pushManager.getSubscription();
  let enCours = false;
  bouton.addEventListener("click", async () => {
    if (enCours) return;
    if (manque) {
      toast(surIphone()
        ? "Sur iPhone : ajoutez d’abord le site à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »), puis ouvrez-le depuis son icône."
        : "Ce navigateur ne gère pas les notifications. Suivez-nous sur Instagram ou Facebook.");
      return;
    }
    enCours = true;
    const etait = bouton.getAttribute("aria-checked") === "true";
    afficher(bouton, !etait); // réponse immédiate au toucher
    bouton.classList.add("est-occupe");
    const annuler = (message) => { afficher(bouton, etait); toast(message); };
    try {
      await pret;
      if (!reg) return annuler("Les alertes fonctionnent sur le site en ligne (https), pas sur cette adresse.");
      if (etait) {
        const sub = await abonnement();
        if (sub) { await envoyerAuServeur("/desabonner", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
        ecrireChoix(false);
        toast("Alertes désactivées");
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") return annuler("Notifications refusées : vous pouvez les autoriser dans les réglages du navigateur.");
      let sub;
      try {
        sub = (await abonnement()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersOctets(reglagesPush.clePublique) });
        const rep = await envoyerAuServeur("/abonner", sub.toJSON());
        if (!rep.ok) throw new Error("serveur " + rep.status);
      } catch (e) {
        console.warn("[alertes] abonnement impossible :", e.message);
        await (sub && sub.unsubscribe().catch(() => {}));
        return annuler("Impossible d’activer les alertes pour l’instant. Réessayez plus tard.");
      }
      ecrireChoix(true);
      reg.showNotification("Alertes activées — Drop Out", {
        body: "Vous serez prévenu dès qu’une nouvelle date est annoncée.",
        icon: "assets/icons/icon-192.png",
        tag: "dropout-confirmation",
      });
    } finally {
      enCours = false;
      bouton.classList.remove("est-occupe");
    }
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

  // sans https il n'y a pas de service worker : on n'attend pas indéfiniment
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 2500, null))]);
  if (!reg) {
    bouton.addEventListener("click", () => toast("Les alertes fonctionnent sur le site en ligne (https), pas sur cette adresse."));
    return;
  }
  // le choix reste quel que soit le nombre de retours sur l'appli ; il tombe seulement si l'utilisateur retire l'autorisation dans les réglages
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
    // le choix est pris en compte tout de suite (bouton « activé »), puis on essaie de lancer la vérification en arrière-plan.
    // elle n'est accordée qu'au site installé : sinon on le dit, et elle démarre seule au prochain passage depuis l'appli (voir reprendre())
    ecrireChoix(true);
    afficher(bouton, true);
    reg.active?.postMessage({ type: "alertes", actif: true });
    const droit = await navigator.permissions?.query({ name: "periodic-background-sync" }).catch(() => null);
    let enArrierePlan = false;
    if (droit?.state === "granted") {
      try { await reg.periodicSync.register(TAG, { minInterval: INTERVALLE }); enArrierePlan = true; } catch { /* pas accordé : message plus bas */ }
    }
    if (!enArrierePlan) {
      toast("Alertes activées. Pour les recevoir même quand le site est fermé, ajoutez-le à l’écran d’accueil.");
      return;
    }
    reg.showNotification("Alertes activées — Drop Out", {
      body: "Vous serez prévenu dès qu’une nouvelle date est annoncée.",
      icon: "assets/icons/icon-192.png",
      tag: "dropout-confirmation",
    });
  });
}
