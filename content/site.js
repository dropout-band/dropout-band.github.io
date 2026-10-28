/*
 * ============================================================
 *  CONTENU DU SITE — Drop Out
 * ============================================================
 *  Seul fichier à modifier pour les textes, membres et liens.
 *  (Les concerts sont dans data/concerts.json.)
 *
 *  - Le texte va entre guillemets "…" (apostrophe : ’ ou \').
 *  - Une valeur vide "" masque l'élément concerné.
 *  - Chaque ligne d'une liste se termine par une virgule.
 *
 *  En local, des repères « À renseigner » signalent ce qui manque
 *  (invisibles une fois le site publié, sauf avec ?brouillon).
 * ============================================================
 */

export default {
  groupe: {
    nom: "Drop Out",
    // Petite ligne sous le logo (repris des affiches du groupe).
    style: "Rock alternatif · Ardèche",
    // Texte de présentation, sous « Le groupe ». Un paragraphe par ligne ; le premier est
    // l'accroche (en grand), le dernier la chute (mise en avant). Liste vide = masqué.
    presentation: [
      "Drop Out, c’est du rock !",
      "Drop Out, c’est des reprises qui vous font redécouvrir vos morceaux préférés.",
      "Drop Out, c’est des guitares, basse, batterie et chants : tout est réuni pour une soirée de folie !",
      "Drop Out, ça veut dire lâcher prise, le temps d’un moment agréable et festif.",
      "Drop Out ne suit pas les codes, il les casse.",
    ],
  },

  /*
   * MUSIQUE — section « Écouter » (masquée si tout est vide).
   * titres : morceaux lus sur le site, avec leur forme d'onde. Pour partir d'un
   *   WAV : node tools/onde.mjs mon-morceau.wav nom   (crée le MP3 et le JSON)
   *   { titre: "Nom du morceau", fichier: "assets/audio/nom.mp3", onde: "assets/audio/nom.json" }
   *   (« onde » est facultatif : sans lui, la forme d'onde est calculée dans le
   *   navigateur, ce qui télécharge tout le morceau et est plus lent.)
   * videos : le clip, affiché dans la section « Médias » au-dessus des photos. Fichier MP4 (H.264) hébergé
   *   sur le site, lu par le lecteur du navigateur : aucun service tiers.
   *   { titre: "Act a Man · clip", fichier: "assets/video/clip.mp4", affiche: "assets/video/clip.webp" }
   *   (« affiche » : image affichée avant la lecture, facultative mais conseillée ; GitHub Pages refuse
   *   les fichiers de plus de 100 Mo, viser moins de 50 Mo.)
   * ecoute : liens vers les plateformes.
   *   { nom: "Spotify", url: "https://…" }
   */
  musique: {
    // Phrase affichée au-dessus du lecteur, dans « Écouter » (facultatif).
    texte: "5 musiciens réunis par une passion commune : faire vibrer les gens au son de leurs riffs endiablés.",
    titres: [
      { titre: "Act a Man · extrait", fichier: "assets/audio/act-a-man.mp3", onde: "assets/audio/act-a-man.json" },
    ],
    videos: [],
    ecoute: [],
  },

  /*
   * BOOKING — fenêtre ouverte par le bouton « Booking » de la barre du haut : un gros titre,
   * cette phrase, et le bouton « Nous contacter » (utilise contact.email ; message pré-rempli
   * dans contact.objetBooking et contact.corpsBooking, plus bas).
   */
  booking: {
    texte: "Une date, un festival, une soirée ? Écrivez-nous : on vous répond vite.",
  },

  /*
   * MEMBRES
   * nom : titre de la tuile. role : sous le nom.
   * traits : petites annotations posées sur la photo (2 ou 3 suffisent).
   * couleur : la couleur du membre, reprise de l'illustration du groupe
   *   (aplat de son étiquette). Le texte passe en noir ou blanc tout seul.
   * photo: null → visuel provisoire neutre.
   * position : cadrage de la photo ("horizontal vertical").
   */
  membres: [
    {
      nom: "Tom", role: "Guitariste / Chanteur", couleur: "#d1933f",
      traits: ["Barbu", "Déjanté", "Gourmand"],
      photo: { base: "assets/img/membre-1", alt: "Tom, guitariste et chanteur de Drop Out, au micro", position: "50% 25%" },
    },
    {
      nom: "Laura", role: "Chanteuse", couleur: "#2a5a9a",
      traits: ["Chardonnay", "Attentive", "Puissante"],
      photo: { base: "assets/img/membre-2", alt: "Laura, chanteuse de Drop Out, micro en main", position: "45% 20%" },
    },
    {
      nom: "Wil", role: "Guitariste", couleur: "#66a03b",
      traits: ["L’ancien", "L’expatrié", "Le rigoureux"],
      photo: { base: "assets/img/membre-3", alt: "Wil, guitariste de Drop Out", position: "50% 25%" },
    },
    {
      nom: "Dean", role: "Bassiste", couleur: "#d9583a",
      traits: ["Adore le son gras", "Créatif", "Stylé"],
      photo: { base: "assets/img/membre-4", alt: "Dean, bassiste de Drop Out", position: "55% 25%" },
    },
    {
      nom: "Louna", role: "Batteuse", couleur: "#87507a",
      traits: ["Blasée", "Perfectionniste", "N’entend rien"],
      photo: { base: "assets/img/membre-5", alt: "Louna, batteuse de Drop Out, derrière sa batterie au logo du groupe", position: "50% 30%" },
    },
    {
      nom: "Yo", role: "Ingé son", couleur: "#b3292c",
      traits: ["Oreille d’or", "Maître des faders", "Dans l’ombre"],
      photo: { base: "assets/img/membre-6", alt: "Yo, ingénieur du son de Drop Out, la main sur la console de mixage, éclairé par une petite lampe", position: "50% 40%" },
    },
  ],

  /*
   * GALERIE — une rangée de photos, agrandies au toucher.
   * photo : chemin sans l'extension ; prévoir -560.webp (vignette, 560 px
   *   de haut) et -1600.webp (grand format). Liste vide = section masquée.
   */
  galerie: [
    { photo: "assets/galerie/groupe-sur-scene", largeur: 841, alt: "Les cinq membres de Drop Out réunis sur scène, une basse levée en l’air" },
    { photo: "assets/galerie/concert-complet", largeur: 840, alt: "Drop Out au complet en concert, sous les lumières vertes" },
    { photo: "assets/galerie/tom-au-micro", largeur: 373, alt: "Tom au chant et à la guitare" },
    { photo: "assets/galerie/laura-au-chant", largeur: 373, alt: "Laura au chant, éclairée en violet" },
    { photo: "assets/galerie/wilfried-guitare", largeur: 373, alt: "Wil à la guitare" },
    { photo: "assets/galerie/dean-et-louna", largeur: 373, alt: "Dean à la basse, Louna à la batterie derrière lui" },
    { photo: "assets/galerie/louna-banniere", largeur: 373, alt: "Louna à la batterie devant la banderole du groupe" },
  ],

  /*
   * PARTENAIRES — bandeau défilant « Ils nous ont fait confiance » (masqué si la liste est vide).
   * logo : chemin SANS extension (assets/partenaires/nom.webp : logo blanc sur fond transparent).
   * nom : lu par les lecteurs d'écran et sur le lien. url : site de l'organisme ; le logo l'ouvre dans une nouvelle fenêtre (facultatif).
   * taille : 1 par défaut ; 1.3 pour un logo carré qui paraîtrait trop petit.
   */
  partenaires: [
    { nom: "La Ferme", logo: "assets/partenaires/la-ferme", url: "https://lafermeaubenas.fr/" },
    { nom: "La Maison de l’image", logo: "assets/partenaires/mi", url: "https://www.maisonimage.eu/" },
    { nom: "Restaurant Les Mûriers", logo: "assets/partenaires/les-muriers", url: "https://www.facebook.com/lesmuriers.restaurant/?locale=fr_FR", taille: 0.85 },
    { nom: "Mairie de Mayres", logo: "assets/partenaires/mayres", url: "https://mayres-ardeche.fr/", taille: 1.35 },
    { nom: "Mairie de Lalevade", logo: "assets/partenaires/lalevade", url: "https://www.lalevade.fr/" },
  ],

  contact: {
    // Adresse de contact du groupe : active le bouton « Nous contacter » de la fenêtre Contact
    // (il ouvre la messagerie). Vide = masqué.
    email: "dropout07200@gmail.com",
    // Message pré-rempli des boutons Booking (pour une association ou un organisateur).
    // Les lignes « - Libellé : » sont à compléter à la suite par l'expéditeur.
    objetBooking: "Demande de booking — Drop Out",
    corpsBooking: "Bonjour Drop Out,\n\nNous organisons un événement et aimerions vous y programmer. Voici les informations :\n\n- Association / organisation :\n- Nom de l’événement :\n- Date(s) envisagée(s) :\n- Lieu et ville :\n- Type d’événement (festival, soirée, fête de village…) :\n- Jauge approximative :\n- Durée du set souhaitée :\n- Cachet / défraiement / repas / hébergement :\n- Matériel sur place (sono, lumière, backline) :\n- Nom et téléphone de la personne à contacter :\n\nMerci, et à bientôt,\n",
  },

  // Réseaux sociaux : affichés en icônes (section « Réseaux sociaux » et pied
  // de page). Une adresse vide masque l'icône.
  reseaux: [
    // Instagram repris de l'affiche de l'été 2026 — à vérifier.
    // `publications` (facultatif) : photos de la bande de ce réseau, { photo: "assets/…/nom" (sans extension,
    // avec une version -560.webp), url: lien de la publication, alt }. Sans elle, ce sont les photos de la galerie.
    { nom: "Instagram", url: "https://www.instagram.com/drop_out.band/" },
    // Page Facebook du groupe (alimente aussi la dernière publication).
    { nom: "Facebook", url: "https://www.facebook.com/p/dropoutband-61577236162571/" },
    { nom: "TikTok", url: "" },
    { nom: "YouTube", url: "" },
  ],

  // Crédit photo (pied de page et section « Le groupe »).
  /*
   * NOTIFICATIONS « push » (alertes sur le téléphone, même site fermé ; iPhone compris si l'appli est installée).
   * Vide = on garde les alertes d'avant (Android + appli installée seulement). À remplir une fois le serveur mis
   * en place : voir notifications/LISEZ-MOI.md.
   *  - serveur : l'adresse du serveur de notifications (ex. https://drop-out-notifications.xxx.workers.dev)
   *  - clePublique : la clé publique donnée par « node tools/cles-push.mjs »
   */
  notifications: {
    serveur: "https://drop-out-notifications.dropout-band.workers.dev",
    clePublique: "BG4OLxydYuWAfRaFSjAZzCw2T9BdGHHf_tOwn1TS3JKus63JV9_DY_3W7wKswzwtIz5nO_KySsv9zwpv5NV6cR8",
  },

  /*
   * MENTIONS LÉGALES (lien « Mentions légales » en bas de page). Obligatoires en France pour tout site public
   * (loi LCEN) : à compléter avec les vraies informations. Un champ vide affiche « À renseigner » en local.
   *  - editeur : le groupe ou l'association qui publie le site. statut : « Association loi 1901 »,
   *    « Groupe de musique (non constitué en société) »… ; si l'éditeur est un particulier, l'adresse peut être
   *    remplacée par celle de l'hébergeur (le particulier peut rester anonyme, mais l'hébergeur doit le connaître).
   *  - hebergeur : à vérifier d'après l'endroit où le site est réellement publié.
   */
  legal: {
    editeur: {
      nom: "Drop Out",
      statut: "",
      responsable: "",
      adresse: "",
      email: "dropout07200@gmail.com",
    },
    hebergeur: {
      nom: "GitHub, Inc. (GitHub Pages)",
      adresse: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
      site: "https://pages.github.com/",
    },
    misAJour: "octobre 2026",
  },

  credits: {
    photos: "Romane Lézy",
    liens: [
      { nom: "Site web", url: "https://romanelphotos.myportfolio.com/a-propos" },
      { nom: "Instagram", url: "https://www.instagram.com/romanelphotos/" },
    ],
  },
};
