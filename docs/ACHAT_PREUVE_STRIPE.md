# L'achat de preuve Stripe : « Gestion de stock » (au plus tard le 2026-12-01)

> Réécrit le 2026-11-22, puis revu le même jour pour « Publier est Publier » : un seul bouton « Publier », le même dans l'atelier et dans « Mes projets ». Stripe est en **mode réel**. C'est un vrai paiement de 20 $ US, remboursé en entier ensuite.
>
> **Youssouf fait tous les gestes** : paiement, remboursement, réglages. Claude Code ne paie rien, ne rembourse rien, n'écrit rien chez Stripe ni dans la base. Il lit seulement : le journal Vercel, la base en lecture seule, et Stripe par des lectures (GET).
>
> L'échéance est inscrite dans `docs/ECHEANCES.md`.

**L'essai :**
- compte **`contact@deribfy.com`** (non exempté : sans paiement, « Publier » est refusé) ;
- appli **« Gestion de stock »** (`d925850b-9fe2-4a74-9d3e-5c11f6ffe21d`).

**État lu le 2026-11-22, avant l'essai :** l'appli est livrée et jamais publiée, sans nom choisi. Elle a une **base de données** (2 tables) : elle aura donc un compte administrateur et un mot de passe. Elle n'a ni compteur ni paiement, et le compte n'a pas encore de fiche Stripe.

## A. Les préalables, dans l'ordre (chacun se vérifie)

| # | Geste (Youssouf) | Ce qu'il doit voir si c'est bon |
|---|---|---|
| A1 | Rien : Claude Code annonce que le commit « Publier est Publier » est en production | le message donne le commit et « READY » |
| A2 | **Fait le 2026-11-22.** `stripe_cycle_de_vie.sql` appliqué (« Success ») | — |
| A3 | **Fait le 2026-11-22.** Vérification : « ERROR: P0001: VERIFICATION_OK : annulée, dépubliée, période ramenée, 1 ligne, doublon refusé, facture inconnue dite — rien n'est gardé » | — |
| A4 | **Fait le 2026-11-22.** La destination `webhook-live-nexiora` écoute 8 événements, dont `charge.refunded` et `charge.dispute.created` | — |
| A5 | **Fait le 2026-11-22.** `abonnement_carte` contient `contact@deribfy.com` | dans l'atelier ET dans « Mes projets », le bouton dit **« Publier »**, sans prix |

Aucun nouveau SQL pour « Publier est Publier » : le nom choisi va dans la colonne qui existe déjà (`publication_slug`).

## B. L'achat (le nom d'abord, puis Stripe, puis l'appli se publie seule)

| # | Geste | Ce qu'il doit voir si c'est bon |
|---|---|---|
| B1 | Se connecter avec `contact@deribfy.com`, ouvrir **« Mes projets »** | la carte « Gestion de stock » porte un bouton **« Publier »**, sans prix |
| B2 | Clic sur « Publier » | la question **« Adresse publique de « Gestion de stock » : <adresse>.deribfy.app »**, avec un nom proposé. Saisir le nom voulu (minuscules, chiffres, tirets), valider |
| B3 | — | la page Stripe s'ouvre **aussitôt** : « Deribfy — Application », **20 $ US par mois**, le bon courriel. Si Stripe propose la monnaie locale (CAD), noter le montant et la devise |
| B4 | **Ne pas payer** : revenir en arrière (bouton retour de Stripe) | l'atelier dit « Paiement annulé : rien n'a été prélevé, l'application n'est pas publiée. » |
| B4 bis | *(facultatif)* À côté de « Publier », clic sur **« Changer l'adresse »**, saisir un autre nom, valider | l'atelier dit « Adresse choisie : <nouveau nom>.deribfy.app ». Le lien n'existe que tant que l'appli n'a jamais été en ligne |
| B5 | Ouvrir l'atelier de « Gestion de stock », clic sur **« Publier »** | **aucune question** : le nom est gardé, la page Stripe s'ouvre directement. C'est la preuve que les deux boutons font la même chose |
| B6 | Payer avec une vraie carte | Stripe confirme, puis revient seul à l'atelier, avec `?paiement=recu` dans l'adresse |
| B7 | Attendre, **sans cliquer** | sous la barre, l'écran avance **seul** : « Paiement reçu par Stripe — l'activation arrive dans quelques secondes. », puis « Paiement reçu. Publication en cours… », puis **« Votre application est en ligne »**, l'adresse `https://<nom>.deribfy.app` cliquable, et un bouton **« Créer mon mot de passe »** |
| B8 | Clic sur **« Créer mon mot de passe »** | le mot de passe s'affiche **une fois**, avec l'adresse de connexion `admin@<nom>.deribfy.app` et « Notez-le maintenant : il ne se relira pas. » Le noter |
| B9 | Ouvrir l'adresse de l'appli | l'appli s'affiche. **Aucun clic sur « Publier » n'a été nécessaire.** La connexion avec l'adresse et le mot de passe de B8 ouvre ses données |
| B10 | Revenir dans « Mes projets » | la carte montre l'adresse, et un bouton **« Créer / refaire mon mot de passe »** (une appli sans base n'aurait que l'adresse). Ne pas cliquer : il couperait le mot de passe de B8 |
| B11 | « Gérer mon abonnement » (atelier) | le portail Stripe montre l'abonnement **actif** et une facture **payée** de 20 $ US |

**Entre B2 et B6, l'adresse `https://<nom>.deribfy.app` doit répondre « introuvable »** : un nom choisi mais pas payé ne publie rien.

**Si B7 dit « Le paiement est bien reçu, mais la publication automatique n'a pas abouti » :** le paiement est enregistré, la publication non. Un courriel « Anomalie checkout : stripe_publication_application » en dit la raison. Le bouton « Publier » du bandeau publie, sans repasser par Stripe. M'écrire l'heure.

**Si B7 reste sur « Publication en cours… » plus de deux minutes : NE PAS repayer, ne rien cliquer** (la page de paiement le refuserait de toute façon : un abonnement est déjà en cours). L'écran continue de se relire seul pendant trente minutes. M'écrire l'heure.

**Ce que je lis après B11 (lecture seule) :**
- journal Vercel : `[stripe] avis reçu invoice.paid evt_…`, puis `[stripe] appli d925850b… après paiement → publiee`, sans « Handler error » ;
- `app_generations` : `publication_slug` = le nom choisi en B2 (écrit AVANT le paiement), `publication_jeton` rempli (écrit APRÈS) ;
- `app_paiements` : une ligne `stripe`, `reference = in_…`, `objet = abonnement`, **20 USD** ;
- `app_compteurs` : l'appli est `abonnee`, et `paye_jusqu_au` vaut la fin de la période Stripe ;
- Stripe (GET) : **une seule** session payée pour cette appli, malgré les deux ouvertures (B3, B5) ; l'abonnement porte `deribfy_type = application` et `deribfy_app_id = d925850b…` ; la facture est en USD, `amount_paid = 2000`.

## C. Le remboursement total

| # | Geste | Ce qu'il doit voir si c'est bon |
|---|---|---|
| C1 | Stripe → Paiements → le paiement de 20 $ → **Rembourser** → **montant total** | Stripe : « Remboursé ». **Ne pas annuler l'abonnement à la main** : c'est Deribfy qui doit le faire, et c'est ce qu'on vérifie |
| C2 | Une minute plus tard, recharger `https://<nom>.deribfy.app` | **« introuvable »** : l'appli est dépubliée |
| C3 | Stripe → Clients → `contact@deribfy.com` → abonnement | **Annulé**, sans geste de Youssouf |
| C4 | Atelier de « Gestion de stock », clic sur « Publier » | **aucune question de nom**, la page Stripe s'ouvre : l'abonnement n'est plus actif, le nom est gardé. **Ne pas payer** : revenir en arrière |
| C5 | `/admin`, rubrique anomalies, et la boîte de `issayamiyoussouf@gmail.com` | une ligne et un courriel **« Anomalie checkout : stripe_remboursement_application »**, avec la facture, l'appli et `appli_depubliee = true` |

**Ce que je lis après C5 (lecture seule) :**
- journal Vercel : `[stripe] avis reçu charge.refunded evt_…`, puis `cycle d'une appli charge.refunded … → annulee_depubliee` ;
- `app_paiements` : une **seconde** ligne, `objet = annulation`, `reference = annulation:in_…`, 20 USD, qui renvoie à la ligne payée (`annule`). La première ligne est intacte : le registre est en ajout seul ;
- `app_compteurs` : `paye_jusqu_au` est passé (vers l'heure du remboursement) ;
- `app_generations` : `publication_jeton` est vide ; `publication_slug` garde le nom (il reste réservé à l'appli) ;
- `stripe_avis_traites` : l'avis du remboursement y est noté ;
- Stripe (GET) : l'abonnement est `canceled` et le paiement `refunded = true`.

**Contre-épreuve (facultative, sans rien payer) :** renvoyer l'avis `charge.refunded` depuis Stripe (Webhooks → l'événement → *Renvoyer*). Le journal doit dire `avis déjà traité … : rien de plus`. Aucune seconde ligne, aucun second courriel.

## D. Si quelque chose ne va pas

- **Payé, rien d'activé (B7 reste sur l'activation).** Un courriel « stripe_facture_application » arrive, et une ligne s'inscrit dans `/admin`. Le remède : une fois la cause corrigée, **renvoyer** l'avis `invoice.paid` depuis Stripe. C'est sans risque : la référence est la facture, et un renvoi ne compte qu'une fois.
- **Payé, activé, pas publié (B7 dit « n'a pas abouti »).** Le courriel « stripe_publication_application » donne la raison (par exemple une liste lisible par tout le monde ajoutée après le clic). « Publier » publie sans repasser par Stripe.
- **Remboursé, toujours en ligne (C2).** Vérifier A2 (fonction appliquée) et A4 (événement écouté). Le journal Vercel dit lequel manque :
  - aucune ligne `charge.refunded` : c'est A4 ;
  - « Handler error … annuler_paiement_stripe » : c'est A2.

  Une fois corrigé, renvoyer l'avis.
- **Abonnement pas annulé (C3).** Le journal le dit. Renvoyer l'avis refait l'annulation, sans seconde ligne.

## Ce que l'essai ne prouve pas

- **Le renouvellement du mois suivant** (le second `invoice.paid`) : il viendrait trente jours plus tard, et l'abonnement est annulé au remboursement. Il est prouvé par les tests et par la preuve SQL seulement.
- **Un paiement mensuel échoué, un remboursement partiel, une contestation** : ils ne se provoquent pas sans risque en mode réel. Ils sont prouvés par les tests (avis signés localement) seulement.
