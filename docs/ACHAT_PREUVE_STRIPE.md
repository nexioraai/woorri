# L'achat de preuve Stripe d'une application (à faire au plus tard le 2026-12-01)

> Écrit le 2026-11-21. Stripe est en **mode réel** et le compte n'a **pas de clés de test** : cet achat est un vrai paiement de 20 $ US, remboursé ensuite. C'est le propriétaire qui le fait, depuis son téléphone ou son ordinateur. Claude Code ne paie rien et n'allume rien. Il lit seulement : les journaux Vercel, la base en lecture seule, et Stripe par des lectures (GET).
>
> L'échéance est inscrite dans `docs/ECHEANCES.md`.

## Pourquoi cet achat

Avant lui, le chemin « paiement par carte d'une appli » est prouvé **par les tests seulement**. Aucune session de paiement d'application n'a jamais été ouverte sur le compte Stripe (lu le 2026-11-21 : zéro session marquée `application`, et un seul abonnement actif, celui du site à 15 CAD). Cet achat prouve la chaîne entière, sur le vrai compte, avec le vrai webhook.

## Avant de commencer

- **Le compte qui paie n'est pas exempté.** `issayamiyoussouf@gmail.com` et `abbasissay@gmail.com` sont hors quota : pour eux, « Publier » publie sans paiement, donc l'essai ne prouverait rien. On utilise **`contact@deribfy.com`**.
- **Il faut une application LIVRÉE** de ce compte, non payée (son compteur n'est pas « abonnée »).
- **L'interrupteur `abonnement_carte`** vaut `tous`, ou contient l'adresse de ce compte.
- Noter l'heure de début.

## Pas à pas : ce qui doit s'afficher

1. **Atelier de l'appli** (`www.deribfy.com/atelier/<id>`), connecté avec `contact@deribfy.com`. Le bouton « Publier » porte le prix lu chez Stripe : **20 $ US / mois**.
   *Si le bouton dit autre chose (pas de prix, phrase « fermé ») : arrêter, et me l'écrire.*
2. **Clic sur « Publier ».** La page Stripe s'ouvre, avec ces trois éléments :
   - l'abonnement « Deribfy — Application » ;
   - 20 $ US par mois, ou leur conversion en monnaie locale si Stripe la propose (dans ce cas, noter le montant affiché et la devise) ;
   - l'adresse `contact@deribfy.com`.
3. **Payer** avec une vraie carte.
4. **Retour automatique dans l'atelier**, avec `?paiement=recu` dans l'adresse. La phrase « Paiement reçu par Stripe — l'activation arrive dans quelques secondes. » s'affiche, puis en moins d'une minute :
   - **« Abonnement actif. Merci ! »**
   - **« Abonnement actif : votre application peut être publiée. »**, avec « Publier maintenant ».
   *Si, au bout d'une minute, la page dit « l'activation tarde » : NE PAS payer une seconde fois. M'écrire l'heure.*
5. **Publier maintenant.** L'appli reçoit son adresse publique.
6. **« Gérer mon abonnement »** ouvre le portail Stripe. On y voit l'abonnement actif et la facture.

## Ce que Claude Code lit ensuite (lecture seule)

| Où | Ce qui prouve |
|---|---|
| Journal Vercel (`/api/stripe/webhook`) | `[stripe] avis reçu invoice.paid evt_…`, sans « Webhook signature verification failed » ni « Handler error » |
| `app_paiements` | une ligne : `source = automatique`, `fournisseur = stripe`, `reference = in_…` (la facture), `montant = 20`, `devise = USD`, `jusqu_au` = fin de la période Stripe |
| `app_compteurs` | l'appli est `abonnee`, avec `paye_jusqu_au` = la même date, `limite = 100` et `utilisees = 0` |
| Stripe (GET) | l'abonnement porte `deribfy_type = application` et le bon `deribfy_app_id` ; sa facture est en USD, `amount_paid = 2000` ; s'il y a eu conversion, `presentment_details` dit la devise payée |
| `checkout_anomalies` | aucune ligne `stripe_facture_application` |

## Le remboursement (par le propriétaire, dans le tableau de bord Stripe)

1. **Annuler l'abonnement** : Clients → `contact@deribfy.com` → abonnement → *Annuler* → **immédiatement**.
2. **Rembourser** la facture : Paiements → le paiement de 20 $ → *Rembourser* → montant total.

**Ce que le remboursement fait aujourd'hui, et ce qu'il ne fait pas** (mesuré dans le code le 2026-11-21) :
- l'événement `customer.subscription.deleted` d'une appli est **ignoré**. L'appli reste **payée jusqu'à `paye_jusqu_au`**, et elle reste publiée ;
- aucun événement de remboursement (`charge.refunded`) n'est écouté. La ligne de `app_paiements` reste telle quelle : le registre est en ajout seul, et une annulation serait une ligne de plus, que rien n'écrit aujourd'hui ;
- après l'essai, l'appli d'essai reste donc active jusqu'à la fin de la période. C'est sans conséquence pour un compte d'essai. Pour un vrai client remboursé, c'est le défaut décrit dans `docs/ECHEANCES.md`.

Claude Code relit ensuite, en lecture seule :
- chez Stripe, le remboursement (`refunded = true`) et l'abonnement `canceled` ;
- dans le journal, l'avis `customer.subscription.deleted` reçu, sans erreur.

## Si quelque chose ne va pas

- **Payé, rien d'activé.** Une alerte « Anomalie checkout : stripe_facture_application » arrive par courriel : à chaque occurrence une fois le correctif F2 en ligne, une par heure au plus avant lui. Une ligne s'inscrit aussi dans `/admin`, rubrique anomalies. Avant le correctif F1, une facture sans marque ne laissait **aucune trace** : le seul signe était l'atelier qui dit « l'activation tarde ». Le remède : une fois la cause corrigée, **renvoyer l'événement** depuis Stripe (Développeurs → Webhooks → le point `…/api/stripe/webhook` → l'événement `invoice.paid` → *Renvoyer*). L'enregistrement est idempotent, puisque la référence est la facture : renvoyer deux fois ne compte qu'une fois.
- **Deux paiements.** Une fois le correctif F3 en ligne, la page de paiement refuse de s'ouvrir quand l'appli a déjà un abonnement en cours. Avant lui, un second clic sur « Publier » pendant que l'activation tarde ouvre un **second abonnement** : ne pas recliquer. Si c'est arrivé : annuler et rembourser le second abonnement.
