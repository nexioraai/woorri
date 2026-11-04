/**
 * M3 · CE QU'ON MESURE AUTOUR D'UNE MIGRATION — et jamais DEDANS.
 *
 * ── D · L'INSTANTANÉ EST HORS TRANSACTION, ET C'EST UNE PRESCRIPTION.
 *
 * J'avais proposé de compter les lignes DANS la transaction. Deux
 * reproches, tous deux justes :
 *
 * · INSUFFISANT — un comptage de lignes ne voit AUCUNE perte au niveau
 *   colonne. Une colonne retirée ne change pas le nombre de lignes ; un
 *   `update` qui écrase non plus. On compte donc aussi, pour chaque
 *   colonne préexistante, SES VALEURS NON NULLES.
 *
 * · NUISIBLE — `strong_migrations` interdit explicitement de remplir des
 *   données dans la même transaction qu'un changement de schéma : les
 *   verrous sont tenus pendant tout le remplissage, sur une base de
 *   production. L'instantané est une lecture ; il n'a rien à faire sous
 *   le verrou du DDL.
 *
 * La forme juste : instantané AVANT, hors transaction · le DDL seul,
 * atomique et court · vérification APRÈS, comparée à l'instantané.
 *
 * ── ET LE COMPTAGE CONSTATE, IL N'EMPÊCHE PAS.
 *
 * Il est AVEUGLE AUX ABANDONS, et c'est M1 qui les arrête :
 *
 *     `releve` porte 2 lignes. Le modèle déclare `releves`.
 *     releve → 2 · releves → 0 · TOTAL → 2. AUCUNE BAISSE.
 *
 * Ce module est le dernier filet, pas le premier.
 */

/** Une requête, quelle que soit la bibliothèque qui l'exécute. */
export type Interroge = (sql: string) => Promise<readonly Record<string, unknown>[]>

export type Instantane = {
  /** table → nombre de lignes. */
  readonly lignes: Readonly<Record<string, number>>
  /** « table.colonne » → nombre de valeurs NON NULLES. */
  readonly remplies: Readonly<Record<string, number>>
  /** Les comptes d'utilisateurs — ils ne vivent PAS dans notre schéma. */
  readonly comptes: number
}

/** Un identifiant sûr : ces noms viennent du catalogue, jamais d'une saisie. */
const sain = (x: string): boolean => /^[a-z_][a-z0-9_]*$/u.test(x)

/**
 * PREND L'INSTANTANÉ D'UN SCHÉMA — hors transaction, en lecture seule.
 *
 * ── `auth.users` N'EST PAS DANS NOTRE SCHÉMA, ET C'EST LE PROBLÈME.
 *
 * Notre promesse « ne jamais perdre les utilisateurs » ne reposait sur
 * AUCUNE de nos gardes : les comptes vivent dans `auth`, que la liste
 * blanche ne couvre pas et que les déclencheurs d'œuvre ne regardent
 * pas. On le compte donc explicitement, comme un invariant séparé.
 */
export async function prendreInstantane(q: Interroge, schema: string): Promise<Instantane> {
  if (!sain(schema)) throw new Error(`schéma au nom inattendu : ${schema}`)
  const tables = (
    await q(
      `select table_name from information_schema.tables ` +
        `where table_schema = '${schema}' and table_type = 'BASE TABLE'`,
    )
  )
    .map((r) => String(r.table_name))
    .filter(sain)

  const lignes: Record<string, number> = {}
  const remplies: Record<string, number> = {}
  for (const t of tables) {
    lignes[t] = Number((await q(`select count(*)::int as n from ${schema}.${t}`))[0]?.n ?? 0)
    const colonnes = (
      await q(
        `select column_name from information_schema.columns ` +
          `where table_schema = '${schema}' and table_name = '${t}'`,
      )
    )
      .map((r) => String(r.column_name))
      .filter(sain)
    for (const c of colonnes) {
      remplies[`${t}.${c}`] = Number(
        (await q(`select count(${c})::int as n from ${schema}.${t}`))[0]?.n ?? 0,
      )
    }
  }
  // ── LE NOMBRE DE COMPTES, SANS AUCUN ACCÈS AUX COMPTES.
  //
  // MESURÉ : le migrateur reçoit « permission denied for table users »
  // sur `auth.users`, et c'est VOULU — lui donner `select` ouvrirait les
  // adresses de tous les clients à un rôle dont la chaîne vit dans un
  // fichier d'environnement.
  //
  // Son incapacité est une garantie, mais elle rendait l'invariant
  // immesurable — et un invariant qu'on ne peut pas lire n'est pas un
  // invariant. La fonction rend LE NOMBRE, et rien d'autre.
  const comptes = Number(
    (await q('select public.deribfy_compte_utilisateurs() as n'))[0]?.n ?? 0,
  )
  return { lignes, remplies, comptes }
}

export type PerteConstatee = {
  readonly quoi: string
  readonly avant: number
  readonly apres: number
}

/**
 * COMPARE DEUX INSTANTANÉS. Toute BAISSE est une perte.
 *
 * ── CE QUI DISPARAÎT COMPTE AUTANT QUE CE QUI BAISSE.
 *
 * Une table présente avant et absente après n'a pas « baissé » : elle
 * n'a plus de compteur du tout. La traiter comme zéro la rend visible ;
 * l'ignorer en ferait le seul chemin de perte invisible.
 */
export function comparerInstantanes(
  avant: Instantane,
  apres: Instantane,
): readonly PerteConstatee[] {
  const pertes: PerteConstatee[] = []
  for (const [t, n] of Object.entries(avant.lignes)) {
    const m = apres.lignes[t] ?? 0
    if (m < n) pertes.push({ quoi: `lignes de « ${t} »`, avant: n, apres: m })
  }
  for (const [c, n] of Object.entries(avant.remplies)) {
    const m = apres.remplies[c] ?? 0
    if (m < n) pertes.push({ quoi: `valeurs de « ${c} »`, avant: n, apres: m })
  }
  if (apres.comptes < avant.comptes) {
    pertes.push({ quoi: 'comptes (auth.users)', avant: avant.comptes, apres: apres.comptes })
  }
  return pertes
}

export type DefautPorte = { readonly table: string; readonly quoi: string }

/**
 * E · APRÈS LA MIGRATION, CHAQUE TABLE A SA PORTE — ET ELLE REFUSE.
 *
 * ── UNE MIGRATION PUREMENT ADDITIVE PEUT ÊTRE UNE FUITE.
 *
 * Une table ajoutée que les politiques ne couvrent pas est une
 * régression de confidentialité, et elle est INVISIBLE à nos gardes :
 * elle est additive, donc M1 l'accepte et M2 l'émet.
 *
 * ── ET VÉRIFIER QU'UNE POLITIQUE EXISTE NE SUFFIT PAS.
 *
 * Lovable a eu exactement cette faille (CVE-2025-48757) : leur scanner
 * vérifiait qu'une politique EXISTE, pas qu'elle REFUSE. 303 points
 * d'accès exposés sur 170 projets.
 *
 * Ce contrôle lit donc le catalogue — RLS activée, RLS forcée, au moins
 * une politique — ET `essaiAnonyme` va frapper à la porte pour de vrai.
 * Les deux : le catalogue dit la forme, l'essai dit le comportement.
 */
export async function verifierPorte(q: Interroge, schema: string): Promise<readonly DefautPorte[]> {
  if (!sain(schema)) throw new Error(`schéma au nom inattendu : ${schema}`)
  const etat = await q(
    `select c.relname as t, c.relrowsecurity as rls, c.relforcerowsecurity as forcee, ` +
      `(select count(*)::int from pg_policy p where p.polrelid = c.oid) as politiques ` +
      `from pg_class c join pg_namespace n on n.oid = c.relnamespace ` +
      `where n.nspname = '${schema}' and c.relkind = 'r'`,
  )
  const defauts: DefautPorte[] = []
  for (const r of etat) {
    const t = String(r.t)
    if (r.rls !== true) defauts.push({ table: t, quoi: 'RLS non activée' })
    // `force` compte : sans lui, le PROPRIÉTAIRE de la table contourne
    // toutes ses politiques — et le propriétaire, ici, c'est nous.
    else if (r.forcee !== true) defauts.push({ table: t, quoi: 'RLS non forcée' })
    if (Number(r.politiques ?? 0) === 0) defauts.push({ table: t, quoi: 'aucune politique' })
  }
  return defauts
}

/**
 * L'ESSAI QUI COMPTE : UN VISITEUR ANONYME FRAPPE, ET DOIT ÊTRE REFUSÉ.
 *
 * ── MESURÉ, PAS DÉCLARÉ.
 *
 * On passe par PostgREST avec la clé publiable et AUCUNE session —
 * exactement ce qu'un visiteur a. Un `200` est une fuite, quelle que
 * soit la beauté du catalogue.
 *
 * Rend `null` si la porte a tenu, sinon la phrase de ce qu'on a vu.
 */
export async function essaiAnonyme(o: {
  readonly url: string
  readonly clePubliable: string
  readonly schema: string
  readonly table: string
}): Promise<string | null> {
  try {
    const r = await fetch(`${o.url}/rest/v1/${o.table}?select=*&limit=1`, {
      headers: {
        apikey: o.clePubliable,
        Authorization: `Bearer ${o.clePubliable}`,
        'Accept-Profile': o.schema,
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (r.status === 200) {
      const corps = (await r.text()).slice(0, 120)
      return `un visiteur ANONYME lit « ${o.table} » — HTTP 200, ${corps}`
    }
    return null
  } catch (e) {
    // Une porte qu'on n'a pas pu éprouver n'est PAS une porte éprouvée.
    return `l’essai anonyme n’a pas abouti : ${e instanceof Error ? e.message : String(e)}`
  }
}
