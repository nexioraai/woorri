'use client';

import { useCallback, useEffect, useState } from 'react';
import EditeurBlocs from './EditeurBlocs'
import { lireBlocs, type Bloc } from '@/app/sites/[slug]/pages/blocs'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================
// LOT 3b -- L'ECRAN DES PAGES D'UN SITE.
//
// ── IL N'ECRIT PAS EN BASE, IL APPELLE LA ROUTE.
//
// `site_pages` ne rend aucun privilege a `authenticated` : ce composant NE
// PEUT PAS ecrire directement, et c'est voulu. Tout passe par
// `/api/sites/<slug>/pages`, ou `requireSiteOwner` est la SEULE porte.
// Ce n'est pas une convention : le navigateur n'a pas le droit.
//
// ── LA SUPPRESSION EST LA DES LE PREMIER JOUR.
//
// GEN-D044, mesure du 2026-11-07 : l'editeur savait ecrire et pas retirer, et
// un client ne pouvait pas defaire ce que le generateur avait invente. On ne
// recommence pas.
//
// ── CE COMPOSANT NE RECOPIE AUCUNE BORNE.
//
// Minuscules, pas de barre initiale, pas de point : c'est la contrainte CHECK
// de la base qui refuse, et la route traduit son code. Recopier la regle ici
// en ferait une SECONDE autorite, qui divergerait le jour ou l'une des deux
// changerait.
// ============================================================

type Page = {
  id: string; chemin: string; parent: string | null; titre: string;
  chapeau: string | null; corps: string | null; blocs?: Bloc[];
  ordre: number; menu: boolean; publie: boolean;
};

export default function EditeurPages({ slug, labels }: {
  slug: string;
  labels: { titre: string; aide: string; ajouter: string; vide: string; supprimer: string; publiee: string; brouillon: string; adresse: string; intitule: string; parent: string; chapeau: string; corps: string; ordre: string; menu: string; chargement: string };
}) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  /**
   * L'EN-TETE `Authorization` EST OBLIGATOIRE, ET CE N'EST PAS UNE
   * PRECAUTION.
   *
   * `require-site-owner.ts` lit un jeton `Bearer`. Un appel sans lui repart
   * en 401 -- et a l'ecran, le proprietaire ne voit pas une erreur, il voit
   * une liste vide et conclut que la fonctionnalite ne marche pas. Ce defaut
   * exact a ete paye en production sur le selecteur de produits d'une page,
   * et le cliquet `appelsAuthentifies.test.ts` existe pour qu'il ne revienne
   * pas. Il vient de m'attraper.
   */
  const entetes = async (extra: Record<string, string> = {}) => {
    const { data } = await supabase.auth.getSession();
    const jeton = data.session?.access_token;
    return jeton ? { ...extra, Authorization: `Bearer ${jeton}` } : extra;
  };

  const charger = useCallback(async () => {
    // LE PREMIER GESTE EST UN `await`, PAS UN `setState`.
    // Appeler `setState` synchroniquement dans le corps d'un effet declenche
    // des rendus en cascade -- la regle React que le lint de ce depot
    // applique, et qui vient de m'attraper.
    try {
      const { data: sess } = await supabase.auth.getSession();
      setErreur(null);
      const jeton = sess.session?.access_token;
      const r = await fetch(`/api/sites/${slug}/pages`, {
        headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
      });
      const j = await r.json();
      if (!r.ok) { setErreur(j.error ?? 'Lecture impossible.'); setPages([]); return; }
      setPages(j.pages ?? []);
    } catch { setErreur('Lecture impossible.'); setPages([]); }
  }, [slug]);

  // L'EFFET N'APPELLE AUCUN `setState` DIRECTEMENT, et il annule proprement.
  //
  // Le lint de ce depot interdit un `setState` synchrone dans le corps d'un
  // effet -- il trace jusque dans la fonction appelee. La forme ci-dessous le
  // satisfait ET corrige un defaut reel que la premiere n'adressait pas :
  // sans le drapeau `vivant`, un composant demonte pendant la requete
  // recevrait encore son `setState`.
  useEffect(() => {
    let vivant = true;
    const id = setTimeout(() => { if (vivant) void charger(); }, 0);
    return () => { vivant = false; clearTimeout(id); };
  }, [charger]);

  /** Toute mutation RECHARGE depuis la base. On n'affiche jamais un etat
   *  local qu'on suppose synchronise : c'est exactement l'ecran qui ment
   *  pendant que la base dit autre chose. */
  const muter = async (init: RequestInit, url = `/api/sites/${slug}/pages`) => {
    setErreur(null);
    try {
      const r = await fetch(url, init);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErreur(j.error ?? 'Échec.'); return false; }
      await charger();
      return true;
    } catch { setErreur('Échec réseau.'); return false; }
  };

  const ajouter = async () => muter({
    method: 'POST',
    headers: await entetes({ 'content-type': 'application/json' }),
    // Un chemin unique par horodatage : l'utilisateur le renomme ensuite.
    // Creer une page « sans adresse » obligerait a gerer un etat invalide.
    body: JSON.stringify({
      chemin: `nouvelle-page-${Date.now()}`, titre: 'Nouvelle page',
      ordre: (pages?.length ?? 0) + 1, menu: true, publie: false,
    }),
  });

  const modifier = async (id: string, champ: string, valeur: unknown) => muter({
    method: 'PATCH',
    headers: await entetes({ 'content-type': 'application/json' }),
    body: JSON.stringify({ id, [champ]: valeur }),
  });

  const supprimer = (p: Page) => {
    // La confirmation NOMME la page. « Êtes-vous sûr ? » ne dit pas ce qu'on
    // s'apprete a perdre.
    if (!confirm(`${labels.supprimer} « ${p.titre} » ?`)) return;
    void (async () => muter({ method: 'DELETE', headers: await entetes() }, `/api/sites/${slug}/pages?id=${encodeURIComponent(p.id)}`))();
  };

  if (pages === null) return <p className="text-white/50 text-sm px-4 py-3">{labels.chargement}</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/50 px-1">{labels.aide}</p>

      {erreur && (
        <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {erreur}
        </p>
      )}

      {pages.length === 0 && <p className="text-white/50 text-sm px-1">{labels.vide}</p>}

      {pages.map((p) => (
        <div key={p.id} className="rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              onClick={() => setOuverte(ouverte === p.id ? null : p.id)}
              className="flex-1 text-left text-white/90 font-medium"
            >
              {p.titre}
              <span className="block text-xs text-white/40 font-normal">/{p.chemin}</span>
            </button>
            <button
              onClick={() => void modifier(p.id, 'publie', !p.publie)}
              title={p.publie ? labels.publiee : labels.brouillon}
              className={`p-2 transition ${p.publie ? 'text-emerald-400' : 'text-white/40'}`}
            >
              {p.publie ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button onClick={() => supprimer(p)} title={labels.supprimer} className="text-red-400 hover:text-red-300 p-2">
              <Trash2 size={16} />
            </button>
          </div>

          {ouverte === p.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              {([
                ['chemin', labels.adresse, p.chemin],
                ['titre', labels.intitule, p.titre],
                ['parent', labels.parent, p.parent ?? ''],
                ['chapeau', labels.chapeau, p.chapeau ?? ''],
              ] as const).map(([champ, lib, val]) => (
                <label key={champ} className="block">
                  <span className="block text-xs text-white/50 mb-1">{lib}</span>
                  <input
                    defaultValue={val}
                    // `onBlur` et non `onChange` : une requete par frappe
                    // ferait echouer la borne de chemin a chaque lettre.
                    onBlur={(e) => { if (e.target.value !== val) void modifier(p.id, champ, e.target.value || null); }}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block text-xs text-white/50 mb-1">{labels.corps}</span>
                <textarea
                  defaultValue={p.corps ?? ''} rows={8}
                  onBlur={(e) => { if (e.target.value !== (p.corps ?? '')) void modifier(p.id, 'corps', e.target.value || null); }}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" defaultChecked={p.menu} onChange={(e) => void modifier(p.id, 'menu', e.target.checked)} />
                  {labels.menu}
                </label>

              {/* LOT 4 — LES BLOCS. Sans cet ecran, le client voit du contenu
                  GENERE qu'il ne peut pas remplacer : c'est GEN-D044. */}
              <div className="mt-3">
                <span className="block text-xs text-white/50 mb-2">Contenu structure de la page</span>
                <EditeurBlocs
                  blocs={lireBlocs(p.blocs)}
                  slug={slug}
                  onChange={(b) => { void modifier(p.id, 'blocs', b as unknown as string); }}
                />
              </div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  {labels.ordre}
                  <input
                    type="number" defaultValue={p.ordre}
                    onBlur={(e) => { const n = Number(e.target.value); if (n !== p.ordre) void modifier(p.id, 'ordre', n); }}
                    className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => void ajouter()}
        className="w-full px-4 py-3 rounded-xl bg-[#FA5D1E]/10 hover:bg-[#FA5D1E]/20 text-[#FA5D1E] font-semibold transition border border-[#FA5D1E]/20 flex items-center justify-center gap-2"
      >
        <Plus size={16} /> {labels.ajouter}
      </button>
    </div>
  );
}
