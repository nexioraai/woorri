import 'server-only'
/**
 * LES DEMANDES MOBILE MONEY EN BASE — le verrou et le journal (2026-11-23).
 *
 * Table `mm_demandes` (supabase/sql/mobile_money_demandes.sql) :
 *   · le VERROU « une seule demande ouverte par appli », tenu par un index
 *     unique partiel — la base refuse la seconde, même vraiment simultanée ;
 *   · le JOURNAL lu par /admin : demande, avis reçu, décision, raison.
 *
 * Le registre est INJECTABLE : les tests passent un double en mémoire, la
 * production celui-ci, sur `supabaseAdmin`.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export const TABLE_DEMANDES = 'mm_demandes'

/** L'état d'une demande, dans les mots de la table. */
export type EtatDemande = 'ouverte' | 'reussie' | 'echouee' | 'expiree' | 'refusee' | 'abandonnee' | 'activee_main' | 'remboursee'

export type DemandeEnBase = {
  readonly id: string
  readonly cree_le: string
  readonly fournisseur: string
  readonly app_id: string
  readonly owner_id: string
  readonly operateur: string
  readonly telephone_masque: string
  readonly montant: number
  readonly prix: number
  readonly frais: number
  readonly reference: string | null
  readonly test: boolean | null
  readonly etat: EtatDemande
  readonly ferme_le: string | null
  readonly avis_recu_le: string | null
  readonly decision: string | null
  readonly raison: string | null
  readonly active_par: string | null
  readonly active_le: string | null
  /** Remboursement (mobile_money_remboursement.sql) : absents avant ce fichier. */
  readonly paiement_sortant?: string | null
  readonly rembourse_par?: string | null
  readonly rembourse_le?: string | null
}

export type Ouverture = { readonly issue: 'ouverte'; readonly id: string } | { readonly issue: 'deja_ouverte'; readonly id: string; readonly creeLe: string | null }

export type NoteAvis = {
  readonly fournisseur: string
  readonly reference: string
  readonly etat: EtatDemande
  readonly decision: string
  readonly raison: string | null
  readonly test: boolean
  /** Pour une demande que la table ne connaît pas (avis arrivé seul). */
  readonly connu?: { readonly app: string; readonly proprietaire: string; readonly operateur: string; readonly montant: number }
}

export interface RegistreDemandes {
  /** `telephone` : le numéro ENTIER — le registre le masque lui-même avant d'écrire. */
  ouvrir(o: { fournisseur: string; app: string; proprietaire: string; operateur: string; telephone: string; montant: number; prix: number; frais: number; attenteS: number }): Promise<Ouverture>
  noterReference(id: string, reference: string, test: boolean): Promise<void>
  /** Ferme une demande qui n'a pas abouti à un encaissement (le prestataire a refusé, etc.). */
  abandonner(id: string, raison: string): Promise<void>
  noterAvis(n: NoteAvis): Promise<void>
  /** Les demandes restées « ouvertes » avec une référence, créées après `depuisIso`. */
  aRattraper(depuisIso: string): Promise<DemandeEnBase[]>
  lire(id: string): Promise<DemandeEnBase | null>
  marquerActivee(id: string, par: string): Promise<void>
}

/**
 * Le numéro, sans ce qui identifierait la personne : « 235••••••01 » — au
 * plus 3 chiffres devant (l'indicatif), 2 derrière, et au moins 4 points.
 * Trop court pour garder 4 points cachés : tout est masqué.
 */
export function masquer(telephone: string): string {
  const c = telephone.replace(/\D/gu, '')
  if (c.length < 9) return '••••••'
  return c.slice(0, 3) + '•'.repeat(c.length - 5) + c.slice(-2)
}

/**
 * LA MÊME RÈGLE QUE LA BASE (mobile_money_telephone_masque.sql, 2026-11-23) :
 * au plus 3 chiffres, AU MOINS 4 points, au plus 2 chiffres. Un numéro en
 * clair — « 23566000001 » — ne passe ni ici ni là-bas.
 */
export const FORME_MASQUEE = /^[0-9]{0,3}•{4,}[0-9]{0,2}$/u
export function estMasque(v: string): boolean {
  return FORME_MASQUEE.test(v)
}

/** Le masque à écrire, ou une erreur : JAMAIS un numéro en clair n'atteint la table. */
export function masquePourEcrire(telephone: string, masquage: (t: string) => string = masquer): string {
  const m = masquage(telephone)
  if (!estMasque(m)) throw new Error('numéro non masqué : écriture refusée')
  return m
}

const lever = (quoi: string, e: { message: string } | null): void => {
  if (e !== null) throw new Error(`${quoi} : ${e.message}`)
}

export const registreDemandes: RegistreDemandes = {
  async ouvrir(o) {
    const r = await supabaseAdmin.rpc('mm_ouvrir_demande', {
      p_fournisseur: o.fournisseur, p_app: o.app, p_owner: o.proprietaire, p_operateur: o.operateur,
      p_telephone_masque: masquePourEcrire(o.telephone), p_montant: o.montant, p_prix: o.prix, p_frais: o.frais, p_attente_s: o.attenteS,
    })
    lever('mm_ouvrir_demande', r.error)
    const d = r.data as { statut: string; id: string; cree_le?: string }
    return d.statut === 'ouverte' ? { issue: 'ouverte', id: d.id } : { issue: 'deja_ouverte', id: d.id, creeLe: d.cree_le ?? null }
  },
  async noterReference(id, reference, test) {
    const r = await supabaseAdmin.from(TABLE_DEMANDES).update({ reference, test }).eq('id', id)
    lever('noterReference', r.error)
  },
  async abandonner(id, raison) {
    const r = await supabaseAdmin.from(TABLE_DEMANDES).update({ etat: 'abandonnee', ferme_le: new Date().toISOString(), raison }).eq('id', id)
    lever('abandonner', r.error)
  },
  async noterAvis(n) {
    const maintenant = new Date().toISOString()
    const champs = { etat: n.etat, decision: n.decision, raison: n.raison, avis_recu_le: maintenant, test: n.test, ...(n.etat === 'ouverte' ? {} : { ferme_le: maintenant }) }
    const r = await supabaseAdmin.from(TABLE_DEMANDES).update(champs).eq('fournisseur', n.fournisseur).eq('reference', n.reference).select('id')
    lever('noterAvis', r.error)
    if ((r.data ?? []).length > 0 || n.connu === undefined) return
    // UN AVIS SANS DEMANDE CONNUE (antérieure à cette table) : on l'inscrit FERMÉ,
    // pour que l'admin le voie, sans jamais prendre le verrou d'une appli.
    const ins = await supabaseAdmin.from(TABLE_DEMANDES).insert({
      fournisseur: n.fournisseur, app_id: n.connu.app, owner_id: n.connu.proprietaire, operateur: n.connu.operateur,
      telephone_masque: '••••••', montant: n.connu.montant, prix: n.connu.montant, frais: 0, reference: n.reference, ...champs, ferme_le: maintenant,
    })
    lever('noterAvis (inscription)', ins.error)
  },
  async aRattraper(depuisIso) {
    const r = await supabaseAdmin.from(TABLE_DEMANDES).select('*').eq('etat', 'ouverte').not('reference', 'is', null).gte('cree_le', depuisIso).order('cree_le', { ascending: true }).limit(200)
    lever('aRattraper', r.error)
    return (r.data ?? []) as DemandeEnBase[]
  },
  async lire(id) {
    const r = await supabaseAdmin.from(TABLE_DEMANDES).select('*').eq('id', id).maybeSingle()
    lever('lire', r.error)
    return (r.data ?? null) as DemandeEnBase | null
  },
  async marquerActivee(id, par) {
    const maintenant = new Date().toISOString()
    const r = await supabaseAdmin.from(TABLE_DEMANDES).update({ etat: 'activee_main', active_par: par, active_le: maintenant, ferme_le: maintenant }).eq('id', id)
    lever('marquerActivee', r.error)
  },
}
