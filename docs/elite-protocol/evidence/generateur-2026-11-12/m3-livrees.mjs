// M3 — CONTENU RÉEL DES 21 « LIVRÉES SANS ERREUR ».
//
// QUESTION : derrière le chiffre « 21 sans erreur », qu'y a-t-il ? Et la
// remarque « un titre et deux cadres vides » devient-elle un chiffre ?
//
// DÉFINITION REPRISE À L'IDENTIQUE de celle qui a produit « 21 » dans le
// diagnostic oral du 2026-11-12 (script ad hoc, non versé — c'est l'objet de
// ce fichier de le verser) :
//     un tour accepté  ET  execution.erreurs vide  ET  persistance vide.
// Cette définition n'est PAS « application de qualité » : elle dit
// seulement « le simulateur n'a vu aucune erreur, et aucune table n'est
// laissée sans lecture/écriture ». Ce fichier mesure ce qu'elle laisse passer.
//
// CE QUI EST MESURÉ (sur les fichiers LIVRÉS, `document.fichiers`, et sur le
// verdict d'exécution CONSERVÉ du tour livré, `sections_acquises.execution`) :
//   · fichiers et lignes ÉCRITS PAR LE MODÈLE (hors systeme/, fourni) ;
//   · composants React déclarés (fonctions/constantes à majuscule) ;
//   · écrans : distincts / visités / découverts, selon le simulateur ;
//   · par écran : longueur du texte rendu, et présence d'un MARQUEUR D'ÉTAT
//     VIDE (aucun, aucune, pas encore, vide, rien) ;
//   · tables déclarées.
//
// CE QUI N'EST PAS MESURABLE ICI, ET RESTE INCONNU :
//   « écrans avec données réelles ». Le simulateur monte l'œuvre SANS BASE
//   (aucune adresse, aucune clé : juge-execution.ts, cloisonnement ①). Toute
//   œuvre branchée sur la base y est donc VIDE PAR CONSTRUCTION. Un écran
//   vide ici ne prouve pas qu'il le serait avec des données ; un écran plein
//   ici prouve seulement qu'il affiche quelque chose sans base (texte fixe,
//   données de démonstration). Le marqueur d'état vide est rapporté, jamais
//   converti en « données réelles ».
import { charger, ecrire, toursDe } from './commun.mjs'

const { lignes, sha } = charger()
const VIDE = /\b(aucun|aucune|pas encore|vide|rien à|no data|empty)\b/iu

const fichiersDe = (l) => {
  const f = l.document?.fichiers
  if (!f) return []
  return (Array.isArray(f) ? f : Object.entries(f)).map((e) => (Array.isArray(e) ? { chemin: e[0], contenu: String(e[1]) } : { chemin: e.chemin, contenu: String(e.contenu ?? '') }))
}

const retenues = lignes.filter((l) => {
  const sa = l.sections_acquises ?? {}
  return toursDe(l).some((t) => t.ok) && (sa.execution?.erreurs ?? []).length === 0 && (sa.persistance ?? []).length === 0
})

const apps = retenues.map((l) => {
  const sa = l.sections_acquises ?? {}
  const ex = sa.execution ?? {}
  const siens = fichiersDe(l).filter((f) => !f.chemin.startsWith('systeme/'))
  const code = siens.filter((f) => /\.(tsx?|jsx?)$/u.test(f.chemin)).map((f) => f.contenu).join('\n')
  const composants = new Set([
    ...[...code.matchAll(/\bfunction\s+([A-Z][\w$]*)\s*\(/gu)].map((m) => m[1]),
    ...[...code.matchAll(/\bconst\s+([A-Z][\w$]*)\s*(?::[^=]+)?=\s*(?:\(|React\.memo|memo\(|forwardRef|function)/gu)].map((m) => m[1]),
  ])
  const ecrans = (ex.ecrans ?? []).map((e, i) => ({ rang: i, signes: (e.texte ?? '').length, marqueurVide: VIDE.test(e.texte ?? ''), exerce: e.exerce === true, debut: (e.texte ?? '').slice(0, 120) }))
  return {
    id: l.id, date: l.created_at.slice(0, 10), tourLivre: toursDe(l).find((t) => t.ok)?.rang,
    // Tables : `entites` si enregistré, sinon le schéma SQL ; sinon INCONNU
    // (null). MESURÉ : avant le 2026-11-04 aucune des deux n'est en base —
    // ce n'est PAS « zéro table ».
    tables: Array.isArray(l.document?.entites) ? l.document.entites.length : typeof l.document?.schema === 'string' ? (l.document.schema.match(/create table/giu) ?? []).length : null,
    fichiersModele: siens.length, lignesModele: code.split('\n').length, composants: composants.size,
    ecransDistincts: ex.ecransDistincts ?? null, ecransVisites: ex.ecransVisites ?? null, ecransDecouverts: ex.ecransDecouverts ?? null,
    ecransEnregistres: ecrans.length, ecransAvecMarqueurVide: ecrans.filter((e) => e.marqueurVide).length,
    accueil: ecrans[0] ?? null, octetsRendus: ex.octetsRendus ?? null, ecrans,
  }
})

const med = (xs) => { const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const resume = {
  retenues: apps.length,
  mediane_lignesModele: med(apps.map((a) => a.lignesModele)), min_lignes: Math.min(...apps.map((a) => a.lignesModele)), max_lignes: Math.max(...apps.map((a) => a.lignesModele)),
  mediane_composants: med(apps.map((a) => a.composants)),
  mediane_ecransDistincts: med(apps.map((a) => a.ecransDistincts)),
  apps_1_seul_ecran_distinct: apps.filter((a) => a.ecransDistincts === 1).length,
  apps_sans_ecran_enregistre: apps.filter((a) => a.ecransEnregistres === 0).length,
  apps_avec_tables: apps.filter((a) => a.tables !== null && a.tables > 0).length,
  apps_tables_inconnues: apps.filter((a) => a.tables === null).length,
  apps_zero_table_mesure: apps.filter((a) => a.tables === 0).length,
  accueil_avec_marqueurVide: apps.filter((a) => a.accueil?.marqueurVide).length,
  mediane_signes_accueil: med(apps.map((a) => a.accueil?.signes)),
  // Rupture observée à la lecture du tableau, CALCULÉE ici : avant / après le
  // 2026-11-04 (premier jour où le schéma des tables est enregistré). Ce
  // n'est PAS une cause : les cahiers des deux périodes diffèrent (longs
  // cahiers CPA avant, cahiers courts après) — confusion non contrôlée.
  avant_2026_11_04: { n: apps.filter((a) => a.date < '2026-11-04').length, mediane_lignes: med(apps.filter((a) => a.date < '2026-11-04').map((a) => a.lignesModele)), mediane_signes_accueil: med(apps.filter((a) => a.date < '2026-11-04').map((a) => a.accueil?.signes)), mediane_ecransDistincts: med(apps.filter((a) => a.date < '2026-11-04').map((a) => a.ecransDistincts)) },
  depuis_2026_11_04: { n: apps.filter((a) => a.date >= '2026-11-04').length, mediane_lignes: med(apps.filter((a) => a.date >= '2026-11-04').map((a) => a.lignesModele)), mediane_signes_accueil: med(apps.filter((a) => a.date >= '2026-11-04').map((a) => a.accueil?.signes)), mediane_ecransDistincts: med(apps.filter((a) => a.date >= '2026-11-04').map((a) => a.ecransDistincts)) },
  longueur_mediane_cahier_avant: med(retenues.filter((l) => l.created_at < '2026-11-04').map((l) => (l.demande ?? '').length)),
  longueur_mediane_cahier_depuis: med(retenues.filter((l) => l.created_at >= '2026-11-04').map((l) => (l.demande ?? '').length)),
}
// ── HORS DÉFINITION : la page d'accueil des générations du 2026-11-12 (les
// deux pharmacies), objet de la capture « un titre et deux cadres vides ».
const capture = lignes.filter((l) => l.created_at.startsWith('2026-11-12')).map((l) => {
  const e = (l.sections_acquises?.execution?.ecrans ?? [])[0]
  return { id: l.id, accueilSignes: e ? (e.texte ?? '').length : null, accueilMarqueurVide: e ? VIDE.test(e.texte ?? '') : null, accueilTexte: e?.texte ?? null }
})
ecrire('m3-livrees.json', { instantane_sha256: sha, definition: 'tour accepté ET execution.erreurs = [] ET persistance = []', resume, apps, horsDefinition_capture: capture })

console.log(`instantané ${sha.slice(0, 12)} · ${apps.length} retenues par la définition\n`)
console.log('id       date       T tables fich lignes comp | écrans dist/visit/décou/enreg · vides | accueil: signes vide? début')
for (const a of apps) console.log(`${a.id.slice(0, 8)} ${a.date} ${a.tourLivre} ${String(a.tables).padStart(6)} ${String(a.fichiersModele).padStart(4)} ${String(a.lignesModele).padStart(6)} ${String(a.composants).padStart(4)} | ${a.ecransDistincts}/${a.ecransVisites}/${a.ecransDecouverts}/${a.ecransEnregistres} · ${a.ecransAvecMarqueurVide} | ${a.accueil?.signes ?? '—'} ${a.accueil?.marqueurVide ?? '—'} « ${(a.accueil?.debut ?? '').replace(/\s+/gu, ' ').slice(0, 70)} »`)
console.log('\nRÉSUMÉ :', JSON.stringify(resume, null, 1))
console.log('\nHORS DÉFINITION — accueil des générations du 2026-11-12 (texte entier rendu par le simulateur) :')
for (const c of capture) console.log(`  ${c.id.slice(0, 8)} · ${c.accueilSignes} signes · marqueur vide=${c.accueilMarqueurVide}\n    « ${c.accueilTexte} »`)
