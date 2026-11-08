// src/app/sites/[slug]/ContactForm.tsx
'use client'

import { useState } from 'react'
import { Send, Check } from 'lucide-react'
import { getDict } from './themes/i18n'

type Props = {
  slug: string
  brand?: string
  lang?: string
  // Optionnel, retro-compatible : les 3 themes existants ne le passent pas
  // et conservent donc exactement le rendu clair actuel (aucun diff visuel).
  // 'dark' n'est utilise que par Noir, dont le fond sombre rendait les
  // champs blancs incoherents avec le reste de la page (meme categorie de
  // probleme que DEBT-008/CatalogSearch, decouvert en verifiant le rendu
  // reel de la section Contact).
  variant?: 'light' | 'dark'
}

export default function ContactForm({ slug, brand = '#111111', lang, variant = 'light' }: Props) {
  const t = getDict(lang)
  const isDark = variant === 'dark'
  const fieldClass = isDark
    ? 'w-full px-5 py-4 rounded-xl border bg-white/[0.04] text-[#F5F3EE] placeholder-white/35 focus:outline-none focus:ring-4 transition-all'
    : 'w-full px-5 py-4 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 transition-all'
  const fieldStyle = isDark
    ? ({ borderColor: 'rgba(245,230,200,0.14)', '--tw-ring-color': `${brand}30` } as React.CSSProperties)
    : undefined
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  // LOT 8 — LA REFERENCE DE LA DEMANDE.
  //
  // Le formulaire disait « envoye » et rien d'autre : le demandeur n'avait
  // RIEN a noter, donc rien a citer en rappelant la Centrale, et la Centrale
  // n'avait rien a chercher. Une trace que personne ne peut designer n'est
  // pas une trace.
  const [reference, setReference] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus('success')
      setReference(typeof data.reference === 'string' ? data.reference : null)
      setName('')
      setEmail('')
      setMessage('')
      // LE RETOUR A L'ETAT INITIAL N'EFFACE PAS LA REFERENCE TANT QU'ELLE
      // EST LA. Quatre secondes ne suffisent pas pour recopier un code a la
      // main : le message de succes part, la reference reste affichee.
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err: unknown) {
      // `unknown`, pas `any` : une erreur attrapee peut etre n'importe quoi,
      // et seul ce test le dit honnetement.
      const messageErreur = err instanceof Error ? err.message : String(err)
      setStatus('error')
      setErrorMsg(messageErreur || 'Failed to send')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`text-xs font-bold uppercase tracking-[0.2em] mb-6 ${isDark ? 'text-white/45' : 'text-neutral-600'}`}>
        {t.form.title}
      </div>

      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.form.name}
        className={fieldClass}
        style={fieldStyle}
      />

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.form.email}
        className={fieldClass}
        style={fieldStyle}
      />

      <textarea
        required
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t.form.message}
        className={`${fieldClass} resize-none`}
        style={fieldStyle}
      />

      <button
        type="submit"
        disabled={status === 'sending' || status === 'success'}
        className="group relative w-full py-4 rounded-xl text-white font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{ backgroundColor: brand }}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span className="relative inline-flex items-center justify-center gap-2">
          {status === 'sending' && t.form.sending}
          {status === 'success' && (
            <>
              <Check className="w-5 h-5" />
              {t.form.sent}
            </>
          )}
          {(status === 'idle' || status === 'error') && (
            <>
              {t.form.send}
              <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </span>
      </button>

      {status === 'success' && !reference && (
        <div className="text-sm text-green-600 px-1 text-center">
          {t.form.sent}
        </div>
      )}

      {/* LOT 8 — LA REFERENCE RESTE A L'ECRAN.
          Elle est selectionnable (`select-all`) pour se copier d'un geste,
          et en chasse fixe pour que O et 0 ne se confondent pas -- meme si
          l'alphabet des references les exclut deja. */}
      {reference && (
        <div className="text-sm px-3 py-3 rounded-xl border border-green-600/30 bg-green-600/10 text-center space-y-1">
          <div className="text-green-700 font-medium">{t.form.sent}</div>
          <div className="opacity-80">{t.form.reference}</div>
          <div className="font-mono text-base font-bold tracking-wider select-all">{reference}</div>
          <div className="text-xs opacity-70">{t.form.referenceAide}</div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-sm text-red-600 px-1">
          {t.form.error} : {errorMsg || '…'}
        </div>
      )}
    </form>
  )
}
