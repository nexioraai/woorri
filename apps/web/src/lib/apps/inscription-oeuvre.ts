/**
 * T2b-2 · L'INSCRIPTION DANS UNE APPLICATION PUBLIÉE (2026-11-14).
 *
 * Quand le CAHIER demande que chacun crée son compte (`comptesDuCahier`), une
 * personne s'inscrit depuis l'application, sur SON sous-domaine : la page envoie
 * l'identifiant et le secret à `POST <nom>.deribfy.app`, que le proxy mène à
 * `/a/<nom>`. Le compte est créé ICI, côté serveur, dans le projet des œuvres :
 *
 *   · rattaché à CETTE œuvre et à son rôle de base par `app_metadata` — écrit par
 *     le serveur seul ; jamais `user_metadata`, que son porteur peut réécrire
 *     (même règle que `compte-oeuvre.ts`). C'est cette revendication qui ouvre
 *     les tables et les médias de l'application, et rien d'autre ;
 *   · l'identifiant et le secret sont ceux que le cahier demande : courriel ou
 *     téléphone (au format international), mot de passe (8 signes au moins) ou
 *     code personnel de N chiffres ;
 *   · bornée : par application et par adresse, avec le limiteur de Deribfy, qui
 *     FERME en cas de panne.
 *
 * Un code de N chiffres est trop court pour l'authentification de Supabase (6
 * signes au moins) : il y est rangé sous la forme `code-<chiffres>`, et
 * l'application applique la même forme à la connexion (`secretDeConnexion`, tenu
 * identique dans le moteur). Ce n'est pas un renforcement : un code de 4
 * chiffres reste faible — c'est la demande du cahier, et la limite des
 * tentatives de connexion de Supabase reste la protection.
 */

export type ComptesIndividuels = {
  readonly sorte: 'individuels'
  readonly identifiant: 'courriel' | 'telephone' | 'courriel-ou-telephone'
  readonly secret: { readonly nature: 'mot-de-passe' } | { readonly nature: 'code'; readonly chiffres: number }
  readonly verification: 'exigee' | 'facultative' | 'aucune'
  readonly roleDeBase: string
  readonly indicatif?: string
}

export type AdminAuth = {
  readonly auth: { readonly admin: { createUser(a: Record<string, unknown>): PromiseLike<{ readonly data: unknown; readonly error: { readonly message: string; readonly status?: number } | null }> } }
}
export type Limiteur = (cle: { readonly portee: 'oeuvre' | 'adresse'; readonly valeur: string }) => Promise<{ readonly ok: true } | { readonly ok: false; readonly statut: 429 | 503; readonly erreur: string }>

export type Resultat = { readonly ok: true } | { readonly ok: false; readonly statut: number; readonly message: string }

const COURRIEL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/u
const MOT_DE_PASSE_MIN = 8

/** Le secret tel que l'authentification le range (et tel que l'application le présente à la connexion). */
export const secretDeConnexion = (secret: string, c: Pick<ComptesIndividuels, 'secret'>): string => (c.secret.nature === 'code' ? `code-${secret}` : secret)

/** Un numéro au format international : `+` puis 8 à 15 chiffres ; sans indicatif, celui du pays lu. */
export function telephoneInternational(brut: string, indicatif: string | undefined): string | null {
  const t = brut.replace(/[\s.()-]/gu, '')
  if (/^\+\d{8,15}$/u.test(t)) return t
  if (/^00\d{8,15}$/u.test(t)) return `+${t.slice(2)}`
  if (indicatif !== undefined && /^0?\d{6,12}$/u.test(t)) return `${indicatif}${t.replace(/^0/u, '')}`
  return null
}

/** L'identifiant : un courriel ou un téléphone, selon ce que le cahier admet. */
export function lireIdentifiant(brut: string, c: ComptesIndividuels): { readonly email: string } | { readonly phone: string } | { readonly erreur: string } {
  const x = brut.trim()
  const peutCourriel = c.identifiant !== 'telephone'
  const peutTelephone = c.identifiant !== 'courriel'
  if (peutCourriel && x.includes('@')) return COURRIEL.test(x) ? { email: x.toLowerCase() } : { erreur: 'Adresse e-mail invalide.' }
  if (peutTelephone) {
    const t = telephoneInternational(x, c.indicatif)
    if (t !== null) return { phone: t }
    return { erreur: peutCourriel ? 'Saisissez une adresse e-mail ou un numéro de téléphone valide.' : 'Numéro de téléphone invalide (indicatif du pays compris).' }
  }
  return { erreur: 'Adresse e-mail invalide.' }
}

export function verifierSecret(secret: string, c: ComptesIndividuels): string | null {
  if (c.secret.nature === 'code') return new RegExp(`^\\d{${String(c.secret.chiffres)}}$`, 'u').test(secret) ? null : `Le code doit faire exactement ${String(c.secret.chiffres)} chiffres.`
  return secret.length >= MOT_DE_PASSE_MIN && secret.length <= 128 ? null : `Le mot de passe doit faire au moins ${String(MOT_DE_PASSE_MIN)} caractères.`
}

/** Lit des comptes individuels dans un document d'œuvre ; null si l'œuvre n'en a pas. */
export function comptesDuDocument(document: unknown): ComptesIndividuels | null {
  const c = (document as { comptes?: unknown } | null)?.comptes as Partial<ComptesIndividuels> | undefined
  if (c === undefined || c === null || c.sorte !== 'individuels' || typeof c.roleDeBase !== 'string' || c.roleDeBase === '') return null
  if (c.identifiant !== 'courriel' && c.identifiant !== 'telephone' && c.identifiant !== 'courriel-ou-telephone') return null
  if (c.secret?.nature !== 'mot-de-passe' && !(c.secret?.nature === 'code' && Number.isInteger(c.secret.chiffres))) return null
  return c as ComptesIndividuels
}

export async function inscrire(o: {
  readonly idOeuvre: string
  readonly comptes: ComptesIndividuels
  readonly identifiant: unknown
  readonly secret: unknown
  /** L'acceptation des conditions d'utilisation : exigée (norme). */
  readonly conditions: unknown
  readonly adresse: string
  readonly admin: AdminAuth
  readonly limiter: Limiteur
}): Promise<Resultat> {
  if (typeof o.identifiant !== 'string' || typeof o.secret !== 'string' || o.identifiant.length > 254 || o.secret.length > 128) return { ok: false, statut: 400, message: 'Demande illisible.' }
  if (o.conditions !== true) return { ok: false, statut: 400, message: 'Acceptez les conditions d’utilisation pour créer votre compte.' }
  const id = lireIdentifiant(o.identifiant, o.comptes)
  if ('erreur' in id) return { ok: false, statut: 400, message: id.erreur }
  const mauvaisSecret = verifierSecret(o.secret, o.comptes)
  if (mauvaisSecret !== null) return { ok: false, statut: 400, message: mauvaisSecret }
  // La limite AVANT la création : par application, puis par adresse.
  for (const cle of [{ portee: 'oeuvre' as const, valeur: o.idOeuvre }, { portee: 'adresse' as const, valeur: `${o.idOeuvre}:${o.adresse}` }]) {
    const v = await o.limiter(cle)
    if (!v.ok) return { ok: false, statut: v.statut, message: v.statut === 429 ? 'Trop d’inscriptions en peu de temps. Réessayez plus tard.' : 'Le service est momentanément indisponible.' }
  }
  const r = await o.admin.auth.admin.createUser({
    ...id,
    password: secretDeConnexion(o.secret, o.comptes),
    // La vérification des coordonnées par lien n'est pas encore branchée (T2b-4) : le compte est ouvert.
    ...('email' in id ? { email_confirm: true } : { phone_confirm: true }),
    app_metadata: { oeuvre: o.idOeuvre, role: o.comptes.roleDeBase },
  })
  if (r.error !== null) {
    if (/already|registered|exists|duplicate/iu.test(r.error.message)) return { ok: false, statut: 409, message: 'Un compte existe déjà avec cet identifiant. Connectez-vous.' }
    return { ok: false, statut: 502, message: 'Le compte n’a pas pu être créé. Réessayez.' }
  }
  return { ok: true }
}
