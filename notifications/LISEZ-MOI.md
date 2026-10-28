# Notifications push — mise en route

Ce dossier contient le petit serveur qui envoie de **vraies notifications** sur le téléphone des fans (en haut de l'écran, même site fermé). Il tourne sur l'offre **gratuite** de Cloudflare Workers.

- `worker.js` : le serveur (enregistre les appareils, envoie les notifications).
- `webpush.js` : chiffrement et signature exigés par Google, Apple et Mozilla.
- `wrangler.toml` : sa configuration (à compléter ci-dessous).
- Le site (`assets/js/alertes.js`, `sw.js`) et les outils (`tools/cles-push.mjs`, `tools/notifier.mjs`) sont déjà prêts.

Tant que `notifications.serveur` est vide dans `content/site.js`, le site garde les anciennes alertes (Android, appli installée).

## 1. Une fois, à faire dans l'ordre

1. **Créer un compte gratuit** sur <https://dash.cloudflare.com/sign-up> (pas de carte bancaire pour Workers).
2. Dans un terminal, depuis ce dossier : `cd notifications` puis `npx wrangler login` (une page s'ouvre, on autorise).
3. **Générer les clés** : `node ../tools/cles-push.mjs`. Il affiche une clé *publique* et une clé *privée*. Garde la fenêtre ouverte.
4. **Créer la base des abonnés** : `npx wrangler kv namespace create ABONNES` (sur un ancien wrangler : `npx wrangler kv:namespace create ABONNES`). Copie l'`id` affiché dans `wrangler.toml`, à la place du premier `REMPLACER` de `[[kv_namespaces]]`.
5. Dans `wrangler.toml`, remplace aussi :
   - `ORIGINE` : l'adresse exacte du site, sans `/` final et sans dossier (ex. `https://monnom.github.io`) ;
   - `VAPID_PUBLIC` : la clé publique.
6. **Donner les deux secrets** (ils ne sont jamais écrits dans un fichier) :
   - `npx wrangler secret put VAPID_PRIVEE` puis colle la clé privée (le JSON complet) ;
   - `npx wrangler secret put ADMIN` puis choisis un long mot de passe : c'est lui qui autorise l'envoi.
7. **Mettre en ligne le serveur** : `npx wrangler deploy`. Il affiche son adresse (`https://drop-out-notifications.….workers.dev`).
8. Dans `content/site.js`, bloc `notifications` : mets cette adresse dans `serveur` et la clé publique dans `clePublique`. Republie le site.
9. Crée le fichier `notifications/.secret.json` (jamais publié, il est dans `.gitignore`) :
   ```json
   { "serveur": "https://drop-out-notifications.….workers.dev", "mdp": "le-mot-de-passe-ADMIN" }
   ```

## 2. Envoyer une notification

Dans `notifications/.secret.json`, ajoute l'adresse du site : `"site": "https://monnom.github.io/drop-out/"` (en https, avec le dossier s'il y en a un).

**À la main, après avoir publié une nouvelle date** dans `data/concerts.json` :

```bash
node tools/notifier.mjs --date 2026-11-21
```

La notification reprend la date, l'heure, le lieu et la ville, ouvre l'appli sur cette date au toucher, et sur **Android** montre l'affiche en grand avec un bouton **Itinéraire** (Maps). Sur iPhone : titre et texte seulement. Ajoute `--essai` pour voir le message sans l'envoyer.

**Message libre :** `node tools/notifier.mjs "Titre" "Texte" "./?site#dates"`

**Automatique (GitHub)** : le fichier `.github/workflows/notifier.yml` envoie la notification tout seul dès que `data/concerts.json` change avec une date nouvelle, après avoir attendu que le site publié soit à jour. Il faut que le site soit publié depuis un dépôt GitHub (branche `main`) et ajouter trois secrets dans le dépôt (Settings, Secrets and variables, Actions) : `NOTIF_SERVEUR`, `NOTIF_MDP`, `NOTIF_SITE`. Les dates passées, annulées ou déjà connues ne déclenchent rien ; plusieurs dates ajoutées d'un coup donnent une seule notification.

Les abonnements périmés (appli désinstallée) sont retirés tout seuls.

## 3. Bon à savoir

- **iPhone** : il faut iOS 16.4 ou plus, et avoir ajouté le site à l'écran d'accueil (Partager, « Sur l'écran d'accueil »), puis activé les alertes depuis l'icône.
- **Données** : on ne garde que l'adresse technique de l'appareil fournie par son navigateur et deux clés de chiffrement. Les mentions légales du site l'expliquent déjà dès que `notifications.serveur` est rempli.
- **Limites gratuites** : très au-dessus des besoins d'un groupe. L'envoi se fait par lots de 40 appareils (l'offre gratuite limite les appels par requête) ; l'outil enchaîne les lots tout seul.
- **Test** : active les alertes sur ton téléphone, puis lance la commande ci-dessus : la notification doit arriver en quelques secondes.
