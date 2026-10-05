# Contrat d'API — « Tontine »

> Dérivé du document AIR `prj_tontine_cameroun`, contrat 1.30.0.
> Ne pas éditer à la main : régénérer par `npx tsx slices/tontine/contrat-api.mjs`.

Ce document dit ce que **le serveur** doit faire. Il ne dit rien de son
langage ni de sa base : l'application parle HTTP et JSON, et rien d'autre.

Toutes les URL sont relatives à la racine de votre serveur. Le domaine
`api.exemple.tontine` ci-dessous est un EXEMPLE — le vrai sera celui que le document
déclarera comme source de ses données.

## 1. Les données — une ressource par entité, trois méthodes

L'application lit, crée et supprime des lignes. Le protocole est le même
pour chaque entité, et il n'a qu'une ressource : la **collection**.

| méthode | chemin | ce que le serveur fait |
| --- | --- | --- |
| `GET` | `/air/v1/entities/{entityId}/rows` | rend **le tableau JSON** des lignes : `[{ "id": "…", "values": { … } }]` |
| `POST` | `/air/v1/entities/{entityId}/rows` | crée la ligne, ou **remplace** celle dont l'`id` est fourni dans le corps |
| `DELETE` | `/air/v1/entities/{entityId}/rows/{id}` | supprime la ligne |

`POST` et non `PUT` : à la création, le client ne connaît pas encore l'URL
de la ligne — c'est le serveur qui décide de l'identifiant.

`{id}` est un gabarit. L'application **encode** l'identifiant dans l'URL
(`percent-encoding`) : un identifiant qui contiendrait `/` ou `?` viserait
sinon une autre ressource — ou la collection entière, selon le serveur.

Les 4 entités de cette application :

### `ent_utilisateurs`

- lecture : `GET https://api.exemple.tontine/air/v1/entities/ent_utilisateurs/rows`
- écriture : `POST https://api.exemple.tontine/air/v1/entities/ent_utilisateurs/rows`
- suppression : `DELETE https://api.exemple.tontine/air/v1/entities/ent_utilisateurs/rows/{id}`

Champs attendus dans `values` :

- `nom_complet` — string — **requis**
- `telephone` — string
- `est_sans_telephone` — boolean — **requis**
- `mandataire` — reference
- `photo_profil` — asset
- `piece_identite` — asset
- `est_president_verifie` — boolean — **requis**
- `cree_le` — datetime — **requis**

### `ent_tontines`

- lecture : `GET https://api.exemple.tontine/air/v1/entities/ent_tontines/rows`
- écriture : `POST https://api.exemple.tontine/air/v1/entities/ent_tontines/rows`
- suppression : `DELETE https://api.exemple.tontine/air/v1/entities/ent_tontines/rows/{id}`

Champs attendus dans `values` :

- `nom` — string — **requis**
- `montant_cotisation` — decimal — **requis**
- `frequence` — enum — **requis** — ∈ `HEBDOMADAIRE` · `MENSUEL`
- `cagnotte_interets_cumulee` — decimal — 🧮 **calculé par le serveur**
- `taux_penalite_jour` — decimal — **requis**
- `statut` — enum — **requis** — ∈ `EN_ATTENTE` · `ACTIVE` · `TERMINEE` — 🔒 transitions contrôlées
- `president` — reference — **requis**
- `cree_le` — datetime — **requis**

### `ent_membres_tontine`

- lecture : `GET https://api.exemple.tontine/air/v1/entities/ent_membres_tontine/rows`
- écriture : `POST https://api.exemple.tontine/air/v1/entities/ent_membres_tontine/rows`
- suppression : `DELETE https://api.exemple.tontine/air/v1/entities/ent_membres_tontine/rows/{id}`

Champs attendus dans `values` :

- `tontine` — reference — **requis**
- `utilisateur` — reference — **requis**
- `role` — enum — **requis** — ∈ `PRESIDENT` · `SECRETAIRE` · `TRESORIER` · `CENSEUR` · `MEMBRE`
- `ordre_passage` — number
- `cumul_amandes_disciplinaires` — decimal — **requis**

### `ent_transactions`

- lecture : `GET https://api.exemple.tontine/air/v1/entities/ent_transactions/rows`
- écriture : `POST https://api.exemple.tontine/air/v1/entities/ent_transactions/rows`
- suppression : `DELETE https://api.exemple.tontine/air/v1/entities/ent_transactions/rows/{id}`

> 🚫 **ENTITÉ JOURNAL — aucune modification, aucune suppression.**
> Le document la déclare `appendOnly`. Le serveur doit REFUSER `DELETE`,
> et refuser un `POST` qui porte l'`id` d'une ligne existante. La seule
> correction admise est une ligne NOUVELLE qui annule la première — ce que
> la comptabilité appelle une contre-passation. L'application ne propose
> déjà pas ces gestes ; un serveur qui les accepterait les rendrait
> atteignables par tout autre chemin.

Champs attendus dans `values` :

- `tontine` — reference — **requis**
- `cotiseur` — reference
- `beneficiaire` — reference
- `mandataire` — reference
- `type_op` — enum — **requis** — ∈ `COTISATION` · `ENCHERE` · `AMENDE_DISCIPLINAIRE` · `DISTRIBUTION_INTERETS` · `PAYOUT_POT`
- `montant_base` — decimal — **requis**
- `montant_enchere` — decimal — **requis**
- `frais_reseau_mobile` — decimal — **requis**
- `montant_penalite` — decimal — **requis**
- `part_penalite_createur` — decimal — **requis**
- `part_penalite_tontine` — decimal — **requis**
- `commission_plateforme` — decimal — **requis**
- `total_paye` — decimal — **requis**
- `operateur` — enum — ∈ `ORANGE_CMR` · `MTN_CMR` · `CASH`
- `reference_externe` — string
- `code_otp_payout` — string
- `statut` — enum — **requis** — ∈ `EN_ATTENTE` · `SEQUESTRE_BLOQUE` · `PAYOUT_SUCCES` · `ECHEC` — 🔒 transitions contrôlées
- `date_transaction` — datetime — **requis**

## 2. Les champs que le serveur CALCULE

Ces valeurs ne se saisissent pas : elles dérivent d'autres lignes. Le
serveur les rend en lecture et doit **ignorer ou refuser** toute tentative
de les écrire — une valeur écrite diverge de ce dont elle dérive, et
personne ne s'en aperçoit avant le décompte final.

- `ent_tontines.cagnotte_interets_cumulee` = la SOMME de `fld_transactions_montant_enchere` sur les lignes de `ent_transactions` liées par `rel_transaction_tontine`

## 3. Les états, et les seuls passages permis

Une énumération liste des valeurs et ne dit rien de leur ordre. Ces
champs-là se succèdent dans le temps : **la première valeur est l'état
initial**, et tout autre passage que ceux listés doit être refusé par le
serveur. Sans ce refus, un paiement en échec pourrait repasser en attente.

### `ent_tontines.statut`

État initial : `EN_ATTENTE`.

| depuis | vers |
| --- | --- |
| `EN_ATTENTE` | `ACTIVE` |
| `ACTIVE` | `TERMINEE` |

États TERMINAUX (rien n'en sort) : `TERMINEE`.

### `ent_transactions.statut`

État initial : `EN_ATTENTE`.

| depuis | vers |
| --- | --- |
| `EN_ATTENTE` | `SEQUESTRE_BLOQUE` |
| `EN_ATTENTE` | `ECHEC` |
| `SEQUESTRE_BLOQUE` | `PAYOUT_SUCCES` |
| `SEQUESTRE_BLOQUE` | `ECHEC` |

États TERMINAUX (rien n'en sort) : `PAYOUT_SUCCES` · `ECHEC`.

## 4. La session, et les droits

Cinq opérations. Les chemins viennent du protocole du moteur, pas d'une
convention de ce document.

| méthode | chemin | ce que le serveur rend |
| --- | --- | --- |
| `POST` | `/air/v1/session` | l'identité **et les droits** — voir ci-dessous |
| `GET` | `/air/v1/session` | l'état courant (appelé au démarrage de l'application) |
| `DELETE` | `/air/v1/session` | rien (204 suffit) |
| `POST` | `/air/v1/accounts` | l'identité si la session s'ouvre, sinon `pendingConfirmation: true` |
| `POST` | `/air/v1/password-resets` | l'ACCEPTATION de l'envoi — **jamais** si le compte existe |

Corps de `POST /air/v1/session` et `POST /air/v1/accounts` :
`{ "email": "…", "password": "…" }`.

Réponse attendue de `POST` et `GET /air/v1/session` :

```json
{
  "userId": "identifiant de la personne, absent si aucune session",
  "rights": ["les droits accordés — voir la liste ci-dessous"],
  "pendingConfirmation": false
}
```

### Les droits reviennent AVEC l'identité

Ce n'est pas un détail d'implémentation. Les demander par un second appel
ferait exister un instant où l'identité est établie et les droits inconnus.
L'accès étant **fermé par défaut**, cet instant afficherait un refus à
quelqu'un qui a le droit — exactement le défaut que le contrôle d'accès
existe pour empêcher.

Les droits de cette application :

- `right_bureau` — bureau
- `right_registre` — registre
- `right_tresorerie` — tresorerie
- `right_discipline` — discipline
- `right_encaisser_cash` — encaisser_cash

### Les rôles appartiennent au serveur

L'application ne connaît que des DROITS. Qui a quel rôle, et quel rôle
donne quel droit, est votre affaire — le document les décrit pour que les
deux côtés parlent de la même chose, pas pour que l'application les calcule.

Un rôle marqué **tous les droits** les reçoit TOUS, y compris ceux ajoutés
plus tard : recopier la liste à sa place la désaccorderait au premier droit
nouveau, et le garant de l'association perdrait un accès sans que rien ne
le dise.

| rôle | droits |
| --- | --- |
| `role_president` | **tous les droits** (`grantsAllRights`) |
| `role_secretaire` | `right_registre` |
| `role_tresorier` | `right_tresorerie` · `right_encaisser_cash` |
| `role_censeur` | `right_discipline` |
| `role_membre` | _aucun_ |

### Agir au nom d'un autre

Le champ `fld_utilisateurs_mandataire` de `ent_utilisateurs` désigne le mandataire
d'une personne. Les droits **délégables** sont une liste blanche :

- `right_encaisser_cash`

Un mandat **transmet** un droit, il ne le **crée** pas : le serveur doit
refuser l'action si le mandant lui-même n'a pas le droit. Et aucun autre
droit que ceux listés ne se délègue — « ce mandataire peut tout faire pour
moi » est une procuration générale que personne ne signe en connaissance
de cause.

## 5. Les gestes que le serveur exécute

Ces actions ne s'exécutent pas dans l'application : elle **demande**, le
serveur fait, l'application suit l'issue.

### `act_decaisser_pot` — Décaisser le pot au gagnant du tour

- capacité : `payments.mobile_money`, méthode `payout`
- droit exigé : `right_bureau` — **le serveur doit le vérifier**, pas seulement l'application
- 🔐 **SUSPENDU à un code de 6 chiffres reçu hors de l'application**

  Le serveur **émet** ce code sur un autre canal (SMS, messagerie) et le
  **vérifie** lui-même. L'application ne fait que le saisir et le
  transmettre : une application qui vérifierait elle-même un secret le
  détiendrait, et un secret que le vérificateur détient ne prouve plus
  rien. Le document dit que le geste est suspendu et combien de chiffres
  sont attendus — ni par quel canal, ni comment vérifier.

## 6. Ce qui n'appartient PAS à l'application

5 exigences du cahier des charges ne sont pas exprimables dans le
document, et ce n'est pas un manque du format : chacune a besoin d'une
**horloge** ou manipule de l'**argent** entre des personnes. Un document
qui décrit des écrans ne doit porter ni l'une ni l'autre.

Elles sont donc **entièrement à vous**. L'application les verra par les
données qu'elle lit et par les gestes qu'elle demande — jamais en les
calculant.

### Les fonds collectés sont bloqués sur un compte séquestre jusqu'à l'échéance du tour.

> **Pourquoi le serveur et pas l'application** — L'ORDRE des états est maintenant déclaré (`transitions`) : le séquestre ne se dé-bloque plus vers un état antérieur. Mais l'ÉCHÉANCE ne l'est pas. « Jusqu'à l'échéance du tour » suppose une HORLOGE qui fasse passer l'état toute seule, et une horloge vit sur le serveur. Le format dit ce qui est PERMIS, jamais ce qui arrive de soi-même — prétendre le contraire ferait croire qu'une application déverrouille des fonds sans que personne n'agisse.

### Le pot est attribué par enchère : le membre qui propose la plus forte prime l'emporte.

> **Pourquoi le serveur et pas l'application** — Une enchère est une CONCURRENCE entre plusieurs membres sur un même objet, avec un gagnant et une clôture. Le format décrit des écrans, des listes et des gestes individuels ; il n'a aucun nœud pour un mécanisme où le geste d'un membre invalide celui d'un autre.

### Les pénalités de retard valent 2 % par jour et se répartissent 70 % au groupe, 30 % à la plateforme.

> **Pourquoi le serveur et pas l'application** — Calcul sur une DURÉE, puis partage. Le format ne porte ni l'un ni l'autre : `rules.kind = "validation"` sait refuser une saisie, jamais produire un montant. C'est la même famille que le stock calculé de SGD, resté inexprimable.

### Les primes d'enchères s'accumulent pendant tout le cycle, puis se répartissent à parts égales en fin de cycle.

> **Pourquoi le serveur et pas l'application** — L'ACCUMULATION est portée : `cagnotte_interets_cumulee` est déclarée somme des primes d'enchères de ses transactions, et le validateur refuse qu'un formulaire la propose à la saisie. C'est la RÉPARTITION qui reste dehors, et pour deux raisons distinctes : elle divise par le nombre de membres ACTIFS — une condition que `sum` et `count` ne portent pas — et elle se déclenche À LA FIN DU CYCLE, un événement métier qu'aucun déclencheur ne connaît. Diviser et choisir son moment appartiennent au serveur, avec le reste de l'argent.

### À chaque séance, un membre et un seul encaisse le pot, selon l'ordre de passage.

> **Pourquoi le serveur et pas l'application** — `ordre_passage` est un nombre sur une ligne. Rien ne dit QUEL tour est en cours, ni que le tour avance quand le pot est versé. L'état d'avancement d'un cycle n'a pas de place au format.

---

## Ce que ce contrat ne dit pas, délibérément

- **Aucune forme de jeton n'est imposée.** Cookie, en-tête, durée de vie :
  mettez ce que vous voulez dans la réponse de `POST /air/v1/session`,
  l'application le renvoie tel quel. Choisir à votre place reviendrait à
  décider de la sécurité de votre serveur depuis un générateur d'écrans.
- **Aucun schéma de base de données.** Les entités ci-dessus sont ce que
  l'application attend en JSON, pas vos tables.
- **Aucune pagination.** `GET …/rows` rend tout. Le jour où une collection
  devient grande, cela se verra et se décidera — l'annoncer maintenant
  obligerait à l'implémenter des deux côtés sans savoir laquelle le mérite.
