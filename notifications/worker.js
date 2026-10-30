// serveur de notifications drop out (cloudflare worker, offre gratuite)
//  POST /abonner     { endpoint, keys }  : enregistre l'appareil (appelé par le site)
//  POST /desabonner  { endpoint }        : le retire (appelé par le site)
//  GET  /actus                          : dernières publications de la page facebook (API meta), 15 min en cache
//  POST /envoyer     { titre, texte, url, curseur } + mot de passe : envoie une notification (appelé par tools/notifier.mjs)
// données gardées : l'adresse technique du service de push de l'appareil et ses deux clés. ni nom, ni courriel, ni ip
import { envoyer } from "./webpush.js";

const PAR_LOT = 40; // l'offre gratuite limite à 50 appels externes par requête : on envoie par lots

const json = (donnees, statut, cors) =>
  new Response(JSON.stringify(donnees), { status: statut, headers: { "Content-Type": "application/json", ...cors } });

async function identifiant(endpoint) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(h)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

// comparaison à temps constant du mot de passe d'envoi
async function motDePasseValide(recu, attendu) {
  if (!recu || !attendu) return false;
  const [a, b] = await Promise.all([recu, attendu].map((t) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// dernières publications de la page facebook, via l'API graph de meta.
// secrets FB_TOKEN (jeton de page longue durée) et FB_PAGE (identifiant numérique), voir LISEZ-MOI.md.
// le jeton ne quitte jamais le serveur : le site ne reçoit que du texte, des photos et des liens publics
async function actus(env, cors) {
  if (!env.FB_TOKEN || !env.FB_PAGE) return json({ erreur: "non configuré" }, 503, cors);
  const cache = caches.default;
  const cle = new Request("https://cache.drop-out.invalid/actus");
  const garde = await cache.match(cle);
  if (garde) return new Response(garde.body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...cors } });
  const api = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(env.FB_PAGE)}/posts`);
  api.search = new URLSearchParams({ fields: "message,created_time,permalink_url,full_picture", limit: "8", access_token: env.FB_TOKEN });
  let rep;
  try { rep = await fetch(api); } catch { return json({ erreur: "Meta injoignable" }, 502, cors); }
  if (!rep.ok) return json({ erreur: "Meta a refusé la demande (jeton expiré ?)" }, 502, cors);
  const brut = await rep.json();
  const https = (v) => (/^https:\/\/[^\s]{4,2000}$/.test(String(v || "")) ? String(v) : "");
  const publications = (brut.data || [])
    .map((p) => ({ texte: String(p.message || "").slice(0, 1200), date: String(p.created_time || ""), url: https(p.permalink_url), image: https(p.full_picture) }))
    .filter((p) => p.url && (p.texte || p.image));
  const corps = JSON.stringify({ publications });
  await cache.put(cle, new Response(corps, { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=900" } }));
  return new Response(corps, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...cors } });
}

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);
    const cors = {
      "Access-Control-Allow-Origin": env.ORIGINE,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (requete.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (requete.method === "GET" && url.pathname === "/actus") return actus(env, cors);
    if (requete.method === "GET") return new Response("Drop Out — notifications", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (requete.method !== "POST") return json({ erreur: "méthode" }, 405, cors);

    const texte = await requete.text();
    if (texte.length > 4000) return json({ erreur: "trop gros" }, 413, cors);
    let corps;
    try { corps = JSON.parse(texte); } catch { return json({ erreur: "JSON illisible" }, 400, cors); }

    // l'adresse n'est ni dans le site ni dans le dépôt, seulement dans ces secrets
    // abonnement et désabonnement : appelés depuis le site, uniquement
    if (url.pathname === "/abonner" || url.pathname === "/desabonner") {
      if (requete.headers.get("Origin") !== env.ORIGINE) return json({ erreur: "origine" }, 403, cors);
      const endpoint = String(corps.endpoint || "");
      if (!/^https:\/\/[^\s]{10,900}$/.test(endpoint)) return json({ erreur: "adresse invalide" }, 400, cors);
      const id = await identifiant(endpoint);
      if (url.pathname === "/desabonner") { await env.ABONNES.delete(id); return json({ ok: true }, 200, cors); }
      const { p256dh, auth } = corps.keys || {};
      if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length !== 87 || auth.length !== 22) return json({ erreur: "clés invalides" }, 400, cors);
      const meta = { e: endpoint, p: p256dh, a: auth };
      if (JSON.stringify(meta).length > 1000) return json({ erreur: "abonnement trop long" }, 413, cors);
      await env.ABONNES.put(id, "1", { metadata: meta });
      return json({ ok: true }, 200, cors);
    }

    // envoi : protégé par un mot de passe
    if (url.pathname === "/envoyer") {
      const mdp = (requete.headers.get("Authorization") || "").replace(/^Bearer /, "");
      if (!(await motDePasseValide(mdp, env.ADMIN))) return json({ erreur: "refusé" }, 401, {});
      const https = (v) => (/^https:\/\/[^\s]{4,500}$/.test(String(v || "")) ? String(v) : "");
      const message = {
        titre: String(corps.titre || "Drop Out").slice(0, 80),
        texte: String(corps.texte || "").slice(0, 200),
        url: https(corps.url),
        image: https(corps.image), // affiche (android)
        itineraire: https(corps.itineraire), // bouton « Itinéraire » (android)
        agenda: https(corps.agenda), // bouton « Ajouter à l'agenda » (android) : lien google agenda pré-rempli
      };
      const liste = await env.ABONNES.list({ limit: PAR_LOT, cursor: corps.curseur || undefined });
      const options = { clePublique: env.VAPID_PUBLIC, jwkPrivee: JSON.parse(env.VAPID_PRIVEE), contact: env.CONTACT };
      let envoyes = 0, supprimes = 0, echecs = 0;
      await Promise.all(liste.keys.map(async (k) => {
        const m = k.metadata;
        if (!m) return;
        try {
          const statut = await envoyer({ endpoint: m.e, keys: { p256dh: m.p, auth: m.a } }, message, options);
          if (statut === 404 || statut === 410) { await env.ABONNES.delete(k.name); supprimes++; }
          else if (statut >= 200 && statut < 300) envoyes++;
          else echecs++;
        } catch { echecs++; }
      }));
      return json({ envoyes, supprimes, echecs, curseur: liste.list_complete ? null : liste.cursor }, 200, {});
    }
    return json({ erreur: "introuvable" }, 404, cors);
  },
};
