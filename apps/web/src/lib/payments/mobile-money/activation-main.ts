import 'server-only'
/**
 * ACTIVER À LA MAIN UN PAIEMENT REÇU MAIS REFUSÉ CHEZ NOUS (lot L2, 2026-11-23).
 *
 * Le cas : MoneRails a encaissé, mais l'avis a été refusé (prix monté entre la
 * demande et l'avis, montant insuffisant, appli introuvable). Le fondateur
 * regarde, puis active. Garde-fous, dans l'ordre :
 *   ① seule une demande « refusée » s'active — jamais une autre ;
 *   ② jamais un encaissement de TEST : il n'y a pas d'argent derrière ;
 *   ③ le prestataire est RELU (lecture seule) : l'encaissement doit être réussi ;
 *   ④ l'écriture passe par `enregistrer_paiement`, source « manuelle », avec la
 *      RÉFÉRENCE du prestataire : un avis tardif ou le rattrapage tombent sur
 *      `deja_enregistre` — jamais deux activations. La trace dit qui a activé.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fournisseurMobileMoney } from './fournisseur'
import { registreDemandes, type RegistreDemandes } from './demandes'
import type { FournisseurMobileMoney } from './types'

export type IssueActivation =
  | { readonly ok: true; readonly statut: string }
  | { readonly ok: false; readonly status: number; readonly erreur: string }

export async function activerALaMain(
  id: string,
  par: string,
  o: { readonly registre?: RegistreDemandes; readonly fournisseur?: FournisseurMobileMoney; readonly enregistrer?: (p: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> } = {},
): Promise<IssueActivation> {
  const registre = o.registre ?? registreDemandes
  const d = await registre.lire(id)
  if (d === null) return { ok: false, status: 404, erreur: 'Demande inconnue.' }
  if (d.etat !== 'refusee') return { ok: false, status: 409, erreur: `Seule une demande refusée s’active à la main (celle-ci : ${d.etat}).` }
  if (d.test !== false || d.reference === null) return { ok: false, status: 409, erreur: 'Un paiement de test ne s’active pas : il n’y a pas d’argent derrière.' }
  // Une demande réelle se relit avec la clé LIVE (lot L3).
  const e = await (o.fournisseur ?? fournisseurMobileMoney('reel')).lire(d.reference)
  if (e.etat !== 'reussi' || e.test) return { ok: false, status: 409, erreur: `Le prestataire ne confirme pas ce paiement (état : ${e.etat}${e.test ? ', test' : ''}).` }
  const enregistrer = o.enregistrer ?? ((p) => supabaseAdmin.rpc('enregistrer_paiement', p) as unknown as Promise<{ data: unknown; error: { message: string } | null }>)
  const r = await enregistrer({
    p_source: 'manuelle', p_fournisseur: d.fournisseur, p_reference: d.reference,
    p_app: d.app_id, p_owner: d.owner_id, p_objet: 'abonnement',
    p_montant: e.montant, p_devise: 'XAF', p_jusqu_au: null, p_saisi_par: `activation-main:${par}`,
    // Les frais : ce qui dépasse le prix CONNU À LA DEMANDE, jamais négatifs.
    p_frais: Math.max(0, Math.min(e.montant, e.montant - d.prix)),
  })
  if (r.error !== null) return { ok: false, status: 500, erreur: `Le registre a refusé : ${r.error.message}` }
  await registre.marquerActivee(id, par)
  return { ok: true, statut: (r.data as { statut?: string } | null)?.statut ?? 'enregistre' }
}
