// ============================================================================
// LOT 14.3 — ÉCRIRE DANS LE JOURNAL D'AUDIT.
//
// ── LE GESTE N'ÉCHOUE PAS PARCE QUE LE JOURNAL ÉCHOUE.
//
// Décision du 2026-11-10, sans objection du propriétaire : si l'écriture du
// journal rate alors que le geste a réussi, on ne fait pas échouer le geste.
// Sinon la Centrale lirait « échec » sur une qualification qui a bien eu
// lieu, et la referait. Le prix, dit ici : dans ce cas précis, une entrée
// peut MANQUER. On le signale dans les journaux du serveur pour qu'il se
// voie, plutôt que de l'avaler.
//
// ── LE JOURNAL EST IMMUABLE EN BASE (déclencheur `journal_audit_immuable`).
// Ce module ne fait qu'ajouter.
// ============================================================================

export type Entree = {
  siteId: string
  acteur: string | undefined
  viaAdmin?: boolean
  /** `objet.verbe` en minuscules — la base refuse toute autre forme. */
  action: string
  cible: string
  details?: Record<string, unknown>
}

export async function journaliser(e: Entree): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { error } = await supabaseAdmin.from('journal_audit').insert({
      site_id: e.siteId,
      acteur: e.acteur || 'inconnu',
      via_admin: e.viaAdmin === true,
      action: e.action,
      cible: e.cible,
      details: e.details ?? {},
    })
    if (error) console.error('[journal_audit] entrée perdue', e.action, e.cible, error.message)
  } catch (err) {
    console.error('[journal_audit] entrée perdue', e.action, e.cible, err)
  }
}
