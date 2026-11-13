// V2 · LE GRAPHE DÉRIVÉ DE LA LECTURE, JUGÉ AVANT TOUT APPEL AU MODÈLE (0 $).
//
//   ① sur CINQ lectures réelles — Hayine 5b1c20bc et 94cf0489 (tables lues dans
//      les types de l'œuvre livrée), école, pièces auto, CPA (lues le 2026-11-13
//      par la vraie route, tables = entités de la lecture) : 100 % des tables ont
//      leur tétrade, 100 % des routes ont un écran, le validateur couche 2 ne
//      lève AUCUN refus de graphe ; le compte mène à l'aide, au contact, aux
//      mentions légales et déconnecte ; le parcours lu est relié d'écran en écran ;
//   ② quand la lecture ne nomme aucun rôle de gestion, la dérivation le DIT
//      (pièces auto : la gestion tombe au premier rôle lu, « client ») ;
//   ③ une colonne secrète est retirée des écrans dès la dérivation (A1, écran 10 :
//      utilisateur.mot_de_passe) ;
//   ④ la dérivation est déterministe.
// Rouge-puis-vert : les sous-pages du compte retirées du squelette → ① rouge ;
// la vue « editer » retirée de la tétrade → ① et ② rouges.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contexteDuPlan, deriverPlan, mesurerPlan, squeletteDeSpec, type LectureGraphe } from '../graphe'
import { validerSpec, type Contexte, type TableLue } from '../validateur'

const J = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'lectures-v2.json'), 'utf8')) as {
  lectures: Record<string, { lecture: LectureGraphe; tables: TableLue[] }>
}
const GRAPHE = ['ROUTE_SANS_ECRAN', 'ROUTE_DOUBLE', 'ROUTE_HORS_PLAN', 'ECRAN_SANS_ENTREE', 'ECRAN_SANS_SORTIE', 'TETRADE_INCOMPLETE', 'COMPTE_INCOMPLET', 'BARRE_HORS_BORNES', 'PARCOURS_ROMPU']

function juger(l: LectureGraphe, tables: TableLue[]) {
  const plan = deriverPlan(l, tables)
  const spec = squeletteDeSpec(plan)
  const v = validerSpec(spec, contexteDuPlan(plan, l), { complet: true })
  return { plan, spec, mesure: mesurerPlan(plan, spec), v, classes: [...new Set(v.refus.map((r) => r.classe))].sort() }
}

describe('V2 · le graphe dérivé de la lecture', () => {
  it('① cinq lectures réelles : 100 % des tables, 100 % des routes, aucun refus de graphe', () => {
    expect(Object.keys(J.lectures)).toEqual(['5b1c20bc', '94cf0489', 'ecole-a13f8f9f', 'pieces-c4522e43', 'cpa-fa0ede2c'])
    for (const [id, { lecture, tables }] of Object.entries(J.lectures)) {
      const r = juger(lecture, tables)
      expect(r.mesure.tablesCompletes, id).toBe(r.mesure.tables)
      expect(r.mesure.routesCouvertes, id).toBe(r.mesure.routes)
      expect(r.v.refus.filter((x) => GRAPHE.includes(x.classe)), id).toEqual([])
      expect(r.v.zodOk, id).toBe(true)
      // Le seul refus admis avant le modèle : les textes du squelette pas encore traduits (5b1c20bc lit fr, en, ar).
      expect(r.classes.filter((c) => c !== 'TRADUCTION_MANQUANTE'), id).toEqual([])
      // Chaque écran lu a sa route ; le parcours lu est entièrement en routes.
      for (const nom of lecture.ecrans) expect(r.plan.routes.some((x) => x.nom === nom || ['accueil', 'aide'].includes(x.route)), `${id} · ${nom}`).toBe(true)
      expect(r.plan.parcours).toHaveLength((lecture.parcours ?? []).length)
    }
    const mesures = Object.fromEntries(Object.entries(J.lectures).map(([id, x]) => [id, juger(x.lecture, x.tables).mesure]))
    expect(mesures).toEqual({
      '5b1c20bc': { tables: 7, tablesCompletes: 7, routes: 47, routesCouvertes: 47 },
      '94cf0489': { tables: 7, tablesCompletes: 7, routes: 47, routesCouvertes: 47 },
      'ecole-a13f8f9f': { tables: 6, tablesCompletes: 6, routes: 37, routesCouvertes: 37 },
      'pieces-c4522e43': { tables: 7, tablesCompletes: 7, routes: 39, routesCouvertes: 39 },
      'cpa-fa0ede2c': { tables: 7, tablesCompletes: 7, routes: 41, routesCouvertes: 41 },
    })
  })

  it('② aucun rôle de gestion lu : la dérivation le dit', () => {
    const r = juger(J.lectures['pieces-c4522e43']!.lecture, J.lectures['pieces-c4522e43']!.tables)
    expect(r.plan.refus.filter((x) => x.quoi === 'rôle de gestion')).toHaveLength(1)
    expect(r.plan.routes.filter((x) => x.origine === 'tetrade').every((x) => x.acces === 'client')).toBe(true)
  })

  it('③ une colonne secrète n’entre dans aucun écran : retirée dès la dérivation', () => {
    const A = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'aveugle-a1.specs.json'), 'utf8')) as { contextes: Record<string, Contexte> }
    const tables = A.contextes['35ed32c1']!.tables
    expect(tables.find((t) => t.nom === 'utilisateur')?.colonnes).toContain('mot_de_passe')
    const r = juger({ ecrans: ['page publique'], roles: ['Administrateur'] }, [...tables])
    expect(r.plan.refus.filter((x) => /COLONNE_SECRETE/u.test(x.motif)).map((x) => x.quoi)).toEqual(['table « utilisateur »'])
    expect(JSON.stringify(r.spec)).not.toContain('mot_de_passe')
    expect(r.classes).toEqual([])
  })

  it('④ déterministe', () => {
    const { lecture, tables } = J.lectures['5b1c20bc']!
    expect(squeletteDeSpec(deriverPlan(lecture, tables))).toEqual(squeletteDeSpec(deriverPlan(structuredClone(lecture), structuredClone(tables))))
  })
})
