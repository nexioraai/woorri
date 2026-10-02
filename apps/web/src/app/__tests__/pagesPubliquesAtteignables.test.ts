// ============================================================
// CLIQUET — AUCUNE PAGE PUBLIQUE NE REDEVIENT ORPHELINE.
//
// LE DÉFAUT MESURÉ EN PRODUCTION, le 2026-10-02. Search Console, sur
// `https://www.deribfy.com/blog` :
//
//     Page indexing  : Page is not indexed: URL is unknown to Google
//     Sitemaps       : No referring sitemaps detected
//     Referring page : None detected
//
// Les pages existaient. Le sitemap les listait — 214 URLs. `robots.txt` le
// référençait. Et pourtant Google ne les connaissait pas : RIEN NE MENAIT À
// ELLES. La page d'accueil rend `Sidebar` (qui ne mène qu'à `/`, `/admin`,
// `/parametres`) et jamais `Navbar` ; elle ne liait donc vers aucune page
// publique.
//
// CE QUE ÇA COÛTAIT, ET C'EST TOUT LE SUJET : un sitemap ANNONCE des pages,
// ce sont les LIENS qui les font découvrir et qui leur transmettent de
// l'autorité. Sans eux, Google n'avait qu'une seule page à montrer pour la
// marque — d'où des résultats où l'accueil se répétait, et aucun lien de
// section possible.
//
// CE QUE CE TEST REGARDE : le pied de page, parce qu'il est rendu par TOUTES
// les pages publiques, y compris l'accueil depuis ce jour. Il vérifie aussi
// que l'accueil le rend réellement — c'est la page vers laquelle pointe tout
// lien externe, donc celle d'où la découverte doit partir.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGES_PUBLIQUES } from '@/lib/seo/metadata'

const SRC = join(process.cwd(), 'src')
const FOOTER = readFileSync(join(SRC, 'components', 'Footer.tsx'), 'utf8')
const ACCUEIL = readFileSync(join(SRC, 'app', 'page.tsx'), 'utf8')

/** Pages publiques qui doivent être ATTEIGNABLES par un lien. L'accueil est
 *  la source des liens, pas une destination à lister. */
const A_RELIER = Object.keys(PAGES_PUBLIQUES).filter((c) => c !== '/')

describe('les pages publiques sont atteignables par un lien', () => {
  it('l’accueil rend le pied de page — sinon elle ne mène nulle part', () => {
    expect(ACCUEIL).toContain('<Footer />')
    expect(ACCUEIL).toContain("from '@/components/Footer'")
  })

  it.each(A_RELIER)('le pied de page mène à %s', (chemin) => {
    expect(FOOTER).toContain(`href="${chemin}"`)
  })

  it('la documentation y figure aussi — elle n’est pas dans le registre des pages publiques', () => {
    expect(FOOTER).toContain('href="/documentation"')
  })

  it('aucun lien du pied de page ne mène vers une page tenue hors index', () => {
    const horsIndex = ['/login', '/dashboard', '/parametres', '/admin', '/reset-password']
    for (const chemin of horsIndex) {
      expect(FOOTER).not.toContain(`href="${chemin}"`)
    }
  })
})
