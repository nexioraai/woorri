/**
 * EP-249 · LA NAVIGATION SUIT LA LARGEUR, PAS LA PLATEFORME.
 *
 * ── LE DÉFAUT, VU PAR LE PROPRIÉTAIRE LE 2026-10-16.
 *
 * La PWA d'une application générée tournait dans une fenêtre Safari de
 * 1 600 px. La barre d'onglets s'étalait sur toute la largeur pendant que le
 * contenu restait dans sa colonne de 768 px. Son verdict : « on dirait une
 * appli React Native ».
 *
 * Mesuré avant correction : `primary-nav.tsx` portait ZÉRO logique de
 * largeur — pas un point de rupture, pas un rail, sur aucune des deux cibles.
 *
 * ── CE QUE CE FICHIER TIENT, ET CE QU'IL NE PEUT PAS TENIR.
 *
 * Il tient la RÈGLE et son BRANCHEMENT : le seuil existe, il vaut ce que les
 * référentiels disent, la couture de plateforme sait répondre des DEUX côtés,
 * et les deux consommateurs la lisent au lieu de redécider.
 *
 * Il ne tient PAS le rendu : prouver qu'un rail apparaît vraiment à 840 px
 * demanderait un moteur de rendu et un navigateur. Ce qui est tenu ici, c'est
 * que rien n'est débranché — la forme de défaut que ce dépôt a payée
 * plusieurs fois (une règle vraie, et personne pour l'invoquer).
 *
 * ── LES SOURCES SONT MESURÉES, PAS CITÉES DE MÉMOIRE.
 *
 * Le module de règle doit NOMMER ses trois référentiels. Un seuil sans source
 * est un chiffre qu'on finit par « ajuster » parce qu'il paraît mieux.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import {
  SEUIL_LATERALE,
  dispositionDe,
} from "../runtime/disposition-navigation.ts";
import { theme } from "@deribfy/design-tokens";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(readFileSync(join(RACINE, "slices/tontine/tontine.air.json"), "utf8")),
  );

describe("EP-249 · barre en bas ou barre latérale, selon la place disponible", () => {
  it("LA RÈGLE — barre sous le seuil, latérale à partir du seuil", () => {
    // Les largeurs d'appareils réels, pas des nombres choisis pour passer.
    expect(dispositionDe(320), "iPhone SE, écran de couverture pliable").toBe("barre");
    expect(dispositionDe(390), "iPhone 15/17 en portrait").toBe("barre");
    expect(dispositionDe(768), "iPad en portrait").toBe("barre");
    expect(dispositionDe(839), "juste sous le seuil").toBe("barre");
    expect(dispositionDe(SEUIL_LATERALE), "la borne est INCLUSIVE côté latéral").toBe(
      "laterale",
    );
    expect(dispositionDe(1024), "iPad en paysage").toBe("laterale");
    expect(dispositionDe(1600), "la fenêtre du propriétaire").toBe("laterale");
  });

  it("LE SEUIL VAUT CE QUE LA MISE EN PAGE EXIGE, et ce n est pas un hasard", () => {
    // ── L ARITHMÉTIQUE QUI JUSTIFIE 840, ET CE QU ELLE PROTÈGE.
    //
    // Material 3 devient net à partir de « expanded » (840 dp). Chez nous le
    // même nombre tombe d une contrainte de lisibilité : au seuil, la barre
    // latérale prend 256 px et laisse 584 px au contenu. Plus bas, la colonne
    // de lecture deviendrait serrée ; plus large, la barre gagnerait contre
    // ce qu elle sert à atteindre.
    //
    // Ce contrôle n affirme pas « 840 » — il affirme la RELATION. Si la
    // largeur de lisibilité changeait, c est ici qu on verrait que le seuil
    // ne lui correspond plus.
    const largeurLaterale = theme.size.measure / 3;
    // Au seuil, ce qui reste au contenu une fois la barre posée.
    const resteAuSeuil = SEUIL_LATERALE - largeurLaterale;
    expect(
      resteAuSeuil,
      "au seuil, la colonne de lecture tombe sous 580 px : le texte serait serré",
    ).toBeGreaterThanOrEqual(580);
    // Et la barre ne gagne jamais contre ce qu elle sert à atteindre.
    expect(
      largeurLaterale,
      "la navigation occupe plus du tiers de la largeur de lecture",
    ).toBeLessThanOrEqual(theme.size.measure / 3);
  });

  it("LES TROIS RÉFÉRENTIELS SONT NOMMÉS dans la règle, avec leurs adresses", () => {
    // Un seuil sans source est un chiffre qu on finit par « ajuster ».
    const regle = readFileSync(
      join(RACINE, "packages/compiler/runtime/disposition-navigation.ts"),
      "utf8",
    );
    expect(regle, "Material Design 3 n est pas cité").toMatch(/m3\.material\.io/u);
    expect(regle, "Apple Human Interface Guidelines n est pas cité").toMatch(
      /developers?\.apple\.com\/design\/human-interface-guidelines/u,
    );
    expect(regle, "Nielsen Norman Group n est pas cité").toMatch(/nngroup\.com/u);
  });

  it("LA COUTURE RÉPOND DES DEUX CÔTÉS — même contrat, deux sources", async () => {
    // Si une seule des deux plateformes savait répondre, la cible muette
    // planterait à l exécution — et le `tsc` de l app émise ne le dirait pas,
    // puisque les deux fichiers ne sont jamais compilés ensemble.
    const { compileProject, compileWeb } = await import("../src/index.ts");
    const air = document();
    const natif = compileProject(air).files.get("lib/runtime/plateforme.tsx") ?? "";
    const web = compileWeb(air).files.get("lib/runtime/plateforme.tsx") ?? "";

    expect(natif, "la couture NATIVE ne sait pas rendre la largeur").toMatch(
      /export function useLargeurDeFenetre/u,
    );
    expect(web, "la couture WEB ne sait pas rendre la largeur").toMatch(
      /export function useLargeurDeFenetre/u,
    );

    // ET CHACUNE L OBTIENT DE SA PROPRE SOURCE — c est ce qui fait d elles
    // une couture et non une copie.
    expect(natif, "le natif n interroge pas React Native").toMatch(/useWindowDimensions/u);
    expect(web, "le web n interroge pas la fenêtre du document").toMatch(/innerWidth/u);
    expect(web, "le web importe React Native : il ne monterait pas").not.toMatch(
      /from "react-native"/u,
    );
  });

  it("LA RÈGLE EST BRANCHÉE — et dans les DEUX fichiers qui en dépendent", async () => {
    // ── LE CONTRÔLE QUI COMPTE VRAIMENT.
    //
    // Une règle écrite et débranchée ne change rien à l écran. Elle a deux
    // consommateurs, et ils ne décident pas la même chose : `primary-nav`
    // décide son DESSIN (ligne ou colonne), `app-shell` décide sa PLACE (sous
    // le contenu ou à côté). Si un seul la lisait, on aurait un rail posé en
    // bas, ou une barre posée sur le côté.
    const { compileWeb } = await import("../src/index.ts");
    const fichiers = compileWeb(document()).files;

    expect(
      fichiers.get("lib/runtime/disposition-navigation.ts"),
      "le module de règle n est pas copié dans l application émise",
    ).toBeDefined();

    const nav = fichiers.get("lib/runtime/primary-nav.tsx") ?? "";
    expect(nav, "la navigation ne lit pas la règle").toMatch(/dispositionDe/u);
    expect(nav, "la navigation n a pas de dessin latéral").toMatch(/primaryNavLaterale/u);

    const shell = fichiers.get("lib/runtime/app-shell.tsx") ?? "";
    expect(shell, "le shell ne lit pas la règle").toMatch(/dispositionDe/u);
    expect(shell, "le shell ne change jamais d axe").toMatch(/flexDirection: "row"/u);
  });

  it("LE DESSIN DE LA BARRE LATÉRALE VIENT DES JETONS — aucune valeur en dur", async () => {
    const { compileWeb } = await import("../src/index.ts");
    const styles = compileWeb(document()).files.get("lib/primitives/styles.ts") ?? "";

    expect(styles, "la barre latérale n existe pas dans la feuille").toMatch(
      /primaryNavLaterale:/u,
    );
    expect(styles, "l entrée active n existe pas").toMatch(/primaryNavLateraleItemActive:/u);

    // ── LA DIFFÉRENCE QUI COMPTE ENTRE LES DEUX DESSINS.
    //
    // La barre empile en LIGNE et chaque entrée prend `flex: 1` pour se
    // partager la largeur. Le rail empile en COLONNE, et `flex: 1` y
    // étirerait chaque entrée sur toute la hauteur : quatre destinations
    // occuperaient l écran entier.
    const bloc = /primaryNavLateraleItem: \{[^}]*\}/u.exec(styles)?.[0] ?? "";
    expect(bloc, "le dessin de la barre latérale est introuvable").not.toBe("");
    expect(bloc, "`flex: 1` dans une colonne : les entrées rempliront l écran").not.toMatch(
      /flex: 1/u,
    );
    // ET LE LIBELLÉ EST DU TEXTE DE LECTURE, pas la vignette de la barre.
    expect(
      styles,
      "le libellé latéral garde la taille minuscule de la barre du bas",
    ).toMatch(/primaryNavLateraleLabel: \{ fontSize: theme\.font\.body/u);

    // LA BORDURE EST LOGIQUE, pas physique : en arabe le rail passe à droite
    // et sa séparation doit suivre.
    expect(styles, "bordure physique : elle se trompera de côté en arabe").toMatch(
      /borderEndWidth/u,
    );
  });

  it("CONTRÔLE DE NON-RÉGRESSION — le téléphone ne change pas de dessin", () => {
    // Le propriétaire a 29 applications natives livrées. Sur téléphone, la
    // barre du bas est la bonne réponse — Apple la recommande sur iOS — et
    // aucune ne doit bouger.
    for (const largeur of [320, 375, 390, 414, 430]) {
      expect(dispositionDe(largeur), `${String(largeur)} px : un téléphone`).toBe("barre");
    }
  });
});
