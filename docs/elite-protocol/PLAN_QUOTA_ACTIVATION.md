# Quota et activation à la main — le plan, en options (2026-11-19)

> À lire par le propriétaire avant toute ligne de code. Rien n'est construit.
> Sources : `docs/MODELE_PRIX.md` (le modèle), `GENERATION_OUVERTE_ET_QUOTA.md` §3 (l'état des lieux du 2026-11-17).

## Ce que le chantier doit rendre vrai

1. Une appli gratuite par compte, visible par son auteur seul ; 3 modifications gratuites dessus.
2. Publier demande l'abonnement : 20 $ US par mois et par application publiée, 50 modifications par mois.
3. Une modification refusée ne compte pas. Le compteur se voit AVANT de cliquer.
4. À zéro, l'appli publiée reste en ligne : elle ne se modifie plus, c'est tout.
5. Le paiement arrive par Airtel ou Moov, vers l'entité tchadienne ; tu l'actives à la main, avec la référence de la transaction. Stripe viendra après Dary SANS refaire le registre.
6. Le lot de 50 modifications à 5 $, activé à la main.
7. Sur le site (rangés ici le 2026-11-18) : les conditions de l'offre gratuite, l'annulation visible, « service numérique, ni livraison ni retours », la page /contact.

Hors chantier (repassé au 2027-01-31) : la règle de l'abonnement impayé (rappel, arrêt, retrait après 30 jours).

## Décision 1 — Où vit le compteur

| | A. Une table de réservations, une instruction SQL (recommandé) | B. Une colonne sur `app_generations` | C. Compter les lignes de `app_generation_attempts` |
|---|---|---|---|
| Comment | `reserver_modification(app, limite)` : `insert … on conflict do update set n = n + 1 where n < limite returning n`. Rien rendu = refus 402, avant tout appel payant | lire, comparer, écrire | compter après coup |
| Deux clics simultanés | un seul passe (une instruction) | les deux passent | les deux passent |
| Refus non compté | la tentative refusée rend sa réservation (`liberer_modification`) | à coder partout | naturel, mais la course reste |
| Contournable par l'appel direct à la route | non : la réservation est dans la route, côté serveur | non | non |

**Recommandation : A.** C'est le défaut exact du quota des sites aujourd'hui (lu au début, écrit à la fin : deux requêtes passent) — on ne le recopie pas. La table est fermée à `anon` et `authenticated` (`revoke all`, RLS sans politique), avec un test qui le prouve : Supabase leur donne tous les droits sur une table neuve par défaut.

## Décision 2 — Ce qui compte comme une « modification »

| Porte payante | Proposition |
|---|---|
| `retoucher` | **une modification**. 3 sur l'appli gratuite, 50 par période sur une appli abonnée |
| `direct` (première génération) | **une appli gratuite par compte** — compte des applis non supprimées. Une deuxième appli = un second abonnement |
| `lire-brief` (petit modèle, quelques millièmes de $) | **pas une modification** ; un plafond anti-abus par jour et par compte, invisible tant qu'on ne l'atteint pas |
| Régénérer | fermé aujourd'hui ; s'il rouvre, il compte comme une modification |

Tes applis (EMAILS_SANS_QUOTA, déjà dans le code) ne sont jamais bloquées : le stand ne doit pas tomber sur un quota.

## Décision 3 — Le registre des paiements (fournisseur interchangeable)

| | A. Un registre où l'on n'efface rien + l'état qui s'en déduit (recommandé) | B. Un drapeau `abonnee = true` sur l'appli | C. Attendre Stripe |
|---|---|---|---|
| Ce qu'on garde | chaque paiement : fournisseur (`airtel`, `moov`, puis `stripe`), **référence de la transaction**, montant, devise, objet (`abonnement` ou `lot_50`), qui l'a saisi, quand | rien : on ne sait pas pourquoi elle est active | — |
| Double saisie de la même transaction | refusée : la référence est unique par fournisseur | possible | — |
| Stripe après Dary | une ligne de plus avec `fournisseur = stripe`, posée par son webhook ; rien à refaire | tout à refaire | — |
| Correction d'une erreur | une ligne d'annulation qui pointe la fautive ; on n'efface jamais | on écrase | — |

**Recommandation : A.** L'abonnement d'une appli = « payé jusqu'au … », calculé depuis le registre. Une seule fonction SQL fait l'activation : elle écrit la ligne ET prolonge la date, ou ne fait rien.

## Décision 4 — Le bouton d'activation (administration)

Dans `/admin`, réservé aux adresses d'administration, vérifié côté serveur :

1. chercher l'appli (par son nom publié ou l'adresse de son propriétaire) ;
2. choisir : abonnement ou lot de 50 ;
3. fournisseur (Airtel / Moov) et **référence de la transaction, obligatoire** ;
4. montant reçu, en FCFA ;
5. une confirmation dessinée, pas `confirm()` : « Activer pharma jusqu'au 19 décembre 2026 ? » ;
6. le résultat : la nouvelle date, et la ligne du registre.

Le même numéro de transaction saisi deux fois est refusé avec le nom de l'appli qu'il a déjà activée.

## Décision 5 — Ce que voit le commerçant

- Au-dessus du champ de retouche : « 3 modifications gratuites restantes », puis « 37 modifications restantes ce mois-ci ».
- À zéro : le champ se ferme, la phrase dit pourquoi et ce qui le rouvre ; l'appli reste en ligne.
- Au bouton « Publier » d'une appli non abonnée : le prix, ce qui est inclus, et **comment payer** (numéro Airtel/Moov, ce qu'il faut écrire dans le motif, et qu'on active à réception).
- Sur le site : la carte Application de la page Tarifs (faite le 2026-11-19), et les points 6 à 9 rangés ici.

## Ce qui reste à TOI avant la première activation

1. **Le prix en FCFA** (le stand dit « environ 12 000 FCFA » ; le bouton a besoin du montant exact attendu).
2. **La durée** : un abonnement = 30 jours à partir de l'activation (recommandé : pas de prorata, simple à dire au stand), ou le mois civil ?
3. **Les numéros Airtel et Moov** de l'entité tchadienne, et le motif à écrire.
4. **Tes applis existantes** : exemptes (recommandé, elles sont ta démo) ou abonnées comme les autres ?
5. **Les 10 applis déjà publiées** : elles restent en ligne quoi qu'il arrive (règle 4). Je propose qu'elles soient considérées payées jusqu'au 31 décembre 2026, pour que personne ne soit bloqué pendant la mise en place.

## Ordre de construction proposé et preuves

| Étape | Preuve |
|---|---|
| ① Tables + fonctions SQL (réservation, libération, activation), appliquées par toi | test de concurrence sur Postgres jetable (deux réservations simultanées, une passe) ; test que `anon`/`authenticated` n'y touchent pas |
| ② `retoucher` et `direct` réservent avant de payer ; refus = libération | tests de route ; mutation : réservation retirée → rouge |
| ③ Le compteur visible dans l'atelier | rendu testé ; vu par toi en production |
| ④ Le bouton d'activation dans `/admin` | test : double référence refusée ; non-admin refusé (403) |
| ⑤ Publier demande l'abonnement, avec le chemin de paiement | parcours complet en production, sur un compte de test, par toi |
| ⑥ Les quatre textes du site (offre gratuite, annulation, service numérique, /contact) | relus par toi |

Estimation : 3,5 à 4,5 jours (non mesurée). Aucune dépense de modèle nécessaire pour prouver.

## Ta règle des cinq semaines

Ce chantier est le troisième de l'ordre arrêté le 2026-11-18. Rien n'y est ajouté au-delà de ce qui a été rangé avec ton accord (points 6 à 9 et la carte Tarifs).
