// ============================================================
// CLIQUET — AUCUNE PAGE PUBLIQUE N'EST ABSENTE DU PLAN DE SITE.
//
// MESURÉ LE 2026-09-25, sur le sitemap réellement servi par la plateforme :
//
//     pages Deribfy listées : /, /about, /pricing  (+ 2 articles de blog)
//     pages Deribfy vivantes : les huit du registre `PAGES_PUBLIQUES`
//
// `/blog`, `/visibilite-ia`, `/cookies`, `/privacy` et `/terms` répondaient
// 200, avaient chacune un titre et une description propres — et n'étaient
// dans AUCUN plan de site. Un moteur les trouve alors seulement par les liens
// internes, quand il en trouve.
//
// ── LA CAUSE N'EST PAS L'OUBLI, C'EST LA DUPLICATION.
//
// Le plan de site tenait sa PROPRE liste, écrite à la main, à côté d'un
// registre qui existait déjà et qui faisait autorité pour les titres. Deux
// listes des mêmes pages divergent toujours ; celle qui diverge en silence
// est celle que personne ne relit. Le registre est désormais l'unique source,
// et ce cliquet le vérifie.
//
// Il garde AUSSI la propriété inverse : rien ne doit entrer dans le plan de
// site sans passer par le registre — sinon une page reparaîtrait sans titre
// propre, et les titres dupliqués reviendraient par la porte de derrière.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGES_PUBLIQUES } from '@/lib/seo/metadata'

const SOURCE = readFileSync(join(process.cwd(), 'src', 'app', 'sitemap.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//gu, '')
  .replace(/^[ \t]*\/\/.*$/gmu, '')

describe('le plan de site découle du registre des pages publiques', () => {
  it('le registre porte bien les pages qu’on croit — sinon ce cliquet ne garde rien', () => {
    const chemins = Object.keys(PAGES_PUBLIQUES)
    expect(chemins.length, 'registre suspect').toBeGreaterThanOrEqual(8)
    for (const attendu of ['/', '/about', '/pricing', '/blog', '/cookies', '/privacy', '/terms']) {
      expect(chemins, `${attendu} a disparu du registre`).toContain(attendu)
    }
  })

  it('le plan de site PARCOURT le registre au lieu de recopier une liste', () => {
    // LE CŒUR DE LA CORRECTION. Tant que le plan de site tenait sa propre
    // liste, toute page ajoutée ailleurs en restait dehors — et personne ne
    // le voyait, puisque la page, elle, répondait 200.
    expect(
      SOURCE.includes('PAGES_PUBLIQUES'),
      'le plan de site n’utilise pas le registre : sa liste va redivergerarbitrairement',
    ).toBe(true)
    expect(
      /Object\.keys\(PAGES_PUBLIQUES\)/u.test(SOURCE),
      'le registre est importé mais pas parcouru',
    ).toBe(true)
  })

  it('AUCUN chemin de page publique n’est écrit en dur à côté du registre', () => {
    // La moitié qui empêche la rechute : réintroduire `${SITE_URL}/about` en
    // dur ferait cohabiter les deux mécanismes, et la liste manuelle
    // finirait par reprendre le dessus.
    const enDur = Object.keys(PAGES_PUBLIQUES)
      .filter((c) => c !== '/')
      .filter((c) => SOURCE.includes(`SITE_URL}${c}\``))
    expect(
      enDur,
      `chemin(s) recopié(s) à la main alors que le registre les porte : ${enDur.join(', ')}`,
    ).toEqual([])
  })

  it('la racine ne produit pas une URL à double barre oblique', () => {
    // `${SITE_URL}/` donnerait `https://www.deribfy.com//` — une URL
    // différente de la page d'accueil aux yeux d'un moteur.
    expect(/chemin === '\/' \? SITE_URL/u.test(SOURCE), 'la racine n’est pas traitée à part').toBe(true)
  })
})
