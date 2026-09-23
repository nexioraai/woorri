// ============================================================
// CLIQUET SEO — AUCUNE PAGE N'EMPRUNTE L'IDENTITÉ D'UNE AUTRE.
//
// LE DÉFAUT PAYÉ, mesuré le 2026-09-23 : 21 pages sur 25 n'exportaient aucune
// metadata. Next se rabat alors sur celle du layout racine, et `/privacy`,
// `/cookies` et `/terms` servaient donc à Google LE TITRE ET LA DESCRIPTION DE
// L'ACCUEIL. Trois pages, une seule identité.
//
// CE QUI REND CE DÉFAUT INVISIBLE FICHIER PAR FICHIER : chaque page prise
// séparément est irréprochable — elle n'a simplement rien déclaré. La
// duplication n'existe qu'à l'échelle de l'ENSEMBLE, et c'est donc l'ensemble
// que ce cliquet regarde.
// ============================================================
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGES_PUBLIQUES, SITE_URL, metadataPrivee, metadataPublique, pageMetadata } from '../metadata'

const APP = join(process.cwd(), 'src', 'app')

describe('registre des pages publiques', () => {
  it('aucun TITRE n’est partagé par deux pages', () => {
    const vus = new Map<string, string>()
    for (const [chemin, page] of Object.entries(PAGES_PUBLIQUES)) {
      const precedent = vus.get(page.titre)
      expect(precedent, `« ${page.titre} » est servi par ${precedent} ET ${chemin}`).toBeUndefined()
      vus.set(page.titre, chemin)
    }
  })

  it('aucune DESCRIPTION n’est partagée par deux pages', () => {
    const vus = new Map<string, string>()
    for (const [chemin, page] of Object.entries(PAGES_PUBLIQUES)) {
      const precedent = vus.get(page.description)
      expect(precedent, `description partagée entre ${precedent} et ${chemin}`).toBeUndefined()
      vus.set(page.description, chemin)
    }
  })

  it('chaque titre et chaque description tiennent dans ce que Google affiche', () => {
    for (const [chemin, page] of Object.entries(PAGES_PUBLIQUES)) {
      // ~60 caractères affichés pour un titre, ~160 pour une description. Au
      // delà, Google tronque — et tronque au milieu d'un mot.
      expect(page.titre.length, `${chemin} : titre trop long (${page.titre.length})`).toBeLessThanOrEqual(70)
      expect(page.titre.length, `${chemin} : titre trop court pour dire quoi que ce soit`).toBeGreaterThan(15)
      expect(page.description.length, `${chemin} : description trop longue`).toBeLessThanOrEqual(200)
      expect(page.description.length, `${chemin} : description trop courte`).toBeGreaterThan(70)
    }
  })
})

describe('metadata construite', () => {
  it('toute page publique porte une CANONICAL, et elle pointe la bonne adresse', () => {
    for (const chemin of Object.keys(PAGES_PUBLIQUES) as (keyof typeof PAGES_PUBLIQUES)[]) {
      const m = metadataPublique(chemin)
      const canonical = String(m.alternates?.canonical ?? '')
      expect(canonical, `${chemin} sans canonical`).not.toBe('')
      // La forme canonique servie en production est `www` (vérifié : le domaine
      // nu répond 308 vers elle). Une canonical qui désignerait l'autre forme
      // contredirait la redirection, et Google suit alors la contradiction.
      expect(canonical.startsWith(SITE_URL), `${chemin} : canonical hors du domaine canonique`).toBe(true)
      expect(canonical).not.toMatch(/\/$/u.test(SITE_URL) ? /$^/ : /\/\/$/)
    }
  })

  it('une page publique est INDEXABLE, une page privée ne l’est pas', () => {
    const pub = metadataPublique('/pricing')
    expect((pub.robots as { index?: boolean }).index).toBe(true)

    const priv = metadataPrivee('Tableau de bord — Deribfy', '/dashboard')
    expect((priv.robots as { index?: boolean }).index).toBe(false)
    expect((priv.robots as { follow?: boolean }).follow).toBe(false)
  })

  it('toute page porte une image sociale — jamais un aperçu vide', () => {
    const m = pageMetadata({ titre: 'Titre de contrôle', description: 'x'.repeat(80), chemin: '/x' })
    expect(m.openGraph?.images).toBeDefined()
    expect((m.twitter as { card?: string } | undefined)?.card).toBe('summary_large_image')
  })
})

describe('couverture réelle des routes — aucune page ne reste orpheline', () => {
  /** Toutes les routes `page.tsx` hors sites marchands (périmètre B). */
  const routes = (() => {
    const out: { route: string; fichier: string; dossier: string }[] = []
    const parcourir = (dossier: string, prefixe: string): void => {
      for (const entree of readdirSync(dossier)) {
        const chemin = join(dossier, entree)
        if (entree === 'sites' || entree === 'api' || entree.startsWith('__')) continue
        if (statSync(chemin).isDirectory()) {
          parcourir(chemin, `${prefixe}/${entree}`)
        } else if (entree === 'page.tsx') {
          out.push({ route: prefixe || '/', fichier: chemin, dossier })
        }
      }
    }
    parcourir(APP, '')
    return out
  })()

  it('le dépôt contient bien les routes attendues — sinon ce cliquet ne garde rien', () => {
    expect(routes.length, 'aucune route lue : la lecture a dérivé').toBeGreaterThan(20)
  })

  it('CHAQUE route a une metadata : la sienne, ou celle de son segment', () => {
    const orphelines: string[] = []
    for (const { route, fichier, dossier } of routes) {
      if (route === '/') continue // servie par le layout racine, vérifié plus haut
      const source = readFileSync(fichier, 'utf8')
      const aLaSienne = /export (const metadata|async function generateMetadata|function generateMetadata)/u.test(source)
      // Un layout de SEGMENT couvre la page et toutes ses filles : on remonte.
      //
      // LA RACINE NE COMPTE PAS, et c'est tout l'objet du cliquet : `src/app/
      // layout.tsx` a évidemment une metadata — celle de l'ACCUEIL. En la
      // comptant comme couverture, la remontée trouvait toujours quelque chose
      // et l'assertion ne pouvait plus échouer. (Mesuré : retirer
      // `cookies/layout.tsx` laissait le test vert. Un cliquet qui ne tombe pas
      // ne garde rien.) On s'arrête donc STRICTEMENT au-dessus de la racine.
      let couvertParSegment = false
      let courant = dossier
      for (let i = 0; i < 6 && courant !== APP && courant.startsWith(APP); i += 1) {
        try {
          const layout = readFileSync(join(courant, 'layout.tsx'), 'utf8')
          if (/export const metadata|generateMetadata/u.test(layout)) {
            couvertParSegment = true
            break
          }
        } catch {
          /* pas de layout à ce niveau : on continue de remonter */
        }
        courant = join(courant, '..')
      }
      if (!aLaSienne && !couvertParSegment) orphelines.push(route)
    }
    expect(
      orphelines,
      'ces routes servent la metadata de l’ACCUEIL — c’est le défaut d’origine',
    ).toEqual([])
  })
})
