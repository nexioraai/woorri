/**
 * EP-336 · LA PAGE SERVIE REÇOIT VRAIMENT SA BASE.
 *
 * ── LE DÉFAUT MESURÉ LE 2026-11-04, sur la production.
 *
 * Une œuvre d'essai publiée par la vraie route :
 *
 *     publication : HTTP 200 · compte créé
 *     schéma posé : oeuvre_bb1d4d1b_… — 1 table « releve »
 *     page servie : window.DERIBFY_BASE.url    → VIDE
 *                   window.DERIBFY_BASE.schema → VIDE
 *                   bandeau « pas reliée »     → PRÉSENT
 *
 * `pageAutonome` accepte une configuration depuis D4, et ses CINQ
 * appelants l'appelaient avec DEUX arguments. L'injection était écrite,
 * éprouvée par tir le 2026-11-03 — et N'AVAIT AUCUN APPELANT.
 *
 * L'application publiée ne pouvait donc pas atteindre sa base. Le schéma
 * existait, le compte existait, et la page ne les voyait pas.
 *
 * C'est la troisième fois que ce dépôt vit « un module prouvé sans
 * appelant » : `extraction-exigences`, puis `poserOeuvre`, puis
 * l'injection elle-même. Un tir qui prouve un module ne prouve pas qu'on
 * s'en sert.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { baseDeLOeuvre } from '../base-de-l-oeuvre'
import { pageAutonome } from '../boucle-directe'
import { lireSource } from './lire-source'

const CODE = 'export const x = 1'
const SRC = join(__dirname, '..', '..', '..')

describe('EP-336 · la base injectée', () => {
  it('① UNE ŒUVRE AVEC DES TABLES REÇOIT ADRESSE, CLÉ ET SCHÉMA', () => {
    const avant = { ...process.env }
    process.env.OEUVRES_SUPABASE_URL = 'https://abcdefghijklmnopqrst.supabase.co'
    process.env.OEUVRES_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_essai'
    process.env.OEUVRES_SUPABASE_SECRET_KEY = 'sb_secret_essai'
    try {
      const c = baseDeLOeuvre('11111111-2222-3333-4444-555555555555', {
        schema: 'create table if not exists membre ( id text primary key );',
      })
      expect(c, 'une œuvre avec des tables ne reçoit pas sa base').not.toBeUndefined()
      expect(c?.url).toBe('https://abcdefghijklmnopqrst.supabase.co')
      expect(c?.clePubliable).toBe('sb_publishable_essai')
      // LE SCHÉMA EST CELUI DE CETTE ŒUVRE-LÀ, pas un nom générique :
      // deux œuvres qui partageraient un schéma se liraient l'une l'autre.
      expect(c?.schema, 'le schéma injecté ne porte pas l’identifiant de l’œuvre')
        .toMatch(/11111111/u)
    } finally {
      process.env = avant
    }
  })

  it('② UNE ŒUVRE SANS TABLE NE REÇOIT RIEN — et c’est la vérité', () => {
    // Lui donner une base vide serait pire : la page croirait pouvoir
    // écrire, et chaque saisie partirait dans un schéma qui n'existe pas.
    expect(baseDeLOeuvre('abc', { schema: '-- AUCUNE DONNÉE DÉCLARÉE' })).toBeUndefined()
    expect(baseDeLOeuvre('abc', null)).toBeUndefined()
  })

  it('③ LE MÊME TEST QUE LA PUBLICATION, et pas un autre', () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // `publier` décide de poser un schéma sur `schemaSql.includes('create
    // table')`. Si l'injection employait un autre critère, on poserait une
    // base sans l'injecter, ou l'inverse — et les deux se découvrent en
    // production.
    const injection = lireSource(join(SRC, 'lib', 'apps', 'base-de-l-oeuvre.ts'))
    const publication = lireSource(join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts'))
    expect(injection, 'l’injection n’emploie plus le test de la publication').toMatch(
      /includes\('create table'\)/u,
    )
    expect(publication, 'la publication n’emploie plus ce test').toMatch(
      /includes\('create table'\)/u,
    )
  })

  it('④ LES PAGES SERVIES PASSENT LA CONFIGURATION — pas deux arguments', () => {
    // ── LE CŒUR DU DÉFAUT : cinq appelants, zéro configuration.
    //
    // On lit les DEUX routes qui servent une œuvre publiée. Un appel à
    // `pageAutonome` qui n'emporte pas la base y est un retour en arrière.
    // ── L'ANCRE LIT LA PROPRIÉTÉ, PLUS L'IMBRICAULATION DES DEUX APPELS.
    //
    // Mon premier motif exigeait `pageAutonome(… baseDeLOeuvre(` — donc que
    // le second soit écrit DANS les parenthèses du premier. Le 2026-11-05
    // les deux routes ont dû nommer la base (`const base = …`) pour en
    // dériver l'en-tête, et ce contrôle a rougi sur un changement JUSTE.
    // NEUVIÈME fois cette semaine qu'une ancre mesure un RANGEMENT.
    //
    // La propriété est : la route CALCULE la base, et elle la PASSE.
    for (const chemin of [
      ['app', 'p', '[jeton]', 'route.ts'],
      ['app', 'a', '[sous]', 'route.ts'],
    ]) {
      const ou = chemin.join('/')
      const src = lireSource(join(SRC, ...chemin))
      expect(src, `${ou} : la base n’est pas calculée`).toMatch(
        /baseDeLOeuvre\(String\(lu\.data\.id\), lu\.data\.document\)/u,
      )
      // ── ET ELLE ARRIVE À LA PAGE : « c'est calculé » et « ça arrive »
      //    sont deux choses. Une base calculée puis oubliée laisserait
      //    l'écran muet sans que rien ne rougisse.
      expect(src, `${ou} : la base est calculée puis jamais passée`).toMatch(
        /pageAutonome\([^)]*\bbase(\b|\?)/u,
      )
    }
  })

  it('⑤ ET LE BANDEAU DISPARAÎT QUAND LA BASE EST LÀ', () => {
    const reliee = pageAutonome(CODE, 'Une œuvre', {
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      clePubliable: 'sb_publishable_essai',
      schema: 'oeuvre_abc',
    })
    expect(reliee, 'une application reliée porte encore un bandeau').not.toMatch(
      /sera créée à la publication|n’est pas encore reliée/u,
    )
    expect(reliee, 'la base n’est pas injectée dans la page').toMatch(
      /window\.DERIBFY_BASE=Object\.freeze/u,
    )
    expect(reliee, 'le schéma n’arrive pas à la page').toContain('oeuvre_abc')
  })
})
