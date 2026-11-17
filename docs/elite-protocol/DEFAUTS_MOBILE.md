# Famille mobile — Deribfy utilisé depuis un téléphone

**FAMILLE PRIORITAIRE (décision du propriétaire, 2026-11-17).** Le marché de Deribfy est sur téléphone : au Tchad, un commerçant ouvrira l'atelier depuis son portable, pas depuis un bureau. Le propriétaire et Youssouf testent Deribfy **sur téléphone en permanence**. Cette famille réunit les défauts de **l'interface de Deribfy** (création, atelier, tableau de bord) vue sur un écran étroit. Ce ne sont pas des défauts des applications générées : ceux-là sont numérotés D1 à D16, dans leurs propres fichiers.

| N° | Défaut | Statut | Fichier |
|---|---|---|---|
| M1 | L'écran de création abandonne alors que la génération réussit (onglet en arrière-plan sur iPhone) | documenté, non corrigé | `DEFAUT_ABANDON_ECRAN.md` |
| **M2** | **Sur téléphone, l'atelier n'affiche pas l'application** | **corrigé localement (forme a), non poussé** — aggravé le 2026-11-17 par l'ouverture automatique | ce fichier, §M2 |

---

## M2 — Sur téléphone, l'atelier n'affiche pas l'application (2026-11-17)

### Constat [OBSERVÉ, capture locale]

Atelier monté dans Chromium à **390 × 844**, avec une session factice et des routes interceptées (aucune base, aucun appel payant). La colonne de conversation occupe toute la largeur, et **aucun aperçu n'est visible**. Le constat est le même sur le code d'**avant** les commits du 2026-11-17 (capture « avant ») et sur celui d'après : le défaut est antérieur.

### Cause [LU-CODE, non mesurée au pixel]

Le corps de l'atelier est une rangée flex (`app/atelier/[id]/page.tsx:624`, `flex min-h-0 flex-1 gap-3 p-3`). Elle contient :

- la conversation : `w-full max-w-[26rem] shrink-0` (`:630`). À 390 px, elle prend toute la largeur utile et refuse de rétrécir ;
- l'aperçu : `flex-1` (`CadreApercu.tsx:57`). Il ne reçoit rien de la place restante ;
- le tout sous `main … overflow-hidden` (`:512`), qui coupe ce qui déborde.

Il n'existe aucune disposition propre au téléphone : ni empilement, ni onglets « Conversation / Aperçu ».

### Pourquoi il est AGGRAVÉ depuis le 2026-11-17

Le commit `59126371` (en ligne depuis `16103d4`) ouvre l'atelier **automatiquement** après une génération réussie.

- **Avant**, sur téléphone, l'application s'affichait dans l'écran de création lui-même (`ApercuAppareil`, sous la conversation), puis il fallait aller dans l'atelier à la main.
- **Désormais**, une génération faite sur téléphone **quitte cet aperçu** pour un atelier qui ne montre pas l'application.

Pour la personne qui teste sur téléphone, le résultat d'une génération n'est donc plus visible juste après l'avoir payée. Elle peut encore le voir par le lien publié, ou depuis un ordinateur.

### Correction — forme (a), décidée par le propriétaire (2026-11-17)

(b), « ne pas ouvrir l'atelier sur téléphone », est **écartée** : elle retirait ce que Youssouf avait demandé au lieu de le réparer.

**Ce qui est fait** (`app/atelier/[id]/page.tsx`, `CadreApercu.tsx`) :

- **Sous 1024 px**, une barre « Application / Conversation » (`role="tablist"`, `lg:hidden`), avec un seul panneau visible à la fois ;
- **à l'arrivée**, l'onglet « Application » ;
- **après une modification**, une application en attente ou un retour de version, l'écran revient sur « Application » : le résultat est dans cet onglet ;
- **la largeur de départ est « Téléphone » (390 px)** sur un écran étroit. La largeur est **dérivée** : le choix de la personne s'il existe, sinon celle de l'écran, lue par `useSyncExternalStore` sur `matchMedia('(max-width: 1023.98px)')`. Cette lecture vaut faux au rendu serveur, pour une hydratation sans écart, et suit la rotation de l'écran. Il n'y a aucun `setState` dans un effet : le cliquet `react-hooks/set-state-in-effect` a refusé cette première forme ;
- **l'aperçu est bord à bord** sous 1024 px, sans marge ni bordure : un écran de 390 px affiche 390 px sans défilement ;
- **au-dessus de 1024 px, rien ne change** : deux colonnes, conversation de 416 px.

**Mesuré dans Chromium** (serveur local, session factice, routes interceptées, aucun appel payant) :

| Largeur | Arrivée | Onglet « Conversation » |
|---|---|---|
| 390 × 844 | « Application » sélectionné ; application **390 × 633** ; défilement horizontal **0** ; débordement de page 0 ; appareil « Téléphone — 390 px » | fil 390 × 633, champ de saisie 344 × 82 ; aperçu masqué |
| 768 × 1024 | « Application » ; panneau 768 × 849, application 390 px ; défilement 0 | fil 768 × 849, champ 722 × 82 |
| 1440 × 900 | pas d'onglets ; conversation 416 × 825 et aperçu 988 × 825 côte à côte, comme avant | — |

**Cliquet :** `components/atelier/__tests__/barre-atelier.test.tsx`, test « M2 ». Il est vert ; l'atelier d'avant le fait tomber.

**Limites, dites :**

- Un téléphone de **moins de 390 px** (360 px, par exemple) défile horizontalement de la différence. La liste d'appareils est unique (EP-317 ⑤), et le cadre ne descend pas sous « Téléphone ».
- Entre 768 et 1023 px, la largeur de départ est aussi « Téléphone ». « Tablette » reste un clic.
- Un vrai iPhone n'a **pas** été essayé. Il le sera après mise en ligne, depuis l'interface.

### Ce que la correction devait respecter

- La colonne de gauche ne change pas sur ordinateur. Le propriétaire l'a demandé le 2026-11-17.
- La largeur de l'aperçu reste **réelle**, jamais une mise à l'échelle (`CadreApercu.tsx`, invariant EP-317).
- **Deux formes possibles, à arbitrer par le propriétaire :**
  - (a) sous 1024 px, deux onglets « Conversation » et « Application », l'application affichée par défaut à l'arrivée ;
  - (b) ne pas ouvrir l'atelier automatiquement sur un écran étroit.

  (b) est un repli : il retire au téléphone le gain du 2026-11-17 au lieu de réparer l'atelier.
- **La preuve devra être une capture à 390 px**, avec l'application visible. Aucun test DOM ne voit une mise en page (frontière dite dans `barre-atelier.test.tsx`).
