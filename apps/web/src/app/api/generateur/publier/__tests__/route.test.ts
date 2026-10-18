/**
 * EP-270 (suite) — LES ROUTES DE PUBLICATION SONT APPELÉES, PAS RELUES.
 *
 * ── POURQUOI CE FICHIER EXISTE SÉPARÉMENT DU CLIQUET DE LOGIQUE.
 *
 * EP-267 a coûté la leçon : trois contrôles lisaient des MENTIONS dans la
 * source, et remplacer le câblage par `[]` les laissait verts — l'import, lui,
 * restait. Un contrôle qui lit du texte ne mesure pas un comportement.
 *
 * Ici on APPELLE les deux poignées avec un double de Supabase, et on lit ce
 * qu'elles rendent. Trois propriétés valent d'être tenues ainsi :
 *
 *   ① republier rend LE MÊME lien et N'ÉCRIT PAS — la promesse déjà faite
 *     dans la note de livraison ;
 *   ② une ligne sans document ne se publie pas, et la phrase rendue est
 *     lisible par un humain, pas par Postgres ;
 *   ③ la restriction au propriétaire voyage DANS LE FILTRE, donc une ligne
 *     qui n'est pas la sienne n'est jamais lue — pas même pour être refusée.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * ── DEUX RAISONS, ET LA SECONDE EST UN CLIQUET.
 *
 * ① UN HARNAIS ÉCRIT À LA MAIN NE PROUVE RIEN. Le mien rendait sa ligne quel
 *    que soit le filtre posé : retirer `.eq('owner_id', …)` de la LECTURE
 *    laissait tout vert — mesuré. `creerFrom` donne les filtres déjà posés à
 *    la réponse, donc on peut refuser la ligne EXACTEMENT comme Postgres.
 *
 * ② `postgrestProjectionFidelity` PLAFONNE les harnais permissifs à 40, et
 *    le nombre ne peut que baisser. Mes deux doubles maison l'auraient fait
 *    monter. Le cliquet dit lui-même quoi faire : un harnais NOUVEAU passe
 *    par `lib/testing/postgrest`.
 */
import { creerFrom, journalVierge, type Filtre } from '@/lib/testing/postgrest'

// LE NOM DE LA TABLE VIENT DE LA CONSTANTE, jamais écrit nu : deux cliquets
// du dépôt l'exigent, et ils ont raison — un nom recopié survit au jour où
// la vraie table change, et le test passerait au vert contre du vide.
import { TABLE_GENERATIONS } from '@/lib/apps/journal'

const TABLE = TABLE_GENERATIONS
const journal = journalVierge()
let ligneEnBase: Record<string, unknown> | null = null

/** La ligne n'existe que pour son propriétaire — comme en base. */
const reponse = (filtres: Filtre[]) => ({
  data: filtres.some(([, col, val]) => col === 'owner_id' && val !== 'u-1') ? null : ligneEnBase,
  error: null,
})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (t: string) => creerFrom({ [TABLE]: { reponse } }, journal)(t) },
}))

/** Les filtres posés sur la table, dans l'ordre où ils l'ont été. */
const filtresPoses = (): Filtre[] => journal.filtres[TABLE] ?? []
/** Combien de fois cette colonne a été posée en filtre, tous appels confondus. */
const compte = (col: string): number => filtresPoses().filter(([, c]) => c === col).length

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1' }),
}))

// ── LE DOCUMENT EST MIGRÉ ICI, ET C'EST FIDÈLE À LA RÉALITÉ.
//
// La colonne `document` contient toujours un AIR À JOUR : le travailleur
// l'écrit après migration. Le fichier de tranche, lui, peut dater d'une
// version antérieure du schéma. Migrer dans le double reproduit donc l'état
// de la base — la route, elle, a raison de ne pas re-migrer (même forme que
// `apercu-live`, qui lit la même colonne).
const { migrateAirDocument } = await import('@deribfy/air-schema')
const AIR = migrateAirDocument(
  JSON.parse(
    (await import('node:fs')).readFileSync('../../slices/tontine/tontine.air.json', 'utf8'),
  ),
) as unknown

const requete = (id: string) =>
  new Request(`https://deribfy.test/api/generateur/publier?id=${id}`, { method: 'POST' })

beforeEach(() => {
  journal.filtres[TABLE] = []
  journal.ecritures[TABLE] = []
  journal.projections = {}
})

describe('EP-270 · POST /api/generateur/publier', () => {
  it('① un premier appel écrit un jeton, le second NE RÉÉCRIT PAS et rend le même lien', async () => {
    const { POST } = await import('../route')

    ligneEnBase = { publication_jeton: null, document: AIR, statut: 'livree' }
    const premier = (await (await POST(requete('g1'))).json()) as {
      lien: string
      dejaPublie: boolean
    }
    expect(premier.dejaPublie, 'un premier geste est annoncé comme déjà fait').toBe(false)
    expect(premier.lien, "le lien n'est pas servi sous /p/").toMatch(
      /^https:\/\/deribfy\.test\/p\/[a-z2-9]{32}$/u,
    )
    const ecrites = journal.ecritures[TABLE] ?? []
    expect(ecrites.length, 'rien n’a été écrit en base').toBe(1)
    const jetonEcrit = (ecrites[0] as { charge: { publication_jeton?: string } }).charge
      .publication_jeton
    expect(premier.lien.endsWith(String(jetonEcrit)), 'le lien rendu n’est pas le jeton écrit').toBe(
      true,
    )

    // ── LE SECOND APPEL. La ligne porte maintenant son jeton.
    journal.ecritures[TABLE] = []
    ligneEnBase = { publication_jeton: jetonEcrit, document: AIR, statut: 'livree' }
    const second = (await (await POST(requete('g1'))).json()) as {
      lien: string
      dejaPublie: boolean
    }
    expect(second.lien, 'REPUBLIER A CHANGÉ L’ADRESSE : tout lien déjà envoyé meurt').toBe(
      premier.lien,
    )
    expect(second.dejaPublie).toBe(true)
    expect(
      (journal.ecritures[TABLE] ?? []).length,
      'republier réécrit la base alors que rien ne change',
    ).toBe(0)
  })

  it('② sans document, on refuse — et la phrase est lisible par un humain', async () => {
    const { POST } = await import('../route')
    ligneEnBase = { publication_jeton: null, document: null, statut: 'en_cours' }
    const res = await POST(requete('g1'))
    expect(res.status, 'une génération sans application se publie').toBe(409)
    const d = (await res.json()) as { error: string }
    expect(d.error, 'on sert un message de Postgres à un humain').not.toMatch(
      /constraint|violates|null value/iu,
    )
    expect(d.error).toContain('Attendez la fin')
    expect((journal.ecritures[TABLE] ?? []).length, 'on a écrit malgré le refus').toBe(0)
  })

  it('③ LA RESTRICTION VOYAGE DANS LE FILTRE, pas dans un test après coup', async () => {
    const { POST } = await import('../route')
    ligneEnBase = { publication_jeton: null, document: AIR, statut: 'livree' }
    await POST(requete('g1'))
    // ── L'INVARIANT EST GÉNÉRIQUE, ET C'EST CE QUI LE REND SOLIDE.
    //
    // « Toute requête qui vise une ligne par son `id` la vise AUSSI par son
    // propriétaire. » Le POST en fait deux — une lecture, une écriture — et
    // retirer le filtre de L'UNE OU L'AUTRE déséquilibre le compte.
    //
    // CE CONTRÔLE A DÉJÀ SURVÉCU À SA MUTATION sous une autre forme : il
    // rangeait les filtres dans un seul sac, et l'écriture reposait
    // `owner_id` à la place de la lecture. Compter les deux ferme ce trou.
    expect(compte('id'), 'la requête ne vise aucune ligne précise').toBe(2)
    expect(
      compte('owner_id'),
      "une requête vise une ligne par son id SANS filtrer le propriétaire : " +
        "la ligne d'autrui sort de la base, et une lecture est déjà une fuite",
    ).toBe(compte('id'))
  })
})

describe('EP-270 · GET /api/generateur/publier — ce que les magasins exigent', () => {
  it('④ les exigences viennent du projet COMPILÉ, et elles arrivent jusqu’à la réponse', async () => {
    const { GET } = await import('../route')
    ligneEnBase = { document: AIR }
    const res = await GET(
      new Request('https://deribfy.test/api/generateur/publier?id=g1'),
    )
    expect(res.status).toBe(200)
    const d = (await res.json()) as {
      exigences: { quoi: string; qui: string }[]
      manquantsMoteur: number
      manquantsProprietaire: number
    }
    // ── CE QUI EST MESURÉ LE 2026-10-18 SUR LA VRAIE TRANCHE.
    //
    // Le moteur porte le nom, la version et les deux identifiants ; il ne
    // porte NI icône NI identité propre au client. Si l'un de ces deux
    // manques se ferme, ce nombre DESCEND — il ne peut pas monter sans qu'on
    // ait cassé quelque chose.
    expect(d.manquantsMoteur, 'le compte des blocages moteur a changé').toBeLessThanOrEqual(2)
    expect(d.manquantsProprietaire, 'une exigence du propriétaire a disparu').toBe(4)
    expect(d.exigences.some((x) => x.quoi.includes('icône') && x.qui === 'moteur')).toBe(true)
    expect(d.exigences.some((x) => x.quoi.includes('Google Play') && x.qui === 'proprietaire')).toBe(
      true,
    )
  })

  it('⑥ LE GET GARDE LA PORTE AUSSI — mesuré après une mutation survivante', async () => {
    // ── CE CONTRÔLE N'EXISTAIT PAS, ET LA MUTATION L'A MONTRÉ.
    //
    // Retirer `.eq('owner_id', …)` de la lecture du GET laissait les cinq
    // contrôles verts : ils ne regardaient que le POST. Or le GET lit le
    // MÊME document — il compile le projet de quelqu'un pour en tirer les
    // exigences. Sans filtre, il décrirait l'application d'autrui.
    const { GET } = await import('../route')
    ligneEnBase = { document: AIR }
    await GET(new Request('https://deribfy.test/api/generateur/publier?id=g1'))
    expect(compte('id'), 'le GET ne vise aucune ligne précise').toBe(1)
    expect(
      compte('owner_id'),
      'le GET ne filtre pas sur le propriétaire : il décrirait le projet d’autrui',
    ).toBe(1)
  })

  it('⑤ sans document, le panneau se tait au lieu de deviner', async () => {
    const { GET } = await import('../route')
    ligneEnBase = { document: null }
    const res = await GET(new Request('https://deribfy.test/api/generateur/publier?id=g1'))
    expect(res.status, 'on rend des exigences pour une application qui n’existe pas').toBe(409)
  })
})
