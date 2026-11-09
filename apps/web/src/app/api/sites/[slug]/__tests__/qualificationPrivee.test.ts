import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================
// LOT 12.3 — UN FOURNISSEUR NE VOIT PAS LA QUALIFICATION D'UN AUTRE.
//
// L'EXIGENCE VIENT DU PROPRIÉTAIRE, 2026-11-09 : « je pense que les
// fournisseurs ne devraient pas vu par d'autres fournisseurs, si c
// prequalifié ou qualifié ou rejeté ».
//
// ── CE QUE CE CLIQUET TIENT, ET POURQUOI IL NE SE DEVINE PAS.
//
// La confidentialité ne tient pas à une ligne de code : elle tient à ce
// qu'AUCUNE route ne rende la qualification sans filtrer par personne, et à
// ce qu'AUCUNE surface publique ne la projette. Les deux se vérifient en
// ÉNUMÉRANT, jamais en se rappelant.
//
// ── IL LIT LE SOURCE, ET C'EST ASSUMÉ.
//
// Une fuite de confidentialité ne se voit pas à l'exécution d'un test
// heureux : elle se voit quand quelqu'un ajoute, dans six mois, une route
// qui projette `qualification` sans `eq('user_id', …)`. C'est ce fichier
// qui rougira ce jour-là.
// ============================================================

const SRC = join(__dirname, '..', '..', '..', '..', '..')

// ON NE BALAIE QUE LES SURFACES QUI PEUVENT PROJETER : les routes, les
// pages de site, les gardes. Balayer `src` en entier ferait d'un cliquet
// un test qu'on finit par ne plus relancer.
const DOSSIERS = [join(SRC, 'app', 'api'), join(SRC, 'app', 'sites'), join(SRC, 'lib', 'auth')]
const SQL_DIR = join(SRC, '..', 'supabase', 'sql')

const fichiers = (d: string, out: string[] = []): string[] => {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules' || n === '__tests__' || n.startsWith('.')) continue
    const p = join(d, n)
    if (statSync(p).isDirectory()) fichiers(p, out)
    else if (/\.tsx?$/u.test(n)) out.push(p)
  }
  return out
}

const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')

/**
 * Les fichiers qui TOUCHENT la qualification des comptes.
 *
 * PREMIER JET AVEUGLE : il cherchait `select('…qualification…')`. Les routes
 * de ce dépôt passent une CONSTANTE à `select(VU)` — le motif ne trouvait
 * rien, le dénominateur valait zéro, et les deux contrôles suivants étaient
 * verts par vacuité. C'est le garde-fou de dénominateur qui l'a dit.
 *
 * Le critère est donc le SUJET, pas la syntaxe : un fichier qui parle de
 * `site_comptes` ET de `qualification` est une surface à garder, quelle que
 * soit la façon dont il écrit sa projection.
 */
const projettent = DOSSIERS.flatMap((d) => fichiers(d))
  .map((p) => ({ p, src: sansCommentaires(readFileSync(p, 'utf-8')) }))
  .filter(({ src }) => src.includes('site_comptes') && src.includes('qualification'))

const rel = (p: string) => p.slice(p.indexOf('/src/') + 1)

describe('la qualification ne sort jamais sans garde', () => {
  it('🔴 au moins une surface la projette — sinon ce cliquet ne mesure RIEN', () => {
    // Un dénominateur vide rendrait tous les contrôles suivants verts par
    // vacuité. C'est le piège que `avisPublic` a appris à ce dépôt.
    expect(projettent.length, 'aucun fichier ne projette la qualification').toBeGreaterThan(0)
  })

  it('🔴 CHAQUE fichier qui la projette filtre par PERSONNE ou exige le PROPRIÉTAIRE', () => {
    for (const { p, src } of projettent) {
      const parPersonne = /eq\(\s*['"]user_id['"]/u.test(src)
      const parProprietaire = /requireSiteOwner/u.test(src)
      expect(parPersonne || parProprietaire, `${rel(p)} projette la qualification sans garde`).toBe(true)
    }
  })

  it('🔴 aucune surface PUBLIQUE ne la projette', () => {
    // `sites_public`, `site_pages_public`, `appels_offres_public` : les vues
    // que n'importe qui peut lire. Y joindre la qualification la rendrait
    // visible de tous les fournisseurs à la fois.
    for (const { p, src } of projettent) {
      // On regarde la LECTURE DES COMPTES elle-même : `from('site_comptes')`
      // est la bonne ancre, et aucune vue publique ne porte ce nom.
      const d = src.indexOf("from('site_comptes')")
      expect(d, `${rel(p)} parle des comptes sans les lire`).toBeGreaterThan(-1)
      expect(src, `${rel(p)} lit les comptes depuis une vue PUBLIQUE`)
        .not.toMatch(/from\(\s*['"]site_comptes_public['"]/u)
    }
  })
})

describe('le vocabulaire est fermé, et `non_examinee` en fait partie', () => {
  const SQL = readFileSync(join(SQL_DIR, 'site_comptes_qualification.sql'), 'utf-8')

  it('🔴 les QUATRE mots sont dans la contrainte', () => {
    // Sans `non_examinee`, un inscrit du jour afficherait « rejeté » — un
    // mensonge — ou « qualifié », pire encore.
    const d = SQL.indexOf('site_comptes_qualification_chk')
    expect(d).toBeGreaterThan(-1)
    const bloc = SQL.slice(d, d + 400)
    for (const mot of ['non_examinee', 'prequalifie', 'qualifie', 'rejete']) {
      expect(bloc, `« ${mot} » absent de la contrainte`).toContain(mot)
    }
  })

  it('🔴 le défaut est `non_examinee`, jamais un verdict', () => {
    expect(SQL).toMatch(/qualification\s+text\s+not\s+null\s+default\s+'non_examinee'/u)
  })

  it('🔴 la DATE n’a aucun défaut — elle n’existe qu’après un examen', () => {
    // Une date posée par défaut raconterait un examen qui n'a pas eu lieu.
    expect(SQL).toMatch(/qualification_le\s+timestamptz\s*;/u)
  })
})
