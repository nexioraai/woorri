// 3c · BRIQUE 4 — LA CONSIGNE D'UN ÉCRAN : courte, bornée, lue dans la bibliothèque.
//
//   ① le CONTRAT est borné (il grossira comme l'autre, et cette borne le dira) ;
//   ② les réglages des pièces sont LUS dans la bibliothèque, pas recopiés :
//      `CarteVedette(… details[{libelle, valeur}] …)` y est, et la consigne
//      entière tient sous une borne ;
//   ③ la FICHE porte le fichier attendu, le rôle, les tables avec leurs colonnes
//      et le type exporté, les parcours, les voisins du rôle, l'extrait ;
//   ④ une table lue seulement n'est pas annoncée comme écrite ; un écran sans
//      table le dit ; un extrait vide le dit ;
//   ⑤ le contrat interdit nommément ce qui a planté : createClient, fetch,
//      localStorage, className ; il impose les trois états et formaterMontant.
import { describe, expect, it } from 'vitest'
import { CONTRAT_ECRAN, consigneEcran, ficheEcran, nomDuType, reglagesDesPieces } from '../consigne-ecran'
import { validerPlan } from '../plan-ecrans'
import { motifTexte } from './motif-texte'

const ENTITES = [
  { id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, { id: 'fld_montant', name: 'montant', type: 'number', required: false }] },
  { id: 'ent_paiement', name: 'paiement', fields: [{ id: 'fld_montant', name: 'montant', type: 'number', required: true }] },
]
const LECTURE = { ecrans: ['accueil', 'réservations', 'récapitulatif/paiement', 'tableau de bord'], roles: ['Particulier', 'Administrateur'] }
const CAHIER = 'Le particulier consulte ses réservations et leur statut.'
const PLAN = validerPlan({ ECRANS: [
  { nom: 'accueil', role: 'visiteur' },
  { nom: 'réservations', role: 'Particulier', lit: ['reservation', 'paiement'], ecrit: ['reservation'], extrait: 'Le particulier consulte ses réservations et leur statut.' },
  { nom: 'récapitulatif/paiement', role: 'Particulier', lit: ['reservation'], ecrit: ['paiement'] },
  { nom: 'tableau de bord', role: 'Administrateur', navigation: 'gestion' },
] }, LECTURE, ENTITES, CAHIER)
const reservations = PLAN.ecrans.find((e) => e.nom === 'réservations')!

describe('3c · brique 4 · la consigne d’un écran', () => {
  it('① le contrat est borné', () => {
    // Mesuré : 2 066 signes (le brouillon M16 en faisait 2 806 avec les réglages).
    // La borne vaut la mesure plus une marge étroite — comme EP-319 ⑥.
    expect(CONTRAT_ECRAN.length).toBeLessThan(2300)
  })

  it('② les réglages des pièces sont lus dans la bibliothèque, et la consigne entière tient sous sa borne', () => {
    const r = reglagesDesPieces()
    expect(r).toMatch(motifTexte('RÉGLAGES EXACTS'))
    expect(r).toMatch(motifTexte('CarteVedette('))
    expect(r).toMatch(motifTexte('details[{libelle, valeur}]'))
    const c = consigneEcran(reservations, PLAN, ENTITES, 'XAF')
    expect(c.system).toContain(CONTRAT_ECRAN)
    expect(c.system).toContain(r)
    // Mesuré : contrat 2 066 + réglages 1 196 = system 3 263 ; fiche 412 à 1 259 selon l'écran.
    // 3c-2 : + le vocabulaire exact (jetons, icônes, variables CSS) généré par code —
    // 94cf0489 : 19 refus sur 30 étaient des noms que la consigne n'enseignait pas.
    // Mesuré : 4 633. Bornes à la mesure plus une marge étroite.
    expect(c.system.length).toBeLessThan(4800)
    expect(c.system).toMatch(motifTexte('--radius-md'))
    expect(c.system).toMatch(motifTexte('ESPACE : xs, s, m, l, xl, xxl'))
    expect(c.system).toMatch(motifTexte('horloge'))
    expect(c.user.length).toBeLessThan(2500)
  })

  it('③ la fiche porte le fichier, le rôle, les tables avec colonnes et type, les parcours, les voisins, l’extrait', () => {
    const f = ficheEcran(reservations, PLAN, ENTITES, 'XAF')
    expect(f).toMatch(motifTexte('ÉCRAN : réservations · FICHIER : ecrans/reservations.tsx'))
    expect(f).toMatch(motifTexte('RÔLE : Particulier · NAVIGATION : public'))
    expect(f).toMatch(motifTexte('- reservation (lit et ÉCRIT) · type Reservation · colonnes : statut (text), montant (number, facultatif)'))
    expect(f).toMatch(motifTexte('- paiement (lit) · type Paiement · colonnes : montant (number)'))
    expect(f).toMatch(motifTexte("'reservation' → useParcours<Reservation>('reservation')"))
    expect(f).toMatch(motifTexte("ÉCRANS VOISINS (naviguer) : 'accueil', 'récapitulatif/paiement'"))
    expect(f).not.toContain("'tableau de bord'")
    expect(f).toMatch(motifTexte('« Le particulier consulte ses réservations et leur statut. »'))
    expect(f).toMatch(motifTexte('DEVISE : XAF'))
    expect(nomDuType(ENTITES[0]!)).toBe('Reservation')
  })

  it('④ un écran sans table le dit ; un extrait vide le dit ; la gestion est annoncée dans la coque', () => {
    const accueil = ficheEcran(PLAN.ecrans.find((e) => e.nom === 'accueil')!, PLAN, ENTITES, undefined)
    expect(accueil).toMatch(motifTexte('TABLES : aucune'))
    expect(accueil).toMatch(motifTexte('rien de précis'))
    expect(accueil).toMatch(motifTexte('RÔLE : visiteur (sans compte)'))
    expect(accueil).not.toContain('PARCOURS DISPONIBLES')
    const tableau = ficheEcran(PLAN.ecrans.find((e) => e.nom === 'tableau de bord')!, PLAN, ENTITES, 'XAF')
    expect(tableau).toMatch(motifTexte('NAVIGATION : gestion (dans la coque de gestion)'))
  })

  it('⑤ le contrat interdit nommément ce qui a planté, et impose les trois états et la monnaie', () => {
    for (const mot of ['createClient', 'fetch', 'localStorage', 'className', 'formaterMontant', 'TROIS ÉTATS EXPLICITES', 'export default function Ecran', 'useTable', 'useParcours', 'naviguer']) {
      expect(CONTRAT_ECRAN, `le contrat ne parle pas de ${mot}`).toContain(mot)
    }
    expect(CONTRAT_ECRAN).toMatch(motifTexte('=== ecrans/<slug>.tsx ==='))
  })
})
