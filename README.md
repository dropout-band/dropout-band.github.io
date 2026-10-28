# Drop Out — site du groupe

Site d'une seule page conçu comme une application (une colonne : concerts, groupe, écoute, booking), statique (HTML, CSS, JavaScript sans framework), installable sur l'écran d'accueil d'un téléphone (PWA). Il est hébergeable gratuitement sur GitHub Pages et ne demande ni backend ni abonnement.


## Lancer le site sur votre ordinateur

Il faut [Node.js](https://nodejs.org) (aucune installation de paquet n'est nécessaire).

```bash
node tools/serveur.mjs
```

Ouvrez ensuite **http://localhost:8080/**.

- **http://localhost:8080/drop-out/** simule l'adresse GitHub Pages dans un sous-dossier.
- Le serveur affiche aussi une adresse `http://192.168.…:8080/` pour tester depuis un téléphone sur le même Wi-Fi. Sans HTTPS, le mode hors connexion et l'installation ne fonctionnent pas à cette adresse : testez-les une fois le site en ligne.
- Ouvrir `index.html` par double-clic **ne fonctionne pas** : il faut passer par un serveur.

**Mode brouillon.** En local, des repères « À renseigner » signalent les contenus manquants. Ils n'apparaissent pas sur le site publié. Pour voir le rendu public en local, ajoutez `?brouillon=0` à l'adresse.

**Aperçu des concerts.** `http://localhost:8080/?apercu=concerts` affiche des dates **fictives** (`data/concerts.exemple.json`) pour juger la mise en page. Un bandeau le signale.

## Où modifier quoi

| Élément | Fichier |
|---|---|
| Textes, accroche, présentation, membres, liens, email, réseaux | `content/site.js` |
| Concerts | `data/concerts.json` |
| Photos | `assets/img/` |
| Logo | `assets/logo/` (blanc et noir, PNG d'origine + WebP) |
| Icônes de l'application | `assets/icons/` |
| Dossier de presse, fiche technique (PDF) | `assets/docs/`, puis le chemin dans `content/site.js` |
| Description pour Google et les réseaux sociaux | `<head>` de `index.html` |

Dans `content/site.js`, une valeur vide `""` **masque** l'élément concerné : bouton « Proposer une date » sans email, réseau sans lien, etc. Aucun lien factice n'est affiché.

**À faire en priorité :**

1. `contact.email` : **à renseigner**. Active le lien « Proposer une date » sous l'annonce des dates, qui ouvre la messagerie avec l'objet « Proposition de date — Drop Out ». Tant qu'il est vide, le lien reste masqué.
2. `membres` : nom et rôle de chacun. Les rôles actuels sont **déduits des photos** et marqués `aConfirmer: true`. Corrigez-les puis passez la valeur à `false`.
3. `groupe.accroche` et `presentation.texte` (deux ou trois lignes) : ce sont des **textes provisoires**, à réécrire par le groupe.
4. `reseaux`, `ecouter.plateformes` : collez les adresses complètes (`https://…`). Le bloc « Écouter » reste masqué tant qu'aucun lien ni vidéo n'est renseigné.

### Remplacer une photo

Les photos de membre existent en trois tailles : `membre-1-400.webp`, `membre-1-640.webp` et `membre-1-960.webp` (format 4:5). Deux méthodes :

- **Simple :** exportez la photo dans ces trois largeurs (400, 640 et 960 px de large, 500, 800 et 1200 px de haut) depuis n'importe quel logiciel, au format WebP, sous les mêmes noms.
- **Automatique (facultatif) :**
  ```bash
  npm install --prefix tools          # une seule fois
  node tools/optimiser-image.mjs chemin/vers/photo.jpg membre-1
  ```
  Ajoutez `--nb` pour une version noir et blanc.

Le cadrage se règle avec `position` dans `content/site.js`, par exemple `"50% 20%"` pour remonter le cadrage. Pour un membre sans photo, mettez `photo: null` : un visuel provisoire neutre s'affiche.

La photo du premier écran (`hero-groupe`, `hero-scene`, `hero-plein-air`) est déclarée directement dans `index.html`.

Photos actuelles : **Romane Lézy**, créditée dans le pied de page. Vérifiez avec elle les conditions d'utilisation en ligne.

## Ajouter, modifier ou supprimer un concert

Tout se passe dans `data/concerts.json`. Chaque concert est un bloc entre `{ }`, et les blocs sont séparés par une virgule :

```json
{
  "concerts": [
    {
      "date": "2026-11-21",
      "heure": "20:30",
      "lieu": "Le Nom de la Salle",
      "ville": "Lyon",
      "info": "Première partie : …",
      "lien": "https://billetterie.exemple.fr",
      "statut": ""
    },
    {
      "date": "2026-12-05",
      "heure": "",
      "lieu": "Bar du Coin",
      "ville": "Villeurbanne",
      "info": "",
      "lien": "",
      "statut": "entree-libre"
    }
  ]
}
```

| Champ | Contenu |
|---|---|
| `date` | **Obligatoire**, au format `AAAA-MM-JJ` |
| `heure` | `HH:MM` (heure de Paris), ou `""` si elle n'est pas connue |
| `lieu` | **Obligatoire** |
| `ville`, `info` | Facultatifs |
| `lien` | Billetterie ou page d'infos, ou `""` |
| `lienTexte` | Facultatif, remplace le texte du lien (« Billetterie & infos » par défaut) |
| `statut` | `""`, `"entree-libre"`, `"complet"` ou `"annule"` |
| `affiche` | Facultatif : affiche du concert, sans l'extension, par exemple `"assets/affiches/2026-10-24-lussas"`. Prévoyez deux fichiers WebP : `…-480.webp` (tuile) et `…-1200.webp` (agrandissement). Plusieurs dates peuvent partager la même affiche. Pour le prochain concert, l'affiche s'affiche en grand au-dessus du billet. |

- L'ordre dans le fichier n'a pas d'importance : le site trie les dates lui-même.
- Le prochain concert est mis en avant ; une date annulée ne l'est jamais.
- Une date reste « à venir » jusqu'à la fin de sa journée (heure de Paris). Ensuite, son affiche rejoint automatiquement la bande « Déjà joué », que l’on fait défiler au doigt.
- **Modifier :** changez les valeurs. **Supprimer :** retirez le bloc `{ … }` et la virgule qui le sépare du suivant. Il ne faut pas de virgule après le dernier bloc.
- Avec une liste vide (`"concerts": []`), le site affiche « Prochaines dates bientôt annoncées » et un bouton vers le booking.
- En cas d'erreur de syntaxe, le site affiche « Programme momentanément indisponible ». Pour trouver l'erreur, collez le fichier dans un validateur JSON (par exemple jsonlint.com).

Les modifications sont visibles une fois le dépôt mis à jour et GitHub Pages redéployé, ce qui prend en général une à deux minutes.

## Publier gratuitement sur GitHub Pages

1. Créez un dépôt sur GitHub (par exemple `drop-out`) et envoyez-y **le contenu de ce dossier**, avec `index.html` à la racine. Vous pouvez glisser-déposer les fichiers dans l'interface web (« Add file » puis « Upload files »).
2. Dans le dépôt, ouvrez **Settings → Pages**. Sous « Source », choisissez **Deploy from a branch**, la branche `main` et le dossier `/ (root)`, puis enregistrez.
3. Après une à deux minutes, le site est en ligne à l'adresse `https://<votre-compte>.github.io/drop-out/`.

Tous les chemins sont relatifs : le site, le manifeste et le service worker fonctionnent aussi bien dans ce sous-dossier qu'avec un nom de domaine personnalisé.

Une fois l'adresse définitive connue, remplacez dans `index.html` la valeur `assets/img/partage.jpg` de `og:image` par l'adresse complète (`https://…/assets/img/partage.jpg`). Certains réseaux sociaux exigent une adresse absolue pour afficher l'aperçu.

**Mise à jour du cache.** Les pages, les textes et les concerts sont toujours chargés depuis le réseau quand il est disponible : une nouvelle date apparaît dès le déploiement, sans action particulière. Images et polices sont gardées en cache. Si vous **remplacez** une image en gardant le même nom, ou si vous ajoutez un fichier essentiel, augmentez `VERSION` en haut de `sw.js` (par exemple `"v2"`).

## Vérifier l'ajout à l'écran d'accueil

À tester sur le site **publié** (HTTPS obligatoire).

**Android (Chrome, Edge, Samsung Internet)**
1. Ouvrez le site et naviguez quelques secondes.
2. Dans le pied de page ou le menu, touchez « Ajouter à l'écran d'accueil » : la fenêtre d'installation native s'ouvre. Sinon, passez par le menu ⋮ puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».
3. Vérifiez que l'icône (logo blanc sur fond noir) est nette et non rognée, et que le site s'ouvre en plein écran, sans barre d'adresse.

**iPhone / iPad (Safari)**
1. Ouvrez le site dans Safari.
2. Touchez Partager (carré avec une flèche), puis « Sur l'écran d'accueil » et « Ajouter ». Le bouton du site affiche ces mêmes étapes.
3. Vérifiez l'icône et l'ouverture en plein écran.

**Hors connexion.** Une fois le site visité une fois, activez le mode avion et rouvrez-le. Le site s'affiche avec le dernier programme enregistré et une mention précise sa date. Une page jamais chargée affiche un message « Pas de réseau pour l'instant ».

Selon le navigateur, l'installation n'est pas toujours proposée (Firefox sur ordinateur, certains navigateurs intégrés aux applications). Le site reste utilisable normalement.

## Structure

```
index.html              page unique (structure)
offline.html            page affichée sans réseau
manifest.webmanifest    déclaration PWA (nom, couleurs, icônes)
sw.js                   service worker (cache)
content/site.js         ← textes, membres, liens
data/concerts.json      ← concerts
data/concerts.exemple.json  dates fictives pour l'aperçu
assets/css/style.css    mise en page
assets/js/              rendu et interactions (modules ES)
assets/fonts/           Barlow Condensed (texte), Anton (titres), toutes deux sous licence OFL, hébergées localement ; Bricolage Grotesque ne sert qu’à la page hors connexion
tools/serveur.mjs       serveur local
app/index.html              page « Télécharger l'application » (installe le site comme appli ; l'appli s'ouvre sur l'accueil)
tools/optimiser-image.mjs   préparation des photos (facultatif)
tools/onde.mjs              WAV → MP3 + forme d'onde pour le lecteur (facultatif)
```

## Alertes « nouvelle date », fil Facebook, crédits

**Alertes sur téléphone (sans serveur).** Dans la section Concerts, le bouton « M'alerter des nouvelles dates » apparaît seulement sur les navigateurs qui savent le faire : Chrome, Edge ou Samsung Internet, principalement sur Android, avec le site **installé sur l'écran d'accueil**. Le téléphone vérifie `data/concerts.json` en arrière-plan, quelques fois par jour au plus (c'est le navigateur qui décide), et affiche une notification quand une date inédite apparaît. Une date déjà vue sur le site ne déclenche pas d'alerte.
- iPhone : pas possible sans serveur d'envoi. Le bouton n'y est pas affiché.
- Pour des notifications instantanées sur tous les téléphones, il faudrait un service d'envoi comme OneSignal (offre gratuite, compte à créer). Ce n'est pas branché ici.

**Fil Facebook (conforme CNIL).** La section « Actus » montre la dernière publication de la page Facebook renseignée dans `reseaux`. Rien n'est chargé depuis Facebook (donc aucun cookie) avant que le visiteur clique sur « Afficher ». L'accord est mémorisé 6 mois sur son appareil et se retire d'un clic (« Retirer l'accord »). Sans accord, l'icône Facebook mène simplement à la page, et s'ouvre dans l'application sur téléphone. Sans lien Facebook, la section est masquée.

**Crédits photo.** `credits.photos` et `credits.liens` dans `content/site.js`. Ils s'affichent sous les membres et dans le pied de page.

## Structure de la page

1. En-tête : diaporama, logo, ligne de style.
2. Dates : annonce centrée encadrée « Prochaine date » (affiche + billet, ou « Bientôt » quand rien n’est annoncé), lien « Proposer une date », alerte (Android), puis la bande d'affiches « Déjà joué » et la liste complète repliable.
3. Le groupe : les cinq tuiles (couleur de chaque membre dans `membres[].couleur`).
4. Galerie : `galerie` dans `content/site.js` ; chaque photo en deux fichiers WebP, `-560.webp` (560 px de haut) et `-1600.webp`, dans `assets/galerie/`.
5. Réseaux sociaux : icônes Instagram / Facebook et dernière publication Facebook (après accord).
