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
create table if not exists public.app_generations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  owner_email   text,
  demande       text not null,
  nom           text,
  ok            boolean not null,
  cout_usd      numeric(10,4) not null default 0,
  duree_ms      integer not null default 0,
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  diagnostics   text[] not null default '{}',
  tirages       integer not null default 0
);
-- AUCUN ACCES ANONYME. La table ne se lit que par la clef de service, depuis
-- la route d'administration. Sans cette ligne, les privileges par defaut sur
-- les TABLES suffiraient a la rendre lisible — le depot a deja trouve une
-- ecriture anonyme reelle par ce chemin.
alter table public.app_generations enable row level security;
revoke all on public.app_generations from anon, authenticated;
create index if not exists app_generations_created_idx
  on public.app_generations (created_at desc);
`
