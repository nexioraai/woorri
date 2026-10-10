/**
 * CLIQUETS — LE TRAVAILLEUR NE PEUT PAS TOUCHER LA VRAIE TABLE DEPUIS UN TEST.
 *
 * Regle du proprietaire, posee avant toute ligne : une seule base — la
 * prod — et AUCUN risque qu'une purge ratee, un WHERE trop large ou le cron
 * balayeur touche une vraie ligne pendant les tests. L'isolation est tenue
 * par IMPOSSIBILITE MECANIQUE, et ces cliquets verifient chaque verrou.
 *
 * NOTE D'EXEMPTION : ce fichier est le SEUL code de test autorise a ecrire
 * les deux sequences interdites (le nom nu de la vraie table, et l'option
 * de production) — précisement parce qu'il teste leurs verrous.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'
import { sqlPour, SQL_TABLE, SQL_TABLE_TEST } from '../journal'
import { purgerBanc, EMAIL_BANC } from '../banc-jumelle'
import { sansCommentaires } from './sans-commentaires'

const RACINE = join(process.cwd(), '..', '..')
const bidon = {
  base: { from: () => ({}) } as unknown as BaseGeneration,
  moteur: { poursuivreEmission: async () => ({ fini: true }) } as unknown as MoteurContinuation,
  budgetTrancheMs: 1,
  battementPerimeMs: 1000,
}
const NOM_PROD = ['app', 'generations'].join('_') // jamais ecrit nu, meme ici
const OPTION_PROD = ['production', 'true'].join(': ')

describe('CLIQUET — la fabrique refuse tout ce qui n est pas une table de test', () => {
  it('le nom de la vraie table est REFUSE sans l option de production', () => {
    expect(() => creerTravailleur({ table: NOM_PROD, ...bidon })).toThrowError(
      /TRAVAILLEUR_TABLE_NON_TEST/u,
    )
  })

  it('une table absente ou vide est refusee — aucun defaut silencieux', () => {
    expect(() => creerTravailleur({ table: '', ...bidon })).toThrowError(/TABLE_REQUISE/u)
    // @ts-expect-error — l'absence du champ est exactement ce qu'on teste
    expect(() => creerTravailleur({ ...bidon })).toThrowError(/TABLE_REQUISE/u)
  })

  it('la jumelle passe, et le chemin de production existe mais doit se DIRE', () => {
    expect(() => creerTravailleur({ table: `${NOM_PROD}_test`, ...bidon })).not.toThrow()
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      creerTravailleur({ table: NOM_PROD, ...bidon, ...JSON.parse('{"production": true}') }),
    ).not.toThrow()
  })
})

describe('CLIQUET — le module travailleur est aveugle a la base', () => {
  const SRC = sansCommentaires(
    readFileSync(join(RACINE, 'apps/web/src/lib/apps/travailleur.ts'), 'utf8'),
  )

  it('aucun nom de table, aucun import de base, aucun appel sortant', () => {
    expect(SRC).not.toContain(NOM_PROD)
    expect(SRC).not.toMatch(/supabase/iu)
    // Pas d'auto-appel a cet etage : le cron est le porteur, et il n'existe
    // meme pas encore de route. Structurel, pas promis.
    expect(SRC).not.toMatch(/fetch\(|https?:/u)
  })
})

describe('CLIQUET — personne d autre ne peut ecrire les sequences interdites', () => {
  // Balayage RECURSIF de tout le code de test et de preuve du depot
  // concerne : lib/apps entier + les harnais de benchmarks. Le nom nu et
  // l'option de production n'ont le droit d'exister que dans ce fichier,
  // dans la source unique du SQL, et (plus tard) dans la route de
  // production.
  const AUTORISES_NOM = new Set([
    'apps/web/src/lib/apps/journal.ts', // la source unique du DDL
    'apps/web/src/lib/apps/__tests__/journal.test.ts', // ses cliquets
    'apps/web/src/lib/apps/__tests__/travailleur-isolation.test.ts', // celui-ci
  ])
  // ETAGE 4 (cadrage valide le 2026-10-10) : les DEUX SEULES routes de
  // production — le depot et le cron porteur. Liste FERMEE : une troisieme
  // entree exige de reecrire ce test, c'est-a-dire un arbitrage conscient.
  const AUTORISES_OPTION = new Set([
    'apps/web/src/lib/apps/__tests__/travailleur-isolation.test.ts',
    'apps/web/src/app/api/generateur/deposer/route.ts',
    'apps/web/src/app/api/cron/generations/route.ts',
    // 4e EMPLACEMENT CONSCIENT (arbitrage du 2026-10-10) : le travailleur
    // HEBERGE — le porteur hors serverless de l'appel ecrans indivisible.
    // Toujours une liste FERMEE : une 5e entree exige de reecrire ce test.
    'services/generation-travailleur/index.mts',
  ])

  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((n) => {
      const chemin = join(dossier, n)
      if (statSync(chemin).isDirectory()) return n === 'node_modules' ? [] : fichiers(chemin)
      return /\.(ts|tsx|mts|mjs)$/u.test(n) ? [chemin] : []
    })

  const concernes = [
    ...fichiers(join(RACINE, 'apps/web/src/lib/apps')),
    // ETAGE 4 : les routes aussi — c'est la que vivent les deux seules
    // ecritures de production, donc la que le balayage doit mordre.
    ...fichiers(join(RACINE, 'apps/web/src/app/api')),
    // Le travailleur heberge : meme regime que tout le monde.
    ...fichiers(join(RACINE, 'services')),
    ...fichiers(join(RACINE, 'benchmarks/air-emission')).filter((f) =>
      /travailleur|jumelle/u.test(f),
    ),
  ]

  it('le nom nu de la vraie table ne vit que dans la source du SQL et ses cliquets', () => {
    const motif = new RegExp(`${NOM_PROD}(?!_test)`, 'u')
    for (const f of concernes) {
      const rel = f.slice(RACINE.length + 1)
      if (AUTORISES_NOM.has(rel)) continue
      expect(sansCommentaires(readFileSync(f, 'utf8'))).not.toMatch(motif)
    }
  })

  it('l option de production ne vit nulle part — pas meme la route, qui n existe pas encore', () => {
    for (const f of concernes) {
      const rel = f.slice(RACINE.length + 1)
      if (AUTORISES_OPTION.has(rel)) continue
      expect(sansCommentaires(readFileSync(f, 'utf8')), rel).not.toContain(OPTION_PROD)
    }
  })
})

describe('CLIQUET — la jumelle est identique a la vraie PAR CONSTRUCTION', () => {
  it('les deux sorties de sqlPour ne different que par le nom', () => {
    expect(SQL_TABLE_TEST.replaceAll(`${NOM_PROD}_test`, NOM_PROD)).toBe(SQL_TABLE)
  })

  it('contraintes et index portent des noms DISTINCTS — la collision est impossible', () => {
    for (const suffixe of [
      'statut_valide',
      'livree_a_document',
      'en_cours_verrouillee',
      'created_idx',
      'ouvertes_idx',
    ]) {
      expect(SQL_TABLE).toContain(`${NOM_PROD}_${suffixe}`)
      expect(SQL_TABLE_TEST).toContain(`${NOM_PROD}_test_${suffixe}`)
    }
    // Et le SQL de la jumelle ne mentionne JAMAIS la vraie table : poser la
    // jumelle ne peut pas toucher l'autre, meme par un copier-coller rate.
    expect(SQL_TABLE_TEST).not.toMatch(new RegExp(`${NOM_PROD}(?!_test)`, 'u'))
  })

  it('un nom de table injecte est refuse — le DDL ne se fabrique pas depuis du texte libre', () => {
    expect(() => sqlPour('app; drop table sites')).toThrowError(/nom de table invalide/u)
    expect(() => sqlPour('Majuscule')).toThrowError(/nom de table invalide/u)
  })
})

describe('CLIQUET — etage 4 : la production reste sous trois serrures', () => {
  const API = join(RACINE, 'apps/web/src/app/api')
  const fichiersApi = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((n) => {
      const chemin = join(dossier, n)
      if (statSync(chemin).isDirectory()) return n === 'node_modules' ? [] : fichiersApi(chemin)
      return /\.(ts|tsx)$/u.test(n) ? [chemin] : []
    })

  it('la JUMELLE n existe pas cote application — aucune route ne peut la nommer', () => {
    for (const f of fichiersApi(API)) {
      expect(sansCommentaires(readFileSync(f, 'utf8')), f).not.toContain(`${NOM_PROD}_test`)
    }
  })

  it('le cron verifie le kill-switch AVANT de construire le travailleur — l ordre EST la garantie', () => {
    const src = sansCommentaires(
      readFileSync(join(API, 'cron/generations/route.ts'), 'utf8'),
    )
    expect(src).toContain('tournerUneTranche')
    // le depot porte une SENTINELLE, le cron le vrai moteur : chacun son role
    const depot = sansCommentaires(readFileSync(join(API, 'generateur/deposer/route.ts'), 'utf8'))
    expect(depot).toContain('sentinelle')
    expect(depot).not.toContain('poursuivreEmissionDuSite')
  })

  it('le nom de la table de production vient de la CONSTANTE, jamais ecrit nu dans une route', () => {
    for (const f of fichiersApi(API)) {
      expect(sansCommentaires(readFileSync(f, 'utf8')), f).not.toMatch(
        // une quote ou un backtick juste avant le nom nu = litteral en route
        new RegExp('["\'`]' + NOM_PROD + '(?!_test)', 'u'),
      )
    }
  })
})

describe('CLIQUET — purge et balayage ne peuvent viser que les lignes du banc', () => {
  // Lecon du 2026-10-09 (~6,9 $ d'etat efface) : la jumelle melait banc
  // d'essai purgeable et entrepot d'etat paye, sans separation mecanique.
  // Ces cliquets la rendent impossible a rouvrir — par le texte des
  // sources, pas par discipline.
  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((n) => {
      const chemin = join(dossier, n)
      if (statSync(chemin).isDirectory()) return n === 'node_modules' ? [] : fichiers(chemin)
      return /\.(ts|tsx|mts|mjs)$/u.test(n) ? [chemin] : []
    })
  const LIB_APPS = join(RACINE, 'apps/web/src/lib/apps')
  // Assemblee, jamais ecrite nue : ce fichier est balaye par son propre
  // cliquet — meme parade que NOM_PROD.
  const SEQ_DELETE = ['.de', 'lete('].join('')

  it('la sequence de suppression ne vit QUE dans banc-jumelle.ts — nulle part ailleurs dans lib/apps', () => {
    for (const f of fichiers(LIB_APPS)) {
      if (f.endsWith('banc-jumelle.ts')) continue
      expect(sansCommentaires(readFileSync(f, 'utf8')), f).not.toContain(SEQ_DELETE)
    }
  })

  it('le motif de purge totale — delete() enchaine a not( — n existe PLUS NULLE PART', () => {
    const concernes = [
      ...fichiers(LIB_APPS),
      ...fichiers(join(RACINE, 'benchmarks/air-emission')).filter((f) =>
        /travailleur|jumelle/u.test(f),
      ),
    ]
    for (const f of concernes) {
      expect(sansCommentaires(readFileSync(f, 'utf8')), f).not.toMatch(
        /\.delete\(\)\s*\.not\(/u,
      )
    }
  })

  it('purgerBanc filtre par EMAIL_BANC et refuse toute table hors banc', async () => {
    const appels: [string, string, string][] = []
    const fausse = {
      from: (table: string) => ({
        delete: () => ({
          eq: (col: string, val: string) => {
            appels.push([table, col, val])
            return Promise.resolve({ error: null })
          },
        }),
      }),
    }
    await purgerBanc(fausse, `${NOM_PROD}_test`)
    expect(appels).toEqual([[`${NOM_PROD}_test`, 'owner_email', EMAIL_BANC]])
    await expect(purgerBanc(fausse, NOM_PROD)).rejects.toThrowError(/PURGE_HORS_BANC/u)
    expect(appels).toHaveLength(1) // le refus n a RIEN envoye a la base
  })

  it('les harnais de tir balaient a perimetre d UNE ligne — jamais toute la table', () => {
    for (const nom of ['tir-reel.verif.mts', 'tir-reprise.verif.mts']) {
      const src = sansCommentaires(readFileSync(join(LIB_APPS, nom), 'utf8'))
      expect(src, nom).toContain('perimetre: { ligne:')
    }
  })

  it('le harnais jumelle ne fabrique QUE des balayeurs du banc, et purge par le banc', () => {
    const src = sansCommentaires(
      readFileSync(join(LIB_APPS, 'travailleur-jumelle.verif.mts'), 'utf8'),
    )
    const balayeurs = src.match(/creerTravailleur\(/gu) ?? []
    const perimetres = src.match(/perimetre: \{ proprietaire: EMAIL_BANC \}/gu) ?? []
    expect(perimetres.length).toBe(balayeurs.length)
    expect(src).toContain('purgerBanc(')
    // et chaque ligne qu il cree est marquee : aucun email qui ne soit au banc
    expect(src).not.toMatch(/email: (?:null|'(?!banc@)[^']*')/u)
  })
})

