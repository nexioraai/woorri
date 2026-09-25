// ============================================================
// CLIQUET — LE LOGO VAUT POUR TOUS LES MODES, ET IL ARRIVE VITE.
//
// Trois défauts trouvés en vérifiant pourquoi Google n'affichait pas le logo
// de `chanorfie.com` alors que le site, lui, le montrait bien.
//
// ── 1. LE CACHE A GARDÉ L'ANCIENNE ICÔNE VINGT-QUATRE HEURES.
//
// MESURÉ le 2026-09-24, après le dépôt d'un vrai logo :
//     /favicon.ico                 -> monogramme (écart-type 10,9 = aplat)
//     /favicon.ico?<autre requête> -> LE LOGO     (écart-type 34,3 = détaillé)
// Les deux frappaient la même route ; seule la seconde avait une clé de cache
// neuve. L'URL canonique — celle que Google demande — servait l'icône d'avant.
// J'avais écrit « un cache long est correct » en supposant qu'une marque ne
// change pas. Vrai dans la durée, FAUX à la minute qui compte.
//
// ── 2. LE MANIFESTE DU MARCHAND RÉPONDAIT UNE PAGE D'ERREUR.
//
//     curl https://chanorfie.com/manifest.webmanifest  ->  __next_error__
// « Ajouter à l'écran d'accueil » n'avait ni nom ni icône à lire. Et s'il
// avait répondu, il aurait installé la boutique sous l'enseigne de Deribfy.
//
// ── 3. RIEN NE GARANTISSAIT QUE ÇA VALE POUR TOUS LES MODES.
//
// Exigence posée explicitement par le propriétaire : « tous les changements
// doivent concerner TOUS les modes, quels que soient le mode et la position
// géographique ». C'était déjà vrai — par construction, pas par décision.
// Une vérité par construction se perd au premier `if` ajouté sans y penser.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { empreinteDuLogo } from '../favicon'

const RACINE = process.cwd()
const lire = (...p: string[]) =>
  readFileSync(join(RACINE, 'src', ...p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')

describe('le logo ne dépend NI du mode NI du pays', () => {
  it('la route d’icône ne lit jamais le mode ni le pays', () => {
    // Elle lit `sites_public`, qui ne filtre que sur « publié et non
    // archivé ». Un site vitrine (mode 1) a droit à son logo autant qu'une
    // boutique — c'est souvent la SEULE image qu'il possède.
    const route = lire('app', 'api', 'internal', 'site-icon', '[slug]', 'route.ts')
    expect(/\bmode\b/u.test(route), 'la route d’icône regarde le mode').toBe(false)
    expect(/\bcountry\b|\bpays\b|\blocale\b/u.test(route), 'la route d’icône regarde le pays').toBe(false)
  })

  it('le manifeste non plus', () => {
    const route = lire('app', 'api', 'internal', 'site-manifest', '[slug]', 'route.ts')
    expect(/\bmode\b/u.test(route), 'le manifeste regarde le mode').toBe(false)
  })

  it('le dépôt du logo dans Edit n’est derrière AUCUNE condition de mode', () => {
    // Le formulaire conditionne déjà plusieurs blocs (`mode === 2 || mode === 3`
    // pour les produits, les paiements, les commandes). Le logo ne doit jamais
    // rejoindre cette liste : c'est de la MARQUE, et tout site en a une.
    const edit = lire('app', 'edit', '[slug]', 'page.tsx')
    const i = edit.indexOf('Logo de la boutique')
    expect(i, 'le bloc logo est introuvable').toBeGreaterThan(-1)
    const amont = edit.slice(Math.max(0, i - 700), i)
    expect(
      /mode\s*===\s*\d/u.test(amont),
      'le bloc logo est passé derrière une condition de mode — les sites ' +
        'vitrine (mode 1) ne pourraient plus déposer leur logo',
    ).toBe(false)
  })

  it('l’enseigne des vitrines ne se cache pas selon le mode', () => {
    const enseigne = lire('app', 'sites', '[slug]', 'themes', 'EnseigneDuSite.tsx')
    expect(/\bmode\b/u.test(enseigne), 'l’enseigne regarde le mode').toBe(false)
  })
})

describe('un logo déposé doit se voir en MINUTES, pas en jours', () => {
  const ROUTE = lire('app', 'api', 'internal', 'site-icon', '[slug]', 'route.ts')

  it('le cache partagé de l’icône ne dépasse pas dix minutes', () => {
    // LE DÉFAUT EXACT QU'ON EMPÊCHE : avec `s-maxage=86400`, le marchand
    // déposait son logo, enregistrait, regardait son onglet — et voyait
    // l'ancien. Il en concluait que ça ne marchait pas, et il avait raison.
    const m = /s-maxage=(\d+)/u.exec(ROUTE)
    expect(m, 'aucun `s-maxage` : le cache du CDN devient imprévisible').not.toBeNull()
    expect(
      Number(m![1]),
      `s-maxage=${m![1]} s — un logo déposé mettrait ${String(Math.round(Number(m![1]) / 3600))} h à apparaître`,
    ).toBeLessThanOrEqual(600)
  })

  it('`stale-while-revalidate` reste là — personne ne doit ATTENDRE une icône', () => {
    // La moitié qui empêche de « corriger » en supprimant le cache : sans
    // elle, raccourcir le délai ferait payer un aller-retour à des visiteurs.
    expect(/stale-while-revalidate=\d+/u.test(ROUTE)).toBe(true)
  })
})

describe('l’empreinte du logo — l’URL change quand, et seulement quand, le logo change', () => {
  it('deux logos différents donnent deux empreintes différentes', () => {
    expect(empreinteDuLogo('https://x/logo-1790295325490.jpg'))
      .not.toBe(empreinteDuLogo('https://x/logo-1790295399999.jpg'))
  })

  it('le MÊME logo donne toujours la même — les moteurs veulent une URL stable', () => {
    const u = 'https://x/logo-1790295325490.jpg'
    expect(empreinteDuLogo(u)).toBe(empreinteDuLogo(u))
  })

  it('sans logo, une valeur fixe — rien ne bouge tant que rien ne bouge', () => {
    expect(empreinteDuLogo(null)).toBe('mono')
    expect(empreinteDuLogo(undefined)).toBe('mono')
  })

  it('elle est définie UNE seule fois dans tout le dépôt', () => {
    // Les balises d'icône et le manifeste doivent produire la MÊME valeur :
    // deux copies finiraient par diverger, et le téléphone installerait une
    // icône pendant que l'onglet en montrerait une autre.
    for (const [nom, src] of [
      ['page marchande', lire('app', 'sites', '[slug]', 'page.tsx')],
      ['manifeste', lire('app', 'api', 'internal', 'site-manifest', '[slug]', 'route.ts')],
    ] as const) {
      expect(
        /function\s+empreinteDuLogo/u.test(src),
        `${nom} : redéfinit l’empreinte au lieu de l’importer`,
      ).toBe(false)
      expect(src.includes('empreinteDuLogo'), `${nom} : n’utilise pas l’empreinte`).toBe(true)
    }
  })
})

describe('le manifeste servi est celui du MARCHAND', () => {
  const PAGE = lire('app', 'sites', '[slug]', 'page.tsx')

  it('la page marchande déclare SON manifeste, pas celui de la plateforme', () => {
    expect(
      /manifest:\s*`\$\{racine\}\/api\/internal\/site-manifest\//u.test(PAGE),
      'la page hérite du manifeste de la plateforme — la boutique s’installerait ' +
        'sous l’enseigne de Deribfy, ou sur une page d’erreur',
    ).toBe(true)
  })

  it('il porte la couleur du marchand et ses icônes', () => {
    const route = lire('app', 'api', 'internal', 'site-manifest', '[slug]', 'route.ts')
    expect(route.includes('theme_color')).toBe(true)
    expect(route.includes('couleurDe(s.primary_color)'), 'couleur codée en dur').toBe(true)
    expect(route.includes('site-icon'), 'le manifeste ne pointe pas les icônes du site').toBe(true)
  })
})
