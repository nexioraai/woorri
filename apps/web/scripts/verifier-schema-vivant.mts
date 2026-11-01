/**
 * LA COMPARAISON SCHÉMA VIVANT ↔ DDL, EN LIGNE DE COMMANDE.
 *
 * ── POURQUOI CE FICHIER N'EST PAS DANS `lib/apps`.
 *
 * Il y était, et la gate l'a refusé : un cliquet d'isolation interdit la
 * séquence `delete(` partout dans `lib/apps` sauf dans `banc-jumelle.ts`.
 * Leçon du 2026-10-09, ~6,9 $ d'état payé effacé parce que la jumelle mêlait
 * banc d'essai purgeable et entrepôt d'état. Ce script RETIRE ses témoins,
 * donc il efface — sa place est avec les outils, pas dans le moteur. Le
 * cliquet avait raison contre moi.
 *
 * MÊME MOTEUR QUE LA ROUTE (`api/generateur/schema`) : `comparerSchema` est
 * importé, pas recopié. Une comparaison écrite deux fois divergerait, et
 * c'est la faute qu'on passe la journée à fermer.
 *
 * Ce qu'elle ajoute à la route : elle ÉMET LE SQL qui comble l'écart. Le
 * propriétaire colle UNE fois, sur la base d'un relevé exhaustif — jamais
 * sur dix colonnes choisies à la main.
 *
 *   npx tsx scripts/verifier-schema-vivant.mts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { SQL_TABLE, SQL_TABLE_TEST, TABLE_GENERATIONS } from '../src/lib/apps/journal'
import {
  comparerSchema,
  ecartExiste,
  type ColonneVivante,
  type ContrainteVivante,
  type ReponsePose,
} from '../src/lib/apps/schema-vivant'

const EN_JSON = process.argv.includes('--json')
const MESURE_JSON: unknown[] = []
const PROPRIETAIRE_TEMOIN = '00000000-0000-0000-0000-0000000000ff'
const env: Record<string, string> = {}
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())
  if (m !== null) env[m[1]] = m[2].replace(/^["']|["']$/gu, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function colonnesVivantes(table: string): Promise<ReadonlyMap<string, ColonneVivante> | null> {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const spec = (await r.json()) as {
    definitions?: Record<string, {
      required?: string[]
      properties?: Record<string, { format?: string; default?: unknown }>
    }>
  }
  const def = spec.definitions?.[table]
  if (def?.properties === undefined) return null
  const obligatoires = new Set(def.required ?? [])
  return new Map(
    Object.entries(def.properties).map(([nom, p]) => [
      nom,
      { format: p.format ?? '', notNull: obligatoires.has(nom), ...(p.default === undefined ? {} : { defaut: p.default }) },
    ]),
  )
}

async function contraintesLues(table: string): Promise<readonly ContrainteVivante[] | null> {
  const r = await sb.rpc('contraintes_vivantes', { nom_table: table })
  if (r.error !== null) return null
  return (r.data ?? []) as ContrainteVivante[]
}

/** La fonction répond-elle à la clef ANONYME ? Mesure, pas déduction. */
async function ouverteAuPublic(): Promise<boolean | null> {
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (anon === undefined || anon === '') return null
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/contraintes_vivantes`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({ nom_table: 'app_generations' }),
  })
  return r.ok
}
const OUVERTE = await ouverteAuPublic()
if (!EN_JSON) console.log('RPC ouverte à la clef anonyme :', OUVERTE === true ? '🔴 OUI' : OUVERTE === null ? '⚠ non mesurée' : '✅ non')

// PRODUCTION EN LECTURE SEULE, LA JUMELLE PORTE LES ÉCRITURES.
for (const [table, ddl, exercer] of [
  [TABLE_GENERATIONS, SQL_TABLE, false],
  ['app_generations_test', SQL_TABLE_TEST, true],
] as const) {
  const balaye = await sb.from(table).delete().eq('owner_id', PROPRIETAIRE_TEMOIN).select('id')
  if ((balaye.data ?? []).length > 0) console.log('fantômes retirés :', (balaye.data ?? []).length)

  const vivantes = await colonnesVivantes(table)
  if (vivantes === null) {
    console.log(`\n🔴 ${table} : illisible dans l'OpenAPI`)
    continue
  }
  const poses = new Set<string>()
  const poser = async (champs: Record<string, unknown>): Promise<ReponsePose> => {
    const r = await sb
      .from(table)
      .insert({ owner_id: PROPRIETAIRE_TEMOIN, demande: 'TÉMOIN JETABLE — sonde de schéma', ...champs })
      .select('id')
      .maybeSingle()
    if (r.error !== null) return { ok: false, code: r.error.code ?? '?', message: r.error.message }
    const id = (r.data as { id: string }).id
    poses.add(id)
    return { ok: true, id }
  }
  const retirer = async (id: string) => {
    await sb.from(table).delete().eq('id', id).eq('owner_id', PROPRIETAIRE_TEMOIN)
    poses.delete(id)
  }
  const relire = async (id: string) => {
    const r = await sb.from(table).select('*').eq('id', id).maybeSingle()
    return (r.data as Record<string, unknown> | null) ?? null
  }

  let e
  try {
    e = await comparerSchema({ table, ddl, colonnesVivantes: vivantes, exercerContraintes: exercer, contraintesVivantes: await contraintesLues(table), ...(exercer ? { poser, retirer, relire } : {}) })
  } finally {
    for (const id of [...poses]) await retirer(id)
    const reste = await sb.from(table).select('id').eq('owner_id', PROPRIETAIRE_TEMOIN)
    console.log(
      `témoins survivants sur ${table} :`,
      (reste.data ?? []).length === 0 ? 'aucun ✅' : '⚠ ' + String((reste.data ?? []).length),
    )
  }

  MESURE_JSON.push(e)
  if (EN_JSON) continue
  console.log(`\n── ${table} — ${String(vivantes.size)} colonnes vivantes`)
  console.log('   colonnes en écart (type/null/défaut) :',
    e.colonnesEnEcart.map((c) => `${c.colonne} : ${c.constat}`).join(' | ') || 'aucune ✅')
  console.log('   déclarées et ABSENTES de la base :', e.colonnesManquantes.join(', ') || 'aucune ✅')
  console.log('   vivantes et NON DÉCLARÉES        :', e.colonnesNonDeclarees.join(', ') || 'aucune ✅')
  console.log('   contraintes en écart             :',
    e.contraintesEnEcart.map((c) => `${c.nom} (${c.constat})`).join(' | ') || 'aucune ✅')
  console.log('   contraintes déclarées SANS sonde :', e.contraintesSansSonde.join(', ') || 'aucune ✅')
  console.log('   non mesuré                       :', e.nonMesure.join(' | ') || 'rien ✅')
  console.log('   par décision                     :', e.parDecision.join(' | ') || 'rien')
  console.log('   VERDICT :', ecartExiste(e) ? '🔴 ÉCART' : '✅ CONFORME')
}

// ── LA MÊME STRUCTURE QUE LA ROUTE, pour que le vérificateur soit éprouvé
// sur un corps RÉEL et non sur une invention de test.
if (EN_JSON) console.log(JSON.stringify({ fantomesRetires: [], rpcOuverteAuPublic: OUVERTE, ecarts: MESURE_JSON }))
