/**
 * LE JOURNAL DES GENERATIONS — on surveille au lieu d'empecher.
 *
 * ── CE QU'IL REMPLACE.
 *
 * J'avais pose un plafond de 6 $ par application. Le proprietaire :
 * « si ce que demande l'utilisateur coute plus de 6 $, alors d'apres toi il
 * faut empecher ? » Non. Une application riche coute plus cher, c'est une
 * information, pas une faute.
 *
 * Le plafond est retire. Ce fichier est ce qui le remplace : chaque
 * generation — reussie OU refusee — laisse une ligne avec son cout, et
 * l'administration la montre.
 *
 * ── LES REFUS COMPTENT AUTANT QUE LES REUSSITES.
 *
 * Mesure du 2026-10-08 : trois tirages P0 refuses ont coute 0,8209 $ et n'ont
 * rien produit. Un journal qui n'enregistrerait que les reussites afficherait
 * un cout FAUX — et c'est precisement la depense qu'il faut voir, puisqu'elle
 * ne rend rien.
 *
 * ── DEUX ECRITURES, ET POURQUOI.
 *
 * `ai_usage_log` existe deja et alimente « Consommation IA ». On y ecrit
 * aussi, pour que le total de la plateforme reste juste SANS attendre quoi
 * que ce soit.
 *
 * `app_generations` porte ce que la premiere ne sait pas dire : la demande,
 * l'issue, les diagnostics. Son absence ne fait RIEN echouer — tant que la
 * table n'existe pas, l'ecriture est avalee, exactement comme `logAiUsage`.
 * Le suivi ne doit jamais casser une generation.
 */

export type LigneGeneration = {
  readonly email: string | null
  readonly demande: string
  readonly nom: string
  readonly ok: boolean
  readonly coutUsd: number
  readonly dureeMs: number
  readonly jetonsEntree: number
  readonly jetonsSortie: number
  /** DEJA FORMATES `CODE@chemin`, comme le travailleur les ecrit. Le code
   *  seul ne localise rien — mesure le 2026-10-10 : trois « SCHEMA » et
   *  aucun moyen de dire ou ils tombent sans re-payer un tir entier. */
  readonly diagnostics: string[]
  readonly tirages: number
  /** L'AIR livre, quand il y en a un. La contrainte `livree_a_document`
   *  l'EXIGE : une ligne livree sans document serait refusee par Postgres. */
  readonly document?: unknown
  /** La cause d'un refus. Elle OUVRE la liste des diagnostics, exactement
   *  comme cote travailleur : un refus P0 porte sa cause ici, pas dans les
   *  codes, et la ligne serait muette sans elle. */
  readonly raison?: string
  /** CE QUI SURVIT A UN REFUS. Memes noms, meme place que le travailleur :
   *  un refus n'a pas d'oeuvre a livrer, mais il a une base — et c'est elle
   *  qui evite de tout repayer. */
  readonly modele?: unknown
  readonly tiragesDetail?: readonly unknown[]
  readonly tours?: readonly unknown[]
  readonly niveaux?: unknown
}

/**
 * UN JOURNAL QUI RATE SON ECRITURE DOIT LE DIRE. Pose le 2026-10-10.
 *
 * Les deux ecritures etaient enveloppees dans `try { } catch { }` avec le
 * commentaire « silencieux ». Or `supabase-js` NE LEVE PAS sur une violation
 * de contrainte : il REND `{ error }`. Le `catch` ne pouvait donc rien
 * attraper, et le code ne regardait pas la valeur rendue. Resultat mesure
 * ce jour-la : trois appels payants, UNE SEULE ligne dans la table. Le
 * proprietaire ne pouvait pas savoir ce qu'il avait depense.
 *
 * Le journal ne doit toujours casser AUCUNE generation — d'ou le retour
 * silencieux cote appelant. Mais « ne pas casser » n'a jamais voulu dire
 * « ne rien dire » : ca part au journal du SERVEUR, et nulle part ailleurs.
 * L'ecran utilisateur n'en voit pas un caractere.
 */
function direLEchecDEcriture(table: string, cause: unknown): void {
  if (cause === null || cause === undefined) return
  const quoi =
    typeof cause === 'object' && cause !== null && 'message' in cause
      ? String((cause as { message: unknown }).message)
      : String(cause)
  console.error(`[journal] ecriture refusee dans ${table} : ${quoi}`)
}

/**
 * `CODE@chemin` — LA SEULE FORME, ET POUR LES DEUX CHEMINS.
 *
 * Le code seul ne localise rien. Mesure du 2026-10-10 : une generation
 * refusee a 16,03 $ n'a laisse que « SCHEMA · SCHEMA · SCHEMA », et dire OU
 * ils tombaient aurait exige de re-payer un tir entier.
 *
 * Cette fonction vit ici et les DEUX ecrivains l'appellent — le travailleur
 * asynchrone et le journal synchrone. Deux copies de la meme regle finissent
 * toujours par diverger ; une seule ne le peut pas.
 *
 * Le chemin est borne a 120 caracteres : il localise, il ne transporte pas
 * un document.
 */
export function codeEtChemin(d: { code?: string; path?: unknown }): string {
  const chemin = String(d.path ?? '').slice(0, 120)
  return chemin === '' ? (d.code ?? '?') : `${d.code ?? '?'}@${chemin}`
}

export async function journaliser(l: LigneGeneration): Promise<void> {
  // ── LE CLIENT EST CHARGE ICI, PAS A L'IMPORT.
  //
  // `supabase-admin` LEVE au chargement quand la clef de service manque. Un
  // import de haut niveau faisait donc tomber tout fichier qui touche a ce
  // module — et deux fichiers de test ont cesse de se charger en silence,
  // pendant que le compte « tests passes » restait vert. Mesure : 112 cas
  // annonces, 99 reellement executes.
  let supabaseAdmin
  try {
    ;({ supabaseAdmin } = await import('@/lib/supabase-admin'))
  } catch {
    return
  }

  // ── 1. LE TOTAL DE LA PLATEFORME, dans la table qui existe deja.
  try {
    const { error } = await supabaseAdmin.from('ai_usage_log').insert({
      site_id: null,
      usage_type: 'application',
      model: 'claude-opus-5',
      input_tokens: l.jetonsEntree,
      output_tokens: l.jetonsSortie,
    })
    direLEchecDEcriture('ai_usage_log', error)
  } catch (e) {
    direLEchecDEcriture('ai_usage_log', e)
  }

  // ── 2. LE DETAIL, dans sa table. Absente ⇒ avalee, sans consequence.
  //
  // LES DEUX VALEURS COMPOSEES SE CONSTRUISENT ICI, PAS DANS L'INSERTION.
  // Un cliquet du depot compare les cles de l'insert aux colonnes du SQL ;
  // une valeur imbriquee ecrite en place lui ferait lire `phase` ou `acquis`
  // comme des colonnes, et il refuserait — a juste titre, il ne peut pas
  // deviner. L'insertion ne porte donc que des COLONNES, une par ligne.

  // LA RAISON OUVRE LA LISTE — meme regle que cote travailleur : un refus P0
  // porte sa cause dans `raison`, pas dans les codes, et la ligne serait
  // muette sans elle.
  const diagnosticsDeLaLigne =
    !l.ok && l.raison !== undefined ? [l.raison, ...l.diagnostics] : [...l.diagnostics]

  // LE JOURNAL DE LA LIGNE une fois terminee — meme forme, memes noms et
  // meme place que cote travailleur, pour qu'un seul lecteur suffise.
  const journalDeLaLigne = {
    phase: 'terminee',
    tirages: l.tiragesDetail ?? [],
    tours: l.tours ?? [],
    niveaux: l.niveaux ?? null,
    // UN REFUS GARDE SA BASE : c'est elle qui evite de tout repayer.
    ...(l.ok ? {} : { acquis: l.document ?? null, modele: l.modele ?? null }),
  }

  try {
    const { error } = await supabaseAdmin.from('app_generations').insert({
      // ── LE STATUT EST DIT, PAS LAISSE AU DEFAUT. Le defaut de la table
      // est `en_attente` — le bon pour le futur depot asynchrone. Une ligne
      // du chemin SYNCHRONE est, elle, deja TERMINEE : la laisser au defaut
      // en ferait du « travail en attente » qu'un balayeur essaierait de
      // generer une seconde fois, en payant.
      statut: l.ok ? 'livree' : 'refusee',
      // ── ALIGNE SUR LE TRAVAILLEUR, PAS SUR UNE SECONDE IDEE.
      //
      // J'avais d'abord range le produit d'un refus DANS `document`. Le
      // chemin asynchrone avait deja tranche l'inverse, et en le disant :
      // « la contrainte livree_a_document dit qu'un refus n'a pas d'oeuvre
      // a livrer — la base n'est pas une oeuvre ». Deux rangements pour la
      // meme chose, c'est pire que n'importe lequel des deux : un lecteur
      // ne sait plus ou chercher. Le synchrone suit donc l'asynchrone.
      document: l.ok ? (l.document ?? null) : null,
      owner_email: l.email,
      demande: l.demande.slice(0, 4000),
      nom: l.nom,
      ok: l.ok,
      cout_usd: Number(l.coutUsd.toFixed(4)),
      duree_ms: l.dureeMs,
      jetons_entree: l.jetonsEntree,
      jetons_sortie: l.jetonsSortie,
      diagnostics: diagnosticsDeLaLigne,
      tirages: l.tirages,
      niveaux_sondes: l.niveaux ?? null,
      sections_acquises: journalDeLaLigne,
    })
    direLEchecDEcriture('app_generations', error)
  } catch (e) {
    direLEchecDEcriture('app_generations', e)
  }
}

/**
 * LE COUT D'UNE TRANCHE DEPOSSEDEE — TROU COMPTABLE n°2, ferme le 2026-10-10.
 *
 * ── POURQUOI IL NE PEUT PAS ALLER SUR LA LIGNE.
 *
 * Quand le jeton de cloture a tourne (un autre travailleur a repris la
 * ligne), toutes nos ecritures touchent ZERO ligne — c'est le fencing, et il
 * a raison : ecrire la ligne d'autrui ecraserait son travail (le defaut
 * exact que V2 existe pour interdire). Mais le cout, lui, a ETE paye.
 *
 * ── ALORS IL VA AU TOTAL DE LA PLATEFORME.
 *
 * `ai_usage_log` existe precisement « pour que le total de la plateforme
 * reste juste SANS attendre quoi que ce soit » (en-tete de ce fichier). Un
 * cout reel sans ligne legitime est exactement son cas. `usage_type` le DIT
 * — `application_orpheline` — pour qu'un total ne confonde jamais ce qui a
 * servi avec ce qui a ete paye en vain.
 *
 * ZERO DOUBLE-COMPTE, PAR CONSTRUCTION : le repreneur reprend l'etat depuis
 * `sections_acquises`, qui ne contient PAS cette tranche — elle n'a jamais
 * ete ecrite. Les deux chemins sont disjoints.
 *
 * Avalee en silence comme tout ce fichier : le suivi d'un cout deja perdu ne
 * doit pas casser une generation en plus.
 */
export async function journaliserOrphelin(l: {
  id: string
  coutUsd: number
  jetons: { entree: number; sortie: number }
}): Promise<void> {
  let supabaseAdmin
  try {
    ;({ supabaseAdmin } = await import('@/lib/supabase-admin'))
  } catch {
    return
  }
  try {
    const { error } = await supabaseAdmin.from('ai_usage_log').insert({
      site_id: null,
      usage_type: 'application_orpheline',
      model: 'claude-opus-5',
      input_tokens: l.jetons.entree,
      output_tokens: l.jetons.sortie,
    })
    // MEME DEFAUT QUE LES DEUX AUTRES, meme correctif. Une tranche
    // depossedee est deja un cout qu'on ne rattache a personne ; si en plus
    // son ecriture echoue en silence, la depense disparait entierement.
    // Ne casse toujours aucune tranche : ca part au journal du SERVEUR.
    direLEchecDEcriture('ai_usage_log (orpheline)', error)
  } catch (e) {
    direLEchecDEcriture('ai_usage_log (orpheline)', e)
  }
}

/**
 * LE SQL A POSER UNE FOIS, ecrit ici pour qu'il vive AVEC le code qui le lit.
 *
 * Il est EXPORTE et non commente : un cliquet le compare aux colonnes que
 * `journaliser` ecrit. Une colonne ajoutee au code sans l'etre ici — ou
 * l'inverse — fait echouer le test au lieu d'echouer en silence en ligne.
 */
/**
 * LE DDL POUR UN NOM DE TABLE DONNE — une seule source, deux tables.
 *
 * ── POURQUOI UNE FONCTION ET PLUS UNE CONSTANTE.
 *
 * L'etage travailleur s'eprouve contre une TABLE JUMELLE
 * (`app_generations_test`) : il n'existe aucune base de developpement, et le
 * proprietaire exige qu'aucun code de test ne puisse ecrire la vraie table.
 * Deux scripts ecrits a la main divergeraient — c'est la lecon constatee
 * quatre fois dans ce depot. Ici le nom est un parametre : la jumelle est
 * identique PAR CONSTRUCTION, et un cliquet verifie que les deux sorties ne
 * different que par le nom.
 *
 * ── LES NOMS DE CONTRAINTES ET D'INDEX SUIVENT LE NOM DE LA TABLE.
 *
 * Postgres exige leur unicite dans le schema : deux tables ne peuvent pas
 * partager `..._statut_valide`. Chaque nom derive donc du parametre — la
 * collision est impossible par construction, pas par relecture.
 */
export function sqlPour(nom: string): string {
  // Fail-closed : ce nom entre dans du DDL. Il vient de nos deux constantes,
  // mais une garde vaut mieux qu'une confiance.
  if (!/^[a-z][a-z0-9_]*$/.test(nom)) {
    throw new Error(`nom de table invalide : ${nom}`)
  }
  return `
-- ════════════════════════════════════════════════════════════════════
-- ${nom} — schema de la generation asynchrone (2026-10-08)
-- Rejouable a l'identique : chaque instruction est un no-op au 2e passage.
-- Mesure avant redaction : table ABSENTE de la base, 0 ligne touchee par
-- l'UPDATE de retro-remplissage. Le bloc ALTER n'existe que pour le monde
-- ou l'ancienne forme a 12 colonnes aurait deja ete posee.
-- ai_usage_log n'apparait nulle part ici.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.${nom} (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  -- IDENTITE PAR JETON (dette 6a) : l'email change, l'id d'utilisateur non.
  -- owner_email reste une DONNEE d'affichage, jamais une cle d'identite.
  owner_id          uuid,
  owner_email       text,
  demande           text not null,
  nom               text,
  ok                boolean not null default false,
  cout_usd          numeric(10,4) not null default 0,
  duree_ms          integer not null default 0,
  jetons_entree     integer not null default 0,
  jetons_sortie     integer not null default 0,
  diagnostics       text[] not null default '{}',
  tirages           integer not null default 0,
  -- ── l'etat asynchrone ──
  statut            text not null default 'en_attente',
  etape             text,
  sections_acquises jsonb not null default '{}'::jsonb,
  niveaux_sondes    jsonb,
  document          jsonb,
  battement         timestamptz,
  jeton_travailleur uuid,
  reprises          integer not null default 0
);

-- Base deja posee (ancienne forme a 12 colonnes) : complement idempotent.
alter table public.${nom} add column if not exists owner_id          uuid;
alter table public.${nom} add column if not exists statut            text;
alter table public.${nom} add column if not exists etape             text;
alter table public.${nom} add column if not exists sections_acquises jsonb not null default '{}'::jsonb;
alter table public.${nom} add column if not exists niveaux_sondes    jsonb;
alter table public.${nom} add column if not exists document          jsonb;
alter table public.${nom} add column if not exists battement         timestamptz;
alter table public.${nom} add column if not exists jeton_travailleur uuid;
alter table public.${nom} add column if not exists reprises          integer not null default 0;
alter table public.${nom} alter column ok set default false;

-- Les lignes du journal synchrone sont des generations TERMINEES : leur
-- statut se DEDUIT de « ok », il n'est pas invente. Zero ligne au rejeu.
update public.${nom}
   set statut = case when ok then 'livree' else 'refusee' end
 where statut is null;

alter table public.${nom} alter column statut set not null;
alter table public.${nom} alter column statut set default 'en_attente';

-- ── Trois invariants par CONTRAINTE, pas par discipline de code.
do $$ begin
  alter table public.${nom}
    add constraint ${nom}_statut_valide
    check (statut in ('en_attente', 'en_cours', 'livree', 'refusee'));
exception when duplicate_object then null; end $$;

-- Une ligne LIVREE sans document serait un mensonge structurel. Le redacteur
-- synchrone stocke donc le document qu'il avait deja en main — sans quoi
-- CETTE contrainte ferait echouer ses insertions, en silence puisque le
-- journal avale ses erreurs.
do $$ begin
  alter table public.${nom}
    add constraint ${nom}_livree_a_document
    check (statut <> 'livree' or document is not null);
exception when duplicate_object then null; end $$;

-- Une ligne EN COURS exige battement ET jeton : on ne peut pas etre « en cours »
-- sans detenir le verrou — la preuve que toute saisie passe par le
-- compare-and-set complet.
do $$ begin
  alter table public.${nom}
    add constraint ${nom}_en_cours_verrouillee
    check (statut <> 'en_cours' or (battement is not null and jeton_travailleur is not null));
exception when duplicate_object then null; end $$;

-- ── Acces : ceux du lot d'origine, reaffirmes (no-ops si deja poses).
alter table public.${nom} enable row level security;
revoke all on public.${nom} from anon, authenticated;

-- ── Index.
create index if not exists ${nom}_created_idx
  on public.${nom} (created_at desc);
-- Le balayeur ne regarde QUE le travail ouvert : index partiel, pour que la
-- minute du cron ne coute rien quand la table aura grossi.
create index if not exists ${nom}_ouvertes_idx
  on public.${nom} (created_at)
  where statut in ('en_attente', 'en_cours');
`
}

/** LE nom de la table de production — exporte pour que les routes de
 *  l'etage 4 ne l'ecrivent jamais nu (cliquet d'isolation etendu a app/). */
export const TABLE_GENERATIONS = 'app_generations'

/** La table de production — strictement le script de l'etage 1. */
export const SQL_TABLE = sqlPour(TABLE_GENERATIONS)

/**
 * LA JUMELLE DE TEST — meme schema, autre nom, par la meme source.
 *
 * C'est contre ELLE, et elle seule, que le verrou (CAS + jeton de cloture)
 * et le travailleur a blanc s'eprouvent. La vraie table n'est jamais ecrite
 * par du code de test — regle du proprietaire, tenue par les cliquets
 * d'isolation du travailleur.
 */
export const SQL_TABLE_TEST = sqlPour('app_generations_test')
