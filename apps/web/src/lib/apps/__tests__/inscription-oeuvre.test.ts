// T2b-2 · L'INSCRIPTION DANS UNE APPLICATION PUBLIÉE — le compte est créé côté serveur,
// rattaché à SON œuvre et à son rôle de base (app_metadata), borné, et seulement avec
// l'identifiant et le secret que le cahier demande.
import { describe, expect, it } from 'vitest'
import { comptesDuDocument, inscrire, lireIdentifiant, secretDeConnexion, telephoneInternational, verifierSecret, type AdminAuth, type ComptesIndividuels, type Limiteur } from '../inscription-oeuvre'

const CODE: ComptesIndividuels = { mode: 'individuels', identifiant: 'courriel-ou-telephone', secret: { nature: 'code', chiffres: 4 }, verification: 'facultative', roleDeBase: 'consommateur', indicatif: '+235' }
const MDP: ComptesIndividuels = { mode: 'individuels', identifiant: 'courriel', secret: { nature: 'mot-de-passe' }, verification: 'aucune', roleDeBase: 'Particulier' }

function adminSimule(erreur: string | null = null) {
  const crees: Record<string, unknown>[] = []
  const admin: AdminAuth = { auth: { admin: { createUser: (a) => { crees.push(a); return Promise.resolve({ data: erreur === null ? { user: { id: 'u1' } } : null, error: erreur === null ? null : { message: erreur } }) } } } }
  return { admin, crees }
}
const ouvert: Limiteur = () => Promise.resolve({ ok: true })

describe('T2b-2 · l’inscription dans une application publiée', () => {
  it('① l’identifiant que le cahier admet : courriel, ou téléphone au format international', () => {
    expect(lireIdentifiant('Awa@Exemple.td ', CODE)).toEqual({ email: 'awa@exemple.td' })
    expect(lireIdentifiant('66 12 34 56', CODE)).toEqual({ phone: '+23566123456' })
    expect(lireIdentifiant('+235 66 12 34 56', CODE)).toEqual({ phone: '+23566123456' })
    expect(lireIdentifiant('0023566123456', CODE)).toEqual({ phone: '+23566123456' })
    expect(lireIdentifiant('awa@', CODE)).toHaveProperty('erreur')
    // Un cahier « courriel » n'admet pas un téléphone.
    expect(lireIdentifiant('66123456', MDP)).toHaveProperty('erreur')
    expect(telephoneInternational('66123456', undefined)).toBeNull()
  })

  it('② le secret que le cahier demande : code de N chiffres, ou mot de passe de 8 signes au moins', () => {
    expect(verifierSecret('1234', CODE)).toBeNull()
    expect(verifierSecret('12345', CODE)).toMatch(/exactement 4 chiffres/u)
    expect(verifierSecret('12a4', CODE)).not.toBeNull()
    expect(verifierSecret('court', MDP)).toMatch(/au moins 8/u)
    expect(verifierSecret('assez-long', MDP)).toBeNull()
    // Un code est rangé sous une forme que l'authentification accepte (6 signes au moins).
    expect(secretDeConnexion('1234', CODE)).toBe('code-1234')
    expect(secretDeConnexion('assez-long', MDP)).toBe('assez-long')
  })

  it('③ le compte est créé rattaché à SON œuvre et à son rôle de base — dans app_metadata, jamais user_metadata', async () => {
    const { admin, crees } = adminSimule()
    expect(await inscrire({ idOeuvre: 'oeuvre-1', comptes: CODE, identifiant: '66123456', secret: '1234', conditions: true, adresse: '1.2.3.4', admin, limiter: ouvert })).toEqual({ ok: true })
    expect(crees).toEqual([{ phone: '+23566123456', password: 'code-1234', phone_confirm: true, app_metadata: { oeuvre: 'oeuvre-1', role: 'consommateur' } }])
    expect(JSON.stringify(crees)).not.toMatch(/user_metadata/u)
  })

  it('④ refusé AVANT toute création : identifiant ou secret faux, limite atteinte, limiteur en panne', async () => {
    const { admin, crees } = adminSimule()
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: 'x', secret: '1234', conditions: true, adresse: 'a', admin, limiter: ouvert })).toMatchObject({ ok: false, statut: 400 })
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: '66123456', secret: '12', conditions: true, adresse: 'a', admin, limiter: ouvert })).toMatchObject({ ok: false, statut: 400 })
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: 42, secret: '1234', conditions: true, adresse: 'a', admin, limiter: ouvert })).toMatchObject({ ok: false, statut: 400 })
    const plein: Limiteur = (c) => Promise.resolve(c.portee === 'adresse' ? { ok: false, statut: 429, erreur: 'x' } : { ok: true })
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: '66123456', secret: '1234', conditions: true, adresse: 'a', admin, limiter: plein })).toMatchObject({ ok: false, statut: 429 })
    const panne: Limiteur = () => Promise.resolve({ ok: false, statut: 503, erreur: 'x' })
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: '66123456', secret: '1234', conditions: true, adresse: 'a', admin, limiter: panne })).toMatchObject({ ok: false, statut: 503 })
    // Les conditions non acceptées : refusé, rien de créé.
    expect(await inscrire({ idOeuvre: 'o', comptes: CODE, identifiant: '66123456', secret: '1234', conditions: false, adresse: 'a', admin, limiter: ouvert })).toMatchObject({ ok: false, statut: 400 })
    expect(crees).toHaveLength(0)
  })

  it('⑤ un compte qui existe déjà : « connectez-vous » ; une autre erreur : un message sans détail technique', async () => {
    expect(await inscrire({ idOeuvre: 'o', comptes: MDP, identifiant: 'awa@exemple.td', secret: 'assez-long', conditions: true, adresse: 'a', admin: adminSimule('A user with this email address has already been registered').admin, limiter: ouvert }))
      .toEqual({ ok: false, statut: 409, message: 'Un compte existe déjà avec cet identifiant. Connectez-vous.' })
    const r = await inscrire({ idOeuvre: 'o', comptes: MDP, identifiant: 'awa@exemple.td', secret: 'assez-long', conditions: true, adresse: 'a', admin: adminSimule('connection reset by peer at 10.0.0.3').admin, limiter: ouvert })
    expect(r).toMatchObject({ ok: false, statut: 502 })
    expect(JSON.stringify(r)).not.toMatch(/10\.0\.0\.3|peer/u)
  })

  it('⑥ seule une œuvre aux comptes INDIVIDUELS ouvre l’inscription', () => {
    expect(comptesDuDocument({ comptes: CODE })).toEqual(CODE)
    expect(comptesDuDocument({ comptes: { mode: 'partage' } })).toBeNull()
    expect(comptesDuDocument({})).toBeNull()
    expect(comptesDuDocument({ comptes: { ...CODE, roleDeBase: '' } })).toBeNull()
  })
})
