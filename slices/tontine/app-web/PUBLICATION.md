# Mettre « Tontine.SY » en ligne

Votre application web est générée. Elle produit des fichiers STATIQUES :
n'importe quel hébergement sait les servir, aucun serveur à maintenir.

## Les trois commandes

```sh
npm ci           # une fois — installe EXACTEMENT les versions du verrou
npm run dev      # pour voir l'application sur votre machine
npm run build    # produit le dossier `dist/` — c'est lui qu'on héberge
```

Déposez le contenu de `dist/` chez votre hébergeur. L'application
fonctionne servie depuis un sous-dossier : aucun chemin n'est absolu.

## Pourquoi `npm ci` et non `npm install`

Ce projet porte un `package-lock.json`. `npm ci` installe EXACTEMENT les
versions qui y sont inscrites — celles avec lesquelles le build a été
vérifié. `npm install`, lui, RÉSOUT les versions au moment où vous le
lancez : dans six mois il pourrait prendre une dépendance plus récente et
casser votre build, sans que rien de votre côté ait changé.

## Ce qu'il reste à faire, et que personne ne peut faire à votre place

- **HTTPS est obligatoire.** Sans lui, le navigateur refuse l'installation
  sur l'écran d'accueil, et l'application reste une page web ordinaire.
  Une seule exception : `localhost`, pour que vous puissiez essayer.
- **Votre icône.** Celle qui est fournie (`icone.svg`) porte l'initiale de
  l'application sur une couleur dérivée de son nom. Elle est VALIDE et
  suffit à l'installation — remplacez-la quand vous aurez la vôtre, sans
  rien changer d'autre : le manifeste la désigne par son nom de fichier.
- **Les iPhone et iPad d'avant iOS 17** ne lisent pas le SVG comme icône
  d'écran d'accueil : ils affichent une capture à la place. Si cela compte
  pour vous, déposez un `icone-180.png` et ajoutez dans `index.html` :
  `<link rel="apple-touch-icon" href="./icone-180.png" />`.

## Installer l'application sur un appareil

Il n'y a ni App Store ni Play Store à passer, et aucun compte développeur.
Une fois le dossier `dist/` déposé chez un hébergeur en HTTPS, ouvrez son
adresse sur l'appareil :

- **iPhone, iPad** — Safari, bouton Partager, « Sur l'écran d'accueil ».
- **Mac** — Safari : Fichier, « Ajouter au Dock ». Chrome : l'icône
  d'installation apparaît au bout de la barre d'adresse.
- **Android, Samsung, Huawei** — le navigateur propose « Installer »
  de lui-même. Sinon : menu, « Ajouter à l'écran d'accueil ».

L'application s'ouvre alors en plein écran, sans barre d'adresse, et garde
sa dernière version consultable même sans réseau.
- **Une politique de confidentialité.** Cette application collecte : identifiers, financial_info, usage_data.
  Sur le web, aucun magasin ne vous la réclamera — la loi, elle, si.

## Ce que la version web ne fait pas

- **Pas de fonctionnement hors ligne.** Aucun service worker n'est généré :
  en poser un sans stratégie de cache servirait une version périmée de
  l'application sans jamais dire laquelle.
- **Pas de notifications poussées.**
- **Les signes (icônes) ne s'affichent pas.** La police du vocabulaire
  fermé est embarquée côté natif ; côté web, elle n'est pas encore livrée.
  Les libellés, eux, sont intacts.
