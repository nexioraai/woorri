/**
 * LE JUGE DU BANDEAU CONTREDIT — une œuvre en base ne dit pas le contraire.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-05 SUR LA GÉNÉRATION DE CONTRÔLE DE A1.
 *
 * L'œuvre calculait sa condition JUSTE :
 *
 *     const enBase = b.url !== "" && window.origin !== "null";
 *
 * et affichait, sur ses trois écrans :
 *
 *     enBase && <div>« Mode aperçu – données en mémoire, non
 *                      conservées. »</div>
 *
 * Le bandeau s'affichait donc quand les données SONT conservées. Mesuré
 * dans la page servie : `origin` réel, `url` posée, `enBase` calculé à
 * `true` — et le message s'affichait quand même. Un client aurait lu que
 * son travail n'est pas sauvegardé alors qu'il l'est.
 *
 * ── CE QUE CE JUGE MESURE, ET CE QU'IL NE MESURE PAS.
 *
 * Il ne cherche PAS un mot : un mot seul ne dit rien. Il cherche une
 * CONTRADICTION — une phrase qui nie la conservation, placée dans une
 * branche prise quand la base EST joignable. C'est la paire qui est le
 * défaut, et c'est la paire qu'il mesure.
 *
 * ── POURQUOI PAS LE SIMULATEUR, QUI VOIT POURTANT LE TEXTE.
 *
 * `jugerExecution` rend `ecrans[].texte`. Mais il n'injecte AUCUNE base :
 * `enBase` y vaut donc FAUX, et le bandeau fautif ne s'y affiche jamais.
 * Il verrait le cas CORRECT et manquerait le cas INVERSÉ — exactement à
 * l'envers. Lui injecter une base enverrait toute œuvre sur son chemin
 * réseau, que le simulateur ferme par conception : on dégraderait le juge
 * principal pour attraper un défaut secondaire.
 *
 * ── ET LA CAUSE EST FERMÉE AILLEURS.
 *
 * La consigne demandait ce bandeau (« et la page le dit ») en laissant sa
 * condition quatre lignes plus haut. Elle l'INTERDIT maintenant :
 * `pageAutonome` le pose déjà, et il dit vrai dans les trois cas. Ce juge
 * est le cliquet de cette correction, pas son remplaçant.
 */

/** Ce qui NIE la conservation. Jamais jugé seul — toujours avec sa branche. */
const NIE_LA_CONSERVATION: readonly RegExp[] = [
  /non\s+conserv/iu,
  /pas\s+conserv/iu,
  /ne\s+(?:sont|seront|sera|est)\s+pas\s+(?:sauvegard|enregistr|conserv)/iu,
  /en\s+mémoire[^.]{0,40}(?:non|pas)\s+conserv/iu,
  /données\s+en\s+mémoire/iu,
  /mode\s+aperçu/iu,
  /disparaîtra?(?:ont)?\s+au\s+rechargement/iu,
]

export type DefautBandeau = {
  readonly fichier: string
  readonly ligne: number
  /** La condition trouvée devant le texte — c'est elle qui fait le défaut. */
  readonly condition: string
  readonly texte: string
}

/**
 * LA CONDITION QUI COMMANDE CETTE LIGNE, si c'est `enBase` AU POSITIF.
 *
 * On remonte au plus près : une garde `!enBase` ou `enBase === false`
 * entre la condition et le texte annule le défaut — c'est le cas JUSTE.
 */
function conditionPositive(avant: string): string | null {
  // La dernière mention d'`enBase` avant le texte décide.
  const m = [...avant.matchAll(/(!\s*enBase|enBase\s*===\s*false|enBase\s*\?|enBase\s*&&)/gu)]
  const dernier = m.at(-1)
  if (dernier === undefined) return null
  const forme = dernier[1].replace(/\s+/gu, ' ')
  // `!enBase` et `enBase === false` sont le cas JUSTE : la branche n'est
  // prise QUE sans base. Seules les formes positives sont un défaut.
  if (forme.startsWith('!') || forme.includes('=== false')) return null
  return forme
}

/**
 * LES CONTRADICTIONS D'UNE ŒUVRE — vide quand il n'y en a pas.
 *
 * `fichiers` sont les sources que le modèle a écrites, pas le paquet
 * assemblé : une contradiction se lit là où elle s'écrit.
 */
export function jugerBandeau(
  fichiers: ReadonlyMap<string, string>,
): readonly DefautBandeau[] {
  const defauts: DefautBandeau[] = []
  for (const [fichier, contenu] of fichiers) {
    // Un fichier qui ne parle pas de `enBase` ne peut pas se contredire.
    if (!contenu.includes('enBase')) continue
    const lignes = contenu.split('\n')
    for (const [i, ligne] of lignes.entries()) {
      const motif = NIE_LA_CONSERVATION.find((r) => r.test(ligne))
      if (motif === undefined) continue
      // ── LA FENÊTRE REMONTE, ET ELLE EST BORNÉE.
      //
      // Une condition qui vit vingt lignes plus haut ne commande
      // probablement plus cette ligne-là. Douze lignes couvrent un bloc
      // JSX ordinaire sans attraper le fichier entier.
      const avant = lignes.slice(Math.max(0, i - 12), i + 1).join('\n')
      const condition = conditionPositive(avant)
      if (condition === null) continue
      defauts.push({
        fichier,
        ligne: i + 1,
        condition,
        texte: ligne.trim().slice(0, 120),
      })
    }
  }
  return defauts
}
