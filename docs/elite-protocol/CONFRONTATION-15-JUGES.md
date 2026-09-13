# CONFRONTATION #15 — CONSTITUTION ET INTENTION DES JUGES

EP-160, 2026-09-13. Passe de CONCEPTION : aucun code, aucune dépense.
Fondée sur deux observations du propriétaire. **Rien n'est unifié, rien n'est
corrigé — cette passe établit les faits.**

---

## ① LA CARTE DES BARRES D'EXIGENCE

### Ce qui existe, mesuré

**Neuf points d'entrée**, répartis en **trois régimes** de sévérité :

| Régime | Juges | Comportement |
|---|---|---|
| **Fail-closed** — s'arrête au premier | `validateAir` · `resolveLock` (6 `throw`) | lève, rien n'est produit |
| **Accumulant** — rend une liste | `validerModele` · `ecransDe` · `jugerPlanEcrans` · `jugerAcceptation` · `jugerVivacite` · `validateAirBlocks` | rend N diagnostics, l'appelant décide |
| **Observant** — ne juge pas | l'inventaire lexical de `passe0` | produit des chiffres, aucun verdict |

**174 codes de diagnostic**, en 12 familles :
`AIR_` 72 · `PRESENTATION_` 22 · `MODELE_` 21 · `BLOCK_` 21 · `EMIT_` 12 ·
`NAVIGATION_` 7 · `VIVACITE_` 6 · `DERIVATION_` 5 · `PLAN_` 4 · `SCHEMA` 3 ·
`CONFORMANCE_` 1.

### Dérivent-elles du même contrat ?

**Non, et l'écart est structurel, pas accidentel :**

- `validerModele`, `ecransDe`, `jugerPlanEcrans` jugent le **modèle métier**
  (`modele-metier/1.2.0`) — un contrat qui n'existe que dans le banc ;
- `validateAir`, `validateAirBlocks`, `resolveLock` jugent le **document AIR**
  (`1.25.0`) et le **registre de blocs** (`1.13.0`) — les contrats du produit ;
- `jugerAcceptation` est le seul à recevoir **les deux** : il compare un
  document à un prescriptif tiré du modèle ;
- `jugerVivacite` juge une **enveloppe d'exécution**, un troisième contrat.

**Quatre contrats, trois régimes.** L'écart de sévérité entre le compilateur
(un diagnostic suffit) et l'acceptation (23 tolérés) n'est donc pas un défaut
de réglage : ce sont deux juges qui ne lisent pas le même document contre le
même contrat, et qui n'ont pas la même conséquence — l'un empêche de
produire, l'autre refuse une campagne.

### Un diagnostic peut-il être bloquant ici et tolérable là ?

**Oui, et c'est mesuré sur le document servi** (run EP-156) : il **compile**
— `resolveLock` et `emitProject` le laissent passer, 85 fichiers produits —
avec **23 diagnostics d'acceptation**. Aucun de ces 23 n'est du ressort du
compilateur : ce sont des `PRESENTATION_`, `NAVIGATION_`, `AIR_BOUTON_*`.

**Délibéré ou accidentel ?** Les deux, et il faut les distinguer :
- **délibéré** — `BLOCK_PROPS_INVALID` empêche de compiler et doit le faire ;
  une application qui ne se construit pas n'est pas une application ;
- **accidentel** — rien ne dit *quels* diagnostics devraient bloquer la
  compilation. La liste n'existe nulle part ; elle est l'effet de quel juge
  se trouve appelé par quel étage.

C'est L-124-A, et la carte montre qu'elle n'est pas une question de seuil
mais de **périmètre** : chaque juge voit un document différent.

---

## ② LES JUGES ET L'INTENTION — TROIS MESURES

La question posée : *une exigence du brief, correctement captée, peut-elle
disparaître sans qu'aucun juge ne le voie ?* Trois scénarios, trois mesures
sur les documents archivés.

### Mesure A — le document perd ses actions : VU

Tous les boutons retirés du document servi (23 blocs, actions orphelines
comprises) : **20 diagnostics nouveaux** — `VIVACITE_ECRAN_INATTEIGNABLE` ×11,
`PRESENTATION_SURFACE_COMPTE_ORPHELINE` ×8, `VIVACITE_ARC_PRESCRIT_INEXECUTABLE`
×4. La disparition massive est vue.

### Mesure B — le modèle exige, le document ignore : VU

Geste `contacter` greffé au modèle, document inchangé : **3 diagnostics
nouveaux** — `NAVIGATION_ECRAN_PRESCRIT_MANQUANT`,
`NAVIGATION_ROUTE_PRESCRITE_MANQUANTE`, `VIVACITE_ARC_PRESCRIT_INEXECUTABLE`.

**Donc `jugerAcceptation` juge bien l'intention**, à une condition : que le
modèle la porte, et que le plan en tire une surface. C'est la chaîne
prescriptive posée depuis EP-115.

### Mesure C — le brief exige, le modèle ne capte pas : **LE JUGE EXISTE ET NE TOURNE PAS**

C'est le trou, et il n'est pas là où on l'attendait.

`verifierCouvertureLexicale` compare l'inventaire du brief à la couverture du
modèle et produit `MODELE_TERME_NON_JUSTIFIE` — « ni couvert, ni non-retenu,
ni porté par un nœud ». Sur le modèle du run EP-156 et son brief réel, il
rend **7 diagnostics**. Sur un brief enrichi d'une exigence de contact
(« appeler », « écrire », « WhatsApp »), il en rend **13**, dont 6 portant
précisément sur les termes ajoutés.

**Et `validerModele` rend zéro.** Parce que :

> `verifierCouvertureLexicale` n'est appelé **nulle part dans la chaîne de
> production**. Ses seuls appelants sont des tests.

`passe0` fait autre chose avec l'inventaire : il produit une **observation**
(`tailleInventaire`, `partInventaireEnNonRetenus`, `distributionRaisons`) —
des chiffres pour le journal, jamais un verdict.

**Le juge qui rend le générateur redevable du brief existe, il est écrit, il
est classé en EP-135, il est testé — et il ne s'exécute jamais.**

C'est un fait sans consommateur au niveau d'un JUGE, là où EP-141 n'a traqué
que les champs. Le cliquet d'EP-135 ne l'a pas vu : il vérifie qu'un code est
*émis dans la source*, pas que la fonction qui l'émet est *appelée*.

---

## Ce que ces mesures établissent

1. **L'intention EST jugée en aval** — dès qu'elle est au modèle et qu'elle
   produit une surface (mesure B). La confrontation #1 n'est pas menacée :
   aucun juge n'a besoin de lire le brief, le modèle suffit.
2. **Le trou est en AMONT** : entre le brief et le modèle. Le seul juge de ce
   passage ne tourne pas.
3. **Conséquence exacte, sans exagération** : une application peut être jugée
   vivante, cohérente et compilable **tout en ayant perdu une exigence dès la
   première passe** — non parce qu'aucun juge ne sait la voir, mais parce que
   celui qui sait n'est pas branché.

Le cas décrit par le propriétaire — un marché sans moyen de contact, tous les
juges verts — est donc **exact**, et sa cause est identifiée : si P0 ne capte
pas le contact, plus rien en aval ne peut le réclamer, et le seul garde-fou
prévu pour ce passage est débranché.

---

## Ce que cette passe NE fait pas

Aucun correctif, aucune architecture. Deux passes suivront, chacune la sienne :
brancher la redevabilité lexicale ; et poser ce qui, parmi 174 codes, doit
empêcher de compiler.
