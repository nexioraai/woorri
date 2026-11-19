# Le modèle de prix de Deribfy (décidé le 2026-11-18)

> Consigné **avant** toute ligne de code de paiement. Rien de Stripe n'est construit.

## Le modèle

| | |
|---|---|
| **Une application gratuite** | générée, visible par son auteur seul |
| **Retoucher l'appli gratuite** | **3 modifications gratuites**, puis l'abonnement (décidé le 2026-11-18). Une première génération est rarement juste du premier coup : quelqu'un qui ne peut pas y toucher repart en pensant que ça ne marche pas. Coût : environ 0,21 $ par visiteur qui essaie (0,136 $ + 3 × 0,026 $) ; une seule appli gratuite par compte |
| **Publier** | demande l'abonnement |
| **Prix** | **20 $ par mois**, par application publiée, **affiché en dollars américains**. Deribfy est universel, pas tchadien. Pas d'affichage dans la monnaie du visiteur avant Dary : le propriétaire dit « environ 12 000 FCFA » lui-même au stand |
| **Inclus** | **50 modifications par mois** |
| **Lot supplémentaire** | 50 modifications pour 5 $ (activé à la main depuis l'administration avant Dary, sans écran d'achat) |
| **Une deuxième application** | un second abonnement |

L'unité s'appelle **« modification »**, jamais « crédit » ni « jeton ». C'est une décision de produit : les concurrents comptent des jetons que personne ne comprend.

## Les règles

1. **Une modification refusée ne compte pas.** Nous la payons au fournisseur, mais la facturer serait faire payer notre propre panne.
2. **Le compteur se voit AVANT de cliquer** : « 3 modifications gratuites restantes » avant l'abonnement, « 37 modifications restantes ce mois-ci » après (50 par mois).
3. **À zéro, l'application publiée RESTE EN LIGNE.** Elle ne peut plus être modifiée, c'est tout. On ne coupe jamais le commerce de quelqu'un parce qu'il a épuisé un quota.
4. **Abonnement non renouvelé** — c'est une règle, pas un réglage (précisée par le propriétaire le 2026-11-19). Voir `docs/ECHEANCES.md` :
   - **jour 1**, l'échéance passe sans paiement (avant Dary, il n'y a pas de prélèvement qui « échoue » : c'est l'activation manuelle qui n'arrive pas) : **les modifications s'arrêtent, l'application reste en ligne** ;
   - **jour 27** : un avertissement ; **jour 29** : un deuxième avertissement — au propriétaire seul, jamais à ses clients ;
   - **jour 30 : mise en pause.** L'adresse de l'application affiche une **page sobre** : « momentanément indisponible ». Pas une erreur, pas une publicité pour Deribfy ;
   - **les 90 jours partent de la mise en pause** : les données restent intactes du jour 30 au jour 120. Il paie quand il veut pendant ces 90 jours et tout revient : **même adresse, mêmes données, même compte** ;
   - **jour 113 (7 jours avant l'effacement) : l'avertissement final** ;
   - **jour 120 : effacement**, soit quatre mois après l'échéance. L'export des données reste possible tout du long ;
   - jamais d'effacement sans avertissement.

   > **Le propriétaire change sa règle du 2026-11-18 en connaissance de cause** (2026-11-19). Elle disait « jamais de perte de données pour un impayé ». Elle prévoit désormais un effacement, annoncé, quatre mois après l'échéance. Sa raison : « Garder éternellement les données d'un commerçant parti est une charge et un risque. »
   >
   > **Deux conditions, gardées par le propriétaire :**
   > - **aucun effacement avant que l'export CSV existe** (échéance du 2027-01-31) — sinon « l'export reste possible tout du long » serait faux ;
   > - **une donnée effacée survit encore 30 jours dans les sauvegardes chiffrées de la nuit.** L'effacement n'est complet qu'à leur expiration. Cette phrase doit figurer dans la FAQ.

## Pourquoi ces chiffres

50 modifications nous coûtent **1,30 $** (mesuré : 0,026 $ par modification utilisable, échecs compris ; voir `elite-protocol/RAPPORT_RETOUCHE_PHARMA.md`). Nous ne sommes pas perdants, même avec les refus. Un lot de 5 $ nous coûte 1,30 $. 20 $ plutôt que 25 $ : Replit et Base44 sont à 20 $, Lovable et Bolt à 25 $ avec des produits plus mûrs. On montera quand on l'aura mérité.

## Comment on encaisse

- **Avant Dary** : activation **manuelle**. Le commerçant paie par Airtel Money ou Moov Money au numéro de l'entité tchadienne ; l'administrateur active l'abonnement ou le lot avec la référence de la transaction. Le registre des paiements est conçu avec un **fournisseur interchangeable**.
- **Après Dary** : Stripe pour les cartes, sous l'entité québécoise. Libellé sur le relevé de carte : `DERIBFY.COM`.
- **Mobile money intégré** : selon les devis demandés (Monerails, Bizao, CinetPay).

## Tranché

- **Retoucher l'appli gratuite** : trois retouches gratuites, puis l'abonnement (2026-11-18).
