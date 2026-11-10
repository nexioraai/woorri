import type { Bloc } from '../pages/blocs'
import { liensCites } from '@/lib/assistant/liens'

// ============================================================================
// LOT 17 — LES TEXTES DE LA BULLE, MODIFIABLES DANS L'ÉDITEUR.
//
// Ils vivent dans une page NON PUBLIÉE au chemin `assistant-du-site` :
//   · le TITRE de la page   → l'en-tête de la bulle (« Assistant CPA ») ;
//   · son INTRODUCTION      → le message d'accueil ;
//   · un bloc QUESTIONS     → les boutons de sujets : la question est le
//     libellé du bouton, la réponse est ce que la bulle répond.
// Une adresse du site écrite dans une réponse (« /inscription ») devient un
// bouton de lien — SEULEMENT si elle est connue du site. Rien de tout ça ne
// part chez le fournisseur d'IA : ces réponses sont gratuites.
//
// Page absente, ou champ vide : la bulle garde ses mots par défaut.
// ============================================================================

export const CHEMIN_ASSISTANT = 'assistant-du-site'

export type Lien = { chemin: string; titre: string }
export type SujetAssistant = { label: string; reponse: string; liens: Lien[] }
export type TextesAssistant = { titre?: string; accueil?: string; sujets?: SujetAssistant[] }

export function textesDepuisPage(
  page: { titre?: string | null; chapeau?: string | null; blocs: Bloc[] } | null,
  connus: Map<string, string>,
): TextesAssistant {
  if (!page) return {}
  const out: TextesAssistant = {}
  if (page.titre?.trim()) out.titre = page.titre.trim()
  if (page.chapeau?.trim()) out.accueil = page.chapeau.trim()
  const q = page.blocs.find((b): b is Extract<Bloc, { type: 'questions' }> => b.type === 'questions')
  const sujets = (q?.items ?? [])
    .filter((i) => i.question.trim() && i.reponse.trim())
    .map((i) => ({ label: i.question.trim(), reponse: i.reponse.trim(), liens: liensCites(i.reponse, connus) }))
  if (sujets.length > 0) out.sujets = sujets
  return out
}
