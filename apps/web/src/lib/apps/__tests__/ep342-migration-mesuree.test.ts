/**
 * EP-342 · M3 — CE QU'ON MESURE AUTOUR D'UNE MIGRATION.
 *
 * ── D · LE COMPTAGE DANS LA TRANSACTION ÉTAIT INSUFFISANT ET NUISIBLE.
 *
 * J'avais proposé de compter les lignes DANS la transaction. Les deux
 * reproches étaient justes :
 *
 * · INSUFFISANT — il ne voit AUCUNE perte au niveau colonne. Mesuré sur
 *   la vraie base : un `update … set secret = null` fait passer
 *   `ouverte.secret` de 1 à 0 SANS toucher au nombre de lignes.
 * · NUISIBLE — `strong_migrations` interdit de lire ou remplir dans la
 *   transaction du DDL : les verrous seraient tenus tout du long, sur
 *   une base de production.
 *
 * ── E · VÉRIFIER QU'UNE POLITIQUE EXISTE NE SUFFIT PAS.
 *
 * Lovable a eu exactement cette faille (CVE-2025-48757) : leur scanner
 * vérifiait qu'une politique EXISTE, pas qu'elle REFUSE. 303 points
 * d'accès exposés sur 170 projets.
 *
 * Mesuré sur la vraie base : une table dont la politique dit
 * `for select to anon using (true)` passe tout contrôle de catalogue —
 * RLS activée, RLS forcée, une politique — et rend HTTP 200 à un
 * visiteur anonyme. Seul l'essai réel la voit.
 *
 * ── F · ET LE PIRE N'EST PAS DANS NOTRE SCHÉMA.
 *
 * `auth.users` vit ailleurs : ni la liste blanche ni les déclencheurs
 * d'œuvre ne le couvrent. La ligne qui efface les données d'un client le
 * jour où on supprime son compte est un `on delete cascade` — et mon
 * corps de `create table` la laissait passer tant qu'elle ne portait pas
 * de point.
 */
import { describe, expect, it } from 'vitest'
import { comparerInstantanes, type Instantane } from '../instantane-migration'
import { verifierMigration } from '../migration-sql'

const vide: Instantane = { lignes: {}, remplies: {}, comptes: 0 }

describe('EP-342 · M3, la migration mesurée', () => {
  it('D① UNE PERTE DE LIGNES EST VUE', () => {
    const a: Instantane = { ...vide, lignes: { releve: 2 } }
    const b: Instantane = { ...vide, lignes: { releve: 1 } }
    expect(comparerInstantanes(a, b)[0]).toMatchObject({ avant: 2, apres: 1 })
    expect(comparerInstantanes(a, a), 'une migration sans perte en déclare une').toEqual([])
  })

  it('D② UNE PERTE DE COLONNE EST VUE — SANS BAISSE DE LIGNES', () => {
    // ── L'ANGLE MORT DU COMPTAGE DE LIGNES, MESURÉ SUR LA VRAIE BASE.
    //
    //   update ouverte set secret = null
    //   → lignes : 1 → 1    ·    ouverte.secret : 1 → 0
    //
    // Un contrôle qui ne compte que les lignes est VERT là-dessus.
    const a: Instantane = { lignes: { t: 1 }, remplies: { 't.secret': 1 }, comptes: 7 }
    const b: Instantane = { lignes: { t: 1 }, remplies: { 't.secret': 0 }, comptes: 7 }
    const p = comparerInstantanes(a, b)
    expect(p, 'une valeur effacée sans perte de ligne passe inaperçue').toHaveLength(1)
    expect(p[0]?.quoi).toContain('t.secret')
  })

  it('D③ UNE TABLE QUI DISPARAÎT N’A PAS « BAISSÉ » — elle compte quand même', () => {
    // Elle n'a plus de compteur du tout. L'ignorer en ferait le seul
    // chemin de perte invisible.
    const a: Instantane = { ...vide, lignes: { releve: 2 } }
    expect(comparerInstantanes(a, vide), 'une table disparue ne compte pas').toHaveLength(1)
  })

  it('F① LES COMPTES SONT UN INVARIANT SÉPARÉ', () => {
    // Ils ne vivent pas dans notre schéma : aucune de nos gardes ne les
    // couvre. Mesuré : le migrateur reçoit « permission denied for table
    // users » — son incapacité est la garantie, et la fonction de
    // comptage rend LE NOMBRE sans donner accès à une seule ligne.
    const a: Instantane = { ...vide, comptes: 7 }
    const b: Instantane = { ...vide, comptes: 6 }
    expect(comparerInstantanes(a, b)[0]?.quoi, 'la perte d’un compte passe').toContain('auth.users')
    expect(comparerInstantanes(a, { ...vide, comptes: 8 }), 'un compte de plus alarme').toEqual([])
  })

  it('F② UNE CLÉ ÉTRANGÈRE CASCADANTE NE PEUT PAS S’ÉCRIRE', () => {
    // ── LE TROU, ET IL NE TENAIT QU'À UN POINT.
    //
    // Mon corps de `create table` était un JEU DE CARACTÈRES. Il refusait
    // `references auth.users(id) on delete cascade` à cause du POINT, et
    // laissait passer la même chose sans schéma :
    //
    //     u text references users(id) on delete cascade
    //
    // C'est la ligne qui efface les données d'un client le jour où on
    // supprime son compte. Le corps est maintenant une FORME.
    for (const sql of [
      'create table if not exists t ( id text primary key, u text references users(id) on delete cascade );',
      'create table if not exists t ( id text primary key default gen_random_uuid()::text , u text references users(id) on delete cascade );',
      'create table if not exists t ( id text primary key default gen_random_uuid()::text , u text references autre(id) );',
      'alter table t add constraint f foreign key (u) references users(id) on delete cascade;',
    ]) {
      expect(verifierMigration(sql).ok, `« ${sql.slice(0, 60)}… » est émettable`).toBe(false)
    }
  })

  it('F③ ET LA FORME RÉELLE DU DÉPÔT PASSE TOUJOURS', () => {
    // Une garde étanche qui refuse le cas normal se fait désarmer.
    for (const sql of [
      'create table if not exists releve ( id text primary key default gen_random_uuid()::text , date text , index numeric );',
      'create table if not exists note ( id text primary key default gen_random_uuid()::text , t text unique );',
      'create table if not exists vide ( id text primary key default gen_random_uuid()::text );',
    ]) {
      expect(verifierMigration(sql).ok, `« ${sql.slice(0, 50)}… » est refusé`).toBe(true)
    }
  })
})
