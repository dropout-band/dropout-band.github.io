// génère la paire de clés VAPID des notifications, à lancer une seule fois : node tools/cles-push.mjs
// - la clé publique va dans content/site.js (notifications.clePublique) et dans notifications/wrangler.toml
// - la clé privée (le json) se donne à cloudflare comme secret VAPID_PRIVEE et ne doit jamais être publiée
import { b64u } from "../notifications/webpush.js";

const paire = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publique = b64u.vers(await crypto.subtle.exportKey("raw", paire.publicKey));
const privee = await crypto.subtle.exportKey("jwk", paire.privateKey);
delete privee.key_ops; delete privee.ext;
console.log("CLÉ PUBLIQUE (à publier) :\n" + publique + "\n");
console.log("CLÉ PRIVÉE (secret, à ne jamais publier) :\n" + JSON.stringify(privee) + "\n");
