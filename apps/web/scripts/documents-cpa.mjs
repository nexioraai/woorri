// Fabrique et dépose les quatre documents du modèle de la CPA.
//
// TROIS RÈGLES, et elles sont DANS les documents eux-mêmes :
//  ① chacun porte en tête « MODELE GENERE — a remplacer par le document
//     officiel de la Centrale ». Un fournisseur ne doit JAMAIS croire qu'il
//     tient une pièce officielle.
//  ② aucun chiffre, aucune date, aucun montant inventé. Le bordereau est un
//     tableau VIDE.
//  ③ ils reprennent ce que le SITE dit déjà. Un document qui dirait autre
//     chose créerait deux vérités, et c'est celle qu'on ne relit pas qui
//     tromperait le fournisseur.
import { createClient } from '@supabase/supabase-js'

const srv = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

/**
 * Un PDF minimal, écrit à la main.
 *
 * Aucune dépendance à installer : ajouter une bibliothèque pour quatre
 * documents de modèle ferait grossir le dépôt pour un besoin ponctuel.
 * Les polices employées sont celles que tout lecteur PDF embarque.
 */
function pdf(titre, lignes) {
  const esc = (t) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  let y = 780
  const flux = []
  flux.push(`BT /F2 15 Tf 56 ${y} Td (${esc(titre)}) Tj ET`)
  y -= 24
  flux.push(`BT /F1 8 Tf 56 ${y} Td (${esc('MODELE GENERE - a remplacer par le document officiel de la Centrale.')}) Tj ET`)
  y -= 26
  for (const l of lignes) {
    if (y < 56) break
    const gras = l.startsWith('#')
    const t = gras ? l.slice(1).trim() : l
    if (!t) { y -= 10; continue }
    flux.push(`BT /${gras ? 'F2 11' : 'F1 10'} Tf 56 ${y} Td (${esc(t)}) Tj ET`)
    y -= gras ? 20 : 15
  }
  const contenu = flux.join('\n')
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  let out = '%PDF-1.4\n'
  const pos = []
  objets.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  pos.forEach((x) => { out += `${String(x).padStart(10, '0')} 00000 n \n` })
  out += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, 'latin1')
}

const DOCS = [
  {
    nom: 'formulaire-enregistrement-fournisseur.pdf',
    titre: 'Demande d’enregistrement fournisseur',
    lignes: [
      '#Identification de la societe',
      'Raison sociale :', 'Registre de commerce :', 'Identification fiscale :',
      'Adresse du siege :', 'Telephone :', 'Adresse electronique :', '',
      '#Pieces a joindre',
      '- Registre de commerce et piece d’identification fiscale',
      '- Attestation de regularite fiscale en cours de validite',
      '- Autorisations d’exercice pour les produits de sante',
      '- Autorisations de mise sur le marche des produits proposes',
      '- References de livraisons comparables', '',
      '#Domaines proposes',
      'Medicaments essentiels - dispositifs medicaux - solutes et perfusions',
      'chaine du froid - consommables de laboratoire', '',
      '#Engagement',
      'Le soussigne certifie l’exactitude des informations portees ci-dessus.',
      'Date :                              Signature et cachet :',
    ],
  },
  {
    nom: 'conditions-generales-achat.pdf',
    titre: 'Conditions generales d’achat',
    lignes: [
      'Ces conditions s’appliquent a toute commande passee par la Centrale,',
      'sauf stipulation contraire du marche.', '',
      '#Engagements du fournisseur',
      '- Livrer des produits conformes aux specifications du marche',
      '- Garantir une duree de validite restante suffisante a la reception',
      '- Respecter les conditions de transport, chaine du froid comprise',
      '- Fournir le certificat d’analyse de chaque lot livre',
      '- Respecter les delais, ou signaler tout retard des qu’il est connu', '',
      '#Engagements de la Centrale',
      '- Publier des consultations claires et des criteres connus a l’avance',
      '- Examiner les offres dans des conditions identiques pour tous',
      '- Notifier le resultat aux candidats',
      '- Regler les factures conformes dans les delais convenus', '',
      '#Non-conformite',
      'Un lot non conforme est refuse et retourne aux frais du fournisseur.',
      'Des manquements repetes peuvent entrainer une suspension de',
      'l’enregistrement.',
    ],
  },
  {
    nom: 'modele-bordereau-de-prix.pdf',
    titre: 'Modele de bordereau de prix',
    lignes: [
      'A remplir par le soumissionnaire et a joindre a l’offre FINANCIERE,',
      'dans un pli separe de l’offre technique.', '',
      '#Note importante',
      'Un fournisseur PROPOSE un prix ; la Centrale ne publie pas les prix de',
      'son catalogue. Les deux choses sont distinctes : le catalogue public',
      'dit ce que la Centrale fournit, jamais a quel prix.', '',
      '#Bordereau',
      'Lot  Designation                    Unite   Quantite   P.U.   Total',
      '___  _____________________________  ______  ________  _____  _____',
      '___  _____________________________  ______  ________  _____  _____',
      '___  _____________________________  ______  ________  _____  _____',
      '___  _____________________________  ______  ________  _____  _____', '',
      'Total general (en chiffres) :',
      'Total general (en lettres) :', '',
      'Devise :                        Validite de l’offre :',
      'Date :                          Signature et cachet :',
    ],
  },
  {
    nom: 'guide-du-soumissionnaire.pdf',
    titre: 'Guide du soumissionnaire',
    lignes: [
      '#Les etapes d’une reponse',
      '1. Retirer le dossier de consultation : specifications, criteres,',
      '   calendrier.',
      '2. Preparer l’offre technique : conformite, autorisations,',
      '   conditionnement, delais de livraison.',
      '3. Preparer l’offre financiere au modele de bordereau fourni, sans',
      '   en modifier la structure.',
      '4. Deposer sous pli ferme : offres technique et financiere SEPAREES,',
      '   avant la date et l’heure limites.',
      '5. Assister a l’ouverture des plis, qui est publique.', '',
      '#Les motifs d’ecartement les plus frequents',
      '- Depot apres la date et l’heure limites',
      '- Offres technique et financiere dans le meme pli',
      '- Bordereau de prix modifie ou incomplet',
      '- Autorisation de mise sur le marche absente ou expiree',
      '- Duree de validite restante insuffisante', '',
      '#Pourquoi la forme compte',
      'Elle garantit que toutes les offres sont comparees dans les memes',
      'conditions. Une offre techniquement excellente mais hors delai est',
      'ecartee sans etre lue.',
    ],
  },
]

const { data: site } = await srv.from('sites')
  .select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()

const poids = (o) => (o < 1024 ? `${o} o` : `${Math.round(o / 1024)} Ko`)
let ok = 0
let ko = 0
const items = []

for (const d of DOCS) {
  const buf = pdf(d.titre, d.lignes)
  const chemin = `sites/${site.id}/documents/${d.nom}`
  const { error } = await srv.storage.from('site-fichiers')
    .upload(chemin, buf, { contentType: 'application/pdf', upsert: true })
  if (error) { ko += 1; console.log(`  🔴 ${d.nom} — ${error.message}`); continue }

  // RELECTURE : un dépôt sans erreur n'est pas un fichier déposé.
  const { data: relu } = await srv.storage.from('site-fichiers')
    .list(`sites/${site.id}/documents`, { search: d.nom, limit: 1 })
  if (!relu?.length) { ko += 1; console.log(`  🔴 ${d.nom} — dépôt non confirmé`); continue }

  const url = srv.storage.from('site-fichiers').getPublicUrl(chemin).data.publicUrl
  const taille = relu[0].metadata?.size ?? buf.length
  items.push({ nom: d.titre, url, format: 'PDF', poids: poids(taille) })
  ok += 1
  console.log(`  🟢 ${d.nom} — ${poids(taille)}`)
}

if (ko === 0) {
  const { data: av } = await srv.from('site_pages')
    .select('blocs').eq('site_id', site.id).eq('chemin', 'fournisseurs/documents').maybeSingle()

  const blocs = (av.blocs || [])
    .map((b) => (b.type === 'documents' ? { ...b, items } : b))
    // L'encadré qui annonçait des « emplacements » n'a plus lieu d'être :
    // les fichiers existent. Le laisser ferait mentir la page.
    .filter((b) => !(b.type === 'encadre' && String(b.texte || '').includes('emplacements')))

  const { data, error } = await srv.from('site_pages')
    .update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', 'fournisseurs/documents').select('blocs')

  if (error || !data?.length) {
    ko += 1
    console.log(`  🔴 page — ${error ? `${error.code} ${error.message}` : 'aucune ligne'}`)
  } else {
    const bloc = (data[0].blocs || []).find((b) => b.type === 'documents')
    const morts = (bloc?.items ?? []).filter((i) => !String(i.url).startsWith('http')).length
    console.log(`\n  ${morts === 0 ? '🟢' : '🔴'} la page porte ${bloc?.items?.length ?? 0} documents, ${morts} lien(s) mort(s)`)
  }
}

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${DOCS.length} documents déposés`)
process.exit(ko === 0 ? 0 : 1)
