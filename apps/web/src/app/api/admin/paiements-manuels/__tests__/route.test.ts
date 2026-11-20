/**
 * L'ACTIVATION À LA MAIN (étape ④ du quota, 2026-11-19).
 *
 * La règle vit en base (enregistrer_paiement, prouvée sur Postgres jetable) ;
 * ce fichier prouve ce que la ROUTE en fait :
 * ① réservée à l'administration, vérifiée par le serveur ;
 * ② prix en FCFA vide → refusé, RIEN n'est écrit (décision : le bouton refuse tant qu'il l'est) ;
 * ③ la référence est obligatoire ;
 * ④ un paiement passe par la fonction unique : source manuelle, FCFA, saisi par l'admin ;
 * ⑤ la même référence deux fois → refusée, et l'appli déjà activée est NOMMÉE ;
 * ⑥ un lot sans abonnement en cours → refusé avec sa raison ;
 * ⑦ la recherche rend l'appli, son propriétaire, sa formule et les réglages.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const etat = vi.hoisted(() => ({
  email: 'issayamiyoussouf@gmail.com' as string | null,
  prix: '' as string,
  rpc: { data: null as unknown, error: null as null | { message: string } },
  appels: [] as unknown[],
}))

vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  const from = creerFrom(
    {
      quota_reglages: { reponse: () => ({ data: [{ cle: 'prix_mensuel_xaf', valeur: etat.prix }, { cle: 'duree_jours', valeur: '30' }, { cle: 'lot_taille', valeur: '50' }], error: null }) },
      [TABLE_GENERATIONS]: { reponse: (f) => ({
        data: f.some(([op]) => op === 'ilike') ? [{ id: 'app-1', nom: 'Gestion de pharmacie', publication_slug: 'pharma', owner_id: 'u-1' }]
          : { id: f.find(([, c]) => c === 'id')?.[2] ?? 'app-1', owner_id: 'u-1', nom: 'Gestion de pharmacie', publication_slug: 'pharma' },
        error: null }) },
      app_compteurs: { reponse: { data: [{ app_id: 'app-1', statut: 'abonnee', paye_jusqu_au: '2026-12-31T23:59:59Z' }], error: null } },
    },
    journalVierge(),
  )
  return {
    supabaseAdmin: {
      from,
      auth: {
        getUser: async () => ({ data: { user: etat.email === null ? null : { email: etat.email } }, error: null }),
        admin: { listUsers: async () => ({ data: { users: [{ id: 'u-1', email: 'pharmacien@exemple.td' }] } }) },
      },
      rpc: async (nom: string, args: unknown) => { etat.appels.push({ nom, args }); return etat.rpc },
    },
  }
})

import { GET, POST, PHRASE_PRIX_VIDE } from '../route'

const poster = (corps: Record<string, unknown>, jeton = 'j') =>
  POST(new Request('https://www.deribfy.com/api/admin/paiements-manuels', {
    method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: JSON.stringify(corps),
  }))
const BON = { appId: 'app-1', objet: 'abonnement', fournisseur: 'especes', reference: 'RECU-0001', montant: 12000 }

beforeEach(() => {
  etat.email = 'issayamiyoussouf@gmail.com'
  etat.prix = '12000'
  etat.rpc = { data: { statut: 'enregistre', app_id: 'app-1', jusqu_au: '2027-01-30T10:00:00Z' }, error: null }
  etat.appels = []
})

describe('activation à la main', () => {
  it('① un compte non administrateur est refusé (403), sans jeton aussi (401)', async () => {
    etat.email = 'marchand@example.com'
    expect((await poster(BON)).status).toBe(403)
    expect((await poster(BON, '')).status).toBe(401)
    expect(etat.appels).toEqual([])
  })

  it('② prix en FCFA vide : refusé, rien n’est écrit', async () => {
    etat.prix = ''
    const r = await poster(BON)
    expect(r.status).toBe(409)
    expect(((await r.json()) as { error: string }).error).toBe(PHRASE_PRIX_VIDE)
    expect(etat.appels).toEqual([])
  })

  it('③ la référence est obligatoire', async () => {
    expect((await poster({ ...BON, reference: '  ' })).status).toBe(400)
    expect(etat.appels).toEqual([])
  })

  it('④ un paiement passe par enregistrer_paiement : manuel, FCFA, saisi par l’admin', async () => {
    const r = await poster(BON)
    expect(r.status).toBe(200)
    expect(etat.appels).toEqual([{ nom: 'enregistrer_paiement', args: {
      p_source: 'manuelle', p_fournisseur: 'especes', p_reference: 'RECU-0001', p_app: 'app-1', p_owner: 'u-1',
      p_objet: 'abonnement', p_montant: 12000, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: 'issayamiyoussouf@gmail.com',
    } }])
    expect(await r.json()).toMatchObject({ ok: true, jusquAu: '2027-01-30T10:00:00Z' })
  })

  it('⑤ la même référence deux fois : refusée, et l’appli déjà activée est nommée', async () => {
    etat.rpc = { data: { statut: 'deja_enregistre', app_id: 'app-1', jusqu_au: null }, error: null }
    const r = await poster(BON)
    expect(r.status).toBe(409)
    expect(((await r.json()) as { error: string }).error).toContain('« pharma »')
  })

  it('⑥ un lot sans abonnement en cours : refusé avec sa raison', async () => {
    etat.rpc = { data: null, error: { message: 'PAIEMENT_LOT_SANS_ABONNEMENT: un lot s’ajoute…' } }
    const r = await poster({ ...BON, objet: 'lot' })
    expect(r.status).toBe(409)
    expect(((await r.json()) as { error: string }).error).toMatch(/abonnement en cours/u)
  })

  it('⑦ la recherche rend l’appli, son propriétaire, sa formule et les réglages', async () => {
    const r = await GET(new Request('https://www.deribfy.com/api/admin/paiements-manuels?q=pharma', { headers: { authorization: 'Bearer j' } }))
    const d = (await r.json()) as { applis: Record<string, unknown>[]; reglages: Record<string, string> }
    expect(d.applis[0]).toMatchObject({ id: 'app-1', adresse: 'pharma', proprietaire: 'pharmacien@exemple.td', formule: 'abonnee' })
    expect(d.reglages).toEqual({ prixMensuelXaf: '12000', dureeJours: '30', lotTaille: '50' })
  })
})
