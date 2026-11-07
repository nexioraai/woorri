# PLAN — Site institutionnel CPA-Tchad

> **DOCUMENT VIVANT.** Il se met à jour **à chaque lot livré** : statut, heures
> réelles, écarts, décisions nouvelles. Un plan qu'on ne met pas à jour
> redevient un souvenir au bout de deux jours — c'est précisément ce qui nous
> est arrivé les 6 et 7 novembre 2026.
>
> **À lire AVANT toute séance sur la CPA.**

| | |
|---|---|
| **Créé** | 2026-11-07 |
| **Dernière mise à jour** | 2026-11-07 |
| **Source du besoin** | `~/Downloads/CPA.pdf` — Cahier des charges v2.0, Mahamat Saleh Zene, agent informaticien CPA-Tchad, octobre 2026, 12 pages |
| **Références visuelles** | `epss.gov.et` (centrale pharmaceutique éthiopienne, analogue direct) · `uniha.org` |
| **Site** | `cpa-tchad.deribfy.app` · slug `centrale-pharmaceutique-d-achats-cpa-1793979506814` · thème `editorial` |

---

## 0 · DÉCISIONS PRISES — ne pas rouvrir sans nouvelle instruction

| date | décision |
|---|---|
| 2026-11-07 | **Un SITE, pas la plateforme à 4 couches** du cahier (§4) |
| 2026-11-07 | **Portails authentifiés en V1** (client + fournisseur) |
| 2026-11-07 | **Soumission électronique des offres INCLUSE** |
| 2026-11-07 | Nom conservé : **CPA** |
| 2026-11-07 | **Hébergement sur Deribfy** — affirmé par le propriétaire |
| 2026-11-07 | **On part du site DÉJÀ GÉNÉRÉ**, jamais de zéro |
| 2026-11-07 | On copie la **STRUCTURE** d'EPSS, **pas son apparence** — la CPA garde le thème `editorial` |
| 2026-11-06 | `publie` est le seul interrupteur d'un avis ; `etat` est informatif (arbitrage B) |
| 2026-11-06 | Le **lien de menu** suit `publishes_tenders` ; la **section d'accueil** suit les avis réels |

---

## 1 · ARBORESCENCE CIBLE — 58 adresses

### A · Public — 8 entrées, 32 pages

**1. Accueil** — hero carrousel · chiffres clés (source + date) · avis à la une ·
actualités · deux portes d'entrée · partenaires · pied de page

**2. Qui sommes-nous ▾ (7)**
`/qui-sommes-nous` · `/histoire` · `/missions` · `/gouvernance` · `/direction` ·
`/equipes` · `/etablissements` · **`/organigramme`**

**3. Nos activités ▾ (5)**
`/activites/approvisionnement` · `/qualite` · `/stockage` · `/distribution` · `/programmes`

**4. Catalogue ▾ (3)**
`/catalogue` · `/catalogue/categories` · `/catalogue/<référence>`
*Information publique seulement — disponibilité temps réel HORS V1 (annexe A)*

**5. Appels d'offres ▾ (6)**
`/appels-offres` ✅ · `/preparation` · `/attributions` · `/archives` ·
`/comment-repondre` · `/calendrier` · `/appels-offres/<référence>` ✅

**6. Fournisseurs ▾ (5)**
`/fournisseurs/enregistrement` · `/conditions` · `/documents` · `/faq` · `/contact`

**7. Actualités ▾ (3)**
`/actualites` ✅ · `/evenements` · `/communiques` · `/actualites/<titre>` ✅

**8. Contact (1)** — formulaire routé, référence automatique, accusé de réception

**Pied de page (4)**
`/mentions-legales` · `/confidentialite` · `/accessibilite` · `/plan-du-site`

### B · Authentifié — 17 pages

**Accès (3)** `/connexion` · `/inscription` · `/mot-de-passe-oublie`

**Espace établissement (6)** `/espace-client` · `/mes-demandes` ·
`/nouvelle-demande` · `/mes-reclamations` · `/mes-documents` · `/mon-profil`

**Espace fournisseur (8)** `/espace-fournisseur` · `/mon-dossier` ·
`/ma-prequalification` · `/mes-consultations` · **`/deposer-une-offre`** ·
`/mes-offres` · `/mes-reclamations` · `/mon-profil`

### C · Administration — 9 pages

`/admin` · `/publications` · `/admin/appels-offres` · `/offres-recues` ·
`/clients` · `/fournisseurs` · `/demandes` · `/documents` · `/utilisateurs`
**+ journal d'audit**

### Familles engendrées — 4
un avis · un article · un produit · une province

---

## 2 · LES LOTS — 236 h

| # | lot | h | statut |
|---|---|---|---|
| 1 | **Routage** — le verrou | 18 | ⬜ |
| 2 | Menu à plusieurs niveaux + pied de page | 6 | ⬜ |
| 3 | Gabarit de page + les 20 pages de contenu | 12 | ⬜ |
| 4 | **Organigramme interactif + alternative 2D** | 16 | ⬜ |
| 5 | Appels d'offres enrichis | 20 | ⬜ |
| 6 | Catalogue public | 12 | ⬜ |
| 7 | Actualités — événements, communiqués, filtres | 8 | ⬜ |
| 8 | Contact et demandes — référence auto, suivi | 10 | ⬜ |
| 9 | Pages légales + plan du site engendré | 4 | ⬜ |
| 10 | **Authentification, rôles, habilitations** | 16 | ⬜ |
| 11 | **Espace établissement** | 24 | ⬜ |
| 12 | **Espace fournisseur + dépôt de pièces** | 30 | ⬜ |
| 13 | **Soumission électronique des offres** | 30 | ⬜ |
| 14 | **Administration — workflow, audit, tableau de bord** | 30 | ⬜ |

**Ordre** : 1 → 2 → 3 → 5 → 7 → 8 → 4 → 6 → 9, puis 10 → 11 → 12 → 13 → 14.
**Premier résultat visible : 24 h** (lots 1+2).

---

## 3 · ÉTAT RÉEL — au 2026-11-07

### La convention de cochage — elle n'est pas décorative

| | sens | ce qu'il faut pour y avoir droit |
|---|---|---|
| ⬜ | **pas fait** | — |
| 🔄 | **écrit, pas prouvé** | le code existe ; il n'est pas déployé, ou pas mesuré à l'écran servi |
| ✅ | **FAIT, VÉRIFIÉ, REVÉRIFIÉ** | déployé · mesuré à l'adresse publique · **et confirmé une seconde fois, par un autre geste que celui qui l'a produit** |

**Écrire du code ne coche rien.** Un cliquet vert ne coche rien non plus :
il garde la RÈGLE, pas le RENDU (principe P-01). Une case ✅ exige la mesure
à l'écran **servi**, puis sa confirmation indépendante.

### L'état, honnêtement

| | quoi | preuve |
|---|---|---|
| ✅ | `/appels-offres` — liste, deux sections, états dérivés | 26/26 à l'écran servi, et retrait reconfirmé à la main |
| ✅ | `/appels-offres/<référence>` — 19 rubriques, dates prévisionnelles marquées | idem, 6 points sur le témoin « en préparation » |
| ✅ | sécurité — vue `appels_offres_public`, aucune fuite inter-site | 21/21 en base **et** 26/26 à l'écran, dans les deux sens, 8 autres sites tous RÉELLEMENT lus |
| ✅ | lien de menu `publishes_tenders` | 6/6 à l'écran servi, après les cinq gestes de la colonne |
| ✅ | relevé de base du routage | 63 mesures sur 9 sites — 27×200 / 36×404 |
| 🔄 | **section d'accueil des avis** | écrite et mesurée **en local**. Jamais vue en production : elle ne s'affiche qu'avec des avis, et il y en a **0**. |
| 🔄 | **suppression d'éléments et de sections dans `/edit`** | écrite, `tsc` propre, **non poussée, non cliquée**. La preuve exige un clic sur du contenu réel et une relecture en base. |

**Deux cases viennent d'être DÉCOCHÉES** en appliquant la convention : je les
avais marquées faites alors qu'elles n'étaient qu'écrites. C'est exactement la
confusion qui a fait croire pendant deux jours que le site avançait.

---

## 4 · CONTRAINTES À NE PAS OUBLIER

**① La soumission électronique n'est pas un formulaire.** Une offre déposée doit
être **scellée jusqu'à l'heure d'ouverture** : chiffrement au dépôt ·
horodatage opposable · ouverture impossible avant l'échéance · journal de qui
ouvre et quand. **Une offre lisible en avance annule la procédure.**

**② Le workflow éditorial touche les 42 sites.** `brouillon → relecture →
validation → publication → archivage`, avec auteur, validateur et dates.
Deribfy publie en un clic.

**③ L'hébergement contredit le §9.1 du cahier** — « aucune dépendance critique
ne doit être liée au compte personnel d'un prestataire ». Décision prise, mais
la CPA peut l'opposer **à la réception**.

**④ Rien ne s'affiche sans sa source** — chiffre sans source, document sans
fichier, mention légale inventée : aucun ne s'affiche. Le cahier l'exige en
§5.1 et §5.2.

**⑤ Noms et mot de la Direction : publication après autorisation explicite** (§5.1, §6.1).

**⑥ Une colonne neuve coûte CINQ gestes** — `ALTER TABLE` · le type · la
projection · le `GRANT UPDATE` colonne · **la vue `sites_public`**. Les trois
derniers échouent en silence. Voir GEN-D042 et GEN-D043.

---

## 5 · DÉCISIONS QUE LA CPA DOIT ENCORE PRENDRE — §12 du cahier

1. Niveau du catalogue — information publique seule ? *(hypothèse retenue)*
2. Cadre juridique de la soumission électronique
3. Organigramme : noms publiables ou non
4. Validateurs, administrateurs, responsables de maintenance

---

## 6 · JOURNAL DES MISES À JOUR

| date | quoi |
|---|---|
| 2026-11-07 | Création. Plan établi après lecture du cahier des charges et analyse en profondeur d'EPSS (8 pages, 3 niveaux). |
| 2026-11-07 | **Convention de cochage posée** : ✅ = fait + vérifié + revérifié à l'écran servi. Deux cases décochées en l'appliquant — la section d'accueil et la suppression dans `/edit` étaient écrites, pas prouvées. |
