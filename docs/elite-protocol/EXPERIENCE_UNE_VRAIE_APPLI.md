# Expérience — obtenir UNE application qui marche vraiment

- **Ouverte :** 2026-11-16, sur instruction du propriétaire. Elle passe avant tous les autres chantiers.
- **Objectif :** une seule application qui marche. Le critère n'est **pas** le juge : c'est le propriétaire qui ouvre l'application et vérifie :
  1. une dépense ajoutée apparaît dans la liste ;
  2. le total du mois se met à jour ;
  3. après fermeture et réouverture, elle est toujours là ;
  4. rien ne plante, aucun écran ne manque.
- **Demande :** le carnet de dépenses du 16 novembre (œuvre `ef085fa7`), mot pour mot.
- **Statut :** MONTAGE PRÊT ET ÉPROUVÉ À BLANC. Aucun appel payant. En attente des entrées exactes du carnet (§2) et d'une décision sur la persistance (§3).

---

## 1. Le montage [LU-CODE + ESSAI À BLANC]

- **Hors dépôt, hors Vercel.** Le script et sa configuration vivent dans le scratchpad de la session (`vraie-appli/experience.test.ts`, `vitest.experience.config.mjs`). Aucune ligne du dépôt n'est modifiée, rien n'est poussé, rien n'écrit en base.
- **La vraie boucle :** `boucleEcriture` (`boucle-directe.ts:325`), avec les vrais juges (exécution, faces, couverture, persistance, etc.), le vrai assembleur et le vrai appel DeepSeek (`appelerFournisseur`, `fournisseur.ts:230`, modèle `deepseek-v4-pro`).
- **La limite de tours est levée sans toucher au code :** `boucleEcriture` accepte `toursMax` en paramètre (`boucle-directe.ts:329`, `:371`). La route ne le passe jamais ; le montage le passe (25 par défaut). La modification est donc locale **par construction**.
- **Ce qui est mesuré, par appel :** rang, durée de l'appel au modèle **seul** (ce que la production ne mesure pas, `ENQUETE_TOURS_ET_DUREES.md` §0.3), jetons d'entrée et de sortie, troncature, pointe ou creuse, coût au tarif de l'heure (`tarifDe`, `fournisseur.ts:134`), cumul, et le motif exact renvoyé au modèle. Chaque réponse brute est conservée.
- **Le plafond de coût :** avant chaque appel, si le cumul a atteint le plafond (1 USD au départ), le montage **s'arrête et attend** un accord écrit, sans perdre le travail en cours.
- **Essai à blanc (réponse fixe, aucun réseau, 2 tours) :** il passe. Le vrai assembleur et le vrai juge ont tourné, et le juge de vivacité a renvoyé au tour 2 un vrai reproche (« DES CONTRÔLES MORTS — … `<button type="button">` »). Les 5 lignes du journal sont écrites.

## 2. Ce qu'il manque pour lancer : les entrées exactes du carnet

La boucle reçoit la demande, la configuration et les **tables déclarées** (`route.ts:575-590`). Les tables changent la consigne : avec des tables, le « bloc base » remplace la règle 6 (`boucle-directe.ts:320-323`, `entites-declarees.ts:362`). Sans les mêmes tables, ce ne serait pas la même expérience.

Elles sont dans la ligne de l'œuvre : `document.entites` et `document.configuration` (`route.ts:846-872`). **Réserve :** `document.entites` est la liste **après** la boucle (`route.ts:655`). Elle peut contenir des tables que le modèle a déclarées en cours de route, en plus de celles qu'il a reçues. C'est la meilleure approximation stockée des entrées.

## 3. Ce que l'aperçu local ne peut pas prouver : la persistance [LU-CODE]

Une application à tables lit et écrit dans une vraie base Supabase (`entites-declarees.ts:375-378`). Sans adresse de base, en aperçu, elle tourne « ENTIÈREMENT en mémoire » par consigne (`:367-370`), et une donnée saisie disparaît à la fermeture. Le critère 3 exige donc une base. Décision du propriétaire en attente.

## 4. Coût : l'historique grandit à chaque tour [LU-CODE]

Chaque tour renvoie au modèle la demande, **toutes** ses réponses précédentes (chacune contient l'application entière) et tous les motifs (`boucle-directe.ts:381-383`, `:736-737`). Les jetons d'entrée, et donc le coût d'un tour, augmentent à chaque tour. L'estimation de 0,06 USD par tour vaut pour les premiers tours, pas pour le 15ᵉ. Le journal mesurera la croissance réelle.

## 5. Journal des tours

*(vide — aucun appel payant)*

## 6. Leviers essayés

| # | Levier | Pourquoi | Effet mesuré |
|---|---|---|---|
| 0 | Limite de tours levée (`toursMax` = 25) | les tours corrigent : 9 œuvres refusées au tour 1 ont été acceptées sans reproche au tour 2 (T3, `ENQUETE_TOURS_ET_DUREES.md`) | — |
