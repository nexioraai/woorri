# Défaut — le message de bienvenue ne peut pas partir (2026-11-17)

- **Statut :** consigné, **non corrigé** (consigne du propriétaire, 2026-11-17).
- **Niveau de preuve :** le chemin bloqué est **DÉDUIT** d'une mesure de privilèges ; la non-réception elle-même est **INCONNUE** (voir §3).

## 1. Le seul chemin d'envoi

- `/api/welcome` (`app/api/welcome/route.ts:45`) envoie « Bienvenue chez Deribfy 🎉 / Welcome to Deribfy 🎉 » par Resend.
- **Un seul appelant dans le dépôt** : `app/login/page.tsx:65` (relevé par `git grep "api/welcome"`, hors tests).
- Cet appel est conditionné à `profile && !profile.welcomed` (`:59`). `profile` est lu **avec la clé du navigateur** (`:54-58`). Le drapeau est ensuite posé, avec la même clé (`:70`).

## 2. Pourquoi ce chemin ne peut pas aboutir

Mesure de Youssouf dans nexiora-ai, le 2026-11-17, sur `public.profiles` : `rls_active = true`, **0 politique**, `connecte_lit = true`, `connecte_ecrit = false`.

- RLS actif sans aucune politique ne rend **aucune ligne** à `authenticated`, malgré le droit SELECT.
- La lecture de `:54-58` (`.single()`) rend donc `data = null`, et `profile && …` est faux.
- `/api/welcome` n'est jamais appelé, et `welcomed` n'est jamais posé à `true` par ce chemin.

**État en base** (clé de service, mesuré le 2026-11-17) : `welcomed = false` pour **14** profils, `true` pour **1**.

## 3. Ce qui reste INCONNU

- **Si ces 14 personnes ont reçu un message.** L'historique d'envoi de Resend aurait tranché, mais la clé du dépôt est restreinte à l'envoi : `GET https://api.resend.com/emails` → HTTP 401 `restricted_api_key` (2026-11-17). Le tableau de bord Resend du propriétaire peut le dire.
- **Depuis quand RLS ferme `profiles`.** L'unique `welcomed = true` laisse penser que le chemin a déjà fonctionné, avant ce verrou. Ce n'est pas vérifié.
- **Si 14 = le nombre de personnes concernées.** Il y a 24 comptes et 15 profils : 9 comptes n'ont pas de ligne `profiles` du tout (mesuré le 2026-11-17).

## 4. La correction, quand elle sera demandée (rien n'est fait)

La lecture et l'écriture de `welcomed` ne peuvent pas rester dans le navigateur, sauf à ouvrir RLS, ce qu'il ne faut pas faire.

**Forme naturelle :** `/api/welcome` lit et pose lui-même `welcomed` avec la clé de service. Il connaît déjà l'identité par le jeton (`require-authenticated-user`). L'écran ne ferait plus qu'appeler la route.

Ce défaut n'a aucun lien avec le quota : le compteur des sites n'est touché que par la clé de service.
