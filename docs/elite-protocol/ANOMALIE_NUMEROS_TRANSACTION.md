# Anomalie — les numéros de transaction de la base des œuvres

**Statut : OUVERTE** (décision du propriétaire, 2026-11-18). L'hypothèse de départ est **réfutée par la mesure**. La fermeture appartient au propriétaire.

**Base concernée.** `deribfy-bus-intercites`, la base des œuvres (Supabase Pro). Elle contient les données réelles de toutes les applications publiées.

## Ce qui a été observé (2026-11-18, lecture seule)

En cherchant l'origine de deux lignes de pharma (« oko test », qui venait du propriétaire), les numéros de transaction (`xmin`) ont paru incohérents :

- six comptes d'applications créés entre le 04/11 et le 16/11 portent des numéros **consécutifs** (2344 à 2349), dans l'**ordre inverse** de leurs dates de création ;
- le compte de pharma (créé à 00:55), sa session (ouverte à 01:33) et un jeton (11:01) portent **le même** numéro, 2373 ;
- le compteur entier n'était qu'à 2 382, après près de trois mois d'existence.

## L'hypothèse émise, puis réfutée

**Émise :** la base aurait été rechargée d'un bloc (restauration, copie), à une date et pour une raison inconnues. Les numéros n'auraient alors daté que le rechargement.

**Réfutée par :**

| Mesure | Valeur |
|---|---|
| Création de la grappe Postgres (lue dans `system_identifier`) | 2026-08-25 20:32 UTC |
| Dernier démarrage du serveur | 2026-09-06 03:04 UTC, sans arrêt depuis |
| Statistiques d'archivage remises à zéro | 2026-08-25, avec la grappe |

Un rechargement par sauvegarde logique crée une nouvelle grappe. Ce n'est pas le cas ici.

**Explication la plus probable (déduite, non prouvée).** `xmin` est le numéro de la **dernière écriture** d'une ligne, pas de sa création.

- Les lignes d'authentification sont réécrites à chaque connexion et à chaque rafraîchissement de jeton. Le rafraîchissement de 11:01 a réécrit en une transaction la session, l'ancien jeton et le nouveau : d'où le 2373 commun.
- Les six comptes ont été mis à jour **en un lot**, dans un ordre qui n'est pas celui de leur création.
- Le compteur bas correspond à une base peu sollicitée (`age(datfrozenxid)` = 1 652).

## Ce qui reste inconnu, et pourquoi c'est encore ouvert

- **Quel traitement a mis à jour les six comptes en un lot, et quand.** Il peut s'agir d'un geste de Deribfy (par exemple la pose de `app_metadata.oeuvre`, ou « Refaire le mot de passe ») ou d'une opération de Supabase sur `auth`. Rien n'est daté : la base ne garde pas l'heure des transactions (`track_commit_timestamp = off`).
- **Pour fermer l'anomalie :** relier ce lot à un geste connu (journal d'audit `auth.audit_log_entries`, vide pour pharma ; journaux de la plateforme Supabase, accessibles au seul propriétaire).

## Ce qui reste vrai

Les tables de données d'une œuvre ne sont jamais mises à jour par Deribfy. Pour elles, `xmin` donne bien l'**ordre d'insertion**. Chez pharma, « oko test » (2369, 2370) suit les saisies d'origine (2355 à 2366).
