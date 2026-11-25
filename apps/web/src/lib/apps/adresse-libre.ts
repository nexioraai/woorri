import 'server-only'
/**
 * L'ADRESSE PROPOSÉE EST TOUJOURS LIBRE (défaut mesuré le 2026-11-24).
 *
 * Mesuré : la fenêtre « Publier » proposait `gestion-pharmacie` alors qu'une
 * autre appli la détenait. La route la refusait à la validation (409 « déjà
 * pris ») — jamais acceptée, mais PROPOSÉE : la personne devait deviner une
 * autre adresse. La proposition passe maintenant par la MÊME règle que la
 * route (`refusDuNom` : format, autre appli — pierres tombales comprises —,
 * site) : la première adresse libre parmi `nom`, `nom-2` … `nom-9` ; aucune
 * libre → rien de proposé, la personne choisit.
 *
 * `verifierAdresse` sert aussi la vérification EN DIRECT de la fenêtre, avec
 * des phrases claires (accents compris) au lieu du message brut de la route.
 */
import { refusDuNom } from '@/lib/apps/publier-oeuvre'
import { adresseDeSecours, adresseProposee } from '@/lib/apps/nom-produit'

export type VerificationAdresse =
  | { readonly libre: true }
  | { readonly libre: false; readonly raison: 'format' | 'prise_appli' | 'prise_site'; readonly message: string }

export const PHRASE_ADRESSE_FORMAT = 'Cette adresse n’est pas utilisable : minuscules, chiffres et tirets, de 3 à 40 signes, sans nom réservé.'
export const phraseAdressePrise = (sous: string, par: 'appli' | 'site') =>
  `« ${sous} » est déjà prise par ${par === 'site' ? 'un site' : 'une autre application'}. Choisissez-en une autre.`

export async function verifierAdresse(id: string, sous: string): Promise<VerificationAdresse> {
  if (sous === '') return { libre: false, raison: 'format', message: PHRASE_ADRESSE_FORMAT }
  const refus = await refusDuNom(id, sous)
  if (refus === null) return { libre: true }
  if (refus.status === 400) return { libre: false, raison: 'format', message: PHRASE_ADRESSE_FORMAT }
  const d = (await refus.json().catch(() => ({}))) as { error?: unknown }
  const site = /par un site/u.test(String(d.error ?? ''))
  return { libre: false, raison: site ? 'prise_site' : 'prise_appli', message: phraseAdressePrise(sous, site ? 'site' : 'appli') }
}

/** La première adresse LIBRE tirée du nom de l'appli ; `''` s'il n'y en a pas. */
export async function adresseLibreProposee(id: string, nom: string): Promise<string> {
  const base = adresseProposee(nom)
  if (base === '') return ''
  const candidats: string[] = []
  adresseDeSecours(nom, (a) => { candidats.push(a); return true })
  for (const c of candidats) {
    if ((await verifierAdresse(id, c)).libre) return c
  }
  return ''
}
