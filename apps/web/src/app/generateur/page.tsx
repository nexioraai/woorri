'use client';
// ============================================================
// LE GÉNÉRATEUR — UN PRODUIT, PAS UNE FONCTION DE BOUTIQUE.
//
// Premiere version : un bouton dans l'editeur d'une boutique. Le proprietaire
// l'a repris, et il avait raison — le generateur a produit `tontine`, qui
// n'est la boutique de personne. Le faire entrer par la porte d'un commerce le
// reduisait a un gadget de marchand.
//
// Cette page ne demande aucune boutique. Une personne connectee, un nom, et
// l'application part.
// ============================================================
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GenerateurPage() {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [elements, setElements] = useState(6);
  const [enCours, setEnCours] = useState(false);
  const [avis, setAvis] = useState('');

  const generer = async () => {
    setEnCours(true);
    setAvis('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAvis('Connectez-vous pour generer une application.'); return; }
      const res = await fetch('/api/generateur', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nom, description, elements }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAvis(String(d.error ?? 'Construction impossible.'));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application-web.zip';
      a.click();
      URL.revokeObjectURL(url);
      setAvis('Application construite. Le fichier est dans vos telechargements.');
    } catch {
      setAvis('Construction impossible.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A050E] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70">
          ← Tableau de bord
        </Link>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
          Generer une application
        </h1>
        <p className="mt-3 text-white/60 leading-relaxed">
          Decrivez ce que vous voulez. Deribfy construit l&apos;application web et vous
          la remet en un fichier — vous la deposez chez l&apos;hebergeur de votre choix.
          Nous ne publions rien en votre nom.
        </p>

        <div className="mt-10 space-y-6">
          <label className="block">
            <span className="text-sm text-white/70">Nom de l&apos;application</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={60}
              placeholder="Tontine.SY"
              className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FA5D1E]/50"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/70">En une phrase, a quoi sert-elle ?</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder="Le catalogue de mes pieces detachees"
              className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FA5D1E]/50"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/70">
              Combien d&apos;elements environ ? ({elements})
            </span>
            <input
              type="range"
              min={1}
              max={60}
              value={elements}
              onChange={(e) => setElements(Number(e.target.value))}
              className="mt-2 w-full accent-[#FA5D1E]"
            />
          </label>

          <button
            type="button"
            disabled={enCours || nom.trim() === ''}
            onClick={generer}
            className="w-full bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 text-white py-4 rounded-xl font-semibold transition disabled:opacity-40"
          >
            {enCours ? 'Construction…' : 'Generer mon application'}
          </button>

          {avis !== '' && <p className="text-sm text-amber-300/80">{avis}</p>}

          {/* LA RESERVE EST DITE AVANT LE CLIC, pas apres le telechargement. */}
          <div className="text-xs text-white/40 leading-relaxed border-t border-white/10 pt-6">
            <p>
              L&apos;application porte votre nom et votre description. Les elements
              affiches sont des elements d&apos;apercu : le format qui decrit une
              application transporte sa structure, jamais vos donnees.
            </p>
            <p className="mt-2">
              Rien n&apos;est conserve ici pour l&apos;instant — revenez demain et vous ne
              retrouverez pas cette generation. L&apos;historique viendra.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
