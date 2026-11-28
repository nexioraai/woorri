/**
 * É1 · LE DÉFAUT A (« Suivi de colis », 0178c047, 2026-11-27) — et la famille.
 *
 * MESURÉ : le modèle a déclaré `lectureParCle` dans DONNEES.json et appelé
 * `base.rpc('colis_par_cle', …)`. Le contrat de données (`entitySchema`,
 * strict) ne connaissait pas la clé : table refusée EN ENTIER, la table du
 * cahier livrée sans clé — numéro vide, fonction absente, suivi impossible.
 * Les tests d'É1 passaient : ils n'avaient jamais traversé le VRAI validateur.
 *
 * ① la déclaration du 27/11, mot pour mot, traverse le vrai chemin — le même
 *   validateur que la route `direct`, la lecture de DONNEES.json, la fusion
 *   avec le cahier — et le SQL émis ouvre `colis_par_cle` ;
 * ② LE CLIQUET DE LA FAMILLE : toute clé que la consigne apprend au modèle à
 *   écrire dans DONNEES.json est acceptée par le contrat. `lecturePublique`
 *   (2026-11) puis `lectureParCle` (2026-11-27) : deux fois la même perte.
 */
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettrePolitiquesSql, emettreSchemaSql } from '@deribfy/compiler'
import { fusionnerEntites, lireDeclarationEnRoute } from '../declaration-en-route'
import { blocBase, type EntiteDeclaree } from '../entites-declarees'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { CONSIGNE } from '../boucle-directe'

const schemaEntite = projectAirSchema.shape.entities.element
// Le validateur EXACT de la route `direct` (route.ts : schemaEntite.safeParse(e).success).
const valider = (e: unknown): boolean => schemaEntite.safeParse(e).success

/** DONNEES.json rendu par le modèle le 2026-11-27 (boîte noire de 0178c047), mot pour mot. */
const DECLARATION_DU_27 = `[
  {
    "id": "ent_colis",
    "name": "colis",
    "lectureParCle": {
      "cle": "numero_suivi",
      "champs": ["statut", "ville_destination"]
    },
    "fields": [
      { "id": "fld_numero_suivi", "name": "numero_suivi", "type": "text", "unique": true, "required": true },
      { "id": "fld_expediteur", "name": "expediteur", "type": "text", "required": true },
      { "id": "fld_destinataire", "name": "destinataire", "type": "text", "required": true },
      { "id": "fld_ville_destination", "name": "ville_destination", "type": "text", "required": true },
      { "id": "fld_prix", "name": "prix", "type": "number", "required": true },
      { "id": "fld_statut", "name": "statut", "type": "text", "required": true }
    ]
  }
]`

/** La table du cahier, telle que livrée le 27/11 (sans clé). */
const DU_CAHIER: EntiteDeclaree = {
  id: 'ent_colis', name: 'colis',
  fields: [
    { id: 'fld_numero_suivi', name: 'numero_suivi', type: 'text', unique: true, required: true },
    { id: 'fld_expediteur', name: 'expediteur', type: 'text', required: true },
    { id: 'fld_destinataire', name: 'destinataire', type: 'text', required: true },
    { id: 'fld_ville_destination', name: 'ville_destination', type: 'text', required: true },
    { id: 'fld_prix', name: 'prix', type: 'decimal', required: true },
    { id: 'fld_statut', name: 'statut', type: 'enum', required: true },
  ],
}

describe('É1 · le défaut A : la lecture par clé traverse le contrat', () => {
  it('① la déclaration du 27/11 : acceptée, gardée par la fusion, et le SQL ouvre colis_par_cle', () => {
    const fichiers = new Map([['index.tsx', 'x'], ['DONNEES.json', DECLARATION_DU_27]])
    const dec = lireDeclarationEnRoute(fichiers, valider)
    expect(dec.refus, 'le contrat refuse encore la table entière').toEqual([])
    expect(dec.entites[0]?.lectureParCle).toEqual({ cle: 'numero_suivi', champs: ['statut', 'ville_destination'] })
    const fusion = fusionnerEntites([DU_CAHIER], dec.entites)
    const colis = fusion.entites[0]
    expect(colis?.lectureParCle, 'la fusion avec le cahier perd la clé').toBeDefined()
    const sql = emettrePolitiquesSql(fusion.entites as never, 'abc')
    expect(sql).toMatch(/create policy colis_par_cle on colis for select to anon/u)
    expect(sql).toMatch(/alter table colis alter column numero_suivi set default upper\(/u)
    expect(sql).toMatch(/create or replace function colis_par_cle\(p_cle text\)/u)
    expect(sql).not.toMatch(/LECTURE PAR CLÉ NON OUVERTE/u)
    // Le schéma de table, lui, ne change pas d'un octet (la règle d'É1).
    expect(emettreSchemaSql(fusion.entites as never)).toBe(emettreSchemaSql([DU_CAHIER] as never))
  })

  it('① bis une clé mal formée ne fait plus perdre la TABLE : seule la lecture par clé est fermée', () => {
    const mal = DECLARATION_DU_27.replace('"cle": "numero_suivi"', '"cle": "statut"')
    const dec = lireDeclarationEnRoute(new Map([['DONNEES.json', mal]]), valider)
    expect(dec.refus).toEqual([])
    const sql = emettrePolitiquesSql(dec.entites as never, 'abc')
    expect(sql).toMatch(/LECTURE PAR CLÉ NON OUVERTE/u)
    expect(sql).not.toMatch(/to anon/u)
  })
})

describe('É1 · le cliquet de la famille « un champ qui ne traverse pas son contrat n’existe pas »', () => {
  /** Toutes les clés que le contrat accepte, à toute profondeur d'une entité. */
  const accepte = (() => {
    const cles = new Set<string>()
    const parcourir = (s: unknown): void => {
      const def = (s as { def?: { type?: string; shape?: Record<string, unknown>; element?: unknown; innerType?: unknown; options?: unknown[] } } | null)?.def
      if (def === undefined) return
      if (def.shape !== undefined) for (const [k, v] of Object.entries(def.shape)) { cles.add(k); parcourir(v) }
      if (def.element !== undefined) parcourir(def.element)
      if (def.innerType !== undefined) parcourir(def.innerType)
      for (const o of def.options ?? []) parcourir(o)
    }
    parcourir(schemaEntite)
    return cles
  })()

  it('toute clé que la consigne apprend à écrire dans DONNEES.json est acceptée par le contrat', () => {
    const e: EntiteDeclaree[] = [{ id: 'ent_colis', name: 'colis', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }]
    const textes = [blocBase(e), CONSIGNE_RETOUCHE, CONSIGNE]
    const enseignees = new Set<string>()
    for (const t of textes) for (const m of t.matchAll(/"([a-zA-Z]+)"\s*:/gu)) enseignees.add(m[1] ?? '')
    expect(enseignees.has('lectureParCle'), 'la consigne n’enseigne plus lectureParCle : le cliquet ne voit plus rien').toBe(true)
    expect(enseignees.has('lecturePublique')).toBe(true)
    // Clés d'AUTRES fichiers que DONNEES.json, nommées une à une avec leur fichier.
    const AUTRES_FICHIERS: Record<string, string> = {
      couleur: 'APPARENCE.json (retouche.ts)',
      partie: 'PARTIES.json (parties-demande.ts)',
      faite: 'PARTIES.json (parties-demande.ts)',
      pourquoi: 'PARTIES.json (parties-demande.ts)',
    }
    const refusees = [...enseignees].filter((k) => !accepte.has(k) && !(k in AUTRES_FICHIERS))
    expect(refusees, 'clés enseignées au modèle mais REFUSÉES par le contrat : la table entière serait perdue').toEqual([])
  })
})
