import 'server-only'
/**
 * REMBOURSER UN PAIEMENT MOBILE MONEY (2026-11-23) — le fondateur seul.
 *
 * L'ARGENT : le fondateur le renvoie LUI-MÊME depuis le tableau de bord
 * MoneRails (un paiement sortant vers le numéro du client). CE CODE N'ENVOIE
 * RIEN — aucun appel au prestataire ici. Il ÉCRIT, par
 * `annuler_paiement_mobile_money` (mobile_money_remboursement.sql) :
 *   · une ligne « annulation » qui pointe le paiement d'origine, avec la
 *     référence du paiement sortant et le nom de qui l'a saisie ;
 *   · la coupure : échéance = maintenant, appli dépubliée si c'était le
 *     dernier paiement.
 *
 * Garde-fous, dans l'ordre : demande connue ; jamais un paiement de TEST ;
 * seulement une demande PAYÉE (« reussie » ou « activee_main ») ; une
 * référence de paiement sortant lisible ; un montant entier, de 1 au montant
 * payé. Le même remboursement redemandé ne fait rien (« deja_annule »).
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { registreDemandes, type RegistreDemandes } from './demandes'

/** La forme d'une référence de paiement sortant (la même que la base). */
export const FORME_PAIEMENT_SORTANT = /^[A-Za-z0-9_:-]{4,100}$/u
const PAYEES: ReadonlySet<string> = new Set(['reussie', 'activee_main'])

export type IssueRemboursement =
  | { readonly ok: true; readonly effet: 'annule' | 'deja_annule'; readonly derniere: boolean }
  | { readonly ok: false; readonly status: number; readonly erreur: string }

type Annuler = (p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

export async function rembourserALaMain(
  e: { readonly id: string; readonly par: string; readonly paiementSortant: string; readonly montant: number },
  o: { readonly registre?: RegistreDemandes; readonly annuler?: Annuler } = {},
): Promise<IssueRemboursement> {
  const d = await (o.registre ?? registreDemandes).lire(e.id)
  if (d === null) return { ok: false, status: 404, erreur: 'Demande inconnue.' }
  if (d.test !== false || d.reference === null) return { ok: false, status: 409, erreur: 'Un paiement de test ne se rembourse pas : il n’y a pas d’argent derrière.' }
  if (!PAYEES.has(d.etat)) return { ok: false, status: 409, erreur: `Seul un paiement reçu se rembourse (celui-ci : ${d.etat}).` }
  const sortant = e.paiementSortant.trim()
  if (!FORME_PAIEMENT_SORTANT.test(sortant)) return { ok: false, status: 400, erreur: 'Indiquez la référence du paiement sortant fait dans MoneRails.' }
  if (!Number.isInteger(e.montant) || e.montant < 1 || e.montant > d.montant) {
    return { ok: false, status: 400, erreur: `Le montant remboursé va de 1 à ${String(d.montant)} FCFA.` }
  }
  const annuler: Annuler = o.annuler ?? ((p) => supabaseAdmin.rpc('annuler_paiement_mobile_money', p) as unknown as ReturnType<Annuler>)
  const r = await annuler({ p_fournisseur: d.fournisseur, p_reference: d.reference, p_payout: sortant, p_montant: e.montant, p_par: e.par })
  if (r.error !== null) return { ok: false, status: 500, erreur: `Le registre a refusé : ${r.error.message}` }
  const v = (r.data ?? {}) as { statut?: string; derniere?: boolean }
  if (v.statut === 'paiement_inconnu') return { ok: false, status: 409, erreur: 'Aucun paiement enregistré pour cette demande : rien n’est annulé.' }
  if (v.statut !== 'annule' && v.statut !== 'deja_annule') return { ok: false, status: 500, erreur: `Réponse inattendue du registre : ${String(v.statut)}` }
  return { ok: true, effet: v.statut, derniere: v.derniere === true }
}
