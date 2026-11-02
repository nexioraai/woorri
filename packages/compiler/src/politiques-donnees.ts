/**
 * LA PORTE — une seule connexion pour entrer, et rien pour qui n'entre pas.
 *
 * ── LA DÉCISION DU PROPRIÉTAIRE, ET CE QU'ELLE SIMPLIFIE.
 *
 * « Pas de rôles, pas de droits fins — une seule connexion pour entrer. Ces
 * applications sont des outils internes, pas des sites publics. »
 *
 * Cette décision dissout la moitié dure du problème. `derivePlanAcces` n'est
 * pas portable vers le moteur direct : il déduit les droits des ÉCRANS et des
 * ACTIONS, un modèle structuré que ce moteur n'a pas. Mais sans rôles, il n'y
 * a plus rien à déduire — une politique par table, toujours la même. Ça se
 * dérive de `entites` SEUL. Le morceau non portable n'est pas à porter : il
 * est à ne pas écrire.
 *
 * ── ET POURQUOI LA PORTE PASSE AVANT LA BASE.
 *
 * L'ordre annoncé était : schéma → base provisionnée → connexion. Provisionner
 * avant d'authentifier expose une base en écriture pendant l'intervalle. Une
 * application publiée est ouverte à qui connaît l'adresse : lui donner une
 * base sans porte, c'est publier une base de données en écriture.
 *
 * ── QUATRE LEÇONS PAYÉES SONT ENCODÉES ICI.
 *
 * ① `revoke … from anon` NE RÉVOQUE PAS. Mesuré en octobre sur la fuite du
 *    catalogue : PUBLIC porte les privilèges, et `anon` en hérite. Il faut
 *    révoquer à PUBLIC. Un `revoke from anon` seul laisse la porte ouverte
 *    tout en ayant l'air de la fermer.
 *
 * ② LES PRIVILÈGES PAR DÉFAUT RE-DONNENT CE QU'ON VIENT DE RETIRER. Un
 *    projet Supabase pose `alter default privileges … grant all on tables to
 *    anon, authenticated`. Toute table créée APRÈS naît donc accessible.
 *    C'est pourquoi `enable row level security` est la vraie protection, et
 *    pas le `revoke` — qui reste nécessaire mais ne suffit pas.
 *
 * ③ `force row level security`, OU LE PROPRIÉTAIRE CONTOURNE TOUT. Sans
 *    `force`, le rôle qui possède la table ignore les politiques en silence.
 *    Repris de `emit-rls.ts`, qui l'avait déjà appris.
 *
 * ④ `drop policy if exists` AVANT `create policy`. Le script s'applique à
 *    chaque déploiement ; sans le `drop`, le second passage échoue sur un
 *    doublon — et un script qu'on ne peut pas rejouer n'est pas un script,
 *    c'est une intervention manuelle.
 *
 * ── CE QUI N'EST PAS PROUVÉ ICI, ET IL FAUT LE DIRE.
 *
 * Rien de ce fichier n'a jamais touché un Postgres. SQLite ne peut pas aider :
 * il n'a pas de RLS et ne sait pas analyser `create policy`. Ce qui se prouve
 * sans base est STRUCTUREL — couverture, ordre, absence de porte ouverte —
 * et c'est ce que le cliquet tient. L'exécution attend D4.
 */
import type { EntiteDonnees } from './schema-donnees.ts'
import { nomTable } from './schema-donnees.ts'

/**
 * LE RÔLE QUI A LE DROIT D'ENTRER.
 *
 * `authenticated` est le rôle que Supabase attribue à toute requête portant
 * un jeton de session valide. Une seule connexion suffit donc à ouvrir la
 * porte, et aucune requête anonyme ne la franchit.
 */
export const ROLE_PORTE = 'authenticated'

/** Les rôles qui ne doivent RIEN pouvoir, et `public` est le piège. */
export const ROLES_REFUSES: readonly string[] = ['anon', 'public']

/** Dit par le fichier quand aucune donnée n'est déclarée. */
export const SANS_POLITIQUE = [
  '-- AUCUNE DONNÉE DÉCLARÉE : AUCUNE PORTE À POSER.',
  '--',
  '-- Il n’y a pas de table, donc rien à protéger. Ce fichier existe pour',
  '-- que son absence ne passe jamais pour un oubli.',
  '',
].join('\n')

/**
 * LES POLITIQUES, ÉMISES DEPUIS LES ENTITÉS ET RIEN D'AUTRE.
 *
 * ── LE SQL N'EST QUALIFIÉ PAR AUCUN SCHÉMA, ET C'EST STRUCTUREL.
 *
 * Décision du propriétaire, 2026-11-02 : « si la plateforme range les tables
 * dans `oeuvre_<id>` et que le zip les range dans `public`, tu as deux SQL à
 * maintenir et ils divergeront. »
 *
 * Le fichier ne dit donc JAMAIS `public.`. Celui qui le reçoit décide où il
 * atterrit :
 *
 *   · la plateforme fait `create schema oeuvre_x; set search_path to
 *     oeuvre_x;` puis l'exécute ;
 *   · celui qui télécharge l'exécute tel quel — il atterrit dans son
 *     `public`, et c'est ce qu'il veut.
 *
 * UN SEUL FICHIER, DEUX DESTINATIONS. Qualifier aurait obligé à émettre deux
 * variantes, donc à les tenir d'accord — et c'est toujours la variante la
 * moins exercée qui finit par mentir.
 *
 * L'ordre des instructions est la garantie, exactement comme pour la
 * retouche : révoquer → activer → forcer → retirer l'ancienne politique →
 * la poser → accorder. Inversé, chaque geste défait le précédent.
 */
export function emettrePolitiquesSql(entites: readonly EntiteDonnees[]): string {
  if (entites.length === 0) return SANS_POLITIQUE
  const l: string[] = [
    '-- ÉMIS PAR DERIBFY DEPUIS LES DONNÉES DÉCLARÉES — NE PAS ÉDITER À LA MAIN.',
    '--',
    '-- UNE SEULE PORTE : qui est connecté voit et écrit tout ; qui ne l’est',
    '-- pas ne voit rien. Ces applications sont des outils internes.',
    '--',
    '-- S’applique autant de fois qu’on veut : chaque politique est retirée',
    '-- avant d’être posée.',
    '',
  ]
  for (const e of entites) {
    const t = nomTable(e)
    l.push(
      `-- ── ${t}${e.appendOnly === true ? ' · journal' : ''}`,
      // ① RÉVOQUER À `public`, PAS SEULEMENT À `anon` : anon hérite de public.
      `revoke all on ${t} from ${ROLES_REFUSES.join(', ')};`,
      // ② LA VRAIE PROTECTION : les privilèges par défaut d'un projet
      //    Supabase re-donnent l'accès à toute table créée après eux.
      `alter table ${t} enable row level security;`,
      // ③ SANS `force`, le propriétaire de la table ignore les politiques.
      `alter table ${t} force row level security;`,
      // ④ REJOUABLE : sans le `drop`, le second passage échoue sur un doublon.
      `drop policy if exists ${t}_porte on ${t};`,
      `create policy ${t}_porte on ${t} for all to ${ROLE_PORTE} using (true) with check (true);`,
      `grant select, insert, update, delete on ${t} to ${ROLE_PORTE};`,
      '',
    )
  }
  l.push(
    '-- `using (true)` POUR LE RÔLE CONNECTÉ EST LA DÉCISION, PAS UN OUBLI :',
    '-- une seule porte, aucun droit fin. Ce qui serait un défaut, c’est la',
    '-- même clause accordée à `anon` ou à `public` — et aucune ligne',
    '-- ci-dessus ne le fait.',
    '',
  )
  return l.join('\n')
}
