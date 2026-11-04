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
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { IdentifiantsOeuvre, type EtatCompteOeuvre } from '@/components/apps/IdentifiantsOeuvre';
import { ApercuAppareil, Attente, Bulle, ChoixFermes, Composeur, Escalier,
  JournalGeneration } from './Conversation';
import {
  ETAPES_SUIVI,
  FOURCHETTE_DUREE,
  ecouleDepuis,
  ligneActivite,
  marcheDuSuivi,
  modeAsyncActif,
  generationDepuisUrl,
  memoriserGeneration,
  oublierGeneration,
  decisionDuSuivi,
} from '@/lib/apps/suivi-generation'
import { resumeDuJournal } from '@/lib/apps/journal-tirages';
import type { EtatGeneration } from '@/lib/apps/service-generations';
import type { EtatMagasin } from '@/lib/apps/exigences-magasin';
// DEPUIS LE MODULE PUR, JAMAIS DEPUIS LE JUGE : le juge lance un processus
// enfant (`node:child_process`) et ne peut pas entrer dans ce paquet.
import { proportionEprouvee } from '@/lib/apps/portee-epreuve';
import { moteurChoisi } from '@/lib/apps/interrupteur-moteur';
import {
  formatDuFichier,
  raisonDuRefus,
  LONGUEUR_AVEC_DOCUMENT,
  MESSAGE_SCAN,
} from '@/lib/apps/document-joint';
import { lireReponseQuiBat } from '@/lib/apps/flux-lignes';
import {
  DELAI_MAX_MS,
  MESSAGE_ILLISIBLE,
  messageDeLEchec,
  phraseAttente,
  retirerDernierEcho,
} from '@/lib/apps/attente-comprehension';
import Link from 'next/link';
import {
  CE_QUE_DECLARER_CHANGE,
  phraseTable,
  resumeEntites,
  type EntiteDeclaree,
} from '@/lib/apps/entites-declarees';

// ETAGE 4 — le drapeau : OFF (defaut), l'UX synchrone ci-dessous reste SEULE
// au monde ; le chemin async n'existe qu'arme consciemment. L'ecran ne fait
// que du polling de statut — il ne genere RIEN par lui-meme.
// ── LE SUIVI ASYNCHRONE APPARTIENT À L'ANCIEN MOTEUR, ET À LUI SEUL.
//
// DÉFAUT MESURÉ LE 2026-10-19. L'interrupteur n'était consulté qu'à UN
// endroit : l'envoi d'une demande. Au chargement, l'écran restaurait la
// dernière génération AIR — arrêtée depuis — et affichait son panneau de
// suivi, avec dessus un bouton « Relancer la génération ».
//
// Ce bouton appelle `travailleur.relancer(...)`. Coût mesuré d'une émission
// AIR complète : 8,46 $. Il est resté joignable pendant tout l'essai de
// l'autre architecture, contre la règle posée par le propriétaire.
//
// Le moteur direct ne produit AUCUNE génération asynchrone : il répond dans
// sa propre requête. Il n'y a donc rien à suivre, rien à restaurer, et
// aucune raison d'offrir de quoi relancer l'autre moteur.
const ASYNC =
  moteurChoisi(process.env.NEXT_PUBLIC_GENERATEUR_MOTEUR) === 'air' &&
  modeAsyncActif(process.env.NEXT_PUBLIC_GENERATION_ASYNC);

/**
 * QUEL MOTEUR CET ÉCRAN SERT (EP-276).
 *
 * Miroir PUBLIC de l'interrupteur serveur. Il décide seulement ce que
 * l'écran montre et quelle route il appelle. L'AUTORITÉ RESTE AU SERVEUR,
 * qui revérifie et refuse net (409) si ce miroir a dérivé — un miroir ne
 * peut donc pas ouvrir une porte à lui seul.
 */
const MOTEUR = moteurChoisi(process.env.NEXT_PUBLIC_GENERATEUR_MOTEUR);

type Question = { code: string; destination: string; texte: string };
// ── LOT 5 — LA QUESTION DU PRE-VOL, ET CE QUI LA DISTINGUE.
//
// Une `Question` projette un diagnostic : elle n'existe qu'APRES que P0 a lu,
// donc apres la depense. Une `QuestionAvant` precede tout juge — et `choix`
// la rend cliquable, comme les trois boutons radio de Replit a treize
// secondes. `suggestion` voyage A PART du texte : l'ecran la montre comme un
// defaut modifiable, pas comme une phrase a lire.
type Choix = { valeur: string; texte: string };
type QuestionAvant = {
  code: string;
  structure: string;
  texte: string;
  choix?: Choix[];
  suggestion?: string;
};
type Configuration = {
  encaissement?: string;
  currency?: string;
  logistiqueParLeMarchand?: boolean;
  numeroEncaisseur?: string;
};
/** Le code de l'echappatoire. Il ne part JAMAIS au module d'elicitation : ce
 *  n'est pas une question de configuration, c'est du texte libre qui entre
 *  dans le brief avant son scellement. */
const AUTRE_CHOSE = 'AUTRE_CHOSE';
type Intention = {
  brief: string;
  addendum: { rang: number; code: string; destination: string; question: string; reponse: string }[];
};

type Message =
  | { role: 'moi'; texte: string }
  | { role: 'deribfy'; compris: string[]; parIA: boolean; note?: string }
  // UNE QUESTION EST UN TOUR A PART ENTIERE, pas une note en bas d'un resultat.
  | { role: 'question'; questions: Question[]; avertissement?: string }
  // LOT 5 — UN TOUR GRATUIT, ET L'ECRAN LE DIT.
  | { role: 'avant'; question: QuestionAvant }
  // UN REFUS DE CONSTRUIRE EST UN TOUR A PART, pas une note sous un resultat.
  | { role: 'incompris'; raison: string }
  | { role: 'notre_faute'; raison: string }
  | { role: 'arrete'; raison: string };

/**
 * LA DEVISE PAR DÉFAUT.
 *
 * Le franc CFA : la plateforme sert d'abord le Tchad et l'Afrique
 * centrale. Ce n'est pas une déduction sur la personne — ces déductions-là
 * restent interdites — c'est un DÉFAUT annoncé, qui se change dans
 * l'atelier.
 */
const DEVISE_PAR_DEFAUT = 'XAF'

export default function ConversationApplication({
  demandeInitiale = '',
  onRetour,
}: {
  /** Ce que la personne venait d'écrire avant l'aiguillage. Elle ne le
   *  retape pas : l'écran a changé dans son dos, pas elle d'avis. */
  demandeInitiale?: string
  onRetour: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [travail, setTravail] = useState<'' | 'apercu' | 'archive' | 'publication'>('');
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
  // ── LOT 5 — L'ETAT DU PRE-VOL, CHEZ LE CLIENT comme l'addendum d'EP-136.
  //
  // Le serveur ne garde rien : les reponses repartent a chaque tour, et le
  // dialogue survit a un rechargement de page. Rien n'est cru sur parole pour
  // autant — une valeur hors de la table des choix ne compte pas comme une
  // reponse, et sa question revient.
  const [reponsesAvant, setReponsesAvant] = useState<Record<string, unknown>>({});
  const [questionsIA, setQuestionsIA] = useState<
    { code: string; texte: string; choix: string[] }[]
  >([]);
  /**
   * LES DONNÉES QUE LE MODÈLE A DÉCLARÉES, et ce qui a été écarté.
   *
   * Lues au pré-vol, montrées avant de payer, transmises à la génération.
   * Cet écran ne les édite pas : un éditeur de schéma serait un écran de
   * plus, et la personne a mieux — elle peut REFUSER l'ensemble et
   * reformuler sa demande.
   */
  const [entites, setEntites] = useState<EntiteDeclaree[]>([]);
  const [entitesRefusees, setEntitesRefusees] = useState<{ quoi: string; motif: string }[]>([]);
  const [questionAvant, setQuestionAvant] = useState<QuestionAvant | null>(null);
  const [configuration, setConfiguration] = useState<Configuration>({});
  const [autreChose, setAutreChose] = useState('');
  /** La demande d'origine, gardee pendant le pre-vol : le brief n'est compose
   *  qu'une fois toutes les reponses obtenues. */
  const [demandeEnAttente, setDemandeEnAttente] = useState('');
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
  // ── LE LIEN PUBLIÉ (2026-10-18). Il ne vient JAMAIS d'ici : on l'obtient de
  // la route, qui seule connaît le jeton. L'écran ne fabrique pas d'adresse —
  // il montre celle qui existe, et seulement après qu'elle existe.
  const [lienPublie, setLienPublie] = useState('');
  /**
   * LES IDENTIFIANTS DE L'APPLICATION PUBLIÉE — rendus UNE FOIS.
   *
   * Mesuré le 2026-11-04 : `/publier` rend `compte.motDePasse` À LA
   * CRÉATION, et `null` à chaque republication. Ne lire que `lien` le
   * jetait — et aucun chemin ne le relit, le domaine des comptes d'œuvre
   * ne recevant aucun courriel. La seule issue était « Refaire le mot de
   * passe » dans l'atelier, et encore fallait-il savoir qu'il en existait
   * un.
   *
   * `null` signifie « cette application n'a pas de données » : la
   * publication ne crée un compte que pour une œuvre qui a des tables.
   */
  const [compteOeuvre, setCompteOeuvre] = useState<EtatCompteOeuvre | null>(null);
  const [lienCopie, setLienCopie] = useState(false);
  // ── CE QUE LES MAGASINS EXIGENT ENCORE. Mesuré sur le projet natif
  // RÉELLEMENT émis, jamais une liste écrite ici : une liste dérive le jour
  // où le moteur gagne une icône, et l'écran réclamerait ce qui est déjà là.
  const [exigences, setExigences] = useState<EtatMagasin | null>(null);
  // « Déjà demandé » est une MÉMOIRE, pas un état : rien à l'écran n'en
  // dépend. Une ref, donc — et elle ne devient pas une dépendance du sondage,
  // ce qui éviterait de recréer la minuterie à chaque réponse.
  const exigencesDemandees = useRef(false);

  /**
   * OUBLIER LA PUBLICATION PRÉCÉDENTE.
   *
   * Sans ce geste, démarrer une application neuve laisserait à l'écran le
   * LIEN DE LA PRÉCÉDENTE et son panneau d'exigences. Quelqu'un l'enverrait,
   * et montrerait l'application de quelqu'un d'autre — ou la sienne, mais
   * pas celle qu'il croit.
   *
   * Une seule fonction pour les trois points de remise à zéro : trois copies
   * divergent, et celle qu'on oublie est exactement celle qui fait le dégât.
   */
  // `useCallback` et pas une fonction nue : MESURÉ le 2026-10-18 — ajouter
  // une fonction de plus au corps du composant fait basculer l'analyse du
  // compilateur React, qui se met alors à voir un `Date.now()` d'un
  // gestionnaire d'événement comme un appel de rendu. Une identité stable
  // lève l'ambiguïté sans toucher à une ligne du code voisin.
  const oublierLaPublication = useCallback(() => {
    setLienPublie('');
    setLienCopie(false);
    setExigences(null);
    exigencesDemandees.current = false;
  }, []);
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
        const issue = decisionDuSuivi(res.status);
        if (issue === 'lire') {
          const e = (await res.json()) as EtatGeneration;
          setMaintenant(Date.now());
          setEtatGen(e);
          // ── LES EXIGENCES DES MAGASINS : UNE SEULE FOIS, A L'ARRIVEE.
          //
          // Elles exigent de COMPILER le projet natif — c'est la seule facon
          // de lire le vrai `app.json` plutot qu'une liste ecrite a cote. On
          // ne paie donc ce calcul qu'une fois, au passage a « livree », et
          // jamais pendant le sondage : la garde `exigences === null` le tient.
          if (e.statut === 'livree' && !exigencesDemandees.current) {
            exigencesDemandees.current = true;
            void (async () => {
              try {
                const r = await fetch(
                  `/api/generateur/publier?id=${encodeURIComponent(generationId)}`,
                  { headers: { Authorization: `Bearer ${await jeton()}` } },
                );
                if (!r.ok || !vivant) return;
                setExigences((await r.json()) as EtatMagasin);
              } catch {
                // Le panneau est un COMPLÉMENT : s'il ne vient pas, le
                // téléchargement et la publication web marchent quand même.
              }
            })();
          }
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
        } else if (issue === 'abandonner') {
          // ── UN 404 N'EST PAS UNE PANNE PASSAGERE (defaut 2026-10-19).
          //
          // SIGNALE PAR LE PROPRIETAIRE, capture a l'appui : « je n'ai meme
          // pas un Button pour annuler ». Le bouton Arreter existait, teste
          // et correctement conditionne sur en_cours/en_attente — mais il
          // pend a `etatGen`, et le `if (res.ok)` n'avait PAS d'`else`.
          //
          // Sur un 404 (la ligne n'existe plus pour ce proprietaire), rien
          // n'etait fait : pas d'etat, donc AUCUN bouton ; pas de message,
          // donc aucune explication ; et on redemandait la meme ligne
          // inexistante toutes les 5 s, indefiniment. L'ecran restait
          // l'otage d'un identifiant perime garde dans le stockage, sans
          // aucun geste possible pour s'en defaire.
          //
          // `oublierGeneration` existait depuis le debut, exportee et
          // appelee NULLE PART : la sortie de secours etait ecrite, pas
          // branchee. On la branche, et on ne reprogramme pas de lecture —
          // une ligne absente ne reapparait pas.
          //
          // On ne traite QUE le 404. Un 401 (jeton expire) ou un 5xx sont
          // passagers : ils continuent de reessayer, et c'est juste.
          oublierGeneration(window.localStorage);
          window.history.replaceState(null, '', window.location.pathname);
          oublierLaPublication();
          setEtatGen(null);
          setGenerationId(null);
          setAvis('Cette génération n’existe plus. L’écran est libéré — vous pouvez en lancer une nouvelle.');
          return;
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
    // `oublierLaPublication` est un useCallback a dependances VIDES (voir le
    // commentaire du 2026-10-18 a sa definition) : son identite ne change
    // jamais, donc la citer ici ne relance pas le suivi. C'est la raison
    // pour laquelle cette stabilite avait deja ete payee.
  }, [generationId, oublierLaPublication]);

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
        oublierLaPublication();
        window.history.replaceState(null, '', memoriserGeneration(d.id, window.localStorage));
        setGenerationId(d.id);
        return;
      }
      // L'etat est efface : le prochain battement du suivi lira la ligne
      // redevenue « en attente », et l'escalier repartira de lui-meme.
      setEtatGen(null);
      oublierLaPublication();
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

  /**
   * PUBLIER — ET LE BOUTON NE MENT PAS SUR CE QU'IL FAIT.
   *
   * Il donne une ADRESSE WEB. Il ne dépose rien sur Google Play ni sur l'App
   * Store : ces deux-là exigent de l'argent et des identifiants, et le
   * panneau juste en dessous dit lesquels. Un bouton qui promettrait les
   * magasins serait pire que pas de bouton — quelqu'un cliquerait en croyant
   * tenir une publication.
   *
   * Republier est sans danger : la route rend le MÊME lien.
   */
  const publier = async () => {
    if (generationId === null) return;
    setTravail('publication');
    try {
      const res = await fetch(`/api/generateur/publier?id=${encodeURIComponent(generationId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await jeton()}` },
      });
      const d = (await res.json().catch(() => ({}))) as {
        lien?: string;
        error?: string;
        compte?: { adresse?: string; motDePasse?: string | null };
      };
      if (!res.ok || typeof d.lien !== 'string') {
        setAvis(String(d.error ?? 'Publication impossible.'));
        return;
      }
      setLienPublie(d.lien);
      setCompteOeuvre(d.compte ?? null);
      setLienCopie(false);
    } catch {
      setAvis('Publication impossible.');
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


  /**
   * LOT 5 — LE PRE-VOL : ON DEMANDE PENDANT QUE CA COUTE ENCORE 0,00 $.
   *
   * ── CE QUI A COMMANDE CETTE FONCTION, ET SON PRIX.
   *
   * Douze generations, ~29 $, aucune application vue. L'ordre reel etait :
   * depenser → faire juger → questionner. Replit fait l'inverse, chronometre
   * le 2026-10-16 : treize secondes entre la phrase et la premiere question.
   *
   * Elle appelle `/avant`, la seule route du generateur qui ne peut rien
   * couter : elle n'importe ni client, ni cle, ni moteur — EP-257 le mesure
   * sur sa source. Tant qu'elle rend une question, RIEN n'est depense.
   *
   * ── L'ECHAPPATOIRE EST LE DERNIER TOUR, ET ELLE N'EST PAS DECORATIVE.
   *
   * Chez Replit, l'option cochee disait « releves seulement » ; le champ
   * libre a transforme l'application en reconnaissance d'image. Les trois
   * options n'etaient PAS les bonnes. On la pose donc toujours, apres les
   * choix fermes — et elle est passable : « non » suffit a l'ignorer.
   */
  /**
   * LA DEVISE, DÉDUITE — et rien n'est demandé pour l'obtenir.
   *
   * ── CE QUI REMPLACE LE PRÉ-VOL (2026-11-04).
   *
   * `lire-brief` lit déjà la demande et en tire le pays QUAND IL Y EST
   * ÉCRIT. `/avant` sait traduire ce pays en code ISO. On garde ces deux
   * gestes — ils ne coûtent rien à la personne — et on JETTE les questions
   * qu'ils renvoyaient.
   *
   * SANS PAYS : le franc CFA. Ce n'est pas une devinette sur la personne,
   * c'est un DÉFAUT, et un défaut s'annonce et se change. Il se corrige
   * dans l'atelier en deux secondes, comme le reste.
   *
   * ET SI LES DEUX APPELS ÉCHOUENT, on construit quand même avec le
   * défaut : une déduction ratée ne doit jamais empêcher de construire.
   */
  /**
   * LA DEMANDE QUI VIENT DE L'AIGUILLAGE PART TOUTE SEULE.
   *
   * Elle a déjà été écrite une fois. La faire retaper parce qu'on a changé
   * d'écran dans son dos est exactement ce qu'on vient de réparer — la
   * garder affichée sans rien en faire le serait tout autant.
   *
   * UNE SEULE FOIS : le drapeau empêche qu'un nouveau rendu relance une
   * génération payante. C'est la précaution qui manque le plus souvent aux
   * effets de ce genre.
   */
  const deduireConfiguration = async (
    texte: string,
  ): Promise<{ config: Configuration; entites: EntiteDeclaree[] }> => {
    try {
      const rl = await fetch('/api/generateur/lire-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ demande: texte }),
      });
      const dl = (await rl.json().catch(() => ({}))) as {
        deduites?: Record<string, unknown>;
        entites?: EntiteDeclaree[];
        entitesRefusees?: { quoi: string; motif: string }[];
      };
      setEntites(dl.entites ?? []);
      setEntitesRefusees(dl.entitesRefusees ?? []);
      const res = await fetch('/api/generateur/avant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
        body: JSON.stringify({ reponses: dl.deduites ?? {} }),
      });
      // ── LES QUESTIONS SONT IGNORÉES, ET C'EST LE CŒUR DU CHANGEMENT.
      //
      // `/avant` en renvoie toujours : la table ne sait pas se taire. On ne
      // les lit plus. Seule la configuration nous intéresse.
      const d = (await res.json().catch(() => ({}))) as { configuration?: Configuration };
      const c = d.configuration ?? {};
      // ── LES ENTITÉS SONT RENDUES, PAS SEULEMENT POSÉES DANS L'ÉTAT.
      //
      // DÉFAUT MESURÉ LE 2026-11-04 : l'œuvre `8a2735f0` est partie avec
      // « AUCUNE DONNÉE DÉCLARÉE » alors que la lecture du brief avait
      // trouvé une table. `construire` lit `entites` dans l'état React, et
      // cette fonction l'écrivait JUSTE AVANT l'appel — React n'applique
      // l'état qu'au rendu SUIVANT.
      //
      // C'est exactement l'avertissement écrit dans ce fichier deux
      // fonctions plus haut, et je l'ai rejoué. « Ce qui doit être juste
      // au moment de l'appel VOYAGE ; l'état ne sert plus qu'à
      // l'affichage. »
      const lues = dl.entites ?? [];
      return {
        config: c.currency === undefined ? { ...c, currency: DEVISE_PAR_DEFAUT } : c,
        entites: lues,
      };
    } catch {
      return { config: { currency: DEVISE_PAR_DEFAUT }, entites: [] };
    }
  };

  /**
   * LE PRÉ-VOL NE POSE PLUS AUCUNE QUESTION (2026-11-04).
   *
   * ── LA DÉCISION, DANS LES MOTS DU PROPRIÉTAIRE.
   *
   *   « ON ARRÊTE DE RENDRE LES QUESTIONS MEILLEURES. ON LES SUPPRIME. »
   *   « Une hypothèse ratée se corrige. Une interrogation avant d'avoir
   *     rien montré fait fuir. »
   *
   * Trois tours de suite on a amélioré leur pertinence. Ce n'était pas la
   * demande.
   *
   * ── POURQUOI CETTE FONCTION SUBSISTE, VIDÉE.
   *
   * Elle est appelée par les gestionnaires de réponse, qui ne peuvent plus
   * se déclencher puisqu'aucune question n'est affichée. La supprimer
   * demanderait de démonter ces gestionnaires et leurs cliquets dans le
   * même geste. Elle REFUSE donc de poser quoi que ce soit, et construit —
   * un chemin mort qu'on laisse vivant redevient vivant au changement
   * suivant.
   */
  const lancerPreVolSupprime = async (
    demande: string,
    _reponses: Record<string, unknown>,
    autre: string,
  ) => {
    const lu = await deduireConfiguration(demande);
    await construire({
      texte: demande,
      autre,
      config: lu.config,
      entites: lu.entites,
      dejaAffiche: true,
    });
  };

  // ── `lancerPreVolAncien` A ÉTÉ SUPPRIMÉ (2026-11-04).
  //
  // Il portait encore les trois chemins qui AFFICHENT une question :
  // la suivante de la table, l'échappatoire, et celles du modèle. Plus
  // aucun appelant ne l'atteignait — et c'est exactement ce qui rend ce
  // genre de code dangereux. EP-335 ② compte les `setQuestionAvant(q)` :
  // il a refusé de passer tant que ces trois-là existaient, et il avait
  // raison. Du code mort qui garde le comportement est une arme chargée.
  /** Une reponse a un CHOIX FERME — un clic, pas une phrase a interpreter. */
  const choisirAvant = (valeur: string) => { void repondreAvant(valeur); };

  /**
   * CE QUE DEVIENT LA RÉPONSE À UNE QUESTION DU MODÈLE.
   *
   * `briefAvec` ne connaît que les codes de la table d'élicitation : un
   * code `IA_*` y serait IGNORÉ. Une question posée dont la réponse se perd
   * est pire que pas de question — c'est le défaut nommé ailleurs dans ce
   * fichier, « une réponse récoltée et jetée ».
   *
   * Elles rejoignent donc le brief par le seul chemin qui accepte du texte
   * libre : l'échappatoire. Question et réponse, dans les mots qui ont été
   * lus et cliqués.
   */
  const avecReponseIA = (code: string, texte: string, reponse: string): string => {
    if (!code.startsWith('IA_')) return autreChose;
    const ligne = `${texte} → ${reponse}`;
    return autreChose === '' ? ligne : `${autreChose}\n${ligne}`;
  };

  const repondreAvant = async (valeur: string) => {
    const code = questionAvant?.code;
    if (enCours || code === undefined) return;
    const choisi = questionAvant?.choix?.find((c) => c.valeur === valeur);
    const lu = choisi?.texte ?? valeur;
    setMessages((m) => [...m, { role: 'moi', texte: lu }]);
    const suite = { ...reponsesAvant, [code]: valeur };
    setReponsesAvant(suite);
    const autre = avecReponseIA(code, questionAvant?.texte ?? '', lu);
    if (autre !== autreChose) setAutreChose(autre);
    await lancerPreVolSupprime(demandeEnAttente, suite, autre);
  };

  /** Un tour : soit une premiere demande, soit une reponse a la question ouverte. */
  const envoyer = async () => {
    const texte = saisie.trim();
    if (texte === '' || enCours) return;

    // ══════════════════════════════════════════════════════════════════
    // LOT 5 — LA PORTE GRATUITE PASSE AVANT LA PORTE CHERE.
    //
    // DEUX CAS, ET AUCUN NE DEPENSE :
    //   ① une question du pre-vol est ouverte → ce qu'on ecrit EST sa reponse
    //      (l'echappatoire comprise, qui n'est pas une question de
    //      configuration et ne part jamais au module d'elicitation) ;
    //   ② premier message, hors question projetee → on pose le pre-vol.
    //
    // `forcer` est la sortie : une fois tout repondu, `lancerPreVol` rappelle
    // cette fonction et la porte chere s'ouvre. Sans ce drapeau, le pre-vol
    // se reposerait indefiniment et rien ne se construirait jamais.
    {
      if (questionAvant !== null) {
        setSaisie('');
        setMessages((m) => [...m, { role: 'moi', texte }]);
        const suite = { ...reponsesAvant, [questionAvant.code]: texte };
        setReponsesAvant(suite);
        // Une question du modèle répondue au clavier suit le même chemin
        // qu'un clic : sinon la moitié des réponses se perdrait.
        if (questionAvant.code.startsWith('IA_')) {
          const autre = avecReponseIA(questionAvant.code, questionAvant.texte, texte);
          setAutreChose(autre);
          setSaisie('');
          await lancerPreVolSupprime(demandeEnAttente, suite, autre);
          return;
        }
        if (questionAvant.code === AUTRE_CHOSE) {
          // « non » n'est pas une precision : on l'ecarte du brief plutot que
          // de faire lire a P0 une phrase qui ne dit rien.
          const vide = /^(non|rien|aucun[e]?)\.?$/iu.test(texte.trim());
          const retenu = vide ? '' : texte;
          setAutreChose(retenu);
          await lancerPreVolSupprime(demandeEnAttente, suite, retenu);
          return;
        }
        await lancerPreVolSupprime(demandeEnAttente, suite, autreChose);
        return;
      }
      if (!enQuestion && intention === null) {
        setSaisie('');
        setMessages((m) => [...m, { role: 'moi', texte }]);
        setDemandeEnAttente(texte);
        setReponsesAvant({});
        setAutreChose('');
        // ── ZÉRO QUESTION AVANT DE CONSTRUIRE (décision du 2026-11-04).
        //
        // Pendant trois tours on a rendu les questions du pré-vol plus
        // pertinentes. Le propriétaire ne demandait pas des questions
        // pertinentes : il demandait qu'il n'y en ait AUCUNE.
        //
        //   « Une hypothèse ratée se corrige. Une interrogation avant
        //     d'avoir rien montré fait fuir. »
        //
        // La devise se DÉDUIT — pays nommé dans la demande, sinon le franc
        // CFA — et se change dans l'atelier en deux secondes, comme le
        // reste. `deduireConfiguration` ne pose rien et n'attend personne.
        const lu = await deduireConfiguration(texte);
        await construire({
          texte,
          autre: '',
          config: lu.config,
          entites: lu.entites,
          dejaAffiche: false,
        });
        return;
      }
    }
    // ══════════════════════════════════════════════════════════════════
    // RIEN A DEMANDER AVANT : on passe la porte chere.
    await construire({ texte });
  };

  /**
   * LE CHEMIN PAYANT, EXTRAIT DE LA PORTE QUI LE GARDE (LOT 5).
   *
   * ── POURQUOI CETTE EXTRACTION, ET CE QU'ELLE A CORRIGE.
   *
   * J'avais d'abord fait rappeler `envoyer` par `lancerPreVol`. Le cycle
   * `envoyer ↔ lancerPreVol` a fait perdre a `react-hooks/purity` la trace
   * du gestionnaire d'evenement : il a classe `Date.now()` comme un appel de
   * RENDU et refuse le fichier. Le fichier lintait propre avant moi — la
   * faute etait la mienne, et la desactiver aurait masque un vrai signal.
   *
   * La bonne correction est cette separation, et elle est meilleure en soi :
   * `envoyer` est la PORTE — elle decide si l'on depense. `construire` est le
   * chemin qui DEPENSE. Deux responsabilites, deux fonctions, aucun cycle.
   */
  const construire = async (opts: {
    texte: string;
    /** L'echappatoire et la configuration sont PASSEES, jamais relues : React
     *  n'applique l'etat qu'au rendu suivant, et les lire ici les prendrait
     *  vides d'un tour. */
    autre?: string;
    config?: Configuration;
    /** `true` quand la porte du pre-vol a deja affiche la demande. */
    dejaAffiche?: boolean;
    /** Le nom du produit, PASSE et jamais relu — meme raison que `autre`. */
    nom?: string;
    /** LES ENTITÉS AUSSI, et pour exactement la même raison.
     *  Mesuré le 2026-11-04 : lues dans l'état, elles partaient VIDES —
     *  l'œuvre `8a2735f0` a été livrée en « AUCUNE DONNÉE DÉCLARÉE »
     *  alors que la lecture du brief avait trouvé une table. */
    entites?: EntiteDeclaree[];
  }) => {
    const texte = opts.texte;
    // La note du document joint est MISE DE COTE avant d'etre effacee : si le
    // tour echoue, elle doit revenir avec le texte.
    const noteAvant = noteJoint;
    setNoteJoint('');
    setSaisie('');
    setAvis('');
    // LA PORTE DU PRE-VOL L'A DEJA AFFICHE : le re-ajouter montrerait la
    // demande deux fois, une fois avant les questions et une fois apres.
    if (opts.dejaAffiche !== true) setMessages((m) => [...m, { role: 'moi', texte }]);
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
        : {
            demande: texte,
            // ── LOT 5 — CE QUE LE PRE-VOL A RECOLTE VOYAGE AVEC LA DEMANDE.
            //
            // `comprendre` compose le brief UNE FOIS avec `briefAvec`, puis
            // le scelle. Sans ces deux champs, on aurait fait repondre
            // quelqu'un pour rien — et c'est le defaut exact que le LOT 3 a
            // ferme ailleurs : une reponse recoltee et jetee.
            ...(opts.autre !== undefined && opts.autre !== '' ? { autreChose: opts.autre } : {}),
            ...(opts.config !== undefined && Object.keys(opts.config).length > 0
              ? { configuration: opts.config }
              : {}),
          };

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
      // ── L'AUTRE ARCHITECTURE, QUAND L'INTERRUPTEUR EST DESSUS (EP-276).
      //
      // D-001 avait examiné DEUX chemins et retenu celui du document. L'autre
      // — l'IA écrit le code — est ici, MIS À L'ÉPREUVE, pas choisi. Un seul
      // est atteignable à la fois : exigence du propriétaire, et elle est
      // juste — treize tirs ont déjà été payés sans pouvoir attribuer un
      // résultat après coup.
      //
      // IL EST SYNCHRONE, et c'est délibéré : le chemin du document dure
      // 26 minutes (mesuré le 2026-10-18) et a donc besoin d'une file et de
      // tranches reprenables. Celui-ci vise la minute. Une machinerie
      // d'attente pour un travail qui tient dans une requête serait une
      // machinerie de trop.
      if (MOTEUR === 'direct') {
        const res = await fetch('/api/generateur/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
          // LES ENTITÉS VOYAGENT : sans elles, `schema.sql` repartirait en
          // « aucune donnée déclarée » alors que la lecture du brief en a
          // trouvé. Le pré-vol les a montrées, la personne n'a pas refusé.
          body: JSON.stringify({
            demande: texte,
            configuration,
            nom: opts.nom ?? '',
            entites: opts.entites ?? entites,
          }),
          signal: avorteur.signal,
        });
        // ── ON LIT UN FLUX QUI BAT, PAS UN JSON D'UN BLOC.
        //
        // MESURÉ EN PRODUCTION LE 2026-10-19 : la route a travaillé
        // 255 secondes, abouti, et écrit sa ligne — pendant que cet écran
        // affichait déjà « Lecture impossible ». La connexion, restée sans
        // un octet plus de quatre minutes, avait été fermée par une couche
        // intermédiaire. La route émet désormais un battement ; `res.json()`
        // s'étranglerait sur ces lignes vides.
        const d =
          (await lireReponseQuiBat<{
            ok?: boolean; html?: string; motif?: string; error?: string;
            tours?: unknown[]; dureeMs?: number;
            jetons?: { fichier: string; reference: string }[];
            execution?: { monteDansSimulateur: boolean; indisponible?: string; ecransVisites?: number; ecransDecouverts?: number; ecransDistincts?: number; erreurs: { quoi: string; message: string }[] };
            persistance?: { table: string; lue: boolean; ecrite: boolean }[];
            vivacite?: { fichier: string; manque: string }[];
            couverture?: {
              exigences?: { exigence: string; statut: string }[];
              absentes?: { exigence: string; cahier: number }[];
            };
          }>(res).catch(() => null)) ?? {};
        if (!res.ok || d.ok !== true || typeof d.html !== 'string') {
          rendreLaMain(texte, noteAvant);
          setAvis(String(d.error ?? d.motif ?? MESSAGE_ILLISIBLE));
          return;
        }
        // L'APPLICATION EST LÀ TOUT DE SUITE. On la montre dans le cadre
        // isolé qui sert déjà l'aperçu — même bac à sable, mêmes garanties.
        setApercu(d.html);
        // ON RÉUTILISE LA FORME EXISTANTE `deribfy` plutôt que d'en inventer
        // une : sept formes de message suffisent, et une huitième obligerait
        // chaque endroit qui les lit à apprendre un cas de plus.
        setMessages((m) => [
          ...m,
          {
            role: 'deribfy',
            parIA: true,
            compris: [
              `Votre application est prête en ${String(Math.round((d.dureeMs ?? 0) / 1000))} secondes` +
                ` (${String(d.tours?.length ?? 1)} essai(s)).`,
              ...(() => {
                const ex = d.couverture?.exigences ?? [];
                const absentes = d.couverture?.absentes ?? [];
                const morts = d.vivacite ?? [];
                const lignes: string[] = [];
                if (ex.length > 0) {
                  const couvertes = ex.filter((x) => x.statut === 'couverte').length;
                  const declarees = ex.filter((x) => x.statut === 'declaree-hors-perimetre');
                  lignes.push(
                    `Couverture du cahier : ${String(couvertes)}/${String(ex.length)} exigences couvertes` +
                      (declarees.length > 0
                        ? `, ${String(declarees.length)} déclarée(s) hors périmètre (${declarees.map((x) => x.exigence).join(', ')})`
                        : '') +
                      '.',
                  );
                }
                // ── CE QUI NE SE CONSERVE PAS, DIT À LA LIVRAISON.
                //
                // C'est le moment où la personne décide de garder l'œuvre ou
                // de la faire corriger. Le verdict voyageait dans la réponse
                // depuis le 2026-11-03 et AUCUN écran ne le lisait — une
                // pièce détachée de plus, sur le seul défaut dont la
                // conséquence tombe après la livraison.
                const enMemoire = d.persistance ?? [];
                if (enMemoire.length > 0) {
                  lignes.push(
                    `⚠ Données NON CONSERVÉES : ${enMemoire
                      .map(
                        (x) =>
                          `${x.table} (${x.lue ? 'lue, jamais écrite' : x.ecrite ? 'écrite, jamais lue' : 'ni lue ni écrite'})`,
                      )
                      .join(', ')} — ce qui y est saisi disparaîtra au rechargement.`,
                  );
                }
                if (absentes.length > 0) {
                  lignes.push(
                    `⚠ Non couvert et non déclaré : ${absentes.map((x) => x.exigence).join(', ')} — à exiger ou à accepter en connaissance.`,
                  );
                }
                const exec = d.execution;
                if (exec !== undefined) {
                  lignes.push(
                    exec.indisponible !== undefined
                      ? '⚠ Le juge de montage n’a pas pu s’exécuter : cette application n’a PAS été éprouvée.'
                      : exec.monteDansSimulateur
                        ? (() => {
                            const vus = exec.ecransVisites ?? 0;
                            const trouves = Math.max(exec.ecransDecouverts ?? vus, vus);
                            // LE DÉNOMINATEUR SE DIT TOUJOURS : un rapport qui
                            // ne le donne que lorsqu'il est mauvais est un
                            // rapport qu'on apprend à ne plus lire.
                            // LA PROPORTION, PAS LA PAIRE SEULE : « 24 » se
                            // lit comme beaucoup, « 21 % » se lit comme ce
                            // que c'est. Calculée par `proportionEprouvee`,
                            // une seule source pour les trois affichages.
                            return trouves > vus
                              ? `⚠ Montée dans un simulateur, PARTIELLEMENT éprouvée : ${proportionEprouvee(vus, trouves, exec.ecransDistincts ?? 0)}. NON VÉRIFIÉE DANS UN NAVIGATEUR.`
                              : `Montée dans un simulateur : ${proportionEprouvee(vus, trouves, exec.ecransDistincts ?? 0)}. NON VÉRIFIÉE DANS UN NAVIGATEUR.`;
                          })()
                        : `⚠ L’application ne se monte pas (simulateur) : ${exec.erreurs[0]?.message ?? 'cause inconnue'}.`,
                  );
                }
                const jetonsMorts = d.jetons ?? [];
                if (jetonsMorts.length > 0) {
                  lignes.push(
                    `⚠ ${String(jetonsMorts.length)} référence(s) à des éléments inexistants (${[...new Set(jetonsMorts.map((x) => x.reference))].slice(0, 4).join(', ')}) — l’application peut s’arrêter au démarrage.`,
                  );
                }
                if (morts.length > 0) {
                  lignes.push(
                    `⚠ ${String(morts.length)} contrôle(s) sans action réelle (${[...new Set(morts.map((x) => x.fichier))].slice(0, 3).join(', ')}).`,
                  );
                }
                return lignes;
              })(),
            ],
          },
        ]);
        return;
      }

      if (ASYNC) {
        const res = await fetch('/api/generateur/deposer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
          // PLUS DE LITTERAL ICI : c'est cette ligne qui a produit neuf cartes
          // « Application ». Le nom vient de la personne, et la route le
          // refuse s'il est vide — le trou se voit au lieu de se combler.
          body: JSON.stringify({ ...corps, nom: opts.nom ?? '' }),
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
        oublierLaPublication();
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
  const demarrage = useRef(false);
  useEffect(() => {
    if (demarrage.current || demandeInitiale.trim() === '') return;
    demarrage.current = true;
    void (async () => {
      const texte = demandeInitiale.trim();
      setMessages((m) => [...m, { role: 'moi', texte }]);
      const lu = await deduireConfiguration(texte);
      await construire({
        texte,
        autre: '',
        config: lu.config,
        entites: lu.entites,
        dejaAffiche: true,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandeInitiale]);

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
                <>
                  {/* ── LE JOURNAL, APRÈS LES MARCHES ET AVANT L'APERÇU.
                      Il répond à « que se passe-t-il ? » ; l'aperçu répond à
                      « à quoi ça ressemble ? ». La première question se pose
                      d'abord, et elle se posait sans réponse : le moteur
                      écrivait son journal depuis le 2026-10-15, et l'écran ne
                      le lisait pas. */}
                  <JournalGeneration
                    lignes={etatGen?.journal ?? []}
                    resume={resumeDuJournal(etatGen?.journal ?? [])}
                    competences={etatGen?.competences ?? []}
                  />
                  {apercuGen !== null ? (
                  <div className="mt-3">
                    {/* Le sandbox reste SANS `allow-same-origin` : l'app
                        tourne, elle ne lit rien du site hote. */}
                    <ApercuAppareil
                      titre={`Aperçu — il se précise à mesure que la génération avance${
                        etatGen?.apercuVersion !== apercuGen.version ? ' · mise à jour en cours…' : ''
                      }`}
                      srcDoc={apercuGen.html}
                      hauteur={360}
                    >
                    {/* ── LOT 7 — TELECHARGER CE QU'ON VOIT, SANS ATTENDRE LA FIN.
                        Tir reel du 2026-10-10 : 53 minutes, 16,03 $, et rien
                        de vu. L'acquis etait pourtant la, compilable — cet
                        apercu le PROUVE : il n'existe que parce que l'acquis
                        compile. La meme condition ouvre donc le
                        telechargement, sans rien recalculer.
                        LE NOM DU BOUTON NE MENT PAS : le zip s'appelle
                        « -PARTIEL » et sa note ouvre sur un avertissement. */}
                    <button
                      type="button"
                      onClick={() => { void telechargerLivraison(); }}
                      disabled={travail !== ''}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-sm text-slate-200 transition hover:border-[#FA5D1E]/50 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA5D1E] disabled:opacity-40"
                    >
                      {travail === 'archive'
                        ? 'Préparation…'
                        : 'Télécharger cette version partielle'}
                    </button>
                    </ApercuAppareil>
                  </div>
                  ) : undefined}
                </>
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
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => { void telechargerLivraison(); }}
                  className="text-sm underline text-white hover:text-[#FA5D1E]"
                >
                  Télécharger l’application (zip)
                </button>
                {/* ── PUBLIER : LE BOUTON NE PROMET QUE CE QU'IL FAIT.
                    Il donne une ADRESSE WEB. Il ne dépose rien sur Google Play
                    ni sur l'App Store — le panneau en dessous dit ce que
                    celles-là exigent encore. Un bouton « Publier » tout court
                    laisserait croire aux magasins. */}
                <button
                  type="button"
                  onClick={() => { void publier(); }}
                  disabled={travail === 'publication'}
                  className="px-4 py-2 rounded-full text-sm bg-[#FA5D1E] text-white hover:brightness-110 transition disabled:opacity-40"
                >
                  {travail === 'publication'
                    ? 'Publication…'
                    : lienPublie === ''
                      ? 'Publier sur le web'
                      : 'Republier'}
                </button>
              </div>

              {lienPublie !== '' && (
                <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  {/* ── CETTE PHRASE AFFIRMAIT UN ÉTAT DU PRODUIT, EN DUR.
                      « il n'y a pas besoin de compte pour l'ouvrir » est FAUX
                      dès que l'application a des données : la porte ne répond
                      qu'aux requêtes connectées — la clé publique seule reçoit
                      `42501`.
                      Elle se déduit donc de la MÊME mesure que le bandeau de
                      la page : la publication ne crée un compte que pour une
                      œuvre qui a des tables. */}
                  <p className="text-xs text-slate-300">
                    {compteOeuvre === null
                      ? 'Votre application est en ligne. Envoyez ce lien à qui vous voulez — il n’y a pas besoin de compte pour l’ouvrir.'
                      : 'Votre application est en ligne. Elle garde ses données, et c’est pourquoi elle demande de se connecter : donnez les identifiants ci-dessous à qui doit y accéder.'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={lienPublie}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 truncate text-sm text-[#FA5D1E] underline"
                    >
                      {lienPublie}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(lienPublie).then(
                          () => { setLienCopie(true); },
                          () => { setLienCopie(false); },
                        );
                      }}
                      className="shrink-0 px-3 py-1 rounded-full text-xs bg-white/10 border border-white/15 text-white hover:bg-white/15 transition"
                    >
                      {lienCopie ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                  {/* Le lien ne change jamais : republier remplace le contenu,
                      pas l'adresse. Le dire évite qu'on renvoie un lien neuf
                      à chaque fois « pour être sûr ». */}
                  <p className="mt-2 text-xs text-slate-400">
                    {'Ce lien ne changera pas. Republiez autant de fois que vous voulez : les personnes qui l’ont déjà verront la nouvelle version.'}
                  </p>
                  {compteOeuvre !== null && (
                    <div className="mt-3">
                      <IdentifiantsOeuvre compte={compteOeuvre} />
                    </div>
                  )}
                </div>
              )}

              {/* ── ET LES MAGASINS, QUI NE SONT PAS GRATUITS.
                  Trois états, et la distinction EST la valeur du panneau :
                  ce qui est déjà là, ce qui manque CHEZ NOUS, et ce que
                  personne d'autre que lui ne peut fournir. Les confondre le
                  laisserait payer 25 $ pour découvrir qu'il manquait une
                  icône que NOUS n'émettons pas. */}
              {exigences !== null && (
                <details className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <summary className="cursor-pointer text-sm text-white">
                    {`Google Play et App Store : ${String(exigences.manquantsMoteur + exigences.manquantsProprietaire)} point(s) à régler`}
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {exigences.exigences.map((x) => (
                      <li key={x.quoi} className="text-xs">
                        <span className="text-slate-200">
                          {x.qui === 'satisfait' ? '✅ ' : x.qui === 'moteur' ? '🔧 ' : '👤 '}
                          {x.quoi}
                        </span>
                        {x.qui === 'moteur' && (
                          <span className="ml-1 text-slate-400">{'— à nous de le construire'}</span>
                        )}
                        {x.qui === 'proprietaire' && (
                          <span className="ml-1 text-slate-400">{'— à vous de le fournir'}</span>
                        )}
                        {x.pourquoi !== undefined && (
                          <p className="mt-0.5 text-slate-400">{x.pourquoi}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
      {apercu !== '' && (
        <div className="mb-4">
          <div className="flex items-center justify-end mb-1">
            <button type="button" onClick={() => setApercu('')} className="text-xs text-slate-400 hover:text-white underline">
              Fermer
            </button>
          </div>
          {/* `sandbox` SANS `allow-same-origin` : l'application tourne, et
              elle ne peut rien lire du site qui l'héberge. */}
          {/* ── LA HAUTEUR N'EST PLUS UN NOMBRE EN DUR.
              420 px coupaient l'application : sur les captures du
              2026-11-02 elle occupait un quart de la fenêtre et finissait
              tronquée en bas. Une mesure relative s'adapte à la fenêtre
              qu'on a vraiment. */}
          <ApercuAppareil titre="Votre application" srcDoc={apercu} hauteur="min(72vh, 900px)" />
          {/* ── ET LE CHEMIN NATUREL S'OUVRE ICI.
              Juger une application à côté du champ qui en crée une AUTRE
              est le défaut de fond de cet écran. On ne l'arrache pas — il
              sert encore à voir tout de suite ce qui vient de sortir — mais
              on nomme la suite, et elle mène à l'atelier. */}
          {generationId !== null && (
            <Link
              href={`/atelier/${generationId}`}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#FA5D1E] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FA5D1E]/90"
            >
              Ouvrir dans l’atelier — pour la voir en grand et la modifier
            </Link>
          )}
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
            {/* ── CE TEXTE PROMETTAIT CE QU'ON A SUPPRIMÉ LA VEILLE.
                 « vous posera des questions sur ce qu'il ne peut pas
                 deviner — rien n'est construit avant » : les questions de
                 pré-vol ont été retirées le 2026-11-03, et ce texte a
                 continué de les annoncer pendant une journée.
                 Il dit maintenant ce qui se passe RÉELLEMENT. */}
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-md mx-auto">
              Décrivez l’application que vous voulez, en vos mots. Deribfy la{' '}
              <strong className="text-slate-200">construit directement</strong> — aucune
              question avant, vous corrigez ensuite si besoin. Elle sort en{' '}
              <strong className="text-slate-200">application web</strong> — utilisable sur
              téléphone comme sur ordinateur, <strong className="text-slate-200">téléchargeable</strong>{' '}
              en projet complet et <strong className="text-slate-200">publiée à son adresse</strong>.
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
          ) : m.role === 'avant' ? (
            // ── LOT 5 — LE TOUR QUI NE COUTE RIEN, ET QUI LE DIT.
            //
            // Replit pose sa question a treize secondes, AVANT de coder. Ici
            // le prix est affiche : c'est l'information que personne n'avait
            // en depensant ~29 $ pour douze generations.
            <Bulle key={i} moi={false}>
              <span className="block text-xs text-emerald-400/90 mb-2">
                Avant de construire — et ceci ne coûte rien
              </span>
              <span className="block">{m.question.texte}</span>
              {m.question.suggestion !== undefined && (
                <span className="block mt-2 text-xs text-slate-400">
                  Par défaut, j’afficherai vos montants en {m.question.suggestion}. Vous
                  pouvez l’écrire autrement.
                </span>
              )}
              {/* ── CE QUI EST DEJA ACQUIS, SUR LA QUESTION EN COURS SEULEMENT.
                   Le porter sur une bulle ancienne montrerait l'etat d'AUJOURD'HUI
                   sous une question d'HIER. Et la devise est dite des que le pays
                   est repondu, au lieu d'attendre la fin du dialogue. */}
              {questionAvant?.code === m.question.code && configuration.currency !== undefined && (
                <span className="block mt-2 text-xs text-emerald-400/80">
                  Déjà noté : vos montants s’afficheront en {configuration.currency}.
                </span>
              )}
              {/* ── LES DONNÉES DÉCLARÉES, MONTRÉES AVANT QUE L'ARGENT PARTE.
                   (lot D1, 2026-11-02)

                   PAS D'ÉDITEUR, et c'est un choix. Un éditeur de schéma
                   serait un écran de plus, à construire et à maintenir, pour
                   un geste que personne ne fera deux fois. La personne a
                   mieux : elle VOIT les tables, et si ce n'est pas ça, elle
                   reformule sa demande — le refus est global, et il est
                   gratuit tant qu'on n'a pas construit.

                   ET LA PHRASE DIT CE QUE ÇA NE FAIT PAS ENCORE. Montrer des
                   tables sans dire que les écrans ne s'en servent pas
                   laisserait croire que l'application conserve déjà ; la
                   personne le découvrirait en rechargeant la page, après
                   avoir payé. */}
              {questionAvant?.code === m.question.code && entites.length > 0 && (
                <span className="mt-3 block rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="block text-xs font-semibold text-slate-200">
                    Ce que votre application devra conserver — {resumeEntites(entites)}
                  </span>
                  <span className="mt-1.5 block">
                    {entites.map((e) => (
                      <span key={e.id} className="block text-[11px] leading-relaxed text-slate-400">
                        · {phraseTable(e)}
                      </span>
                    ))}
                  </span>
                  {entitesRefusees.length > 0 && (
                    // UN REFUS MUET produirait une application à qui il
                    // manque une table, sans que personne sache laquelle.
                    <span className="mt-2 block text-[11px] leading-relaxed text-amber-300/80">
                      Écarté :{' '}
                      {entitesRefusees.map((r) => `${r.quoi} (${r.motif})`).join(' ; ')}
                    </span>
                  )}
                  <span className="mt-2 block text-[11px] leading-relaxed text-white/40">
                    {CE_QUE_DECLARER_CHANGE}
                  </span>
                </span>
              )}
              {m.question.choix !== undefined ? (
                <ChoixFermes
                  choix={m.question.choix}
                  actif={!enCours && questionAvant?.code === m.question.code}
                  onChoisir={choisirAvant}
                />
              ) : (
                <span className="block mt-3 text-xs text-slate-500">
                  Répondez en écrivant ci-dessous.
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
