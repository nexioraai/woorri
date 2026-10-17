# Contrat du serveur — Marketa

Ce document dit ce que votre serveur doit **garantir**. Il ne dit ni le
langage, ni le cadre, ni la forme de vos routes : ce sont vos décisions.

Il est ÉMIS depuis le contrat de l’application — si l’application change,
ce document change avec elle. Ne le modifiez pas à la main.

## Les données

### profil `ent_profil`
- `fld_profil_nom` · string · obligatoire
- `fld_profil_email` · string · obligatoire
- `fld_profil_mot_de_passe` · string · **SENSIBLE — jamais dans un journal**
- `fld_profil_telephone` · string
- `fld_profil_adresse_livraison` · text
- `fld_profil_ville` · string
- `fld_profil_pays` · enum
- `fld_profil_notifications` · boolean
- `fld_profil_membre_depuis` · date

### marchand `ent_marchand`
- `fld_marchand_nom` · string · obligatoire
- `fld_marchand_logo` · asset
- `fld_marchand_description` · text
- `fld_marchand_ville` · string
- `fld_marchand_verifie` · boolean · obligatoire
- `fld_marchand_note` · decimal
- `fld_marchand_telephone` · string
- `fld_marchand_ventes` · number

### categorie `ent_categorie`
- `fld_categorie_nom` · string · obligatoire
- `fld_categorie_image` · asset
- `fld_categorie_description` · text
- `fld_categorie_ordre` · number

### produit `ent_produit`
- `fld_produit_nom` · string · obligatoire
- `fld_produit_description` · text
- `fld_produit_photo` · asset
- `fld_produit_prix` · decimal · obligatoire
- `fld_produit_etat` · enum · obligatoire
- `fld_produit_categorie` · reference · obligatoire
- `fld_produit_marchand` · reference · obligatoire
- `fld_produit_disponible` · boolean · obligatoire
- `fld_produit_stock` · number
- `fld_produit_note` · decimal
- `fld_produit_ville_expedition` · string
- `fld_produit_publie_le` · datetime

### article_panier `ent_article_panier`
- `fld_panier_libelle` · string · obligatoire
- `fld_panier_image` · asset
- `fld_panier_produit` · reference · obligatoire
- `fld_panier_client` · reference
- `fld_panier_quantite` · number · obligatoire
- `fld_panier_prix_unitaire` · decimal · obligatoire
- `fld_panier_total_ligne` · decimal
- `fld_panier_ajoute_le` · datetime

### commande `ent_commande`
- `fld_commande_numero` · string · obligatoire
- `fld_commande_date` · datetime · obligatoire
- `fld_commande_statut` · enum · obligatoire
- `fld_commande_total` · decimal · obligatoire
- `fld_commande_nb_articles` · number
- `fld_commande_client` · reference
- `fld_commande_adresse_livraison` · text · obligatoire
- `fld_commande_ville` · string · obligatoire
- `fld_commande_telephone` · string · obligatoire
- `fld_commande_mode_paiement` · enum · obligatoire
- `fld_commande_frais_livraison` · decimal
- `fld_commande_livraison_estimee` · date
- `fld_commande_note_client` · text

### ligne_commande `ent_ligne_commande`
- `fld_ligne_commande` · reference · obligatoire
- `fld_ligne_libelle` · string · obligatoire
- `fld_ligne_image` · asset
- `fld_ligne_produit` · reference
- `fld_ligne_marchand` · reference
- `fld_ligne_quantite` · number · obligatoire
- `fld_ligne_prix` · decimal · obligatoire

### Liens

- `rel_categorie_produits` : ent_categorie → ent_produit (one_to_many)
- `rel_marchand_produits` : ent_marchand → ent_produit (one_to_many)
- `rel_produit_articles_panier` : ent_produit → ent_article_panier (one_to_many)
- `rel_profil_articles_panier` : ent_profil → ent_article_panier (one_to_many)
- `rel_profil_commandes` : ent_profil → ent_commande (one_to_many)
- `rel_commande_lignes` : ent_commande → ent_ligne_commande (one_to_many)
- `rel_produit_lignes_commande` : ent_produit → ent_ligne_commande (one_to_many)
- `rel_marchand_lignes_commande` : ent_marchand → ent_ligne_commande (one_to_many)

## Les règles à faire respecter

L’application les vérifie aussi, mais **une vérification côté client ne
protège de rien** : elle se contourne. C’est le serveur qui décide.

- **rule_produit_publiable** (ent_produit) — Un produit doit porter un nom, un prix en francs CFA strictement positif, un état (neuf ou occasion), une catégorie et un marchand.
  - `fld_produit_nom` required
  - `fld_produit_prix` gt 0
  - `fld_produit_etat` in ["neuf","occasion"]
  - `fld_produit_categorie` required
  - `fld_produit_marchand` required
- **rule_marchand_verifie** (ent_marchand) — Seuls les marchands vérifiés peuvent voir leurs produits proposés à la vente sur Marketa.
  - `fld_marchand_nom` required
  - `fld_marchand_verifie` eq true
- **rule_panier_ligne_valide** (ent_article_panier) — Une ligne du panier référence un produit, une quantité d'au moins 1 et un prix unitaire positif.
  - `fld_panier_produit` required
  - `fld_panier_libelle` required
  - `fld_panier_quantite` gte 1
  - `fld_panier_prix_unitaire` gt 0
- **rule_commande_livraison** (ent_commande) — Une commande exige une adresse de livraison, une ville, un téléphone de contact valide, un mode de paiement connu et un total positif.
  - `fld_commande_adresse_livraison` required
  - `fld_commande_ville` required
  - `fld_commande_telephone` matches "^\\+?[0-9 ]{8,20}$"
  - `fld_commande_mode_paiement` in ["mobile_money","carte_bancaire","paiement_livraison"]
  - `fld_commande_total` gt 0
- **rule_commande_statut** (ent_commande) — Le statut d'une commande appartient au cycle de suivi défini par Marketa.
  - `fld_commande_statut` in ["en_attente","confirmee","en_preparation","expediee","en_livraison","livree","annulee"]
  - `fld_commande_numero` required
- **rule_ligne_commande_valide** (ent_ligne_commande) — Chaque ligne de commande est rattachée à une commande, porte un libellé, une quantité d'au moins 1 et un montant positif.
  - `fld_ligne_commande` required
  - `fld_ligne_libelle` required
  - `fld_ligne_quantite` gte 1
  - `fld_ligne_prix` gte 0
- **rule_profil_compte** (ent_profil) — Un compte client exige un nom complet et une adresse e-mail valide.
  - `fld_profil_nom` required
  - `fld_profil_email` matches "^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$"
- **rule_profil_adresse_livraison** (ent_profil) — Pour être livré, le profil doit renseigner une adresse de livraison et une ville.
  - `fld_profil_adresse_livraison` required
  - `fld_profil_ville` required

## Qui a le droit de quoi

> Le document ne déclare **aucun** contrôle d’accès. Si cette application
> porte des données personnelles, c’est une décision à prendre avant la
> mise en ligne — pas après.

## Les services tiers déclarés

- `intg_auth_marketa` · classe `supabase_auth` · capacité `auth`
- `intg_paiement_psp` · classe `psp_checkout` · capacité `payments.psp`
- `intg_push_commandes` · classe `push_relay` · capacité `push_notifications`
- `intg_api_marketa` · classe `rest_api`
- `intg_images_demo` · classe `image_cdn`

Les identifiants et les clés **ne sont pas** dans ce document, et ne
doivent jamais l’être : ils viennent de votre provisionnement.

## Ce que ce document ne dit pas

Tout ce qui demande une **horloge** ou un **secret** vous appartient : une
échéance qui se déclenche seule, un envoi de code, un prélèvement
récurrent. Le contrat les décrit quand l’application les attend ; il ne
les exécute pas.
