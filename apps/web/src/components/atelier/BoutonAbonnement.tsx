'use client';

/**
 * LE BOUTON D'ABONNEMENT DE L'ATELIER — EMPLACEMENT ET ÉTAT, RIEN DE BRANCHÉ
 * (2026-11-17).
 *
 * ── POURQUOI RIEN N'EST BRANCHÉ.
 *
 * Décision 3 du propriétaire : un abonnement n'a de sens que s'il lève une
 * limite. Au 2026-11-17, aucune limite n'existe pour la création
 * d'applications : tout compte connecté génère sans plafond, et Deribfy paie
 * (`docs/elite-protocol/GENERATION_OUVERTE_ET_QUOTA.md`). Brancher Stripe
 * avant le quota, ce serait vendre ce que tout le monde a déjà gratuitement.
 *
 * ── CE QU'IL FAIT AUJOURD'HUI.
 *
 * Il ne paraît pas éteint sans raison : comme « Application » sur l'accueil
 * tant qu'elle était fermée, il porte « Bientôt » et, au clic, il le DIT —
 * il n'ouvre rien et n'appelle aucune route.
 *
 * ── CE QUI LE BRANCHERA, LE JOUR VENU.
 *
 * `etat="ouvert"` et un `onAbonner` qui demande au serveur une session de
 * paiement. Ce composant ne connaît ni prix ni clé Stripe : il n'en connaîtra
 * jamais, le prix se décide côté serveur.
 */
import { useState } from 'react';
import { Crown } from 'lucide-react';

export type EtatAbonnement = 'bientot' | 'ouvert';

export function BoutonAbonnement({
  etat = 'bientot',
  onAbonner,
}: {
  etat?: EtatAbonnement;
  onAbonner?: () => void;
}) {
  const [avis, setAvis] = useState(false);
  const ouvert = etat === 'ouvert' && onAbonner !== undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (etat === 'ouvert' && onAbonner !== undefined) { onAbonner(); return; }
          setAvis((v) => !v);
        }}
        aria-describedby={avis && !ouvert ? 'avis-abonnement' : undefined}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
          ouvert
            ? 'border-[#FA5D1E]/60 bg-[#FA5D1E]/[0.12] text-white hover:bg-[#FA5D1E]/[0.2]'
            : 'border-white/10 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300'
        }`}
      >
        <Crown size={14} strokeWidth={2} aria-hidden />
        S’abonner
        {!ouvert && (
          <span className="rounded-full border border-white/15 px-1.5 py-px text-[9px] uppercase tracking-wide text-slate-400">
            Bientôt
          </span>
        )}
      </button>
      {avis && !ouvert && (
        <p
          id="avis-abonnement"
          role="status"
          className="absolute right-0 top-full z-20 mt-1.5 w-60 rounded-xl border border-white/10 bg-[#120A18] px-3 py-2 text-[11px] leading-relaxed text-slate-300 shadow-2xl shadow-black/60"
        >
          L’abonnement n’est pas encore ouvert. Rien ne vous est demandé
          aujourd’hui.
        </p>
      )}
    </div>
  );
}
