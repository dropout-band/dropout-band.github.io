// Génère la paire de clés VAPID des notifications. À lancer une seule fois :  node tools/cles-push.mjs
// - la clé PUBLIQUE va dans content/site.js (notifications.clePublique) et dans notifications/wrangler.toml ;
// - la clé PRIVÉE (le JSON) se donne à Cloudflare comme secret VAPID_PRIVEE, et ne doit JAMAIS être publiée.
import { b64u } from "../notifications/webpush.js";

const paire = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publique = b64u.vers(await crypto.subtle.exportKey("raw", paire.publicKey));
const privee = await crypto.subtle.exportKey("jwk", paire.privateKey);
delete privee.key_ops; delete privee.ext;
console.log("CLÉ PUBLIQUE (à publier) :\n" + publique + "\n");
console.log("CLÉ PRIVÉE (secret, à ne jamais publier) :\n" + JSON.stringify(privee) + "\n");
