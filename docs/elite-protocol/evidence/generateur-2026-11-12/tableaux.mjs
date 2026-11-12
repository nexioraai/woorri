// TABLEAUX DU RAPPORT — générés depuis sortie/*.json, jamais recopiés à la main.
//   node docs/elite-protocol/evidence/generateur-2026-11-12/tableaux.mjs > docs/elite-protocol/evidence/generateur-2026-11-12/sortie/tableaux.md
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ICI } from './commun.mjs'

const lire = (n) => JSON.parse(readFileSync(join(ICI, 'sortie', n), 'utf8'))
const m1 = lire('m1-tours.json'), m2 = lire('m2-builds.json'), m3 = lire('m3-livrees.json'), m4 = lire('m4-juges.json')
const ABR = {
  'CONSTRUCTION': 'BUILD', 'DES EXIGENCES DU CAHIER SONT MUETTES': 'COUV', "L'APPLICATION NE SE MONTE PAS": 'MONTE', 'DES JETONS QUI N’EXISTENT PAS': 'JETONS',
  'CETTE APPLICATION VEUT SE SOUVENIR ET N’A AUCUNE TABLE': 'SANS-TABLE', 'DES TABLES SONT INTERROGÉES AVANT TOUTE CONNEXION': 'FACE-AVANT-CNX',
  'DES DONNÉES VIVENT EN MÉMOIRE AU LIEU DE LA BASE': 'MÉMOIRE', 'DES CONTRÔLES SANS NOM LISIBLE': 'SANS-NOM', "UN CHARGEMENT QUI ÉCHOUE REND LE MÊME ÉCRAN QU'UN CHARGEMENT VIDE": 'ÉCHEC=VIDE',
  'DES CONTRÔLES MORTS': 'MORTS', 'PERSISTANCE (au moins une table non lue/écrite)': 'PERSIST',
}
const ab = (c) => (c.cle === 'CONSTRUCTION' ? `BUILD:${c.exact.split(' @ ')[0].split(' : ')[0]}` : ABR[c.cle] ?? c.cle)
const out = []
out.push('### T1 — tour par tour (34 générations)\n')
out.push('| génération | date | tour 1 | tour 2 | tour 3 | transitions (MÊME / NOUVELLE / CORRIGÉE) |')
out.push('|---|---|---|---|---|---|')
for (const g of m1.generations) {
  const cell = (r) => { const t = g.tours.find((x) => x.rang === r); if (!t) return '—'; if (t.ok && !t.livreAuDernierTour) return '✅ accepté'; if (t.ok) return `📦 livré · résiduels connus : ${t.classes.map(ab).join(' + ') || 'aucun'} · faces/gestion : INCONNU`; return '❌ ' + t.classes.map(ab).join(' + ') }
  const tr = g.transitions.map((x) => `${x.de}→${x.vers} : ${x.meme.length}/${x.nouvelle.length}/${x.corrigee.length}${x.detailBuild ? ' (' + x.detailBuild + ')' : ''}`).join(' ; ') || '—'
  out.push(`| \`${g.id.slice(0, 8)}\` | ${g.date} | ${cell(1)} | ${cell(2)} | ${cell(3)} | ${tr} |`)
}
out.push(`\nTotaux par classe : ${JSON.stringify(m1.compte)}  \nTotaux par transition : ${JSON.stringify(m1.parTransition)}\n`)

out.push('### T2 — les 20 échecs de construction\n')
out.push('| génération | date | tour | type | sous-type | fichier / paquets | tronquée | auteur (règle) | avant correctif disque-react | avant correctif clôture |')
out.push('|---|---|---|---|---|---|---|---|---|---|')
for (const e of m2.echecs) out.push(`| \`${e.id.slice(0, 8)}\` | ${e.date} | ${e.tour} | ${e.type} | ${e.sousType.replace(/\|/gu, '\\|')} | ${e.fichier ?? e.paquets.join(', ')} | ${e.tronquee} | ${e.auteur} | ${e.avant_correctif_disque_react} | ${e.avant_correctif_cloture_markdown} |`)
out.push(`\nPar type : ${JSON.stringify(m2.parType)}  \nPar auteur : ${JSON.stringify(m2.parAuteur)}\n`)

out.push('### T3 — les 21 « livrées sans erreur » (définition : tour accepté ∧ execution.erreurs = ∅ ∧ persistance = ∅)\n')
out.push('| génération | date | tour livré | tables | fichiers | lignes | composants | écrans distincts / visités / découverts | écrans enregistrés · dont marqueur vide | accueil : signes · début |')
out.push('|---|---|---|---|---|---|---|---|---|---|')
for (const a of m3.apps) out.push(`| \`${a.id.slice(0, 8)}\` | ${a.date} | ${a.tourLivre} | ${a.tables ?? 'INCONNU'} | ${a.fichiersModele} | ${a.lignesModele} | ${a.composants} | ${a.ecransDistincts ?? 'INCONNU'} / ${a.ecransVisites ?? '—'} / ${a.ecransDecouverts ?? '—'} | ${a.ecransEnregistres} · ${a.ecransAvecMarqueurVide} | ${a.accueil ? `${a.accueil.signes} · « ${a.accueil.debut.replace(/\s+/gu, ' ').replace(/\|/gu, '/').slice(0, 60)} »` : 'INCONNU (non enregistré)'} |`)
out.push(`\nRésumé : ${JSON.stringify(m3.resume)}\n`)

out.push('### T4 — les juges\n')
out.push('| fichier | entré le | branché dans la boucle | générations exposées | tours refusés | intitulés observés |')
out.push('|---|---|---|---|---|---|')
for (const j of m4.juges) out.push(`| ${j.fichier} | ${j.cree.slice(0, 10)} | ${j.brancheDansLaBoucle ? 'oui' : '**non**'} | ${j.generationsExposees} | ${j.toursRefusesAttribues} | ${j.intitulesObserves.map((i) => ABR[i] ?? i).join(', ') || '—'} |`)
const asm = m4.intitules.find((r) => r.intitule === 'CONSTRUCTION')
out.push(`| *(assemblage — pas de fichier juge)* | ${asm.introduit.slice(0, 10)} | oui | ${asm.exposees} | ${asm.toursRefuses} | BUILD |`)
out.push('\nCo-occurrences dans un même tour refusé :\n')
for (const [p, n] of Object.entries(m4.coOccurrences)) out.push(`- ${n} × ${p.split(' ⟷ ').map((x) => ABR[x] ?? x).join(' ⟷ ')}`)
console.log(out.join('\n'))
