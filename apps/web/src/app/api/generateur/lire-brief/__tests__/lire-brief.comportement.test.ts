// ÉTAPE 2b + G30 (2026-11-13) — CLIQUETS DE COMPORTEMENT DE LA LECTURE DU BRIEF.
//
// La route est APPELÉE, avec un modèle simulé, et c'est sa conduite qui est
// jugée — pas son texte :
//   ① elle n'envoie JAMAIS `thinking` activé : toujours `{ type: 'disabled' }` ;
//   ② une lecture qui n'aboutit pas est REPRISE UNE FOIS ; la reprise qui
//      aboutit rend `reussie`, `tentatives: 2` ;
//   ③ si la reprise échoue encore : DEUX appels, pas trois, et le résultat
//      part NOMMÉ (`tronquee`) — jamais converti en « rien à déduire » ;
//   ④ une lecture qui aboutit du premier coup coûte UN appel ;
//   ⑤ PAR TRANCHES : un cahier de trois paragraphes plus longs qu'une tranche
//      → trois appels, la deuxième tranche tronquée une fois → QUATRE appels,
//      `reussie`, `tranches: 3`, `signesLus` = la longueur entière, tables
//      FUSIONNÉES sans doublon (champs unis), rôles / écrans / questions
//      ouvertes unis, nom et devise de la première tranche qui les donne ;
//   ⑥ chaque tranche est coupée à une frontière de paragraphe, et le modèle
//      reçoit chaque signe du cahier une fois — aucune borne de lecture ;
//   ⑦ le FUSIBLE anti-abus : au-delà d'un million de signes, 413 et ZÉRO appel ;
//   ⑧ le COÛT est compté sur l'usage RENDU par chaque appel — tranches et
//      reprises comprises, cache compris — au tarif de l'heure de la lecture,
//      et voyage dans `lecture` (la ligne `9cc16d10` n'avait qu'une estimation).
// Rouge-puis-vert exécuté (rapport G30).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TAILLE_TRANCHE, FUSIBLE_SIGNES } from '@/lib/apps/lecture-brief'
import { CONFIGS, tarifDe } from '@/lib/apps/fournisseur'
import { FOURNISSEUR } from '@/lib/ia/client'

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
const CLIENTE = { id: 'ent_cliente', name: 'cliente', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }
const LU_VALIDE = { ARGENT_DANS_APP: 'paiements', NOM_PRODUIT: 'Atelier Mariam', ENTITES: [CLIENTE] }
type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }
const USAGE_PAR_DEFAUT: Usage = { input_tokens: 1000, output_tokens: 300, cache_read_input_tokens: 0 }
const reponseModele = (texte: string, stop: 'end_turn' | 'max_tokens' = 'end_turn', usage: Usage = USAGE_PAR_DEFAUT) => ({ stop_reason: stop, content: [{ type: 'text', text: texte }], usage })
const requete = (demande: string) =>
  new Request('https://deribfy.test/api/generateur/lire-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jeton' },
    body: JSON.stringify({ demande }),
  })
type Tranche = { signes: number; tentatives: number; resultat: string; tables: number; nom: string | null; nomRefuse: string | null; ecrans: number; roles: number; questionsOuvertes: number }
type Lecture = { resultat: string; tentatives: number; tables: number; tranches: number; tranchesEchouees: number; signesLus: number; coutUsd: number; jetons: { entree: number; sortie: number }; parTranche: Tranche[]; roles: string[]; ecrans: string[]; questionsOuvertes: string[] }
const contenuEnvoye = (n: number) => (messagesCreateMock.mock.calls[n]![0] as { messages: { content: string }[] }).messages[0]!.content

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'
  process.env.DEEPSEEK_API_KEY = 'sk-test'
  getUserMock.mockResolvedValue({ data: { user: { id: 'u-1', email: 'a@b.c' } }, error: null })
  messagesCreateMock.mockReset()
})
afterEach(() => { vi.useRealTimers() })

describe('la lecture du brief : réflexion coupée, reprise unique, par tranches, jamais silencieuse', () => {
  it('① la route n’envoie jamais la réflexion activée', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele(JSON.stringify(LU_VALIDE)))
    const res = await POST(requete(CAHIER))
    expect(res.status).toBe(200)
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    const params = messagesCreateMock.mock.calls[0]![0] as { thinking?: { type?: string } }
    expect(params.thinking, 'la réflexion n’est pas coupée').toEqual({ type: 'disabled' })
    for (const [p] of messagesCreateMock.mock.calls as [{ thinking?: { type?: string } }][]) expect(p.thinking?.type).not.toBe('enabled')
  })

  it('② une lecture tronquée est reprise une fois, et la reprise qui aboutit rend « reussie » en 2 tentatives', async () => {
    messagesCreateMock
      .mockResolvedValueOnce(reponseModele('{"ARGENT_DANS_APP":"paiements","ENTITES":[{"id":"ent_', 'max_tokens'))
      .mockResolvedValueOnce(reponseModele(JSON.stringify(LU_VALIDE)))
    const d = (await (await POST(requete(CAHIER))).json()) as { lecture: Lecture; entites: unknown[] }
    expect(messagesCreateMock).toHaveBeenCalledTimes(2)
    expect(d.lecture).toMatchObject({ resultat: 'reussie', tentatives: 2, tables: 1, tranches: 1, tranchesEchouees: 0, signesLus: CAHIER.length })
    expect(d.entites).toHaveLength(1)
  })

  it('③ si la reprise échoue encore, deux appels — pas trois — et le résultat part nommé', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele('{"ENTITES":[{"id":"ent_', 'max_tokens'))
    const d = (await (await POST(requete(CAHIER))).json()) as { lecture: Lecture; deduites: Record<string, unknown> }
    expect(messagesCreateMock).toHaveBeenCalledTimes(2)
    expect(d.lecture).toMatchObject({ resultat: 'tronquee', tentatives: 2, tables: 0, tranches: 1, tranchesEchouees: 1 })
    expect(d.lecture.resultat).not.toBe('reussie')
    expect(d.deduites).toEqual({})
    expect(d.lecture.parTranche).toEqual([{ signes: CAHIER.length, tentatives: 2, resultat: 'tronquee', tables: 0, nom: null, nomRefuse: null, ecrans: 0, roles: 0, questionsOuvertes: 0 }])
  })

  it('④ une lecture qui aboutit du premier coup coûte un seul appel', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele(JSON.stringify(LU_VALIDE)))
    const d = (await (await POST(requete(CAHIER))).json()) as { lecture: Lecture; nomProduit?: { nom: string } }
    expect(messagesCreateMock).toHaveBeenCalledTimes(1)
    expect(d.lecture).toMatchObject({ resultat: 'reussie', tentatives: 1, tables: 1, tranches: 1 })
    expect(d.nomProduit?.nom).toBe('Atelier Mariam')
  })

  // ── PAR TRANCHES ──────────────────────────────────────────────────────────
  const paragraphe = (sujet: string) => `${sujet}. ${'Le cahier détaille ce point sur de nombreuses lignes, sans rien laisser au hasard. '.repeat(Math.ceil(TAILLE_TRANCHE / 90))}`.slice(0, TAILLE_TRANCHE - 20).trimEnd()
  const CAHIER_LONG = [paragraphe('Section 1 — les clientes et le nom du produit Atelier Mariam'), paragraphe('Section 2 — les commandes et les paiements'), paragraphe('Section 3 — les écrans')].join('\n\n')
  const T1 = { NOM_PRODUIT: 'Atelier Mariam', ARGENT_DANS_APP: 'aucun', ENTITES: [CLIENTE], ROLES: ['gestionnaire'], ECRANS: ['Accueil', 'Clientes'], QUESTIONS_OUVERTES: ['Tarification de la retouche à préciser'] }
  // T2 propose un nom de 47 signes : la validation (2 à 40) l'écarte, et la ligne doit le dire.
  const T2 = { NOM_PRODUIT: 'Plateforme internationale de réservation et IA', ARGENT_DANS_APP: 'paiements', ENTITES: [{ ...CLIENTE, fields: [...CLIENTE.fields, { id: 'fld_tel', name: 'telephone', type: 'text', required: false }] }, { id: 'ent_commande', name: 'commande', fields: [{ id: 'fld_prix', name: 'prix', type: 'number', required: true }] }], ROLES: ['Gestionnaire', 'cliente'], ECRANS: ['Clientes', 'Commandes'], QUESTIONS_OUVERTES: ['Mode de paiement à décider'] }
  const T3 = { ENTITES: [{ id: 'ent_commande', name: 'Commande', fields: [{ id: 'fld_date', name: 'date', type: 'date', required: true }] }], ECRANS: ['Commandes', 'Paiements', 'Réglages'], QUESTIONS_OUVERTES: ['tarification de la retouche à préciser'] }

  it('⑤ trois tranches, la deuxième tronquée une fois : quatre appels, reussie, tables fusionnées sans doublon', async () => {
    messagesCreateMock
      .mockResolvedValueOnce(reponseModele(JSON.stringify(T1)))
      .mockResolvedValueOnce(reponseModele('{"ENTITES":[{"id":"ent_', 'max_tokens'))
      .mockResolvedValueOnce(reponseModele(JSON.stringify(T2)))
      .mockResolvedValueOnce(reponseModele(JSON.stringify(T3)))
    const d = (await (await POST(requete(CAHIER_LONG))).json()) as { lecture: Lecture; entites: { name: string; fields: { name: string }[] }[]; deduites: Record<string, string>; nomProduit?: { nom: string }; roles: string[]; ecrans: string[]; questionsOuvertes: string[] }
    expect(messagesCreateMock).toHaveBeenCalledTimes(4)
    expect(d.lecture).toMatchObject({ resultat: 'reussie', tentatives: 4, tranches: 3, tranchesEchouees: 0, signesLus: CAHIER_LONG.length, tables: 2 })
    // Tables dédoublonnées par nom (casse ignorée), champs unis.
    expect(d.entites.map((e) => e.name)).toEqual(['cliente', 'commande'])
    expect(d.entites[0]!.fields.map((f) => f.name)).toEqual(['nom', 'telephone'])
    expect(d.entites[1]!.fields.map((f) => f.name)).toEqual(['prix', 'date'])
    // Nom et réglages : la première tranche qui les donne.
    expect(d.nomProduit?.nom).toBe('Atelier Mariam')
    expect(d.deduites.ARGENT_DANS_APP).toBe('aucun')
    // Rôles, écrans, questions ouvertes : unis, sans doublon, dans l'ordre de lecture.
    expect(d.roles).toEqual(['gestionnaire', 'cliente'])
    expect(d.ecrans).toEqual(['Accueil', 'Clientes', 'Commandes', 'Paiements', 'Réglages'])
    expect(d.questionsOuvertes).toEqual(['Tarification de la retouche à préciser', 'Mode de paiement à décider'])
    expect(d.lecture.ecrans).toEqual(d.ecrans)
    expect(d.lecture.questionsOuvertes).toEqual(d.questionsOuvertes)
    // Les jetons des QUATRE appels sont comptés — la reprise aussi — et le coût n'est pas nul.
    expect(d.lecture.jetons).toEqual({ entree: 4 * USAGE_PAR_DEFAUT.input_tokens, sortie: 4 * USAGE_PAR_DEFAUT.output_tokens })
    expect(d.lecture.coutUsd).toBeGreaterThan(0)
    // Tranche par tranche : d'où vient chaque chose — et le nom que la 2ᵉ a proposé, écarté, est GARDÉ.
    expect(d.lecture.parTranche.map((t) => [t.tentatives, t.resultat, t.tables, t.nom, t.nomRefuse, t.ecrans])).toEqual([
      [1, 'reussie', 1, 'Atelier Mariam', null, 2],
      [2, 'reussie', 2, null, 'Plateforme internationale de réservation et IA', 2],
      [1, 'reussie', 1, null, null, 3],
    ])
    // Les appels 0, 1 et 3 portent les trois tranches (l'appel 2 est la reprise de la 2ᵉ).
    expect(d.lecture.parTranche.map((t) => t.signes)).toEqual([0, 1, 3].map(contenuEnvoye).map((t) => t.length))
  })

  it('⑥ chaque tranche est coupée à une frontière de paragraphe, et chaque signe du cahier est lu une fois', async () => {
    messagesCreateMock.mockResolvedValue(reponseModele(JSON.stringify(LU_VALIDE)))
    await POST(requete(CAHIER_LONG))
    expect(messagesCreateMock).toHaveBeenCalledTimes(3)
    const envoyes = [0, 1, 2].map(contenuEnvoye)
    for (const t of envoyes) expect(t.length).toBeLessThanOrEqual(TAILLE_TRANCHE)
    expect(envoyes.map((t) => t.slice(0, 9))).toEqual(['Section 1', 'Section 2', 'Section 3'])
    // Rien n'est perdu entre les tranches : recollées, elles redonnent le cahier.
    expect(envoyes.join('\n\n')).toBe(CAHIER_LONG)
  })

  it('⑦ le fusible anti-abus : au-delà d’un million de signes, 413 et aucun appel au modèle', async () => {
    const res = await POST(requete('x'.repeat(FUSIBLE_SIGNES + 1)))
    expect(res.status).toBe(413)
    expect(messagesCreateMock).not.toHaveBeenCalled()
    expect(((await res.json()) as { lecture: Lecture }).lecture).toMatchObject({ coutUsd: 0, jetons: { entree: 0, sortie: 0 } })
  })

  // ── LE COÛT ─────────────────────────────────────────────────────────────────
  it('⑧ le coût est compté sur l’usage rendu par chaque appel, cache compris, au tarif de l’heure', async () => {
    // L'heure est FIXÉE : le tarif en dépend (pointe / hors pointe), et un
    // test qui lit l'horloge ne se rejoue qu'à l'heure qu'il est.
    vi.useFakeTimers({ toFake: ['Date'] })
    const quand = new Date('2026-11-13T12:00:00Z')
    vi.setSystemTime(quand)
    messagesCreateMock
      .mockResolvedValueOnce(reponseModele('{"ENTITES":[{"id":"ent_', 'max_tokens', { input_tokens: 1000, output_tokens: 8000, cache_read_input_tokens: 0 }))
      .mockResolvedValueOnce(reponseModele(JSON.stringify(LU_VALIDE), 'end_turn', { input_tokens: 800, output_tokens: 400, cache_read_input_tokens: 200 }))
    const d = (await (await POST(requete(CAHIER))).json()) as { lecture: Lecture }
    const t = tarifDe(CONFIGS[FOURNISSEUR].prixLeger, quand)
    const attendu = Number(((1800 * t.entree + 200 * t.entreeCache + 8400 * t.sortie) / 1e6).toFixed(6))
    expect(d.lecture.jetons).toEqual({ entree: 2000, sortie: 8400 })
    expect(d.lecture.coutUsd).toBe(attendu)
    expect(d.lecture.coutUsd).toBeGreaterThan(0)
  })
})
