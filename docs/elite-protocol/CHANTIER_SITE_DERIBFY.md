# Chantier — le site deribfy.com (consigné le 2026-11-18, PAS construit)

Demande du propriétaire après comparaison avec replit.com. **Tout passe après Stripe, sauf le point 2, prérequis de Stripe.**

| # | Demande | Estimation |
|---|---|---|
| 1 | Pied de page en quatre colonnes : Produit · Ressources · Entreprise · Légal ; « © 2026 Dougouma IA. Tous droits réservés. » | 1 demi-journée |
| 2 | **Prérequis de Stripe** : politique de remboursement, et ce que Stripe demande d'autre (ci-dessous) | 1 à 2 demi-journées de travail, plus les textes et informations du propriétaire |
| 3 | Emplacement des liens sociaux ; **aucune icône tant que le compte n'existe pas** | 1 demi-journée |
| 4 | Les quatre cartes portent l'explication (un clic ouvre la carte, une phrase, l'exemple de la boîte de saisie change) ; le bloc « mode d'emploi » disparaît. **Deux maquettes avant toute ligne de code** | 1 demi-journée (maquettes) + 2 (construction) |

## Point 2 — ce que Stripe demande, et ce que le site montre (relevé le 2026-11-18)

Sources : *Website checklist* et *Account checklist* de la documentation Stripe ; pages de deribfy.com lues le même jour.

| Exigence Stripe | deribfy.com aujourd'hui |
|---|---|
| Politique de **remboursement** | **absente** (`/refund` et `/remboursement` en 404) ; les CGU ne parlent que des remboursements de VOS clients |
| Politique d'**annulation** (abonnements) | présente dans les CGU (« l'annulation prend effet à la fin de la période ») — à rendre visible, page dédiée ou section nommée |
| Contact du service client, **plusieurs moyens**, pas seulement un formulaire | seulement `contact@deribfy.com` ; **pas de téléphone**, `/contact` en 404 |
| Adresse de l'entreprise (recommandée) | **absente** |
| Nom de l'entreprise, cohérent avec le compte Stripe et le descripteur bancaire | **« Dougouma IA » n'apparaît nulle part** (CGU de droit québécois, « Deribfy ») |
| Devise des prix | présente : « Tous les prix sont en dollars canadiens (CAD) » |
| Description de ce qui est vendu | présente (`/pricing`) |
| Conditions des promotions | la création gratuite d'une première application est une promotion : ses conditions doivent être écrites là où on l'accepte |
| Sécurité du paiement (HTTPS, mention que les cartes sont traitées par Stripe) | HTTPS oui ; mention absente |
| Politique de confidentialité | présente (`/privacy`) |
| Livraison / retours | sans objet (service numérique) — à dire explicitement |

**Ce qui revient au propriétaire** (Deribfy ne l'invente pas) : les conditions de remboursement, un numéro de téléphone ou un canal de discussion, l'adresse, le nom légal exact, et le pays d'immatriculation de Dougouma IA, qui doit être un pays où Stripe ouvre des comptes.
