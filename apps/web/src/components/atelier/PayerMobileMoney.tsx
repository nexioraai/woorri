'use client';

/**
 * PAYER L'APPLI PAR MOBILE MONEY — le formulaire maison (2026-11-21, MODE TEST).
 *
 * Il ne connaît PAS le prestataire : il parle à `/api/generateur/mobile-money`,
 * qui rend des opérateurs, un montant et des états normalisés
 * (`lib/payments/mobile-money/types.ts`). Changer de prestataire ne touche
 * pas ce fichier.
 *
 * Le montant vient du serveur (réglage `prix_mensuel_xaf` + les frais de
 * l'opérateur choisi, 2026-11-21) ; le formulaire affiche le détail AVANT le
 * clic, et le total change avec l'opérateur. L'écran ne déclare rien de payé : il suit l'état
 * du prestataire, puis relit le compteur — c'est l'avis signé qui active.
 */
import { useEffect, useRef, useState } from 'react';
import type { Prix } from '@/lib/payments/mobile-money/frais';
import type { ActionClient, EtatEncaissement, Operateur } from '@/lib/payments/mobile-money/types';

/** Un opérateur proposé : toujours avec son prix, ses frais et son total. */
type OperateurTarife = Operateur & Prix;

type Vue = { encaissement: string; etat: EtatEncaissement; montant: number; devise: string; test: boolean; action: ActionClient | null; echec: string | null };

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/gu, ' ')} FCFA`;
const FINAUX: ReadonlySet<EtatEncaissement> = new Set(['reussi', 'echoue', 'expire']);

/**
 * LA PHRASE D'UN ÉTAT, TOUJOURS LA NÔTRE, EN FRANÇAIS (2026-11-21).
 *
 * Mesuré en production par le propriétaire : le message d'attente alternait
 * entre l'anglais du prestataire (« A payment request was sent… ») et notre
 * français, et l'échec affichait le statut brut « failed ». Le texte du
 * prestataire n'est donc JAMAIS affiché ; seul le code USSD de secours l'est
 * (c'est un code à composer, pas une phrase). Et MoneRails le dit : « The
 * payment network gives no finer reason for collections » — on ne prétend
 * donc pas connaître la cause d'un échec. Exportée pour les tests.
 */
export function phraseEtat(v: Pick<Vue, 'etat' | 'echec' | 'action' | 'test'>): string {
  switch (v.etat) {
    // En TEST, l'avis est seulement journalisé (option A) : rien ne s'active,
    // et l'écran ne le promet pas (mesuré à l'essai 3, 2026-11-21).
    case 'reussi': return v.test
      ? 'Paiement de test confirmé. Aucun abonnement n’est activé en mode test.'
      : 'Paiement reçu. L’abonnement s’active dans un instant.';
    case 'echoue': return 'Le paiement n’a pas abouti : l’opérateur ne l’a pas validé. Rien n’a été débité ; vous pouvez réessayer.';
    case 'expire': return 'La demande a expiré sans validation sur le téléphone. Rien n’a été débité ; vous pouvez réessayer.';
    case 'code_requis': return 'Saisissez le code reçu par SMS.';
    case 'en_cours': return 'L’opérateur traite le paiement…';
    default: {
      const ussd = v.action !== null && v.action.type !== 'page' ? v.action.ussd : null;
      return `Validez le paiement sur votre téléphone : saisissez votre code secret dans le message qui s’affiche.${ussd ? ` Si rien n’arrive, composez ${ussd}.` : ''}`;
    }
  }
}

/** Un paiement en attente, gardé dans CE navigateur pour survivre à un rechargement. */
type EnAttente = { readonly encaissement: string; readonly debut: number }
const cleAttente = (app: string) => `deribfy-mobile-money-${app}`
function lireAttente(app: string): EnAttente | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(cleAttente(app)) ?? 'null') as EnAttente | null
    return v !== null && typeof v.encaissement === 'string' && typeof v.debut === 'number' ? v : null
  } catch { return null }
}
function ecrireAttente(app: string, v: EnAttente | null): void {
  try {
    if (v === null) window.localStorage.removeItem(cleAttente(app))
    else window.localStorage.setItem(cleAttente(app), JSON.stringify(v))
  } catch { /* stockage indisponible : le suivi vit seulement dans la page */ }
}

/** « 12 000 FCFA + 1 400 FCFA de frais de paiement mobile money = 13 400 FCFA » */
export function phraseDetail(p: Prix): string {
  return `${fcfa(p.prix)} + ${fcfa(p.frais)} de frais de paiement mobile money = ${fcfa(p.total)}`;
}

/** « en attente depuis 7 min » — la durée vient de l'heure de la demande, jamais d'un délai inventé. */
export function phraseAttente(minutes: number): string {
  return minutes < 1 ? 'Demande envoyée à l’instant.' : `En attente depuis ${String(minutes)} min.`
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
  const [offre, setOffre] = useState<{ operateurs: OperateurTarife[] } | null>(null);
  const [operateur, setOperateur] = useState('');
  const [telephone, setTelephone] = useState('');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [vue, setVue] = useState<Vue | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const suivi = useRef(0);
  // LE PAIEMENT EN ATTENTE SURVIT AU RECHARGEMENT (2026-11-21) : lu au premier
  // rendu (le composant n'existe qu'après le chargement du compteur, côté
  // navigateur), puis le suivi reprend.
  const [attente, setAttente] = useState<EnAttente | null>(() => (typeof window === 'undefined' ? null : lireAttente(app)));
  const [minutes, setMinutes] = useState(0);

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
    // Un opérateur sans total chiffré n'est pas proposé : jamais un montant sans frais.
    const ops = ((r.d.operateurs as OperateurTarife[] | undefined) ?? []).filter((o) => Number.isInteger(o.total) && Number.isInteger(o.frais) && Number.isInteger(o.prix));
    setOffre({ operateurs: ops });
    if (ops.length > 0) setOperateur(ops[0]!.code);
  };

  /** Suit l'encaissement jusqu'à un état final (toutes les 4 s, 10 min au plus). */
  const suivre = async (id: string, debut: number) => {
    const tour = ++suivi.current;
    for (let i = 0; i < 150 && tour === suivi.current; i++) {
      await new Promise((ok) => setTimeout(ok, 4000));
      if (tour !== suivi.current) return;
      setMinutes(Math.floor((Date.now() - debut) / 60_000));
      const r = await appeler('GET', `&encaissement=${encodeURIComponent(id)}`);
      if (r === null || !r.ok) continue;
      const v = r.d as unknown as Vue;
      setVue(v);
      if (FINAUX.has(v.etat)) {
        ecrireAttente(app, null);
        setAttente(null);
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
      if (!FINAUX.has(v.etat)) {
        const a = { encaissement: v.encaissement, debut: Date.now() };
        ecrireAttente(app, a);
        setAttente(a);
        setMinutes(0);
        void suivre(v.encaissement, a.debut);
      }
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

  // Reprise du suivi d'un paiement en attente trouvé au chargement.
  const repris = useRef(false);
  useEffect(() => {
    if (repris.current || attente === null || vue !== null) return;
    repris.current = true;
    void (async () => {
      setOuvert(true);
      const r = await appeler('GET', `&encaissement=${encodeURIComponent(attente.encaissement)}`);
      if (r === null || !r.ok) { ecrireAttente(app, null); setAttente(null); return; }
      const v = r.d as unknown as Vue;
      setVue(v);
      setMinutes(Math.floor((Date.now() - attente.debut) / 60_000));
      if (FINAUX.has(v.etat)) { ecrireAttente(app, null); setAttente(null); }
      else void suivre(attente.encaissement, attente.debut);
    })();
  });

  /**
   * CHANGER DE NUMÉRO : on arrête de suivre et on revient au formulaire.
   * MoneRails n'a PAS d'annulation (aucune route dans son API) : la demande
   * précédente reste en attente chez l'opérateur jusqu'à expirer. Si elle est
   * validée plus tard, son avis arrive quand même (en test : journalisé
   * seulement).
   */
  const changerDeNumero = async () => {
    suivi.current += 1;
    ecrireAttente(app, null);
    setAttente(null);
    setVue(null);
    setCode('');
    if (offre === null) await ouvrir();
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

  const choisi = offre?.operateurs.find((o) => o.code === operateur) ?? null;
  const champ = 'w-full rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500';
  return (
    <div className="mt-2 rounded-xl border border-white/15 p-3 text-xs text-slate-200" aria-live="polite">
      <p className="mb-2 flex items-center justify-between font-semibold text-white">
        {libelle}
        <span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">mode test</span>
      </p>
      {offre === null && avis === null && vue === null && <p className="text-slate-400">Chargement…</p>}
      {offre !== null && vue === null && (
        <form onSubmit={(e) => { e.preventDefault(); void payer(); }} className="space-y-2">
          <p>Un mois d’abonnement : <strong className="text-white">{choisi === null ? 'choisissez un opérateur' : phraseDetail(choisi)}</strong>.</p>
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
          <button type="submit" disabled={envoi || choisi === null}
            className="w-full rounded-lg bg-[#FA5D1E] px-3 py-2 font-semibold text-white disabled:opacity-50">
            {envoi ? 'Envoi…' : choisi === null ? 'Payer' : `Payer ${fcfa(choisi.total)}`}
          </button>
        </form>
      )}
      {vue !== null && (
        <div className="space-y-2">
          <p role="status">{phraseEtat(vue)}</p>
          {!FINAUX.has(vue.etat) && (
            <>
              <p className="text-slate-400">
                {phraseAttente(minutes)}
                {minutes >= 10 ? ' Sans réponse de l’opérateur : la demande peut encore aboutir si vous la validez, sinon changez de numéro.' : ''}
              </p>
              <button type="button" onClick={() => { void changerDeNumero(); }} className="w-full rounded-lg border border-white/15 px-3 py-1.5">
                Changer de numéro
              </button>
            </>
          )}
          {vue.etat === 'code_requis' && (
            <form onSubmit={(e) => { e.preventDefault(); void envoyerCode(); }} className="flex gap-1.5">
              <input value={code} onChange={(e) => setCode(e.target.value)} pattern="[0-9]*" autoComplete="one-time-code" placeholder="Code" className={champ} />
              <button type="submit" disabled={envoi} className="rounded-lg bg-[#FA5D1E] px-3 font-semibold text-white disabled:opacity-50">Valider</button>
            </form>
          )}
          {(vue.etat === 'echoue' || vue.etat === 'expire') && (
            <button type="button" onClick={() => { void changerDeNumero(); }} className="w-full rounded-lg border border-white/15 px-3 py-1.5">Réessayer</button>
          )}
        </div>
      )}
      {avis !== null && <p role="alert" className="mt-2 text-amber-200/90">{avis}</p>}
    </div>
  );
}
