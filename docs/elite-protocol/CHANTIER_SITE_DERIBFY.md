# Chantier — le site deribfy.com (consigné le 2026-11-18, PAS construit)

Demande du propriétaire après comparaison avec replit.com. **Tout passe après Stripe, sauf le point 2, prérequis de Stripe.**

| # | Demande | Estimation |
|---|---|---|
| 1 | Pied de page en quatre colonnes : Produit · Ressources · Entreprise · Légal ; « © 2026 Dougouma IA. Tous droits réservés. » | 1 demi-journée |
| 2 | **Prérequis de Stripe** : politique de remboursement, et ce que Stripe demande d'autre (ci-dessous) | 1 à 2 demi-journées de travail, plus les textes et informations du propriétaire |
| 3 | Emplacement des liens sociaux ; **aucune icône tant que le compte n'existe pas** | 1 demi-journée |
| 4 | Les quatre cartes portent l'explication (un clic ouvre la carte, une phrase, l'exemple de la boîte de saisie change) ; le bloc « mode d'emploi » disparaît. **Deux maquettes avant toute ligne de code** | 1 demi-journée (maquettes) + 2 (construction) |

## Point 4 précisé (2026-11-18, vu sur base44.com)

- **a) Une section entière par produit**, pas quatre cartes serrées : Site web, Boutique en ligne, Dropshipping, Application. Chacun a son titre, son paragraphe et son bouton, et les sections sont séparées par une bande de couleur. Cette structure se lit sur un téléphone.
- **b) Une FAQ**, que nous n'avons pas du tout. La question la plus importante pour nous : « Mes données sont-elles en sécurité ? ». Un pharmacien qui met sa liste de clients en ligne se la posera, et personne ne sera là pour lui répondre.
  - Brouillon de cinq questions donné au propriétaire le 2026-11-18, à corriger par lui.
  - **Attention à la vérité du texte :** la sauvegarde nocturne chiffrée couvre aujourd'hui la base de **Deribfy** (nexiora-ai), **pas encore** celle des applications. Ce chantier figure dans l'ordre des cinq semaines. La FAQ ne doit pas promettre la sauvegarde des données des applications avant qu'elle existe et soit prouvée par une restauration d'essai.

**RÈGLE DE LA FAQ (propriétaire, 2026-11-18) : aucune phrase ne s'écrit sans que la chose soit CONSTRUITE et PROUVÉE. Une FAQ publique est un engagement, pas un brouillon.**

- **« 30 jours en ligne, données gardées 90 jours »** : à écrire (c'est là que nous faisons mieux que les concurrents), mais **la FAQ ne se publie pas avant que le chemin hors-ligne soit construit et prouvé** (échéance `docs/ECHEANCES.md`, avant le 2027-01-31).
- **Téléchargement** : la phrase devient « vous pouvez télécharger le code de votre application », et seulement après que le propriétaire l'a testée en production. Mesuré le 2026-11-18 (localement, sur le document de pharma) : l'archive contient le code, `schema.sql`, `politiques.sql` et un `README`, et **aucune donnée**. L'export des données est consigné dans `docs/ECHEANCES.md`.
- **Sauvegarde** : ne jamais écrire que les données des applications sont sauvegardées tant que la sauvegarde de la base des œuvres n'est pas construite et prouvée par une restauration d'essai.

Rang inchangé : **après Stripe**.

## Point 2 — ce que Stripe demande, et ce que le site montre (relevé le 2026-11-18)

Sources : *Website checklist* et *Account checklist* de la documentation Stripe ; pages de deribfy.com lues le même jour.

| Exigence Stripe | deribfy.com aujourd'hui |
|---|---|
| Politique de **remboursement** | **absente** (`/refund` et `/remboursement` en 404) ; les CGU ne parlent que des remboursements de VOS clients |
| Politique d'**annulation** (abonnements) | présente dans les CGU (« l'annulation prend effet à la fin de la période ») — à rendre visible, page dédiée ou section nommée |
| Contact du service client, **plusieurs moyens**, pas seulement un formulaire | seulement `contact@deribfy.com` ; **pas de téléphone**, `/contact` en 404 |
| Adresse de l'entreprise (recommandée) | **absente** |
| Nom de l'entreprise, cohérent avec le compte Stripe et le descripteur bancaire | **fait le 2026-11-18** : « Dougouma IA », immatriculée au Québec, **NEQ 2281989782** (donnés par le propriétaire) — dans les Conditions, la Confidentialité, les Témoins et « À propos » ; l'ancien « Dougma IA Technologies » a disparu du dépôt |
| Devise des prix | présente : « Tous les prix sont en dollars canadiens (CAD) » |
| Description de ce qui est vendu | présente (`/pricing`) |
| Conditions des promotions | la création gratuite d'une première application est une promotion : ses conditions doivent être écrites là où on l'accepte |
| Sécurité du paiement (HTTPS, mention que les cartes sont traitées par Stripe) | HTTPS oui ; mention absente |
| Politique de confidentialité | présente (`/privacy`) |
| Livraison / retours | sans objet (service numérique) — à dire explicitement |

**Ce qui revient au propriétaire** (Deribfy ne l'invente pas) : les conditions de remboursement, un numéro de téléphone ou un canal de discussion, l'adresse postale au Québec. Le nom légal (Dougouma IA), le pays d'immatriculation (Québec, Canada) et le NEQ (2281989782) sont donnés depuis le 2026-11-18.
