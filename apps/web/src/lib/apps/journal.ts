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
  readonly diagnostics: string[]
  readonly tirages: number
  /** L'AIR livre, quand il y en a un. La contrainte `livree_a_document`
   *  l'EXIGE : une ligne livree sans document serait refusee par Postgres. */
  readonly document?: unknown
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
    await supabaseAdmin.from('ai_usage_log').insert({
      site_id: null,
      usage_type: 'application',
      model: 'claude-opus-5',
      input_tokens: l.jetonsEntree,
      output_tokens: l.jetonsSortie,
    })
  } catch {
    // silencieux : le suivi ne bloque jamais une generation
  }

  // ── 2. LE DETAIL, dans sa table. Absente ⇒ avalee, sans consequence.
  try {
    await supabaseAdmin.from('app_generations').insert({
      // ── LE STATUT EST DIT, PAS LAISSE AU DEFAUT. Le defaut de la table
      // est `en_attente` — le bon pour le futur depot asynchrone. Une ligne
      // du chemin SYNCHRONE est, elle, deja TERMINEE : la laisser au defaut
      // en ferait du « travail en attente » qu'un balayeur essaierait de
      // generer une seconde fois, en payant.
      statut: l.ok ? 'livree' : 'refusee',
      document: l.ok ? (l.document ?? null) : null,
      owner_email: l.email,
      demande: l.demande.slice(0, 4000),
      nom: l.nom,
      ok: l.ok,
      cout_usd: Number(l.coutUsd.toFixed(4)),
      duree_ms: l.dureeMs,
      jetons_entree: l.jetonsEntree,
      jetons_sortie: l.jetonsSortie,
      diagnostics: l.diagnostics,
      tirages: l.tirages,
    })
  } catch {
    // silencieux, meme raison
  }
}

/**
 * LE SQL A POSER UNE FOIS, ecrit ici pour qu'il vive AVEC le code qui le lit.
 *
 * Il est EXPORTE et non commente : un cliquet le compare aux colonnes que
 * `journaliser` ecrit. Une colonne ajoutee au code sans l'etre ici — ou
 * l'inverse — fait echouer le test au lieu d'echouer en silence en ligne.
 */
export const SQL_TABLE = `
-- ════════════════════════════════════════════════════════════════════
-- app_generations — etage 1 de la generation asynchrone (2026-10-08)
-- Rejouable a l'identique : chaque instruction est un no-op au 2e passage.
-- Mesure avant redaction : table ABSENTE de la base, 0 ligne touchee par
-- l'UPDATE de retro-remplissage. Le bloc ALTER n'existe que pour le monde
-- ou l'ancienne forme a 12 colonnes aurait deja ete posee.
-- ai_usage_log n'apparait nulle part ici.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.app_generations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
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
alter table public.app_generations add column if not exists statut            text;
alter table public.app_generations add column if not exists etape             text;
alter table public.app_generations add column if not exists sections_acquises jsonb not null default '{}'::jsonb;
alter table public.app_generations add column if not exists niveaux_sondes    jsonb;
alter table public.app_generations add column if not exists document          jsonb;
alter table public.app_generations add column if not exists battement         timestamptz;
alter table public.app_generations add column if not exists jeton_travailleur uuid;
alter table public.app_generations add column if not exists reprises          integer not null default 0;
alter table public.app_generations alter column ok set default false;

-- Les lignes du journal synchrone sont des generations TERMINEES : leur
-- statut se DEDUIT de « ok », il n'est pas invente. Zero ligne au rejeu.
update public.app_generations
   set statut = case when ok then 'livree' else 'refusee' end
 where statut is null;

alter table public.app_generations alter column statut set not null;
alter table public.app_generations alter column statut set default 'en_attente';

-- ── Trois invariants par CONTRAINTE, pas par discipline de code.
do $$ begin
  alter table public.app_generations
    add constraint app_generations_statut_valide
    check (statut in ('en_attente', 'en_cours', 'livree', 'refusee'));
exception when duplicate_object then null; end $$;

-- Une ligne LIVREE sans document serait un mensonge structurel. Le redacteur
-- synchrone stocke donc le document qu'il avait deja en main — sans quoi
-- CETTE contrainte ferait echouer ses insertions, en silence puisque le
-- journal avale ses erreurs.
do $$ begin
  alter table public.app_generations
    add constraint app_generations_livree_a_document
    check (statut <> 'livree' or document is not null);
exception when duplicate_object then null; end $$;

-- Une ligne EN COURS exige battement ET jeton : on ne peut pas etre « en cours »
-- sans detenir le verrou — la preuve que toute saisie passe par le
-- compare-and-set complet.
do $$ begin
  alter table public.app_generations
    add constraint app_generations_en_cours_verrouillee
    check (statut <> 'en_cours' or (battement is not null and jeton_travailleur is not null));
exception when duplicate_object then null; end $$;

-- ── Acces : ceux du lot d'origine, reaffirmes (no-ops si deja poses).
alter table public.app_generations enable row level security;
revoke all on public.app_generations from anon, authenticated;

-- ── Index.
create index if not exists app_generations_created_idx
  on public.app_generations (created_at desc);
-- Le balayeur ne regarde QUE le travail ouvert : index partiel, pour que la
-- minute du cron ne coute rien quand la table aura grossi.
create index if not exists app_generations_ouvertes_idx
  on public.app_generations (created_at)
  where statut in ('en_attente', 'en_cours');
`
