# ENGINE PROBLEM LOG — registre officiel (mission Elite A++++, ouverte 2026-09-11)

Règle : toute découverte est journalisée ici, aucune ne disparaît. Étape
propriétaire = où elle se résout. Statuts : 🔴 critique · 🟠 important ·
🟡 dette · 🟢 résolu.

| ID | Découvert | Couche | Description / preuve | Impact | Étape | Statut |
|----|-----------|--------|----------------------|--------|-------|--------|
| EP-001 | Carto #1/#2 | planner↔runtime | `modeListe`/`tailleApercu` calculés 2× (plan à l'émission, recalcul `air-runtime:679`) — convergence non contractuelle | décision divergente possible | ① | 🔴 |
| EP-002 | Carto #2 | shell | insets écrits sur 4 sites, 2 couches (émetteur l.545/554/595 + primary-nav:83) ; status bar SANS propriétaire (incident horloge mesuré) | classe entière d'incidents visuels | ② | 🔴 |
| EP-003 | Carto #2 | contrats | rôles d'icônes copiés sur 6 sites (schéma, registre, 2 tables runtime, digest ×2) — 2 divergences déjà payées | dérive silencieuse | ③ | 🟠 |
| EP-004 | Carto #1 | validation | `validerPlan` seulement en campagne — `emitProject` n'exige pas le blueprint | émission d'un plan incohérent possible | ④ | 🟠 |
| EP-005 | Carto #1/#2 | générateur | passe `ecrans` avant `actions` : boutons promus avant leurs gestes → cibles mortes payées en réparation (mesuré : 12 puis 8 refus) | coût API récurrent | ⑤ | 🟠 |
| EP-006 | DET-031/Carto #2 | document | `construire-fixture.mjs` : constructeur parallèle capable d'écraser le document officiel (2 destructions mesurées) | régression documentaire | ⑥ | 🔴 |
| EP-007 | Carto #2 | legacy | 5 scripts d'émission historiques inertes (emit.mjs, emit-v2, emit-slice2, replay-*, simulate-fix-v2) | confusion/bypass humain | ⑥ | 🟡 |
| EP-008 | Carto #2 | générateur | digest du prompt maintenu À LA MAIN vs registre (2 divergences payées : icônes, énums filtres) | dérive prompt/contrat | ③/⑤ | 🟠 |
| EP-009 | Carto #1 | CI | `runtime/` hors typecheck paquet — seul le tsc de l'app émise juge (import fantôme mesuré) | défaut tardif | ① (cliquet posé) / CI plus tard | 🟡 |
