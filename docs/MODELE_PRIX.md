# Le modèle de prix de Deribfy (décidé le 2026-11-18)

> Consigné **avant** toute ligne de code de paiement. Rien de Stripe n'est construit.

## Le modèle

| | |
|---|---|
| **Une application gratuite** | générée, visible par son auteur seul |
| **Retoucher ou publier** | demande l'abonnement |
| **Prix** | **20 $ par mois**, par application publiée, **affiché en dollars américains**. Deribfy est universel, pas tchadien. Pas d'affichage dans la monnaie du visiteur avant Dary : le propriétaire dit « environ 12 000 FCFA » lui-même au stand |
| **Inclus** | **50 modifications par mois** |
| **Lot supplémentaire** | 50 modifications pour 5 $ (activé à la main depuis l'administration avant Dary, sans écran d'achat) |
| **Une deuxième application** | un second abonnement |

L'unité s'appelle **« modification »**, jamais « crédit » ni « jeton ». C'est une décision de produit : les concurrents comptent des jetons que personne ne comprend.

## Les règles

1. **Une modification refusée ne compte pas.** Nous la payons au fournisseur, mais la facturer serait faire payer notre propre panne.
2. **Le compteur se voit AVANT de cliquer** : « 37 modifications restantes ce mois-ci ».
3. **À zéro, l'application publiée RESTE EN LIGNE.** Elle ne peut plus être modifiée, c'est tout. On ne coupe jamais le commerce de quelqu'un parce qu'il a épuisé un quota.
4. **Abonnement non renouvelé** — c'est une règle, pas un réglage. Voir `docs/ECHEANCES.md` :
   - de 1 à 30 jours de retard, l'application reste en ligne ; seules les modifications s'arrêtent ; un rappel s'affiche au propriétaire seul ;
   - après 30 jours, elle est retirée de la ligne, mais **ses données sont conservées au moins 90 jours** et reviennent intactes au paiement ;
   - jamais de suppression sans préavis, jamais de perte de données pour un impayé.

## Pourquoi ces chiffres

50 modifications nous coûtent **1,30 $** (mesuré : 0,026 $ par modification utilisable, échecs compris ; voir `elite-protocol/RAPPORT_RETOUCHE_PHARMA.md`). Nous ne sommes pas perdants, même avec les refus. Un lot de 5 $ nous coûte 1,30 $. 20 $ plutôt que 25 $ : Replit et Base44 sont à 20 $, Lovable et Bolt à 25 $ avec des produits plus mûrs. On montera quand on l'aura mérité.

## Comment on encaisse

- **Avant Dary** : activation **manuelle**. Le commerçant paie par Airtel Money ou Moov Money au numéro de l'entité tchadienne ; l'administrateur active l'abonnement ou le lot avec la référence de la transaction. Le registre des paiements est conçu avec un **fournisseur interchangeable**.
- **Après Dary** : Stripe pour les cartes, sous l'entité québécoise. Libellé sur le relevé de carte : `DERIBFY.COM`.
- **Mobile money intégré** : selon les devis demandés (Monerails, Bizao, CinetPay).

## À confirmer par le propriétaire

- **« Retoucher demande l'abonnement »** : la note du 18 novembre disait « créer, voir, tester : gratuit ». L'application gratuite ne peut-elle donc **pas du tout** être retouchée avant l'abonnement ? Le compteur et les écrans en dépendent.
