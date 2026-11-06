'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Smartphone, Sparkles, Store, Truck } from 'lucide-react';
import { PLACEHOLDER_BY_LANG, invitesPour, type Famille } from '@/lib/apps/invites-accueil';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ConversationApplication from './ConversationApplication';
import { Attente, Bulle, CADRE_CONVERSATION, Composeur, VERRE_BULLE, Escalier } from './Conversation';
import { modeAsyncActif } from '@/lib/apps/suivi-generation';
import { doitAiguillerVersApplication } from '@/lib/apps/aiguillage';

// « Application » ne devient cliquable que le jour ou la generation
// asynchrone est armee — MEME interrupteur que l'ecran de suivi : un seul
// geste proprietaire allume tout. D'ici la : « Bientot », message doux.
const APPLICATION_PRETE = modeAsyncActif(process.env.NEXT_PUBLIC_GENERATION_ASYNC);

/**
 * LIT LE FIL LIGNE PAR LIGNE — et sait dire ce qui n'est jamais arrivé.
 *
 * Chaque ligne est un objet JSON : `battement` (la connexion vit),
 * `etape` (un jalon RÉEL du serveur), `fin` (le résultat), `erreur`.
 *
 * SI LE FIL S'ARRÊTE SANS `fin`, c'est une coupure — pas un résultat vide.
 * Les confondre ferait afficher « Génération échouée » là où la boutique
 * existe peut-être, et c'est exactement la faute qui a failli faire payer
 * deux fois le 2026-11-03.
 */
async function lireLeFil(
  res: Response,
  surEtape: (texte: string, rang?: number) => void,
  surBattement: () => void = () => {},
): Promise<{ ok: boolean; corps: Record<string, unknown> }> {
  // La route ne diffuse que si on le demande. Si un intermédiaire a retiré
  // l'en-tête, on retombe sur le JSON plutôt que d'échouer.
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/x-ndjson')) {
    const corps = (await res.json()) as Record<string, unknown>;
    return { ok: res.ok, corps };
  }
  const lecteur = res.body?.getReader();
  if (!lecteur) throw new Error(CONNEXION_PERDUE_BOUTIQUE);
  const decodeur = new TextDecoder();
  let reste = '';
  let fin: { ok: boolean; corps: Record<string, unknown> } | null = null;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    reste += decodeur.decode(value, { stream: true });
    const lignes = reste.split('\n');
    reste = lignes.pop() ?? '';
    for (const l of lignes) {
      if (l.trim() === '') continue;
      let o: Record<string, unknown>;
      try {
        o = JSON.parse(l) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (o.t === 'etape' && typeof o.texte === 'string') {
        surEtape(o.texte, typeof o.rang === 'number' ? o.rang : undefined);
      }
      else if (o.t === 'battement') surBattement();
      else if (o.t === 'erreur') throw new Error(String(o.message ?? 'Génération échouée.'));
      else if (o.t === 'fin') {
        fin = {
          ok: typeof o.statut === 'number' ? o.statut < 400 : true,
          corps: (o.corps ?? {}) as Record<string, unknown>,
        };
      }
    }
  }
  // LE FIL S'EST TU SANS CONCLURE : c'est une coupure, et on le dit comme
  // telle — le travail a peut-être abouti côté serveur.
  if (fin === null) throw new Error(CONNEXION_PERDUE_BOUTIQUE);
  return fin;
}

/**
 * CE QU'ON DIT QUAND LA CONNEXION LÂCHE — et pourquoi pas « réessayez ».
 *
 * ── MESURÉ EN PRODUCTION LE 2026-11-03, 16h18 au Tchad.
 *
 * L'écran a affiché « Load failed » — le message de WebKit quand un `fetch`
 * est coupé en route, pas une erreur de l'application. Pendant ce temps le
 * SERVEUR avait fini : la boutique `la-boutika-…` était écrite en base à
 * 15:18:45 UTC et l'appel au modèle facturé à 15:18:46. L'écran tournait
 * encore plus de trois minutes après.
 *
 * LE TRAVAIL A ÉTÉ FAIT ET PAYÉ ; SEULE LA RÉPONSE S'EST PERDUE.
 *
 * D'où cette formulation : dire « réessayez » tout court ferait refaire —
 * et repayer — une boutique qui existe déjà. On envoie d'abord vérifier.
 */
const CONNEXION_PERDUE_BOUTIQUE =
  'La connexion a été interrompue pendant la création. Votre boutique a ' +
  'peut-être été créée malgré tout : vérifiez dans « Mes boutiques » avant ' +
  'de relancer.';

/** Le message du navigateur n'est jamais montré tel quel. */
// ── LA LISTE NOIRE EST PARTIE (2026-11-04).
//
// Cette fonction reconnaissait TROIS phrases réseau et rendait `brut`
// pour tout le reste. « terminated » — le mot d'undici quand la
// connexion amont lâche — s'est donc affiché seul, en jaune, à
// quelqu'un qui venait de décrire son application. Troisième du genre
// après « Load failed » et « The string did not match the expected
// pattern ».
//
// `phraseErreur` est une liste BLANCHE : ce qui n'est pas reconnu ne
// s'affiche pas, et le brut part au journal du navigateur.
import { phraseErreur } from '@/lib/apps/phrase-erreur';
import { useTranslation } from '@/lib/translations';

type Msg = { role: 'user' | 'assistant'; content: string };

const LOADING_BY_LANG: Record<string, string[]> = {
  fr: [
    'Analyse de votre activité…',
    'Conception des modules métier…',
    'Création des relations entre données…',
    'Configuration des agents IA…',
    'Mise en place des automatisations…',
    'Finalisation de votre système…',
  ],
  en: [
    'Analyzing your business…',
    'Designing your modules…',
    'Building data relationships…',
    'Configuring AI agents…',
    'Setting up automations…',
    'Finalizing your system…',
  ],
  es: [
    'Analizando tu negocio…',
    'Diseñando los módulos…',
    'Creando las relaciones de datos…',
    'Configurando los agentes IA…',
    'Preparando las automatizaciones…',
    'Finalizando tu sistema…',
  ],
  ar: [
    'تحليل نشاطك التجاري…',
    'تصميم وحدات العمل…',
    'إنشاء العلاقات بين البيانات…',
    'إعداد وكلاء الذكاء الاصطناعي…',
    'تجهيز الأتمتة…',
    'إنهاء نظامك…',
  ],
};


/** Detecte la langue depuis le texte saisi par l'utilisateur. */
function detectUILang(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/\b(hola|gracias|tienda|quiero|negocio|vender)\b/i.test(text)) return 'es';
  if (/\b(bonjour|merci|boutique|je veux|entreprise|vendre)\b/i.test(text)) return 'fr';
  if (/\b(hello|thanks|shop|i want|business|sell)\b/i.test(text)) return 'en';
  return 'fr';
}

const GREETING = "Bonjour ! Décrivez-moi votre activité et je crée votre site sur mesure. Quel type de business souhaitez-vous lancer ?";

// Rendu markdown minimal et sur : uniquement le gras **...**.
// On echappe d'abord le HTML (securite), puis on transforme les paires **.
function renderBold(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return { __html: html };
}

export default function OnboardingChat({
  /**
   * UNE DEMANDE ARRIVÉE PAR L'ADRESSE — lue par la page, pas ici.
   *
   * L'atelier y envoie la demande d'origine AUGMENTÉE de ce que la retouche
   * n'a pas pu faire, quand il propose une régénération après un refus.
   * Sans ça, la personne devait recopier à la main un texte qu'elle venait
   * d'écrire — après avoir payé pour un non.
   *
   * ── POURQUOI UNE PROPRIÉTÉ ET PAS UN EFFET.
   *
   * Un effet pose l'état APRÈS le premier rendu : la personne verrait
   * l'accueil une fraction de seconde, puis l'écran basculerait sous ses
   * yeux. Ici l'état NAÎT juste, et il n'y a rien à rejouer — donc pas de
   * verrou à ne pas oublier.
   */
  demandeRecue = '',
}: {
  readonly demandeRecue?: string
} = {}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }]);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);
  const [etapeReelle, setEtapeReelle] = useState<string | null>(null);
  /**
   * CE QUI PROUVE QUE LE SERVEUR EST VIVANT — et qui ment si on le simule.
   *
   * Capture du 2026-11-03 : une étape allumée, plus rien pendant une
   * minute. « Une étape figée ressemble à une panne même quand elle est
   * honnête. »
   *
   * `detailVivant` porte le dernier mot du serveur (« 4 200 signes
   * écrits »), et `vuIlY` le nombre de secondes écoulées DEPUIS LE DERNIER
   * SIGNE REÇU. Ce compteur repart à zéro à chaque battement : s'il monte,
   * c'est que plus rien n'arrive — et l'écran le montre au lieu de faire
   * tourner un rond.
   *
   * Un rond qui tourne ne prouve rien : il tournait aussi quand c'était
   * mort.
   */
  const [detailVivant, setDetailVivant] = useState<string | null>(null);
  const [dernierSigne, setDernierSigne] = useState<number | null>(null);
  const [vuIlY, setVuIlY] = useState(0);
  const [derniereTentative, setDerniereTentative] = useState<{
    texte: string;
    mode?: number;
  } | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [skippable, setSkippable] = useState(false);
  const [modeOptions, setModeOptions] = useState<{ options: number[]; labels: Record<number, string> } | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [siteMode, setSiteMode] = useState<number | null>(null);
  const [dropshipType, setDropshipType] = useState<string | null>(null);
  const [showDropshipPicker, setShowDropshipPicker] = useState(false);
  // L'AIGUILLAGE VERS L'APPLICATION. Volontairement un booleen a part, et non
  // une valeur de `siteMode` : si c'etait un mode, tout ce qui lit `siteMode`
  // devrait apprendre a le connaitre. Ici, rien ne le voit.
  const [cibleApplication, setCibleApplication] = useState(demandeRecue.trim() !== '');
  // ── CE QUI PART AU CHEMIN APPLICATIF : LE FIL, PLUS UNE CHAÎNE (C1).
  //
  // DÉFAUT MESURÉ EN PRODUCTION LE 2026-11-05. L'aiguillage ne se
  // déclenche QU'APRÈS confirmation — le modèle ne pose son drapeau
  // qu'une fois la personne d'accord. Le dernier message était donc
  // STRUCTURELLEMENT la confirmation :
  //
  //   « une appli de gestion d'association, membres avec nom… »
  //   « est-ce bien une application ? »
  //   « oui c'est bien une application »   ← le SEUL texte transmis
  //
  // Le chemin applicatif a reçu « oui c'est bien une application » comme
  // cahier entier, et a généré une application de relevés de compteur
  // électrique. Le fil vivait à six lignes de là.
  const [filBascule, setFilBascule] = useState<readonly Msg[]>(
    demandeRecue.trim() === '' ? [] : [{ role: 'user', content: demandeRecue }],
  );

  const [avisBientot, setAvisBientot] = useState(false);
  const typedText = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
  const browserLang = typeof navigator !== 'undefined'
    ? (navigator.language || 'fr').slice(0, 2).toLowerCase()
    : 'fr';
  const supportedLang = ['fr', 'en', 'es', 'ar'].includes(browserLang) ? browserLang : 'fr';
  const uiLang = typedText.trim() ? detectUILang(typedText) : supportedLang;
  const LOADING_STEPS = LOADING_BY_LANG[uiLang] || LOADING_BY_LANG.fr;
  // ── LA TRADUCTION DU MODE EN FAMILLE SE FAIT ICI, ET NULLE PART AILLEURS.
  //
  // `invites-accueil.ts` ne connaît PAS `sites.mode` : un exemple
  // appartient à un genre de projet, pas à une valeur de colonne. Le
  // cliquet d'exhaustivité l'a refusé quand j'y avais mis les numéros,
  // et il avait raison — c'était une surface de mode de plus pour rien.
  const familleChoisie: Famille | null =
    siteMode === 1 ? 'site' : siteMode === 2 ? 'boutique' : siteMode === 3 ? 'dropship' : null;
  const PLACEHOLDERS = invitesPour(
    PLACEHOLDER_BY_LANG[uiLang] ?? PLACEHOLDER_BY_LANG.fr ?? [],
    familleChoisie,
  );
  const [typed, setTyped] = useState('');
  const twPhrase = useRef(0);
  const twChar = useRef(0);
  const twPhase = useRef<'typing' | 'pausing' | 'deleting'>('typing');
  // L'invite animee s'efface DES QUE l'utilisateur tape. Avant, un effet
  // remettait l'etat a vide ; React rendait donc une image avec l'ancienne
  // invite encore visible sous le texte saisi, puis recommencait. Derivee, la
  // valeur est juste des le premier rendu.
  const invite = input ? '' : typed;

  // ── LE REDEMARRAGE AU CHANGEMENT DE LANGUE, AJUSTE PENDANT LE RENDU.
  //
  // Ce n'est pas une valeur derivable : c'est une remise a zero. L'effet le
  // faisait, et React rendait alors une image avec l'invite de l'ANCIENNE
  // langue avant de recommencer.
  //
  // Ajuster l'etat pendant le rendu est le patron que React documente pour ce
  // cas precis : le composant se re-rend AVANT de peindre, donc personne ne
  // voit l'etat intermediaire. On compare a la langue precedente plutot que
  // d'ecouter un effet.
  const [langueRendue, setLangueRendue] = useState(uiLang);
  if (langueRendue !== uiLang) {
    setLangueRendue(uiLang);
    setTyped('');
  }
  useEffect(() => {
    if (input) return; // l'animation s'arrete des que l'utilisateur tape
    // reinit propre a chaque changement de langue (evite un index invalide sur l'ancienne liste)
    twPhrase.current = 0;
    twChar.current = 0;
    twPhase.current = 'typing';
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phrases = PLACEHOLDERS;
      const full = phrases[twPhrase.current % phrases.length];
      if (twPhase.current === 'typing') {
        twChar.current += 1;
        setTyped(full.slice(0, twChar.current));
        if (twChar.current >= full.length) { twPhase.current = 'pausing'; timer = setTimeout(tick, 1500); }
        else { timer = setTimeout(tick, 55); }
      } else if (twPhase.current === 'pausing') {
        twPhase.current = 'deleting';
        timer = setTimeout(tick, 400);
      } else {
        twChar.current -= 1;
        setTyped(full.slice(0, Math.max(twChar.current, 0)));
        if (twChar.current <= 0) {
          twPhase.current = 'typing';
          twPhrase.current = (twPhrase.current + 1) % phrases.length;
          timer = setTimeout(tick, 250);
        } else { timer = setTimeout(tick, 28); }
      }
    };
    timer = setTimeout(tick, 250);
    return () => clearTimeout(timer);
  }, [input, uiLang]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);
  // Hors generation, l'etape vaut zero : c'est une consequence, pas un etat a
  // remettre. L'effet n'a plus qu'a faire avancer le compteur quand il tourne.
  // ── LE PLANCHER EST DÉRIVÉ, PAS STOCKÉ.
  //
  // Ma première forme posait l'état dans un effet, et le lint l'a refusée :
  // « Calling setState synchronously within an effect can trigger cascading
  // renders ». Il avait raison, et la correction est meilleure que le
  // contournement — une valeur qui se CALCULE n'a pas besoin d'être tenue
  // à jour, donc elle ne peut pas diverger de sa source.
  /**
   * LE PLANCHER VIENT DU SERVEUR, PLUS D'UNE RECHERCHE DE TEXTE.
   *
   * ── LE DÉFAUT MESURÉ LE 2026-11-03, 20h27, LTE faible.
   *
   * Une seule étape allumée, les cinq autres éteintes, « serveur actif »
   * sous l'escalier. La connexion vivait ; l'escalier était MORT.
   *
   * La cause : ce plancher valait `LOADING_STEPS.indexOf(etapeReelle)`.
   * Mesuré — trois jalons sur six n'étaient PAS dans cette liste
   * (« Rédaction de votre boutique… », le compteur, la reprise). `indexOf`
   * rendait -1, le plafond devenait `min(5, -1 + 1) = 0`, et l'escalier ne
   * pouvait PLUS JAMAIS avancer.
   *
   * C'est le piège du -1 pour la troisième fois de la journée, et celui-ci
   * est né DANS la correction du précédent.
   *
   * ── CE QUI LE FERME POUR DE BON.
   *
   * Le serveur envoie un RANG. Plus aucune chaîne à faire correspondre,
   * donc plus de -1 possible. Et le plancher ne RECULE JAMAIS : un jalon
   * inconnu ou plus ancien laisse l'escalier où il est, au lieu de le
   * ramener à zéro.
   */
  const [plancher, setPlancher] = useState(-1);
  const etape = generating ? Math.max(loadingStep, plancher) : 0;

  /**
   * LE SERVEUR MÈNE, LE MINUTEUR SUIT — et ne le dépasse jamais.
   *
   * ── CE QUE CES COCHES FAISAIENT AVANT LE 2026-11-03.
   *
   * Elles avançaient sur un `setInterval` de huit secondes, quoi que fasse
   * le serveur. Au bout de quarante secondes, cinq étapes étaient
   * « réussies » même si la requête était morte à la première — c'est
   * exactement ce que le propriétaire a vu, sous un « Load failed ».
   *
   * ── CE QU'ELLES FONT MAINTENANT.
   *
   * Le fil envoie des jalons RÉELS. Chacun fixe un plancher : les coches
   * jusque-là sont vraies. Le minuteur n'a plus le droit d'aller au-delà
   * de l'étape suivante — il dit « on y travaille », plus jamais « c'est
   * fait ».
   *
   * Un minuteur seul mentait ; un plancher seul figerait l'écran entre deux
   * jalons distants de trente secondes. Les deux ensemble disent la vérité
   * sans donner l'impression d'un écran bloqué.
   */
  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => {
      setLoadingStep((s) => {
        // LE PLAFOND : jamais plus d'une étape au-delà de ce que le serveur
        // a confirmé. Sans jalon encore reçu, une seule étape est permise.
        const haut = Math.min(LOADING_STEPS.length - 1, plancher + 1);
        return s < haut ? s + 1 : s;
      });
    }, 8000);
    return () => clearInterval(id);
  }, [generating, plancher]);

  useEffect(() => {
    if (!generating || dernierSigne === null) return;
    const id = setInterval(() => {
      setVuIlY(Math.round((Date.now() - dernierSigne) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [generating, dernierSigne]);

  /**
   * CE QUI S'AFFICHE SOUS L'ESCALIER — une seule chose à la fois.
   *
   * ── LA RÈGLE, et elle vient d'un défaut observé.
   *
   * Deux messages alternaient toutes les deux secondes. Le diagnostic est
   * pour QUAND ÇA VA MAL : il n'a pas à occuper l'écran quand tout va
   * bien.
   *
   * · ça avance → la progression réelle, et elle seule.
   * · plus rien depuis SILENCE_FRANC → le diagnostic, et il RESTE.
   *
   * SEIZE SECONDES, ET C'EST MESURÉ : le serveur bat toutes les cinq
   * secondes et compte les signes toutes les deux. Trois battements
   * manqués ne sont plus une hésitation du réseau — c'est un silence.
   */
  const SILENCE_FRANC = 16;
  const silenceFranc = vuIlY >= SILENCE_FRANC;
  const ligneAvancement = silenceFranc
    ? `aucun signe depuis ${String(vuIlY)} s`
    : detailVivant;

  const skip = () => { if (!loading && !generating) sendText('passer'); };

  /**
   * REJOUER CE QUI A ÉCHOUÉ — et seulement après vérification.
   *
   * Le bouton n'apparaît qu'en cas d'échec, à côté d'une phrase qui envoie
   * d'abord regarder « Mes boutiques » : relancer à l'aveugle recréerait —
   * et repaierait — une boutique déjà construite.
   */
  const reessayer = () => {
    const t = derniereTentative;
    if (t === null || loading || generating) return;
    setError('');
    setDerniereTentative(null);
    void sendText(t.texte, t.mode);
  };

  const send = () => sendText(input.trim());

  const sendText = async (text: string, chosenMode?: number) => {
    if ((!text && !chosenMode) || loading || generating) return;
    // Gate compte : la génération exige un compte. Sinon -> login.
    const { data: { session: gateSession } } = await supabase.auth.getSession();
    if (!gateSession?.access_token) { router.push('/login'); return; }
    setError('');
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setSkippable(false);
    setModeOptions(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée, reconnectez-vous.');

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ history: newMessages, ...(chosenMode ? { chosenMode } : {}), ...(dropshipType ? { dropshipType } : {}) }),
      });

      let data;
      try { data = await res.json(); } catch { throw new Error('Réponse invalide.'); }
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');

      if (data.type === 'ready_to_generate' && typeof data.summary === 'string') {
        if (typeof data.mode === 'number') setSiteMode(data.mode);
        setLoading(false);
        setGenerating(true);
        const finalMessage = (data.mode ? `mode: ${data.mode}\n` : '') + data.summary;
        const effectiveDsType = data.dropshipType || dropshipType;
        // ── ON DEMANDE UN FLUX, et c'est ce qui garde la connexion vivante.
        //
        // La route rend du JSON à qui n'en demande pas : les appels courts
        // ne sont pas touchés. Ici on veut le fil, parce qu'une génération
        // dure 40 à 90 s et qu'une connexion mobile silencieuse se fait
        // tuer — c'est ce qui a produit « Load failed » le 2026-11-03,
        // pendant que le serveur avait déjà fini et facturé.
        const genRes = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/x-ndjson',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: finalMessage, location: '', ...(data.detectedLang ? { language: data.detectedLang } : {}), ...(effectiveDsType ? { dropshipType: effectiveDsType } : {}) }),
        });
        const genData = await lireLeFil(
          genRes,
          (texte, rang) => {
            // Le jalon porte parfois un détail (« … 4 200 signes écrits ») :
            // l'étape est la partie stable, le détail la partie qui bouge.
            const coupe = texte.indexOf('… ');
            setEtapeReelle(coupe > 0 ? `${texte.slice(0, coupe)}…` : texte);
            setDetailVivant(coupe > 0 ? texte.slice(coupe + 2) : null);
            // LE PLANCHER NE RECULE JAMAIS.
            if (typeof rang === 'number') setPlancher((p) => (rang > p ? rang : p));
            setDernierSigne(Date.now());
            setVuIlY(0);
          },
          () => {
            // UN BATTEMENT N'EST PAS UNE ÉTAPE : il ne fait pas avancer les
            // coches, il prouve seulement que la connexion vit.
            setDernierSigne(Date.now());
            setVuIlY(0);
          },
        );
        if (!genData.ok || !genData.corps.slug) {
          throw new Error(
            typeof genData.corps.error === 'string' && genData.corps.error !== ''
              ? genData.corps.error
              : 'Génération échouée.',
          );
        }
        router.push(`/edit/${String(genData.corps.slug)}`);
        return;
      }
      if (data.type === 'choose_mode' && Array.isArray(data.options)) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
        setModeOptions({ options: data.options, labels: data.labels || {} });
      } else if (data.type === 'ask' && data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
        setSkippable(data.skippable === true);
        // ── LA PORTE PAR LE TEXTE (2026-10-18).
        //
        // DEFAUT MESURE SUR LA TENTATIVE DU PROPRIETAIRE : il a decrit son
        // application en detail, le modele l'a comprise, et la seule chose
        // que l'ecran savait faire etait de lui dire d'aller cliquer sur un
        // bouton qu'il n'a pas trouve.
        //
        // Dire d'aller cliquer n'est pas un aiguillage. La plupart des gens
        // tapent ce qu'ils veulent sans jamais regarder les boutons. L'ecran
        // s'aiguille donc tout seul, exactement comme le ferait le bouton —
        // meme geste, meme destination.
        //
        // IL N'ARRIVE QU'APRES CONFIRMATION : le modele ne pose ce drapeau
        // qu'une fois la personne d'accord. Basculer quelqu'un qui voulait
        // une boutique serait pire que l'impasse qu'on repare.
        if (doitAiguillerVersApplication(data, APPLICATION_PRETE)) {
          // ── LE FIL PART AVEC, PAS LA DERNIÈRE PHRASE.
          //
          // `newMessages` porte tout l'échange, cette réponse comprise.
          // Transmettre `text` seul revenait à transmettre la
          // confirmation — voir le commentaire de `filBascule`.
          setFilBascule(newMessages);
          setCibleApplication(true);
        }
      } else if (data.type === 'need_dropship_type') {
        setShowDropshipPicker(true);
      } else {
        throw new Error('Réponse inattendue.');
      }
    } catch (err: unknown) {
      setError(phraseErreur(err));
      // ── ET ON RETIENT QUOI REJOUER, pour que « Réessayer » existe.
      setDerniereTentative({ texte: text, mode: chosenMode });
    } finally {
      setLoading(false);
      // ── L'ÉCHEC ÉTEINT L'ANIMATION, et c'était le défaut.
      //
      // `setGenerating(false)` N'EXISTAIT NULLE PART : une fois lancée,
      // l'animation ne s'arrêtait jamais. Le rond tournait, le minuteur de
      // huit secondes continuait d'allumer les coches une à une, et la
      // personne voyait cinq étapes « réussies » pendant que la requête
      // était morte. L'écran affirmait ce qu'il ne savait pas.
      setGenerating(false);
      setLoadingStep(0);
      setEtapeReelle(null);
      setPlancher(-1);
      setDetailVivant(null);
      setDernierSigne(null);
      setVuIlY(0);
    }
  };

  const pickMode = (mode: number, label: string) => {
    if (loading || generating) return;
    setSiteMode(mode);
    setModeOptions(null);
    sendText(label.charAt(0).toUpperCase() + label.slice(1), mode);
  };

  // LOT 1 / L1-01 -- LE SELECTEUR DEVIENT ATTEIGNABLE HORS ECRAN D'ACCUEIL.
  //
  // CE QUI MANQUAIT. La branche `need_dropship_type` existait deja ici et
  // appelait `setShowDropshipPicker(true)` -- mais le selecteur n'etait rendu
  // qu'a l'INTERIEUR du bloc d'accueil (`messages.length === 1`). Aucune route
  // n'emettant cette reponse, la branche etait morte et l'impasse invisible.
  // Maintenant que `api/onboarding` reclame le sous-type EN COURS D'ENTRETIEN
  // -- donc avec plusieurs messages a l'ecran -- le selecteur doit s'afficher
  // la aussi, sans quoi la correction du chemin d'ecriture produirait un
  // cul-de-sac silencieux. Une seule definition, deux emplacements de rendu.
  const dropshipPicker = (
    <>
    <p className="w-full text-center text-sm text-slate-400 mb-2">{t('home.dropshipping.question')}</p>
    {[
      { label: 'Revente de catalogue', type: 'reseller' },
      { label: 'Votre marque', type: 'pod_brand' },
      { label: 'Personnalisation client', type: 'pod_custom' },
    ].map(({ label, type }) => (
      <button
        key={type}
        onClick={() => {
          setSiteMode(3);
          setDropshipType(type);
          setShowDropshipPicker(false);
          sendText(`Dropshipping — ${label}`);
        }}
        className="px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/12 text-sm text-slate-200 hover:border-[#FA5D1E] hover:text-white hover:bg-white/[0.07] transition"
      >
        {label}
      </button>
    ))}
    </>
  );

  // ── LE CHEMIN SE SEPARE ICI, ET NULLE PART AILLEURS.
  //
  // Un seul `return` anticipe, avant tout le rendu des sites. Rien de ce qui
  // suit — `siteMode`, `/api/chat`, la table `sites` — n'est atteint quand
  // l'utilisateur a choisi « Application ». C'est ce qui garantit que les
  // trois modes existants ne changent pas d'un octet.
  if (cibleApplication) {
    // LE MEME CADRE QUE LES TROIS MODES, pas un cadre voisin. Le precedent
    // n'avait ni hauteur d'ecran ni colonne : la vue etant courte, le PIED DE
    // PAGE remontait en plein milieu. Ce n'etait pas un defaut du pied de
    // page — c'etait cette section qui ne tenait pas sa place.
    return (
      <section className={CADRE_CONVERSATION}>
        <div className="flex items-center gap-2 justify-center mb-6 text-white/60">
          <Sparkles size={18} className="text-[#FA5D1E]" />
          <span className="text-sm font-medium tracking-wide" translate="no">{t('home.hero.badge')}</span>
        </div>
        {/* ── LE TEXTE TAPÉ SUIT LA PERSONNE (2026-11-04).
             Elle écrivait sa demande, l'aiguillage la basculait vers
             l'application, et ELLE DEVAIT TOUT RETAPER : ce composant ne
             recevait que `onRetour`. Faire retaper quelqu'un parce qu'on
             a changé d'écran dans son dos est le genre de détail qui fait
             abandonner avant le premier résultat. */}
        <ConversationApplication
          filInitial={filBascule}
          onRetour={(fil) => {
            // ── C2 · CE QUI S'EST DIT LÀ-BAS REVIENT ICI.
            //
            // Le retour effaçait l'échange : la personne revenait sur un
            // écran vierge et retapait. Même défaut que la bascule, dans
            // l'autre sens.
            if (fil.length > 0) {
              setMessages((m) => [...m, ...fil.map((x) => ({ role: x.role, content: x.content }))]);
            }
            setCibleApplication(false);
          }}
        />
      </section>
    );
  }

  return (
    <section className={`${CADRE_CONVERSATION} ${messages.length === 1 && !loading && !generating ? 'justify-center' : ''}`}>
      <div className="flex items-center gap-2 justify-center mb-6 text-white/60">
        <Sparkles size={18} className="text-[#FA5D1E]" />
        <span className="text-sm font-medium tracking-wide" translate="no">{t('home.hero.badge')}</span>
      </div>

      {messages.length === 1 && !loading && !generating ? (
        <div className="flex flex-col items-center justify-center text-center px-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            {t('home.hero.title')}
          </h1>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-md">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center max-w-lg">
            {!showDropshipPicker ? (
              <>
              {[
                // ── UN PICTOGRAMME AU-DESSUS, LE LIBELLÉ DESSOUS.
                //
                // Quatre pastilles de texte nu se lisent mal sur un
                // téléphone, où ce texte est petit. Le pictogramme se lit
                // en un coup d'œil — mais SEUL il se devine mal, et le
                // libellé reste donc sous lui, pas à sa place.
                { label: 'Site web', tkey: 'home.mode.website' as const, mode: 1, Icone: Globe },
                { label: 'Boutique en ligne', tkey: 'home.mode.store' as const, mode: 2, Icone: Store },
                { label: 'Dropshipping', tkey: 'home.mode.dropshipping' as const, mode: 3, Icone: Truck },
                // ── APPLICATION : MEME ENTREE, CHEMIN SEPARE.
                //
                // Ce n'est PAS un « mode 4 ». Les modes 1/2/3 produisent une
                // vitrine : meme table `sites`, meme editeur, meme theme —
                // 48 fichiers lisent `site.mode`. Une application, elle, se
                // compile et se livre : ni URL publique, ni theme, ni panier.
                //
                // En faire un quatrieme mode obligerait ces 48 fichiers a se
                // demander quoi faire d'un site sans vitrine. On partage donc
                // l'ENTREE — la conversation, la pastille — et le chemin se
                // separe ICI, avant le moindre appel a `/api/chat`.
                { label: 'Application', tkey: 'home.mode.application' as const, mode: 0, Icone: Smartphone },
              ].map(({ label, tkey, mode, Icone }) => (
                <button
                  key={label}
                  onClick={async () => {
                    // Tant que la generation n'est pas armee, « Application »
                    // ne s'aiguille pas : message doux, rien d'autre. Les
                    // trois modes ne passent jamais par cette branche.
                    if (mode === 0 && !APPLICATION_PRETE) {
                      setAvisBientot(true);
                      return;
                    }
                    const { data: { session: gate } } = await supabase.auth.getSession();
                    if (!gate?.access_token) { router.push('/login'); return; }
                    if (mode === 0) {
                      // L'aiguillage. `siteMode` reste INTACT : rien de ce
                      // qui suit ne passera par la generation de sites.
                      //
                      // ICI le fil est tout l'échange DÉJÀ tenu, plus ce
                      // que le champ porte — la personne a pu écrire,
                      // discuter, puis cliquer sur le bouton.
                      setFilBascule(
                        input.trim() === ''
                          ? messages
                          : [...messages, { role: 'user', content: input.trim() }],
                      );
                      setCibleApplication(true);
                    } else if (mode === 3) {
                      setShowDropshipPicker(true);
                    } else {
                      setSiteMode(mode);
                      sendText(label);
                    }
                  }}
                  className={
                    `flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border text-sm transition ${
                      mode === 0 && !APPLICATION_PRETE
                        ? 'bg-white/[0.02] border-white/8 text-slate-500'
                        : 'bg-white/[0.04] border-white/12 text-slate-200 hover:border-[#FA5D1E] hover:text-white hover:bg-white/[0.07]'
                    }`
                  }
                >
                  <Icone className="w-5 h-5" aria-hidden="true" />
                  {t(tkey)}
                  {mode === 0 && !APPLICATION_PRETE && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide rounded-full border border-white/15 px-2 py-0.5 text-slate-400 align-middle">
                      Bientôt
                    </span>
                  )}
                </button>
              ))}
              {avisBientot && !APPLICATION_PRETE && (
                <p className="w-full text-xs text-slate-400 mt-1">
                  La création d’applications arrive très bientôt.
                </p>
              )}
              </>
            ) : (
              <>
              {dropshipPicker}
              <button
                onClick={() => setShowDropshipPicker(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition"
              >
                ← Retour
              </button>
              </>
            )}
          </div>
        </div>
      ) : (
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <Bulle key={i} moi={m.role === 'user'}>
            <span dangerouslySetInnerHTML={renderBold(m.content)} />
          </Bulle>
        ))}

        {generating && (
          <div className="flex justify-start">
            <div className={`${VERRE_BULLE} px-5 py-4`}>
              {generating ? (
                <div className="py-2">
                  <div className="text-center mb-6">
                    <div className="inline-block w-12 h-12 border-4 border-[#FA5D1E]/30 border-t-[#FA5D1E] rounded-full animate-spin mb-4"></div>
                    <h3 className="text-lg font-bold mb-1 tracking-tight">Création de votre {siteMode === 2 ? 'boutique' : siteMode === 3 ? 'boutique dropshipping' : 'site'} sur mesure…</h3>
                    <p className="text-sm text-slate-400">Cela peut prendre un moment, patientez.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {/* L'escalier vit desormais dans Conversation.tsx (primitive
                        partagee) — DEPLACEMENT verbatim, pour que le suivi de
                        generation reutilise LA meme marche. */}
                    <Escalier etapes={LOADING_STEPS} courante={etape} />
                    {/* ── LA PREUVE DE VIE, SOUS L'ESCALIER.
                         Capture du 2026-11-03, LTE faible : une étape
                         allumée, plus rien pendant une minute. L'écran
                         était honnête et paraissait mort.
                         Ce qui s'affiche ici ne bouge QUE si le serveur
                         parle : le détail vient de lui, et le compteur
                         repart à zéro à chaque signe reçu. S'il monte,
                         c'est que plus rien n'arrive — et c'est ce qu'il
                         faut voir, pas un rond qui tourne. */}
                    {/* ── UNE LIGNE, UN SENS, AUCUNE ALTERNANCE.
                         Observé le 2026-11-03 : « serveur actif »
                         s'affichait moins d'une seconde, s'effaçait, puis
                         « dernier signe il y a 2 s », et ainsi de suite —
                         deux messages se disputant la même ligne toutes
                         les deux secondes.
                         C'était mon instrument de diagnostic devenu
                         l'interface normale. Quelqu'un qui crée sa
                         boutique n'a pas à lire de la télémétrie qui
                         clignote.
                         Désormais : la progression RÉELLE pendant que ça
                         avance, et le diagnostic SEULEMENT après un
                         silence franc — où il RESTE. */}
                    {generating && ligneAvancement !== null ? (
                      <p
                        className={`mt-2 text-center text-[11px] tabular-nums ${
                          silenceFranc ? 'text-amber-300/70' : 'text-white/40'
                        }`}
                      >
                        {ligneAvancement}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        {loading && !generating && <Attente />}
      </div>
      )}

      {error && (
        <div className="mt-3 text-center">
          <p className="text-sm text-red-400">{error}</p>
          {/* ── DEUX GESTES, DANS L'ORDRE QUI ÉVITE DE REPAYER.
               « Mes boutiques » D'ABORD : le 2026-11-03, le serveur avait
               fini et la boutique existait pendant que l'écran montrait un
               échec. Relancer à l'aveugle en aurait créé une seconde, et
               facturé un second appel au modèle. */}
          {derniereTentative !== null && !loading && !generating && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/dashboard"
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:text-white"
              >
                Voir mes boutiques
              </a>
              <button
                type="button"
                onClick={reessayer}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white transition hover:bg-white/15"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      )}

      {showDropshipPicker && messages.length > 1 && !loading && !generating && (
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {dropshipPicker}
        </div>
      )}

      {modeOptions && !loading && !generating && (
        <div className="flex flex-col gap-3 mt-4">
          {modeOptions.options.map((mode) => (
            <button
              key={mode}
              onClick={() => pickMode(mode, modeOptions.labels[mode] || `Mode ${mode}`)}
              className="text-left px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/12 hover:border-[#FA5D1E] hover:bg-white/[0.07] transition group"
            >
              <span className="block text-[15px] font-semibold text-white mb-0.5 group-hover:text-[#FA5D1E] transition">
                {mode === 1 ? 'Site vitrine' : mode === 2 ? 'Boutique en ligne' : 'Boutique autonome'}
              </span>
              <span className="block text-sm text-slate-400">{modeOptions.labels[mode]}</span>
            </button>
          ))}
        </div>
      )}

      {skippable && !loading && !generating && (
        <div className="flex justify-center mt-3">
          <button
            onClick={skip}
            className="text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-5 py-1.5 transition"
          >
            Passer cette étape
          </button>
        </div>
      )}

      <Composeur
        valeur={input}
        onChange={setInput}
        onEnvoyer={send}
        invite={invite}
        desactive={!input.trim() || loading || generating}
        bloque={generating}
        etiquette="Décrivez votre activité"
      />

      {messages.length === 1 && !loading && !generating && !showDropshipPicker && (
        <div className="mt-5 max-w-lg mx-auto text-left space-y-2 text-[13px] leading-relaxed text-slate-400">
          <p><span className="text-slate-200 font-medium">{t('home.mode.website')}</span> — {t('home.mode.website.desc')}</p>
          <p><span className="text-slate-200 font-medium">{t('home.mode.store')}</span> — {t('home.mode.store.desc')}</p>
          <p><span className="text-slate-200 font-medium">{t('home.mode.dropshipping')}</span> — {t('home.mode.dropshipping.desc')}</p>
        </div>
      )}
    </section>
  );
}
