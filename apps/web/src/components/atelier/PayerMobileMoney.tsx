'use client';

/**
 * PAYER L'APPLI PAR MOBILE MONEY — le formulaire maison (2026-11-21, MODE TEST).
 *
 * Il ne connaît PAS le prestataire : il parle à `/api/generateur/mobile-money`,
 * qui rend des opérateurs, un montant et des états normalisés
 * (`lib/payments/mobile-money/types.ts`). Changer de prestataire ne touche
 * pas ce fichier.
 *
 * UN SEUL PRIX (2026-11-23) : le serveur rend UN montant, le même pour tout
 * opérateur ; l'écran l'affiche tel quel — jamais le mot « frais », jamais
 * un pourcentage, jamais une différence entre opérateurs. Le badge « mode
 * test » suit le mode que le serveur dit (lot L3). L'écran ne déclare rien de payé : il suit l'état
 * du prestataire, puis relit le compteur — c'est l'avis signé qui active.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ActionClient, EtatEncaissement, Operateur } from '@/lib/payments/mobile-money/types';

/** Ce que le serveur propose : UN montant, des opérateurs sans prix propre. */
type Offre = { readonly montant: number; readonly test: boolean; readonly operateurs: Operateur[] };

type Vue = { encaissement: string; etat: EtatEncaissement; montant: number; devise: string; test: boolean; action: ActionClient | null; echec: string | null };

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/gu, ' ')} FCFA`;
const FINAUX: ReadonlySet<EtatEncaissement> = new Set(['reussi', 'echoue', 'expire']);

/**
 * LA PHRASE D'UN ÉTAT, TOUJOURS LA NÔTRE, EN FRANÇAIS (2026-11-21).
 *
 * Mesuré en production par le propriétaire : le message d'attente alternait
 * entre l'anglais du prestataire (« A payment request was sent… ») et notre
 * français, et l'échec affichait le statut brut « failed ». Le texte du
 * prestataire n'est donc JAMAIS affiché ; seul le code USSD de secours l'est
 * (c'est un code à composer, pas une phrase). Et MoneRails le dit : « The
 * payment network gives no finer reason for collections » — on ne prétend
 * donc pas connaître la cause d'un échec. Exportée pour les tests.
 */
export function phraseEtat(v: Pick<Vue, 'etat' | 'echec' | 'action' | 'test'>): string {
  switch (v.etat) {
    // En TEST, l'avis est seulement journalisé (option A) : rien ne s'active,
    // et l'écran ne le promet pas (mesuré à l'essai 3, 2026-11-21).
    case 'reussi': return v.test
      ? 'Paiement de test confirmé. Aucun abonnement n’est activé en mode test.'
      : 'Paiement reçu. L’abonnement s’active dans un instant.';
    case 'echoue': return 'Le paiement n’a pas abouti : l’opérateur ne l’a pas validé. Rien n’a été débité ; vous pouvez réessayer.';
    case 'expire': return 'La demande a expiré sans validation sur le téléphone. Rien n’a été débité ; vous pouvez réessayer.';
    case 'code_requis': return 'Saisissez le code reçu par SMS.';
    case 'en_cours': return 'L’opérateur traite le paiement…';
    default: {
      const ussd = v.action !== null && v.action.type !== 'page' ? v.action.ussd : null;
      return `Validez le paiement sur votre téléphone : saisissez votre code secret dans le message qui s’affiche.${ussd ? ` Si rien n’arrive, composez ${ussd}.` : ''}`;
    }
  }
}

/** Un paiement en attente, gardé dans CE navigateur pour survivre à un rechargement. */
type EnAttente = { readonly encaissement: string; readonly debut: number }
const cleAttente = (app: string) => `deribfy-mobile-money-${app}`
function lireAttente(app: string): EnAttente | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(cleAttente(app)) ?? 'null') as EnAttente | null
    return v !== null && typeof v.encaissement === 'string' && typeof v.debut === 'number' ? v : null
  } catch { return null }
}
function ecrireAttente(app: string, v: EnAttente | null): void {
  try {
    if (v === null) window.localStorage.removeItem(cleAttente(app))
    else window.localStorage.setItem(cleAttente(app), JSON.stringify(v))
  } catch { /* stockage indisponible : le suivi vit seulement dans la page */ }
}

/** Au-delà, l'appel est abandonné et l'écran le dit (2026-11-25). */
export const DELAI_APPEL_MS = 20_000;
export const PHRASE_SANS_REPONSE = 'Le paiement mobile money ne répond pas. Vérifiez votre connexion, puis réessayez.';
export const LIBELLE_REESSAYER = 'Réessayer';

/** L'indicatif fixe affiché devant le numéro, dans la fenêtre (Tchad). */
export const INDICATIF = '+235';
/** Le nom est EXIGÉ par MoneRails (`customer.name`, 2 à 80 caractères) — mesuré
 *  le 2026-11-26 avec la clé de test : sans lui, 400 pour Airtel comme pour Moov. */
export const AIDE_NOM_TITULAIRE = 'Le nom du compte Airtel ou Moov qui paie';

/** Le titre de l'écran d'attente, dans la fenêtre « Publier » (2026-11-24). */
export const TITRE_ATTENTE = 'Validez le paiement sur votre téléphone';

/**
 * Sous le titre de l'attente, la phrase SANS le titre répété (« Validez le
 * paiement… : saisissez… » → « Saisissez… ») — mesuré à la capture du 2026-11-24.
 */
export function sansTitreAttente(phrase: string): string {
  const prefixe = `${TITRE_ATTENTE} : `;
  if (!phrase.startsWith(prefixe)) return phrase;
  const reste = phrase.slice(prefixe.length);
  return reste.charAt(0).toUpperCase() + reste.slice(1);
}

/** « Un mois d'abonnement : 14 000 FCFA. » — un seul montant, rien d'autre. */
export function phrasePrix(montant: number): string {
  return `Un mois d’abonnement : ${fcfa(montant)}.`;
}

/** Une seule demande ouverte par appli (2026-11-21) : le serveur refuse la suivante avant 10 minutes. */
export const PHRASE_UNE_DEMANDE = 'Pas reçu de message ? Vous pourrez réessayer dans 10 minutes.';

/** « en attente depuis 7 min » — la durée vient de l'heure de la demande, jamais d'un délai inventé. */
export function phraseAttente(minutes: number): string {
  return minutes < 1 ? 'Demande envoyée à l’instant.' : `En attente depuis ${String(minutes)} min.`
}

export function PayerMobileMoney({
  app,
  jeton,
  renouveler,
  onPaye,
  ouvertDOffice = false,
  enFenetre = false,
  onReussi,
  onEnvoye,
  objet = 'abonnement',
  phraseDuPrix = phrasePrix,
  adresseApi,
}: {
  app: string;
  jeton: () => Promise<string | null>;
  /** Abonnée (même échue) : « Renouveler ». Gratuite : « S'abonner ». */
  renouveler: boolean;
  onPaye: () => Promise<unknown>;
  /** Dans la fenêtre « Publier » (2026-11-24) : le formulaire s'ouvre seul, sans bouton intermédiaire. */
  ouvertDOffice?: boolean;
  /** Dans la fenêtre « Publier » (2026-11-24) : grands champs, écran d'attente animé, sans en-tête propre. */
  enFenetre?: boolean;
  /** Appelé UNE fois quand le paiement aboutit (`test` : un paiement de test n'active rien). */
  onReussi?: (test: boolean) => void;
  /** Une demande est partie (`true`) ou abandonnée pour un autre numéro (`false`) : la fenêtre masque alors « ‹ Moyen de paiement ». */
  onEnvoye?: (parti: boolean) => void;
  /** Ce que l'on paie : un mois d'abonnement (défaut) ou un lot de modifications (2026-11-24). */
  objet?: 'abonnement' | 'lot';
  /** La phrase du prix, au-dessus du formulaire (« Un lot de 50 modifications : 3 500 FCFA. »). */
  phraseDuPrix?: (montant: number) => string;
  /** La route à appeler, déjà munie de son `?` (un SITE, 2026-11-25) ; par défaut celle des applis. */
  adresseApi?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [offre, setOffre] = useState<Offre | null>(null);
  const [operateur, setOperateur] = useState('');
  const [telephone, setTelephone] = useState('');
  const [nom, setNom] = useState('');
  const idAideNom = useId();
  const [code, setCode] = useState('');
  const [vue, setVue] = useState<Vue | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const suivi = useRef(0);
  // LE PAIEMENT EN ATTENTE SURVIT AU RECHARGEMENT (2026-11-21) : lu au premier
  // rendu (le composant n'existe qu'après le chargement du compteur, côté
  // navigateur), puis le suivi reprend.
  const [attente, setAttente] = useState<EnAttente | null>(() => (typeof window === 'undefined' ? null : lireAttente(app)));
  const [minutes, setMinutes] = useState(0);

  // ── UN APPEL QUI NE RÉPOND PAS SE DIT (défaut mesuré en production le
  //    2026-11-25) : un `fetch` rejeté (réseau coupé, requête annulée) n'était
  //    rattrapé nulle part, et l'écran restait sur « Chargement… » POUR
  //    TOUJOURS. Désormais : un délai maximal, et tout échec devient une phrase
  //    avec « Réessayer ».
  const appeler = async (methode: 'GET' | 'POST', requete: string, corps?: unknown) => {
    const t = await jeton();
    if (t === null) return null;
    const arret = new AbortController();
    const minuteur = window.setTimeout(() => { arret.abort(); }, DELAI_APPEL_MS);
    try {
      const base = adresseApi ?? `/api/generateur/mobile-money?id=${encodeURIComponent(app)}${objet === 'lot' ? '&objet=lot' : ''}`;
    const res = await fetch(`${base}${requete}`, {
        method: methode,
        headers: { Authorization: `Bearer ${t}`, ...(corps === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: corps === undefined ? undefined : JSON.stringify(corps),
        signal: arret.signal,
      });
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok, d };
    } catch {
      return { ok: false, d: { error: PHRASE_SANS_REPONSE } as Record<string, unknown> };
    } finally {
      window.clearTimeout(minuteur);
    }
  };

  const ouvrir = async () => {
    setOuvert(true);
    setAvis(null);
    const r = await appeler('GET', '');
    if (r === null) return;
    if (!r.ok) { setAvis(String(r.d.error ?? 'Le paiement mobile money ne répond pas.')); return; }
    // Sans montant entier, rien n'est proposé.
    const montant = r.d.montant;
    if (typeof montant !== 'number' || !Number.isInteger(montant) || montant <= 0) { setAvis('Le paiement mobile money est indisponible pour le moment.'); return; }
    const ops = ((r.d.operateurs as Operateur[] | undefined) ?? []).filter((o) => typeof o.code === 'string' && o.code !== '');
    setOffre({ montant, test: r.d.test !== false, operateurs: ops });
    if (ops.length > 0) setOperateur(ops[0]!.code);
  };
  // UNE DEMANDE EN COURS SE DIT à la fenêtre : on ne revient pas au choix du moyen pendant l'attente.
  useEffect(() => { onEnvoye?.(vue !== null); }, [vue, onEnvoye]);
  // LA RÉUSSITE SE DIT UNE FOIS à qui l'attend (la fenêtre passe à la confirmation).
  const reussiDit = useRef(false);
  useEffect(() => {
    if (vue?.etat !== 'reussi' || reussiDit.current || onReussi === undefined) return;
    reussiDit.current = true;
    onReussi(vue.test);
  }, [vue, onReussi]);
  // Ouvert d'office : une seule fois, au tour suivant (pas d'état posé pendant l'effet).
  const ouvertUneFois = useRef(false);
  useEffect(() => {
    if (!ouvertDOffice || ouvertUneFois.current) return;
    // Le drapeau se lève DANS le minuteur : un rendu qui annule celui-ci en
    // replanifie un autre, au lieu de ne jamais ouvrir.
    const t = window.setTimeout(() => { ouvertUneFois.current = true; void ouvrir(); }, 0);
    return () => { window.clearTimeout(t); };
  });

  /** Suit l'encaissement jusqu'à un état final (toutes les 4 s, 10 min au plus). */
  const suivre = async (id: string, debut: number) => {
    const tour = ++suivi.current;
    for (let i = 0; i < 150 && tour === suivi.current; i++) {
      await new Promise((ok) => setTimeout(ok, 4000));
      if (tour !== suivi.current) return;
      setMinutes(Math.floor((Date.now() - debut) / 60_000));
      const r = await appeler('GET', `&encaissement=${encodeURIComponent(id)}`);
      if (r === null || !r.ok) continue;
      const v = r.d as unknown as Vue;
      setVue(v);
      if (FINAUX.has(v.etat)) {
        ecrireAttente(app, null);
        setAttente(null);
        if (v.etat === 'reussi') {
          // L'avis signé active : on relit le compteur quelques fois.
          for (let j = 0; j < 8; j++) { await onPaye(); await new Promise((ok) => setTimeout(ok, 3000)); }
        }
        return;
      }
    }
  };

  const payer = async () => {
    setEnvoi(true);
    setAvis(null);
    try {
      const r = await appeler('POST', '', { operateur, telephone, nom });
      if (r === null) return;
      if (!r.ok) { setAvis(String(r.d.error ?? 'Le paiement n’a pas pu s’ouvrir.')); return; }
      const v = r.d as unknown as Vue;
      setVue(v);
      if (v.action?.type === 'page') window.open(v.action.url, '_blank', 'noopener');
      if (!FINAUX.has(v.etat)) {
        const a = { encaissement: v.encaissement, debut: Date.now() };
        ecrireAttente(app, a);
        setAttente(a);
        setMinutes(0);
        void suivre(v.encaissement, a.debut);
      }
    } finally { setEnvoi(false); }
  };

  const envoyerCode = async () => {
    if (vue === null) return;
    setEnvoi(true);
    try {
      const r = await appeler('POST', `&encaissement=${encodeURIComponent(vue.encaissement)}`, { code });
      if (r === null) return;
      if (!r.ok) { setAvis(String(r.d.error ?? 'Le code n’a pas été accepté.')); return; }
      setVue(r.d as unknown as Vue);
    } finally { setEnvoi(false); }
  };

  // Reprise du suivi d'un paiement en attente trouvé au chargement.
  const repris = useRef(false);
  useEffect(() => {
    if (repris.current || attente === null || vue !== null) return;
    repris.current = true;
    void (async () => {
      setOuvert(true);
      const r = await appeler('GET', `&encaissement=${encodeURIComponent(attente.encaissement)}`);
      if (r === null || !r.ok) { ecrireAttente(app, null); setAttente(null); return; }
      const v = r.d as unknown as Vue;
      setVue(v);
      setMinutes(Math.floor((Date.now() - attente.debut) / 60_000));
      if (FINAUX.has(v.etat)) { ecrireAttente(app, null); setAttente(null); }
      else void suivre(attente.encaissement, attente.debut);
    })();
  });

  /**
   * CHANGER DE NUMÉRO : on arrête de suivre et on revient au formulaire.
   * MoneRails n'a PAS d'annulation (aucune route dans son API) : la demande
   * précédente reste en attente chez l'opérateur jusqu'à expirer. Si elle est
   * validée plus tard, son avis arrive quand même (en test : journalisé
   * seulement).
   */
  const changerDeNumero = async () => {
    suivi.current += 1;
    ecrireAttente(app, null);
    setAttente(null);
    setVue(null);
    setCode('');
    if (offre === null) await ouvrir();
  };

  const libelle = renouveler ? 'Renouveler — mobile money' : 'S’abonner — mobile money';
  if (!ouvert) {
    return (
      <button type="button" onClick={() => { void ouvrir(); }}
        className="mt-2 w-full rounded-xl border border-[#FA5D1E]/60 px-3 py-2 text-xs font-semibold text-[#FA5D1E] transition hover:bg-[#FA5D1E]/10">
        {libelle}
      </button>
    );
  }

  const choisi = offre?.operateurs.find((o) => o.code === operateur) ?? null;
  const champ = enFenetre
    ? 'w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-3 text-base text-white placeholder:text-white/35 outline-none transition focus:border-accent/70 sm:text-sm'
    : 'w-full rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500';
  // « MODE TEST » seulement quand le SERVEUR l'a dit (2026-11-25) : pendant le
  // chargement, on ne sait rien — l'afficher par défaut trompait tout le monde.
  const enTest = (vue?.test ?? offre?.test ?? null) === true;
  const etiquette = enFenetre ? 'block text-xs font-medium text-white/60' : 'block';
  return (
    <div className={enFenetre ? 'text-sm text-white/80' : 'mt-2 rounded-xl border border-white/15 p-3 text-xs text-slate-200'} aria-live="polite">
      {!enFenetre && (
        <p className="mb-2 flex items-center justify-between font-semibold text-white">
          {libelle}
          {enTest && <span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">mode test</span>}
        </p>
      )}
      {enFenetre && enTest && (
        <p className="mb-3 inline-flex rounded-md border border-amber-300/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">mode test</p>
      )}
      {enFenetre && vue !== null && !FINAUX.has(vue.etat) && (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
          <span className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-accent/20 motion-safe:animate-ping" aria-hidden />
            <Loader2 size={28} className="relative text-accent motion-safe:animate-spin" aria-hidden />
          </span>
          <p className="text-base font-semibold text-white">{TITRE_ATTENTE}</p>
        </div>
      )}
      {offre === null && avis === null && vue === null && <p className="text-slate-400">Chargement…</p>}
      {offre !== null && vue === null && (
        <form onSubmit={(e) => { e.preventDefault(); void payer(); }} className={enFenetre ? 'space-y-3.5' : 'space-y-2'}>
          <p><strong className="text-white">{phraseDuPrix(offre.montant)}</strong></p>
          <label className={etiquette}>Opérateur
            <select value={operateur} onChange={(e) => setOperateur(e.target.value)} className={`${champ} mt-1`} required>
              {offre.operateurs.map((o) => <option key={o.code} value={o.code}>{o.nom}</option>)}
            </select>
          </label>
          <label className={etiquette}>Numéro mobile money
            {enFenetre ? (
              // « +235 » FIXE devant (2026-11-24) : on tape les 8 chiffres ; le serveur ajoute l'indicatif.
              <span className="mt-1.5 flex items-center rounded-xl border border-white/15 bg-white/[0.04] transition focus-within:border-accent/70">
                <span className="select-none border-r border-white/10 py-3 pl-3.5 pr-3 text-base text-white/60 sm:text-sm" aria-hidden>{INDICATIF}</span>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} type="tel" autoComplete="tel-national"
                  placeholder="66 00 00 00" aria-label={`Numéro mobile money, après ${INDICATIF}`}
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none placeholder:text-white/35 sm:text-sm" required />
              </span>
            ) : (
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} type="tel" autoComplete="tel" placeholder="+235 66 00 00 00" className={`${champ} mt-1`} required />
            )}
          </label>
          <label className={etiquette}>Nom du titulaire
            <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" className={`${champ} mt-1`} required minLength={2} maxLength={80} aria-describedby={idAideNom} />
            <span id={idAideNom} className="mt-1 block text-xs font-normal text-white/55">{AIDE_NOM_TITULAIRE}</span>
          </label>
          <button type="submit" disabled={envoi || choisi === null}
            className={enFenetre
              ? 'w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-white shadow-[0_8px_30px_-10px_rgba(250,93,30,0.7)] transition hover:bg-accent/90 disabled:opacity-50 sm:text-sm'
              : 'w-full rounded-lg bg-[#FA5D1E] px-3 py-2 font-semibold text-white disabled:opacity-50'}>
            {envoi ? 'Envoi…' : `Payer ${fcfa(offre.montant)}`}
          </button>
        </form>
      )}
      {vue !== null && (
        <div className="space-y-2">
          <p role="status">{enFenetre ? sansTitreAttente(phraseEtat(vue)) : phraseEtat(vue)}</p>
          {!FINAUX.has(vue.etat) && (
            <>
              <p className="text-slate-400">
                {phraseAttente(minutes)}
                {minutes >= 10 ? ' Sans réponse de l’opérateur : la demande peut encore aboutir si vous la validez, sinon changez de numéro.' : ''}
              </p>
              <button type="button" onClick={() => { void changerDeNumero(); }} className={enFenetre ? 'w-full rounded-xl bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.12]' : 'w-full rounded-lg border border-white/15 px-3 py-1.5'}>
                Changer de numéro
              </button>
              {minutes < 10 && <p className="text-slate-400">{PHRASE_UNE_DEMANDE}</p>}
            </>
          )}
          {vue.etat === 'code_requis' && (
            <form onSubmit={(e) => { e.preventDefault(); void envoyerCode(); }} className="flex gap-1.5">
              <input value={code} onChange={(e) => setCode(e.target.value)} pattern="[0-9]*" autoComplete="one-time-code" placeholder="Code" className={champ} />
              <button type="submit" disabled={envoi} className="rounded-lg bg-[#FA5D1E] px-3 font-semibold text-white disabled:opacity-50">Valider</button>
            </form>
          )}
          {(vue.etat === 'echoue' || vue.etat === 'expire') && (
            <button type="button" onClick={() => { void changerDeNumero(); }} className="w-full rounded-lg border border-white/15 px-3 py-1.5">Réessayer</button>
          )}
        </div>
      )}
      {avis !== null && <p role="alert" className="mt-2 text-amber-200/90">{avis}</p>}
      {avis !== null && offre === null && vue === null && (
        <button type="button" onClick={() => { void ouvrir(); }}
          className={enFenetre ? 'mt-3 w-full rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]' : 'mt-2 w-full rounded-lg border border-white/15 px-3 py-1.5'}>
          {LIBELLE_REESSAYER}
        </button>
      )}
    </div>
  );
}
