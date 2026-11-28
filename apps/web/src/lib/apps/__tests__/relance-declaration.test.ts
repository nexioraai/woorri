/**
 * LA LECTURE DE DONNEES.json ET SA RELANCE (2026-11-28).
 *
 * ① La sortie RÉELLE de la retouche de 18:06 sur « Suivi de colis »
 *   (0178c047, boîte noire du 2026-11-27 23:06 UTC) — un JSON valide suivi de
 *   803 signes de prose — se lit désormais, traverse le VRAI contrat, et la
 *   lecture par clé arrive jusqu'au SQL.
 * ② Le lecteur trouve le JSON derrière des balises, de la prose, des
 *   crochets dans les chaînes ; il ne rejette que s'il n'y en a aucun.
 * ③ Un JSON cassé ou refusé par le contrat repart au modèle avec l'erreur
 *   EXACTE, deux fois au plus ; ensuite c'est un échec.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettrePolitiquesSql } from '@deribfy/compiler'
import {
  extraireJson,
  FICHIER_DECLARATION,
  fusionnerEntites,
  lireDeclarationEnRoute,
  problemeDeclaration,
} from '../declaration-en-route'
import {
  corrigerDeclaration,
  declarationDuTexte,
  ESSAIS_DECLARATION_MAX,
  messageRelance,
} from '../relance-declaration'
import type { EntiteDeclaree } from '../entites-declarees'
import { motifTexte } from './motif-texte'

const analyser = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e)
const lire = (f: ReadonlyMap<string, string>) => lireDeclarationEnRoute(f, (e) => analyser(e).success)
const probleme = (d: ReturnType<typeof lire>) => problemeDeclaration(d, analyser)

const SORTIE_1806 = readFileSync(join(__dirname, 'fixtures/donnees-retouche-0178c047-1806.txt'), 'utf8')

/** La déclaration de l'appli AVANT la retouche, relue en base le 2026-11-28. */
const AVANT_0178: readonly EntiteDeclaree[] = [
  {
    id: 'ent_colis', name: 'colis',
    fields: [
      { id: 'fld_numero_suivi', name: 'numero_suivi', type: 'text', unique: true, required: true },
      { id: 'fld_expediteur', name: 'expediteur', type: 'text', required: true },
      { id: 'fld_destinataire', name: 'destinataire', type: 'text', required: true },
      { id: 'fld_ville_destination', name: 'ville_destination', type: 'text', required: true },
      { id: 'fld_prix', name: 'prix', type: 'decimal', required: true },
      { id: 'fld_statut', name: 'statut', type: 'enum', required: true },
    ],
  } as EntiteDeclaree,
]

describe('① la sortie réelle de la retouche de 18:06', () => {
  it('c’est bien du JSON suivi de prose, que JSON.parse seul refuse', () => {
    expect(SORTIE_1806).toMatch(motifTexte('Ce que j\'ai ajouté, en clair'))
    expect(() => JSON.parse(SORTIE_1806)).toThrow()
  })

  it('se lit maintenant, passe le contrat, et ne pose aucun problème', () => {
    const dec = lire(new Map([['index.tsx', 'x'], [FICHIER_DECLARATION, SORTIE_1806]]))
    expect(dec.illisible).toBeNull()
    expect(dec.refus).toEqual([])
    expect(dec.entites).toHaveLength(1)
    expect(dec.entites[0]?.lectureParCle).toEqual({ cle: 'numero_suivi', champs: ['numero_suivi', 'statut', 'ville_destination'] })
    expect(probleme(dec)).toBeNull()
    // La déclaration ne part pas dans l'application.
    expect([...dec.fichiers.keys()]).toEqual(['index.tsx'])
  })

  it('fusionnée avec l’appli d’avant, sans perte, elle ouvre `colis_par_cle` en SQL', () => {
    const dec = lire(new Map([[FICHIER_DECLARATION, SORTIE_1806]]))
    const fusion = fusionnerEntites(AVANT_0178, dec.entites)
    expect(fusion.pertes).toEqual([])
    expect(fusion.entites[0]?.fields).toHaveLength(6)
    expect(emettrePolitiquesSql([...fusion.entites], '0178c047-d6e7-430f-88bd-fc455cd47283')).toMatch(/colis_par_cle/u)
  })
})

describe('② le lecteur tolérant', () => {
  const T = '[{"id":"ent_a","name":"a","fields":[]}]'
  it('lit la section entière quand elle est du JSON pur', () => {
    expect(extraireJson(T)).toEqual({ ok: true, valeur: JSON.parse(T) })
  })
  it('lit derrière des balises ```json, avec du texte autour', () => {
    expect(extraireJson(`Voici :\n\`\`\`json\n${T}\n\`\`\`\nVoilà.`)).toEqual({ ok: true, valeur: JSON.parse(T) })
  })
  it('lit avec de la prose AVANT et APRÈS, crochets et « [1] » compris dans la prose', () => {
    const v = extraireJson(`J'ai mis {une note}, [un renvoi] et [1] :\n${T}\nPuis (fin) [x].`)
    expect(v).toEqual({ ok: true, valeur: JSON.parse(T) })
  })
  it('ne se laisse pas tromper par des crochets DANS les chaînes', () => {
    const avecChaine = '[{"id":"ent_a","name":"a ] } [","fields":[]}] et la suite'
    expect(extraireJson(avecChaine)).toEqual({ ok: true, valeur: [{ id: 'ent_a', name: 'a ] } [', fields: [] }] })
  })
  it('lit l’enveloppe { entites } quand aucun tableau nu n’est là', () => {
    expect(extraireJson(`ok : {"entites": ${T}} fin`)).toEqual({ ok: true, valeur: { entites: JSON.parse(T) } })
  })
  it('rejette seulement s’il n’y a AUCUN JSON, avec l’erreur exacte du parseur', () => {
    const r = extraireJson('[{"id":"ent_a", "name": ')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.erreur).toMatch(/JSON/u)
  })
})

describe('③ le problème, dit exactement', () => {
  it('JSON introuvable : l’erreur du parseur', () => {
    const d = lire(new Map([[FICHIER_DECLARATION, '[{"id": cassé']]))
    expect(d.illisible).not.toBeNull()
    expect(probleme(d)).toMatch(motifTexte('aucun JSON lisible'))
  })
  it('JSON qui n’est pas une liste de tables', () => {
    expect(probleme(lire(new Map([[FICHIER_DECLARATION, '{"bonjour": 1}']])))).toMatch(motifTexte('liste de tables'))
  })
  it('refus du contrat : le chemin et le message de zod, pas « forme refusée »', () => {
    const d = lire(new Map([[FICHIER_DECLARATION, '[{"id":"ent_colis","name":"colis","inventee":true,"fields":[]}]']]))
    const p = probleme(d) ?? ''
    expect(p).toMatch(motifTexte('refusé par le contrat'))
    expect(p).toMatch(/colis/u)
    expect(p).toMatch(/inventee/u)
  })
  it('pas de fichier : aucun problème', () => {
    expect(probleme(lire(new Map([['index.tsx', 'x']])))).toBeNull()
  })
})

describe('④ la relance', () => {
  const casse = new Map([['index.tsx', 'x'], [FICHIER_DECLARATION, '[{"id": cassé']])
  const bon = '[{"id":"ent_colis","name":"colis","lectureParCle":{"cle":"numero_suivi","champs":["numero_suivi"]},"fields":[{"id":"fld_numero_suivi","name":"numero_suivi","type":"text","unique":true,"required":true}]}]'

  it('un JSON cassé déclenche un nouvel essai avec l’erreur exacte, et le corrigé est pris', async () => {
    const envoyes: string[] = []
    const r = await corrigerDeclaration({
      fichiers: casse, lire, probleme,
      relancer: async (c) => { envoyes.push(c); return `=== DONNEES.json ===\n${bon}\n` },
    })
    expect(r.ok).toBe(true)
    expect(r.relances).toBe(1)
    expect(envoyes[0]).toMatch(motifTexte('aucun JSON lisible'))
    expect(envoyes[0]).toMatch(motifTexte(messageRelance('').split('\n')[0]!))
    if (r.ok) {
      expect(r.declaration.entites[0]?.lectureParCle?.cle).toBe('numero_suivi')
      expect(r.fichiers.get('index.tsx')).toBe('x')
    }
  })

  it(`au plus ${String(ESSAIS_DECLARATION_MAX)} nouveaux essais, puis échec avec le dernier problème`, async () => {
    let n = 0
    const r = await corrigerDeclaration({ fichiers: casse, lire, probleme, relancer: async () => { n += 1; return 'toujours pas [ du json' } })
    expect(r.ok).toBe(false)
    expect(n).toBe(ESSAIS_DECLARATION_MAX)
    expect(ESSAIS_DECLARATION_MAX).toBe(2)
    expect(r.ok ? '' : r.probleme).toMatch(motifTexte('aucun JSON lisible'))
  })

  it('un modèle qui ne répond pas compte comme un essai perdu, pas comme une exception', async () => {
    let n = 0
    const r = await corrigerDeclaration({ fichiers: casse, lire, probleme, relancer: async () => { n += 1; return null } })
    expect(r.ok).toBe(false)
    expect(n).toBe(2)
  })

  it('une déclaration saine ne relance rien', async () => {
    let n = 0
    const r = await corrigerDeclaration({
      fichiers: new Map([[FICHIER_DECLARATION, SORTIE_1806]]), lire, probleme,
      relancer: async () => { n += 1; return null },
    })
    expect(r.ok).toBe(true)
    expect(n).toBe(0)
  })

  it('un JSON nu, sans en-tête de section, est accepté comme réponse', () => {
    expect(declarationDuTexte(bon)).toBe(bon)
    expect(declarationDuTexte(`=== DONNEES.json ===\n${bon}\n`).trim()).toBe(bon)
  })
})
