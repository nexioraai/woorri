# L'achat de preuve Stripe : « Gestion de stock » (au plus tard le 2026-12-01)

> Réécrit le 2026-11-22. Stripe est en **mode réel**. C'est un vrai paiement de 20 $ US, remboursé en entier ensuite.
>
> **Youssouf fait tous les gestes** : paiement, remboursement, réglages. Claude Code ne paie rien, ne rembourse rien, n'écrit rien chez Stripe ni dans la base. Il lit seulement : le journal Vercel, la base en lecture seule, et Stripe par des lectures (GET).
>
> L'échéance est inscrite dans `docs/ECHEANCES.md`.

**L'essai :**
- compte **`contact@deribfy.com`** (non exempté : sans paiement, « Publier » est refusé) ;
- appli **« Gestion de stock »** (`d925850b-9fe2-4a74-9d3e-5c11f6ffe21d`).

**État lu le 2026-11-22, avant l'essai :** l'appli est livrée et jamais publiée. Elle n'a ni compteur ni paiement, et le compte n'a pas encore de fiche Stripe.

## A. Les préalables, dans l'ordre (chacun se vérifie)

| # | Geste (Youssouf) | Ce qu'il doit voir si c'est bon |
|---|---|---|
| A1 | Rien : Claude Code annonce que le commit du cycle de vie est en production | le message donne le commit et « READY » |
| A2 | Éditeur SQL de nexiora-ai : appliquer `apps/web/supabase/sql/stripe_cycle_de_vie.sql` | « Success. No rows returned » |
| A3 | Même éditeur : lancer `apps/web/supabase/sql/stripe_cycle_de_vie_verification.sql` | une **erreur** qui commence par « VERIFICATION_OK : annulée, dépubliée… ». C'est voulu : l'erreur annule tout. Toute autre erreur : arrêter et me la montrer |
| A4 | Stripe → Développeurs → Webhooks → point `https://www.deribfy.com/api/stripe/webhook` → *Modifier les événements* : **ajouter `charge.refunded` et `charge.dispute.created`** | le point écoute **8** événements : les 6 d'aujourd'hui, plus ces deux-là |
| A5 | Ouvrir la carte pour le compte d'essai : `abonnement_carte` doit contenir `contact@deribfy.com`, ou valoir `tous` | dans l'atelier de « Gestion de stock », le bouton dit **« Publier — 20 $ US / mois »** |

Sans A2, un remboursement d'appli rend 500 : Stripe renvoie l'avis pendant 3 jours, et rien ne se coupe en attendant.

Sans A4, Stripe n'envoie même pas l'avis du remboursement. C'est l'état mesuré le 2026-11-22 : le point de terminaison n'écoute ni `charge.refunded` ni `charge.dispute.created`.

## B. L'achat

| # | Geste | Ce qu'il doit voir si c'est bon |
|---|---|---|
| B1 | Se connecter avec `contact@deribfy.com` et ouvrir l'atelier de « Gestion de stock » | le bouton **« Publier — 20 $ US / mois »** |
| B2 | Clic sur ce bouton | la page Stripe montre « Deribfy — Application » et **20 $ US par mois**. Si Stripe propose la monnaie locale (CAD), noter le montant et la devise affichés |
| B3 | Payer avec une vraie carte | Stripe confirme, puis revient seul à l'atelier, avec `?paiement=recu` dans l'adresse |
| B4 | Attendre, sans recliquer | d'abord « Paiement reçu par Stripe — l'activation arrive dans quelques secondes. », puis, en moins d'une minute, **« Abonnement actif. Merci ! »** et **« Abonnement actif : votre application peut être publiée. »** |
| B5 | « Publier maintenant », choisir le nom public | l'appli s'ouvre à **`https://<nom>.deribfy.app`**. Noter ce nom |
| B6 | « Gérer mon abonnement » | le portail Stripe montre l'abonnement **actif** et une facture **payée** de 20 $ US |

**Si B4 dit « l'activation tarde » au bout d'une minute : NE PAS repayer** (la page de paiement le refuserait de toute façon : un abonnement est déjà en cours). M'écrire l'heure.

**Ce que je lis après B6 (lecture seule) :**
- journal Vercel : `[stripe] avis reçu invoice.paid evt_…`, sans « Handler error » ;
- `app_paiements` : une ligne `stripe`, `reference = in_…`, `objet = abonnement`, **20 USD** ;
- `app_compteurs` : l'appli est `abonnee`, et `paye_jusqu_au` vaut la fin de la période Stripe ;
- Stripe (GET) : l'abonnement porte `deribfy_type = application` et `deribfy_app_id = d925850b…` ; la facture est en USD, `amount_paid = 2000`.

## C. Le remboursement total

| # | Geste | Ce qu'il doit voir si c'est bon |
|---|---|---|
| C1 | Stripe → Paiements → le paiement de 20 $ → **Rembourser** → **montant total** | Stripe : « Remboursé ». **Ne pas annuler l'abonnement à la main** : c'est Deribfy qui doit le faire, et c'est ce qu'on vérifie |
| C2 | Une minute plus tard, recharger `https://<nom>.deribfy.app` | **« introuvable »** : l'appli est dépubliée |
| C3 | Stripe → Clients → `contact@deribfy.com` → abonnement | **Annulé**, sans geste de Youssouf |
| C4 | Atelier de « Gestion de stock » | le bouton redevient **« Publier — 20 $ US / mois »** : l'abonnement n'est plus actif |
| C5 | `/admin`, rubrique anomalies, et la boîte de `issayamiyoussouf@gmail.com` | une ligne et un courriel **« Anomalie checkout : stripe_remboursement_application »**, avec la facture, l'appli et `appli_depubliee = true` |

**Ce que je lis après C5 (lecture seule) :**
- journal Vercel : `[stripe] avis reçu charge.refunded evt_…`, puis `cycle d'une appli charge.refunded … → annulee_depubliee` ;
- `app_paiements` : une **seconde** ligne, `objet = annulation`, `reference = annulation:in_…`, 20 USD, qui renvoie à la ligne payée (`annule`). La première ligne est intacte : le registre est en ajout seul ;
- `app_compteurs` : `paye_jusqu_au` est passé (vers l'heure du remboursement) ;
- `app_generations` : `publication_jeton` est vide ; le nom public reste réservé à l'appli ;
- `stripe_avis_traites` : l'avis du remboursement y est noté ;
- Stripe (GET) : l'abonnement est `canceled` et le paiement `refunded = true`.

**Contre-épreuve (facultative, sans rien payer) :** renvoyer l'avis `charge.refunded` depuis Stripe (Webhooks → l'événement → *Renvoyer*). Le journal doit dire `avis déjà traité … : rien de plus`. Aucune seconde ligne, aucun second courriel.

## D. Si quelque chose ne va pas

- **Payé, rien d'activé (B4).** Un courriel « stripe_facture_application » arrive, et une ligne s'inscrit dans `/admin`. Le remède : une fois la cause corrigée, **renvoyer** l'avis `invoice.paid` depuis Stripe. C'est sans risque : la référence est la facture, et un renvoi ne compte qu'une fois.
- **Remboursé, toujours en ligne (C2).** Vérifier A2 (fonction appliquée) et A4 (événement écouté). Le journal Vercel dit lequel manque :
  - aucune ligne `charge.refunded` : c'est A4 ;
  - « Handler error … annuler_paiement_stripe » : c'est A2.

  Une fois corrigé, renvoyer l'avis.
- **Abonnement pas annulé (C3).** Le journal le dit. Renvoyer l'avis refait l'annulation, sans seconde ligne.

## Ce que l'essai ne prouve pas

- **Le renouvellement du mois suivant** (le second `invoice.paid`) : il viendrait trente jours plus tard, et l'abonnement est annulé au remboursement. Il est prouvé par les tests et par la preuve SQL seulement.
- **Un paiement mensuel échoué, un remboursement partiel, une contestation** : ils ne se provoquent pas sans risque en mode réel. Ils sont prouvés par les tests (avis signés localement) seulement.
