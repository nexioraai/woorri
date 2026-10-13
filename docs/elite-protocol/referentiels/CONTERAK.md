# CONTERAK face au moteur — verdict mesuré du 2026-10-12 (fin de session)

> Deuxième lecture du cahier `Conterak Final .pdf`, confrontée au moteur
> **après** le travail de la journée. Chaque ligne porte sa mesure.
>
> Le PDF n'a aucun outil d'extraction sur cette machine : le texte a été
> décodé en Python pur (flux ASCII85 puis chaînes hexadécimales), 23 820
> caractères utiles. Aucune installation de logiciel.

## Ce que le moteur sait faire — mesuré, pas déduit

| Exigence du cahier | Preuve |
|---|---|
| **Barème progressif** 150 kWh à 85 F, surplus à 125 F, + 402 F fixes | **11/11 valeurs exactes** du vecteur de test que le cahier fournit lui-même : 0 → 402 F, 155 → 13 777 F, 305 → 32 527 F |
| Index nouveau − ancien | expressions du compilateur ; et une règle posée sur ce calcul **se déclenche** (corrigé ce jour — elle était silencieuse) |
| Barèmes historiques datés avec source | versions choisies par une **date de la ligne**, jamais par l'horloge |
| « Index inférieur au précédent → bloquer » | le serveur **calcule** l'écart depuis la ligne et refuse si négatif |
| Règles métier faites respecter par le serveur | 160 règles émises, refus **422 nommant la règle** — prouvé sur 3 configurations |
| Isolation stricte entre comptes | filtres de visibilité **en SQL** ; sans jeton → 403 ; avec le jeton d'un autre → invisible |
| Qui appelle | jeton signé HS256, algorithme imposé, expiration exigée, droits lus sous `app_metadata` |
| Journal non réécrivable, rien ne s'y efface | refus **409** prouvés sur serveur démarré |
| Statuts et transitions (preuve reçue → vérifiée → confirmée/rejetée) | transitions non déclarées refusées en **409** |
| Code à 4 chiffres jamais conservé en clair | champs sensibles : **0 en lecture, 0 en base, 0 à l'insertion** |
| Photos et vidéos, OCR, rappels configurables | capacités `camera`, `media_upload`, `text_recognition`, `push_notifications` |
| Références de fichier bornées aux domaines déclarés | **29 documents sur 31** contrôlés, les deux piles |
| Numéros de paiement par ville, jamais en dur | entités + rôles administrateurs |
| Images avec un nom accessible | **124 sur 124** (corrigé ce jour — c'était 0) |
| En-têtes de protection sur l'API | **31 serveurs sur 31** (corrigé ce jour — c'était 0) |
| PWA / cible web | portail `app_web` vert |

## Ce qui manque réellement — trois choses, mesurées

| Manque | Mesure | Ce que le cahier exige |
|---|---|---|
| **Génération PDF** | **0 occurrence** dans le format, les blocs et l'émis | **trois** documents : facture mensuelle, historique annuel, **dossier de contestation** |
| **Graphiques** | types de blocs disponibles : `button, detail_header, empty_state, form, header, list, prose, search_entry, spacer` — aucun graphique | « graphiques mensuels de consommation et de montants » |
| **Empreinte de fichier** | `createHash` = **0**. Le seul `sha256` est celui du HMAC qui signe les jetons — faux positif vérifié | « calculer une empreinte numérique du fichier pour repérer une modification ultérieure » |

### La quatrième est FERMÉE — 2026-10-12

**L'unicité.** Le cahier exige qu'« une référence de transaction ne puisse
être utilisée qu'une seule fois dans toute l'application, toutes villes et
tous opérateurs confondus ».

Mesuré avant : 72 champs `unique` dans 28 documents, **aucune contrainte** au
schéma émis. Mesuré après : **72 sur 72 contraints, sur LES DEUX piles**.

Pourquoi ça compte au-delà du cahier : sans contrainte en base, deux écritures
simultanées passent toutes les deux. Une vérification applicative ne protège
pas d'une course — elle lit, puis écrit, et quelqu'un d'autre écrit entre les
deux.

Deux cliquets : chaque champ `unique` conservé est contraint, et un champ
sensible n'en reçoit jamais — il n'a pas de colonne, les deux règles ne
doivent pas se contredire.

## Pourquoi je ne les ferme pas cette nuit

Les trois premiers demandent une **nouvelle capacité au registre** et un
**nouveau type de bloc** — donc une montée de version du format, l'invite
d'émission, et des portails. Le propriétaire les a explicitement mis de côté
le 2026-10-12 pour se concentrer sur les référentiels.

Le quatrième (unicité) est à portée immédiate : une contrainte `unique` dans
`schemaSql`, les deux piles, plus un cliquet. **C'est le premier geste de la
prochaine session.**

## Ce que la deuxième lecture a changé par rapport à la première

La première lecture, le même jour, trouvait **quatre** manques et classait
tout le reste « couvert ». Elle avait raison sur les manques. Mais elle
ignorait que, parmi ce qu'elle déclarait couvert, deux exigences centrales du
cahier ne l'étaient pas :

- « l'index inférieur au précédent doit bloquer » — la règle était **écrite et
  morte** : posée sur un champ calculé, elle ne se déclenchait jamais ;
- « aucun utilisateur ne peut consulter les données d'un autre » — le serveur
  rendait **toutes** les lignes.

Les deux sont corrigés et prouvés à l'exécution. C'est la mesure qui les a
trouvés, pas la relecture du cahier.
