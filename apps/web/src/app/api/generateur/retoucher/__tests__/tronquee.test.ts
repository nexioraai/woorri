/**
 * EP-343 · UNE RETOUCHE COUPÉE NE S'ÉCRIT PAS PAR-DESSUS LA BONNE.
 *
 * ── UNE PANNE VIVANTE, TROUVÉE EN PRÉPARANT M4 (2026-11-04).
 *
 * `grep stop_reason` sur `retoucher/route.ts` : AUCUNE OCCURRENCE.
 *
 * La boucle de génération fait voyager la troncature depuis le
 * 2026-10-18 — elle redemande alors une version plus compacte, parce que
 * « corrige » n'a aucun sens pour un texte coupé. Cette route-ci
 * l'ignorait entièrement.
 *
 * CE QUI SE PASSAIT ALORS, et personne ne l'aurait su : une réponse
 * tronquée ressemble à des fichiers valides jusqu'au dernier, qui
 * s'arrête au milieu d'une ligne. `lireFichiers` le rend sans broncher,
 * et la fusion l'écrit PAR-DESSUS LE BON. Le propriétaire ne l'aurait
 * découvert qu'en ouvrant son application.
 *
 * ── ET LE PLAFOND N'EST PAS LOINTAIN, IL EST DÉJÀ LÀ.
 *
 *   2,86 octets par jeton de sortie — médiane sur 17 générations réelles
 *   SORTIE_MAX_RETOUCHE = 16 000 jetons → ~45 800 octets restituables
 *   médiane d'une œuvre : 49 525 octets · la plus grosse : 74 143
 *
 * La médiane des œuvres dépasse déjà ce qu'une réponse peut porter. Si
 * personne ne l'a vu, c'est qu'une retouche cosmétique ne touche qu'un
 * ou deux fichiers.
 *
 * ── ON REFUSE, ON NE REJOUE PAS.
 *
 * La même demande sur la même application coupera au même endroit, et
 * aura coûté deux fois. Le refus dit ce que la personne peut faire :
 * découper sa demande.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'

const etat = { stop: 'end_turn' as string, texte: '' }

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * `postgrestProjectionFidelity` plafonne les harnais permissifs écrits à
 * la main, et ce nombre ne peut que BAISSER. Le mien l'a fait monter de
 * 40 à 41 : mesuré, et refusé par la gate. Le cliquet dit lui-même quoi
 * faire — un harnais NOUVEAU passe par le double du dépôt, qui honore la
 * projection et capture TOUT.
 *
 * C'est aussi ce qui rend l'assertion « rien n'a été écrit » crédible :
 * le journal du double capture les écritures de toutes les tables, pas
 * celles que j'aurais pensé à instrumenter.
 */
const journal: { postgrest: JournalPostgrest } = { postgrest: journalVierge() }
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge: vierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS, TABLE_VERSIONS } = await import('@/lib/apps/journal')
  const j = vierge()
  journal.postgrest = j
  const doc = {
    fichiers: { 'index.tsx': 'export const a = 1', 'b.tsx': 'export const b = 2' },
    schema: '-- rien',
    politiques: '',
  }
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { document: doc, nom: 'App' }, error: null } },
          [TABLE_VERSIONS]: { reponse: { data: [], error: null } },
        },
        j,
      ),
    },
  }
})

/**
 * LE JUGE D'EXÉCUTION EST MUET ICI, ET C'EST MESURÉ.
 *
 * ── CE QUE CE FICHIER MESURE, ET CE QU'IL NE MESURE PAS.
 *
 * Il mesure LA GARDE : une réponse coupée est refusée, une réponse
 * entière passe. Le démarrage de l'œuvre, lui, est éprouvé par EP-302 et
 * EP-346 — qui paient leurs processus.
 *
 * ── LE CHIFFRE, parce que le registre de marge ne sert pas à taire.
 *
 * `noter()` tourne DEUX fois — avant et après — et chaque passage monte
 * un processus. Mesuré sur ④, le seul cas qui atteigne le chemin
 * heureux :
 *
 *   juge réel : 2 356 ms en suite · 1 400 ms isolé  (×2,1 de marge)
 *   juge muet :                  42 ms isolé  (trois mesures : 42/42/41)
 *
 * « Le registre de marge sert à documenter un coût irréductible, pas à
 *   taire un coût qu'on n'a pas cherché. » Celui-ci était réductible :
 * deux processus qui n'éprouvent rien de ce qui est ici en jeu.
 */
vi.mock('@/lib/apps/juge-execution', async () => {
  const { jugeMuet } = await import('@/lib/apps/__tests__/juge-muet')
  return { jugerExecution: jugeMuet }
})

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: () => ({
        content: [{ type: 'text', text: etat.texte }],
        stop_reason: etat.stop,
        usage: { input_tokens: 20_000, output_tokens: 16_000 },
      }),
    }
  },
}))

const { POST } = await import('../route')

const appel = () =>
  new Request('https://x/api/generateur/retoucher?id=g1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demande: 'change le calcul du montant' }),
  })

/** Ce qu'une réponse coupée ressemble : du bon, puis une ligne en l'air. */
const COUPEE = [
  '=== index.tsx ===',
  'export const a = 1',
  '=== b.tsx ===',
  'export const b = 2 + ',
].join('\n')

describe('EP-343 · la retouche tronquée', () => {
  beforeEach(() => {
    for (const k of Object.keys(journal.postgrest.ecritures)) {
      journal.postgrest.ecritures[k] = []
    }
  })

  /** Toutes les écritures, toutes tables confondues. */
  const ecrites = (): unknown[] => Object.values(journal.postgrest.ecritures).flat()

  it('① UNE RÉPONSE COUPÉE EST REFUSÉE, ET RIEN N’EST ÉCRIT', async () => {
    etat.stop = 'max_tokens'
    etat.texte = COUPEE
    const r = await POST(appel())
    const d = (await r.json()) as { error?: string; tronquee?: boolean; coutUsd?: number }
    expect(r.status, 'une réponse coupée est livrée').toBe(409)
    expect(d.tronquee, 'la troncature n’est pas dite').toBe(true)
    // ── RIEN N'EST ÉCRIT : ni version, ni document.
    //
    // C'est LA propriété. Un refus qui écrirait quand même la version
    // laisserait un rang de plus pointant sur du code coupé.
    expect(ecrites(), `des écritures ont eu lieu : ${JSON.stringify(ecrites()).slice(0, 140)}`)
      .toEqual([])
  })

  it('② ET LE REFUS DIT CE QU’ON PEUT FAIRE, en français', async () => {
    etat.stop = 'max_tokens'
    etat.texte = COUPEE
    const d = (await (await POST(appel())).json()) as { error?: string }
    expect(d.error, 'le refus ne propose rien').toMatch(/Découpez-la en deux demandes/u)
    expect(d.error, 'le refus ne rassure pas sur l’état de l’application').toMatch(
      /n’a pas changé/u,
    )
    // AUCUN MOT BRUT : c'est la famille fermée le même jour.
    expect(d.error, 'un mot du fournisseur atteint l’écran').not.toMatch(/max_tokens|truncat/iu)
  })

  it('③ LE COÛT EST DIT QUAND MÊME — l’appel a été payé', async () => {
    // Un refus à coût nul laisserait croire que rien n'a été dépensé, et
    // le recoupement des factures ne retomberait jamais sur ses pieds.
    etat.stop = 'max_tokens'
    etat.texte = COUPEE
    const d = (await (await POST(appel())).json()) as { coutUsd?: number }
    expect(d.coutUsd, 'un appel payé est déclaré gratuit').toBeGreaterThan(0)
  })

  it('④ ET UNE RÉPONSE ENTIÈRE PASSE — la garde ne bloque pas le cas normal', async () => {
    etat.stop = 'end_turn'
    etat.texte = ['=== index.tsx ===', 'export const a = 42'].join('\n')
    const r = await POST(appel())
    const d = (await r.json()) as { tronquee?: boolean; error?: string }
    expect(d.tronquee, 'une réponse entière est prise pour une réponse coupée').toBeUndefined()
    expect(
      d.error === undefined || !/Découpez-la/u.test(d.error),
      `le cas normal est refusé : ${String(d.error)}`,
    ).toBe(true)
  })
})
