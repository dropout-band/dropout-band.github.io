// Petits utilitaires partagés.

const params = new URLSearchParams(location.search);

// Mode brouillon : repères « à renseigner » visibles en local
// (ordinateur ou téléphone sur le même réseau), ou avec ?brouillon.
// ?brouillon=0 permet de voir le rendu public en local.
const hoteLocal =
  ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
  /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname) ||
  location.hostname.endsWith(".local");

export const brouillon = params.has("brouillon") ? params.get("brouillon") !== "0" : hoteLocal;

export const apercuConcerts = params.get("apercu") === "concerts";

export const mouvementReduit = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function esc(valeur) {
  return String(valeur ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Lien externe sûr : uniquement http(s), mailto, tel ou chemin relatif.
export function urlSure(url) {
  const u = String(url ?? "").trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ""; // javascript:, data:… refusés
  return u.replace(/^\/+/, ""); // chemin relatif (compatible sous-dossier GitHub Pages)
}

export function estExterne(url) {
  return /^https?:/i.test(url) && new URL(url).origin !== location.origin;
}

export function attrsLien(url) {
  return estExterne(url) ? ' target="_blank" rel="noopener"' : "";
}

// Repère visible uniquement en mode brouillon.
export function aRenseigner(texte, balise = "span") {
  return brouillon && texte ? `<${balise} class="a-renseigner">À renseigner — ${esc(texte)}</${balise}>` : "";
}

let minuteurToast;
export function toast(message) {
  const el = document.querySelector("[data-toast]");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { el.hidden = true; }, 3200);
}

export async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    // Repli pour les contextes sans API presse-papiers (http local, anciens navigateurs)
    const zone = document.createElement("textarea");
    zone.value = texte;
    zone.setAttribute("readonly", "");
    zone.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.append(zone);
    zone.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    zone.remove();
    return ok;
  }
}

export const FLECHE = '<svg class="fleche" aria-hidden="true" width="16" height="12" viewBox="0 0 16 12"><path d="M0 6h14M9 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
