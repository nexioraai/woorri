/**
 * CLIQUET — PAR OÙ L'APERÇU POURRAIT RECASSER. 2026-11-15.
 *
 * Le défaut fermé : l'aperçu d'un site non publié menait à des 404 (menu
 * vers /sites/<slug>/…, lu par le serveur en ANONYME). La correction tient
 * à une règle : toute lecture SERVEUR d'une vue publique passe par le lecteur
 * de la requête (`lecteurDuSite` / `lireSite`). Une nouvelle page qui lirait
 * avec le client anonyme partagé ne casserait aucun test fonctionnel — elle
 * rendrait juste un 404 dans l'aperçu. Ce fichier la fait échouer ICI.
 *
 * Ce que ce cliquet NE voit PAS : le rendu à l'écran (sonde séparée) ni ce que
 * la base laisse passer (SQL prouvé sur Postgres, mesuré en anonyme).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_EMAILS } from '../admin-emails'

const RACINE = process.cwd()
const SITES = join(RACINE, 'src', 'app', 'sites', '[slug]')

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : fichiers(p)
    return /\.(ts|tsx)$/.test(n) ? [p] : []
  })
}
const estClient = (s: string) => /^\s*(['"])use client\1/m.test(s.split('\n').slice(0, 5).join('\n'))
const VUES = /\b(sites|site_pages|site_blog_posts|catalogue_produits|appels_offres)_public\b/

describe('aucune lecture serveur d’une vue publique sans le lecteur de la requête', () => {
  const serveur = fichiers(SITES)
    .map((p) => ({ p, rel: relative(RACINE, p), s: readFileSync(p, 'utf8') }))
    .filter((f) => !estClient(f.s))

  it('aucun module serveur de /sites/[slug] n’importe le client anonyme partagé pour lire une vue publique', () => {
    const fautifs = serveur
      .filter((f) => !f.rel.endsWith('themes/shared.tsx')) // bi-environnement : traité à part ci-dessous
      .filter((f) => /import \{[^}]*\bsupabase\b[^}]*\} from '@\/lib\/supabase'/.test(f.s) && VUES.test(f.s))
      .map((f) => f.rel)
    expect(fautifs).toEqual([])
  })

  it('shared.tsx : fetchSite et ses chargeurs lisent par le client QU’ON LEUR PASSE', () => {
    const s = readFileSync(join(SITES, 'themes', 'shared.tsx'), 'utf8')
    const corps = (nom: string) => {
      const i = s.indexOf(`async function ${nom}(`)
      expect(i, nom).toBeGreaterThan(-1)
      return s.slice(i, s.indexOf('\n}\n', i))
    }
    for (const nom of ['fetchSite', 'loadCatalogSelections', 'loadPodBrandCatalogPrices']) {
      const c = corps(nom)
      expect(c, nom).toMatch(/db:\s*SupabaseClient\s*=\s*supabase/)
      expect(c, nom).not.toMatch(/await\s+supabase\b/)
    }
  })

  it('les pages serveur lisent le site par lireSite(), jamais par fetchSite() directement', () => {
    const directs = serveur
      .filter((f) => !/themes\/(shared\.tsx|lireSite\.ts)$/.test(f.rel))
      .filter((f) => /\bfetchSite\(/.test(f.s))
      .map((f) => f.rel)
    expect(directs).toEqual([])
  })
})

describe('/preview/<slug> n’est plus une copie du site', () => {
  const s = readFileSync(join(RACINE, 'src', 'app', 'preview', '[slug]', 'page.tsx'), 'utf8')
  it('n’importe aucun thème ni aucun lecteur de données : il pose le cookie et ouvre /sites/<slug>', () => {
    expect(s).not.toMatch(/from '@\/app\/sites\/\[slug\]\//)
    expect(s).toMatch(/poserCookieApercu/)
    expect(s).toMatch(/window\.location\.replace/)
  })
})

describe('la liste des administrateurs écrite dans le SQL est celle du code', () => {
  it('sites_public_apercu_admin.sql porte exactement ADMIN_EMAILS', () => {
    const sql = readFileSync(join(RACINE, 'supabase', 'sql', 'sites_public_apercu_admin.sql'), 'utf8')
    const m = sql.match(/any \(array\[([^\]]*)\]\)/)
    expect(m, 'liste introuvable dans le SQL').not.toBeNull()
    const dansLeSql = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort()
    expect(dansLeSql).toEqual([...ADMIN_EMAILS].map((e) => e.toLowerCase()).sort())
  })
})
