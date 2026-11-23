/**
 * DÉFAUT A, SECOND MAILLON (2026-11-18) — LA DÉCLARATION D'UNE RETOUCHE PASSE, OU SE DIT.
 *
 * Mesuré (RAPPORT_RETOUCHE_PHARMA.md §A) : l'exemple de la consigne et une
 * recopie fidèle du bloc montré au modèle étaient REFUSÉS par le contrat
 * (pas d'`id`, pas de `required`), et la route ne lisait aucun refus.
 *
 * ① chaque gabarit JSON de la consigne passe le contrat ;
 * ② une recopie fidèle du bloc montré passe le contrat (données réelles de pharma) ;
 * ③ bout en bout : le gabarit « un champ de plus » ajoute `emplacement` à
 *   `produit`, sans perte, le plan de migration avance, et le juge des
 *   colonnes ne voit plus rien sur le code de la v4 ;
 * ④ contrôle négatif : l'ANCIEN gabarit est refusé — et ça se dit ;
 * ⑤ le JSON illisible se dit aussi ; rien de rejeté → aucune phrase ;
 * ⑥ cliquet : la route le calcule et le rend ; l'atelier l'affiche.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import type { EntiteDonnees } from '@deribfy/compiler'
import { fusionnerEntites, lireDeclarationEnRoute } from '../declaration-en-route'
import { lireEntites, type EntiteDeclaree } from '../entites-declarees'
import { comparerDeclarations } from '../migration-oeuvre'
import { jugerColonnes } from '../juge-colonnes'
import { blocDeclaration, CONSIGNE_RETOUCHE, phraseDeclarationRejetee } from '../retouche'
import { motifTexte } from './motif-texte'

const valider = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e).success
const champ = (n: string, type: string, required: boolean, unique = false) =>
  ({ id: `fld_${n}`, name: n, type, unique, required })
/** Les quatre tables réelles de pharma.deribfy.app (document courant, lecture seule). */
const PHARMA = [
  { id: 'ent_client', name: 'client', fields: [champ('nom', 'text', true), champ('telephone', 'text', true, true), champ('quartier', 'text', false)] },
  { id: 'ent_produit', name: 'produit', fields: [champ('nom', 'text', true), champ('categorie', 'text', false), champ('prix', 'decimal', true), champ('quantite_stock', 'number', true)] },
] as unknown as EntiteDeclaree[]

const gabarits = (): unknown[][] =>
  CONSIGNE_RETOUCHE.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('[{'))
    .map((l) => JSON.parse(l) as unknown[])

const fichiersAvec = (declaration: string) =>
  new Map([['src/App.tsx', 'export default function App() { return null }'], ['DONNEES.json', declaration]])

describe('A · la déclaration d’une retouche', () => {
  it('① chaque gabarit de la consigne passe le contrat', () => {
    const g = gabarits()
    expect(g.length, 'la consigne ne montre plus de gabarit JSON').toBeGreaterThanOrEqual(2)
    for (const t of g) {
      const lu = lireEntites(t, valider)
      expect(lu.refus, JSON.stringify(t)).toEqual([])
      expect(lu.entites).toHaveLength(t.length)
    }
  })

  it('② une recopie fidèle du bloc montré passe le contrat', () => {
    const lignes = blocDeclaration(PHARMA).split('\n').filter((l) => l.startsWith('{'))
    expect(lignes).toHaveLength(PHARMA.length)
    const lu = lireEntites(lignes.map((l) => JSON.parse(l) as unknown), valider)
    expect(lu.refus).toEqual([])
    expect(lu.entites).toHaveLength(PHARMA.length)
  })

  it('③ bout en bout : « un champ de plus » ajoute la colonne, et le juge se tait', () => {
    const g = gabarits().find((t) => JSON.stringify(t).includes('ent_produit'))
    expect(g, 'le gabarit « un champ de plus » a disparu').toBeDefined()
    const d = lireDeclarationEnRoute(fichiersAvec(JSON.stringify(g)), valider)
    expect(d.refus).toEqual([])
    const fusion = fusionnerEntites(PHARMA, d.entites)
    expect(fusion.pertes).toEqual([])
    const produit = fusion.entites.find((e) => e.name === 'produit')!
    expect(produit.fields.map((f) => f.name)).toEqual(['nom', 'categorie', 'prix', 'quantite_stock', 'emplacement'])
    expect(fusion.entites.find((e) => e.name === 'client')!.fields).toHaveLength(3)
    expect(comparerDeclarations(PHARMA, fusion.entites).peutAvancer).toBe(true)
    const v4 = new Map([['src/P.tsx', "const donnees = { nom: n, prix: p, emplacement: e.trim() }; base.from('produit').insert(donnees)"]])
    expect(jugerColonnes(v4, PHARMA as unknown as EntiteDonnees[]).inconnues).toHaveLength(1)
    expect(jugerColonnes(v4, fusion.entites as unknown as EntiteDonnees[]).inconnues).toEqual([])
  })

  it('④ contrôle négatif : l’ancien gabarit est refusé, et le refus se dit', () => {
    const ancien = '[{"name":"produit","fields":[{"name":"emplacement","type":"text"}]}]'
    const d = lireDeclarationEnRoute(fichiersAvec(ancien), valider)
    expect(d.entites).toEqual([])
    expect(d.refus.length).toBeGreaterThan(0)
    expect(phraseDeclarationRejetee({ illisible: false, refus: d.refus, pertes: [] }))
      .toMatch(motifTexte('Une donnée demandée n’a pas pu être ajoutée à votre base ('))
  })

  it('⑤ l’illisible se dit ; rien de rejeté, rien à dire', () => {
    expect(phraseDeclarationRejetee({ illisible: true, refus: [], pertes: [] })).toMatch(motifTexte('illisible'))
    expect(phraseDeclarationRejetee({ illisible: false, refus: [], pertes: [] })).toBeNull()
    expect(phraseDeclarationRejetee({ illisible: false, refus: [], pertes: [{ table: 'produit', quoi: 'prix: text', pourquoi: 'le cahier le déclare decimal' }] }))
      .toMatch(motifTexte('« prix: text » dans « produit »'))
  })

  it('⑥ cliquet : la route le calcule et le rend, l’atelier l’affiche', () => {
    const route = readFileSync(path.join(__dirname, '../../../app/api/generateur/retoucher/route.ts'), 'utf8')
    expect(route).toMatch(motifTexte('illisible, refus: declaration.refus, pertes: fusion.pertes,'))
    expect(route).toMatch(motifTexte('...(declarationRejetee === null ? {} : { declarationRejetee })'))
    // 2026-11-23 : la phrase vit dans le module partagé avec la boîte noire ; l'écran l'emploie.
    const atelier = readFileSync(path.join(__dirname, '../../../app/atelier/[id]/page.tsx'), 'utf8')
    expect(atelier).toMatch(motifTexte('messageDeRetouche(d, res.ok, paye)'))
    const message = readFileSync(path.join(__dirname, '../message-de-retouche.ts'), 'utf8')
    expect(message).toMatch(motifTexte("(d.declarationRejetee === undefined ? '' : ` ${d.declarationRejetee}`)"))
  })
})
