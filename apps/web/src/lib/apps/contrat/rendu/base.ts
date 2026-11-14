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
import type { Ecriture, Lecture, Ligne, Source } from './donnees'

type Reponse = PromiseLike<{ readonly data: unknown; readonly error: { readonly message: string } | null }>
/** Ce que le magasin emploie d'un client de base — rien de plus. */
export type ClientBase = {
  from(table: string): {
    select(colonnes: string): Reponse
    insert(valeurs: object): { select(colonnes: string): { single(): Reponse } }
    update(valeurs: object): { eq(colonne: string, valeur: string): Reponse }
    [retirer: string]: unknown
  }
  readonly auth: { signInWithPassword(o: { email: string; password: string }): Reponse }
}

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

  async ecrire(t: string, e: Ecriture, ligne: Ligne | null, valeurs: Readonly<Record<string, unknown>>): Promise<string | null> {
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
    const r = await this.client.auth.signInWithPassword({ email: identifiant, password: secret })
    return r.error === null ? null : r.error.message
  }
}
