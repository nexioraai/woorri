/**
 * EP-322 · POSER UNE ŒUVRE — les trois pièges qui ne se devinent pas.
 *
 * ── CE CLIQUET EXISTE POUR CELUI QUI REFACTORISERA DANS SIX MOIS.
 *
 * Les trois choses qu'il tient ont été découvertes par la mesure, pas par le
 * raisonnement, et aucune ne se relit dans le code comme une évidence :
 *
 * ① LES DEUX NOTIFICATIONS. `reload config` reprend la liste des schémas
 *    exposés ; le cache des TABLES exige `reload schema`. Avec la première
 *    seule, PostgREST rend un 404 absurde — « Could not find the table
 *    'oeuvre_….client' » avec pour indice « Perhaps you meant the table
 *    'oeuvre_….client' », le même nom. Personne ne reliera jamais ça à une
 *    notification manquante, et une œuvre publiée répondrait « table
 *    introuvable » à ses propres écrans.
 *
 * ② LA BORNE DES 63 OCTETS. Postgres tronque un identifiant plus long SANS
 *    RIEN DIRE. Deux œuvres qui ne diffèrent qu'après le 63e octet
 *    obtiendraient le MÊME schéma, et la seconde écrirait dans les tables de
 *    la première — un mélange de données entre deux clients, invisible.
 *
 * ③ L'ORDRE. L'exposition vient APRÈS le commit. « Exposer un schéma dont
 *    les politiques ne sont pas posées, c'est ouvrir la porte avant d'avoir
 *    posé la serrure. »
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import {
  CLE_VERROU_SCHEMAS,
  listeAvecSchema,
  nomSchemaOeuvre,
  OCTETS_MAX_IDENTIFIANT,
  SCHEMAS_DE_BASE } from '../poser-oeuvre'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const MODULE = (): string =>
  lireSource(join(RACINE, 'apps', 'web', 'src', 'lib', 'apps', 'poser-oeuvre.ts'))

/** L'uuid d'une œuvre réelle : stable toute sa vie. */
const UUID = 'fa0ede2c-1111-4111-8111-111111111111'

describe('EP-322 · poser une œuvre', () => {
  it('① LES DEUX NOTIFICATIONS, et pas une', () => {
    const m = MODULE()
    // ── MON ASSERTION ÉTAIT SATISFAITE PAR LE COMMENTAIRE DU FICHIER.
    //
    // Retirer l'APPEL laissait la phrase dans le bloc de tête, et le
    // contrôle restait vert. Même classe que la ligne d'import qui
    // satisfaisait un `toContain` plus tôt dans la journée : on exige donc
    // l'appel, qu'une prose ne peut pas produire.
    expect(m, 'la liste des schémas exposés n’est plus rechargée')
      .toContain(`await client.query("notify pgrst, 'reload config'")`)
    // ── CELLE-CI EST CELLE QU'ON RETIRE SANS LE SAVOIR.
    //
    // Son absence ne casse rien à la pose : la transaction réussit, le
    // schéma existe, la liste est à jour. Seul le CACHE DES TABLES reste
    // périmé, et le symptôme arrive plus tard, chez l'utilisateur.
    expect(m, 'le cache des TABLES n’est plus rechargé : PostgREST rendra « table introuvable »')
      .toContain(`await client.query("notify pgrst, 'reload schema'")`)
    // ET DANS LA MÊME TRANSACTION QUE L'INSCRIPTION : Postgres ne délivre
    // un `notify` qu'au commit, donc PostgREST ne recharge que si la liste
    // a vraiment changé.
    const i = m.indexOf('pg_advisory_xact_lock')
    const j = m.indexOf("notify pgrst, 'reload schema'")
    const k = m.indexOf("commit'", j)
    expect(i, 'le verrou a disparu').toBeGreaterThan(-1)
    expect(j, 'la notification du cache est hors de la transaction verrouillée')
      .toBeGreaterThan(i)
    expect(k, 'la transaction ne se referme pas après les notifications').toBeGreaterThan(j)
  })

  it('② LA BORNE DES 63 OCTETS PORTE SUR LE NOM PRODUIT', () => {
    // ── MA PREMIÈRE GARDE ÉTAIT UN GARDE-FOU PAR ACCIDENT.
    //
    // Je bornais la SAISIE à 50 signes : 57 octets en sortie, donc ça
    // tenait. Mais il suffisait d'allonger le préfixe, de changer la forme
    // de l'identifiant, ou de passer à un identifiant plus long, et 57
    // devenait 64. « Un nom ne protège de rien » — on mesure CE QUI PART.
    expect(nomSchemaOeuvre(UUID)).toBe('oeuvre_fa0ede2c_1111_4111_8111_111111111111')
    expect(Buffer.byteLength(nomSchemaOeuvre(UUID), 'utf8')).toBeLessThanOrEqual(OCTETS_MAX_IDENTIFIANT)

    // LE PLUS LONG QUI PASSE, ET LE PREMIER QUI NE PASSE PLUS — calculés
    // depuis la borne, jamais recopiés : le jour où le préfixe change,
    // c'est le code qui suit, pas ce test qui mente.
    const prefixe = nomSchemaOeuvre('a').length - 1
    const juste = 'a'.repeat(OCTETS_MAX_IDENTIFIANT - prefixe)
    expect(Buffer.byteLength(nomSchemaOeuvre(juste), 'utf8')).toBe(OCTETS_MAX_IDENTIFIANT)
    expect(
      () => nomSchemaOeuvre(`${juste}a`),
      'un nom de 64 octets est accepté : Postgres le tronquera en silence',
    ).toThrow(/TROP_LONG/u)

    // ET LES SIGNES RESTENT GARDÉS : un identifiant n'est jamais un
    // paramètre lié, donc tout ce qui n'est pas [a-z0-9_] est une injection
    // qui attend son tour.
    for (const mauvais of ['a;drop schema public', 'a"b', "a'b", 'a b', 'A-B.c', '']) {
      expect(() => nomSchemaOeuvre(mauvais), `« ${mauvais} » est accepté`).toThrow()
    }
  })

  it('③ UNE ŒUVRE GARDE SON SCHÉMA TOUTE SA VIE', () => {
    // ── LE DÉFAUT QUI NE SE VERRAIT QU'APRÈS UNE PERTE DE TRAVAIL.
    //
    // Si le nom dépendait d'autre chose que l'identifiant de l'œuvre — un
    // compteur, un horodatage, le rang de la version — republier créerait
    // un schéma NEUF et les données saisies resteraient orphelines dans
    // l'ancien. L'utilisateur ajoute quarante membres, republie une
    // correction de texte, et son application repart vide.
    //
    // PROUVÉ SUR LA VRAIE BASE le 2026-11-02 : 40 lignes saisies,
    // republication, 40 lignes. `expose:false` au second passage — la liste
    // n'est pas réécrite pour rien.
    expect(nomSchemaOeuvre(UUID)).toBe(nomSchemaOeuvre(UUID))
    expect(nomSchemaOeuvre(UUID.toUpperCase())).toBe(nomSchemaOeuvre(UUID))
    // Le nom ne dépend QUE de l'identifiant : aucune horloge, aucun hasard.
    const m = MODULE()
    const corps = m.slice(m.indexOf('export function nomSchemaOeuvre'), m.indexOf('export const CLE_VERROU'))
    for (const interdit of ['Date', 'random', 'version', 'rang', 'now()']) {
      expect(corps, `le nom du schéma dépend de ${interdit} : republier créerait un schéma neuf`)
        .not.toContain(interdit)
    }
    // Et la pose est IDEMPOTENTE : `if not exists`, jamais un `create` sec.
    expect(m, 'la création du schéma n’est plus idempotente')
      .toContain('create schema if not exists')
  })

  it('④ L’EXPOSITION VIENT APRÈS LE COMMIT', () => {
    const m = MODULE()
    // La pose des tables et de la porte est une transaction à elle seule ;
    // l'inscription dans la liste exposée en est une seconde.
    const poseCommit = m.indexOf("await client.query('commit')")
    const alter = m.indexOf('alter role authenticator set pgrst.db_schemas')
    expect(poseCommit, 'la transaction de pose ne se valide plus').toBeGreaterThan(-1)
    expect(alter, 'l’inscription a disparu').toBeGreaterThan(-1)
    expect(
      alter > poseCommit,
      'le schéma est exposé AVANT que la porte soit posée : la serrure après la porte',
    ).toBe(true)
    // ── TROU TROUVÉ PAR UNE MUTATION INVALIDE, ET C'EST LE DÉFAUT ① LUI-MÊME.
    //
    // J'avais déplacé `politiquesSql` APRÈS le commit pour éprouver l'ordre
    // de l'exposition — la mutation ne mesurait pas ce que je croyais, mais
    // elle décrivait exactement le défaut à interdire : des tables validées
    // SANS leur porte, puis les politiques dans une seconde transaction qui
    // peut échouer. C'est `ent_depart` refabriqué à la main.
    //
    // Le schéma ET la porte sont donc dans LA MÊME transaction, avant le
    // premier commit.
    const schemaSql = m.indexOf('await client.query(o.schemaSql)')
    const politiquesSql = m.indexOf('await client.query(o.politiquesSql)')
    expect(schemaSql, 'le schéma n’est plus appliqué').toBeGreaterThan(-1)
    expect(politiquesSql, 'la porte n’est plus appliquée').toBeGreaterThan(-1)
    expect(
      schemaSql < poseCommit && politiquesSql < poseCommit,
      'les tables sont validées sans leur porte : un échec ensuite laisse un schéma ouvert',
    ).toBe(true)
    // ET UN ÉCHEC DE POSE NE LAISSE RIEN : le rollback est explicite.
    expect(m, 'un échec de pose ne défait plus la transaction').toContain("'rollback'")
  })

  it('⑤ LA COURSE SUR LA LISTE PARTAGÉE EST VERROUILLÉE', () => {
    // `pgrst.db_schemas` est une valeur UNIQUE qu'on lit, modifie, réécrit.
    // Deux publications simultanées : la seconde écrase l'ajout de la
    // première, et le schéma perdu ne se voit nulle part — l'application
    // répondra 406 un jour, sans que rien ne l'explique.
    const m = MODULE()
    expect(m, 'le lire-modifier-écrire n’est plus verrouillé').toContain('pg_advisory_xact_lock')
    // `xact` ET PAS `pg_advisory_lock` : la version de transaction se relâche
    // au commit comme au rollback, donc elle ne peut pas rester prise.
    expect(m, 'un verrou de session peut rester pris : employez la version de transaction')
      .not.toMatch(/pg_advisory_lock\(/u)
    expect(CLE_VERROU_SCHEMAS, 'la clé du verrou n’est plus une constante').toBeTypeOf('number')

    // LA FUSION DE LA LISTE EST PURE, donc éprouvable sans base.
    expect(listeAvecSchema(null, 'oeuvre_a')).toBe('public, graphql_public, oeuvre_a')
    expect(listeAvecSchema([`pgrst.db_schemas=${SCHEMAS_DE_BASE}`], 'oeuvre_a'))
      .toBe('public, graphql_public, oeuvre_a')
    // UN SCHÉMA DÉJÀ LÀ NE FAIT PAS RÉÉCRIRE : `null` évite un rechargement
    // de PostgREST pour rien.
    expect(listeAvecSchema(['pgrst.db_schemas=public, oeuvre_a'], 'oeuvre_a')).toBeNull()
    // ET ON N'ÉCRASE PAS CE QUI EST DÉJÀ INSCRIT — c'est tout l'objet.
    const avec = listeAvecSchema(['pgrst.db_schemas=public, oeuvre_a'], 'oeuvre_b')
    expect(avec, 'un schéma inscrit par une autre publication est perdu').toContain('oeuvre_a')
    expect(avec).toContain('oeuvre_b')
    // Les autres réglages du rôle ne sont pas lus comme la liste.
    expect(listeAvecSchema(['statement_timeout=8s', 'lock_timeout=8s'], 'oeuvre_a'))
      .toBe('public, graphql_public, oeuvre_a')
  })

  it('⑥ CE MODULE N’EST ATTEIGNABLE D’AUCUN COMPOSANT CLIENT', () => {
    // ── LA LEÇON DE `juge-execution`, TIRÉ UN JOUR DANS UN PAQUET NAVIGATEUR.
    //
    // Ce module importe `pg` et reçoit une chaîne de connexion qui ouvre la
    // base ENTIÈRE, sans RLS. Un composant client qui l'atteindrait
    // emporterait le pilote Postgres dans le paquet du navigateur — et, au
    // pire, la chaîne elle-même.
    // ── ON DEMANDE A GIT QUI PARLE DE CE MODULE, puis on ne lit QUE ceux-la.
    //
    // Ma premiere forme parcourait tout `src` en lisant chaque fichier :
    // environ mille lectures pour trouver une poignee de mentions. Elle
    // passait seule, et elle a fait deborder un AUTRE test sous la charge de
    // la suite (EP-321 ⑧, 595 ms -> 1 806 ms). Le cout d'un test n'est pas
    // qu'une affaire de patience : il se paie chez le voisin.
    let mentions: string[] = []
    try {
      //  : la question « un composant client importe-t-il ce
      // module ? » porte sur le CODE, qu'il soit valide ou non. Sans ce
      // drapeau, le controle etait vert avant le commit et rouge apres --
      // un test dont le verdict depend de l'etat de l'index ne vaut rien.
      //
      // (EP-321 ⑧ fait l'INVERSE a dessein : une cle dans un fichier non
      // suivi est a sa place, c'est d'etre SUIVIE qui la rend fautive.)
      mentions = execFileSync('git', ['grep', '-I', '-l', '--untracked', 'poser-oeuvre'], {
        cwd: RACINE,
        maxBuffer: 4 * 1024 * 1024,
      })
        .toString('utf8')
        .split('\n')
        .filter((x) => x !== '' && /\.tsx?$/u.test(x))
    } catch {
      mentions = [] // `git grep` sort en 1 quand il ne trouve rien
    }
    // LE TEMOIN : ce module est forcement mentionne par son propre cliquet.
    // Si git n'en trouve aucun, c'est l'instrument qui est casse.
    expect(mentions.length, 'git grep ne trouve aucune mention : l’instrument est cassé')
      .toBeGreaterThan(0)

    const clients = mentions.filter((rel) => {
      const c = lireSource(join(RACINE, rel))
      // `'use client'` EN TÊTE : c'est la seule marque qui fasse d'un module
      // un morceau du paquet navigateur.
      return /^'use client'/u.test(c)
    })
    expect(clients, 'un composant client atteint le module qui ouvre la base').toEqual([])
    // Et il ne lit JAMAIS la chaîne lui-même : elle lui est passée, donc une
    // seule couture la connaît.
    expect(MODULE(), 'le module lit l’environnement : la chaîne doit lui être PASSÉE')
      .not.toContain('process.env')
  })
})
