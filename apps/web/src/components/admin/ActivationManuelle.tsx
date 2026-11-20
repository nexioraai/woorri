'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Banknote } from 'lucide-react';

// L'ACTIVATION À LA MAIN (étape ④ du quota, 2026-11-19) — le SEUL cas où le
// propriétaire intervient : un client que la carte ne couvre pas (espèces,
// Airtel, Moov). Par carte, l'activation est automatique. Tout est vérifié
// par le serveur (`/api/admin/paiements-manuels`) ; cet écran ne fait que
// chercher, préparer et faire CONFIRMER, avec la date qui en résultera.

type Appli = { id: string; nom: string | null; adresse: string | null; proprietaire: string | null; formule: string; payeJusquAu: string | null };
type Reglages = { prixMensuelXaf: string; dureeJours: string; lotTaille: string };

const jour = (d: Date) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

async function jeton() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

export default function ActivationManuelle() {
  const [q, setQ] = useState('');
  const [applis, setApplis] = useState<Appli[]>([]);
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [choisie, setChoisie] = useState<Appli | null>(null);
  const [objet, setObjet] = useState<'abonnement' | 'lot'>('abonnement');
  const [fournisseur, setFournisseur] = useState<'especes' | 'airtel' | 'moov'>('especes');
  const [reference, setReference] = useState('');
  const [montant, setMontant] = useState('');
  const [aConfirmer, setAConfirmer] = useState(false);
  // La date qui en résultera, calculée AU CLIC (jamais pendant le rendu).
  const [datePrevue, setDatePrevue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const prixVide = reglages !== null && reglages.prixMensuelXaf.trim() === '';
  const prix = reglages === null || prixVide ? null : Number(reglages.prixMensuelXaf);
  const recu = Number(montant);

  const chercher = async () => {
    setBusy(true); setMsg(null); setChoisie(null); setAConfirmer(false);
    try {
      const res = await fetch(`/api/admin/paiements-manuels?q=${encodeURIComponent(q.trim())}`, { headers: { Authorization: `Bearer ${await jeton()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur');
      setApplis(d.applis); setReglages(d.reglages);
      if (d.applis.length === 0) setMsg({ ok: false, text: 'Aucune application trouvée.' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(false); }
  };

  /** La date qui en résultera, dite AVANT de confirmer (même règle que la base). */
  const dateApres = (): string | null => {
    if (choisie === null || reglages === null) return null;
    if (objet === 'lot') return choisie.payeJusquAu === null ? null : jour(new Date(choisie.payeJusquAu));
    const depart = Math.max(Date.now(), choisie.payeJusquAu === null ? 0 : Date.parse(choisie.payeJusquAu));
    return jour(new Date(depart + Number(reglages.dureeJours) * 86_400_000));
  };

  const enregistrer = async () => {
    if (choisie === null) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/paiements-manuels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ appId: choisie.id, objet, fournisseur, reference: reference.trim(), montant: recu }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur');
      setMsg({ ok: true, text: `« ${choisie.adresse ?? choisie.nom} » est payée jusqu’au ${jour(new Date(d.jusquAu))}. Référence ${reference.trim()} enregistrée.` });
      setReference(''); setMontant(''); setAConfirmer(false); setChoisie(null); setApplis([]);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); setAConfirmer(false); }
    finally { setBusy(false); }
  };

  const pret = choisie !== null && !prixVide && reference.trim().length >= 3 && Number.isInteger(recu) && recu > 0 && !busy;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-10 glass">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <Banknote className="w-5 h-5 text-emerald-400" />
        Activer une application payée hors carte
      </h2>
      <p className="text-xs text-white/50 mb-4">Espèces, Airtel ou Moov : la référence est obligatoire. Par carte, l’activation est automatique.</p>

      {prixVide && (
        <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Le prix mensuel en FCFA n’est pas encore réglé : aucune activation n’est possible tant qu’il est vide.
        </p>
      )}

      <div className="flex gap-2 mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nom publié, titre ou adresse du propriétaire"
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
        <button type="button" disabled={busy || q.trim().length < 2} onClick={() => { void chercher(); }}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold disabled:opacity-40">Chercher</button>
      </div>

      {applis.length > 0 && (
        <ul className="mb-4 space-y-1">
          {applis.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => { setChoisie(a); setAConfirmer(false); }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${choisie?.id === a.id ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                <span className="font-semibold">{a.adresse ?? a.nom ?? a.id}</span>
                <span className="text-white/50"> · {a.proprietaire ?? 'propriétaire inconnu'} · {a.formule === 'abonnee' && a.payeJusquAu ? `payée jusqu’au ${jour(new Date(a.payeJusquAu))}` : 'gratuite'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {choisie !== null && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-white/60">Objet
            <select value={objet} onChange={(e) => { setObjet(e.target.value as 'abonnement' | 'lot'); setAConfirmer(false); }} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="abonnement">Abonnement ({reglages?.dureeJours} jours)</option>
              <option value="lot">Lot de {reglages?.lotTaille} modifications</option>
            </select>
          </label>
          <label className="text-xs text-white/60">Moyen de paiement
            <select value={fournisseur} onChange={(e) => setFournisseur(e.target.value as 'especes' | 'airtel' | 'moov')} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="especes">Espèces</option>
              <option value="airtel">Airtel Money</option>
              <option value="moov">Moov Money</option>
            </select>
          </label>
          <label className="text-xs text-white/60">Référence (transaction ou n° du reçu)
            <input value={reference} onChange={(e) => { setReference(e.target.value); setAConfirmer(false); }} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-white/60">Montant reçu (FCFA)
            <input pattern="[0-9]*" value={montant} onChange={(e) => { setMontant(e.target.value.replace(/\D/gu, '')); setAConfirmer(false); }} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </label>
        </div>
      )}

      {choisie !== null && !aConfirmer && (
        <button type="button" disabled={!pret} onClick={() => { setDatePrevue(dateApres()); setAConfirmer(true); }}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Vérifier avant d’activer</button>
      )}

      {/* LA CONFIRMATION EST DESSINÉE, pas `confirm()` : elle dit la date, et l'écart de montant. */}
      {choisie !== null && aConfirmer && (
        <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm">
          <p className="font-semibold">
            {objet === 'abonnement'
              ? `Activer « ${choisie.adresse ?? choisie.nom} » jusqu’au ${datePrevue ?? '…'} ?`
              : `Ajouter un lot de ${reglages?.lotTaille} modifications à « ${choisie.adresse ?? choisie.nom} » ?`}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {fcfa(recu)} reçus en {fournisseur === 'especes' ? 'espèces' : fournisseur === 'airtel' ? 'Airtel Money' : 'Moov Money'} · référence {reference.trim()}
          </p>
          {objet === 'abonnement' && prix !== null && recu !== prix && (
            <p className="mt-1 text-xs text-amber-200">Attention : le prix réglé est {fcfa(prix)}, le montant reçu est {fcfa(recu)}.</p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => { void enregistrer(); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">Confirmer</button>
            <button type="button" disabled={busy} onClick={() => setAConfirmer(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm">Annuler</button>
          </div>
        </div>
      )}

      {msg && <p className={`mt-4 text-sm ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
    </div>
  );
}
