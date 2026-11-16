# Défaut — l'écran abandonne alors que la génération réussit

- **Découvert :** 2026-11-16, pendant la preuve en production du manque 4 (`PLAN_MANQUE4.md` §6.8). Rapporté par le propriétaire, avec une capture de l'écran sur iPhone.
- **Statut :** DOCUMENTÉ, **non corrigé**. Aucune ligne de code n'a été touchée. La correction attend la validation du propriétaire.
- **Code observé :** `main` @ `be091daf`, celui qui servait pendant le tir.
- **Niveaux :** [OBSERVÉ-PROD] vient d'une capture ou d'une requête du propriétaire ; [LU-CODE] vient de la lecture du dépôt ; [NON DÉTERMINÉ] n'est pas établi.

---

## 1. Ce qui s'est passé

| Heure (UTC) | Côté serveur | Côté écran |
|---|---|---|
| 08:11:53.509 | la route `POST /api/generateur/direct` démarre (`debut_le` de la tentative) [OBSERVÉ-PROD] | « Je lis votre demande depuis N min… » |
| environ 7 min plus tard | le travail continue | « Lecture impossible. Votre texte est revenu dans le champ. » Le texte est remis dans la saisie [OBSERVÉ-PROD, capture] |
| 08:20:17.338 | l'œuvre `ef085fa7…` est insérée, `statut livree` [OBSERVÉ-PROD] | rien ne change |
| 08:20:17.701 | la tentative est écrite : `generation / livree`, 0,1856 $, 504 192 ms [OBSERVÉ-PROD] | rien ne change |

L'écran a annoncé un échec qui n'en était pas un. La personne qui voit cet écran croit avoir échoué. Elle retrouve son texte, prêt à être renvoyé, et un second envoi paierait une seconde génération.

L'heure exacte de l'abandon n'est pas relevée : seulement « environ sept minutes », d'après le propriétaire.

## 2. Où se situe l'abandon

Il existe trois délais. Aucun ne vaut sept minutes.

| Couche | Délai | Fichier | Rôle dans l'abandon |
|---|---|---|---|
| Navigateur, filet | **45 min** (`DELAI_MAX_MS = 2 700 000`) | `lib/apps/attente-comprehension.ts:43`, posé dans `ConversationApplication.tsx:1033` | **Exclu.** Il n'a pas pu mordre à 7 minutes. [LU-CODE] |
| Route, Vercel | **900 s** (`maxDuration`) | `api/generateur/direct/route.ts:63` | **Exclu.** La route a fini en 504 s et a écrit l'œuvre et la tentative. [OBSERVÉ-PROD] |
| Connexion, battement | une ligne vide **toutes les 10 s** | `route.ts:496-502`, avec `X-Accel-Buffering: no` (`route.ts:525`) | Posé le 2026-10-19 contre une coupure de connexion inactive. Il **n'a pas empêché** cet abandon. [LU-CODE + OBSERVÉ-PROD] |

### 2.1 Le seul chemin du code qui produit ce message [LU-CODE]

`ConversationApplication.tsx:1102-1122` :

```
const d = (await lireReponseQuiBat(res).catch(() => null)) ?? {};
if (!res.ok || d.ok !== true || typeof d.html !== 'string') {
  rendreLaMain(texte, noteAvant);
  setAvis(String(d.error ?? d.motif ?? MESSAGE_ILLISIBLE));
```

« Lecture impossible » s'affiche quand la réponse ne porte **ni** `error` **ni** `motif`. La route en met toujours un, sur tous ses chemins de fin (`route.ts:505-510` et `:1101-1110`). Le message signifie donc que **la dernière ligne JSON n'est jamais arrivée au navigateur**. Deux cas sont possibles :

1. `res.text()` a levé une exception (connexion coupée en cours de lecture) ;
2. une couche intermédiaire a rendu une réponse sans JSON, par exemple une erreur 5xx en HTML.

Le `.catch(() => null)` avale l'erreur **sans la consigner**. Même le navigateur ne garde pas le nom de l'exception : un abandon du filet (`AbortError`) et une coupure réseau affichent le même message. C'est une perte de diagnostic, à noter en plus du défaut.

### 2.2 Ce qui a coupé : NON DÉTERMINÉ

| Hypothèse | Pour | Contre ou manque |
|---|---|---|
| H1 · iOS Safari coupe la connexion (écran verrouillé, application en arrière-plan) | Le tir a été fait sur iPhone (capture). WebKit suspend les connexions d'une page qui n'est plus au premier plan. | Le propriétaire dit avoir vu le compteur avancer pendant sept minutes ; on ignore s'il a quitté l'écran. |
| H2 · les battements n'arrivent pas au navigateur (mise en tampon ou compression en route), et une couche ferme la connexion inactive | Même symptôme que le défaut du 2026-10-19. Rien n'a jamais **mesuré**, en production, que les octets du battement atteignent le navigateur. | `X-Accel-Buffering: no` est posé. |
| H3 · une limite de durée côté Vercel ou côté réseau, sans rapport avec l'inactivité | — | Aucune limite connue de cet ordre ; `maxDuration` vaut 900 s. |

**Pourquoi ce n'est pas tranché :** la CLI Vercel ne rend **aucune** ligne pour `/api/generateur/direct` sur 07:55–08:40 UTC (requête `vercel logs --query 'requestPath:/api/generateur/direct'`, 0 enregistrement). La route n'écrit rien en cas de succès, et la CLI ne fournit pas le journal des requêtes (statut, durée, déconnexion du client).

**Preuves qui trancheraient, sans rien corriger :**

- *Gratuite :* le journal de la requête dans le tableau de bord Vercel (Logs, filtre `/api/generateur/direct`, 08:11–08:21 UTC). Statut, durée et éventuelle fermeture côté client y figurent. Seul le propriétaire y a accès.
- *Gratuite :* le propriétaire dit s'il a verrouillé l'écran ou changé d'application pendant le tir. Si oui, H1 devient très probable.
- *Payante, sur accord seulement :* refaire un tir depuis un ordinateur, page au premier plan. S'il abandonne aussi, H1 est écartée.

## 3. Ce que devient la génération après l'abandon de l'écran

**Elle continue jusqu'au bout.** [LU-CODE + OBSERVÉ-PROD]

- Le code : quand le lecteur est parti, l'ajout du battement lève une exception, qui est avalée (« Le lecteur est parti : le travail continue, la ligne sera écrite », `route.ts:499-500`). `travailler()` n'observe pas la déconnexion.
- La production : l'œuvre a été insérée à 08:20:17.338, environ une minute **après** l'abandon de l'écran, avec `livree`, 503 683 ms et 0,1856 $.

## 4. La personne retrouve-t-elle son œuvre sans rien faire ? **Non.** [LU-CODE]

- **Sur l'écran de conversation, rien ne revient.** Le moteur direct est synchrone par construction : aucune génération asynchrone n'est suivie (`ConversationApplication.tsx:80-90` : `ASYNC` est faux quand le moteur est `direct`). Après `rendreLaMain`, l'écran n'interroge plus rien. Il garde « Lecture impossible » et le texte prêt à être renvoyé.
- **Sur le tableau de bord, l'œuvre est là, mais seulement après navigation ou rechargement.** La liste est chargée **une fois**, au montage de la page (`dashboard/page.tsx:456-469`, `useEffect` sans dépendance, sans rafraîchissement périodique). `mes-applications` renvoie l'œuvre, car elle est `livree` et appartient à la personne (`api/generateur/mes-applications/route.ts:46-51`).
- Rien ne dit à la personne d'aller la chercher là.

## 5. Ce que montre le carnet des tentatives dans ce cas

`app_generation_attempts` dit **`livree`**, avec ses heures, son coût et ses diagnostics. C'est la vérité côté serveur.

**Il ne voit pas l'abandon de l'écran.** La tentative est écrite par la route, qui ignore si le navigateur a lu la réponse. Le carnet ne permet donc pas de distinguer « livrée et vue » de « livrée, mais la personne a vu un échec ». Aucune autre source du dépôt ne le permet non plus.

Conséquence mesurable a posteriori : un renvoi du même texte par la même personne, quelques minutes après une tentative `livree`, serait la signature de ce défaut. Ce n'est pas encore mesuré.

## 6. Hors périmètre de ce document

- Aucune correction n'est proposée ici. Les options (reprise de l'œuvre après coupure, suivi par identifiant, consignation de l'erreur avalée, etc.) seront présentées si le propriétaire le demande.
- Le défaut est consigné dans la liste des chantiers à part (`PLAN_MANQUE4.md` §5 ter).
