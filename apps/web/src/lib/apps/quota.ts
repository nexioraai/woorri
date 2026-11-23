/**
 * LE QUOTA DES MODIFICATIONS, CÔTÉ ROUTES (étape ②, 2026-11-19).
 *
 * La règle vit dans la base (supabase/sql/quota_modifications.sql, appliqué
 * le 2026-11-19, vérifié 9·4·4·false·false) : `reserver_modification` réserve
 * OU refuse en une instruction. Ce module ne fait que l'appeler et dire le
 * résultat avec des mots.
 *
 * ── FERMÉ PAR DÉFAUT.
 *
 * Si le compteur ne répond pas, la modification n'a pas lieu : un appel payant
 * non compté est exactement ce que ce chantier existe pour empêcher. Les
 * comptes exemptés (`sansQuota`) ne passent jamais par ici.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { EtatCompteur } from './compteur-phrases'
import { TABLE_GENERATIONS } from './journal'

export type Reservation =
  | { readonly ok: true; readonly restantes: number }
  | { readonly ok: false; readonly raison: 'epuise' | 'indisponible'; readonly detail?: string }

/** Le refus dit pourquoi, ce qui le lève, et que l'appli reste en ligne. */
export const PHRASE_EPUISE =
  'Vous n’avez plus de modification disponible pour cette application. ' +
  'Elle reste en ligne et ses données ne bougent pas. Le compteur repart au prochain paiement de l’abonnement, ' +
  'ou avec un lot de modifications supplémentaires.'

export const PHRASE_COMPTEUR_INDISPONIBLE =
  'Le compteur de modifications ne répond pas : rien n’a été fait, et rien n’a été décompté. Réessayez dans un instant.'

export async function reserverModification(app: string, proprietaire: string): Promise<Reservation> {
  const r = await supabaseAdmin.rpc('reserver_modification', { p_app: app, p_owner: proprietaire })
  if (r.error !== null) return { ok: false, raison: 'indisponible', detail: r.error.message }
  if (r.data === null || r.data === undefined) return { ok: false, raison: 'epuise' }
  return { ok: true, restantes: Number(r.data) }
}

/** Une modification refusée ne compte pas. Ne lève jamais : un échec se dit. */
export async function libererModification(app: string, proprietaire: string): Promise<{ ok: boolean; detail?: string }> {
  const r = await supabaseAdmin.rpc('liberer_modification', { p_app: app, p_owner: proprietaire })
  return r.error === null ? { ok: true } : { ok: false, detail: r.error.message }
}

/** Les issues qui CONSOMMENT une modification : livrée, ou prête à confirmer. */
export const ISSUES_DECOMPTEES: ReadonlySet<string> = new Set(['livree', 'en_attente'])

// ── UNE APPLI GRATUITE PAR COMPTE (supabase/sql/quota_creations.sql).

export type ReservationCreation =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly raison: 'occupee' | 'indisponible'; readonly detail?: string }

export { BOUTON_PASSER_A_L_ABONNEMENT, PHRASE_CREATION_EN_COURS, PHRASE_GRATUITE_UTILISEE } from './quota-phrases'

/**
 * OÙ EN EST L'APPLI GRATUITE DE CE COMPTE (2026-11-22).
 *
 *   appNonPayee       — une appli livrée, non payée aujourd'hui : c'est elle
 *                        qu'on propose d'abonner (« Passer à l'abonnement ») ;
 *   gratuiteSupprimee — une appli SUPPRIMÉE qui n'a JAMAIS été payée.
 *
 * ── UNE SEULE APPLI GRATUITE, POUR TOUJOURS. MESURÉ le 2026-11-22 dans
 * `reserver_creation` (quota_creations.sql) : n'y comptent que les applis
 * `livree` non payées — une appli supprimée passe à `supprimee` et ne compte
 * plus. Supprimer son appli gratuite rendait donc une création gratuite.
 * Désormais une appli supprimée jamais payée consomme la gratuité à jamais.
 * Cette lecture se fait AVANT la réservation : une appli supprimée ne
 * réapparaît pas entre-temps, la course est tenue par le verrou SQL.
 * `null` = illisible : on ne crée rien.
 */
export type EtatGratuite = { readonly appNonPayee: string | null; readonly gratuiteSupprimee: boolean }

export async function etatDeLaGratuite(proprietaire: string): Promise<EtatGratuite | null> {
  try {
    const [g, c] = await Promise.all([
      supabaseAdmin.from(TABLE_GENERATIONS).select('id, statut').eq('owner_id', proprietaire).in('statut', ['livree', 'supprimee']),
      supabaseAdmin.from('app_compteurs').select('app_id, statut, paye_jusqu_au').eq('owner_id', proprietaire),
    ])
    if (g.error !== null || c.error !== null) return null
    const compteurs = new Map(((c.data ?? []) as { app_id: string; statut: string; paye_jusqu_au: string | null }[]).map((x) => [x.app_id, x]))
    const payeeMaintenant = (id: string): boolean => {
      const x = compteurs.get(id)
      return x !== undefined && x.statut === 'abonnee' && x.paye_jusqu_au !== null && Date.parse(x.paye_jusqu_au) > Date.now()
    }
    const jamaisPayee = (id: string): boolean => {
      const x = compteurs.get(id)
      return x === undefined || (x.statut !== 'abonnee' && x.paye_jusqu_au === null)
    }
    const lignes = (g.data ?? []) as { id: string; statut: string }[]
    return {
      appNonPayee: lignes.find((l) => l.statut === 'livree' && !payeeMaintenant(l.id))?.id ?? null,
      gratuiteSupprimee: lignes.some((l) => l.statut === 'supprimee' && jamaisPayee(l.id)),
    }
  } catch {
    return null
  }
}

export async function reserverCreation(proprietaire: string): Promise<ReservationCreation> {
  const r = await supabaseAdmin.rpc('reserver_creation', { p_owner: proprietaire })
  if (r.error !== null) return { ok: false, raison: 'indisponible', detail: r.error.message }
  if (r.data === null || r.data === undefined) return { ok: false, raison: 'occupee' }
  return { ok: true, id: String(r.data) }
}

/** Solde la réservation : `livree` avec l'appli, ou `liberee`. Ne lève jamais. */
export async function solderCreation(
  id: string,
  proprietaire: string,
  issue: 'livree' | 'liberee',
  app: string | null,
): Promise<{ ok: boolean; detail?: string }> {
  const r = await supabaseAdmin.rpc('solder_creation', { p_id: id, p_owner: proprietaire, p_issue: issue, p_app: app })
  return r.error === null ? { ok: true } : { ok: false, detail: r.error.message }
}

// ── CE QUE L'ATELIER AFFICHE (étape ③, 2026-11-19) — une LECTURE, sans effet.

// Le type `EtatCompteur` vit dans compteur-phrases.ts : l'atelier (navigateur)
// le lit sans jamais toucher à ce module, qui porte la clé de service.
export type { EtatCompteur }

/** Le prix mensuel en FCFA (réglage `prix_mensuel_xaf`), ou `null` s'il est vide ou illisible. */
export async function lirePrixMensuelXaf(): Promise<number | null> {
  const r = await supabaseAdmin.from('quota_reglages').select('valeur').eq('cle', 'prix_mensuel_xaf').maybeSingle()
  if (r.error !== null || r.data === null) return null
  const v = String((r.data as { valeur?: unknown }).valeur ?? '').trim()
  return /^[0-9]+$/u.test(v) && Number(v) > 0 ? Number(v) : null
}

/**
 * Plusieurs réglages lus EN UNE REQUÊTE (2026-11-21) : le prix et les frais
 * mobile money viennent du même instant. `null` = lecture impossible ; une clé
 * absente de la table est simplement absente du résultat.
 */
export async function lireReglagesTexte(cles: readonly string[]): Promise<Record<string, string> | null> {
  const r = await supabaseAdmin.from('quota_reglages').select('cle, valeur').in('cle', [...cles])
  if (r.error !== null || r.data === null) return null
  return Object.fromEntries((r.data as { cle: string; valeur: unknown }[]).map((l) => [l.cle, String(l.valeur ?? '')]))
}

/**
 * L'état du compteur d'une appli, tel que la réservation le verrait. Une appli
 * jamais comptée est « gratuite », avec le réglage du moment. `null` = illisible.
 */
export async function lireCompteur(app: string, proprietaire: string): Promise<EtatCompteur | null> {
  const c = await supabaseAdmin
    .from('app_compteurs')
    .select('statut, paye_jusqu_au, limite, supplement, utilisees')
    .eq('app_id', app)
    .eq('owner_id', proprietaire)
    .maybeSingle()
  if (c.error !== null) return null
  if (c.data === null) {
    const r = await supabaseAdmin.from('quota_reglages').select('valeur').eq('cle', 'modifications_gratuites').maybeSingle()
    const n = Number((r.data as { valeur?: string } | null)?.valeur ?? Number.NaN)
    if (r.error !== null || !Number.isInteger(n)) return null
    return { exempte: false, formule: 'gratuite', restantes: n, payeJusquAu: null, actif: false }
  }
  const l = c.data as { statut: string; paye_jusqu_au: string | null; limite: number; supplement: number; utilisees: number }
  const echu = l.statut === 'abonnee' && (l.paye_jusqu_au === null || Date.parse(l.paye_jusqu_au) <= Date.now())
  return {
    exempte: false,
    formule: l.statut === 'abonnee' ? 'abonnee' : 'gratuite',
    restantes: echu ? 0 : Math.max(0, l.limite + l.supplement - l.utilisees),
    payeJusquAu: l.paye_jusqu_au,
    actif: l.statut === 'abonnee' && !echu,
  }
}
