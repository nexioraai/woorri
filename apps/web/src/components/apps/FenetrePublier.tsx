'use client';
/**
 * LA FENÊTRE « PUBLIER » — une seule, la même dans l'atelier et « Mes projets »
 * (décision du propriétaire, 2026-11-22 ; refonte visuelle le 2026-11-24).
 *
 * Trois étapes visibles en haut — Adresse › Paiement › Confirmation — et le
 * même comportement qu'avant :
 *   · ADRESSE : déjà remplie (une adresse LIBRE, proposée par le serveur),
 *     modifiable tant qu'aucun nom n'est enregistré, VÉRIFIÉE EN DIRECT (format,
 *     déjà prise) ; une phrase simple par liste lisible sans compte ;
 *   · PAIEMENT : deux grandes cartes, « Carte bancaire » et « Mobile money »
 *     (Airtel ou Moov) — aucun prix à côté du bouton, aucun mot « frais » ;
 *     mobile money choisi : le formulaire, puis l'attente animée ;
 *   · CONFIRMATION : le lien de l'appli et « Ouvrir ».
 * Sur téléphone, la fenêtre monte du bas et prend toute la largeur.
 * Elle passe AU-DESSUS du bandeau des cookies (z-[100]) : mesuré à la capture
 * du 2026-11-24, le bandeau couvrait ses boutons.
 *
 * Elle ne décide rien : `demande` vient de `lancerPublication` (ou de
 * `changerAdresse`), qui appelle la route et dit quoi montrer ensuite.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, CreditCard, ExternalLink, Loader2, Smartphone } from 'lucide-react';
import { nomValide } from '@/lib/apps/sous-domaine';
import { phraseListePublique, PHRASE_SI_VOUS_NE_VOULEZ_PAS } from '@/lib/apps/contenu-public';
import type { DemandeFenetre } from '@/components/apps/publierAppli';
import { LIBELLE_MOYEN, type MoyenPublication } from '@/lib/apps/compteur-phrases';
import { PayerMobileMoney } from '@/components/atelier/PayerMobileMoney';

export const PHRASE_FORMAT_NOM = 'Minuscules, chiffres et tirets, de 3 à 40 signes.';
export const PHRASE_APRES_MOBILE_MONEY = 'Le paiement validé sur votre téléphone, l’application se publie seule à cette adresse.';
export const PHRASE_ADRESSE_LIBRE = 'Adresse disponible';
export const PHRASE_PUBLICATION_EN_COURS = 'Paiement reçu. Publication en cours…';
export const PHRASE_TEST_SANS_PUBLICATION = 'Paiement de test confirmé. En mode test, l’application n’est pas publiée.';
export const PHRASE_PUBLICATION_TARDE = 'Paiement reçu. La publication prend plus de temps que prévu : l’adresse apparaîtra dans « Mes projets ».';
export const TITRE_EN_LIGNE = 'Votre application est en ligne';

/** Le sous-titre de chaque carte de paiement — aucun prix, aucun « frais », aucune marque. */
export const SOUS_TITRE_MOYEN: Readonly<Record<MoyenPublication, string>> = {
  carte: 'Paiement sécurisé en ligne',
  mobile_money: 'Airtel ou Moov',
};
const TITRE_MOYEN: Readonly<Record<MoyenPublication, string>> = { carte: LIBELLE_MOYEN.carte, mobile_money: 'Mobile money' };

type Etape = 'adresse' | 'paiement' | 'confirmation';
type Confirmation =
  | { readonly etat: 'en_ligne'; readonly lien: string; readonly dejaEnLigne: boolean }
  | { readonly etat: 'publication' }
  | { readonly etat: 'test' }
  | { readonly etat: 'tarde' };
type Verif = { readonly pour: string; readonly etat: 'en_cours' | 'libre' | 'prise'; readonly message?: string };

/** Relire l'adresse après un paiement mobile money : toutes les 3 s, 2 minutes au plus. */
const RELECTURE_MS = 3000;
const RELECTURES_MAX = 40;

export function FenetrePublier({ demande, onFermer }: { readonly demande: DemandeFenetre | null; readonly onFermer: () => void }) {
  const [adresse, setAdresse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [moyen, setMoyen] = useState<MoyenPublication | null>(null);
  const [etape, setEtape] = useState<Etape>('adresse');
  const [formulaireMm, setFormulaireMm] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [verif, setVerif] = useState<Verif | null>(null);
  const champ = useRef<HTMLInputElement | null>(null);
  const relecture = useRef(0);

  useEffect(() => {
    if (demande === null) return;
    // Au tour suivant : pas d'état posé pendant l'effet lui-même.
    const t = window.setTimeout(() => {
      setAdresse(demande.adresseInitiale); setErreur(null); setEnCours(false); setMoyen(demande.moyens[0] ?? null);
      setFormulaireMm(false); setConfirmation(null); setVerif(null); relecture.current += 1;
      // Adresse figée et rien à accepter : on commence au paiement.
      setEtape(demande.moyens.length > 0 && !demande.adresseModifiable && demande.listes.length === 0 ? 'paiement' : 'adresse');
      champ.current?.focus();
    }, 0);
    return () => { window.clearTimeout(t); };
  }, [demande]);

  const nom = adresse.trim().toLowerCase();
  const formatOk = demande === null || !demande.adresseModifiable || nom === '' || nomValide(nom);

  // ── LA VÉRIFICATION EN DIRECT (2026-11-24) : 400 ms après la dernière frappe,
  //    la même règle que « Publier ». Le résultat d'une saisie dépassée est jeté.
  const verifier = demande?.adresseModifiable === true ? demande.verifier : null;
  useEffect(() => {
    if (verifier === null || nom === '' || !nomValide(nom)) return;
    let vivant = true;
    const t = window.setTimeout(() => {
      setVerif({ pour: nom, etat: 'en_cours' });
      void verifier(nom).then((m) => {
        if (vivant) setVerif(m === null ? { pour: nom, etat: 'libre' } : { pour: nom, etat: 'prise', message: m });
      });
    }, 400);
    return () => { vivant = false; window.clearTimeout(t); };
  }, [nom, verifier]);
  const verifActuelle = verif !== null && verif.pour === nom ? verif : null;
  const adressePrise = verifActuelle?.etat === 'prise';
  const adresseEnVerification = verifier !== null && nom !== '' && formatOk && verifActuelle === null
    ? true : verifActuelle?.etat === 'en_cours';

  if (demande === null) return null;
  const aPayer = demande.moyens.length > 0;
  const etapes: readonly Etape[] = aPayer ? ['adresse', 'paiement', 'confirmation'] : ['adresse', 'confirmation'];

  const fermer = () => { relecture.current += 1; onFermer(); };
  const annuler = () => { if (confirmation === null && !formulaireMm) demande.annuler(); fermer(); };

  const suivreAdresse = async (test: boolean) => {
    setEtape('confirmation');
    if (test) { setConfirmation({ etat: 'test' }); return; }
    setConfirmation({ etat: 'publication' });
    const tour = ++relecture.current;
    for (let i = 0; i < RELECTURES_MAX && tour === relecture.current; i++) {
      const lien = await demande.mobileMoney?.lireAdresse().catch(() => null) ?? null;
      if (tour !== relecture.current) return;
      if (lien !== null) { setConfirmation({ etat: 'en_ligne', lien, dejaEnLigne: false }); return; }
      await new Promise((ok) => setTimeout(ok, demande.mobileMoney?.relectureMs ?? RELECTURE_MS));
    }
    if (tour === relecture.current) setConfirmation({ etat: 'tarde' });
  };

  const valider = async () => {
    if (!formatOk || enCours || adressePrise) return;
    setEnCours(true);
    setErreur(null);
    const r = await demande.valider(nom, moyen);
    setEnCours(false);
    if (r === null) { fermer(); return; }
    if (r === 'mobile_money') { setFormulaireMm(true); return; }
    if (typeof r === 'object') { setConfirmation({ etat: 'en_ligne', lien: r.lien, dejaEnLigne: r.dejaEnLigne }); setEtape('confirmation'); return; }
    // Un refus du NOM ramène à l'adresse, là où il se corrige.
    setErreur(r);
    if (demande.adresseModifiable && etape === 'paiement' && /adresse|nom|pris/iu.test(r)) setEtape('adresse');
  };

  const continuer = () => {
    if (!formatOk || adressePrise || adresseEnVerification) return;
    setErreur(null);
    if (aPayer) setEtape('paiement');
    else void valider();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={annuler}>
      <div role="dialog" aria-modal="true" aria-labelledby="fenetre-publier-titre"
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-bg-deep text-white shadow-[0_-20px_60px_-20px_rgba(250,93,30,0.25)] sm:max-w-lg sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => { e.stopPropagation(); }}>
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
        <div className="relative overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pb-7 sm:pt-6">
          <h2 id="fenetre-publier-titre" className="text-xl font-bold tracking-tight">{demande.titre}</h2>
          {demande.avecEtapes && <Etapes etapes={etapes} courante={etape} />}

          {etape === 'adresse' && (
            <Apparition cle="adresse">
              <label htmlFor="fenetre-publier-adresse" className="block text-xs font-medium text-white/60">Adresse de votre application</label>
              <div className={`mt-1.5 flex items-center rounded-2xl border bg-white/[0.04] transition focus-within:bg-white/[0.06] ${adressePrise || !formatOk ? 'border-red-400/60' : verifActuelle?.etat === 'libre' ? 'border-emerald-400/50' : 'border-white/15 focus-within:border-accent/60'}`}>
                <input id="fenetre-publier-adresse" ref={champ} value={adresse} readOnly={!demande.adresseModifiable}
                  onChange={(e) => { setAdresse(e.target.value); setErreur(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') continuer(); if (e.key === 'Escape') annuler(); }}
                  aria-invalid={adressePrise || !formatOk}
                  aria-describedby="fenetre-publier-verif"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base text-white outline-none read-only:text-white/70 sm:text-sm"
                  autoComplete="off" spellCheck={false} autoCapitalize="none" />
                <span className="shrink-0 pr-4 text-base text-white/45 sm:text-sm">.deribfy.app</span>
              </div>
              <p id="fenetre-publier-verif" role="status" className="mt-1.5 min-h-[1.25rem] text-xs">
                {!formatOk && <span className="text-red-300">{PHRASE_FORMAT_NOM}</span>}
                {formatOk && adressePrise && <span className="text-red-300">{verifActuelle?.message}</span>}
                {formatOk && verifActuelle?.etat === 'en_cours' && <span className="inline-flex items-center gap-1.5 text-white/50"><Loader2 size={12} className="motion-safe:animate-spin" aria-hidden />Vérification…</span>}
                {formatOk && verifActuelle?.etat === 'libre' && <span className="inline-flex items-center gap-1.5 text-emerald-300"><Check size={13} aria-hidden />{PHRASE_ADRESSE_LIBRE}</span>}
              </p>
              {demande.listes.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-xs leading-relaxed text-amber-100/90">
                  {demande.listes.map((l) => <p key={l.nom}>{phraseListePublique(l)}</p>)}
                  <p>{PHRASE_SI_VOUS_NE_VOULEZ_PAS}</p>
                </div>
              )}
              {erreur !== null && <p role="alert" className="mt-3 text-sm text-red-300">{erreur}</p>}
              <Boutons>
                <BoutonSecondaire onClick={annuler}>Annuler</BoutonSecondaire>
                <BoutonPrincipal disabled={!formatOk || enCours || adressePrise || adresseEnVerification} onClick={continuer}>
                  {enCours ? 'Un instant…' : aPayer ? 'Continuer' : demande.libelleBouton}
                </BoutonPrincipal>
              </Boutons>
            </Apparition>
          )}

          {etape === 'paiement' && !formulaireMm && (
            <Apparition cle="paiement">
              <fieldset>
                <legend className="text-xs font-medium text-white/60">Moyen de paiement</legend>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
                  {demande.moyens.map((m) => (
                    <CarteMoyen key={m} moyen={m} choisi={moyen === m} onChoisir={() => { setMoyen(m); setErreur(null); }} />
                  ))}
                </div>
              </fieldset>
              <p className="mt-3 truncate text-xs text-white/45">{nom === '' ? '' : `${nom}.deribfy.app`}</p>
              {erreur !== null && <p role="alert" className="mt-2 text-sm text-red-300">{erreur}</p>}
              <Boutons>
                {demande.adresseModifiable || demande.listes.length > 0
                  ? <BoutonSecondaire onClick={() => { setErreur(null); setEtape('adresse'); }}><ChevronLeft size={16} aria-hidden />Adresse</BoutonSecondaire>
                  : <BoutonSecondaire onClick={annuler}>Annuler</BoutonSecondaire>}
                <BoutonPrincipal disabled={enCours || moyen === null} onClick={() => { void valider(); }}>
                  {enCours ? 'Un instant…' : demande.libelleBouton}
                </BoutonPrincipal>
              </Boutons>
            </Apparition>
          )}

          {etape === 'paiement' && formulaireMm && demande.mobileMoney !== null && (
            <Apparition cle="mobile-money">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Smartphone size={18} className="text-accent" aria-hidden />Mobile money</p>
              <PayerMobileMoney app={demande.mobileMoney.app} jeton={demande.mobileMoney.jeton} renouveler={false}
                onPaye={demande.mobileMoney.onPaye} onReussi={(test) => { void suivreAdresse(test); }} ouvertDOffice enFenetre />
              <p className="mt-4 text-xs leading-relaxed text-white/45">{PHRASE_APRES_MOBILE_MONEY}</p>
              <Boutons><BoutonSecondaire onClick={fermer}>Fermer</BoutonSecondaire></Boutons>
            </Apparition>
          )}

          {etape === 'confirmation' && confirmation !== null && (
            <Apparition cle="confirmation">
              <EcranConfirmation c={confirmation} />
              <Boutons>
                <BoutonSecondaire onClick={fermer}>Fermer</BoutonSecondaire>
                {confirmation.etat === 'en_ligne' && (
                  <a href={confirmation.lien} target="_blank" rel="noreferrer noopener"
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-base font-semibold text-white shadow-[0_8px_30px_-10px_rgba(250,93,30,0.7)] transition hover:bg-accent/90 sm:text-sm">
                    Ouvrir<ExternalLink size={16} aria-hidden />
                  </a>
                )}
              </Boutons>
            </Apparition>
          )}
        </div>
      </div>
    </div>
  );
}

const LIBELLE_ETAPE: Readonly<Record<Etape, string>> = { adresse: 'Adresse', paiement: 'Paiement', confirmation: 'Confirmation' };

function Etapes({ etapes, courante }: { readonly etapes: readonly Etape[]; readonly courante: Etape }) {
  const rang = etapes.indexOf(courante);
  return (
    <ol className="mt-4 mb-5 flex items-center gap-1.5 text-[11px] font-medium sm:text-xs" aria-label="Étapes">
      {etapes.map((e, i) => {
        const fait = i < rang;
        const ici = i === rang;
        return (
          <li key={e} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={ici ? 'step' : undefined}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors duration-300 ${ici ? 'border-accent bg-accent text-white' : fait ? 'border-accent/60 bg-accent/15 text-accent' : 'border-white/15 text-white/40'}`}>
              {fait ? <Check size={12} aria-hidden /> : i + 1}
            </span>
            <span className={`truncate transition-colors duration-300 ${ici ? 'text-white' : fait ? 'text-white/70' : 'text-white/35'}`}>{LIBELLE_ETAPE[e]}</span>
            {i < etapes.length - 1 && <span aria-hidden className={`mx-1 h-px flex-1 transition-colors duration-300 ${fait ? 'bg-accent/50' : 'bg-white/10'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function CarteMoyen({ moyen, choisi, onChoisir }: { readonly moyen: MoyenPublication; readonly choisi: boolean; readonly onChoisir: () => void }) {
  const Icone = moyen === 'carte' ? CreditCard : Smartphone;
  return (
    <label className={`group relative flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-all duration-200 sm:flex-col sm:items-start sm:gap-3 sm:p-5 ${choisi ? 'border-accent bg-accent/[0.10] shadow-[0_0_0_1px_rgba(250,93,30,0.5),0_12px_40px_-16px_rgba(250,93,30,0.6)]' : 'border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'}`}>
      <input type="radio" name="fenetre-publier-moyen" value={moyen} checked={choisi} onChange={onChoisir} className="sr-only" />
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${choisi ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/70 group-hover:text-white'}`}>
        <Icone size={22} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-white sm:text-[15px]">{TITRE_MOYEN[moyen]}</span>
        <span className="mt-0.5 block text-xs text-white/55">{SOUS_TITRE_MOYEN[moyen]}</span>
      </span>
      <span aria-hidden className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${choisi ? 'border-accent bg-accent text-white' : 'border-white/20'}`}>
        {choisi && <Check size={12} strokeWidth={3} />}
      </span>
    </label>
  );
}

function EcranConfirmation({ c }: { readonly c: Confirmation }) {
  if (c.etat === 'en_ligne') {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/30"><Check size={32} strokeWidth={2.5} aria-hidden /></span>
        <p className="text-lg font-semibold">{TITRE_EN_LIGNE}</p>
        {c.dejaEnLigne && <p className="text-xs text-white/55">Elle l’était déjà : son adresse reste la même.</p>}
        <a href={c.lien} target="_blank" rel="noreferrer noopener" className="max-w-full truncate rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#FFB08F] underline-offset-2 hover:underline">{c.lien}</a>
      </div>
    );
  }
  const texte = c.etat === 'publication' ? PHRASE_PUBLICATION_EN_COURS : c.etat === 'test' ? PHRASE_TEST_SANS_PUBLICATION : PHRASE_PUBLICATION_TARDE;
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
      {c.etat === 'publication'
        ? <Loader2 size={32} className="text-accent motion-safe:animate-spin" aria-hidden />
        : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/70"><Check size={26} aria-hidden /></span>}
      <p className="text-sm text-white/80">{texte}</p>
    </div>
  );
}

/** Chaque étape entre en fondu, légèrement montée — rien si l'on préfère moins de mouvement. */
function Apparition({ cle, children }: { readonly cle: string; readonly children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => { setVisible(true); }, 10);
    return () => { window.clearTimeout(t); };
  }, []);
  return (
    <div key={cle} data-etape={cle} className={`transition-all duration-300 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'}`}>
      {children}
    </div>
  );
}

function Boutons({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">{children}</div>;
}

function BoutonSecondaire({ onClick, children }: { readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-white/[0.07] px-4 py-3.5 text-base font-semibold text-white/85 transition hover:bg-white/[0.12] sm:text-sm">
      {children}
    </button>
  );
}

function BoutonPrincipal({ onClick, disabled, children }: { readonly onClick: () => void; readonly disabled: boolean; readonly children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-base font-semibold text-white shadow-[0_8px_30px_-10px_rgba(250,93,30,0.7)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:text-sm">
      {children}
    </button>
  );
}
