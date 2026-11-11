// CPA (2026-11-11) — deux corrections de données.
//
// 1. LES CARTES DE L'ACCUEIL MÈNENT À LEUR PAGE. Elles étaient cliquables mais
//    n'ouvraient qu'une fiche sans suite. Chaque carte reçoit `lien` vers une
//    page EXISTANTE et publiée du site. Les cartes « Appel d'offres » mènent à
//    la page Appels d'offres (aucun avis réel n'est encore publié : pas de page
//    de détail inventée).
// 2. LES COORDONNÉES RÉELLES, recopiées de l'en-tête de lettre de la CPA
//    fournie par le propriétaire, en attendant des adresses en .td :
//    BP 1517, N'Djaména · tél. +235 22 51 80 57 / 22 51 86 24 · télécopie
//    +235 22 51 74 08 · angle avenue Mobutu et rue Corniche, quartier
//    Sabangali · cpa.tchad@yahoo.fr. Elles remplacent les coordonnées
//    d'exemple (contact@cpa.td, +235 22 51 00 00, BP 1094, +235 22 00 00 00).
//
//   node --env-file=.env.local scripts/cpa-cartes-et-contacts.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await srv.from('sites').select('id,sections,contact').like('slug', 'centrale-pharmaceutique%').maybeSingle()

const LIENS = {
  'Mission de la CPA': 'qui-sommes-nous/missions',
  'Rôle dans le système de santé': 'activites',
  'Organisation': 'qui-sommes-nous/gouvernance',
  'Partenaires institutionnels': '#partenaires',
  "Appel d'offres – Médicaments essentiels 2025": 'appels-offres',
  "Appel d'offres – Chaîne du froid": 'appels-offres',
  "Appel d'offres – Fournitures médicales": 'appels-offres',
  "Appel d'offres – Équipements de laboratoire": 'appels-offres',
}
// Chaque cible (hors ancre) doit être une page PUBLIÉE du site.
const { data: pub } = await srv.from('site_pages').select('chemin').eq('site_id', site.id).eq('publie', true)
const publiees = new Set(pub.map((p) => p.chemin))
for (const c of new Set(Object.values(LIENS))) if (!c.startsWith('#') && !publiees.has(c)) { console.error(`🔴 cible non publiée : ${c}`); process.exit(1) }

let poses = 0
const sections = site.sections.map((sec) => ({ ...sec, items: sec.items.map((it) => (LIENS[it.title] ? (poses++, { ...it, lien: LIENS[it.title] }) : it)) }))
if (poses !== Object.keys(LIENS).length) { console.error(`🔴 ${poses}/${Object.keys(LIENS).length} cartes trouvées`); process.exit(1) }

const ADRESSE = "Angle avenue Mobutu et rue Corniche, quartier Sabangali, BP 1517, N'Djaména, Tchad"
const contact = { ...site.contact, email: 'cpa.tchad@yahoo.fr', phone: '+235 22 51 80 57', address: ADRESSE }
const { error } = await srv.from('sites').update({ sections, contact, address: ADRESSE }).eq('id', site.id)
if (error) { console.error('🔴', error.message); process.exit(1) }
console.log(`🟢 ${poses} cartes liées ; contact : ${contact.email} · ${contact.phone} · ${ADRESSE}`)

// Mentions légales : les lignes Téléphone, Courriel et Siège du tableau.
const { data: ml } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', 'mentions-legales').maybeSingle()
let n = 0
const blocs = ml.blocs.map((b) => b.type !== 'tableau' ? b : { ...b, lignes: b.lignes.map(([k, v]) => {
  if (k === 'Téléphone' && v === '+235 22 00 00 00') { n++; return [k, '+235 22 51 80 57 / +235 22 51 86 24 (télécopie : +235 22 51 74 08)'] }
  if (k === 'Courriel' && v === 'contact@cpa.td') { n++; return [k, 'cpa.tchad@yahoo.fr'] }
  if (k === 'Siège' && v === 'N’Djamena, République du Tchad') { n++; return [k, ADRESSE] }
  return [k, v]
}) })
const { error: e2 } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() }).eq('site_id', site.id).eq('chemin', 'mentions-legales')
console.log(e2 ? `🔴 ${e2.message}` : `🟢 mentions légales : ${n}/3 lignes mises à jour`)

// Contrôle : plus aucune coordonnée d'exemple dans les pages.
const { data: toutes } = await srv.from('site_pages').select('chemin,blocs,chapeau,corps').eq('site_id', site.id)
const restes = toutes.filter((p) => /contact@cpa\.td|22 51 00 00|22 00 00 00|BP 1094/.test(JSON.stringify(p))).map((p) => p.chemin)
console.log(restes.length ? `🔴 restes : ${restes.join(', ')}` : '🟢 aucune coordonnée d’exemple restante dans les pages')
process.exit(e2 || restes.length || n !== 3 ? 1 : 0)
