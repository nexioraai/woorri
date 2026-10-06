# Gabarit scellé de la cible WEB

Ce répertoire ne contient qu'une chose, et c'est la plus importante :
**`package-lock.json`**.

## Pourquoi un verrou

La cible native scelle le sien depuis l'origine (`../template/`). La cible web
n'en avait AUCUN — mesuré le 2026-10-05, et c'est une limite que la gate de
compilation déclarait elle-même.

Sans verrou, le propriétaire installe aujourd'hui `vite` 7.3.6 et dans six
mois autre chose. Son `npm run build` peut alors casser sur une version
transitive qu'il n'a pas choisie, sans explication et sans que rien de notre
côté n'ait changé. Un générateur qui produit un projet non reproductible
produit un projet qui pourrit.

## D'où il vient

D'un `npm install` RÉEL lancé sur le `package.json` ÉMIS, dont le build a été
vérifié (`vite build` → 31/31). Il n'est pas écrit à la main : un verrou
fabriqué ne correspondrait à aucune installation possible.

Son champ `name` est NEUTRE (`deribfy-app-web`) ; l'émetteur le remplace par
le slug de l'application, pour que `package.json` et le verrou s'accordent.

## Comment on le met à jour

Quand le gabarit web change de dépendance :

1. émettre une application web, y lancer `npm install`,
2. recopier le `package-lock.json` obtenu ici, `name` neutralisé,
3. `node scripts/embed-template.mjs`,
4. `npm run gate:app-web-build` — il installe par `npm ci`, qui REFUSE un
   verrou en désaccord avec le `package.json`. C'est ce refus qui tient la
   cohérence, pas une relecture humaine.
