// POUR LES TESTS : l'institution de la CPA, dans chaque langue — avec elle,
// les mots sont, au caractère près, ceux d'avant le lot 2 (2026-11-26).
import { institution, type Institution } from '@/lib/sites/institution'

export const DESIGNATION_CPA: Readonly<Record<string, string>> = { fr: 'la Centrale', en: 'the Centrale', es: 'la Central', ar: 'المركزية' }

export function cpa(lang: string | null | undefined): Institution {
  const l = (lang ?? 'fr').slice(0, 2).toLowerCase()
  return institution(l in DESIGNATION_CPA ? l : 'fr', DESIGNATION_CPA[l] ?? DESIGNATION_CPA.fr)
}
