// CAMPAGNE D'ÉMISSION AIR (ROADMAP Phase 2, étape 2.4).
// 12 intentions de domaines distincts (marge sur le critère ≥ 10), couvrant
// les trois classes commerce. Textes FIXES — la campagne est rejouable.
export const INTENTIONS = [
  {
    slug: "resto-quartier",
    commerce: "physical_or_offapp",
    text:
      "Je tiens un petit restaurant de quartier à Abidjan. Je veux une app où mes clients " +
      "voient le menu avec photos et prix, commandent à emporter, paient par carte dans " +
      "l'app, et reçoivent une notification quand la commande est prête. En français.",
  },
  {
    slug: "salon-coiffure",
    commerce: "none",
    text:
      "Mon salon de coiffure a besoin d'une app de prise de rendez-vous : liste des " +
      "prestations avec durée, choix d'un créneau, rappel la veille par notification. " +
      "Le paiement se fait sur place, pas dans l'app. Français et anglais.",
  },
  {
    slug: "coach-fitness",
    commerce: "digital",
    text:
      "Je suis coach sportif. Je veux vendre un abonnement mensuel dans l'app qui " +
      "débloque mes programmes d'entraînement en vidéo et un suivi des séances. " +
      "L'abonnement s'achète directement dans l'app. En français.",
  },
  {
    slug: "boutique-mode",
    commerce: "physical_or_offapp",
    text:
      "Ma boutique de vêtements veut une app catalogue : articles par catégorie avec " +
      "photos, panier, paiement par carte, suivi de l'état de la commande, et scan d'un " +
      "code-barres en magasin pour voir la fiche d'un article. En français.",
  },
  {
    slug: "cours-cuisine",
    commerce: "digital",
    text:
      "Je vends des cours de cuisine en vidéo. L'app doit proposer les cours à l'achat à " +
      "l'unité dans l'app, la lecture des vidéos achetées, et mes recettes en accès libre. " +
      "En français et en anglais.",
  },
  {
    slug: "plombier-urgence",
    commerce: "none",
    text:
      "Je suis plombier. Mes clients doivent pouvoir décrire leur problème avec des " +
      "photos, partager leur adresse et position pour l'intervention, et suivre le statut " +
      "de leur demande. Devis et paiement se font hors de l'app. En français.",
  },
  {
    slug: "agence-immo",
    commerce: "none",
    text:
      "Mon agence immobilière veut une app d'annonces : biens avec photos et carte, " +
      "filtres par prix et quartier, demande de visite sur un créneau, favoris. Aucune " +
      "transaction dans l'app. En français.",
  },
  {
    slug: "livraison-fruits",
    commerce: "physical_or_offapp",
    text:
      "Je livre des paniers de fruits et légumes. L'app doit proposer les paniers de la " +
      "semaine, la commande avec paiement par carte, l'adresse de livraison avec position, " +
      "et une notification à la livraison. En français.",
  },
  {
    slug: "tuteur-langues",
    commerce: "digital",
    text:
      "Je suis tuteur de langues. Je veux vendre dans l'app des packs de leçons " +
      "interactives (achat dans l'app), avec suivi de progression et rappels quotidiens " +
      "de révision. Interface en français et en anglais.",
  },
  {
    slug: "toiletteur-chiens",
    commerce: "none",
    text:
      "Mon salon de toilettage pour chiens veut une app : fiche de chaque animal avec " +
      "photo, prise de rendez-vous, rappel de vaccination, historique des visites. " +
      "Paiement sur place uniquement. En français.",
  },
  {
    slug: "billetterie-concerts",
    commerce: "physical_or_offapp",
    text:
      "J'organise des concerts locaux. L'app doit lister les événements à venir, vendre " +
      "les billets par carte, afficher le billet avec un code à scanner à l'entrée, et " +
      "ajouter l'événement au calendrier du téléphone. En français.",
  },
  {
    slug: "suivi-chantier",
    commerce: "none",
    text:
      "Mon entreprise de BTP veut une app interne : chaque chef de chantier photographie " +
      "l'avancement, consigne les incidents, et le client consulte l'avancement de son " +
      "chantier hors ligne quand le réseau manque. En français.",
  },
  // D-126 (2026-09-02) — EXTENSION DU CORPUS, première intention du pivot
  // sectoriel voyage/transport. Périmètre MINIMAL HONNÊTE par construction :
  // recherche par destination seule (searchFieldId — le seul mécanisme rendu),
  // AUCUNE promesse de temps réel, de siège, de notification, de calendrier ni
  // de confirmation transporteur. Le débit réel sera « dit »
  // (capabilitiesEmitCode: false). Critères d'acceptation : annexe de D-126.
  {
    slug: "bus-intercites",
    commerce: "physical_or_offapp",
    text:
      "Ma compagnie de bus intercités vend des billets : l'app liste les départs à " +
      "venir avec destination, date, heure et prix, permet de chercher un départ par " +
      "destination, de réserver un billet au nom du passager, de payer par carte " +
      "dans l'app, puis présente le billet avec un code à montrer au contrôleur. " +
      "En français.",
  },
  {
    // AJOUTÉE 2026-09-09 — exigence propriétaire : la première génération du
    // prompt resynchronisé (1.18) porte sur une MARKETPLACE. Additive : les
    // 13 intentions précédentes restent byte-identiques, la campagne
    // historique reste rejouable.
    slug: "marketplace-artisans",
    commerce: "physical_or_offapp",
    text:
      "Je lance une marketplace d'artisans en Côte d'Ivoire. Plusieurs vendeurs y proposent " +
      "leurs créations : bijoux, tissus, mobilier, déco. Les clients créent un compte, " +
      "parcourent les produits par catégorie avec photos et prix, recherchent, voient la " +
      "fiche d'un produit avec sa description et son vendeur, ajoutent au panier, paient " +
      "par carte, et suivent l'état de leurs commandes. Chaque client gère son profil " +
      "(nom, téléphone, adresse de livraison). En français.",
  },
  {
    // AJOUTÉE 2026-09-10 — commande propriétaire : deuxième marketplace,
    // NOMMÉE par le client, générée APRÈS la resynchronisation 36ter/36quater
    // (images réelles, accueil marchand). Elle mesure ce que le système
    // produit SEUL — aucune retouche d'app générée n'est autorisée.
    slug: "dougplace",
    commerce: "physical_or_offapp",
    text:
      "Je lance Dougplace — l'application s'appelle exactement « Dougplace » — une " +
      "marketplace généraliste en Côte d'Ivoire : électronique, mode, maison, sport. " +
      "Les vendeurs listent leurs produits avec de vraies photos, les clients créent un " +
      "compte, découvrent une sélection dès l'accueil, parcourent le catalogue par " +
      "catégorie, recherchent, consultent la fiche d'un produit avec photos, description, " +
      "prix et vendeur, ajoutent au panier, paient par carte et suivent leurs commandes. " +
      "Chaque client gère son profil et son adresse de livraison. En français.",
  },
  {
    // AJOUTÉE 2026-09-10 — TEST INDÉPENDANT du moteur (commande propriétaire).
    // Formulée DIFFÉREMMENT de dougplace, volontairement : même archétype,
    // autre voix de client — le moteur doit assembler, pas réciter.
    slug: "marketa",
    commerce: "physical_or_offapp",
    text:
      "Mon entreprise lance Marketa (le nom exact de l'application est « Marketa »). " +
      "C'est une place de marché mobile généraliste pour l'Afrique de l'Ouest : on y " +
      "achète de l'électronique, des vêtements, de l'électroménager et des articles de " +
      "sport auprès de marchands vérifiés. Je veux que dès l'ouverture on comprenne où " +
      "on est et qu'on puisse chercher un article tout de suite. Il faut des photos " +
      "réalistes sur chaque produit, les prix en francs CFA, un panier, le suivi des " +
      "commandes avec leurs statuts, la création de compte et un profil avec adresse de " +
      "livraison. Les fiches produit montrent la photo, la description, le prix, l'état " +
      "(neuf ou occasion) et le marchand. Tout en français.",
  },
  {
    // AJOUTÉE 2026-09-11 — PREUVE DU MOTEUR FINAL (mission Elite A++++,
    // étape ⑦) : premier archétype NON marketplace généré APRÈS les six
    // étapes (plan→runtime scellé, AppShell, contrats, validation avant
    // émission, passes réordonnées + obligations, chaîne unique). Aucune
    // retouche d'app générée n'est autorisée — ce document mesure le moteur.
    slug: "kaviva-spa",
    commerce: "physical_or_offapp",
    text:
      "J'ouvre Kaviva, un institut de beauté et spa à Abidjan — l'application " +
      "s'appelle exactement « Kaviva ». Mes clientes doivent voir la liste des " +
      "soins proposés (massages, soins du visage, manucure, hammam) avec photo, " +
      "durée et prix, chercher un soin, consulter la fiche détaillée d'un soin, " +
      "choisir un créneau et réserver un rendez-vous à leur nom avec date et " +
      "heure, puis retrouver leurs rendez-vous à venir et passés. Chaque cliente " +
      "crée un compte et gère son profil avec son téléphone. L'accueil doit " +
      "donner tout de suite envie : les soins vedettes en avant et la recherche " +
      "accessible immédiatement. Tout en français.",
  },
  {
    // EP-089 — PREMIÈRE APPLICATION RÉELLE (vaut V4 de R8). PAS de champ
    // `commerce` : le brief est piégé à dessein (visibilité payée in-app
    // vendeur→plateforme, contact acheteur-vendeur hors app) — la lecture
    // de P0 est une DONNÉE, pas une erreur ; la conformance ne présume rien.
    slug: "marketplace-africain",
    // EP-091 ② — BRIEF PRÉCISÉ (le moteur avait interrogé : « réalité
    // africaine » refusé AMBIGU 2/3 tirages — la réponse du propriétaire est
    // CE verbatim). Toujours AUCUN champ commerce : les 3 tirages DeepSeek
    // l'ont classé de 3 façons — toute lecture de P0 est une DONNÉE (EP-044).
    text:
      "Une place de marché pour le Tchad et le Sahel. Les vendeurs créent " +
      "leur boutique et publient leurs produits avec photos et prix en " +
      "francs CFA. Les acheteurs parcourent le catalogue par catégorie et " +
      "recherchent un produit. Il n'y a aucun paiement en ligne entre " +
      "acheteur et vendeur : l'acheteur contacte le vendeur directement par " +
      "WhatsApp ou par appel téléphonique, et ils s'arrangent entre eux. " +
      "Les vendeurs paient la plateforme pour mettre leurs produits en " +
      "avant dans le catalogue.",
  },
  {
    slug: "marche-immobilier",
    // EP-168 — DOMAINE NEUF, jamais généré sous AUCUN contrat. `agence-immo`
    // existait, mais ses archives datent du 2026-09-02, AVANT le contrat
    // 1.25.0 — et il a servi de FIXTURE pendant les passes : le moteur le
    // connaît. Rejouer l'un pour l'autre n'aurait pas comparé deux
    // générations mais deux mondes.
    //
    // `commerce` VOLONTAIREMENT OMIS, comme pour `marketplace-africain` :
    // trois tirages y avaient classé le même domaine de trois façons. Toute
    // lecture de P0 est une DONNÉE (EP-044), jamais une erreur — déclarer
    // une attente ici la transformerait en verdict.
    //
    // TEXTE VERBATIM de Youssouf, non reformulé.
    text:
      "Un marché immobilier pour le Tchad et le Sahel. Les agences " +
      "immobilières et les particuliers publient leurs biens à vendre ou " +
      "à louer, avec des photos, le prix en francs CFA, la surface, le " +
      "nombre de pièces et le quartier. Les acheteurs et les locataires " +
      "parcourent les annonces, filtrent par ville, quartier, prix et type " +
      "de bien, et consultent la fiche complète. Il n'y a aucun paiement " +
      "en ligne : l'intéressé contacte directement le vendeur par appel " +
      "téléphonique ou par WhatsApp pour organiser une visite et " +
      "s'arranger avec lui.",
  },
  {
    slug: "tontine-cameroun",
    // EP-186 ② — DOMAINE NEUF, ET LE PREMIER À DEUX RÔLES AUX DROITS
    // DISTINCTS : un président CRÉE et se fait vérifier, des membres
    // REJOIGNENT et cotisent. Aucun domaine généré jusqu'ici n'avait ça —
    // `marche-immobilier` a deux acteurs, mais ils font la même chose des
    // deux côtés d'une annonce.
    //
    // `commerce` VOLONTAIREMENT OMIS, comme pour les deux marchés : l'argent
    // circule par Mobile Money, hors application ou dedans — c'est une
    // lecture de P0, pas une attente à déclarer (EP-044).
    //
    // TEXTE VERBATIM de Youssouf, non reformulé.
    text:
      "Une application de tontine pour le Cameroun. Un président crée une " +
      "tontine en donnant son nom, son numéro Mobile Money, une photo de lui " +
      "et une pièce d'identité — son profil affiche alors un badge vérifié. " +
      "Les membres rejoignent la tontine, consultent la fiche du président, " +
      "et cotisent chaque semaine ou chaque mois par Orange Money ou MTN " +
      "Mobile Money. Un tableau de bord montre qui a payé et qui est en " +
      "retard, avec le montant dû et la pénalité. À l'échéance, le pot est " +
      "versé au membre dont c'est le tour.",
  },
  {
    slug: "marketplace-fiche",
    // EP-186 — LE MÊME DOMAINE QUE `marketplace-africain`, À UNE PRÉCISION
    // PRÈS, ET ELLE EST LE POINT : le brief d'origine dit que l'acheteur
    // contacte le vendeur ; celui-ci dit OÙ — sur la FICHE du produit, avec
    // la description, le prix, et deux boutons.
    //
    // C'est donc un test de FIDÉLITÉ plus que de domaine : le générateur
    // suit-il une exigence de CONTENU D'ÉCRAN énoncée dans le brief ? Aucune
    // règle du moteur ne prescrit ce que porte une fiche.
    //
    // `commerce` OMIS comme pour les autres marchés (EP-044).
    //
    // TEXTE VERBATIM de Youssouf, non reformulé.
    text:
      "Une place de marché où les vendeurs paient pour la visibilité de leurs " +
      "produits. Les acheteurs contactent les vendeurs directement par appel " +
      "téléphonique ou par WhatsApp. Quand un utilisateur clique sur un " +
      "produit, la fiche contient la description, le prix, un bouton appel et " +
      "un bouton WhatsApp. Les prix sont en francs CFA.",
  },
  {
    slug: "marketplace-boutiques",
    // EP-186 — LE CAHIER DE YOUSSOUF, RÉDUIT À SON MÉTIER.
    //
    // Ce qu'il décrit se sépare en DEUX, et le prompt P0 impose la coupure :
    // « écrans, nombre d'écrans, mise en page, navigation, composition »
    // sont des DÉCISIONS INTERDITES dans un brief, refusées mécaniquement.
    //
    // N'ENTRE PAS ICI, ET CE N'EST PAS UN OUBLI : « six produits au maximum
    // sur l'accueil », « barre de recherche fixe en haut », « trois onglets
    // Accueil / Boutiques / Compte ». Ce sont des décisions de PRÉSENTATION
    // — le moteur les prend, ou il ne les prend pas encore, mais elles ne se
    // demandent pas à P0.
    //
    // ENTRE ICI, parce que c'est du MÉTIER : les produits appartiennent à des
    // boutiques · le prix est FACULTATIF (le vendeur le met ou non) · le
    // contact est porté par la BOUTIQUE, donc partagé par ses produits · on
    // peut publier SANS boutique · publier exige un compte · le compte se
    // gère et se supprime.
    //
    // TEXTE tiré du cahier de Youssouf.
    text:
      "Une place de marché. Les vendeurs publient des produits avec des " +
      "photos ; le prix est facultatif, chaque vendeur le met ou non, en " +
      "francs CFA. Un vendeur peut ouvrir une boutique et y ranger ses " +
      "produits, ou publier un produit sans boutique. La boutique porte le " +
      "numéro de téléphone et le compte WhatsApp du vendeur, et tous ses " +
      "produits partagent ce contact. Les acheteurs parcourent les produits, " +
      "cherchent un produit précis, consultent la fiche d'un produit — elle " +
      "montre la description, le prix s'il existe, et permet d'appeler le " +
      "vendeur ou de lui écrire sur WhatsApp. Ils parcourent aussi les " +
      "boutiques et consultent les produits d'une boutique. Publier exige un " +
      "compte : le vendeur crée son compte, s'identifie, consulte et modifie " +
      "ses informations, et peut supprimer son compte.",
    // EP-187 — LA PREMIÈRE PRÉFÉRENCE RÉELLE, énoncée par Youssouf.
    //
    // Elle ne va PAS au brief : P0 refuse les décisions d'écran. Elle
    // s'adresse à l'ÉMISSION, qui décide ce que porte un écran.
    preferences:
      "Une grille de produits montre QUATRE produits par écran — dans ce " +
      "domaine un produit SE VOIT comme une image, donc quatre images " +
      "visibles à la fois. La recherche reste visible en haut de l'écran " +
      "d'accueil, sans avoir à défiler.",
  },
];
