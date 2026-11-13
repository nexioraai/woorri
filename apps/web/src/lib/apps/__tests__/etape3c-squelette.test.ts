// 3c · BRIQUES 2 et 3 — LE SQUELETTE ET L'ÉTAT, MONTÉS POUR DE VRAI.
//
// Le squelette (index, types, etat, base, navigation, application, écrans « à
// compléter ») est du texte émis par Deribfy. Ici il est ASSEMBLÉ par le vrai
// assembleur avec la vraie bibliothèque et trois écrans témoins, puis MONTÉ dans
// happy-dom (le même simulateur que le juge d'exécution), et c'est sa conduite
// qui est jugée :
//   ① il s'assemble, n'exporte rien, et ne porte aucun jeton ni réglage inconnu ;
//   ② l'accueil s'affiche, la barre du bas porte Accueil et Compte en liens ;
//   ③ la GARDE DE RÔLE : un écran réservé ouvre « Qui êtes-vous ? » ; « Entrer
//      comme Particulier » l'ouvre ;
//   ④ LE PARCOURS réservation → paiement → confirmation : la réservation choisie
//      VOYAGE (useParcours), le paiement s'écrit (useTable en mémoire), la
//      confirmation lit les deux, l'adresse suit ;
//   ⑤ `#gestion` ouvre la coque de gestion derrière le rôle Administrateur ;
//   ⑥ un écran « à compléter » est visible et nommé, l'application monte quand même ;
//   ⑦ PERIMETRE.md est écrit par Deribfy, avec les états ;
//   ⑧ le JUGE D'EXÉCUTION traverse l'application : il monte, 0 erreur, ≥ 3 écrans distincts.
// Rouge-puis-vert : le magasin de parcours cassé (ecrire n'écrit plus) → ④ rouge.
import { afterEach, describe, expect, it } from 'vitest'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { assembler } from '../bac-a-sable'
import { fichiersSysteme } from '../bibliotheque-ui'
import { jugerContrat } from '../juge-contrat'
import { jugerJetons } from '../juge-jetons'
import { jugerExecution } from '../juge-execution'
import { validerPlan } from '../plan-ecrans'
import { fichiersSquelette, sourcePerimetre } from '../squelette'

const ENTITES = [
  { id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, { id: 'fld_montant', name: 'montant', type: 'number', required: true }] },
  { id: 'ent_paiement', name: 'paiement', fields: [{ id: 'fld_montant', name: 'montant', type: 'number', required: true }, { id: 'fld_reservation_id', name: 'reservation_id', type: 'text', required: true }] },
]
const LECTURE = { ecrans: ['accueil', 'réservations', 'récapitulatif/paiement', 'confirmation', 'tableau de bord', 'aide'], roles: ['Particulier', 'Administrateur'] }
const PLAN = validerPlan({ ECRANS: [
  { nom: 'accueil', role: 'visiteur', navigation: 'public' },
  { nom: 'réservations', role: 'Particulier', navigation: 'public', lit: ['reservation'], ecrit: ['reservation'] },
  { nom: 'récapitulatif/paiement', role: 'Particulier', navigation: 'public', lit: ['reservation'], ecrit: ['paiement'] },
  { nom: 'confirmation', role: 'Particulier', navigation: 'public', lit: ['reservation', 'paiement'] },
  { nom: 'tableau de bord', role: 'Administrateur', navigation: 'gestion', lit: ['reservation'] },
  { nom: 'aide', role: 'visiteur', navigation: 'public' },
] }, LECTURE, ENTITES, 'cahier')

const TEMOINS: Record<string, string> = {
  'ecrans/accueil.tsx': `import React from 'react'
export default function Ecran() { return <section><h1>Accueil témoin</h1><p>Bienvenue.</p></section> }`,
  'ecrans/reservations.tsx': `import React from 'react'
import { useTable } from '../systeme/base'
import { useParcours } from '../systeme/etat'
import { naviguer } from '../systeme/navigation'
import { Bouton } from '../systeme/ui'
import type { Reservation, Session } from '../systeme/types'
export default function Ecran({ session }: { session: Session }) {
  const t = useTable<Reservation>('reservation')
  const [, poser] = useParcours<Reservation>('reservation')
  return <section><h1>Réservations témoin</h1><p>Rôle : {session.role} · {t.lignes.length} réservation(s)</p>
    <Bouton texte="Choisir la chambre 12" surClic={() => { void t.ajouter({ statut: 'choisie', montant: 12000 }).then((l) => { poser(l); naviguer('récapitulatif/paiement') }) }} /></section>
}`,
  'ecrans/recapitulatif-paiement.tsx': `import React from 'react'
import { useTable } from '../systeme/base'
import { useParcours } from '../systeme/etat'
import { naviguer } from '../systeme/navigation'
import { Bouton, EtatVide } from '../systeme/ui'
import type { Paiement, Reservation, Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) {
  const [enCours] = useParcours<Reservation>('reservation')
  const p = useTable<Paiement>('paiement')
  if (enCours === null) return <EtatVide message="Aucune réservation en cours" detail="Choisissez d'abord une chambre." />
  return <section><h1>Récapitulatif</h1><p>Montant à payer : {enCours.montant} pour {enCours.id}</p>
    <Bouton texte="Payer" surClic={() => { void p.ajouter({ montant: enCours.montant, reservation_id: enCours.id }).then(() => { naviguer('confirmation') }) }} /></section>
}`,
  'ecrans/confirmation.tsx': `import React from 'react'
import { useTable } from '../systeme/base'
import { useParcours } from '../systeme/etat'
import type { Paiement, Reservation, Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) {
  const [enCours] = useParcours<Reservation>('reservation')
  const p = useTable<Paiement>('paiement')
  return <section><h1>Confirmation</h1><p>Réservation {enCours === null ? 'inconnue' : enCours.id} payée · paiements {p.lignes.length}</p></section>
}`,
  'ecrans/tableau-de-bord.tsx': `import React from 'react'
import { useTable } from '../systeme/base'
import type { Reservation, Session } from '../systeme/types'
export default function Ecran(_p: { session: Session }) {
  const t = useTable<Reservation>('reservation')
  return <section><h2>Tableau témoin</h2><p>réservations {t.lignes.length}</p></section>
}`,
}

async function carteTemoin(sessionInitiale?: { role: string }) {
  const carte = new Map<string, string>([...fichiersSquelette({ plan: PLAN, entites: ENTITES, nom: 'Hayine témoin', roles: LECTURE.roles, sessionInitiale }), ...fichiersSysteme('XAF')])
  for (const [c, s] of Object.entries(TEMOINS)) carte.set(c, s)
  return carte
}
async function assembleOuEchoue(carte: ReadonlyMap<string, string>) {
  const v = await assembler(carte)
  if (!v.ok) throw new Error(`squelette inassemblable : ${v.erreur.slice(0, 600)}`)
  return v.code
}
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))
let enregistre = false
async function monter(code: string, hash = '') {
  GlobalRegistrator.register({ url: 'https://oeuvre.invalid/' + hash })
  enregistre = true
  Object.defineProperty(window, 'DERIBFY_BASE', { value: Object.freeze({ url: '', clePubliable: '', options: {} }), configurable: true })
  document.body.innerHTML = '<div id="racine"></div>'
  await import(/* @vite-ignore */ 'data:text/javascript;base64,' + Buffer.from(`${code}\n//${String(Math.random())}`).toString('base64'))
  await attendre(250)
  const racine = document.getElementById('racine')!
  const texte = () => (racine.textContent ?? '').replace(/\s+/gu, ' ')
  const cliquer = async (debut: string) => {
    const el = [...racine.querySelectorAll('button, a')].find((x) => (x.textContent ?? '').trim().startsWith(debut))
    if (el === undefined) throw new Error(`aucun contrôle « ${debut} » dans : ${texte().slice(0, 300)}`)
    ;(el as HTMLElement).click()
    await attendre(250)
  }
  return { racine, texte, cliquer }
}
afterEach(() => { if (enregistre) { GlobalRegistrator.unregister(); enregistre = false } })

describe('3c · briques 2-3 · le squelette et l’état, montés', () => {
  it('① le squelette s’assemble, n’exporte rien, et ne porte aucun jeton ni réglage inconnu', async () => {
    const carte = await carteTemoin()
    const code = await assembleOuEchoue(carte)
    expect(code.split('\n').filter((l) => /^export\b/u.test(l))).toEqual([])
    // Le vocabulaire des juges = la bibliothèque + les modules `systeme/` du squelette
    // (base, etat, navigation, types, application) : ce que Deribfy fournit, en entier.
    const systeme = new Map([...carte].filter(([c]) => c.startsWith('systeme/')))
    const juges = new Map([...carte].filter(([c]) => !c.startsWith('systeme/')))
    expect(jugerJetons(juges, systeme).map((d) => `${d.fichier} → ${d.reference}`)).toEqual([])
    expect(jugerContrat(juges, systeme)).toEqual([])
    // Et le squelette lui-même n'invente ni variable CSS ni réglage de pièce.
    expect(jugerJetons(new Map([...carte].filter(([c]) => c.startsWith('systeme/') && !fichiersSysteme('XAF').has(c))), fichiersSysteme('XAF')).filter((d) => d.reference.startsWith('var(')).map((d) => d.reference)).toEqual([])
  }, 90_000)

  it('② l’accueil s’affiche, la barre du bas porte Accueil et Compte en liens', async () => {
    const { racine, texte } = await monter(await assembleOuEchoue(await carteTemoin()))
    expect(texte()).toContain('Accueil témoin')
    expect(racine.querySelector('a[href="#accueil"]')).not.toBeNull()
    expect(racine.querySelector('a[href="#compte"]')).not.toBeNull()
    expect(racine.querySelector('a[href="#aide"]'), 'un écran public visiteur manque à la barre').not.toBeNull()
    expect(racine.querySelector('a[href="#reservations"]'), 'un écran réservé à un rôle est proposé au visiteur').toBeNull()
  }, 90_000)

  it('③ la garde de rôle : un écran réservé ouvre « Qui êtes-vous ? » ; « Entrer comme Particulier » l’ouvre', async () => {
    const { texte, cliquer } = await monter(await assembleOuEchoue(await carteTemoin()), '#reservations')
    expect(texte()).toContain('Qui êtes-vous ?')
    expect(texte()).toContain('réservé au rôle « Particulier »')
    expect(texte()).not.toContain('Réservations témoin')
    await cliquer('Entrer comme Particulier')
    expect(texte()).toContain('Réservations témoin')
    expect(texte()).toContain('Rôle : Particulier')
  }, 90_000)

  it('④ le parcours réservation → paiement → confirmation : la réservation voyage, le paiement s’écrit, l’adresse suit', async () => {
    const { racine, texte, cliquer } = await monter(await assembleOuEchoue(await carteTemoin()), '#reservations')
    await cliquer('Entrer comme Particulier')
    await cliquer('Choisir la chambre 12')
    expect(texte()).toContain('Récapitulatif')
    expect(texte()).toContain('Montant à payer : 12000')
    expect(window.location.hash).toBe('#recapitulatif-paiement')
    await cliquer('Payer')
    expect(texte()).toContain('Confirmation')
    expect(texte()).toMatch(/Réservation m[0-9a-z-]+ payée · paiements 1/u)
    expect(window.location.hash).toBe('#confirmation')
    // La barre du bas liste désormais les écrans du Particulier.
    expect(racine.querySelector('a[href="#reservations"]')).not.toBeNull()
  }, 90_000)

  it('⑤ « #gestion » ouvre la coque de gestion derrière le rôle Administrateur', async () => {
    const { racine, texte, cliquer } = await monter(await assembleOuEchoue(await carteTemoin()), '#gestion')
    expect(texte()).toContain('réservé au rôle « Administrateur »')
    await cliquer('Entrer comme Administrateur')
    expect(texte()).toContain('Tableau témoin')
    expect(texte()).toContain('Tableau de bord')
    expect(racine.querySelector('aside, nav'), 'la coque de gestion n’est pas rendue').not.toBeNull()
    expect(window.location.hash).toBe('#gestion')
  }, 90_000)

  it('⑥ un écran « à compléter » est visible et nommé, et l’application monte quand même', async () => {
    // `aide` n'a pas de témoin : c'est l'écran « à compléter » du squelette qui s'affiche.
    const { texte } = await monter(await assembleOuEchoue(await carteTemoin()), '#aide')
    expect(texte()).toContain('À compléter : aide')
  }, 90_000)

  it('⑦ PERIMETRE.md est écrit par Deribfy, avec les états', () => {
    const md = sourcePerimetre(PLAN, [
      { nom: 'accueil', slug: 'accueil', resultat: 'ok', reproches: [] },
      { nom: 'aide', slug: 'aide', resultat: 'a_completer', reproches: ['DES JETONS QUI N’EXISTENT PAS — …\n- détail'] },
    ], ['Tarification à préciser'])
    expect(md).toContain('Écrans livrés : 1 / 6.')
    expect(md).toContain('- accueil (visiteur, public) : livré')
    expect(md).toContain('- aide (visiteur, public) : À COMPLÉTER — DES JETONS QUI N’EXISTENT PAS — …')
    expect(md).toContain('- réservations (Particulier, public, tables : reservation) : à compléter (non écrit)')
    expect(md).toContain('Tarification à préciser')
  })

  it('⑧ le juge d’exécution traverse l’application : il monte, sans erreur, et atteint plusieurs écrans', async () => {
    const v = await jugerExecution(await assembleOuEchoue(await carteTemoin()))
    expect(v.indisponible).toBeUndefined()
    expect(v.erreurs.map((e) => `${e.quoi}: ${e.message}`)).toEqual([])
    expect(v.monteDansSimulateur).toBe(true)
    expect(v.ecransDistincts ?? 0).toBeGreaterThanOrEqual(3)
  }, 90_000)
})
