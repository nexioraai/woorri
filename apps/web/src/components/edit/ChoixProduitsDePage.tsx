'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// CHOISIR LES PRODUITS D'UNE PAGE.
//
// ── LE BESOIN, TEL QUE POSÉ PAR LES MARCHANDS.
//
// « Une page par article : page colliers, page chaussures, page t-shirts. »
// Le bouton « Ajouter une page » existait, mais la page créée ne pouvait
// porter qu'un titre, un texte et une image. Le marchand ajoutait la page,
// ne trouvait nulle part où mettre ses colliers, et concluait — à raison —
// que le bouton ne servait à rien.
//
// ── POURQUOI LA SÉLECTION VIT DANS LA PAGE.
//
// L'autre solution était d'étiqueter chaque produit d'une catégorie : elle
// impose UNE catégorie par article et une colonne en base. Or un collier peut
// légitimement figurer sur « Colliers » ET sur « Nouveautés ». La page tient
// donc la liste des identifiants qu'elle montre — aucun produit n'est
// déplacé, aucun n'est exclusif, et la base ne change pas.
//
// ── CE QUI SE VOIT DANS CETTE LISTE.
//
// Les produits NON PUBLIÉS y apparaissent, marqués comme tels. Les masquer
// serait pire : le marchand les chercherait sans les trouver et croirait les
// avoir perdus. On les montre, on dit qu'ils sont en brouillon, et on
// rappelle qu'ils ne s'afficheront pas tant qu'ils ne sont pas publiés.
// ============================================================

type Produit = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
  images?: string[] | null;
  published?: boolean | null;
};

export type ChoixProduitsDePageProps = {
  slug: string;
  /** Identifiants déjà retenus, dans l'ordre choisi par le marchand. */
  valeur: string[];
  onChange: (ids: string[]) => void;
  /** Libellés, fournis par l'appelant qui possède le dictionnaire. */
  labels: {
    titre: string;
    aide: string;
    recherche: string;
    aucun: string;
    vide: string;
    brouillon: string;
    compte: string;
    chargement: string;
    erreur: string;
  };
};

export default function ChoixProduitsDePage({ slug, valeur, onChange, labels }: ChoixProduitsDePageProps) {
  const [produits, setProduits] = useState<Produit[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [filtre, setFiltre] = useState('');

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        // ── LE JETON, ET NON LES COOKIES.
        //
        // DÉFAUT PAYÉ EN PRODUCTION, LE JOUR MÊME : cette liste était demandée
        // avec `credentials: 'include'`, donc sans en-tête `Authorization`.
        // Or `/api/shop/products` lit un jeton `Bearer`
        // (`require-site-owner.ts`) : la requête repartait en 401 et le
        // marchand voyait « Impossible de charger vos produits ».
        //
        // Il a donc créé sa page « Chaussures », n'a trouvé AUCUN produit à
        // cocher, et a conclu que la fonctionnalité ne marchait pas. Elle ne
        // marchait pas. Même calcul que `ProductManager`, seule forme éprouvée.
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/shop/products?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        });
        const data = await res.json();
        if (!vivant) return;
        if (!res.ok) { setErreur(true); return; }
        setProduits(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (vivant) setErreur(true);
      }
    })();
    return () => { vivant = false; };
  }, [slug]);

  const retenus = useMemo(() => new Set(valeur), [valeur]);

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    const tous = produits ?? [];
    if (!q) return tous;
    return tous.filter((p) => (p.name ?? '').toLowerCase().includes(q));
  }, [produits, filtre]);

  const basculer = (id: string) => {
    // L'ORDRE EST CELUI DU CLIC. Le marchand qui range ses colliers attend de
    // les retrouver rangés : un produit ajouté va à la fin, jamais au milieu.
    onChange(retenus.has(id) ? valeur.filter((x) => x !== id) : [...valeur, id]);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">{labels.titre}</label>
        <p className="text-xs text-white/40">{labels.aide}</p>
      </div>

      {erreur && <p className="text-sm text-red-400">{labels.erreur}</p>}
      {!erreur && produits === null && <p className="text-sm text-white/40">{labels.chargement}</p>}

      {produits !== null && produits.length === 0 && (
        <p className="text-sm text-white/40">{labels.aucun}</p>
      )}

      {produits !== null && produits.length > 0 && (
        <>
          <input
            type="text"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder={labels.recherche}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FA5D1E]"
          />

          <p className="text-xs text-[#FA5D1E]">{labels.compte.replace('{n}', String(valeur.length))}</p>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {visibles.length === 0 && <p className="text-sm text-white/30 py-2">{labels.vide}</p>}
            {visibles.map((p) => {
              const choisi = retenus.has(p.id);
              const photo = Array.isArray(p.images) ? p.images[0] : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => basculer(p.id)}
                  aria-pressed={choisi}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition ${
                    choisi
                      ? 'border-[#FA5D1E]/50 bg-[#FA5D1E]/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
                    {photo ? (
                      // `contain` : une vignette qui rogne ne montre pas le produit.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-white/25 text-sm">{(p.name ?? '?').charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white/85 truncate">{p.name}</span>
                    {p.published === false && (
                      <span className="text-[11px] text-amber-300/70">{labels.brouillon}</span>
                    )}
                  </span>
                  <span
                    className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs ${
                      choisi ? 'border-[#FA5D1E] bg-[#FA5D1E] text-white' : 'border-white/20 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
