# Worker — suppression de fond (U²-Net, 100 % libre, auto-hébergé)

**Aucun fournisseur de modèle IA n'est appelé.** Le modèle est téléchargé une
fois, il vit sur le disque du worker, et l'inférence s'exécute sur le
processeur via `onnxruntime-node`.

## Pourquoi un processus séparé, et pas une route Next

Ce n'est pas un choix de style, c'est une contrainte mesurable :

| fait | valeur |
|---|---|
| poids du modèle U²-Net | **~176 Mo** |
| `onnxruntime-node` | ~120 Mo |
| plafond d'une fonction serverless Vercel | **250 Mo décompressés** |

Le modèle seul dépasse déjà ce que le runtime laisse. Et même s'il tenait :
chaque invocation serverless repart à froid, donc rechargerait 176 Mo **par
photo** — plus cher que l'inférence elle-même. Un worker garde le modèle en
mémoire et n'en paie le chargement qu'au démarrage.

## Installation

```bash
cd workers/suppression-fond
npm install
npm run modele          # télécharge u2net.onnx (~176 Mo), une seule fois
IMAGE_WORKER_TOKEN=<un secret> npm start
```

Puis, côté application :

```
IMAGE_WORKER_URL=https://<hôte-du-worker>
IMAGE_WORKER_TOKEN=<le même secret>
```

**Tant que ces deux variables sont absentes, l'option n'apparaît pas dans
l'interface du marchand.** `fondDisponible()` rend `false`, et rien n'est
promis. Une fonctionnalité annoncée mais indisponible est pire qu'absente.

## Coût réel

L'inférence U²-Net sur processeur, à 320×320 (la résolution d'entrée du
modèle), prend de l'ordre de **1 à 3 s par image** sur un cœur moderne, et
demande environ **700 Mo à 1 Go de mémoire** en pointe.

Une machine à 1 vCPU / 1 Go traite donc quelques dizaines de photos par minute :
très largement au-dessus du rythme réel d'un catalogue de boutique. **Ce n'est
pas un poste de dépense significatif** — c'est une contrainte de FORME
(il faut un processus qui dure), pas de volume.

## Ce que ce worker ne fait pas

- Aucun agrandissement (Real-ESRGAN) : voir `PROGRESS.md`, évalué et **non
  retenu** en l'état.
- Aucune écriture dans le stockage : il rend l'image détourée à l'appelant,
  qui décide. Un worker qui écrirait dans la base serait une seconde autorité
  sur les données des marchands.
