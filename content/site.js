/*
   contenu du site, drop out
   le seul fichier à modifier pour les textes, membres et liens (les concerts sont dans data/concerts.json).
   
   - texte entre guillemets "..." (apostrophe : ’ ou \')
   - une valeur vide "" masque l'élément
   - chaque ligne d'une liste finit par une virgule
   
   en local, des repères « À renseigner » signalent ce qui manque (invisibles en ligne, sauf avec ?brouillon)
*/

export default {
  groupe: {
    nom: "Drop Out",
    // petite ligne sous le logo (reprise des affiches)
    style: "Rock alternatif · Ardèche",
    // présentation, sous « Le groupe ». un paragraphe par ligne : le premier est l'accroche (en grand), le dernier la chute (mise en avant). liste vide = masqué
    presentation: [
      "Drop Out c’est du rock !",
      "Drop Out : c’est des compos entêtantes et des reprises qui vous feront redécouvrir vos morceaux préférés",
      "Drop Out, c’est des guitares, basse, batterie et chants : tout est réuni pour une soirée de folie !",
      "Drop Out, ça veut dire lâcher prise, le temps d’un moment agréable et festif.",
      "Drop Out ne suit pas les codes, il les casse.",
    ],
  },

  /*
     musique : section « Compos » (masquée si tout est vide)
     titres : morceaux lus sur le site avec leur forme d'onde. à partir d'un wav : node tools/onde.mjs mon-morceau.wav nom (crée le mp3 et le json)
       { titre: "Nom du morceau", fichier: "assets/audio/nom.mp3", onde: "assets/audio/nom.json" }
       « onde » est facultatif : sans lui la forme d'onde est calculée dans le navigateur, ce qui télécharge tout le morceau (plus lent)
     videos : le clip, dans « Médias ». mp4 (h.264) hébergé sur le site, aucun service tiers
       { titre: "Act a Man · clip", fichier: "assets/video/clip.mp4", affiche: "assets/video/clip.webp" }
       « affiche » : image avant la lecture (conseillée). github pages refuse plus de 100 Mo, viser moins de 50 Mo
     ecoute : liens vers les plateformes { nom: "Spotify", url: "https://..." }
  */
  musique: {
    // phrase au-dessus du lecteur, dans « Compos » (facultatif)
    texte: "5 musiciens réunis par une passion commune : faire vibrer les gens au son de leurs riffs endiablés.",
    // phrase en bande au-dessus du lecteur (même style que la phrase en bande de « Le groupe »)
    chute: "Drop Out créer dans la bonne humeur, et la partage à son public !",
    titres: [
      { titre: "Act a Man · extrait", fichier: "assets/audio/act-a-man.mp3", onde: "assets/audio/act-a-man.json" },
    ],
    videos: [
      { titre: "Act a Man · clip", fichier: "assets/video/clip.mp4", affiche: "assets/video/clip.webp" },
    ],
    ecoute: [],
  },

  /*
     booking : fenêtre ouverte par le bouton de la barre du haut (gros titre, cette phrase, bouton « Nous contacter »).
     utilise contact.email, avec le message pré-rempli de contact.objetBooking et contact.corpsBooking plus bas
  */
  booking: {
    texte: "Une date, un festival, une soirée ? Écrivez-nous : on vous répond vite.",
  },

  /*
     membres
     nom : titre de la tuile. role : sous le nom. traits : petites annotations sur la photo (2 ou 3 suffisent)
     couleur : celle du membre, reprise de l'illustration du groupe (aplat de son étiquette) ; le texte passe en noir ou blanc tout seul
     photo: null = visuel provisoire. position : cadrage de la photo ("horizontal vertical")
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
     galerie : slider de photos, agrandies au toucher. photo : chemin sans extension, avec trois fichiers : -560.webp, -1000.webp et -1600.webp (largeurs en px).
     liste vide = section masquée
  */
  galerie: [
    { photo: "assets/galerie/groupe-sur-scene", alt: "Les cinq membres de Drop Out réunis sur scène, une basse levée en l’air" },
    { photo: "assets/galerie/concert-lumieres-vertes", alt: "Drop Out au complet en concert, sous les lumières vertes" },
    { photo: "assets/galerie/wil-guitare", alt: "Wil à la guitare, éclairé en violet" },
    { photo: "assets/galerie/concert-violet", alt: "Drop Out en concert, la chanteuse et les guitaristes sous les projecteurs violets" },
    { photo: "assets/galerie/tom-et-louna", alt: "Tom penché sur sa guitare, Louna à la batterie derrière lui" },
    { photo: "assets/galerie/laura-main-levee", alt: "Laura lève la main en chantant, dans une lumière rose" },
    { photo: "assets/galerie/laura-lumiere-rouge", alt: "Laura au chant, Dean à la basse et Louna à la batterie, dans une lumière rouge et bleue" },
    { photo: "assets/galerie/scene-poutres", alt: "Drop Out au complet sur scène, sous les poutres éclairées en violet" },
  ],

  /*
     partenaires : bandeau défilant « Ils nous ont fait confiance » (masqué si la liste est vide)
     logo : chemin sans extension (assets/partenaires/nom.webp, logo blanc sur fond transparent)
     nom : lu par les lecteurs d'écran. url : site de l'organisme, ouvert dans une nouvelle fenêtre (facultatif)
     taille : 1 par défaut, 1.3 pour un logo carré qui paraît trop petit
  */
  partenaires: [
    { nom: "La Ferme", logo: "assets/partenaires/la-ferme", ratio: 3.475, url: "https://lafermeaubenas.fr/" },
    { nom: "La Maison de l’image", logo: "assets/partenaires/mi", ratio: 1.308, url: "https://www.maisonimage.eu/" },
    { nom: "Restaurant Les Mûriers", logo: "assets/partenaires/les-muriers", ratio: 3.167, url: "https://www.facebook.com/lesmuriers.restaurant/?locale=fr_FR", taille: 0.85 },
    { nom: "Mairie de Mayres", logo: "assets/partenaires/mayres", ratio: 0.992, url: "https://mayres-ardeche.fr/", taille: 1.35 },
    { nom: "Mairie de Lalevade", logo: "assets/partenaires/lalevade", ratio: 2.325, url: "https://www.lalevade.fr/" },
  ],

  contact: {
    // adresse de contact du groupe : active le bouton « Nous contacter » de la fenêtre contact (ouvre la messagerie). vide = masqué
    email: "dropout07200@gmail.com",
    // message pré-rempli des boutons booking, volontairement court : date, lieu, type d'événement, contact. les lignes « - Libellé : » sont à compléter par l'expéditeur
    objetBooking: "Demande de booking — Drop Out",
    corpsBooking: "Bonjour Drop Out,\n\nNous aimerions vous programmer :\n\n- Date :\n- Lieu et ville :\n- Type d’événement :\n- Contact (nom et téléphone) :\n\nMerci !\n",
  },

  // réseaux sociaux : affichés en icônes (section « Suivez-nous », menu). une adresse vide masque l'icône
  reseaux: [
    // instagram repris de l'affiche de l'été 2026, à vérifier
    // publications (facultatif) : photos de la bande de ce réseau, { photo: "assets/.../nom" (sans extension, avec une version -560.webp), url: lien de la publication, alt }.
    // sans elle, ce sont les photos de la galerie
    { nom: "Instagram", url: "https://www.instagram.com/drop_out.band/" },
    // page facebook du groupe (alimente aussi la dernière publication)
    { nom: "Facebook", url: "https://www.facebook.com/p/dropoutband-61577236162571/" },
    { nom: "TikTok", url: "" },
    { nom: "YouTube", url: "" },
  ],

  // crédit photo (pied de page et section « Le groupe »)
  /*
     notifications push (alertes sur le téléphone même site fermé ; iPhone si l'appli est installée).
     vide = anciennes alertes (android + appli installée seulement). à remplir une fois le serveur en place : voir notifications/LISEZ-MOI.md
     - serveur : adresse du serveur de notifications (ex. https://drop-out-notifications.xxx.workers.dev)
     - clePublique : la clé donnée par node tools/cles-push.mjs
  */
  notifications: {
    serveur: "https://drop-out-notifications.dropout-band.workers.dev",
    // passer à true quand le jeton Meta est posé sur le serveur (voir notifications/LISEZ-MOI.md) : le site affiche alors les dernières publications facebook
    actus: false,
    clePublique: "BG4OLxydYuWAfRaFSjAZzCw2T9BdGHHf_tOwn1TS3JKus63JV9_DY_3W7wKswzwtIz5nO_KySsv9zwpv5NV6cR8",
  },

  /*
     mentions légales (lien en bas de page). obligatoires en france pour un site public (loi LCEN), à compléter avec les vraies infos. un champ vide affiche « À renseigner » en local.
     - editeur : le groupe ou l'asso qui publie le site. statut : « Association loi 1901 », « Groupe de musique (non constitué en société) »...
       si c'est un particulier, l'adresse peut être remplacée par celle de l'hébergeur (le particulier peut rester anonyme mais l'hébergeur doit le connaître)
     - hebergeur : à vérifier d'après l'endroit où le site est publié
  */
  legal: {
    editeur: {
      nom: "Drop Out",
      statut: "Groupe de musique amateur, non constitué en société ni en association",
      responsable: "MKL.studio",
      adresse: "Non publiée : le groupe n’a pas d’adresse propre. L’identité de l’éditeur est communiquée à l’hébergeur, conformément à l’article 6 de la loi pour la confiance dans l’économie numérique.",
      email: "mikael.godineau@hotmail.fr",
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
    illustrations: "Louna Caruso",
    liens: [
      { nom: "Site web", url: "https://romanelphotos.myportfolio.com/a-propos" },
      { nom: "Instagram", url: "https://www.instagram.com/romanelphotos/" },
    ],
  },
};
