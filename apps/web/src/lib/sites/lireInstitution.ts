import 'server-only'
// LA DÉSIGNATION DU SITE, LUE CÔTÉ SERVEUR (lot 2 « textes neutres », 2026-11-26).
// `sites.designation` (sites_designation.sql) ne passe pas par la vue publique :
// la recréer pour une colonne effacerait en silence ce qui lui a été ajouté
// entre-temps (même raison que les partenaires). Lecture ratée ou colonne
// absente : le nom générique — jamais une page cassée.
import { supabaseAdmin } from '@/lib/supabase-admin'
import { institution, type Institution } from './institution'

export async function lireInstitution(siteId: string, lang: string | null | undefined): Promise<Institution> {
  try {
    const { data, error } = await supabaseAdmin.from('sites').select('designation').eq('id', siteId).maybeSingle()
    const d = error === null ? (data as { designation?: unknown } | null)?.designation : null
    return institution(lang, typeof d === 'string' ? d : null)
  } catch {
    return institution(lang, null)
  }
}
