/**
 * EP-369 · LA GARDE DE LA LECTURE PUBLIQUE A UNE PORTE.
 *
 * ── UN MUR SANS PORTE, MESURÉ LE 2026-11-06.
 *
 * `/api/generateur/publier` refuse net (409) toute œuvre dont une table est
 * lisible sans compte, tant que l'appel ne porte pas
 * `lecturePubliqueAcceptee`. La garde est juste. Mais le drapeau n'était
 * envoyé par AUCUN écran : zéro occurrence hors de la route et de ses tests.
 *
 * Elle ne s'était jamais vue parce qu'aucune œuvre n'avait jamais de table
 * publique — ZÉRO SUR CINQUANTE-QUATRE. Le jour où la déclaration devient
 * exprimable (EP-368), publier échouerait sur un 409 que les trois écrans
 * affichent en cul-de-sac.
 *
 * C'est la forme la plus coûteuse de « module prouvé sans appelant » : une
 * garde dont la porte manque ne se découvre qu'au moment où la garde se met
 * enfin à servir.
 *
 * ── UNE RÉSERVE, ET ELLE COMPTE AUTANT QUE LE RESTE.
 *
 * On a cherché les AUTRES portes de cette forme — une garde dont la
 * condition d'entrée n'est fournie par aucun appelant. Le relevé du
 * 2026-11-06 rend ZÉRO : sur 108 routes, 68 champs sont lus d'une requête
 * près d'un refus, trois candidats sont sortis, et les trois ont été
 * réfutés à l'inspection (un paramètre à défaut, un filtre nullable, et une
 * COLONNE DE BASE que le motif avait prise pour un champ de requête).
 *
 * CE « ZÉRO » NE VEUT PAS DIRE ZÉRO, et il faut le lire comme ça :
 *
 *   · le balayage compare des NOMS, pas des chaînes d'appel réelles ;
 *   · 58 des 66 « clés émises » portent un nom SIMPLE (`nom`, `sous`,
 *     `rang`, `demande`…), qui apparaît côté client pour trente raisons
 *     sans rapport — donc 58 sur 66 ne sont pas prouvées ;
 *   · il ne produit donc pas de faux rouges, IL PRODUIT DES FAUX VERTS ;
 *   · et `lecturePubliqueAcceptee` n'a été visible que par la chance de son
 *     nom composé. S'il s'était appelé `accord`, ce relevé l'aurait manqué.
 *
 * Ce qui rendrait le chiffre sûr : suivre la vraie chaîne — quel `fetch`
 * appelle quelle route, avec quel corps — au lieu de comparer des noms. Le
 * résolveur d'imports d'EP-365 sait déjà faire cette traversée. ≈ 3 h,
 * arbitré « pas maintenant » le 2026-11-06, la loi passant devant.
 *
 * C'est donc une DETTE NOMMÉE, pas un calme. Qui lira « zéro » ici doit
 * lire aussi par quoi ce zéro a été mesuré.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  accordLecturePublique,
  estRefusLecturePublique,
  CORPS_ACCORD,
} from '../../../components/apps/accordLecturePublique'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')
const lire = (rel: string): string => lireSource(join(SRC, rel))

describe('EP-369 · la lecture publique passe devant quelqu’un', () => {
  it('① le refus de la lecture publique se distingue de tout autre refus', () => {
    expect(estRefusLecturePublique({ lecturePublique: true, tables: ['annonce'] })).toBe(true)
    // Un autre refus de la même route ne doit PAS déclencher la question :
    // elle demanderait un accord pour quelque chose qui n'est pas en jeu.
    expect(estRefusLecturePublique({ error: 'amnésique', amnesique: true } as never)).toBe(false)
    expect(estRefusLecturePublique({ lecturePublique: true, tables: [] })).toBe(false)
    expect(estRefusLecturePublique({ lecturePublique: 'oui', tables: ['x'] })).toBe(false)
  })

  it('② la question NOMME chaque table — un résumé ne laisse rien décider', () => {
    // « Une liste affichée à côté d'un bouton qu'on peut presser sans la lire
    // n'est pas une garde. »
    const vues: string[] = []
    const vrai = globalThis.window as unknown as { confirm: (m: string) => boolean } | undefined
    globalThis.window = {
      confirm: (m: string) => {
        vues.push(m)
        return false
      },
    } as never
    try {
      const ok = accordLecturePublique({ lecturePublique: true, tables: ['annonce', 'soumission'] })
      expect(ok, 'un refus doit rendre faux').toBe(false)
      expect(vues[0]).toContain('annonce')
      expect(vues[0], 'la seconde table est tue').toContain('soumission')
      expect(vues[0]).toMatch(motifTexte('sans compte'))
    } finally {
      globalThis.window = vrai as never
    }
  })

  it('③ un accord accepté rend vrai, et le corps porte le drapeau', () => {
    const vrai = globalThis.window as unknown as object | undefined
    globalThis.window = { confirm: () => true } as never
    try {
      expect(accordLecturePublique({ lecturePublique: true, tables: ['annonce'] })).toBe(true)
    } finally {
      globalThis.window = vrai as never
    }
    expect(JSON.parse(CORPS_ACCORD)).toEqual({ lecturePubliqueAcceptee: true })
  })

  it('④ LES TROIS ÉCRANS PASSENT PAR LA PORTE', () => {
    for (const f of [
      'components/onboarding/ConversationApplication.tsx',
      'app/atelier/[id]/page.tsx',
      'app/dashboard/page.tsx',
    ]) {
      expect(lire(f), `${f} ne demande pas l’accord`).toMatch(motifTexte('publierAvecAccord('))
    }
  })

  it('⑤ ET AUCUN AUTRE CHEMIN NE PUBLIE SANS ELLE', () => {
    // ── PAR QUEL AUTRE CHEMIN LE DÉFAUT POURRAIT-IL RENTRER ?
    //
    // Un quatrième écran qui appellerait la route directement contournerait
    // la question. On ferme par cliquet, pas par correction.
    //
    // ── ET MA PREMIÈRE FORME LISAIT UNE FORME, mesuré par une mutation.
    //
    // Elle cherchait `method: 'POST'`. En remplaçant l'appel du tableau de
    // bord, ④ a rougi et ⑤ est resté VERT : les options avaient disparu avec
    // l'appel. `method: "POST"` en guillemets doubles, un `method` tenu dans
    // une variable, des options construites ailleurs — toutes licites, toutes
    // invisibles.
    //
    // La propriété, elle, ne dépend d'aucune écriture : UN FICHIER QUI NOMME
    // CETTE ROUTE PASSE PAR LA PORTE. Le seul lecteur en GET vit dans un
    // fichier qui l'emploie déjà, donc zéro dérogation aujourd'hui — et une
    // dérogation future devrait s'écrire ici, à la vue de tous.
    const fautes: string[] = []
    const marcher = (d: string): void => {
      for (const n of readdirSync(d)) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) {
          // `tirs/` est exclu : un tir est un INSTRUMENT lancé à la main,
          // pas un chemin d'utilisateur — quatre y publient directement, et
          // c'est juste. CE QUE ÇA LAISSE, dit plutôt que caché : si un tir
          // publie un jour une œuvre à table publique, il recevra le 409 et
          // devra porter l'accord lui-même. Aucun utilisateur ne passe là.
          if (n !== 'node_modules' && n !== '__tests__' && n !== 'api' && n !== 'tirs') {
            marcher(p)
          }
          continue
        }
        if (!/\.tsx?$/u.test(n) || /\.test\.tsx?$/u.test(n)) continue
        // ── SANS LA PROSE, ET C'EST LA TROISIÈME FOIS AUJOURD'HUI.
        //
        // Mon premier balayage lisait le fichier BRUT. `IdentifiantsOeuvre`
        // nomme cette route dans son en-tête pour expliquer ce qu'elle rend —
        // il ne publie pas, et il était compté comme un contournement. C'est
        // exactement la faute que `lireSource` existe pour fermer, et je ne
        // m'en étais pas servi.
        const src = lireSource(p)
        if (!src.includes('generateur/publier')) continue
        if (!src.includes('publierAvecAccord')) {
          fautes.push(p.replace(SRC, '').replace(/^\//u, ''))
        }
      }
    }
    marcher(SRC)
    expect(
      fautes,
      'ce chemin publie sans poser la question de la lecture publique — ' +
        'employez `publierAvecAccord`',
    ).toEqual([])
  })

  it('⑥ et la route exige toujours l’accord — sinon la porte garde le vide', () => {
    // La leçon du relevé inerte : si la route cessait d'exiger le drapeau,
    // les cas ① à ⑤ resteraient verts en gardant plus rien.
    const route = lire('app/api/generateur/publier/route.ts')
    expect(route).toMatch(motifTexte('lecturePubliqueAcceptee === true'))
    expect(route).toMatch(motifTexte('publiques.length > 0 && !accord'))
  })
})
