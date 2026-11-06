/**
 * EP-366 · « JE N'AI RIEN MESURÉ » NE SE DIT PAS « 1,00 ».
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-06 SUR LE MODULE RÉEL.
 *
 * `jugerCouverture` rendait `taux: 1` quand aucune famille de son lexique
 * ne se trouvait dans la demande. Code livré = `<div>bonjour</div>` :
 *
 *   salon de coiffure        0 famille → 1,00
 *   site institutionnel CPA  0 famille → 1,00
 *   boutique simple          0 famille → 1,00
 *   carnet de notes          0 famille → 1,00
 *
 * Quatre demandes ordinaires sur quatre. Au seuil 1 au lieu de 3 : encore
 * zéro. Les dix-neuf familles sont l'INDEX D'UN SEUL DOCUMENT — le cahier
 * fondateur (22 866 car.) en déclenche treize, une demande ordinaire
 * aucune. Ce cliquet ne corrige pas cette faiblesse-là (c'est ②β) ; il
 * interdit de la MAQUILLER en score parfait.
 *
 * ── ET LE SILENCE ÉTAIT PIRE QUE LE CHIFFRE.
 *
 * À l'écran, la ligne de couverture ne s'affichait que `si ex.length > 0`.
 * Sur ces quatre demandes elle disparaissait entièrement : la personne
 * lisait « Votre application est prête en 34 secondes », et rien. Un
 * silence, à l'endroit exact où quelqu'un décide de garder l'œuvre, se lit
 * comme « rien à signaler ».
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { jugerCouverture } from '../juge-couverture'
import { comparerJuges } from '../retouche'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')
/** `lireSource` veut un chemin absolu, et retire la prose (EP-347). */
const lire = (rel: string): string => lireSource(join(SRC, rel))

const CODE_MUET = new Map([['App.tsx', 'export default function App(){return <div>bonjour</div>}']])

/** Les quatre demandes qui rendaient 1,00. Elles restent dans le cliquet. */
const QUATRE: readonly (readonly [string, string])[] = [
  [
    'salon de coiffure',
    "Je veux un site pour mon salon de coiffure à Abidjan. Présenter les prestations, " +
      "les photos des coupes, les horaires d'ouverture et l'adresse. Un formulaire pour " +
      "que les clientes prennent rendez-vous par téléphone. Les prestations : coupe, " +
      'tresses, défrisage, soins. Les tarifs doivent être visibles.',
  ],
  [
    'site institutionnel CPA',
    "Site institutionnel de la Centrale de production agricole. Présenter la mission, " +
      "l'organigramme, les communiqués, les appels d'offres, les rapports annuels " +
      'téléchargeables et les actualités de la filière. Les visiteurs consultent sans compte.',
  ],
  [
    'boutique simple',
    'Une boutique en ligne pour vendre mes pagnes. Les photos, le prix en FCFA, le panier, ' +
      'et le client me contacte sur WhatsApp pour finaliser.',
  ],
  [
    'carnet de notes',
    'Une application pour noter mes idées au quotidien, les classer par thème, et les ' +
      'retrouver par mot-clé.',
  ],
]

describe('EP-366 · une couverture non mesurée se dit', () => {
  it('① les quatre demandes rendent `null`, plus jamais 1', () => {
    for (const [nom, demande] of QUATRE) {
      const r = jugerCouverture(demande, CODE_MUET)
      expect(r.exigences.length, `${nom} : le lexique ne reconnaît rien`).toBe(0)
      expect(
        r.taux,
        `${nom} : rien n'a été mesuré, et ça ne se dit pas par un chiffre`,
      ).toBeNull()
    }
  })

  it('② une demande que le lexique RECONNAÎT rend toujours un chiffre', () => {
    // Sans ce cas, rendre `null` partout passerait ① et viderait le juge.
    const cahier = readFileSync(join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
    const r = jugerCouverture(cahier, CODE_MUET)
    expect(r.exigences.length).toBeGreaterThan(10)
    expect(r.taux).not.toBeNull()
    expect(r.taux).toBeLessThan(1)
  })

  it('③ personne ne remplace ce `null` par un chiffre', () => {
    // ── C'EST PAR LÀ QUE LE MENSONGE REVIENDRAIT.
    //
    // Un `?? 1` ou un `?? 0` quelque part sur ce champ, et le score parfait
    // renaît sans qu'aucun test ne bouge.
    for (const f of [
      'app/api/generateur/retoucher/route.ts',
      'app/api/generateur/direct/route.ts',
      'lib/apps/retouche.ts',
      'lib/apps/boucle-directe.ts',
      'components/onboarding/ConversationApplication.tsx',
      'app/atelier/[id]/page.tsx',
    ]) {
      const src = lire(f)
      for (const m of src.matchAll(/taux[^\n]{0,40}\?\?\s*([0-9])/gu)) {
        expect.fail(`${f} : « ${m[0]} » — un taux non mesuré ne se remplace pas par un chiffre`)
      }
    }
  })

  it('④ une dimension non comparable ne rend pas « pas de régression »', () => {
    const notes = [{ nom: 'jetons', defauts: 0 }]
    const v = comparerJuges(notes, notes, { avant: null, apres: null })
    expect(v.regressions).toEqual([])
    expect(v.couvertureEnBaisse, 'rien à comparer, donc aucune baisse').toBeNull()
    expect(v.couvertureNonMesuree, 'et ça se DIT, au lieu de se taire').toBe(true)
    // Et le cas sain reste sain.
    const sain = comparerJuges(notes, notes, { avant: 0.8, apres: 0.5 })
    expect(sain.couvertureNonMesuree).toBe(false)
    expect(sain.couvertureEnBaisse).toEqual({ avant: 0.8, apres: 0.5 })
  })

  it('⑤ l’écran de livraison porte l’aveu, et il est ATTEINT quand taux est null', () => {
    // ── LA LEÇON DES VINGT-SIX MODULES SANS APPELANT.
    //
    // Un aveu écrit dans une branche que rien n'atteint est une pièce
    // détachée. On vérifie donc la CONDITION, pas seulement la phrase.
    const src = lire('components/onboarding/ConversationApplication.tsx')
    expect(src).toMatch(motifTexte('d.couverture.taux === null'))
    expect(src).toMatch(motifTexte('Couverture du cahier : NON MESURÉE'))
    // Le champ doit voyager jusqu'à l'écran, sinon la condition est morte.
    expect(src).toMatch(motifTexte('taux?: number | null'))
    expect(lire('lib/apps/boucle-directe.ts')).toMatch(motifTexte('couverture,'))
  })

  it('⑥ le drapeau de retouche est LU par un écran, pas seulement rendu', () => {
    expect(lire('app/api/generateur/retoucher/route.ts')).toMatch(
      motifTexte('couvertureNonMesuree: verdict.couvertureNonMesuree'),
    )
    const ecran = lire('app/atelier/[id]/page.tsx')
    expect(ecran).toMatch(motifTexte('d.couvertureNonMesuree === true'))
    expect(ecran).toMatch(motifTexte('n’a pas pu être vérifiée sur cette demande'))
  })

  it('⑦ et l’enregistrement le consigne — un tir relu ne lira pas 1,00', () => {
    expect(lire('app/api/generateur/direct/route.ts')).toMatch(
      motifTexte('resultat.couverture.taux === null'),
    )
  })
})
