/**
 * EP-311 — LA COMPARAISON SCHÉMA VIVANT ↔ DDL NE PEUT PAS SE TAIRE.
 *
 * Le moteur de `schema-vivant.ts` s'éprouve ICI, sans base : ses entrées
 * sont injectées. Ce que la gate prouve, c'est qu'il DIT l'écart quand il y
 * en a un — pas que la base est conforme, ce qui ne se prouve qu'en ligne
 * (règle ② : la fonction réelle, pas la gate).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  checksDeclares,
  comparerContraintesLues,
  comparerSchema,
  CONTRAINTES_NON_EXERCEES,
  declarationsDeDdl,
  contraintesDeclarees,
  DOCUMENT_TEMOIN,
  ecartExiste,
  sondesPour,
  type ColonneVivante,
  type ReponsePose,
} from '../schema-vivant'
import { SQL_TABLE, SQL_TABLE_TEST, TABLE_GENERATIONS } from '../journal'

// ── LE NOM DE LA VRAIE TABLE NE S'ÉCRIT PAS NU, MÊME DANS UN CORPS FORGÉ.
//
// `travailleur-isolation` l'interdit hors de `journal.ts` et de ses deux
// cliquets — et il m'a attrapé sur ce fichier. La règle est juste : un nom
// de table écrit à la main dans un test est un nom qui peut diverger de la
// source, et c'est ainsi qu'un banc d'essai finit par viser la production.
// Les contraintes se nomment donc PAR DÉRIVATION.

/**
 * Une base de pacotille : accepte tout, sauf ce qu'on lui dit de refuser.
 *
 * ── POURQUOI UNE LISTE ET UN FILTRE, PAS UNE `Map`.
 *
 * La première version retirait ses lignes avec `posees.delete(id)` — une
 * `Map`, pas une base. Mais le cliquet d'isolation de `travailleur-isolation`
 * lit le TEXTE des sources de `lib/apps` et interdit cette séquence partout
 * sauf dans `banc-jumelle.ts` : leçon du 2026-10-09, ~6,9 $ d'état payé
 * effacé parce que la jumelle mêlait banc d'essai et entrepôt.
 *
 * Le cliquet ne peut pas distinguer une collection d'une table, et c'est
 * VOULU : un cliquet de texte qui accepterait des exceptions « parce que
 * celle-là est inoffensive » ne protégerait plus rien. On écrit donc le faux
 * autrement — une liste, un filtre — au lieu de desserrer le contrôle.
 */
function baseFeinte(refuse: (champs: Record<string, unknown>) => string | null) {
  let posees: string[] = []
  let n = 0
  return {
    restantes: () => posees,
    poser: async (champs: Record<string, unknown>): Promise<ReponsePose> => {
      const code = refuse(champs)
      if (code !== null) return { ok: false, code, message: `refusé (${code})` }
      n += 1
      const id = `t${String(n)}`
      posees = [...posees, id]
      return { ok: true, id }
    },
    retirer: async (id: string) => { posees = posees.filter((x) => x !== id) },
  }
}

const DECLAREES = declarationsDeDdl(SQL_TABLE)

/**
 * LA BASE « PARFAITE » : exactement ce que le dépôt déclare, traduit dans le
 * vocabulaire de PostgREST. C'est le témoin de référence — tout écart qu'on
 * injecte ensuite part de là.
 */
const EQUIV: Record<string, string> = {
  text: 'text', uuid: 'uuid', jsonb: 'jsonb', boolean: 'boolean',
  integer: 'integer', numeric: 'numeric', timestamptz: 'timestamp with time zone',
  'text[]': 'text[]',
}
const TOUTES: ReadonlyMap<string, ColonneVivante> = new Map(
  [...DECLAREES].map(([nom, d]) => [nom, {
    format: EQUIV[d.type.replace(/\(\d+(?:,\d+)?\)/u, '')] ?? d.type,
    notNull: d.notNull,
    ...(d.defaut === undefined ? {} : { defaut: d.defaut.replace(/::[a-z ]+$/u, '').replace(/^'|'$/gu, '') }),
  }]),
)

describe('EP-311 — le moteur de comparaison de schéma', () => {
  it('① IL LIT TOUTES LES COLONNES DÉCLARÉES, commentaires exclus', () => {
    // La prose du DDL raconte les défauts passés et nomme des colonnes :
    // les compter comme déclarées serait le faux vert qu'on a déjà vu.
    expect(DECLAREES.size).toBeGreaterThan(20)
    for (const c of ['publication_slug', 'publication_jeton', 'sections_acquises', 'statut']) {
      expect(DECLAREES.has(c), `${c} non vue comme déclarée`).toBe(true)
    }
    const prose = declarationsDeDdl('-- add column if not exists colonne_de_commentaire text;\n')
    expect(prose.size, 'une colonne nommée dans un commentaire compte comme déclarée').toBe(0)
  })

  it('② CHAQUE CONTRAINTE DÉCLARÉE A SA SONDE — sinon on le dit', async () => {
    const declarees = contraintesDeclarees(SQL_TABLE, TABLE_GENERATIONS)
    expect(declarees.size, 'aucune contrainte lue dans le DDL').toBeGreaterThan(3)
    const sondes = sondesPour(SQL_TABLE)
    const sans = [...declarees].filter((n) => sondes[n] === undefined)
    expect(
      sans,
      'contrainte(s) déclarée(s) qu’aucune sonde n’exerce — couverture silencieuse : ' + sans.join(', '),
    ).toEqual([])
  })

  it('③ LES STATUTS SONDÉS SONT LUS DANS LE DDL, pas recopiés', () => {
    const sondes = sondesPour(SQL_TABLE)
    const eprouves = (sondes.statut_valide.accepte ?? []).map((r) => r.statut)
    // Le défaut du jour : « supprimee » refusé par la base. La sonde doit
    // l'éprouver parce que le DDL le déclare, sans qu'on l'ait écrit ici.
    expect(eprouves).toContain('supprimee')
    expect(eprouves).toContain('annulee')
    expect(eprouves.length).toBe(6)
  })

  it('④ UNE BASE CONFORME NE REND AUCUN ÉCART', async () => {
    const feinte = baseFeinte((c) => {
      if (c.statut === 'statut_qui_nexiste_pas') return '23514'
      if (c.statut === 'livree' && c.document === null) return '23514'
      if (c.publication_jeton !== undefined && c.document === null) return '23514'
      if (c.statut === 'en_cours' && (c.battement === null || c.battement === undefined)) return '23514'
      if (c.publication_jeton === `sonde-schema-unicite-${TABLE_GENERATIONS}` && dejaVu.has('jeton')) return '23505'
      if (c.publication_jeton === `sonde-schema-unicite-${TABLE_GENERATIONS}`) dejaVu.add('jeton')
      return null
    })
    const dejaVu = new Set<string>()
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: TOUTES, exercerContraintes: true, ...feinte,
    })
    expect(e.contraintesEnEcart, JSON.stringify(e.contraintesEnEcart)).toEqual([])
    expect(ecartExiste(e)).toBe(false)
    // ET LES TÉMOINS SONT TOUS RETIRÉS : une sonde qui laisse ses lignes
    // derrière elle pollue la table qu'elle mesure.
    expect(feinte.restantes(), 'des témoins survivent à la comparaison').toEqual([])
  })

  it('⑤ UNE CONTRAINTE TROP ÉTROITE EST VUE — c’est le défaut du jour', async () => {
    // La base refuse « supprimee » : exactement ce qui a échoué devant le
    // propriétaire. Le sens « la base REFUSE ce qu'elle doit accepter » est
    // celui qu'on oublie toujours de mesurer.
    const feinte = baseFeinte((c) => (c.statut === 'supprimee' || c.statut === 'statut_qui_nexiste_pas' ? '23514' : null))
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: TOUTES, exercerContraintes: true, ...feinte,
    })
    expect(ecartExiste(e)).toBe(true)
    expect(e.contraintesEnEcart.some((c) => c.nom === 'statut_valide' && c.constat.includes('REFUSÉ'))).toBe(true)
  })

  it('⑥ UNE CONTRAINTE ABSENTE DE LA BASE EST VUE', async () => {
    // Personne ne refuse rien : chaque sonde `refuse` doit crier.
    const feinte = baseFeinte(() => null)
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: TOUTES, exercerContraintes: true, ...feinte,
    })
    const accepteALaPlaceDeRefuser = e.contraintesEnEcart.filter((c) => c.constat.includes('ACCEPTÉ'))
    expect(accepteALaPlaceDeRefuser.length, 'une base sans aucune contrainte passe pour conforme').toBeGreaterThan(3)
  })

  it('⑦ UNE COLONNE MANQUANTE ARRÊTE LA MESURE AU LIEU D’ACCUSER À TORT', async () => {
    // Sur une table en retard, chaque pose échoue pour une raison qui n'est
    // PAS la contrainte visée. Conclure « contrainte absente » serait un faux
    // positif ; se taire serait un faux vert. On nomme le blocage.
    const amputee = new Map([...TOUTES].filter(([c]) => c !== 'publication_slug'))
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: amputee, exercerContraintes: true, ...baseFeinte(() => null),
    })
    expect(e.colonnesManquantes).toEqual(['publication_slug'])
    expect(e.contraintesEnEcart, 'des contraintes sont accusées alors qu’une colonne manque').toEqual([])
    expect(e.nonMesure.join(' ')).toContain('publication_slug')
    expect(ecartExiste(e)).toBe(true)
  })

  it('⑧ UNE COLONNE VIVANTE NON DÉCLARÉE EST VUE — l’autre sens', async () => {
    // `publication_slug` vivait dans la base et n'était déclaré nulle part :
    // toute base reconstruite depuis le dépôt naissait sans lui.
    const avecIntruse = new Map([...TOUTES, ['colonne_posee_a_la_main', { format: 'text', notNull: false }]] as const)
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: avecIntruse, exercerContraintes: true, ...baseFeinte(() => '23514'),
    })
    expect(e.colonnesNonDeclarees).toEqual(['colonne_posee_a_la_main'])
    expect(ecartExiste(e)).toBe(true)
  })

  it('⑨ LA JUMELLE EST MESURÉE AVEC LE MÊME MOTEUR', () => {
    // Le banc « contre la vraie base » tourne sur la jumelle : une jumelle en
    // retard est un simulateur qu'on prend pour le réel.
    expect(declarationsDeDdl(SQL_TABLE_TEST).size).toBe(TOUTES.size)
    expect([...contraintesDeclarees(SQL_TABLE_TEST, `${TABLE_GENERATIONS}_test`)].sort())
      .toEqual([...contraintesDeclarees(SQL_TABLE, TABLE_GENERATIONS)].sort())
  })

  it('⑩ LE DOCUMENT TÉMOIN EST VRAI — les contraintes l’exigent', () => {
    expect(Object.keys(DOCUMENT_TEMOIN.fichiers).length).toBeGreaterThan(0)
  })

  it('⑪ EN LECTURE SEULE, LE RAPPORT PORTE LA PHRASE — et n’est pas rouge', async () => {
    // DÉCISION DU PROPRIÉTAIRE : plus aucune écriture fictive dans la table
    // des vrais clients. Le coût est que les contraintes de PRODUCTION ne
    // sont plus exercées — donc le défaut du jour (la base refusant
    // « supprimee ») ne serait PAS attrapé par l'exercice sur cette table.
    //
    // Une décision assumée et IMPRIMÉE n'est pas un silence : ce cliquet
    // exige la phrase dans le rapport. Sans elle, quelqu'un lirait un vert
    // plus large qu'il n'est.
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: TOUTES, exercerContraintes: false,
    })
    // `parDecision` porte plusieurs décisions (les défauts jsonb illisibles
    // en sont une autre) : on exige LA phrase, pas qu'elle soit seule.
    expect(e.parDecision).toContain(CONTRAINTES_NON_EXERCEES)
    expect(e.parDecision.join(' ')).toMatch(/PAS que cette table/u)
    expect(e.contraintesEnEcart).toEqual([])
    // PAS ROUGE : c'est un choix, pas une mesure manquante.
    expect(ecartExiste(e)).toBe(false)
  })

  it('⑫ TYPE, NULLABILITÉ ET DÉFAUT SONT COMPARÉS — la classe du jour', async () => {
    // « Une colonne déclarée `text not null` et vivante en nullable passerait
    // pour conforme » : c'était mon propre D①.
    const tordue = new Map([...TOUTES])
    // `statut text not null default 'en_attente'` : on tord les trois à la
    // fois. Le type reste lisible (`text`) — un `jsonb` ferait sauter la
    // comparaison de défaut, qui n'est pas lisible pour ce type (mesuré).
    tordue.set('statut', { format: 'integer', notNull: false, defaut: 'autre_chose' })
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: tordue, exercerContraintes: false,
    })
    const constats = e.colonnesEnEcart.filter((c) => c.colonne === 'statut').map((c) => c.constat).join(' ; ')
    expect(constats, constats).toMatch(/type/u)
    expect(constats, constats).toMatch(/NOT NULL/u)
    expect(constats, constats).toMatch(/défaut/u)
    expect(ecartExiste(e)).toBe(true)
  })

  it('⑬ LES CONTRAINTES DE PRODUCTION SE LISENT — l’angle mort disparaît', () => {
    // LA TROISIÈME VOIE (propriétaire, 2026-11-01) : exercer exigeait
    // d'écrire, ne pas exercer rendait aveugle sur la production.
    // `pg_get_constraintdef` les REND, et le défaut du jour se retrouve par
    // LECTURE — sans poser une seule ligne dans la table des vrais clients.
    const vivantes = [{
      nom: `${TABLE_GENERATIONS}_statut_valide`,
      definition:
        "CHECK ((statut = ANY (ARRAY['en_attente'::text, 'en_cours'::text, " +
        "'livree'::text, 'refusee'::text])))",
      validee: true,
    }]
    const ecarts = comparerContraintesLues({ ddl: SQL_TABLE, table: TABLE_GENERATIONS, vivantes })
    const statut = ecarts.find((x) => x.nom === 'statut_valide')
    expect(statut, JSON.stringify(ecarts)).toBeDefined()
    expect(statut?.constat).toContain('annulee')
    expect(statut?.constat).toContain('supprimee')
    // ET LES AUTRES CONTRAINTES, ABSENTES DE CE CORPS, SONT DITES ABSENTES :
    // une base qui n'applique plus rien ne doit pas passer pour conforme.
    // TROIS CHECK absents + L'INDEX UNIQUE absent : quatre règles que la
    // base n'applique plus. Le compte inclut l'index depuis qu'on le lit.
    expect(ecarts.filter((x) => x.constat.includes('ABSENTE')).length).toBe(4)
  })

  it('⑯ UNE CONTRAINTE « NOT VALID » FAIT ROUGIR — déclarée ≠ appliquée', () => {
    // Elle existe, sa définition est parfaite, et elle ne vérifie que les
    // écritures futures : les lignes déjà en base y échappent. Sans ce
    // contrôle, le rapport dirait « conforme » sur une règle qui ne protège
    // rien de ce qui est déjà là.
    const parfaite = checksDeclares(SQL_TABLE, TABLE_GENERATIONS)
    const vivantes = [
      ...[...parfaite].map(([nom, expr]) => ({
        nom: `${TABLE_GENERATIONS}_${nom}`,
        definition: `CHECK (${expr})`,
        validee: nom !== 'statut_valide',
      })),
      { nom: `${TABLE_GENERATIONS}_publication_jeton_unique`, definition: 'CREATE UNIQUE INDEX …', validee: true },
    ]
    const ecarts = comparerContraintesLues({ ddl: SQL_TABLE, table: TABLE_GENERATIONS, vivantes })
    expect(ecarts.length, JSON.stringify(ecarts)).toBe(1)
    expect(ecarts[0].nom).toBe('statut_valide')
    expect(ecarts[0].constat).toContain('NOT VALID')
  })

  it('⑰ UNE VALIDITÉ INCONNUE NE SE SUPPOSE PAS VALIDE', () => {
    // Une RPC d'une version antérieure ne rend pas `validee`. Le supposer
    // vrai serait conclure sans mesure — on le DIT, et c'est rouge.
    const parfaite = checksDeclares(SQL_TABLE, TABLE_GENERATIONS)
    const vivantes = [
      ...[...parfaite].map(([nom, expr]) => ({ nom: `${TABLE_GENERATIONS}_${nom}`, definition: `CHECK (${expr})` })),
      { nom: `${TABLE_GENERATIONS}_publication_jeton_unique`, definition: 'CREATE UNIQUE INDEX …' },
    ]
    const ecarts = comparerContraintesLues({ ddl: SQL_TABLE, table: TABLE_GENERATIONS, vivantes })
    // QUATRE CHECK + L'INDEX : cinq règles dont on ignore si elles s'appliquent.
    expect(ecarts.length, JSON.stringify(ecarts)).toBe(5)
    expect(ecarts[0].constat).toContain('validité inconnue')
    expect(ecarts[4].constat).toContain('validité d’unicité inconnue')
  })

  it('⑭ LA RÉÉCRITURE DE POSTGRES NE FAIT PAS ROUGIR', () => {
    // `statut in ('a','b')` revient en `= ANY (ARRAY['a'::text…])`. Comparer
    // les TEXTES ferait rougir en permanence — c'est la forme de faux positif
    // qui m'a coûté quatre accusations à tort aujourd'hui. On compare les
    // ENSEMBLES de littéraux, qui survivent à la réécriture.
    const litteraux = [...checksDeclares(SQL_TABLE, TABLE_GENERATIONS).get('statut_valide')!
      .matchAll(/'([a-z_]+)'/gu)].map((m) => m[1])
    const vivantes = [
      {
        nom: `${TABLE_GENERATIONS}_statut_valide`,
        definition: `CHECK ((statut = ANY (ARRAY[${litteraux.map((v) => `'${v}'::text`).join(', ')}])))`,
        validee: true,
      },
      { nom: `${TABLE_GENERATIONS}_livree_a_document`, definition: "CHECK (((statut <> 'livree'::text) OR (document IS NOT NULL)))", validee: true },
      { nom: `${TABLE_GENERATIONS}_publie_a_document`, definition: 'CHECK (((publication_jeton IS NULL) OR (document IS NOT NULL)))', validee: true },
      { nom: `${TABLE_GENERATIONS}_en_cours_verrouillee`, definition: "CHECK (((statut <> 'en_cours'::text) OR ((battement IS NOT NULL) AND (jeton_travailleur IS NOT NULL))))", validee: true },
      // L'INDEX UNIQUE EN FAIT PARTIE : il vit dans pg_index, pas dans
      // pg_constraint, et la première version de la RPC ne le voyait pas.
      { nom: `${TABLE_GENERATIONS}_publication_jeton_unique`, definition: 'CREATE UNIQUE INDEX …', validee: true },
    ]
    const ecarts = comparerContraintesLues({ ddl: SQL_TABLE, table: TABLE_GENERATIONS, vivantes })
    expect(ecarts, JSON.stringify(ecarts)).toEqual([])
  })

  it('⑮ SANS LA RPC, ON NE CONCLUT PAS — c’est rouge, pas silencieux', async () => {
    const e = await comparerSchema({
      table: TABLE_GENERATIONS, ddl: SQL_TABLE, colonnesVivantes: TOUTES,
      exercerContraintes: false, contraintesVivantes: null,
    })
    expect(e.nonMesure.join(' ')).toContain('contraintes_vivantes')
    expect(ecartExiste(e), 'une RPC absente passe pour un schéma conforme').toBe(true)
  })

  it('⑱ UN INDEX UNIQUE DISPARU FAIT ROUGIR — deux jetons identiques', () => {
    // « publication_jeton_unique » vit dans pg_index, PAS dans
    // pg_constraint : la première version de la RPC ne le voyait pas. S'il
    // disparaissait en production, deux applications partageraient un jeton
    // et la route publique n'aurait aucun moyen de choisir laquelle servir.
    const vivantes = [...checksDeclares(SQL_TABLE, TABLE_GENERATIONS)].map(([nom, expr]) => ({
      nom: `${TABLE_GENERATIONS}_${nom}`,
      definition: `CHECK (${expr})`,
      validee: true,
    }))
    // … et PAS l'index.
    const ecarts = comparerContraintesLues({ ddl: SQL_TABLE, table: TABLE_GENERATIONS, vivantes })
    expect(ecarts.length, JSON.stringify(ecarts)).toBe(1)
    expect(ecarts[0].nom).toBe('publication_jeton_unique')
    expect(ecarts[0].constat).toContain('partager')
  })

  it('⑲ LA FONCTION EST VERSIONNÉE, ET ELLE RÉVOQUE *PUBLIC*', () => {
    // ── DEUX CLIQUETS M'ONT REPLACÉ CE FICHIER (2026-11-01).
    //
    // J'avais écrit la fonction DANS le DDL des tables (`sqlPour`). Refusé
    // deux fois : « toute RPC appelée a un script versionné » — une fonction
    // se versionne dans `supabase/sql/<nom>.sql`, une par fichier — et son
    // commentaire citait la table de production, donc il VOYAGEAIT dans le
    // DDL de la jumelle, qu'un autre cliquet interdit. Deux refus pour une
    // seule faute de rangement : une fonction n'est pas une table.
    const sql = readFileSync(
      join(__dirname, '..', '..', '..', '..', 'supabase', 'sql', 'contraintes_vivantes.sql'),
      'utf8',
    )
    const propre = sql.replace(/^\s*--.*$/gmu, '')
    expect(propre).toMatch(/create or replace function public\.contraintes_vivantes\(nom_table text\)/u)
    // MESURE DU 2026-11-01 : « revoke … from anon, authenticated » a été
    // collé, et la clef ANONYME appelait quand même la fonction — Postgres
    // accorde EXECUTE à PUBLIC par défaut, et « anon » en hérite.
    expect(
      /revoke all on function public\.contraintes_vivantes\(text\) from public;/u.test(propre),
      'le fichier ne révoque pas PUBLIC : la clef anonyme pourra appeler la fonction',
    ).toBe(true)
    expect(propre).toMatch(/grant execute on function public\.contraintes_vivantes\(text\) to service_role;/u)
    // LE CORPS SE REFERME : j'ai livré une fois ce SQL avec un `$FN$`
    // d'ouverture et aucun de fermeture, et le propriétaire a dû le réparer
    // avant de le coller.
    expect((sql.match(/\$FN\$/gu) ?? []).length, 'le corps de la fonction ne se referme pas').toBe(2)
  })
})
