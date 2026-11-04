/**
 * EP-344 · M4 (a) — L'ANCIENNE DÉCLARATION EXISTE, ET ELLE EST MONTRÉE.
 *
 * ── LE PIÈGE QUI NE CASSE RIEN ET REND TOUT IMPOSSIBLE.
 *
 * Consigné dans M1 avant d'être vivant ici :
 *
 *   « La déclaration NOUVELLE doit être écrite par un modèle à qui l'on
 *     a montré l'ANCIENNE. Sans ça il réinvente ses identifiants, toutes
 *     les tables paraissent abandonnées, et la migration s'arrête
 *     SYSTÉMATIQUEMENT : garde étanche, produit inutilisable. »
 *
 * ── ET LA MESURE A TROUVÉ PIRE : IL N'Y AVAIT RIEN À MONTRER.
 *
 * Les six dernières œuvres portaient un document à TROIS clés :
 *
 *     ['fichiers', 'politiques', 'schema']
 *
 * Le SQL émis, jamais les entités qui l'ont produit. `sections_acquises`
 * porte les verdicts des juges, pas la déclaration.
 *
 * Deux réponses, et il fallait les deux : la déclaration voyage
 * désormais DANS le document, et les œuvres d'avant la retrouvent par
 * relecture de leur SQL — sans quoi aucune d'elles ne pourrait jamais
 * être modifiée.
 *
 * ── L'ALLER-RETOUR EST EXACT, MESURÉ SUR LES ŒUVRES RÉELLES.
 *
 *   3 œuvres avec tables · aller-retour exact : 3/3
 *   schéma ET politiques — la première « divergence » vue était ma
 *   propre normalisation, pas les données.
 */
import { describe, expect, it } from 'vitest'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { declarationDe, declarationDepuisSchema } from '../declaration-depuis-schema'
import { comparerDeclarations, phraseArret } from '../migration-oeuvre'
import { blocDeclaration } from '../retouche'
import type { EntiteDeclaree } from '../entites-declarees'

const RELEVE: EntiteDeclaree = {
  id: 'ent_releve',
  name: 'releve',
  appendOnly: true,
  fields: [
    { id: 'fld_date', name: 'date', type: 'text', required: false },
    { id: 'fld_montant', name: 'montant', type: 'number', required: false },
    { id: 'fld_ok', name: 'ok', type: 'boolean', required: false },
  ],
}
const NOTE: EntiteDeclaree = {
  id: 'ent_note',
  name: 'note',
  fields: [{ id: 'fld_t', name: 't', type: 'text', required: false, unique: true }],
}

describe('EP-344 · la déclaration retrouvée et montrée', () => {
  it('① L’ALLER-RETOUR PRÉSERVE L’IDENTITÉ — le SQL redonne ses entités', () => {
    const lu = declarationDepuisSchema(emettreSchemaSql([RELEVE, NOTE]))
    expect(lu.map((e) => e.id), 'les identifiants ne survivent pas').toEqual([
      'ent_releve',
      'ent_note',
    ])
    expect(lu[0]?.fields.map((f) => f.id)).toEqual(['fld_date', 'fld_montant', 'fld_ok'])
    expect(lu[1]?.fields[0]?.unique, 'l’unicité est perdue').toBe(true)
  })

  it('② LE JOURNAL SURVIT, et il change les politiques', () => {
    // Le perdre ferait reposer une porte OUVERTE sur une table qui
    // n'accepte que des ajouts. Il se lit dans le commentaire émis —
    // écrit par nous, pas par le modèle.
    const lu = declarationDepuisSchema(emettreSchemaSql([RELEVE, NOTE]))
    expect(lu[0]?.appendOnly, 'le journal est perdu à la relecture').toBe(true)
    expect(lu[1]?.appendOnly, 'une table ordinaire devient un journal').toBeUndefined()
    const ID = '11111111-2222-3333-4444-555555555555'
    expect(
      emettrePolitiquesSql([...lu], ID),
      'les politiques relues diffèrent des originales',
    ).toBe(emettrePolitiquesSql([RELEVE, NOTE], ID))
  })

  it('③ ET LE DIFF EST VIDE — pas un arrêt', () => {
    // ── LA PROPRIÉTÉ QUI DÉCIDE DE TOUT M4.
    //
    // Une modification qui ne touche pas aux données doit produire un
    // diff VIDE. Un arrêt ici rendrait toute modification impossible,
    // sans rien casser — le pire genre de panne.
    const avant = declarationDepuisSchema(emettreSchemaSql([RELEVE, NOTE]))
    const plan = comparerDeclarations(avant, avant)
    expect(plan.ecarts, 'une œuvre inchangée déclare des écarts').toEqual([])
    expect(plan.peutAvancer).toBe(true)
    expect(phraseArret(plan), 'une œuvre inchangée est arrêtée').toBeNull()
  })

  it('④ LA DÉCLARATION STOCKÉE GAGNE SUR LA RELECTURE', () => {
    // ── UN SEUL ENDROIT OÙ POSER LA QUESTION.
    //
    // Deux appelants qui choisiraient différemment compareraient des
    // déclarations de provenances différentes — et M1 verrait des
    // abandons là où il n'y a qu'un écart de lecture.
    const doc = { schema: emettreSchemaSql([RELEVE]), entites: [NOTE] }
    expect(declarationDe(doc).map((e) => e.id), 'le champ stocké est ignoré').toEqual(['ent_note'])
    // ET SANS CHAMP STOCKÉ — les œuvres d'avant le 2026-11-04.
    expect(declarationDe({ schema: emettreSchemaSql([RELEVE]) }).map((e) => e.id)).toEqual([
      'ent_releve',
    ])
    expect(declarationDe(null), 'un document absent produit une déclaration').toEqual([])
  })

  it('⑤ LE MODÈLE REÇOIT LES IDENTIFIANTS, pas les jolis noms', () => {
    const b = blocDeclaration([RELEVE])
    expect(b, 'l’identifiant de la table n’est pas montré').toContain('ent_releve')
    expect(b, 'l’identifiant du champ n’est pas montré').toContain('fld_montant')
    expect(b, 'rien ne dit pourquoi il doit les réemployer').toMatch(/EXACTEMENT/u)
    // LE SILENCE EST UN CAS, PAS UN OUBLI : sans phrase, le modèle
    // croirait qu'on a omis de lui montrer quelque chose, et inventerait.
    expect(blocDeclaration([]), 'une œuvre sans données ne reçoit rien').toMatch(/AUCUNE/u)
  })

  it('⑥ ET LA ROUTE DE RETOUCHE L’ENVOIE VRAIMENT', async () => {
    // L'USAGE, PAS LA DÉFINITION. C'est le défaut le plus fréquent de ce
    // dépôt : quatre modules prouvés sans appelant en trois jours.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'retoucher', 'route.ts'),
      'utf8',
    )
    expect(src, 'la consigne ne porte pas la déclaration').toMatch(
      /system: `\$\{CONSIGNE_RETOUCHE\}[\s\S]{0,40}blocDeclaration\(declarationDe\(/u,
    )
  })

  it('⑦ ET LA GÉNÉRATION LA STOCKE — sinon il n’y a rien à relire demain', async () => {
    // Le document ne portait que trois clés. Sans ce champ, chaque œuvre
    // neuve dépendrait d'une relecture de SQL qui, elle, perd le type
    // déclaré : `date` et `text` sortent tous deux en `text`.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'),
      'utf8',
    )
    expect(src, 'la déclaration n’est pas stockée dans le document').toMatch(
      /politiques: politiquesDeLOeuvre,[\s\S]{0,900}entites: entitesCourantes,/u,
    )
  })
})
