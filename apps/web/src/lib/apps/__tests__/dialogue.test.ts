/**
 * LE DIALOGUE — on demande ce que l'humain seul peut dire, et RIEN d'autre.
 *
 * Ces tests exercent la vraie `elicitation.mjs` du dépôt, jamais une imitation.
 * Un faux module rendrait ces assertions vertes alors même que la projection
 * réelle serait cassée — le dépôt a déjà payé pour cette leçon.
 */
import { describe, expect, it } from 'vitest'
import {
  fautesDeProduction,
  intentionDepuis,
  perimetre,
  premiereIntention,
  questionsPour,
  sterile,
  texteDe,
} from '../dialogue'

// Les deux seuls diagnostics classés « intention manquante » par EP-135.
const AMBIGU = { code: 'MODELE_TERME_AMBIGU', path: 'couverture.nonRetenus[0]', message: 'tontine' }
const COMMERCE = { code: 'MODELE_COMMERCE_ABSENT', path: 'commerce', message: 'un parcours paie' }
// Une faute de production : la machine a mal travaillé, pas l'humain.
const NOTRE_FAUTE = { code: 'MODELE_REFERENCE_INCONNUE', path: 'parcours[0]', message: 'ent_x' }

describe('les questions viennent des diagnostics, jamais d une invention', () => {
  it('un terme ambigu devient une question qui rend ses mots a l humain', async () => {
    const q = await questionsPour([AMBIGU])
    expect(q).toHaveLength(1)
    expect(q[0].code).toBe('MODELE_TERME_AMBIGU')
    // La formulation CITE le terme : c'est son propre texte, le lui rendre
    // l'aide à répondre. Elle ne contient ni code, ni chemin de document.
    expect(q[0].texte).toContain('tontine')
    expect(q[0].texte).not.toContain('MODELE_')
    expect(q[0].texte).not.toContain('couverture.nonRetenus')
    // Une question sans destination serait impossible à consommer.
    expect(q[0].destination).toBe('couverture.nonRetenus')
  })

  it('une faute de production ne devient JAMAIS une question', async () => {
    // C'est le point le plus important du fichier. EP-135 : faire porter une
    // erreur de machine à un humain est « le pire résultat possible ».
    expect(await questionsPour([NOTRE_FAUTE])).toEqual([])
    expect(await perimetre([NOTRE_FAUTE])).toEqual([])
    expect(await fautesDeProduction([NOTRE_FAUTE])).toHaveLength(1)
  })

  it('melange : seules les questions sortent, la faute reste chez nous', async () => {
    const tous = [AMBIGU, NOTRE_FAUTE, COMMERCE]
    const q = await questionsPour(tous)
    expect(q.map((x) => x.code).sort()).toEqual(['MODELE_COMMERCE_ABSENT', 'MODELE_TERME_AMBIGU'])
    expect((await fautesDeProduction(tous)).map((x) => x.code)).toEqual(['MODELE_REFERENCE_INCONNUE'])
  })

  it('la question du paiement ne nomme aucun pays ni aucun operateur', async () => {
    // Cliquet régional : le moteur ne connaît que la réponse structurelle.
    const q = await questionsPour([COMMERCE])
    const t = q[0].texte.toLowerCase()
    for (const interdit of ['tchad', 'france', 'orange', 'wave', 'mtn', 'xaf', 'eur']) {
      expect(t).not.toContain(interdit)
    }
  })
})

describe('l intention : un brief scelle, un addendum ordonne', () => {
  it('le brief ne se reecrit jamais, et les reponses s ajoutent apres', async () => {
    const i0 = await premiereIntention('je veux une tontine')
    expect(await texteDe(i0)).toBe('je veux une tontine')

    const avec = await intentionDepuis({
      brief: 'je veux une tontine',
      addendum: [{ code: 'MODELE_TERME_AMBIGU', question: 'Qu entendez-vous par tontine ?', reponse: 'une caisse tournante' }],
    })
    expect(avec).not.toBeNull()
    expect(avec!.brief).toBe('je veux une tontine')
    const texte = await texteDe(avec!)
    expect(texte.startsWith('je veux une tontine')).toBe(true)
    expect(texte).toContain('une caisse tournante')
  })

  it('un code hors de la table REFUSE l addendum en entier', async () => {
    // Le navigateur renvoie l'intention : sans ce refus, il pourrait injecter
    // un addendum arbitraire que P0 lirait comme une précision obtenue.
    expect(
      await intentionDepuis({
        brief: 'une tontine',
        addendum: [{ code: 'JE_LINVENTE', question: 'x', reponse: 'y' }],
      }),
    ).toBeNull()
    // Et une faute de production n'est pas davantage une question répondable.
    expect(
      await intentionDepuis({
        brief: 'une tontine',
        addendum: [{ code: 'MODELE_REFERENCE_INCONNUE', question: 'x', reponse: 'y' }],
      }),
    ).toBeNull()
  })

  it('le rang et la destination sont RECALCULES, jamais crus sur parole', async () => {
    const i = await intentionDepuis({
      brief: 'une tontine qui fait payer',
      addendum: [
        { rang: 99, code: 'MODELE_TERME_AMBIGU', destination: 'je-mens', question: 'q1', reponse: 'r1' },
        { rang: 99, code: 'MODELE_COMMERCE_ABSENT', destination: 'je-mens', question: 'q2', reponse: 'r2' },
      ],
    })
    expect(i!.addendum.map((e) => e.rang)).toEqual([0, 1])
    expect(i!.addendum.map((e) => e.destination)).toEqual(['couverture.nonRetenus', 'commerce'])
  })

  it('un brief vide ou absent ne fait pas une intention', async () => {
    expect(await intentionDepuis({ brief: '   ' })).toBeNull()
    expect(await intentionDepuis(null)).toBeNull()
    expect(await intentionDepuis({ addendum: [] })).toBeNull()
  })
})

describe('la sterilite ferme la boucle', () => {
  it('une reponse qui ne reduit pas le perimetre est sterile', async () => {
    const deux = ['MODELE_COMMERCE_ABSENT', 'MODELE_TERME_AMBIGU']
    expect(await sterile(deux, deux)).toBe(true)
    expect(await sterile(deux, ['MODELE_TERME_AMBIGU'])).toBe(false)
    // Un périmètre qui s'AGRANDIT est stérile aussi : la réponse a ouvert
    // plus qu'elle n'a fermé, et boucler coûterait un appel payant par tour.
    expect(await sterile(['MODELE_TERME_AMBIGU'], deux)).toBe(true)
  })
})
