/**
 * LE COMPTE D'UNE APPLI — un nom réutilisé n'ouvre jamais l'appli d'un autre (2026-11-18).
 *
 * Décision du propriétaire : l'adresse devient `admin@<nom>.deribfy.app`. Trouvé en
 * préparant le chantier : un nom peut changer de main (une appli qui se renomme
 * libère l'ancien ; une purge future des pierres tombales libérerait celui d'une
 * appli supprimée — aujourd'hui EP-308 l'en empêche). Si l'adresse restait
 * l'identité, l'ANCIEN mot de passe ouvrirait la NOUVELLE appli. C'est le
 * quatrième costume de `identites-derivees.ts`.
 *
 * Le faux service ci-dessous tient les règles du vrai qui comptent ici :
 * adresse unique, banni = refusé, connexion par adresse + mot de passe, et la
 * connexion rend la REVENDICATION (c'est elle que la porte des tables lit).
 *
 * ① une appli nommée reçoit `admin@<nom>.deribfy.app` ; republier ne refait rien ;
 * ② un compte d'avant (adresse longue) passe à l'adresse lisible en GARDANT
 *   son mot de passe — son propriétaire n'est pas enfermé ;
 * ③ LE TEST DEMANDÉ : A publiée « pharma », supprimée, le nom libéré, B publiée
 *   « pharma » → l'ancien mot de passe n'ouvre RIEN, nulle part ;
 * ④ une appli qui se RENOMME garde sa clé quand une autre prend son ancien nom ;
 * ⑤ un compte qui revendique une autre appli n'est JAMAIS pris.
 */
import { describe, expect, it } from 'vitest'
import { adresseCompteOeuvre, assurerCompteOeuvre, renouvelerMotDePasse, type AdminComptes } from '../compte-oeuvre'

type U = { id: string; email: string; motDePasse: string; app_metadata: Record<string, unknown>; banni: boolean }

function fauxService() {
  const comptes: U[] = []
  let n = 0
  const pris = (email: string, sauf?: string) => comptes.some((c) => c.email === email && c.id !== sauf)
  const admin: AdminComptes = {
    listUsers: async () => ({ data: { users: comptes.map((c) => ({ id: c.id, email: c.email, app_metadata: c.app_metadata })) }, error: null }),
    createUser: async (a) => {
      const email = String(a.email)
      if (pris(email)) return { error: { message: 'email exists' } }
      n += 1
      comptes.push({ id: `u${String(n)}`, email, motDePasse: String(a.password), app_metadata: (a.app_metadata ?? {}) as Record<string, unknown>, banni: false })
      return { error: null }
    },
    updateUserById: async (id, a) => {
      const c = comptes.find((x) => x.id === id)
      if (c === undefined) return { error: { message: 'not found' } }
      if (typeof a.email === 'string') {
        if (pris(a.email, id)) return { error: { message: 'email exists' } }
        c.email = a.email
      }
      if (typeof a.password === 'string') c.motDePasse = a.password
      if (a.app_metadata !== undefined) c.app_metadata = a.app_metadata as Record<string, unknown>
      if (typeof a.ban_duration === 'string' && a.ban_duration !== 'none') c.banni = true
      return { error: null }
    },
  }
  /** Ce que donne une connexion : la revendication du compte, ou rien. */
  const connexion = (email: string, motDePasse: string): string | null => {
    const c = comptes.find((x) => x.email === email)
    if (c === undefined || c.banni || c.motDePasse !== motDePasse) return null
    return String(c.app_metadata.oeuvre ?? '')
  }
  return { admin, comptes, connexion }
}

const A = '11111111-aaaa-4aaa-8aaa-111111111111'
const B = '22222222-bbbb-4bbb-8bbb-222222222222'
const base = { url: 'https://x.supabase.co', cleSecrete: 'secret' }

describe('le compte : un nom réutilisé n’ouvre jamais l’appli d’un autre', () => {
  it('① adresse lisible ; republier ne refait rien', async () => {
    const s = fauxService()
    const c1 = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' })
    expect(c1.adresse).toBe('admin@pharma.deribfy.app')
    expect(c1.motDePasse).not.toBeNull()
    const c2 = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' })
    expect(c2).toMatchObject({ adresse: 'admin@pharma.deribfy.app', motDePasse: null, cree: false })
    expect(s.comptes).toHaveLength(1)
  })

  it('② un compte d’avant passe à l’adresse lisible en gardant son mot de passe', async () => {
    const s = fauxService()
    await s.admin.createUser({ email: adresseCompteOeuvre(A), password: 'ancien-mot-de-passe', app_metadata: { oeuvre: A } })
    const c = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' })
    expect(c).toMatchObject({ adresse: 'admin@pharma.deribfy.app', motDePasse: null })
    expect(s.connexion('admin@pharma.deribfy.app', 'ancien-mot-de-passe')).toBe(A)
  })

  it('③ supprimée puis nom repris : l’ancien mot de passe n’ouvre RIEN', async () => {
    const s = fauxService()
    const a = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' })
    const ancien = a.motDePasse as string
    expect(s.connexion('admin@pharma.deribfy.app', ancien)).toBe(A)
    // A est supprimée ; son nom est libéré (purge ou renommage) ; B prend « pharma ».
    const existe = async (id: string) => id !== A
    const b = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: B, nom: 'pharma', oeuvreExiste: existe })
    expect(b.adresse).toBe('admin@pharma.deribfy.app')
    expect(b.cree).toBe(true)
    // L'ancien mot de passe, à l'adresse lisible : refusé.
    expect(s.connexion('admin@pharma.deribfy.app', ancien)).toBeNull()
    // L'ancien mot de passe, à l'adresse longue où l'ancien compte a été déplacé : refusé aussi.
    expect(s.connexion(adresseCompteOeuvre(A), ancien)).toBeNull()
    // L'ancien mot de passe, à N'IMPORTE QUELLE adresse : n'ouvre jamais B.
    expect(s.comptes.filter((c) => s.connexion(c.email, ancien) !== null)).toEqual([])
    // Et B s'ouvre avec SON mot de passe, sur SA revendication.
    expect(s.connexion('admin@pharma.deribfy.app', b.motDePasse as string)).toBe(B)
  })

  it('④ une appli qui se renomme garde sa clé quand une autre prend son ancien nom', async () => {
    const s = fauxService()
    const a = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' })
    const cle = a.motDePasse as string
    await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: B, nom: 'pharma', oeuvreExiste: async () => true })
    // A existe encore : déplacée vers son adresse longue, SANS perdre sa clé ni sa revendication.
    expect(s.connexion(adresseCompteOeuvre(A), cle)).toBe(A)
    // À sa prochaine publication sous son nouveau nom, elle le prend.
    const a2 = await assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma-bis' })
    expect(a2.adresse).toBe('admin@pharma-bis.deribfy.app')
    expect(s.connexion('admin@pharma-bis.deribfy.app', cle)).toBe(A)
  })

  it('⑤ un compte qui revendique une autre appli n’est jamais pris', async () => {
    const s = fauxService()
    await s.admin.createUser({ email: adresseCompteOeuvre(A), password: 'x', app_metadata: { oeuvre: B } })
    await expect(assurerCompteOeuvre({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' }))
      .rejects.toThrow(/COMPTE_OEUVRE_APPARTIENT_AILLEURS/u)
  })

  it('⑥ refaire le mot de passe n’est pas un chemin de contournement', async () => {
    const s = fauxService()
    await s.admin.createUser({ email: adresseCompteOeuvre(A), password: 'cle-de-b', app_metadata: { oeuvre: B } })
    await expect(renouvelerMotDePasse({ ...base, admin: s.admin, idOeuvre: A, nom: 'pharma' }))
      .rejects.toThrow(/COMPTE_OEUVRE_APPARTIENT_AILLEURS/u)
    expect(s.connexion(adresseCompteOeuvre(A), 'cle-de-b')).toBe(B)
  })
})
