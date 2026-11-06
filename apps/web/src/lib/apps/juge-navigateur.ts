/**
 * NON BRANCHÉ DANS LA BOUCLE — et c'est voulu (EP-361).
 *
 * Un lancement coûte ~4,2 s, plus du double du plafond de marge de la
 * gate. Ce juge tourne dans une étape de CI dédiée
 * (`scripts/verifier-juge-navigateur.mjs`) et dans un tir à la main
 * (`src/tirs/juge-navigateur-vivant.tir.ts`). Il ne juge donc AUCUNE
 * génération au moment où elle se fait.
 */
/**
 * (c) · LE JUGE NAVIGATEUR — à côté du simulateur, jamais à sa place.
 *
 * ── DEUX INSTRUMENTS, DEUX RÔLES.
 *
 * Le simulateur est rapide et gratuit : il tourne à CHAQUE tour de la
 * boucle, et c'est lui qui dit si l'œuvre démarre. Le navigateur coûte
 * ~3 s et un processus : il tourne UNE FOIS, sur ce qui part.
 *
 * ── L'ANGLE MORT QU'IL FERME, MESURÉ.
 *
 *   le paquet embarqué : `navigator.locks.request(…)` ×3
 *   happy-dom          : `navigator.locks` ABSENT — ni succès ni échec
 *   WebKit, origine opaque : « undefined is not an object »
 *   et sur le réseau   : « Origin null is not allowed by
 *                          Access-Control-Allow-Origin »
 *
 * ── ET LE MOTEUR COMPTE.
 *
 * `request@[native code]` est une trame SAFARI, et nos utilisateurs
 * demandent des « applications mobiles ». Un juge Chromium aurait
 * reproduit, un cran plus haut, exactement le défaut qu'on ferme : un
 * juge qui n'exécute pas dans les conditions du produit. D'où WebKit
 * par défaut.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ErreurNavigateur = { readonly message: string; readonly pile: string }

export type VerdictNavigateur = {
  /**
   * LE JUGE A-T-IL PU TOURNER ?
   *
   * `false` n'est PAS « aucun défaut ». Un navigateur absent, un
   * démarrage raté : son silence se lirait comme un vert, et c'est
   * précisément la faute qu'il existe pour fermer.
   */
  readonly aTourne: boolean
  readonly motif: string | null
  readonly erreurs: readonly ErreurNavigateur[]
  /**
   * LES REQUÊTES QU'IL A VUES PARTIR.
   *
   * Aucune ne veut dire que seul le DÉMARRAGE a été exercé — le chemin
   * réseau, lui, n'a rien prouvé. Le taire serait un plafond silencieux
   * de plus.
   */
  readonly requetes: readonly string[]
}

const PLAFOND_MS = 45_000
const DECANTATION_MS = 6_000

export async function jugerNavigateur(
  code: string,
  options: { readonly moteur?: 'webkit' | 'chromium'; readonly decantationMs?: number } = {},
): Promise<VerdictNavigateur> {
  let dossier: string | null = null
  try {
    dossier = await mkdtemp(join(tmpdir(), 'deribfy-nav-'))
    const bundle = join(dossier, 'oeuvre.js')
    const sortie = join(dossier, 'verdict.json')
    await writeFile(bundle, code, 'utf8')

    const corps = new URL('./juge-navigateur-enfant.mjs', import.meta.url).pathname
    // ── PAS DE `--permission` ICI, ET C'EST UNE DIFFÉRENCE ASSUMÉE.
    //
    // Playwright lance un vrai navigateur : il lui faut un processus
    // enfant et des sockets. Le bac à sable du simulateur l'empêcherait.
    // L'isolation vient d'ailleurs — le bouchon ne laisse AUCUNE requête
    // atteindre un service réel.
    const enfant = spawn(
      process.execPath,
      [corps, bundle, sortie, String(options.decantationMs ?? DECANTATION_MS)],
      {
        env: {
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          HOME: process.env.HOME ?? '',
          NODE_ENV: 'production',
          JUGE_MOTEUR: options.moteur ?? 'webkit',
        } as NodeJS.ProcessEnv,
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    )
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
    if (tue) {
      return {
        aTourne: false,
        motif: `le navigateur a dépassé ${String(PLAFOND_MS)} ms`,
        erreurs: [],
        requetes: [],
      }
    }
    const brut = await readFile(sortie, 'utf8').catch(() => '')
    if (brut === '') {
      return { aTourne: false, motif: 'aucune sortie du juge', erreurs: [], requetes: [] }
    }
    const v = JSON.parse(brut) as Partial<VerdictNavigateur>
    return {
      aTourne: v.aTourne === true,
      motif: v.motif ?? null,
      erreurs: v.erreurs ?? [],
      requetes: v.requetes ?? [],
    }
  } catch (e) {
    return {
      aTourne: false,
      motif: `le juge n’a pas pu être lancé : ${e instanceof Error ? e.message : String(e)}`,
      erreurs: [],
      requetes: [],
    }
  } finally {
    if (dossier !== null) await rm(dossier, { recursive: true, force: true }).catch(() => undefined)
  }
}
