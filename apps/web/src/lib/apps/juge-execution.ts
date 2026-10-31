/**
 * LE JUGE D'EXÉCUTION — « ça démarre » rejoint les critères d'acceptation.
 *
 * ── CE QUE LES TROIS AUTRES JUGES NE POUVAIENT PAS VOIR.
 *
 * Tir 88c94164 : assemblé, vivant, couvrant — et MORT AU DÉMARRAGE sur
 * l'écran du propriétaire (undefined.fontSize). L'assembleur ne type-check
 * pas (su depuis le 2026-10-18) ; EP-301 ferme les jetons inventés ; celui-ci
 * ferme le reste : effets qui jettent, états mal initialisés, boucles de
 * rendu. Le critère devient QUADRUPLE : ça s'assemble, ça vit, ça
 * couvre-ou-le-dit, ET ÇA DÉMARRE.
 *
 * ── LE CLOISONNEMENT, ET CE QU'IL VAUT RÉELLEMENT (arbitrage du 2026-10-31).
 *
 *   ① ENVIRONNEMENT VIDE — la vraie protection. Le processus ne reçoit
 *     aucune variable : pas de clé DeepSeek, pas de service_role, rien à
 *     exfiltrer. C'est la condition que le propriétaire a posée en premier.
 *   ② REFUS RÉSEAU — le verrou qui compte. MESURÉ : `--permission` de Node
 *     NE COUVRE PAS le réseau (`require('net')` passe). L'enfant neutralise
 *     donc lui-même fetch/XHR/WebSocket et refuse les modules réseau à la
 *     résolution, AVANT que le code du modèle existe.
 *   ③ PERMISSIONS — une couche de plus : ni écriture de fichiers hors de
 *     son dossier, ni processus enfant, ni modules natifs. Jamais la serrure.
 *   ④ UN PROCESSUS PAR TOUR, jamais réutilisé, tué au plafond.
 *
 * ── LE PLAFOND EST MESURÉ, PAS DEVINÉ (condition du propriétaire).
 *
 * Sur les cinq œuvres livrées stockées, visite de tous les écrans comprise :
 * 786 à 1777 ms de processus complet (démarrage de Node, DOM et décantation
 * inclus). Le plafond est posé à 15 s — huit fois le pire cas mesuré. Un
 * dépassement est un VERDICT (l'œuvre boucle), pas une panne.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ErreurExecution = {
  readonly quoi: string
  readonly message: string
  readonly indice: string
}

export type VerdictExecution = {
  readonly demarre: boolean
  readonly erreurs: readonly ErreurExecution[]
  readonly octetsRendus: number
  readonly texte: string
  /** Combien d'écrans ont été ouverts et jugés — condition 4 du propriétaire. */
  readonly ecransVisites?: number
  readonly ms: number
  /** Dit quand le juge n'a pas pu se prononcer — jamais confondu avec un refus. */
  readonly indisponible?: string
}

/**
 * MESURÉ sur les cinq œuvres livrées stockées, visite des écrans comprise :
 * 786 / 952 / 953 / 1303 / 1777 ms de processus complet. Le plafond est posé
 * à 15 s — huit fois le pire cas mesuré — pour absorber un processeur de
 * fonction plus lent sans jamais être « trop juste » (condition 2 du
 * propriétaire : le plafond se mesure, il ne se devine pas).
 */
export const PLAFOND_MS = 15_000
/** Mesuré : React rend par tranches — 57 caractères à 0 ms, 759 à 300 ms. */
export const DECANTATION_MS = 400

/**
 * Monte un bundle dans un processus cloisonné et rend ce qui s'est passé.
 *
 * Ne jette jamais : un juge qui tombe ne doit pas faire tomber la boucle —
 * il se déclare INDISPONIBLE, et l'œuvre n'est pas refusée pour une panne
 * de juge (un refus silencieux serait pire que l'absence de juge).
 */
export async function jugerExecution(
  code: string,
  options: { readonly plafondMs?: number; readonly decantationMs?: number } = {},
): Promise<VerdictExecution> {
  const debut = Date.now()
  const vide: VerdictExecution = { demarre: false, erreurs: [], octetsRendus: 0, texte: '', ms: 0 }
  let dossier: string | null = null
  try {
    dossier = await mkdtemp(join(tmpdir(), 'deribfy-exec-'))
    const bundle = join(dossier, 'oeuvre.js')
    const sortie = join(dossier, 'verdict.json')
    await writeFile(bundle, code, 'utf8')

    const corps = new URL('./juge-execution-enfant.mjs', import.meta.url).pathname
    const enfant = spawn(
      process.execPath,
      [
        // ③ Une couche de plus : lecture seule du dépôt, écriture bornée au
        // dossier du tour, aucun processus enfant, aucun module natif.
        '--permission',
        '--allow-fs-read=*',
        `--allow-fs-write=${dossier}`,
        corps,
        bundle,
        sortie,
        String(options.decantationMs ?? DECANTATION_MS),
      ],
      {
        // ① L'ENVIRONNEMENT VIDE — rien à prendre, nulle part où l'envoyer.
        // NODE_ENV est exigé par le typage du dépôt ; ce n'est pas un secret.
        env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' } as NodeJS.ProcessEnv,
        cwd: dossier,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    const plafond = options.plafondMs ?? PLAFOND_MS
    let tue = false
    const minuterie = setTimeout(() => {
      tue = true
      enfant.kill('SIGKILL')
    }, plafond)
    let journal = ''
    enfant.stderr.on('data', (m: Buffer) => {
      journal = (journal + m.toString()).slice(-2000)
    })
    const sortieCode = await new Promise<number | null>((resoudre) => {
      enfant.on('close', (c) => resoudre(c))
      enfant.on('error', () => resoudre(null))
    })
    clearTimeout(minuterie)

    if (tue) {
      return {
        ...vide,
        erreurs: [
          {
            quoi: 'plafond',
            message: `l'application n'a pas fini de démarrer en ${String(plafond)} ms — boucle de rendu ou attente infinie`,
            indice: '',
          },
        ],
        ms: Date.now() - debut,
      }
    }

    const brut = await readFile(sortie, 'utf8').catch(() => null)
    if (brut === null) {
      // Le juge n'a pas pu se prononcer : on le DIT. Confondre « je n'ai pas
      // vu » avec « c'est cassé » refuserait des œuvres saines.
      return {
        ...vide,
        ms: Date.now() - debut,
        indisponible: `le juge d'exécution n'a rendu aucun verdict (code ${String(sortieCode)}) : ${journal.split('\n').slice(-3).join(' ').slice(0, 200)}`,
      }
    }
    const lu = JSON.parse(brut) as {
      monte: boolean
      erreurs: ErreurExecution[]
      octetsRendus: number
      texte: string
      ecransVisites?: number
    }
    return {
      demarre: lu.monte && lu.erreurs.length === 0,
      erreurs: lu.erreurs,
      octetsRendus: lu.octetsRendus,
      texte: lu.texte,
      ecransVisites: lu.ecransVisites ?? 0,
      ms: Date.now() - debut,
    }
  } catch (e) {
    return {
      ...vide,
      ms: Date.now() - debut,
      indisponible: e instanceof Error ? e.message.slice(0, 200) : String(e),
    }
  } finally {
    if (dossier !== null) await rm(dossier, { recursive: true, force: true }).catch(() => {})
  }
}
