import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }))

import SectionPartenaires from '../SectionPartenaires'
import SurvolVivant from '../SurvolVivant'
import { getDict } from '../i18n'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'

// ============================================================
// LOT 15.13 — LES PARTENAIRES SUR L'ACCUEIL, ET L'ANIMATION PARTOUT.
//
// DEUX DEMANDES MESURÉES À L'ÉCRAN par le propriétaire, captures à l'appui :
//
//   · « pour cpa tu as mal placé, il faut que ça soit visible juste
//     au-dessus de contact » — le bandeau était au bas d'une SOUS-PAGE, où
//     personne ne descend ;
//   · « les animations il faut que tu les mettes partout dans chaque pages
//     ou sous pages, chaque bouton quand on place le curseur doit animer ».
//
// LA SECONDE NE SE TIENT PAS BOUTON PAR BOUTON. Retoucher cinquante
// endroits, c'est quarante qui divergeront au premier ajout. La règle est à
// la RACINE du segment — là où le fond blanc avait été posé deux mois plus
// tôt pour exactement la même raison.
// ============================================================

const src = (...p: string[]) =>
  readFileSync(join(__dirname, '..', ...p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const THEMES = ['EditorialTheme.tsx', 'VifTheme.tsx', 'NoirTheme.tsx', 'AuroraTheme.tsx']
const LAYOUT = src('..', 'layout.tsx')
const TROIS = [{ nom: 'OMS' }, { nom: 'UNICEF' }, { nom: 'Banque mondiale' }]

describe('la section est à sa place, dans les QUATRE thèmes', () => {
  it('🔴 elle est montée AVANT Contact, pas après', () => {
    // Après, elle serait sous le formulaire : on ne la verrait qu'en ayant
    // déjà décidé d'écrire.
    for (const f of THEMES) {
      const s = src(f)
      // ON ANCRE SUR LA SECTION, PAS SUR `hidden('Contact')`.
      // Premier jet : `indexOf("hidden('Contact')")` — qui trouve d'abord
      // l'entrée de la BARRE DE NAVIGATION, tout en haut du fichier. Le test
      // rougissait donc sur un montage correct, en comparant les partenaires
      // à un menu. Même piège que `indexOf` a déjà tendu deux fois ici.
      const p = s.indexOf('<SectionPartenaires')
      // EP-364 — l'espace entre `<section` et `id` est un espace LITTÉRAL :
      // il casserait au premier reformatage. `\s+` survit au repli.
      const c = s.search(/<section\s+id="contact"/)
      expect(p, `${f} n'a pas la section`).toBeGreaterThan(-1)
      expect(c, `${f} n'a pas de section contact`).toBeGreaterThan(-1)
      expect(p, `${f} pose les partenaires APRÈS Contact`).toBeLessThan(c)
    }
  })

  it('🔴 elle reçoit les partenaires du site, pas une liste en dur', () => {
    for (const f of THEMES) {
      expect(src(f), `${f} n'alimente pas la section`).toMatch(/items=\{partenaires\}/)
      expect(src(f), `${f} ne reçoit pas la prop`).toMatch(/partenaires\s*=\s*\[\]/)
    }
  })
})

describe('une section vide ne paraît pas', () => {
  it('🔴 aucun partenaire → RIEN, pas un titre sur du vide', () => {
    // Un titre « Nos partenaires » au-dessus d'une bande blanche dit qu'il
    // manque quelque chose. Les 41 autres sites n'en ont aucun.
    expect(renderToStaticMarkup(
      <SectionPartenaires items={[]} primary="#1F6B4A" surtitre="Collaboration" titre="Nos partenaires" />,
    )).toBe('')
  })

  it('🔴 avec des partenaires, le surtitre ET le titre sont DISTINCTS', () => {
    // Premier jet : le même mot aux deux places. EPSS écrit « Collaboration »
    // au-dessus de « Nos partenaires » — l'un dit la nature, l'autre le
    // contenu. Répéter n'ajoute rien et se remarque.
    const h = renderToStaticMarkup(
      <SectionPartenaires items={TROIS} primary="#1F6B4A" surtitre="Collaboration" titre="Nos partenaires" />,
    )
    expect(h).toContain('Collaboration')
    // EP-364 — `motifTexte` au lieu du littéral : sur un HTML rendu comme
    // sur du source, un espace peut devenir un repli de ligne.
    expect(h).toMatch(motifTexte('Nos partenaires'))
    expect(h).toContain('OMS')
  })
})

describe('les quatre langues ont leurs mots', () => {
  it('🔴 surtitre, titre et phrase existent dans les QUATRE', () => {
    // Un site anglophone afficherait « Nos partenaires » sinon.
    for (const l of ['fr', 'en', 'es', 'ar']) {
      const t = getDict(l)
      for (const k of ['partenairesSurtitre', 'partenairesTitre', 'partenairesPhrase'] as const) {
        expect(String(t.labels[k]).length, `${l}.${k}`).toBeGreaterThan(0)
      }
    }
  })

  it('🔴 et le surtitre n’est pas le titre, dans aucune langue', () => {
    for (const l of ['fr', 'en', 'es', 'ar']) {
      const t = getDict(l)
      expect(t.labels.partenairesSurtitre, l).not.toBe(t.labels.partenairesTitre)
    }
  })
})

describe('l’animation au survol est posée À LA RACINE', () => {
  it('🔴 le layout du segment la monte, et marque la classe', () => {
    // À la racine : l'accueil, les pages déclarées, l'espace et les appels
    // d'offres en héritent sans rien écrire. Bouton par bouton, c'est la
    // correction « page par page, donc jamais ».
    expect(LAYOUT).toMatch(/<SurvolVivant/)
    expect(LAYOUT).toMatch(/className="vivant"/)
  })

  it('🔴 la teinte vient du SITE, jamais d’une valeur en dur', () => {
    const h = renderToStaticMarkup(<SurvolVivant primary="#1F6B4A" />)
    expect(h).toContain('#1F6B4A')
  })

  it('🔴 les surfaces qu’on clique se soulèvent, et le clavier voit pareil', () => {
    // Un effet réservé au survol laisse qui tabule sans aucun repère.
    const h = renderToStaticMarkup(<SurvolVivant primary="#1F6B4A" />)
    expect(h).toMatch(/:hover\s*\{[^}]*transform:\s*translateY/)
    // ON EXIGE UNE ÉPAISSEUR ET UN TRAIT, pas la seule présence de la
    // propriété : `outline: none` satisfaisait le premier jet, et la
    // mutation qui supprimait le liseré restait verte.
    expect(h).toMatch(/:focus-visible\s*\{[^}]*outline:\s*\d+px\s+solid/)
  })

  it('🔴 le mouvement se coupe sur demande — mais PAS la couleur', () => {
    // Sans les couleurs, plus rien n'indiquerait qu'un élément est
    // survolable : le réglage deviendrait une punition.
    const h = renderToStaticMarkup(<SurvolVivant primary="#1F6B4A" />)
    const d = h.indexOf('prefers-reduced-motion')
    expect(d).toBeGreaterThan(-1)
    const apres = h.slice(d)
    expect(apres).toMatch(/transform:\s*none/)
    expect(apres).toMatch(/transition:\s*color/)
  })

  it('🔴 aucun JavaScript : le survol est du CSS depuis toujours', () => {
    const h = renderToStaticMarkup(<SurvolVivant primary="#1F6B4A" />)
    expect(h).not.toMatch(/<script|onmouseover|addEventListener/)
  })
})
