/**
 * LE TÉMOIN EN BASE — poser une ligne jetable sur la VRAIE table, mesurer,
 * la retirer quoi qu'il arrive.
 *
 * ── POURQUOI CETTE PROCÉDURE EXISTE (arbitrage du propriétaire, 2026-11-01).
 *
 * Une suppression a échoué devant lui avec un message sans cause. Retrouver
 * l'erreur exacte — `23514 violates check constraint
 * "app_generations_statut_valide"` — a exigé d'écrire une ligne sur la table
 * de production : aucune autre source ne la donnait (la table jumelle est en
 * retard de trois colonnes, et il n'existe aucun chemin SQL depuis ici).
 *
 * Son verdict : « un moyen de mesure trop utile pour être interdit, trop
 * dangereux pour rester officieux ». D'où les quatre règles ci-dessous, qui
 * sont dans le CODE et pas dans une intention.
 *
 * ── LES QUATRE RÈGLES, TENUES PAR LA MÉCANIQUE.
 *
 * ① PROPRIÉTAIRE FICTIF, UNIQUEMENT. `PROPRIETAIRE_TEMOIN` est un UUID
 *   réservé qui n'appartient à personne. Toute écriture porte `owner_id` =
 *   cette valeur, et tout retrait filtre dessus : une ligne d'un vrai
 *   propriétaire ne peut pas être atteinte, même par une erreur de ma part.
 *
 * ② NETTOYAGE GARANTI, MÊME EN CAS D'ERREUR. `avecTemoin` enveloppe la
 *   mesure dans un `try/finally` : une exception, une assertion ratée, un
 *   `process.exit` dans la mesure — le retrait a déjà lieu. Et le retrait
 *   est VÉRIFIÉ : on relit, et on crie si la ligne survit.
 *
 * ③ JOURNALISÉ. Chaque pose et chaque retrait s'impriment avec l'horodatage
 *   et l'identifiant. Une mesure sur la base de production laisse une trace
 *   lisible, sinon personne ne peut savoir après coup ce qui a été touché.
 *
 * ④ BALAYAGE D'OUVERTURE. Avant de poser, on retire les témoins qu'une
 *   exécution tuée (Ctrl-C, coupure) aurait laissés : le `finally` ne
 *   protège pas d'un SIGKILL. Sans ce balayage, la table accumulerait des
 *   fantômes que personne ne reconnaîtrait.
 *
 * ── CE QUE CETTE PROCÉDURE N'EST PAS.
 *
 * Elle ne remplace pas la table jumelle. Une jumelle à jour reste la bonne
 * façon d'éprouver un schéma ; ce témoin sert à mesurer ce que la VRAIE base
 * répond, quand la question porte précisément sur elle.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

/** Un propriétaire qui n'existe pas, et n'existera jamais. */
export const PROPRIETAIRE_TEMOIN = '00000000-0000-0000-0000-0000000000ff'

/** Ce qui rend un témoin reconnaissable à l'œil dans la table. */
export const MARQUE_TEMOIN = 'TÉMOIN JETABLE — mesure de schéma'

function journal(quoi, detail) {
  console.log(`[témoin ${new Date().toISOString()}] ${quoi}`, detail ?? '')
}

export function clientAdmin(racine = '.') {
  const env = {}
  for (const ligne of readFileSync(`${racine}/.env.local`, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(ligne.trim())
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('clefs Supabase absentes de .env.local')
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

/** ④ Les fantômes d'une exécution tuée avant son `finally`. */
async function balayer(sb, table) {
  const r = await sb.from(table).delete().eq('owner_id', PROPRIETAIRE_TEMOIN).select('id')
  if (r.error !== null) {
    journal('balayage impossible', r.error.message)
    return
  }
  if ((r.data ?? []).length > 0) {
    journal('fantômes retirés', (r.data ?? []).map((x) => x.id).join(', '))
  }
}

/**
 * Pose un témoin, exécute `mesure(id, sb)`, et le retire QUOI QU'IL ARRIVE.
 *
 * `champs` complète la ligne : un témoin doit pouvoir imiter une œuvre
 * livrée, publiée, nommée — c'est tout l'intérêt. Les contraintes de la
 * table s'appliquent à lui comme aux autres, et c'est précisément ce qu'on
 * vient mesurer.
 */
export async function avecTemoin({ table = 'app_generations', champs = {}, mesure }) {
  const sb = clientAdmin()
  await balayer(sb, table)

  const ins = await sb
    .from(table)
    .insert({ owner_id: PROPRIETAIRE_TEMOIN, demande: MARQUE_TEMOIN, ...champs })
    .select('id')
    .maybeSingle()
  if (ins.error !== null) {
    journal('pose REFUSÉE', JSON.stringify(ins.error))
    throw new Error(`témoin non posé : ${ins.error.message}`)
  }
  const id = ins.data.id
  journal('posé', `${table} / ${id}`)

  try {
    return await mesure(id, sb)
  } finally {
    // ② LE RETRAIT A LIEU MÊME SI LA MESURE A JETÉ — et il est VÉRIFIÉ :
    // annoncer un retrait sans le relire serait exactement le genre
    // d'affirmation que le protocole interdit.
    const del = await sb.from(table).delete().eq('id', id).eq('owner_id', PROPRIETAIRE_TEMOIN)
    const reste = await sb.from(table).select('id').eq('id', id).maybeSingle()
    if (del.error !== null || reste.data !== null) {
      journal('⚠ RETRAIT RATÉ — LIGNE SURVIVANTE', `${id} : ${del.error?.message ?? 'relecture non nulle'}`)
    } else {
      journal('retiré', id)
    }
  }
}
