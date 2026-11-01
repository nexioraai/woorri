/**
 * EP-297 — LES DEUX JUGES : la boucle n'accepte plus « ça s'assemble »,
 * elle exige « c'est vivant » et « ça couvre, ou ça le DIT ».
 *
 * ── LES DEUX DÉFAUTS FONDATEURS, MESURÉS LE 2026-10-31 (tir eb7b62b5) :
 * « Agent IA premium » = une PHOTO d'agent (bulle en dur, champ et bouton
 * sans aucun gestionnaire) ; couverture = paiement 2 occurrences au code
 * pour 34 au cahier, anglais/arabe/RTL/connexion : zéro — et la génération
 * s'est dite « livrée » sans un mot. Faite à la main, cette analyse est
 * désormais un juge. Règle du propriétaire : on n'apprend pas à CETTE
 * application à marcher, on apprend à DERIBFY à juger ses œuvres.
 */
import { describe, expect, it } from 'vitest'
import { jugeMuet } from './juge-muet'
import { boucleEcriture } from '../boucle-directe'
import { jugerVivacite } from '../juge-vivacite'
import { FICHIER_PERIMETRE, jugerCouverture, SEUIL_VERROU } from '../juge-couverture'

/** La PHOTO d'agent du tir réel, réduite à sa forme mesurée. */
const AGENT_MORT = `export function AgentIA() {
  return (
    <div>
      <p>Bonjour ! Je suis votre agent IA premium.</p>
      <input placeholder="Posez votre question" />
      <button>Envoyer</button>
    </div>
  )
}`

const AGENT_VIVANT = `import { useState } from 'react'
export function AgentIA() {
  const [q, setQ] = useState('')
  const [reponses, setReponses] = useState<string[]>([])
  return (
    <form onSubmit={(e) => { e.preventDefault(); setReponses((r) => [...r, q]) }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
      <button type="submit">Envoyer</button>
    </form>
  )
}`

describe('EP-297 · le juge de vivacité', () => {
  it('① LA PHOTO D’AGENT DU TIR RÉEL EST REFUSÉE — champ et bouton morts', () => {
    const d = jugerVivacite(new Map([['AgentIA.tsx', AGENT_MORT]]))
    expect(d.length, 'le défaut mesuré du 2026-10-31 passe encore').toBeGreaterThanOrEqual(2)
    expect(d.map((x) => x.manque).join(' ')).toContain('sans action liée')
  })

  it('② LE MÊME ÉCRAN CÂBLÉ PASSE — état local + soumission', () => {
    expect(jugerVivacite(new Map([['AgentIA.tsx', AGENT_VIVANT]]))).toEqual([])
  })

  it('③ UN GESTIONNAIRE VIDE EST UNE PHOTO, PAS UN CONTRÔLE', () => {
    const d = jugerVivacite(new Map([['A.tsx', '<button onClick={() => {}}>Ok</button>']]))
    expect(d.length).toBe(1)
    expect(d[0]!.manque).toContain('VIDE')
  })

  it('④ LA DÉMONSTRATION ASSUMÉE PASSE — SI l’écran le dit', () => {
    const cachee = jugerVivacite(new Map([['A.tsx', '<button data-demonstration>Payer</button>']]))
    expect(cachee.length, 'une démonstration cachée doit être refusée').toBe(1)
    const dite = jugerVivacite(
      new Map([['A.tsx', '<div><span>Démonstration</span><button data-demonstration>Payer</button></div>']]),
    )
    expect(dite).toEqual([])
  })

  it('⑤ LA FLÈCHE DANS L’ATTRIBUT NE CASSE PAS LE LECTEUR DE BALISES', () => {
    const src = '<button onClick={() => setN((n) => n + 1)}>Plus</button>'
    expect(jugerVivacite(new Map([['A.tsx', src]]))).toEqual([])
  })
})

describe('EP-297 · le juge de couverture', () => {
  const CAHIER =
    'Le paiement est central : paiement mobile, paiement carte, moyens de paiement multiples. ' +
    'Interface en anglais et en arabe, support arabe RTL complet, version anglaise obligatoire. ' +
    'Les notifications sont mentionnées une fois.'

  it('⑥ UNE EXIGENCE INSISTANTE ET MUETTE AU CODE EST UN DÉFAUT NOMMÉ', () => {
    const r = jugerCouverture(CAHIER, new Map([['App.tsx', 'export const a = 1']]))
    const noms = r.absentes.map((e) => e.exigence)
    expect(noms).toContain('paiement')
    expect(noms).toContain('multilingue')
    expect(r.taux).toBeLessThan(1)
  })

  it('⑦ DÉCLARÉE HORS PÉRIMÈTRE AVEC MOTIF, ELLE N’EST PLUS MUETTE', () => {
    const r = jugerCouverture(
      CAHIER,
      new Map([
        ['App.tsx', 'export const a = 1'],
        [FICHIER_PERIMETRE, '## Hors périmètre\n- paiement : nécessite un prestataire, non câblé dans cette version.'],
      ]),
    )
    const paiement = r.exigences.find((e) => e.exigence === 'paiement')
    expect(paiement?.statut).toBe('declaree-hors-perimetre')
    expect(r.absentes.map((e) => e.exigence)).not.toContain('paiement')
  })

  it('⑧ COUVERTE AU CODE, ELLE EST COUVERTE — et le rapport chiffre', () => {
    const r = jugerCouverture(CAHIER, new Map([['Paiement.tsx', 'const libelle = "Choisissez votre moyen de paiement"']]))
    expect(r.exigences.find((e) => e.exigence === 'paiement')?.statut).toBe('couverte')
    expect(r.exigences.find((e) => e.exigence === 'paiement')?.cahier).toBeGreaterThanOrEqual(3)
  })

  it('⑧bis LE NATIF EXIGÉ PAR LE CAHIER NE PEUT PLUS ÊTRE TU — tir 88c94164', () => {
    // Mesuré : « Application mobile Android et iPhone » au cahier, tentative
    // react-native du modèle refusée au tour 1 — et AUCUNE exigence levée :
    // la famille n'existait pas. Le système savait, et se taisait.
    const r = jugerCouverture(
      'Application mobile Android et iPhone. Publication App Store et Google Play. Application mobile pour les agences.',
      new Map([['App.tsx', 'export const a = 1']]),
    )
    expect(r.absentes.map((e) => e.exigence)).toContain('application native (Android/iPhone)')
  })

  it('⑨ LE CAHIER QUI N’INSISTE PAS NE CRÉE PAS D’EXIGENCE — contrôle négatif', () => {
    const r = jugerCouverture(CAHIER, new Map([['App.tsx', '']]))
    expect(r.exigences.map((e) => e.exigence), 'une mention unique a été retenue').not.toContain(
      'notifications',
    )
  })
})

describe('EP-297 · « couverte » veut dire ATTEINTE ET EXERCÉE', () => {
  it('⑪ UNE MENTION DANS LE CODE NE COUVRE PLUS RIEN', () => {
    // MESURE DU 2026-11-01 : « réservation » etait declaree COUVERTE avec
    // 2 occurrences pour 59 au cahier. Le juge disait « couverte » des
    // qu'il voyait un mot. Une mention n'est pas une couverture.
    const cahier = 'La recherche est centrale : recherche de vols, recherche d’hôtels.'
    const code = new Map([['App.tsx', 'const titre = "recherche de vols"']])
    const sansEcran = jugerCouverture(cahier, code, [])
    expect(sansEcran.exigences.find((e) => e.exigence === 'recherche')?.statut).toBe('couverte')
    // Des qu'un juge d'execution a parle, la mention ne suffit plus.
    const avecEcrans = jugerCouverture(cahier, code, [{ texte: 'Accueil Paiements', exerce: true }])
    expect(avecEcrans.exigences.find((e) => e.exigence === 'recherche')?.statut).toBe('nommee')
    expect(avecEcrans.absentes.map((e) => e.exigence)).toContain('recherche')
  })

  it('⑫ UN ÉCRAN OUVERT ET EXERCÉ, LUI, COUVRE', () => {
    const cahier = 'La recherche est centrale : recherche de vols, recherche d’hôtels.'
    const r = jugerCouverture(cahier, new Map([['App.tsx', 'x']]), [
      { texte: 'Recherche de vols — résultats', exerce: true },
    ])
    expect(r.exigences.find((e) => e.exigence === 'recherche')?.statut).toBe('couverte')
  })

  it('⑬ UN ÉCRAN ATTEINT MAIS JAMAIS EXERCÉ NE COUVRE PAS', () => {
    const cahier = 'La recherche est centrale : recherche de vols, recherche d’hôtels.'
    const r = jugerCouverture(cahier, new Map([['App.tsx', 'const t = "recherche"']]), [
      { texte: 'Recherche de vols', exerce: false },
    ])
    expect(r.exigences.find((e) => e.exigence === 'recherche')?.statut).toBe('nommee')
  })

  it('⑭ LE VERROU PAR INSISTANCE : le modèle ne clôt pas seul une exigence centrale', () => {
    // MESURE : « recherche », citee ONZE fois dans un cahier de plateforme
    // de reservation, declaree hors perimetre — une fonction centrale
    // abandonnee poliment. Le verrou etait DECRIT depuis le 31 octobre et
    // n'avait jamais ete ECRIT : zero occurrence dans le juge vivant.
    const cahier = Array.from({ length: 11 }, () => 'recherche').join(' ') + ' notification.'
    const avec = new Map([
      ['App.tsx', 'x'],
      [FICHIER_PERIMETRE, '- recherche : non couverte dans cette version.'],
    ])
    const r = jugerCouverture(cahier, avec, [{ texte: 'Accueil', exerce: true }])
    const e = r.exigences.find((x) => x.exigence === 'recherche')
    expect(e?.cahier).toBeGreaterThanOrEqual(SEUIL_VERROU)
    expect(e?.statut, 'une exigence centrale est close par le modele seul').toBe(
      'declaree-mais-centrale',
    )
    expect(r.absentes.map((x) => x.exigence)).toContain('recherche')
  })

  it('⑮ SOUS LE SEUIL, LA DÉCLARATION RESTE RECEVABLE — contrôle négatif', () => {
    const cahier = 'notification. notification. notification. notification.'
    const r = jugerCouverture(
      cahier,
      new Map([['App.tsx', 'x'], [FICHIER_PERIMETRE, '- notifications : hors périmètre, prestataire requis.']]),
      [{ texte: 'Accueil', exerce: true }],
    )
    expect(r.exigences.find((e) => e.exigence === 'notifications')?.statut).toBe(
      'declaree-hors-perimetre',
    )
  })
})

describe('EP-297 · la boucle exige la vie et la couverture', () => {
  const REPONSES = [
    // Tour 1 : s'assemble, mais l'agent est une photo et PERIMETRE manque.
    '=== index.tsx ===\nexport const a = 1\n=== AgentIA.tsx ===\n' + AGENT_MORT,
    // Tour 2 : câblé, et le périmètre déclare ce qui manque.
    '=== index.tsx ===\nexport const a = 1\n=== AgentIA.tsx ===\n' +
      AGENT_VIVANT +
      '\n=== PERIMETRE.md ===\n- paiement : non câblé (prestataire requis), dit à l’écran.\n- multilingue : version française seule dans cette itération.',
  ]
  const appels: string[][] = []
  const appeler = async (messages: readonly { role: string; content: string }[]) => {
    appels.push(messages.map((m) => m.content))
    return { texte: REPONSES[appels.length - 1] ?? '', tronquee: false, jetonsEntree: 1, jetonsSortie: 1 }
  }

  it('⑩ LE TOUR MORT EST RENVOYÉ AU MODÈLE, le tour vivant accepté avec rapport', async () => {
    const r = await boucleEcriture({
      demande: 'Plateforme de paiement : paiement mobile et paiement carte, interface anglais/arabe, version arabe RTL.',
      appeler: appeler as never,
      juger: jugeMuet,
    })
    expect(appels.length, 'le tour mort n’a pas été renvoyé').toBe(2)
    const retour = appels[1]!.join('\n')
    expect(retour, 'le motif ne nomme pas le contrôle mort').toMatch(/sans action liée/u)
    expect(retour, 'le motif ne nomme pas l’exigence muette').toMatch(/paiement/u)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.vivacite).toEqual([])
      expect(r.couverture.absentes).toEqual([])
      expect(r.couverture.exigences.length).toBeGreaterThan(0)
    }
  })
})
