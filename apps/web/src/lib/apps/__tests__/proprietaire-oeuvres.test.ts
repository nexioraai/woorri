/**
 * L'ŒUVRE APPARTIENT À `deribfy_oeuvres`, ET SES TABLES NE SE VIDENT PAS (2026-11-18).
 *
 * Mesuré en production : 30 tables et 10 schémas à `postgres` — « must be
 * owner of table produit » à toute retouche qui ajoute une donnée — et
 * 0 table sur 30 portant la garde `truncate`. Mesuré sur Postgres jetable
 * avec les vraies gardes (scratchpad essai-proprio) : propriétaire, le
 * migrateur pouvait vider une table tant que la garde manquait.
 *
 * ① la publication crée le schéma au nom de `deribfy_oeuvres`, prend ce
 *   rôle AVANT le SQL de l'œuvre, et exige 0 table sans garde avant commit ;
 * ② la migration d'une retouche pose la garde dans SA transaction ;
 * ③ le fichier de transfert : transaction, délai de verrou, garde AVANT
 *   propriété, schémas lus au catalogue, fonction fermée au public.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SQL_GARDER_TABLES } from '../garde-tables'
import { motifTexte } from './motif-texte'

const lire = (r: string) => readFileSync(path.join(__dirname, '../../../..', r), 'utf8')
const avant = (texte: string, a: string, b: string) => {
  const i = texte.indexOf(a)
  const j = texte.indexOf(b)
  expect(i, `introuvable : ${a}`).toBeGreaterThanOrEqual(0)
  expect(j, `introuvable : ${b}`).toBeGreaterThanOrEqual(0)
  expect(i, `« ${a} » doit précéder « ${b} »`).toBeLessThan(j)
}

describe('propriété des œuvres et garde truncate', () => {
  it('① la publication : schéma à deribfy_oeuvres, rôle pris avant le SQL, garde exigée', () => {
    const p = lire('src/lib/apps/poser-oeuvre.ts')
    expect(p).toMatch(motifTexte('create schema if not exists ${schema} authorization ${ROLE_OEUVRES}'))
    expect(p).toMatch(motifTexte("export const ROLE_OEUVRES = 'deribfy_oeuvres'"))
    avant(p, 'await client.query(`set local role ${ROLE_OEUVRES}`)', 'await client.query(o.schemaSql)')
    avant(p, 'await client.query(o.politiquesSql)', 'await client.query(SQL_GARDER_TABLES(schema))')
    avant(p, 'await client.query(SQL_GARDER_TABLES(schema))', "await client.query('commit')")
  })

  it('② la migration d’une retouche pose la garde dans sa transaction', () => {
    const m = lire('src/lib/apps/connexion-migrateur.ts')
    avant(m, 'await client.query(o.sql)', 'await client.query(SQL_GARDER_TABLES(o.schema))')
    avant(m, 'await client.query(SQL_GARDER_TABLES(o.schema))', "await client.query('commit')")
    expect(SQL_GARDER_TABLES('oeuvre_x')).toBe("select public.deribfy_garder_tables('oeuvre_x') as restantes")
  })

  it('③ le fichier de transfert : tout ou rien, sans file d’attente, la garde d’abord', () => {
    const sql = lire('supabase/sql/proprietaire_oeuvres.sql')
    const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    avant(code, 'begin;', "set local lock_timeout = '3s';")
    avant(code, 'if public.deribfy_garder_tables(s.nspname) <> 0 then', "execute format('alter schema %I owner to deribfy_oeuvres', s.nspname);")
    avant(code, 'end $$;', 'commit;')
    expect(code).toMatch(motifTexte("where nspname ~ '^oeuvre_[a-z0-9_]+$' order by nspname"))
    expect(code).toMatch(motifTexte('revoke all on function public.deribfy_garder_tables(text) from public, anon, authenticated;'))
    expect(code).toMatch(motifTexte('grant execute on function public.deribfy_garder_tables(text) to deribfy_oeuvres;'))
    expect(code).toMatch(motifTexte("language plpgsql security definer set search_path = '' as $fn$"))
    // Aucune donnée touchée : des propriétaires et des déclencheurs, rien d'autre.
    // (« before truncate on » est la GARDE, et « garde truncate » un message.)
    expect(code).not.toMatch(/\b(delete\s+from|insert\s+into|update\s+\S+\s+set)\b/iu)
    expect(code).not.toMatch(/(?<!before |garde )\btruncate\s+(?:table\s+)?(?:only\s+)?[%a-z"]/iu)
  })
})
