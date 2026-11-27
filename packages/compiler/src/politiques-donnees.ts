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
 * CE QU'UN VISITEUR SANS COMPTE REÇOIT — colonnes ET lignes (2026-11-23).
 *
 * ── LE DÉFAUT MESURÉ.
 *
 * `using (true)` + `grant select on t to anon` ouvrait la table ENTIÈRE : sur
 * atitta la plaque et l'identifiant du client de chaque véhicule partaient
 * vers le navigateur ; sur la place de marché un produit « masqué » restait
 * lisible avec son numéro. La page cachait, la base donnait tout.
 *
 * ── LE MÉCANISME : DEUX BARRIÈRES DE POSTGRES, AUCUN OBJET NOUVEAU.
 *
 * · les COLONNES par un privilège de colonne, `grant select (a, b) on t to
 *   anon` : une colonne non nommée est refusée, et `select *` aussi ;
 * · les LIGNES par la condition de la politique, `using (masque = false)` :
 *   une ligne qui ne la remplit pas n'existe pas pour le visiteur (et une
 *   valeur NULLE non plus — `null = false` n'est pas vrai).
 *
 * Mesuré sur base jetable le 2026-11-23 : `revoke all on t` retire AUSSI les
 * privilèges de colonne, donc le script reste rejouable et une colonne qui
 * sort de la liste est bien retirée.
 *
 * ── FAIL-CLOSED.
 *
 * Une table publique sans `champsPublics`, ou qui nomme une colonne qui
 * n'existe pas, ne s'ouvre PAS : aucune colonne, aucune ligne. La page reste
 * vide et le juge le dit avant la livraison — jamais l'inverse.
 */
export type LecturePubliqueEmise =
  | { readonly ok: true; readonly colonnes: readonly string[]; readonly condition: string }
  | { readonly ok: false; readonly motif: string }

interface ChampLu { readonly id: string; readonly derived?: unknown; readonly sensitive?: boolean }
interface EntiteLue {
  readonly fields: readonly ChampLu[]
  readonly champsPublics?: unknown
  readonly lignesPubliques?: unknown
}

const sansFld = (x: string): string => x.replace(/^fld_/u, '')
const IDENT_COLONNE = /^[a-z][a-z0-9_]*$/u
const VALEUR_TEXTE = /^[A-Za-z0-9 _-]{1,60}$/u

/** La valeur d'une condition, en SQL — seulement les trois formes sûres. */
function litteral(v: unknown): string | null {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && VALEUR_TEXTE.test(v)) return `'${v}'`
  return null
}

export function lecturePubliqueEmise(e: EntiteLue): LecturePubliqueEmise {
  // Les colonnes CONSERVÉES : un champ dérivé ou sensible n'est pas en base.
  const existantes = new Set(
    e.fields.filter((f) => f.derived === undefined && f.sensitive !== true).map((f) => sansFld(f.id)),
  )
  if (!Array.isArray(e.champsPublics) || e.champsPublics.length === 0) {
    return { ok: false, motif: 'aucune colonne publique déclarée (champsPublics)' }
  }
  const colonnes: string[] = []
  for (const brut of e.champsPublics as unknown[]) {
    const c = typeof brut === 'string' ? sansFld(brut) : ''
    if (!IDENT_COLONNE.test(c) || !existantes.has(c)) {
      return { ok: false, motif: `colonne publique inconnue : « ${String(brut)} »` }
    }
    if (!colonnes.includes(c)) colonnes.push(c)
  }
  const conditions: string[] = []
  if (e.lignesPubliques !== undefined) {
    if (!Array.isArray(e.lignesPubliques)) return { ok: false, motif: 'lignesPubliques illisible' }
    for (const l of e.lignesPubliques as unknown[]) {
      const champ = l !== null && typeof l === 'object' ? (l as { champ?: unknown }).champ : undefined
      const c = typeof champ === 'string' ? sansFld(champ) : ''
      const v = litteral(l !== null && typeof l === 'object' ? (l as { vaut?: unknown }).vaut : undefined)
      if (!IDENT_COLONNE.test(c) || !existantes.has(c) || v === null) {
        return { ok: false, motif: `condition de ligne illisible : ${JSON.stringify(l)}` }
      }
      conditions.push(`${c} = ${v}`)
      // La colonne de condition est lisible : sa valeur est la même sur
      // TOUTES les lignes rendues, elle n'apprend rien — et la page peut
      // alors filtrer dessus sans être refusée.
      if (!colonnes.includes(c)) colonnes.push(c)
    }
  }
  return { ok: true, colonnes: ['id', ...colonnes.filter((c) => c !== 'id')], condition: conditions.length > 0 ? conditions.join(' and ') : 'true' }
}

/** Les instructions du second régime — ou le refus, écrit dans le fichier. */
function lignesLecturePublique(t: string, lp: LecturePubliqueEmise): string[] {
  if (!lp.ok) return [`-- LECTURE PUBLIQUE NON OUVERTE : ${lp.motif.replace(/[\r\n]/gu, ' ')}.`]
  return [
    `create policy ${t}_lecture_publique on ${t} for select to ${ROLE_PUBLIC}`,
    `  using (${lp.condition});`,
    // LE PRIVILÈGE PAR COLONNE : jamais `grant select on t` (toute la table).
    `grant select (${lp.colonnes.join(', ')}) on ${t} to ${ROLE_PUBLIC};`,
  ]
}

/**
 * LA LECTURE PAR CLÉ — UNE ligne pour qui connaît sa clé, jamais la liste (É1).
 *
 * ── LE MÉCANISME, PROUVÉ SUR BASE JETABLE LE 2026-11-27 (É0, 26/26).
 *
 * · la politique `anon` ne laisse passer que la ligne dont la clé vaut le
 *   réglage de transaction `deribfy.cle` — vide par défaut, donc AUCUNE ligne :
 *   `select` direct sur la table rend zéro, même avec les colonnes accordées ;
 * · seule la fonction `<t>_par_cle(p_cle)` pose ce réglage, le temps d'une
 *   lecture, puis le remet à vide. Elle est `security invoker` : elle n'a que
 *   les droits du visiteur, et ne contourne rien.
 *
 * ── POURQUOI `jsonb` ET `create or replace`, SANS `drop function`.
 *
 * La garde du migrateur refuse toute destruction de fonction
 * (garde-migration.sql, `sql_drop`). Une signature fixe — `(text) → jsonb` —
 * se repose donc toujours par `create or replace`, même quand les colonnes
 * montrées changent.
 *
 * ── LA CLÉ EST TIRÉE PAR LA BASE.
 *
 * Un numéro séquentiel se devine par essais, et la fonction répond à qui
 * l'appelle. `set default` pose un tirage de 12 signes hexadécimaux (48 bits)
 * sur les lignes NEUVES ; une ligne existante garde sa valeur.
 *
 * ── FAIL-CLOSED. Une clé inconnue, non `unique`, non texte, une colonne
 * inconnue, ou une table déjà lisible par tous : rien ne s'ouvre, et le
 * fichier dit pourquoi.
 */
export type LectureParCleEmise =
  | { readonly ok: true; readonly cle: string; readonly colonnes: readonly string[] }
  | { readonly ok: false; readonly motif: string }

/** Au plus autant de colonnes rendues au visiteur : borne de lisibilité, pas de coût. */
export const COLONNES_PAR_CLE_MAX = 12

/** L'expression du tirage de la clé — UNE source, relue par la liste blanche du migrateur. */
export const TIRAGE_CLE = "upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))"

export function lectureParCleEmise(e: EntiteDonnees): LectureParCleEmise {
  // `unknown` : la déclaration vient du JSON du modèle, `null` y est possible.
  const brut: unknown = e.lectureParCle
  if (brut === undefined || brut === null || typeof brut !== 'object') return { ok: false, motif: 'lectureParCle illisible' }
  const lpc = brut as { cle?: unknown; champs?: unknown }
  if (e.lecturePublique === true) {
    return { ok: false, motif: 'la table est déjà lisible par tous (lecturePublique) : une clé ne la fermerait pas' }
  }
  const conserves = e.fields.filter((f) => f.derived === undefined && f.sensitive !== true)
  const parNom = new Map(conserves.map((f) => [sansFld(f.id), f]))
  const cle = typeof lpc.cle === 'string' ? sansFld(lpc.cle) : ''
  const champCle = parNom.get(cle)
  if (!IDENT_COLONNE.test(cle) || champCle === undefined) return { ok: false, motif: `clé inconnue : « ${String(lpc.cle)} »` }
  if (champCle.type === 'number' || champCle.type === 'decimal' || champCle.type === 'boolean') {
    return { ok: false, motif: `la clé « ${cle} » doit être un texte` }
  }
  if (champCle.unique !== true) return { ok: false, motif: `la clé « ${cle} » doit être unique` }
  if (!Array.isArray(lpc.champs) || lpc.champs.length === 0) return { ok: false, motif: 'aucune colonne rendue (champs)' }
  const colonnes: string[] = [cle]
  for (const brut of lpc.champs as unknown[]) {
    const c = typeof brut === 'string' ? sansFld(brut) : ''
    if (!IDENT_COLONNE.test(c) || !parNom.has(c)) return { ok: false, motif: `colonne inconnue : « ${String(brut)} »` }
    if (!colonnes.includes(c)) colonnes.push(c)
  }
  if (colonnes.length > COLONNES_PAR_CLE_MAX + 1) return { ok: false, motif: `plus de ${String(COLONNES_PAR_CLE_MAX)} colonnes rendues` }
  return { ok: true, cle, colonnes }
}

/** Le nom de la fonction de lecture par clé d'une table — exporté : la consigne et le juge le citent. */
export const fonctionParCle = (table: string): string => `${table}_par_cle`

function lignesLectureParCle(t: string, lpc: LectureParCleEmise): string[] {
  if (!lpc.ok) return [`-- LECTURE PAR CLÉ NON OUVERTE : ${lpc.motif.replace(/[\r\n]/gu, ' ')}.`]
  const f = fonctionParCle(t)
  const cols = lpc.colonnes.map((c) => `x.${c}`).join(', ')
  return [
    `-- LECTURE PAR CLÉ : un visiteur lit UNE ligne avec « ${lpc.cle} », jamais la liste.`,
    `alter table ${t} alter column ${lpc.cle} set default ${TIRAGE_CLE};`,
    `drop policy if exists ${t}_par_cle on ${t};`,
    `create policy ${t}_par_cle on ${t} for select to ${ROLE_PUBLIC}`,
    `  using (${lpc.cle} = nullif(current_setting('deribfy.cle', true), ''));`,
    `grant select (${lpc.colonnes.join(', ')}) on ${t} to ${ROLE_PUBLIC};`,
    `create or replace function ${f}(p_cle text) returns jsonb language plpgsql security invoker as $f$`,
    `declare r jsonb;`,
    `begin`,
    `  perform set_config('deribfy.cle', coalesce(p_cle, ''), true);`,
    `  select to_jsonb(s) into r from (select ${cols} from ${t} x where x.${lpc.cle} = p_cle limit 1) s;`,
    `  perform set_config('deribfy.cle', '', true);`,
    `  return r;`,
    `end`,
    `$f$;`,
    `revoke execute on function ${f}(text) from public;`,
    `grant execute on function ${f}(text) to ${ROLE_PUBLIC};`,
  ]
}

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
      ...(litPublique(e) ? lignesLecturePublique(t, lecturePubliqueEmise(e)) : []),
      // ── LA LECTURE PAR CLÉ, SEULEMENT SI LA TABLE LA DÉCLARE (É1). Absente,
      //    le fichier est identique à l'octet près à ce qu'il était.
      ...(e.lectureParCle !== undefined ? lignesLectureParCle(t, lectureParCleEmise(e)) : []),
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
