'use client';
/**
 * LA FENÊTRE « PUBLIER » — une seule, la même dans l'atelier et « Mes projets »
 * (décision du propriétaire, 2026-11-22).
 *
 * Elle remplace les deux boîtes natives du navigateur (la question technique
 * de la lecture publique, puis celle du nom). Elle montre l'adresse (déjà
 * remplie, modifiable tant qu'aucun nom n'est enregistré), une phrase simple
 * par liste lisible sans compte, et deux boutons. Les refus du nom
 * (format, nom déjà pris) s'affichent DANS la fenêtre, qui reste ouverte.
 *
 * Elle ne décide rien : `demande` vient de `lancerPublication` (ou de
 * `changerAdresse`), qui appelle la route et dit s'il faut rester ouvert.
 */
import { useEffect, useRef, useState } from 'react';
import { nomValide } from '@/lib/apps/sous-domaine';
import { phraseListePublique, PHRASE_SI_VOUS_NE_VOULEZ_PAS } from '@/lib/apps/contenu-public';
import type { DemandeFenetre } from '@/components/apps/publierAppli';
import { LIBELLE_MOYEN, type MoyenPublication } from '@/lib/apps/compteur-phrases';
import { PayerMobileMoney } from '@/components/atelier/PayerMobileMoney';

export const PHRASE_APRES_MOBILE_MONEY = 'Le paiement validé sur votre téléphone, l’application se publie seule à cette adresse.';
export const PHRASE_FORMAT_NOM = 'Minuscules, chiffres et tirets, de 3 à 40 signes.';

export function FenetrePublier({ demande, onFermer }: { readonly demande: DemandeFenetre | null; readonly onFermer: () => void }) {
  const [adresse, setAdresse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  // LE MOYEN DE PAIEMENT (2026-11-24) : le premier proposé, changeable ; puis,
  // mobile money choisi, la fenêtre montre son formulaire au lieu de se fermer.
  const [moyen, setMoyen] = useState<MoyenPublication | null>(null);
  const [etape, setEtape] = useState<'adresse' | 'mobile_money'>('adresse');
  const champ = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (demande === null) return;
    // Au tour suivant : pas d'état posé pendant l'effet lui-même.
    const t = window.setTimeout(() => { setAdresse(demande.adresseInitiale); setErreur(null); setEnCours(false); setMoyen(demande.moyens[0] ?? null); setEtape('adresse'); champ.current?.focus(); }, 0);
    return () => { window.clearTimeout(t); };
  }, [demande]);

  if (demande === null) return null;
  const nom = adresse.trim().toLowerCase();
  const formatOk = !demande.adresseModifiable || nom === '' || nomValide(nom);

  const annuler = () => { demande.annuler(); onFermer(); };
  const valider = async () => {
    if (!formatOk || enCours) return;
    setEnCours(true);
    setErreur(null);
    const e = await demande.valider(nom, moyen);
    setEnCours(false);
    if (e === null) onFermer();
    else if (e === 'mobile_money') setEtape('mobile_money');
    else setErreur(e);
  };

  if (etape === 'mobile_money' && demande.mobileMoney !== null) {
    const mm = demande.mobileMoney;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFermer}>
        <div role="dialog" aria-modal="true" aria-labelledby="fenetre-publier-titre"
          className="w-full max-w-md rounded-2xl border border-white/10 bg-bg-deep p-5 text-white shadow-2xl"
          onClick={(e) => { e.stopPropagation(); }}>
          <h2 id="fenetre-publier-titre" className="text-lg font-bold">{demande.titre}</h2>
          <p className="mt-1 text-xs text-white/60">{PHRASE_APRES_MOBILE_MONEY}</p>
          <PayerMobileMoney app={mm.app} jeton={mm.jeton} renouveler={false} onPaye={mm.onPaye} ouvertDOffice />
          <button type="button" onClick={onFermer}
            className="mt-4 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={annuler}>
      <div role="dialog" aria-modal="true" aria-labelledby="fenetre-publier-titre"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-bg-deep p-5 text-white shadow-2xl"
        onClick={(e) => { e.stopPropagation(); }}>
        <h2 id="fenetre-publier-titre" className="text-lg font-bold">{demande.titre}</h2>
        <label htmlFor="fenetre-publier-adresse" className="mt-4 block text-xs text-white/60">Adresse de votre application</label>
        <div className="mt-1 flex items-center rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-[#FA5D1E]/60">
          <input id="fenetre-publier-adresse" ref={champ} value={adresse} readOnly={!demande.adresseModifiable}
            onChange={(e) => { setAdresse(e.target.value); setErreur(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void valider(); if (e.key === 'Escape') annuler(); }}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none read-only:text-white/70"
            autoComplete="off" spellCheck={false} />
          <span className="shrink-0 pr-3 text-sm text-white/50">.deribfy.app</span>
        </div>
        {!formatOk && <p className="mt-1.5 text-xs text-amber-300">{PHRASE_FORMAT_NOM}</p>}
        {erreur !== null && <p role="alert" className="mt-1.5 text-xs text-red-300">{erreur}</p>}
        {demande.listes.length > 0 && (
          <div className="mt-4 space-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-100/90">
            {demande.listes.map((l) => <p key={l.nom}>{phraseListePublique(l)}</p>)}
            <p>{PHRASE_SI_VOUS_NE_VOULEZ_PAS}</p>
          </div>
        )}
        {demande.moyens.length > 1 && (
          <fieldset className="mt-4">
            <legend className="text-xs text-white/60">Moyen de paiement</legend>
            <div className="mt-1.5 space-y-1.5">
              {demande.moyens.map((m) => (
                <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${moyen === m ? 'border-[#FA5D1E]/60 bg-[#FA5D1E]/10' : 'border-white/15 bg-white/[0.03]'}`}>
                  <input type="radio" name="fenetre-publier-moyen" value={m} checked={moyen === m} onChange={() => { setMoyen(m); }} className="accent-[#FA5D1E]" />
                  {LIBELLE_MOYEN[m]}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={annuler}
            className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
            Annuler
          </button>
          <button type="button" disabled={!formatOk || enCours} onClick={() => { void valider(); }}
            className="flex-1 rounded-xl bg-[#FA5D1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FA5D1E]/85 disabled:opacity-40">
            {enCours ? 'Un instant…' : demande.libelleBouton}
          </button>
        </div>
      </div>
    </div>
  );
}
