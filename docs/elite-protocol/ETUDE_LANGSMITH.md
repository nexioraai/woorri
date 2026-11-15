# Étude — faut-il intégrer LangSmith au générateur Deribfy ?

- **Date :** 2026-11-15
- **Nature :** étude seule. Aucun fichier du projet n'a été modifié ; ce document est le seul écrit.
- **Code examiné :** `origin/main` @ `27e83891` (production). Lu par `git archive`, le working tree n'a pas été touché.
  - La branche locale `etape-v3` (V4, **en pause depuis le 2026-11-14**) n'est pas l'objet de cette étude.
  - Elle est seulement mentionnée là où elle change un fait.
- **Recherche externe :** pages lues le 2026-11-15 ; chaque affirmation porte son URL.

**Étiquettes.** Elles s'appliquent à tout le document.

| Étiquette | Sens |
|---|---|
| **[LU]** | Lu dans la source citée (URL ou `fichier:ligne`). |
| **[DÉDUIT]** | Inférence de ma part à partir de faits lus. |
| **[ESTIMÉ]** | Chiffrage de temps de développement. Ce n'est pas une mesure. |
| **UNKNOWN** | Introuvable ou non vérifié. Ne vaut jamais PASS. |

**Chemins.** Ils sont relatifs à la racine du dépôt. `D` = `apps/web/src/app/api/generateur/direct/route.ts`.

---

## TEMPS 1 — Recherche autonome sur LangSmith

### 1.1 SDK TypeScript / JavaScript

**Version et licence** [LU] — https://registry.npmjs.org/langsmith
- Paquet npm `langsmith`, dernière version **0.12.0**, publiée le 2026-11-10.
- Versions précédentes : 0.11.8 (2026-11-03), 0.11.7 (2026-11-02), 0.11.6 (2026-10-31), 0.11.5 (2026-10-29).
- Licence MIT.
- Dépendances pair toutes optionnelles : `openai`, `@opentelemetry/*`, `ws`.

**Dépôt** [LU]
- L'ancien dépôt `github.com/langchain-ai/langsmith-sdk` est **archivé depuis le 2026-10-16** (API GitHub du dépôt).
- Le SDK JS vit désormais dans https://github.com/langchain-ai/langsmith-javascript.
- Dernier push le 2026-11-13, cinq commits ce jour-là.
- 11 issues + PR ouvertes.

**0.12.0 casse la compatibilité** [LU] — https://api.github.com/repos/langchain-ai/langsmith-javascript/releases/tags/v0.12.0
- La release porte une section « ⚠ BREAKING CHANGES ».

**Runtimes** [LU] — https://raw.githubusercontent.com/langchain-ai/langsmith-javascript/main/README.md
- Node.js ≥ 20, TypeScript ≥ 4.9.
- Vercel Edge et Cloudflare Workers sont pris en charge.
- « React Native is not supported ».

**Serverless** [LU] — https://docs.langchain.com/langsmith/serverless-environments
- L'envoi des traces se fait en arrière-plan par défaut.
- Sur une fonction éphémère, il faut l'une de ces trois mesures :
  - soit `LANGSMITH_TRACING_BACKGROUND="false"` ;
  - soit `await client.awaitPendingTraceBatches()` ;
  - soit `new Client({ manualFlushMode: true })` puis `await client.flush()`.

**Maturité, en une phrase** [DÉDUIT]
- Le SDK est actif et maintenu, avec une publication par semaine environ.
- Mais il vient de **changer de dépôt (2026-10-16)** et de **casser sa compatibilité (0.12.0, 2026-11-10)**.
- C'est une cible mouvante, pas un socle figé.

### 1.2 Tracer DeepSeek (ni OpenAI ni Anthropic)

Trois mécanismes existent, tous documentés.

**A. Décorateur `traceable` + métadonnées** [LU] — https://docs.langchain.com/langsmith/trace-deepseek

```typescript
const callDeepSeek = traceable(
  async (messages: ChatMessage[]) => {
    const response = await openai.chat.completions.create({ model: "deepseek-chat", messages });
    return response.choices[0].message;
  },
  {
    name: "DeepSeek Chat Completion",
    run_type: "llm",
    metadata: { ls_provider: "deepseek", ls_model_name: "deepseek-chat" },
  }
);
```

⚠ **Cette page est périmée par rapport à DeepSeek** [LU des deux côtés] :
- Elle utilise `baseURL: "https://api.deepseek.com/v1"` et le modèle `deepseek-chat`.
- Or DeepSeek donne aujourd'hui `https://api.deepseek.com` (https://api-docs.deepseek.com/).
- Et `deepseek-chat` a été annoncé arrêté au 2026-07-24 (https://api-docs.deepseek.com/updates).
- Si `/v1` et `deepseek-chat` répondent encore : **UNKNOWN**.

**Jetons et coût avec `traceable`** [LU] — https://docs.langchain.com/langsmith/log-llm-trace et https://docs.langchain.com/langsmith/cost-tracking
- `traceable` ne compte les jetons que si la fonction **rend elle-même** `usage_metadata`.
- Champs : `{ input_tokens, output_tokens, total_tokens, input_token_details: { cache_read }, output_token_details: { reasoning } }`.
- Ou bien les fixer via `getCurrentRunTree().metadata.usage_metadata`.
- Le coût peut aussi être envoyé directement : `input_cost`, `output_cost`, `total_cost`.

**B. `wrapOpenAI` sur un client `openai` à `baseURL` personnalisé** [LU] — https://docs.langchain.com/langsmith/trace-with-openai-compatible

```typescript
import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers/openai";
const client = wrapOpenAI(new OpenAI({ baseURL: "https://<provider-base-url>/v1", apiKey: process.env.PROVIDER_API_KEY! }));
```

Ce que fait le wrapper, lu dans le code source 0.12.0 (`lib/wrappers/openai.js`) [LU] :
- Les jetons sont comptés automatiquement.
- `cached_tokens` et `reasoning_tokens` sont mappés.
- Mais `ls_provider` est **forcé à `"openai"`**, quelle que soit l'URL de base.
- Peut-on le surcharger ? **UNKNOWN**.

**C. `wrapAnthropic`** [LU] — https://docs.langchain.com/langsmith/trace-anthropic
- Il existe, mais `ls_provider: "anthropic"` est codé en dur dans le source.
- Son usage contre `https://api.deepseek.com/anthropic` n'est pas documenté par LangSmith : **UNKNOWN**.

**D. Manuel : `RunTree` ou REST** [LU] — https://docs.langchain.com/langsmith/annotate-code et https://docs.langchain.com/langsmith/trace-with-api
- `new RunTree({...})`, puis `postRun()`, `createChild()`, `end()`, `patchRun()`.
- Ou en REST : `POST /runs` et `POST /runs/multipart`.

**Code minimal réel pour l'adaptateur Deribfy** [DÉDUIT de A]
- Deribfy n'utilise **pas** le SDK `openai` : l'appel est un `fetch` brut (§2a).
- Le seul mécanisme applicable sans nouvelle dépendance `openai` est donc **A** :

```typescript
import { traceable } from "langsmith/traceable";

const appelTrace = traceable(
  async (system: string, messages: readonly { role: "user" | "assistant"; content: string }[]) => {
    const r = await fetch("https://api.deepseek.com/chat/completions", { /* … identique à fournisseur.ts:243-251 … */ });
    const d = await r.json();
    return {
      texte: d.choices?.[0]?.message?.content ?? "",
      reflexion: d.choices?.[0]?.message?.reasoning_content ?? null,
      finish_reason: d.choices?.[0]?.finish_reason ?? null,
      usage_metadata: {
        input_tokens: d.usage?.prompt_tokens ?? 0,
        output_tokens: d.usage?.completion_tokens ?? 0,
        total_tokens: d.usage?.total_tokens ?? 0,
        input_token_details: { cache_read: d.usage?.prompt_cache_hit_tokens ?? 0 },
        output_token_details: { reasoning: d.usage?.completion_tokens_details?.reasoning_tokens ?? 0 },
      },
    };
  },
  { name: "deepseek.chat", run_type: "llm", metadata: { ls_provider: "deepseek", ls_model_name: "deepseek-v4-pro" } },
);
```

Les noms de champs DeepSeek viennent de https://api-docs.deepseek.com/api/create-chat-completion [LU].

**Coût DeepSeek dans LangSmith** [LU] — https://docs.langchain.com/langsmith/cost-tracking
- La table de prix livrée couvre « most OpenAI, Anthropic, and Gemini models ». DeepSeek n'y est pas : il faut ajouter une entrée de prix à la main.
- « Backfilling model pricing changes is not supported ».

Conséquence [DÉDUIT] :
- DeepSeek facture **heures pleines / creuses** (https://api-docs.deepseek.com/quick_start/pricing).
- Une table de prix statique ne peut pas suivre ce tarif horaire.
- Le coût exact exige d'envoyer `input_cost` / `output_cost` calculés **par Deribfy**. C'est la même arithmétique que celle que Deribfy fait déjà (`apps/web/src/lib/apps/fournisseur.ts:126-136`).

### 1.3 Sans LangChain ni LangGraph ?

**Confirmé** [LU] — https://docs.langchain.com/langsmith/serverless-environments :

> « …because LangSmith can be used without LangChain. »

Voir aussi https://docs.langchain.com/langsmith/home : « LangSmith works with many frameworks and providers. »

### 1.4 Auto-hébergement

**Disponible, mais seulement en Enterprise** [LU] — https://docs.langchain.com/langsmith/self-hosted
- « Self-hosted LangSmith is an add-on to the Enterprise plan ». Clé de licence via l'équipe commerciale.

**Infrastructure** [LU] — https://docs.langchain.com/langsmith/kubernetes
- Kubernetes + Helm (ou Terraform).
- « At least 16 vCPUs and 64GB of memory ».
- Stockage : PostgreSQL, Redis/Valkey, ClickHouse (ou SmithDB, qui exige PostgreSQL 18), et un stockage blob recommandé.
- Connexion sortante vers `beacon.langchain.com` pour la licence, sauf en mode air-gapped.

**Prix : UNKNOWN** (« Custom pricing », https://www.langchain.com/pricing).

**BYOC** [LU] — https://docs.langchain.com/langsmith/byoc
- Également réservé à Enterprise.
- AWS en GA, avec une région possible au **Canada, `ca-central-1`**.
- Le plan de contrôle reste aux États-Unis (`us-east-2`).

**Complexité** [DÉDUIT]
- Deribfy n'opère aucun cluster Kubernetes aujourd'hui : il est sur Vercel + Supabase.
- L'auto-hébergement ajouterait une infrastructure complète à exploiter.

### 1.5 Données : où elles vont, combien de temps, quelles garanties

**Régions SaaS** [LU] — https://docs.langchain.com/langsmith/cloud
- US (défaut, GCP us-central1), EU (europe-west4, Pays-Bas), APAC (Sydney), AWS US (Ohio), Azure US (Iowa).
- **Aucune région SaaS au Canada.** Pas de mention de l'Afrique.
- La facturation est « stored exclusively in the US ».

**Rétention** [LU] — https://docs.langchain.com/langsmith/usage-and-billing et https://docs.langchain.com/langsmith/data-purging-compliance

> **Révision du 2026-11-15** (demande de correction « 180 → 400 jours »). Pages relues le jour même par `curl` des sources `.md`.

- **Trace de base : 14 jours. Trace étendue : 180 jours en SaaS.**
  - Tableau « Retention Period | 14 days | 180 days » : `usage-and-billing.md`, l. 26-29.
  - « Starting September 14, 2026, the maximum long-lived trace retention period for SaaS customers is changing to 180 days » : même page, l. 33 ; même phrase sur https://docs.langchain.com/langsmith/billing (l. 131).
  - Valeurs proposées en Enterprise : 30, 60, 90, 120, 150 et 180 jours, « maximum as of September 14, 2026 » (`data-purging-compliance.md`, l. 42 et 63).
- **Le chiffre de 400 jours existe, mais pas pour le SaaS actuel.**
  - C'est la valeur par défaut du chart Helm **auto-hébergé** : « The Helm chart defaults to 14 days for `shortlived` and 400 days for `longlived` » (https://docs.langchain.com/langsmith/self-host-ttl, l. 30).
  - Les déploiements auto-hébergés « are not subject to this cap » (`data-purging-compliance.md`, l. 42).
  - Le mot « changing » indique que le SaaS avait une autre valeur avant le 2026-09-14. **Laquelle : UNKNOWN**, les pages actuelles ne la donnent pas.
  - Ce document maintient donc **180 jours** pour le SaaS et **400 jours** pour l'auto-hébergé (Enterprise).
- Une durée étendue personnalisée n'est possible qu'en Enterprise.
- **Après expiration** [LU] : « traces are no longer accessible in the tracing project UI or via the API. All user data associated with the trace (e.g. inputs and outputs) is deleted… » (`usage-and-billing.md`, l. 37).

**Jeux de données (datasets) : rétention indéfinie** [LU] — https://docs.langchain.com/langsmith/usage-and-billing, l. 90
- « Datasets have an indefinite data retention period. Restated differently, if you add a trace's inputs and outputs to a dataset, they will never be deleted. »
- La doc décrit aussi le geste : une règle d'automatisation qui envoie des runs vers un dataset, pour les garder « longer than 180 days… and will persist indefinitely, even after the trace gets deleted » (https://docs.langchain.com/langsmith/billing, l. 178).
- [DÉDUIT] Un dataset garde les **entrées et sorties** d'un run, pas l'arbre complet de la trace (tours enfants, durées, chronologie). Pour garder l'historique d'une génération entière, il faut donc choisir ce qu'on y range.

**Passage automatique en rétention étendue** [LU] — https://docs.langchain.com/langsmith/usage-and-billing, section « Data retention auto-upgrades », l. 45-90

Ce qui fait passer une trace en étendue :
- **Retour (feedback) envoyé par l'API ou le SDK**, seulement s'il passe explicitement `extend_trace_retention=true` (`extendTraceRetention: true` en TypeScript).
  - « The LangSmith UI sends feedback and notes without extending retention. »
- **Évaluateurs en ligne** dont le réglage de rétention est activé.
- **Règles d'automatisation** dont le réglage de rétention est activé.
  - « Matching a single run upgrades the entire trace. »
  - Une règle de type *Threads* fait passer en étendue toutes les traces du fil.
- Pour ces deux dernières, le réglage est actif **par défaut** : « Retention extension is enabled by default for new online evaluators and automation rules. You can opt out… »
- **Expériences** : « Runs are created at extended retention by default » (l. 83).

Ce qui ne fait **pas** passer en étendue :
- « **Manual annotation queue adds** (no upgrade) » ;
- « UI feedback, notes, and annotation queues: Leave a trace's retention tier unchanged » (l. 85).

**Prix d'une trace étendue** [LU] — infobulle de https://www.langchain.com/pricing : « 0.005 LSU/base trace / 0.0025 LSU/extended trace upgrade ».
- [DÉDUIT par addition] Une trace étendue coûte 0,0075 LSU, soit **1,5 fois** une trace de base.
- Ce n'est pas le double.

**Conformité** [LU] — https://docs.langchain.com/langsmith/regions-faq
- RGPD, SOC 2 Type 2, HIPAA.
- DPA disponible.
- « We do not have a legal entity in the EU for customer contracting today. »

**Modèle de DPA** [LU] — https://www.langchain.com/dpa (PDF V.2 du 2025-10-31)
- Clauses contractuelles types UE.
- Préavis de 7 jours avant un nouveau sous-traitant.
- **Liste des sous-traitants : UNKNOWN.** La page `trust.langchain.com/subprocessors` est rendue en JavaScript et n'a pas pu être lue.

**Entraînement** [LU] — FAQ de https://www.langchain.com/pricing
- « LangSmith does not use your data to train models. »

**Masquage** [LU] — https://docs.langchain.com/langsmith/mask-inputs-outputs
- `LANGSMITH_HIDE_INPUTS` / `LANGSMITH_HIDE_OUTPUTS`.
- `hideInputs` / `hideOutputs` sur le `Client`.
- `createAnonymizer`.

**Certifications ISO : UNKNOWN.**

**Ce que cela signifie pour Deribfy** [DÉDUIT]
- Tracer la génération, c'est envoyer à un tiers américain le **cahier des charges du client** et le **code généré**, en entier.
- Pour un client canadien ou tchadien, aucune région de résidence locale n'existe en SaaS.

### 1.6 Tarification et scénario chiffré

**Plans** [LU] — https://www.langchain.com/pricing
- **Developer** : 0 $, 1 place, 5 000 traces de base par mois.
- **Plus** : 39 $ par place et par mois, 10 000 traces de base incluses.
- **Enterprise** : prix sur devis.
- Au-delà de l'inclus : 0,005 LSU par trace de base, soit **5 $ / 1 000 traces**, et +0,0025 LSU par passage en étendue (1 LSU = 1 $).

**Une trace** = une opération racine et tous ses runs enfants, jusqu'à 25 000 runs par trace [LU] — https://docs.langchain.com/langsmith/observability-concepts.

**Scénario : 1 000 générations par mois** [DÉDUIT par calcul]

| Découpage | Traces / mois | Developer | Plus (1 place) |
|---|---|---|---|
| 1 trace racine par génération (recommandé) | 1 000 | 0 $ | 39 $ |
| 10 traces racines par génération | 10 000 | 5 000 × 0,005 = 25 $ (carte exigée) | 39 $ |
| 1 trace / génération, toutes passées en étendue (180 j) | 1 000 | 0 $ + 2,50 $ ? | 39 $ + 2,50 $ ? |

- **UNKNOWN :** l'allocation gratuite couvre-t-elle aussi les passages en étendue ?
- **Le vrai coût est bas.** De 0 à environ 40 $ par mois à ce volume. La facture n'est pas l'argument décisif.

**Révision du 2026-11-15 — estimation optimiste.** [DÉDUIT de §1.5]
- La ligne « 1 trace racine par génération » suppose qu'aucune trace ne passe en étendue. Or le geste même qui donnerait de la valeur à LangSmith fait passer les traces en étendue **par défaut** : une règle d'automatisation, un évaluateur en ligne, ou une expérience.
- Le scénario réaliste se situe donc entre la première ligne du tableau et la troisième (« toutes passées en étendue », soit 1,5 fois le prix de base par trace).
- Pour garder plus de 180 jours, il faut en plus une règle vers un dataset (§1.5). Cette règle est elle-même, par défaut, une règle qui fait passer en étendue.
- L'ordre de grandeur reste de quelques dizaines de dollars par mois à 1 000 générations. La conclusion « la facture n'est pas l'argument décisif » tient.

**Volume de données** [DÉDUIT]
- Une génération, c'est 1 à 3 tours (`apps/web/src/lib/apps/boucle-directe.ts:251`).
- Chaque tour renvoie jusqu'à environ 200 Ko de code.
- Soit environ 0,4 à 1 Go par mois, loin des plafonds d'ingestion : 5 Go par heure en Plus (https://docs.langchain.com/langsmith/usage-and-billing).

**Taille maximale officielle d'un run : UNKNOWN.**
- Seule la constante du SDK a été lue : 24 Mo par lot non compressé.

---

## TEMPS 2 — Inventaire de l'existant

### 2a) Les adaptateurs DeepSeek

Il y a **deux adaptateurs**, conservés délibérément (décision stratégique du propriétaire : ne pas dépendre d'un seul fournisseur). Aujourd'hui, les deux pointent vers DeepSeek.

**1. `appelerFournisseur`** — `apps/web/src/lib/apps/fournisseur.ts:230-285`

C'est l'adaptateur de la **génération d'application**.

- **Signature** (`fournisseur.ts:230-235`) :
  ```ts
  appelerFournisseur(f: Fournisseur, cle: string, system: string,
    messages: readonly { role: 'user' | 'assistant'; content: string }[]): Promise<Reponse>
  ```
- **Valeur rendue** (`Reponse`, `fournisseur.ts:204-222`) : `texte`, `usage {entree, sortie}`, `tronquee`.
- **Branche DeepSeek** (`fournisseur.ts:238-263`) :
  - `fetch` brut, sans SDK, vers `https://api.deepseek.com/chat/completions`, au format OpenAI, sans flux.
  - Paramètres envoyés : `model`, `max_tokens` (65 536, `fournisseur.ts:185`), `messages`.
  - **Aucun délai d'expiration** sur le `fetch` (`fournisseur.ts:243-251`).
  - **Lu dans la réponse :**
    - `choices[0].message.content` (`:258`) ;
    - `usage.prompt_tokens` et `usage.completion_tokens` (`:259`) ;
    - `finish_reason === 'length'` (`:261`).
  - **Non lu :**
    - `reasoning_content` ;
    - `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` ;
    - `completion_tokens_details.reasoning_tokens` ;
    - tout `finish_reason` autre que `length`.
  - Le mode réflexion est **activé par défaut** chez DeepSeek [LU] — https://api-docs.deepseek.com/guides/thinking_mode.
  - Le code n'envoie aucun paramètre `thinking`.
  - [DÉDUIT] La réflexion est donc produite, facturée en sortie, puis jetée.
- **Branche Anthropic** (`fournisseur.ts:265-284`) : SDK `@anthropic-ai/sdk` en flux, réactivable par `GENERATEUR_FOURNISSEUR`.
- **Choix du fournisseur :** `fournisseurChoisi`, `fournisseur.ts:69-71`. Seule la valeur exacte `deepseek` bascule.

**2. `clientIA()`** — `apps/web/src/lib/ia/client.ts:33-40`

C'est l'adaptateur des **autres routes**.

- Il rend un client `Anthropic` dont la `baseURL` vaut `${C.baseURL}/anthropic` (`client.ts:38`), donc l'endpoint Anthropic de DeepSeek.
- Routes appelantes, sur le chemin de génération :
  - `apps/web/src/app/api/generateur/lire-brief/route.ts:131` (lecture du cahier) ;
  - `apps/web/src/app/api/generateur/retoucher/route.ts:385` (retouche).
- Hors génération : `chat`, `onboarding`, `blog`, `marketing`, `catalog/*`, `agent`, `sites/[slug]/assistant`, `cron/catalog-*`.

**Points d'entrée pour greffer une instrumentation**

| Niveau | Endroit | Ce qu'on y voit |
|---|---|---|
| Adaptateur 1 | `fournisseur.ts:230` | Toute la requête (system, messages) et toute la réponse brute, pour **les deux dialectes**. |
| Adaptateur 2 | `client.ts:36` | Le client construit. Il existe un **précédent** d'enveloppe du SDK : `sdkJournalise`, `apps/web/src/lib/apps/journal-appels.ts:109-155`. Il est branché seulement sur le moteur option 2 (`apps/web/src/lib/apps/moteur.ts:60`). |
| Pipeline | La fermeture `appeler`, `D:439-451`, injectée dans `boucleEcriture` (`D:519-528`) | Elle ne voit que `texte` et `tronquee`. Le type `Appeler` (`boucle-directe.ts:247-249`) jette l'usage et tout le reste. |

### 2b) Le pipeline de génération d'une application (option 1, `main`)

1. **Écran.** `apps/web/src/components/onboarding/ConversationApplication.tsx`.
2. **Lecture du cahier.** `POST /api/generateur/lire-brief` (`ConversationApplication.tsx:718`).
   - Un appel LLM léger, par tranches de 24 000 signes (`apps/web/src/lib/apps/lecture-brief.ts`, constante `TAILLE_TRANCHE`).
   - `clientIA().messages.create` avec `MODELE_LEGER`, `thinking: disabled`, `max_tokens` 8 000 (`lire-brief/route.ts:131-137`).
   - Il rend les entités, les déductions et une « lecture ».
3. **Pré-vol.** `POST /api/generateur/avant` (`ConversationApplication.tsx:732`) : la configuration (devise, etc.).
4. **Génération.** `POST /api/generateur/direct` (`ConversationApplication.tsx:1069`, `D:290`).
   - **Gardes :**
     - authentification (`D:291`) ;
     - interrupteur de moteur = `direct` (`D:300`) ;
     - fournisseur et clé (`D:313-318`) ;
     - entités revalidées (`D:346-350`) ;
     - fusible de taille (`D:388`).
   - **Réponse en flux ndjson,** avec un battement toutes les 10 s (`D:475-509`) ; `maxDuration` = 900 s (`D:61`).
   - **Boucle d'écriture,** `boucleEcriture` (`boucle-directe.ts:325-746`), 3 tours au plus (`:251`). À chaque tour :
     1. appel du modèle (`:387`) ;
     2. lecture des fichiers (`:389`) ;
     3. déclaration d'entités en route (`:396-420`) ;
     4. troncature, aucun fichier, ou paquets interdits (`:433-455`) ;
     5. injection des fichiers `systeme/` (`:463-474`) ;
     6. assemblage (`:476`) ;
     7. juges : jetons, contrat, vivacité, devise, exécution (simulateur), couverture, persistance, gestion, faces (`:488-572`) ;
     8. si un juge reproche quelque chose, le reproche devient le message du tour suivant (`:684-685`, `:736-737`).
5. **Coût.** Calculé **une seule fois en fin de génération**, au tarif de l'heure de **fin** (`D:615-616`), sans compter les jetons en cache.
6. **Écriture d'`app_generations`** (`D:624-817`).
   - Œuvre neuve : `insert`.
   - Régénération (`?id=`) : **`update` de la même ligne** (`D:811-817`).
7. **Version** dans `app_generation_versions`, en succès seulement (`D:832-879`). On garde les 10 dernières plus le rang 1 (`apps/web/src/lib/apps/versions-oeuvre.ts:127,135-141`).
8. **Réponse** à l'écran : HTML autonome, verdicts, coût, durée (`D:897-912`).

**État de la production.** Selon la mémoire de session, la génération d'applications est **en pause** depuis le 2026-11-14 : `NEXT_PUBLIC_GENERATION_ASYNC=0` sur Vercel.
- La variable Vercel elle-même : **non revérifiée ici**.
- Le code, lui, est vérifié : le bouton « Régénérer » est remplacé par « Bientôt disponible » quand `GENERATION_OUVERTE` est faux (`apps/web/src/app/dashboard/page.tsx:840-851`).

### 2c) Ce qui surveille déjà aujourd'hui

**1. Table `app_generations`** (DDL : `apps/web/src/lib/apps/journal.ts:393+`, nom `:819`)
- **Capture** (`D:624-801`) :
  - `demande` (texte entier) ;
  - `nom`, `moteur`, `fournisseur`, `ok`, `statut` ;
  - `cout_usd`, `duree_ms`, `jetons_entree`, `jetons_sortie` (**totaux de la génération**) ;
  - `tirages` (nombre de tours) ;
  - `diagnostics` (phrases des juges) ;
  - `document` (fichiers, schéma SQL, politiques, entités, configuration), **en succès seulement** ;
  - `sections_acquises`, qui contient :
    - `configuration` ;
    - `lectureBrief` ;
    - `deploiement {commit, environnement, branche}` (`apps/web/src/lib/apps/deploiement.ts:38-44`) ;
    - `tours[]` : rang, nombre de fichiers, ok, **motif** (le reproche envoyé au modèle), tronquée, ms, et **`source`, les fichiers rendus aux tours REFUSÉS**, jusqu'à 200 000 caractères (`boucle-directe.ts:712-719`) ;
    - verdicts `jetons`, `execution`, `vivacite`, `couverture`, `persistance` ;
    - `dernierTexte` : la réponse brute du dernier tour, **en échec seulement**, jusqu'à 20 000 caractères (`D:800`).
  - Le chemin qui jette écrit aussi sa ligne, avec le message d'exception (`D:544-555`).
- **Ne capture pas :**
  - le **prompt système** (`consignePour(...)`, `boucle-directe.ts:320-323`, constante `CONSIGNE` `:100-159`, environ 3 Ko) ;
  - les **jetons et le coût par tour** ;
  - la **réflexion** du modèle ;
  - la réponse brute d'un tour **accepté** (seuls les fichiers parsés survivent, dans `document`) ;
  - la durée de chaque juge ;
  - les jetons en cache ;
  - `finish_reason` hors `length` ;
  - le statut HTTP d'un refus fournisseur (seulement le message, `fournisseur.ts:252`).
- **Consultable après coup ?** Oui, durablement, en base.
  - Lecteurs existants : `GET /api/admin/applications` (`apps/web/src/app/api/admin/applications/route.ts:43`, sélection de `sections_acquises` incluse) et la page `apps/web/src/app/admin/applications`.
  - Le prompt système est **reconstructible** à partir du commit enregistré (`deploiement.commit`) et des entités : c'est une reconstruction, pas une trace [DÉDUIT].

**2. Table `app_generation_versions`** (`journal.ts:713`)
- **Capture :** les fichiers, le schéma, les politiques et le coût de **chaque version réussie** (`D:833-855`).
- **Ne capture pas :** les échecs, ni les tours, ni les verdicts.
- **Consultable après coup ?** Oui, purgée au-delà de 10 versions, le rang 1 restant toujours gardé.

**3. Table `alertes_generation`** + courriel Resend (`apps/web/src/lib/alertes.ts:110-168`)
- **Capture :** sujet, étape, motif (500 caractères), détail (2 000 caractères), coût, et l'état de remise du courriel.
- Pour la génération : seulement quand la boucle **jette** (`D:559-564`), avec les 400 premiers caractères de la demande.
- **Ne capture pas :** les générations qui aboutissent mal (non convergence, verdicts rouges). Elles n'alertent pas depuis cette route.
- **Consultable après coup ?** Oui (table et courriel).

**4. Table `ai_usage_log`** (`apps/web/src/lib/ai-usage.ts:8-25`)
- **Capture :** type d'usage, modèle, jetons. Écrite par les autres routes (11 appels de `logAiUsage`).
- **Ne capture pas :** la route `direct` n'y écrit **pas** (aucun `logAiUsage` ni `journaliser` dans `D`).
- ⚠ Hors chantier, consigné : `journaliser` (option 2) y écrit `model: 'claude-opus-5'` en dur (`journal.ts:215`, `:353`), même quand DeepSeek répond.
- **Consultable après coup ?** Oui (`/admin/ai-usage`).

**5. Table `app_generation_calls`** + `sdkJournalise` (`journal-appels.ts:1-155`, table `journal.ts:774`)
- **Capture :** par appel : partie, poids de la grammaire, ms, jetons, issue.
- **Ne capture pas :** elle n'est **branchée que sur le moteur option 2** (`moteur.ts:60`), inerte aujourd'hui, et aucun contenu de prompt ni de réponse.
- **Consultable après coup ?** Oui. L'existence de la table en production : **UNKNOWN**.

**6. `console.error` / `console.warn` serveur** (journal Vercel)
- **Capture :**
  - `D:544` (la boucle a jeté) ;
  - `D:857` (version non écrite) ;
  - `lire-brief/route.ts:150-155` (réponse illisible : stop_reason, types de blocs, longueur — **pas le texte**) ;
  - `retoucher/route.ts:400` ;
  - `journal.ts:89`.
- **Ne capture pas :** aucun prompt, aucune réponse. Un seul `console.log` dans le périmètre.
- **Consultable après coup ?** **Perdu vite.** Rétention Vercel : Hobby 1 h, Pro 1 jour, 30 jours avec Observability Plus [LU] — https://vercel.com/docs/logs/runtime. Le plan Vercel du projet : **UNKNOWN**.

**7. Vercel Analytics + Speed Insights** (`apps/web/src/components/CookieConsent.tsx:4-5`)
- **Capture :** l'audience et les performances côté navigateur, sous consentement.
- **Ne capture pas :** rien de la génération.
- **Consultable après coup ?** Sans objet ici.

**8. Battement / surveillance** (`apps/web/src/lib/apps/surveillance.ts`, `cron/watchdog`)
- **Capture :** des bornes de phase, pour le chemin **asynchrone / option 2** (phases `comprehension`, `emission`, etc.).
- **Ne capture pas :** le chemin direct.
- **Consultable après coup ?** Oui, via les alertes.

**9. Sentry, OpenTelemetry, Datadog, Helicone, LangSmith…**
- **Absents.** Aucune dépendance dans `apps/web/package.json:14-50`, et aucun fichier `instrumentation`.

**10. `erp_activity_log`**
- **Supprimée** (`apps/web/supabase/sql/drop_erp_tables.sql:31`). Aucun lien avec la génération.

**11. Hors production (pour mémoire)**
- `apps/web/docs/REGISTRE-TIRS.md` : registre manuel des tirs payés.
- Le dépôt séparé `deribfy-lab` : ses propres relevés d'essais.
- La branche en pause `etape-v3` garde en plus le « brut B » de la passe B (`apps/web/src/lib/apps/contrat/generation.ts:325` sur `etape-v3`).

### 2d) Conclusion factuelle : quand une application est mal générée, que sait-on ?

**Ce n'est pas « aucune ».** Pour une génération donnée, une ligne `app_generations` durable permet de savoir :
- la demande exacte, la configuration transmise, la lecture du cahier ;
- le commit qui a servi ;
- combien de tours, et pour chaque tour : refusé ou non, **pourquoi** (le reproche exact renvoyé au modèle), coupé ou non, combien de temps ;
- le **code rendu à chaque tour refusé** (≤ 200 Ko) ;
- en échec, les 20 000 premiers caractères de la dernière réponse brute ;
- en succès, les fichiers livrés et les verdicts de chaque juge ;
- le coût et les jetons **totaux**.

**Ce qu'on ne sait pas :**
1. Le **prompt système** réellement envoyé. Il n'est que reconstructible via le commit.
2. Le **coût et les jetons de chaque tour.** Impossible de dire quel tour a coûté quoi.
3. La **réflexion** du modèle : pourquoi il a écrit ce qu'il a écrit. Elle est produite, facturée, puis jetée.
4. **Après une régénération, tout ce qui précède est écrasé** (défaut autonome, §2e).
5. La réponse brute d'un tour accepté. Le statut HTTP exact d'un refus fournisseur.
6. Les journaux serveur, qui expirent en 1 h à 30 jours selon le plan.

### 2e) Défaut autonome — « Régénérer » écrase la trace (indépendant du verdict)

> Constat de lecture du code [LU], **non mesuré en base**. Rien n'est corrigé.

**Mécanisme**
- La régénération appelle la même route avec `?id=` (`apps/web/src/app/dashboard/page.tsx:205`).
- La demande est relue sur la ligne (`D:371-383`).
- La nouvelle ligne est écrite par **`update`** sur la même ligne (`D:811-817`), avec toutes les colonnes de `ligne` (`D:624-801`).

**Ce qui est perdu à chaque régénération** (écrasé par la nouvelle valeur) :
- `sections_acquises` entier :
  - `tours` (motifs, durées, **sources des tours refusés**) ;
  - `lectureBrief`, `configuration`, `deploiement` (commit) ;
  - verdicts `jetons` / `execution` / `vivacite` / `couverture` / `persistance` ;
  - `dernierTexte`.
- `diagnostics`, `cout_usd`, `duree_ms`, `jetons_entree`, `jetons_sortie`, `tirages`, `ok`, `statut`, `fournisseur`.
- **Si la régénération échoue, `document` est remis à `null`** (`D:749-776`).
  - L'aperçu lit justement `document` sur la ligne (`apps/web/src/app/api/generateur/direct/[id]/route.ts:53-58`).
  - [DÉDUIT] L'aperçu de l'œuvre précédente cesse donc de s'ouvrir, alors que l'écran affiche « votre version actuelle n'a pas bougé » (`dashboard/page.tsx`, bloc de `regenerer`).
  - Les fichiers survivent dans `app_generation_versions`.
  - C'est une conséquence du même défaut de conception, à faire vérifier par une mesure avant tout chantier.

**Ce qui survit**
- Pour chaque version **réussie** : fichiers, schéma, politiques et coût, dans `app_generation_versions` (`D:849-855`), dans la limite de 10 versions plus le rang 1.
- **Rien des tentatives échouées, ni des tours, ni des verdicts.**
- Le coût d'une régénération échouée ne survit nulle part après la régénération suivante.

**Pourquoi c'est bloquant pour le protocole**
- La boucle « réparer le générateur → regénérer une œuvre neuve → comparer » exige les deux traces côte à côte.
- Si la comparaison passe par « Régénérer », la trace « avant » est détruite au moment même où la trace « après » s'écrit.
- [DÉDUIT] Une œuvre *neuve* (insert sans `?id=`) ne subit pas l'écrasement : le contournement actuel est de toujours comparer deux lignes distinctes.

**Ce qu'il faudrait pour garder l'historique** (deux options, à arbitrer plus tard)

*Option H1 — une ligne par tentative.* Une table fille `app_generation_attempts`, liée à `generation_id`, porte tout ce que `sections_acquises` et les colonnes de mesure portent aujourd'hui, une ligne par exécution réussie ou échouée.
- `app_generations` ne garde que l'état courant et un pointeur vers la dernière tentative.
- Une régénération échouée ne touche plus `document`.

*Option H2 — étendre `app_generation_versions` aux échecs.* Une version « échouée » porterait la trace sans fichiers.
- Plus petit, mais cela mélange historique de l'œuvre et historique des essais, et touche la purge (`versions-oeuvre.ts:135-141`).

**Ordre de grandeur** [ESTIMÉ] : **2 à 3 jours** pour H1.
- Migration SQL : DDL dans `journal.ts`, cliquet colonnes/insert, table jumelle `_test`.
- Écriture dans `D`.
- Lecteurs : admin, mes-applications.
- Tests, et la preuve par deux régénérations à zéro dollar (doubles), puis un tir réel sur accord.

**Aucun outil externe ne corrige ce défaut**, parce qu'il est dans la table qui fait foi pour Deribfy. Voir §3, trou 4, pour ce qu'un outil externe ferait réellement.

---

## TEMPS 3 — Débat contradictoire

**Cadrage imposé :** LangSmith contre **l'existant complété** sur ses quatre trous. Aucune autre comparaison.

### 3.0 Où placer l'instrumentation (neutralité fournisseur)

**(a) Au niveau de l'adaptateur** — `appelerFournisseur` (`fournisseur.ts:230`) et l'enveloppe de `clientIA()` (`client.ts:36`)
- **Pour :**
  - C'est le seul endroit qui voit la requête et la **réponse brute entière**, dont réflexion, cache et `finish_reason`.
  - Il est **neutre par construction** : chaque dialecte est traduit ici et nulle part ailleurs (`fournisseur.ts:224-229`).
  - Un troisième fournisseur ajouté ici serait tracé d'office.
- **Contre :**
  - Il ignore le contexte : quelle génération, quel tour.
  - Il faut le lui passer, ou le lire via une trace parente.

**(b) Au niveau du pipeline** — la fermeture `appeler` (`D:439-451`) et `boucleEcriture`
- **Pour :** elle connaît la génération, le rang du tour et les verdicts des juges.
- **Contre :**
  - Le type `Appeler` (`boucle-directe.ts:247-249`) a déjà **jeté** l'usage et tout ce qui n'est pas `texte` / `tronquee`.
  - Instrumenter ici ne verrait ni la réflexion, ni le cache, ni la réponse brute.

**(c) À chaque appel fournisseur** (chaque route)
- **Contre :** plus de quinze sites (§2a), et la neutralité n'existerait que si chaque site était écrit pareil. C'est **neutre par accident**, exactement ce qui est exclu.

**Tranché : (a) comme source des faits, (b) comme porteur du contexte.**
- L'adaptateur produit un enregistrement par appel, identique quel que soit le dialecte.
- Le pipeline y ajoute `generation_id` et `rang`, et y rattache les verdicts.
- (c) est rejeté.

Ce choix vaut **pour les deux thèses** : un journal maison ou LangSmith se grefferaient au même endroit.

**Neutralité multi-fournisseur réelle : UNKNOWN.**
- Les deux chemins vont aujourd'hui chez DeepSeek (`client.ts:38`, `fournisseur.ts:238`).
- La branche Anthropic d'`appelerFournisseur` (`fournisseur.ts:265-284`) n'a pas été exercée contre la vraie API Anthropic dans cette étude.
- Le comportement de `wrapAnthropic` contre l'endpoint Anthropic de DeepSeek n'est pas documenté (§1.2 C).
- Elle ne peut être déclarée acquise ni sur la conception, ni sur une page de documentation. Elle ne le sera qu'après un tir réel sur chaque fournisseur.

### 3.1 Ce que LangSmith apporterait que l'existant ne donne pas

Précisément, et rien d'autre :

1. **Une interface de lecture des traces.**
   - Arbre génération → tours → appels, chronologie des durées, recherche et filtres par métadonnée, comparaison côte à côte de deux runs.
   - Aujourd'hui : du JSON brut dans `sections_acquises`, lu via `/admin/applications`.
2. **Rejeu d'un appel** dans le « playground » avec le prompt capturé, et constitution de jeux de données d'évaluation à partir de traces réelles.
   - Ce dernier point est non vérifié dans le détail, hors périmètre de la recherche : **UNKNOWN** sur l'usage exact sans LangChain.
3. **Une trace séparée par exécution, par construction**, donc pas d'écrasement à la régénération.
   - La trace est limitée à **14 jours (base) ou 180 jours (étendue, SaaS)** (§1.5), et elle est hors de la base Deribfy.
   - Une conservation **indéfinie** est techniquement possible en recopiant les entrées et sorties vers un **dataset** (§1.5), au prix d'une règle d'automatisation et d'un choix de ce qu'on y range.

LangSmith n'apporte **pas** la capture elle-même. Elle se code au même endroit (§3.0), et les deux trous de contenu (réflexion, coût horaire) exigent de modifier l'adaptateur dans les deux thèses (§1.2).

### 3.2 La thèse adverse : combler les quatre trous dans l'existant

Elle existe déjà dans le code. C'est `app_generations` (§2c), complétée.

**Elle couvre :**
- le contenu exact de chaque appel ;
- le coût par tour au tarif horaire juste ;
- l'historique durable, sans limite de rétention, dans la base que Deribfy contrôle déjà ;
- aucune donnée nouvelle ne sort vers un tiers.

**Elle ne couvre pas :**
- l'interface (§3.1, point 1) : la lecture reste du JSON ou une page admin à écrire ;
- le rejeu et les jeux d'évaluation (§3.1, point 2).

### 3.3 Les quatre trous, chiffrés côte à côte

Tous les chiffres sont **[ESTIMÉ]**, en jours de développement, preuve et tests compris selon la méthode du dépôt (`CLAUDE.md`).

**Socle commun à LangSmith seul** (à ajouter une fois) : **1 à 1,5 j**. Il comprend :
- la dépendance `langsmith` : nouvelle dépendance, à justifier selon `CLAUDE.md` (« NE PAS introduire de nouvelle dépendance sans nécessité démontrée ») ;
- les clés sur Vercel et l'interrupteur ;
- le vidage avant fin de fonction, avec une réponse en flux de 900 s (§1.1) ;
- **le masquage de la clé API**, qui est un argument positionnel d'`appelerFournisseur` (`fournisseur.ts:232`) : `traceable` le journaliserait comme entrée sans `processInputs` / `hideInputs` ;
- un test de non-fuite ;
- le contrat de prix manuel.

**Hors chiffrage :** revue juridique de la sortie des données (§3.4).

| # | Trou | Combler dans l'existant | Obtenir via LangSmith |
|---|---|---|---|
| 1 | **Prompt système non stocké** | **0,5 j.** Le texte, environ 3 Ko + bloc d'entités (`boucle-directe.ts:100-159`, `:320-323`), ou son empreinte + texte une fois par génération, dans `sections_acquises.tours[]`. Étendre le type `Tour` (`boucle-directe.ts:161-177`). | **0,25 j** + socle. Capturé d'office comme entrée de `traceable` à l'adaptateur. Seul coût propre : masquer la clé voisine. |
| 2 | **Jetons et coût non comptés par tour** | **0,5 à 1 j.** `Reponse.usage` existe déjà (`fournisseur.ts:203-206`). Le faire traverser `Appeler` (`boucle-directe.ts:247-249`), l'écrire dans `Tour`, lire `prompt_cache_hit_tokens`, appliquer `tarifDe` à l'heure de **chaque** appel (`fournisseur.ts:134-136`) au lieu de l'heure de fin (`D:615`). | **0,5 à 1 j** + socle. `usage_metadata` doit être rendu à la main (§1.2 A), et le coût horaire calculé à la main puis envoyé (`input_cost` / `output_cost`) : **la même arithmétique**, plus l'entrée de prix manuelle. Aucun gain. |
| 3 | **Réflexion du modèle non lue** | **0,5 j.** Lire `reasoning_content` et `reasoning_tokens` (`fournisseur.ts:253-262`), les rendre dans `Reponse`, les ranger bornés par tour (taille réelle : **UNKNOWN**, à mesurer). Côté Anthropic, lire les blocs `thinking` (`fournisseur.ts:280`). | **0,5 j** + socle. LangSmith ne voit que ce que la fonction tracée **rend**. L'adaptateur jette `reasoning_content` aujourd'hui, il faut donc **le même changement d'adaptateur**. Aucun gain. |
| 4 | **« Régénérer » écrase la trace** | **2 à 3 j** (option H1, §2e). Durable, dans la base qui fait foi. Corrige aussi l'effacement de `document` en cas d'échec. | **0,25 j** + socle, pour poser `generation_id` en métadonnée : chaque exécution devient une trace distincte, gardée 14 / 180 jours. **Conservation indéfinie possible** par une règle d'automatisation vers un dataset (§1.5) : **+0,5 à 1 j** [ESTIMÉ] pour définir quoi y ranger et le vérifier, et cette règle fait passer les traces en étendue par défaut. **Dans tous les cas**, l'historique vit hors de la base, sans lien avec l'écran, et **la ligne `app_generations` continue d'être écrasée** et `document` d'être vidé. L'historique **peut** être gardé chez LangSmith, avec du travail **en plus**, mais le défaut de Deribfy n'est pas fermé. Le fermer coûte toujours 2 à 3 j. |

**Totaux** [ESTIMÉ]

| | Existant complété | LangSmith |
|---|---|---|
| Quatre trous | **3,5 à 5 j** | 1,5 à 2 j + socle 1 à 1,5 j = **2,5 à 3,5 j** |
| Historique indéfini côté LangSmith (dataset) | sans objet | **+ 0,5 à 1 j** |
| Trou 4 réellement fermé | inclus | **+ 2 à 3 j** de travail maison de toute façon, soit **4,5 à 6,5 j** (5 à 7,5 j avec le dataset) |

### 3.4 Coûts cachés de LangSmith

1. **Instrumentation étape par étape.**
   - Le seul point qui vaut est l'adaptateur. La plateforme n'y apporte aucune capture automatique utile : pas de SDK `openai`, donc pas de `wrapOpenAI` (§1.2 B).
   - Tout passe par `traceable` avec usage et coût rendus à la main.
2. **Fuite de secret par défaut.**
   - La clé API est un argument positionnel (`fournisseur.ts:232`).
   - Un `traceable` naïf posé sur l'adaptateur l'enverrait à LangSmith.
   - Il faut un masquage, et un test qui le prouve.
3. **Dépendance externe instable.** Dépôt déplacé le 2026-10-16, version 0.12.0 avec ruptures le 2026-11-10 (§1.1). La documentation DeepSeek de LangSmith est déjà périmée (§1.2 A).
4. **Coût DeepSeek non automatique.** Il faut une entrée de prix manuelle. Le tarif heures pleines / creuses n'est pas représentable sans envoyer le coût soi-même. Pas de rétroactivité (§1.2).
5. **Sortie des données.**
   - Cahiers des clients et code généré envoyés en entier aux États-Unis ou dans l'UE.
   - **Aucune région Canada en SaaS.** Pas d'entité contractante dans l'UE.
   - Sous-traitants : UNKNOWN.
   - Une résidence au Canada n'existe qu'en **BYOC Enterprise** (prix UNKNOWN) (§1.5).
   - Masquer les entrées et sorties pour se protéger annulerait l'intérêt même de la trace.
6. **Rétention courte.** 14 jours par défaut. Au-delà, c'est payant et plafonné à 180 jours en SaaS (§1.5).
   - Garder plus longtemps passe par un dataset (rétention indéfinie), donc par une règle d'automatisation de plus à écrire et à maintenir.
7. **Passages automatiques en étendue** (§1.5). Évaluateurs en ligne, règles d'automatisation et expériences font passer les traces en étendue **par défaut**. Chacune coûte alors 1,5 fois une trace de base. Il faut désactiver ce réglage règle par règle, ou l'accepter.
8. **Facture.** 0 à environ 40 $ par mois pour 1 000 générations (§1.6). Ce chiffre est optimiste, puisqu'il ne compte pas les passages en étendue. **Ce n'est toujours pas un coût caché significatif.**

### 3.5 VERDICT

**NON.**

**Raison principale.** Sur les quatre trous qui fondent la comparaison :
- LangSmith n'en ferme réellement **aucun mieux** que l'existant.
- Deux (réflexion, coût par tour) exigent **exactement le même changement d'adaptateur**.
- Un (prompt système) ne fait gagner qu'un quart de journée.
- Le quatrième (écrasement) n'est que **contourné**, hors de la base. La conservation peut devenir indéfinie via un dataset, mais au prix de travail **supplémentaire**. La ligne Deribfy continue, elle, d'être écrasée.

Le prix à payer : une dépendance instable, un risque de fuite de la clé API, et la sortie hors du Canada et du Tchad des cahiers et du code des clients.

**Ce qui pourrait rouvrir la question** (et seulement cela) :
- un besoin démontré de l'**interface** de lecture, de rejeu ou d'évaluation (§3.1, points 1-2), une fois les quatre trous comblés dans l'existant ;
- ou une option à résidence locale à prix connu.

**Le Temps 4 n'est pas rédigé, puisque le verdict est NON.**

---

## Liste consolidée des UNKNOWN

1. Taille maximale officielle d'un run ou d'une charge sur le SaaS LangSmith.
2. Liste des sous-traitants de LangChain.
3. Si l'allocation gratuite couvre les passages en rétention étendue.
4. Prix Enterprise, auto-hébergé et BYOC.
5. Si `https://api.deepseek.com/v1` et `deepseek-chat` (documentation LangSmith) répondent encore.
6. Si `wrapOpenAI` permet de surcharger `ls_provider`.
7. Comportement de `wrapAnthropic` contre l'endpoint Anthropic de DeepSeek.
8. Certifications ISO de LangChain.
9. Usage exact du rejeu et des jeux d'évaluation sans LangChain.
10. **Neutralité multi-fournisseur réelle de toute instrumentation** : non vérifiable tant que les deux chemins vont chez DeepSeek.
11. Taille réelle de `reasoning_content` par tour sur `deepseek-v4-pro`.
12. Plan Vercel du projet, donc la rétention réelle de ses journaux.
13. Existence en production de la table `app_generation_calls`.
14. Valeur actuelle de `NEXT_PUBLIC_GENERATION_ASYNC` sur Vercel (connue par la mémoire de session, non revérifiée ici).
15. Effet réel, mesuré, de l'effacement de `document` lors d'une régénération échouée (§2e : déduit de la lecture, non mesuré). Preuve séparée : `PREUVE_REGENERATION.md`.
16. Rétention étendue du SaaS LangSmith **avant** le 2026-09-14 (révision du 2026-11-15, §1.5).

## Consigné hors chantier (non corrigé)

- `journal.ts:215` et `:353` : `model: 'claude-opus-5'` est écrit en dur dans `ai_usage_log`, quel que soit le fournisseur.
- `fournisseur.ts:243` : le `fetch` vers DeepSeek n'a pas de délai d'expiration.
- `D:615-616` : le coût est calculé au tarif de l'heure de **fin** et ignore le tarif du cache.
- La génération directe n'écrit pas dans `ai_usage_log`. Le total « Consommation IA » de la plateforme l'exclut donc [DÉDUIT].
