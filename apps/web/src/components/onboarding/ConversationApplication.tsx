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
import { Attente, Bulle, Composeur } from './Conversation';

type Question = { code: string; destination: string; texte: string };
type Intention = {
  brief: string;
  addendum: { rang: number; code: string; destination: string; question: string; reponse: string }[];
};

type Message =
  | { role: 'moi'; texte: string }
  | { role: 'deribfy'; compris: string[]; parIA: boolean; note?: string }
  // UNE QUESTION EST UN TOUR A PART ENTIERE, pas une note en bas d'un resultat.
  | { role: 'question'; questions: Question[]; avertissement?: string };

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
      <button
        type="button"
        onClick={onRetour}
        className="text-xs text-slate-400 hover:text-white mb-4 self-start"
      >
        ← Revenir aux sites et boutiques
      </button>

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
      <div ref={filRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <p className="text-slate-400 text-[15px] leading-relaxed">
            Décrivez l’application que vous voulez. Deribfy vous dira ce qu’il a compris,
            et vous <strong className="text-slate-200">posera des questions</strong> sur ce
            qu’il ne peut pas deviner — rien n’est construit avant. Elle sort en version{' '}
            <strong className="text-slate-200">mobile</strong> et{' '}
            <strong className="text-slate-200">web</strong>.
          </p>
        )}

        {messages.map((m, i) =>
          m.role === 'moi' ? (
            <Bulle key={i} moi>
              {m.texte}
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
