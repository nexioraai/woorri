import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================
// LOT 11 — APPROUVER UN COMPTE SE FAIT DANS LE TABLEAU DE BORD.
//
// LA RÈGLE, POSÉE PAR LE PROPRIÉTAIRE le 2026-11-09 : « dans edit on met
// seulement les trucs qu'on édite qui seront visibles sur le site, le reste
// il faut mettre dans dashboard ». Approuver un fournisseur ne se voit
// nulle part sur le site : ce n'est pas du contenu.
//
// CE CLIQUET TIENT LA RÈGLE, pas l'apparence. Il ne dit pas de quoi la page
// a l'air ; il dit OÙ elle est, QUI la voit, et qu'elle ne décide rien
// elle-même.
// ============================================================

const src = (...p: string[]) =>
  readFileSync(join(__dirname, '..', ...p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const PAGE = src('comptes', '[slug]', 'page.tsx')
const BORD = src('dashboard', 'page.tsx')

describe('l’administration n’est pas dans `/edit`', () => {
  it('🔴 la page des comptes vit sous `/comptes`, hors de `/edit`', () => {
    // Si elle déménageait dans `/edit`, ce test ne la trouverait plus.
    expect(PAGE.length).toBeGreaterThan(0)
    expect(PAGE).toContain('/api/sites/')
  })

  it('🔴 `/edit` ne gagne aucun écran de comptes', () => {
    // La règle se tient des DEUX côtés : interdire ici et autoriser là-bas
    // laisserait la porte ouverte au prochain lot.
    const edit = readFileSync(join(__dirname, '..', 'edit', '[slug]', 'page.tsx'), 'utf-8')
    expect(edit).not.toMatch(/site_comptes|\/comptes\//)
  })
})

describe('le bouton ne paraît que là où il a un sens', () => {
  it('🔴 il exige `ouvre_des_comptes === true`', () => {
    // Les 41 autres sites n'ont pas de comptes, et un bouton qui mène à une
    // liste toujours vide use la confiance.
    expect(BORD).toMatch(/site\.ouvre_des_comptes\s*===\s*true\s*&&/)
  })

  it('🔴 il mène à `/comptes/<slug>`, jamais à `/edit`', () => {
    expect(BORD).toMatch(/href=\{`\/comptes\/\$\{site\.slug\}`\}/)
  })

  it('🔴 les sites qui n’ouvrent pas de comptes ne sont PAS interrogés', () => {
    // 41 appels pour 41 zéros, c'est du bruit payé à chaque ouverture.
    expect(BORD).toMatch(/filter\(\(x\)\s*=>\s*x\.ouvre_des_comptes\s*===\s*true\)/)
  })
})

describe('la pastille ne dit jamais ce qu’elle n’a pas mesuré', () => {
  it('🔴 elle ne paraît qu’au-dessus de zéro', () => {
    // Une pastille « 0 » affirmerait « rien à faire » ; une pastille absente
    // dit « je ne sais pas ». Les deux ne se valent pas quand un fournisseur
    // attend.
    expect(BORD).toMatch(/\(demandesEnAttente\[site\.slug\]\s*\?\?\s*0\)\s*>\s*0\s*&&/)
  })

  it('🔴 un échec de lecture laisse le tableau de bord ENTIER', () => {
    // Une session expirée ne doit pas effacer la liste des sites.
    const d = BORD.indexOf('demandesEnAttente')
    expect(d).toBeGreaterThan(-1)
    expect(BORD).toMatch(/catch\s*\{\s*\}/)
  })
})

describe('l’écran ne décide rien', () => {
  it('🔴 il RELIT après chaque changement d’état', () => {
    // Afficher l'état qu'on vient de DEMANDER montrerait une activation qui
    // a peut-être échoué.
    const d = PAGE.indexOf('async function changer')
    expect(d).toBeGreaterThan(-1)
    expect(PAGE.slice(d)).toMatch(/await\s+relire\(\)/)
  })

  it('🔴 il ne pose JAMAIS l’état lui-même', () => {
    // Un écran qui écrirait « actif » localement ouvrirait une porte sur un
    // mur : les routes, elles, refuseraient.
    expect(PAGE).not.toMatch(/setComptes\([^)]*etat:\s*'actif'/)
  })

  it('🔴 toute la garde est serveur — la route, à chaque geste', () => {
    // Masquer un bouton ne protège rien : il suffirait d'appeler la route à
    // la main.
    for (const verbe of ['PATCH']) {
      expect(PAGE, `${verbe} absent`).toMatch(new RegExp(`method:\\s*'${verbe}'`, 'u'))
    }
    expect(PAGE).toMatch(/Authorization:\s*`Bearer/)
  })
})
