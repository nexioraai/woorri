# Installer une appli Deribfy sur un téléphone Android (démonstration Dari Tech)

> Écrit le 2026-11-22. **Préalable : le commit « applis installables » est en production** (Claude Code annonce le commit et « READY »). Avant ça, les applis n'ont ni leur icône ni leur écran hors ligne.
>
> Appli d'essai proposée : **`https://pharma.deribfy.app`** (« Gestion de pharmacie », verte, déjà en ligne). Une autre appli publiée sous `<nom>.deribfy.app` convient ; le lien par jeton (`www.deribfy.com/p/…`) **ne s'installe pas** : il n'a pas d'adresse à lui.

## Le jour J

| # | Geste | Ce que tu dois voir |
|---|---|---|
| 1 | Sur le téléphone, ouvrir **Chrome** (pas un autre navigateur), aller à `https://pharma.deribfy.app` | l'appli s'affiche ; la barre du haut du téléphone prend sa couleur (vert) |
| 2 | Toucher l'écran une fois, attendre une trentaine de secondes sur la page | rien de visible : Chrome exige un geste et un peu de temps avant de proposer l'installation |
| 3 | Menu **⋮** (en haut à droite) | une ligne **« Installer l'application »** (ou « Ajouter à l'écran d'accueil » sur un Chrome ancien). Parfois Chrome la propose seul, en bas de l'écran |
| 4 | Toucher « Installer » | une fenêtre montre **l'icône verte avec un « G » blanc** et le nom **« Gestion de pharmacie »** ; confirmer |
| 5 | Revenir à l'écran d'accueil du téléphone | l'icône verte « G », avec sous elle le nom court (**« Gestion de »**, coupé au mot) |
| 6 | Toucher l'icône | l'appli s'ouvre **en plein écran, sans barre d'adresse** : comme une vraie appli |
| 7 | *(facultatif)* Passer le téléphone en mode avion, rouvrir l'appli | elle s'ouvre sur son écran d'accueil, avec en haut **« Pas de connexion — ce que vous voyez peut ne pas être à jour, et rien ne s'enregistre. »** Rien ne s'enregistre tant que le réseau manque |
| 8 | Couper le mode avion | la page se recharge seule, le bandeau disparaît |

## Si quelque chose ne va pas

- **Pas de ligne « Installer » au pas 3** : vérifier que c'est bien Chrome, que l'adresse est en `https://<nom>.deribfy.app`, et attendre 30 secondes de plus après avoir touché la page. Si elle n'apparaît toujours pas, m'envoyer le modèle du téléphone et la version de Chrome (Paramètres → À propos de Chrome).
- **L'icône est bleue avec un carré** : c'est l'ancienne installation (d'avant le commit). Désinstaller l'icône et recommencer.
- **L'appli installée montre une ancienne version** : elle se met à jour seule à la prochaine ouverture avec du réseau ; rien à faire.

## Ce qui est prouvé, et ce qui ne l'est pas

- **Prouvé** dans Chromium (bureau, émulation d'un téléphone Android), sous la vraie CSP de production : installabilité sans aucune erreur (`Page.getInstallabilityErrors` vide), manifeste sans erreur, icônes 192/512/maskable chargées, service worker actif, écran hors ligne, mise à jour automatique, effacement à la dépublication.
- **Pas prouvé** : l'installation sur un vrai téléphone Android, et le dessin exact de l'icône découpée par le lanceur du téléphone. C'est l'essai du jour J.
