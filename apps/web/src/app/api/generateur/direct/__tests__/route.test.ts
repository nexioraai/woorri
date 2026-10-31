/**
 * EP-276 (suite) — LA ROUTE DE L'ÉCRITURE DIRECTE EST APPELÉE, PAS RELUE.
 *
 * EP-267 a coûté la leçon : un contrôle qui lit des MENTIONS dans la source
 * ne mesure pas un câblage. On appelle donc la poignée avec un faux modèle
 * et le double PostgREST du dépôt, et on lit ce qu'elle rend.
 *
 * ── LES TROIS PROPRIÉTÉS QUI COMPTENT ICI.
 *
 *   ① UNE SEULE PORTE : si l'interrupteur n'est pas sur `direct`, la route
 *      REFUSE. Sans ce refus, les deux architectures seraient joignables en
 *      même temps et on ne saurait plus laquelle a produit quoi.
 *   ② LA LIGNE EST ÉCRITE DANS LES DEUX CAS. Un échec non journalisé est un
 *      échec qu'on repaiera pour comprendre — défaut mesuré le 2026-10-10 :
 *      trois appels payants, une seule ligne en base.
 *   ③ LE MOTEUR EST ESTAMPILLÉ. Treize tirs ont déjà été dépensés sans
 *      pouvoir attribuer un résultat après coup.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// LE NOM DE LA TABLE VIENT DE LA CONSTANTE, jamais écrit nu : un cliquet du
// dépôt l'exige, et il a raison — un nom recopié survit au jour où la vraie
// table change, et le test passerait au vert contre du vide.
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

const { reponses, journal } = vi.hoisted(() => ({
  reponses: { texte: [] as string[], i: 0 },
  journal: { postgrest: null as unknown as { ecritures: Record<string, unknown[]> } },
}))

/** Les lignes réellement insérées, telles que le double les a vues. */
const lignesEcrites = (): Record<string, unknown>[] =>
  ((journal.postgrest?.ecritures[TABLE_GENERATIONS] ?? []) as { charge?: unknown }[]).map(
    (e) => (e.charge ?? {}) as Record<string, unknown>,
  )

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * `postgrestProjectionFidelity` plafonne les harnais permissifs, et ce
 * nombre ne peut que BAISSER. Mon premier double, écrit à la main, l'a fait
 * monter — mesuré. Le cliquet dit lui-même quoi faire : un harnais NOUVEAU
 * passe par le double du dépôt, qui honore la projection et capture tout.
 */
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const j = journalVierge()
  journal.postgrest = j
  return {
    supabaseAdmin: {
      from: creerFrom(
        { [TABLE_GENERATIONS]: { reponse: { data: { id: 'g-1' }, error: null } } },
        j,
      ),
    },
  }
})

/**
 * Un faux modèle : aucun réseau, aucun centime.
 *
 * IL N'EXPOSE QUE `stream`, PAS `create` — et c'est délibéré.
 *
 * DÉFAUT MESURÉ LE 2026-10-18, au premier essai du propriétaire : le SDK
 * REFUSE un appel non-streamé dès que `max_tokens` autorise une réponse
 * pouvant dépasser dix minutes. Ma route appelait `create`. Rien n'est parti,
 * rien n'a été facturé, et rien ne pouvait marcher.
 *
 * Un double qui offrirait AUSSI `create` laisserait la route y revenir sans
 * que personne le voie. Ici, y revenir fait rougir.
 */
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: () => ({
        finalMessage: () => ({
          content: [
            { type: 'text', text: reponses.texte[Math.min(reponses.i++, reponses.texte.length - 1)] ?? '' },
          ],
          usage: { input_tokens: 1200, output_tokens: 3400 },
        }),
      }),
    }
  },
}))

import { POST } from '../route'

const BON = [
  '=== index.tsx ===',
  "import { facture } from './calcul'",
  'export const total = facture(159)',
  '=== calcul.ts ===',
  'export const facture = (k: number) => Math.min(k,150)*85 + Math.max(0,k-150)*125 + 402',
].join('\n')

const appel = (demande = 'calcule ma facture SNE') =>
  new Request('https://deribfy.test/api/generateur/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
    body: JSON.stringify({ demande }),
  })

beforeEach(() => {
  reponses.texte = [BON]
  reponses.i = 0
  if (journal.postgrest !== null) journal.postgrest.ecritures[TABLE_GENERATIONS] = []
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
})

describe('EP-276 · la route de l’écriture directe', () => {
  it('① UNE SEULE PORTE — sur « air », cette route REFUSE', async () => {
    // ── EXIGENCE DU PROPRIÉTAIRE, 2026-10-18.
    //
    // « il faut que un soit accessible depuis interface le temps tester ce
    // qui est accessible l'autre ne doit pas etre accessible en meme temps ».
    //
    // ── CE QUI A CHANGÉ LE 2026-10-31, ET POURQUOI CE CONTRÔLE SUIT.
    //
    // La mission est intacte : une seule porte à la fois. Mais le fail-safe
    // a basculé (EP-305) : `air` est éteint depuis le 30, son dernier tir a
    // échoué, et toute la production sert `direct`. Une valeur fautive —
    // absente, vide, « DIRECT » — renvoyait la production vers le moteur
    // MORT ; elle sert désormais le vivant. Ce contrôle épingle donc ce
    // qu'il doit : seul `air` EXACT ferme cette porte, et une valeur
    // fautive ne la ferme plus. La symétrie, elle, est tenue par EP-306 ⑤,
    // qui exerce la porte d'en face.
    for (const v of ['air']) {
      process.env.GENERATEUR_MOTEUR = v
      const res = await POST(appel())
      expect(res.status, `« ${v} » laisse la porte ouverte`).toBe(409)
      expect(lignesEcrites().length, 'une ligne a été écrite alors que la route refuse').toBe(0)
    }
    // Et le fail-safe : une valeur fautive ne doit PAS fermer la porte du
    // moteur vivant — sinon une faute de casse chez l'hébergeur arrêterait
    // la production (mesuré : c'était le cas avant EP-305).
    for (const v of [undefined, '', 'DIRECT', 'dirct']) {
      if (v === undefined) delete process.env.GENERATEUR_MOTEUR
      else process.env.GENERATEUR_MOTEUR = v
      const res = await POST(appel())
      expect(res.status, `« ${String(v)} » ferme la porte du moteur vivant`).not.toBe(409)
    }
  })

  it('② UN SUCCÈS REND LA PAGE, ET ESTAMPILLE LE MOTEUR', async () => {
    const d = (await (await POST(appel())).json()) as {
      ok: boolean
      html: string
      fichiers: number
      coutUsd: number
    }
    expect(d.ok, 'la boucle n’aboutit pas').toBe(true)
    // 2 fichiers du modèle + 3 de la bibliothèque injectée (EP-299).
    expect(d.fichiers).toBe(5)
    expect(d.html, 'la page n’est pas montable').toContain('<div id="racine">')
    // LE COÛT EST RÉEL, pas inventé : 1200 entrée + 3400 sortie aux tarifs
    // du fournisseur. S'il tombait à zéro, personne ne verrait la dépense.
    expect(d.coutUsd).toBeCloseTo((1200 * 5 + 3400 * 25) / 1e6, 6)
    const l = lignesEcrites()[0] ?? {}
    expect(l.moteur, 'la ligne ne dit pas quel moteur l’a produite').toBe('direct')
    expect(l.statut).toBe('livree')
    expect(l.jetons_sortie).toBe(3400)
  })

  it('③ UN ÉCHEC EST JOURNALISÉ AUSSI — avec son motif et son coût', async () => {
    // ── DÉFAUT MESURÉ LE 2026-10-10 : trois appels payants, UNE SEULE ligne
    // en base, et le propriétaire incapable de savoir ce qu'il avait dépensé.
    reponses.texte = ['=== a.tsx ===\nconst x = {{{ ;']
    const d = (await (await POST(appel())).json()) as { ok: boolean; motif: string; tours: unknown[] }
    expect(d.ok).toBe(false)
    expect(d.motif).toContain('Non convergé')
    expect(d.tours.length, 'la borne de trois tours ne mord pas').toBe(3)
    const l = lignesEcrites()[0] ?? {}
    expect(lignesEcrites().length, 'un échec payé n’est pas journalisé').toBe(1)
    expect(l.statut).toBe('refusee')
    expect(l.moteur).toBe('direct')
    expect(Number(l.cout_usd), 'un échec payé est compté à zéro').toBeGreaterThan(0)
    expect(l.document, 'un échec ne doit pas prétendre porter une œuvre').toBeNull()
  })

  it('⑤ L’APPEL EST EN FLUX — sinon le SDK refuse avant même d’envoyer', async () => {
    // ── DÉFAUT MESURÉ SUR LE PREMIER ESSAI DU PROPRIÉTAIRE, 2026-10-18.
    //
    // « Streaming is required for operations that may take longer than 10
    // minutes. » Le SDK refuse côté client : rien ne part, rien n’est
    // facturé, et l’écran montre une erreur qui n’a aucun rapport avec
    // l’architecture qu’on met à l’épreuve.
    //
    // Le moteur AIR réglait déjà ce point de son côté. Cette route l’avait
    // ignoré. Ce contrôle lit la SOURCE parce que le défaut est dans le NOM
    // de la méthode appelée — le double ne peut que le refléter, pas le dire.
    // L'APPEL A DÉMÉNAGÉ dans `fournisseur.ts` quand DeepSeek est arrivé :
    // deux dialectes, un seul endroit qui les connaît. Le contrôle suit.
    const src = readFileSync(
      join(__dirname, '..', '..', '..', '..', '..', 'lib', 'apps', 'fournisseur.ts'),
      'utf8',
    )
    const code = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    expect(code, 'l’appel n’est pas en flux : le SDK refusera avant d’envoyer').toContain(
      'client.messages.stream(',
    )
    expect(code, 'un appel non streamé subsiste').not.toContain('client.messages.create(')
  })

  it('⑥ UN ÉCHEC GARDE TOUT CE QU’IL FAUT POUR LE COMPRENDRE', async () => {
    // ── DÉFAUT MESURÉ SUR LE PREMIER TIR DIRECT, 2026-10-18.
    //
    // 63 secondes, 4 centimes, « Non convergé en 3 tours » — et AUCUN moyen
    // de dire pourquoi. Ni l'erreur du compilateur, ni ce que le modèle avait
    // écrit. Un échec qu'on ne sait pas lire est un échec qu'on repaiera.
    //
    // Et l'écran, lui, avait affiché « Lecture impossible » : son repli quand
    // la réponse ne porte ni `error` ni `motif`.
    reponses.texte = ['=== a.tsx ===\nconst x = {{{ ;']
    const d = (await (await POST(appel())).json()) as {
      ok: boolean
      error?: string
      motif?: string
      tours?: { motif?: string }[]
    }
    expect(d.ok).toBe(false)
    // LES DEUX CHAMPS portent une phrase : quel que soit celui que l'écran
    // lit, il trouve quelque chose à dire.
    expect(d.error, 'l’écran retombera sur « Lecture impossible »').toContain('Non convergé')
    expect(d.motif).toBe(d.error)
    expect(d.error, 'la phrase ne dit pas ce qui a échoué').toContain('ne s’est pas assemblé'.replace('’', "'"))

    const l = lignesEcrites()[0] ?? {}
    const sa = l.sections_acquises as { tours?: unknown[]; dernierTexte?: string }
    expect(sa.tours?.length, 'les tours ne sont pas gardés').toBe(3)
    expect(
      sa.dernierTexte,
      'le brut du dernier essai est perdu : impossible de dire si le modèle ' +
        'écrit mal ou si le lecteur lit mal',
    ).toContain('{{{')
    // Chaque tour garde SON motif — sinon on sait qu'il a échoué trois fois,
    // pas pourquoi à chaque fois.
    expect((sa.tours as { motif?: string }[])[0]?.motif).toContain('construction a échoué')
  })

  it('④ UNE DEMANDE VIDE EST REFUSÉE AVANT TOUT APPEL', async () => {
    const res = await POST(appel('   '))
    expect(res.status).toBe(400)
    expect(lignesEcrites().length).toBe(0)
  })
})
