# Tontine — spécification dérivée

> Générée depuis le document AIR `prj_tontine_cameroun`, contrat 1.30.0.
> Ne pas modifier à la main : régénérer après toute évolution du document.

Tontine digitale : cotisations, enchères, séquestre et bureau traditionnel.

## Qui fait quoi

| | Côté **Spring Boot** | Côté **application générée** |
|---|---|---|
| Données | persistance, intégrité, migrations | affichage, saisie |
| Accès | **faire respecter** la matrice | masquer ce qui est interdit |
| Argent | **tout le calcul** | afficher des montants déjà calculés |
| Opérateurs | Mobile Money, OTP, PDF | déclencher, montrer le résultat |

La matrice d'accès est **appliquée par le serveur**. L'application la respecte aussi — elle masque ce qu'un rôle n'ouvre pas — mais une garde côté client ne garde rien : elle évite une erreur, elle n'empêche pas une attaque.

## Entités

### `utilisateurs`

| Champ | Type AIR | PostgreSQL | Java | Requis |
|---|---|---|---|---|
| `nom_complet` | string | VARCHAR(255) | String | oui |
| `telephone` | string | VARCHAR(255) | String | non |
| `est_sans_telephone` | boolean | BOOLEAN | Boolean | oui |
| `mandataire` | reference | UUID → `utilisateurs` | (entité liée) | non |
| `photo_profil` | asset | TEXT (URL) | String | non |
| `piece_identite` | asset | TEXT (URL) | String | non |
| `est_president_verifie` | boolean | BOOLEAN | Boolean | oui |
| `cree_le` | datetime | TIMESTAMP | Instant | oui |

### `tontines`

| Champ | Type AIR | PostgreSQL | Java | Requis |
|---|---|---|---|---|
| `nom` | string | VARCHAR(255) | String | oui |
| `montant_cotisation` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `frequence` | enum | (type énuméré) — `HEBDOMADAIRE`, `MENSUEL` | enum | oui |
| `cagnotte_interets_cumulee` | decimal | DECIMAL(12,2) | BigDecimal | non |
| `taux_penalite_jour` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `statut` | enum | (type énuméré) — `EN_ATTENTE`, `ACTIVE`, `TERMINEE` | enum | oui |
| `president` | reference | UUID → `utilisateurs` | (entité liée) | oui |
| `cree_le` | datetime | TIMESTAMP | Instant | oui |

### `membres_tontine`

| Champ | Type AIR | PostgreSQL | Java | Requis |
|---|---|---|---|---|
| `tontine` | reference | UUID → `tontines` | (entité liée) | oui |
| `utilisateur` | reference | UUID → `utilisateurs` | (entité liée) | oui |
| `role` | enum | (type énuméré) — `PRESIDENT`, `SECRETAIRE`, `TRESORIER`, `CENSEUR`, `MEMBRE` | enum | oui |
| `ordre_passage` | number | INTEGER | Integer | non |
| `cumul_amandes_disciplinaires` | decimal | DECIMAL(12,2) | BigDecimal | oui |

### `transactions`

| Champ | Type AIR | PostgreSQL | Java | Requis |
|---|---|---|---|---|
| `tontine` | reference | UUID → `tontines` | (entité liée) | oui |
| `cotiseur` | reference | UUID → `utilisateurs` | (entité liée) | non |
| `beneficiaire` | reference | UUID → `utilisateurs` | (entité liée) | non |
| `mandataire` | reference | UUID → `utilisateurs` | (entité liée) | non |
| `type_op` | enum | (type énuméré) — `COTISATION`, `ENCHERE`, `AMENDE_DISCIPLINAIRE`, `DISTRIBUTION_INTERETS`, `PAYOUT_POT` | enum | oui |
| `montant_base` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `montant_enchere` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `frais_reseau_mobile` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `montant_penalite` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `part_penalite_createur` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `part_penalite_tontine` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `commission_plateforme` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `total_paye` | decimal | DECIMAL(12,2) | BigDecimal | oui |
| `operateur` | enum | (type énuméré) — `ORANGE_CMR`, `MTN_CMR`, `CASH` | enum | non |
| `reference_externe` | string | VARCHAR(255) | String | non |
| `code_otp_payout` | string | VARCHAR(255) | String | non |
| `statut` | enum | (type énuméré) — `EN_ATTENTE`, `SEQUESTRE_BLOQUE`, `PAYOUT_SUCCES`, `ECHEC` | enum | oui |
| `date_transaction` | datetime | TIMESTAMP | Instant | oui |

## Relations

Le format ne connaît pas `many_to_one` : une relation se déclare toujours depuis le côté « un ». En JPA, cela se lit `@OneToMany` d'un côté et `@ManyToOne` de l'autre.

| Depuis | Vers | Cardinalité |
|---|---|---|
| `utilisateurs` | `tontines` | one_to_many |
| `tontines` | `membres_tontine` | one_to_many |
| `utilisateurs` | `membres_tontine` | one_to_many |
| `tontines` | `transactions` | one_to_many |
| `utilisateurs` | `transactions` | one_to_many |
| `utilisateurs` | `utilisateurs` | one_to_many |

## Matrice d'accès

### Droits

- `right_bureau` — Créer une tontine et en orchestrer les séances
- `right_registre` — Tenir le registre, les procès-verbaux et les présences
- `right_tresorerie` — Superviser le séquestre et certifier les écritures
- `right_discipline` — Appliquer le règlement intérieur et les amendes
- `right_encaisser_cash` — Saisir une cotisation en espèces pour un autre membre

### Rôles

| Rôle | Droits |
|---|---|
| Président | **tous** (super-administrateur) |
| Secrétaire | `right_registre` |
| Trésorier | `right_tresorerie`, `right_encaisser_cash` |
| Censeur | `right_discipline` |
| Membre | _aucun_ — liste blanche vide |

Rôle par défaut : **Membre**. Un compte nouvellement créé n'a donc **aucun** droit du bureau tant qu'on ne lui en accorde pas.

## Écrans et droits exigés

| Écran | Droit exigé |
|---|---|
| Mon tableau de bord | _ouvert_ |
| Mes tontines | _ouvert_ |
| Membres et ordre de passage | _ouvert_ |
| Mouvements du séquestre | `right_tresorerie` |
| Annuaire des membres | `right_registre` |
| Vérification d'identité | `right_bureau` |
| Amendes disciplinaires | `right_discipline` |
| Encaisser en espèces | `right_encaisser_cash` |
| Séance et enchères | `right_bureau` |
| Paramètres | _ouvert_ |

## Ce qui revient au backend (5 points)

Ces exigences du cahier des charges **ne sont pas portées par l'interface**, et c'est volontaire : ce sont des règles métier, financières ou réglementaires. Elles sont donc à implémenter côté Spring Boot. La liste est exhaustive par construction — tout ce que l'application ne sait pas porter se trouve ici.

### 1. Les fonds collectés sont bloqués sur un compte séquestre jusqu'à l'échéance du tour.

> L'ORDRE des états est maintenant déclaré (`transitions`) : le séquestre ne se dé-bloque plus vers un état antérieur. Mais l'ÉCHÉANCE ne l'est pas. « Jusqu'à l'échéance du tour » suppose une HORLOGE qui fasse passer l'état toute seule, et une horloge vit sur le serveur. Le format dit ce qui est PERMIS, jamais ce qui arrive de soi-même — prétendre le contraire ferait croire qu'une application déverrouille des fonds sans que personne n'agisse.

### 2. Le pot est attribué par enchère : le membre qui propose la plus forte prime l'emporte.

> Une enchère est une CONCURRENCE entre plusieurs membres sur un même objet, avec un gagnant et une clôture. Le format décrit des écrans, des listes et des gestes individuels ; il n'a aucun nœud pour un mécanisme où le geste d'un membre invalide celui d'un autre.

### 3. Les pénalités de retard valent 2 % par jour et se répartissent 70 % au groupe, 30 % à la plateforme.

> Calcul sur une DURÉE, puis partage. Le format ne porte ni l'un ni l'autre : `rules.kind = "validation"` sait refuser une saisie, jamais produire un montant. C'est la même famille que le stock calculé de SGD, resté inexprimable.

### 4. Les primes d'enchères s'accumulent pendant tout le cycle, puis se répartissent à parts égales en fin de cycle.

> L'ACCUMULATION est portée : `cagnotte_interets_cumulee` est déclarée somme des primes d'enchères de ses transactions, et le validateur refuse qu'un formulaire la propose à la saisie. C'est la RÉPARTITION qui reste dehors, et pour deux raisons distinctes : elle divise par le nombre de membres ACTIFS — une condition que `sum` et `count` ne portent pas — et elle se déclenche À LA FIN DU CYCLE, un événement métier qu'aucun déclencheur ne connaît. Diviser et choisir son moment appartiennent au serveur, avec le reste de l'argent.

### 5. À chaque séance, un membre et un seul encaisse le pot, selon l'ordre de passage.

> `ordre_passage` est un nombre sur une ligne. Rien ne dit QUEL tour est en cours, ni que le tour avance quand le pot est versé. L'état d'avancement d'un cycle n'a pas de place au format.

## Ce que l'application porte déjà (12 points)

- Reproduire le bureau traditionnel — Président, Secrétaire, Trésorier, Censeur, Membre — par une matrice d'accès stricte.
- Un membre peut n'avoir ni smartphone ni compte Mobile Money, et reste rattaché à un mandataire.
- Tenir le registre des membres d'une tontine, leur rôle, leur ordre de passage et leur cumul d'amendes.
- Une tontine porte son montant de cotisation, sa fréquence, son taux de pénalité et son statut.
- Chaque mouvement est horodaté, typé, et garde la trace de son opérateur et de sa référence externe.
- Vérification d'identité obligatoire : pièce d'identité et selfie, contrôlés par le bureau.
- Un membre consulte sa position et son historique financier sans aucune charge du bureau.
- Le mandataire AGIT AU NOM d'un autre : il cotise pour lui et encaisse son pot.
- Collecte et décaissement par argent mobile, avec les opérateurs du pays.
- Un décaissement n'est exécuté qu'après saisie d'un code à 6 chiffres reçu par WhatsApp ou SMS.
- Déclarer aux magasins que l'application traite des données financières.
- Le Secrétaire exporte les procès-verbaux et les rapports en PDF d'un seul clic.

---

*4 entités · 6 relations · 10 écrans · 5 droits · 5 rôles · 12 besoins portés · 5 au backend.*