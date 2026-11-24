import 'server-only'
/**
 * LE RATTRAPAGE DES AVIS PERDUS (lot L2, 2026-11-23).
 *
 * MoneRails renvoie un avis 8 fois sur environ 42 h, puis l'abandonne. Un avis
 * perdu au-delà laissait un client PAYÉ sans activation. Une tâche planifiée
 * relit donc, CHEZ LE PRESTATAIRE, chaque demande restée ouverte, et la règle
 * par le MÊME chemin qu'un avis (`traiterEtNoterAvis`).
 *
 *   · LECTURE chez MoneRails (`GET /v1/collections/{id}`), jamais d'écriture ;
 *   · ÉCRITURE chez nous seulement : le journal, et le registre par
 *     `enregistrer_paiement`, qui refuse une référence déjà inscrite — un avis
 *     arrivé entre-temps et le rattrapage ne font JAMAIS deux activations ;
 *   · une demande sans issue après 72 h est close « abandonnée », dite.
 */
import { fournisseurMobileMoney } from './fournisseur'
import { traiterEtNoterAvis } from './encaissement'
import { registreDemandes, type RegistreDemandes } from './demandes'
import type { AvisVerifie, FournisseurMobileMoney } from './types'

/** Au-delà, une demande sans issue n'en aura plus : elle est close. */
export const RATTRAPAGE_MAX_MS = 72 * 3600_000
/** On ne relit pas ce qui a moins de 2 minutes : l'avis normal a sa chance. */
export const RATTRAPAGE_MIN_MS = 2 * 60_000
const FINAUX: ReadonlySet<string> = new Set(['reussi', 'echoue', 'expire'])

export type BilanRattrapage = {
  readonly relues: number
  readonly reglees: { readonly reference: string; readonly issue: string }[]
  readonly encoreOuvertes: number
  readonly abandonnees: number
  readonly illisibles: { readonly reference: string; readonly erreur: string }[]
}

export async function rattraper(o: {
  readonly fournisseur?: FournisseurMobileMoney
  readonly registre?: RegistreDemandes
  readonly traiter?: typeof traiterEtNoterAvis
  readonly maintenantMs?: number
} = {}): Promise<BilanRattrapage> {
  // LE MODE DE CHAQUE DEMANDE (lot L3) : une demande réelle se relit avec la
  // clé live, une demande de test avec la clé de test.
  const fPour = (test: boolean | null) => o.fournisseur ?? fournisseurMobileMoney(test === false ? 'reel' : 'test')
  const registre = o.registre ?? registreDemandes
  const traiter = o.traiter ?? traiterEtNoterAvis
  const maintenant = o.maintenantMs ?? Date.now()
  // Une semaine en arrière : ce qui a passé 72 h sans issue est clos ici.
  const demandes = await registre.aRattraper(new Date(maintenant - 7 * 24 * 3600_000).toISOString())
  const bilan = { relues: 0, reglees: [] as { reference: string; issue: string }[], encoreOuvertes: 0, abandonnees: 0, illisibles: [] as { reference: string; erreur: string }[] }
  for (const d of demandes) {
    const age = maintenant - Date.parse(d.cree_le)
    if (d.reference === null || age < RATTRAPAGE_MIN_MS) continue
    bilan.relues += 1
    let e
    try { e = await fPour(d.test).lire(d.reference) } catch (x) {
      bilan.illisibles.push({ reference: d.reference, erreur: x instanceof Error ? x.message : String(x) })
      continue
    }
    if (!FINAUX.has(e.etat)) {
      if (age > RATTRAPAGE_MAX_MS) {
        await registre.abandonner(d.id, `sans issue après 72 h (état chez le prestataire : ${e.etat})`)
        bilan.abandonnees += 1
      } else bilan.encoreOuvertes += 1
      continue
    }
    // LE MÊME CHEMIN QU'UN AVIS : les mêmes vérifications, la même idempotence.
    const avis: AvisVerifie = { id: `rattrapage:${d.reference}`, type: e.etat === 'reussi' ? 'encaissement_reussi' : 'encaissement_echoue', encaissement: e }
    const issue = await traiter(avis, d.fournisseur, { registre })
    bilan.reglees.push({ reference: d.reference, issue: issue.issue })
  }
  return bilan
}
