# PLAN — Deribfy génère seul des sites institutionnels

Chantier ouvert le 2026-11-26. Référence : le site de la CPA (fait à la main, par
scripts) — il ne change jamais à cause de ce chantier. Règle absolue du
propriétaire : **aucune section visible des visiteurs sans données réelles** ;
rien n'est inventé (ni nom, ni chiffre, ni coordonnée, ni biographie).

Ce fichier est le plan vivant : un lot n'y change d'état que sur preuve
(gate verte, mutations, captures, et pour « en ligne » : ls-remote, version,
Vercel READY, applis à 200).

## Fait

| Lot | Contenu | État |
|---|---|---|
| 1 | Module Actualités (opt-in par une page `actualites`), catégories d'articles | en ligne |
| 2 | Textes neutres : `sites.designation`, plus de « la Centrale » en dur | en ligne |
| 3 | Reconnaissance d'une institution à la génération (6 familles), mode 1, rien d'inventé | en ligne |
| 4 | Pages et sous-pages semées à la génération, photos, logo provisoire au sigle | en ligne |
| 4b | Thème `institution` : grand menu à panneaux, couleur par rubrique, chiffres clés jamais faux | en ligne |
| 4c | Site complet : logo en aperçu, en-têtes de pages, recherche « / », contraste élevé, Le Ministère (biographie, organigramme modifiable, organismes sous tutelle), Programmes en cours, pages légales, réseaux, « Maquette de démonstration », lignes « À compléter » jamais montrées aux visiteurs (tous thèmes) | local, en cours de preuve |

Limites connues du 4c, acceptées :
- la politique de confidentialité ne se réécrit pas si l'assistant est allumé plus tard ;
- sur les pages spéciales (espace, accès, catalogue, suivi des demandes, appels
  d'offres), le propriétaire voit comme un visiteur (ses lignes « À compléter »
  n'y sont pas montrées, même à lui).

## À faire, dans cet ordre

0. **Juste après le push du 4c — boutique alloufshop : erreur d'hydratation.**
   Mesurée le 2026-11-26, en production comme en local : une balise `<a>`
   contenue dans une autre `<a>` (React #418, « Hydration failed ») sur
   l'accueil de `alloufshop-1789941466658`. Elle existait avant le 4c (même
   erreur en production en `651c98b`) ; hors chantier, consignée ici pour ne
   pas être oubliée. À corriger dans le générateur ou le thème qui produit le
   lien imbriqué (règle : on répare le générateur, jamais l'appli), puis
   vérifier les autres boutiques du même thème.
1. **Arabe (FR / العربية)** — lot séparé, après le 4c. Décidé le 2026-11-26 :
   - stockage : **option B**, une colonne de traductions (jsonb) sur
     `site_pages` et sur `sites` — une même page, deux langues ;
   - règle : une version arabe générée n'est **publiée qu'après relecture
     humaine** par l'institution (règle de l'option C) ;
   - les textes fixes du squelette se traduisent sans coût ; produire les
     textes générés en arabe demande un tir payant, donc un accord de dépense.
2. **Lot 5 — portail des démarches.**
3. **Lot 6 — cartographie.**
4. **Lot « dates »** (ajouté le 2026-11-26) : dates de publication et de
   retrait AUTOMATIQUES pour les pages et les actualités (exemple : un appel
   d'offres qui expire). Pas dans ce lot : comptes multiples, circuit de
   validation.
5. **Banc d'essai** du générateur : noms fictifs seulement ; aucun site au nom
   d'une vraie institution publié en ligne ; tir payant seulement avec accord.

Hors plan pour l'instant : comptes multiples par site, circuit de validation.
