/**
 * LES IDENTIFIANTS D'UNE APPLICATION PUBLIÉE — un seul panneau, trois écrans.
 *
 * ── LE DÉFAUT MESURÉ LE 2026-11-04, ET IL ÉTAIT COMPLET.
 *
 * La publication rend `{ compte: { adresse, motDePasse } }`, et le mot de
 * passe n'y figure QU'À LA CRÉATION — republier rend `motDePasse: null`.
 * Les trois écrans qui appellent `/api/generateur/publier` ne lisaient que
 * `d.lien`. Le mot de passe était donc engendré, renvoyé, et jeté dans la
 * même milliseconde.
 *
 * Aucune récupération possible : le domaine des comptes d'œuvre ne reçoit
 * aucun courriel — c'est pour ça qu'ils naissent déjà confirmés. Le seul
 * chemin de retour est « Refaire le mot de passe », et il faut d'abord
 * SAVOIR qu'on en a un à refaire.
 *
 * ── POURQUOI UN COMPOSANT, ET PAS TROIS COPIES.
 *
 * Trois écrans doivent dire exactement la même chose : l'adresse, le mot de
 * passe quand il vient de naître, et qu'il ne se relira pas. Trois copies
 * divergeraient — et la première à divergence serait celle qu'on ne regarde
 * pas.
 *
 * Le panneau de l'atelier existait depuis le 2026-11-03 (bee9d32b, D4 ④).
 * C'est LUI qui est ici, déplacé, pas une réécriture : son bouton de
 * renouvellement reste facultatif, et les deux écrans qui n'en ont pas
 * l'omettent.
 */
'use client';

export type EtatCompteOeuvre = {
  readonly adresse?: string;
  /** Présent SEULEMENT à l'instant où il vient d'être fait. */
  readonly motDePasse?: string | null;
};

export function IdentifiantsOeuvre({
  compte,
  onRenouveler,
  renouvelle = false,
}: {
  readonly compte: EtatCompteOeuvre;
  /** Omis quand l'écran ne propose pas le renouvellement. */
  readonly onRenouveler?: () => void;
  readonly renouvelle?: boolean;
}) {
  const adresse = compte.adresse ?? '';
  if (adresse === '') return null;
  const neuf = compte.motDePasse !== null && compte.motDePasse !== undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <p className="text-[11px] font-semibold text-slate-200">
        Identifiants de l’application publiée
      </p>
      {/* ── À QUOI ILS SERVENT, DIT AVANT DE LES MONTRER.
           Une adresse et un mot de passe sans leur usage ressemblent à une
           fuite. Ce sont les identifiants qui ouvrent les DONNÉES de
           l'application — sans eux, chaque liste y est vide. */}
      <p className="mt-1 text-[10px] leading-relaxed text-white/50">
        C’est avec eux qu’on se connecte dans l’application pour voir et
        saisir ses données.
      </p>
      <p className="mt-1.5 break-all font-mono text-[11px] text-slate-300">{adresse}</p>
      {/* LE MOT DE PASSE N'APPARAÎT QU'À L'INSTANT OÙ IL EST FAIT.
          On ne relit pas un mot de passe — l'écran le dit au lieu de laisser
          chercher où il se trouve. */}
      {neuf ? (
        <>
          <p className="mt-1.5 break-all rounded-lg bg-[#FA5D1E]/[0.12] px-2 py-1.5 font-mono text-[12px] text-white">
            {compte.motDePasse}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-300/80">
            Notez-le maintenant : il ne se relira pas.
          </p>
        </>
      ) : (
        <p className="mt-1 text-[10px] leading-relaxed text-white/40">
          Le mot de passe ne se relit pas. S’il a circulé plus qu’il ne devait,
          ou si vous ne savez plus qui l’a, refaites-le.
        </p>
      )}
      {onRenouveler !== undefined && (
        <button
          type="button"
          disabled={renouvelle}
          onClick={onRenouveler}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          {renouvelle ? 'Renouvellement…' : 'Refaire le mot de passe'}
        </button>
      )}
    </div>
  );
}
