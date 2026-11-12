// M1 — TABLEAU TOUR PAR TOUR des 34 générations « moteur direct ».
//
// QUESTION : « à chaque tour il casse autre chose » — vrai, faux, partiel ?
//
// RÈGLES DÉCLARÉES AVANT LA MESURE
//  · Les classes d'un tour refusé = intitulés de ses reproches
//    (commun.mjs › classesDuMotif). « DERNIER TOUR. » en tête est ôté : c'est
//    le même reproche, prévenu qu'il est le dernier.
//  · Un tour ACCEPTÉ avant le dernier tour (rang < 3) n'a, par construction
//    de la boucle (boucle-directe.ts, `reproches.length > 0 && rang <
//    toursMax`), AUCUN reproche : ses classes = ∅, sûr.
//  · Un tour ACCEPTÉ AU DERNIER TOUR (rang 3) peut porter des défauts qui ne
//    sont PAS écrits dans `motif` (la boucle livre et accompagne). On les
//    RECONSTITUE PARTIELLEMENT depuis les verdicts conservés :
//    execution (monte / erreurs / controlesMuets), jetons, vivacite,
//    persistance, couverture.absentes. Les verdicts de `faces` et `gestion`
//    NE SONT PAS CONSERVÉS en base → ces deux familles restent INCONNUES au
//    dernier tour, et le tableau le dit.
//  · TOURS_MAX = 3 sur toute la période (git log -S "TOURS_MAX = " : une
//    seule introduction, 2026-10-18, commit 47837412).
//  · Transition N → N+1, PAR CLASSE : MÊME (présente aux deux), NOUVELLE
//    (absente en N, présente en N+1), CORRIGÉE (présente en N, absente en
//    N+1). Pour CONSTRUCTION → CONSTRUCTION, on compare en plus le message
//    exact (type + fichier) : « même construction, même erreur » ou « autre ».
import { charger, ecrire, toursDe, classesDuMotif, sansAnsi } from './commun.mjs'

const { lignes, sha } = charger()

const normCle = (c) => c.replace(/^DERNIER TOUR\.\s*/u, '')
const signatureBuild = (texte) => {
  const t = sansAnsi(texte)
  const type = (t.match(/\[([A-Z_]+)\]/u)?.[1]) ?? (t.includes('Cannot find native binding') ? 'BINDING_NATIF_ROLLDOWN' : t.includes('non embarqué') ? 'PAQUET_NON_EMBARQUE' : 'AUTRE')
  const fichier = t.match(/╭─\[\s*([^:\]]+)/u)?.[1]?.trim() ?? ''
  const paquets = t.match(/non embarqué\(s\) dans le bundle : ([^—]+)/u)?.[1]?.trim() ?? ''
  return `${type}${fichier ? ' @ ' + fichier : ''}${paquets ? ' : ' + paquets : ''}`
}

/** Les défauts résiduels d'un tour accepté au dernier tour, depuis les verdicts conservés. */
function residuelsConserves(sa) {
  const r = []
  const ex = sa.execution
  if (ex && ex.indisponible === undefined && ex.monteDansSimulateur === false) r.push("L'APPLICATION NE SE MONTE PAS")
  if ((ex?.controlesMuets ?? []).length > 0) r.push('DES CONTRÔLES SANS NOM LISIBLE')
  if ((sa.jetons ?? []).length > 0) r.push('DES JETONS QUI N’EXISTENT PAS')
  if ((sa.vivacite ?? []).length > 0) r.push('DES CONTRÔLES MORTS')
  if ((sa.persistance ?? []).length > 0) r.push('PERSISTANCE (au moins une table non lue/écrite)')
  if ((sa.couverture?.absentes ?? []).length > 0) r.push('DES EXIGENCES DU CAHIER SONT MUETTES')
  return r
}

const generations = []
const compte = { transitions: 0, MEME: 0, NOUVELLE: 0, CORRIGEE: 0, buildMemeErreur: 0, buildAutreErreur: 0 }
const parTransition = { toutCorrige: 0, dont_versDernierTourReconstitue: 0, uniquementMeme: 0, uniquementNouvelle: 0, mixte_meme_et_nouvelle: 0, corrigeEtNouvelle: 0 }

for (const l of lignes) {
  const tours = toursDe(l)
  const g = { id: l.id, date: l.created_at.slice(0, 10), nbTours: tours.length, livree: tours.some((t) => t.ok), tours: [], transitions: [] }
  for (const t of tours) {
    if (!t.ok) {
      const cl = classesDuMotif(t.motif).map((c) => ({ cle: normCle(c.cle), exact: c.cle === 'CONSTRUCTION' ? signatureBuild(c.texte) : sansAnsi(c.texte).split('\n').slice(0, 3).join(' ⏎ ').slice(0, 300) }))
      g.tours.push({ rang: t.rang, ok: false, classes: cl })
    } else if (t.rang < 3) {
      g.tours.push({ rang: t.rang, ok: true, classes: [], note: 'accepté sans reproche (rang < 3)' })
    } else {
      const res = residuelsConserves(l.sections_acquises ?? {})
      g.tours.push({ rang: t.rang, ok: true, livreAuDernierTour: true, classes: res.map((c) => ({ cle: c, exact: '(reconstitué depuis les verdicts conservés)' })), inconnu: ['faces (non conservé)', 'gestion (non conservé)'] })
    }
  }
  for (let i = 0; i + 1 < g.tours.length; i++) {
    const A = g.tours[i], B = g.tours[i + 1]
    const a = new Set(A.classes.map((c) => c.cle)), b = new Set(B.classes.map((c) => c.cle))
    const meme = [...a].filter((x) => b.has(x)), nouvelle = [...b].filter((x) => !a.has(x)), corrigee = [...a].filter((x) => !b.has(x))
    compte.transitions++; compte.MEME += meme.length; compte.NOUVELLE += nouvelle.length; compte.CORRIGEE += corrigee.length
    let detailBuild = null
    if (meme.includes('CONSTRUCTION')) {
      const ea = A.classes.find((c) => c.cle === 'CONSTRUCTION').exact, eb = B.classes.find((c) => c.cle === 'CONSTRUCTION').exact
      detailBuild = ea === eb ? 'même erreur exacte' : 'autre erreur de construction'
      if (ea === eb) compte.buildMemeErreur++; else compte.buildAutreErreur++
    }
    if (b.size === 0) { parTransition.toutCorrige++; if (B.livreAuDernierTour === true) parTransition.dont_versDernierTourReconstitue++ }
    else if (nouvelle.length === 0) parTransition.uniquementMeme++
    else if (meme.length === 0 && corrigee.length === a.size) (a.size > 0 ? parTransition.corrigeEtNouvelle++ : parTransition.uniquementNouvelle++)
    else parTransition.mixte_meme_et_nouvelle++
    g.transitions.push({ de: A.rang, vers: B.rang, meme, nouvelle, corrigee, detailBuild, versDernierTourReconstitue: B.livreAuDernierTour === true })
  }
  generations.push(g)
}

const sortie = { instantane_sha256: sha, regle: 'voir en-tête de m1-tours.mjs', compte, parTransition, generations }
ecrire('m1-tours.json', sortie)

// ── AFFICHAGE
const court = (c) => c.cle === 'CONSTRUCTION' ? `CONSTRUCTION[${c.exact}]` : c.cle
console.log(`instantané ${sha.slice(0, 12)} · ${lignes.length} générations\n`)
for (const g of generations) {
  const cell = (r) => { const t = g.tours.find((x) => x.rang === r); if (!t) return '—'; if (t.ok && !t.livreAuDernierTour) return 'ACCEPTÉ'; if (t.ok) return `LIVRÉ(dernier tour) résiduels connus: ${t.classes.map(court).join(' + ') || 'aucun'} ; faces/gestion: INCONNU`; return t.classes.map(court).join(' + ') }
  console.log(`${g.id.slice(0, 8)} ${g.date} | T1: ${cell(1)}\n${' '.repeat(20)}| T2: ${cell(2)}\n${' '.repeat(20)}| T3: ${cell(3)}`)
}
console.log('\nPAR CLASSE, sur toutes les transitions :', JSON.stringify(compte))
console.log('PAR TRANSITION :', JSON.stringify(parTransition))
