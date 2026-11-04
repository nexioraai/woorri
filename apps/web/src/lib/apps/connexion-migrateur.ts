/**
 * D · LA CONNEXION DU MIGRATEUR N'A QU'UN SEUL LECTEUR, ET IL FILTRE.
 *
 * ── POURQUOI CE MODULE EXISTE, DANS LES MOTS DU PROPRIÉTAIRE.
 *
 *   « Ton étage 3 est le seul à garder `rename` et `set not null`. Pour
 *     ces deux formes, la garde EST la liste blanche — donc le texte.
 *     N'importe quel chemin de code qui ouvre une connexion comme
 *     `deribfy_migrateur` SANS passer par l'émetteur contourne la seule
 *     garde qui existe. »
 *
 * Les quatre étages de `garde-migration.sql` tiennent dans le moteur —
 * sauf le troisième, qui lit la requête. `rename` et `set not null` ne
 * produisent NI `sql_drop` NI `table_rewrite` : mesuré le 2026-11-04,
 * et `ddl_command_start` ne distingue pas les sous-commandes d'un
 * `ALTER TABLE`.
 *
 * Donc pour ces deux formes, la vraie garde est la liste blanche de M2.
 * Et une liste blanche qu'on peut contourner en ouvrant une seconde
 * connexion n'est pas une liste blanche.
 *
 * ── CE MODULE EST DONC LE SEUL À LIRE LA VARIABLE, ET LE SEUL À OUVRIR.
 *
 * Un cliquet le prouve — même forme qu'EP-321 ⑥ pour les variables des
 * œuvres, qui m'a d'ailleurs attrapé moi-même en écrivant un tir.
 *
 * ── ET IL REFUSE AVANT D'OUVRIR, PAS APRÈS.
 *
 * `verifierMigration` tourne sur le SQL AVANT la moindre connexion : une
 * instruction refusée ne coûte même pas un aller-retour, et surtout
 * n'atteint jamais la base. Fail-closed.
 */
import { verifierMigration, type RefusInstruction } from './migration-sql'
import {
  comparerInstantanes,
  prendreInstantane,
  verifierPorte,
  type DefautPorte,
  type Instantane,
  type Interroge,
  type PerteConstatee,
} from './instantane-migration'

/** Le nom de la variable, écrit UNE fois — personne d'autre ne le tape. */
export const NOM_DSN_MIGRATEUR = 'OEUVRES_DATABASE_URL_MIGRATEUR'

/**
 * LE RÔLE SOUS LEQUEL ON DOIT S'OUVRIR — et c'est la base qui le dira.
 *
 * Les quatre étages de `garde-migration.sql` ne regardent que
 * `session_user = 'deribfy_migrateur'`. Toute autre identité les désarme
 * TOUS, sans un mot.
 */
export const ROLE_MIGRATEUR = 'deribfy_migrateur'

export type RefusMigrateur = {
  readonly motif: string
  readonly quoiFaire: string
}

export type ConfigMigrateur =
  | { readonly ok: true; readonly dsn: string }
  | { readonly ok: false; readonly refus: RefusMigrateur }

/**
 * LA CHAÎNE DE CONNEXION, OU LE MOTIF DU REFUS — jamais une exception.
 *
 * ── TROISIÈME FOIS QUE « ÇA MARCHE CHEZ MOI » COÛTE UNE PANNE.
 *
 * `pg` absent du `package.json` d'`apps/web` (2026-11-03, 17 h de
 * production gelée), les quatre `OEUVRES_*` absentes de Vercel
 * (2026-11-04 au matin), et celle-ci qui n'y est pas non plus à l'heure
 * où ces lignes s'écrivent.
 *
 * Le refus DIT donc quelle variable manque et où la poser. Une route qui
 * rend 503 sans nommer ce qui lui manque fait chercher une panne là où
 * il n'y a qu'une case vide.
 */
export function configMigrateur(env: NodeJS.ProcessEnv): ConfigMigrateur {
  const dsn = (env[NOM_DSN_MIGRATEUR] ?? '').trim()
  if (dsn === '') {
    return {
      ok: false,
      refus: {
        motif: `${NOM_DSN_MIGRATEUR} est absente`,
        quoiFaire:
          `Ajoutez ${NOM_DSN_MIGRATEUR} dans Vercel (Production, type Secret — ` +
          'elle porte un mot de passe), puis redéployez.',
      },
    }
  }
  // ── LE RÔLE EST DANS L'ADRESSE, ET ON LE VÉRIFIE.
  //
  // Pointer cette variable sur la chaîne de `postgres` donnerait toutes
  // les gardes pour rien : les déclencheurs d'événement ne regardent que
  // `session_user = 'deribfy_migrateur'`. Une erreur de copie ici
  // désarmerait les quatre étages d'un coup, en silence.
  if (!dsn.includes(ROLE_MIGRATEUR)) {
    return {
      ok: false,
      refus: {
        motif: `${NOM_DSN_MIGRATEUR} ne se connecte pas comme « ${ROLE_MIGRATEUR} »`,
        quoiFaire:
          'Les gardes du moteur ne regardent que ce rôle : une autre identité ' +
          'les désarme toutes. Corrigez l’adresse.',
      },
    }
  }
  return { ok: true, dsn }
}

export type ResultatMigration = {
  readonly ok: boolean
  readonly refus: readonly RefusInstruction[]
  readonly motif?: string
  /** Ce que la comparaison avant/après a constaté — vide si rien. */
  readonly pertes?: readonly PerteConstatee[]
  /** Les tables dont la porte manque ou ne tient pas. */
  readonly portes?: readonly DefautPorte[]
}

/**
 * APPLIQUE UNE MIGRATION — et refuse avant d'ouvrir quoi que ce soit.
 *
 * ── L'ORDRE DES TROIS GESTES N'EST PAS INDIFFÉRENT.
 *
 * ① la liste blanche, SUR LE TEXTE, avant toute connexion ;
 * ② la configuration, qui dit ce qui manque plutôt que de jeter ;
 * ③ l'exécution, dans une transaction, par `deribfy_migrateur` — donc
 *    sous les quatre étages du moteur.
 *
 * Un SQL refusé à l'étape ① ne coûte pas un aller-retour et n'atteint
 * jamais la base. C'est la différence entre une garde et un constat.
 *
 * ── CE MODULE NE FAIT PAS ENCORE LE RESTE DE M3.
 *
 * L'instantané hors transaction, le contrôle RLS avec essai d'accès
 * anonyme réel, et l'invariant `auth.users` viennent ensuite. Ce qui est
 * ici est la COUTURE : le seul endroit d'où une migration peut partir.
 */
export async function appliquerMigration(o: {
  readonly schema: string
  readonly sql: string
  readonly env: NodeJS.ProcessEnv
}): Promise<ResultatMigration> {
  if (o.sql.trim() === '') return { ok: true, refus: [] }

  // ① LE TEXTE, AVANT TOUT.
  const verdict = verifierMigration(o.sql)
  if (!verdict.ok) {
    return {
      ok: false,
      refus: verdict.refus,
      motif: 'le SQL ne passe pas la liste des formes émettables',
    }
  }

  // ② CE QUI MANQUE SE DIT.
  const cfg = configMigrateur(o.env)
  if (!cfg.ok) return { ok: false, refus: [], motif: `${cfg.refus.motif} — ${cfg.refus.quoiFaire}` }

  // ③ L'EXÉCUTION, SOUS LES QUATRE ÉTAGES.
  const { Client } = (await import('pg')) as unknown as {
    Client: new (c: { connectionString: string; statement_timeout?: number }) => {
      connect: () => Promise<void>
      query: (q: string) => Promise<unknown>
      end: () => Promise<void>
    }
  }
  const client = new Client({ connectionString: cfg.dsn, statement_timeout: 120_000 })
  try {
    await client.connect()
  } catch (e) {
    return {
      ok: false,
      refus: [],
      motif: `connexion impossible : ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  // ── QUI SOMMES-NOUS VRAIMENT ? ON LE DEMANDE À LA BASE.
  //
  // `configMigrateur` lit le nom du rôle DANS LA CHAÎNE. C'est une
  // vérification de texte sur une valeur que personne ne relit — donc
  // pas une garde.
  //
  // LA PIRE FORME DU DÉFAUT, ET C'EST POURQUOI ELLE EST ICI : pointer la
  // variable sur la chaîne de `postgres` désarmerait les QUATRE étages
  // du moteur d'un coup, puisqu'ils ne regardent que
  // `session_user = 'deribfy_migrateur'`. Et tout continuerait de
  // marcher. L'échec serait SILENCIEUX ET VERS LE MOINS SÛR.
  //
  // Une requête, à l'ouverture. C'est le prix d'une propriété qui ne
  // dépend plus d'une valeur que personne ne relit.
  try {
    const qui = (await client.query('select session_user as u')) as {
      rows?: { u?: string }[]
    }
    const role = qui.rows?.[0]?.u ?? ''
    if (role !== ROLE_MIGRATEUR) {
      await client.end().catch(() => undefined)
      return {
        ok: false,
        refus: [],
        motif:
          `la connexion s’ouvre comme « ${role} » et non « ${ROLE_MIGRATEUR} » : ` +
          'les gardes du moteur ne regardent que ce rôle, et elles seraient ' +
          `toutes désarmées. Corrigez ${NOM_DSN_MIGRATEUR}.`,
      }
    }
  } catch (e) {
    await client.end().catch(() => undefined)
    return {
      ok: false,
      refus: [],
      motif: `identité du rôle illisible : ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  // ── D · L'INSTANTANÉ, HORS TRANSACTION ET AVANT LE DDL.
  //
  // `strong_migrations` interdit de lire ou remplir dans la transaction
  // du changement de schéma : les verrous seraient tenus pendant tout le
  // parcours, sur une base de production. L'instantané est une lecture ;
  // il n'a rien à faire sous le verrou du DDL.
  const interroge: Interroge = async (sql) =>
    ((await client.query(sql)) as { rows?: Record<string, unknown>[] }).rows ?? []
  let avant: Instantane
  try {
    avant = await prendreInstantane(interroge, o.schema)
  } catch (e) {
    await client.end().catch(() => undefined)
    return {
      ok: false,
      refus: [],
      motif: `instantané impossible : ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  try {
    await client.query('begin')
    // `set role` reste explicite : il dit dans le journal de la base QUI
    // a écrit, et `session_user` continue de dénoncer le migrateur aux
    // quatre gardes.
    await client.query('set local role deribfy_oeuvres')
    await client.query(`set local search_path to ${o.schema}, extensions`)
    await client.query(o.sql)
    await client.query('commit')
  } catch (e) {
    try {
      await client.query('rollback')
    } catch {
      /* la transaction était déjà défaite : rien n'est passé, c'est l'essentiel */
    }
    return {
      ok: false,
      refus: [],
      motif: e instanceof Error ? e.message : String(e),
    }
  }

  // ── D · LA VÉRIFICATION, APRÈS ET HORS TRANSACTION.
  //
  // Elle CONSTATE : elle est aveugle aux abandons, que M1 arrête. Une
  // baisse ici veut dire qu'une forme destructrice a franchi la liste
  // blanche ET les quatre étages du moteur — donc que trois gardes ont
  // cédé ensemble, et qu'il faut tout arrêter.
  try {
    const apres = await prendreInstantane(interroge, o.schema)
    const pertes = comparerInstantanes(avant, apres)
    // ── E · LA PORTE DE CHAQUE TABLE, APRÈS.
    //
    // Une table AJOUTÉE que les politiques ne couvrent pas est une
    // régression de confidentialité invisible à nos gardes : elle est
    // additive, donc M1 l'accepte et M2 l'émet.
    const portes = await verifierPorte(interroge, o.schema)
    if (pertes.length > 0 || portes.length > 0) {
      return {
        ok: false,
        refus: [],
        pertes,
        portes,
        motif:
          pertes.length > 0
            ? 'DES DONNÉES ONT DISPARU pendant la migration — ' +
              pertes.map((p) => `${p.quoi} : ${String(p.avant)} → ${String(p.apres)}`).join(' · ')
            : 'une table est sans porte après la migration — ' +
              portes.map((d) => `${d.table} : ${d.quoi}`).join(' · '),
      }
    }
    return { ok: true, refus: [], pertes: [], portes: [] }
  } catch (e) {
    // La migration EST passée ; c'est la vérification qui a échoué. On le
    // dit tel quel : taire une vérification ratée la rendrait verte.
    return {
      ok: false,
      refus: [],
      motif: `migration appliquée mais NON VÉRIFIÉE : ${e instanceof Error ? e.message : String(e)}`,
    }
  } finally {
    await client.end().catch(() => undefined)
  }
}
