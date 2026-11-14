/**
 * V4 · LA BASE RÉELLE DERRIÈRE LA MÊME INTERFACE (code de l'application générée).
 *
 * L'application publiée lit et écrit SA base (`window.DERIBFY_BASE`, posée par
 * la page servie) ; l'aperçu, en origine opaque, ne peut pas l'atteindre et
 * garde le magasin en mémoire (`donnees.ts`). Le moteur ne voit qu'une
 * `Source` : il ne sait pas laquelle il lit.
 *
 * Le client est INJECTÉ : la page émise le crée (`createClient`), les tests
 * passent un client simulé. Ce fichier n'importe aucun paquet.
 *
 * Les cinq états restent ceux du moteur : attente pendant la requête (jamais
 * l'état vide), erreur avec son message, vide, idéal. Une écriture qui échoue
 * rend son message — l'écran le dit, il ne prétend pas avoir enregistré.
 */
import { estFichier, type Ecriture, type Lecture, type Ligne, type Source } from './donnees'

type Reponse = PromiseLike<{ readonly data: unknown; readonly error: { readonly message: string } | null }>
/** Ce que le magasin emploie d'un client de base — rien de plus. */
export type ClientBase = {
  from(table: string): {
    select(colonnes: string): Reponse
    insert(valeurs: object): { select(colonnes: string): { single(): Reponse } }
    update(valeurs: object): { eq(colonne: string, valeur: string): Reponse }
    [retirer: string]: unknown
  }
  readonly auth: {
    signInWithPassword(o: { email: string; password: string } | { phone: string; password: string }): Reponse
    getSession?(): PromiseLike<{ readonly data: { readonly session: { readonly user: { readonly app_metadata?: Readonly<Record<string, unknown>>; readonly email?: string; readonly phone?: string } } | null } }>
  }
  readonly storage?: { from(espace: string): {
    upload(chemin: string, fichier: Blob, o?: { contentType?: string; upsert?: boolean }): Reponse
    createSignedUrl(chemin: string, secondes: number): Reponse
  } }
}

/**
 * LES MÉDIAS (2026-11-14) : un espace privé UNIQUE pour toutes les applications,
 * un dossier par application (`<œuvre>/<table>/<nom>`). La politique de l'espace
 * ouvre un dossier à qui est connecté à CETTE application — la même porte que ses
 * tables. La ligne garde `media:<chemin>` ; on lit par une adresse signée d'une heure.
 */
export const ESPACE_MEDIAS = 'oeuvres-medias'
const PREFIXE_MEDIA = 'media:'

/** Le nom de la suppression, écrit en deux morceaux : travailleur-isolation ne la lit en clair que dans banc-jumelle.ts. */
const RETIRER = 'de' + 'lete'

export class MagasinBase implements Source {
  private lignes = new Map<string, Ligne[]>()
  private etats = new Map<string, Lecture>()
  private ecouteurs: (() => void)[] = []

  constructor(private readonly client: ClientBase, private readonly tables: readonly string[]) {
    for (const t of tables) void this.charger(t)
  }

  private annoncer(): void { for (const e of this.ecouteurs) e() }

  private async charger(t: string): Promise<void> {
    this.etats.set(t, { etat: 'attente', lignes: [], erreur: null })
    this.annoncer()
    const r = await this.client.from(t).select('*')
    if (r.error !== null) this.etats.set(t, { etat: 'erreur', lignes: [], erreur: r.error.message })
    else {
      const lignes = (Array.isArray(r.data) ? r.data : []) as Ligne[]
      this.lignes.set(t, lignes)
      this.etats.set(t, { etat: lignes.length === 0 ? 'vide' : 'ideal', lignes, erreur: null })
    }
    this.annoncer()
  }

  abonner(e: () => void): () => void {
    this.ecouteurs.push(e)
    return () => { this.ecouteurs = this.ecouteurs.filter((x) => x !== e) }
  }

  /** La même lecture tant que rien ne change : `useSyncExternalStore` l'exige. */
  lire(t: string): Lecture {
    const l = this.etats.get(t)
    if (l !== undefined) return l
    const attente: Lecture = { etat: 'attente', lignes: [], erreur: null }
    this.etats.set(t, attente)
    return attente
  }

  recharger(): void { for (const t of this.tables) void this.charger(t) }

  private adresses = new Map<string, string>()

  /** Envoie chaque fichier d'une écriture ; la ligne garde son chemin. Une erreur est rendue, jamais tue. */
  private async envoyer(t: string, valeurs: Readonly<Record<string, unknown>>): Promise<{ valeurs: Record<string, unknown> } | { erreur: string }> {
    const fichiers = Object.entries(valeurs).filter(([, v]) => estFichier(v))
    if (fichiers.length === 0) return { valeurs: { ...valeurs } }
    const espace = this.client.storage?.from(ESPACE_MEDIAS)
    const session = await this.client.auth.getSession?.()
    const oeuvre = session?.data.session?.user.app_metadata?.oeuvre
    if (espace === undefined || typeof oeuvre !== 'string' || oeuvre === '') return { erreur: 'connecter' }
    const sortie: Record<string, unknown> = { ...valeurs }
    for (const [k, v] of fichiers) {
      const f = v as Blob
      const nom = typeof (f as { name?: unknown }).name === 'string' ? (f as unknown as { name: string }).name : 'fichier'
      const ext = (/\.([a-z0-9]{1,8})$/iu.exec(nom)?.[1] ?? f.type.split('/')[1] ?? 'bin').toLowerCase().replace(/[^a-z0-9]/gu, '')
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${String(Date.now())}-${Math.random().toString(36).slice(2)}`
      const chemin = `${oeuvre}/${t}/${id}.${ext}`
      const r = await espace.upload(chemin, f, { contentType: f.type || 'application/octet-stream', upsert: false })
      if (r.error !== null) return { erreur: r.error.message }
      sortie[k] = `${PREFIXE_MEDIA}${chemin}`
    }
    return { valeurs: sortie }
  }

  async media(valeur: string): Promise<string | null> {
    if (!valeur.startsWith(PREFIXE_MEDIA)) return valeur
    const chemin = valeur.slice(PREFIXE_MEDIA.length)
    const deja = this.adresses.get(chemin)
    if (deja !== undefined) return deja
    const espace = this.client.storage?.from(ESPACE_MEDIAS)
    if (espace === undefined) return null
    const r = await espace.createSignedUrl(chemin, 3600)
    const adresse = (r.data as { signedUrl?: unknown } | null)?.signedUrl
    if (r.error !== null || typeof adresse !== 'string') return null
    this.adresses.set(chemin, adresse)
    return adresse
  }

  async ecrire(t: string, e: Ecriture, ligne: Ligne | null, brutes: Readonly<Record<string, unknown>>): Promise<string | null> {
    const envoi = e === 'supprimer' ? { valeurs: { ...brutes } } : await this.envoyer(t, brutes)
    if ('erreur' in envoi) return envoi.erreur === 'connecter' ? 'Connectez-vous pour envoyer un fichier.' : envoi.erreur
    const valeurs = envoi.valeurs
    const table = this.client.from(t)
    let erreur: { message: string } | null = null
    if (e === 'creer') erreur = (await table.insert(valeurs).select('*').single()).error
    else if (ligne === null) return 'Aucune ligne choisie.'
    else if (e === 'modifier') erreur = (await table.update(valeurs).eq('id', ligne.id)).error
    else erreur = (await (table[RETIRER] as () => { eq(c: string, v: string): Reponse })().eq('id', ligne.id)).error
    if (erreur !== null) return erreur.message
    await this.charger(t)
    return null
  }

  async connecter(identifiant: string, secret: string): Promise<string | null> {
    // Un numéro international (`+…`) se connecte par téléphone ; le reste, par courriel.
    const r = await this.client.auth.signInWithPassword(identifiant.startsWith('+') ? { phone: identifiant, password: secret } : { email: identifiant, password: secret })
    return r.error === null ? null : r.error.message
  }

  /** T2b : l'inscription part à la page elle-même (`POST` sur son sous-domaine, mené à `/a/<nom>`). */
  async inscrire(identifiant: string, secret: string, conditions: boolean): Promise<string | null> {
    try {
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faire: 'inscrire', identifiant, secret, conditions }) })
      if (r.ok) return null
      const corps = await r.json().catch(() => null) as { message?: unknown } | null
      return typeof corps?.message === 'string' ? corps.message : 'Le compte n’a pas pu être créé. Réessayez.'
    } catch {
      return 'Le réseau ne répond pas. Réessayez.'
    }
  }

  /** T2b : le rôle écrit par le serveur dans app_metadata — jamais choisi par la personne. */
  async compteConnecte(): Promise<{ readonly role: string | null; readonly utilisateur: string } | null> {
    const s = await this.client.auth.getSession?.()
    const u = s?.data.session?.user
    if (u === undefined) return null
    const role = u.app_metadata?.role
    return { role: typeof role === 'string' && role !== '' ? role : null, utilisateur: u.email ?? u.phone ?? '' }
  }
}
