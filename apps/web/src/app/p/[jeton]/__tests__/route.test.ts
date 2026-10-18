/**
 * EP-270 (suite) — LA PAGE PUBLIÉE EST SERVIE POUR DE VRAI, ET ON LA LIT.
 *
 * ── POURQUOI CE FICHIER, ALORS QUE LA POLITIQUE EST DÉJÀ TENUE AILLEURS.
 *
 * `ep270-publier.test.ts` vérifie la CONSTANTE `CSP_PAGE_PUBLIEE`. C'est la
 * forme faible, et EP-267 a déjà coûté la leçon : une constante juste qu'aucun
 * chemin n'applique protège exactement personne. Quelqu'un peut servir la page
 * sans jamais poser l'en-tête, et le contrôle de la constante reste vert.
 *
 * Ici on APPELLE la route — la seule route PUBLIQUE du générateur, donc la
 * plus exposée de tout le dépôt — et on lit les en-têtes qu'elle rend.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Qu'un navigateur applique la CSP comme écrit. Ça se vérifie dans un
 *    navigateur. Ici on prouve que l'en-tête PART.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * `postgrestProjectionFidelity` plafonne les harnais permissifs à 40 et ce
 * nombre ne peut que BAISSER. Un harnais écrit à la main ici l'aurait fait
 * monter — et il ne prouverait rien de la projection : la route ne demande
 * que `document`, et le double doit le faire respecter.
 */
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'

// LE NOM DE LA TABLE VIENT DE LA CONSTANTE, jamais écrit nu : deux cliquets
// du dépôt l'exigent, et ils ont raison — un nom recopié survit au jour où
// la vraie table change, et le test passerait au vert contre du vide.
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

const TABLE = TABLE_GENERATIONS
const journal = journalVierge()
let ligneEnBase: Record<string, unknown> | null = null
let lectures = 0

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) =>
      creerFrom(
        {
          [TABLE]: {
            reponse: () => {
              lectures += 1
              return { data: ligneEnBase, error: null }
            },
          },
        },
        journal,
      )(t),
  },
}))

const { migrateAirDocument } = await import('@deribfy/air-schema')
const AIR = migrateAirDocument(
  JSON.parse(
    (await import('node:fs')).readFileSync('../../slices/tontine/tontine.air.json', 'utf8'),
  ),
) as unknown

const JETON_VALIDE = 'abcdefghjkmnpqrstuvwxyz234567mn9'

const appel = async (jeton: string) => {
  const { GET } = await import('../route')
  return GET(new Request(`https://deribfy.test/p/${jeton}`), {
    params: Promise.resolve({ jeton }),
  })
}

beforeEach(() => {
  lectures = 0
})

describe('EP-270 · GET /p/[jeton] — la page publiée', () => {
  it('① LES EN-TÊTES DE BAC À SABLE PARTENT VRAIMENT avec la page', async () => {
    ligneEnBase = { document: AIR }
    const res = await appel(JETON_VALIDE)
    expect(res.status, 'un jeton valide ne sert aucune page').toBe(200)

    const csp = res.headers.get('Content-Security-Policy') ?? ''
    expect(csp, "la page est servie SANS bac à sable : elle tourne en même " +
      'origine que Deribfy et atteint la session').toContain('sandbox')
    expect(csp).toContain('allow-scripts')
    expect(
      csp,
      '`allow-same-origin` AVEC `allow-scripts` ouvre la session Deribfy à ' +
        'une page écrite par un modèle',
    ).not.toContain('allow-same-origin')
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("connect-src 'none'")
    expect(res.headers.get('X-Robots-Tag') ?? '', 'un lien donné finirait indexé').toContain(
      'noindex',
    )
    expect(res.headers.get('Cache-Control'), 'republier ne se verrait pas tout de suite').toBe(
      'no-store',
    )
    // Et c'est bien une page, pas un message.
    expect(await res.text()).toContain('<html')
  })

  it('② UN JETON MAL FORMÉ NE TOUCHE JAMAIS LA BASE', async () => {
    // Sans cette garde, chaque essai coûterait une requête : on offrirait un
    // moyen de marteler la base à quiconque connaît l'adresse.
    ligneEnBase = { document: AIR }
    for (const mauvais of ['court', 'A'.repeat(32), '0'.repeat(32), '']) {
      const res = await appel(mauvais)
      expect(res.status, `« ${mauvais} » a été servi`).toBe(404)
    }
    expect(lectures, 'un jeton mal formé a déclenché une lecture en base').toBe(0)
  })

  it('③ AUCUN ORACLE : mal formé et inconnu rendent EXACTEMENT la même chose', async () => {
    // Distinguer les deux dirait à qui essaie des jetons lesquels ont la
    // bonne forme — et un oracle divise le coût d'une recherche.
    const malForme = await appel('pas-un-jeton')
    ligneEnBase = null
    const inconnu = await appel(JETON_VALIDE)
    expect(inconnu.status).toBe(malForme.status)
    expect(await inconnu.text()).toBe(await malForme.text())
  })

  it('④ UN DOCUMENT ILLISIBLE NE FUIT NI TRACE NI NOM DE MODULE', async () => {
    ligneEnBase = { document: { pas: 'un air' } }
    const res = await appel(JETON_VALIDE)
    expect(res.status).toBe(404)
    const corps = await res.text()
    expect(corps, 'une trace de compilation est servie à un visiteur').not.toMatch(
      /at |\.ts:|node_modules|Error:/u,
    )
  })
})
