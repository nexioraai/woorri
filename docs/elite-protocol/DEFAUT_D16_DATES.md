# D16 — une date affichée décalée d'un jour (2026-11-16)

Œuvre : Atelier `3b96d2e7` (une.deribfy.app). Une réparation du 10/11/2026 apparaît comme « 09/11/2026 » dans la liste Réparations, et comme « 2026-11-10 » dans Réparations récentes. Le propriétaire est à UTC−5.

Toutes les mesures ont été faites sous `TZ=America/Toronto`, sur le code servi :

- `scratchpad/oeuvre3b/page.html` pour l'Atelier ;
- `regi/page.html` pour le Registre de ventes ;
- `oeuvre4d/page.html` pour le Suivi de stock.

## 1. Qui écrit chaque forme

| Où | Code (écrit par) | Résultat pour « 2026-11-10 » |
|---|---|---|
| Atelier · liste Réparations | `formaterDate(iso)`, soit `new Date(iso).toLocaleDateString("fr-FR", …)` (le **modèle**, Gestion.tsx) | « 09/11/2026 » (mesuré) |
| Atelier · Réparations récentes | `quand: r.date`, c'est-à-dire le texte brut (le **modèle**) | « 2026-11-10 », juste |
| Bibliothèque `lireDate` (parMois, sommeParMois, plusRecents…) | `new Date(v)` (**Deribfy**) | `lireDate("2026-11-01").getMonth()` = 9, octobre (mesuré) |
| Bibliothèque `dateCourte` (ListeRecente) | `new Date(v)` (**Deribfy**) | la veille, ou « il y a 14 h » pour un jour sans heure |

**Pourquoi l'une décale.** ECMAScript lit une date sans heure (`AAAA-MM-JJ`) comme **minuit UTC**. À UTC−5, cet instant tombe le 9 à 19 h, et `toLocaleDateString` / `getMonth` lisent ensuite l'heure **locale**. La forme brute ne passe jamais par `Date` : elle reste juste.

## 2. Le décalage en avant : une autre cause

| Où | Code (modèle) | Mesure |
|---|---|---|
| Suivi de stock · défaut du formulaire | `useState(new Date().toISOString().slice(0, 10))` | le 16 à 20 h 30 local, on obtient « 2026-11-17 » |
| Registre · « mois courant » | `maintenant.toISOString().slice(0, 7)` | faux le dernier jour du mois après 19 h |
| Atelier · mois précédent | `new Date(a, m - 1, 1).toISOString().slice(0, 7)` | faux à **l'est** de Greenwich (Tchad, UTC+1) : minuit local tombe la veille en UTC |

`toISOString` donne le jour **de Greenwich**. C'est une cause différente de la première : la première lit un texte comme UTC, celle-ci écrit l'instant présent en UTC.

**Ce qui reste INCONNU.** Le cas vu « ce matin » : « une vente saisie le 16 affichée au 17 », dans le Registre de ventes.

- Le Registre servi n'a pas de valeur par défaut (`useState("")`). Il affiche `v.date` brut, dans le tableau comme dans les récentes. Aucun chemin du code servi ne transforme le 16 en 17.
- La forme `toISOString` du Suivi ne décale qu'entre 19 h et minuit, heure locale. Le matin, elle ne décale pas.
- Pour départager, il faut lire la valeur **stockée**. Requête, sur deribfy-bus-intercites :

```sql
select id, date, created_at from <table des ventes> order by created_at desc limit 5;
```

Lecture du résultat :

- une colonne `date` qui vaut `2026-11-17` alors que la saisie est le 16 signifie que la valeur a été écrite décalée (formulaire) ;
- une colonne qui vaut `2026-11-16` signifie que le décalage vient de l'affichage, ce que le code servi ne montre pas.

## 3. La correction, dans le générateur

**① Bibliothèque** (`bibliotheque-ui.ts`, fichiers émis `systeme/donnees.ts` et `systeme/ui.tsx`). `lireDate` et `dateCourte` lisent `AAAA-MM-JJ` comme un **jour local**. `dateCourte` ne donne plus d'heure à un jour : elle répond « aujourd'hui », « hier » ou la date. Les horodatages complets ne changent pas.

**② Juge `juge-dates.ts`.** C'est une lecture pure, sans montage ; le juge d'exécution monte sans données et ne verrait jamais une date. Le juge relève les deux formes du modèle :

- `toISOString().slice(0, 10|7)` et `.split("T")` ;
- `new Date(x)` lu en local, directement ou par une variable voisine.

Son reproche donne le remède : `lireDate(v)` de `./systeme/donnees`, ou `new Date().toLocaleDateString("sv-SE")`. Il est **non bloquant**. Si le temps manque, l'œuvre est livrée avec un diagnostic « N date(s) qui peuvent s'afficher décalées d'un jour », visible sur la carte.

**La consigne n'a pas grandi** : 10 216 caractères avant, 10 216 après (mesuré). Le remède n'est dit qu'au moment où la faute est vue.

**Ce que le juge NE voit PAS.** Une date passée par un détour plus long qu'une variable voisine, par exemple une fonction utilitaire d'un autre fichier. **Faux positif assumé** : `new Date(horodatage).getMonth()` est juste, mais il est signalé quand même. Le remède proposé est juste dans les deux cas : cela coûte un tour de plus, jamais une faute de plus.

**Mesure sur les trois œuvres servies.** Le juge relève 7 lignes :

- Atelier, 3 : `formaterDate` et deux `toISOString().slice(0, 7)` ;
- Registre, 2 ;
- Suivi, 2 : le défaut du formulaire et `new Date(m.date).getMonth()`.

**Preuves.** Le test `d16-dates-decalees.test.ts` compte 7 tests, exécutés sous UTC−5 sur le code **émis**. Contrôle négatif : avec l'ancienne bibliothèque, les 3 volets ① tombent. Gate : `npm run verifier` EXIT=0, 499 fichiers et 6 369 tests.

## 3 bis. Décision 1 du propriétaire (2026-11-16) : le Tchad. FAIT, commit `2d24f490`.

Mesuré sous `Africa/Ndjamena` (UTC+1), le marché réel :

- `new Date(a, m - 1, 1).toISOString().slice(0, 7)` rend **« 2026-09 » pour octobre**, et cela **en permanence** ;
- le jour et le mois courants calculés avec `toISOString` sont faux entre 00 h et 01 h ;
- la lecture d'un jour (« 2026-11-10 ») ne se décale pas.

Ce qui a été fait :

- La forme `toISOString().slice/substring/substr(0, 10|7)` est maintenant **BLOQUANTE**. Une œuvre qui la garde au dernier tour n'est pas livrée, avec le motif « calculait encore ses dates à l'heure de Greenwich (fichiers) ». Aucun faux positif n'est connu.
- Les autres formes restent non bloquantes : `split("T")` et `new Date(x)` lu en local, faux positif assumé compris.
- `d16-dates-decalees.test.ts` couvre désormais UTC−5 **et** UTC+1, avec 12 tests. Contrôle négatif : avec la boucle d'avant, le test du refus tombe.

**Conséquence assumée :** une génération dont le modèle ne corrige pas cette forme avant la fin est payée sans être livrée.

## 4. Alternative non retenue (décision du propriétaire si voulue)

**Remplacer le `Date` global** dans chaque paquet, pour qu'un texte `AAAA-MM-JJ` soit lu comme un jour local.

- Avantage : cela fermerait la forme ① pour **tout** le code du modèle, sans un tour de plus.
- Coût : cela change la sémantique d'un objet standard, pour tous les paquets embarqués (supabase-js compris).

Ce n'est pas fait sans arbitrage. La forme ② (`toISOString`) n'en serait pas couverte.
