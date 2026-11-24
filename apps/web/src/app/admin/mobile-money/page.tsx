'use client';
/**
 * LE JOURNAL DU MOBILE MONEY (fondateur seul, 2026-11-23).
 *
 * Chaque demande, dans l'ordre : ce qui a été demandé, l'avis reçu, la
 * décision et sa raison. Une demande PAYÉE mais refusée chez nous porte le
 * bouton « Activer ce paiement » — la porte est côté SERVEUR
 * (/api/admin/mobile-money/activer) : cette page ne montre que ce qu'elle rend.
 *
 * « Rembourser » (2026-11-23), sur une demande PAYÉE et réelle : le fondateur
 * a DÉJÀ renvoyé l'argent depuis le tableau de bord MoneRails ; il saisit la
 * référence de ce paiement sortant et le montant. Deribfy écrit la ligne
 * « annulation » et coupe le service — il n'envoie AUCUN argent.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Demande = {
  id: string; cree_le: string; app_id: string; operateur: string; telephone_masque: string;
  montant: number; prix: number; frais: number; reference: string | null; test: boolean | null;
  etat: string; avis_recu_le: string | null; decision: string | null; raison: string | null;
  active_par: string | null; active_le: string | null;
  paiement_sortant?: string | null; rembourse_par?: string | null; rembourse_le?: string | null;
};

const COULEUR: Record<string, string> = {
  ouverte: 'text-sky-300', reussie: 'text-emerald-300', echouee: 'text-slate-400', expiree: 'text-slate-400',
  refusee: 'text-red-300', abandonnee: 'text-slate-500', activee_main: 'text-amber-300', remboursee: 'text-violet-300',
};
/** Une demande payée, réelle : elle peut être remboursée. */
const remboursable = (x: Pick<Demande, 'etat' | 'test'>) => (x.etat === 'reussie' || x.etat === 'activee_main') && x.test === false;
const date = (iso: string | null) => (iso === null ? '—' : new Date(iso).toLocaleString('fr-FR'));

async function jeton(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function MobileMoneyAdminPage() {
  const [demandes, setDemandes] = useState<Demande[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void (async () => {
      const t = await jeton();
      if (t === null) { setMessage('Connectez-vous.'); return; }
      const r = await fetch('/api/admin/mobile-money', { headers: { Authorization: `Bearer ${t}` } });
      const d = (await r.json().catch(() => ({}))) as { demandes?: Demande[]; error?: string };
      if (!r.ok) { setMessage(d.error ?? 'Lecture impossible.'); return; }
      setDemandes(d.demandes ?? []);
    })();
  }, [version]);

  const activer = async (x: Demande) => {
    if (!window.confirm(`Activer ce paiement de ${String(x.montant)} FCFA pour l’appli ${x.app_id.slice(0, 8)} ? Le registre gardera votre nom.`)) return;
    const t = await jeton();
    if (t === null) return;
    const r = await fetch('/api/admin/mobile-money/activer', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: x.id }),
    });
    const d = (await r.json().catch(() => ({}))) as { statut?: string; error?: string };
    setMessage(r.ok ? `Paiement activé (${d.statut ?? 'enregistré'}).` : d.error ?? 'Activation impossible.');
    setVersion((v) => v + 1);
  };

  const rembourser = async (x: Demande) => {
    const sortant = window.prompt('Référence du paiement sortant fait dans le tableau de bord MoneRails (l’argent doit déjà être renvoyé) :');
    if (sortant === null || sortant.trim() === '') return;
    const saisi = window.prompt(`Montant renvoyé, en FCFA (au plus ${String(x.montant)}) :`, String(x.montant));
    if (saisi === null) return;
    const montant = Number(saisi.replace(/\s/gu, ''));
    if (!window.confirm(`Inscrire le remboursement de ${String(montant)} FCFA (${sortant.trim()}) ? Si c’est le dernier paiement, l’appli ${x.app_id.slice(0, 8)} est dépubliée.`)) return;
    const t = await jeton();
    if (t === null) return;
    const r = await fetch('/api/admin/mobile-money/rembourser', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: x.id, paiementSortant: sortant.trim(), montant }),
    });
    const d = (await r.json().catch(() => ({}))) as { effet?: string; derniere?: boolean; error?: string };
    setMessage(r.ok ? `Remboursement inscrit (${d.effet ?? 'annule'}${d.derniere === true ? ', appli dépubliée' : ''}).` : d.error ?? 'Remboursement non inscrit.');
    setVersion((v) => v + 1);
  };

  return (
    <main className="min-h-screen bg-bg-deep px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-white">← Administration</Link>
        <h1 className="mt-2 text-2xl font-bold">Mobile money</h1>
        <p className="mt-1 text-sm text-slate-400">Chaque demande, l’avis reçu, la décision et sa raison. Les numéros sont masqués.</p>
        {message !== null && <p role="status" className="mt-4 text-sm text-amber-200">{message}</p>}
        {demandes !== null && demandes.length === 0 && <p className="mt-6 text-sm text-slate-400">Aucune demande pour l’instant.</p>}
        <ul className="mt-6 space-y-2">
          {(demandes ?? []).map((x) => (
            <li key={x.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`font-semibold ${COULEUR[x.etat] ?? ''}`}>{x.etat}</span>
                <span>{String(x.montant)} FCFA <span className="text-slate-400">({String(x.prix)} + {String(x.frais)} de frais)</span></span>
                <span className="text-slate-400">{x.operateur} · {x.telephone_masque} · appli {x.app_id.slice(0, 8)}</span>
                {x.test === true && <span className="rounded bg-sky-500/20 px-2 text-xs text-sky-200">test</span>}
                {x.etat === 'refusee' && x.test === false && (
                  <button type="button" onClick={() => { void activer(x); }} className="ml-auto rounded-lg bg-[#FA5D1E] px-3 py-1 text-xs font-semibold">Activer ce paiement</button>
                )}
                {remboursable(x) && (
                  <button type="button" onClick={() => { void rembourser(x); }} className="ml-auto rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold">Rembourser</button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Demandé le {date(x.cree_le)} · avis le {date(x.avis_recu_le)} · décision : {x.decision ?? '—'}{x.raison === null ? '' : ` — ${x.raison}`}
                {x.active_par !== null && ` · activé à la main par ${x.active_par} le ${date(x.active_le)}`}
                {x.rembourse_par != null && ` · remboursé par ${x.rembourse_par} le ${date(x.rembourse_le ?? null)} (paiement sortant ${x.paiement_sortant ?? '?'})`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
