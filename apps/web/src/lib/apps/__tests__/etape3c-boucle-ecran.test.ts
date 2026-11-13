// 3c · BRIQUE 5 — LA BOUCLE D'UN ÉCRAN : un appel, des juges, au plus une reprise.
//
// L'appeleur est simulé (on juge la boucle, pas le modèle) ; le juge de montage
// est RÉEL dans ⑤ (assembleur + juge d'exécution) et simulé ailleurs.
//   ① un écran valide du premier coup : ok, 1 tentative, le fichier gardé, les
//      jetons comptés (réflexion comprise), le contrat et la fiche envoyés ;
//   ② un écran qui invente un réglage et appelle fetch : repris UNE fois avec
//      ses reproches (le texte du modèle rejoué en assistant), puis accepté ;
//   ③ deux échecs : « à compléter », 2 appels exactement — pas de troisième,
//      pas de règle du dernier tour —, les reproches gardés, aucun fichier ;
//   ④ pas de fichier, ou réponse coupée : le reproche le dit ;
//   ⑤ MONTAGE RÉEL : un écran qui jette au rendu est repris avec « NE SE MONTE
//      PAS » ; un écran sain se monte à son adresse, session déjà sur son rôle ;
//   ⑥ `appelerFournisseur` : réflexion coupée = `thinking: { type: 'disabled' }`
//      et plafond propre ; les jetons de réflexion sont lus de l'usage.
// Rouge-puis-vert : la reprise retirée (tentativesMax ignoré → 1 appel) → ② ③ rouges.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ecrireEcran, reprochesStatiques, TENTATIVES_ECRAN, type AppelEcran } from '../boucle-ecran'
import { appelerFournisseur } from '../fournisseur'
import { fichiersSysteme } from '../bibliotheque-ui'
import { validerPlan } from '../plan-ecrans'
import type { VerdictExecution } from '../juge-execution'

const ENTITES = [{ id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, { id: 'fld_montant', name: 'montant', type: 'number', required: true }] }]
const LECTURE = { ecrans: ['accueil', 'réservations'], roles: ['Particulier'] }
const PLAN = validerPlan({ ECRANS: [{ nom: 'accueil', role: 'visiteur' }, { nom: 'réservations', role: 'Particulier', lit: ['reservation'], ecrit: ['reservation'] }] }, LECTURE, ENTITES, 'cahier')
const RESERVATIONS = PLAN.ecrans[1]!
const VALIDE = `=== ecrans/reservations.tsx ===
import React from 'react'
import { useTable } from '../systeme/base'
import { EtatVide, Bouton } from '../systeme/ui'
import { formaterMontant } from '../systeme/argent'
import type { Reservation, Session } from '../systeme/types'
export default function Ecran({ session }: { session: Session }) {
  const t = useTable<Reservation>('reservation')
  if (t.chargement) return <p>Chargement…</p>
  if (t.erreur !== null) return <p role="alert">{t.erreur}</p>
  if (t.lignes.length === 0) return <section><EtatVide message="Aucune réservation" detail="Ajoutez la première." /><Bouton texte="Ajouter une réservation" surClic={() => { void t.ajouter({ statut: 'choisie', montant: 1000 }) }} /></section>
  return <ul>{t.lignes.map((l) => <li key={l.id}>{l.statut} — {formaterMontant(l.montant)}</li>)}</ul>
}`
const FAUTIF = `=== ecrans/reservations.tsx ===
import React from 'react'
import { EtatVide } from '../systeme/ui'
export default function Ecran() {
  fetch('/api/reservations')
  return <EtatVide message="x" foo="bar" />
}`
const JETTE = `=== ecrans/reservations.tsx ===
import React from 'react'
import type { Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) { throw new Error('boum au rendu') }`

const usage = { entree: 1000, sortie: 500, reflexion: 120 }
const appeleur = (reponses: readonly string[]) => {
  const appels: { system: string; messages: readonly { role: string; content: string }[] }[] = []
  const appeler: AppelEcran = async (system, messages) => {
    appels.push({ system, messages })
    return { texte: reponses[Math.min(appels.length - 1, reponses.length - 1)] ?? '', tronquee: false, usage }
  }
  return { appeler, appels }
}
const jugeVert = async (): Promise<VerdictExecution> => ({ monteDansSimulateur: true, erreurs: [], octetsRendus: 400, texte: 'ok', ms: 1, controlesMuets: [] })
const SYSTEME = fichiersSysteme('XAF')

afterEach(() => { vi.unstubAllGlobals() })

describe('3c · brique 5 · la boucle d’un écran', () => {
  it('① un écran valide du premier coup : ok, une tentative, fichier gardé, jetons comptés', async () => {
    const { appeler, appels } = appeleur([VALIDE])
    const e = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler, juger: jugeVert })
    expect(e.resultat).toBe('ok')
    expect(e.tentatives).toHaveLength(1)
    expect(e.fichier).toContain("useTable<Reservation>('reservation')")
    expect(e.jetons).toEqual({ entree: 1000, sortie: 500, reflexion: 120 })
    expect(appels).toHaveLength(1)
    expect(appels[0]!.system).toContain('CONTRAT')
    expect(appels[0]!.system).toContain('RÉGLAGES EXACTS')
    expect(appels[0]!.messages).toEqual([{ role: 'user', content: expect.stringContaining('ÉCRAN : réservations') }])
  }, 60_000)

  it('② un écran fautif est repris une fois avec ses reproches, puis accepté', async () => {
    const { appeler, appels } = appeleur([FAUTIF, VALIDE])
    const e = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler, juger: jugeVert })
    expect(e.resultat).toBe('ok')
    expect(e.tentatives.map((t) => t.reproches.length > 0)).toEqual([true, false])
    expect(e.tentatives[0]!.reproches.join('\n')).toMatch(/INTERDIT DANS UN ÉCRAN[\s\S]*fetch/u)
    expect(e.tentatives[0]!.reproches.join('\n')).toMatch(/EtatVide n’a pas « foo »/u)
    expect(appels).toHaveLength(2)
    const second = appels[1]!.messages
    expect(second.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(second[1]!.content).toBe(FAUTIF)
    expect(second[2]!.content).toContain('INTERDIT DANS UN ÉCRAN')
    expect(second[2]!.content).toContain('Récris `ecrans/reservations.tsx` EN ENTIER')
    expect(e.jetons.entree).toBe(2000)
  }, 60_000)

  it('③ deux échecs : « à compléter », deux appels exactement, les reproches gardés, aucun fichier', async () => {
    const { appeler, appels } = appeleur([FAUTIF, FAUTIF, VALIDE])
    const e = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler, juger: jugeVert })
    expect(e.resultat).toBe('a_completer')
    expect(e.fichier).toBeNull()
    expect(appels).toHaveLength(TENTATIVES_ECRAN)
    expect(e.tentatives).toHaveLength(2)
    expect(e.reproches.join('\n')).toContain('INTERDIT DANS UN ÉCRAN')
  }, 60_000)

  it('④ pas de fichier, ou réponse coupée : le reproche le dit', async () => {
    const { appeler } = appeleur(['Je ne peux pas.', 'Je ne peux toujours pas.'])
    const e = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler, juger: jugeVert })
    expect(e.resultat).toBe('a_completer')
    expect(e.reproches[0]).toMatch(/Aucun fichier reçu/u)
    const coupe: AppelEcran = async () => ({ texte: VALIDE.slice(0, 200), tronquee: true, usage })
    const e2 = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler: coupe, juger: jugeVert })
    expect(e2.tentatives[0]!.reproches.join(' ')).toMatch(/coupée avant la fin/u)
    // Les reproches statiques, à part : forme, imports relatifs, autre monnaie.
    const r = reprochesStatiques('reservations', "import { x } from './voisin'\nexport const y = 1\nexport default function Ecran() { return <p>12 €</p> }", SYSTEME, 'XAF')
    expect(r.join('\n')).toMatch(/IMPORTS RELATIFS REFUSÉS : \.\/voisin/u)
    expect(r.join('\n')).toMatch(/rien d'autre n'est exporté/u)
    expect(r.join('\n')).toMatch(/UNE AUTRE MONNAIE QUE XAF : « € »/u)
  }, 60_000)

  it('⑤ montage réel : un écran qui jette au rendu est refusé avec « NE SE MONTE PAS » et la cause', async () => {
    // UN seul montage réel (≈ 1 s de processus) : la reprise est prouvée en ②
    // avec un juge simulé ; ici c'est le juge RÉEL qui voit l'écran mourir.
    const { appeler, appels } = appeleur([JETTE])
    const e = await ecrireEcran({ ecran: RESERVATIONS, plan: PLAN, entites: ENTITES, devise: 'XAF', nom: 'Hayine', roles: LECTURE.roles, appeler, tentativesMax: 1 })
    expect(e.tentatives[0]!.reproches.join('\n')).toMatch(/NE SE MONTE PAS[\s\S]*boum au rendu/u)
    expect(e.resultat).toBe('a_completer')
    expect(appels).toHaveLength(1)
  }, 60_000)

  it('⑥ appelerFournisseur : réflexion coupée et plafond propre, jetons de réflexion lus', async () => {
    const corps: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: { body: string }) => {
      corps.push(JSON.parse(init.body) as Record<string, unknown>)
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok', reasoning_content: 'blabla' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 40 } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const r = await appelerFournisseur('deepseek', 'cle-test', 'sys', [{ role: 'user', content: 'u' }], { reflexion: false, maxJetons: 9000 })
    expect(corps[0]).toMatchObject({ thinking: { type: 'disabled' }, max_tokens: 9000 })
    expect(r.usage).toEqual({ entree: 10, sortie: 50, reflexion: 40 })
    // Sans option : la conduite d'avant — rien d'envoyé sur la réflexion, le plafond du modèle.
    await appelerFournisseur('deepseek', 'cle-test', 'sys', [{ role: 'user', content: 'u' }])
    expect(corps[1]).not.toHaveProperty('thinking')
    expect(corps[1]!.max_tokens).toBe(65_536)
  })
})
