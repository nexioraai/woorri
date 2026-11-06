/**
 * J1 · LES DEUX FACES, MESURÉES EN MONTANT L'ŒUVRE SANS SESSION.
 *
 * ── POURQUOI PAS UNE LECTURE STATIQUE, et c'est une impossibilité.
 *
 * Mesuré le 2026-11-06 : la requête et sa garde de session vivent à des
 * endroits différents (dans `asso`, `chargerMembres()` est appelée depuis un
 * effet gardé par `connecte && vue === 'gestion'` ; la fonction elle-même ne
 * porte qu'un `if (!base) return`). Deux œuvres, deux formes de porte.
 *
 * Mais l'argument qui décide ne dépend d'AUCUN échantillon : un juge qui ne
 * sait pas QUELLE FACE charge une table ne peut pas nommer le bon remède. Et
 * le mauvais remède ici n'est pas une gêne — c'est « déclare `membre`
 * publique », donc la liste des membres et leurs téléphones ouverte à tout
 * le monde. Un juge qui pousse à ouvrir une table privée est pire qu'un juge
 * absent.
 *
 * On monte donc, et on regarde.
 *
 * ── TROIS MONTAGES, TOUS SANS SESSION.
 *
 *   `refus`  les tables répondent 401 → ce qu'obtient un visiteur quand la
 *            table n'est pas publique
 *   `vide`   les tables répondent `[]` → ce qu'il obtient quand il n'y a
 *            sincèrement rien
 *   `temoin` les tables rendent une ligne marquée → l'écran public la
 *            MONTRE-t-il, ou la charge-t-il sans la montrer ?
 *
 * Le troisième n'est pas un luxe : c'est lui qui choisit le remède.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lecturePubliqueDe, nomTable, type EntiteDeclaree } from './entites-declarees'

export type Montage = {
  readonly mode: 'refus' | 'vide' | 'temoin'
  readonly monte: boolean
  /** Les tables que l'œuvre a RÉELLEMENT interrogées, sans session. */
  readonly tables: readonly string[]
  readonly requetes: readonly string[]
  readonly texte: string
  /**
   * LES TABLES QUE L'ÉCRAN PUBLIC MONTRE VRAIMENT (mode `temoin`).
   *
   * Une marque PAR TABLE, et c'est la correction qui compte : avec une
   * marque unique, `asosa` faisait conclure « membre est affichée » parce que
   * `annonce` l'était. Le remède proposé aurait été d'ouvrir la table des
   * téléphones.
   */
  readonly tablesMontrees: readonly string[]
  readonly erreurs: readonly { readonly quoi: string; readonly message: string }[]
}

export type DefautFace = {
  readonly table: string
  /**
   * `affichee` : la face publique MONTRE cette table → il faut la déclarer
   *   publique.
   * `chargee-non-montree` : elle est lue au montage sans être montrée → il
   *   faut la charger après la connexion.
   *
   * La distinction est exigée par le propriétaire, et pour une raison
   * mesurable : sans elle le modèle choisit au hasard, et une fois sur deux
   * il ouvre la mauvaise table.
   */
  readonly forme: 'affichee' | 'chargee-non-montree'
}

export type VerdictFaces = {
  /** `false` = le juge n'a pas pu tourner. Ce n'est PAS « aucun défaut ». */
  readonly aTourne: boolean
  readonly motif: string | null
  /** J1 : les tables interrogées sans session et non déclarées publiques. */
  readonly defauts: readonly DefautFace[]
  /**
   * ② LES DEUX SILENCES INDISCERNABLES.
   *
   * `true` quand un chargement qui a ÉCHOUÉ rend exactement le même écran
   * qu'un chargement réussi à zéro ligne. Aucun mot n'est lu : deux rendus
   * sont comparés.
   */
  readonly silencesIndiscernables: boolean
  readonly montages: readonly Montage[]
}

const PLAFOND_MS = 30_000

/**
 * LE REPROCHE — il NOMME la table et dit ce que l'écran en fait.
 *
 * ── EXIGENCE DU PROPRIÉTAIRE, ET SA RAISON.
 *
 * « Si le reproche ne distingue pas les deux cas, le modèle choisira au
 * hasard — et une fois sur deux il ouvrira la mauvaise table. »
 *
 * Donc deux phrases distinctes, et jamais la même consigne pour les deux.
 */
export function reprocheFaces(v: VerdictFaces): string | null {
  const morceaux: string[] = []
  if (v.defauts.length > 0) {
    const affichees = v.defauts.filter((d) => d.forme === 'affichee')
    const cachees = v.defauts.filter((d) => d.forme === 'chargee-non-montree')
    const lignes: string[] = []
    for (const d of affichees) {
      lignes.push(
        `- « ${d.table} » est LUE ET AFFICHÉE par ta face publique, sans connexion. ` +
          `Déclare-la publique : rends un fichier DONNEES.json qui redéclare « ${d.table} » ` +
          `avec "lecturePublique": true. Sinon la base refuse la lecture et ta page est vide ` +
          `chez tout le monde sauf toi.`,
      )
    }
    for (const d of cachees) {
      lignes.push(
        `- « ${d.table} » est LUE au montage mais n'est affichée QU'APRÈS la connexion. ` +
          `Ne la déclare PAS publique — ce serait ouvrir à tout le monde des données ` +
          `réservées. Charge-la seulement une fois la session obtenue, ` +
          `dans l'espace de gestion.`,
      )
    }
    morceaux.push(
      'DES TABLES SONT INTERROGÉES AVANT TOUTE CONNEXION — mesuré en montant ton ' +
        'application sans session :\n' +
        lignes.join('\n'),
    )
  }
  if (v.silencesIndiscernables) {
    morceaux.push(
      'UN CHARGEMENT QUI ÉCHOUE REND LE MÊME ÉCRAN QU\'UN CHARGEMENT VIDE — mesuré : ' +
        'deux montages, l\'un où la base refuse, l\'autre où elle rend zéro ligne, et ' +
        'le MÊME texte à l\'écran.\n' +
        'Ton code fait `if (!error && data)` : sur un refus, il ne se passe RIEN et ' +
        'l\'écran affiche « aucun élément ». Le visiteur lit qu\'il n\'y a rien ; il y a ' +
        'quelque chose.\n' +
        'Traite le cas `error` SÉPARÉMENT du cas « zéro ligne », et dis à l\'écran ' +
        'laquelle des deux situations se présente.',
    )
  }
  return morceaux.length === 0 ? null : morceaux.join('\n\n')
}

async function monter(
  code: string,
  mode: Montage['mode'],
  dossier: string,
  attenteMs: number,
): Promise<Montage | null> {
  const bundle = join(dossier, 'oeuvre.js')
  const sortie = join(dossier, `verdict-${mode}.json`)
  await writeFile(bundle, code, 'utf8')
  const corps = new URL('./juge-faces-enfant.mjs', import.meta.url).pathname
  const enfant = spawn(process.execPath, [corps, bundle, sortie, mode, String(attenteMs)], {
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', NODE_ENV: 'production' } as NodeJS.ProcessEnv,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let tue = false
  const minuteur = setTimeout(() => {
    tue = true
    enfant.kill('SIGKILL')
  }, PLAFOND_MS)
  await new Promise<void>((res) => {
    enfant.on('exit', () => {
      res()
    })
    enfant.on('error', () => {
      res()
    })
  })
  clearTimeout(minuteur)
  if (tue) return null
  const brut = await readFile(sortie, 'utf8').catch(() => '')
  if (brut === '') return null
  return JSON.parse(brut) as Montage
}

/** Le texte comparé : sans la ligne témoin, et replié. */
const comparable = (t: string): string => t.replace(/\s+/gu, ' ').trim()

export async function jugerFaces(
  code: string,
  entites: readonly EntiteDeclaree[],
  options: { readonly attenteMs?: number } = {},
): Promise<VerdictFaces> {
  let dossier: string | null = null
  try {
    dossier = await mkdtemp(join(tmpdir(), 'deribfy-faces-'))
    const attente = options.attenteMs ?? 1200
    const montages: Montage[] = []
    for (const mode of ['refus', 'vide', 'temoin'] as const) {
      const m = await monter(code, mode, dossier, attente)
      if (m === null) {
        return {
          aTourne: false,
          motif: `le montage « ${mode} » n’a pas rendu de verdict`,
          defauts: [],
          silencesIndiscernables: false,
          montages,
        }
      }
      montages.push(m)
    }
    const [refus, vide, temoin] = montages as [Montage, Montage, Montage]
    if (!refus.monte) {
      return {
        aTourne: false,
        motif: 'l’œuvre ne se monte pas : les faces ne se mesurent pas',
        defauts: [],
        silencesIndiscernables: false,
        montages,
      }
    }

    // ── J1 : CE QUI EST INTERROGÉ SANS SESSION DOIT ÊTRE PUBLIC.
    const publiques = new Set(entites.filter(lecturePubliqueDe).map((e) => nomTable(e)))
    const interrogees = new Set<string>([...refus.tables, ...vide.tables, ...temoin.tables])
    const defauts: DefautFace[] = []
    for (const table of [...interrogees].sort()) {
      if (publiques.has(table)) continue
      defauts.push({
        table,
        // Montrée à l'écran dans le montage témoin → il faut la déclarer
        // publique. Chargée sans être montrée → il faut la charger plus tard.
        // La distinction se fait TABLE PAR TABLE : une marque globale faisait
        // dire « membre est affichée » parce qu'`annonce` l'était.
        forme: temoin.tablesMontrees.includes(table) ? 'affichee' : 'chargee-non-montree',
      })
    }

    // ── ② DEUX SILENCES INDISCERNABLES.
    const silencesIndiscernables =
      refus.monte && vide.monte && comparable(refus.texte) === comparable(vide.texte)

    return { aTourne: true, motif: null, defauts, silencesIndiscernables, montages }
  } catch (e) {
    return {
      aTourne: false,
      motif: `le juge des faces n’a pas pu être lancé : ${e instanceof Error ? e.message : String(e)}`,
      defauts: [],
      silencesIndiscernables: false,
      montages: [],
    }
  } finally {
    if (dossier !== null) await rm(dossier, { recursive: true, force: true }).catch(() => undefined)
  }
}
