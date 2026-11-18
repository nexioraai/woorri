# La retouche d'une application publiée — rapport (2026-11-18)

**Périmètre.** Ce rapport établit des causes ; il ne corrige rien.

**Application étudiée.** « Gestion de pharmacie » (`70ba03e1-844a-4575-9562-5e23d88ad5ec`, pharma.deribfy.app). Elle porte des données réelles saisies à la main : 3 clients, 4 produits, 2 ventes, 3 lignes, 26 000 FCFA.

**Les essais.** Six retouches ont été tapées dans l'atelier par le propriétaire et Youssouf. L'application est **laissée cassée exprès** : je n'ai fait aucun retour en arrière.

**Méthode.** Tout ce qui suit est en lecture seule :

- les versions et le document lus en base avec la clé de service ;
- la table lue par `psql` en `begin transaction read only` ;
- des appels à l'API **sans session**, qui ne peuvent rien écrire ;
- le vrai validateur exécuté dans un test temporaire, retiré aussitôt ;
- les métriques Vercel.

## Le compte, par famille

| Famille | Essai | Résultat | Coût |
|---|---|---|---|
| Déplacer | « mets le bloc Stock bas tout en haut » | ✓ v2, bloc déplacé, données intactes | 0,0146 $ |
| Ajouter un élément | « bouton Appeler à côté de chaque client » | ✓ v3, bouton présent, Modifier et Retirer intacts | 0,0174 $ |
| Ajouter un élément | « l'emplacement du produit dans le rayon » | ✗ **annoncé réussi (v4), mais l'ajout ET la modification d'un produit sont cassés**, plus des changements non demandés | 0,0177 $ |
| Ajouter un élément | « bouton Photographier sur chaque produit » | ✗ refus : réponse coupée | 0,029 $ |
| Ajouter un écran | « page Fournisseurs (nom, téléphone) » | ✗ refus, motif **INCONNU** (réponse non coupée) | 0,023 $ |
| Apparence | « mets les boutons en vert » | ✗ refus : réponse coupée | 0,028 $ |

**Taux, sur 6 essais :**

- **2 réussites propres sur 6** ;
- 1 réussite **annoncée** qui a cassé une fonction ;
- 3 refus.

Par famille : déplacer 1/1 ; ajouter un élément 1/3 ; ajouter un écran 0/1 ; apparence 0/1.

C'est un petit échantillon, d'un seul point par famille sauf une. Il désigne les causes, il ne mesure pas une fréquence.

**Cohérence avec la base** :

- les versions 2, 3 et 4 existent, aux coûts relevés (`app_generation_versions`) ;
- Vercel compte, depuis le 2026-11-18, **3 POST en 200 et 3 en 409** sur `/api/generateur/retoucher`.

## A. Pourquoi l'ajout d'un produit échoue depuis la version 4 — CAUSE ÉTABLIE

**La chaîne, maillon par maillon :**

1. **Le code de la v4 envoie toujours un champ `emplacement`**, même vide, à l'ajout comme à la modification. Il est dans l'objet `donnees` (`composants/Pharmacie.tsx:902-908`), repris par `.insert(donnees)` (`:929`) et `.update(donnees)` (`:910-913`).
2. **La table `produit` n'a pas de colonne `emplacement`.** Colonnes réelles (psql, lecture seule) : `id`, `nom`, `categorie`, `prix`, `quantite_stock`.
3. **La déclaration de données ne l'a pas non plus.** L'entité `produit` du document courant a `nom`, `categorie`, `prix` et `quantite_stock`. Aucune migration n'avait donc rien à ajouter.
4. **Preuve sur l'API réelle, sans écriture possible** (clé publiable, sans session) :

   | Envoi | Réponse |
   |---|---|
   | `POST produit` **avec** `emplacement` | **`PGRST204`** « Could not find the 'emplacement' column of 'produit' in the schema cache » (HTTP 400). Le refus tombe avant toute question de droits, comme pour un utilisateur connecté |
   | Témoin : le même **sans** `emplacement` | il passe ce point et s'arrête aux droits (`42501`, normal sans session) |
   | `PATCH produit` avec `emplacement` | **`PGRST204`** aussi : **la modification d'un produit est cassée elle aussi**, ce que les essais n'avaient pas encore montré |

   L'écran traduit cette erreur en « Impossible d'ajouter ce produit » (`:930-931`) et « Impossible de modifier ce produit » (`:914-916`).

**Pourquoi la déclaration n'a pas suivi — DÉFAUT STRUCTUREL CONFIRMÉ :**

- Une retouche ne déclare une donnée nouvelle **que** par un fichier `DONNEES.json` rendu par le modèle (`retoucher/route.ts:452-470`).
- Ce fichier est validé **brut** par le contrat de données (`entites-declarees.ts:619`, schémas stricts `air.ts:606-611` et `1008-1010`). Ce contrat exige un `id` (`ent_…`, `fld_…`) et `required` pour **chaque** champ.
- **La consigne montre au modèle un exemple que ce contrat refuse** (`retouche.ts`, `CONSIGNE_RETOUCHE` : `[{"name":"chose","fields":[{"name":"champ","type":"text"}]}]`).
- **Le bloc des données existantes ne montre jamais `required`** (`retouche.ts`, `blocDeclaration`).
- Exécuté sur le vrai validateur (`lireEntites` + `projectAirSchema`) :

  | Ce qui est passé au validateur | Acceptées | Refus |
  |---|---|---|
  | l'exemple de la consigne | 0 | « forme refusée par le contrat de données » |
  | `produit` + `emplacement` écrit comme l'exemple | 0 | **la table entière** refusée |
  | **une recopie fidèle du bloc montré au modèle** (sans `required`) | **0** | refusée |
  | `produit` + `emplacement` avec `id` et `required` | 1 | — |
  | témoin : `produit` tel quel | 1 | — |

- **Ce refus est silencieux.** La route ne lit ni `declaration.refus` ni `fusion.pertes` : aucune occurrence dans `retoucher/route.ts`. Un JSON illisible est aussi rendu comme « aucune entité » (`declaration-en-route.ts`, `lireDeclarationEnRoute`).
- **Conséquence :** le plan de migration est vide, donc rien ne change en base et **aucune confirmation n'est demandée**. Cela explique aussi le défaut ⑩.

**Ce qui reste INCONNU.** Ce que le modèle a réellement rendu pour cette retouche : la réponse brute n'est pas conservée.

- Vous avez vu « 2 fichiers ». Un seul fichier livré diffère entre v3 et v4 (`diff -rq`). Le second était donc très probablement `DONNEES.json`, retiré des fichiers livrés. C'est déduit, pas observé.
- Les deux possibilités, « déclaration rendue puis refusée en silence » ou « aucune déclaration rendue », mènent au même résultat. **Les deux chemins sont silencieux, et le premier est garanti par la forme de ce qu'on montre au modèle.**

**Pourquoi aucun juge ne l'a vu — CONFIRMÉ :**

- **Le juge de persistance** vérifie qu'une **table** déclarée est lue et écrite (`juge-persistance.ts`). Il ne regarde pas les **colonnes**.
- **Le juge d'exécution** monte l'application **sans base**. Aucun ajout réel n'est jamais tenté, donc une erreur `PGRST204` n'a aucune chance d'apparaître.
- **Aucun juge ne compare les champs écrits par le code aux colonnes déclarées.**

## B. Le « plafond de fichiers » — IL N'EXISTE PAS ; c'est un plafond de SORTIE

- Le message « Cette modification touche trop de fichiers à la fois » (`retoucher/route.ts:421-433`) s'affiche quand **la réponse du modèle est coupée** (`stop_reason === 'max_tokens'`, `:392`). Il ne compte aucun fichier.
- **La limite est `SORTIE_MAX_RETOUCHE = 16 000` jetons de sortie** (`retoucher/route.ts:102`). La route l'estime à environ 45 800 octets de code au plus (2,86 octets par jeton, mesuré le 2026-11-04, `:416-420`).
- **La consigne exige des fichiers rendus EN ENTIER** (« contenu COMPLET du fichier »). Or la pharmacie a :
  - `composants/Pharmacie.tsx` : **47 483 octets** ;
  - `systeme/ui.tsx` : **48 980 octets**.
- **Réécrire le seul fichier métier frôle déjà la limite.** Les trois retouches réussies ne touchaient que lui, et sont passées de justesse.
- **« Mets les boutons en vert » passe par `ui.tsx` : à ces tailles, elle ne peut jamais tenir.**
- **Signature des coûts.** Une réponse coupée coûte environ 32 000 jetons d'entrée × 0,30 $ + 16 000 de sortie × 1,20 $, soit environ 0,029 $ (DeepSeek, modèle léger, tarif de pointe ; retouches vers 01:30 UTC). C'est exactement les refus 1 (0,028 $) et 6 (0,029 $).
- ~~Le refus 4 (0,023 $) n'est pas une coupure~~ **CORRIGÉ le 2026-11-18 : c'ÉTAIT une coupure.** Le propriétaire a relevé le message mot pour mot. Or ce message n'existe qu'**à un seul endroit**, la branche `max_tokens` (`retoucher/route.ts:425`, seule occurrence dans `src`). Ma déduction par le coût était fausse : le coût affiché n'est pas une facture (§E), et un même plafond de sortie peut coûter 0,023 $ ou 0,029 $ selon les jetons d'entrée comptés.
- **Le moteur promet ce que la sortie interdit.** La consigne dit « TU PEUX CHANGER LA LOGIQUE ET AJOUTER DES ÉCRANS » (`retouche.ts`). Avec des fichiers de cette taille à réécrire en entier, l'ajout d'un écran dépasse presque toujours la sortie.
- Et un écran qui demande une table nouvelle (Fournisseurs) heurterait de toute façon le défaut A : sa déclaration serait refusée en silence.
- **Observation :** « Photographier » est aussi exclu par une règle de génération : « AUCUN FICHIER : ni téléversement, ni PDF, ni image envoyée » (`entites-declarees.ts:353`). La retouche ne le dit pas : elle a été coupée avant.

## C. Les changements non demandés — CONFIRMÉ

v3 → v4 : **195 lignes changées** dans `Pharmacie.tsx` pour une demande d'**un** champ. En plus de `emplacement`, sans demande :

- une recherche « Retrouver un produit dans le rayon » ;
- un **tri** de la liste par emplacement puis par nom (la v3 n'en avait pas), **d'où l'ordre changé** ;
- au tableau de bord, un indicateur « Produits sans emplacement » et un graphique « Produits par emplacement » ;
- une colonne d'emplacement dans « Stock bas » ;
- les textes de présentation réécrits.

**Pourquoi rien ne l'a arrêté :**

- les juges comparent des **nombres de défauts** avant et après (`comparerJuges`), et une fonction en plus n'en ajoute aucun ;
- la consigne borne les fichiers rendus (« SEULEMENT ceux que tu modifies »), **pas ce qui change dans un fichier** ;
- aucun juge ne mesure l'écart entre la demande et le changement.

## Les dix défauts consignés (non corrigés)

| N° | Défaut | Ce qui est établi | Où |
|---|---|---|---|
| ① | L'aperçu « Bureau 1280 px » déborde à droite | Voulu à ce jour : la largeur est réelle et la piste défile, sans mise à l'échelle (invariant EP-317). Mesuré le 2026-11-17 : 318 px de défilement à 1440 px. **Tension** entre cet invariant et le souhait d'un aperçu qui se réduit | `CadreApercu.tsx` ; `ep317-atelier.test.ts` ② |
| ② | Un bouton « + null » | **Bibliothèque de Deribfy** : `'+ ' + action` est affiché dès que `action !== undefined`, et un `null` passe | `bibliotheque-ui.ts:547` |
| ③ | La génération ouvre sur une vitrine | Voulu par le générateur : la racine est la page publique, la gestion est sous `#gestion` (choix documenté, comparé à Ghost/Shopify/Webflow). **Tension** avec l'attente du propriétaire | `entites-declarees.ts:320-346` ; `Pharmacie.tsx:179-180` |
| ④ | « Retour à l'accueil » sur l'accueil | Lien écrit par le modèle au-dessus de toutes les sections, accueil compris | `Pharmacie.tsx:229-231` |
| ⑤ | Le total d'une vente est saisi à la main | Champ libre `total`, enregistré tel quel, sans calcul depuis `ligne_vente` | `Pharmacie.tsx:1072, 1103, 1177` |
| ⑥ | Des badges « 0 » à Accueil et Réglages | Le modèle pose `nombre: 0` sur ces deux sections, et la bibliothèque affiche tout nombre, 0 compris | `Pharmacie.tsx:193, 198` ; `bibliotheque-ui.ts` (`compteur`, `ui.tsx:353` livré) |
| ⑦ | « Ajouter » partout | Libellé générique dans les 4 formulaires | `Pharmacie.tsx:821, 1004, 1181, 1386` |
| ⑧ | « ? » à la place du client dans Ventes récentes | Les ventes brutes (`client`, `date`, `total`) sont passées à `ListeRecente`, déguisées par `as` en `{ titre, detail… }`. `titre` est vide, et l'initiale devient `(e.titre \|\| '?')`. Aucun juge ne voit un `as` | `Pharmacie.tsx:559-565, 691-696` ; `bibliotheque-ui.ts:926` |
| ⑨ | Rien n'indique la progression d'une retouche | L'écran annonce « une vingtaine de secondes » puis se tait. **Mesuré** depuis le 2026-11-18 : **52,6 s** en moyenne pour une réussite, **70,0 s** pour un refus | `atelier/[id]/page.tsx:357` ; `vercel metrics` |
| ⑩ | Aucune confirmation avant d'ajouter une colonne | **Prémisse à corriger : aucune colonne n'a été ajoutée en base** (mesuré). La confirmation n'est demandée que si le plan de migration change. La déclaration étant refusée en silence (A), le plan était vide | A ; `retoucher/route.ts:470-474, 556-600` |

## Défauts ⑪ à ⑬ — « Retirer » (2026-11-18, consignés, non corrigés)

**Ce n'est pas une régression du transfert de propriété.** Mesuré en lecture seule après le transfert : `authenticated` garde le droit de supprimer (`arwd`) sur la table `vente` de pharma. La politique de sécurité laisse voir la vente « oko test » au compte de pharma. Les seules tables sans droit de suppression sont les 3 journaux (`transaction`, `releve`, `mouvement_stock`), et c'est voulu.

**Cause, mesurée.** Les applications publiées sont servies avec `Content-Security-Policy: … sandbox allow-scripts allow-same-origin` (`publication.ts:223`, `cspSousDomaine`), sans `allow-modals`. Depuis le 2026-11-05 (`54b0d4b9`), le navigateur ignore donc `confirm()` : il rend `false` sans rien afficher. Mesuré dans Chromium et WebKit : sans `allow-modals`, `confirm=false` et aucune boîte ; avec, `confirm=true` et une boîte. Chaque « Retirer » de pharma commence par `window.confirm(…)` : il s'arrête avant même la base. Aucune suppression de pharma n'a jamais pu passer sur son adresse publique.

**Portée.** Toute appli publiée dont le code appelle `confirm()`, `alert()` ou `prompt()` :
- 17 documents sur 58 dans le corpus en appellent un ;
- pharma : 4 appels, un par liste ;
- atita : 0 appel.

| # | Défaut | Où |
|---|---|---|
| ⑪ | « Retirer » échoue sans aucun message. Chez pharma, la boîte de confirmation est bloquée en silence. Et si une suppression échoue, `if (error) return;` se tait aussi | `publication.ts:223` ; `Pharmacie.tsx` (chaque `retirer`) |
| ⑫ | Les applis générées ne donnent aucun retour d'action : ni confirmation, ni transition, rien qui dise que le geste a été pris en compte. Un bouton qui ne dit rien est un bouton cassé, même quand il fonctionne (mot du propriétaire) | consigne de génération ; bibliothèque `systeme/ui` |
| ⑬ | atita supprime **sans confirmation** et **ignore l'échec**. `await base.from(…).delete()` ne lit pas l'erreur, puis la ligne est retirée de l'écran dans tous les cas : si la base refuse, l'écran ment | code servi par atita.deribfy.app (5 suppressions) |

## Second tir sur pharma (2026-11-18) — cas 3 et cas 5 passent

Mesuré par le propriétaire dans l'appli publiée, et dans la trace (`app_generation_attempts`, nature `retouche`) :

| Cas | Version | Coût | Sortie | Résultat |
|---|---|---|---|---|
| 3 « emplacement du produit » | 6 | 0,014 $ | 15 568 jetons | colonne créée, chiffres vrais (« 4 avant, 4 après »), l'ajout de produit refonctionne |
| 5 « page Fournisseurs » | 7 | 0,016 $ | **18 518 jetons** | table créée, page, menu, état vide. Sous l'ancien plafond (16 000), cette réponse aurait été coupée |

Bilan des six demandes : 4 passent ; « Photographier » est à retester ; « boutons en vert » attend la surcharge de thème.

## Défauts ⑭ à ⑯ (2026-11-18, consignés, non corrigés)

| # | Défaut | Où |
|---|---|---|
| ⑭ | La confirmation de migration montre les noms techniques au commerçant (« vos 3 ligne_ventes ») et enchaîne « et… et… et… » au lieu de virgules | `phrase-migration.ts` (`phraseAvantMigration`, `combien`) |
| ⑮ | **Premier RETRAIT non demandé** : la retouche de l'emplacement a remplacé la tuile « Produits en stock bas — 1 » par « Rayon non précisé — 4 ». Un commerçant perd un chiffre qu'il surveillait, sans être prévenu. Une retouche ne doit jamais retirer un élément existant sans le dire. Rangé avec ⑫ et le juge | juges de la retouche (aucun ne compare les éléments affichés avant/après) |
| ⑯ | La trace d'une retouche mise de côté reste `en_attente` pour toujours : l'accord (« Appliquer ? ») n'appelle pas le modèle et n'écrit rien. Ni la réussite (versions 6 et 7), ni l'échec du premier essai du cas 3 (« must be owner », version 5) ne sont tracés | `retoucher/route.ts` (`appliquerEnAttente`) |

## ⑮ et ⑯ confirmés (2026-11-18, propriétaire)

- **⑮ deux fois de suite.** La quatrième tuile du tableau de bord de pharma est remplacée à chaque retouche qui touche les produits : « Produits en stock bas — 1 » → « Rayon non précisé — 4 » (emplacement) → « Produits sans fournisseur — 5 » (fournisseur). Le modèle traite cette place comme libre. Ajouter sans qu'on demande agace ; **retirer sans qu'on demande fait perdre de l'information**. C'est le défaut le plus coûteux de la série. Rangé avec ⑫ et le juge (une retouche ne retire jamais un élément existant sans le dire).
- **⑯** : les versions 8 et 9 portent encore « EN ATTENTE DE VOTRE ACCORD » alors qu'elles sont appliquées et servies. Ni l'étiquette de la version, ni la trace ne sont réécrites à l'accord.

## Défaut ⑰ (2026-11-18, consigné, non corrigé)

| # | Défaut | Où |
|---|---|---|
| ⑰ | Trois couleurs que la bibliothèque **propose déjà** sont sous le seuil de lisibilité WCAG AA (4,5:1) avec le texte blanc des boutons : vert `#1f8a5b` (4,33), corail `#d2603a` (3,84), et la couleur du style chaleureux `#c8552f` (4,38). Mesuré. La surcharge de thème les refuse ; la palette de Réglages et le style chaleureux les emploient encore | `bibliotheque-ui.ts` (`COULEURS`, `html:root[data-style="chaleureux"]`) |

## Observations de passage

- **Une retouche refusée ou ratée ne laisse aucune trace dans Deribfy** : la route n'écrit ni alerte ni journal. Seul Vercel garde le code de réponse. Le motif n'existe qu'à l'écran de la personne.
- **L'encadré de l'atelier après un refus** dit encore « la retouche ne change que des textes, des couleurs et des champs déjà là ». La consigne du modèle dit le contraire (`atelier/[id]/page.tsx`, bloc `aRegenerer`).

## Classement

| Rang | Défauts |
|---|---|
| **P0** (casse une fonction qui marchait, en silence) | A : déclaration refusée en silence + aucun juge des colonnes écrites ; ⑩ qui en découle |
| **P1** | B : message faux et limite de sortie incompatible avec des fichiers de 47–49 Ko réécrits en entier ; C : changements non demandés ; ⑧ ; ② ; ⑤ |
| **P2** | ⑨ ; ⑥ ; ④ ; ⑦ ; et les deux tensions de conception ① et ③, qui demandent une décision et non une correction |


## Suite du 2026-11-18

### Le message unique : une seule cause, mais mal nommée et mal conseillée

Il n'y a pas deux causes sous un même message : il n'y a que la coupure. Mais le message dit « trop de fichiers », alors que la cause est la **taille de la sortie**. Et son conseil, « découpez-la en deux demandes », est **impossible à suivre** quand une seule demande exige de réécrire un fichier de 49 Ko : « mets les boutons en vert » ne se découpe pas.

### B — les trois voies, chiffrées (estimations de travail, non mesurées)

**Ce que la mesure a ajouté :**

- **La même demande** « mets les boutons en vert » **a réussi le 2026-11-02 pour 0,0025 $**, sur une application de 16 fichiers et 73 Ko dont le plus gros faisait 13,6 Ko (`fa0ede2c`, version 7).
- **La bibliothèque `systeme/ui.tsx`, injectée par Deribfy, pesait 6 868 octets le 2026-11-02, et 48 980 aujourd'hui** (× 7,1).
- **Les couleurs ne sont dans aucun fichier de l'application.** Ce sont des variables CSS déclarées par la page de Deribfy (`systeme/jetons.ts` : « déclarées dans la page elle-même »). Pour changer la couleur des boutons, le modèle n'a donc d'autre prise que de réécrire la bibliothèque (49 Ko).
- **Les fichiers `systeme/` sont marqués « fournis par Deribfy, ne pas modifier », mais ils sont envoyés en entier au modèle, et réécrivables.** La route ne s'en sert que pour les juges (`retoucher/route.ts:141`). Ils font **56 %** de ce qu'on envoie à chaque retouche de la pharmacie : 59 364 octets sur 106 485.
- **La vitesse mesurée :** une coupure à 16 000 jetons prend 70,0 s en moyenne (environ 230 jetons/s). La route a `maxDuration = 300` s (`retoucher/route.ts:99`).

| Voie | Ce qu'elle règle | Ce qu'elle ne règle pas | Coût en travail |
|---|---|---|---|
| **1. Augmenter la limite** (16 000 → 64 000 jetons ; DeepSeek annonce « MAXIMUM: 384K » en sortie, sans dire pour quel modèle) | Les demandes juste au-dessus du seuil | **La latence** : 64 000 jetons ≈ 4,6 min au débit mesuré, contre 300 s de délai (**risque de coupure par la plateforme**). Une coupure coûterait jusqu'à environ 0,087 $ au lieu de 0,029 $. Les réécritures complètes de fichiers de 49 Ko amplifient C | 0,5 j |
| **2. Modifications partielles** : le modèle rend des blocs « AVANT / APRÈS », que Deribfy applique à l'exact | Sortie de quelques centaines de jetons, donc **la retouche passe à toute taille**, plus vite et moins cher. **Ce qui change est borné aux lignes touchées** (C devient mesurable). Le refus est honnête si un bloc « AVANT » ne se trouve pas | Il faut un format robuste aux blancs, et une mesure payante sur de vraies applications pour connaître le taux de blocs introuvables | **2 à 3 j**, dont une mesure d'environ 20 retouches (≤ 0,60 $) |
| **3. Découper les fichiers** (côté générateur, et la bibliothèque en modules) | Des fichiers plus petits à réécrire | Seulement les applications **nouvelles** : la pharmacie et atita restent telles quelles. Le coût d'entrée ne baisse pas. Les fichiers regrossissent avec l'usage | 3 à 5 j, plus des générations d'essai payantes |
| **Pour Dary : surcharger le thème** | L'apparence (couleurs, rayons, tailles) se retouche par une **surcharge des variables CSS** de la page. Quelques dizaines de jetons, sans toucher au code | Ce n'est pas une retouche générale | 1 à 1,5 j |
| **Partout : fermer `systeme/` à la retouche** | Le modèle ne réécrit plus la bibliothèque, et l'entrée diminue d'environ la moitié sur la pharmacie (56 % du corpus) | — | 0,5 j, cumulable |

**Recommandation (à arbitrer) :**

- **la voie 2** comme vraie correction ;
- **précédée, pour Dary, de la surcharge de thème et de la fermeture de `systeme/`.**

Total estimé : environ **4 à 5 jours**, compatible avec les cinq semaines avant Dary. La voie 1 seule ne passe pas le délai de 300 s.

### D — l'économie des refus (mesuré)

- **Réussites** : 0,0146 $, 0,0174 $ et 0,0177 $ (base, `app_generation_versions`).
- **Refus** : 0,028 $, 0,023 $ et 0,029 $ (écran).
- **Total des 6 : 0,1297 $** ; la génération a coûté 0,1358 $.

**Mécanisme :**

- Une coupure paie **toute** la sortie autorisée (16 000 jetons × 1,20 $ = 0,0192 $ en pointe), puis la jette.
- Une réussite sort environ 4 000 à 6 500 jetons.
- Les essais ont eu lieu entre 01:31 et 01:43 UTC un mardi : **heure de pointe** officielle.

**Le chiffre de 0,003 $ n'est pas faux comme mesure, mais il n'est plus représentatif.** Il vient de deux retouches du 2026-11-02 à 11:09 UTC (**hors pointe**, donc moitié prix) sur une application de 73 Ko aux petits fichiers, avec une bibliothèque sept fois plus petite. Sur une application de 100 Ko en pointe, une réussite coûte **0,015 à 0,018 $** (environ la moitié hors pointe), et un refus **0,023 à 0,029 $**.

### E — le chiffre affiché est-il réel ?

**Ce qu'il est (lu dans le code) :** une **estimation**, pas une facture.

- Il vaut `usage.input_tokens × prix + usage.output_tokens × prix`, avec les jetons **rendus par DeepSeek** dans la réponse et les prix d'un **tableau du dépôt**.
- Pointe ou creuse est choisi selon l'heure UTC de l'appel (`retoucher/route.ts:396-397` ; `fournisseur.ts:186-197`, `estPointe`).

**Ce qui est vérifié (page officielle de DeepSeek, lue le 2026-11-18)** :

- les prix de `deepseek-flash` sont exacts : 0,30 / 1,20 $ en pointe, la moitié hors pointe, entrée en cache à 0,006 / 0,003 $ ;
- les heures de pointe sont exactes : 01:00–04:00 et 06:00–10:00 UTC, du lundi au vendredi ;
- **une seule réserve** : DeepSeek exclut aussi les jours fériés chinois, que le dépôt ignore. Ces jours-là, le chiffre affiché est **deux fois trop haut**.

**Ce qui est INCONNU :**

- Si `input_tokens` compte ou non les jetons servis **depuis le cache** (facturés 50 fois moins cher). La formule ne fait pas la différence.
- L'écart entre les refus 1 et 4 (même sortie coupée, 0,029 $ contre 0,023 $) suggère environ 32 700 contre 12 700 jetons d'entrée comptés pour le même corpus. C'est compatible avec un cache exclu du compte, mais **c'est déduit, pas mesuré** : la réponse brute de DeepSeek n'est pas conservée.

**Le rapprochement avec la facture ne peut pas se faire depuis le dépôt :**

- Le solde DeepSeek se lit (**17,90 $** le 2026-11-18 à 02:06 UTC, `GET /user/balance`), mais pas la consommation par jour.
- **Deribfy n'enregistre pas toute sa propre dépense.** Pour le 2026-11-18, il a 1 génération (0,1358 $) et 3 retouches réussies (0,0497 $). **Les 3 retouches refusées (0,080 $) n'existent nulle part**, ni les appels de lecture du cahier et de pré-vol (`ai_usage_log` : 0 ligne).

**Pour fermer l'INCONNU**, il faut un geste du propriétaire : l'export de consommation DeepSeek du 2026-11-18, par modèle (platform.deepseek.com → Usage). Il se compare à ce que l'écran a affiché :

- `deepseek-flash` : 6 retouches à 0,1297 $, plus la lecture du cahier ;
- `deepseek-v4-pro` : la génération à 0,1358 $.

Tant que les refus ne sont pas enregistrés, ce rapprochement restera partiel.
