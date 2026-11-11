// CPA — publie l'organigramme réel (image de l'informaticien, 2026-11-11) sur
// la page « Direction générale », et crée une FICHE par boîte cliquable.
//
//   node --env-file=.env.local scripts/organigramme-cpa-publier.mjs <dossier-de-sauvegarde>
//
// 1. Les fiches : une page par boîte cliquable, sous qui-sommes-nous/direction,
//    HORS MENU. Elles ne contiennent rien d'inventé : un encadré « sera publié
//    ici » et un bouton de retour. L'informaticien y ajoute photo, nom, mot ou
//    membres depuis /edit. Une fiche qui existe déjà N'EST PAS touchée.
// 2. Le bloc organigramme de la page Direction : ses boîtes sont REMPLACÉES par
//    celles de l'image ; le titre et l'affichage « boîtes » sont gardés. Les
//    autres blocs de la page ne bougent pas.
// La page Gouvernance n'est pas touchée.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { ITEMS, FICHES } from './organigramme-cpa-donnees.mjs'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PARENT = 'qui-sommes-nous/direction'
const SAUVEGARDE = process.argv[2]
if (!SAUVEGARDE) { console.error('Dossier de sauvegarde manquant.'); process.exit(2) }

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
let ko = 0

// ── 1. LES FICHES ────────────────────────────────────────────────────────────
const ATTENTE = "La photo, le nom et le mot du responsable seront publiés ici dès qu'ils auront été transmis par la Centrale."
for (const [k, f] of FICHES.entries()) {
  const chemin = `${PARENT}/${f.slug}`
  const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (deja) { console.log(`  ⚪ /${chemin} existe déjà : non touchée`); continue }
  const blocs = [
    { type: 'encadre', ton: 'info', texte: f.attente ?? ATTENTE },
    { type: 'appel', libelle: "Retour à l'organigramme", chemin: PARENT },
  ]
  const { error } = await srv.from('site_pages').insert({
    site_id: site.id, chemin, parent: PARENT, titre: f.titre, chapeau: f.chapeau,
    blocs, ordre: k + 1, menu: false, publie: true,
  })
  if (error) { ko++; console.log(`  🔴 /${chemin} — ${error.code} ${error.message}`) } else console.log(`  🟢 /${chemin} créée`)
}

// ── 2. L'ORGANIGRAMME DE LA PAGE DIRECTION ───────────────────────────────────
const { data: page } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', PARENT).maybeSingle()
const idx = page.blocs.map((b, i) => (b.type === 'organigramme' ? i : -1)).filter((i) => i >= 0)
if (idx.length !== 1) { console.error(`🔴 ${idx.length} organigramme(s) sur la page Direction, attendu 1`); process.exit(1) }
writeFileSync(`${SAUVEGARDE}/direction-avant-organigramme-reel.json`, JSON.stringify(page.blocs, null, 2))
const ancien = page.blocs[idx[0]]
const neuf = { ...ancien, affichage: 'boites', items: ITEMS }
const blocs = page.blocs.map((b, i) => (i === idx[0] ? neuf : b))
const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
  .eq('site_id', site.id).eq('chemin', PARENT).select('blocs')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'aucune ligne'); process.exit(1) }
const relu = data[0].blocs
const autres = page.blocs.every((b, i) => i === idx[0] || JSON.stringify(relu[i]) === JSON.stringify(b))
// La base (jsonb) RÉORDONNE les clés d'un objet : on compare le contenu, clés triées.
const tri = (o) => JSON.stringify(o, Object.keys(o).sort())
const exact = relu[idx[0]].items.length === ITEMS.length && relu[idx[0]].items.every((it, i) => tri(it) === tri(ITEMS[i]))
const ok = autres && exact && ko === 0
console.log(`${ok ? '🟢' : '🔴'} /${PARENT} : ${ITEMS.length} boîtes posées (${ITEMS.filter((i) => i.lien).length} cliquables) ; autres blocs intacts : ${autres} ; fiches en échec : ${ko}`)
process.exit(ok ? 0 : 1)
