# Génération d'applications V4 — rapport de mise en pause (2026-11-14)

**Décision du propriétaire, 2026-11-14 :** le chantier de génération d'applications
est **ARRÊTÉ**, faute de résultat concret. Ce rapport fixe l'état exact avant l'arrêt,
pour qu'une reprise parte du vrai et non d'un souvenir.

**Verdict, sans enjoliver :** Deribfy génère des applications qui **affichent,
saisissent, enregistrent et naviguent**, mais qui **ne font pas le travail métier** que
le cahier décrit (aucun calcul, aucune règle, aucun enchaînement jusqu'à un résultat).
Le propriétaire les juge, à raison, comme des **coquilles**.

---

## 1. Où en est le code

- Branche `etape-v3`, dernier commit poussé : **`e9d1bf7a`**, gate verte (30/30).
- Prévisualisation correspondante : `https://nexiora-or5ucnpt0-nexiora-team-s-projects.vercel.app`
  (les adresses `vercel.app` plus anciennes servent des versions périmées).
- **Rien n'est en production.** `deribfy.com` sert toujours l'ancienne `main`.
- Plan d'origine : `docs/generateur-v4/PLAN.md` (V4.3e, V4.4, V4.5 jamais atteints).

## 2. Ce qui est réellement fait et prouvé (tests + recompilation à 0 $)

| Capacité | Commit | Preuve |
|---|---|---|
| Accueil par espace (visiteur : se connecter / créer un compte / ses espaces ; rôle : 6 raccourcis + autres) ; menu limité au profil | `552d419e` | cliquets ② et navigateur ④ |
| Médias, capacité générale : photo (appareil/galerie, réduite à 1 600 px), vidéo, fichier, position GPS ; montrés partout ; stockage privé `oeuvres-medias` | `430b6e07` | ⑦ ⑧, navigateur ⑤ (vraie photo) |
| Une prise se vérifie : Reprendre / Valider | `36a30ab8` | navigateur ⑤ |
| Une suite d'actions s'arrête à l'échec ; champs obligatoires ; connexion aux normes (afficher le mot de passe, message générique, « oublié ») | `45e76b00` | navigateur ⑥ |
| Comptes que le cahier demande (individuels ou partagés ; courriel/téléphone ; code N chiffres ou mot de passe) | `a1e93c34` | ⑨ (3 cahiers réels) |
| Inscription côté serveur dans l'application publiée (`POST <nom>.deribfy.app`), rattachée à l'œuvre et au rôle de base, bornée | `593552e3` | `inscription-oeuvre` ①–⑥ |
| Page « Créer un compte » écrite par Deribfy ; rôle venu du compte ; garde « Connectez-vous » | `3998f28a` | navigateur ⑦, ⑩ |
| Rôle de base = rôle qui porte les écrans (bug mesuré sur `edd1a7f9`) | `6380f3f6` | ⑪ |
| Ce que le système connaît (horodatage, empreinte) n'est jamais demandé ; le juge joint une photo | `e9cc2c50`, `e9d1bf7a` | ⑫ ; `edd1a7f9` recompilé : 0 refus |

## 3. Ce qui ne marche PAS (le cœur du problème)

1. **Aucune règle métier exécutée.** Le cahier Conterak décrit : index → facture selon
   le barème → écart avec la facture SNE → dossier de contestation. L'application
   générée enregistre une photo et des champs ; **elle ne calcule rien**.
2. **Aucun enchaînement jusqu'à un résultat.** Les boutons naviguent ou enregistrent ;
   rien ne produit de résultat dérivé (montant, statut, alerte, document).
3. **Boutons sans rôle.** La couture du parcours ajoute « Continuer » où l'écran n'a pas
   de suite — sur la connexion Conterak, il permet de **sauter la connexion** (T3, non fait).
4. **Lecture de documents (OCR)** demandée par le cahier Conterak (reçus, SMS de paiement) :
   non faite.
5. **Jamais prouvé sur une application publiée** : vraie inscription, vraie connexion,
   vrai envoi de photo. Seulement en test simulé.

**Comparaison avec l'ancien ERP** (retiré le 2026-08-14, `8356711f`) : l'IA rendait un
plan JSON (modules, champs, et des NOMS de workflows/agents/automatisations), affiché par
une application fixe (`ErpApp.tsx`). Les workflows n'étaient **que des textes affichés**.
Ni l'ancien ERP ni la V4 n'exécutent de logique métier.

## 4. Défauts constatés, non corrigés

- **Production (`deribfy.com`)** : sur une application Conterak générée en production
  (`ad6017df`, 0,1545 $), chaque rubrique de « Gestion » affiche « Section inconnue ».
  Non touché (code appelé à être remplacé).
- Les champs « techniques » au libellé brut (`compteur_id`, « Cycle id ») apparaissent
  encore dans les formulaires de repli.
- La lecture du cahier varie entre deux générations (rôles « consommateur » puis
  « utilisateur ») malgré la température 0 : la lecture gardée (M13) ne joue que pour
  un texte identique.

## 5. Prérequis posés par le propriétaire (en place)

- `app_lectures` (projet **nexiora-ai**, Deribfy) — lecture gardée.
- `oeuvres_medias.sql` (projet **deribfy-bus-intercites**, applications publiées) — vérifié
  `false · 52428800 · 2 · 0`. (Aussi collé par erreur dans nexiora-ai : inoffensif.)

## 6. Dépenses du 2026-11-14 (générations par l'interface)

| Ligne | Version | Coût |
|---|---|---|
| `07dfe7c8` Hayine | V4 | 0,0529 $ |
| `fcc4f126` Conterak | V4 | 0,0397 $ |
| `d410c06d` Conterak | V4 (ancienne prévisualisation) | 0,0355 $ |
| `ad6017df` CONTERAK | production | 0,1545 $ |
| `414773cd` Conterak | V4 | 0,0359 $ |
| `edd1a7f9` Conterak | V4 (dernière) | 0,0354 $ |
| **Total** | | **≈ 0,354 $** |

## 7. Pistes pour une reprise (rien n'est décidé)

- **Le seul chantier qui change le verdict : les règles métier exécutées.** Lire dans le
  cahier formules, barèmes et conditions ; les faire exécuter par le moteur à chaque
  enregistrement ; afficher le résultat. Critère de sortie proposé : sur Conterak, un
  relevé saisi produit la facture selon le barème, l'écart avec la facture SNE et la
  contestation — avec de vrais chiffres — puis la même chose sur un second cahier.
- Avant toute reprise : que le propriétaire écrive les **3 à 5 choses** qu'une application
  doit faire pour être jugée bonne ; elles deviennent les critères mesurables.
- Décisions en attente : lecture automatique de documents (vision, payante par usage),
  SMS (payant), vérification par lien et mot de passe oublié via Resend.

## 8. Règles du propriétaire, posées ce jour (à respecter à la reprise)

- Ne jamais réparer une application générée : réparer Deribfy, en capacité générale.
- La demande de l'utilisateur de Deribfy (son cahier) prime sur tout.
- Pas de coquille vide : chaque page a un travail, chaque bouton un rôle et un effet.
- Toute génération se fait par l'interface, lancée par le propriétaire.
