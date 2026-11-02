/**
 * EP-321 · LES DEUX BASES NE SE CONFONDENT PAS.
 *
 * ── LE DÉFAUT QU'ON REND IMPOSSIBLE À ÉCRIRE.
 *
 * Pas « mal nommer une variable » — poser le schéma d'une œuvre dans la base
 * de Deribfy. Ça n'exige aucune faute de frappe : il suffit de recopier
 * l'URL de Deribfy dans `OEUVRES_SUPABASE_URL` un soir de mise en place, et
 * les tables des œuvres se posent à côté de `app_generations`. Une politique
 * fausse sur l'une expose alors l'autre.
 *
 * Un nom ne protège de rien. La garde est une ÉGALITÉ DE VALEURS.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import {
  configBaseOeuvres,
  NOM_PUBLIABLE_OEUVRES,
  NOM_SECRETE_OEUVRES,
  NOM_URL_DERIBFY,
  NOM_URL_OEUVRES,
  PROVISIONNEMENT_EN_RESERVE } from '../base-oeuvres'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const WEB = join(RACINE, 'apps', 'web', 'src')

const URL_OEUVRES = 'https://abcdefghijklmnopqrst.supabase.co'
const URL_DERIBFY = 'https://lefumezaxfsttigpmzhr.supabase.co'
const COMPLET = {
  [NOM_URL_OEUVRES]: URL_OEUVRES,
  [NOM_PUBLIABLE_OEUVRES]: 'anon-de-test',
  [NOM_SECRETE_OEUVRES]: 'service-de-test',
  [NOM_URL_DERIBFY]: URL_DERIBFY,
}

const sources = (): string[] => {
  const out: string[] = []
  const marcher = (d: string): void => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) {
        if (e !== '__tests__' && e !== 'node_modules') marcher(p)
      } else if (/\.tsx?$/u.test(e)) out.push(p)
    }
  }
  marcher(WEB)
  return out
}

describe('EP-321 · les deux bases', () => {
  it('① UNE CONFIGURATION COMPLÈTE ET DISTINCTE PASSE', () => {
    const r = configBaseOeuvres(COMPLET)
    expect(r.ok, 'une configuration juste est refusée').toBe(true)
    if (r.ok) {
      expect(r.config.url).toBe(URL_OEUVRES)
      expect(r.config.clePubliable).toBe('anon-de-test')
      expect(r.config.cleSecrete).toBe('service-de-test')
    }
  })

  it('② LA MÊME URL QUE DERIBFY EST REFUSÉE — c’est LA garde', () => {
    // ── LE RAYON D'EXPLOSION, ET IL A DÉJÀ EXPLOSÉ UNE FOIS.
    //
    // En octobre, la fuite était dans notre propre base : 40 832 lignes de
    // catalogue lisibles par la clé anonyme. Si le schéma d'une œuvre y
    // vivait, la même erreur de politique exposerait `app_generations`.
    const r = configBaseOeuvres({ ...COMPLET, [NOM_URL_OEUVRES]: URL_DERIBFY })
    expect(r.ok, 'la base de Deribfy est acceptée comme base des œuvres').toBe(false)
    if (!r.ok) {
      expect(r.refus.motif, 'le refus ne nomme pas la cause').toContain('Deribfy')
      // UN REFUS SANS MARCHE À SUIVRE EST UN MUR : la personne qui le lit
      // doit savoir quoi faire, sinon elle contournera.
      expect(r.refus.quoiFaire.length, 'le refus ne dit pas quoi faire')
        .toBeGreaterThan(40)
      expect(r.refus.quoiFaire, 'le refus ne dit pas de n’en désigner aucune')
        .toMatch(/n’en désignez aucun|dédié/u)
    }
  })

  it('③ CE QUI MANQUE EST NOMMÉ, une par une', () => {
    for (const absente of [NOM_URL_OEUVRES, NOM_PUBLIABLE_OEUVRES, NOM_SECRETE_OEUVRES]) {
      const env = { ...COMPLET, [absente]: '' }
      const r = configBaseOeuvres(env)
      expect(r.ok, `${absente} absente est acceptée`).toBe(false)
      if (!r.ok) {
        expect(r.refus.motif, `le refus ne nomme pas ${absente}`).toContain(absente)
      }
    }
    // Et l'absence TOTALE ne plante pas : elle se dit.
    const vide = configBaseOeuvres({})
    expect(vide.ok).toBe(false)
  })

  it('④ UNE URL MAL RECOPIÉE SE DIT AVANT LA PREMIÈRE REQUÊTE', () => {
    for (const mauvaise of [
      'lefumezaxfsttigpmzhr.supabase.co', // sans le protocole
      'https://trop-court.supabase.co',
      'https://abcdefghijklmnopqrst.supabase.io', // mauvais domaine
      'postgres://abcdefghijklmnopqrst.supabase.co',
    ]) {
      const r = configBaseOeuvres({ ...COMPLET, [NOM_URL_OEUVRES]: mauvaise })
      expect(r.ok, `« ${mauvaise} » est acceptée comme URL de projet`).toBe(false)
    }
  })

  it('⑤ AUCUNE VARIABLE DES ŒUVRES N’EST `NEXT_PUBLIC_`', () => {
    // La clé anonyme des œuvres est injectée À L'EXÉCUTION, par œuvre, dans
    // la page publiée. La préfixer `NEXT_PUBLIC_` la cuirait dans le paquet
    // navigateur de Deribfy : une valeur de plateforme figée au build, là où
    // il faut une valeur servie par requête.
    for (const n of [NOM_URL_OEUVRES, NOM_PUBLIABLE_OEUVRES, NOM_SECRETE_OEUVRES]) {
      expect(n, `${n} serait cuite dans le paquet navigateur`).not.toMatch(/^NEXT_PUBLIC_/u)
      // ET LE PRÉFIXE REND LA CONFUSION INÉCRIVABLE : on ne tape pas
      // `OEUVRES_…` en croyant parler de la plateforme.
      expect(n, `${n} ne dit pas de quelle base il parle`).toMatch(/^OEUVRES_/u)
    }
  })

  it('⑥ UN SEUL MODULE LIT CES VARIABLES', () => {
    // Deux lecteurs divergeraient : l'un garderait l'égalité, l'autre non,
    // et c'est le second qui poserait les tables au mauvais endroit. Le
    // dépôt a déjà payé trois copies de la règle de nommage, dont une
    // ignorait les noms réservés.
    const lecteurs = sources().filter((f) => lireSource(f).includes('OEUVRES_SUPABASE'))
    expect(
      lecteurs.map((f) => f.slice(RACINE.length + 1)),
      'une deuxième lecture des variables des œuvres est apparue',
    ).toEqual(['apps/web/src/lib/apps/base-oeuvres.ts'])
  })

  it('⑧ AUCUNE CLÉ N’EST ÉCRITE DANS LE DÉPÔT', () => {
    // ── LA LEÇON, VERBATIM : « un secret périmé qui reste écrit apprend
    // qu'on écrit des secrets. »
    //
    // Le 2026-11-02, une clé anonyme vivait en dur dans
    // `slices/validation-appareil/` — dans le document AIR source ET dans
    // les deux fichiers émis depuis lui. Son commentaire disait « aucun
    // secret ici », ce qui était vrai pour une clé anonyme : elle est
    // publiable par conception.
    //
    // MAIS LE PROJET QU'ELLE DÉSIGNAIT EST DEVENU LA BASE DES ŒUVRES. La
    // même clé donnerait désormais accès aux données des clients. Une clé
    // « sans danger » ne l'est que tant que ce qu'elle ouvre est sans
    // valeur — et ça, ça change sans que la clé bouge.
    //
    // Les aiguilles sont ASSEMBLÉES, jamais écrites en entier : un contrôle
    // qui porte le motif qu'il interdit se déclenche sur lui-même.
    // ── MA PREMIÈRE PORTÉE N'AURAIT PAS ATTRAPÉ LE DÉFAUT RÉEL.
    //
    // Je ne balayais que `apps/web/src`. Or la clé vivait dans `slices/` —
    // le contrôle aurait été vert en laissant la clé exactement là où elle
    // était. Un cliquet qui ne regarde pas l'endroit du défaut ne garde rien.
    //
    // LA BONNE DÉFINITION DE « ÉCRIT DANS LE DÉPÔT » EST : SUIVI PAR GIT.
    // Une clé dans un `.env.local` ignoré est à sa place ; la même dans un
    // fichier suivi part chez tout le monde et reste dans l'historique.
    //
    // ── ET C'EST `git grep` QUI BALAIE, EN UN SEUL PASSAGE.
    //
    // Ma première forme lisait les 1 000+ fichiers suivis en JavaScript :
    // 2 490 ms, refusés par le cliquet de marge. Ma deuxième lançait CINQ
    // `git grep` : 1 102 ms mesurés SEUL — mais 1 771 ms dans la suite
    // complète, et refusés encore.
    //
    // LA LEÇON EST LÀ : une durée mesurée en isolation n'est pas la durée
    // sous charge. Le cliquet mesure au bon endroit, mon essai non.
    //
    // UN SEUL passage, donc, et le TÉMOIN EST DANS LA MÊME ALTERNANCE : un
    // mot banal du dépôt. S'il ne ressort pas, c'est `git grep` qui est
    // cassé, pas le dépôt qui est propre — et on refuse de conclure.
    const TEMOIN = 'createClient'
    const AIGUILLES: readonly (readonly [RegExp, string])[] = [
      [new RegExp('sb_' + 'secret_[A-Za-z0-9_-]{16,}', 'u'), 'clé SECRÈTE du nouveau modèle'],
      [new RegExp('sb_' + 'publishable_[A-Za-z0-9_-]{16,}', 'u'), 'clé publiable du nouveau modèle'],
      [new RegExp('sbp' + '_[A-Za-z0-9]{32,}', 'u'), 'jeton de Management API — crée et DÉTRUIT des projets'],
    ]
    const FORME_JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/u

    const motifs = [TEMOIN, ...AIGUILLES.map(([r]) => r.source), FORME_JWT.source.replace(/[()]/gu, '')]
    let touches: string[] = []
    try {
      touches = execFileSync('git', ['grep', '-I', '-l', '-E', motifs.join('|')], {
        cwd: RACINE,
        maxBuffer: 16 * 1024 * 1024,
      })
        .toString('utf8')
        .split('\n')
        .filter((f2) => f2 !== '')
    } catch {
      touches = [] // `git grep` sort en 1 quand il ne trouve rien
    }
    expect(touches.length, 'git grep ne trouve rien : l’instrument est cassé, pas le dépôt propre')
      .toBeGreaterThan(3)

    const fautifs: string[] = []
    for (const rel of touches) {
      if (rel.endsWith('ep321-base-oeuvres.test.ts')) continue
      const contenu = lireSource(join(RACINE, rel))
      for (const [aiguille, quoi] of AIGUILLES) {
        if (aiguille.test(contenu)) fautifs.push(`${rel} — ${quoi}`)
      }
      // ── UN JWT SE JUGE SUR SA CHARGE, ET C'EST LA SEULE FAÇON JUSTE.
      //
      // Un motif de FORME accusait `gate-backend-vivant.mjs`, qui porte un
      // jeton volontairement MAL SIGNÉ pour prouver qu'un faux est refusé —
      // l'inverse d'un secret. Plutôt qu'une liste d'exemptions, qui aurait
      // fini par exempter un vrai secret un jour de hâte, on DÉCODE : une
      // clé Supabase porte `iss: supabase` et le `ref` du projet.
      for (const m of contenu.matchAll(new RegExp(FORME_JWT.source, 'gu'))) {
        let charge: Record<string, unknown>
        try {
          const b = m[1].replace(/-/gu, '+').replace(/_/gu, '/')
          charge = JSON.parse(Buffer.from(b, 'base64').toString('utf8')) as Record<string, unknown>
        } catch {
          continue
        }
        if (charge.iss === 'supabase' || typeof charge.ref === 'string') {
          fautifs.push(`${rel} — clé de projet Supabase (ref « ${String(charge.ref)} »)`)
        }
      }
    }
    expect(fautifs, 'une clé est écrite dans un fichier SUIVI par Git').toEqual([])
  })

  it('⑦ LE PROVISIONNEMENT EN RÉSERVE EST CONSIGNÉ, PAS OUBLIÉ', () => {
    // `benchmarks/supabase-provisioning/` sait créer un projet par la
    // Management API et a tourné trois fois le 2026-08-28. On ne s'en sert
    // pas — un projet par œuvre ne tient pas en coût — mais une mécanique
    // éprouvée qu'on oublie se redécouvre dans six mois comme une
    // nouveauté, et se réécrit.
    expect(PROVISIONNEMENT_EN_RESERVE).toContain('supabase-provisioning')
    expect(PROVISIONNEMENT_EN_RESERVE, 'la note ne dit pas pourquoi on ne s’en sert pas')
      .toMatch(/ne tient pas en coût/u)
    // ET LE DOSSIER EXISTE TOUJOURS : une note qui désigne un dossier
    // disparu est pire que pas de note.
    const banc = join(RACINE, 'benchmarks', 'supabase-provisioning')
    expect(statSync(banc).isDirectory(), 'le banc de provisionnement a disparu').toBe(true)
    expect(
      readdirSync(join(banc, 'results')).filter((f) => f.startsWith('execution-')).length,
      'les journaux d’exécution du banc ont disparu',
    ).toBeGreaterThanOrEqual(3)
  })
})
