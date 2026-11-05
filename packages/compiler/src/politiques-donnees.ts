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

/**
 * LE RÔLE DES VISITEURS SANS COMPTE.
 *
 * Supabase l'attribue à toute requête portant la clé publiable et AUCUN
 * jeton de session. C'est lui qu'on ouvre, table par table, et seulement
 * en lecture.
 */
export const ROLE_PUBLIC = 'anon'

/**
 * LA LECTURE DU DRAPEAU — stricte, et DUPLIQUÉE à dessein.
 *
 * `apps/web/entites-declarees.ts` porte la même règle : ce module-ci est
 * importé par le compilateur, celui-là par un composant client. Les
 * joindre tirerait `node:sqlite` dans le paquet navigateur — le défaut
 * qu'EP-314 garde et qui a déjà tué un build. Une duplication qu'on ne
 * peut pas supprimer doit être PROUVÉE ÉGALE, et EP-353 ⑥ les compare
 * sur la même série de valeurs mal écrites.
 *
 * `=== true` et rien d'autre : `'non'` est VRAI par coercition en
 * JavaScript, et c'est exactement ce qu'un modèle écrit quand on lui
 * demande un booléen en français.
 */
export const litPublique = (e: { readonly lecturePublique?: unknown }): boolean =>
  e.lecturePublique === true

/**
 * LA REVENDICATION QUI DIT À QUELLE ŒUVRE ON APPARTIENT.
 *
 * ── LE DÉFAUT QUE CECI FERME, ET IL ÉTAIT GRAVE.
 *
 * La première version de cette porte disait `to authenticated using (true)`.
 * Or les comptes de Supabase Auth sont par PROJET, pas par schéma : toutes
 * les œuvres partagent le même `auth.users`.
 *
 * N'importe qui ayant un compte sur UNE œuvre obtenait donc le rôle
 * `authenticated`, et `using (true)` le laissait lire ET écrire dans le
 * schéma de n'importe quelle AUTRE œuvre. Il n'avait rien à pirater : il se
 * connectait à sa propre application et changeait un en-tête
 * `Accept-Profile`.
 *
 * Le client A pouvait lire les données du client B. Même classe que la fuite
 * de `catalog_products`, en pire : ce ne sont pas nos données, ce sont
 * celles de nos clients.
 *
 * ── ET POURQUOI `current_setting` PLUTÔT QUE `auth.jwt()`.
 *
 * `auth.jwt()` est une fonction de Supabase. Le zip part chez des gens qui
 * brancheront peut-être un Postgres nu : la politique ne se créerait pas, et
 * TOUT le fichier échouerait. `current_setting('request.jwt.claims', true)`
 * est du Postgres de base, et c'est précisément ce que PostgREST renseigne —
 * `auth.jwt()` n'en est qu'une enveloppe.
 *
 * Le second argument `true` rend NULL au lieu d'échouer quand la
 * revendication est absente. NULL fait une politique FAUSSE, donc un refus :
 * un jeton sans appartenance n'ouvre rien.
 */
export const CHEMIN_REVENDICATION = "current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'oeuvre'"

/** Un identifiant d'œuvre ne va dans du SQL qu'après avoir été vérifié. */
function identifiantSur(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/u.test(id)) {
    throw new Error(`PORTE_ID_OEUVRE_INVALIDE: « ${id} » n'est pas un identifiant d'œuvre sûr`)
  }
  return id
}

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
export function emettrePolitiquesSql(
  entites: readonly EntiteDonnees[],
  /**
   * L'IDENTIFIANT DE L'ŒUVRE — celui que le jeton devra porter.
   *
   * Il est CUIT dans le fichier, et ça ne casse pas la règle du fichier
   * unique : il y a déjà un fichier PAR ŒUVRE (le schéma vient de ses
   * entités). La règle est « le même fichier pour les deux destinations »,
   * pas « le même fichier pour toutes les œuvres ».
   */
  idOeuvre: string,
): string {
  if (entites.length === 0) return SANS_POLITIQUE
  const id = identifiantSur(idOeuvre)
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
      //    LES TROIS NOMS, toujours : une table passée de journal à normale
      //    (ou l'inverse) laisserait sinon l'ancienne politique en place, et
      //    deux politiques permissives s'ADDITIONNENT — le journal
      //    redeviendrait réécrivable en silence.
      `drop policy if exists ${t}_porte on ${t};`,
      `drop policy if exists ${t}_lecture on ${t};`,
      `drop policy if exists ${t}_ajout on ${t};`,
      // ── LE QUATRIÈME NOM TOMBE TOUJOURS, MÊME SUR UNE TABLE PRIVÉE.
      //
      // C'est la MÊME leçon que les trois précédents, et elle est plus
      // grave ici. Une table déclarée publique puis REDEVENUE privée
      // garderait sa politique `anon` : deux politiques permissives
      // s'ADDITIONNENT en RLS, donc la table resterait lisible par
      // n'importe qui — en silence, et sans qu'aucune déclaration ne le
      // dise. Le `revoke all from anon` ci-dessus retire le privilège,
      // mais une politique orpheline attendrait le premier `grant`
      // suivant pour redevenir vivante.
      `drop policy if exists ${t}_lecture_publique on ${t};`,
      // ── LA PORTE VÉRIFIE L'APPARTENANCE, PAS SEULEMENT LE RÔLE.
      //
      // `to authenticated` ne dit que « connecté » — pas « connecté ICI ».
      // La revendication dit à quelle œuvre le porteur du jeton appartient,
      // et on la compare à CETTE œuvre.
      // ── ET « JOURNAL » CESSE D'ÊTRE UNE ÉTIQUETTE (2026-11-03).
      //
      // Le commentaire de cette ligne disait « · journal » et le schéma
      // promettait « rien ne s'y réécrit ni s'y efface ». La politique,
      // elle, était `for all` : l'application générée pouvait réécrire et
      // effacer toutes les lignes d'un journal de cotisations.
      //
      // « Vérité écran vs moteur » : on ne présente jamais une vérité de
      // moteur autrement que le moteur ne l'écrit. Le moteur l'écrit
      // maintenant — deux politiques au lieu d'une, et PAS de politique
      // pour `update`/`delete`. En RLS, l'absence de politique permissive
      // vaut refus, et `force row level security` l'applique même au
      // propriétaire de la table.
      ...(e.appendOnly === true
        ? [
            `create policy ${t}_lecture on ${t} for select to ${ROLE_PORTE}`,
            `  using (${CHEMIN_REVENDICATION} = '${id}');`,
            `create policy ${t}_ajout on ${t} for insert to ${ROLE_PORTE}`,
            `  with check (${CHEMIN_REVENDICATION} = '${id}');`,
            // LE PRIVILÈGE SUIT LA POLITIQUE : deux barrières qui disent la
            // même chose. Sans le `grant`, la politique ne sert à rien ; sans
            // la politique, le `grant` ouvrirait toutes les lignes.
            `grant select, insert on ${t} to ${ROLE_PORTE};`,
          ]
        : [
            `create policy ${t}_porte on ${t} for all to ${ROLE_PORTE}`,
            `  using (${CHEMIN_REVENDICATION} = '${id}')`,
            `  with check (${CHEMIN_REVENDICATION} = '${id}');`,
            `grant select, insert, update, delete on ${t} to ${ROLE_PORTE};`,
          ]),
      // ── ET LE SECOND RÉGIME, SEULEMENT SI LA TABLE LE DÉCLARE (P2).
      //
      // `for select` et rien d'autre. Pas de `with check` : une politique
      // de lecture n'en prend pas, et en ajouter une ouvrirait l'écriture
      // sans que le mot « insert » apparaisse nulle part.
      //
      // `using (true)` est VOLONTAIRE et il est borné par où il vit : la
      // table est dans le schéma de CETTE œuvre, qu'aucune autre ne peut
      // nommer. Comparer la revendication ici serait absurde — un visiteur
      // sans compte n'a pas de jeton, donc pas de revendication, et la
      // politique ne laisserait jamais passer personne.
      //
      // LE PRIVILÈGE SUIT LA POLITIQUE, et seulement `select` : sans le
      // `grant`, la politique ne sert à rien ; avec `grant all`, le refus
      // d'écriture ne tiendrait plus qu'à l'absence de politique.
      ...(litPublique(e)
        ? [
            `create policy ${t}_lecture_publique on ${t} for select to ${ROLE_PUBLIC}`,
            '  using (true);',
            `grant select on ${t} to ${ROLE_PUBLIC};`,
          ]
        : []),
      '',
    )
  }
  l.push(
    '-- UNE SEULE PORTE, MAIS ELLE VÉRIFIE L’APPARTENANCE.',
    '--',
    '-- « Connecté » ne suffit pas : les comptes sont partagés par projet, et',
    '-- une porte ouverte au seul ROLE laisserait l’utilisateur d’une autre',
    '-- application lire celle-ci en changeant un en-tête. Le jeton doit porter',
    `--   app_metadata.oeuvre = "${id}"`,
    '--',
    '-- SI VOUS BRANCHEZ VOTRE PROPRE BASE : c’est à votre serveur d’identité',
    '-- de poser cette revendication dans les jetons qu’il émet. Un jeton qui',
    '-- ne la porte pas n’ouvre rien — l’absence vaut refus.',
    '',
  )
  return l.join('\n')
}
