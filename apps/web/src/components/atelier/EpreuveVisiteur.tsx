'use client';
/**
 * « ÉPROUVER LA PAGE DE SUIVI » — le visiteur frappe, et l'atelier dit ce
 * qu'il a reçu (É1, 2026-11-27). Ne s'affiche que pour une appli PUBLIÉE qui
 * déclare une lecture par clé. Rien n'est écrit ; aucun numéro n'est montré.
 */
import { useEffect, useState } from 'react';

type Table = { table: string; verdict: 'tenue' | 'fuite' | 'non-eprouvee'; phrase: string };

const COULEUR: Record<Table['verdict'], string> = {
  tenue: 'text-emerald-300',
  fuite: 'text-red-300',
  'non-eprouvee': 'text-amber-200',
};
const MOT: Record<Table['verdict'], string> = { tenue: 'Porte tenue', fuite: 'FUITE', 'non-eprouvee': 'Non éprouvée' };

export function EpreuveVisiteur({ id, jeton, publiee }: { id: string; jeton: () => Promise<string | null>; publiee: boolean }) {
  const [applicable, setApplicable] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [tables, setTables] = useState<Table[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!publiee) return;
    let vivant = true;
    void (async () => {
      const t = await jeton();
      if (t === null) return;
      const r = await fetch(`/api/generateur/epreuve-visiteur?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
      const d = (await r?.json().catch(() => ({}))) as { applicable?: boolean } | undefined;
      if (vivant) setApplicable(d?.applicable === true);
    })();
    return () => { vivant = false; };
  }, [id, jeton, publiee]);

  if (!publiee || !applicable) return null;

  const lancer = async () => {
    const t = await jeton();
    if (t === null) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch(`/api/generateur/epreuve-visiteur?id=${encodeURIComponent(id)}&lancer=1`, { headers: { Authorization: `Bearer ${t}` } });
      const d = (await r.json().catch(() => ({}))) as { tables?: Table[]; error?: string };
      if (!r.ok || d.tables === undefined) setErreur(d.error ?? 'L’épreuve n’a pas abouti.');
      else setTables(d.tables);
    } catch {
      setErreur('L’épreuve n’a pas abouti.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mb-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/70">
      <button
        type="button"
        onClick={() => { void lancer(); }}
        disabled={enCours}
        className="font-semibold text-[#FA5D1E] hover:underline disabled:opacity-60"
      >
        {enCours ? 'Épreuve en cours…' : 'Éprouver la page de suivi (comme un visiteur)'}
      </button>
      {erreur !== null && <p className="mt-1 text-red-300">{erreur}</p>}
      {tables?.map((x) => (
        <p key={x.table} className="mt-1 leading-relaxed">
          <span className={`font-semibold ${COULEUR[x.verdict]}`}>{MOT[x.verdict]}</span> — {x.phrase}
        </p>
      ))}
    </div>
  );
}
