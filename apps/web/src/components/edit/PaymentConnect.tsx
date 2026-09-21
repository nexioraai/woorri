'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/translations';
import { deviseParDefaut } from './productDraft';
import { marcheSansCarte, nettoieNumerosMobileMoney, type NumeroMobileMoney } from '@/lib/whatsappOrder';

const ACCENT = '#FA5D1E';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
}

export default function PaymentConnect({ slug, mode }: { slug: string; mode?: number }) {
  const { t } = useTranslation();
  const isAutomated = mode === 3;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [shipping, setShipping] = useState('0');
  const [savingShip, setSavingShip] = useState(false);
  const [shipMsg, setShipMsg] = useState('');
  // M2-208 — LE MARCHÉ DE LA BOUTIQUE, DÉRIVÉ DE SES PRODUITS (Youssouf :
  // « je ne veux pas voir Stripe dans Edit pour une boutique de vendeur
  // africain — WhatsApp, appel, Mobile Money, pas de Stripe »). Le
  // discriminant est la monnaie dominante du catalogue : XAF/XOF = marché
  // Mobile Money, Stripe n'y a rien à faire. null = pas encore mesuré.
  const [marcheMobile, setMarcheMobile] = useState<boolean | null>(null);
  // M2-210 — LES NUMÉROS D'ENCAISSEMENT DU MARCHAND, ÉDITABLES ICI.
  // Distincts du contact : « tous les marchands n'ont pas le même numéro de
  // contact et de mobile money ». Plusieurs numéros, libellés LIBRES
  // (Airtel Money, Moov Money, autre) : l'acheteur paie sur SON opérateur.
  const [contactActuel, setContactActuel] = useState<Record<string, unknown>>({});
  const [socialActuel, setSocialActuel] = useState<Record<string, unknown>>({});
  const [numeros, setNumeros] = useState<NumeroMobileMoney[]>([]);
  // M2-211 — LE NUMÉRO DE CONTACT, INDÉPENDANT : c'est LUI que portent les
  // boutons WhatsApp et Appel des fiches. Le Mobile Money encaisse ; le
  // contact fait parler. Deux champs, deux usages, au choix du marchand.
  const [numeroContact, setNumeroContact] = useState('');
  const [numSaving, setNumSaving] = useState(false);
  const [numMsg, setNumMsg] = useState('');

  const loadStatus = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/shop/connect/status?slug=${encodeURIComponent(slug)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setConnected(data.connected);
      setReady(data.ready);
      const shipRes = await fetch(`/api/shop/shipping?slug=${encodeURIComponent(slug)}`, { headers });
      const shipData = await shipRes.json();
      if (shipRes.ok) setShipping(String(shipData.shippingFlat ?? 0));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, [slug]);

  // M2-208 — mesurer le marché AVANT de proposer Stripe. Mode 2 seulement :
  // le dropshipping (mode 3) encaisse par carte, quel que soit le pays.
  useEffect(() => {
    if (mode !== 2) { setMarcheMobile(false); return; }
    let annule = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/shop/products?slug=${encodeURIComponent(slug)}`, { headers });
        const data = await res.json();
        if (annule) return;
        const devise = deviseParDefaut(Array.isArray(data.products) ? data.products : []);
        setMarcheMobile(marcheSansCarte(devise));
      } catch {
        if (!annule) setMarcheMobile(false);
      }
    })();
    return () => { annule = true; };
  }, [slug, mode]);

  // M2-210 — charger les numéros existants (lecture RLS côté propriétaire,
  // même canal que l'aperçu). `contact` entier conservé : le PATCH le
  // fusionne, jamais il n'écrase téléphone/email/adresse.
  useEffect(() => {
    let annule = false;
    (async () => {
      const { data } = await supabase.from('sites').select('contact, social_links').eq('slug', slug).maybeSingle();
      if (annule || !data) return;
      const c = (data as { contact?: Record<string, unknown> | null }).contact ?? {};
      const so = (data as { social_links?: Record<string, unknown> | null }).social_links ?? {};
      setContactActuel(c);
      setSocialActuel(so);
      setNumeros(nettoieNumerosMobileMoney((c as { mobile_money?: unknown }).mobile_money));
      // Le champ montre la source EFFECTIVE des boutons : social_links.whatsapp,
      // sinon le téléphone de contact — exactement la règle des fiches.
      setNumeroContact(String((so as { whatsapp?: unknown }).whatsapp ?? (c as { phone?: unknown }).phone ?? ''));
    })();
    return () => { annule = true; };
  }, [slug]);

  const enregistrerNumeros = async () => {
    setNumSaving(true);
    setNumMsg('');
    try {
      const headers = await authHeaders();
      const propres = nettoieNumerosMobileMoney(numeros);
      // FUSION, jamais écrasement : téléphone/email/adresse et les autres
      // réseaux sociaux du marchand restent intacts.
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: { ...contactActuel, mobile_money: propres },
          socialLinks: { ...socialActuel, whatsapp: numeroContact.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setNumeros(propres);
      setContactActuel({ ...contactActuel, mobile_money: propres });
      setSocialActuel({ ...socialActuel, whatsapp: numeroContact.trim() });
      setNumMsg('Numéros enregistrés — visibles immédiatement sur vos fiches produit.');
      setTimeout(() => setNumMsg(''), 4000);
    } catch (e: any) {
      setNumMsg(e.message);
    } finally {
      setNumSaving(false);
    }
  };

  const handleConnect = async () => {
    setBusy(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/shop/connect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const handleSaveShipping = async () => {
    setSavingShip(true);
    setShipMsg('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/shop/shipping', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, shippingFlat: Number(shipping) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setShipMsg(t('pc.rateSaved'));
      setTimeout(() => setShipMsg(''), 3000);
    } catch (e: any) {
      setShipMsg(e.message);
    } finally {
      setSavingShip(false);
    }
  };

  // ============================================================
  // M2-208 — MARCHÉ MOBILE MONEY : STRIPE N'APPARAÎT PAS DU TOUT.
  //
  // « Les vendeurs africains ont WhatsApp, appel, Mobile Money — pas de
  // Stripe dans Edit. » Le panneau dit au marchand comment ses acheteurs
  // paient RÉELLEMENT sur son marché, et où vit son numéro : les fiches
  // produit l'affichent déjà (boutons + numéro), depuis son WhatsApp ou son
  // téléphone de contact. Aucune connexion Stripe n'est proposée ; les
  // marchés carte (EUR, USD, CAD…) gardent le panneau Stripe, inchangé.
  // ============================================================
  if (marcheMobile === true) {
    return (
      <div className="glass glass-hover rounded-3xl p-6 md:p-8 mt-8">
        <h2 className="text-xl font-bold mb-2">Paiements — Mobile Money</h2>
        <p className="text-sm text-white/50 mb-4">
          Votre boutique vend en francs CFA : vos acheteurs paient par
          transfert mobile et vous contactent par WhatsApp ou par appel,
          directement depuis chaque fiche produit.
        </p>
        <ul className="text-sm text-white/70 space-y-2 list-disc pl-5 mb-6">
          <li>L'acheteur envoie le montant par Mobile Money, puis vous
            partage la capture du paiement sur WhatsApp.</li>
          <li>Vous confirmez et vous livrez — aucun intermédiaire ne
            prélève de commission sur vos ventes.</li>
        </ul>

        {/* M2-210 — VOS NUMÉROS D'ENCAISSEMENT. Plusieurs numéros, libellés
            libres : un acheteur paie sur l'opérateur qu'il a. Sans numéro
            saisi ici, vos fiches montrent votre numéro de contact. */}
        <h3 className="text-sm font-bold mb-2">Numéro de contact (WhatsApp & appel)</h3>
        <p className="text-xs text-white/40 mb-3">
          C'est ce numéro que portent les boutons « Commander sur WhatsApp »
          et « Appeler le vendeur » sur vos fiches produit. Il peut être
          différent de vos numéros d'encaissement.
        </p>
        <input
          value={numeroContact}
          onChange={(e) => setNumeroContact(e.target.value)}
          placeholder="+235 …"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 transition mb-6"
        />

        <h3 className="text-sm font-bold mb-2">Numéros Mobile Money</h3>
        <p className="text-xs text-white/40 mb-3">
          Ajoutez un numéro par opérateur (ex. : Airtel Money, Moov Money).
          Ils s'affichent sur chaque fiche produit et au paiement. Si la liste
          est vide, votre numéro de contact est utilisé.
        </p>
        <div className="space-y-2">
          {numeros.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={n.label}
                onChange={(e) => setNumeros(numeros.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Opérateur (ex. : Airtel Money)"
                className="w-2/5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 transition"
              />
              <input
                value={n.number}
                onChange={(e) => setNumeros(numeros.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))}
                placeholder="+235 …"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 transition"
              />
              <button
                onClick={() => setNumeros(numeros.filter((_, j) => j !== i))}
                className="px-3 rounded-xl text-sm text-red-400 border border-red-400/20 hover:bg-red-400/10 transition"
                aria-label="Retirer ce numéro"
              >✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setNumeros([...numeros, { label: '', number: '' }])}
            disabled={numeros.length >= 6}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition disabled:opacity-40"
          >+ Ajouter un numéro</button>
          <button
            onClick={enregistrerNumeros}
            disabled={numSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
          >{numSaving ? 'Enregistrement…' : 'Enregistrer contact & Mobile Money'}</button>
        </div>
        {numMsg && <p className="text-xs mt-2 text-white/60">{numMsg}</p>}
      </div>
    );
  }

  return (
    <div className="glass glass-hover rounded-3xl p-6 md:p-8 mt-8">
      <h2 className="text-xl font-bold mb-2">Paiements</h2>
      <p className="text-sm text-white/50 mb-5">
        {isAutomated ? t('pc.introAutomated') : t('pc.introNormal')}
      </p>

      {loading ? (
        <p className="text-sm text-white/40">Chargement…</p>
      ) : ready ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {t('pc.connected')}
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            {t('pc.onboardingIncomplete')}
          </div>
          <button
            onClick={handleConnect}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
          >
            {busy ? 'Redirection…' : 'Reprendre la configuration'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={busy}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
          style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
        >
          {busy ? t('pc.redirecting') : t('pc.connectStripe')}
        </button>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      {!isAutomated && (
        <div className="mt-8 pt-6 border-t border-white/10">
        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
          {t('pc.shippingLabel')}
        </label>
        <p className="text-sm text-white/50 mb-3">
          {t('pc.shippingHint')}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            className="w-32 bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FA5D1E] transition"
          />
          <button
            onClick={handleSaveShipping}
            disabled={savingShip}
            className="px-5 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
          >
            {savingShip ? '…' : t('pc.save')}
          </button>
          {shipMsg && <span className="text-sm text-white/60">{shipMsg}</span>}
        </div>
      </div>
      )}
    </div>
  );
}
