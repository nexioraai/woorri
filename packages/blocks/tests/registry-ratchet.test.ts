import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLOCK_REGISTRY_VERSION, BLOCKS, blocks } from "../src";

// CLIQUETS DE REGISTRE (patron D-020) : liste v1 EXACTE, versions, ordre
// stable, indépendance E2E. Ajouter/retirer un bloc DOIT faire échouer un
// test ici — modification = acte conscient (décision consignée + version
// mineure), jamais un effet de bord (D-023 : pas d'élargissement au cas où).
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

// Liste v1 EXACTE — GELÉE (L2 + D-024, revue propriétaire du 2026-08-28).
// ÉDITION CONSCIENTE (1.8.0) : `spacer` entre au registre. PREMIER ajout de
// TYPE depuis le gel, et il est justifié par un fait mesuré sur appareil —
// sans notion de mise en page, tous les blocs s'empilent en haut et le bas de
// l'écran reste vide (1170 px sous le dernier bouton de l'accueil produit).
// Strictement additif : aucun bloc existant ne change, un document 1.7.0 est
// inchangé. Le bloc ne porte NI contenu, NI donnée, NI action.
// ÉDITION CONSCIENTE (mission composition, 2026-09-10) : `search_entry`
// entre au registre. Justifié par les RÉFÉRENCES fournies par le
// propriétaire (Amazon, marketplace d'annonces) : la recherche y est un
// élément STRUCTUREL de l'accueil — un contrôle à l'allure de champ qui
// NAVIGUE vers l'écran où la recherche s'exécute. Strictement additif.
const V1_BLOCK_IDS = [
  "button",
  "detail_header",
  "empty_state",
  "form",
  "header",
  "list",
  "search_entry",
  "spacer",
  // 1.14.0 (EP-198) — NEUVIEME bloc, ajoute en queue : l ordre du registre est
  // celui de la declaration, et les huit premiers ne bougent pas.
  "prose",
  // 2026-10-13 — DIXIEME bloc, ajoute en queue : `graphique`. Deux cahiers des
  // charges reels et sans rapport reclamaient la meme chose — comparer des
  // valeurs nommees — et aucun bloc ne savait le dire. Les neuf premiers ne
  // bougent pas.
  "graphique",
  // 2026-10-13 — ONZIEME bloc : `agent`. La porte, pas le pouvoir.
  "agent",
  // 2026-10-17 — DOUZIEME bloc, ajoute en queue : `statistiques`.
  //
  // COMPARAISON DETAIL PAR DETAIL AVEC BOLT, demandee par le proprietaire.
  // Son tableau de bord de tontine ouvre sur QUATRE cartes — solde,
  // cotisations collectees, membres actifs, prochaine echeance. Deribfy ne
  // savait dessiner que sept formes, et aucune n etait celle-la : avec le
  // plus beau theme du monde, une liste de lignes de texte ne ressemblera
  // jamais a un tableau de bord. Le manque n etait pas le THEME, c etait le
  // VOCABULAIRE.
  //
  // DES COLONNES PARALLELES, ET LA RAISON EST UNE CAUSE RACINE TROUVEE LE
  // MEME JOUR : `flatConfigSchema` n admet qu une primitive ou un tableau de
  // primitives — jamais un objet. Consequence que personne n avait vue :
  // `graphique` exige `series: [{label, value, display}]`, donc il est
  // INEXPRIMABLE dans un document, et c est pourquoi ZERO document sur 23 ne
  // l emploie. Ce bloc-ci suit l idiome prescrit par `flatConfigSchema`.
  //
  // Les onze premiers ne bougent pas.
  "statistiques",
  // 2026-10-18 — TREIZIEME bloc : `tableau`. Une LISTE porte des roles fixes
  // — titre, sous-titre, pastille, valeur de fin — et repond a « qu est-ce
  // que c est ? ». Un TABLEAU porte N colonnes de meme rang et repond a
  // « compare-les ». Les applications de GESTION, celles que ce generateur
  // produit le plus souvent, vivent de la seconde question.
  //
  // Les douze precedents ne bougent pas, et il est ajoute EN QUEUE : l ordre
  // du registre est celui de la declaration.
  "tableau",
];

describe("cliquets du registre de blocs", () => {
  it("CLIQUET — la liste v1 est exacte, triée, sans doublon", () => {
    expect(BLOCKS.map((b) => b.id)).toEqual(V1_BLOCK_IDS);
  });

  // ÉDITION CONSCIENTE (2026-08-31, D-060) — DÉGEL DÉLIBÉRÉ, STRICTEMENT ADDITIF.
  //
  // Le registre était gelé en 1.0.0 par D-024. Fait qui a forcé la montée : la
  // dimension C d'A++ exige que TOUT bloc consommant des données expose
  // loading/empty/error. Or, des trois types que le corpus lie à une entité,
  // `form` ne connaissait NI `loading` NI `empty`, et `detail_header` n'avait
  // AUCUN état. La dimension n'était donc pas « non atteinte » : elle était
  // **INATTEIGNABLE** (APP-D003 / DET-028). Aucune quantité de travail sur le
  // moteur ne l'aurait rendue conforme.
  //
  // La montée n'enlève RIEN : aucun état supprimé, `state` reste optionnel
  // partout, défaut inchangé. Un appelant 1.0.0 se comporte à l'identique — ce
  // que le test ci-dessous vérifie explicitement, pour que « additif » soit une
  // propriété MESURÉE et non une intention déclarée.
  // ÉDITION CONSCIENTE (2026-09-02, E1/E2 D-129) : 1.2.0 → 1.3.0 — filtres
  // pilotés et portée relationnelle, ADDITIFS ; rien n'est retiré, le corps du
  // test le vérifie comme avant.
  it("DÉGEL ADDITIF (D-060, D-087, D-129) : registre 1.3.0, et rien n'a été retiré", () => {
    // D-087 : seconde montée additive — `list` gagne vignette et recherche,
    // `detail_header` gagne son visuel. Rien n'est retiré, tout est optionnel.
    // DET-032 : quatrième montée additive — `optionLabels` OPTIONNEL sur les
    // filtres à choix (libellés d'affichage AIR 1.10.0). Valeurs, filtrage et
    // testID inchangés ; un appelant 1.3.0 est inchangé.
    // DET-034 : cinquième montée additive — chips de filtre (`kind: "chip"`,
    // `selected` sur la primitive). Un appelant 1.4.0 est inchangé.
    // 1.6.0 : sixième montée additive — `required` sur les champs (le bouton
    // dérive s'il est actionnable) et `icon` sur le bouton. Un appelant 1.5.0
    // est inchangé.
    // 1.7.0 : septième montée additive — `accroche` sur l'en-tête (le titre
    // monte d'un cran typographique, pour la PREMIÈRE phrase qu'on lit).
    // 1.9.0 : `logoUri` sur l'en-tête — la MARQUE. Aucun document ne pouvait
    // en déclarer une : les apps générées n'avaient aucune identité visible.
    // 1.10.0 : deux signes de plus au vocabulaire fermé — `close-outline`
    // (passer l'étape) et `help-circle-outline` (aide). Additif.
    // 1.11.0 : `kind: "link"` — du TEXTE cliquable pour un chemin secondaire.
    // Mesuré à l'écran : « Mot de passe oublié » et « Continuer sans compte »
    // pesaient autant qu'une action principale.
    // 1.12.0 (EP-108) : titres et messages des ÉTATS déclarés au document —
    // `loadingTitle`, `emptyTitle`, `emptyMessage`, `errorTitle`,
    // `errorMessage`. DONNÉES, jamais texte moteur (F3) : sans déclaration,
    // l'état n'est pas rendu. Additif et optionnel.
    // 1.13.0 (EP-159) : `saisieRoles` / `saisieCibles` — les saisies qui
    // n'existent PAS en base (confirmation d'un secret, acceptation de
    // conditions). `fieldIds` ne référence que des champs d'entité : tout ce
    // qui s'affichait devait donc exister en colonne. Tableaux PARALLÈLES,
    // même patron que les filtres pilotés. Additif et optionnel.
    //
    // CES DEUX MONTÉES N'ÉTAIENT PAS CONSIGNÉES ICI, et le cliquet est resté
    // ROUGE depuis le 2026-09-13 — il attendait 1.11.0 quand le registre
    // portait 1.13.0. Un cliquet rouge en permanence ne garde plus rien : on
    // apprend à le lire comme du bruit, et la montée SUIVANTE passe sans être
    // vue. Recalé en NOMMANT ce que chaque version a ajouté, comme les onze
    // précédentes — c'est la trace qui fait la valeur de ce cliquet, pas le
    // nombre.
    // 1.14.0 (EP-198) : NEUVIEME BLOC — `prose`, texte suivi. Le registre en
    // comptait huit, et le plus long texte qu aucun pouvait porter etait un
    // sous-titre : les ecrans `terms` et `privacy_policy` annoncaient donc
    // « le texte complet est fourni par le proprietaire ». Le generateur ne
    // refusait pas d ecrire, il n avait AUCUN endroit ou le faire.
    // Premiere montee qui AJOUTE un bloc et non une prop — et rien n est
    // retire : les huit precedents sont intacts.
    // 1.16.0 (2026-10-17) — DOUZIEME bloc : `statistiques`, la carte de
    // chiffre. Comparaison detail par detail avec Bolt, demandee par le
    // proprietaire : son tableau de bord ouvre sur QUATRE cartes, et Deribfy
    // ne savait dessiner que sept formes. Le manque n etait pas le THEME,
    // c etait le VOCABULAIRE.
    //
    // ADDITIF STRICT : aucun bloc retire, aucun etat supprime, aucune prop
    // devenue obligatoire. Les onze precedents sont intacts.
    // 1.17.0 (2026-10-17) — le SURTITRE sur `header`. Trois niveaux de
    // hierarchie au lieu de deux. ADDITIF : prop optionnelle, aucun bloc
    // ajoute ni retire.
    // 1.18.0 (2026-10-17) — `graphique` APLATI. Il exigeait un tableau d
    // OBJETS, que `flatConfigSchema` interdit : PROUVE par un document d
    // essai REFUSE. Il etait donc INEMPLOYABLE depuis sa creation, et zero
    // document sur 23 ne le portait. Le retrait de `series` ne casse rien —
    // aucun document ne POUVAIT la porter. Le contrat du COMPOSANT est
    // inchange ; seule la face DOCUMENT s aplatit.
    // 1.19.0 (2026-10-17) — l AVATAR A INITIALES sur `list`. Chaque ligne de
    // la liste des membres chez Bolt porte un rond d initiales ; Deribfy ne
    // savait poser qu une VIGNETTE, et seulement si le document declare
    // `imageFieldId` : une liste de personnes sans photo restait du texte nu.
    //
    // ADDITIF : prop optionnelle et BOOLEENNE — elle ne designe aucun champ,
    // elle dit « ces lignes sont des gens ». Le document le DIT, le moteur ne
    // le devine pas : deduire qu une entite designe des personnes serait la
    // devinette de domaine interdite ailleurs (F3, EP-201), et un catalogue
    // afficherait « CB » pour « Collier baoule ». L image declaree PRIME
    // toujours ; l avatar est le repli.
    //
    // DEUX DEFAUTS TROUVES EN LA POSANT, et aucun des deux ne se voyait au
    // typage : `ListBlock` rend ses lignes a DEUX endroits (l apercu borne et
    // la liste virtualisee) — n en cabler qu un a rendu 16 lignes et ZERO
    // rond ; et `primitives.tsx` n est PAS partage entre les cibles, si bien
    // que la poser cote natif seulement a casse 32/32 applications web.
    // 1.20.0 (2026-10-17) — `agent` gagne `errorMessage`.
    //
    // DEFAUT MESURE, et il atteignait l utilisateur FINAL : en cas d echec,
    // `AirAgent` passait le CODE du serveur comme message d erreur. Une
    // personne qui parle a son application lisait « AIR_AGENT_SANS_CERVEAU »
    // ou « AIR_AGENT_REPONSE_ILLISIBLE ». Sur LES DEUX CIBLES — le runtime de
    // l agent est partage entre natif et web.
    //
    // Le bloc n avait AUCUN moyen de declarer une phrase, alors que `list`,
    // `form` et `detail_header` l ont depuis 1.1.0 (D-060). La meme montee, au
    // meme patron : DONNEES du document, jamais texte moteur (F3).
    //
    // ADDITIF : prop optionnelle. Sans elle, le message n est pas rendu —
    // l etat d erreur reste visible, donc la personne sait que ca a echoue, et
    // le code part dans le `testID`, ou un instrument le trouve sans qu aucun
    // oeil ne le subisse.
    // 1.21.0 (2026-10-18) — `header` gagne `titreContinu` (D8).
    //
    // Le sous-titre POURSUIT le titre sur une seule ligne. Le vocabulaire
    // existait deja — `title` ET `subtitle` — mais la FORME n etait que « l un
    // sous l autre », et Bolt ouvre sur « Bonjour Aminata, » en gras suivi de
    // « voici votre espace. » en gris.
    //
    // MESURE QUI A DECIDE L AJOUT : zero document du depot n ecrit un titre
    // qui se poursuit. Ce n est pas un desinteret — la forme n existait pas,
    // donc P0 ne pouvait pas l ecrire. Meme raison que `graphique`.
    //
    // ADDITIF : prop optionnelle et BOOLEENNE. Absente, le sous-titre reste
    // sur sa ligne et le rendu est celui de 1.20.0 au caractere pres.
    // 1.22.0 (2026-10-18) — `list` gagne `badgeForme` (D15).
    //
    // Les listes DENSES de Bolt posent « A jour · En attente · En retard » en
    // POINTS colores. Meme information qu une pastille, forme plus legere.
    //
    // VARIANTE, ET NON PRIMITIVE DE PLUS : deux primitives, ce serait deux
    // endroits ou la semantique peut diverger, et ce depot a vu SIX fois « une
    // liste ecrite deux fois ».
    //
    // LE POINT NE REMPLACE PAS LE MOT : il porte la couleur, le mot porte le
    // sens — une couleur seule exclurait qui ne la distingue pas.
    //
    // ADDITIF : absent = pastille pleine, rendu de 1.21.0 au caractere pres.
    // 1.23.0 (2026-10-18) — TREIZIEME bloc : `tableau` (D16).
    //
    // Une LISTE porte des roles fixes et repond a « qu est-ce que c est ? ».
    // Un TABLEAU porte N colonnes de meme rang et repond a « compare-les ».
    // Les applications de GESTION vivent de la seconde question, et `list`
    // seul ne savait pas la poser.
    //
    // LES EN-TETES SONT LES LIBELLES DES CHAMPS : le document les ecrit deja.
    // Les redeclarer au bloc serait deux verites pour un meme mot — ce que ce
    // depot a paye six fois.
    //
    // IL DEBORDE PLUTOT QUE DE TRONQUER : quatre colonnes ne tiennent pas sur
    // un telephone, et couper montrerait MOINS que la verite.
    //
    // ADDITIF STRICT : aucun bloc retire, les douze precedents intacts.
    // 1.24.0 (2026-10-18) — `statistiques` gagne `items.part` (D11).
    //
    // Une part 0..1 fait de la carte un ANNEAU, valeur au centre. Il dit ce
    // qu un nombre seul ne dit pas : ou l on en est par rapport au total.
    //
    // IL A COUTE UNE DEPENDANCE au natif — `react-native-svg` 15.15.4,
    // celle du bundle Expo 57.
    //
    // POIDS REEL, mesure le 2026-10-18 : 7,6 Mo installes sur disque, dont
    // 1,43 Mo de JS consommable et 2,09 Mo de sources natives. CE QUI ARRIVE
    // DANS L APK N EST PAS MESURE : le depot n a de balance que cote web
    // (EP-218), aucune cote natif. J avais annonce « 3,65 Mo » au
    // proprietaire — ce chiffre ne correspondait a AUCUNE de ces mesures.
    //
    // La seule alternative sans dependance — quatre quarts de
    // cercle en bordures — ne sait montrer que 25, 50, 75 et 100 % : elle
    // MENTIRAIT sur toute autre proportion. Decision du proprietaire,
    // 2026-10-18.
    //
    // LE WEB N EN PAIE RIEN : il dessine son anneau en CSS pur
    // (`conic-gradient` + masque radial). Meme contrat, moyens differents.
    //
    // ADDITIF : absente, la carte est celle de 1.23.0 au caractere pres.
    expect(BLOCK_REGISTRY_VERSION).toBe("1.24.0");
    expect(BLOCKS.map((b) => b.id)).toEqual(V1_BLOCK_IDS);
  });

  it("CLIQUET — chaque bloc du registre a son composant, et réciproquement", () => {
    const toComponent = (id: string): string =>
      `${id.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}Block`;
    expect(Object.keys(blocks).sort()).toEqual(V1_BLOCK_IDS.map(toComponent).sort());
  });

  it("CLIQUET — liaison d'entité toujours explicite, jamais ambiguë", () => {
    for (const b of BLOCKS) expect(["required", "forbidden"]).toContain(b.entity);
  });

  it("CLIQUET — indépendance E2E : aucune trace de maestro/detox dans les sources", () => {
    for (const file of readdirSync(SRC)) {
      const source = readFileSync(join(SRC, file), "utf8")
        .split("\n")
        .filter((l) => !l.trimStart().startsWith("//"))
        .join("\n")
        .toLowerCase();
      expect(source.includes("maestro"), `${file} référence maestro`).toBe(false);
      expect(source.includes("detox"), `${file} référence detox`).toBe(false);
    }
  });
});
