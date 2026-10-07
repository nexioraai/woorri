'use client';
// ============================================================
// LA CONVERSATION « APPLICATION » — DANS L'ACCUEIL, PAS A COTE.
//
// ── POURQUOI CE COMPOSANT EXISTE, ET CE QU'IL REMPLACE.
//
// J'avais construit une PAGE separee, `/generateur`. Personne ne l'avait
// demande, et le proprietaire l'a fait retirer : « je veux pas que les
// utilisateurs cherchent une 2eme interface pour faire leur appli ». Il avait
// raison — Deribfy a UNE entree, l'accueil, et elle marche.
//
// ── CE QUI N'EST PAS PARTAGE, ET POURQUOI.
//
// L'entree est commune : meme ecran, meme pastilles, meme conversation. La
// SORTIE ne l'est pas. Un site, une boutique et un dropshipping sont trois
// facons d'etre un site — meme table, meme editeur, meme vitrine. Une
// application se compile et se livre.
//
// Ce composant ne touche donc NI `siteMode`, NI `/api/chat`, NI la table
// `sites`. Les 48 fichiers qui lisent `site.mode` ne verront jamais passer
// une application, et c'est la garantie que rien de ce qui marche ne casse.
// ============================================================
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Message =
  | { role: 'moi'; texte: string }
  | { role: 'deribfy'; compris: string[]; parIA: boolean; note?: string };

export default function ConversationApplication({ onRetour }: { onRetour: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [travail, setTravail] = useState<'' | 'apercu' | 'archive'>('');
  const [apercu, setApercu] = useState('');
  const [avis, setAvis] = useState('');
  // LE DOCUMENT COMPRIS, GARDE ICI. Sans lui, « voir » et « telecharger »
  // reliraient la phrase et repaieraient un appel chacun — trois pour une
  // seule application, avec le risque que l apercu et l archive different.
  const [document_, setDocument] = useState<unknown>(null);

  const derniere = [...messages].reverse().find((m) => m.role === 'moi');

  const jeton = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  };

  const envoyer = async () => {
    const demande = saisie.trim();
    if (demande === '' || enCours) return;
    setSaisie('');
    setAvis('');
    setMessages((m) => [...m, { role: 'moi', texte: demande }]);
    setEnCours(true);
    try {
      const res = await fetch('/api/generateur/comprendre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande }),
      });
      const d = await res.json();
      if (!res.ok) { setAvis(String(d.error ?? 'Lecture impossible.')); return; }
      setDocument(d.document ?? null);
      setMessages((m) => [
        ...m,
        { role: 'deribfy', compris: d.compris ?? [], parIA: d.parIA === true, note: d.echecIA },
      ]);
    } catch {
      setAvis('Lecture impossible.');
    } finally {
      setEnCours(false);
    }
  };

  /** LA SURVEILLANCE REMONTE A L'ECRAN : une anomalie ne reste pas dans un log. */
  const direAnomalies = (d: { surveillance?: { saine?: boolean; anomalies?: { message: string }[] } }) => {
    const a = d.surveillance?.anomalies ?? [];
    if (a.length > 0) setAvis(a.map((x) => x.message).join(' · '));
  };

  const voir = async () => {
    if (!derniere) return;
    setTravail('apercu');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/apercu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: derniere.texte, document: document_ }),
      });
      const d = await res.json();
      direAnomalies(d);
      if (!res.ok) { setAvis(String(d.error ?? 'Aperçu impossible.')); return; }
      setApercu(String(d.html ?? ''));
    } catch {
      setAvis('Aperçu impossible.');
    } finally {
      setTravail('');
    }
  };

  const telecharger = async () => {
    if (!derniere) return;
    setTravail('archive');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/produire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: derniere.texte, document: document_ }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAvis(String(d.error ?? 'Construction impossible.'));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application.zip';
      a.click();
      URL.revokeObjectURL(url);
      setAvis('Application construite. Le fichier est dans vos téléchargements.');
    } catch {
      setAvis('Construction impossible.');
    } finally {
      setTravail('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        type="button"
        onClick={onRetour}
        className="text-xs text-slate-400 hover:text-white mb-4"
      >
        ← Revenir aux sites et boutiques
      </button>

      {apercu !== '' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Votre application</p>
            <button type="button" onClick={() => setApercu('')} className="text-xs text-slate-400 hover:text-white underline">
              Fermer
            </button>
          </div>
          {/* `sandbox` SANS `allow-same-origin` : l'application tourne, et
              elle ne peut rien lire du site qui l'héberge. */}
          <iframe
            title="Aperçu de l’application"
            srcDoc={apercu}
            sandbox="allow-scripts"
            className="w-full h-[460px] rounded-xl border border-white/10 bg-white"
          />
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Décrivez l’application que vous voulez. Deribfy vous dira d’abord ce qu’il a
          compris — vous corrigez, puis vous générez. Elle sort en version <strong>mobile</strong> et <strong>web</strong>.
        </p>
      )}

      <div className="space-y-4 mb-6">
        {messages.map((m, i) =>
          m.role === 'moi' ? (
            <div key={i} className="flex justify-end">
              <p className="bg-[#FA5D1E]/15 border border-[#FA5D1E]/25 rounded-2xl rounded-br-md px-4 py-3 max-w-[85%] text-slate-100">
                {m.texte}
              </p>
            </div>
          ) : (
            <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <p className="text-xs text-slate-500 mb-2">
                {m.parIA ? 'Voici ce que j’ai compris' : 'Lecture simple — sans IA'}
              </p>
              <ul className="space-y-1.5">
                {m.compris.map((c) => <li key={c} className="text-sm text-slate-200">· {c}</li>)}
              </ul>
              {m.note !== undefined && (
                <p className="mt-3 text-xs text-amber-300/70">Lecture par IA indisponible : {m.note}</p>
              )}
            </div>
          ),
        )}
        {enCours && <p className="text-sm text-slate-500">Lecture…</p>}
        {avis !== '' && <p className="text-sm text-amber-300/80">{avis}</p>}
      </div>

      <div className="flex gap-3">
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void envoyer(); }}
          placeholder="Une application de tontine pour mon quartier…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FA5D1E]/50 text-slate-100"
        />
        <button
          type="button"
          onClick={() => void envoyer()}
          disabled={enCours || saisie.trim() === ''}
          className="bg-white/10 hover:bg-white/15 px-5 rounded-xl font-medium transition disabled:opacity-30 text-slate-100"
        >
          Envoyer
        </button>
      </div>

      {derniere !== undefined && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => void voir()}
            disabled={travail !== ''}
            className="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-semibold transition disabled:opacity-40 text-slate-100"
          >
            {travail === 'apercu' ? 'Assemblage…' : 'Voir l’application'}
          </button>
          <button
            type="button"
            onClick={() => void telecharger()}
            disabled={travail !== ''}
            className="flex-1 bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 py-3 rounded-xl font-semibold transition disabled:opacity-40 text-white"
          >
            {travail === 'archive' ? 'Construction…' : 'Télécharger'}
          </button>
        </div>
      )}
    </div>
  );
}
