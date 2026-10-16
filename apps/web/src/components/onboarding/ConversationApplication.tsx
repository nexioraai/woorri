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
import {
  formatDuFichier,
  raisonDuRefus,
  LONGUEUR_AVEC_DOCUMENT,
  MESSAGE_SCAN,
} from '@/lib/apps/document-joint';
import {
  DELAI_MAX_MS,
  MESSAGE_ILLISIBLE,
  messageDeLEchec,
  phraseAttente,
  retirerDernierEcho,
} from '@/lib/apps/attente-comprehension';

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
  | { role: 'incompris'; raison: string }
  | { role: 'notre_faute'; raison: string }
  | { role: 'arrete'; raison: string };

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
  // ── LE CAHIER DES CHARGES JOINT : ce qu'on DIT sous le champ. Jamais
  // d'injection muette — le texte extrait remplit la zone, visible et
  // corrigeable, et la note annonce le cout AVANT l'envoi.
  const [noteJoint, setNoteJoint] = useState('');
  // ── L'ATTENTE DE LA LECTURE : l'instant du depart et la taille du texte.
  // Sans eux, l'ecran ne pourrait dire ni CE QU'il lit ni DEPUIS QUAND, et
  // c'est tout ce qui manquait quand les trois points sont devenus un piege.
  const [debutLecture, setDebutLecture] = useState('');
  const [longueurLue, setLongueurLue] = useState(0);
  const minuterieSuivi = useRef<number | null>(null);

  const enQuestion = ouvertes.length > 0;

  // LE FIL SUIT LA CONVERSATION, comme celui des trois modes : sans cela, une
  // question posee en bas de colonne resterait hors de vue.
  const filRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, enCours]);

  // ── L'HORLOGE DE L'ATTENTE. Elle ne bat que pendant la lecture et s'arrete
  // avec elle : rien ne tourne quand rien ne travaille.
  useEffect(() => {
    if (!enCours) return;
    // L'heure de depart est posee par le GESTE d'envoi, pas ici : un
    // `setState` synchrone dans un effet declenche un rendu en cascade, et
    // le depot l'interdit. Ici, uniquement le battement.
    const t = window.setInterval(() => { setMaintenant(Date.now()); }, 1000);
    return () => { window.clearInterval(t); };
  }, [enCours]);

  /**
   * RENDRE LA MAIN — le tour n'a pas eu lieu, on efface sa trace.
   *
   * La bulle part, le texte revient dans le champ, et la note du document
   * joint revient avec lui. Sans ca, un echec coutait a l'utilisateur son
   * cahier des charges entier : il devait le televerser une seconde fois.
   */
  const rendreLaMain = (texte: string, note: string) => {
    setMessages((m) => [...retirerDernierEcho(m, texte)]);
    setSaisie(texte);
    setNoteJoint(note);
  };

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
          if (e.statut === 'livree' || e.statut === 'refusee') {
            // ── LE DIALOGUE NE MEURT PLUS A L'ARRIVEE.
            //
            // Le chemin synchrone partage les diagnostics (EP-135) : ce que
            // l'humain seul peut trancher devient une QUESTION. Le chemin
            // asynchrone ne savait pas en poser — une ligne refusee disait
            // non, meme quand il suffisait de demander, et l'utilisateur
            // n'avait plus qu'a tout recommencer. Les questions arrivent
            // maintenant avec l'etat, derivees a la lecture et gratuitement.
            // ── UN DEFAUT DU GENERATEUR N'EST PAS UNE INCOMPREHENSION.
            //
            // SIGNALE PAR LE PROPRIETAIRE, capture a l'appui : un refus
            // « P0 refuse 3 fois » s'affichait sous « Je n'ai pas compris
            // — je ne construis rien ». EP-135 classe ces codes en
            // `faute_de_production`, dont la definition dit le contraire :
            // « le generateur doit poser l'etape manquante, pas l'humain
            // repondre a une question ». On reprochait au proprietaire un
            // defaut qui n'etait pas le sien, et qu'il ne pouvait pas
            // corriger — il n'avait plus qu'a reecrire son cahier.
            //
            // Le serveur tranche (`notreFaute`), parce que lui seul tient
            // la table de classification ; l'ecran ne fait que le dire.
            if (e.statut === 'refusee' && e.questions.length > 0) {
              setOuvertes([...e.questions]);
              setMessages((m) => [...m, { role: 'question', questions: [...e.questions] }]);
            } else if (e.statut === 'refusee') {
              setMessages((m) => [
                ...m,
                e.arrete === true
                  ? { role: 'arrete', raison: e.raison ?? '' }
                  : e.notreFaute === true
                    ? { role: 'notre_faute', raison: e.raison ?? '' }
                    : { role: 'incompris', raison: e.raison ?? '' },
              ]);
            }
            // ── L'AVIS D'UNE REPRISE NE SURVIT PAS A L'ISSUE (defaut 2026-10-15).
            //
            // « C'est reparti — l'etape suivante commence. » restait affiche
            // SOUS le refus qui avait suivi : l'avis n'etait efface qu'au
            // prochain geste de l'humain, jamais par la lecture du suivi.
            // La correction du 2026-10-14 avait retire la bulle qui mentait
            // et laisse l'avis qui ment : la contradiction a change de cote.
            if (e.statut === 'refusee' || e.statut === 'livree') setAvis('');
            return;
          }
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

  /**
   * DECLENCHER UN TELECHARGEMENT — et pourquoi ce n'est pas trois lignes.
   *
   * SIGNALE PAR LE PROPRIETAIRE (2026-10-15) : « j'arrive pas a telecharger
   * sur mon iPhone ». Le code faisait `a.click()` PUIS `revokeObjectURL` a
   * la ligne suivante.
   *
   * Safari demarre le telechargement de maniere ASYNCHRONE : revoquer tout
   * de suite detruit l'objet AVANT qu'il ait commence a etre lu. Chrome
   * tolere — il a deja saisi le blob —, Safari non. Sur iPhone, il ne se
   * passait donc rien du tout, sans le moindre message.
   *
   * Deuxieme cause, plus discrete : l'ancre n'etait jamais INSEREE dans le
   * document. Chrome accepte un clic sur un element detache ; Safari
   * l'ignore. Les deux causes frappent le meme navigateur, et ni l'une ni
   * l'autre ne produit d'erreur a attraper.
   *
   * On insere donc, on clique, on retire, et on ne revoque qu'APRES — une
   * minute, large de trois ordres de grandeur devant ce qu'il faut.
   */
  const telechargerLeBlob = (contenu: Blob, nom: string) => {
    const url = URL.createObjectURL(contenu);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => { URL.revokeObjectURL(url); }, 60_000);
  };

  /** REPRENDRE — la ligne repart de sa base, le suivi reprend tout seul. */
  const reprendre = async (
    geste: 'reprendre' | 'continuer' | 'revenir' | 'arreter' | 'relancer' = 'reprendre',
    rang?: number,
  ) => {
    if (generationId === null) return;
    setTravail('archive');
    setAvis('');
    try {
      const res = await fetch('/api/generateur/reprendre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ id: generationId, geste, ...(rang === undefined ? {} : { rang }) }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        setAvis(String(d.error ?? 'Reprise impossible.'));
        return;
      }
      // ── UNE RELANCE REND UNE LIGNE NEUVE : on la SUIT, sinon l'ecran
      // resterait colle a la ligne morte et donnerait l'impression que
      // le bouton n'a rien fait.
      if (geste === 'relancer' && typeof d.id === 'string' && d.id !== generationId) {
        setMessages((anciens) =>
          anciens.filter(
            (m) => m.role !== 'incompris' && m.role !== 'notre_faute' && m.role !== 'arrete',
          ),
        );
        setEtatGen(null);
        setAvis('C’est reparti sur une demande neuve.');
        window.history.replaceState(null, '', memoriserGeneration(d.id, window.localStorage));
        setGenerationId(d.id);
        return;
      }
      // L'etat est efface : le prochain battement du suivi lira la ligne
      // redevenue « en attente », et l'escalier repartira de lui-meme.
      setEtatGen(null);
      // ── DEUX MESSAGES QUI SE CONTREDISENT (defaut 2026-10-14).
      //
      // SIGNALE PAR LE PROPRIETAIRE, capture a l'appui : l'ecran affichait
      // « Je n'ai pas compris — je ne construis rien » ET, juste en dessous,
      // « Reprise lancee — elle repart de ce qui etait deja ecrit ». Les deux
      // au present, les deux faux ensemble.
      //
      // La bulle de refus appartenait a l'historique, donc elle restait. Mais
      // son texte est une affirmation au PRESENT : « je ne construis rien »
      // cesse d'etre vrai des qu'une reprise part. Garder un historique est
      // juste ; garder une phrase qui ment ne l'est pas.
      //
      // On retire donc les refus, et EUX SEULS : la demande, les questions et
      // les reponses restent — c'est la conversation, et elle n'a pas change.
      setMessages((anciens) =>
        anciens.filter(
          (m) => m.role !== 'incompris' && m.role !== 'notre_faute' && m.role !== 'arrete',
        ),
      );
      setAvis(
        geste === 'arreter'
          ? 'Génération arrêtée. Rien de plus ne sera lancé dessus.'
          : geste === 'continuer'
          ? 'C’est reparti — l’étape suivante commence.'
          : geste === 'revenir'
            ? 'Revenu à cette version. Rien n’a été perdu : les suivantes restent dans la liste.'
            : 'Reprise lancée — elle repart de ce qui était déjà écrit.',
      );
    } catch {
      setAvis('Reprise impossible.');
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
      telechargerLeBlob(await res.blob(), 'application.zip');
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
    // La note du document joint est MISE DE COTE avant d'etre effacee : si le
    // tour echoue, elle doit revenir avec le texte.
    const noteAvant = noteJoint;
    setNoteJoint('');
    setSaisie('');
    setAvis('');
    setMessages((m) => [...m, { role: 'moi', texte }]);
    setEnCours(true);
    setDebutLecture(new Date().toISOString());
    setLongueurLue(texte.length);
    // La premiere lecture de l'horloge : sans elle, la phrase n'apparaitrait
    // qu'au bout d'une seconde — et l'ecran recommencerait par du vide.
    setMaintenant(Date.now());

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

    // ── LE FILET, ET POURQUOI IL EXISTE.
    //
    // Le 2026-10-10, une lecture est partie, a travaille, et n'est jamais
    // revenue : la connexion est restee ouverte sur un travail mort. `fetch`
    // n'a AUCUNE limite de temps par defaut — la promesse n'a donc ni abouti
    // ni echoue, le `finally` n'a jamais tourne, et l'ecran est reste sur
    // trois points sans message et sans issue. Ce filet ferme ce piege : au
    // pire, on rend la main et on le DIT.
    const avorteur = new AbortController();
    const filet = window.setTimeout(() => { avorteur.abort(); }, DELAI_MAX_MS);
    try {
      // ══════════════════════════════════════════════════════════════════
      // ETAGE 4 — LA PORTE CHERE PASSE ENFIN PAR LA BONNE.
      //
      // MESURE QUI COMMANDE CE BRANCHEMENT (2026-10-10, tir reel) : ce que
      // l'ecran appelle « comprendre » ne comprend pas — il CONSTRUIT
      // l'application entiere. 53 minutes, 16,03 $, 1 252 757 jetons
      // d'entree. Et toute cette depense passait par la SEULE porte sans
      // avancement, sans reprise et sans persistance : une coupure, un
      // rechargement ou un filet, et tout etait perdu. Le proprietaire a
      // paye trois constructions completes sans en voir aucune.
      //
      // Le depot, lui, existait depuis l'etage 4 — construit et teste, mais
      // accroche au MAUVAIS geste : le bouton « telecharger », APRES une
      // comprehension qui avait deja tout construit. Il refaisait donc
      // l'application une seconde fois, payante. Il part d'ici, une fois,
      // et la generation avance en tranches reprenables : l'ecran la suit,
      // et on peut fermer la page.
      //
      // LE DEPOT EST GRATUIT : il n'ecrit qu'une ligne. Toute la depense a
      // lieu ensuite, cote travailleur, sous le drapeau d'armement.
      if (ASYNC) {
        const res = await fetch('/api/generateur/deposer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
          body: JSON.stringify({ ...corps, nom: 'application' }),
          signal: avorteur.signal,
        });
        const d = (await res.json().catch(() => ({}))) as {
          id?: string; texteLu?: string; intention?: unknown; error?: string;
        };
        if (!res.ok || typeof d.id !== 'string') {
          rendreLaMain(texte, noteAvant);
          setAvis(String(d.error ?? MESSAGE_ILLISIBLE));
          return;
        }
        // L'INTENTION REVIENT AVEC LE DEPOT : sans elle, repondre a une
        // question au tour suivant repartirait d'un brief vide, et les
        // reponses deja donnees seraient perdues — payees pour rien.
        setIntention((d.intention ?? null) as Intention | null);
        setTexteLu(String(d.texteLu ?? texte));
        setOuvertes([]);
        setPerimetre([]);
        setDocument(null);
        setApercuGen(null);
        setEtatGen(null);
        window.history.replaceState(null, '', memoriserGeneration(d.id, window.localStorage));
        setGenerationId(d.id);
        return;
      }
      // ══════════════════════════════════════════════════════════════════

      const res = await fetch('/api/generateur/comprendre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify(corps),
        signal: avorteur.signal,
      });
      const d = await res.json();
      if (!res.ok) {
        // Le serveur a dit non : son motif s'affiche, mais le texte revient.
        rendreLaMain(texte, noteAvant);
        setAvis(String(d.error ?? MESSAGE_ILLISIBLE));
        return;
      }

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
    } catch (e) {
      // Le filet a mordu — ou l'onglet a coupe. Dans les deux cas on a rendu
      // la main, et c'est exactement ce qu'on annonce.
      rendreLaMain(texte, noteAvant);
      setAvis(messageDeLEchec(e));
    } finally {
      window.clearTimeout(filet);
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
    // ── CETTE BRANCHE DEPOSAIT UNE SECONDE GENERATION. Retiree le
    // 2026-10-11, avec le branchement du depot a l'ENVOI.
    //
    // L'enchainement etait : la comprehension construisait l'application
    // (53 min, 16,03 $ au tir reel), puis ce bouton DEPOSAIT une generation
    // neuve a partir du meme texte — et la refaisait entierement. Deux
    // constructions payees pour une seule demande.
    //
    // Desormais le depot a lieu une fois, a l'envoi, et la livraison se
    // telecharge depuis la ligne deposee (`telechargerLivraison`, dans le
    // bloc de suivi). Ce bouton-ci ne sert plus qu'au chemin SYNCHRONE, ou
    // `produire` ne fait que COMPILER un document deja en main : zero IA.
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
      telechargerLeBlob(await res.blob(), 'application.zip');
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
          {/* ── REPRENDRE PLUTOT QUE TOUT REFAIRE.
              Les quatre generateurs comparables reprennent tous ; nous
              etions les seuls a recommencer, donc a tout refacturer. Le
              bouton n'apparait QUE si la ligne porte une base recuperable —
              sinon il relancerait une generation complete deguisee en
              reprise, et ce serait la facture doublee. */}
          {/* ── ELLE VOUS ATTEND. Mode plan apres P0, puis a chaque passe :
              rien ne repart tant que vous n'avez pas vu et dit d'avancer.
              C'est ce que font les quatre generateurs comparables, et ce
              que nous ne faisions pas — une generation allait jusqu'au
              bout, et jusqu'a la facture, sans validation. */}
          {/* ── L'HISTORIQUE. Chaque suspension laisse une version, et on
              peut y revenir — GRATUITEMENT, c'est une ecriture en base et
              aucun appel. Les quatre generateurs comparables l'ont tous ;
              nous ecrasions l'etat precedent a chaque fois. Revenir ne
              tronque RIEN : les versions suivantes restent la. */}
          {(etatGen?.versions.length ?? 0) > 1 && (
            <div className="mt-3">
              <p className="text-xs text-slate-400">{'Revenir à une étape précédente — gratuit'}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {etatGen?.versions.map((v) => (
                  <button
                    key={v.rang}
                    type="button"
                    onClick={() => { void reprendre('revenir', v.rang); }}
                    disabled={travail !== ''}
                    title={v.etape ?? undefined}
                    className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition disabled:opacity-40"
                  >
                    {`${String(v.rang)}${v.etape === null ? '' : ` · ${v.etape}`}`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* ── NE PROMETTRE QUE CE QU'ON MONTRE (defaut 2026-10-14).
              MESURE, rapportee par le proprietaire sur sa generation :
              l'ecran disait « Regardez ce qui a ete compris » et il n'y
              avait RIEN a regarder. Verifie en base : pause a l'etape P0,
              `sections acquises = AUCUNE`, 0 sur 22. L'apercu vivant juste
              au-dessus n'existe qu'a partir de la PREMIERE section ecrite.
              L'ecran envoyait donc chercher une vue qui n'est pas encore
              nee, et la seule reponse possible etait de cliquer a l'aveugle
              — exactement ce que le mode plan veut empecher.
              Deux moments, deux phrases : apres P0 on dit ce qui a ete
              COMPRIS (le brief relu) ; a partir de la premiere section on
              renvoie a l'apercu, qui existe alors vraiment. */}
          {etatGen?.attendVous === true && (
            <div className="mt-3">
              {etatGen.sections.faites === 0 ? (
                <>
                  <p className="text-sm text-slate-300">
                    {etatGen.comprise
                      ? 'Votre demande a été comprise. Rien n’est encore écrit — et rien ne partira tant que vous ne le dites pas.'
                      : 'La compréhension de votre demande n’est pas encore terminée. Rien n’est écrit, et rien ne partira tant que vous ne le dites pas.'}
                  </p>
                  {intention !== null && intention.brief.trim() !== '' && (
                    <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {'Ce qui a été retenu de votre demande'}
                      </p>
                      <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">
                        {intention.brief}
                      </p>
                      {intention.addendum.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {intention.addendum.map((a) => (
                            <li key={a.rang} className="text-sm text-slate-300">
                              <span className="text-slate-400">{a.question}</span>
                              {' — '}
                              {a.reponse}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-300">
                  {'Regardez l’aperçu ci-dessus. Rien ne repart tant que vous ne le dites pas.'}
                </p>
              )}
              <button
                type="button"
                onClick={() => { void reprendre('continuer'); }}
                disabled={travail !== ''}
                className="mt-2 px-4 py-2 rounded-full text-sm bg-[#FA5D1E] text-white hover:brightness-110 transition disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}
          {/* ── APRES UN ECHEC, IL Y A TOUJOURS UNE SORTIE (defaut 2026-10-15).
              MESURE : une generation morte en P0 n'affichait AUCUN bouton.
              `reprenable` est faux (rien d'ecrit a reprendre — et c'est
              juste), `attendVous` est faux, `livree` est faux. Zero action
              possible : le proprietaire etait coince, et la seule facon
              d'arreter a ete que j'ecrive en base a sa place. */}
          {etatGen !== null && (etatGen.statut === 'en_cours' || etatGen.statut === 'en_attente') && (
            <button
              type="button"
              onClick={() => { void reprendre('arreter'); }}
              disabled={travail !== ''}
              className="mt-3 ml-3 px-4 py-2 rounded-full text-sm bg-white/5 border border-white/15 text-slate-300 hover:bg-white/10 transition disabled:opacity-40"
            >
              Arrêter
            </button>
          )}
          {etatGen?.statut === 'refusee' && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => { void reprendre('relancer'); }}
                disabled={travail !== ''}
                className="px-4 py-2 rounded-full text-sm bg-[#FA5D1E] hover:bg-[#FA5D1E]/90 text-white font-semibold transition disabled:opacity-40"
              >
                Relancer la génération
              </button>
              {/* LE PRIX EST DIT AVANT LE CLIC, jamais apres. */}
              <p className="mt-2 text-xs text-slate-400">
                {'Repart de votre demande d’origine, du début. C’est un nouveau travail.'}
              </p>
            </div>
          )}
          {etatGen?.reprenable === true && (
            <button
              type="button"
              onClick={() => { void reprendre(); }}
              disabled={travail !== ''}
              className="mt-3 px-4 py-2 rounded-full text-sm bg-white/10 border border-white/15 text-white hover:bg-white/15 transition disabled:opacity-40"
            >
              Reprendre là où ça s’est arrêté
            </button>
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
          ) : m.role === 'arrete' ? (
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-slate-400 mb-2">{'Arrêt demandé'}</span>
              {m.raison}
            </Bulle>
          ) : m.role === 'notre_faute' ? (
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-amber-300/80 mb-2">
                L’échec vient de nous — votre demande n’est pas en cause
              </span>
              {m.raison}
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
        {enCours && (
          <Attente
            libelle={
              debutLecture !== '' && maintenant > 0
                ? phraseAttente(longueurLue, debutLecture, maintenant)
                : undefined
            }
          />
        )}
      </div>

      {avis !== '' && <p className="text-sm text-amber-300/80 mt-3 text-center">{avis}</p>}

      <Composeur
        valeur={saisie}
        onChange={(v) => {
          setSaisie(v);
          if (noteJoint !== '') setNoteJoint('');
        }}
        onEnvoyer={() => void envoyer()}
        invite={enQuestion ? 'Votre réponse…' : 'Une application de tontine pour mon quartier…'}
        desactive={enCours || saisie.trim() === ''}
        bloque={travail !== ''}
        etiquette="Décrivez l’application que vous voulez"
        longueurMax={LONGUEUR_AVEC_DOCUMENT}
        note={noteJoint === '' ? undefined : noteJoint}
        joindre={(fichier) => {
          void (async () => {
            const format = formatDuFichier(fichier.name, fichier.type);
            if (format === 'refuse') {
              setNoteJoint(raisonDuRefus(fichier.name));
              return;
            }
            setNoteJoint(`Lecture de « ${fichier.name} »…`);
            try {
              if (format === 'texte') {
                const texte = (await fichier.text()).trim();
                if (texte === '') {
                  setNoteJoint('Ce fichier est vide.');
                  return;
                }
                setSaisie(texte);
                setNoteJoint(`« ${fichier.name} » lu. Relisez et corrigez avant d’envoyer.`);
                return;
              }
              // PDF : pdfjs n'est chargé QU'ICI, et dans le navigateur seul.
              const { extraireTexteDuPdf } = await import('@/lib/apps/extraction-pdf');
              const r = await extraireTexteDuPdf(await fichier.arrayBuffer());
              if (!r.ok) {
                setNoteJoint(r.raison === 'scan' ? MESSAGE_SCAN : `PDF illisible : ${r.detail}`);
                return;
              }
              setSaisie(r.texte);
              setNoteJoint(
                `« ${fichier.name} » lu — ${String(r.pages)} page(s). Relisez et corrigez avant d’envoyer.`,
              );
            } catch {
              setNoteJoint('Lecture impossible. Copiez-collez le contenu dans la zone de texte.');
            }
          })();
        }}
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
