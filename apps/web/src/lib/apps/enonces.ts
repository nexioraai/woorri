/**
 * LES ÉNONCÉS — le document découpé, numéroté, par une machine.
 *
 * ── POURQUOI DÉTERMINISTE, ET POURQUOI NUMÉROTÉ.
 *
 * Le juge de couverture jugeait sur un LEXIQUE FERMÉ de dix-huit familles :
 * ce qui n'y figurait pas était invisible (mesuré le 2026-10-31 — le natif
 * exigé par le cahier n'a rien déclenché, et le système SAVAIT). Même
 * maladie que la table fixe de l'élicitation : une liste écrite d'avance à
 * la place du document.
 *
 * Le document décide donc. Mais la DÉCOUPE reste à la machine : un modèle
 * qui découpe peut escamoter une phrase sans que personne le voie. Il ne
 * reçoit que des énoncés NUMÉROTÉS, et ne rend que des IDENTIFIANTS —
 * arbitrage du propriétaire, 2026-10-31 :
 *
 *   « La provenance est exacte PAR CONSTRUCTION. Plus d'indexOf, plus de
 *     normalisation, plus de paraphrase possible. »
 *
 * Une mauvaise affectation reste possible (dire 7 pour 8) ; elle est VISIBLE
 * à l'humain, qui lit le texte à côté de son numéro. Une erreur visible vaut
 * mieux qu'une citation invérifiable.
 *
 * ── LA PROSE COMPTE AUTANT QUE LES PUCES.
 *
 * MESURÉ sur le cahier Hayine : 110 énoncés de puce — et 25 de prose, dont
 * « ne jamais afficher une capacité comme disponible si elle n'est pas
 * réellement prise en charge ». Une exigence de principe, qui n'avait pas eu
 * la chance d'être une puce : invisible, donc jamais exigée, donc jamais
 * manquante. Correction du propriétaire, et elle était juste.
 */

export type Enonce = {
  /** Son numéro, 1..n — la seule chose que le modèle a le droit de rendre. */
  readonly id: number
  readonly texte: string
  /** D'où il vient : une puce du document, ou une phrase de prose. */
  readonly forme: 'puce' | 'prose'
}

/** Les en-têtes et pieds répétés d'un PDF : du bruit, jamais des exigences. */
const BRUIT = [
  /Cahier des charges\s*[—–-][^•\n]{0,90}Page\s*\d+\s*/gu,
  /\bPage\s*\d+\s*(?:sur|\/)\s*\d+\b/gu,
]

/**
 * Les verbes de capacité — ce qui distingue une phrase de prose qui EXIGE
 * d'une phrase qui raconte. Une puce n'a pas à les porter : la mise en puce
 * est déjà l'acte de poser une exigence.
 */
const VERBE_DE_CAPACITE =
  /\b(doit|doivent|permet|permettre|affich\w+|g[èe]re\w*|g[ée]rer|propose\w*|cr[ée]e\w*|envoie|envoyer|calcul\w+|enregistr\w+|valid\w+|configur\w+|fournit|expose\w*|appliqu\w+|autoris\w+|interdit|interdire|v[ée]rifi\w+|notifi\w+|support\w+|prend en charge|peut|peuvent|comprend|inclut|consiste)\b/iu

/** Bornes de longueur : sous le plancher c'est un titre, au-dessus un bloc. */
const MIN_PUCE = 20
const MIN_PROSE = 30
const MAX = 500

/**
 * Découpe un cahier en énoncés numérotés.
 *
 * Les puces entrent telles quelles (les poser EST l'acte d'exiger) ; la prose
 * n'entre que si elle porte un verbe de capacité — sinon un résumé narratif
 * produirait des dizaines de fausses exigences, et le bruit tuerait la liste
 * que l'humain doit pouvoir lire.
 */
export function decouperEnEnonces(cahier: string): readonly Enonce[] {
  let texte = cahier
  for (const bruit of BRUIT) texte = texte.replace(bruit, ' ')

  const enonces: Enonce[] = []
  const blocs = texte.split('•')
  blocs.forEach((bloc, rang) => {
    // Après un « • », la PREMIÈRE phrase du bloc est la puce ; la suite est
    // la prose qui reprend (un titre de section, un paragraphe).
    let estPuce = rang > 0
    for (const brut of bloc.split(/(?<=[.!?])\s+/u)) {
      const p = brut.replace(/\s+/gu, ' ').trim()
      const forme: 'puce' | 'prose' = estPuce ? 'puce' : 'prose'
      estPuce = false
      if (p === '' || p.length > MAX) continue
      if (forme === 'puce' ? p.length < MIN_PUCE : p.length < MIN_PROSE) continue
      if (forme === 'prose' && !VERBE_DE_CAPACITE.test(p)) continue
      enonces.push({ id: enonces.length + 1, texte: p, forme })
    }
  })
  return enonces
}

/** Le texte numéroté tel que le modèle le reçoit — une ligne par énoncé. */
export function enoncesNumerotes(enonces: readonly Enonce[]): string {
  return enonces.map((e) => `${String(e.id)}. ${e.texte}`).join('\n')
}
