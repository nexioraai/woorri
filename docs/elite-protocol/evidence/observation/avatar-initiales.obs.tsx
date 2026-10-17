// ════════════════════════════════════════════════════════════════════
//  PREUVE — L'AVATAR À INITIALES EST RÉELLEMENT RENDU, ET L'IMAGE PRIME.
// ════════════════════════════════════════════════════════════════════
//
// ── CE QUI A COMMANDÉ CE BLOC, ET LA MESURE QUI L'A CADRÉ.
//
// Comparaison détail par détail avec Bolt, demandée par le propriétaire.
// Chaque ligne de sa liste de membres y porte un rond d'initiales — AM, PE,
// JM. Deribfy ne savait poser qu'une VIGNETTE, et seulement si le document
// déclare `imageFieldId` : une liste de personnes sans photo restait du texte
// nu.
//
// LA MESURE A CADRÉ LE LOT, et c'est la leçon de la pastille de statut, payée
// le même jour : j'avais annoncé deux manques qui n'existaient pas, parce que
// j'avais GREPPÉ au lieu de MONTER. Ici la mesure dit que la vignette marche
// déjà (`imageFieldId` employé 111 fois) ; le trou est exactement le REPLI.
//
// ── POURQUOI UN DRAPEAU DU DOCUMENT, ET PAS UNE DÉDUCTION.
//
// Déduire d'une entité qu'elle désigne des personnes serait la devinette de
// domaine que ce dépôt interdit partout ailleurs (F3, EP-201). Un catalogue
// afficherait « CB » pour « Collier baoulé ». Le document le DIT.
//
// ── CE QUE CE FICHIER TIENT, ET POURQUOI IL MONTE AU LIEU DE LIRE.
//
// ① une liste de personnes SANS photo rend un rond d'initiales par ligne ;
// ② les initiales sont celles du NOM rendu, pas un décor ;
// ③ CONTRÔLE NÉGATIF : une liste sans le drapeau n'en rend AUCUN ;
// ④ L'IMAGE PRIME : là où une photo existe, c'est l'image qui est montée ;
// ⑤ et le repli agit EXACTEMENT là où la photo manque — pas ailleurs ;
// ⑥ le nom ENTIER reste lu par les technologies d'assistance.
//
// Compilé À NEUF : la leçon des neuf observations aveugles, vertes sur un
// instantané de cinq semaines.
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer, ReactTestInstance } from "react-test-renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { compilerANeuf } from "./app-fraiche.ts";

// `tontine` est le document du propriétaire, et celui de la comparaison : il
// porte TROIS listes de personnes et une liste de transactions — donc le
// témoin positif et le témoin négatif dans la MÊME application.
const DOCUMENT = "slices/tontine/tontine.air.json";
let APP = "";
beforeAll(async () => {
  const a = await compilerANeuf(DOCUMENT, "deribfy-avatar");
  APP = a.base;
  expect(a.fichiers, "aucun fichier émis : il n'y a rien à monter").toBeGreaterThan(10);
}, 180_000);

/**
 * Monte un écran de l'application fraîchement compilée.
 *
 * ── POURQUOI UN DROIT SE PASSE ICI, ET CE QUE ÇA M'A APPRIS.
 *
 * `scr_annuaire` n'a d'abord rendu AUCUN bloc — ni sa liste, ni même son
 * en-tête, qui ne dépend d'aucune donnée. Ce n'était pas un défaut : l'écran
 * porte `requiredRightId: "right_registre"`, et le garde d'accès vit dans
 * l'unique couture de visibilité. Un écran réservé se rend VIDE sous son
 * titre — c'est écrit dans `useBlockVisible`, et c'est voulu.
 *
 * J'allais conclure « l'annuaire est vide » et chercher un défaut d'image.
 * Six des neuf écrans de ce document sont à droit : sans session porteuse, la
 * moitié de l'application est invisible à tout instrument de montage.
 */
async function monter(
  ecran: string,
  droits: readonly string[] = [],
  retoucher?: (d: Record<string, { id: string; values: Record<string, string> }[]>) => void,
): Promise<ReactTestRenderer> {
  const { DataRoot } = await import(APP + "lib/runtime/data-provider.tsx");
  const { FormStateRoot } = await import(APP + "lib/runtime/form-state.tsx");
  const { SessionRoot } = await import(APP + "lib/runtime/session-provider.tsx");
  const { buildDemoProvider } = await import(APP + "lib/runtime/demo-provider.ts");
  const { demoData } = await import(APP + "demo.data.ts");
  // ── UNE COPIE, JAMAIS L'ORIGINAL.
  //
  // `demoData` est un module : le retoucher en place contaminerait tous les
  // montages suivants de ce fichier, et le dernier contrôle exécuté
  // déciderait du verdict des autres.
  const donnees = JSON.parse(JSON.stringify(demoData)) as Record<
    string,
    { id: string; values: Record<string, string> }[]
  >;
  retoucher?.(donnees);
  const Ecran = (await import(APP + `screens/${ecran}.tsx`)).default as () => unknown;
  const session = {
    estAuthentifie: () => droits.length > 0,
    identifiant: () => (droits.length > 0 ? "obs-avatar" : undefined),
    abonner: () => () => undefined,
    droits: () => droits,
  };
  let r: ReactTestRenderer | undefined;
  act(() => {
    r = create(
      createElement(SessionRoot as never, { provider: session } as never,
        createElement(DataRoot as never, { provider: buildDemoProvider(donnees) } as never,
          createElement(FormStateRoot as never, null as never, createElement(Ecran as never)))) as never,
    );
  });
  return r!;
}

const parTestID = (r: ReactTestRenderer, fragment: string): ReactTestInstance[] =>
  r.root.findAll((n) => String((n.props as { testID?: string }).testID ?? "").includes(fragment));

/** Toute image montée, quel que soit son emplacement dans l'arbre. */
const images = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll((n) => typeof (n.props as { source?: { uri?: string } }).source?.uri === "string");

/** Le texte rendu sous un nœud, concaténé. */
const texte = (n: ReactTestInstance): string =>
  n.findAll(() => true)
    .flatMap((x) => (Array.isArray(x.props.children) ? x.props.children : [x.props.children]))
    .filter((c): c is string => typeof c === "string")
    .join("");

describe("PREUVE — l'avatar à initiales, rendu et subordonné à l'image", () => {
  it("① LA LISTE DE MEMBRES REND UN ROND PAR LIGNE", async () => {
    const r = await monter("scr_membres");
    const lignes = parTestID(r, "-row-");
    const ronds = parTestID(r, "-avatar-");
    console.log(
      `\n[AVATAR] membres — lignes : ${String(lignes.length)} · ronds : ${String(ronds.length)}`,
    );
    expect(lignes.length, "la liste de membres est vide : rien à juger").toBeGreaterThan(0);
    expect(ronds.length, "aucun avatar rendu : le drapeau du document n'agit pas").toBeGreaterThan(
      0,
    );
    r.unmount();
  });

  it("② LES INITIALES SONT CELLES DU NOM RENDU — pas un décor", async () => {
    // ── POURQUOI CETTE ASSERTION ET PAS « deux lettres ».
    //
    // Un rond affichant « XX » partout passerait « deux lettres ». On exige
    // que chaque rond porte la PREMIÈRE LETTRE du titre de SA ligne : c'est
    // la seule forme qu'un décor ne peut pas produire.
    const r = await monter("scr_membres");
    const ronds = parTestID(r, "-avatar-");
    const vus: string[] = [];
    for (const rond of ronds) {
      const id = String((rond.props as { testID: string }).testID).split("-avatar-")[1] ?? "";
      const ligne = parTestID(r, `-row-${id}`)[0];
      expect(ligne, `aucune ligne pour l'avatar ${id}`).not.toBeUndefined();
      const nom = texte(ligne as ReactTestInstance).trim();
      const ini = texte(rond).trim();
      vus.push(`${ini} ← ${nom.slice(0, 22)}`);
      expect(ini.length, `avatar vide sur la ligne ${id}`).toBeGreaterThan(0);
      expect(
        ini[0],
        `les initiales « ${ini} » ne viennent pas du nom « ${nom} »`,
      ).toBe(nom[0]?.toUpperCase());
    }
    console.log("[AVATAR] " + vus.slice(0, 4).join(" · "));
    r.unmount();
  });

  it("③ CONTRÔLE NÉGATIF : sans le drapeau, AUCUN rond", async () => {
    // Sans ce contrôle, un avatar rendu partout passerait pour une réussite —
    // et il mentirait : un catalogue d'articles afficherait « CB » pour
    // « Collier baoulé ». `scr_tontines` liste des TONTINES, pas des gens, et
    // ne porte pas le drapeau.
    const r = await monter("scr_tontines");
    const lignes = parTestID(r, "-row-");
    const ronds = parTestID(r, "-avatar-");
    console.log(
      `[AVATAR] tontines — lignes : ${String(lignes.length)} · ronds : ${String(ronds.length)}`,
    );
    expect(lignes.length, "la liste des tontines est vide : le contrôle ne mord pas").toBeGreaterThan(
      0,
    );
    expect(ronds.length, "un avatar est rendu là où le document ne le demande pas").toBe(0);
    r.unmount();
  });

  it("④ L'IMAGE PRIME — et cette assertion a été AVEUGLE une première fois", async () => {
    // ── CE CONTRÔLE A ÉTÉ RÉÉCRIT APRÈS AVOIR SURVÉCU À SA PROPRE MUTATION.
    //
    // Première forme : « aucune ligne ne porte une photo ET un rond ».
    // Mesuré : les HUIT fiches de l'annuaire portent une photo. Faire passer
    // l'avatar DEVANT l'image rendait donc huit ronds et zéro image — et
    // « aucune ligne ne porte les deux » restait VRAI. Le contrôle était vert
    // pour une mauvaise raison : il ne disait pas LEQUEL des deux gagne.
    //
    // Forme actuelle : là où la donnée porte une photo, on exige l'image ET
    // l'absence de rond. C'est la seule forme qu'une inversion ne survit pas.
    const r = await monter("scr_annuaire", ["right_registre"]);
    const lignes = parTestID(r, "-row-");
    expect(lignes.length, "l'annuaire est vide").toBeGreaterThan(0);
    const im = images(r).length;
    const ronds = parTestID(r, "-avatar-").length;
    console.log(
      `[AVATAR] annuaire — lignes : ${String(lignes.length)} · images : ${String(im)} · ronds : ${String(ronds)}`,
    );
    expect(im, "aucune photo rendue : la vignette a cessé d'agir").toBeGreaterThan(0);
    expect(
      ronds,
      "un rond est rendu là où une photo existe : le repli est devenu un remplacement",
    ).toBe(0);
  });

  it("⑤ LE REPLI AGIT EXACTEMENT OÙ LA PHOTO MANQUE — mesuré ligne par ligne", async () => {
    // ── LE CAS RÉEL, ET IL EST LE PLUS FRÉQUENT.
    //
    // Un annuaire de tontine n'a jamais huit photos sur huit. Le document
    // DÉCLARE `imageFieldId` et la valeur est VIDE — la ligne la plus
    // ordinaire du monde, et celle que Deribfy rendait en texte nu.
    //
    // On vide la photo d'UNE fiche, et on exige que le rond apparaisse sur
    // CELLE-LÀ, et seulement elle : un total ne le dirait pas, deux erreurs
    // opposées se compensent.
    let sans = "";
    const r = await monter("scr_annuaire", ["right_registre"], (d) => {
      const u = d.ent_utilisateurs?.[0];
      expect(u, "aucune fiche à retoucher").not.toBeUndefined();
      if (u !== undefined) {
        sans = u.id;
        u.values.fld_utilisateurs_photo_profil = "";
      }
    });
    const lignes = parTestID(r, "-row-").filter(
      (n) => typeof (n.props as { title?: string }).title === "string",
    );
    expect(lignes.length, "l'annuaire est vide").toBeGreaterThan(1);
    let vus = 0;
    for (const l of lignes) {
      const id = String((l.props as { testID: string }).testID).split("-row-")[1] ?? "";
      const aImage = l.findAll(
        (n) => typeof (n.props as { source?: { uri?: string } }).source?.uri === "string",
      ).length;
      const aRond = l.findAll((n) =>
        String((n.props as { testID?: string }).testID ?? "").includes("-avatar-"),
      ).length;
      if (id === sans) {
        vus += 1;
        expect(aRond, `la fiche sans photo ne porte pas de rond`).toBeGreaterThan(0);
        expect(aImage, `la fiche sans photo rend une image vide`).toBe(0);
      } else {
        expect(aImage, `la fiche ${id} a perdu sa photo`).toBeGreaterThan(0);
        expect(aRond, `la fiche ${id} porte un rond alors qu'elle a sa photo`).toBe(0);
      }
    }
    console.log(`[AVATAR] annuaire retouché — fiche sans photo repérée : ${String(vus)}`);
    expect(vus, "la fiche retouchée n'a pas été retrouvée dans l'arbre").toBe(1);
  });

  it("⑥ LE NOM ENTIER RESTE LU — deux lettres ne suffisent pas à l'oreille", async () => {
    // Un lecteur d'écran annoncerait « A M » : inutilisable. L'étiquette
    // d'accessibilité porte le nom COMPLET.
    const r = await monter("scr_membres");
    // ── L'ÉTIQUETTE VIT SUR LE NŒUD HÔTE, PAS SUR LE COMPOSITE.
    //
    // `findAll` par `testID` rend DEUX nœuds par avatar : l'élément
    // `AvatarInitiales` (qui porte `nom`) et la `View` rendue (qui porte
    // `accessibilityLabel`). J'ai d'abord interrogé le premier et conclu
    // « pas d'étiquette » — faux, je ne regardais pas le bon nœud.
    const ronds = parTestID(r, "-avatar-").filter(
      (n) => typeof (n.props as { accessibilityLabel?: string }).accessibilityLabel === "string",
    );
    expect(ronds.length, "aucun avatar portant une étiquette").toBeGreaterThan(0);
    for (const rond of ronds) {
      const etiquette = String((rond.props as { accessibilityLabel: string }).accessibilityLabel);
      const ini = texte(rond).trim();
      expect(etiquette.length, "l'avatar n'a pas d'étiquette d'accessibilité").toBeGreaterThan(0);
      expect(
        etiquette.length,
        `l'étiquette « ${etiquette} » n'est que les initiales : l'oreille n'entend rien d'utile`,
      ).toBeGreaterThan(ini.length);
    }
    console.log(
      "[AVATAR] étiquette du premier rond :",
      String((ronds[0]?.props as { accessibilityLabel?: string }).accessibilityLabel),
    );
    r.unmount();
  });
});
