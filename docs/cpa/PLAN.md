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
| **Dernière mise à jour** | 2026-11-09 — lots 15.11 et 15.12 |
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
| 1 | **Routage** — le verrou | 18 | ✅ **FERMÉ** — déployé `5d711a9` · 13/13 en production · relevé d'après : **0 écart** sur 63 mesures |
| 2 | Menu à plusieurs niveaux | 6 | ✅ **FERMÉ** — déployé `dab372c` · 9/9 en production |
| 3 | Gabarit de page + les 20 pages de contenu | 12 | ✅ **FERMÉ** — 30/30 pages, 146 blocs, 15 types · déployé `f1f5f5b` |
| 4 | **Organigramme interactif + alternative 2D** | 16 | ✅ **FERMÉ** — bloc `organigramme` (5 occurrences dans le vocabulaire), servi sur `/qui-sommes-nous/gouvernance` : **200 à l'adresse publique**, 18 occurrences mesurées le 2026-11-09. *La ligne disait ⬜ alors que le travail était fait — corrigée après vérification dans le dépôt ET à l'écran.* |
| 5 | Appels d'offres enrichis | 20 | ✅ **FERMÉ** — dossier de consultation (14/14 en base) · filtre par état (**28/28 à l'adresse publique**) · **archive** servie par `appels-offres/archive/page.tsx`, qui rend 404 quand elle est VIDE et le dit dans son code : proposer un lien vers une archive vide, c'est promettre un contenu qu'on ne livre pas · **avis d'attribution** : `attributaire`, `montant_attribue`, `attribue_le` projetés par `fetchAvis`. *La ligne disait 🔄 alors que les deux restes étaient livrés — corrigée le 2026-11-09 après vérification.* |
| 6 | Catalogue public | 12 | ✅ **FERMÉ** — **26/26 à l'adresse publique**. Ni prix ni stock par CONSTRUCTION : la table n'en porte pas (PGRST204 mesuré). Un brouillon rend le MÊME 404 qu'une référence inexistante. |
| 7 | Actualités — événements, communiqués, filtres | 8 | ✅ **FERMÉ** — le moteur avait déjà son fonds d'articles ; il manquait la CATÉGORIE. Bloc « articles » (16ᵉ type), **21/21 à l'adresse publique**, et `/blog` ne perd rien. |
| 8 | Contact et demandes — référence générée automatiquement, et suivi de la demande | 10 | ✅ **FERMÉ** — **20/20 à l'adresse publique**. Les deux échecs rendent mot pour mot la même réponse ; le texte du demandeur ne sort jamais. |
| 9 | Pages légales + plan du site engendré | 4 | ✅ **FERMÉ** — **20/20 à l'adresse publique**. Un brouillon ne laisse ni titre ni chemin dans le plan ; une route moteur s'efface si une page déclarée porte son chemin. |
| 10 | **Authentification, rôles, habilitations** | 16 | ✅ **FERMÉ** — mécanique posée et mesurée (17 + 7 + 11 points). **Pas de preuve à l'écran** : rien n'est encore visible, c'est le lot 11 qui construit l'espace. Une dette nommée, voir §10. |
| 11 | **Espace établissement** | 24 | ✅ **FERMÉ** — `/mes-documents` livré au lot 12.1 (table `comptes_documents`, seau PRIVÉ). Tranche B : `/mes-demandes`, `/mes-reclamations`, `/mon-profil` (colonne `messages.type`, vocabulaire fermé). **`/mes-documents` NON FAIT** — voir §11. Tranche A bis : `/comptes/[slug]` au TABLEAU DE BORD (jamais dans `/edit`), pastille du nombre de demandes en attente. Tranche A : `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/espace-client` ; capacité `ouvre_des_comptes` (CPA seule, 1/42 vérifié) ; **dette §10 FERMÉE**. Restent `/mes-demandes`, `/mon-profil`, `/mes-documents`, `/mes-reclamations`. |
| 12 | **Espace fournisseur + dépôt de pièces** | 30 | ✅ **FERMÉ** — 12.4 : `/mes-consultations` (avis ouverts, « offre déposée », droit de répondre selon la qualification) et `/espace-fournisseur` qui REDIRIGE vers l'espace — une seconde page d'accueil serait une seconde vérité. Avant : 12.3 : `/ma-prequalification`, verdict de la Centrale (vocabulaire fermé, JAMAIS visible d'un autre fournisseur). Reste `/espace-fournisseur` et `/mes-consultations`. 12.2 : `/mon-dossier`, pièces exigées DÉCLARÉES par la Centrale depuis `/edit` (clé stable, libellé corrigible), rattachement validé contre la liste réelle. Restent `/espace-fournisseur`, `/ma-prequalification`, `/mes-consultations`. 12.1 : les documents d'un compte DANS LES DEUX SENS, seau privé, liens signés 60 s, retrait qui laisse une trace. Restent la préqualification et le dossier fournisseur. |
| 13 | **Soumission électronique des offres** | 30 | ✅ **FERMÉ** — 13.2 : `/offres/[slug]` au TABLEAU DE BORD, la Centrale télécharge, retient, écarte et répond ; pastille des offres non décidées. 13.1 : portée d'un avis (national/international/tous), table `offres` + seau PRIVÉ, écran « Déposer une offre » avec compte ACTIF obligatoire, refus après la date limite. Reste l'écran où la Centrale reçoit et répond. |
| 14 | **Administration — workflow, audit, tableau de bord** | 30 | ✅ **FERMÉ** — 14.1 la Centrale écrit, publie et attribue ses avis (aucun fichier n'écrivait dans `appels_offres` : d'où zéro avis) · 14.2 elle traite demandes et réclamations, le demandeur lit la réponse · 14.3 journal d'audit en AJOUT SEUL, immuable même au service (42501 prouvé), branché sur les quatre routes d'administration et tenu par un cliquet. Une entrée témoin `sonde.temoin` y reste pour toujours : c'est le prix d'un journal que personne ne peut effacer. |
| **5bis** | **La page des appels d'offres, RICHE** — voir §8 | 14 | ✅ **FERMÉ** — neuf points, **30/30 à l'adresse publique**, dont deux pièges volontaires : la légende ne montre pas « ICB », et un bloc mal positionné ne disparaît pas. |
| **15** | **Finitions d'interface relevées sur EPSS** — voir §7 | 18 | ⬜ **DERNIER LOT** |
| **16** | **Assistant de site (IA)** — voir §9 | 20 | ✅ **FERMÉ** — DeepSeek `flash` via le client partagé ; répond depuis les vues PUBLIQUES (clé anonyme), cite la page, dit « je ne trouve pas » ; plafonds validés 10/conversation · 10/heure/adresse · 200/jour/site, vérifiés AVANT l'appel et comptés avant de partir (≤ 0,60 $/jour, tarif sourcé) ; interrupteur `assistant_actif` allumé pour la CPA SEULE ; `/confidentialite` corrigée AVANT l'allumage. |

**LES NUMÉROS NE SONT PAS L'ORDRE.** Ils nomment un sujet ; l'ordre est
celui-ci, et c'est lui qui fait foi :

> **1 → 2 → 3 → 5bis → 5 → 7 → 8 → 4 → 6 → 9**, puis **10 → 11 → 12 → 13 → 14**,
> puis **15** et **16**.

**Pourquoi le 4 passe après le 8.** L'organigramme est long et ne débloque
rien. Les appels d'offres, les actualités et le contact sont ce qu'un
fournisseur vient chercher : l'utile d'abord.

**Ce qui vient ensuite, à tout instant, est la PREMIÈRE case non fermée de
cette ligne.** Écrit ici pour que personne n'ait à s'en souvenir — le
propriétaire a demandé le 8 novembre pourquoi on passait du 8 au 4, et la
réponse n'était visible nulle part.
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
| 2026-11-07 | **LOT 2 ✅ FERMÉ.** Déployé `dab372c`. **9/9 en production** — menu à sous-menus servi, lien qui mène vraiment, ordre respecté, page hors menu absente, aucune fuite inter-site, et menu vide après retrait. Sous-menu en `<details>` natif : **sans JavaScript**, comme l'exige WCAG 2.2 AA et « performante sur connexion lente ». |
| 2026-11-07 | **LOT 1 ✅ FERMÉ.** Déployé `5d711a9`. **13/13 en production** sur `cpa-tchad.deribfy.app` — page servie, 2ᵉ niveau, fil d'Ariane, JSON-LD, les trois refus (non publiée · inventée · autre site), et le témoin qui rend 404 APRÈS retrait. **Relevé d'après : 0 écart** sur 63 mesures — les 42 autres sites intacts, code et titre. Le moteur sert désormais autant d'adresses qu'un site en déclare. |
| 2026-11-07 | Le **cliquet de lint** a attrapé 2 `any` de mon lot (963 contre 961). Corrigés plutôt que gelés. J'ignorais que ce dépôt interdit à la dette de lint de GROSSIR — je l'avais traitée comme une dette abandonnée. |
| 2026-11-07 | **Lot 1 — table `site_pages` + vue en production, route `[...rest]` qui résout. 15/15 en local**, dont les deux refus (adresse inventée → 404, page non publiée → 404) et l'absence de fuite inter-site. Les 3 adresses existantes intactes. Reste : déploiement et relevé d'après. |
| 2026-11-07 | **Convention de cochage posée** : ✅ = fait + vérifié + revérifié à l'écran servi. Deux cases décochées en l'appliquant — la section d'accueil et la suppression dans `/edit` étaient écrites, pas prouvées. |

### 7 novembre 2026 — LOT 3, la barre du haut

| | |
|---|---|
| ✅ | **L'éditeur de pages** est servi sur `/edit` (commit `2c4cf42b`, déployé, `/api/version` = `2c4cf42`) |
| ✅ | **Le fond blanc** des sous-pages — mesuré à l'adresse publique : `background:#ffffff` sur `/catalogue/commander` |
| ✅ | **Le menu mobile** liste les pages déclarées — 5 occurrences de chaque entrée dans le HTML servi |
| 🔄 | **La barre réduite aux 7 entrées** — écrite et prouvée par cliquet bidirectionnel (16 points, mutation rougit), **pas encore déployée** · ordre arrêté : `Accueil · pages déclarées ▾ · Appels d'offres · Contact` |
| ✅ | **TPA abandonné** — 7 novembre 2026, le propriétaire a reverifié auprès de la CPA : sigle mal compris par l'agent, aucune conséquence sur le contenu. `/qui-sommes-nous/etablissements` n'est plus bloqué. |

**Ce qui n'a PAS été employé, et pourquoi.** `hidden_sections` existait déjà,
mais `hidden('About')` est lu deux fois par thème : il retire le lien *et la
section*. Désencombrer la barre aurait effacé la présentation du site. Voir
GEN-D046 au registre.

**Une dette ouverte par nous, ce matin.** Le retrait de l'ancien bloc « pages »
de `/edit` n'a pas retiré sa LECTURE : 127 blocs sur 34 sites sont encore
affichés et ne sont plus retirables. Voir GEN-D045. La CPA n'est pas touchée.

**Les dettes GEN-D044 / GEN-D045 sont REPORTÉES par décision du propriétaire**
(7 novembre 2026) : « fais les seulement si c'est nécessaire, on reste
concentré ». Elles restent ouvertes au registre, non traitées. Aucune n'affecte
la CPA.

### 8 novembre 2026 — ce qui a été fermé depuis le 7

| | |
|---|---|
| ✅ | **Le corps structuré** — 15 types de bloc, vocabulaire tenu par la BASE (`site_pages_blocs_valides`), `dangerouslySetInnerHTML` impossible par construction |
| ✅ | **Les 30 pages** portent 146 blocs ; aucune sous 700 caractères (la plus maigre était à 396) |
| ✅ | **Les photos** — 10 pages illustrées, 4 diaporamas CSS, accueil à plusieurs photos |
| ✅ | **Le stockage de fichiers** — compartiment `site-fichiers` cloisonné, route `GET/POST/DELETE`, écran de téléversement dans `/edit` · 10/10 mesurés |
| ✅ | **Le dossier d'appel d'offres** — colonne `pieces`, forme fermée · 14/14 mesurés ; `document_url` conservée |
| ✅ | **Le menu du téléphone** — hiérarchique, 7 entrées au lieu de 30 |

**La duplication menu / cartes a été MESURÉE et n'en est pas une.** En écartant
la charge d'hydratation Next.js, chaque sous-page apparaît UNE fois dans le
corps de `/qui-sommes-nous` : sa carte. Le menu déroulant est le second
endroit, et c'est voulu — EPSS fait de même. Ma première mesure, qui comptait
le HTML de rendu et la charge d'hydratation, était fausse.

**Prochaine étape autorisée par l'ordre du plan** (1→2→3→5→7→8→4→6→9) :
finir le **lot 5** — filtrage des avis, archive, avis d'attribution.

### 8 novembre 2026 — le filtre prouvé à l'écran

Le filtre ne pouvait pas être coché sur ses seuls points unitaires : une barre
au-dessus d'une liste vide ne prouve rien, et la CPA a zéro avis publié. Trois
témoins inconfondables ont donc été posés quelques minutes, mesurés, puis
retirés — le retrait vérifié DEPUIS L'ADRESSE PUBLIQUE.

**Le point qui justifiait l'opération :** un avis marqué `ouvert` EN BASE dont
l'échéance est passée paraît dans « Clos » à l'écran, et PAS dans « En cours ».
Aucun test unitaire ne pouvait garantir que la page servie applique l'état
VISIBLE et non la colonne. Un fournisseur ne peut pas croire qu'il lui reste
du temps sur une consultation fermée.

Le site est revenu à son état d'avant : zéro avis, barre de filtre masquée.


---

## §7 — LOT 15 · LES FINITIONS RELEVÉES SUR EPSS (8 novembre 2026)

Relevées sur les captures d'epss.gov.et par le propriétaire. **Aucune ne
modifie les lots 6 à 14** : elles arrivent en dernier, parce qu'une finition
posée sur une fonction qui n'existe pas encore se refait deux fois.

| | ce qui manque | où ça se voit sur EPSS |
|---|---|---|
| **15.1** | **Un pictogramme par entrée de menu** — maison, bâtiment, mégaphone, document, dossier, journal, téléphone | barre du haut, bureau et téléphone |
| **15.2** | **Deux flèches sur la photo d'accueil** pour passer d'une photo à l'autre à la main | bords gauche et droit du bandeau |
| **15.3** | **Les points de progression** sous le diaporama — combien de photos, laquelle est affichée | bas du bandeau |
| **15.4** | **Les réseaux sociaux en pied de page** — Facebook, X, Telegram, YouTube, et au-delà | bloc « Connect With Us » |
| **15.5** | **Le bandeau des partenaires**, qui défile — logos d'organisations | section « Our Partners » |
| **15.6** | **Le bouton « revenir en haut »**, flottant | coin bas droit |
| **15.7** | **L'inscription à la lettre d'information** | pied de page |
| **15.8** | **Le compteur de visiteurs du jour** | pied de page |
| **15.9** | **Le bandeau « information importante »** en évidence | page des actualités, colonne de droite |
| **15.10** | **L'accès rapide** — liens vers les avis en cours, les attributions, l'assistance | page des actualités, colonne de droite |
| **15.11** | **Les pictogrammes deviennent des dessins, et la barre tient sur une ligne** | barre du haut — livré le 2026-11-09 |
| **15.12** | **Un dessin sur chaque compteur d'avis** — carré teinté, comme les cartes d'EPSS | page des appels d'offres |
| **15.13** | **Les partenaires passent sur l'ACCUEIL**, juste avant Contact, logos téléversables · **l'animation au survol partout**, posée à la racine du segment | accueil et toutes les sous-pages — livré le 2026-11-09 |

> ### ⚠ COLLISION DE NUMÉROS — à lire avant de citer un « lot 15.7 »
>
> Le commit **`ea7e6095`**, déjà poussé le 2026-11-09, s'intitule
> « LOT 15.7 ». **Ce n'est pas la lettre d'information** de la ligne 15.7
> ci-dessus : c'est le travail décrit en **15.11**. J'ai repris un numéro
> déjà pris sans relire ce tableau.
>
> Le commit ne se réécrit pas — il est public. La table fait foi :
> **15.7 = lettre d'information (écartée)**, **15.11 = les pictogrammes
> dessinés**. Le lot suivant porte **15.12**, pas 15.8, pour que la même
> confusion ne se produise pas deux fois.


**Ce qui est DÉJÀ au moteur et n'a pas besoin du lot 15 :** le diaporama
d'accueil (il tourne, il manque juste ses commandes manuelles), le menu à
plusieurs niveaux, le filtre des avis, l'archive.

**CE QUE LE 2026-11-09 A APPRIS SUR LE 15.1.** Les pictogrammes du 15.1
étaient des CARACTÈRES — ▣ ◈ ▤ ◆ ◉ ✆ — confiés à la police de la vitrine.
Mesuré dans le HTML servi : les quatre premiers s'affichaient en carrés gris,
et les deux derniers n'étaient pas dans la page du tout. Trois entrées sur
sept n'avaient aucune icône, parce qu'elles ne passent pas par le menu
déclaré. Et la barre ne tenait pas : le conteneur plafonne à 1200 px utiles,
l'enseigne en prend 182, la barre doit donc tenir dans 978 — elle en
réclamait 1053. Le 15.11 reprend tout cela et le mesure au navigateur à six
largeurs, à l'adresse publique.

**Deux points que je ne traiterai PAS sans décision :**
— **la bulle de discussion** d'EPSS : c'est un service tiers, donc une
  dépendance externe et une donnée qui sort du site. Elle ne se pose pas
  sans accord explicite.
— **le compteur de visiteurs** : il suppose de compter les passages, donc
  de traiter une donnée de connexion. La page `/confidentialite` dit
  aujourd'hui qu'aucun profil n'est constitué — poser un compteur sans
  mettre cette page à jour serait un mensonge d'interface.

**Les réseaux sociaux (15.4) ont peut-être déjà leur place en base** :
`sites.social_links` existe. À mesurer avant d'écrire quoi que ce soit —
c'est la sixième fois que la solution serait déjà dans le dépôt.


---

## §8 — LOT 5bis · LA PAGE DES APPELS D'OFFRES N'EST PAS UNE LISTE

Relevé sur les captures d'epss.gov.et le 8 novembre 2026. **Notre page sert
un tableau nu sur fond blanc.** Celle d'EPSS sert la même information, et un
fournisseur y trouve en trois secondes ce qu'il cherche.

| | ce qui manque chez nous | ce qu'EPSS en fait |
|---|---|---|
| **5b.1** | **Un bandeau de tête coloré** avec le fil d'Ariane, un titre, une phrase et un bouton d'action | dégradé bleu, « Parcourir les appels d'offres » |
| **5b.2** | **Quatre compteurs** — actifs · ouverts aux offres · clôture prochaine · archivés | cartes à pictogramme coloré |
| **5b.3** | **Les filtres en pastilles**, avec pictogramme et état actif marqué | « Tous · ouvrir · Fermeture prochaine · FERMÉ » |
| **5b.4** | **Des cartes d'avis** au lieu de lignes de tableau — référence en étiquette, catégorie, date, état, jours restants | carte avec pastille d'état |
| **5b.5** | **Le compte à rebours** — « 32 jours restants » | sous la date de clôture |
| **5b.6** | **Une colonne latérale** — liens rapides, « Besoin d'aide ? », assistance | colonne de droite |
| **5b.7** | **La légende des types de marché** — ce que veut dire chaque sigle | encart « Types d'offres » |
| **5b.8** | **Une animation au survol** des cartes et des pastilles | élévation douce |
| **5b.9** | **La couleur du site employée partout** — la CPA a son vert et ne s'en sert presque pas | pictogrammes et fonds teintés |

**TOUT DOIT ÊTRE ÉDITABLE.** La phrase du bandeau, le texte d'aide, la
légende des sigles, les liens rapides : la CPA efface ce que le moteur a
généré et met le sien. Aucun de ces textes ne doit vivre en dur dans le code.

**Un chiffre affiché est un chiffre MESURÉ.** Les quatre compteurs se
déduisent des avis réels, jamais d'une valeur saisie : un compteur qu'on
peut écrire à la main est un compteur qui ment le jour où personne ne le
met à jour.

---

## §9 — LOT 16 · L'ASSISTANT DE SITE

EPSS porte un assistant en bas à droite. Demandé par le propriétaire le
8 novembre 2026, **après le lot 15**.

**Ce qu'il doit faire :** répondre sur le contenu DU SITE — les pages, les
avis en cours, les documents — et renvoyer vers l'adresse exacte.

**Ce qu'il ne doit PAS faire, et c'est le coeur du lot :**
— **ne jamais inventer un fait** sur un établissement public. Une réponse
  fausse sur une date de clôture ou une pièce à fournir fait perdre un
  marché à un fournisseur ;
— **ne répondre qu'à partir du contenu publié**, et dire « je ne sais pas »
  plutôt que de combler ;
— **ne pas envoyer la question à un tiers sans le dire** — c'est une donnée
  qui sort du site, et `/confidentialite` affirme aujourd'hui le contraire.

**Il a un COÛT par question.** Aucune dépense n'est engagée sans accord
explicite, et le lot devra chiffrer avant d'écrire.


---

## RÈGLE — CHAQUE LOT ANNONCE SON PÉRIMÈTRE AVANT DE COMMENCER

**Posée le 8 novembre 2026, à la demande du propriétaire.**

Le lot 8 annonçait « référence générée automatiquement, et suivi de la demande ». Les deux morceaux étaient bien
au plan — mais je ne les avais pas **rappelés en ouvrant le lot**, et le
propriétaire a dû demander si la page de suivi était prévue.

Un périmètre qui n'est pas dit au début ne peut pas être vérifié en cours de
route : impossible de savoir si j'avance dans le plan ou si j'invente.

**Donc, avant la première ligne de code de chaque lot :**

| | |
|---|---|
| **①** | ce que le plan annonce, **recopié mot pour mot** |
| **②** | ce que ça veut dire concrètement, en points numérotés |
| **③** | ce que le lot **ne fera PAS**, et pourquoi |
| **④** | ce qui **existe déjà** dans le dépôt et sera réemployé — mesuré, pas supposé |

Le ④ n'est pas une formalité : **six fois** sur ce chantier, la solution était
déjà dans le dépôt et j'ai failli écrire un second système.


---

## §11 — ~~QUESTION OUVERTE~~ **TRANCHÉE** : `/mes-documents`

### ✅ TRANCHÉE LE 9 NOVEMBRE 2026 par le propriétaire

« le cpa depose les documents et les fournisseurs ou les etablissement ou
hopitaux peuvent upload, et de leur coté fournisseurs et les etablissements
peuvent upload pour le cpa, c de 2 cotés pas un coté. »

**Les trois autres questions, je les ai tranchées et elles sont renversables :**

| question | décision | raison |
|---|---|---|
| qui voit | un document concerne **UN** compte : son titulaire et la Centrale | diffuser à « tous les fournisseurs » est une AUTRE forme, avec ses règles de retrait ; l'inventer en passant produirait une table qu'on n'oserait plus toucher |
| combien de temps | **aucune suppression automatique** | effacer seule une pièce de marché public serait une décision que personne n'a prise |
| un retiré | la **ligne reste** (« retiré le… par… »), le **fichier part** | « ce document a existé et a été retiré le 12 » est une information, et une disparition sans trace permettrait de nier un dépôt |

Et **chacun ne retire que ce qu'il a déposé** : la Centrale ne fait pas
disparaître l'agrément qu'un fournisseur lui a remis.

---

## §14 — DETTE : LE CLIQUET DES APPELS AUTHENTIFIÉS NE VOIT PAS `fetch(base, …)`

**Trouvée le 2026-11-10 au lot 16.** `appelsAuthentifies.test.ts` n'examine
que les appels dont l'adresse est écrite DANS le `fetch(…)`. Un appel dont
l'adresse est dans une variable (`fetch(base, …)`) lui échappe. Les écrans
`GestionAvis`, `GestionDemandes`, `MonDossier`, `/offres/[slug]` sont écrits
ainsi : ils portent bien le jeton, mais AUCUN cliquet ne le garantit.

Prouvé : retirer le jeton de `GestionDemandes` laisse le cliquet vert.
À fermer en suivant la variable jusqu'à sa définition — pas fait en passant,
pour ne pas élargir un instrument de sécurité au détour d'un autre lot.

**FERMÉE le 2026-11-10.** Le cliquet suit désormais la variable jusqu'à sa
définition, et compare les routes dynamiques segment par segment (plus par
préfixe). Prouvé : retirer le jeton de `GestionDemandes` ou de `GestionAvis`
le fait rougir.

## §16bis — L'ASSISTANT EST LIMITÉ À QUATRE SUJETS

**Demande du propriétaire, 2026-11-10 :** « il répond seulement de choses
visibles publiquement » — appels d'offres (y en a-t-il, date de clôture,
national ou international), créer un compte, conditions pour devenir
fournisseur, contacter la Centrale. Le reste : il ne sait rien.

Tenu par ce qu'il LIT, pas seulement par ce qu'on lui dit : 9 pages
permises (`PAGES_PERMISES`), les avis publiés avec leur portée, les étapes
du compte, les coordonnées publiées. Toute autre question reçoit une
phrase fixe (`HORS_SUJET`) qui renvoie à la page Contact. Prouvé : retirer
le filtre, ou ajouter une page de direction, fait rougir les tests.

La portée n'était pas publique : vue `appels_offres_public` refaite à
l'identique plus `portee` (`appels_offres_public_portee.sql`, exécutée le
2026-11-10 : 30 colonnes, `portee` visible, `publie` toujours absente).

---

## §13 — LE SECRET DES PLIS N'EST PAS TECHNIQUE, PAR DÉCISION

**J'avais proposé que la base REFUSE de rendre une offre avant l'heure
d'ouverture des plis — même à la Centrale, même au service.** Dans un
marché public, une offre lisible avant la clôture rend la procédure
attaquable.

**Arbitrage du propriétaire, 2026-11-09 :** « cpa ne mettra pas avant
heure, si ça arrive c'est leur responsabilité, pas la nôtre. »

**La décision est enregistrée, et sa conséquence aussi** : le secret des
plis repose sur la discipline de la Centrale, pas sur une impossibilité.
Rien dans le code n'empêche la lecture anticipée par le propriétaire du
site.

**CE QUI EST FERMÉ malgré tout**, et qui ne dépend de personne :
`offres` ne rend aucun privilège à `anon` ni `authenticated` — mesuré,
`42501` en lecture comme en écriture. Un fournisseur ne voit QUE ses
offres et ne signe QUE les siennes : sans cela il lirait le prix de ses
concurrents. Le seau est privé, les liens durent 60 secondes.

**ET UNE RÈGLE QUE J'AI APPLIQUÉE SANS QU'ELLE SOIT DEMANDÉE** : on ne
dépose plus après la date limite. Une date limite qui n'arrête rien n'est
pas une date limite, et une offre arrivée après coup rendrait la procédure
attaquable par tous les autres soumissionnaires. Le refus dit la date.

---

## §12 — LA CONFIDENTIALITÉ DES FOURNISSEURS, EXIGÉE ET TENUE

**Propriétaire, 2026-11-09 :** « je pense que les fournisseurs ne devraient
pas vu par d'autres fournisseurs, si c prequalifié ou qualifié ou rejeté. »

**C'ÉTAIT DÉJÀ VRAI, et je l'ai vérifié avant d'écrire une ligne :**
`site_comptes` ne rend aucun privilège à `anon` ni `authenticated`, aucune
vue publique n'existe, et chaque route filtre sur `user_id`. Le verdict a
donc été ajouté à une surface DÉJÀ FERMÉE. L'ordre compte : ouvrir d'abord
et fermer ensuite aurait laissé une fenêtre, et une fenêtre qui a existé a
peut-être servi.

**CE QUI LA TIENT MAINTENANT** — `qualificationPrivee.test.ts` énumère les
fichiers qui touchent `site_comptes` ET `qualification`, et exige de chacun
un filtre par personne ou la garde du propriétaire. Il rougira le jour où
quelqu'un ajoutera une route qui projette le verdict sans garde.

**DEUX DÉCISIONS prises et renversables :**

| | |
|---|---|
| `non_examinee` par défaut | sans cet état, un inscrit du jour afficherait « rejeté » — un mensonge — ou « qualifié », pire |
| l'état ≠ la qualification | `etat` dit si le compte ENTRE, `qualification` ce que la Centrale PENSE. Les confondre ferait qu'activer vaudrait qualifier |

---

## §11ter — LA SONDE DU SEAU PRIVÉ NE TOURNE PAS DANS LA GATE

`apps/web/scripts/prouver-seau-prive.mjs` prouve que le seau des documents
refuse la lecture publique. Elle exige la **clé de service** : elle ne peut
donc pas tourner dans le CI, et aucun cliquet ne la remplace.

**Ce qu'elle mesure, et que rien d'autre ne mesure :** un objet RÉEL, posé
dans les deux seaux, lu par l'adresse publique. Sans le témoin du seau
PUBLIC, le 400 du seau privé ne prouve rien — il veut dire « objet
introuvable », et une adresse inexistante rend 400 des deux côtés. C'est
exactement l'erreur que j'ai failli publier comme preuve.

**À relancer à la main** après toute migration touchant `storage.buckets` ou
les politiques de `storage.objects`.

---

## §11bis — CE QUI RESTE OUVERT SUR LES DOCUMENTS

Une diffusion **collective** — « ce formulaire pour tous les fournisseurs » —
n'existe pas. La Centrale qui veut atteindre dix structures dépose dix fois :
visible, dénombrable, retirable une par une. Si le volume le rend pénible, la
forme se décidera alors, avec ses propres règles de retrait.

**Inscrite le 9 novembre 2026, en livrant la tranche B du lot 11.**

Le plan prévoit `/mes-documents` dans l'espace établissement. **Je ne l'ai
pas construite, et c'est délibéré :** aucune table ne dit « ce document est
destiné à ce compte ». Le seau `site_fichiers` sert les documents PUBLICS du
site — dossiers de consultation, formulaires. Rien n'y rattache un fichier à
une structure ou à un fournisseur.

**Ce qu'il faudrait décider AVANT d'écrire une ligne**, et qui appartient à
la CPA :

1. **Qui dépose ?** La Centrale seule, ou la structure aussi (un bon de
   commande signé, par exemple) ?
2. **Qui voit ?** Un document est-il adressé à UN compte, à tous les comptes
   d'un rôle, ou à toute une catégorie d'établissements ?
3. **Combien de temps ?** Une facture de 2024 reste-t-elle consultable en
   2030 ? La réponse change le stockage autant que l'écran.
4. **Un document retiré disparaît-il, ou devient-il « retiré le … » ?** Les
   deux sont défendables ; ils ne se rattrapent pas l'un l'autre après coup.

**Pourquoi ne pas « commencer simple » :** un modèle posé au hasard se
remplit, et se remplir le rend coûteux à défaire. Le catalogue public du lot
6 n'a ni prix ni stock PAR CONSTRUCTION, et c'est ce qui le rend sûr. Un
dossier de documents mal cadré produirait l'inverse : une table qu'on
n'oserait plus toucher.

---

## §10 — DETTE ~~OUVERTE~~ **FERMÉE** DU LOT 10 : `user_id` N'EST PAS VÉRIFIÉ

**Inscrite le 9 novembre 2026, avant de passer au lot 11.**

La route `/api/sites/[slug]/comptes` accepte un `user_id` du propriétaire
**sans vérifier que cette personne existe dans `auth.users`**.

**Ce que ça produit :** un compte fantôme — une ligne qui ne correspond à
personne. Inoffensif aujourd'hui, puisque nul ne peut s'authentifier avec un
identifiant inventé et que `requireSiteCompte` lit l'identité depuis le
jeton, jamais depuis la table. Mais sale, et le genre de chose qui devient
dangereuse quand une deuxième route la croit.

**Pourquoi ce n'est pas corrigé maintenant :** il n'existe pas encore
d'inscription. Le propriétaire ne peut admettre que des personnes déjà
inscrites, et ce chemin-là s'écrit au lot 11. Fermer la vérification avant
d'avoir le flux d'inscription reviendrait à garder une porte qui ne s'ouvre
sur rien.

**Ce qui la ferme :** au lot 11, l'admission se fera par l'adresse
électronique, et `user_id` sera résolu côté serveur depuis `auth.users` —
jamais reçu du client.

### ✅ FERMÉE LE 9 NOVEMBRE 2026, au lot 11 — et tenue par un cliquet

Ce qui a été fait, exactement comme annoncé ci-dessus :

- `identifiant_par_courriel()` résout l'identifiant **en base**, depuis
  `auth.users`, et n'est exécutable que par le rôle de service — une
  fonction `security definer` laissée à `anon` serait un oracle d'existence.
- La route du propriétaire **REFUSE** un `user_id` reçu dans le corps : elle
  ne l'ignore pas en silence, ce qui laisserait croire qu'il a été pris en
  compte.
- Une adresse à laquelle personne n'est inscrit ne crée **rien** : 404.
- Le chemin d'inscription promis existe : `/inscription` puis la demande de
  rattachement depuis `/espace-client`, où `user_id` vient **du jeton**.

**ET ELLE A UN CLIQUET, cette fois.** La route du lot 10 avait vécu un jour
sans aucun test : ni appelant, ni vitest, ni script versionné — ses
« 17 + 7 + 11 points » étaient des mesures de séance, perdues le soir même.
Trois mutations prouvées rouges tiennent désormais la fermeture.

**Elle est inscrite ici parce qu'une dette non écrite entre deux lots est une
dette perdue.** C'est exactement ce qui s'est passé avec `/fournisseurs/
documents`, qui a promis quatre téléchargements pendant deux jours.
