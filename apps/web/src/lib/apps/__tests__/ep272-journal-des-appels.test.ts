/**
 * EP-272 — CHAQUE ALLER-RETOUR AU MODÈLE EST MESURÉ.
 *
 * ── LE DÉFAUT, ET IL A COÛTÉ 57,36 $ SANS QU'ON SACHE POURQUOI.
 *
 * Mesuré sur la base le 2026-10-18 : douze générations, 57,36 $, ZÉRO
 * application livrée. La pire — une demande d'UNE PHRASE, 25 jetons — a coûté
 * 23,46 $ et 101 minutes.
 *
 * On pouvait DÉDUIRE ~73 appels en divisant les jetons d'entrée par ce qu'un
 * appel coûte. Déduire n'est pas mesurer : on ignorait quelle partie échoue,
 * à quel barreau de l'escalier, et combien de temps chacune prend.
 *
 * Le moteur compte les JETONS de chaque appel depuis toujours. Il n'a jamais
 * compté le TEMPS.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Que l'enveloppe MESURE et N'ALTÈRE RIEN. Les deux comptent autant : un
 * instrument qui change ce qu'il observe est pire qu'une absence d'instrument.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Il ne prouve rien d'un vrai tir : aucun appel payant n'a été fait. Il
 *    prouve que l'enveloppe est fidèle et qu'elle écrit la bonne ligne.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const ecrites: Record<string, unknown>[] = []

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (v: Record<string, unknown>) => {
        ecrites.push(v)
        return { then: (f: () => void) => Promise.resolve(f()) }
      },
    }),
  },
}))

const { sdkJournalise, direQuelTirCommence } = await import('../journal-appels')

/** Un faux SDK : il rend ce qu'on lui dit, sans réseau et sans un centime. */
const fauxSdk = (reponse: unknown, retard = 0) =>
  class {
    messages = {
      create: async (): Promise<unknown> => {
        if (retard > 0) await new Promise((r) => setTimeout(r, retard))
        if (reponse instanceof Error) throw reponse
        return reponse
      },
    }
  } as never

const GRAMMAIRE = { type: 'object', properties: { a: { type: 'string'.repeat(400) } } }

const requete = (texte: string) => ({
  messages: [{ content: texte }],
  output_config: { format: { schema: GRAMMAIRE } },
})

beforeEach(() => {
  ecrites.length = 0
  direQuelTirCommence('gen-abcd1234')
})

describe('EP-272 · le journal des appels', () => {
  it('① UNE LIGNE PAR APPEL, avec le temps que le moteur ne comptait pas', async () => {
    const Sdk = sdkJournalise(fauxSdk({ usage: { input_tokens: 21000, output_tokens: 3200 } }, 30))
    const c = new Sdk({})
    await c.messages.create(requete('SECTIONS À ÉMETTRE MAINTENANT : entities.') as never)

    expect(ecrites.length, 'aucune ligne écrite : le journal ne mesure rien').toBe(1)
    const l = ecrites[0] as Record<string, unknown>
    expect(l.slug, 'la ligne ne se recoud pas au tir').toBe('gen-abcd1234')
    expect(l.partie, 'la partie n’est pas lue dans le texte envoyé').toBe('entities')
    expect(l.jetons_entree).toBe(21000)
    expect(l.jetons_sortie).toBe(3200)
    expect(l.issue).toBe('ok')
    // LE TEMPS — c'est la seule chose que le moteur ne savait pas compter.
    expect(Number(l.ms), 'le temps n’est pas mesuré').toBeGreaterThanOrEqual(25)
    // LE POIDS DE LA GRAMMAIRE nomme le barreau de l'escalier.
    expect(Number(l.grammaire_ko), 'la grammaire n’est pas pesée').toBeGreaterThan(0)
  })

  it('② LA SONDE SE RECONNAÎT — c’est elle qui fait les 22 allers-retours', async () => {
    const Sdk = sdkJournalise(fauxSdk({ usage: { input_tokens: 5, output_tokens: 1 } }))
    const c = new Sdk({})
    await c.messages.create(requete('x') as never)
    expect(
      (ecrites[0] as Record<string, unknown>).partie,
      'la sonde est comptée comme une émission : on ne saura pas séparer les 22 ' +
        'allers-retours de grammaire du travail réel',
    ).toBe('sonde')
  })

  it('③ UNE RÉPONSE TRONQUÉE EST NOMMÉE — elle est facturée et jetée', async () => {
    const Sdk = sdkJournalise(
      fauxSdk({ usage: { input_tokens: 20000, output_tokens: 128000 }, stop_reason: 'max_tokens' }),
    )
    const c = new Sdk({})
    await c.messages.create(requete('SECTIONS À ÉMETTRE MAINTENANT : screens.') as never)
    const l = ecrites[0] as Record<string, unknown>
    expect(l.issue, 'une troncature passe pour un succès').toBe('tronquee')
    expect(l.jetons_sortie, 'les jetons payés puis jetés ne sont pas comptés').toBe(128000)
  })

  it('④ UN REFUS DE GRAMMAIRE EST ENREGISTRÉ, et l’erreur CONTINUE sa route', async () => {
    const erreur = Object.assign(new Error('grammaire refusée'), { status: 400 })
    const Sdk = sdkJournalise(fauxSdk(erreur))
    const c = new Sdk({})
    await expect(
      c.messages.create(requete('SECTIONS À ÉMETTRE MAINTENANT : entities.') as never),
    ).rejects.toThrow('grammaire refusée')
    expect(ecrites.length, 'un aller-retour refusé n’est pas compté : il a pourtant eu lieu').toBe(1)
    expect((ecrites[0] as Record<string, unknown>).issue).toBe('http_400')
  })

  it('⑤ L’INSTRUMENT N’ALTÈRE RIEN — ni la réponse, ni les arguments', async () => {
    // Un instrument qui change ce qu'il observe est pire que pas d'instrument.
    const attendue = { usage: { input_tokens: 1, output_tokens: 2 }, content: [{ text: 'salut' }] }
    let vus: unknown = null
    const Base = class {
      messages = {
        create: async (...a: unknown[]): Promise<unknown> => {
          vus = a
          return attendue
        },
      }
    } as never
    const c = new (sdkJournalise(Base))({})
    const r = await c.messages.create(requete('SECTIONS À ÉMETTRE MAINTENANT : app.') as never)
    expect(r, 'la réponse a été modifiée en chemin').toBe(attendue)
    expect(Array.isArray(vus) && (vus as unknown[]).length, 'les arguments ont été altérés').toBe(1)
  })

  it('⑥ HORS TRANCHE, AUCUNE LIGNE N’EST ATTRIBUÉE À TORT', async () => {
    // Le processus serverless est REUTILISÉ : sans remise à zéro, les appels
    // d'une autre génération porteraient le slug de la précédente.
    direQuelTirCommence(null)
    const Sdk = sdkJournalise(fauxSdk({ usage: {} }))
    await new Sdk({}).messages.create(requete('x') as never)
    expect(
      (ecrites[0] as Record<string, unknown>).slug,
      'un appel hors tranche est attribué à la génération précédente',
    ).toBeNull()
  })
})
