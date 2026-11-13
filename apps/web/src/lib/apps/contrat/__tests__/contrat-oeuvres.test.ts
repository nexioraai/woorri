// ÉTAPE 1 · LES ŒUVRES MESURÉES, TRADUITES À LA MAIN EN SPECS (format V2 : textes en clair).
//
// 94cf0489 et 5b1c20bc restent intactes : leurs écrans sont RÉÉCRITS en specs
// du contrat dans des fixtures qui disent leur source et ce qui n'a pas
// d'équivalent (« portee »). Le validateur doit :
//   ① refuser EXACTEMENT les défauts mesurés — Kiswahili, var(--space-*),
//      JETONS.ESPACE.*, boutons sans effet, window.location, « Ajouter » en
//      formulaire natif, cartes de l'accueil non traduites, colonnes inventées —
//      et les traductions manquantes ; rien d'autre ;
//   ② arrêté à la première couche, ne rendre que la couche 1 quand elle refuse ;
//   ③ ne plus refuser ce que l'ancien juge refusait à tort : les types
//      (Reservation, Paiement, Session) deviennent des liaisons acceptées ;
//   ④ ACCEPTER chaque écran une fois ses défauts mesurés — et seulement eux —
//      retirés. Ces témoins corrigés sont des copies de test, pas l'œuvre ;
//      les traductions qu'ils ajoutent sont des marqueurs « [en] … », pas des
//      traductions (une vraie traduction témoin : bloc B, B3).
// Rouge-puis-vert : la détection des langues hors lecture retirée → ① rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { textesDe } from '../textes'
import { validerFragment, type Contexte } from '../validateur'

type O = Record<string, unknown>
type Fixture = { ecran: string; attendu: string[]; attenduCouche1?: string[]; fragment: O }
const lire = (o: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', `oeuvre-${o}.specs.json`), 'utf8')) as { contexte: Contexte; ecrans: Fixture[] }
const A = lire('94cf0489')
const B = lire('5b1c20bc')
const classes = (v: { refus: readonly { classe: string }[] }) => [...new Set(v.refus.map((r) => r.classe))].sort()

/** Complète en et ar sur les clés de Deribfy : des MARQUEURS de test, pas des traductions. */
function marquer(f: O): O {
  const tr = (f.traductions as O[] | undefined) ?? []
  const textes = textesDe(f.ecran)
  return { ...f, traductions: ['en', 'ar'].map((langue) => {
    const deja = new Map((((tr.find((x) => x.langue === langue)?.textes) as O[] | undefined) ?? []).map((x) => [String(x.cle), String(x.texte)]))
    return { langue, textes: textes.map((t) => ({ cle: t.cle, texte: deja.get(t.cle) ?? `[${langue}] ${t.texte}` })) }
  }) }
}
const copie = (f: O) => structuredClone(f) as O & { ecran: O }
function parcourir(x: unknown, f: (o: O) => void) {
  if (Array.isArray(x)) for (const y of x) parcourir(y, f)
  else if (typeof x === 'object' && x !== null) { f(x as O); for (const v of Object.values(x)) parcourir(v, f) }
}
const fixture = (lot: { ecrans: Fixture[] }, ecran: string) => lot.ecrans.find((e) => e.ecran === ecran)!

describe('étape 1 · les œuvres mesurées, en specs', () => {
  it('① chaque écran est refusé exactement pour ses défauts mesurés', () => {
    for (const [lot, nom] of [[A, '94cf0489'], [B, '5b1c20bc']] as const) {
      for (const e of lot.ecrans) {
        expect(classes(validerFragment(e.fragment, lot.contexte, { complet: true })), `${nom} · ${e.ecran}`).toEqual([...e.attendu].sort())
      }
    }
    // Les défauts mesurés, nommément — par leurs champs structurés (classe, chemin, nom proposé), pas par du texte.
    const refus = (lot: typeof A, ecran: string) => validerFragment(fixture(lot, ecran).fragment, lot.contexte, { complet: true }).refus
      .map((r) => ({ classe: r.classe, chemin: r.chemin, proche: r.proche }))
    const de = (lot: typeof A, ecran: string, classe: string) => refus(lot, ecran).filter((r) => r.classe === classe)
    // « Kiswahili » : le libellé du 4ᵉ bouton de l'encart des langues.
    expect(de(A, 'demarrage-langue', 'LANGUE_HORS_LECTURE')).toEqual([{ classe: 'LANGUE_HORS_LECTURE', chemin: 'ecran.corps[3].enfants[3].libelle', proche: null }])
    expect(de(B, 'confirmation', 'JETON_INCONNU').map((r) => r.proche)).toEqual(['m', 'l', 's'])
    expect(de(B, 'recherche', 'JETON_INCONNU').map((r) => r.proche)).toEqual(['s'])
    expect(de(B, 'abonnement-ia', 'JETON_INCONNU').map((r) => r.proche)).toEqual(['m'])
    expect(de(B, 'abonnement-ia', 'ACTION_INCONNUE').map((r) => r.proche)).toEqual(['emit'])
    expect(de(B, 'inscription-connexion', 'ACTION_SANS_EFFET')).toHaveLength(3)
    expect(de(B, 'gestion-offre', 'FORMULAIRE_NATIF').map((r) => r.proche)).toEqual(['Bouton'])
    // L'accueil : ses textes ne sont ni en anglais ni en arabe — le constat du propriétaire.
    expect(de(B, 'accueil', 'TRADUCTION_MANQUANTE').map((r) => r.chemin)).toEqual(['traductions.en', 'traductions.ar'])
    expect(de(B, 'detail', 'CHAMP_INCONNU').map((r) => r.proche)).toEqual(['offre', 'id', 'montant_total', 'devise_debitee'])
  })

  it('② arrêté à la première couche : la couche 1 seule quand elle refuse', () => {
    for (const lot of [A, B]) {
      for (const e of lot.ecrans) {
        expect(classes(validerFragment(e.fragment, lot.contexte)), e.ecran).toEqual([...(e.attenduCouche1 ?? e.attendu)].sort())
      }
    }
  })

  it('③ les types ne sont plus refusés à tort : la confirmation lit parcours.reservation.* sans reproche de liaison', () => {
    const v = validerFragment(fixture(B, 'confirmation').fragment, B.contexte, { complet: true })
    expect(v.refus.filter((r) => /parcours|LIAISON|TABLE|CHAMP/u.test(`${r.classe} ${r.chemin}`))).toEqual([])
  })

  it('④ chaque écran est accepté une fois ses défauts mesurés retirés', () => {
    const versLangue = (o: O) => { const ef = o.effets as O[] | undefined; if (ef?.[0]?.faire === 'setState' && /langue/iu.test(String(ef[0].chemin))) o.effets = [{ faire: 'emit', evenement: 'choisirLangue', valeur: ef[0].valeur }] }
    const corrige: [typeof A, string, (f: O & { ecran: O }) => void][] = [
      [A, 'demarrage-langue', (f) => {
        parcourir(f.ecran, versLangue)
        ;((f.ecran.corps as O[])[3]!.enfants as O[]).splice(3, 1)
      }],
      [A, 'resultats', () => undefined],
      [B, 'inscription-connexion', (f) => { parcourir(f.ecran, versLangue) }],
      [B, 'recherche', (f) => {
        parcourir(f.ecran, (o) => { if (o.espace === 'JETONS.ESPACE.s') o.espace = 's' })
        const pile = (((f.ecran.corps as O[])[2]!.enfants as O[])[0]!)
        pile.enfants = (pile.enfants as O[]).slice(1)
        f.ecran.etat = (f.ecran.etat as O[]).filter((e) => e.nom !== 'langueChoisie')
      }],
      [B, 'confirmation', (f) => {
        parcourir(f.ecran, (o) => { if (typeof o.espace === 'string' && o.espace.startsWith('var(')) o.espace = /space-(\w)/u.exec(o.espace)![1] })
        const enc = ((f.ecran.corps as O[])[0]!.enfants as O[])[1]!
        enc.enfants = (enc.enfants as O[]).filter((n) => n.texte !== 'XAF')
      }],
      [B, 'abonnement-ia', (f) => { parcourir(f.ecran, (o) => { if (o.espace === 'JETONS.ESPACE.m') o.espace = 'm'; if ((o.effets as O[] | undefined)?.[0]?.faire === 'recharger') o.effets = [{ faire: 'emit', evenement: 'rafraichir' }] }) }],
      [B, 'detail', (f) => {
        const renomme: Record<string, string> = { offre_id: 'offre', utilisateur_id: 'compte', montant: 'montant_total', devise: 'devise_debitee' }
        parcourir(f.ecran, (o) => { if (typeof o.champ === 'string' && renomme[o.champ] !== undefined) o.champ = renomme[o.champ] })
      }],
      [B, 'accueil', () => undefined],
      [B, 'gestion-offre', (f) => { (f.ecran.corps as O[])[1]!.composant = 'Pile' }],
    ]
    for (const [lot, ecran, corriger] of corrige) {
      const f = copie(fixture(lot, ecran).fragment)
      corriger(f)
      const v = validerFragment(marquer(f), lot.contexte, { complet: true })
      expect(v.refus.map((r) => `${r.classe} · ${r.chemin} · ${r.quoi}`), ecran).toEqual([])
      expect(v.zodOk, ecran).toBe(true)
    }
  })
})
