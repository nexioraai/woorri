'use client';

/**
 * « PUBLIER DEMANDE L'ABONNEMENT » — LE BOUTON BLOQUÉ A UNE ISSUE (2026-11-20).
 *
 * Décision du propriétaire : un client non exempté ne publie qu'une appli
 * abonnée ; tant que la carte est éteinte, il paie à la main. Le bouton ne le
 * laisse pas sans issue : il dit le prix (réglage `prix_mensuel_xaf`, passé
 * par le serveur, jamais écrit ici) et comment payer, avec un lien WhatsApp.
 *
 * La route `publier` refuse de toute façon (402) : ce composant n'est que la
 * phrase visible AVANT le clic, pas la garde.
 */
import { Lock, MessageCircle } from 'lucide-react';
import { libellePublicationBloquee, LIEN_WHATSAPP_PAIEMENT, phraseCommentPayer } from '@/lib/apps/compteur-phrases';

/**
 * Dans la barre, à la place de « Publier » : « Publier » DÉSACTIVÉ, avec un
 * cadenas. La phrase entière (prix compris) est dans le bandeau sous la barre :
 * mesuré le 2026-11-20, le libellé long dans la barre chevauchait le choix de
 * l'appareil à 1280 px, même sur deux ou trois lignes.
 */
export function PublicationBloquee({ prixMensuelXaf }: { prixMensuelXaf: number | null }) {
  return (
    <button
      type="button"
      disabled
      aria-describedby="payer-publication"
      title={libellePublicationBloquee(prixMensuelXaf)}
      className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-slate-400"
    >
      <Lock size={14} strokeWidth={2} aria-hidden className="shrink-0" />
      Publier
    </button>
  );
}

/**
 * Sous la barre, sur toute la largeur : pourquoi « Publier » est fermé, le
 * prix réglé, et comment payer (lien WhatsApp).
 */
export function CommentPayerPublication({ prixMensuelXaf, moyens }: { prixMensuelXaf: number | null; moyens: readonly string[] }) {
  return (
    <p id="payer-publication" className="shrink-0 border-b border-[#FA5D1E]/30 bg-[#FA5D1E]/[0.08] px-4 py-2 text-xs text-white">
      <span className="font-semibold">{libellePublicationBloquee(prixMensuelXaf)}.</span>{' '}
      <a
        href={LIEN_WHATSAPP_PAIEMENT}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-white/90 underline underline-offset-2 hover:text-white"
      >
        <MessageCircle size={14} strokeWidth={2} aria-hidden className="shrink-0" />
        {phraseCommentPayer(moyens)}
      </a>
    </p>
  );
}
