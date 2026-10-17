// REMPLISSAGE CONFORME AUX RÈGLES DU DOCUMENT — instrument de mesure.
//
// ────────────────────────────────────────────────────────────────────────
// CAUSE RACINE MESURÉE (2026-09-01)
//
// La gate `controles-fantomes` remplissait CHAQUE champ texte avec la même
// constante, `"0700000000"`. Le runtime annule toute mutation dont une règle
// déclarée est violée (`reglesRespectees`, D-062). Or cette constante n'est ni
// une adresse e-mail, ni une valeur d'énumération, ni un nombre dans une borne.
//
// Conséquence : tout document portant une règle un peu stricte voyait ses
// contrôles comptés FANTÔMES — alors qu'ils faisaient exactement leur travail,
// refuser une saisie invalide. Le document le mieux validé était le plus puni.
//
// Mesuré sur les 26 applications compilées : **183 → 155 fantômes**, soit
// **28 faux positifs** répartis sur 10 applications. Deux applications déjà à
// 100 % agissantes (`resto-riche`, `cours-cuisine`) le restent — la correction
// ne fabrique aucun vert.
//
// CE QUI N'EST PAS CORRIGÉ ICI, et doit rester visible : `update` et `delete`
// exigent `saisie.id`, qu'aucun formulaire ne collecte. Les contrôles concernés
// restent comptés fantômes, à raison. C'est une dette du CONTRAT, pas de
// l'instrument.
//
// ── CE QUE CE MODULE NE FAIT PAS
// Il ne contourne AUCUN contrôle. Il ne touche qu'aux VALEURS SAISIES ; la
// détection reste identique — une pression sans navigation, sans écriture et
// sans appel de capability est toujours un fantôme. Un contrôle réellement mort
// le reste, et le cliquet garde toute sa capacité de détection.
// ────────────────────────────────────────────────────────────────────────

export interface AssertionData {
  readonly fieldId: string;
  readonly operator: string;
  readonly value?: unknown;
}

/** Valeur historique — conservée comme repli, pour ne rien changer là où rien ne l'exige. */
export const VALEUR_PAR_DEFAUT = "0700000000";

/**
 * Candidats essayés dans l'ORDRE. Le premier qui satisfait TOUTES les
 * assertions du champ est retenu ; à défaut, la valeur historique.
 */
const CANDIDATS: readonly string[] = ["1", "2026-01-01", "a@b.co", VALEUR_PAR_DEFAUT, "x"];

/**
 * Sémantique RÉPLIQUÉE de `reglesRespectees` du runtime (D-062). Toute
 * divergence ferait mentir l'instrument : le cliquet de la gate la vérifie.
 */
export function satisfait(valeur: string, a: AssertionData): boolean {
  const n = Number(valeur);
  switch (a.operator) {
    case "required":
      return valeur.trim() !== "";
    case "eq":
      return String(valeur) === String(a.value);
    case "neq":
      return String(valeur) !== String(a.value);
    case "gt":
      return n > Number(a.value);
    case "gte":
      return n >= Number(a.value);
    case "lt":
      return n < Number(a.value);
    case "lte":
      return n <= Number(a.value);
    case "in":
      return Array.isArray(a.value) && a.value.map((x) => String(x)).includes(valeur);
    case "matches":
      return typeof a.value === "string" && new RegExp(a.value).test(valeur);
    default:
      // Opérateur inconnu : on ne prétend pas savoir. Le candidat n'est pas
      // disqualifié — l'instrument ne doit jamais être plus sévère que le moteur.
      return true;
  }
}

/**
 * SYNTHÉTISER UNE CHAÎNE DEPUIS UN MOTIF — ajouté le 2026-10-17.
 *
 * ── LE TROU MESURÉ, ET IL EST RESTÉ OUVERT SIX SEMAINES.
 *
 * Les cinq candidats ci-dessus ne satisfont AUCUN motif exigeant une longue
 * suite de chiffres. Mesuré sur `billetterie-concerts` :
 * `fld_paiement_numero_carte` exige `^[0-9]{13,19}$` et
 * `fld_paiement_expiration` exige `^(0[1-9]|1[0-2])/[0-9]{2}$` — aucun
 * candidat ne passe, la valeur de repli non plus, et le formulaire de
 * paiement était compté FANTÔME alors qu'il fonctionne.
 *
 * Même famille exacte que la cause racine de ce fichier : l'instrument
 * punissait le document le mieux validé.
 *
 * ── CE QU'IL COUVRE, ET CE QU'IL NE PRÉTEND PAS COUVRIR.
 *
 * Les constructions que les documents emploient réellement : classes bornées
 * (`[0-9]{13,19}`), alternatives (`(0[1-9]|1[0-2])`), littéraux, séparateurs,
 * échappements. Il ne résout PAS une expression régulière quelconque — et
 * c'est pourquoi son résultat est VÉRIFIÉ contre le motif avant d'être
 * retenu. Un échec retombe sur la valeur historique, comme avant.
 */
export function depuisMotif(motif: string): string {
  let m = motif.replace(/^\^/u, "").replace(/\$$/u, "");
  let sortie = "";
  for (let garde = 0; m.length > 0 && garde < 200; garde += 1) {
    const alt = /^\(([^()]*)\)(\?)?/u.exec(m);
    if (alt !== null) {
      // La PREMIÈRE branche, développée récursivement.
      if (alt[2] !== "?") sortie += depuisMotif((alt[1] ?? "").split("|")[0] ?? "");
      m = m.slice(alt[0].length);
      continue;
    }
    const cls = /^\[([^\]]+)\](?:\{(\d+)(?:,(\d+))?\}|(\+)|(\*)|(\?))?/u.exec(m);
    if (cls !== null) {
      const corps = cls[1] ?? "";
      const car = /0-9/u.test(corps)
        ? "1"
        : /a-z/u.test(corps)
          ? "a"
          : /A-Z/u.test(corps)
            ? "A"
            : (corps.replace(/\\./gu, "").replace(/\^/u, "")[0] ?? "x");
      const n =
        cls[2] !== undefined
          ? Number(cls[2])
          : cls[4] !== undefined
            ? 1
            : cls[5] !== undefined || cls[6] !== undefined
              ? 0
              : 1;
      sortie += car.repeat(n);
      m = m.slice(cls[0].length);
      continue;
    }
    const ech = /^\\(.)/u.exec(m);
    if (ech !== null) {
      sortie += ech[1] === "d" ? "1" : ech[1] === "s" ? " " : (ech[1] ?? "");
      m = m.slice(2);
      continue;
    }
    const nu = /^([^[(\\])(\{(\d+)(?:,\d+)?\}|\+|\*|\?)?/u.exec(m);
    if (nu === null) break;
    const car = nu[1] ?? "";
    const q = nu[2];
    sortie +=
      q === undefined || q === "+" ? car : q === "*" || q === "?" ? "" : car.repeat(Number(nu[3] ?? 1));
    m = m.slice(nu[0].length);
  }
  return sortie;
}

/**
 * Valeur à saisir dans un champ, compte tenu des règles du document.
 *
 * Un champ SANS assertion garde la valeur historique : la correction est
 * chirurgicale, elle ne déplace que ce que la cause démontrée exige.
 */
export function valeurPourChamp(
  fieldId: string,
  assertions: readonly AssertionData[],
): string {
  const propres = assertions.filter((a) => a.fieldId === fieldId);
  if (propres.length === 0) return VALEUR_PAR_DEFAUT;
  // Une énumération donne directement une valeur admissible ; on l'essaie d'abord.
  const enumere = propres.find((a) => a.operator === "in" && Array.isArray(a.value));
  const premiere =
    enumere !== undefined && Array.isArray(enumere.value) && enumere.value.length > 0
      ? [String(enumere.value[0])]
      : [];
  // Un `eq` DIT la valeur : le document ne laisse rien à choisir.
  const egal = propres.find((a) => a.operator === "eq");
  const imposee = egal === undefined ? [] : [String(egal.value)];
  // Un motif que nul candidat ne satisfait est DÉVELOPPÉ (2026-10-17).
  const motif = propres.find((a) => a.operator === "matches" && typeof a.value === "string");
  const synthese = motif === undefined ? [] : [depuisMotif(String(motif.value))];
  const liste = [...imposee, ...premiere, ...CANDIDATS, ...synthese];
  return liste.find((c) => propres.every((a) => satisfait(c, a))) ?? VALEUR_PAR_DEFAUT;
}

/** Extrait le `fieldId` d'un `testID` de champ (`<bloc>-field-<fieldId>`). */
export function champDuTestID(testID: unknown): string | undefined {
  if (typeof testID !== "string") return undefined;
  const part = testID.split("-field-")[1];
  return part === undefined || part === "" ? undefined : part;
}
