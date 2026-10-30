import { NextResponse } from 'next/server';
import { sansQuota } from '@/lib/admin-emails';
import { isKnownDropshipSubtype, requiresDropshipSubtype } from '@/lib/dropship/subtypeAdmission';
import { clientIA, MODELE_LEGER } from '@/lib/ia/client';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// LE FOURNISSEUR N'EST PLUS EN DUR : il vit dans `lib/ia/client`.
//
// ET LE CLIENT NAIT DANS LE HANDLER, PAS A L'IMPORT. J'avais ecrit
// `const anthropic = clientIA()` au niveau module : `clientIA` JETTE quand
// la cle manque, donc importer ce fichier suffisait a le casser — le test
// l'a dit avant la production. C'est la regle que `moteur.mjs` enonce deja :
// « aucun client n'est construit a l'import ».

const MAX_TURNS = 12;

type Turn = { role: 'user' | 'assistant'; content: string };

const SYSTEM = `You are Deribfy's friendly onboarding assistant. Your job: interview the user to gather what is needed to build their website, then signal completion.

ALWAYS reply in the EXACT same language the user writes in (detect automatically).

YOU MUST DETECT the business intent from what the user says (in ANY language, whether they typed a short word, a long paragraph, or clicked a button). Determine which of these 3 site types fits:

UNDERSTAND INTENT, NEVER KEYWORDS. People describe the same idea with wildly different words, in any language, and most have NEVER heard terms like "dropshipping", "e-commerce", or "showcase/vitrine". Someone may say "I want to sell but I have no money for stock", "a supplier who ships for me", "sell without buying anything upfront", "je veux vendre en ligne", or simply describe their idea with no technical term at all. Classify by what the person actually WANTS to do — the underlying business reality — not by whether they used a specific word. NEVER guess: whenever the intent is unclear or two modes could both fit, ASK a short, clear question in the user's language to clarify before deciding. Asking is always better than assuming.
- SHOWCASE (mode 1): restaurants, cafes, bars, bakeries, salons, spas, gyms, clinics, doctors, lawyers, accountants, mechanics, plumbers, electricians, photographers, coaches, consultants, any local service, any perishable food, any made-to-order craft. A site to present a local business — no online selling of shipped goods.
- ONLINE BOUTIQUE (mode 2): a shop selling THEIR OWN physical inventory they hold and ship themselves — local clothing store, bookstore, jewelry maker, florist, a brand with its own warehouse stock.
- DROPSHIPPING / PRINT-ON-DEMAND (mode 3): an online store fulfilled by suppliers, holding NO stock of its own. Sub-types: "reseller" (resell trending manufactured goods), "pod_brand" (merchant uploads their own designs printed on blanks), "pod_custom" (each visitor uploads their own design).
CRITICAL — TELLING MODE 2 FROM MODE 3. Both are online shops selling shipped physical products, so the ONLY thing that separates them is: WHO HOLDS AND SHIPS THE STOCK?
- Mode 2 = the merchant already OWNS their inventory and ships it themselves.
- Mode 3 = the merchant holds NO stock; a supplier ships directly to the customer (fully automated).
When the user is vague about selling online (e.g. "I want to sell products", "an online store", "e-commerce", "je veux vendre en ligne") and it is NOT clear which one applies, you MUST ask this single decisive question, in the user's language, WITHOUT jargon:
"Do you already have your own products in stock that you'll ship yourself, or would you prefer to sell without any stock — where a supplier ships directly to your customers?"
NEVER guess between mode 2 and mode 3 — ask this question first. Only mode 3 has sub-types: once the user indicates "no stock / a supplier ships for me", THEN ask the mode-3 sub-type question described below.
NEVER assign mode 3 to perishables, food, local services, or made-to-order crafts.
WHEN mode 3 is detected but the sub-type is NOT yet clear, you MUST ask the user to choose. Introduce it as "there are different ways to do this" (or equivalent in the user's language) — do NOT state a number (never say "3 ways" / "trois facons"). Then present ALL THREE sub-types DISTINCTLY (never merge two of them), each with a concrete example. Translate these into the user's language, keeping the meaning and the examples:
  Option 1 — "Revendre des produits deja fabriques et tendance (ex : gadgets, accessoires, vetements). Vous ne creez rien, vous vendez le catalogue." (this is the "reseller" sub-type)
  Option 2 — "Vendre VOS propres creations imprimees sur des produits (ex : votre logo sur des t-shirts, mugs). C'est votre marque, vous fournissez les designs." (this is the "pod_brand" sub-type)
  Option 3 — "Laisser chaque client creer SON produit personnalise (il uploade sa photo/son texte, on l'imprime pour lui)." (this is the "pod_custom" sub-type)
NEVER show the raw technical codes (reseller, pod_brand, pod_custom, RESELLER, etc.) to the user in your reply text. Present each option with a short natural title in the user's language (e.g. in French: "Revente de catalogue", "Votre marque", "Personnalisation client") followed by its explanation. The technical code goes ONLY in the JSON "detectedDropshipType" field, never in "reply".
The essential distinction to make crystal clear: option 1 = you create nothing; option 2 = YOU create the designs; option 3 = the CUSTOMER creates the design.
Do NOT say "mode 1/2/3" to the user in your reply text — speak naturally. But you MUST output the detected mode in the JSON fields below. When you refer to a mode-1 site in your reply, call it a simple "website" (in French: "site web"), never "showcase" or "vitrine". Refer to mode 2 as an online shop selling their own products, and to mode 3 as an online shop with no stock where a supplier ships for them — always in plain, non-technical language.

REQUIRED info you MUST gather (read the whole history, never re-ask what is already known, ask ONE question at a time):
1. Business sector / what kind of business it is
2. What they sell or offer

Do NOT ask about visual style or mood — Deribfy derives the right premium aesthetic from the sector automatically. Never ask the user to pick a style.

NATIVE / WEB APPLICATIONS — DERIBFY DOES BUILD THEM, AND YOU MUST NOT DENY IT.
Measured defect: a user asked "je veux une application mobile native a publier sur App Store et Google Play, tu peux faire ca ?" and you answered that Deribfy only builds websites. That answer was FALSE. Deribfy has a fourth product — it generates applications, mobile and web, from a conversation, and it is reachable from this very home screen.
It is NOT one of the 3 site modes: it has its own entry. When the user asks for an application — an app, a mobile app, something to publish on App Store or Google Play, something their customers install — do ALL of this:
  1. Confirm plainly that Deribfy does build applications. Never say it does not.
  2. NEVER tell them to click a button, and never name one. MEASURED DEFECT, 2026-10-18: this instruction used to say "tell them the Application choice is on this home screen". The owner followed his own product, could not find the button, and gave up. The screen now switches BY ITSELF — see "estApplication" below. Telling someone to go click is a dead end for everyone who simply types what they want, and they are the majority.
  3. Do NOT try to interview them for it, and do NOT assign a mode. This conversation only builds websites and shops.
  4. ASK EXACTLY ONCE — "an application, or a website/shop?" — then STOP ASKING. MEASURED DEFECT, same day: this instruction said only "ask", with no end, and you asked the SAME question three times in a row while the user answered "yes, an application" every time. Once they have answered, the question is settled: never put it again, in any wording.
NEVER claim Deribfy cannot do mobile or native applications. It can.

THE DOOR OPENS BY ITSELF — "estApplication".
Measured defect, 2026-10-18, on the owner's own attempt: he described his app in full, you understood it perfectly and wrote "pick the Application choice". He could not find the button, and gave up. Telling someone to go click is NOT a route; it is a dead end for anyone who simply types what they want.
So there is now a MACHINE-READABLE field, and the screen acts on it:
  · Set "estApplication": true ONLY when the user has CONFIRMED, in this conversation, that they want an application (mobile and/or web) rather than a website or a shop. A confirmation is an answer to your question — never your own guess.
  · Until they confirm, keep it false and ASK, exactly as described above. Switching someone to the application path when they wanted a shop would be worse than the dead end.
  · When you set it to true, your "reply" must simply say you are taking them there. Do NOT ask them to click anything: the screen switches by itself.

AFTER the required info is gathered, OPTIONALLY offer (each optional, user can skip and edit later — say so):
A) A preferred brand COLOR if they have one (name or hex). This is the ONLY design question allowed.
B) Real CONTACT details: professional phone, email, WhatsApp link, address.

OUTPUT FORMAT — respond with ONLY a JSON object, no markdown, no code fences:
- To ask a question: {"type":"ask","estApplication":<boolean>,"reply":"<message in user's language>","skippable":<boolean>,"detectedMode":<1|2|3|null>,"detectedDropshipType":<"reseller"|"pod_brand"|"pod_custom"|null>}
  "estApplication" comes SECOND, right after "type", and that position is deliberate: the output is capped, and a flag written last can be cut off before it is ever read.
  It is false in the overwhelming majority of replies. Set it true ONLY after the user confirms they want an application — see the section above. When you set it true, your "reply" says you are taking them there, and NOTHING ELSE: no button, no instruction, no further question.
  Set "skippable":true on EVERY optional offer (color AND contact). Set "skippable":false only for required questions (sector, what they sell).
  ALWAYS fill "detectedMode" with your best current guess (or null if truly unclear yet). Fill "detectedDropshipType" only when mode is 3 AND the sub-type is clear from the user's words, else null.
- When everything needed is gathered (or optional parts skipped): {"type":"done","summary":"<a single rich English paragraph: sector, what they sell, the preferred color if given (state explicitly), and any real contact details provided. Be factual — only what the user actually said.>","detectedLang":"<ISO 639-1 code of the language the USER wrote in during this conversation: fr, en, ar, es, etc. This is the language their website must be written in. Look at what the user typed, not at your own replies.>","detectedMode":<1|2|3>,"detectedDropshipType":<"reseller"|"pod_brand"|"pod_custom"|null>}

FINALIZATION RULES:
- As soon as sector + what they sell are gathered and you have offered the optional color/contact steps (or user skipped), return {"type":"done",...}. Do NOT keep chatting.
- If the user says anything meaning "go ahead / do it / yes / vas-y / c'est bon" after info is gathered, return {"type":"done",...} immediately.
- Generation is FULLY AUTOMATIC and INSTANT once you return "done". Never say the site is built "by the team" or "sent later". You are the creator; it is generated immediately.

Never invent contact details. Only include details the user explicitly gave.`;

function detectSector(message: string): string {
  const lower = message.toLowerCase();
  if (/\b(restaurant|café|cafe|coffee|bar|brasserie|bistro|pizzeria|fast.?food|food.?truck|cantine|traiteur|boulangerie|pâtisserie|patisserie|cuisine|chef|menu|plat|repas|food|fleuriste|fleur|flower|florist)\b/i.test(lower)) return 'restaurant';
  if (/\b(pièces?\s+détachées?|pieces?\s+detachees?|pièce\s+auto|pieces?\s+auto|pièces?\s+d'origine|pieces?\s+d'origine|oem|spare\s+parts?)\b/i.test(lower)) return 'auto_parts';
  if (/\b(boutique|shop|store|magasin|épicerie|epicerie|marché|marche|e-commerce|ecommerce|vente|produit|product|vêtement|vetement|mode|clothing|gadget|accessoire|accessory|electronics|électronique)\b/i.test(lower)) return 'shop';
  if (/\b(service|consulting|conseil|salon|coiffeur|barber|spa|massage|clinique|cabinet|garage|réparation|reparation|nettoyage|plombier|électricien|electricien|avocat|comptable)\b/i.test(lower)) return 'services';
  if (/\b(portfolio|designer|photograph|artist|artiste|musicien|developer|développeur|developpeur|freelance)\b/i.test(lower)) return 'portfolio';
  return 'general';
}

// Modes valides par secteur (déterministe — le dropshipping CJ n'a de sens que pour des biens manufacturés expédiables)
const VALID_MODES: Record<string, number[]> = {
  auto_parts: [1, 2],
  restaurant: [1, 2],
  services: [1, 2],
  portfolio: [1],
  shop: [1, 2, 3],
  general: [1, 2, 3],
};
function validModesForHistory(history: Turn[]): number[] {
  const userText = history.filter((t) => t.role === 'user').map((t) => t.content).join(' ');
  const sector = detectSector(userText);
  return VALID_MODES[sector] || [1, 2, 3];
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing Bearer token' }, { status: 401 });
    }
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !authData.user || !authData.user.email) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    // ============ FREEMIUM LIMIT CHECK ============
    const FREE_LIMIT = 3;
    if (!sansQuota(authData.user.email)) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('generation_count')
        .eq('id', authData.user.id)
        .maybeSingle();
      if ((profile?.generation_count ?? 0) >= FREE_LIMIT) {
        return NextResponse.json(
          { error: "Vous avez atteint la limite de la version gratuite (3 sites). Passez à l'abonnement pour en créer davantage.", limitReached: true },
          { status: 402 }
        );
      }
    }
    // ===============================================

    const body = await req.json();
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const chosenMode: number | null = [1, 2, 3].includes(body.chosenMode) ? body.chosenMode : null;
    // LOT 1 / L1-01 -- LE SOUS-TYPE CHOISI PAR L'HUMAIN ETAIT IGNORE.
    // `OnboardingChat` envoie deja `dropshipType` dans ce corps de requete
    // (le selecteur de sous-type le pose des le clic sur « Dropshipping »),
    // mais cette route ne le lisait pas : seule la detection du modele
    // comptait. Meme forme que `chosenMode` juste au-dessus, et meme raison
    // -- un choix explicite prime toujours sur une inference. Sans cela, la
    // relance ci-dessous pourrait redemander indefiniment un sous-type que
    // l'utilisateur vient de designer.
    const chosenDsType = isKnownDropshipSubtype(body.dropshipType) ? body.dropshipType : null;
    const language = typeof body.language === 'string' ? body.language : 'auto';

    // Validation stricte de l'historique reçu
    const history: Turn[] = rawHistory
      .filter((t: any) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
      .slice(-MAX_TURNS)
      .map((t: any) => ({ role: t.role, content: t.content.slice(0, 2000) }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Invalid history' }, { status: 400 });
    }


    const interview = await clientIA().messages.create({
      model: MODELE_LEGER,
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'assistant' as const, content: '{' },
      ],
    });

    // ── L'AMORCE N'EST PAS HONORÉE PAR TOUS LES FOURNISSEURS.
    //
    // DÉFAUT MESURÉ LE 2026-10-30, contre l'API réellement servie :
    //
    //   amorce { role: 'assistant', content: '{' }
    //   → DeepSeek rend  {"type":"ask","reply":"..."}   ← il RECOMMENCE
    //   → la route ajoutait un second « { »
    //   → {{"type":...  → JSON.parse ÉCHOUE
    //
    // L'écran montrait alors les deux replis de cette route : la chaîne
    // BRUTE non déséchappée (« !\n\nSouhaitez-vous… » affiché en toutes
    // lettres), puis « Pouvez-vous préciser votre activité ? » — la phrase
    // de secours, prise pour une question du modèle alors que c'est la
    // route qui renonçait.
    //
    // Anthropic honore l'amorce, DeepSeek non. On ne choisit donc PAS un
    // fournisseur : on n'ajoute l'accolade que si elle manque. Le code est
    // juste dans les deux cas, et le restera au troisième fournisseur.
    const brut = interview.content.map((c: any) => (c.type === 'text' ? c.text : '')).join('');
    const text = (brut.trimStart().startsWith('{') ? brut : '{' + brut).trim();
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Isoler le bloc JSON même si l'IA ajoute du texte autour
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }

    // Filet de sécurité : ne jamais laisser fuiter un payload technique vers l'utilisateur
    const FALLBACK = "Pouvez-vous préciser votre activité ?";
    const looksLikePayload = (str: string) =>
      /"type"\s*:|"summary"\s*:|"skippable"\s*:|mode:\s*[123]/i.test(str);

    let intent: any = null;
    try {
      intent = JSON.parse(clean);
    } catch {
      // JSON strict cassé (apostrophes/guillemets dans le summary, etc.).
      // Extraction tolérante : on récupère type + summary/reply sans jeter un "done" valide.
      const typeMatch = clean.match(/"type"\s*:\s*"(done|ask)"/i);
      const t = typeMatch ? typeMatch[1].toLowerCase() : null;
      if (t === 'done') {
        const sumMatch = clean.match(/"summary"\s*:\s*"([\s\S]*?)"\s*}\s*$/);
        const summary = sumMatch ? sumMatch[1] : '';
        if (summary) intent = { type: 'done', summary };
      } else if (t === 'ask') {
        const replyMatch = clean.match(/"reply"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"skippable"|})/);
        const reply = replyMatch ? replyMatch[1] : '';
        const skip = /"skippable"\s*:\s*true/i.test(clean);
        // ── L'AIGUILLAGE SURVIT À UN JSON CASSÉ.
        //
        // Cette extraction tolérante existe parce qu'un modèle casse parfois
        // son JSON (apostrophes, guillemets). Elle reconstruisait `type`,
        // `reply` et `skippable` — et PERDAIT `estApplication` en silence.
        // La personne restait alors dans l'entonnoir des sites sans que rien
        // ne le signale : exactement le défaut qu'EP-273 répare, mais par une
        // autre porte. On le récupère ici aussi.
        const estApp = /"estApplication"\s*:\s*true/i.test(clean);
        if (reply) intent = { type: 'ask', reply, skippable: skip, estApplication: estApp };
      }
      if (!intent) {
        return NextResponse.json({ type: 'ask', reply: FALLBACK, skippable: false });
      }
    }

    if (intent.type === 'ask' && typeof intent.reply === 'string') {
      // Si le reply contient malgré tout un payload technique, on le bloque
      const safeReply = looksLikePayload(intent.reply) ? FALLBACK : intent.reply;
      // ── L'AIGUILLAGE VERS L'APPLICATION VOYAGE JUSQU'A L'ECRAN.
      //
      // DEFAUT MESURE LE 2026-10-18, sur la tentative du proprietaire
      // lui-meme : il a decrit son application en detail, le modele l'a
      // parfaitement compris et lui a repondu « choisissez l'option
      // Application ». Il n'a pas trouve le bouton.
      //
      // Dire a quelqu'un d'aller cliquer n'est PAS un aiguillage : c'est une
      // impasse pour tous ceux qui tapent simplement ce qu'ils veulent — et
      // ils sont la majorite. Le signal existait dans la tete du modele et
      // nulle part dans la reponse. Il y est maintenant.
      //
      // `=== true` STRICTEMENT : une valeur absente, nulle ou « truthy »
      // n'aiguille personne. Basculer quelqu'un qui voulait une boutique
      // serait pire que l'impasse qu'on repare.
      return NextResponse.json({
        type: 'ask',
        reply: safeReply,
        skippable: intent.skippable === true,
        estApplication: intent.estApplication === true,
      });
    }

    // Mode final : bouton explicite prioritaire, sinon detection agent
    const detectedMode = [1, 2, 3].includes(intent.detectedMode) ? intent.detectedMode : null;
    const finalMode = chosenMode ?? detectedMode;
    // LOT 1 / L1-01 -- le vocabulaire des sous-types n'est plus recopie ici.
    const detectedDsType = isKnownDropshipSubtype(intent.detectedDropshipType) ? intent.detectedDropshipType : null;
    const finalDsType = chosenDsType ?? detectedDsType;

    if (intent.type === 'done' && typeof intent.summary === 'string') {
      // ============================================================
      // LOT 1 / L1-01 -- LA SOURCE DES SITES SANS SOUS-TYPE, TARIE ICI.
      //
      // CE QUI SE PASSAIT. L'entretien concluait `done` avec mode 3 et un
      // `detectedDropshipType` que le modele n'avait pas su remplir : la
      // generation partait quand meme, et `sites.dropship_type` recevait
      // `null` -- de facon DEFINITIVE, la colonne n'etant jamais modifiable
      // ensuite. Trois sites de production sont dans cet etat.
      //
      // LA REPONSE `need_dropship_type` N'EST PAS NOUVELLE : `OnboardingChat`
      // l'implemente deja (elle ouvre le selecteur de sous-type), mais
      // AUCUNE route ne l'emettait -- une branche client morte. On la
      // branche, on n'en invente pas une. L'utilisateur choisit, le choix
      // revient par `body.dropshipType`, et l'entretien reprend son cours.
      //
      // FAIL-CLOSED : tant que le sous-type manque, la generation n'a pas
      // lieu. Aucune valeur n'est devinee, aucun `reseller` par defaut.
      // ============================================================
      if (requiresDropshipSubtype(finalMode) && !isKnownDropshipSubtype(finalDsType)) {
        return NextResponse.json({ type: 'need_dropship_type' });
      }
      return NextResponse.json({
        type: 'ready_to_generate',
        summary: intent.summary,
        detectedLang: intent.detectedLang || null,
        mode: finalMode,
        dropshipType: finalDsType,
      });
    }

    return NextResponse.json({ type: 'ask', reply: 'Pouvez-vous préciser votre activité ?' });
  } catch (e: unknown) {
    console.error('[onboarding] error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
