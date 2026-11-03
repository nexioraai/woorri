/**
 * EP-328 · « AUTORISÉ À L'IMPORT » ET « SERVABLE » SONT UNE SEULE QUESTION.
 *
 * ── CE QUE LA NUIT DU 2026-11-03 A APPRIS, DEUX FOIS, EN SENS INVERSE.
 *
 * · `@supabase/supabase-js` : EXIGÉ par la consigne, embarqué nulle part.
 *   Chaque œuvre à données aurait bouclé jusqu'à épuiser ses tours payants.
 * · les douze paquets natifs : OFFERTS par la consigne, inatteignables dans
 *   le bac à sable. Mesure par assemblage réel, une œuvre d'une ligne par
 *   paquet : 15 autorisés, 3 assemblables.
 *
 * Dans les deux cas, DEUX LISTES QU'ON CROYAIT ÊTRE UNE. La réponse n'est
 * pas de les tenir d'accord à la main — c'est ce qu'on croyait faire. C'est
 * d'en DÉRIVER une de l'autre, et d'ÉPROUVER la dérivation en assemblant.
 *
 * ── CE CLIQUET ASSEMBLE, IL NE COMPARE PAS DEUX TABLEAUX.
 *
 * Un `toEqual` entre deux listes aurait été vert le jour où supabase-js est
 * entré dans les deux sans être servable. Seul l'assemblage répond.
 */
import { describe, expect, it } from 'vitest'
import {
  importsInterdits,
  PAQUETS_AUTORISES,
  PAQUETS_PROPOSES,
  PAQUETS_SERVIS,
} from '../ecriture-directe'
import { CONSIGNE } from '../boucle-directe'
import { assembler } from '../bac-a-sable'

describe('EP-328 · servi et autorisé', () => {
  it('① TOUT CE QU’ON PROPOSE S’ASSEMBLE VRAIMENT', async () => {
    // LE CONTRÔLE QUI AURAIT ATTRAPÉ LES DEUX DÉFAUTS, et le seul.
    for (const p of PAQUETS_PROPOSES) {
      const v = await assembler(new Map([['index.tsx', `import * as m from '${p}'\nexport const x = m`]]))
      expect(
        v.ok,
        `« ${p} » est proposé au modèle et NE S’ASSEMBLE PAS : chaque œuvre ` +
          `qui l’emploie brûlerait ses trois tours. ${
            v.ok ? '' : 'erreur : ' + String('erreur' in v ? v.erreur : '').slice(0, 160)
          }`,
      ).toBe(true)
    }
    // ET LE DÉNOMINATEUR EST RÉEL : une liste vide passerait aussi.
    expect(PAQUETS_PROPOSES.length, 'plus rien n’est proposé au modèle').toBeGreaterThan(2)
  }, 120_000)

  it('② RIEN DE SERVABLE QUI NE SOIT ÉPINGLÉ PAR LE TRAIN', () => {
    // Le sens inverse n'est PAS une égalité : les douze paquets natifs sont
    // épinglés à juste titre (le train les construit pour les appareils) et
    // ne sont pas servables dans un bac à sable qui monte une page web.
    // C'est une différence VOULUE, et elle est dite ici plutôt que subie.
    //
    // ET LA PLOMBERIE EST EXEMPTE, pour une raison mesurée : `scheduler`
    // est épinglé TRANSITIVEMENT par `react-dom`, pas par le train. Ma
    // première forme de ce contrôle l'a signalé comme orphelin — la
    // prémisse était fausse, pas la liste. On compare donc ce qu'on OFFRE.
    const orphelins = PAQUETS_PROPOSES.filter((p) => !PAQUETS_AUTORISES.includes(p))
    expect(orphelins, 'un paquet est proposé sans être épinglé par le train').toEqual([])
    // La plomberie est NOMMÉE : un paquet qui y entrerait en douce — donc
    // servi, jamais offert, jamais épinglé — rougirait ici.
    expect(
      PAQUETS_SERVIS.filter((p) => !PAQUETS_PROPOSES.includes(p)),
      'la plomberie servie a changé sans être déclarée',
    ).toEqual(['scheduler'])
  })

  it('③ LA CONSIGNE N’OFFRE AUCUNE CIBLE QU’ELLE NE PEUT TENIR', () => {
    // ── MESURÉ : la consigne citait `expo`, `react-native`,
    //    `@expo/vector-icons`… Un modèle qui prend une icône d'Expo obéit à
    //    la consigne et fait échouer l'assemblage.
    expect(CONSIGNE, 'la consigne propose encore un paquet natif').not.toMatch(
      /expo|react-native|@react-navigation/u,
    )
    for (const p of PAQUETS_PROPOSES) {
      expect(CONSIGNE, `« ${p} » est servable et la consigne ne le nomme pas`).toContain(p)
    }
  })

  it('④ UN PAQUET NATIF EST REFUSÉ, UN SOUS-CHEMIN SERVABLE EST ACCEPTÉ', () => {
    expect(
      importsInterdits([{ chemin: 'a.tsx', contenu: "import x from '@expo/vector-icons'" }]),
      'un paquet inatteignable passe le contrôle d’avant-assemblage',
    ).toEqual(['@expo/vector-icons'])
    // `react-dom/client` et `react/jsx-runtime` sont servis sous leur
    // sous-chemin : les refuser casserait toute œuvre normale.
    expect(
      importsInterdits([
        { chemin: 'a.tsx', contenu: "import { createRoot } from 'react-dom/client'" },
        { chemin: 'b.tsx', contenu: "import { createClient } from '@supabase/supabase-js'" },
      ]),
      'un sous-chemin réellement servi est refusé',
    ).toEqual([])
  })

  it('⑤ LE REFUS DIT « MAUVAISE CIBLE », PAS « INTERDIT »', async () => {
    // ── ON MESURE LE MESSAGE QUI PART, pas le source qui le compose.
    //
    // « Interdit » invite à réessayer avec le paquet natif voisin — un tour
    // payé pour rien. « Celle-ci est une page web » ferme la famille.
    const nl = '\n'
    const vus: string[][] = []
    const appeler = async (m: readonly { role: string; content: string }[]) => {
      vus.push(m.map((x) => x.content))
      return {
        texte:
          vus.length === 1
            ? `=== index.tsx ===${nl}import Icon from '@expo/vector-icons'${nl}export function App() { return <Icon /> }`
            : `=== index.tsx ===${nl}export function App() { return <div onClick={() => alert('x')}>Bonjour</div> }`,
        tronquee: false,
      }
    }
    const { boucleEcriture } = await import('../boucle-directe')
    const { jugeMuet } = await import('./juge-muet')
    const r = await boucleEcriture({
      demande: 'une page de bienvenue',
      appeler: appeler as never,
      juger: jugeMuet,
    })
    expect(vus.length, 'le paquet natif n’a pas été renvoyé au modèle').toBe(2)
    const retour = vus[1]!.join(nl)
    expect(retour, 'le refus ne dit pas que c’est la mauvaise cible').toMatch(
      /faits pour une application NATIVE/u,
    )
    expect(retour, 'le refus ne dit pas ce qui reste possible').toContain('@supabase/supabase-js')
    expect(r.ok, 'l’œuvre corrigée est quand même refusée').toBe(true)
  }, 60_000)
})
