// Les photos. Elles viennent de la galerie DÉJÀ générée pour le site —
// rien n'est importé d'ailleurs. Trois à quatre par diaporama, qui tournent
// seules. L'informaticien de la Centrale les remplacera depuis /edit.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await srv.from('sites').select('id,gallery').like('slug','centrale-pharmaceutique%').maybeSingle()
const G = (site.gallery || []).filter((x) => typeof x === 'string')
if (G.length < 4) { console.log('🔴 moins de 4 images en galerie :', G.length); process.exit(1) }
const img = (i, alt, legende) => ({ url: G[i % G.length], alt, legende })

// Où poser quoi. Le diaporama ouvre la page ; les photos seules illustrent.
const PHOTOS = {
 'qui-sommes-nous': ['diaporama', 'La Centrale en images', [
   img(0, "Entrepôt de la Centrale", "L'entrepôt central"),
   img(1, "Rayonnage de produits pharmaceutiques", "Le stock distribuable"),
   img(2, "Préparation d'une commande", "La préparation des commandes"),
   img(3, "Contrôle qualité d'un lot", "Le contrôle avant mise en stock")]],
 'activites': ['diaporama', 'Nos activités en images', [
   img(2, "Préparation d'une commande", "Préparation"),
   img(4, "Chargement d'une livraison", "Distribution"),
   img(3, "Contrôle qualité d'un lot", "Assurance qualité"),
   img(1, "Rayonnage de produits", "Stockage")]],
 'catalogue': ['photo', null, img(1, "Rayonnage de produits pharmaceutiques", "Les références du catalogue")],
 'fournisseurs': ['photo', null, img(4, "Chargement d'une livraison", "Réception d'une livraison fournisseur")],
 'activites/stockage': ['diaporama', "L'entrepôt", [
   img(0, "Entrepôt de la Centrale", "Vue d'ensemble"),
   img(1, "Rayonnage de produits", "Le stock distribuable"),
   img(5, "Zone réfrigérée", "La chaîne du froid")]],
 'activites/qualite': ['photo', null, img(3, "Contrôle qualité d'un lot", "Vérification documentaire d'un lot entrant")],
 'activites/distribution': ['photo', null, img(4, "Chargement d'une livraison", "Chargement avant tournée")],
 'qui-sommes-nous/equipes': ['diaporama', 'Les métiers de la Centrale', [
   img(3, "Contrôle qualité", "Assurance qualité"),
   img(2, "Préparation d'une commande", "Magasinage"),
   img(4, "Chargement d'une livraison", "Logistique")]],
 'qui-sommes-nous/histoire': ['photo', null, img(0, "Entrepôt de la Centrale", "L'entrepôt central aujourd'hui")],
 'catalogue/categories': ['photo', null, img(5, "Zone réfrigérée", "Les produits de la chaîne du froid")],
}

let ok = 0, ko = 0
for (const [chemin, [forme, titre, charge]] of Object.entries(PHOTOS)) {
  const { data: avant } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (!avant) { ko++; console.log(`  🔴 /${chemin} — page absente`); continue }
  const deja = (avant.blocs || []).filter((b) => b.type !== 'image' && b.type !== 'galerie')
  const bloc = forme === 'diaporama' ? { type: 'galerie', titre, items: charge } : { type: 'image', ...charge, legende: charge.legende }
  // La photo s'insère APRÈS le premier paragraphe : on lit d'abord pourquoi
  // on est là, on voit ensuite. Une page qui s'ouvre sur une image sans texte
  // ne dit pas de quoi elle parle.
  const blocs = deja.length > 1 ? [deja[0], bloc, ...deja.slice(1)] : [...deja, bloc]
  const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('blocs')
  if (error || !data?.length) { ko++; console.log(`  🔴 /${chemin} — ${error ? error.code + ' ' + error.message : 'aucune ligne'}`); continue }
  const relu = data[0].blocs || []
  const photos = relu.filter((b) => b.type === 'image' || b.type === 'galerie').length
  if (relu.length !== blocs.length || photos !== 1) { ko++; console.log(`  🔴 /${chemin} — relecture discordante (${relu.length}/${blocs.length}, ${photos} photo)`); continue }
  ok++; console.log(`  🟢 /${chemin} — ${forme}${forme === 'diaporama' ? ` (${charge.length} photos)` : ''}, ${relu.length} blocs`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${ok + ko}`)
process.exit(ko === 0 ? 0 : 1)
