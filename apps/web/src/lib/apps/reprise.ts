/**
 * REPRENDRE AU LIEU DE TOUT REFAIRE.
 *
 * ── CE QUI REND LA REPRISE POSSIBLE, ET CE QUI LA RENDAIT IMPOSSIBLE.
 *
 * Le travailleur lit son etat DIRECTEMENT dans `sections_acquises` : une
 * ligne remise en attente avec un etat repart ou elle s'etait arretee. La
 * machinerie existe donc deja, et elle tourne a chaque tranche.
 *
 * Mais au moment du refus, cette meme colonne change de role : elle cesse
 * d'etre un POINT DE REPRISE pour devenir un JOURNAL de fin
 * (`phase: "terminee"`, les tours, les niveaux). Les deux formes ne sont
 * pas interchangeables :
 *   · le journal porte `phase: "terminee"` — le rendre tel quel ferait
 *     repartir le moteur en lui disant qu'il a fini ;
 *   · il ne porte NI `coutUsd` NI `jetons`, que le moteur attend — une
 *     reprise les remettrait a zero, et la ligne mentirait sur sa depense.
 *
 * Ce module fait la traduction, explicitement. Il ne devine rien : si la
 * base acquise est absente ou vide, il n'y a RIEN a reprendre, et il le
 * dit — plutot que de relancer une generation complete en la deguisant en
 * reprise. C'est exactement ce qu'il ne faut pas faire payer deux fois.
 */

/** Ce que le moteur exige pour continuer — releve dans `travailleur.ts`. */
export type EtatDeReprise = {
  readonly acquis: Record<string, unknown>
  readonly tirages: unknown[]
  readonly niveaux: unknown
  readonly coutUsd: number
  readonly jetons: { entree: number; sortie: number }
} & Record<string, unknown>

/** Ce qu'une ligne terminee porte, et d'ou la reprise se reconstruit. */
export type LigneTerminee = {
  readonly sections_acquises?: unknown
  readonly cout_usd?: unknown
  readonly jetons_entree?: unknown
  readonly jetons_sortie?: unknown
}

const nombre = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * @returns l'etat a rendre au moteur, ou `null` s'il n'y a rien a reprendre.
 *
 * `null` est une reponse COMPLETE : il signifie « cette ligne ne porte pas
 * de travail recuperable ». L'appelant doit alors refuser la reprise, pas
 * lancer une generation neuve en silence.
 */
export function etatDeReprise(ligne: LigneTerminee): EtatDeReprise | null {
  const journal = ligne.sections_acquises
  if (journal === null || journal === undefined || typeof journal !== 'object') return null
  const j = journal as Record<string, unknown>

  const acquis = j.acquis
  if (acquis === null || acquis === undefined || typeof acquis !== 'object') return null
  const sections = acquis as Record<string, unknown>
  if (Object.keys(sections).length === 0) return null

  // `phase` NE FAIT PAS LE VOYAGE : elle disait « terminee », et le moteur
  // la lirait comme un ordre d'arret. Tout le reste du journal suit — le
  // modele et les premieres passes servent a la reparation.
  const { phase: _phase, acquis: _acquis, tours: _tours, ...reste } = j
  void _phase
  void _acquis
  void _tours

  return {
    ...reste,
    acquis: sections,
    tirages: Array.isArray(j.tirages) ? [...j.tirages] : [],
    niveaux: j.niveaux ?? null,
    // LA DEPENSE DEJA FAITE VOYAGE AVEC L'ETAT. Sans elle, une reprise
    // repartirait d'un compteur a zero et la ligne afficherait moins que
    // ce qu'elle a reellement coute.
    coutUsd: nombre(ligne.cout_usd),
    jetons: { entree: nombre(ligne.jetons_entree), sortie: nombre(ligne.jetons_sortie) },
  }
}

/** Les statuts depuis lesquels une reprise a un sens. Une ligne LIVREE n'a
 *  rien a reprendre : elle est finie, et la relancer serait repayer. */
export const STATUTS_REPRENABLES: readonly string[] = ['refusee']

export function estReprenable(statut: unknown, ligne: LigneTerminee): boolean {
  return STATUTS_REPRENABLES.includes(String(statut)) && etatDeReprise(ligne) !== null
}
