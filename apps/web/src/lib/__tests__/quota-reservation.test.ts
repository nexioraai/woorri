/**
 * QUOTA DES SITES — la réservation tient sous des requêtes simultanées
 * (2026-11-17, « répare l'ancien d'abord »).
 *
 * ① concurrence : 10 requêtes ensemble pour 3 places → exactement 3 passent.
 *    CONTRÔLE NÉGATIF DANS LE MÊME TEST : l'ancien algorithme (lire, puis
 *    écrire « lu + 1 » à la fin) sur la même base laisse passer les 10.
 * ② plein : refus, compteur inchangé.
 * ③ restitution : une place se rend, jamais sous 0.
 * ④ panne : on laisse passer comme avant, sans jamais lever.
 * ⑤ le port émet EXACTEMENT le compare-and-set attendu.
 * ⑥ la route réserve AVANT toute dépense et rend la place dans un `finally`.
 *
 * Ce que ce test NE PEUT PAS voir : la sémantique de verrou de Postgres
 * elle-même. Elle est modélisée ici (une valeur commitée, relue par la
 * clause WHERE) ; sa preuve sur un vrai Postgres 17 est rapportée dans
 * docs/elite-protocol/GENERATION_OUVERTE_ET_QUOTA.md §5.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { portProfiles, rendrePlace, reserverPlace, type PortCompteur } from '../quota/reservation'
import { creerFrom, journalVierge, type JournalPostgrest } from '@/lib/testing/postgrest'

/**
 * Le double FIDÈLE de `supabaseAdmin` (projection et filtres comme PostgREST),
 * enveloppé pour journaliser AUSSI les options d'`upsert` : `ignoreDuplicates`
 * est ce qui empêche de remettre une ligne existante à 0.
 */
function clientProfiles(lu: { generation_count: number | null }, journal: JournalPostgrest) {
  let apresUpdate = false
  const optionsUpsert: unknown[] = []
  const from = creerFrom({
    profiles: { reponse: () => ({ data: apresUpdate ? [{ generation_count: (lu.generation_count ?? 0) + 1 }] : lu, error: null }) },
  }, journal)
  const client = {
    from: (t: string) => {
      const b = from(t) as Record<string, (...a: unknown[]) => unknown>
      const upsert = b.upsert, update = b.update
      b.upsert = (charge: unknown, options: unknown) => { optionsUpsert.push(options); return upsert(charge) }
      b.update = (charge: unknown) => { apresUpdate = true; return update(charge) }
      return b
    },
  }
  return { client, optionsUpsert }
}

/** Une « base » en mémoire : chaque opération laisse la main, comme un aller-retour réseau. */
function base(initial: number | null = 0) {
  const lignes = new Map<string, number>()
  if (initial !== null) lignes.set('u', initial)
  const tour = () => new Promise<void>((r) => { setTimeout(r, Math.floor(Math.random() * 3)) })
  const port: PortCompteur = {
    async creerSiAbsente(id) { await tour(); if (!lignes.has(id)) lignes.set(id, 0); return {} },
    async lire(id) { await tour(); return { valeur: lignes.get(id) ?? null } },
    // UNE instruction : la comparaison et l'écriture ne se séparent pas.
    async remplacerSi(id, attendu, nouveau) {
      await tour()
      if (lignes.get(id) !== attendu) return { change: false }
      lignes.set(id, nouveau)
      return { change: true }
    },
  }
  /** L'ANCIEN code : lire au début, écrire « lu + 1 » à la fin. */
  const ancien = async (limite: number): Promise<boolean> => {
    const lu = (await port.lire('u')).valeur ?? 0
    if (lu >= limite) return false
    await tour() // … toute la génération se passe ici …
    lignes.set('u', lu + 1)
    return true
  }
  return { port, lignes, ancien }
}

describe('quota des sites · réservation atomique', () => {
  it('① 10 requêtes simultanées pour 3 places : exactement 3 passent (l’ancien code en laissait 10)', async () => {
    for (let tirage = 0; tirage < 20; tirage += 1) {
      const b = base(0)
      const r = await Promise.all(Array.from({ length: 10 }, () => reserverPlace(b.port, 'u', 3)))
      expect(r.filter((x) => x.ok && x.reservee).length).toBe(3)
      expect(r.filter((x) => !x.ok).length).toBe(7)
      expect(b.lignes.get('u')).toBe(3)
    }
    // CONTRÔLE NÉGATIF : la même rafale contre l'ancien algorithme.
    const b = base(0)
    const passes = (await Promise.all(Array.from({ length: 10 }, () => b.ancien(3)))).filter(Boolean).length
    expect(passes, 'l’ancien algorithme aurait dû laisser passer plus de 3 requêtes').toBeGreaterThan(3)
    expect(b.lignes.get('u'), 'et le compteur aurait dû rester sous le nombre de sites créés').toBeLessThan(passes)
  })

  it('② compteur plein : refus, et le compteur ne bouge pas', async () => {
    const b = base(3)
    expect(await reserverPlace(b.port, 'u', 3)).toEqual({ ok: false, utilisees: 3 })
    expect(b.lignes.get('u')).toBe(3)
  })

  it('② ligne absente : créée à 0, puis la première place est prise', async () => {
    const b = base(null)
    expect(await reserverPlace(b.port, 'u', 3)).toEqual({ ok: true, reservee: true, rang: 1 })
    expect(b.lignes.get('u')).toBe(1)
  })

  it('③ une place rendue redevient disponible ; jamais sous 0', async () => {
    const b = base(2)
    await reserverPlace(b.port, 'u', 3)
    expect(b.lignes.get('u')).toBe(3)
    expect(await rendrePlace(b.port, 'u')).toEqual({ rendue: true })
    expect(b.lignes.get('u')).toBe(2)
    const vide = base(0)
    expect(await rendrePlace(vide.port, 'u')).toEqual({ rendue: false })
    expect(vide.lignes.get('u')).toBe(0)
    // Réserver et rendre en même temps ne perd ni ne crée de place.
    const m = base(1)
    await Promise.all([reserverPlace(m.port, 'u', 3), rendrePlace(m.port, 'u'), reserverPlace(m.port, 'u', 3)])
    expect(m.lignes.get('u')).toBe(2)
  })

  it('④ panne de la table : on laisse passer comme avant, en le disant, sans lever', async () => {
    const enPanne: PortCompteur = {
      creerSiAbsente: async () => ({}),
      lire: async () => ({ valeur: null, erreur: 'connexion perdue' }),
      remplacerSi: async () => ({ change: false }),
    }
    const r = await reserverPlace(enPanne, 'u', 3)
    expect(r).toEqual({ ok: true, reservee: false, panne: 'lecture : connexion perdue' })
  })

  it('⑤ le port émet le compare-and-set exact (et ne remet jamais une ligne à 0)', async () => {
    const journal = journalVierge()
    const { client, optionsUpsert } = clientProfiles({ generation_count: 2 }, journal)
    expect(await reserverPlace(portProfiles(client), 'u-1', 3)).toEqual({ ok: true, reservee: true, rang: 3 })
    expect(journal.ecritures.profiles).toEqual([
      { op: 'upsert', charge: { id: 'u-1', generation_count: 0 } },
      { op: 'update', charge: { generation_count: 3 } },
    ])
    expect(optionsUpsert).toEqual([{ onConflict: 'id', ignoreDuplicates: true }])
    // La lecture, puis le CAS : l'id ET la valeur attendue sont des filtres posés.
    expect(journal.filtres.profiles).toEqual([['eq', 'id', 'u-1'], ['eq', 'id', 'u-1'], ['eq', 'generation_count', 2]])
    expect(journal.projections.profiles).toBe('generation_count')
  })

  it('⑤ generation_count NULL : panne (laisse passer), jamais un CAS qui tourne à vide', async () => {
    const journal = journalVierge()
    const { client } = clientProfiles({ generation_count: null }, journal)
    expect(await reserverPlace(portProfiles(client), 'u', 3)).toEqual({ ok: true, reservee: false, panne: 'lecture : generation_count NULL' })
    expect(journal.ecritures.profiles.map((e) => (e as { op: string }).op)).toEqual(['upsert'])
  })

  it('⑥ la route réserve AVANT toute dépense, consomme après l’insertion du site, rend dans un finally', () => {
    const route = readFileSync(join(__dirname, '../../app/api/chat/route.ts'), 'utf8')
    const traiter = route.slice(route.indexOf('async function traiter('), route.indexOf('export async function POST('))
    const reserve = traiter.indexOf('reserverPlace(portProfiles(supabaseAdmin), owner_id, FREE_LIMIT)')
    const premiereDepense = traiter.indexOf('.messages.create(')
    expect(reserve, 'la réservation a disparu').toBeGreaterThan(-1)
    expect(premiereDepense, 'aucun appel au modèle trouvé : le contrôle ne mesure rien').toBeGreaterThan(-1)
    expect(reserve, 'la place se réserve APRÈS une dépense').toBeLessThan(premiereDepense)
    // L'ancien incrément « lu + 1 » ne doit pas revenir.
    expect(traiter).not.toMatch(/generation_count:\s*usedGenerations\s*\+\s*1/u)
    // Consommée seulement une fois le site inséré sans erreur.
    expect(traiter.indexOf('placeARendre = null;')).toBeGreaterThan(traiter.indexOf("console.error('SUPABASE ERROR:'"))
    // Et rendue par le finally, quelle que soit la sortie.
    expect(traiter).toMatch(/\}\s*finally\s*\{\s*if\s*\(placeARendre !== null\)\s*\{\s*const rendue = await rendrePlace\(/u)
  })
})
