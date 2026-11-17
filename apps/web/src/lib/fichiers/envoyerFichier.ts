// ============================================================================
// ENVOYER UN FICHIER — CÔTÉ NAVIGATEUR (voir `depotDirect.ts`).
//
// Jusqu'à 4 Mo : un seul envoi, comme avant. Au-delà : la route autorise,
// le navigateur envoie DIRECTEMENT au stockage, la route constate. Pour
// l'écran appelant, la réponse a la même forme dans les deux cas.
// ============================================================================
import { supabase } from '@/lib/supabase'
import { TAILLE_MAX_OCTETS } from './verifierFichier'

/** Au-delà, l'hébergeur coupe l'envoi (mesuré : 4 Mo passe, 4,4 Mo non). */
export const SEUIL_DIRECT = 4 * 1024 * 1024 - 64 * 1024

export type Reponse = { ok: boolean; status: number; corps: Record<string, unknown> }

const lire = async (r: Response): Promise<Reponse> =>
  ({ ok: r.ok, status: r.status, corps: await r.json().catch(() => ({})) })

export async function envoyerFichier(o: {
  url: string; seau: string; jeton: string | undefined | null; fichier: File; champs?: Record<string, string>
}): Promise<Reponse> {
  const auth: Record<string, string> = o.jeton ? { Authorization: `Bearer ${o.jeton}` } : {}
  const champs = o.champs ?? {}
  if (o.fichier.size > TAILLE_MAX_OCTETS) {
    return { ok: false, status: 413, corps: { error: `Fichier trop lourd (${(o.fichier.size / 1048576).toFixed(1)} Mo). La limite est de 25 Mo.` } }
  }
  if (o.fichier.size <= SEUIL_DIRECT) {
    const form = new FormData()
    for (const [k, v] of Object.entries(champs)) form.append(k, v)
    form.append('fichier', o.fichier)
    return lire(await fetch(o.url, { method: 'POST', headers: auth, body: form }))
  }
  const json = { ...auth, 'content-type': 'application/json' }
  const prep = await lire(await fetch(o.url, { method: 'POST', headers: json, body: JSON.stringify({ ...champs, etape: 'preparer', nomFichier: o.fichier.name }) }))
  if (!prep.ok) return prep
  const chemin = String(prep.corps.chemin ?? ''); const jeton = String(prep.corps.jeton ?? '')
  const { error } = await supabase.storage.from(o.seau).uploadToSignedUrl(chemin, jeton, o.fichier, { contentType: o.fichier.type || undefined })
  if (error) {
    const m = error.message.toLowerCase()
    return { ok: false, status: 400, corps: { error:
      m.includes('mime') || m.includes('type') ? 'Ce type de fichier n’est pas accepté.'
        : m.includes('size') || m.includes('large') || m.includes('exceeded') ? 'Fichier trop lourd. La limite est de 25 Mo.'
          : 'Envoi interrompu. Vérifiez la connexion et réessayez.' } }
  }
  return lire(await fetch(o.url, { method: 'POST', headers: json, body: JSON.stringify({ ...champs, etape: 'confirmer', nomFichier: o.fichier.name, chemin }) }))
}
