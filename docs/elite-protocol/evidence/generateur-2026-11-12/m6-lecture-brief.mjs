// M6 — LA LECTURE DU BRIEF : réussie, échouée, combien de tables — et les
// écrans livrés en regard.
//
// HYPOTHÈSE À ÉPROUVER (du propriétaire) : « une première étape qui tombe en
// silence, et tout le reste construit sur rien » — la lecture du brief échoue,
// le pipeline continue sans table, l'application sort vide.
//
// CE QUE LA BASE CONSERVE, ET CE QU'ELLE NE CONSERVE PAS (constaté avant la mesure)
//  · Le RÉSULTAT de la lecture du brief (réussie / illisible / JSON cassé)
//    n'est enregistré NULLE PART : ni colonne, ni diagnostic, ni section.
//    → INCONNU pour les 34. Il n'est pas reconstruit ici.
//  · Ce qui EN SORT est conservé : `document.entites` (depuis le 2026-11-05)
//    et le schéma SQL émis (`document.schema`, depuis le 2026-11-04).
//  · La coupe à 24 000 signes est DÉTERMINISTE (lire-brief/route.ts :
//    `demande.slice(0, 24_000)`) : elle se calcule depuis la longueur du cahier.
//
// QUAND « 0 TABLE » A UN SENS — dates lues dans git (commande en tête du rapport) :
//   c6e6b576 2026-11-02 la route accepte des entités ;
//   158bac74 2026-11-03T23:52Z la lecture du brief demande des ENTITES ;
//   17a95453 2026-11-04T11:23Z le client les TRANSMET de façon fiable.
// Avant 2026-11-04T11:23Z, « 0 table » n'est PAS un échec de lecture : la
// chaîne n'existait pas ou perdait ses entités (défaut écrit dans le code).
//
// RÈGLE DE CROISEMENT : pour chaque génération LIVRÉE, les écrans CONSERVÉS
// du tour livré (comme M3) — démarre, écrans distincts, signes de l'accueil,
// écrans à marqueur vide.
import { charger, ecrire, toursDe } from './commun.mjs'

const { lignes, sha } = charger()
const CHAINE = Date.parse('2026-11-04T11:23:59Z')
const VIDE = /\b(aucun|aucune|pas encore|vide|rien à|no data|empty)\b/iu
const med = (xs) => { const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }

const rangs = lignes.map((l) => {
  const d = l.document ?? {}
  const tables = Array.isArray(d.entites) ? d.entites.length : typeof d.schema === 'string' ? (d.schema.match(/create table/giu) ?? []).length : null
  const ex = l.sections_acquises?.execution
  const e = ex?.ecrans ?? []
  const livree = toursDe(l).some((t) => t.ok)
  const cfg = l.sections_acquises?.configuration
  return {
    id: l.id, date: l.created_at.slice(0, 16), signesCahier: (l.demande ?? '').length,
    coupeA24000: (l.demande ?? '').length > 24_000,
    chaineEntitesEnPlace: Date.parse(l.created_at) >= CHAINE,
    lectureBrief: 'INCONNU (non enregistré)',
    tables, sourceTables: Array.isArray(d.entites) ? 'document.entites' : typeof d.schema === 'string' ? 'document.schema' : 'non enregistré',
    configurationRecue: cfg === undefined ? 'non enregistrée' : Object.keys(cfg).length === 0 ? '{} (vide)' : Object.keys(cfg).join(','),
    livree,
    demarre: livree && ex ? ex.monteDansSimulateur : null,
    ecransDistincts: livree ? ex?.ecransDistincts ?? null : null,
    signesAccueil: livree && e[0] ? e[0].texte.length : null,
    ecransVides: livree && e.length ? e.filter((x) => VIDE.test(x.texte)).length : null,
    ecransEnregistres: livree ? e.length : null,
  }
})

const apres = rangs.filter((r) => r.chaineEntitesEnPlace)
const groupe = (filtre) => {
  const g = apres.filter(filtre), liv = g.filter((r) => r.livree)
  return { generations: g.length, livrees: liv.length, demarrent: liv.filter((r) => r.demarre === true).length, mediane_ecransDistincts: med(liv.map((r) => r.ecransDistincts)), mediane_signesAccueil: med(liv.map((r) => r.signesAccueil)), accueilAvecMarqueurVide: liv.filter((r) => r.ecransEnregistres && r.ecransVides > 0).length }
}
const croisement = { zeroTable: groupe((r) => r.tables === 0), auMoinsUneTable: groupe((r) => r.tables !== null && r.tables > 0), tablesInconnues: groupe((r) => r.tables === null) }
const configVide = rangs.filter((r) => r.configurationRecue === '{} (vide)')
const resume = {
  lectureBriefEnregistree: 0, lectureBriefInconnue: rangs.length,
  coupeesA24000: rangs.filter((r) => r.coupeA24000).length,
  coupeesA24000_apresChaine: apres.filter((r) => r.coupeA24000).length,
  generationsApresChaine: apres.length,
  tablesConnuesApresChaine: apres.filter((r) => r.tables !== null).length,
  croisement,
  configurationVide: { generations: configVide.length, premiere: configVide[0]?.date ?? null, depuisPremiere: rangs.filter((r) => r.date >= (configVide[0]?.date ?? '9')).length },
}
ecrire('m6-lecture-brief.json', { instantane_sha256: sha, resume, rangs })

console.log(`instantané ${sha.slice(0, 12)} · ${rangs.length} générations\n`)
console.log('id       date             cahier  coupé24k chaîne tables(source)          config reçue     livrée démarre écrans accueil vides')
for (const r of rangs) console.log(`${r.id.slice(0, 8)} ${r.date} ${String(r.signesCahier).padStart(6)} ${String(r.coupeA24000).padEnd(8)} ${String(r.chaineEntitesEnPlace).padEnd(6)} ${String(r.tables ?? '—').padStart(3)} (${r.sourceTables.padEnd(16)}) ${r.configurationRecue.slice(0, 16).padEnd(16)} ${String(r.livree).padEnd(6)} ${String(r.demarre ?? '—').padEnd(7)} ${String(r.ecransDistincts ?? '—').padStart(6)} ${String(r.signesAccueil ?? '—').padStart(7)} ${String(r.ecransVides ?? '—').padStart(5)}`)
console.log('\nRÉSUMÉ :', JSON.stringify(resume, null, 1))
