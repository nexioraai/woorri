# Quota et activation — le plan, en options (v3, 2026-11-19)

> À lire par le propriétaire avant toute ligne de code. **Rien n'est construit.**
> Sources : `docs/MODELE_PRIX.md` (le modèle), `GENERATION_OUVERTE_ET_QUOTA.md` §3 (l'état des lieux du 2026-11-17).
> v2 : prix définitifs en USD ; identité du registre corrigée par la mesure Stripe du 2026-11-19 ; vue de la consommation et compteur ajoutés (demande du propriétaire).
> **v3 (corrections du propriétaire, 2026-11-19) : l'activation est AUTOMATIQUE par défaut** — le bouton manuel ne sert qu'au mobile money tchadien, tant qu'aucun agrégateur n'est signé ; **le 50, le 3, la durée, le prix en FCFA et les numéros sont des RÉGLAGES**, modifiables sans toucher au code ; la consommation réelle des premiers clients se mesure avant de figer quoi que ce soit.
>
> **Réponses déjà données** : 1A · 2 comme proposé · 3A · 4 réécrit selon l'activation automatique · 5A · 6 A+C · 7A (voir son ordre) · **9A, inclus dans ce chantier**. Durée : **30 jours à partir de l'activation**. Les 10 applis publiées : **payées jusqu'au 31 décembre 2026**. **Pas encore donnés** : le prix en FCFA et les numéros Airtel/Moov (décision de marché, cette semaine) — le chemin se construit sans eux.

## Ce que le chantier doit rendre vrai

1. Une appli gratuite par compte, visible par son auteur seul ; **10 modifications gratuites** dessus (réglage, passé de 3 à 10 le 2026-11-19).
2. Publier demande l'abonnement : **20 $ US par mois et par application publiée, 50 modifications par mois**.
3. Une modification refusée ne compte pas. Le compteur se voit **avant** de cliquer.
4. À zéro, l'appli publiée reste en ligne : elle ne se modifie plus, c'est tout.
5. **Un paiement arrive → l'abonnement devient actif, le compteur repart, sans toi.** Par Stripe, automatiquement. Par Airtel ou Moov, à la main avec la référence, **seulement** tant qu'aucun agrégateur (Monerails, Bizao, CinetPay) n'est signé — le jour où il l'est, ce chemin devient automatique sans refaire le registre.
6. Le lot de modifications supplémentaires, par les mêmes deux chemins.
6 bis. **Aucun chiffre du modèle n'est écrit dans le code** : modifications incluses, modifications gratuites, durée, prix du lot, prix en FCFA, numéros de paiement — tous des réglages.
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

## Décision 3 — Le registre des paiements : deux sources dès le départ

**Tranché : A.** Un registre où l'on n'efface rien, rattaché au **compte** et à l'**appli**.

| Champ | Ce qu'il porte |
|---|---|
| `owner_id`, `app_id` | qui paie, pour quoi — jamais la fiche Stripe (une par site, mesuré) |
| `source` | `automatique` ou `manuelle` |
| `fournisseur` | `stripe` (automatique) ; `especes`, `airtel`, `moov` (à la main) ; `offert` (les 10 applis publiées, jusqu'au 31 décembre 2026) ; demain `cinetpay`, `bizao`, `monerails` (automatique) |
| `reference` | **unique par fournisseur** : l'identifiant de la facture Stripe, ou la référence de la transaction mobile money. Le même paiement reçu deux fois (Stripe renvoie ses événements) ne compte qu'une fois |
| `objet` | `abonnement` ou `lot` |
| `montant`, `devise` | ce qui a été payé, tel quel (USD par Stripe, XAF par mobile money) |
| `jusqu_au` | la date de fin que ce paiement a posée |
| `saisi_par` | le webhook, ou ton compte pour une saisie manuelle |
| `annule` | une ligne d'annulation pointe la fautive ; on n'efface jamais |

**Une seule fonction SQL**, `enregistrer_paiement(...)`, appelée par TOUTES les sources : elle écrit la ligne, prolonge la date, remet le compteur à zéro — ou ne fait rien si la référence existe déjà. Un futur agrégateur mobile money appellera la même fonction depuis son propre webhook : **rien à réécrire**, seulement une porte d'entrée de plus.

## Décision 4 — L'activation : automatique par défaut, manuelle pour le seul mobile money

**① Stripe, automatique (le chemin par défaut).**
- Le commerçant clique « Publier », paie 20 $ US par la page de paiement Stripe (le prix `STRIPE_PRICE_APPLICATION` existe déjà, vérifié).
- Stripe prévient Deribfy (`invoice.paid`, déjà reçu par le webhook pour les domaines) → `enregistrer_paiement(source automatique, fournisseur stripe, référence = la facture)` → appli payée jusqu'à la fin de la période Stripe, compteur à zéro.
- Chaque mois, le renouvellement refait la même chose. Toi : rien.
- Un paiement refusé par la banque n'écrit rien : l'impayé suit la règle du modèle de prix.

**② Espèces et mobile money, à la main (le seul cas : un client que la carte ne couvre pas, en attendant un agrégateur).**
Dans `/admin`, réservé aux adresses d'administration, vérifié côté serveur :
1. chercher l'appli (nom publié ou adresse du propriétaire) ;
2. abonnement ou lot ;
3. espèces, Airtel ou Moov, et **la référence, obligatoire** (le numéro de la transaction, ou celui du reçu remis pour des espèces) ;
4. le montant reçu en FCFA — comparé au prix réglé, l'écart est dit avant de confirmer ;
5. une confirmation dessinée : « Activer pharma jusqu'au 19 décembre 2026 ? » ;
6. le résultat : la nouvelle date et la ligne du registre.
La même référence saisie deux fois est refusée, avec le nom de l'appli qu'elle a déjà activée.

**③ Le jour où un agrégateur est signé** : son webhook appelle `enregistrer_paiement(source automatique, fournisseur cinetpay…)`. Le bouton manuel reste pour les cas que l'agrégateur ne couvre pas.

## Décision 5 — Ce que voit le commerçant dans l'atelier

**Mesuré aujourd'hui :** après une retouche, l'atelier affiche « (0,026 $ dépensés) », et chaque ligne de l'historique porte son montant (`atelier/[id]/page.tsx:396` et `:743`). C'est notre coût, pas son prix.

| | **A. Le compteur partout, les dollars pour l'administration seule (recommandé)** | B. Le compteur partout, les dollars supprimés pour tous |
|---|---|---|
| Le bouton | « Modifier — **37 modifications restantes** » ; sur l'appli gratuite « **10 modifications gratuites restantes** » | idem |
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

## Décision 7 — Une seule fiche Stripe par compte

| | **A. Une fiche par compte Deribfy, retrouvée avant d'en créer (recommandé)** | B. Laisser une fiche par site |
|---|---|---|
| Comment | `profiles.stripe_customer_id` ; `checkout` et l'achat de domaine la retrouvent ; les anciennes fiches restent, rattachées à leurs sites | rien |
| Quand | **pour les applis : dès ce chantier** — la page de paiement des applis est neuve (décision 9), elle naît avec la fiche du compte. **Pour les sites et les domaines : quand on reprendra leur paiement** — aujourd'hui une fiche par site fonctionne (mesuré, aucun client lésé) ; la reprendre maintenant serait toucher un paiement qui marche | — |
| Ce qu'il faut garder | le webhook d'annulation reste ciblé sur les sites **de l'abonnement annulé** (métadonnée du site), pas sur toute la fiche — sinon une seule fiche par compte élargirait le rayon d'une annulation à tous les sites de la personne | — |

## Décision 8 — Les chiffres sont des réglages, et la consommation réelle se mesure

**Tranché par le propriétaire** : « Le 50 n'est pas une vérité » (1,30 $ de coût mesuré, une seule donnée d'usage : pharma, dix versions).

| Réglage | Valeur de départ | Où il se change |
|---|---|---|
| Modifications incluses par période | 50 | `/admin`, sans déploiement |
| Modifications gratuites (appli gratuite) | 3 | `/admin` |
| Durée d'une période | 30 jours | `/admin` |
| Lot supplémentaire : taille, prix USD | 50, 5 $ | `/admin` |
| Prix mensuel en FCFA (mobile money) | **vide** — le bouton manuel refuse tant qu'il l'est | `/admin` |
| Numéros Airtel / Moov, motif | **vides** — la page de paiement ne les affiche pas tant qu'ils le sont | `/admin` |

- Une table de réglages **dont chaque changement est historisé** (quoi, avant, après, qui, quand) : tu verras quand le 50 est devenu 40 et pourquoi.
- Un changement s'applique à la **période suivante** de chaque appli, jamais au milieu : un commerçant ne voit pas son compteur fondre sous ses yeux.
- Le prix en USD de Stripe, lui, vit dans Stripe : le réglage dit ce que la page **affiche**, la variable dit ce que Stripe **facture**. Un test vérifie qu'ils disent le même chiffre.

**La mesure : RETIRÉE du chantier** (propriétaire, en échange de la décision 9). La vue par tranches attendra d'avoir de vrais clients à mesurer. Ce qui reste : les modifications sont enregistrées une par une (décision 1), donc la mesure pourra se faire plus tard sur des données déjà là, sans rien reconstruire.

## Décision 9 — Le paiement Stripe des applis : TRANCHÉ, maintenant

**A, dans ce chantier** (propriétaire, 2026-11-19). Sa raison : « sans page de paiement Stripe pour les applis, l'activation automatique qu'on vient de décider est construite et dormante. Chaque client passerait par mon bouton manuel. Ce n'est pas un chantier de plus, c'est la pièce qui manque à celui-ci. »

- « Publier » ouvre le paiement Stripe à 20 $ US (`STRIPE_PRICE_APPLICATION`, vérifié) ; le webhook active seul (`invoice.paid`).
- **Ce que le propriétaire retire pour tenir sa règle** : la **vue d'analyse de consommation par tranches** dans `/admin` (décision 8). Le réglage reste modifiable sans déploiement — « c'est ça qui compte » ; mesurer finement attendra d'avoir de vrais clients à mesurer.

## Qui paie comment

| Qui | Chemin | Activation |
|---|---|---|
| Une carte bancaire (Stripe couvre le pays) | page de paiement Stripe | **automatique** |
| Un client qui ne peut pas payer par carte — **le Tchad n'est pas couvert par Stripe** | il contacte le propriétaire et paie **en espèces** (ou par Airtel / Moov) | **à la main**, bouton `/admin` : fournisseur `especes`, `airtel` ou `moov`, référence obligatoire (pour les espèces : le numéro du reçu remis) |
| Demain, un agrégateur signé (Monerails, Bizao, CinetPay — devis demandés le 2026-11-19) | sa page de paiement | **automatique**, par la même fonction `enregistrer_paiement` |

Les espèces ne marchent qu'avec des gens que le propriétaire peut rencontrer : c'est pourquoi l'agrégateur reste à signer, même si rien n'en dépend pour démarrer.

## Hors chantier, consigné

- **À renommer quand on touchera au registre des paiements** (propriétaire, 2026-11-19) : `sites.subscription_status = 'offline'` veut dire « **en ligne, payé hors Stripe** » — écrit par le bouton admin `site-publish-override` (mesuré : 7 sites, journal `checkout_anomalies`). Le nom dit le contraire de ce qu'il fait ; il fera prendre une mauvaise décision à quelqu'un un jour.
- **Ne pas corriger sans le redemander** : le titre du site « AlloufBusines » (un seul s) est probablement une faute de frappe ; son adresse sera `alloufbusiness.deribfy.app`, comme son domaine.

- **Quand on reprendra le paiement des sites et des domaines** (décision 7) : l'achat de domaine (`api/domains/purchase`) prend la première fiche Stripe trouvée par adresse — avec plusieurs fiches pour une même personne, laquelle est arbitraire. Aucun client n'en souffre aujourd'hui (une seule personne a plusieurs fiches : le propriétaire).

## Ce qui reste à TOI avant la première activation

1. **Le prix en FCFA** — décision de marché, cette semaine. Le chemin se construit sans lui : réglage vide = bouton manuel refusé.
2. **Les numéros Airtel et Moov** et le motif — même chose.
3. ~~La durée~~ : **30 jours à partir de l'activation** (tranché).
4. ~~Les 10 applis publiées~~ : **payées jusqu'au 31 décembre 2026** (tranché).
5. ~~La décision 9~~ : **A** (tranché).

## Ordre de construction et preuves

| Étape | Preuve |
|---|---|
| ① Tables + fonctions SQL (réservation, libération, activation), appliquées par toi | concurrence sur un Postgres jetable (deux réservations simultanées : une passe) ; `anon`/`authenticated` n'y touchent pas |
| ② `retoucher` et `direct` réservent avant de payer ; refus = libération | tests de route ; réservation retirée → rouge |
| ③ Le compteur dans l'atelier, les dollars pour l'administration seule | rendu testé ; vu par toi en production |
| ④ `enregistrer_paiement` + le webhook Stripe des applis (si 9A) | même facture reçue deux fois → une seule ligne ; facture d'une autre appli → refusée |
| ④ bis Le bouton manuel mobile money dans `/admin` | double référence refusée ; non-admin → 403 ; prix FCFA vide → refus |
| ④ ter Les réglages dans `/admin` | changement historisé ; s'applique à la période suivante ; page et Stripe disent le même prix |
| ⑤ La consommation dans la page Compte | jeton d'une AUTRE appli → refusé ; vu par toi sur pharma |
| ⑥ Publier demande l'abonnement, avec le chemin de paiement | parcours complet en production, sur un compte de test, par toi |
| ⑦ Les quatre textes du site | relus par toi |

Estimation : **5 à 5,5 jours** (9A inclus, vue de consommation retirée). Non mesurée. Aucune dépense de modèle nécessaire pour prouver.

## Pour répondre d'un coup

> Tout est tranché. Restent, cette semaine : le prix en FCFA et les numéros Airtel / Moov — réglages vides en attendant.
