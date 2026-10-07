'use client';
// ============================================================
// LE GENERATEUR — UNE CONVERSATION, PAS UN FORMULAIRE.
//
// ── CE QUI A ETE EFFACE AVANT D'ECRIRE CECI.
//
// Premiere version : un bouton dans l'editeur d'une BOUTIQUE. Deuxieme : une
// page avec trois champs — nom, phrase, curseur. Le proprietaire a fait
// retirer les deux, et la recherche lui a donne raison : Lovable, Bolt, v0 et
// Replit partent TOUS d'une conversation. Aucun ne demande de remplir des
// cases, aucun ne livre une archive sans rien montrer.
//
// ── LES DEUX TEMPS, ET POURQUOI ILS SONT SEPARES.
//
// On decrit. Deribfy repond CE QU'IL A COMPRIS. Alors seulement on genere.
// Fondre les deux reviendrait a produire avant d'avoir ete corrige — et
// l'utilisateur decouvrirait sa demande en lisant le resultat.
//
// ── CE QUI MANQUE ENCORE, ET QUI EST DIT A L'ECRAN.
//
// L'apercu vivant. Chez Bolt, l'application apparait a cote de la
// conversation. Ici elle se telecharge. Combler cet ecart demande un chemin de
// build — c'est une decision d'architecture et de cout, pas un oubli.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Message =
  | { role: 'moi'; texte: string }
  | { role: 'deribfy'; compris: string[]; parIA: boolean; note?: string };

export default function GenerateurPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [construction, setConstruction] = useState(false);
  const [avis, setAvis] = useState('');
  const [apercu, setApercu] = useState('');
  const [apercuEnCours, setApercuEnCours] = useState(false);
  const bas = useRef<HTMLDivElement>(null);

  // La derniere demande comprise — c'est elle qu'on produit.
  const derniereDemande = [...messages].reverse().find((m) => m.role === 'moi');

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // ── L APERCU : l application a l ecran, sans telechargement.
  //
  // Le paquet est assemble EN MEMOIRE cote serveur et rendu en une page
  // autonome, posee dans un cadre isole. Ce qui s affiche est la VRAIE
  // application montee par son vrai runtime — pas une maquette.
  const voir = async () => {
    if (!derniereDemande) return;
    setApercuEnCours(true);
    setAvis('');
    try {
      const res = await fetch('/api/generateur/apercu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: derniereDemande.texte }),
      });
      const d = await res.json();
      if (!res.ok) { setAvis(String(d.error ?? 'Apercu impossible.')); return; }
      setApercu(String(d.html ?? ''));
    } catch {
      setAvis('Apercu impossible.');
    } finally {
      setApercuEnCours(false);
    }
  };

  const produire = async () => {
    if (!derniereDemande) return;
    setConstruction(true);
    setAvis('');
    try {
      const res = await fetch('/api/generateur/produire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: derniereDemande.texte }),
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
      setAvis('Application construite. Le fichier est dans vos telechargements.');
    } catch {
      setAvis('Construction impossible.');
    } finally {
      setConstruction(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A050E] text-white flex flex-col">
      <header className="px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70">
          ← Tableau de bord
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Générateur d&apos;applications</h1>
      </header>

      {apercu !== '' && (
        <div className="border-b border-white/10 bg-black/40">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40">Votre application</p>
              <button
                type="button"
                onClick={() => setApercu('')}
                className="text-xs text-white/40 hover:text-white/70 underline"
              >
                Fermer l’aperçu
              </button>
            </div>
            {/* `sandbox` SANS `allow-same-origin` : l application tourne, et
                elle ne peut rien lire du site qui l heberge. */}
            <iframe
              title="Aperçu de l’application"
              srcDoc={apercu}
              sandbox="allow-scripts"
              className="w-full h-[520px] rounded-xl border border-white/10 bg-white"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-white/50 leading-relaxed">
              <p className="text-white/80">Dites ce que vous voulez construire.</p>
              <p className="mt-3 text-sm">
                Par exemple : «&nbsp;une application de tontine pour mon quartier, avec les
                membres et l&apos;ordre de passage&nbsp;».
              </p>
              <p className="mt-6 text-xs border-t border-white/10 pt-4">
                Deribfy vous dira d&apos;abord ce qu&apos;il a compris. Vous corrigez, puis
                vous générez.
              </p>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'moi' ? (
              <div key={i} className="flex justify-end">
                <p className="bg-[#FA5D1E]/15 border border-[#FA5D1E]/25 rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                  {m.texte}
                </p>
              </div>
            ) : (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%]">
                <p className="text-xs text-white/40 mb-2">
                  {m.parIA ? 'Voici ce que j’ai compris' : 'Lecture simple — sans IA'}
                </p>
                <ul className="space-y-1.5">
                  {m.compris.map((c) => (
                    <li key={c} className="text-sm text-white/80">· {c}</li>
                  ))}
                </ul>
                {m.note !== undefined && (
                  <p className="mt-3 text-xs text-amber-300/70">Lecture par IA indisponible : {m.note}</p>
                )}
              </div>
            ),
          )}

          {enCours && <p className="text-sm text-white/40">Lecture…</p>}
          {avis !== '' && <p className="text-sm text-amber-300/80">{avis}</p>}
          <div ref={bas} />
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void envoyer(); }}
              placeholder="Une application de tontine pour mon quartier…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FA5D1E]/50"
            />
            <button
              type="button"
              onClick={() => void envoyer()}
              disabled={enCours || saisie.trim() === ''}
              className="bg-white/10 hover:bg-white/15 px-5 rounded-xl font-medium transition disabled:opacity-30"
            >
              Envoyer
            </button>
          </div>

          {derniereDemande !== undefined && (
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => void voir()}
                disabled={apercuEnCours}
                className="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-semibold transition disabled:opacity-40"
              >
                {apercuEnCours ? 'Assemblage…' : 'Voir l’application'}
              </button>
              <button
                type="button"
                onClick={() => void produire()}
                disabled={construction}
                className="flex-1 bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 py-3 rounded-xl font-semibold transition disabled:opacity-40"
              >
                {construction ? 'Construction…' : 'Télécharger'}
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-white/35 leading-relaxed">
            L&apos;aperçu monte la vraie application dans un cadre isolé. Les éléments
            affichés sont des éléments d&apos;aperçu : le format qui décrit une
            application transporte sa structure, jamais vos données.
          </p>
        </div>
      </div>
    </main>
  );
}
