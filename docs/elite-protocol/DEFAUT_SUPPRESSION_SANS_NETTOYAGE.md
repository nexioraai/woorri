# Défaut — supprimer une application ne nettoie pas la base des œuvres (2026-11-17)

- **Statut :** consigné, **non ouvert** (consigne du propriétaire, 2026-11-17).
- **Mesures :** psql en `begin transaction read only` sur la base des œuvres (psxbil), et lecture du code.

## 1. Ce que fait la suppression aujourd'hui

**`POST /api/generateur/supprimer`** — une suppression douce, voulue :

- statut `supprimee`, `publication_jeton = null`, `publie_le = null` (`supprimer/route.ts:133-143`) ;
- le lien répond 404 tout de suite ;
- le slug reste réservé, en « pierre tombale » (`:12-19`).

**Le cron `purge-supprimees`**, chaque jour à 04:30 (`vercel.json:100-101`) : 30 jours après la suppression (`JOURS_AVANT_PURGE = 30`, `supprimer/route.ts:52`), il efface le `document` dans la base **Deribfy** (`purge-supprimees/route.ts:55-62`).

**Aucun des deux ne touche la base des œuvres.** Le dépôt ne contient aucun `drop schema` hors des scripts de tir, et aucune suppression de compte d'application.

## 2. Ce qui reste — mesuré le 2026-11-17

| Schéma | Application | Statut Deribfy | Exposé à l'API (`pgrst.db_schemas`) | Compte d'application |
|---|---|---|---|---|
| `oeuvre_4d480027…` | suivi | `supprimee` | **oui** | 1 |
| `oeuvre_bbf07fd6…` | regi | `supprimee` | **oui** | 1 |
| `oeuvre_ba20655a…` | asso | `supprimee` | **oui** | 1 |
| `oeuvre_35ed32c1…` | asosa | `supprimee` | **oui** | 1 |
| `oeuvre_faa9f0c3…` | cahier-des-charges-fonctionnel-technique | `supprimee` | **oui** | 1 |
| `oeuvre_15158240…` | snenak | `supprimee` | non | 1 |

Et dans `auth.users` : 14 comptes d'application, pour 3 applications servies.

## 3. Conséquences

- **[DÉDUIT, non essayé] Les données d'une application supprimée restent lisibles par son compte.** Le schéma est toujours exposé, le compte existe, et la politique de lecture vérifie `app_metadata.oeuvre` (`politiques-donnees.ts:252-255`). Qui a gardé l'adresse et le mot de passe d'une application supprimée lit encore ses données par l'API. Aucun essai de connexion n'a été fait : les mots de passe ne sont pas connus, et ne doivent pas l'être.
- **La liste exposée grandit avec les suppressions.** Elle compte 44 caractères par schéma (`GENERATION_OUVERTE_ET_QUOTA.md` §6). Le temps de rechargement du cache de schémas en fonction de sa taille n'est pas mesuré.
- **Coût :** négligeable. Les 9 schémas pèsent 728 Ko.
- **Ce que la suppression dit à la personne n'est pas ce qu'elle fait aux données.** Le lien meurt ; les données, non.

## 4. La correction, quand elle sera ouverte (rien n'est fait)

Elle doit suivre la même douceur que la suppression : rien d'irréversible avant la purge des 30 jours.

- **À la suppression :** retirer le schéma de `pgrst.db_schemas` (l'API cesse de servir les données), et bannir ou supprimer le compte.
- **À la purge (30 jours) :** `drop schema … cascade` et suppression du compte.
- **Preuve attendue :** sur une copie jetable, une application supprimée ne doit plus se lire par l'API, et une application restaurée avant 30 jours doit se relire. Preuve réelle sur la base, comme `porte-deux-regimes.tir.ts`, avec l'accord du propriétaire.
