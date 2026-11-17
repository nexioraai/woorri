# Famille mobile — Deribfy utilisé depuis un téléphone

Le propriétaire et Youssouf testent Deribfy **sur téléphone en permanence**. Cette famille réunit les défauts de **l'interface de Deribfy** (création, atelier, tableau de bord) vue sur un écran étroit. Ce ne sont pas des défauts des applications générées : ceux-là sont numérotés D1 à D16, dans leurs propres fichiers.

| N° | Défaut | Statut | Fichier |
|---|---|---|---|
| M1 | L'écran de création abandonne alors que la génération réussit (onglet en arrière-plan sur iPhone) | documenté, non corrigé | `DEFAUT_ABANDON_ECRAN.md` |
| **M2** | **Sur téléphone, l'atelier n'affiche pas l'application** | **documenté, non corrigé — AGGRAVÉ le 2026-11-17** | ce fichier, §M2 |

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

### Ce que la correction devra respecter (rien n'est fait)

- La colonne de gauche ne change pas sur ordinateur. Le propriétaire l'a demandé le 2026-11-17.
- La largeur de l'aperçu reste **réelle**, jamais une mise à l'échelle (`CadreApercu.tsx`, invariant EP-317).
- **Deux formes possibles, à arbitrer par le propriétaire :**
  - (a) sous 1024 px, deux onglets « Conversation » et « Application », l'application affichée par défaut à l'arrivée ;
  - (b) ne pas ouvrir l'atelier automatiquement sur un écran étroit.

  (b) est un repli : il retire au téléphone le gain du 2026-11-17 au lieu de réparer l'atelier.
- **La preuve devra être une capture à 390 px**, avec l'application visible. Aucun test DOM ne voit une mise en page (frontière dite dans `barre-atelier.test.tsx`).
