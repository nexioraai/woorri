// CPA — photos de l'accueil plus vivantes (demande du 2026-11-11, sur le modèle
// d'anie.td) : des personnes et des scènes de santé, plus seulement l'entrepôt.
//
// L'accueil montre `hero_image` puis les premières photos de `gallery` (4 au
// plus, HeroDiapo). On change `hero_image` et on AJOUTE deux photos EN TÊTE de
// `gallery` ; les photos existantes restent, derrière. Rien n'est supprimé.
// Sauvegarde de l'état d'avant dans le dossier passé en argument.
//
//   node --env-file=.env.local scripts/hero-photos-cpa.mjs <dossier-de-sauvegarde>
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SAUVEGARDE = process.argv[2]
if (!SAUVEGARDE) { console.error('Dossier de sauvegarde manquant.'); process.exit(2) }
const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop`

const HERO = px(37285163)                     // agents de santé en visite dans un village (Gombe, Nigeria)
const EN_TETE = [px(34605560), px(30678215)]  // infirmières en uniforme ; pharmacie animée (Lagos)

const { data: s } = await srv.from('sites').select('id,hero_image,gallery').like('slug', 'centrale-pharmaceutique%').maybeSingle()
writeFileSync(`${SAUVEGARDE}/cpa-hero-avant.json`, JSON.stringify({ hero_image: s.hero_image, gallery: s.gallery }, null, 2))
const ancienne = Array.isArray(s.gallery) ? s.gallery : []
const gallery = [...EN_TETE, ...ancienne.filter((u) => !EN_TETE.includes(u))]
const { data, error } = await srv.from('sites').update({ hero_image: HERO, gallery }).eq('id', s.id).select('hero_image,gallery')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'aucune ligne'); process.exit(1) }
const r = data[0]
const conserve = ancienne.every((u) => r.gallery.includes(u))
const ok = r.hero_image === HERO && r.gallery[0] === EN_TETE[0] && r.gallery[1] === EN_TETE[1] && conserve
console.log(`${ok ? '🟢' : '🔴'} hero changé ; galerie ${ancienne.length} → ${r.gallery.length} photos ; anciennes toutes conservées : ${conserve}`)
process.exit(ok ? 0 : 1)
