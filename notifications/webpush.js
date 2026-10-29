// notifications push : chiffrement du message (RFC 8291, aes128gcm) et signature VAPID (RFC 8292).
// uniquement l'API webcrypto, dispo telle quelle dans cloudflare workers et node 20+

const enc = new TextEncoder();

export const b64u = {
  vers: (octets) => btoa(String.fromCharCode(...new Uint8Array(octets))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  depuis: (texte) => {
    const s = texte.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
  },
};

const concat = (...morceaux) => {
  const sortie = new Uint8Array(morceaux.reduce((n, m) => n + m.length, 0));
  let o = 0;
  for (const m of morceaux) { sortie.set(m, o); o += m.length; }
  return sortie;
};

async function hkdf(sel, secret, info, octets) {
  const cle = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sel, info }, cle, octets * 8));
}

// chiffre `texte` pour un abonnement { keys: { p256dh, auth } } ; renvoie le corps de la requête d'envoi
export async function chiffrer(abonnement, texte) {
  const cleNavigateur = b64u.depuis(abonnement.keys.p256dh); // 65 octets
  const secretAuth = b64u.depuis(abonnement.keys.auth); // 16 octets
  const paire = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const clePubServeur = new Uint8Array(await crypto.subtle.exportKey("raw", paire.publicKey));
  const pubNavigateur = await crypto.subtle.importKey("raw", cleNavigateur, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secretPartage = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: pubNavigateur }, paire.privateKey, 256));

  const ikm = await hkdf(secretAuth, secretPartage, concat(enc.encode("WebPush: info\0"), cleNavigateur, clePubServeur), 32);
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sel, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sel, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const clair = concat(enc.encode(texte), new Uint8Array([2])); // 0x02 : dernier (et seul) bloc
  const cleAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cleAes, clair));

  const tailleBloc = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(sel, tailleBloc, new Uint8Array([clePubServeur.length]), clePubServeur, chiffre);
}

// en-tête d'autorisation VAPID : prouve au service de push (google, apple, mozilla) que l'envoi vient du site
export async function enteteVapid(endpoint, clePublique, jwkPrivee, contact) {
  const audience = new URL(endpoint).origin;
  const entete = b64u.vers(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const charge = b64u.vers(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contact })));
  const cle = await crypto.subtle.importKey("jwk", jwkPrivee, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cle, enc.encode(`${entete}.${charge}`));
  return `vapid t=${entete}.${charge}.${b64u.vers(signature)}, k=${clePublique}`;
}

// envoie un message à un abonnement ; renvoie le code http du service de push (201 : accepté, 404/410 : abonnement mort)
export async function envoyer(abonnement, message, { clePublique, jwkPrivee, contact }) {
  const corps = await chiffrer(abonnement, JSON.stringify(message));
  const rep = await fetch(abonnement.endpoint, {
    method: "POST",
    headers: {
      Authorization: await enteteVapid(abonnement.endpoint, clePublique, jwkPrivee, contact),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body: corps,
  });
  return rep.status;
}
