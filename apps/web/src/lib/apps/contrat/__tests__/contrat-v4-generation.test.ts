// V4 · BLOC 2 — LA GÉNÉRATION BRANCHÉE, DE BOUT EN BOUT, MODÈLE SIMULÉ (0 $).
//
//   ① les sources du moteur émises dans l'œuvre sont CELLES du dépôt (le
//      module généré n'a pas dérivé) ;
//   ② une lecture Hayine RÉELLE (5b1c20bc : 16 écrans, 4 rôles, parcours de
//      6, fr/en/ar), le cahier réel, un plan flash tiré du plan réel 94cf0489
//      → l'application entière : 0 refus du contrat (graphe, traductions
//      comprises), persistance 0 défaut, assemblée et remise au juge
//      d'exécution (le RÉEL, 32 s : contrat-v4.navigateur.ts ③) ; la ligne
//      porte chaque écran (archétype, choix, tentatives, repli, jetons, coût)
//      et chaque langue ; les appels sont ceux annoncés (2 par écran lu, 1 par
//      langue autre que la principale, 1 plan) ;
//   ③ l'archétype : celui du plan s'il tient ; hors des treize noms, absent ou
//      incompatible → déduit par règle, et consigné ;
//   ④ sur les CINQ lectures réelles, même tout en repli, l'application passe
//      le contrat entier et sa persistance est complète (la couture tient le
//      graphe par construction) ;
//   ⑤ le magasin en base : lecture en attente puis idéale, écriture, erreur
//      rendue, connexion — sur un client simulé.
// Rouge-puis-vert : la couture du parcours retirée → ② et ④ rouges ; une
// langue non traduite → ② rouge ; le moteur modifié sans réémettre → ① rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { EntiteDeclaree } from '../../entites-declarees'
import type { LectureGraphe } from '../graphe'
import { genererApplication, type LectureV4 } from '../generation'
import { MagasinBase, type ClientBase } from '../rendu/base'
import { SOURCES_MOTEUR } from '../sources-moteur'
import type { TableLue } from '../validateur'
import { creerFrom, journalVierge } from '@/lib/testing/postgrest'
import { modeleSimule, planSimule } from './modele-simule-v4'

const R = join(__dirname, '..', 'rendu')
const J = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'lectures-v2.json'), 'utf8')) as { lectures: Record<string, { lecture: LectureGraphe; tables: TableLue[] }> }
const CAHIER = readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
const PLAN_94 = JSON.parse(readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'plan-94cf0489.json'), 'utf8')) as { ecrans: { nom: string; role: string; navigation: string; tables: { lit: string[]; ecrit: string[] } }[] }
const PRIX = { entree: 1.32, sortie: 3.96 }

const entites = (tables: readonly TableLue[]): EntiteDeclaree[] => tables.map((t) => ({
  id: `ent_${t.nom}`, name: t.nom, fields: t.colonnes.map((c) => ({ id: `fld_${c}`, name: c, type: 'string', required: false })),
  ...(t.journal === true ? { appendOnly: true } : {}), ...(t.publique === true ? { lecturePublique: true } : {}),
}))
const lectureV4 = (l: LectureGraphe): LectureV4 => ({ ecrans: l.ecrans, roles: l.roles, parcours: l.parcours ?? [], langues: l.langues ?? [], devises: l.devises ?? [], moyensPaiement: l.moyensPaiement ?? [], pays: l.pays ?? [] })

/** Le plan flash : le plan réel de 94cf0489, plus des archétypes — un juste, un hors liste, un incompatible, les autres absents. */
const ARCHETYPES_DU_PLAN: Readonly<Record<string, string>> = { 'résultats': 'liste', 'détail': 'detail', 'récapitulatif/paiement': 'checkout', 'notifications': 'table-admin', 'recherche': 'dashboard' }
const planHayine = () => ({ ECRANS: PLAN_94.ecrans.map((e) => ({ nom: e.nom, role: e.role, navigation: e.navigation, lit: e.tables.lit, ecrit: e.tables.ecrit, extrait: '', ...(ARCHETYPES_DU_PLAN[e.nom] !== undefined ? { archetype: ARCHETYPES_DU_PLAN[e.nom] } : {}) })) })

/** Le juge d'exécution RÉEL sur Hayine (32 s mesurées) est éprouvé dans contrat-v4.navigateur.ts ③ ; ici, il est simulé. */
const JUGE_SIMULE = () => Promise.resolve({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 })

async function hayine(o: { echecB?: (u: string) => boolean } = {}) {
  const { lecture, tables } = J.lectures['5b1c20bc']!
  const m = modeleSimule(o)
  const p = planSimule(planHayine())
  const r = await genererApplication({ demande: CAHIER, nom: 'Hayine', lecture: lectureV4(lecture), entites: entites(tables), devise: 'XAF', appelerModele: m.appeler, appelerLeger: p.appeler, prix: PRIX, juger: JUGE_SIMULE })
  return { r, m, p, lecture }
}

describe('V4 · bloc 2 · la génération branchée', () => {
  it('① les sources du moteur émises sont celles du dépôt', () => {
    expect(Object.keys(SOURCES_MOTEUR).sort()).toEqual(['rendu/base.ts', 'rendu/donnees.ts', 'rendu/moteur.tsx', 'rendu/textes-systeme.ts'])
    for (const [k, v] of Object.entries(SOURCES_MOTEUR)) expect(v === readFileSync(join(R, k.replace(/^rendu\//u, '')), 'utf8'), `${k} : relancer node scripts/emettre-sources-moteur.mjs`).toBe(true)
  })

  it('② Hayine réelle → application entière, contrat 0 refus, juges verts, ligne complète', async () => {
    const { r, m, p, lecture } = await hayine()
    expect(r.ok, r.motif ?? '').toBe(true)
    expect(r.contrat.map((x) => `${x.classe} · ${x.chemin} · ${x.quoi}`)).toEqual([])
    expect(r.persistance).toEqual([])
    // Les routes : 47 (V2) ; une ligne par route ; les écrans lus passent au modèle, les autres non.
    expect(r.ecrans).toHaveLength(47)
    const lus = r.ecrans.filter((e) => e.choix !== 'deribfy')
    expect(lus.length).toBe(r.graphe.routes.filter((x) => x.origine === 'lecture').length)
    for (const e of lus) {
      expect([e.tentativesA, e.tentativesB], e.route).toEqual([1, 1])
      expect(e.repli, e.route).toBe(false)
      expect(e.cout, e.route).toBeCloseTo((2 * 1200 * 1.32 + 2 * 400 * 3.96) / 1e6, 12)
    }
    expect(r.couverture).toMatchObject({ lus: lus.length, remplis: lus.length, replis: [], taux: 1 })
    // Les appels : 1 plan, 2 par écran lu (réflexion coupée), 1 par langue autre que la principale.
    expect(p.appels).toBe(1)
    expect(m.appels.filter((a) => a.passe === 'A')).toHaveLength(lus.length)
    expect(m.appels.filter((a) => a.passe === 'B')).toHaveLength(lus.length)
    expect(m.appels.filter((a) => a.passe === 'T')).toHaveLength((lecture.langues ?? []).length - 1)
    expect(m.appels.every((a) => a.reflexion === false)).toBe(true)
    // Les langues : chaque clé traduite, rien laissé dans la langue principale.
    expect(r.langues.map((l) => [l.langue, l.nonTraduits.length, l.cles > 100])).toEqual([['en', 0, true], ['ar', 0, true]])
    expect(r.langues.every((l) => l.parDeribfy > 0 && l.envoyes + l.parDeribfy === l.cles)).toBe(true)
    // Le juge d'exécution reçoit l'application assemblée (le réel : contrat-v4.navigateur.ts ③).
    expect(r.execution).not.toBeNull()
    expect(r.code).not.toBeNull()
    // Le coût : somme des écrans et des langues.
    const attendu = r.ecrans.reduce((a, e) => a + e.cout, 0) + r.langues.reduce((a, l) => a + l.cout, 0)
    expect(r.cout).toBeCloseTo(attendu, 12)
    expect(r.languesPage).toEqual([{ code: 'fr', dir: 'ltr' }, { code: 'en', dir: 'ltr' }, { code: 'ar', dir: 'rtl' }])
  })

  it('③ l’archétype : du plan s’il tient, sinon par règle — et consigné', async () => {
    const { r } = await hayine()
    const de = (route: string) => r.ecrans.find((e) => e.route === route)!
    expect([de('resultats').archetype, de('resultats').choix]).toEqual(['liste', 'plan'])
    expect([de('detail').archetype, de('detail').choix]).toEqual(['detail', 'plan'])
    expect([de('recapitulatif-paiement').archetype, de('recapitulatif-paiement').choix]).toEqual(['checkout', 'plan'])
    // Hors des treize : par règle, consigné.
    expect(de('notifications').choix).toBe('regle')
    expect(r.consignes.filter((c) => c.quoi === 'écran « notifications », archétype').map((c) => c.motif)).toEqual([expect.stringMatching(/^« table-admin » hors des treize noms → [a-zA-Z]+, déduit par règle$/u)])
    // Incompatible : recherche n'a aucune table, « dashboard » en lit une → onboarding par règle.
    expect([de('recherche').archetype, de('recherche').choix]).toEqual(['onboarding', 'regle'])
    expect(r.consignes.filter((c) => c.quoi === 'écran « recherche », archétype').map((c) => c.motif)).toEqual(['« dashboard » lit une table, et l\'écran n\'en a aucune → onboarding, déduit par règle'])
    // Une route du socle (aide) est écrite par Deribfy, quoi que dise le plan.
    expect(de('aide').choix).toBe('deribfy')
    // Un écran de langue : onboarding, il porte le choix de langue.
    expect([de('demarrage-langue').archetype, de('demarrage-langue').choix]).toEqual(['onboarding', 'regle'])
    // Absent du plan : par règle.
    expect(de('profil').choix).toBe('regle')
  })

  it('④ cinq lectures réelles, tout en repli : le contrat entier tient, la persistance est complète', async () => {
    for (const [id, { lecture, tables }] of Object.entries(J.lectures)) {
      const m = modeleSimule({ echecB: () => true })
      const r = await genererApplication({ demande: '', nom: id, lecture: lectureV4(lecture), entites: entites(tables), devise: null, appelerModele: m.appeler, appelerLeger: planSimule({ ECRANS: [] }).appeler, prix: PRIX, juger: () => Promise.resolve({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 }) })
      expect(r.ok, `${id} : ${r.motif ?? ''}`).toBe(true)
      expect(r.contrat.map((x) => `${x.classe} · ${x.chemin} · ${x.quoi}`), id).toEqual([])
      expect(r.persistance, id).toEqual([])
      const lus = r.ecrans.filter((e) => e.choix !== 'deribfy')
      expect(lus.every((e) => e.repli && e.tentativesB === 3), id).toBe(true)
      expect(r.couverture.taux, id).toBe(lus.length === 0 ? null : 0)
    }
  }, 300_000)

  it('⑥ la configuration du client atteint chaque passe A, et prime sur le cahier', async () => {
    const { lecture, tables } = J.lectures['5b1c20bc']!
    const m = modeleSimule()
    await genererApplication({ demande: CAHIER, nom: 'Hayine', lecture: lectureV4(lecture), entites: entites(tables), devise: 'XAF', configuration: { nom_produit: 'Hayine', currency: 'XAF', market: 'Tchad et Cameroun' }, appelerModele: m.appeler, appelerLeger: planSimule(planHayine()).appeler, prix: PRIX, juger: () => Promise.resolve({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 }) })
    const a = m.appels.filter((x) => x.passe === 'A')
    expect(a.length).toBeGreaterThan(0)
    expect(a.every((x) => x.user.includes('CONFIGURATION DU CLIENT — elle PRIME sur le cahier :\n- MARCHÉ VISÉ : Tchad et Cameroun'))).toBe(true)
    // Le nom et la devise sont imposés ailleurs : la fiche ne les répète pas comme configuration.
    expect(a.some((x) => /- NOM_PRODUIT|- CURRENCY/u.test(x.user))).toBe(false)
  }, 120_000)

  it('⑤ le magasin en base : attente puis idéal, écriture, erreur rendue, connexion', async () => {
    // Le double PostgREST du dépôt : il honore `.select` et CAPTURE les écritures et les filtres posés.
    const journal = journalVierge()
    let refuser = false
    const client = {
      from: creerFrom({ offre: { reponse: () => (refuser ? { data: null, error: { message: 'refusé par la base' } } : { data: [{ id: 'a', nom: 'Un' }], error: null }) } }, journal),
      auth: { signInWithPassword: ({ password }: { email: string; password: string }) => Promise.resolve({ data: null, error: password === 'bon' ? null : { message: 'Identifiants invalides' } }) },
    } as unknown as ClientBase
    const m = new MagasinBase(client, ['offre'])
    // Pendant la requête : l'attente, jamais l'état vide.
    expect(m.lire('offre').etat).toBe('attente')
    await new Promise((f) => setTimeout(f, 0))
    expect(m.lire('offre')).toMatchObject({ etat: 'ideal', lignes: [{ id: 'a', nom: 'Un' }] })
    expect(journal.projections.offre).toBe('*')
    // Les trois écritures partent en base, avec leur cible.
    expect(await m.ecrire('offre', 'creer', null, { nom: 'Deux' })).toBeNull()
    expect(await m.ecrire('offre', 'modifier', { id: 'a' }, { nom: 'Un bis' })).toBeNull()
    expect(await m.ecrire('offre', 'supprimer', { id: 'a' }, {})).toBeNull()
    expect(journal.ecritures.offre).toEqual([{ op: 'insert', charge: { nom: 'Deux' } }, { op: 'update', charge: { nom: 'Un bis' } }, { op: 'delete', charge: undefined }])
    expect(journal.filtres.offre).toEqual([['eq', 'id', 'a'], ['eq', 'id', 'a']])
    expect(await m.ecrire('offre', 'modifier', null, {})).toBe('Aucune ligne choisie.')
    // Une base qui refuse : l'erreur, avec son message — jamais une liste vide.
    refuser = true
    m.recharger()
    await new Promise((f) => setTimeout(f, 0))
    expect(m.lire('offre')).toMatchObject({ etat: 'erreur', erreur: 'refusé par la base' })
    expect(await m.ecrire('offre', 'creer', null, { nom: 'Trois' })).toBe('refusé par la base')
    expect(await m.connecter('a@b.td', 'mauvais')).toBe('Identifiants invalides')
    expect(await m.connecter('a@b.td', 'bon')).toBeNull()
  })
})
