/**
 * DÉFAUT A (2026-11-18) — UNE RETOUCHE N'ÉCRIT QUE DANS DES COLONNES QUI EXISTENT.
 *
 * Mesuré en production (docs/elite-protocol/RAPPORT_RETOUCHE_PHARMA.md) : la
 * version 4 de pharma.deribfy.app écrit `emplacement` dans `produit` à l'ajout
 * ET à la modification ; la colonne n'existe pas ; PostgREST répond PGRST204 ;
 * six juges avaient laissé passer. Les gabarits ci-dessous recopient la forme
 * exacte du code livré (Pharmacie.tsx v4, l. 902-913), réduite.
 *
 * ① v4 : l'écart est vu, à l'ajout et à la modification ;
 * ② contrôle négatif : v3 (sans le champ) → zéro ;
 * ③ contrôle négatif : le même code, champ DÉCLARÉ → zéro (la colonne sera migrée) ;
 * ④ une table non déclarée se dit `*` ; `systeme/` n'est pas lu ;
 * ⑤ l'objet qu'on ne sait pas résoudre est compté, jamais deviné ;
 * ⑥ le refus nomme la donnée neuve, pas l'ancienne casse ;
 * ⑦ cliquet : la route branche le juge, avant sur la déclaration, après sur la fusion.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { EntiteDonnees } from '@deribfy/compiler'
import { colonnesNouvelles, jugerColonnes, phraseColonnes } from '../juge-colonnes'
import { motifTexte } from './motif-texte'

const PRODUIT = {
  id: 'ent_produit', name: 'produit',
  fields: [
    { id: 'fld_nom', name: 'nom', type: 'text', unique: false, required: true },
    { id: 'fld_categorie', name: 'categorie', type: 'text', unique: false, required: false },
    { id: 'fld_prix', name: 'prix', type: 'decimal', unique: false, required: true },
    { id: 'fld_quantite_stock', name: 'quantite_stock', type: 'number', unique: false, required: true },
  ],
} as unknown as EntiteDonnees
const AVEC_EMPLACEMENT = {
  ...(PRODUIT as object),
  fields: [...(PRODUIT as unknown as { fields: unknown[] }).fields,
    { id: 'fld_emplacement', name: 'emplacement', type: 'text', unique: false, required: false }],
} as unknown as EntiteDonnees

const ecran = (avecEmplacement: boolean) => `
export function Pharmacie() {
  const enregistrer = async () => {
    const donnees = {
      nom: nom.trim(),
      categorie: categorie.trim(),
      prix: prixNombre,
      quantite_stock: quantiteNombre,${avecEmplacement ? '\n      emplacement: emplacement.trim(),' : ''}
    };
    if (idEdition) {
      const { error } = await base
        .from('produit')
        .update(donnees)
        .eq('id', idEdition);
    } else {
      const { error } = await base.from('produit').insert(donnees);
    }
  };
}
`
const V3 = new Map([['src/Pharmacie.tsx', ecran(false)]])
const V4 = new Map([['src/Pharmacie.tsx', ecran(true)]])

describe('A · colonnes inexistantes', () => {
  it('① v4 : emplacement est vu à la modification et à l’ajout', () => {
    const v = jugerColonnes(V4, [PRODUIT])
    expect(v.inconnues.map((x) => `${x.table}.${x.colonne}:${x.geste}`).sort())
      .toEqual(['produit.emplacement:insert', 'produit.emplacement:update'])
    expect(v.nonResolus).toEqual([])
  })

  it('② contrôle négatif : v3 ne déclenche rien', () => {
    expect(jugerColonnes(V3, [PRODUIT]).inconnues).toEqual([])
  })

  it('③ contrôle négatif : champ déclaré par la retouche → la colonne existera', () => {
    expect(jugerColonnes(V4, [AVEC_EMPLACEMENT]).inconnues).toEqual([])
  })

  it('④ table non déclarée → « * » ; systeme/ ignoré', () => {
    const f = new Map([
      ['src/Horaire.tsx', "await base.from('horaire').insert({ jour: 1 })"],
      ['systeme/base.ts', "await base.from('fantome').insert({ x: 1 })"],
    ])
    expect(jugerColonnes(f, [PRODUIT]).inconnues).toEqual([
      { fichier: 'src/Horaire.tsx', table: 'horaire', colonne: '*', geste: 'insert' },
    ])
  })

  it('⑤ un objet venu d’ailleurs est compté non résolu, pas jugé', () => {
    const f = new Map([['src/a.ts', "export const ecrire = (objet: any) => base.from('produit').insert(objet)"]])
    const v = jugerColonnes(f, [PRODUIT])
    expect(v.inconnues).toEqual([])
    expect(v.nonResolus).toHaveLength(1)
  })

  it('⑥ le refus nomme la donnée ajoutée, pas une casse antérieure', () => {
    const avant = new Map([['src/Horaire.tsx', "base.from('produit').insert({ nom: 'a', vieux: 1 })"]])
    const apres = new Map([...avant, ...V4])
    const neuves = colonnesNouvelles(avant, [PRODUIT], apres, [PRODUIT])
    expect([...new Set(neuves.map((x) => x.colonne))]).toEqual(['emplacement'])
    expect(phraseColonnes(neuves)).toBe('elle écrirait « emplacement » dans « produit », qui n’existe pas dans la base de votre application')
  })

  it('⑦ cliquet : la route juge avant sur la déclaration, après sur la fusion', () => {
    const route = readFileSync(path.join(__dirname, '../../../app/api/generateur/retoucher/route.ts'), 'utf8')
    expect(route).toMatch(motifTexte("{ nom: 'colonnes inexistantes', defauts: jugerColonnes(fichiers, o.colonnes).inconnues.length }"))
    expect(route).toMatch(motifTexte('noter(avant, { ...contexte, colonnes: contexte.entites })'))
    expect(route).toMatch(motifTexte('noter(fichiersLivres, { ...contexte, colonnes: fusion.entites })'))
    expect(route).toMatch(motifTexte("x.juge === 'colonnes inexistantes'"))
  })
})
