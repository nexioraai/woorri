/**
 * V3 — LA SOURCE DE DONNÉES DU MOTEUR DE RENDU (code de l'application générée).
 *
 * Une table se lit dans l'un de CINQ états, et le moteur rend chacun :
 *   attente (squelette — JAMAIS l'état vide), erreur (avec « Réessayer »),
 *   vide (avec son appel à l'action), partiel (bandeau + ce qui est arrivé),
 *   idéal.
 * Ce magasin-ci est celui des TÉMOINS : en mémoire, sa latence et l'état final
 * de chaque table se règlent. La base réelle (`base.ts`) offre la même
 * interface (`Source`) : c'est elle que sert l'application publiée.
 */
export type Ligne = { readonly id: string } & Readonly<Record<string, unknown>>
export type EtatSource = 'attente' | 'erreur' | 'vide' | 'partiel' | 'ideal'
export type Lecture = { readonly etat: EtatSource; readonly lignes: readonly Ligne[]; readonly erreur: string | null }
export type Ecriture = 'creer' | 'modifier' | 'supprimer'

export type Reglages = {
  readonly tables: Readonly<Record<string, readonly Ligne[]>>
  /** L'état FINAL forcé d'une table (sinon : vide si aucune ligne, idéal sinon). */
  readonly etats?: Readonly<Record<string, EtatSource>>
  /** Combien de temps une lecture reste « en attente ». */
  readonly latenceMs?: number
}

/**
 * CE QUE LE MOTEUR LIT — le magasin des témoins (en mémoire) et la base réelle
 * (`base.ts`) l'offrent tous deux. Une écriture en base est asynchrone et rend
 * son message d'erreur ; `connecter` n'existe qu'en base.
 */
export interface Source {
  abonner(e: () => void): () => void
  lire(t: string): Lecture
  recharger(): void
  ecrire(t: string, e: Ecriture, ligne: Ligne | null, valeurs: Readonly<Record<string, unknown>>): void | Promise<string | null>
  connecter?(identifiant: string, secret: string): Promise<string | null>
}

export class Magasin implements Source {
  private lignes = new Map<string, Ligne[]>()
  private etats = new Map<string, EtatSource>()
  private forces: Readonly<Record<string, EtatSource>>
  private ecouteurs: (() => void)[] = []
  /** Une lecture reste LA MÊME tant que rien ne change : `useSyncExternalStore` l'exige (sinon il boucle). */
  private cache = new Map<string, Lecture>()
  private compteur = 0
  private readonly latence: number

  constructor(r: Reglages) {
    for (const [t, l] of Object.entries(r.tables)) this.lignes.set(t, [...l])
    this.forces = r.etats ?? {}
    this.latence = r.latenceMs ?? 0
    for (const t of this.lignes.keys()) this.charger(t)
  }

  private final(t: string): EtatSource {
    const force = this.forces[t]
    if (force !== undefined) return force
    return (this.lignes.get(t) ?? []).length === 0 ? 'vide' : 'ideal'
  }

  private charger(t: string): void {
    this.etats.set(t, 'attente')
    this.annoncer()
    const fin = () => { this.etats.set(t, this.final(t)); this.annoncer() }
    if (this.latence > 0) setTimeout(fin, this.latence)
    else fin()
  }

  private annoncer(): void { this.cache.clear(); for (const e of this.ecouteurs) e() }

  abonner(e: () => void): () => void {
    this.ecouteurs.push(e)
    return () => { this.ecouteurs = this.ecouteurs.filter((x) => x !== e) }
  }

  lire(t: string): Lecture {
    const deja = this.cache.get(t)
    if (deja !== undefined) return deja
    const l = this.calculer(t)
    this.cache.set(t, l)
    return l
  }

  private calculer(t: string): Lecture {
    const etat = this.etats.get(t) ?? 'attente'
    const toutes = this.lignes.get(t) ?? []
    if (etat === 'attente') return { etat, lignes: [], erreur: null }
    if (etat === 'erreur') return { etat, lignes: [], erreur: `La table « ${t} » n’a pas répondu.` }
    if (etat === 'partiel') return { etat, lignes: toutes.slice(0, Math.max(1, Math.ceil(toutes.length / 2))), erreur: null }
    return { etat: toutes.length === 0 ? 'vide' : etat === 'vide' ? 'vide' : 'ideal', lignes: etat === 'vide' ? [] : toutes, erreur: null }
  }

  recharger(): void {
    this.forces = Object.fromEntries(Object.entries(this.forces).filter(([, e]) => e !== 'erreur'))
    for (const t of this.lignes.keys()) this.charger(t)
  }

  ecrire(t: string, e: Ecriture, ligne: Ligne | null, valeurs: Readonly<Record<string, unknown>>): void {
    const l = this.lignes.get(t) ?? []
    if (e === 'creer') { this.compteur += 1; l.push({ ...valeurs, id: `nouveau-${String(this.compteur)}` }) }
    else if (ligne !== null) {
      const i = l.findIndex((x) => x.id === ligne.id)
      if (i >= 0) { if (e === 'supprimer') l.splice(i, 1); else l[i] = { ...l[i]!, ...valeurs, id: ligne.id } }
    }
    this.lignes.set(t, l)
    if (this.etats.get(t) !== 'attente') this.etats.set(t, this.final(t))
    this.annoncer()
  }
}
