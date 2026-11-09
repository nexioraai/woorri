import { describe, it, expect } from 'vitest'
import { lirePieces, etatDuDossier } from '../piecesFournisseur'

// ============================================================
// LOT 12.2 — LES PIÈCES EXIGÉES D'UN FOURNISSEUR.
//
// LA CENTRALE LES ÉCRIT ELLE-MÊME — arbitrage du propriétaire. Une liste en
// dur aurait voulu dire : agrément, registre du commerce, attestation
// fiscale, devinés par moi pour un pays dont je ne connais pas les
// formulaires.
//
// MAIS `jsonb` ACCEPTE N'IMPORTE QUOI. Ce fichier est ce qui empêche une
// saisie de travers de rendre un dossier illisible — ou, pire, de le
// déclarer complet.
// ============================================================

const P = (cle: string, libelle: string, obligatoire = true) => ({ cle, libelle, obligatoire })

describe('ce qui est écarté à la lecture', () => {
  it('🔴 une pièce SANS CLÉ ne rattache rien — elle est écartée', () => {
    expect(lirePieces([{ libelle: 'Agrément' }])).toEqual([])
  })

  it('🔴 une pièce SANS LIBELLÉ est une case que personne ne sait remplir', () => {
    expect(lirePieces([{ cle: 'agrement', libelle: '   ' }])).toEqual([])
  })

  it('🔴 une clé inutilisable est refusée', () => {
    // Espaces, majuscules, accents : elle voyage dans un formulaire et dans
    // une URL. Une clé qui s'encode mal se rattache mal.
    for (const cle of ['Agrément', 'mon agrement', '', '-debut', 'a'.repeat(60)]) {
      expect(lirePieces([{ cle, libelle: 'x' }]), cle).toEqual([])
    }
  })

  it('🔴 deux pièces de MÊME CLÉ : la seconde est écartée', () => {
    // « Cette pièce est-elle fournie ? » deviendrait ambigu, et l'ambiguïté
    // se résout toujours du mauvais côté.
    const r = lirePieces([P('agrement', 'Agrément'), P('agrement', 'Autre chose')])
    expect(r).toHaveLength(1)
    expect(r[0].libelle).toBe('Agrément')
  })

  it('🔴 `obligatoire` vaut VRAI par défaut', () => {
    // Une exigence qu'on a pris la peine d'écrire est demandée. L'inverse
    // ferait d'un oubli de case une pièce facultative, sans que personne
    // s'en aperçoive.
    expect(lirePieces([{ cle: 'agrement', libelle: 'Agrément' }])[0].obligatoire).toBe(true)
    expect(lirePieces([P('x', 'X', false)])[0].obligatoire).toBe(false)
  })

  it('🔴 une valeur qui n’est pas un tableau rend une liste vide', () => {
    for (const x of [null, undefined, 'agrement', 42, {}]) {
      expect(lirePieces(x), String(x)).toEqual([])
    }
  })
})

describe('l’état du dossier', () => {
  const EXIGEES = [P('agrement', 'Agrément pharmaceutique'), P('rc', 'Registre du commerce'), P('rib', 'RIB', false)]

  it('🔴 une pièce déposée est FOURNIE', () => {
    const r = etatDuDossier(EXIGEES, [{ piece: 'agrement', retire_le: null }])
    expect(r.etats.find((e) => e.cle === 'agrement')?.fournie).toBe(true)
    expect(r.manquantes.map((m) => m.cle)).toEqual(['rc'])
  })

  it('🔴 un document RETIRÉ ne compte PAS', () => {
    // C'est tout le sens du retrait : l'exigence redevient ouverte. Compter
    // les retirés dirait « complet » à quelqu'un dont la pièce n'est plus là.
    const r = etatDuDossier(EXIGEES, [
      { piece: 'agrement', retire_le: '2026-11-10' },
      { piece: 'rc', retire_le: null },
    ])
    expect(r.etats.find((e) => e.cle === 'agrement')?.fournie).toBe(false)
    expect(r.manquantes.map((m) => m.cle)).toEqual(['agrement'])
  })

  it('🔴 une pièce FACULTATIVE absente ne rend pas le dossier incomplet', () => {
    const r = etatDuDossier(EXIGEES, [
      { piece: 'agrement', retire_le: null }, { piece: 'rc', retire_le: null },
    ])
    expect(r.complet).toBe(true)
    expect(r.manquantes).toEqual([])
  })

  it('🔴 un document SANS pièce ne remplit aucune exigence', () => {
    // Le dépôt libre est le cas courant : une facture n'honore rien.
    const r = etatDuDossier(EXIGEES, [{ piece: null, retire_le: null }])
    expect(r.complet).toBe(false)
    expect(r.manquantes).toHaveLength(2)
  })

  it('🔴 SANS exigence, le dossier n’est pas « complet » — il n’existe pas', () => {
    // Dire « complet » à un fournisseur d'un site qui n'exige rien lui
    // ferait croire qu'il a fait quelque chose.
    expect(etatDuDossier([], [{ piece: null, retire_le: null }]).complet).toBe(false)
  })

  it('🔴 un rattachement à une clé INCONNUE ne complète rien', () => {
    // La route refuse déjà ces clés ; si l'une passait par un autre chemin,
    // elle ne devrait pas rendre un dossier complet par accident.
    const r = etatDuDossier(EXIGEES, [{ piece: 'inventee', retire_le: null }])
    expect(r.manquantes.map((m) => m.cle)).toEqual(['agrement', 'rc'])
  })
})
