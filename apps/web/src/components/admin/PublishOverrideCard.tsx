'use client';
// ============================================================
// M2-212 — MISE EN LIGNE HORS STRIPE (paiement comptant), CÔTÉ ADMIN.
//
// « Mes utilisateurs au Tchad n'ont pas de carte de crédit — ils me paient
// en comptant. » Cette carte publie ou retire un site SANS Stripe : elle
// appelle /api/admin/site-publish-override, qui n'accepte que ADMIN_EMAILS
// et journalise chaque geste avec son motif — le motif EST le reçu de
// l'encaissement comptant (« payé comptant le 21/09, reçu n°… »).
//
// Les clients Stripe, eux, ne passent JAMAIS par ici : leur publication
// reste pilotée par le webhook, strictement inchangée.
// ============================================================
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BadgeCheck } from 'lucide-react';

export default function PublishOverrideCard() {
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const agir = async (publish: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/site-publish-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ slug: slug.trim(), publish, reason: reason.trim() }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Erreur');
      setMsg({
        ok: true,
        text: publish
          ? `« ${slug.trim()} » est EN LIGNE (paiement hors ligne, journalisé).`
          : `« ${slug.trim()} » est retiré de la ligne (journalisé).`,
      });
      setReason('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const pret = slug.trim().length > 0 && reason.trim().length >= 5 && !busy;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-10 glass">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-emerald-400" />
        Mise en ligne hors Stripe (paiement comptant)
      </h2>
      <p className="text-sm text-white/50 mb-4">
        Pour les clients qui paient en espèces : publie leur site sans
        abonnement Stripe. Chaque geste est journalisé avec le motif —
        écris-y la référence de l&apos;encaissement (date, reçu).
      </p>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug du site (ex. : alloufshop-17899…)"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif — ex. : payé comptant le 21/09, reçu n°12"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => agir(true)}
          disabled={!pret}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 hover:bg-emerald-500/25"
        >
          {busy ? '…' : 'Mettre EN LIGNE'}
        </button>
        <button
          onClick={() => agir(false)}
          disabled={!pret}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 bg-red-500/10 text-red-300 border border-red-400/20 hover:bg-red-500/20"
        >
          {busy ? '…' : 'Retirer de la ligne'}
        </button>
      </div>
      {msg && (
        <p className={`text-sm mt-3 ${msg.ok ? 'text-emerald-300' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </div>
  );
}
