// Ce qui manquait avant le lot 10. Tout est du contenu de GÉNÉRATEUR :
// noms, coordonnées, textes. La CPA efface et met sa réalité depuis /edit.
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await s.from('sites').select('id,gallery').like('slug','centrale-pharmaceutique%').maybeSingle()
const G = (site.gallery || []).filter((x) => typeof x === 'string')

let ok = 0, ko = 0
const ecrire = async (chemin, fn) => {
  const { data: av } = await s.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (!av) { ko++; console.log(`  🔴 /${chemin} — page absente`); return }
  const depart = av.blocs || []
  const blocs = fn(depart)
  if (!blocs) { console.log(`  ⚪ /${chemin} — déjà fait`); return }
  const { data, error } = await s.from('site_pages')
    .update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('blocs')
  if (error || !data?.length) { ko++; console.log(`  🔴 /${chemin} — ${error ? error.code : 'aucune ligne'}`); return }
  // MA PREMIÈRE VÉRIFICATION COMPTAIT « PERDU » TOUT BLOC MODIFIÉ.
  // Or modifier est parfois le BUT : remplacer un tableau, poser des noms.
  // Un vérificateur qui ne distingue pas « modifié » de « disparu » rend
  // un rouge sur un succès — deux faux rouges le 2026-11-08.
  //
  // On vérifie donc ce qu'on a VOULU : le compte attendu, et l'égalité
  // avec ce qu'on a envoyé.
  const relu = data[0].blocs || []
  if (relu.length !== blocs.length || JSON.stringify(relu) !== JSON.stringify(blocs)) {
    ko++; console.log(`  🔴 /${chemin} — relu ${relu.length}/${blocs.length}, contenu discordant`); return
  }
  ok++; console.log(`  🟢 /${chemin} — ${depart.length} → ${relu.length} blocs`)
}

console.log('① LES NOMS DE L’ORGANIGRAMME')
await ecrire('qui-sommes-nous/gouvernance', (d) => {
  const i = d.findIndex((b) => b.type === 'organigramme')
  if (i < 0 || d[i].items.some((x) => x.nom)) return null
  const noms = {
    ca: 'Présidence du conseil', dg: 'Direction générale',
    cm: 'Présidence de la commission', aq: 'Direction qualité',
    da: 'Direction des achats', dl: 'Direction logistique',
    st: 'Chef de service', sd: 'Chef de service', df: 'Direction financière',
  }
  const c = [...d]
  c[i] = { ...d[i], items: d[i].items.map((x) => ({ ...x, nom: noms[x.cle] ?? undefined })) }
  return c
})

console.log('\n② LES COORDONNÉES DES MENTIONS LÉGALES')
await ecrire('mentions-legales', (d) => {
  const i = d.findIndex((b) => b.type === 'tableau')
  if (i < 0 || !JSON.stringify(d[i]).includes('À compléter')) return null
  const c = [...d]
  c[i] = { ...d[i], lignes: [
    ["Éditeur du site", "Centrale Pharmaceutique d’Achats (CPA)"],
    ["Statut", "Établissement public à caractère administratif"],
    ["Directeur de la publication", "Le Directeur général de la CPA"],
    ["Siège", "N’Djamena, République du Tchad"],
    ["Téléphone", "+235 22 00 00 00"],
    ["Courriel", "contact@cpa.td"],
    ["Hébergement", "Site hébergé sur l’infrastructure Deribfy"],
  ], note: "Coordonnées à confirmer par la Centrale avant toute communication officielle." }
  return c
})

console.log('\n③ LES TEXTES ÉDITABLES DES APPELS D’OFFRES')
const posePage = async (chemin, titre, blocs) => {
  const { data: av } = await s.from('site_pages').select('id,blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (av) { console.log(`  ⚪ /${chemin} — existe déjà`); return }
  const { error } = await s.from('site_pages').insert([{
    site_id: site.id, chemin, titre, ordre: 90, menu: false, publie: true, blocs,
  }]).select('id')
  if (error) { ko++; console.log(`  🔴 /${chemin} — ${error.code} ${error.message}`); return }
  ok++; console.log(`  🟢 /${chemin} — ${blocs.length} blocs`)
}
await posePage('appels-offres', 'Appels d’offres', [
  { type: 'encadre', titre: 'Besoin d’aide ?', position: 'cote',
    texte: 'Pour toute question sur une consultation en cours, écrivez à la direction des achats avant la date limite des questions indiquée au dossier.' },
  { type: 'liens', titre: 'Liens rapides', position: 'cote', items: [
    { libelle: 'Comment répondre', chemin: 'appels-offres/comment-repondre' },
    { libelle: 'Calendrier prévisionnel', chemin: 'appels-offres/calendrier' },
    { libelle: 'Devenir fournisseur', chemin: 'fournisseurs/enregistrement' },
    { libelle: 'Documents à télécharger', chemin: 'fournisseurs/documents' },
  ] },
  { type: 'encadre', ton: 'attention', titre: 'Types de marché', position: 'cote',
    texte: 'AOI — appel d’offres international, ouvert aux fournisseurs étrangers. AON — appel d’offres national. Le dossier de consultation précise le régime applicable.' },
])

console.log('\n④ LES TEXTES ÉDITABLES DU CATALOGUE')
await posePage('catalogue-textes-techniques', 'Catalogue (textes)', [
  { type: 'texte', texte: 'Le catalogue suit la liste nationale des médicaments essentiels. Il est révisé à chaque campagne d’achat.' },
])

console.log('\n⑤ LES PHOTOS MANQUANTES')
for (const [chemin, idx, alt, legende] of [
  ['fournisseurs/enregistrement', 4, 'Dépôt d’un dossier fournisseur', 'Le dépôt des dossiers à la direction des achats'],
  ['activites/approvisionnement', 3, 'Contrôle d’un lot à la réception', 'Vérification documentaire avant acceptation'],
  ['qui-sommes-nous/missions', 0, 'Entrepôt de la Centrale', 'L’entrepôt central'],
]) {
  await ecrire(chemin, (d) => {
    if (d.some((b) => b.type === 'image' || b.type === 'galerie')) return null
    const img = { type: 'image', url: G[idx % G.length], alt, legende }
    return d.length > 1 ? [d[0], img, ...d.slice(1)] : [...d, img]
  })
}

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok} écriture(s) réussie(s), ${ko} en échec`)
process.exit(ko === 0 ? 0 : 1)
