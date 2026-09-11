# ATTIC — générateurs historiques (étape ⑥, EP-007 — archivés le 2026-09-11)

Ces scripts sont les campagnes HISTORIQUES du banc d'émission. Ils sont
conservés pour la preuve (leurs résultats vivent dans `results/` et dans les
rapports), mais ils ne font PLUS partie de la chaîne officielle :

| script | rôle historique | preuve d'inactivité |
|---|---|---|
| `emit.mjs` | campagne v1 (2.4) | plus aucun import ; référencé seulement en commentaire |
| `emit-v2.mjs` | campagne v2 | idem ; `emit-slice2` (lui-même archivé) relisait son texte |
| `emit-slice2.mjs` | tranche v2 rejouée | aucun consommateur |
| `replay-roundtrip.mjs` | preuve round-trip v1 | aucun consommateur |
| `replay-v2.mjs` | preuve round-trip v2 | `probe-mechanism` le cite en commentaire uniquement |
| `simulate-fix-v2.mjs` | simulation de correctif v2 | aucun consommateur |

LA chaîne officielle : `emit-v3.mjs` (génération) → `validateLocal` →
scripts de tranche (`slices/*/emettre.mjs`, écrivain unique
`slices/lib/ecrire-app.mjs`) → `compileProject`. Toute campagne nouvelle
part d'emit-v3 — relancer un script de cet attic serait un chemin parallèle
(ENGINE-PROBLEM-LOG EP-007).
