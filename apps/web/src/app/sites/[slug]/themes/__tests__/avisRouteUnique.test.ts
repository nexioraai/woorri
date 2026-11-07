import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { avisDuSite } from '../avisDuSite'

// ============================================================
// A2 d2 -- LA ROUTE EST UNIQUE, ET CE CLIQUET GARDE CE QUI PEUT L'ÊTRE.
//
// PRINCIPE P-02 : la garantie principale est une IMPOSSIBILITÉ — un composant
// synchrone ne peut ni `await` une requête ni appeler `headers()`, donc un
// thème ne peut que RECEVOIR. Rien à surveiller là-dessus… tant que les
// thèmes restent synchrones. Ce fichier garde donc d'abord CELA.
//
// PRINCIPE P-01 : ce cliquet lit le SOURCE. Il garde la RÈGLE. Que la section
// paraisse réellement à l'écran est gardé par
// `scripts/prouver-ecran-appels-offres.mjs`, et par rien d'autre ici.
// ============================================================

const THEMES_DIR = join(__dirname, '..')
const SITES_DIR = join(THEMES_DIR, '..')
const RACINE = join(SITES_DIR, '..', '..')

const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const lire = (p: string) => sansCommentaires(readFileSync(p, 'utf-8'))

const THEMES = ['EditorialTheme', 'NoirTheme', 'VifTheme', 'AuroraTheme']
const RENDEURS = [
  join(SITES_DIR, 'page.tsx'),
  join(RACINE, 'preview', '[slug]', 'page.tsx'),
]

describe('d2 — l’impossibilité tient encore', () => {
  it('les QUATRE thèmes sont SYNCHRONES — c’est elle qui rend la route unique', () => {
    // Si un thème devenait `async`, il POURRAIT s'abonner lui-même et la
    // garantie structurelle tomberait au rang de convention. Ce cas est le
    // seul par lequel P-02 peut être perdu ici.
    for (const t of THEMES) {
      const src = lire(join(THEMES_DIR, `${t}.tsx`))
      expect(src, `${t} : un thème async pourrait s’abonner seul`)
        .not.toMatch(new RegExp(`export\\s+default\\s+async\\s+function\\s+${t}`))
      expect(src, `${t} : signature attendue`).toMatch(
        new RegExp(`export\\s+default\\s+function\\s+${t}\\s*\\(`)
      )
    }
  })

  it('AUCUN thème ne lit les avis lui-même', () => {
    // Un `import` depuis `appels-offres/fetchAvis` serait la seconde route.
    for (const f of readdirSync(THEMES_DIR).filter((x) => /\.tsx?$/.test(x))) {
      const src = lire(join(THEMES_DIR, f))
      expect(src, `${f} : second lecteur`).not.toMatch(/from\s+['"].*appels-offres\/fetchAvis['"]/)
      expect(src, `${f} : la table ne se nomme jamais hors de son lecteur`)
        .not.toMatch(/\.from\(\s*['"`]appels_offres/)
    }
  })

  it('la SECTION ne lit rien non plus, et n’a PAS d’état vide', () => {
    const src = lire(join(THEMES_DIR, 'SectionAppelsOffres.tsx'))
    expect(src).not.toMatch(/from\s+['"].*fetchAvis['"]/)
    expect(src).not.toMatch(/supabase/)
    // Lui donner un état vide reviendrait à l'afficher un jour. La garde est
    // chez l'appelant, et elle doit y rester.
    expect(src, 'un état vide finirait par être affiché').not.toMatch(/vide|videSuite|Aucun/)
  })
})

describe('d2 — les deux rendeurs passent les deux faits', () => {
  it('le dénominateur est réel : les deux fichiers existent', () => {
    // Un rendeur ajouté sans entrer ici échapperait au contrôle suivant.
    for (const r of RENDEURS) expect(() => readFileSync(r, 'utf-8'), r).not.toThrow()
    expect(RENDEURS).toHaveLength(2)
  })

  it('chacun fournit `hasAvis` ET `host` au thème', () => {
    // C'est ce qui comble l'écart laissé par l'optionnalité des props : le
    // défaut `false` est fail-closed, mais un rendeur muet n'afficherait
    // JAMAIS la section, et personne ne le remarquerait.
    for (const r of RENDEURS) {
      const src = lire(r)
      expect(src, `${r} : hasAvis non transmis`).toMatch(/hasAvis=\{/)
      expect(src, `${r} : host non transmis`).toMatch(/host=\{/)
    }
  })

  it('aucun rendeur ne recalcule la lecture — ils appellent le seul lecteur', () => {
    for (const r of RENDEURS) {
      const src = lire(r)
      expect(src, `${r} : requête réécrite`).not.toMatch(/\.from\(\s*['"`]appels_offres/)
      expect(src, `${r} : le seul lecteur doit être appelé`).toMatch(/fetchAvisEntries/)
    }
  })
})

describe('d2 — la dérivation du booléen', () => {
  it('une liste vide ne déclare pas d’avis', () => {
    expect(avisDuSite([]).hasAvis).toBe(false)
  })

  it('une seule entrée suffit', () => {
    expect(avisDuSite([{}]).hasAvis).toBe(true)
  })

  it('une lecture RATÉE est indiscernable d’une liste vide — et c’est assumé', () => {
    // `fetchAvisEntries` rend `[]` en cas d'erreur comme en cas d'absence :
    // c'est SON choix, documenté. Ce module ne peut donc pas les distinguer,
    // et il ne prétend pas le faire. Conséquence : une panne MASQUE la
    // section au lieu d'en afficher une fausse. Fail-closed.
    //
    // Ce test existe pour que la conséquence soit ÉCRITE, pas découverte.
    expect(avisDuSite([]).hasAvis).toBe(false)
  })
})
