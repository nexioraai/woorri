// 3c · BRIQUE 6 — L'ORCHESTRATEUR : plan → squelette → écrans (4 à la fois) →
// assemblage → juges globaux. Appeleurs simulés ; assembleur et juge RÉELS.
//   ① deux écrans livrés, un échoué deux fois : l'application est livrée AVEC un
//      écran « à compléter » visible ; `ecrans` et PERIMETRE le disent ; les
//      tentatives deviennent des tours ; le juge monte l'ensemble, ≥ 3 écrans ;
//   ② la persistance est STRUCTURELLE : une table écrite par un écran livré est
//      lue et écrite ; une table que seul l'écran échoué portait est en défaut ;
//   ③ les écrans partent AU PLUS quatre à la fois, et plus d'un à la fois ;
//   ④ sans écran lu, un écran par table (gestion) plus un accueil, et le plan le dit ;
//   ⑤ la route `direct` appelle `boucleEcrans`, plus `boucleEcriture`, et écrit
//      `ecrans`, `plan` et `reflexion` dans la ligne (ancres de source).
// Rouge-puis-vert : l'écran échoué livré tel quel (plus de « à compléter ») → ① rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { boucleEcrans, enParallele, persistanceStructurelle } from '../boucle-ecrans'
import type { AppelEcran } from '../boucle-ecran'
import { validerPlan } from '../plan-ecrans'
import { motifTexte } from './motif-texte'

const ENTITES = [
  { id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, { id: 'fld_montant', name: 'montant', type: 'number', required: true }] },
  { id: 'ent_avis', name: 'avis', fields: [{ id: 'fld_texte', name: 'texte', type: 'text', required: true }] },
]
const LECTURE = { ecrans: ['accueil', 'réservations', 'avis'], roles: ['Particulier'], questionsOuvertes: ['Tarif à fixer'] }
const PLAN_JSON = JSON.stringify({ ECRANS: [
  { nom: 'accueil', role: 'visiteur', navigation: 'public', lit: [], ecrit: [], extrait: '' },
  { nom: 'réservations', role: 'Particulier', navigation: 'public', lit: ['reservation'], ecrit: ['reservation'], extrait: '' },
  { nom: 'avis', role: 'visiteur', navigation: 'public', lit: ['avis'], ecrit: ['avis'], extrait: '' },
] })
const ACCUEIL = `=== ecrans/accueil.tsx ===
import React from 'react'
import type { Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) { return <section><h1>Bienvenue chez Hayine</h1><p>Réservez en trois gestes.</p></section> }`
const RESERVATIONS = `=== ecrans/reservations.tsx ===
import React from 'react'
import { useTable } from '../systeme/base'
import { Bouton, EtatVide } from '../systeme/ui'
import { formaterMontant } from '../systeme/argent'
import type { Reservation, Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) {
  const t = useTable<Reservation>('reservation')
  if (t.chargement) return <p>Chargement…</p>
  if (t.erreur !== null) return <p role="alert">{t.erreur}</p>
  return <section><h1>Mes réservations</h1>
    {t.lignes.length === 0 ? <EtatVide message="Aucune réservation" detail="Ajoutez la première." /> : <ul>{t.lignes.map((l) => <li key={l.id}>{l.statut} — {formaterMontant(l.montant)}</li>)}</ul>}
    <Bouton texte="Ajouter une réservation" surClic={() => { void t.ajouter({ statut: 'choisie', montant: 1000 }) }} /></section>
}`
const AVIS_FAUTIF = `=== ecrans/avis.tsx ===
import React from 'react'
export default function Ecran() { fetch('/x'); return <p className="x">avis</p> }`

const appeleurParEcran = (reponses: Record<string, readonly string[]>, delaiMs = 0) => {
  const appels: string[] = []
  let enVol = 0
  let maxEnVol = 0
  const appeler: AppelEcran = async (_system, messages) => {
    const fiche = messages[0]!.content
    const slug = /FICHIER : ecrans\/([a-z0-9-]+)\.tsx/u.exec(fiche)?.[1] ?? '?'
    appels.push(slug)
    enVol += 1
    maxEnVol = Math.max(maxEnVol, enVol)
    if (delaiMs > 0) await new Promise((r) => setTimeout(r, delaiMs))
    enVol -= 1
    const deja = appels.filter((s) => s === slug).length - 1
    const liste = reponses[slug] ?? ['']
    return { texte: liste[Math.min(deja, liste.length - 1)] ?? '', tronquee: false, usage: { entree: 100, sortie: 50, reflexion: 0 } }
  }
  return { appeler, appels, maxEnVol: () => maxEnVol }
}

describe('3c · brique 6 · l’orchestrateur', () => {
  it('① deux écrans livrés, un échoué ×2 : livrée avec un écran « à compléter » visible, compté, et le juge monte l’ensemble', async () => {
    const { appeler, appels } = appeleurParEcran({ accueil: [ACCUEIL], reservations: [RESERVATIONS], avis: [AVIS_FAUTIF, AVIS_FAUTIF] })
    const r = await boucleEcrans({ demande: 'Hayine : réservations et avis des clients, paiement.', configuration: { currency: 'XAF' }, entites: ENTITES, lecture: LECTURE, nom: 'Hayine', appelerEcran: appeler, appelerLeger: async () => PLAN_JSON })
    expect(r.ok, r.ok ? '' : r.motif).toBe(true)
    if (!r.ok) return
    expect(r.ecrans.map((e) => `${e.slug}:${e.resultat}:${String(e.tentatives.length)}`)).toEqual(['accueil:ok:1', 'reservations:ok:1', 'avis:a_completer:2'])
    expect(appels.filter((s) => s === 'avis')).toHaveLength(2)
    expect(r.ecrans[2]!.reproches.join('\n')).toMatch(/INTERDIT DANS UN ÉCRAN/u)
    expect(r.fichiers.get('ecrans/avis.tsx')).toContain('À compléter : avis')
    expect(r.fichiers.get('ecrans/reservations.tsx')).toContain('Mes réservations')
    expect(r.fichiers.get('PERIMETRE.md')).toMatch(motifTexte('Écrans livrés : 2 / 3.'))
    expect(r.fichiers.get('PERIMETRE.md')).toMatch(motifTexte('- avis (visiteur, public, tables : avis) : À COMPLÉTER'))
    expect(r.fichiers.get('PERIMETRE.md')).toContain('Tarif à fixer')
    expect(r.tours.map((t) => t.ok)).toEqual([true, true, false, false])
    expect(r.execution?.indisponible).toBeUndefined()
    expect(r.execution?.erreurs.map((e) => e.message)).toEqual([])
    expect(r.execution?.monteDansSimulateur).toBe(true)
    expect(r.execution?.ecransDistincts ?? 0).toBeGreaterThanOrEqual(3)
    expect(r.jetons).toEqual([])
    expect(r.plan.ecrans).toHaveLength(3)
  }, 180_000)

  it('② la persistance est structurelle', () => {
    const plan = validerPlan(JSON.parse(PLAN_JSON), LECTURE, ENTITES, 'x')
    const ok = (slug: string, nom: string, fichier: string) => ({ nom, slug, resultat: 'ok' as const, fichier, tentatives: [], ms: 1, jetons: { entree: 0, sortie: 0, reflexion: 0 }, reproches: [] })
    const echoue = (slug: string, nom: string) => ({ nom, slug, resultat: 'a_completer' as const, fichier: null, tentatives: [], ms: 1, jetons: { entree: 0, sortie: 0, reflexion: 0 }, reproches: ['x'] })
    const d = persistanceStructurelle(plan, [ok('accueil', 'accueil', 'x'), ok('reservations', 'réservations', "const t = useTable<Reservation>('reservation'); t.ajouter({})"), echoue('avis', 'avis')], ENTITES)
    expect(d).toEqual([{ table: 'avis', lue: false, ecrite: false }])
    // Lue d'après le plan mais jamais appelée dans le fichier : pas lue.
    const d2 = persistanceStructurelle(plan, [ok('reservations', 'réservations', 'rien')], ENTITES)
    expect(d2.find((x) => x.table === 'reservation')).toEqual({ table: 'reservation', lue: false, ecrite: false })
    // Appelée sans ajouter/modifier/supprimer : lue, pas écrite.
    const d3 = persistanceStructurelle(plan, [ok('reservations', 'réservations', "useTable('reservation')")], ENTITES)
    expect(d3.find((x) => x.table === 'reservation')).toEqual({ table: 'reservation', lue: true, ecrite: false })
  })

  it('③ les écrans partent au plus quatre à la fois, et plus d’un à la fois', async () => {
    const vus: number[] = []
    let enVol = 0
    const taches = Array.from({ length: 9 }, (_, i) => async () => { enVol += 1; vus.push(enVol); await new Promise((r) => setTimeout(r, 20)); enVol -= 1; return i })
    const r = await enParallele(taches, 4)
    expect(r).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(Math.max(...vus)).toBe(4)
    expect(Math.max(...vus)).toBeGreaterThan(1)
    const seul = await enParallele([async () => 'a'], 4)
    expect(seul).toEqual(['a'])
  })

  it('④ sans écran lu : un écran par table en gestion, plus un accueil — et le plan le dit', async () => {
    const consignes: string[] = []
    const r = await boucleEcrans({
      demande: 'x', entites: ENTITES, lecture: { ecrans: [], roles: [], questionsOuvertes: [] }, nom: 'T',
      appelerEcran: async (_s, m) => ({ texte: '', tronquee: false, usage: { entree: 1, sortie: 1, reflexion: 0 } }),
      appelerLeger: async (system) => { consignes.push(system); return 'rien' },
      juger: async () => ({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 1 }),
      jugerFaces: async () => ({ aTourne: true, motif: null, defauts: [] }) as never,
    })
    expect(consignes[0]).toContain('accueil · reservation · avis')
    expect(r.plan.ecrans.map((e) => e.nom)).toEqual(['accueil', 'reservation', 'avis'])
    expect(r.plan.refuses[0]).toMatchObject({ quoi: 'lecture' })
    expect(r.ecrans.every((e) => e.resultat === 'a_completer')).toBe(true)
  }, 180_000)

  it('⑤ la route direct appelle boucleEcrans, plus boucleEcriture, et écrit écrans, plan et réflexion dans la ligne', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'), 'utf8')
    expect(src).toMatch(motifTexte('resultat = await boucleEcrans({'))
    expect(src).not.toMatch(/\bboucleEcriture\(/u)
    expect(src).toMatch(motifTexte("{ reflexion: false, maxJetons: MAX_JETONS_ECRAN }"))
    expect(src).toMatch(motifTexte('lecture: { ecrans: lectureBrief.ecrans, roles: lectureBrief.roles, questionsOuvertes: lectureBrief.questionsOuvertes }'))
    expect(src).toMatch(motifTexte('ecrans: resultat.ecrans.map('))
    expect(src).toMatch(motifTexte('plan: { refuses: resultat.plan.refuses,'))
    expect(src).toMatch(/^\s*reflexion,$/mu)
  })
})
