'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { poserCookieApercu } from '@/lib/poserApercu';

// ============================================================================
// L'APERÇU N'EST PLUS UNE COPIE — 2026-11-15.
//
// LE DÉFAUT MESURÉ. Cette page rendait le thème DANS LE NAVIGATEUR, sans
// aucune sous-page. Depuis les LOT 18 et 21 (2026-11-10), le menu mène à de
// vraies pages `/sites/<slug>/…` : sur un site non publié, chaque entrée
// tombait sur un 404 (Goura Doula, 2026-11-15). La copie mentait aussi
// autrement : ni menu déclaré, ni partenaires, ni hero vitrine.
//
// LA RÈGLE. Cette adresse ne rend plus rien elle-même : elle pose le cookie
// d'aperçu (propriétaire ou administrateur, src/lib/apercu.ts) puis ouvre
// le VRAI site, `/sites/<slug>`, servi par le même rendu que pour le public.
// ============================================================================

export default function PreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    poserCookieApercu(slug).then((r) => {
      if (!vivant) return;
      if (r.ok) { window.location.replace(r.adresse); return; }
      if (r.statut === 401) { router.push('/login'); return; }
      setErreur(r.erreur);
    });
    return () => { vivant = false; };
  }, [slug, router]);

  if (!erreur) {
    return (
      <div className="min-h-screen nexiora-bg flex items-center justify-center">
        <div className="text-white/40 text-lg">Ouverture de l&apos;aperçu…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen nexiora-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-white/70 text-lg">Aperçu indisponible.</p>
      <p className="text-white/40 text-sm">{erreur}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition"
      >
        ← Retour au tableau de bord
      </button>
    </div>
  );
}
