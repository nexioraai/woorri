// ════════════════════════════════════════════════════════════════════
//  LES SEPT COMPOSANTS HÔTES — TOUTE LA FRONTIÈRE DE PLATEFORME.
// ════════════════════════════════════════════════════════════════════
//
// Mesuré le 2026-10-05 : les 561 lignes de primitives natives n'emploient que
// SEPT composants de React Native — `View`, `Text`, `Pressable`, `Image`,
// `TextInput`, `ActivityIndicator` et l'icône. Ce fichier les rend en HTML, et
// il est le SEUL du paquet web à connaître une balise.
//
// Tout le reste — les quatorze primitives, leurs variantes, leurs états — est
// identique au natif à l'import près.

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { versCss, type StyleRN } from "./css.ts";

/**
 * Un style, ou plusieurs.
 *
 * React Native accepte les deux — `style={s.a}` et `style={[s.a, cond && s.b]}`
 * — et les primitives emploient les deux formes. Les accepter ici fait du
 * portage un simple échange d'imports : le corps des quatorze primitives reste
 * IDENTIQUE au natif, ce qui est la seule façon de garantir qu'elles se
 * comportent pareil.
 */
type UnStyle = StyleRN | false | null | undefined;
type Styles = UnStyle | readonly UnStyle[];

const aplatir = (style: Styles): readonly UnStyle[] =>
  // `Array.isArray` ne RÉTRÉCIT pas un type en lecture seule : il rend `any[]`,
  // et le lint a raison de le refuser — un `any` ici éteindrait le typage de
  // toute la feuille de styles. On teste donc la forme nous-mêmes.
  typeof style === "object" && style !== null && "length" in style
    ? (style as readonly UnStyle[])
    : [style];

/**
 * Ce que toute primitive accepte — et l'ACCESSIBILITÉ en fait partie.
 *
 * React Native porte un vocabulaire d'accessibilité qui lui est propre :
 * `accessibilityRole`, `accessibilityState`. Le web porte ARIA. Les deux disent
 * la même chose, et c'est ICI que la traduction a lieu — pas dans les
 * primitives, qui doivent rester identiques des deux côtés.
 *
 * NE RIEN TRADUIRE AURAIT ÉTÉ LE PIRE : les propriétés inconnues sont ignorées
 * en silence par React, et l'application aurait perdu TOUTE son accessibilité
 * sur le web sans qu'aucun test ne proteste. Un bouton qui ne s'annonce plus
 * ne se voit pas — il ne se voit JAMAIS, pour ceux qui en dépendent.
 */
interface Commun {
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean; checked?: boolean };
}

const attributs = (p: Commun) => ({
  // `data-testid` : la convention du web, et celle que lisent les harnais de
  // test. Le natif emploie `testID` ; le CONTRAT reste le même des deux côtés,
  // seule la façon de l'exposer au moteur de rendu change.
  ...(p.testID === undefined ? {} : { "data-testid": p.testID }),
  ...(p.accessibilityLabel === undefined ? {} : { "aria-label": p.accessibilityLabel }),
  ...(p.accessibilityRole === undefined ? {} : { role: p.accessibilityRole }),
  ...(p.accessibilityState?.selected === undefined
    ? {}
    : { "aria-selected": p.accessibilityState.selected }),
  ...(p.accessibilityState?.disabled === undefined
    ? {}
    : { "aria-disabled": p.accessibilityState.disabled }),
  ...(p.accessibilityState?.busy === undefined
    ? {}
    : { "aria-busy": p.accessibilityState.busy }),
  ...(p.accessibilityState?.checked === undefined
    ? {}
    : { "aria-checked": p.accessibilityState.checked }),
});

/**
 * UNE VUE EST UNE COLONNE — et c'est le piège le plus coûteux du portage.
 *
 * React Native empile ses enfants VERTICALEMENT par défaut ; le web les aligne
 * horizontalement. Une mise en page entière se retourne sans qu'aucune
 * propriété ne soit fausse : rien n'est signalé, tout est de travers.
 *
 * On pose donc `display:flex; flex-direction:column` AVANT les styles reçus —
 * avant, pour qu'une feuille qui déclare `flexDirection: "row"` l'emporte.
 */
export function Vue({
  style,
  children,
  ...reste
}: PropsWithChildren<Commun & { style?: Styles }>) {
  return (
    <div
      {...attributs(reste)}
      style={{ display: "flex", flexDirection: "column", ...versCss(...aplatir(style)) }}
    >
      {children}
    </div>
  );
}

/** Un texte. `<span>` et non `<p>` : une primitive ne décide pas d'un bloc. */
export function Texte({
  style,
  children,
  ...reste
}: PropsWithChildren<Commun & { style?: Styles }>) {
  return (
    <span {...attributs(reste)} style={versCss(...aplatir(style))}>
      {children}
    </span>
  );
}

/**
 * UN GESTE — et c'est un `<button>`, jamais un `<div>` cliquable.
 *
 * Un `div` avec un gestionnaire de clic n'est pas atteignable au clavier, ne
 * s'annonce pas aux lecteurs d'écran, et n'obéit pas à la touche Entrée. Le
 * natif obtient tout cela de `Pressable` ; sur le web, seul `<button>` le donne.
 *
 * Les styles par défaut du navigateur sont neutralisés ICI : sans cela, le
 * bouton porterait une bordure et un fond que les jetons n'ont pas décidés.
 */
export function Geste({
  style,
  onPress,
  disabled,
  children,
  ...reste
}: PropsWithChildren<Commun & { style?: Styles; onPress?: () => void; disabled?: boolean }>) {
  return (
    <button
      type="button"
      {...attributs(reste)}
      disabled={disabled === true}
      onClick={onPress}
      style={
        {
          display: "flex",
          flexDirection: "column",
          background: "none",
          border: "none",
          font: "inherit",
          color: "inherit",
          textAlign: "inherit",
          padding: 0,
          cursor: disabled === true ? "default" : "pointer",
          ...versCss(...aplatir(style)),
        }
      }
    >
      {children}
    </button>
  );
}

/**
 * UNE IMAGE, ET SON TEXTE DE REMPLACEMENT.
 *
 * `alt` est OBLIGATOIRE en HTML — l'omettre fait annoncer le nom du fichier par
 * un lecteur d'écran. Quand l'appelant ne donne rien, on pose une chaîne VIDE :
 * c'est la façon normalisée de dire « cette image est décorative », et elle est
 * alors ignorée, ce qui vaut mieux qu'une URL lue à voix haute.
 */
export function Visuel({
  source,
  style,
  resizeMode,
  onError,
  accessibilityIgnoresInvertColors,
  ...reste
}: Commun & {
  source: { uri: string };
  style?: Styles;
  resizeMode?: string;
  onError?: () => void;
  accessibilityIgnoresInvertColors?: boolean;
}) {
  // `accessibilityIgnoresInvertColors` est une affaire d'iOS : l'inversion des
  // couleurs du système ne doit pas retourner une photo. Le web n'a pas cette
  // inversion — la propriété n'a donc rien à traduire, et la consommer ici
  // évite qu'elle finisse en attribut inconnu sur la balise.
  void accessibilityIgnoresInvertColors;
  return (
    <img
      src={source.uri}
      alt={reste.accessibilityLabel ?? ""}
      onError={onError}
      {...attributs(reste)}
      style={
        {
          // `resizeMode` du natif devient `object-fit` : « cover » rogne,
          // « contain » tient dans le cadre. Même vocabulaire, même effet.
          ...(resizeMode === undefined ? {} : { objectFit: resizeMode as CSSProperties["objectFit"] }),
          ...versCss(...aplatir(style)),
        }
      }
    />
  );
}

/** Une saisie d'une ligne. */
export function Saisie({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  style,
  ...reste
}: Commun & {
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: string;
  style?: Styles;
}) {
  return (
    <input
      {...attributs(reste)}
      // `type` porte DEUX choses à la fois sur le web : le masquage d'un secret
      // et le clavier proposé sur un téléphone. Le natif les sépare
      // (`secureTextEntry`, `keyboardType`) ; on les réunit ici sans rien
      // inventer — un secret reste masqué, un nombre appelle le pavé numérique.
      type={
        secureTextEntry === true
          ? "password"
          : keyboardType === "numeric" || keyboardType === "number-pad"
            ? "number"
            : keyboardType === "email-address"
              ? "email"
              : keyboardType === "phone-pad"
                ? "tel"
                : "text"
      }
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChangeText?.(e.target.value)}
      style={versCss(...aplatir(style))}
    />
  );
}

/**
 * L'ATTENTE.
 *
 * Le natif a un indicateur fourni par le système. Le web n'en a aucun : on
 * rend donc un élément qui DIT qu'il travaille — `role="status"` — plutôt
 * qu'une animation muette. Un lecteur d'écran annonce l'attente ; sans ce rôle,
 * la page se tairait pendant tout le chargement.
 *
 * L'apparence (un disque qui tourne) appartient à la feuille de styles de
 * l'application, pas à la primitive : aucun style en dur ici, c'est la règle
 * D-021 et elle vaut pour les deux cibles.
 */
export function Attente({
  style,
  size,
  ...reste
}: Commun & { style?: Styles; size?: string | number }) {
  // `size` vient du natif (« small » / « large »). Il n'a pas d'équivalent
  // direct en CSS : la TAILLE d'une attente appartient à la feuille de styles.
  // On le laisse donc traverser en attribut de données, pour que la feuille
  // puisse s'en servir sans qu'aucune valeur ne soit inventée ici.
  void size;
  return (
    <span
      role="status"
      aria-busy="true"
      {...(size === undefined ? {} : { "data-taille": String(size) })}
      {...attributs(reste)}
      style={versCss(...aplatir(style))}
    />
  );
}

/**
 * UN SIGNE.
 *
 * Le natif dessine ses glyphes avec une police embarquée (vocabulaire fermé,
 * aucun accès réseau). Le web ne peut pas embarquer cette police sans la
 * livrer ; en attendant que la cible web ait son propre jeu, le signe est rendu
 * comme un élément DÉCORATIF et vide — `aria-hidden`, parce qu'un signe sans
 * dessin ne doit pas être annoncé.
 *
 * ⚠️ LIMITE DITE, ET NON MASQUÉE : les boutons qui portaient un signe n'en
 * montrent aucun sur le web. Leur libellé, lui, est intact — le signe était un
 * renfort, jamais le seul porteur du sens (règle du vocabulaire fermé).
 */
export function Signe({
  name,
  style,
  size,
  color,
  ...reste
}: Commun & { name: string; style?: Styles; size?: number; color?: string }) {
  return (
    <span
      aria-hidden="true"
      data-signe={name}
      {...attributs(reste)}
      style={
        {
          // Sur le natif, la taille et la couleur d'un signe sont des PROPS ;
          // sur le web, ce sont des styles. Rien n'est inventé : les mêmes
          // valeurs, portées autrement.
          ...(size === undefined ? {} : { fontSize: String(size) + "px" }),
          ...(color === undefined ? {} : { color }),
          ...versCss(...aplatir(style)),
        }
      }
    />
  );
}

/** Ce que les primitives reçoivent comme enfants. */
export type Enfants = ReactNode;
