# Plan — la boucle tourne tant qu'il reste du temps, et ne livre jamais une application qui ne démarre pas

- **Date :** 2026-11-16.
- **Statut :** PLAN **VALIDÉ** le 2026-11-16 (§6). Lot en cours d'écriture, rien de poussé.
- **Code lu :** `main` @ `662bfea8`.
- **Origine :** le registre de clients (`1dd7eb95`), généré depuis l'interface sur le lot `662bfea` et livré cassé (« render is not a function »).

## 0. Ce que les requêtes P1 à P3 ont établi [OBSERVÉ-PROD, captures du propriétaire]

| tour | durée | accepté | reproche renvoyé ensuite |
|---|---|---|---|
| 1 | 160 s | non | DES JETONS QUI N'EXISTENT PAS — l'application MOURRAIT au démarrage |
| 2 | 85 s | non | DES CONTRÔLES MORTS |
| 3 | 74 s | **oui** | — |

- Version livrée : `monte_selon_le_juge = false`, erreur vue par le juge `import : import__embarque_react_dom.default.render is not a function`. Diagnostic stocké : « L'application ne se monte pas (simulateur) : … ».
- Tentative : `livree`, 319 492 ms, 0,0853 $.
- **Conclusion : le juge a vu l'erreur, et l'œuvre a été livrée parce que le tour 3 était le dernier** (`boucle-directe.ts:684-705`). Ce n'est pas un sixième défaut d'instrument : c'est H-C, la règle du dernier tour.
- **Précision :** au tour 1, le juge d'exécution n'a pas tourné, par construction : il ne tourne que si aucun jeton inventé n'est trouvé (`boucle-directe.ts:504-505`). On ne peut donc pas dire si la ligne `render` existait déjà au tour 1.

## 1. Combien de tours tiennent dans 900 s [MESURÉ, T1 du 2026-11-16, 44 générations `main` + le registre]

| | premier tour | tours suivants |
|---|---|---|
| médiane | 180 s | 101 s |
| 9 sur 10 sous | 279 s | 158 s |
| maximum observé | 486 s | 220 s |

Avec une marge de 60 s pour les juges du dernier tour et l'écriture (le temps hors tours mesuré vaut de 0 à 5 s ; un juge d'exécution peut prendre jusqu'à 15 s, `PLAFOND_MS`) :

- **cas médian :** 180 + 6 × 101 = 786 s, soit **7 tours** ;
- **cas lent (9 sur 10) :** 279 + 3 × 158 = 753 s, soit **4 tours** ;
- **pire observé :** 486 + 220 = 706 s, soit **2 tours**.

Le registre de clients (160, 85, 74) en aurait permis environ 8. **Le 3 n'était ni une contrainte de temps ni une mesure.**

## 2. Ce qui limite, en plus du temps

- **Les jetons d'entrée grossissent :** chaque tour renvoie toute la réponse précédente. Mesuré : +6 000 à +7 300 jetons par tour (expérience du 2026-11-16 : 4 517, puis 11 915, 19 135, 21 692). Au 7ᵉ tour : environ 45 000 jetons. La fenêtre de contexte de `deepseek-v4-pro` est de **1M jetons**, et la sortie maximale de **384K** (documentation officielle, https://api-docs.deepseek.com/quick_start/pricing, relevé le 2026-11-16 : « CONTEXT LENGTH 1M », « MAX OUTPUT MAXIMUM: 384K », modèle `deepseek-v4-pro` = DeepSeek-V4-Pro-0813). Le garde-fou est au §6.
- **Le coût par tour monte avec eux :** de 0,02 à 0,05 $ mesurés sur les 4 premiers tours. Au 7ᵉ, il faut ajouter environ 0,005 $ d'entrée par tour en heure creuse, le double en pointe. Une génération à 7 tours coûterait environ 0,25 $ en heure creuse et 0,50 $ en pointe. **Proposé : un plafond de coût par génération, 0,50 $, à toi de fixer.**
- **L'attente de l'utilisateur :** jusqu'à 15 minutes. Elle aggrave le défaut d'abandon d'écran sur mobile, documenté et non corrigé.
- **La dégradation par l'historique, ton hypothèse du matin :** pas observée jusqu'au 4ᵉ tour. Au-delà, c'est **UNKNOWN**.
- **Un appel commencé trop tard est tué par Vercel à 900 s,** sans écrire de tentative. Il faut donc une échéance stricte (§3.1).

## 3. Le plan

### 3.1 La boucle s'arrête sur une échéance, pas sur un nombre

- La route passe à la boucle une **échéance** : début de la route (`route.ts:531`) + 900 s − 60 s de marge.
- **Avant chaque tour,** la boucle n'en lance un autre que si `maintenant + estimation ≤ échéance`. L'estimation vaut la durée du tour le plus long de **cette** génération, sans descendre sous 160 s (le 9 sur 10 des tours suivants).
- **L'appel au modèle est interrompu à l'échéance** (`AbortController`). La tentative est alors toujours écrite, et l'œuvre refusée proprement, au lieu d'être tuée sans trace.
- `TOURS_MAX` reste comme **plafond de sécurité**, à 10, mais ne décide plus rien en temps normal.
- **Fichiers :** `boucle-directe.ts` (`boucleEcriture` reçoit `echeance` ; garde `:385`), `route.ts` (calcul de l'échéance, appel interruptible).

### 3.2 Un défaut bloquant n'est JAMAIS accepté

- **Défauts bloquants :** l'application ne se monte pas (`execution.monteDansSimulateur === false`), ou des jetons inventés (l'application mourrait au démarrage, et le juge d'exécution n'a même pas tourné). L'échec d'assemblage est déjà un refus.
- **À l'échéance, avec un défaut bloquant :** `ok: false`, statut `refusee`, et un motif lisible pour l'utilisateur, par exemple : « Après N essais, l'application ne démarrait toujours pas : rien n'a été livré. » Le dernier code n'est pas livré.
- **Fichier :** `boucle-directe.ts:684-705` (la règle du dernier tour, scindée en bloquant et non bloquant).

### 3.3 Les défauts non bloquants sont montrés à l'utilisateur

- Ils peuvent encore être acceptés à l'échéance.
- Ils sont montrés là où l'utilisateur regarde :
  - **à la fin de la génération,** dans l'écran de conversation, qui en affiche déjà une partie (`ConversationApplication.tsx:1213-1216`), à compléter pour qu'il les affiche tous ;
  - **sur la carte de l'application** du tableau de bord, en une ligne repliable. `mes-applications` lit déjà la ligne de l'œuvre : il faut ajouter `diagnostics` à sa projection, ce qui est à vérifier dans `api/generateur/mes-applications/route.ts:46`.

### 3.4 Garde-fou : une boucle qui n'avance plus s'arrête

- **Règle proposée :** si deux tours refusés **de suite** portent exactement les **mêmes familles de reproches** (le titre de chaque reproche, comme dans T5), la boucle s'arrête. Elle livre si aucun défaut n'est bloquant, sinon elle refuse.
- **Ce que T5 a mesuré :** sur 64 paires de tours refusés, 13 avaient les mêmes familles (3 au mot près, 10 au texte près). Ce sont elles qui s'arrêteraient un tour plus tôt.
- **Second garde-fou :** le plafond de coût par génération (§2).

## 4. Hors du périmètre

Décision 3, « Régénérer », la couverture et ses 19 familles, les chantiers à part. Le défaut d'abandon d'écran n'est pas traité, mais il est aggravé par des générations plus longues ; à décider à part.

## 5. Vérification, énoncée d'avance (règle de preuve)

- **Le test :** on regénère le **registre de clients** depuis l'interface, même demande, avec la correction. Une seule chose change.
- **Attendu :**
  - soit une application qui démarre, avec ses diagnostics non bloquants montrés ;
  - soit un refus annoncé, « l'application ne démarrait pas ». **Jamais** une application cassée marquée « livrée ».
- **Lecture en base :** les requêtes P1 à P3, plus le nombre de tours.
- **Le verdict est le tien.** Coût estimé de 0,10 à 0,30 $.

## 6. Décisions du propriétaire (2026-11-16)

- **Plan validé tel quel :** l'échéance au lieu d'un nombre de tours ; `TOURS_MAX` à 10 comme plafond de sécurité ; un défaut bloquant n'est jamais accepté ; un refus annoncé plutôt qu'une coquille livrée ; les défauts non bloquants montrés ; l'arrêt après deux tours aux mêmes familles de reproches.
- **Plafond de coût : 0,50 $ par génération.** Raison du propriétaire : les générations réussies coûtent de 0,09 à 0,10 $. Un plafond à 0,50 $ laisse passer une boucle qui progresse et coupe celle qui s'emballe. Un abonnement Pro à 15 CAD absorbe une trentaine de générations à ce prix ; ajustement prévu quand les chiffres d'usage réels existeront.
- **Garde-fou de contexte, dans le même lot :** avant un tour, si les jetons d'entrée attendus (ceux du tour précédent, plus leur dernière croissance) **plus** la sortie demandée (`maxJetons`, 65 536, `fournisseur.ts:185`) dépassent la fenêtre de 1M, la boucle s'arrête proprement, et refuse si un défaut est bloquant. Avec les chiffres mesurés, ce cas ne se produit pas avant plusieurs dizaines de tours ; le garde-fou existe pour qu'il échoue en le disant, jamais en silence.
- **L'abandon d'écran devient nécessaire à corriger :** une génération de 5 minutes faisait déjà abandonner l'écran sur mobile ; jusqu'à 15 minutes, ce sera systématique. **Cette correction rend le chantier de la génération en tâche de fond nécessaire, pas seulement souhaitable. Il remonte dans la liste.** Il n'est pas traité dans ce lot.

