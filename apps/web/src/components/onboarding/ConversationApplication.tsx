'use client';
// ============================================================
// LA CONVERSATION « APPLICATION » — DANS L'ACCUEIL, PAS A COTE.
//
// ── POURQUOI CE COMPOSANT EXISTE, ET CE QU'IL REMPLACE.
//
// J'avais construit une PAGE separee, `/generateur`. Personne ne l'avait
// demande, et le proprietaire l'a fait retirer : « je veux pas que les
// utilisateurs cherchent une 2eme interface pour faire leur appli ». Il avait
// raison — Deribfy a UNE entree, l'accueil, et elle marche.
//
// ── CE QUI N'EST PAS PARTAGE, ET POURQUOI.
//
// L'entree est commune : meme ecran, meme pastilles, meme conversation. La
// SORTIE ne l'est pas. Un site, une boutique et un dropshipping sont trois
// facons d'etre un site — meme table, meme editeur, meme vitrine. Une
// application se compile et se livre.
//
// Ce composant ne touche donc NI `siteMode`, NI `/api/chat`, NI la table
// `sites`. Les 48 fichiers qui lisent `site.mode` ne verront jamais passer
// une application, et c'est la garantie que rien de ce qui marche ne casse.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Attente, Bulle, Composeur, Escalier } from './Conversation';
import {
  ETAPES_SUIVI,
  FOURCHETTE_DUREE,
  ecouleDepuis,
  ligneActivite,
  marcheDuSuivi,
  modeAsyncActif,
  generationDepuisUrl,
  memoriserGeneration,
} from '@/lib/apps/suivi-generation';
import type { EtatGeneration } from '@/lib/apps/service-generations';

// ETAGE 4 — le drapeau : OFF (defaut), l'UX synchrone ci-dessous reste SEULE
// au monde ; le chemin async n'existe qu'arme consciemment. L'ecran ne fait
// que du polling de statut — il ne genere RIEN par lui-meme.
const ASYNC = modeAsyncActif(process.env.NEXT_PUBLIC_GENERATION_ASYNC);

type Question = { code: string; destination: string; texte: string };
type Intention = {
  brief: string;
  addendum: { rang: number; code: string; destination: string; question: string; reponse: string }[];
};

type Message =
  | { role: 'moi'; texte: string }
  | { role: 'deribfy'; compris: string[]; parIA: boolean; note?: string }
  // UNE QUESTION EST UN TOUR A PART ENTIERE, pas une note en bas d'un resultat.
  | { role: 'question'; questions: Question[]; avertissement?: string }
  // UN REFUS DE CONSTRUIRE EST UN TOUR A PART, pas une note sous un resultat.
  | { role: 'incompris'; raison: string };

export default function ConversationApplication({ onRetour }: { onRetour: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [travail, setTravail] = useState<'' | 'apercu' | 'archive'>('');
  const [apercu, setApercu] = useState('');
  const [avis, setAvis] = useState('');
  // LE DOCUMENT COMPRIS, GARDE ICI. Sans lui, « voir » et « telecharger »
  // reliraient la phrase et repaieraient un appel chacun — trois pour une
  // seule application, avec le risque que l apercu et l archive different.
  const [document_, setDocument] = useState<unknown>(null);
  // ── L'ETAT DU DIALOGUE. Il vit ici et repart a chaque tour : le serveur ne
  // garde rien, et la conversation survit a un rechargement de page.
  const [intention, setIntention] = useState<Intention | null>(null);
  const [ouvertes, setOuvertes] = useState<Question[]>([]);
  const [perimetre, setPerimetre] = useState<string[]>([]);
  // Le texte REELLEMENT lu — brief et reponses. Les deux autres routes le
  // recoivent ; leur envoyer le dernier message seul perdrait tout le reste.
  const [texteLu, setTexteLu] = useState('');
  // ── ETAGE 4 (sous drapeau) : la generation suivie, pas executee ici.
  const [generationId, setGenerationId] = useState<string | null>(() =>
    ASYNC && typeof window !== 'undefined'
      ? generationDepuisUrl(window.location.search, window.localStorage)
      : null,
  );
  const [etatGen, setEtatGen] = useState<EtatGeneration | null>(null);
  const [apercuGen, setApercuGen] = useState<{ version: string; html: string } | null>(null);
  // l'horloge de l'ecoule : posee par le POLL (jamais pendant le rendu — purete)
  const [maintenant, setMaintenant] = useState(0);
  const minuterieSuivi = useRef<number | null>(null);

  const enQuestion = ouvertes.length > 0;

  // LE FIL SUIT LA CONVERSATION, comme celui des trois modes : sans cela, une
  // question posee en bas de colonne resterait hors de vue.
  const filRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, enCours]);

  const jeton = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  };

  // (La reprise apres rafraichissement vit dans l'initialiseur de
  // generationId — pas de setState dans un effet.)

  // ── ETAGE 4 : le polling (5 s) — s'arrete seul sur livree/refusee.
  useEffect(() => {
    if (!ASYNC || generationId === null) return;
    let vivant = true;
    const lire = async () => {
      try {
        const res = await fetch(`/api/generateur/etat?id=${encodeURIComponent(generationId)}`, {
          headers: { Authorization: `Bearer ${await jeton()}` },
        });
        if (!vivant) return;
        if (res.ok) {
          const e = (await res.json()) as EtatGeneration;
          setMaintenant(Date.now());
          setEtatGen(e);
          if (e.statut === 'livree' || e.statut === 'refusee') return;
        }
      } catch {
        // transitoire : la prochaine lecture reessaiera
      }
      if (vivant) minuterieSuivi.current = window.setTimeout(() => { void lire(); }, 5000);
    };
    void lire();
    return () => {
      vivant = false;
      if (minuterieSuivi.current !== null) window.clearTimeout(minuterieSuivi.current);
    };
  }, [generationId]);

  // L'APERCU v0-STYLE : compile localement cote serveur (zero IA), recharge
  // UNIQUEMENT quand l'empreinte de l'acquis change — une fois par tranche.
  useEffect(() => {
    if (!ASYNC || generationId === null) return;
    const version = etatGen?.apercuVersion ?? null;
    if (version === null || apercuGen?.version === version) return;
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch(`/api/generateur/apercu-live?id=${encodeURIComponent(generationId)}`, {
          headers: { Authorization: `Bearer ${await jeton()}` },
        });
        if (!vivant || !res.ok) return;
        const d = (await res.json()) as { pret: boolean; html?: string };
        if (d.pret && typeof d.html === 'string') setApercuGen({ version, html: d.html });
      } catch {
        // la prochaine tranche retentera
      }
    })();
    return () => { vivant = false; };
  }, [etatGen?.apercuVersion, apercuGen?.version, generationId]);

  const deposerAsync = async () => {
    setTravail('archive');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/deposer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: texteLu, nom: 'application' }),
      });
      const d = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || typeof d.id !== 'string') {
        setAvis(String(d.error ?? 'Dépôt impossible.'));
        return;
      }
      window.history.replaceState(null, '', memoriserGeneration(d.id, window.localStorage));
      setEtatGen(null);
      setGenerationId(d.id);
      setAvis('Demande déposée — la génération avance toute seule, vous pouvez fermer cette page et revenir.');
    } catch {
      setAvis('Dépôt impossible.');
    } finally {
      setTravail('');
    }
  };

  const telechargerLivraison = async () => {
    if (generationId === null) return;
    setTravail('archive');
    try {
      const res = await fetch(`/api/generateur/livraison?id=${encodeURIComponent(generationId)}`, {
        headers: { Authorization: `Bearer ${await jeton()}` },
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setAvis(String(d.error ?? 'Téléchargement impossible.'));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAvis('Téléchargement impossible.');
    } finally {
      setTravail('');
    }
  };


  /** Un tour : soit une premiere demande, soit une reponse a la question ouverte. */
  const envoyer = async () => {
    const texte = saisie.trim();
    if (texte === '' || enCours) return;
    setSaisie('');
    setAvis('');
    setMessages((m) => [...m, { role: 'moi', texte }]);
    setEnCours(true);

    // ── CE QU'ON ENVOIE DEPEND DE CE QU'ON ATTENDAIT.
    //
    // Hors question, c'est une demande. Sous question, c'est une REPONSE : on
    // la range dans l'addendum avec le code de la question, et le brief reste
    // SCELLE. C'est ce qui permettra un jour de mesurer ce que l'humain a dit
    // spontanement et ce qu'il n'a dit que parce qu'on le lui a demande.
    const corps =
      enQuestion && intention !== null
        ? {
            intention: {
              brief: intention.brief,
              addendum: [
                ...intention.addendum,
                {
                  rang: intention.addendum.length,
                  code: ouvertes[0].code,
                  destination: ouvertes[0].destination,
                  question: ouvertes[0].texte,
                  reponse: texte,
                },
              ],
            },
            perimetre,
          }
        : { demande: texte };

    try {
      const res = await fetch('/api/generateur/comprendre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify(corps),
      });
      const d = await res.json();
      if (!res.ok) { setAvis(String(d.error ?? 'Lecture impossible.')); return; }

      setIntention(d.intention ?? null);
      setTexteLu(String(d.texteLu ?? texte));

      // ── PAS COMPRIS : ON EFFACE LE DOCUMENT, DONC LES BOUTONS.
      //
      // Avant, l'echec servait un squelette de repli — et les deux boutons
      // restaient la. On pouvait TELECHARGER une application batie sur une
      // phrase que le moteur venait de declarer illisible.
      if (d.incompris === true) {
        setDocument(null);
        setOuvertes([]);
        setPerimetre([]);
        setMessages((m) => [...m, { role: 'incompris', raison: String(d.raison ?? '') }]);
        return;
      }

      if (Array.isArray(d.questions) && d.questions.length > 0) {
        // RIEN N'EST CONSTRUIT TANT QU'UNE QUESTION EST OUVERTE. Le document
        // precedent est EFFACE : le garder laisserait les deux boutons actifs
        // sur une comprehension qu'on vient de declarer incomplete.
        setDocument(null);
        setOuvertes(d.questions as Question[]);
        setPerimetre(Array.isArray(d.perimetre) ? (d.perimetre as string[]) : []);
        setMessages((m) => [
          ...m,
          { role: 'question', questions: d.questions as Question[], avertissement: d.avertissement },
        ]);
        return;
      }

      setOuvertes([]);
      setPerimetre([]);
      setDocument(d.document ?? null);
      setMessages((m) => [
        ...m,
        { role: 'deribfy', compris: d.compris ?? [], parIA: d.parIA === true, note: d.echecIA },
      ]);
    } catch {
      setAvis('Lecture impossible.');
    } finally {
      setEnCours(false);
    }
  };

  /** LA SURVEILLANCE REMONTE A L'ECRAN : une anomalie ne reste pas dans un log. */
  const direAnomalies = (d: { surveillance?: { saine?: boolean; anomalies?: { message: string }[] } }) => {
    const a = d.surveillance?.anomalies ?? [];
    if (a.length > 0) setAvis(a.map((x) => x.message).join(' · '));
  };

  const voir = async () => {
    if (document_ === null) return;
    setTravail('apercu');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/apercu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: texteLu, document: document_ }),
      });
      const d = await res.json();
      direAnomalies(d);
      if (!res.ok) { setAvis(String(d.error ?? 'Aperçu impossible.')); return; }
      setApercu(String(d.html ?? ''));
    } catch {
      setAvis('Aperçu impossible.');
    } finally {
      setTravail('');
    }
  };

  const telecharger = async () => {
    if (document_ === null) return;
    // ETAGE 4 : drapeau ON → depot asynchrone ; OFF → le chemin synchrone
    // historique, inchange. La garde-document reste PREMIERE : on ne depose
    // pas plus qu'on ne construit ce qu'on n'a pas compris.
    if (ASYNC) {
      await deposerAsync();
      return;
    }
    setTravail('archive');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/produire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: texteLu, document: document_ }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAvis(String(d.error ?? 'Construction impossible.'));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application.zip';
      a.click();
      URL.revokeObjectURL(url);
      setAvis('Application construite. Le fichier est dans vos téléchargements.');
    } catch {
      setAvis('Construction impossible.');
    } finally {
      setTravail('');
    }
  };

  return (
    <>
      {ASYNC && generationId !== null && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-slate-400 mb-1">Suivi de la génération</p>
          {/* LE TRIPTYQUE HONNETE : fourchette sourcee + ecoule reel +
              battement — jamais de compte a rebours, jamais de simulation. */}
          <p className="text-xs text-slate-500 mb-3">
            {`Une application complète prend ${FOURCHETTE_DUREE}. Vous pouvez fermer cette page : la génération continue seule.`}
            {etatGen !== null && maintenant > 0 && marcheDuSuivi(etatGen).enCours && (
              <span className="block mt-1 text-slate-400">
                {`En cours ${ecouleDepuis(etatGen.creeIl, maintenant)}`}
                {ligneActivite(etatGen.statut, etatGen.activiteSec) !== null &&
                  ` · ${ligneActivite(etatGen.statut, etatGen.activiteSec) ?? ''}`}
              </span>
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Escalier
              etapes={[...ETAPES_SUIVI]}
              courante={marcheDuSuivi(etatGen).courante}
              fraction={
                etatGen !== null && marcheDuSuivi(etatGen).enCours
                  ? { ...etatGen.sections, libelle: 'Sections écrites' }
                  : undefined
              }
              compteur={
                etatGen !== null && etatGen.defautsRestants !== null && marcheDuSuivi(etatGen).enCours
                  ? { restants: etatGen.defautsRestants, libelle: 'Points à corriger' }
                  : undefined
              }
              panneau={
                apercuGen !== null ? (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-1">
                      Aperçu — il se précise à mesure que la génération avance
                      {etatGen?.apercuVersion !== apercuGen.version && ' · mise à jour en cours…'}
                    </p>
                    {/* meme sandbox que l'apercu existant : l'app tourne,
                        elle ne lit rien du site hote */}
                    <iframe
                      title="Aperçu de l’application en construction"
                      srcDoc={apercuGen.html}
                      sandbox="allow-scripts"
                      className="w-full h-[320px] rounded-xl border border-white/10 bg-white"
                    />
                  </div>
                ) : undefined
              }
            />
          </div>
          {marcheDuSuivi(etatGen).refusee && (
            <p className="mt-3 text-sm text-red-300">{marcheDuSuivi(etatGen).raison}</p>
          )}
          {marcheDuSuivi(etatGen).livree && (
            <button
              type="button"
              onClick={() => { void telechargerLivraison(); }}
              className="mt-3 text-sm underline text-white hover:text-[#FA5D1E]"
            >
              Télécharger l’application (zip)
            </button>
          )}
        </div>
      )}
      {apercu !== '' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Votre application</p>
            <button type="button" onClick={() => setApercu('')} className="text-xs text-slate-400 hover:text-white underline">
              Fermer
            </button>
          </div>
          {/* `sandbox` SANS `allow-same-origin` : l'application tourne, et
              elle ne peut rien lire du site qui l'héberge. */}
          <iframe
            title="Aperçu de l’application"
            srcDoc={apercu}
            sandbox="allow-scripts"
            className="w-full h-[380px] rounded-xl border border-white/10 bg-white"
          />
        </div>
      )}

      {/* ── LA MEME COLONNE QUE LES TROIS MODES : elle prend la place qui
          reste et defile. C'est ce `flex-1` qui empeche le pied de page de
          remonter dans la conversation. */}
      <div
        ref={filRef}
        className={`flex-1 overflow-y-auto space-y-4 pr-1 ${
          // ECRAN VIDE : CENTRE, comme les trois modes. Leur section porte
          // `justify-center` tant qu'aucun message n'est echange ; sans
          // l'equivalent ici, le texte d'accueil restait colle en haut avec
          // un grand trou jusqu'au composeur. Le dernier ecart visible entre
          // les deux conversations.
          messages.length === 0 ? 'flex flex-col justify-center text-center' : ''
        }`}
      >
        {messages.length === 0 && (
          <>
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-md mx-auto">
              Décrivez l’application que vous voulez. Deribfy vous dira ce qu’il a compris,
              et vous <strong className="text-slate-200">posera des questions</strong> sur ce
              qu’il ne peut pas deviner — rien n’est construit avant. Elle sort en version{' '}
              <strong className="text-slate-200">mobile</strong> et{' '}
              <strong className="text-slate-200">web</strong>.
            </p>
            {/* ── LE RETOUR NE VIT QUE SUR L'ECRAN VIDE, et c'est la reponse a
                « je vois pas pourquoi tu l'as mis ici ».

                Il etait pose AU-DESSUS de la conversation, aligne a gauche, a
                un endroit ou les trois modes n'ont rien. Pendant la
                conversation, il n'a plus lieu d'etre : la vue est desormais
                identique a celle des trois modes, sans chrome en plus.

                Mais le SUPPRIMER tout court enfermerait. Les trois modes n'en
                ont pas besoin parce qu'ils QUITTENT la page une fois le site
                genere ; l'application, elle, reste. Et cliquer « Accueil »
                vers une route identique ne remonte pas le composant : l'etat
                survit, donc rien ne reviendrait.

                Il reste donc exactement la ou on se rend compte qu'on s'est
                trompe de pastille — avant d'avoir ecrit quoi que ce soit. */}
            <button
              type="button"
              onClick={onRetour}
              className="mt-5 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 transition"
            >
              Revenir aux sites et boutiques
            </button>
          </>
        )}

        {messages.map((m, i) =>
          m.role === 'moi' ? (
            <Bulle key={i} moi>
              {m.texte}
            </Bulle>
          ) : m.role === 'incompris' ? (
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-amber-300/80 mb-2">
                Je n’ai pas compris — je ne construis rien
              </span>
              {m.raison}
            </Bulle>
          ) : m.role === 'question' ? (
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-[#FA5D1E] mb-2">
                Avant de construire, j’ai besoin de savoir
              </span>
              {m.questions.map((q) => (
                <span key={q.code} className="block">
                  {q.texte}
                </span>
              ))}
              {m.avertissement !== undefined && (
                <span className="block mt-3 text-xs text-amber-300/80">{m.avertissement}</span>
              )}
              {m.questions.length > 1 && (
                <span className="block mt-3 text-xs text-slate-500">
                  Répondez à la première ; je poserai la suivante ensuite.
                </span>
              )}
            </Bulle>
          ) : (
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-slate-500 mb-2">
                {m.parIA ? 'Voici ce que j’ai compris' : 'Lecture simple — sans IA'}
              </span>
              {m.compris.map((c) => (
                <span key={c} className="block">
                  · {c}
                </span>
              ))}
              {m.note !== undefined && (
                <span className="block mt-3 text-xs text-amber-300/70">
                  Lecture par IA indisponible : {m.note}
                </span>
              )}
            </Bulle>
          ),
        )}
        {enCours && <Attente />}
      </div>

      {avis !== '' && <p className="text-sm text-amber-300/80 mt-3 text-center">{avis}</p>}

      <Composeur
        valeur={saisie}
        onChange={setSaisie}
        onEnvoyer={() => void envoyer()}
        invite={enQuestion ? 'Votre réponse…' : 'Une application de tontine pour mon quartier…'}
        desactive={enCours || saisie.trim() === ''}
        bloque={travail !== ''}
        etiquette="Décrivez l’application que vous voulez"
      />

      {/* ── LES DEUX BOUTONS SUIVENT LE DOCUMENT, PLUS LE DERNIER MESSAGE.
          Avant, ils apparaissaient des qu'on avait parle : on pouvait donc
          lancer une construction sur une comprehension vide ou refusee. Sans
          document, il n'y a rien a construire — et il n'y a pas de bouton. */}
      {document_ !== null && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => void voir()}
            disabled={travail !== ''}
            className="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-semibold transition disabled:opacity-40 text-slate-100"
          >
            {travail === 'apercu' ? 'Assemblage…' : 'Voir l’application'}
          </button>
          <button
            type="button"
            onClick={() => void telecharger()}
            disabled={travail !== ''}
            className="flex-1 bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 py-3 rounded-xl font-semibold transition disabled:opacity-40 text-white"
          >
            {travail === 'archive' ? 'Construction…' : 'Télécharger'}
          </button>
        </div>
      )}
    </>
  );
}
