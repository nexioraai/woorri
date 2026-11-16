/**
 * LE JUGE DES DATES — un jour saisi est le jour affiché (D16, 2026-11-16).
 *
 * ── LE DÉFAUT, MESURÉ (TZ=America/Toronto, UTC−5).
 *
 * ① EN ARRIÈRE — Atelier 3b96d2e7, Gestion.tsx, écrit par le modèle :
 *      formaterDate(iso) = new Date(iso).toLocaleDateString("fr-FR", …)
 *    « 2026-11-10 » est lu comme minuit UTC (règle ECMAScript des dates sans
 *    heure), soit le 9 à 19 h à UTC−5 : la liste affiche « 09/11/2026 »,
 *    la carte voisine (texte brut) « 2026-11-10 ». Même forme dans Suivi de
 *    stock : new Date(m.date).getMonth() range le 1er du mois dans le mois
 *    précédent.
 * ② EN AVANT — Suivi de stock 4d480027, valeur par défaut du formulaire :
 *      useState(new Date().toISOString().slice(0, 10))
 *    toISOString parle l'heure de Greenwich : le 16 à 20 h 30 à UTC−5, il
 *    rend « 2026-11-17 ». Registre de ventes : toISOString().slice(0, 7)
 *    pour « le mois courant » — faux le dernier jour du mois après 19 h.
 *
 * ── CE QU'IL JUGE : ces deux FORMES dans le code écrit par le modèle (les
 * fichiers systeme/ sont fournis, et lireDate y lit déjà un jour comme un
 * jour local). Lecture pure, aucun montage : le juge d'exécution monte
 * SANS données et ne verra jamais une date (famille « juge sans données »,
 * close — ce juge ne la rouvre pas, il lit le texte).
 *
 * ── CE QU'IL NE VOIT PAS : une date construite par un détour plus long
 * qu'une variable voisine (fonction utilitaire d'un autre fichier, objet
 * Date passé en argument). Il voit les
 * deux formes mesurées, pas la classe entière ; la bibliothèque, elle,
 * ferme la classe pour tout ce qui passe par lireDate.
 *
 * ── FAUX POSITIF ASSUMÉ : new Date(horodatage).getMonth() est juste pour
 * un horodatage complet, et sera quand même signalé. Le remède proposé
 * (lireDate) est juste pour les deux : un tour de plus, jamais une faute
 * de plus. Non bloquant : l'œuvre est livrée avec le diagnostic si le
 * temps manque.
 */

export type DefautDate = {
  readonly fichier: string
  readonly forme: 'jour-de-greenwich' | 'jour-lu-en-utc'
  readonly extrait: string
  /**
   * BLOQUANT (décision du propriétaire, 2026-11-16) : SEULE la forme
   * toISOString().slice/substring/substr(0, 10|7). Mesuré sous
   * Africa/Ndjamena : new Date(a, m - 1, 1).toISOString().slice(0, 7) rend
   * « 2026-09 » pour octobre, TOUJOURS — le marché réel de Deribfy. Aucun
   * faux positif connu : elle prend le jour de Greenwich pour le jour local.
   * Les autres formes restent non bloquantes (faux positif assumé).
   */
  readonly bloquant: boolean
}

/** ② la date ou le mois « d'aujourd'hui » pris à Greenwich. */
const JOUR_DE_GREENWICH: readonly (readonly [RegExp, boolean])[] = [
  [/\.toISOString\(\s*\)\s*\.\s*(?:slice|substring|substr)\(\s*0\s*,\s*(?:10|7)\s*\)/gu, true],
  [/\.toISOString\(\s*\)\s*\.\s*split\(\s*["'`]T["'`]\s*\)/gu, false],
]

/**
 * ① un texte daté passé à new Date puis lu en heure locale. L'argument est
 * UNE expression sans virgule ni parenthèse : new Date(), new Date(a, m, 1)
 * et new Date(Date.now()) sont locaux ou sans texte, donc écartés.
 */
const JOUR_LU_EN_UTC =
  /new\s+Date\(\s*([^(),\s][^(),]*?)\s*\)\s*\)?\s*\.\s*(?:toLocaleDateString|toLocaleString|getMonth|getDate|getDay|getFullYear)\s*\(/gu

/** ① la même, par une variable : const d = new Date(m.date); … d.getMonth() (Suivi de stock). */
const JOUR_LU_EN_UTC_PAR_VARIABLE =
  /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Date\(\s*[^(),\s][^(),]*?\s*\)\s*;?[\s\S]{0,240}?\b\1\s*\.\s*(?:toLocaleDateString|toLocaleString|getMonth|getDate|getDay|getFullYear)\s*\(/gu

export function jugerDates(fichiers: ReadonlyMap<string, string>): DefautDate[] {
  const defauts: DefautDate[] = []
  for (const [fichier, source] of fichiers) {
    if (fichier.startsWith('systeme/')) continue
    if (!/\.(tsx|ts|jsx|js)$/u.test(fichier)) continue
    for (const [motif, bloquant] of JOUR_DE_GREENWICH) {
      for (const m of source.matchAll(motif)) {
        defauts.push({ fichier, forme: 'jour-de-greenwich', extrait: extraitAutour(source, m.index ?? 0), bloquant })
      }
    }
    for (const motif of [JOUR_LU_EN_UTC, JOUR_LU_EN_UTC_PAR_VARIABLE]) {
      for (const m of source.matchAll(motif)) {
        defauts.push({ fichier, forme: 'jour-lu-en-utc', extrait: extraitAutour(source, m.index ?? 0), bloquant: false })
      }
    }
  }
  return defauts
}

function extraitAutour(source: string, i: number): string {
  const debut = source.lastIndexOf('\n', i) + 1
  const fin = source.indexOf('\n', i)
  return source.slice(debut, fin === -1 ? undefined : fin).trim().slice(0, 140)
}

export function reprocheDates(defauts: readonly DefautDate[]): string | null {
  if (defauts.length === 0) return null
  return (
    'DES DATES DÉCALÉES D’UN JOUR — l’utilisateur saisit le 10, l’écran montre le 9 ou le 11 :\n' +
    defauts
      .slice(0, 12)
      .map((d) =>
        `- ${d.bloquant ? '[BLOQUANT — l’application ne sera pas livrée tant qu’elle reste] ' : ''}${d.fichier} : ${d.extrait} → ` +
        (d.forme === 'jour-de-greenwich'
          ? 'toISOString() donne le jour de GREENWICH ; le jour local s’écrit new Date().toLocaleDateString("sv-SE") (AAAA-MM-JJ), le mois local .slice(0, 7) de ce texte'
          : 'new Date("AAAA-MM-JJ") est minuit UTC, la veille à l’ouest ; lis la date avec lireDate(v), exportée par ./systeme/donnees (un jour y reste le jour local)'),
      )
      .join('\n') +
    '\nCorrige chaque ligne : une date se lit et s’écrit en jour LOCAL.'
  )
}
