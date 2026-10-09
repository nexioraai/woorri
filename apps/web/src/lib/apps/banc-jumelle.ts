/**
 * LE BANC D'ESSAI DE LA JUMELLE — la separation mecanique qui manquait.
 *
 * ── LA LECON (2026-10-09, payee ~6,9 $).
 *
 * La jumelle servait DEUX usages incompatibles sans cliquet pour les
 * separer : banc d'essai a blanc (purgeable a volonte) ET entrepot d'etat
 * paye (a ne jamais toucher). Le harnais a blanc faisait
 * `delete().not('id','is',null)` — purge TOTALE — et a efface une ligne
 * payee garee `en_attente` (air valide, 44 diagnostics, 6,87 $ d'acquis).
 * L'etat ne vivait que dans la table : perdu.
 *
 * ── LA REGLE, TENUE PAR IMPOSSIBILITE.
 *
 * Toute ligne creee par le banc porte `owner_email = EMAIL_BANC`. La purge
 * n'existe QUE sous la forme `delete().eq('owner_email', EMAIL_BANC)` — il
 * n'y a mecaniquement AUCUN chemin par lequel elle atteint une ligne qui
 * n'est pas au banc. Un cliquet interdit tout autre `.delete(` dans
 * lib/apps, et le motif de purge totale partout.
 *
 * La purge n'etait pas le seul chemin : le BALAYAGE aussi (`saisir` prend
 * la plus ancienne `en_attente`, quelle qu'elle soit — un moteur scripte
 * ECRASERAIT une ligne payee par UPDATE legal). D'ou l'option `perimetre`
 * du travailleur, et LE TEMOIN ci-dessous qui alarme sur les deux chemins.
 *
 * ── LE TEMOIN PERMANENT.
 *
 * Une ligne `en_attente` ETRANGERE au banc, aux valeurs figees, posee en
 * PREMIER — donc la plus ancienne : tout balayage non filtre la frapperait
 * immediatement, toute purge sauvage l'effacerait. Chaque passage du
 * harnais la verifie intacte en FIN de batterie. Ce n'est pas une
 * promesse de revue de code : c'est une alarme comportementale posee dans
 * la table elle-meme.
 */

/** Le proprietaire de TOUTES les lignes du banc — et de rien d'autre. */
export const EMAIL_BANC = 'banc@jumelle.test'

/** La ligne-temoin : etrangere au banc, immuable, surveillee. */
export const TEMOIN = {
  id: '00000000-0000-4000-8000-000000000001',
  owner_email: 'temoin@jumelle.test',
  demande:
    'TEMOIN PERMANENT — ligne etrangere au banc, aux valeurs figees : ' +
    'sa disparition signe une purge sauvage, sa modification un balayage non filtre',
  nom: 'temoin',
  statut: 'en_attente',
  ok: false,
  cout_usd: 9.99,
  sections_acquises: { phase: 'reparation', temoin: true },
} as const

/** La surface minimale — injectee, jamais importee, comme au travailleur. */
type BasePurgeable = { from: (table: string) => unknown }

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

/**
 * LA SEULE PURGE AUTORISEE : les lignes du banc, rien d'autre.
 * Refuse toute table qui n'est pas une table de test — double verrou.
 */
export async function purgerBanc(base: BasePurgeable, table: string): Promise<void> {
  if (!table.endsWith('_test')) {
    throw new Error(`PURGE_HORS_BANC: « ${table} » n'est pas une table de test`)
  }
  const r = await (base.from(table) as any).delete().eq('owner_email', EMAIL_BANC)
  if (r.error !== null && r.error !== undefined) {
    throw new Error(`PURGE_BANC_ECHOUEE: ${String(r.error.message)}`)
  }
}

/** Pose le temoin s'il n'existe pas — jamais re-ecrit : une alteration doit
 *  rester VISIBLE, pas etre reparee en silence. */
export async function poserTemoin(base: BasePurgeable, table: string): Promise<void> {
  if (!table.endsWith('_test')) {
    throw new Error(`TEMOIN_HORS_BANC: « ${table} » n'est pas une table de test`)
  }
  const existe = await (base.from(table) as any).select('id').eq('id', TEMOIN.id)
  if (Array.isArray(existe.data) && existe.data.length === 1) return
  const r = await (base.from(table) as any).insert({ ...TEMOIN })
  if (r.error !== null && r.error !== undefined) {
    throw new Error(`TEMOIN_NON_POSE: ${String(r.error.message)}`)
  }
}

/** Le temoin est-il EXACTEMENT ce qu'on a pose ? Rendu avec le detail, pour
 *  que l'alarme DISE ce qui a bouge. */
export async function verifierTemoin(
  base: BasePurgeable,
  table: string,
): Promise<{ intact: boolean; detail: string }> {
  const r = await (base.from(table) as any).select('*').eq('id', TEMOIN.id)
  const ligne = Array.isArray(r.data) ? r.data[0] : undefined
  if (ligne === undefined) return { intact: false, detail: 'DISPARU — purge sauvage' }
  const j = ligne.sections_acquises as { phase?: string; temoin?: boolean } | null
  const ecarts: string[] = []
  if (ligne.statut !== TEMOIN.statut) ecarts.push(`statut=${String(ligne.statut)}`)
  if (Number(ligne.cout_usd) !== TEMOIN.cout_usd) ecarts.push(`cout=${String(ligne.cout_usd)}`)
  if (ligne.demande !== TEMOIN.demande) ecarts.push('demande alteree')
  if (ligne.jeton_travailleur !== null) ecarts.push('jeton pose — ligne SAISIE par un balayeur')
  if (j?.temoin !== true || j.phase !== 'reparation') ecarts.push('etat altere')
  return ecarts.length === 0
    ? { intact: true, detail: 'intact' }
    : { intact: false, detail: ecarts.join(' · ') }
}
