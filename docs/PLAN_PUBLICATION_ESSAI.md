# Plan : la publication d'essai

*Rédigé le 2026-11-23. Aucune ligne de code n'existe : ce plan est à relire avec Youssouf avant tout code.*

## 0. Pourquoi ce plan

Ce qui est prouvé aujourd'hui :

- Les contrôles d'une génération tournent dans l'**aperçu**. L'aperçu n'a ni base de données ni connexion, et il s'arrête à 24 points au plus (`BUDGET_VISITES = 24`).
- L'aperçu est servi dans une **origine opaque** (`window.origin === 'null'`). Il ne peut donc pas joindre une base, même si on lui en donnait une.
- Conséquence mesurée sur « Place de marché Tchad » (b21c548a) : l'inscription des vendeurs était écrite, mais elle était inutilisable une fois publiée. Les produits masqués étaient lisibles par tous. Les mots de passe étaient stockés en clair. **Aucun contrôle ne l'a vu, et le propriétaire non plus.**

La publication d'essai monte l'appli **comme si elle était publiée** : vraie base, vrais comptes, vraies règles d'accès et vraie adresse. Le juge y éprouve ce que l'aperçu ne peut pas voir. L'essai est ensuite effacé.

## 1. Installer l'appli « comme publiée », dans un espace isolé

**Un projet Supabase dédié aux essais**, distinct de `deribfy-bus-intercites` (psxbil…, qui porte les applis des clients). C'est la seule isolation qui couvre à la fois les deux points suivants :

- **les comptes** : les comptes Supabase sont partagés par projet. Des comptes d'essai créés dans le projet des clients se mêleraient à leurs utilisateurs ;
- **la liste des schémas exposés** : une entrée morte dans cette liste casse toutes les applis du projet. Ce défaut est déjà consigné dans `publier-oeuvre.ts` (« liste exposée élaguée »). Un essai qui raterait son nettoyage ne doit pas pouvoir toucher une appli client.

Le schéma `oeuvre_<id>` est remplacé par un **parc fixe de places**, `essai_01` à `essai_10`, exposées une fois pour toutes. Un essai prend une place libre, l'utilise, puis la rend vide. La configuration du projet ne change donc jamais pendant un essai.

L'installation reprend **le même code que la vraie publication**, sans copie. C'est `poserOeuvre` (schéma, puis politiques réémises depuis la déclaration), mais vers la place d'essai et avec le même identifiant d'appli cuit dans les politiques. Si on écrivait une seconde installation à part, elle divergerait de la vraie.

L'appli est servie à une **vraie origine** : `https://essai.deribfy.app/<jeton>`. Elle reçoit `enBase = true`, comme une appli publiée.

**L'effacement se fait sur trois étages**, chacun vérifiable :

1. **En fin de juge**, dans un `finally` : on vide la place (`drop schema … cascade`, puis `create schema` vide) et on supprime les comptes d'essai par l'API d'administration.
2. **Un registre `essais`** consigne la place, l'appli, l'heure de prise et l'heure de restitution.
3. **Un balayeur** passe toutes les 15 minutes. Il vide toute place prise depuis plus d'une heure, supprime tout compte d'essai orphelin et alerte s'il a dû agir.

La preuve d'effacement est un compte : le nombre de places prises est égal au nombre d'essais ouverts au registre. Le tableau d'administration l'affiche.

## 2. Les comptes d'essai, sans aucun vrai courriel ni SMS

**Comptes posés par nous.** Le propriétaire, et chaque rôle si un jour l'appli en déclare, est créé par l'API d'administration, avec les réglages suivants :

- `email_confirm: true` ;
- une adresse en `@essai.invalid` (le domaine `.invalid` est réservé et ne peut rien recevoir) ;
- un mot de passe tiré au hasard ;
- `app_metadata.oeuvre` posé comme pour le vrai compte.

Aucun courriel ne part.

**Inscription par l'appli elle-même.** C'est le cas qui a échoué sur la place de marché. Le projet d'essai doit avoir **les mêmes réglages de connexion que la production** : inscriptions ouvertes et confirmation obligatoire. Sinon, l'essai ne verrait pas la panne réelle. Les courriels partent vers un **SMTP de capture** configuré sur le projet d'essai, qui ne livre rien à l'extérieur (Mailpit hébergé, ou un bac à sable SMTP). Le juge lit ce qui y est arrivé.

**SMS** : le fournisseur de téléphone est désactivé sur le projet d'essai. Aucun SMS n'est possible.

## 3. Ce que le juge éprouve alors

Le juge passe dans Chromium, à la vraie adresse d'essai, avec des données d'exemple écrites par nous et marquées comme telles. Il éprouve cinq choses :

1. **Lecture sans compte.** Il ouvre la page publique et enregistre chaque réponse de la base. Il compare les colonnes et les lignes **reçues** à ce qui est **affiché**. Il interroge aussi la base directement avec la clé publique : `select=*` sur chaque table. Une table privée doit refuser ; une table publique doit ne rendre que ses colonnes et ses lignes déclarées. C'est la propriété de la partie 1, éprouvée dans les conditions réelles.
2. **Inscription.** Si le code appelle `signUp`, le juge remplit le formulaire de l'appli et observe quatre choses : un compte est-il créé, une confirmation est-elle exigée, la connexion est-elle ensuite possible, et la ligne de l'utilisateur est-elle écrite. Sur la place de marché, il aurait dit : « l'inscription exige une confirmation par courriel que l'adresse saisie ne peut pas recevoir ; le vendeur ne peut jamais se connecter ».
3. **Connexion du propriétaire.** Il se connecte par l'écran de l'appli et ouvre l'espace de gestion. Sur chaque table, il ajoute, modifie et retire une ligne, et vérifie chaque écriture **dans la base**, pas à l'écran.
4. **Chaque rôle face aux données des autres.** Le compte B tente, par l'écran puis par l'API, de modifier ou de supprimer une ligne de A, et de lire une table qui contient un secret (colonne de mot de passe). Chaque résultat est consigné.
5. **Plus de 24 points.** Le budget de visites est porté au nombre de contrôles découverts. Ce qui n'a pas été ouvert est nommé dans la boîte noire.

Le résultat entre dans la boucle existante : un reproche au modèle, puis un nouveau tour. Il est aussi consigné dans la boîte noire, avec ce qui a tourné et ce qui n'a pas tourné.

## 4. Le propriétaire voit son appli « comme publiée » avant de payer

Dans l'atelier, un bouton **« Essayer comme publiée »** crée un essai, avec la même installation et les mêmes comptes, et l'ouvre dans un nouvel onglet. L'onglet porte un bandeau : « Essai — effacé dans une heure — aucun courriel ne part ».

Un sélecteur **« Voir comme : visiteur / propriétaire / inscrit »** bascule entre les sessions des comptes d'essai, que nous détenons. Le propriétaire voit donc ce que verra un visiteur sans compte, exactement. Ce qu'il saisit dans l'essai disparaît avec lui.

L'aperçu actuel reste tel quel, en mémoire. L'essai s'ajoute à l'aperçu, il ne le remplace pas.

## 5. Ce que ça coûte

**En temps, par génération** (estimation, rien n'est mesuré) :

| Étape | Durée estimée |
|---|---|
| Installation | 1 à 3 s (même chemin que la publication) |
| Comptes | environ 1 s |
| Parcours Chromium sur une vraie base | 30 à 90 s de plus que le juge actuel (réseau réel, plus de 24 points) |
| Effacement | environ 1 s |

**En argent :**

- **Modèle** : aucun appel de plus, sauf si le juge renvoie un reproche, ce qui fait un tour de plus (0,03 à 0,07 $, coût déjà connu d'un tour).
- **Infrastructure** :
  - un projet Supabase de plus, de l'ordre de 10 $ par mois en petite capacité (**à vérifier sur la facture de l'organisation ; non prouvé**) ;
  - un SMTP de capture, gratuit hébergé par nous, ou quelques dollars par mois en service ;
  - la durée de fonction Vercel du juge allongée d'environ une minute par génération (voir `vercel billing usage`, en lecture seule, avant de décider).

**En développement :** 4 à 6 jours, dans cet ordre :

1. le parc de places et l'effacement à trois étages ;
2. les comptes et le SMTP de capture ;
3. le juge (points 1 à 4) ;
4. le bouton du propriétaire.

## 6. Les risques, et ce que je ne saurai toujours pas prouver

**Risques, et leur parade :**

- **Fuite vers les applis des clients** : écartée par le projet séparé, pas par une règle.
- **Places orphelines** : le balayeur, le registre et l'alerte.
- **Limites de débit de la connexion Supabase** (inscriptions par heure) : un essai par génération au plus, et une file si nécessaire.
- **Écart de réglages entre le projet d'essai et la production** : une comparaison automatique des réglages de connexion au démarrage du juge. Un écart arrête l'essai, il ne le fausse pas.
- **Le juge écrit dans la base d'essai** : c'est voulu, et elle est vidée ensuite. Il n'écrit jamais ailleurs, car la connexion d'essai ne connaît que le projet d'essai.

**Ce que l'essai ne prouvera toujours pas :**

- qu'un vrai courriel arrive chez un vrai destinataire : la capture prouve qu'un courriel est **émis**, pas qu'il est **reçu** ;
- le comportement avec de vrais volumes, sur de vrais téléphones et sur un réseau lent ;
- le paiement, qui reste hors des applis générées ;
- qu'un écran affiche **juste** ce qu'il affiche : le juge voit qu'une donnée est rendue, pas qu'elle est la bonne ;
- ce que le modèle écrira à la prochaine génération : l'essai juge une œuvre, pas le générateur.
