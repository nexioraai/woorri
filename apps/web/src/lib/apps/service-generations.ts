/**
 * ETAGE 4 — LE SERVICE DES GENERATIONS, TESTABLE SANS UN CENTIME.
 *
 * ── POURQUOI UN SERVICE ET PAS DU CODE DANS LES ROUTES.
 *
 * Les routes Next importent `supabaseAdmin` au niveau module : les tester
 * exigerait de bouchonner des modules. Ici TOUT est injecte — la base, le
 * travailleur, l'environnement — et chaque chemin se prouve avec le harnais
 * maison et un moteur scripte. Les routes ne sont que des coutures.
 *
 * ── LA GARANTIE DE DEPENSE, MECANIQUE.
 *
 * `tournerUneTranche` verifie GO_EMISSION_IA AVANT de toucher quoi que ce
 * soit : desarme (defaut livre), il rend `desarme` sans UN appel a la base
 * ni au moteur — prouve par un harnais qui compte les appels. Meme deploye,
 * l'etage 4 ne PEUT pas depenser tant que le proprietaire n'arme pas.
 */
import type { creerTravailleur, RapportTranche } from './travailleur'

type Travailleur = ReturnType<typeof creerTravailleur>

/** Depose une demande — une ligne `en_attente`, AUCUN moteur lance. Le
 *  travailleur recu par la route porte un moteur SENTINELLE qui jette :
 *  si un depot lancait une emission, le test le verrait exploser. */
export async function deposerGeneration({
  travailleur,
  demande,
  nom,
  email,
  proprietaire,
}: {
  travailleur: Pick<Travailleur, 'deposer'>
  demande: string
  nom: string
  email: string | null
  /** L'identite du jeton (dette 6a) — l'email n'est qu'un affichage. */
  proprietaire: string
}): Promise<string> {
  const propre = demande.trim()
  if (propre === '') throw new Error('DEMANDE_VIDE')
  return travailleur.deposer({ demande: propre, nom, email, proprietaire })
}

/**
 * Une tranche du cron. L'ordre des gardes EST la garantie :
 * ① kill-switch (zero appel de quoi que ce soit s'il est desarme) ;
 * ② puis seulement le balayage, qui peut payer.
 */
export async function tournerUneTranche({
  travailleur,
  env,
}: {
  travailleur: Pick<Travailleur, 'tourner'>
  env: Record<string, string | undefined>
}): Promise<{ desarme: boolean; rapports: readonly RapportTranche[] }> {
  if (env.GO_EMISSION_IA !== '1') {
    return { desarme: true, rapports: [] }
  }
  return { desarme: false, rapports: await travailleur.tourner() }
}

/** La surface de lecture dont l'ecran a besoin — restreinte au proprietaire. */
export type EtatGeneration = {
  readonly id: string
  readonly statut: 'en_attente' | 'en_cours' | 'livree' | 'refusee'
  readonly etape: string | null
  readonly nom: string | null
  readonly coutUsd: number
  readonly diagnostics: readonly string[]
  readonly aDocument: boolean
}

export type BaseLecture = {
  from: (table: string) => {
    select: (colonnes: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
        }
      }
    }
  }
}

export async function etatGeneration({
  base,
  table,
  id,
  proprietaire,
}: {
  base: BaseLecture
  table: string
  id: string
  proprietaire: string
}): Promise<EtatGeneration | null> {
  const r = await base
    .from(table)
    .select('id, statut, etape, nom, cout_usd, diagnostics, document')
    .eq('id', id)
    .eq('owner_id', proprietaire) // dette 6a : l'IDENTITE est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null) return null
  const l = r.data
  return {
    id: String(l.id),
    statut: l.statut as EtatGeneration['statut'],
    etape: l.etape === null || l.etape === undefined ? null : String(l.etape),
    nom: l.nom === null || l.nom === undefined ? null : String(l.nom),
    coutUsd: Number(l.cout_usd ?? 0),
    diagnostics: Array.isArray(l.diagnostics) ? (l.diagnostics as string[]) : [],
    aDocument: l.document !== null && l.document !== undefined,
  }
}
