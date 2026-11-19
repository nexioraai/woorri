# Quota et activation à la main — le plan, en options (v2, 2026-11-19)

> À lire par le propriétaire avant toute ligne de code. **Rien n'est construit.**
> Sources : `docs/MODELE_PRIX.md` (le modèle), `GENERATION_OUVERTE_ET_QUOTA.md` §3 (l'état des lieux du 2026-11-17).
> v2 : prix définitifs en USD ; identité du registre corrigée par la mesure Stripe du 2026-11-19 ; vue de la consommation et compteur ajoutés (demande du propriétaire).

## Ce que le chantier doit rendre vrai

1. Une appli gratuite par compte, visible par son auteur seul ; **3 modifications gratuites** dessus.
2. Publier demande l'abonnement : **20 $ US par mois et par application publiée, 50 modifications par mois**.
3. Une modification refusée ne compte pas. Le compteur se voit **avant** de cliquer.
4. À zéro, l'appli publiée reste en ligne : elle ne se modifie plus, c'est tout.
5. Le paiement arrive par Airtel ou Moov, vers l'entité tchadienne ; tu l'actives à la main, avec la référence de la transaction. Stripe viendra après Dary **sans refaire le registre**.
6. Le lot de 50 modifications à 5 $, activé à la main.
7. Le commerçant voit sa consommation ; aucun montant en dollars ne lui est montré.
8. Sur le site (rangés ici le 2026-11-18) : les conditions de l'offre gratuite, l'annulation visible, « service numérique, ni livraison ni retours », la page /contact (dès que l'adresse et le 2e contact sont donnés).

Hors chantier (au 2027-01-31) : la suite de l'impayé (avertissements, pause, effacement).

## Ce que la mesure du 2026-11-19 change : l'identité n'est PAS le client Stripe

**Mesuré dans Stripe (live) : 11 fiches clients, dont 6 à ton adresse.** Ce n'est pas une fiche par passage au paiement : c'est **une fiche par SITE**. `api/checkout` crée un client Stripe pour chaque site qui n'en a pas encore (`sites.stripe_customer_id`), sans chercher s'il en existe déjà un pour la même personne. Chaque fiche porte le `slug` de son site.

| Fiche | Site | Abonnement |
|---|---|---|
| `cus_UoVS…` | yia-global-commodities | **actif** (15 CAD) |
| `cus_V03E…` | designmoi | aucun |
| `cus_V5on…` | trendhub-store | aucun |
| `cus_UtWP…` | lm-fils (site disparu) | 2 abandonnés en juillet |
| `cus_UiXU…`, `cus_UlmS…` | bucof, nexus-digital (sites disparus) | aucun |

- **La protection de ton site n'est pas affaiblie** : à l'annulation, le webhook cherche les sites rattachés au client **de l'abonnement annulé**. Avec une fiche par site, ce client n'en a qu'un — le tien, `cus_UoVS…`, mesuré. Le rayon d'action est même plus étroit que si tout était sur une fiche.
- **Un deuxième chemin crée des fiches** : l'achat de domaine (`api/domains/purchase`) cherche une fiche par adresse et prend **la première** — avec 6 fiches à ton adresse, laquelle est arbitraire. Consigné, pas corrigé ici.
- **Je compte 11 fiches, tu en vois 12** : probablement une en mode test ou une supprimée. Dis-moi où tu la vois, je la mesure.

**Conséquence pour ce chantier :** le registre s'appuie sur **ton compte Deribfy** (`owner_id`) et sur **l'appli**, jamais sur une fiche Stripe. La fiche Stripe n'est qu'une **référence de fournisseur** sur la ligne d'un paiement — comme la référence Airtel. Voir décisions 3 et 7.

## Décision 1 — Où vit le compteur

| | **A. Une table de réservations, une instruction SQL (recommandé)** | B. Une colonne sur `app_generations` | C. Compter les lignes de `app_generation_attempts` |
|---|---|---|---|
| Comment | `reserver_modification(app, limite)` : `insert … on conflict do update set n = n + 1 where n < limite returning n`. Rien rendu = refus 402, **avant** tout appel payant | lire, comparer, écrire | compter après coup |
| Deux clics simultanés | un seul passe | les deux passent | les deux passent |
| Refus non compté | la tentative refusée rend sa réservation (`liberer_modification`) | à coder partout | naturel, mais la course reste |

Le quota des sites a exactement le défaut B aujourd'hui (lu au début, écrit à la fin) : on ne le recopie pas. Table fermée à `anon` et `authenticated` (`revoke all`, RLS sans politique), avec un test qui le prouve.

## Décision 2 — Ce qui compte comme une « modification »

| Porte payante | Proposition |
|---|---|
| `retoucher` | **une modification**. 3 sur l'appli gratuite, 50 par période sur une appli abonnée |
| `direct` (première génération) | **une appli gratuite par compte** (applis non supprimées). Une deuxième appli = un second abonnement |
| `lire-brief` (petit modèle) | **pas une modification** ; un plafond anti-abus par jour et par compte, invisible tant qu'on ne l'atteint pas |
| Régénérer | fermé aujourd'hui ; s'il rouvre, il compte |

Tes applis (et celles d'abbasissay, `EMAILS_SANS_QUOTA`) ne sont jamais bloquées : le stand ne tombe pas sur un quota.

## Décision 3 — Le registre des paiements (fournisseur interchangeable)

| | **A. Un registre où l'on n'efface rien, rattaché au COMPTE et à l'APPLI (recommandé)** | B. Un drapeau `abonnee = true` sur l'appli | C. Rattaché à la fiche Stripe |
|---|---|---|---|
| Identité | `owner_id` (compte Deribfy) + `app_id` | l'appli seule | la fiche Stripe — **une par site aujourd'hui, mesuré** |
| Ce qu'on garde | fournisseur (`airtel`, `moov`, puis `stripe`), **référence de la transaction** (unique par fournisseur), montant, devise, objet (`abonnement` ou `lot_50`), qui l'a saisi, quand | rien | dépend de Stripe |
| Stripe après Dary | une ligne de plus, `fournisseur = stripe`, la fiche en référence | tout à refaire | impossible avant Dary (Airtel/Moov n'ont pas de fiche) |
| Correction d'une erreur | une ligne d'annulation qui pointe la fautive | on écrase | — |

L'abonnement d'une appli = « payé jusqu'au … », calculé depuis le registre. **Une seule fonction SQL** écrit la ligne ET prolonge la date, ou ne fait rien.

## Décision 4 — Le bouton d'activation (administration)

Dans `/admin`, réservé aux adresses d'administration, vérifié côté serveur :

1. chercher l'appli (par son nom publié ou l'adresse de son propriétaire) ;
2. choisir : abonnement ou lot de 50 ;
3. fournisseur (Airtel / Moov) et **référence de la transaction, obligatoire** ;
4. montant reçu, en FCFA ;
5. une confirmation dessinée, pas `confirm()` : « Activer pharma jusqu'au 19 décembre 2026 ? » ;
6. le résultat : la nouvelle date, et la ligne du registre.

Le même numéro de transaction saisi deux fois est refusé, avec le nom de l'appli qu'il a déjà activée.

## Décision 5 — Ce que voit le commerçant dans l'atelier

**Mesuré aujourd'hui :** après une retouche, l'atelier affiche « (0,026 $ dépensés) », et chaque ligne de l'historique porte son montant (`atelier/[id]/page.tsx:396` et `:743`). C'est notre coût, pas son prix.

| | **A. Le compteur partout, les dollars pour l'administration seule (recommandé)** | B. Le compteur partout, les dollars supprimés pour tous |
|---|---|---|
| Le bouton | « Modifier — **37 modifications restantes** » ; sur l'appli gratuite « **3 modifications gratuites restantes** » | idem |
| Après une retouche | « Modification faite. Il vous en reste 36. » ; un refus : « Non décomptée. » | idem |
| À zéro | le champ se ferme ; la phrase dit pourquoi, quand le compteur revient, et que l'appli reste en ligne | idem |
| Les montants en $ | visibles pour toi seul, comme la note interne « 24 sur N » | plus personne ne les voit |

Au bouton « Publier » d'une appli non abonnée : le prix (20 $ US par mois), ce qui est inclus, et **comment payer** (numéro Airtel/Moov, motif, activation à réception).

## Décision 6 — La consommation dans la page Compte (ta demande d'hier)

Ce qu'elle montre : modifications **utilisées**, **restantes**, la **liste du mois** (date, ce qui a été demandé, « faite » ou « refusée — non décomptée »), et la **date de remise à zéro**.

**La contrainte, mesurée :** la page Compte vit sur `<nom>.deribfy.app/compte`. On y est connecté avec le compte **de l'appli** (`admin@<nom>.deribfy.app`, dans la base des applis), pas avec ton compte Deribfy. Et sa politique de sécurité ne laisse parler la page qu'à la base des applis. Le quota, lui, est dans la base de Deribfy.

| | **A. Une route de Deribfy, même adresse que l'appli (recommandé)** | B. Le chiffre écrit dans la page au moment de la servir | C. La consommation seulement dans l'espace Deribfy |
|---|---|---|---|
| Comment | `<nom>.deribfy.app/compte/consommation` : la page envoie le jeton de connexion de l'appli ; Deribfy vérifie auprès de la base des applis qu'il appartient bien à CETTE appli (la revendication `oeuvre`, la même qui garde les tables), puis répond | la route `/compte` écrit les chiffres dans le HTML | un écran dans l'atelier, pas dans la page Compte |
| Qui la voit | seulement quelqu'un connecté à l'appli | **n'importe quel visiteur** de `/compte` — la page est publique | toi |
| Ce qui change ailleurs | la politique de sécurité du sous-domaine autorise aussi la même adresse (`connect-src 'self'`) | rien | rien |
| Atteint les 10 applis existantes | oui, servi par Deribfy | oui | — |

Je recommande A **et** C : la page Compte pour le commerçant, le même chiffre dans l'atelier pour toi.

## Décision 7 — Une seule fiche Stripe par compte (pour après Dary)

| | **A. Une fiche par compte Deribfy, retrouvée avant d'en créer (recommandé)** | B. Laisser une fiche par site |
|---|---|---|
| Comment | `profiles.stripe_customer_id` ; `checkout` et l'achat de domaine la retrouvent ; les anciennes fiches restent, rattachées à leurs sites | rien |
| Quand | avec le Stripe complet, **après Dary** — avant, aucun paiement n'arrive par Stripe | — |
| Ce qu'il faut garder | le webhook d'annulation reste ciblé sur les sites **de l'abonnement annulé** (métadonnée du site), pas sur toute la fiche — sinon une seule fiche par compte élargirait le rayon d'une annulation à tous les sites de la personne | — |

## Ce qui reste à TOI avant la première activation

1. **Le prix en FCFA** (le stand dit « environ 12 000 FCFA » ; le bouton a besoin du montant exact attendu).
2. **La durée** : un abonnement = **30 jours à partir de l'activation** (recommandé : pas de prorata, simple à dire au stand), ou le mois civil ?
3. **Les numéros Airtel et Moov** de l'entité tchadienne, et le motif à écrire.
4. **Les 10 applis déjà publiées** : je propose qu'elles soient considérées payées jusqu'au 31 décembre 2026, pour que personne ne soit bloqué pendant la mise en place.

## Ordre de construction et preuves

| Étape | Preuve |
|---|---|
| ① Tables + fonctions SQL (réservation, libération, activation), appliquées par toi | concurrence sur un Postgres jetable (deux réservations simultanées : une passe) ; `anon`/`authenticated` n'y touchent pas |
| ② `retoucher` et `direct` réservent avant de payer ; refus = libération | tests de route ; réservation retirée → rouge |
| ③ Le compteur dans l'atelier, les dollars pour l'administration seule | rendu testé ; vu par toi en production |
| ④ Le bouton d'activation dans `/admin` | double référence refusée ; non-admin → 403 |
| ⑤ La consommation dans la page Compte | jeton d'une AUTRE appli → refusé ; vu par toi sur pharma |
| ⑥ Publier demande l'abonnement, avec le chemin de paiement | parcours complet en production, sur un compte de test, par toi |
| ⑦ Les quatre textes du site | relus par toi |

Estimation : **4 à 5 jours** (la v1 disait 3,5 à 4,5 ; la page Compte en ajoute un demi). Non mesurée. Aucune dépense de modèle nécessaire pour prouver.

## Pour répondre d'un coup

> **1A · 2 comme proposé · 3A · 4 comme décrit · 5A · 6 A+C · 7A après Dary** — plus le prix en FCFA, la durée, les numéros, et les 10 applis au 31 décembre.

Change ce qui ne te va pas ; le reste vaut accord.
