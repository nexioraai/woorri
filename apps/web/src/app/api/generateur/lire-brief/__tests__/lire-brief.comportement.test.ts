// ÉTAPE 2b (2026-11-13) — CLIQUETS DE COMPORTEMENT DE LA LECTURE DU BRIEF.
//
// La route est APPELÉE, avec un modèle simulé, et c'est sa conduite qui est
// jugée — pas son texte :
//   ① elle n'envoie JAMAIS `thinking` activé : toujours `{ type: 'disabled' }`
//      (M10 : la réflexion mangeait la limite 2 fois sur 3 ; M11 : coupée,
//      reussie 3/3) ;
//   ② une lecture qui n'aboutit pas est REPRISE UNE FOIS, et le succès de la
//      reprise rend `reussie` avec `tentatives: 2` ;
//   ③ si la reprise échoue encore, la route s'arrête à DEUX appels — pas trois
//      — et le résultat part NOMMÉ (`tronquee`, `tentatives: 2`) : une lecture
//      tronquée est toujours signalée, jamais convertie en « rien à déduire » ;
//   ④ une lecture qui aboutit du premier coup coûte UN appel (`tentatives: 1`).
// Rouge-puis-vert exécuté : sans `thinking: disabled`, ① rougit ; sans la
// reprise, ② et ③ rougissent (rapport, étape 2b).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUserMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: (...a: unknown[]) => getUserMock(...a) } },
}))
const messagesCreateMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => messagesCreateMock(...a) }
  },
}))

import { POST } from '../route'

const CAHIER = 'Un atelier de couture à N’Djamena : les clientes (nom, téléphone) et les commandes (cliente, modèle, prix, date, payée ou non).'
const LU_VALIDE = {
  ARGENT_DANS_APP: 'paiements',
  NOM_PRODUIT: 'Atelier Mariam',
  ENTITES: [{ id: 'ent_cliente', name: 'cliente', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }],
}
const reponseModele = (texte: string, stop: 'end_turn' | 'max_tokens' = 'end_turn') => ({ stop_reason: stop, content: [{ type: 'text', text: texte }] })
const requete = () =>
  new Request('https://deribfy.test/api/generateur/lire-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
    body: JSON.stringify({ demande: CAHIER }),
  })
type Lecture = { resultat: string; tentatives: number; tables: number }

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'
  process.env.DEEPSEEK_API_KEY = 'sk-test'
  getUserMock.mockResolvedValue({ data: { user: { id: 'u-1', email: 'a@b.c' } }, error: null })
  messagesCreateMock.mockReset()
})

describe('étape 2b — la lecture du brief : réflexion coupée, reprise unique, jamais silencieuse', () => {
  it('① la route n’envoie jamais la réflexion activée', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele(JSON.stringify(LU_VALIDE)))
    const res = await POST(requete())
    expect(res.status).toBe(200)
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    const params = messagesCreateMock.mock.calls[0]![0] as { thinking?: { type?: string }; max_tokens?: number }
    expect(params.thinking, 'la réflexion n’est pas coupée').toEqual({ type: 'disabled' })
    for (const [p] of messagesCreateMock.mock.calls as [{ thinking?: { type?: string } }][]) expect(p.thinking?.type).not.toBe('enabled')
  })

  it('② une lecture tronquée est reprise une fois, et la reprise qui aboutit rend « reussie » en 2 tentatives', async () => {
    messagesCreateMock
      .mockResolvedValueOnce(reponseModele('{"ARGENT_DANS_APP":"paiements","ENTITES":[{"id":"ent_', 'max_tokens'))
      .mockResolvedValueOnce(reponseModele(JSON.stringify(LU_VALIDE)))
    const d = (await (await POST(requete())).json()) as { lecture: Lecture; entites: unknown[] }
    expect(messagesCreateMock).toHaveBeenCalledTimes(2)
    expect(d.lecture).toMatchObject({ resultat: 'reussie', tentatives: 2, tables: 1 })
    expect(d.entites).toHaveLength(1)
  })

  it('③ si la reprise échoue encore, deux appels — pas trois — et le résultat part nommé', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele('{"ENTITES":[{"id":"ent_', 'max_tokens'))
    const d = (await (await POST(requete())).json()) as { lecture: Lecture; deduites: Record<string, unknown> }
    expect(messagesCreateMock).toHaveBeenCalledTimes(2)
    expect(d.lecture).toMatchObject({ resultat: 'tronquee', tentatives: 2, tables: 0 })
    // Jamais convertie en « rien à déduire » : le résultat nomme la coupe.
    expect(d.lecture.resultat).not.toBe('reussie')
    expect(d.deduites).toEqual({})
  })

  it('④ une lecture qui aboutit du premier coup coûte un seul appel', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele(JSON.stringify(LU_VALIDE)))
    const d = (await (await POST(requete())).json()) as { lecture: Lecture; nomProduit?: { nom: string } }
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(d.lecture).toMatchObject({ resultat: 'reussie', tentatives: 1, tables: 1 })
    expect(d.nomProduit?.nom).toBe('Atelier Mariam')
  })
})
