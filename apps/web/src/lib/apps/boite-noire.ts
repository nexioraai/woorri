import 'server-only'
/**
 * LA BOÎTE NOIRE D'UNE GÉNÉRATION OU D'UNE MODIFICATION (décision du propriétaire, 2026-11-23).
 *
 * « On ne corrige plus le générateur à l'aveugle. » Le diagnostic de la place
 * de marché (2026-11-22) a dû reconstituer la cause en lisant le code : la
 * réponse brute du modèle n'était conservée nulle part, ni la consigne envoyée
 * (colonnes `consigne` de app_generation_attempts posées, jamais écrites).
 *
 * Pour CHAQUE création et CHAQUE modification, la boîte noire garde, dans
 * l'ordre : la demande mot pour mot ; la lecture du cahier ; la consigne EXACTE
 * de chaque tour ; la réponse BRUTE de chaque tour ; ce que le code a gardé ou
 * écarté et pourquoi ; les contrôles ; modèle, jetons, coût, durée ; ce qui a
 * été livré et le message montré ; puis l'ANALYSE phrase par phrase.
 *
 * TROIS RÈGLES, TENUES PAR LES TESTS :
 *   · elle ne fait JAMAIS échouer le travail : `noter` et `enregistrer` ne
 *     lèvent jamais ; un échec d'écriture se dit dans le journal, c'est tout ;
 *   · AUCUN secret n'y entre : `sansSecrets` passe sur tout, avant l'écriture ;
 *   · sa taille est bornée : chaque texte à TAILLE_MAX_TEXTE signes, la ligne
 *     à TAILLE_MAX_LIGNE octets — une coupe se DIT (`tronquee`).
 * Elle vit dans NOTRE base (table app_boite_noire), jamais chez un tiers :
 * étude LangSmith du 2026-11-15, verdict NON, et préférence du propriétaire.
 * Lecture réservée au fondateur (routes /api/admin/boite-noire).
 */

import { createHash } from 'node:crypto'

export const TABLE_BOITE_NOIRE = 'app_boite_noire'

/** Combien de temps une boîte noire est gardée (règle proposée, 2026-11-23). */
export const JOURS_CONSERVATION = 90
/** Un texte (consigne, réponse brute) au-delà : coupé, et dit. */
export const TAILLE_MAX_TEXTE = 400_000
/** Une ligne entière au-delà : les réponses brutes des tours du milieu sont coupées d'abord. */
export const TAILLE_MAX_LIGNE = 3 * 1024 * 1024

export const TYPES_ETAPE = [
  'demande', 'lecture_cahier', 'consigne', 'reponse_brute', 'decisions', 'controles', 'mesures', 'livraison',
] as const
export type TypeEtape = (typeof TYPES_ETAPE)[number]

export type Etape = {
  readonly n: number
  readonly quand: string
  readonly type: TypeEtape
  readonly titre: string
  readonly donnees: unknown
}

export type NatureBoite = 'generation' | 'regeneration' | 'retouche'

// ── LES SECRETS. Deux filets : le NOM du champ, et la FORME de la valeur.
const NOM_SECRET = /^(cle|cles|key|apikey|api_key|secret|password|mot_?de_?passe|authorization|cookie|token|access_token|refresh_token|jeton_travailleur|publication_jeton|service_role|cle_secrete|clesecrete)$/iu
const FORMES_SECRETES: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/gu, // OpenAI / DeepSeek / Anthropic (sk-ant-…)
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,}/gu, // Stripe
  /\bwhsec_[A-Za-z0-9]{10,}/gu, // Stripe webhook
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}/gu, // Supabase
  /\bsbp_[A-Za-z0-9]{20,}/gu, // Supabase Management
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/gu, // JWT
  /\bre_[A-Za-z0-9_]{20,}/gu, // Resend
  /\bgh[pousr]_[A-Za-z0-9]{20,}/gu, // GitHub
  /\bAKIA[0-9A-Z]{16}\b/gu, // AWS
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gu,
]
const CONNEXION_AVEC_MOT_DE_PASSE = /(postgres(?:ql)?:\/\/[^\s:/@]+:)[^\s@]+@/gu
export const RETIRE = '[retiré]'

function nettoyerTexte(t: string): string {
  let s = t.replace(CONNEXION_AVEC_MOT_DE_PASSE, `$1${RETIRE}@`)
  for (const f of FORMES_SECRETES) s = s.replace(f, RETIRE)
  return s
}

/** La même valeur, sans aucun secret : par le nom du champ, puis par la forme. */
export function sansSecrets(v: unknown): unknown {
  if (typeof v === 'string') return nettoyerTexte(v)
  if (Array.isArray(v)) return v.map(sansSecrets)
  if (v !== null && typeof v === 'object') {
    const sortie: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      sortie[k] = NOM_SECRET.test(k) && (typeof x === 'string' || typeof x === 'number') && String(x) !== '' ? RETIRE : sansSecrets(x)
    }
    return sortie
  }
  return v
}

const octets = (v: unknown): number => Buffer.byteLength(JSON.stringify(v ?? null), 'utf8')

function couperTextes(v: unknown, max: number, coupe: { faite: boolean }): unknown {
  if (typeof v === 'string') {
    if (v.length <= max) return v
    coupe.faite = true
    return `${v.slice(0, max)}\n[… coupé : ${String(v.length - max)} signes de plus]`
  }
  if (Array.isArray(v)) return v.map((x) => couperTextes(x, max, coupe))
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, couperTextes(x, max, coupe)]))
  }
  return v
}

/** Borne les étapes : chaque texte, puis la ligne (réponses brutes du milieu d'abord). */
export function bornerEtapes(etapes: readonly Etape[]): { etapes: Etape[]; tronquee: boolean } {
  const coupe = { faite: false }
  let e: Etape[] = etapes.map((x) => ({ ...x, donnees: couperTextes(x.donnees, TAILLE_MAX_TEXTE, coupe) }))
  if (octets(e) <= TAILLE_MAX_LIGNE) return { etapes: e, tronquee: coupe.faite }
  // Les réponses brutes des tours du MILIEU d'abord : le premier et le dernier
  // disent le plus — ce qui a été tenté, et ce qui a été livré.
  const brutes = e.map((x, i) => (x.type === 'reponse_brute' ? i : -1)).filter((i) => i >= 0)
  for (const i of brutes.slice(1, -1)) {
    if (octets(e) <= TAILLE_MAX_LIGNE) break
    e = e.map((x, k) => (k === i ? { ...x, donnees: couperTextes(x.donnees, 20_000, coupe) } : x))
  }
  let max = 100_000
  while (octets(e) > TAILLE_MAX_LIGNE && max >= 2_000) {
    e = e.map((x) => ({ ...x, donnees: couperTextes(x.donnees, max, coupe) }))
    max = Math.floor(max / 2)
  }
  return { etapes: e, tronquee: true }
}

/** Le client minimal dont l'écriture a besoin — `supabaseAdmin` le satisfait. */
type Client = { from: (table: string) => { insert: (ligne: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> } }

export class BoiteNoire {
  private readonly etapes: Etape[] = []
  private readonly debut = new Date()

  constructor(private readonly o: { readonly nature: NatureBoite; compte: string | null }) {}

  /** Le compte se connaît parfois après l'ouverture (la retouche s'authentifie dedans). */
  definirCompte(compte: string): void { this.o.compte = compte }

  /** Note une étape. Ne lève jamais. */
  noter(type: TypeEtape, titre: string, donnees: unknown): void {
    try {
      this.etapes.push({ n: this.etapes.length + 1, quand: new Date().toISOString(), type, titre, donnees: sansSecrets(structuredClone(donnees)) })
    } catch (e) {
      console.error('[boite-noire] étape non notée', type, e instanceof Error ? e.message : e)
    }
  }

  /** Ce qui a été noté jusqu'ici (lecture). */
  lire(): readonly Etape[] { return this.etapes }

  /** Écrit la boîte. Ne lève JAMAIS : un échec se dit, le travail continue. */
  async enregistrer(client: Client, o: { readonly generationId: string | null; readonly issue: string; readonly analyse: unknown }): Promise<{ ok: boolean; erreur?: string }> {
    try {
      const borne = bornerEtapes(this.etapes)
      const analyse = sansSecrets(o.analyse ?? null)
      const ligne = {
        generation_id: o.generationId,
        nature: this.o.nature,
        compte: this.o.compte,
        issue: o.issue,
        debut_le: this.debut.toISOString(),
        fin_le: new Date().toISOString(),
        etapes: borne.etapes,
        analyse_phrases: analyse,
        tronquee: borne.tronquee,
        taille_octets: octets(borne.etapes) + octets(analyse),
        garder_jusqu_au: new Date(Date.now() + JOURS_CONSERVATION * 86_400_000).toISOString(),
      }
      const r = await client.from(TABLE_BOITE_NOIRE).insert(ligne)
      if (r.error !== null) {
        console.error('[boite-noire] non écrite', o.generationId, r.error.message)
        return { ok: false, erreur: r.error.message }
      }
      return { ok: true }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      console.error('[boite-noire] non écrite', o.generationId, m)
      return { ok: false, erreur: m }
    }
  }
}

/** L'empreinte d'une consigne (sa version) : 16 premiers signes du SHA-256. */
export function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16)
}
