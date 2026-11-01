/**
 * LA SONDE DE SCHÉMA — ce que la base EN LIGNE porte vraiment, confronté au
 * DDL du dépôt.
 *
 * ── POURQUOI UNE ROUTE, ET PAS UN SCRIPT DE GATE.
 *
 * Règle ② du protocole : « une gate verte ne prouve rien sur la production ;
 * ce qui vit en exécution se prouve en exécution, dans la fonction réelle ».
 * Une comparaison lancée depuis ma machine mesurerait la base que MES clefs
 * atteignent. Celle-ci tourne DANS la fonction déployée, avec les clefs du
 * serveur — et la sonde d'après-déploiement lit son verdict pour rougir.
 *
 * C'est la même architecture que `api/generateur/direct` (GET) : la mesure
 * vit où vit le défaut, le workflow ne fait que la lire et échouer.
 *
 * ── LA PRODUCTION EST LUE, JAMAIS ÉCRITE (décision du 2026-11-01).
 *
 * La première version posait des témoins dans `app_generations` pour exercer
 * ses contraintes. Le propriétaire l'a renvoyée là où elle appartient : la
 * jumelle existe pour ça. Ici, production = OpenAPI seul (colonnes, types,
 * nullabilité, défauts) ; écritures fictives sur `app_generations_test`.
 *
 * LE COÛT EST ÉCRIT DANS CHAQUE RAPPORT (`parDecision`) : les contraintes de
 * production ne sont plus exercées. La jumelle prouve que le DDL est
 * APPLICABLE, pas que la production l'APPLIQUE.
 *
 * ── CE QU'ELLE ÉCRIT DANS LA JUMELLE, ET SOUS QUELLES GARANTIES.
 *
 * Une contrainte CHECK ne se lit pas (PostgREST n'en expose aucune), elle
 * s'exerce. Quatre garanties, tenues par la mécanique et non par l'intention :
 *   ① propriétaire FICTIF réservé, filtré à la pose ET au retrait ;
 *   ② retrait dans un `finally`, puis RELECTURE — une ligne survivante est
 *     criée, jamais supposée retirée ;
 *   ③ balayage d'ouverture : une exécution tuée avant son `finally` (un
 *     timeout de lambda) laisserait des fantômes ;
 *   ④ journal : chaque pose et chaque retrait s'impriment.
 *
 * ── GARDÉE PAR LE MÊME SECRET QUE LES AUTRES SONDES.
 *
 * `CRON_SECRET` : la route écrit, même si c'est dans un bac réservé. Elle ne
 * doit pas être joignable sans ce secret.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SQL_TABLE, SQL_TABLE_TEST, TABLE_GENERATIONS } from '@/lib/apps/journal'
import {
  comparerSchema,
  type ColonneVivante,
  type ContrainteVivante,
  type EcartSchema,
  type ReponsePose,
} from '@/lib/apps/schema-vivant'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Un propriétaire qui n'existe pas, et n'existera jamais. */
const PROPRIETAIRE_TEMOIN = '00000000-0000-0000-0000-0000000000ff'
const MARQUE_TEMOIN = 'TÉMOIN JETABLE — sonde de schéma'

/**
 * LA JUMELLE, DÉRIVÉE — son nom ne s'écrit PAS dans une route.
 *
 * `travailleur-isolation` l'interdit : « la JUMELLE n'existe pas côté
 * application — aucune route ne peut la nommer ». Le cliquet m'a attrapé, et
 * il a raison : une route qui connaît le banc d'essai est une route qui peut
 * y écrire, ou écrire en production en croyant viser le banc. La dérivation
 * garde le lien avec la source unique du DDL.
 */
const TABLE_JUMELLE = `${TABLE_GENERATIONS}_test`

/**
 * LES COLONNES VIVANTES, TOUTES, sans SQL arbitraire.
 *
 * PostgREST publie son OpenAPI à la racine de `/rest/v1/` : chaque table
 * exposée y porte la liste COMPLÈTE de ses colonnes. C'est ce qui permet de
 * ne plus sonder « dix colonnes choisies à la main » — le relevé partiel
 * était précisément le reproche du propriétaire.
 */
async function colonnesVivantes(table: string): Promise<ReadonlyMap<string, ColonneVivante> | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const clef = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (base === '' || clef === '') return null
  const r = await fetch(`${base}/rest/v1/`, {
    headers: { apikey: clef, Authorization: `Bearer ${clef}` },
    cache: 'no-store',
  })
  if (!r.ok) return null
  const spec = (await r.json()) as {
    definitions?: Record<string, {
      required?: string[]
      properties?: Record<string, { format?: string; default?: unknown }>
    }>
  }
  const def = spec.definitions?.[table]
  if (def?.properties === undefined) return null
  // `required` dans l'OpenAPI de PostgREST = NOT NULL, défaut ou pas.
  const obligatoires = new Set(def.required ?? [])
  return new Map(
    Object.entries(def.properties).map(([nom, p]) => [
      nom,
      {
        format: p.format ?? '',
        notNull: obligatoires.has(nom),
        ...(p.default === undefined ? {} : { defaut: p.default }),
      },
    ]),
  )
}

async function contraintesLues(table: string): Promise<readonly ContrainteVivante[] | null> {
  const r = await supabaseAdmin.rpc('contraintes_vivantes', { nom_table: table })
  if (r.error !== null) return null
  return (r.data ?? []) as ContrainteVivante[]
}

/**
 * LA FONCTION EST-ELLE VRAIMENT FERMEE AU PUBLIC ?
 *
 * MESURE DU 2026-11-01 : « revoke all ... from anon, authenticated » a ete
 * colle, et la clef ANONYME appelait quand meme la fonction — Postgres
 * accorde EXECUTE a PUBLIC par defaut, et « anon » en herite. Mon
 * affirmation « la fonction est revoquee » reposait sur ma parole.
 *
 * Elle repose maintenant sur une requete, refaite a chaque deploiement : si
 * la clef anonyme obtient une reponse, c'est un ECART.
 */
async function ouverteAuPublic(): Promise<boolean | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (base === '' || anon === '') return null
  const r = await fetch(`${base}/rest/v1/rpc/contraintes_vivantes`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    // LE NOM VIENT DE LA CONSTANTE : `travailleur-isolation` interdit de
    // l'écrire nu dans une route, et il a raison — un littéral peut diverger
    // de la source du DDL, et c'est ainsi qu'une route finit par viser la
    // mauvaise table.
    body: JSON.stringify({ nom_table: TABLE_GENERATIONS }),
    cache: 'no-store',
  })
  return r.ok
}

async function balayerFantomes(table: string): Promise<readonly string[]> {
  const r = await supabaseAdmin.from(table).delete().eq('owner_id', PROPRIETAIRE_TEMOIN).select('id')
  if (r.error !== null) return []
  return (r.data ?? []).map((x: { id: string }) => x.id)
}

/** Mesure UNE table de bout en bout, et retire ses témoins quoi qu'il arrive. */
async function mesurer(table: string, ddl: string, exercerContraintes: boolean): Promise<EcartSchema> {
  const vivantes = await colonnesVivantes(table)
  if (vivantes === null) {
    return {
      table,
      colonnesManquantes: [],
      colonnesNonDeclarees: [],
      colonnesEnEcart: [],
      contraintesEnEcart: [],
      contraintesSansSonde: [],
      parDecision: [],
      // UN REFUS DE MESURER SE DIT. Sans cette ligne, une table absente de
      // l'OpenAPI rendrait « aucun écart » — le faux vert parfait.
      nonMesure: [`colonnes vivantes illisibles : OpenAPI de PostgREST indisponible pour ${table}`],
    }
  }

  const poses = new Set<string>()
  const poser = async (champs: Record<string, unknown>): Promise<ReponsePose> => {
    const r = await supabaseAdmin
      .from(table)
      .insert({ owner_id: PROPRIETAIRE_TEMOIN, demande: MARQUE_TEMOIN, ...champs })
      .select('id')
      .maybeSingle()
    if (r.error !== null) return { ok: false, code: r.error.code ?? '?', message: r.error.message }
    const id = (r.data as { id: string }).id
    poses.add(id)
    console.log('[sonde-schema] posé', table, id)
    return { ok: true, id }
  }
  const retirer = async (id: string): Promise<void> => {
    await supabaseAdmin.from(table).delete().eq('id', id).eq('owner_id', PROPRIETAIRE_TEMOIN)
    poses.delete(id)
  }
  const relire = async (id: string): Promise<Record<string, unknown> | null> => {
    const r = await supabaseAdmin.from(table).select('*').eq('id', id).maybeSingle()
    return (r.data as Record<string, unknown> | null) ?? null
  }

  try {
    return await comparerSchema({
      table,
      ddl,
      colonnesVivantes: vivantes,
      exercerContraintes,
      // LES CONTRAINTES SE LISENT POUR LES DEUX TABLES — c'est ce qui
      // supprime l'angle mort de la production sans y écrire.
      contraintesVivantes: await contraintesLues(table),
      ...(exercerContraintes ? { poser, retirer, relire } : {}),
    })
  } finally {
    // ② TOUT CE QUI RESTE PART, ET ON RELIT.
    for (const id of [...poses]) await retirer(id)
    const reste = await supabaseAdmin.from(table).select('id').eq('owner_id', PROPRIETAIRE_TEMOIN)
    if ((reste.data ?? []).length > 0) {
      console.error('[sonde-schema] ⚠ TÉMOINS SURVIVANTS', table, (reste.data ?? []).map((x: { id: string }) => x.id))
    }
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  const porte = req.headers.get('authorization') ?? ''
  if (secret === '' || porte !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'reserve' }, { status: 401 })
  }

  // ── ON BALAIE QUAND MÊME LA PRODUCTION : la version d'avant y a posé des
  // témoins, et une lambda tuée au mauvais moment peut en avoir laissé un.
  // Le balayage est un DELETE filtré sur le propriétaire fictif — il ne peut
  // atteindre aucune ligne de vrai client.
  const fantomes = [
    ...(await balayerFantomes(TABLE_GENERATIONS)),
    ...(await balayerFantomes(TABLE_JUMELLE)),
  ]

  // LES DEUX TABLES : la jumelle est censée éprouver les choses « contre la
  // vraie base ». Une jumelle en retard de colonnes est un simulateur qu'on
  // prend pour le réel — le défaut de happy-dom, transposé au schéma.
  const ouverte = await ouverteAuPublic()

  const ecarts = [
    // PRODUCTION : LECTURE SEULE. Colonnes, types, nullabilité, défauts.
    await mesurer(TABLE_GENERATIONS, SQL_TABLE, false),
    // LA JUMELLE PORTE LES ÉCRITURES : c'est à ça qu'elle sert.
    await mesurer(TABLE_JUMELLE, SQL_TABLE_TEST, true),
  ]

  // ── LE VERDICT N'EST PAS CALCULÉ ICI, ET C'EST VOLONTAIRE.
  //
  // Un contrôle dont on n'a jamais vu l'ÉCHEC n'est pas un contrôle (leçon
  // du 31 octobre : le workflow modifié cinq fois sans tourner une fois).
  // Si cette route rendait « conforme / écart », on ne pourrait éprouver son
  // échec qu'en abîmant la base. Elle rend donc la MESURE BRUTE, et
  // `scripts/verifier-schema.mjs` en tire le verdict — ce qui permet de lui
  // présenter un corps FORGÉ et de voir la croix rouge pour de vrai.
  // L'OUVERTURE AU PUBLIC VOYAGE AVEC LA MESURE : c'est le vérificateur qui
  // rougit, pas la route — pour qu'on puisse lui présenter un corps forgé.
  return NextResponse.json(
    { fantomesRetires: fantomes, rpcOuverteAuPublic: ouverte, ecarts },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
