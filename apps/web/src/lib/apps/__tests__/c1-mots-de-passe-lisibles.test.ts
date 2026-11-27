/**
 * C1 (décision du propriétaire, 2026-11-27) — le mot de passe lisible, SANS
 * casser une seule connexion existante.
 *
 * ① une appli DÉJÀ publiée (mot de passe de 30 signes d'avant) : republier
 *   ne touche pas son mot de passe — l'ancien ouvre toujours l'appli ;
 * ② seul « Refaire mon mot de passe » le remplace — par le format lisible ;
 *   l'ancien cesse alors d'ouvrir, le nouveau ouvre ;
 * ③ une appli neuve reçoit d'emblée le format lisible, à l'adresse
 *   `admin@<nom>.deribfy.app` inchangée.
 *
 * Le faux service tient la règle du vrai qui compte ici : connexion par
 * adresse + mot de passe, rendant la revendication de l'appli.
 */
import { describe, expect, it } from 'vitest'
import { adresseLisible, assurerCompteOeuvre, renouvelerMotDePasse, type AdminComptes } from '../compte-oeuvre'

type U = { id: string; email: string; motDePasse: string; app_metadata: Record<string, unknown> }
const LISIBLE = /^(?:[A-Z][a-z]{4,6}-){4}[2-9]{2}$/u

function fauxService() {
  const comptes: U[] = []
  const ecrituresDeMotDePasse: string[] = []
  const admin: AdminComptes = {
    listUsers: async () => ({ data: { users: comptes.map((c) => ({ id: c.id, email: c.email, app_metadata: c.app_metadata })) }, error: null }),
    createUser: async (a) => {
      if (comptes.some((c) => c.email === a.email)) return { error: { message: 'email exists' } }
      comptes.push({ id: `u${String(comptes.length + 1)}`, email: String(a.email), motDePasse: String(a.password), app_metadata: (a.app_metadata ?? {}) as Record<string, unknown> })
      return { error: null }
    },
    updateUserById: async (id, a) => {
      const c = comptes.find((x) => x.id === id)
      if (c === undefined) return { error: { message: 'not found' } }
      if (typeof a.email === 'string') c.email = a.email
      if (typeof a.password === 'string') { c.motDePasse = a.password; ecrituresDeMotDePasse.push(id) }
      if (a.app_metadata !== undefined) c.app_metadata = a.app_metadata as Record<string, unknown>
      return { error: null }
    },
  }
  const connexion = (email: string, mdp: string): string | null => {
    const c = comptes.find((x) => x.email === email)
    return c === undefined || c.motDePasse !== mdp ? null : String(c.app_metadata.oeuvre ?? '')
  }
  return { admin, comptes, connexion, ecrituresDeMotDePasse }
}

const APP = '0178c047-d6e7-430f-88bd-fc455cd47283'
const base = { url: 'https://x.supabase.co', cleSecrete: 'secret', idOeuvre: APP, nom: 'suivi-de-colis' }
const ANCIEN = 'Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy' // 30 signes, la forme d'avant

describe('C1 · mots de passe lisibles, connexions existantes intactes', () => {
  it('① appli déjà publiée : republier ne touche pas son mot de passe, l’ancien ouvre toujours', async () => {
    const s = fauxService()
    await s.admin.createUser({ email: adresseLisible('suivi-de-colis'), password: ANCIEN, app_metadata: { oeuvre: APP } })
    const r = await assurerCompteOeuvre({ ...base, admin: s.admin })
    expect(r).toMatchObject({ adresse: 'admin@suivi-de-colis.deribfy.app', motDePasse: null, cree: false })
    expect(s.ecrituresDeMotDePasse).toEqual([])
    expect(s.connexion('admin@suivi-de-colis.deribfy.app', ANCIEN)).toBe(APP)
  })

  it('② « Refaire mon mot de passe » : le format lisible ; l’ancien n’ouvre plus, le nouveau ouvre', async () => {
    const s = fauxService()
    await s.admin.createUser({ email: adresseLisible('suivi-de-colis'), password: ANCIEN, app_metadata: { oeuvre: APP } })
    const r = await renouvelerMotDePasse({ ...base, admin: s.admin })
    expect(r.motDePasse).toMatch(LISIBLE)
    expect(s.connexion('admin@suivi-de-colis.deribfy.app', ANCIEN)).toBeNull()
    expect(s.connexion('admin@suivi-de-colis.deribfy.app', r.motDePasse ?? '')).toBe(APP)
  })

  it('③ appli neuve : format lisible d’emblée, adresse admin@<nom>.deribfy.app inchangée', async () => {
    const s = fauxService()
    const r = await assurerCompteOeuvre({ ...base, admin: s.admin })
    expect(r.cree).toBe(true)
    expect(r.adresse).toBe('admin@suivi-de-colis.deribfy.app')
    expect(r.motDePasse).toMatch(LISIBLE)
    expect(s.connexion(r.adresse, r.motDePasse ?? '')).toBe(APP)
  })
})
