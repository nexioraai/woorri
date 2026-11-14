// V4 · BLOC 1 — UN ÉCRAN EN DEUX PASSES, MODÈLE SIMULÉ (0 $).
//
//   ① une spec valide du premier coup → EXACTEMENT deux appels : A puis B,
//      réflexion COUPÉE dans les deux ; l'écran est celui de l'archétype ;
//      sur les dix-sept écrans du témoin V3 ;
//   ② une passe B refusée reçoit, à la relance, la CLASSE exacte et le nom le
//      plus proche ; acceptée ensuite → trois appels, pas de repli ;
//   ③ une passe B refusée à chaque fois → deux relances, pas une de plus
//      (quatre appels), puis REPLI : compté, et le repli passe le contrat ;
//   ④ le repli ne laisse JAMAIS un slot requis vide et passe le contrat — sur
//      chaque écran du témoin, et sur les CINQ lectures réelles (chaque table ×
//      chaque archétype qui lit une table, plus les écrans sans table) ;
//   ⑤ une réponse illisible ou coupée est refusée par sa classe ;
//   ⑥ la table est IMPOSÉE : celle que le modèle écrirait est écrasée ; les
//      jetons et le coût sont ceux des appels.
//   ⑧ A coupée → UNE relance de A, enregistrée ; ⑨ A vide deux fois → repli,
//      jamais de passe B sur un brouillon vide.
// Rouge-puis-vert : la passe A ou B sans `reflexion: false` → ① rouge ; trois
// relances → ③ rouge ; le repli sans `vide` → ④ rouge ; la relance sans le nom
// proche → ② rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ARCHETYPES, PAGE_DU_COMPTE, expanser, validerRemplissage, type Remplissage } from '../archetypes'
import { contexteDuPlan, deriverPlan, type LectureGraphe } from '../graphe'
import {
  MAX_JETONS_A, MAX_JETONS_B, consigneA, consigneB, remplirEcran, repli,
  type AppelModele, type FicheEcran, type OptionsAppelModele,
} from '../deux-passes'
import type { Contexte, TableLue } from '../validateur'
import { motifTexte } from '../../__tests__/motif-texte'
import { CTX, LANGUES, REMPLISSAGES } from './temoin-v3'

const PRIX = { entree: 1.32, sortie: 3.96 }
const USAGE = { entree: 1000, sortie: 500, reflexion: 300 }

function ficheTemoin(r: Remplissage): FicheEcran {
  const table = (n: unknown) => CTX.tables.find((t) => t.nom === n)
  return {
    route: r.route, nom: String(r.slots.titre), archetype: r.archetype, acces: r.acces,
    ...(table(r.slots.table) !== undefined ? { table: table(r.slots.table)! } : {}),
    ...(table(r.slots.tablePaiement) !== undefined ? { tablePaiement: table(r.slots.tablePaiement)! } : {}),
    voisines: REMPLISSAGES.filter((x) => x.route !== r.route).map((x) => ({ route: x.route, nom: String(x.slots.titre), archetype: x.archetype, ...(typeof x.slots.table === 'string' ? { table: x.slots.table } : {}) })),
    langue: 'fr', langues: LANGUES, devise: 'XAF', moyensPaiement: CTX.moyensPaiement, extrait: '',
  }
}
const slotsDuModele = (r: Remplissage) => Object.fromEntries(Object.entries(r.slots).filter(([k]) => k !== 'table' && k !== 'tablePaiement'))

type Appel = { system: string; messages: readonly { role: string; content: string }[]; options: OptionsAppelModele }
/** Le modèle simulé : la passe A rend un brouillon, la passe B rend, tour à tour, les réponses données. */
function simule(r: Remplissage, reponsesB: readonly string[], o: { tronqueeB?: boolean[]; reponsesA?: string[]; tronqueeA?: boolean[] } = {}): { appeler: AppelModele; appels: Appel[] } {
  const appels: Appel[] = []
  let a = 0
  let b = 0
  const appeler: AppelModele = (system, messages, options) => {
    appels.push({ system, messages: messages.map((m) => ({ ...m })), options })
    if (system === consigneA(ficheTemoin(r)).system) {
      const i = a++
      const rep = o.reponsesA ?? [`### titre\n${String(r.slots.titre)}\n`]
      return Promise.resolve({ texte: rep[Math.min(i, rep.length - 1)]!, tronquee: o.tronqueeA?.[i] ?? false, usage: USAGE })
    }
    const i = b++
    return Promise.resolve({ texte: reponsesB[Math.min(i, reponsesB.length - 1)]!, tronquee: o.tronqueeB?.[i] ?? false, usage: USAGE })
  }
  return { appeler, appels }
}
const json = (slots: Record<string, unknown>) => JSON.stringify({ slots })

describe('V4 · bloc 1 · deux passes', () => {
  it('① valide du premier coup : exactement deux appels, sans réflexion, l’écran de l’archétype', async () => {
    expect(REMPLISSAGES).toHaveLength(17)
    for (const r of REMPLISSAGES) {
      const { appeler, appels } = simule(r, [json(slotsDuModele(r))])
      const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
      expect(e.appels, r.route).toBe(2)
      expect(appels, r.route).toHaveLength(2)
      expect(appels[0]!.options, r.route).toEqual({ reflexion: false, maxJetons: MAX_JETONS_A })
      expect(appels[1]!.options, r.route).toEqual({ reflexion: false, maxJetons: MAX_JETONS_B })
      expect(e.repli, r.route).toBe(false)
      expect(e.tentatives.map((t) => `${t.passe}${String(t.rang)}`), r.route).toEqual(['A1', 'B1'])
      expect(e.ecran, r.route).toEqual(expanser(r, { langue: 'fr', langues: LANGUES }))
      // La passe B reçoit le brouillon de la passe A.
      expect(appels[1]!.messages[0]!.content, r.route).toMatch(motifTexte(`### titre\n${String(r.slots.titre)}`))
    }
  })

  it('② refusée une fois : la relance porte la classe et le nom proche ; acceptée ensuite', async () => {
    const r = REMPLISSAGES.find((x) => x.archetype === 'liste')!
    const faux = { ...slotsDuModele(r), colonnes: [{ colonne: 'prixx', libelle: 'Prix' }] }
    const { appeler, appels } = simule(r, [json(faux), json(slotsDuModele(r))])
    const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
    expect(e.appels).toBe(3)
    expect(e.repli).toBe(false)
    expect(e.tentatives[1]!.refus.map((x) => [x.classe, x.proche])).toEqual([['CHAMP_INCONNU', 'prix']])
    const relance = appels[2]!.messages.at(-1)!.content
    expect(relance).toContain('CHAMP_INCONNU')
    expect(relance).toMatch(motifTexte('le plus proche : « prix »'))
    expect(appels[2]!.messages.at(-2)).toEqual({ role: 'assistant', content: json(faux) })
    // Une classe d'archétype : un slot inconnu, et son voisin.
    const { appeler: ap2, appels: a2 } = simule(r, [json({ ...slotsDuModele(r), titr: 'x' }), json(slotsDuModele(r))])
    await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler: ap2, prix: PRIX })
    expect(a2[2]!.messages.at(-1)!.content).toMatch(motifTexte('SLOT_INCONNU · titr'))
    expect(a2[2]!.messages.at(-1)!.content).toMatch(motifTexte('le plus proche : « titre »'))
  })

  it('③ refusée à chaque fois : deux relances, pas une de plus, puis le repli — compté, valide', async () => {
    for (const r of REMPLISSAGES) {
      const { appeler, appels } = simule(r, ['{ pas du json'])
      const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
      expect(appels, r.route).toHaveLength(4)
      expect(e.tentatives.map((t) => `${t.passe}${String(t.rang)}`), r.route).toEqual(['A1', 'B1', 'B2', 'B3'])
      expect(e.repli, r.route).toBe(true)
      expect(e.refusAvantRepli.map((x) => x.classe), r.route).toEqual(['JSON_ILLISIBLE'])
      // Le BRUT de chaque passe B refusée est gardé (V4, bloc 3) : sans lui, le repli de notifications (cdafe7d4) restait inexpliqué.
      expect(e.tentatives.filter((t) => t.passe === 'B').map((t) => t.brut), r.route).toEqual(['{ pas du json', '{ pas du json', '{ pas du json'])
      expect(e.refusDuRepli, r.route).toEqual([])
      expect(validerRemplissage(e.remplissage), r.route).toEqual([])
      // Le premier texte de la passe A devient le titre du repli.
      expect(e.remplissage.slots.titre, r.route).toBe(String(r.slots.titre))
    }
  })

  it('④ le repli passe le contrat, jamais un slot requis vide — témoin et cinq lectures réelles', () => {
    const verifier = (f: FicheEcran, ctx: Contexte, ou: string) => {
      const x = repli(f, ctx, '')
      expect(x.refus.map((y) => `${y.classe} · ${y.ou} · ${y.quoi}`), ou).toEqual([])
      const def = f.archetype === 'pageDuCompte' ? PAGE_DU_COMPTE : ARCHETYPES[f.archetype as keyof typeof ARCHETYPES]
      for (const [k, d] of Object.entries(def.slots)) {
        if (!d.requis) continue
        const v = x.remplissage.slots[k]
        expect(v === undefined || v === '' || (Array.isArray(v) && v.length === 0), `${ou} · ${k} requis vide`).toBe(false)
      }
      return x
    }
    for (const r of REMPLISSAGES) verifier(ficheTemoin(r), CTX, `témoin ${r.route}`)

    const J = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'lectures-v2.json'), 'utf8')) as { lectures: Record<string, { lecture: LectureGraphe; tables: TableLue[] }> }
    const AVEC_TABLE = ['liste', 'recherche', 'detail', 'formulaire', 'profil', 'dashboard', 'tableAdmin', 'confirmation', 'checkout']
    const SANS_TABLE = ['auth', 'onboarding', 'accueil', 'compte']
    let n = 0
    for (const [id, { lecture, tables }] of Object.entries(J.lectures)) {
      const plan = deriverPlan(lecture, tables)
      const ctx = contexteDuPlan(plan, lecture)
      const voisines = plan.routes.filter((x) => x.origine !== 'tetrade').map((x) => ({ route: x.route, nom: x.nom }))
      const commun = { acces: 'visiteur', voisines, langue: ctx.langues[0] ?? 'fr', langues: (ctx.langues.length > 0 ? ctx.langues : ['fr']).map((code) => ({ code, libelle: code })), devise: ctx.devises[0] ?? null, moyensPaiement: ctx.moyensPaiement, extrait: '' }
      const lus = plan.routes.filter((x) => x.origine === 'lecture')
      for (const t of plan.tables) for (const a of AVEC_TABLE) {
        const ecran = lus[n % Math.max(1, lus.length)]
        const acces = t.publique === true ? 'visiteur' : plan.roles.at(-1)!
        verifier({ ...commun, acces, route: ecran?.route ?? 'accueil', nom: ecran?.nom ?? t.nom, archetype: a, table: t, ...(a === 'checkout' ? { tablePaiement: t } : {}) }, ctx, `${id} · ${t.nom} · ${a}`)
        n += 1
      }
      for (const x of lus) for (const a of SANS_TABLE) { verifier({ ...commun, route: x.route, nom: x.nom, archetype: a }, ctx, `${id} · ${x.route} · ${a}`); n += 1 }
      for (const route of ['aide', 'contact', 'legal']) { verifier({ ...commun, route, nom: route, archetype: 'pageDuCompte' }, ctx, `${id} · ${route}`); n += 1 }
    }
    // Mesuré : 537 replis jugés sur les cinq lectures.
    expect(n).toBeGreaterThan(500)
  })

  it('⑤ illisible ou coupée : refusée par sa classe', async () => {
    const r = REMPLISSAGES.find((x) => x.archetype === 'detail')!
    const { appeler, appels } = simule(r, ['[1, 2]', json(slotsDuModele(r)), json(slotsDuModele(r))], { tronqueeB: [false, true, false] })
    const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
    expect(e.tentatives.slice(1).map((t) => t.refus.map((x) => x.classe))).toEqual([['JSON_ILLISIBLE'], ['REPONSE_COUPEE'], []])
    expect(e.repli).toBe(false)
    expect(appels[2]!.messages.at(-1)!.content).toContain('JSON_ILLISIBLE')
    expect(appels[3]!.messages.at(-1)!.content).toContain('REPONSE_COUPEE')
  })

  it('⑧ A coupée : UNE relance de A, enregistrée, puis B sur le nouveau brouillon', async () => {
    const r = REMPLISSAGES.find((x) => x.archetype === 'liste')!
    const { appeler, appels } = simule(r, [json(slotsDuModele(r))], { reponsesA: ['### titre\nToutes les', `### titre\n${String(r.slots.titre)}\n`], tronqueeA: [true, false] })
    const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
    expect(e.tentatives.map((t) => `${t.passe}${String(t.rang)}:${t.refus.map((x) => x.classe).join(',')}`)).toEqual(['A1:REPONSE_COUPEE', 'A2:', 'B1:'])
    expect(e.appels).toBe(3)
    expect(e.repli).toBe(false)
    expect(appels[1]!.messages.at(-1)!.content).toMatch(motifTexte('A ÉTÉ COUPÉ AVANT LA FIN (REPONSE_COUPEE)'))
    expect(appels[1]!.options).toEqual({ reflexion: false, maxJetons: MAX_JETONS_A })
    // Coupée deux fois : pas de troisième A ; B convertit ce qui est écrit (non vide).
    const { appeler: ap2, appels: a2 } = simule(r, [json(slotsDuModele(r))], { reponsesA: [`### titre\n${String(r.slots.titre)}`], tronqueeA: [true, true] })
    const e2 = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler: ap2, prix: PRIX })
    expect(e2.tentatives.map((t) => `${t.passe}${String(t.rang)}`)).toEqual(['A1', 'A2', 'B1'])
    expect(a2).toHaveLength(3)
  })

  it('⑨ A vide : une relance ; vide encore → repli, JAMAIS une passe B sur un brouillon vide', async () => {
    for (const r of REMPLISSAGES) {
      const { appeler, appels } = simule(r, [json(slotsDuModele(r))], { reponsesA: ['', '   \n'] })
      const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
      expect(appels.map((x) => (x.system === consigneA(ficheTemoin(r)).system ? 'A' : 'B')), r.route).toEqual(['A', 'A'])
      expect(e.repli, r.route).toBe(true)
      expect(e.refusAvantRepli.map((x) => x.classe), r.route).toEqual(['BROUILLON_VIDE'])
      expect(e.refusDuRepli, r.route).toEqual([])
      expect(e.remplissage.slots.titre, r.route).toBe(String(r.slots.titre))
    }
    // Vide puis rédigé : B tourne sur le second brouillon.
    const r = REMPLISSAGES[0]!
    const { appeler, appels } = simule(r, [json(slotsDuModele(r))], { reponsesA: ['### titre\n', `### titre\n${String(r.slots.titre)}\n`] })
    const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
    expect(e.tentatives.map((t) => `${t.passe}${String(t.rang)}:${t.refus.map((x) => x.classe).join(',')}`)).toEqual(['A1:BROUILLON_VIDE', 'A2:', 'B1:'])
    expect(appels[1]!.messages.at(-1)!.content).toMatch(motifTexte('ÉTAIT VIDE (BROUILLON_VIDE)'))
    expect(appels[2]!.messages[0]!.content).toMatch(motifTexte(String(r.slots.titre)))
  })

  it('⑦ une fiche incohérente n’atteint jamais le modèle', async () => {
    const r = REMPLISSAGES.find((x) => x.archetype === 'dashboard')!
    const { appeler, appels } = simule(r, [json(slotsDuModele(r))])
    await expect(remplirEcran({ fiche: { ...ficheTemoin(r), acces: 'visiteur' }, ctx: CTX, appeler, prix: PRIX })).rejects.toThrow(/DONNEE_PRIVEE_EXPOSEE/u)
    const sansTable: FicheEcran = Object.fromEntries(Object.entries(ficheTemoin(r)).filter(([k]) => k !== 'table')) as FicheEcran
    await expect(remplirEcran({ fiche: sansTable, ctx: CTX, appeler, prix: PRIX })).rejects.toThrow(/lit une table/u)
    expect(appels).toHaveLength(0)
  })

  it('⑥ la table est imposée ; jetons et coût sont ceux des appels', async () => {
    const r = REMPLISSAGES.find((x) => x.archetype === 'checkout')!
    const { appeler } = simule(r, [json({ ...slotsDuModele(r), table: 'compte', tablePaiement: 'compte' })])
    const e = await remplirEcran({ fiche: ficheTemoin(r), ctx: CTX, appeler, prix: PRIX })
    expect([e.remplissage.slots.table, e.remplissage.slots.tablePaiement]).toEqual(['offre', 'paiement'])
    expect(e.jetons).toEqual({ entree: 2000, sortie: 1000, reflexion: 600 })
    expect(e.cout).toBeCloseTo((2000 * 1.32 + 1000 * 3.96) / 1e6, 12)
    // La table imposée est DITE au modèle, et pas demandée.
    expect(consigneA(ficheTemoin(r)).user).toMatch(motifTexte('IMPOSÉ PAR DERIBFY : table = offre'))
    expect(consigneB(ficheTemoin(r), '').user).not.toMatch(/^"table"/mu)
  })
})
