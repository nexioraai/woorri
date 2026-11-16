# La publication expose-t-elle vraiment les tables ? (2026-11-16)

**Question.** Avant de publier un atelier, Deribfy affiche : « Ces listes seront lisibles PAR TOUT LE MONDE, sans compte : vehicule, reparation. Personne ne pourra y écrire. » Youssouf a annulé. Cet avertissement dit-il vrai ?

Aucune correction n'a été faite.

## 1. une.deribfy.app aujourd'hui — mesuré en production, sans session

Le code servi par `https://une.deribfy.app/` (200, 864 992 octets) donne lui-même ses paramètres :

- l'adresse Supabase : `https://psxbilpmnojtlzosokzz.supabase.co` ;
- la clé publiable : `sb_publishable_K4FN…` ;
- le schéma : `oeuvre_3b96d2e7_ca46_40d3_86c0_a084cd6ea99e` ;
- les tables, d'après ses `.from("…")` : `client`, `vehicule`, `reparation`, `piece`.

Les requêtes ont été envoyées avec la seule clé publiable, sans aucun jeton de session.

| Table | Lecture `select=*` | insert | update | delete |
|---|---|---|---|---|
| client | 401 `42501 permission denied` | 42501 | 42501 | 42501 |
| vehicule | 401 `42501` | 42501 | 42501 | 42501 |
| reparation | 401 `42501` | 42501 | 42501 | 42501 |
| piece | 401 `42501` | 42501 | 42501 | 42501 |

**Aucune ligne et aucune colonne ne reviennent.** Ni le montant de la main-d'œuvre, ni la description, ni le nom ou le téléphone du client, ni le prix des pièces.

L'insert d'essai a été refusé. Rien n'a été écrit, puisque chaque réponse est un 42501.

On a vérifié de la même façon, en lecture seule, les deux autres applications en ligne. Leurs quatre tables refusent aussi : suivi (`article`, `mouvement_stock`) et regi (`produit`, `vente`).

Conséquence : l'œuvre servie n'a aucune table publique. **Ce que la publication ferait si on l'acceptait ne peut pas se mesurer sur elle.**

**Fermé par le propriétaire le 2026-11-16 : ce sont deux applications différentes.**

| | Œuvre | Fichiers | Durée | Recherche publique | Publiée |
|---|---|---|---|---|---|
| une.deribfy.app | `3b96d2e7` | 6 | 165 s | non (rien de public dans le brief) | oui |
| celle de l'avertissement | la suivante | 14 | 251 s | oui, par immatriculation | non : Youssouf a cliqué Annuler |

La mesure du §1 prouve exactement ce qu'elle prouve : **une application sans demande publique n'expose rien**.

## 2. Ce que la publication ferait si on l'acceptait

### Le code

`packages/compiler/src/politiques-donnees.ts`. Pour une table déclarée publique, le compilateur émet ceci :

- `:197` : `revoke all on <t> from anon, public` ;
- `:272-277` : `create policy <t>_lecture_publique … for select to anon using (true)` et `grant select on <t> to anon`.

Le droit est accordé sur **la table entière**. Aucune colonne n'est filtrée, et aucune ligne non plus : `using (true)` laisse passer toutes les lignes.

### Simulation locale

C'est une simulation, pas une validation réelle. Le SQL est celui des **vrais émetteurs**, `emettreSchemaSql` et `emettrePolitiquesSql`, avec les colonnes que le code servi de l'Atelier écrit. Il a été joué sur un Postgres 17 jetable, avec les privilèges par défaut de Supabase et la pose faite par `poserOeuvre`, puis lu sous `set role anon`. La simulation ne passe pas par PostgREST.

- **client** : `permission denied`.
- **vehicule** : 1 ligne lisible. Toutes les colonnes reviennent : `id, client_id, marque, modele, immatriculation` → `v1 | c1 | Toyota | Hilux | AA-111`.
- **reparation** : 1 ligne lisible. Toutes les colonnes reviennent : `id, vehicule_id, date, description, statut, montant_main_oeuvre` → `r1 | v1 | 2026-11-10 | Vidange | terminee | 10000`.
- **piece** : `permission denied`. Le prix des pièces ne revient pas.
- **Écritures sans session** : `insert` sur vehicule, reparation et client, `update` et `delete` sur reparation. Toutes refusées (`permission denied`).
- **Témoin relu par le propriétaire après les essais** : rien n'a bougé (1 véhicule, 1 réparation « Vidange:10000 »).
- **Privilèges d'`anon`** : exactement `reparation:SELECT` et `vehicule:SELECT`.

### Preuve réelle antérieure

Le tir `porte-deux-regimes.tir.ts` a été exécuté le 2026-11-05 sur la vraie base des œuvres (commit `7fa40677`), dans des schémas jetables. Il a prouvé trois choses :

- une table publique se lit sans compte ;
- elle refuse insert, update et delete ;
- une table non déclarée refuse la lecture.

Un tir propre à l'Atelier sur la vraie base a été refusé par le garde-fou de la session, parce qu'il crée un schéma en production. **Le propriétaire l'a refusé lui aussi le 2026-11-16** : on ne crée pas de schéma en production pour une démonstration. La simulation locale et la preuve réelle du 2026-11-05 suffisent à établir le comportement.

## 3. Verdict

L'avertissement est **exact sur les faits** : tout le monde lit, personne n'écrit. Il est **insuffisant sur la portée**, parce qu'il nomme des listes sans dire ce qu'elles contiennent. Accepter, c'est publier, pour toutes les réparations et tous les véhicules :

- le montant de la main-d'œuvre ;
- la description ;
- l'immatriculation ;
- l'identifiant du client.

Et ces lignes s'énumèrent toutes avec la clé présente dans la page.

## 4. Deribfy sait-il exposer UNE PARTIE d'une table ?

**Non.** Le régime public est binaire : la table entière ou rien (`:272-277`). Le seul réglage au niveau d'une colonne est `sensitive: true` (`schema-donnees.ts:87-88`). Il **retire** la colonne de la base : elle n'est plus stockée du tout, donc elle n'est pas masquée, elle est perdue.

Il y a deux besoins distincts dans le cas du garagiste :

- **colonnes** : montrer le statut sans la description ni le montant ;
- **lignes** : que chaque client ne voie que **sa** voiture. Avec `using (true)`, n'importe qui voit le statut de toutes les voitures.

### Les voies possibles

Ce sont des estimations de travail, non mesurées. Aucune ne coûte d'argent à l'exécution.

| Voie | Colonnes | Lignes | Ce qu'il faut toucher | Estimation |
|---|---|---|---|---|
| **A · privilèges par colonne** (`grant select (id, statut, immatriculation)`) | oui | **non**, tout est énumérable | 1 ligne d'émetteur ; une grammaire `champsPublics` dans la déclaration ; le juge des faces. Le code généré ne doit plus faire `select("*")` côté public, sinon il est refusé. | ~0,5–1 jour |
| **B · vue publique** (`reparation_suivi` avec quelques colonnes, table de base privée) | oui | **non** | Émetteur de vues ; grammaire ; validateur `migration-sql.ts`. Piège connu : les privilèges par défaut couvrent les vues (mémoire « Supabase — privilèges par défaut sur les VUES »). Le modèle doit lire la vue. | ~1–2 jours |
| **C · table de statut séparée** (déjà possible : une entité publique de plus) | oui | **non** | Aucun changement de moteur, mais le modèle doit écrire **deux fois** (risque de divergence). Un juge de cohérence serait à faire. | ~0,5 jour (juge) ; risque produit |
| **D · lien signé par réparation** : jeton aléatoire par ligne, lu par une fonction `security definer` `suivi(jeton)` qui rend le statut seul ; `anon` n'a que `execute` | oui | **oui** | Émission de fonction et de colonne jeton ; extension du validateur SQL ; revue de sécurité ; un écran « partager par WhatsApp » ; la page publique de suivi. | ~2–3 jours |

**Seule D couvre le cas du garagiste de Moundou**, puisqu'il faut à la fois cacher les prix et ne montrer à chaque client que sa voiture. A, B et C cachent les prix mais laissent tout le monde lister l'état de toutes les voitures.

## 5. Décisions du propriétaire (2026-11-16)

**Décision 2 — le message nomme le contenu. FAIT, commit `1df7d1d7`.**

- La route (`publier/route.ts`) et la fenêtre d'accord (`accordLecturePublique.ts`) disent, pour chaque table publique, ce que tout le monde pourra lire.
- Ils ajoutent la phrase mesurée : « La liste ENTIÈRE est téléchargeable… ».
- Les libellés viennent de `contenu-public.ts`. C'est le libellé déclaré du champ s'il existe, en français d'abord. Sinon, c'est le nom sans ses tirets bas, par exemple « montant main oeuvre » : on ne devine ni accent ni traduction (règle d'AIR, `air.ts:935-944`).
- Un champ dérivé ou sensible, qui n'est pas stocké, n'est pas annoncé.
- Preuve : `publier-nomme-le-contenu.test.ts` (4 tests) exerce la vraie fonction `POST`. Contrôle négatif : avec l'ancienne route et l'ancienne fenêtre, 2 tests tombent.
- Limite : tant que le modèle ne déclare pas de `label`, le commerçant lit le nom mécanique, pas « le montant de la main-d'œuvre ».

**Décision 3 — CHANTIER OUVERT, NON COMMENCÉ : voie D, le lien signé par réparation.**

C'est la seule des quatre voies qui cache les prix **et** ne montre à chaque client que sa voiture. Estimation : 2 à 3 jours, revue de sécurité comprise. Le tableau du §4 est la référence. **Ne pas commencer sans instruction.**

**Tir sur la vraie base : REFUSÉ** (voir §2).
