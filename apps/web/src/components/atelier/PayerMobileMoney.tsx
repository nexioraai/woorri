'use client';

/**
 * PAYER L'APPLI PAR MOBILE MONEY — le formulaire maison (2026-11-21, MODE TEST).
 *
 * Il ne connaît PAS le prestataire : il parle à `/api/generateur/mobile-money`,
 * qui rend des opérateurs, un montant et des états normalisés
 * (`lib/payments/mobile-money/types.ts`). Changer de prestataire ne touche
 * pas ce fichier.
 *
 * Le montant vient du serveur (réglage `prix_mensuel_xaf`) ; le formulaire
 * l'affiche AVANT le clic. L'écran ne déclare rien de payé : il suit l'état
 * du prestataire, puis relit le compteur — c'est l'avis signé qui active.
 */
import { useRef, useState } from 'react';
import type { ActionClient, EtatEncaissement, Operateur } from '@/lib/payments/mobile-money/types';

type Vue = { encaissement: string; etat: EtatEncaissement; montant: number; devise: string; test: boolean; action: ActionClient | null; echec: string | null };

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/gu, ' ')} FCFA`;
const FINAUX: ReadonlySet<EtatEncaissement> = new Set(['reussi', 'echoue', 'expire']);

/** La phrase d'un état, pour le client. Exportée pour les tests. */
export function phraseEtat(v: Pick<Vue, 'etat' | 'echec' | 'action'>): string {
  switch (v.etat) {
    case 'reussi': return 'Paiement reçu. L’abonnement s’active dans un instant.';
    case 'echoue': return `Le paiement a échoué${v.echec ? ` : ${v.echec}` : ''}. Rien n’a été débité ; vous pouvez réessayer.`;
    case 'expire': return 'La demande a expiré sans validation. Rien n’a été débité ; vous pouvez réessayer.';
    case 'code_requis': return v.action?.type === 'code' && v.action.message ? v.action.message : 'Saisissez le code reçu par SMS.';
    default:
      if (v.action?.type === 'approuver') {
        return `${v.action.message ?? 'Validez le paiement sur votre téléphone avec votre code secret.'}${v.action.ussd ? ` Si rien n’arrive, composez ${v.action.ussd}.` : ''}`;
      }
      return 'Validez le paiement sur votre téléphone.';
  }
}

export function PayerMobileMoney({
  app,
  jeton,
  renouveler,
  onPaye,
}: {
  app: string;
  jeton: () => Promise<string | null>;
  /** Abonnée (même échue) : « Renouveler ». Gratuite : « S'abonner ». */
  renouveler: boolean;
  onPaye: () => Promise<unknown>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [offre, setOffre] = useState<{ montant: number | null; operateurs: Operateur[] } | null>(null);
  const [operateur, setOperateur] = useState('');
  const [telephone, setTelephone] = useState('');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [vue, setVue] = useState<Vue | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const suivi = useRef(0);

  const appeler = async (methode: 'GET' | 'POST', requete: string, corps?: unknown) => {
    const t = await jeton();
    if (t === null) return null;
    const res = await fetch(`/api/generateur/mobile-money?id=${encodeURIComponent(app)}${requete}`, {
      method: methode,
      headers: { Authorization: `Bearer ${t}`, ...(corps === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, d };
  };

  const ouvrir = async () => {
    setOuvert(true);
    setAvis(null);
    const r = await appeler('GET', '');
    if (r === null) return;
    if (!r.ok) { setAvis(String(r.d.error ?? 'Le paiement mobile money ne répond pas.')); return; }
    const ops = (r.d.operateurs as Operateur[] | undefined) ?? [];
    setOffre({ montant: typeof r.d.montant === 'number' ? r.d.montant : null, operateurs: ops });
    if (ops.length > 0) setOperateur(ops[0]!.code);
  };

  /** Suit l'encaissement jusqu'à un état final (toutes les 4 s, 10 min au plus). */
  const suivre = async (id: string) => {
    const tour = ++suivi.current;
    for (let i = 0; i < 150 && tour === suivi.current; i++) {
      await new Promise((ok) => setTimeout(ok, 4000));
      const r = await appeler('GET', `&encaissement=${encodeURIComponent(id)}`);
      if (r === null || !r.ok) continue;
      const v = r.d as unknown as Vue;
      setVue(v);
      if (FINAUX.has(v.etat)) {
        if (v.etat === 'reussi') {
          // L'avis signé active : on relit le compteur quelques fois.
          for (let j = 0; j < 8; j++) { await onPaye(); await new Promise((ok) => setTimeout(ok, 3000)); }
        }
        return;
      }
    }
  };

  const payer = async () => {
    setEnvoi(true);
    setAvis(null);
    try {
      const r = await appeler('POST', '', { operateur, telephone, nom });
      if (r === null) return;
      if (!r.ok) { setAvis(String(r.d.error ?? 'Le paiement n’a pas pu s’ouvrir.')); return; }
      const v = r.d as unknown as Vue;
      setVue(v);
      if (v.action?.type === 'page') window.open(v.action.url, '_blank', 'noopener');
      if (!FINAUX.has(v.etat)) void suivre(v.encaissement);
    } finally { setEnvoi(false); }
  };

  const envoyerCode = async () => {
    if (vue === null) return;
    setEnvoi(true);
    try {
      const r = await appeler('POST', `&encaissement=${encodeURIComponent(vue.encaissement)}`, { code });
      if (r === null) return;
      if (!r.ok) { setAvis(String(r.d.error ?? 'Le code n’a pas été accepté.')); return; }
      setVue(r.d as unknown as Vue);
    } finally { setEnvoi(false); }
  };

  const libelle = renouveler ? 'Renouveler — mobile money' : 'S’abonner — mobile money';
  if (!ouvert) {
    return (
      <button type="button" onClick={() => { void ouvrir(); }}
        className="mt-2 w-full rounded-xl border border-[#FA5D1E]/60 px-3 py-2 text-xs font-semibold text-[#FA5D1E] transition hover:bg-[#FA5D1E]/10">
        {libelle}
      </button>
    );
  }

  const champ = 'w-full rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500';
  return (
    <div className="mt-2 rounded-xl border border-white/15 p-3 text-xs text-slate-200" aria-live="polite">
      <p className="mb-2 flex items-center justify-between font-semibold text-white">
        {libelle}
        <span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">mode test</span>
      </p>
      {offre === null && avis === null && <p className="text-slate-400">Chargement…</p>}
      {offre !== null && vue === null && (
        <form onSubmit={(e) => { e.preventDefault(); void payer(); }} className="space-y-2">
          <p>Montant à payer : <strong className="text-white">{offre.montant === null ? 'prix non réglé' : fcfa(offre.montant)}</strong> pour un mois.</p>
          <label className="block">Opérateur
            <select value={operateur} onChange={(e) => setOperateur(e.target.value)} className={`${champ} mt-1`} required>
              {offre.operateurs.map((o) => <option key={o.code} value={o.code}>{o.nom}</option>)}
            </select>
          </label>
          <label className="block">Numéro mobile money
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} type="tel" autoComplete="tel" placeholder="+235 66 00 00 00" className={`${champ} mt-1`} required />
          </label>
          <label className="block">Nom du titulaire
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" className={`${champ} mt-1`} required minLength={2} maxLength={80} />
          </label>
          <button type="submit" disabled={envoi || offre.montant === null || offre.operateurs.length === 0}
            className="w-full rounded-lg bg-[#FA5D1E] px-3 py-2 font-semibold text-white disabled:opacity-50">
            {envoi ? 'Envoi…' : offre.montant === null ? 'Payer' : `Payer ${fcfa(offre.montant)}`}
          </button>
        </form>
      )}
      {vue !== null && (
        <div className="space-y-2">
          <p role="status">{phraseEtat(vue)}</p>
          {vue.etat === 'code_requis' && (
            <form onSubmit={(e) => { e.preventDefault(); void envoyerCode(); }} className="flex gap-1.5">
              <input value={code} onChange={(e) => setCode(e.target.value)} pattern="[0-9]*" autoComplete="one-time-code" placeholder="Code" className={champ} />
              <button type="submit" disabled={envoi} className="rounded-lg bg-[#FA5D1E] px-3 font-semibold text-white disabled:opacity-50">Valider</button>
            </form>
          )}
          {(vue.etat === 'echoue' || vue.etat === 'expire') && (
            <button type="button" onClick={() => { setVue(null); setCode(''); }} className="w-full rounded-lg border border-white/15 px-3 py-1.5">Réessayer</button>
          )}
        </div>
      )}
      {avis !== null && <p role="alert" className="mt-2 text-amber-200/90">{avis}</p>}
    </div>
  );
}
