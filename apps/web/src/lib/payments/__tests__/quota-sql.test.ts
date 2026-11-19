/**
 * LE SQL DU QUOTA GARDE SES PROTECTIONS (étape ①, 2026-11-19).
 *
 * Le comportement est prouvé sur un Postgres 17 jetable par
 * `scripts/preuve-quota-sql.mjs` (concurrence, doublons, échéances, droits —
 * 29 règles, mutations vérifiées). La gate ne démarre pas de Postgres : ce
 * cliquet relit le FICHIER et rougit si l'une des protections en disparaît.
 *
 * Ce qu'il NE voit PAS : qu'une protection présente fonctionne. C'est le rôle
 * du script de preuve, à rejouer à chaque changement de ce fichier.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

const sql = readFileSync(join(process.cwd(), 'supabase', 'sql', 'quota_modifications.sql'), 'utf8')

describe('quota_modifications.sql', () => {
  it('les quatre tables sont retirées à anon et authenticated', () => {
    expect(sql).toMatch(motifTexte('revoke all on public.quota_reglages, public.quota_reglages_historique,'))
    expect(sql).toMatch(motifTexte('public.app_paiements, public.app_compteurs from anon, authenticated, public;'))
  })

  it('les six fonctions sont retirées à anon et authenticated', () => {
    for (const f of ['quota_ajout_seul', 'quota_reglage_entier', 'regler_quota', 'reserver_modification', 'liberer_modification', 'enregistrer_paiement']) {
      expect(sql, f).toMatch(new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon, authenticated;`, 'u'))
    }
  })

  it('une référence par fournisseur, une seule fois', () => {
    expect(sql).toMatch(motifTexte('constraint app_paiements_reference_unique unique (fournisseur, reference)'))
  })

  it('le registre et l’historique sont en ajout seul', () => {
    expect(sql).toMatch(motifTexte('create trigger app_paiements_ajout_seul before update or delete on public.app_paiements'))
    expect(sql).toMatch(motifTexte('create trigger quota_reglages_historique_ajout_seul before update or delete on public.quota_reglages_historique'))
  })

  it('la réservation est UNE instruction conditionnelle, pas une lecture puis une écriture', () => {
    expect(sql).toMatch(motifTexte('and utilisees < limite + supplement'))
    expect(sql).toMatch(motifTexte('returning limite + supplement - utilisees into v_restantes;'))
  })

  it('le paiement verrouille le compteur avant de chercher la référence', () => {
    const verrou = sql.indexOf('select * into v_compteur from public.app_compteurs where app_id = p_app for update;')
    const recherche = sql.indexOf('select * into v_existant from public.app_paiements')
    expect(verrou).toBeGreaterThan(-1)
    expect(recherche).toBeGreaterThan(verrou)
  })
})

const creations = readFileSync(join(process.cwd(), 'supabase', 'sql', 'quota_creations.sql'), 'utf8')

describe('quota_creations.sql', () => {
  it('la réservation compte et écrit sous un verrou PAR COMPTE', () => {
    expect(creations).toMatch(motifTexte("perform pg_advisory_xact_lock(hashtextextended('creation:' || p_owner::text, 0));"))
  })
  it('une réservation se solde une seule fois', () => {
    expect(creations).toMatch(motifTexte('where id = p_id and owner_id = p_owner and issue is null;'))
  })
  it('table et fonctions retirées à anon et authenticated', () => {
    expect(creations).toMatch(motifTexte('revoke all on public.app_creations_reservees from anon, authenticated, public;'))
    expect(creations).toMatch(motifTexte('revoke all on function public.reserver_creation(uuid) from public, anon, authenticated;'))
    expect(creations).toMatch(motifTexte('revoke all on function public.solder_creation(uuid, uuid, text, uuid) from public, anon, authenticated;'))
  })
})
