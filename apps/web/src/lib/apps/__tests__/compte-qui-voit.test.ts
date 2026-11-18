/**
 * LE FILET QUI VOIT (2026-11-18) — l'instantané compte AU TRAVERS de la
 * sécurité par ligne, ou il refuse.
 *
 * Mesuré en production : les tables des œuvres ont `force row level
 * security` ; le migrateur comptait 0 ligne là où pharma en a 4. L'écran
 * disait « rien à conserver », et le contrôle d'après-migration comparait
 * 0 à 0.
 *
 * ① l'instantané passe par `deribfy_compte_oeuvre`, et par lui seul ;
 * ② il range tables et colonnes à leur place ;
 * ③ la fonction absente : il LÈVE — jamais un instantané vide ;
 * ④ cliquet : la route refuse de migrer, et d'écrire, sans instantané ;
 * ⑤ cliquet SQL : la fonction ne rend que des nombres, bornée aux œuvres,
 *   fermée au public.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { prendreInstantane } from '../instantane-migration'
import { PHRASE_COMPTAGE_IMPOSSIBLE } from '../phrase-migration'
import { motifTexte } from './motif-texte'

const S = 'oeuvre_70ba03e1_844a_4575_9562_5e23d88ad5ec'
const RACINE = path.join(__dirname, '../../../..')

describe('le filet qui voit', () => {
  it('① ② la fonction dédiée, seule, et ses nombres rangés', async () => {
    const vues: string[] = []
    const i = await prendreInstantane(async (sql) => {
      vues.push(sql)
      if (sql.includes('deribfy_compte_oeuvre')) {
        return [
          { cible: 'produit', n: '4' },
          { cible: 'produit.nom', n: '4' },
          { cible: 'produit.emplacement', n: '1' },
          { cible: 'client', n: 3 },
        ]
      }
      if (sql.includes('deribfy_compte_utilisateurs')) return [{ n: 2 }]
      throw new Error(`requête inattendue : ${sql}`)
    }, S)
    expect(i.lignes).toEqual({ produit: 4, client: 3 })
    expect(i.remplies).toEqual({ 'produit.nom': 4, 'produit.emplacement': 1 })
    expect(i.comptes).toBe(2)
    // AUCUN count direct : c'est lui qui passait sous la sécurité par ligne.
    expect(vues.filter((v) => /count\(/iu.test(v))).toEqual([])
  })

  it('③ la fonction absente : il lève, il ne rend pas « rien »', async () => {
    await expect(
      prendreInstantane(async (sql) => {
        if (sql.includes('deribfy_compte_oeuvre')) throw new Error('function public.deribfy_compte_oeuvre(unknown) does not exist')
        return [{ n: 0 }]
      }, S),
    ).rejects.toThrow(/deribfy_compte_oeuvre/u)
  })

  it('④ cliquet : sans instantané, la route ne migre pas et n’écrit pas', () => {
    const route = readFileSync(path.join(RACINE, 'src/app/api/generateur/retoucher/route.ts'), 'utf8')
    expect(route).toMatch(motifTexte('if (plan.ajouts.length > 0 && avant === null) {'))
    expect(route).toMatch(motifTexte('if (instantaneAvant === null) {'))
    expect(route.split('PHRASE_COMPTAGE_IMPOSSIBLE').length - 1).toBeGreaterThanOrEqual(3)
    expect(PHRASE_COMPTAGE_IMPOSSIBLE).not.toMatch(motifTexte('rien à conserver'))
  })

  it('⑤ cliquet SQL : des nombres seulement, bornés aux œuvres, fermés au public', () => {
    const sql = readFileSync(path.join(RACINE, 'supabase/sql/compte_oeuvre.sql'), 'utf8')
    expect(sql).toMatch(motifTexte("language plpgsql security definer stable set search_path = '' as $fn$"))
    expect(sql).toMatch(motifTexte('returns table (cible text, n bigint)'))
    expect(sql).toMatch(motifTexte("if p_schema !~ '^oeuvre_[a-z0-9_]+$'"))
    expect(sql).toMatch(motifTexte('revoke all on function public.deribfy_compte_oeuvre(text) from public, anon, authenticated;'))
    expect(sql).toMatch(motifTexte('grant execute on function public.deribfy_compte_oeuvre(text) to deribfy_oeuvres;'))
    // Chaque identifiant passe par %I : aucun nom collé dans le texte.
    expect(sql).not.toMatch(/execute\s+'[^']*'\s*\|\|/iu)
  })
})
