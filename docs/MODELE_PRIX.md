# Le modèle de prix de Deribfy (décidé le 2026-11-18)

> Consigné **avant** toute ligne de code de paiement. Rien de Stripe n'est construit.

## Le modèle

| | |
|---|---|
| **Une application gratuite** | générée, visible par son auteur seul |
| **Retoucher l'appli gratuite** | **3 modifications gratuites**, puis l'abonnement (décidé le 2026-11-18). Une première génération est rarement juste du premier coup : quelqu'un qui ne peut pas y toucher repart en pensant que ça ne marche pas. Coût : environ 0,21 $ par visiteur qui essaie (0,136 $ + 3 × 0,026 $) ; une seule appli gratuite par compte |
| **Publier** | demande l'abonnement |
| **Prix** | **20 $ par mois**, par application publiée, **affiché en dollars américains**. Deribfy est universel, pas tchadien. Le dollar US est la devise de base pour que Stripe puisse afficher la monnaie locale du visiteur. Le prix en FCFA d'un paiement à la main est un **réglage** (décision de marché du propriétaire : « 12 000 FCFA à Moundou ne valent pas 20 $ à Montréal ») |
| **Inclus** | **50 modifications par mois** |
| **Lot supplémentaire** | 50 modifications pour 5 $ — taille et prix sont des **réglages** ; par Stripe ou à la main, comme l'abonnement |
| **Une deuxième application** | un second abonnement |

L'unité s'appelle **« modification »**, jamais « crédit » ni « jeton ». C'est une décision de produit : les concurrents comptent des jetons que personne ne comprend.

## Les règles

1. **Une modification refusée ne compte pas.** Nous la payons au fournisseur, mais la facturer serait faire payer notre propre panne.
2. **Le compteur se voit AVANT de cliquer** : « 3 modifications gratuites restantes » avant l'abonnement, « 37 modifications restantes ce mois-ci » après (50 par mois).
3. **À zéro, l'application publiée RESTE EN LIGNE.** Elle ne peut plus être modifiée, c'est tout. On ne coupe jamais le commerce de quelqu'un parce qu'il a épuisé un quota.
4. **Abonnement non renouvelé** — c'est une règle, pas un réglage (précisée par le propriétaire le 2026-11-19). Voir `docs/ECHEANCES.md` :
   - **jour 1**, l'échéance passe sans paiement (par Stripe : le prélèvement échoue ; à la main : le paiement n'arrive pas) : **les modifications s'arrêtent, l'application reste en ligne** ;
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

- **Par défaut, automatique** : Stripe pour les cartes. Un paiement arrive, l'abonnement devient actif, le compteur repart — sans le propriétaire (décision du 2026-11-19 : « je m'en sors à la main avec dix clients, pas avec mille »). Libellé sur le relevé de carte : `DERIBFY.COM`.
- **À la main, pour ceux que la carte ne couvre pas** — Stripe ne couvre pas le Tchad : le client contacte le propriétaire et paie en espèces, ou par Airtel Money / Moov Money ; l'administrateur active avec la référence (transaction ou reçu).
- **Demain, automatique aussi** : un agrégateur mobile money (Monerails, Bizao, CinetPay ; devis demandés le 2026-11-19) se branche sur le même registre, qui accepte les deux sources dès le départ.
- Voir `docs/elite-protocol/PLAN_QUOTA_ACTIVATION.md`.

## Tranché

- **Retoucher l'appli gratuite** : trois retouches gratuites, puis l'abonnement (2026-11-18).
