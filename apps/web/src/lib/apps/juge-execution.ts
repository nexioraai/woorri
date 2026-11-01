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
 * Mesuré EN PRODUCTION sur cinq œuvres réelles : 858 à 1850 ms. Le plafond
 * est posé à 15 s — 8,1 fois le pire cas réel. Un dépassement est un
 * VERDICT (l'œuvre boucle), pas une panne.
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

/** Re-exportee : la phrase vit dans un module PUR (voir portee-epreuve.ts).
 *  Le juge importe `node:child_process` — un composant client ne peut pas le
 *  charger, et l'import a tue un build le 2026-11-01. */
export { proportionEprouvee } from './portee-epreuve'

export type VerdictExecution = {
  /**
   * MONTE DANS UN SIMULATEUR — ET RIEN DE PLUS (2026-11-01).
   *
   * Ce juge monte l'œuvre dans happy-dom, pas dans un navigateur. MESURE
   * QUI L'A PROUVÉ : l'œuvre 950e1b9e rend `demarre = true, 0 erreur` ici,
   * et affiche un écran d'erreur dans le Safari du propriétaire. Le juge a
   * donc laissé LIVRER DU CASSÉ en annonçant que ça démarrait.
   *
   * Le nom dit désormais ce qu'il mesure. Tant qu'un vrai navigateur n'est
   * pas dans la chaîne, aucune surface — diagnostics, écran, sonde,
   * registre — ne doit écrire « démarre » ni « vérifié » tout court.
   */
  readonly monteDansSimulateur: boolean
  readonly erreurs: readonly ErreurExecution[]
  readonly octetsRendus: number
  readonly texte: string
  /** Combien de contrôles ont été ouverts et jugés. */
  readonly ecransVisites?: number
  /**
   * Combien ont été DÉCOUVERTS. Visités < découverts signifie que l'œuvre
   * n'a été éprouvée QUE PARTIELLEMENT — et ça se dit, toujours : un juge
   * qui s'arrête sans l'annoncer est un juge qui ment par omission.
   */
  readonly ecransDecouverts?: number
  /** Combien d ECRANS distincts ont ete atteints — la profondeur du parcours. */
  readonly ecransDistincts?: number
  /**
   * Les contrôles SANS NOM LISIBLE — ni texte, ni aria-label, ni title.
   * Rendu, lié, et pourtant inutilisable : on ne sait pas ce qu'il fait.
   */
  readonly controlesMuets?: readonly { readonly balise: string; readonly extrait: string }[]
  /**
   * LES ÉCRANS RÉELLEMENT OUVERTS, avec leur texte et s'ils ont été
   * EXERCÉS. C'est la matière qui manquait au juge de couverture : une
   * mention dans le code n'est pas une couverture — il faut qu'un écran
   * portant l'exigence ait été ATTEINT et qu'un de ses contrôles ait servi.
   */
  readonly ecrans?: readonly { readonly texte: string; readonly exerce: boolean }[]
  readonly ms: number
  /** Dit quand le juge n'a pas pu se prononcer — jamais confondu avec un refus. */
  readonly indisponible?: string
}

/**
 * LE PLAFOND VIENT DE LA LAMBDA, PAS D'UNE MACHINE DE DÉVELOPPEMENT.
 *
 * Première version : 786–1777 ms mesurés en local. Le propriétaire l'a
 * refusée, et il avait raison deux fois — ces chiffres avaient été pris
 * pendant qu'une gate tournait (règle 8 : nulle), et surtout le juge ne
 * tourne PAS sur cette machine. Ils ne valaient que comme plancher de
 * vraisemblance.
 *
 * MESURÉ EN PRODUCTION le 2026-10-31, cinq œuvres réelles montées par la
 * sonde dans la fonction elle-même (`?oeuvres=6`) :
 *
 *     88c94164   519 787 o →  858 ms   (échoue tôt : elle ne démarre pas)
 *     cbf1cb34   543 276 o → 1035 ms
 *     4a6e160d   560 508 o → 1057 ms   ← la plus GROSSE
 *     eb7b62b5   531 630 o → 1345 ms
 *     7be93be8   557 420 o → 1850 ms   ← PIRE CAS RÉEL
 *
 * Enseignement au passage : la taille ne commande pas le temps. La plus
 * grosse œuvre est à 1057 ms, la plus lente à 1850 ms — c'est le nombre
 * d'écrans visités qui pèse, pas les octets.
 *
 * ── POURQUOI 15 s ET NON UN PLAFOND SERRÉ : L'ASYMÉTRIE DES ERREURS.
 *
 * Le propriétaire craignait qu'un plafond trop généreux « laisse passer
 * demain ce qu'il devait attraper ». Mesure et raisonnement disent le
 * contraire ici, et c'est dit plutôt que tu : une BOUCLE NE FINIT JAMAIS,
 * donc n'importe quel plafond l'attrape — le plafond ne décide pas SI on la
 * voit, seulement QUAND. Les deux erreurs ne coûtent pas la même chose :
 *
 *   · trop SERRÉ : une œuvre saine mais lente reçoit le verdict « boucle »,
 *     est refusée, et le modèle repart pour un tour — de l'argent réel
 *     dépensé sur un faux défaut, et un propriétaire qui voit un échec
 *     inventé ;
 *   · trop LARGE : une œuvre qui boucle est détectée 13 secondes plus tard.
 *     Aucune dépense, aucun faux verdict.
 *
 * 15 s = 8,1 fois le pire cas RÉEL. La marge absorbe un démarrage à froid
 * que ces mesures ne distinguent pas (elles sont probablement tièdes), et
 * la route elle-même tolère 900 s.
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
  const vide: VerdictExecution = { monteDansSimulateur: false, erreurs: [], octetsRendus: 0, texte: '', ms: 0 }
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
      ecransDecouverts?: number
      ecransDistincts?: number
      controlesMuets?: { balise: string; extrait: string }[]
      ecrans?: { texte: string; exerce: boolean }[]
    }
    return {
      monteDansSimulateur: lu.monte && lu.erreurs.length === 0,
      erreurs: lu.erreurs,
      octetsRendus: lu.octetsRendus,
      texte: lu.texte,
      ecransVisites: lu.ecransVisites ?? 0,
      ecransDecouverts: lu.ecransDecouverts ?? 0,
      ecransDistincts: lu.ecransDistincts ?? 0,
      controlesMuets: lu.controlesMuets ?? [],
      ecrans: lu.ecrans ?? [],
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
