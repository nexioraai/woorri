// ============================================================================
// DÉPOSER UN FICHIER LOURD DIRECTEMENT DANS LE STOCKAGE — CÔTÉ SERVEUR.
//
// ── LE DÉFAUT MESURÉ (2026-11-17, production). Toute route Vercel coupe un
// envoi au-delà de ~4,4 Mo (413) AVANT notre code — fichiers, documents,
// offres, mon-compte, logo : les cinq mesurées. Les écrans promettaient
// 25 Mo. Une offre de marché scannée dépasse souvent 4 Mo.
//
// ── LA RÉPONSE. Le fichier ne traverse plus la route : elle VÉRIFIE les
// mêmes règles qu'avant, puis délivre une autorisation d'écrire à UN chemin
// qu'elle a choisi (`createSignedUploadUrl`). Le navigateur envoie au
// stockage, qui applique ses bornes (types, 25 Mo). Puis la route CONSTATE
// le fichier — taille et type lus dans le stockage, jamais déclarés par le
// client — avant d'écrire la ligne.
//
// ── CE QUI NE CHANGE PAS. Sous 4 Mo, l'ancien chemin (multipart) reste
// celui qui sert : aucune régression possible pour les envois d'aujourd'hui.
// ============================================================================
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Ce qu'une route lit d'un envoi, qu'il soit multipart (fichier joint) ou
 *  JSON (dépôt direct, en deux étapes). */
export type Envoi = {
  direct: boolean
  champ: (k: string) => string | null
  fichier: File | null
}

export async function lireEnvoi(req: Request): Promise<Envoi | null> {
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    let corps: Record<string, unknown>
    try { corps = await req.json() } catch { return null }
    return { direct: true, fichier: null, champ: (k) => (typeof corps[k] === 'string' ? (corps[k] as string) : null) }
  }
  let form: FormData
  try { form = await req.formData() } catch { return null }
  const f = form.get('fichier')
  return {
    direct: false,
    fichier: f instanceof File ? f : null,
    champ: (k) => (typeof form.get(k) === 'string' ? String(form.get(k)) : null),
  }
}

/** Le chemin reçu est-il bien UN fichier sous le préfixe que la route a
 *  calculé ? Un chemin accepté tel quel permettrait de « constater » le
 *  fichier d'un autre compte. */
export function cheminSous(prefixe: string, chemin: string | null): chemin is string {
  if (!chemin || !chemin.startsWith(prefixe)) return false
  const reste = chemin.slice(prefixe.length)
  return reste.length > 0 && !reste.includes('/') && !reste.includes('..')
}

/** Autorise UN envoi direct à `chemin`. */
export async function autoriserDepot(seau: string, chemin: string, upsert = false) {
  const { data, error } = await supabaseAdmin.storage.from(seau).createSignedUploadUrl(chemin, upsert ? { upsert: true } : undefined)
  if (error || !data) return { erreur: error?.message ?? 'Autorisation refusée.' } as const
  return { chemin, jeton: data.token } as const
}

/** Le fichier est-il ARRIVÉ ? Taille et type tels que le stockage les a
 *  enregistrés. `null` si rien n'est là. */
export async function constaterDepot(seau: string, chemin: string): Promise<{ octets: number; type: string } | null> {
  const i = chemin.lastIndexOf('/')
  const dossier = chemin.slice(0, i); const nom = chemin.slice(i + 1)
  const { data } = await supabaseAdmin.storage.from(seau).list(dossier, { search: nom, limit: 10 })
  const o = (data ?? []).find((x) => x.name === nom && x.id)
  if (!o) return null
  const m = (o.metadata ?? {}) as { size?: number; mimetype?: string }
  return { octets: typeof m.size === 'number' ? m.size : 0, type: m.mimetype ?? 'application/octet-stream' }
}
