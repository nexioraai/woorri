/**
 * LE CLIENT IA DES ROUTES — UN SEUL ENDROIT QUI SAIT QUI RÉPOND.
 *
 * Douze routes construisaient `new Anthropic({ apiKey: ANTHROPIC_API_KEY })`
 * en dur. Le crédit Anthropic est tombé à zéro le 2026-10-18 et toutes sont
 * mortes ensemble : un produit dont la seule porte est fermée n'a plus de
 * porte.
 *
 * DeepSeek sert une API COMPATIBLE `anthropic_messages` — déclaré par son
 * propre catalogue. Le SDK Anthropic lui parle donc sans qu'une ligne
 * d'appel change : seules la base et la clé bougent, et elles vivent ici.
 *
 * Le modèle ne se choisit plus non plus dans les routes : `MODELE_LEGER`
 * suit le fournisseur. Une route qui écrirait un nom de modèle en dur
 * casserait au prochain changement de catalogue — c'est déjà arrivé avec
 * `deepseek-chat`, retiré du service.
 */
import Anthropic from '@anthropic-ai/sdk'
import { CONFIGS, fournisseurChoisi } from '@/lib/apps/fournisseur'

const F = fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)
const C = CONFIGS[F]

/** Le modèle des tâches courtes : dialogues, questions, classements. */
export const MODELE_LEGER = C.modeleLeger

/** Le modèle lourd : il écrit des applications entières. */
export const MODELE_LOURD = C.modele

/** Quel fournisseur répond — pour journaliser, jamais pour brancher. */
export const FOURNISSEUR = F

export function clientIA(): Anthropic {
  const cle = process.env[C.variableCle] ?? ''
  if (cle === '') throw new Error(`${C.variableCle} absente du serveur`)
  return new Anthropic({
    apiKey: cle,
    ...(C.baseURL === undefined ? {} : { baseURL: `${C.baseURL}/anthropic` }),
  })
}
