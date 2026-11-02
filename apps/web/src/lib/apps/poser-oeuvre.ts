/**
 * POSER UNE ŒUVRE DANS LA BASE DES ŒUVRES — tout ou rien, puis exposer.
 *
 * ── LE SCHÉMA PAR ŒUVRE EST POSSIBLE, ET C'EST MESURÉ.
 *
 * MESURÉ le 2026-11-02 sur le vrai projet : `alter role authenticator set
 * pgrst.db_schemas` suivi de `notify pgrst, 'reload config'` suffit à
 * exposer un schéma neuf. Avant, PostgREST rendait
 * `406 PGRST106 — Only the following schemas are exposed: public,
 * graphql_public` ; après, il nommait lui-même la table du nouveau schéma.
 *
 * AUCUN APPEL À LA MANAGEMENT API. Le `DATABASE_URL` seul suffit — ce qui
 * écarte le chemin qu'on avait rejeté, et dont les deux jetons sont morts.
 *
 * ── ① TOUT DANS UNE SEULE TRANSACTION, ET LA RAISON N'EST PAS LE BUDGET.
 *
 * Exigence du propriétaire, née d'un défaut réel : `ent_depart` était une
 * table née SANS PORTE, et ses 24 lignes étaient lisibles par quiconque
 * avait la clé publique.
 *
 * « Si ça déborde, le délai coupe AU MILIEU. Tu te retrouves avec des tables
 * créées et leurs politiques non posées. Sauf que cette fois-ci on l'aurait
 * fabriquée nous-mêmes, un jour de latence. »
 *
 * Notre connexion dispose de 2 minutes (mesuré : le `statement_timeout=8s`
 * appartient au rôle `authenticator`, pas au nôtre), et on peut les relever.
 * MAIS LA MARGE N'EST PAS L'ARGUMENT : un pooleur qui évince, un
 * déploiement, une coupure réseau — n'importe quoi doit laisser ZÉRO table
 * plutôt qu'un schéma à moitié fermé. Un échec propre vaut infiniment mieux.
 *
 * ── ET L'EXPOSITION VIENT APRÈS LE COMMIT, JAMAIS AVANT.
 *
 * « Exposer un schéma dont les politiques ne sont pas encore posées, c'est
 * ouvrir la porte avant d'avoir posé la serrure. » L'ordre est donc :
 * transaction fermée et validée, PUIS inscription dans la liste exposée.
 *
 * ── ② LA LISTE EXPOSÉE EST UNE CHAÎNE PARTAGÉE, DONC UNE COURSE.
 *
 * `pgrst.db_schemas` est une valeur UNIQUE qu'on lit, modifie et réécrit.
 * Deux publications simultanées, et la seconde écrase l'ajout de la
 * première. Le schéma perdu ne se voit nulle part : l'application répondra
 * `406` un jour, sans que rien n'explique pourquoi.
 *
 * Aujourd'hui il n'y a qu'un utilisateur. Le jour où il y en a deux, ça
 * arrivera et personne ne saura. Un verrou consultatif de transaction ferme
 * la classe pour trois lignes — et `pg_advisory_xact_lock` se relâche au
 * commit comme au rollback, donc il ne peut pas rester pris.
 *
 * ── CE MODULE NE DOIT JAMAIS ÊTRE ATTEIGNABLE D'UN COMPOSANT CLIENT.
 *
 * Il importe `pg` et lit le `DATABASE_URL`. EP-322 l'interdit : c'est la
 * leçon de `juge-execution`, tiré un jour dans un paquet navigateur.
 */
import { Client } from 'pg'

/**
 * LE NOM DU SCHÉMA D'UNE ŒUVRE.
 *
 * Dérivé de son identifiant, et VALIDÉ : ce nom entre dans du SQL comme
 * identifiant, où aucun paramètre lié n'est possible. Un identifiant qu'on
 * n'a pas vérifié soi-même est une injection qui attend son tour.
 *
 * Postgres borne un identifiant à 63 octets ; `oeuvre_` plus un uuid aux
 * tirets remplacés fait 43. La marge est confortable, on la vérifie quand
 * même — le jour où l'identifiant change de forme, c'est ici que ça doit
 * rougir, pas dans la base.
 */
/** La borne de Postgres, en OCTETS. Au-delà, il tronque sans rien dire. */
export const OCTETS_MAX_IDENTIFIANT = 63

export function nomSchemaOeuvre(id: string): string {
  const propre = id.trim().toLowerCase().replace(/-/gu, '_')
  // Les SIGNES : rien qui puisse sortir d'un identifiant.
  if (!/^[a-z0-9_]+$/u.test(propre)) {
    throw new Error(`POSER_OEUVRE_ID_INVALIDE: « ${id} » ne donne pas un identifiant sûr`)
  }
  const nom = `oeuvre_${propre}`
  // ── LA GARDE PORTE SUR LE NOM PRODUIT, PAS SUR L'ENTRÉE.
  //
  // J'avais borné la SAISIE à 50 signes, ce qui donnait 57 octets — ça
  // tenait, mais par accident : il suffisait d'allonger le préfixe
  // `oeuvre_`, de changer la forme de l'identifiant, ou de passer à un
  // identifiant plus long, et 57 devenait 64.
  //
  // ET POSTGRES TRONQUE EN SILENCE au-delà de 63 octets. Sans erreur, sans
  // avertissement. Deux œuvres qui ne diffèrent qu'après le 63e octet
  // obtiendraient LE MÊME SCHÉMA, et la seconde écrirait dans les tables de
  // la première — un mélange de données entre deux clients, invisible.
  //
  // On mesure donc CE QUI PART, pas ce qui entre : même forme que le
  // cliquet qui lit le zip plutôt que la source. En octets, pas en signes :
  // `length` compte les unités UTF-16, Postgres compte les octets.
  const octets = Buffer.byteLength(nom, 'utf8')
  if (octets > OCTETS_MAX_IDENTIFIANT) {
    throw new Error(
      `POSER_OEUVRE_NOM_TROP_LONG: « ${nom} » fait ${String(octets)} octets, ` +
        `au-delà des ${String(OCTETS_MAX_IDENTIFIANT)} de Postgres — il tronquerait ` +
        'en silence et deux œuvres partageraient un schéma.',
    )
  }
  return nom
}

/** La clé du verrou consultatif. Une constante : deux clés ne verrouillent rien. */
export const CLE_VERROU_SCHEMAS = 827_311_002

/** La liste minimale, celle d'un projet neuf. Mesurée le 2026-11-02. */
export const SCHEMAS_DE_BASE = 'public, graphql_public'

/**
 * LA NOUVELLE LISTE EXPOSÉE — pure, donc éprouvable sans base.
 *
 * `rolconfig` est un tableau de `clé=valeur`. On y cherche la liste, on
 * ajoute le schéma s'il manque, et on rend `null` quand il y est déjà :
 * réécrire pour rien ferait recharger PostgREST sans raison.
 */
export function listeAvecSchema(
  rolconfig: readonly string[] | null,
  schema: string,
): string | null {
  const ligne = (rolconfig ?? []).find((x) => x.startsWith('pgrst.db_schemas='))
  const actuelle = ligne === undefined ? SCHEMAS_DE_BASE : ligne.slice('pgrst.db_schemas='.length)
  const deja = actuelle
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
  if (deja.includes(schema)) return null
  return [...deja, schema].join(', ')
}

export type Pose =
  | { readonly ok: true; readonly schema: string; readonly expose: boolean }
  | { readonly ok: false; readonly etape: string; readonly motif: string }

/**
 * POSE LE SCHÉMA, LES TABLES ET LA PORTE — puis expose.
 *
 * `schemaSql` et `politiquesSql` ne sont QUALIFIÉS PAR RIEN : c'est le
 * `search_path` posé ici qui décide où ils atterrissent. Le même fichier
 * part dans le zip et atterrit dans le `public` de celui qui le télécharge.
 * Mesuré sur Postgres : deux destinations, un seul octet de source.
 */
export async function poserOeuvre(o: {
  readonly id: string
  readonly schemaSql: string
  readonly politiquesSql: string
  /** La chaîne de connexion. Le pooleur suffit : le DDL y passe (mesuré). */
  readonly connexion: string
}): Promise<Pose> {
  let schema: string
  try {
    schema = nomSchemaOeuvre(o.id)
  } catch (e) {
    return { ok: false, etape: 'nom du schéma', motif: e instanceof Error ? e.message : String(e) }
  }

  const client = new Client({
    connectionString: o.connexion,
    connectionTimeoutMillis: 15_000,
    // Le pooleur présente un certificat que la chaîne publique ne valide pas
    // toujours ; la confidentialité du transport reste assurée.
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
  } catch (e) {
    return { ok: false, etape: 'connexion', motif: e instanceof Error ? e.message : String(e) }
  }

  try {
    // ── TRANSACTION A : LE TOUT OU RIEN.
    //
    // Si quoi que ce soit coupe ici — délai, éviction du pooleur, réseau —
    // le rollback laisse ZÉRO table. Jamais un schéma dont les politiques
    // manquent.
    try {
      await client.query('begin')
      // On se donne de la marge SANS en dépendre : le tout-ou-rien est la
      // garantie, pas le budget.
      await client.query("set local statement_timeout = '120s'")
      await client.query(`create schema if not exists ${schema}`)
      // ── QUI A LE DROIT D'ENTRER DANS LE SCHÉMA, ET QUI N'Y EST PAS.
      //
      // `anon` reçoit `usage` SANS aucun droit sur les tables : il franchit
      // donc le schéma pour se faire refuser par la porte, et l'erreur dit
      // « privilège sur la table » au lieu de « schéma interdit ». La
      // nuance compte le jour où quelqu'un lit le journal.
      //
      // `service_role` N'Y EST PAS, et c'est délibéré. La plateforme écrit
      // par le `DATABASE_URL`, pas par la clé secrète : lui donner accès à
      // chaque schéma d'œuvre élargirait ce qu'une seule clé fuitée
      // exposerait. Mesuré : la clé secrète reçoit `42501 permission denied
      // for schema` — c'est le comportement voulu, pas un défaut.
      await client.query(`grant usage on schema ${schema} to anon, authenticated`)
      // ── `public` N'EST PAS DANS LE CHEMIN, ET C'EST VOULU.
      //
      // Une instruction non qualifiée ne doit pouvoir toucher QUE le schéma
      // de l'œuvre. `extensions` y reste pour que les fonctions d'extension
      // restent résolvables (le rôle `postgres` les a dans son chemin par
      // défaut, mesuré).
      await client.query(`set local search_path to ${schema}, extensions`)
      await client.query(o.schemaSql)
      await client.query(o.politiquesSql)
      await client.query('commit')
    } catch (e) {
      try {
        await client.query('rollback')
      } catch {
        /* la transaction était déjà défaite : rien n'existe, c'est l'essentiel */
      }
      return {
        ok: false,
        etape: 'pose du schéma et de la porte',
        motif: e instanceof Error ? e.message : String(e),
      }
    }

    // ── TRANSACTION B : L'EXPOSITION, APRÈS LE COMMIT.
    //
    // Jamais avant : exposer un schéma dont les politiques ne sont pas
    // posées, c'est ouvrir la porte avant d'avoir posé la serrure.
    //
    // ET SOUS VERROU. Le lire-modifier-écrire porte sur une valeur unique :
    // deux publications simultanées et la seconde écrase la première, sans
    // que rien ne le dise. `pg_advisory_xact_lock` se relâche au commit
    // comme au rollback — il ne peut pas rester pris.
    //
    // `notify` est émis DANS la transaction : Postgres ne le délivre qu'au
    // commit, donc PostgREST ne recharge que si la liste a vraiment changé.
    try {
      await client.query('begin')
      await client.query('select pg_advisory_xact_lock($1)', [CLE_VERROU_SCHEMAS])
      const lu = await client.query<{ rolconfig: string[] | null }>(
        "select rolconfig from pg_roles where rolname = 'authenticator'",
      )
      const nouvelle = listeAvecSchema(lu.rows[0]?.rolconfig ?? null, schema)
      if (nouvelle === null) {
        await client.query('commit')
        return { ok: true, schema, expose: false }
      }
      // La valeur est un littéral : aucun paramètre lié n'est possible dans
      // `alter role … set`. Les noms de schémas sont validés à la source
      // (`nomSchemaOeuvre`), et on double d'un échappement.
      await client.query(
        `alter role authenticator set pgrst.db_schemas = '${nouvelle.replace(/'/gu, "''")}'`,
      )
      // ── DEUX NOTIFICATIONS, ET PAS UNE. MESURÉ, PAS DEVINÉ.
      //
      // `reload config` reprend la LISTE des schémas exposés. Avec elle
      // seule, PostgREST rendait un 404 déroutant :
      //
      //   message : "Could not find the table 'oeuvre_….client'"
      //   hint    : "Perhaps you meant the table 'oeuvre_….client'"
      //
      // Le même nom dans les deux : il connaissait la table et ne la
      // trouvait pas. C'est que le CACHE DES TABLES est rechargé par une
      // notification distincte — `reload schema`. Avec elle, le 404 devient
      // un 42501 de privilège : PostgREST voit la table.
      //
      // Sans cette ligne, une œuvre publiée aurait répondu « table
      // introuvable » à ses propres écrans, et l'indice aurait désigné la
      // table qu'il disait ne pas trouver.
      await client.query("notify pgrst, 'reload config'")
      await client.query("notify pgrst, 'reload schema'")
      await client.query('commit')
      return { ok: true, schema, expose: true }
    } catch (e) {
      try {
        await client.query('rollback')
      } catch {
        /* rien à défaire */
      }
      // ── LE SCHÉMA EXISTE MAIS N'EST PAS EXPOSÉ, ET C'EST LE BON ÉCHEC.
      //
      // Les tables sont là, fermées, invisibles de l'API. Rien ne fuit ;
      // il manque seulement la dernière ligne, qui se rejoue.
      return {
        ok: false,
        etape: 'exposition du schéma (les tables sont posées et FERMÉES)',
        motif: e instanceof Error ? e.message : String(e),
      }
    }
  } finally {
    try {
      await client.end()
    } catch {
      /* la connexion se ferme d'elle-même */
    }
  }
}

/**
 * CE QUI GROSSIT, ET QU'IL FAUT SAVOIR SANS LE TRAITER AUJOURD'HUI.
 *
 * `pgrst.db_schemas` gagne un schéma à chaque œuvre publiée. À quarante
 * œuvres c'est anodin ; à mille c'est une liste d'une quinzaine de
 * kilo-octets que PostgREST relit à chaque rechargement de configuration.
 *
 * Au registre, pas au chantier. Le jour où ça pèse, la réponse sera
 * probablement de retirer de la liste les œuvres dépubliées — ce qui
 * n'existe pas encore.
 */
export const LISTE_EXPOSEE_GROSSIT =
  'pgrst.db_schemas gagne un schéma par œuvre publiée. 40 œuvres : anodin. ' +
  '1 000 : ~15 Ko relus à chaque rechargement de PostgREST. À savoir, pas à traiter.'
