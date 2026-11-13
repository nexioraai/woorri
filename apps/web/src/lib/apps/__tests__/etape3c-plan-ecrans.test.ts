// 3c · BRIQUE 1 — LE PLAN D'ÉCRANS : rien n'entre qui ne vienne de la lecture.
//
// `validerPlan` est pur : il est appelé avec ce qu'un modèle pourrait rendre,
// et c'est sa conduite qui est jugée :
//   ① un écran que la lecture ne nomme pas est REFUSÉ et consigné ; un écran
//      lu que le modèle a omis est AJOUTÉ (ligne minimale) et consigné ;
//   ② une table qui n'est pas une entité déclarée est REFUSÉE ; les noms
//      gardés sont ceux des entités (casse et accents normalisés) ;
//   ③ un rôle hors lecture devient `visiteur`, consigné ; un rôle lu est gardé
//      sous sa forme lue ;
//   ④ un extrait qui ne CITE pas le cahier est vidé, consigné ; une phrase
//      recopiée est gardée ;
//   ⑤ les slugs sont déterministes, ASCII, uniques ;
//   ⑥ un plan illisible donne quand même une ligne par écran lu ;
//   ⑦ la consigne du plan porte les trois listes fermées et reste courte ;
//   ⑧ `planifierEcrans` lit la réponse brute d'un appeleur simulé.
// Rouge-puis-vert : le refus « hors lecture » retiré → ① rouge.
import { describe, expect, it } from 'vitest'
import { consignePlan, extraitCite, lireJsonDuPlan, planifierEcrans, slugDe, validerPlan } from '../plan-ecrans'

const ENTITES = [
  { id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }] },
  { id: 'ent_paiement', name: 'paiement', fields: [{ id: 'fld_montant', name: 'montant', type: 'number', required: true }] },
] as const
const LECTURE = { ecrans: ['accueil', 'réservations', 'récapitulatif/paiement', 'confirmation'], roles: ['Particulier', 'Administrateur'] }
const CAHIER = 'Le particulier consulte ses réservations et leur statut. Le paiement se fait au récapitulatif, puis une confirmation est affichée. L’administrateur gère les comptes.'

describe('3c · brique 1 · le plan d’écrans', () => {
  it('① un écran hors lecture est refusé, un écran lu omis est ajouté — et les deux sont consignés', () => {
    const p = validerPlan({ ECRANS: [
      { nom: 'réservations', role: 'Particulier', navigation: 'public', lit: ['reservation'], ecrit: ['reservation'], extrait: 'Le particulier consulte ses réservations et leur statut.' },
      { nom: 'tableau de bord secret', role: 'Administrateur', navigation: 'gestion', lit: [], ecrit: [], extrait: '' },
    ] }, LECTURE, ENTITES, CAHIER)
    expect(p.ecrans.map((e) => e.nom)).toEqual(LECTURE.ecrans)
    expect(p.refuses.map((r) => r.quoi)).toEqual(expect.arrayContaining(['écran « tableau de bord secret »', 'écran « accueil »', 'écran « récapitulatif/paiement »', 'écran « confirmation »']))
    expect(p.refuses.find((r) => r.quoi === 'écran « tableau de bord secret »')?.motif).toMatch(/hors lecture/u)
    const omis = p.ecrans.find((e) => e.nom === 'accueil')!
    expect(omis).toMatchObject({ role: 'visiteur', navigation: 'public', tables: { lit: [], ecrit: [] }, extrait: '' })
    const reservations = p.ecrans.find((e) => e.nom === 'réservations')!
    expect(reservations).toMatchObject({ role: 'Particulier', navigation: 'public', tables: { lit: ['reservation'], ecrit: ['reservation'] } })
    expect(reservations.extrait).toBe('Le particulier consulte ses réservations et leur statut.')
  })

  it('② une table hors entités est refusée ; les noms gardés sont ceux des entités', () => {
    const p = validerPlan({ ECRANS: [{ nom: 'confirmation', role: 'Particulier', lit: ['Réservation', 'facture', 'PAIEMENT'], ecrit: ['facture'] }] }, LECTURE, ENTITES, CAHIER)
    const c = p.ecrans.find((e) => e.nom === 'confirmation')!
    expect(c.tables).toEqual({ lit: ['reservation', 'paiement'], ecrit: [] })
    expect(p.refuses.filter((r) => /table « facture »/u.test(r.quoi))).toHaveLength(2)
  })

  it('③ un rôle hors lecture devient visiteur, consigné ; un rôle lu est gardé sous sa forme lue', () => {
    const p = validerPlan({ ECRANS: [
      { nom: 'accueil', role: 'super-admin' },
      { nom: 'réservations', role: 'particulier' },
      { nom: 'confirmation', role: 'public' },
    ] }, LECTURE, ENTITES, CAHIER)
    expect(p.ecrans.find((e) => e.nom === 'accueil')?.role).toBe('visiteur')
    expect(p.refuses.some((r) => /rôle « super-admin »/u.test(r.quoi))).toBe(true)
    expect(p.ecrans.find((e) => e.nom === 'réservations')?.role).toBe('Particulier')
    expect(p.ecrans.find((e) => e.nom === 'confirmation')?.role).toBe('visiteur')
    expect(p.refuses.some((r) => /rôle « public »/u.test(r.quoi))).toBe(false)
  })

  it('④ un extrait qui ne cite pas le cahier est vidé ; une phrase recopiée est gardée', () => {
    expect(extraitCite('Le PAIEMENT se fait au récapitulatif, puis une confirmation est affichée. Les licornes volent.', CAHIER)).toBe('Le PAIEMENT se fait au récapitulatif, puis une confirmation est affichée.')
    expect(extraitCite('Un texte entièrement inventé par le modèle.', CAHIER)).toBe('')
    expect(extraitCite(42, CAHIER)).toBe('')
    const p = validerPlan({ ECRANS: [{ nom: 'confirmation', extrait: 'Un texte entièrement inventé par le modèle.' }] }, LECTURE, ENTITES, CAHIER)
    expect(p.ecrans.find((e) => e.nom === 'confirmation')?.extrait).toBe('')
    expect(p.refuses.some((r) => /extrait/u.test(r.quoi) && /ne cite pas/u.test(r.motif))).toBe(true)
  })

  it('⑤ les slugs sont déterministes, ASCII, uniques', () => {
    expect(slugDe('récapitulatif/paiement')).toBe('recapitulatif-paiement')
    expect(slugDe('démarrage/langue')).toBe('demarrage-langue')
    expect(slugDe('abonnement IA')).toBe('abonnement-ia')
    expect(slugDe('  ')).toBe('ecran')
    const p = validerPlan(null, { ecrans: ['Réglages', 'réglages', 'reglages'], roles: [] }, ENTITES, CAHIER)
    expect(p.ecrans.map((e) => e.slug)).toEqual(['reglages', 'reglages-2', 'reglages-3'])
  })

  it('⑥ un plan illisible donne quand même une ligne par écran lu, et le dit', () => {
    const p = validerPlan(lireJsonDuPlan('désolé, je ne peux pas'), LECTURE, ENTITES, CAHIER)
    expect(p.ecrans).toHaveLength(4)
    expect(p.ecrans.every((e) => e.role === 'visiteur' && e.extrait === '')).toBe(true)
    expect(p.refuses[0]).toMatchObject({ quoi: 'plan' })
    expect(lireJsonDuPlan('voici : {"ECRANS": []} merci')).toEqual({ ECRANS: [] })
    expect(lireJsonDuPlan('{"ECRANS": [')).toBeNull()
  })

  it('⑦ la consigne du plan porte les trois listes fermées et reste courte', () => {
    const c = consignePlan(LECTURE, ENTITES)
    for (const e of LECTURE.ecrans) expect(c).toContain(e)
    for (const r of LECTURE.roles) expect(c).toContain(r)
    for (const t of ENTITES) expect(c).toContain(t.name)
    expect(c).toContain('visiteur')
    expect(c.length).toBeLessThan(1500 + LECTURE.ecrans.join(' · ').length + 200)
  })

  it('⑧ planifierEcrans lit la réponse brute d’un appeleur et valide', async () => {
    const recus: { system: string; texte: string }[] = []
    const appeler = async (system: string, texte: string) => {
      recus.push({ system, texte })
      return 'Voici le plan :\n{"ECRANS":[{"nom":"accueil","role":"visiteur","navigation":"public","lit":["reservation"],"ecrit":[],"extrait":""}]}'
    }
    const p = await planifierEcrans(appeler, LECTURE, ENTITES, CAHIER)
    expect(recus).toHaveLength(1)
    expect(recus[0]!.texte).toBe(CAHIER)
    expect(recus[0]!.system).toContain('réservations')
    expect(p.ecrans[0]).toMatchObject({ nom: 'accueil', slug: 'accueil', role: 'visiteur', tables: { lit: ['reservation'], ecrit: [] } })
    expect(p.ecrans).toHaveLength(4)
  })
})
