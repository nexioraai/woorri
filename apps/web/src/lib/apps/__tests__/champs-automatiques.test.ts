/**
 * LES CHAMPS AUTOMATIQUES (2026-11-28, O1 élargi) — la BASE remplit le
 * numéro lisible, la date de création, le compteur ; jamais le navigateur.
 *
 * ① la copie côté écran de `autoLu` est ÉGALE à celle du compilateur ;
 * ② le contrat accepte `auto` ; un champ incohérent est refusé AVEC quoi
 *   corriger, et ce motif repart au modèle ;
 * ③ le SQL pose le défaut — et rien n'est émis pour une table sans champ
 *   automatique ;
 * ④ le cas réel « Suivi de colis » : passer `numero_suivi` en identifiant
 *   SUIVI est un AJOUT, sans accord, que la liste blanche du migrateur laisse
 *   passer — avec la lecture par clé, sans le tirage nu par-dessus ;
 * ⑤ la consigne l'enseigne, et ne promet plus ce que le SQL ne fait pas.
 */
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { autoLu as autoLuCompilateur, emettrePolitiquesSql, TIRAGE_CLE } from '@deribfy/compiler'
import { autoLu } from '../champs-automatiques'
import { blocBase, lireEntites, REGLE_CHAMPS_AUTOMATIQUES, REGLE_LECTURE_PAR_CLE, type EntiteDeclaree } from '../entites-declarees'
import { FICHIER_DECLARATION, fusionnerEntites, lireDeclarationEnRoute, problemeDeclaration } from '../declaration-en-route'
import { comparerDeclarations } from '../migration-oeuvre'
import { emettreMigrationSql, verifierMigration } from '../migration-sql'
import { demandeAccordAvantMigration } from '../phrase-migration'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { motifTexte } from './motif-texte'

const analyser = (e: unknown) => projectAirSchema.shape.entities.element.safeParse(e)
const valider = (e: unknown) => analyser(e).success
const ID = '0178c047-d6e7-430f-88bd-fc455cd47283'

const CAS: readonly { readonly type: string; readonly unique?: boolean; readonly auto?: unknown }[] = [
  { type: 'text' },
  { type: 'text', unique: true, auto: { genre: 'identifiant', prefixe: 'SUIVI' } },
  { type: 'string', unique: true, auto: { genre: 'identifiant', prefixe: 'REÇU' } },
  { type: 'text', unique: true, auto: { genre: 'identifiant', prefixe: 'suivi' } },
  { type: 'text', unique: true, auto: { genre: 'identifiant' } },
  { type: 'text', auto: { genre: 'identifiant', prefixe: 'FAC' } },
  { type: 'number', unique: true, auto: { genre: 'identifiant', prefixe: 'FAC' } },
  { type: 'date', auto: { genre: 'date_creation' } },
  { type: 'datetime', auto: { genre: 'date_creation' } },
  { type: 'text', auto: { genre: 'date_creation' } },
  { type: 'number', auto: { genre: 'compteur' } },
  { type: 'decimal', auto: { genre: 'compteur' } },
  { type: 'text', auto: { genre: 'inconnu' } },
  { type: 'text', auto: null },
]

const colis = (champ: Record<string, unknown>): EntiteDeclaree =>
  ({ id: 'ent_colis', name: 'colis', fields: [{ id: 'fld_statut', name: 'statut', type: 'text', required: true }, { id: 'fld_numero_suivi', name: 'numero_suivi', required: true, ...champ }] }) as unknown as EntiteDeclaree

describe('① la copie côté écran est égale au compilateur', () => {
  it('sur les mêmes déclarations, bonnes et mauvaises', () => {
    for (const c of CAS) {
      const f = { id: 'fld_numero', name: 'numero', ...c }
      expect(autoLu(f), JSON.stringify(c)).toEqual(autoLuCompilateur(f))
    }
  })
})

describe('② le contrat et le lecteur', () => {
  it('le contrat accepte les trois genres', () => {
    for (const auto of [{ genre: 'identifiant', prefixe: 'SUIVI' }, { genre: 'date_creation' }, { genre: 'compteur' }]) {
      expect(valider(colis({ type: 'text', unique: true, auto })), JSON.stringify(auto)).toBe(true)
    }
    expect(valider(colis({ type: 'text', auto: { genre: 'magique' } }))).toBe(false)
  })

  it('un identifiant sans "unique" est refusé, et le motif dit quoi corriger', () => {
    const lu = lireEntites([colis({ type: 'text', auto: { genre: 'identifiant', prefixe: 'SUIVI' } })], valider)
    expect(lu.entites).toEqual([])
    expect(lu.refus[0]?.motif).toMatch(motifTexte('porte "unique": true'))
  })

  it('ce motif repart au modèle par la relance', () => {
    const dec = lireDeclarationEnRoute(
      new Map([[FICHIER_DECLARATION, JSON.stringify([colis({ type: 'number', auto: { genre: 'date_creation' } })])]]),
      valider,
    )
    expect(problemeDeclaration(dec, analyser)).toMatch(motifTexte('une date de création est de type "date" ou "datetime"'))
  })
})

describe('③ le SQL pose le défaut', () => {
  const sql = (champ: Record<string, unknown>) => emettrePolitiquesSql([colis(champ)], ID)

  it('identifiant : PRÉFIXE- puis 8 signes tirés par la base', () => {
    expect(sql({ type: 'text', unique: true, auto: { genre: 'identifiant', prefixe: 'SUIVI' } })).toContain(
      "alter table colis alter column numero_suivi set default 'SUIVI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));",
    )
  })

  it('date de création : le jour, ou l’instant ISO en UTC', () => {
    expect(sql({ type: 'date', auto: { genre: 'date_creation' } })).toContain("set default to_char(now() at time zone 'utc', 'YYYY-MM-DD');")
    expect(sql({ type: 'datetime', auto: { genre: 'date_creation' } })).toContain(`'YYYY-MM-DD"T"HH24:MI:SS"Z"'`)
  })

  it('compteur : une séquence propre à la colonne, ouverte au rôle qui écrit', () => {
    const s = sql({ type: 'number', auto: { genre: 'compteur' } })
    expect(s).toContain('create sequence if not exists colis_numero_suivi_seq;')
    expect(s).toContain('grant usage, select on sequence colis_numero_suivi_seq to authenticated;')
    expect(s).toContain("set default nextval('colis_numero_suivi_seq');")
  })

  it('sans champ automatique, rien n’est émis', () => {
    expect(sql({ type: 'text', unique: true })).not.toMatch(motifTexte('CHAMPS AUTOMATIQUES'))
  })

  it('un champ incohérent n’émet aucun défaut', () => {
    expect(sql({ type: 'text', auto: { genre: 'identifiant', prefixe: 'SUIVI' } })).not.toMatch(/set\s+default\s+'SUIVI-'/u)
  })
})

describe('④ le cas réel « Suivi de colis »', () => {
  /** L'appli telle qu'en base le 2026-11-28 : numero_suivi unique, sans défaut. */
  const AVANT = [{
    id: 'ent_colis', name: 'colis',
    fields: [
      { id: 'fld_numero_suivi', name: 'numero_suivi', type: 'text', unique: true, required: true },
      { id: 'fld_ville_destination', name: 'ville_destination', type: 'text', required: true },
      { id: 'fld_statut', name: 'statut', type: 'enum', required: true },
    ],
  }] as unknown as EntiteDeclaree[]
  /** Ce que la retouche doit déclarer : le champ avec SON id, plus "auto", et la lecture par clé. */
  const DECLARE = JSON.stringify([{
    id: 'ent_colis', name: 'colis',
    lectureParCle: { cle: 'numero_suivi', champs: ['numero_suivi', 'statut', 'ville_destination'] },
    fields: [{ id: 'fld_numero_suivi', name: 'numero_suivi', type: 'text', unique: true, required: true, auto: { genre: 'identifiant', prefixe: 'SUIVI' } }],
  }])

  const dec = lireDeclarationEnRoute(new Map([[FICHIER_DECLARATION, DECLARE]]), valider)
  const fusion = fusionnerEntites(AVANT, dec.entites)
  const plan = comparerDeclarations(AVANT, fusion.entites)

  it('la fusion garde "auto", sans perte', () => {
    expect(dec.refus).toEqual([])
    expect(fusion.pertes).toEqual([])
    expect(fusion.entites[0]?.fields.find((f) => f.name === 'numero_suivi')?.auto).toEqual({ genre: 'identifiant', prefixe: 'SUIVI' })
  })

  it('c’est un AJOUT, qui avance sans demander l’accord', () => {
    expect(plan.ajouts.map((e) => e.genre)).toEqual(['auto-change'])
    expect(plan.peutAvancer).toBe(true)
    expect(demandeAccordAvantMigration(plan)).toBe(false)
  })

  it('la migration passe la liste blanche, pose SUIVI-, ouvre colis_par_cle, sans le tirage nu', () => {
    const m = emettreMigrationSql(plan, fusion.entites, ID)
    expect(m.refus).toEqual([])
    expect(m.sql).toContain("alter table colis alter column numero_suivi set default 'SUIVI-' ||")
    expect(m.sql).toContain('create or replace function colis_par_cle(p_cle text)')
    expect(m.sql).not.toContain(`set default ${TIRAGE_CLE}`)
    expect(m.gestes.join(' ')).toMatch(motifTexte('remplir « numero_suivi » automatiquement'))
  })

  it('une colonne compteur ajoutée passe aussi la liste blanche', () => {
    const apres = [{ ...AVANT[0]!, fields: [...AVANT[0]!.fields, { id: 'fld_rang', name: 'rang', type: 'number', required: false, auto: { genre: 'compteur' } }] }] as EntiteDeclaree[]
    const m = emettreMigrationSql(comparerDeclarations(AVANT, apres), apres, ID)
    expect(m.refus).toEqual([])
    expect(m.sql).toContain("set default nextval('colis_rang_seq');")
  })

  it('la liste blanche refuse un défaut qui n’est pas l’une des formes émises', () => {
    expect(verifierMigration("alter table colis alter column numero_suivi set default (select string_agg(x, '') from y);").ok).toBe(false)
    expect(verifierMigration("alter table colis alter column numero_suivi set default 'X-' || current_user;").ok).toBe(false)
  })
})

describe('⑤ la consigne l’enseigne, et ne promet plus ce que le SQL ne fait pas', () => {
  it('génération et retouche portent la règle', () => {
    const base = blocBase([colis({ type: 'text', unique: true })])
    for (const ligne of REGLE_CHAMPS_AUTOMATIQUES) {
      expect(base).toContain(ligne)
      expect(CONSIGNE_RETOUCHE).toContain(ligne)
    }
  })
  it('la lecture par clé renvoie à "auto" au lieu d’affirmer « la base la TIRE »', () => {
    const regle = REGLE_LECTURE_PAR_CLE.join(' ')
    expect(regle).not.toMatch(/La\s+base\s+la\s+TIRE/u)
    expect(regle).toMatch(motifTexte('déclaré "auto" identifiant'))
  })
})
