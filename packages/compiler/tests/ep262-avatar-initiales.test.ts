/**
 * EP-262 · L'AVATAR À INITIALES — ET LES DEUX CHEMINS DE RENDU D'UNE LISTE.
 *
 * ── CE QUI A COMMANDÉ CE BLOC.
 *
 * Comparaison détail par détail avec Bolt, demandée par le propriétaire.
 * Chaque ligne de sa liste de membres porte un rond d'initiales. Deribfy ne
 * savait poser qu'une VIGNETTE, et seulement si le document déclare
 * `imageFieldId` : une liste de personnes sans photo restait du texte nu.
 *
 * ── LE DÉFAUT QUE CE CLIQUET EXISTE SURTOUT POUR FERMER.
 *
 * `ListBlock` rend ses lignes de DEUX façons : une carte `items.map` quand la
 * liste est BORNÉE (l'aperçu), et une liste virtualisée partout ailleurs.
 * J'ai posé l'avatar sur la première. Mon ancre Python exigeait pourtant une
 * occurrence unique — et elle l'était : les deux sites n'écrivaient pas leur
 * `leading` de la même manière.
 *
 * Le montage a rendu SEIZE lignes et ZÉRO rond. Rien n'avait échoué : ni le
 * typage, ni le lint, ni aucune gate. La liste rendait sa forme d'avant.
 *
 * C'est la cinquième fois que ce dépôt voit « une liste écrite deux fois
 * diverge ». Le contrôle ③ ci-dessous est donc GÉNÉRIQUE : il ne nomme pas
 * deux sites, il exige que TOUT site de ligne porte le repli. Un troisième
 * chemin ajouté demain le fera rougir.
 *
 * ── CE QUI EST PROUVÉ AILLEURS, ET IL FAUT LE DIRE.
 *
 * Ce fichier LIT la source. Le RENDU est prouvé par montage d'une application
 * compilée à neuf, dans `observation/avatar-initiales.obs.tsx` — six
 * contrôles, quatre mutations qui les tuent. Deux d'entre elles ont d'ailleurs
 * corrigé une assertion qui était verte pour une mauvaise raison.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";
import { getBlock, listBlockIds } from "../../blocks/src/registry.ts";
import { BLOCK_REGISTRY_VERSION } from "../../blocks/src/definitions.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (...p: string[]): string => readFileSync(join(R, ...p), "utf8");
const tontine = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(lire("slices", "tontine", "tontine.air.json")) as Record<string, unknown>,
  );

describe("EP-262 · l'avatar à initiales", () => {
  it("① LA PROP EST DÉCLARÉE AU BLOC, ET SA FORME EST EXPRIMABLE", () => {
    expect(listBlockIds(), "le bloc `list` a disparu").toContain("list");
    const schema = getBlock("list")?.propsSchema as
      | { safeParse: (v: unknown) => { success: boolean } }
      | undefined;
    expect(schema, "le schéma du bloc a disparu").not.toBeUndefined();

    // ── LA LEÇON DE `graphique`, APPLIQUÉE SANS LA RELIRE.
    //
    // `flatConfigSchema` n'admet qu'une primitive ou un tableau de
    // primitives. Un booléen en est une — mais on l'ÉPROUVE au lieu de le
    // supposer : `graphique` est resté inexprimable depuis sa création parce
    // que personne n'avait éprouvé la forme de ses props.
    const base = {
      titleFieldId: "fld_x",
    };
    expect(
      schema?.safeParse({ ...base, avatarInitiales: true }).success,
      "le booléen n'est pas accepté : la prop est indéclarable",
    ).toBe(true);
    expect(
      schema?.safeParse({ ...base, avatarInitiales: "oui" }).success,
      "une chaîne est acceptée : la prop n'est plus un booléen",
    ).toBe(false);
  });

  it("② UN DOCUMENT LA PORTE RÉELLEMENT — sinon rien ne la mesure", () => {
    // Un ajout que zéro document n'emploie est la définition même de
    // `graphique` : déclaré, transmis au générateur, et mort.
    const air = tontine();
    const listes = air.screens
      .flatMap((s) => s.blocks)
      .filter((b) => b.blockType === "list");
    const avec = listes.filter((b) =>
      (b.props ?? []).some((p) => p.key === "avatarInitiales" && p.value === true),
    );
    expect(listes.length, "plus aucune liste dans ce document").toBeGreaterThan(0);
    expect(avec.length, "aucune liste ne porte le drapeau : l'ajout est mort-né").toBeGreaterThan(0);
    // ET DES LISTES SANS LE DRAPEAU SUBSISTENT : un drapeau posé partout ne
    // prouverait pas que le moteur obéit au document.
    expect(
      listes.length - avec.length,
      "toutes les listes le portent : le témoin négatif a disparu du document",
    ).toBeGreaterThan(0);
  });

  it("③ TOUT SITE DE LIGNE PORTE LE REPLI — le défaut qui a coûté ce cliquet", () => {
    // ── POURQUOI CE CONTRÔLE EST GÉNÉRIQUE ET NON NOMINATIF.
    //
    // Nommer « les deux chemins » fermerait le défaut d'aujourd'hui et
    // laisserait passer celui d'après. On DÉCOUPE sur `<ListRow`, et chaque
    // morceau doit porter l'avatar dans son `leading`.
    const c = lire("packages", "blocks", "src", "components.tsx");
    const sites = c.split("<ListRow").slice(1);
    expect(sites.length, "aucun site de ligne : ce contrôle ne mesure plus rien").toBeGreaterThan(1);
    for (const [i, site] of sites.entries()) {
      // La zone utile d'un site s'arrête à son `title=` : au-delà on lirait
      // le site suivant.
      const zone = site.slice(0, site.indexOf("title="));
      expect(
        zone,
        `le site de ligne n°${String(i + 1)} ne rend aucun avatar : ` +
          "une liste écrite deux fois a divergé (5e fois dans ce dépôt)",
      ).toContain("AvatarInitiales");
      // ── ET L'IMAGE PRIME, À CHAQUE SITE.
      //
      // L'ordre des branches EST la règle : la photo déclarée se teste
      // d'abord. Mesuré par mutation — inverser l'ordre fait rougir le
      // montage, et ce contrôle-ci le voit sans monter.
      expect(
        zone.indexOf("item.imageUri"),
        `au site n°${String(i + 1)}, l'avatar passe avant l'image : ` +
          "le repli est devenu un remplacement",
      ).toBeLessThan(zone.indexOf("AvatarInitiales"));
    }
  });

  it("④ LE RUNTIME TRANSMET — le maillon qui avait manqué à `accroche` et `logoUri`", () => {
    // Déclaré au bloc, rendu par le composant, et JAMAIS passé : rien
    // n'échoue, la liste rend sa forme d'avant. Deux props de ce dépôt ont
    // vécu ainsi.
    const rt = lire("packages", "compiler", "runtime", "air-runtime.tsx");
    expect(rt, "le runtime ne transmet pas le drapeau").toContain(
      "avatarInitiales={props.avatarInitiales === true}",
    );
  });

  it("⑤ LA PRIMITIVE DIT LE NOM ENTIER À L'OREILLE", () => {
    // Deux lettres annoncées par un lecteur d'écran — « A M » — ne sont pas
    // une information. L'étiquette porte le nom complet.
    const p = lire("packages", "primitives", "src", "primitives.tsx");
    const i = p.indexOf("export function AvatarInitiales");
    expect(i, "la primitive a disparu").toBeGreaterThan(-1);
    const bloc = p.slice(i, p.indexOf("export function", i + 40));
    expect(bloc, "l'étiquette d'accessibilité ne porte pas le nom").toContain(
      "accessibilityLabel={nom}",
    );
    // ── UN NOM VIDE NE REND RIEN, plutôt qu'un rond muet.
    expect(bloc, "un nom vide rendrait un rond sans lettre").toContain('if (initiales === "") return null;');
  });

  it("⑥ LES DEUX CIBLES PORTENT LA PRIMITIVE — 32/32 applications web cassées", () => {
    // ── CE QUE J'AI RÉELLEMENT CASSÉ, ET LA GATE L'A VU.
    //
    // `packages/primitives/src/index.ts` est PARTAGÉ par les deux cibles ;
    // `primitives.tsx` ne l'est pas — la cible web a le sien, « le natif à
    // l'import près ». Poser la primitive côté natif seulement a donc fait
    // exporter un symbole que le web n'implémente pas :
    // `TS2305: Module './primitives' has no exported member` — et
    // ZÉRO des 32 applications web ne compilait plus.
    //
    // La cible native, elle, restait verte. C'est la forme la plus coûteuse
    // du défaut : la moitié du produit tombe, et l'autre moitié n'en dit rien.
    const nat = lire("packages", "primitives", "src", "primitives.tsx");
    const web = lire("packages", "primitives-web", "src", "primitives.tsx");
    const idx = lire("packages", "primitives", "src", "index.ts");
    expect(idx, "l'index partagé n'exporte pas la primitive").toContain("AvatarInitiales");
    expect(nat, "la primitive native a disparu").toContain("export function AvatarInitiales");
    expect(
      web,
      "la cible WEB n'implémente pas la primitive : l'index partagé l'exporte " +
        "pourtant, et les 32 applications web cesseraient de compiler",
    ).toContain("export function AvatarInitiales");

    // ── ET LES DEUX CORPS SONT LE MÊME, À L'IMPORT PRÈS.
    //
    // L'en-tête du fichier web le promet en toutes lettres. Deux corps qui
    // divergent feraient deux produits — et c'est la famille de défaut que ce
    // dépôt a vue cinq fois.
    const corps = (src: string): string => {
      const i = src.indexOf("export function AvatarInitiales");
      return src
        .slice(i, src.indexOf("export function", i + 40))
        .replace(/\s+/gu, " ")
        .trim();
    };
    expect(corps(web), "le corps web a divergé du natif").toBe(corps(nat));
  });

  it("⑦ LA VERSION DU REGISTRE A MONTÉ — D-020, ajout compatible", () => {
    const [majeur, mineur] = BLOCK_REGISTRY_VERSION.split(".").map(Number);
    expect(majeur, "la majeure a bougé : un ajout optionnel n'est pas une rupture").toBe(1);
    expect(mineur, "la mineure n'a pas monté avec l'ajout").toBeGreaterThanOrEqual(19);
    // Le JOURNAL doit porter l'entrée : deux montées de ce jour (1.17.0 et
    // 1.18.0) étaient restées non consignées, et je ne l'ai vu qu'en relisant
    // le fichier pour celle-ci.
    const d = lire("packages", "blocks", "src", "definitions.ts");
    for (const v of ["1.17.0", "1.18.0", "1.19.0"]) {
      expect(d, `la montée ${v} n'est pas consignée au journal du registre`).toContain(`// ${v}`);
    }
  });
});
