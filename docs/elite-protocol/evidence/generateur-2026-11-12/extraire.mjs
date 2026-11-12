// EXTRACTION — instantané des générations « moteur direct » (option 1).
//
// LECTURE SEULE sur la base : un seul `select`, aucune écriture.
// Écrit l'instantané compressé dans brut/ et son hachage SHA-256 dans
// brut/SHA256. Toutes les mesures (m1…m5) lisent CET instantané, jamais la
// base : elles se rejouent à l'identique, sans réseau (P-G).
//
// Exclu volontairement : `owner_email` (inutile à la mesure). Mesuré au
// 2026-11-12 : les 34 lignes ont UN SEUL propriétaire — le commanditaire de
// ces mesures — ce qui autorise le versement des cahiers (`demande`).
//
//   node --env-file=apps/web/.env.local docs/elite-protocol/evidence/generateur-2026-11-12/extraire.mjs
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const COLONNES = 'id, created_at, statut, ok, moteur, fournisseur, cout_usd, duree_ms, jetons_entree, jetons_sortie, tirages, demande, diagnostics, sections_acquises, document'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb.from('app_generations').select(COLONNES).eq('moteur', 'direct').order('created_at', { ascending: true })
if (error) throw new Error(error.message)

const instantane = { extrait_le: new Date().toISOString(), table: 'app_generations', filtre: "moteur = 'direct'", colonnes: COLONNES, lignes: data }
const brut = Buffer.from(JSON.stringify(instantane))
const gz = gzipSync(brut, { level: 9 })
const sha = createHash('sha256').update(brut).digest('hex')
writeFileSync(join(ICI, 'brut', 'generations-direct.json.gz'), gz)
writeFileSync(join(ICI, 'brut', 'SHA256'), `${sha}  generations-direct.json (décompressé)\n`)
console.log(`${data.length} lignes · ${(brut.length / 1e6).toFixed(2)} Mo · gz ${(gz.length / 1e6).toFixed(2)} Mo · sha256 ${sha}`)
