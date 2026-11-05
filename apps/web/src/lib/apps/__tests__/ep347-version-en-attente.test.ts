/**
 * EP-347 · LA PRUDENCE NE SE PAIE PAS DEUX FOIS.
 *
 * ── LE DÉFAUT, DIT AVANT D'ÊTRE CORRIGÉ (2026-11-05).
 *
 * Une modification qui touche aux données se fait approuver AVANT. Mais
 * le mécanisme d'accord REJOUAIT LA DEMANDE : confirmer rappelait le
 * modèle, donc repayait ~0,04 $ — précisément sur le geste qu'on veut
 * que les gens prennent l'habitude de faire.
 *
 * Faire payer deux fois la prudence qu'on impose apprend à ne plus être
 * prudent.
 *
 * ── ET LA TABLE DES VERSIONS EST DÉJÀ LE MÉCANISME DE RETOUR EN ARRIÈRE.
 *
 * L'état calculé s'y range, et l'accord l'APPLIQUE. Elle n'avait pas
 * besoin d'être réinventée.
 *
 * ── LA RÈGLE QUI SORT DE CE LOT, ET ELLE NOUS DISTINGUE.
 *
 *   « On ne demande pas d'approuver un geste qui perd des données. On le
 *     refuse, et on dit lequel. L'approbation ne sert pas à déverrouiller
 *     l'interdit. »
 *
 * Lovable a un réglage « Always allow » pour les migrations
 * rétro-incompatibles. C'est exactement la porte de sortie qu'on n'aura
 * pas.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { estRestaurable } from '../versions-oeuvre'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')
const ROUTE = join(SRC, 'app', 'api', 'generateur', 'retoucher', 'route.ts')
const ATELIER = join(SRC, 'app', 'atelier', '[id]', 'page.tsx')

describe('EP-347 · la version en attente', () => {
  it('① L’ÉTAT CALCULÉ SE RANGE AU LIEU D’ÊTRE JETÉ', () => {
    const src = lireSource(ROUTE)
    // Avant l'accord, on écrit une version marquée — pas le document.
    expect(src, 'l’état calculé n’est plus mis de côté').toMatch(/enAttente: true,/u)
    expect(src, 'la version mise de côté ne se nomme pas').toMatch(
      /EN ATTENTE DE VOTRE ACCORD/u,
    )
    // ET LE RANG VOYAGE : sans lui, l'écran ne sait pas quoi appliquer.
    expect(src, 'le rang de la version n’est pas rendu').toMatch(
      /aConfirmer: true[\s\S]{0,120}rang: rangAttente/u,
    )
  })

  it('② L’ACCORD APPLIQUE, IL NE RAPPELLE PAS LE MODÈLE', () => {
    const src = lireSource(ROUTE)
    const i = src.indexOf('async function appliquerEnAttente')
    expect(i, 'la fonction d’application a disparu').toBeGreaterThan(0)
    const bloc = src.slice(i, src.indexOf('\n}\n', i))
    // ── LA PROPRIÉTÉ : AUCUN APPEL AU FOURNISSEUR DANS CE CHEMIN.
    for (const interdit of ['clientIA', 'messages.create', 'CONSIGNE_RETOUCHE']) {
      expect(bloc, `l’accord repasse par ${interdit} — il repaie`).not.toContain(interdit)
    }
    // LA BORNE FAIT PARTIE DE LA PROPRIÉTÉ : `coutUsd: 0.04` contient
    // `coutUsd: 0`. Cinquième ancre trop large de la semaine.
    expect(bloc, 'l’accord facture quelque chose').toMatch(/coutUsd: 0,/u)
  })

  it('③ ET LA BASE PASSE AVANT LE DOCUMENT — même ordre que la génération', () => {
    // Si la migration échoue, l'application sert encore sa version
    // d'avant et les données sont intactes. L'inverse laisserait un
    // document qui parle de colonnes que la base n'a pas.
    const src = lireSource(ROUTE)
    const i = src.indexOf('async function appliquerEnAttente')
    const bloc = src.slice(i, src.indexOf('\n}\n', i))
    const migration = bloc.indexOf('appliquerMigration(')
    const ecriture = bloc.indexOf('.update({')
    expect(migration, 'l’accord n’applique aucune migration').toBeGreaterThan(0)
    expect(ecriture, 'l’accord n’écrit rien').toBeGreaterThan(0)
    expect(
      migration < ecriture,
      'le document est écrit AVANT la migration : il parlerait de colonnes absentes',
    ).toBe(true)
  })

  it('④ UNE VERSION EN ATTENTE NE SE RESTAURE PAS', () => {
    // Elle n'a jamais été servie : y « revenir » n'aurait aucun sens, et
    // la proposer ferait croire qu'elle l'a été.
    const servie = { forme: 'document', fichiers: { 'a.tsx': 'x' } }
    expect(estRestaurable(servie), 'une vraie version n’est plus restaurable').toBe(true)
    expect(
      estRestaurable({ ...servie, enAttente: true }),
      'une version jamais servie est proposée au retour en arrière',
    ).toBe(false)
  })

  it('⑤ ET L’ÉCRAN APPLIQUE AU LIEU DE REJOUER', () => {
    // L'USAGE, PAS LA DÉFINITION : une version mise de côté que personne
    // n'applique est un travail payé et perdu.
    const atelier = lireSource(ATELIER)
    expect(atelier, 'l’écran rejoue encore la demande').toMatch(
      /d\.migration === true[\s\S]{0,80}appliquerEnAttente\(d\.rang\)/u,
    )
    expect(atelier, 'l’écran n’appelle pas la route d’application').toMatch(
      /retoucher\?id=[^`]*&applique=/u,
    )
  })

  it('⑥ UN ARRÊT DE M1 NE SE CONFIRME PAS — c’est un refus, pas une question', () => {
    // ── CE QUI NOUS DISTINGUE, ET CE N'EST PAS UNE LIMITE.
    //
    // Lovable a un réglage « Always allow » pour les migrations
    // rétro-incompatibles. L'approbation y sert à déverrouiller
    // l'interdit. Ici elle ne sert qu'à confirmer un AJOUT.
    //
    // Le refus d'un arrêt doit donc arriver AVANT toute proposition
    // d'accord — sinon il deviendrait, lui aussi, une question.
    const src = lireSource(ROUTE)
    const refus = src.indexOf('if (!plan.peutAvancer)')
    const accord = src.indexOf('aConfirmer: true')
    expect(refus, 'un arrêt de M1 n’est plus refusé').toBeGreaterThan(0)
    expect(accord, 'plus aucun accord n’est demandé').toBeGreaterThan(0)
    expect(
      refus < accord,
      'un geste qui perd des données est proposé à l’approbation',
    ).toBe(true)
    // ET IL N'Y A PAS DE PORTE DE SORTIE : aucun paramètre ne force un
    // arrêt. `confirme` ne gouverne que l'accord sur un ajout.
    const bloc = src.slice(refus, src.indexOf('}', refus + 200))
    expect(bloc, 'un arrêt peut être forcé par un paramètre').not.toMatch(/confirme|force/u)
  })
})
