'use client';
/**
 * LES BOÎTES NOIRES DES GÉNÉRATIONS (fondateur seul, 2026-11-23).
 *
 * La liste, puis pour chacune la lecture étape par étape, et « Télécharger » :
 * un seul fichier lisible, à transmettre tel quel. La porte est côté SERVEUR
 * (routes /api/admin/boite-noire) : cette page ne montre que ce qu'elles rendent.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Resume = Record<string, number> | null;
type Boite = { id: string; cree_le: string; generation_id: string | null; nature: string; issue: string; tronquee: boolean; taille_octets: number; resume: Resume; nom: string | null };
type Etape = { n: number; quand: string; type: string; titre: string; donnees: unknown };
type Phrase = { phrase: string; verdict: string; etape: string | null; raison: string; methode: string };
type Detail = { id: string; etapes: Etape[]; analyse_phrases: { phrases?: Phrase[]; fiabilite?: string } | null };

const COULEUR: Record<string, string> = { faite: 'text-emerald-300', 'faite en partie': 'text-amber-300', perdue: 'text-red-300', 'indéterminée': 'text-slate-400' };

async function jeton(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function BoiteNoirePage() {
  const [boites, setBoites] = useState<Boite[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    void (async () => {
      const t = await jeton();
      if (t === null) { setErreur('Connectez-vous.'); return; }
      const r = await fetch('/api/admin/boite-noire', { headers: { Authorization: `Bearer ${t}` } });
      const d = (await r.json().catch(() => ({}))) as { boites?: Boite[]; error?: string };
      if (!r.ok) { setErreur(d.error ?? 'Lecture impossible.'); return; }
      setBoites(d.boites ?? []);
    })();
  }, []);

  const ouvrir = async (id: string) => {
    const t = await jeton();
    if (t === null) return;
    const r = await fetch(`/api/admin/boite-noire/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${t}` } });
    const d = (await r.json().catch(() => ({}))) as { boite?: Detail; error?: string };
    if (!r.ok || d.boite === undefined) { setErreur(d.error ?? 'Lecture impossible.'); return; }
    setDetail(d.boite);
  };

  const telecharger = async (id: string) => {
    const t = await jeton();
    if (t === null) return;
    const r = await fetch(`/api/admin/boite-noire/${encodeURIComponent(id)}/telecharger`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) { setErreur('Téléchargement impossible.'); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `boite-noire-${id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-bg-deep px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-white">← Administration</Link>
        <h1 className="mt-2 text-2xl font-bold">Boîtes noires</h1>
        <p className="mt-1 text-sm text-slate-400">Chaque création et chaque modification, étape par étape. Gardées 90 jours. Jamais visibles d’un client.</p>
        {erreur !== null && <p role="alert" className="mt-4 text-sm text-red-300">{erreur}</p>}
        {boites !== null && boites.length === 0 && <p className="mt-6 text-sm text-slate-400">Aucune boîte noire pour l’instant.</p>}
        <ul className="mt-6 space-y-2">
          {(boites ?? []).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <span className="font-semibold">{b.nom ?? '(sans nom)'}</span>
              <span className="text-slate-400">{b.nature} · {b.issue} · {new Date(b.cree_le).toLocaleString('fr-FR')}</span>
              {b.resume !== null && (
                <span className="text-xs text-slate-300">
                  {Object.entries(b.resume).filter(([, n]) => n > 0).map(([s, n]) => `${String(n)} ${s}`).join(' · ')}
                </span>
              )}
              {b.tronquee && <span className="text-xs text-amber-300">coupée</span>}
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => { void ouvrir(b.id); }} className="rounded-lg border border-white/15 px-3 py-1 text-xs hover:bg-white/10">Lire</button>
                <button type="button" onClick={() => { void telecharger(b.id); }} className="rounded-lg bg-[#FA5D1E] px-3 py-1 text-xs font-semibold">Télécharger</button>
              </span>
            </li>
          ))}
        </ul>
        {detail !== null && (
          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">Analyse phrase par phrase</h2>
            {detail.analyse_phrases?.fiabilite !== undefined && <p className="text-xs text-slate-400">{detail.analyse_phrases.fiabilite}</p>}
            <ul className="space-y-2 text-sm">
              {(detail.analyse_phrases?.phrases ?? []).map((p, i) => (
                <li key={i} className="rounded-lg border border-white/10 p-3">
                  <span className={`font-semibold ${COULEUR[p.verdict] ?? ''}`}>[{p.verdict}]</span> {p.phrase}
                  <p className="mt-1 text-xs text-slate-400">{p.etape ?? '—'} · {p.raison}</p>
                </li>
              ))}
            </ul>
            <h2 className="text-lg font-semibold">Les étapes, dans l’ordre</h2>
            {detail.etapes.map((e) => (
              <details key={e.n} className="rounded-lg border border-white/10 p-3">
                <summary className="cursor-pointer text-sm font-semibold">{e.n}. {e.titre}</summary>
                <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-300">{JSON.stringify(e.donnees, null, 2)}</pre>
              </details>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
