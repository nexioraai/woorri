'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import FilMessages from './FilMessages'
import type { MotsFil } from './FilMessages'
import type { Message } from '@/lib/commandes/messages'

// LE FIL DU CLIENT (CPA, 2026-11-19) : la route `mes-messages` rend SON fil
// et rien d'autre ; l'écran n'a qu'à le montrer.
export default function MesMessages({ slug, accent, mots }: { slug: string; accent: string; mots: MotsFil }) {
  const api = `/api/sites/${encodeURIComponent(slug)}/mes-messages`
  const charger = useCallback(async () => {
    const j = (await supabase.auth.getSession()).data.session?.access_token
    if (!j) return null
    const r = await fetch(api, { headers: { Authorization: `Bearer ${j}` }, cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    return { messages: (d.messages ?? []) as Message[], ouvert: d.ouvert !== false }
  }, [api])
  const envoyer = useCallback(async (texte: string) => {
    const j = (await supabase.auth.getSession()).data.session?.access_token
    const r = await fetch(api, { method: 'POST', headers: { Authorization: `Bearer ${j ?? ''}`, 'content-type': 'application/json' }, body: JSON.stringify({ texte }) })
    if (r.ok) return null
    const d = await r.json().catch(() => ({}))
    return typeof d.error === 'string' ? d.error : 'Envoi impossible.'
  }, [api])
  return <FilMessages charger={charger} envoyer={envoyer} moi="client" accent={accent} mots={mots} />
}
