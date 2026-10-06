import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ════════════════════════════════════════════════════════════════════
//  UNE FONCTION ÉCRITE, TESTÉE, ET APPELÉE PAR PERSONNE.
//
// ── CE QUI S'EST PASSÉ, ET QUI N'ÉTAIT VISIBLE NULLE PART.
//
// `recadrer()` existait depuis des semaines : écrite, documentée, couverte par
// ses propres tests — qui passaient tous au vert. Elle n'était invoquée QUE
// par eux. En production, aucune photo n'a jamais été recadrée.
//
// Résultat chez le visiteur : un marchand photographie au téléphone — une
// verticale, une horizontale, une carrée — et la grille affiche trois cadres
// différents côte à côte. La boutique a l'air bricolée. C'est la plainte qui a
// déclenché cette recherche, et c'en était la cause.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// Les tests de `recadrer()` prouvent qu'elle FONCTIONNE. Aucun ne prouvait
// qu'elle SERT. C'est la même famille que `ep161-juges-debranches` dans le
// moteur : une fonction juste et débranchée ne protège rien, et son silence
// ressemble exactement à celui d'une fonction qui marche.
//
// Et le chemin `src/app/api/images/**` ne figurait dans AUCUN motif de
// `vitest.config.ts` : la route n'était couverte par rien. Le traitement
// d'image l'était, son orchestration non — et c'est là que l'appel manquait.
// ════════════════════════════════════════════════════════════════════

const ROUTE = readFileSync(join(import.meta.dirname, '..', 'route.ts'), 'utf8')

describe('le cadre carré est APPLIQUÉ, pas seulement disponible', () => {
  it('la route importe `recadrer`', () => {
    expect(ROUTE).toMatch(/import \{[^}]*recadrer[^}]*\} from '@\/lib\/images\/ameliorer'/)
  })

  it("elle l'APPELLE réellement", () => {
    // La ligne qui manquait. Sans elle, tout le reste décrit une capacité que
    // personne n'exerce.
    expect(ROUTE).toMatch(/await recadrer\(/)
  })

  it('il est appliqué sur la version AMÉLIORÉE, pas sur le fichier brut', () => {
    // Le marchand doit recevoir l'exposition corrigée ET le cadrage d'un seul
    // geste. Recadrer l'original lui ferait perdre la première correction.
    expect(ROUTE).toMatch(/recadrer\(a\.donnees\)/)
  })

  it("son échec ne prive PAS le marchand de la correction d'exposition", () => {
    // Le recadrage est un bonus ; l'exposition est le gain le plus sûr. Un
    // `try` englobant les deux ferait perdre l'essentiel pour l'accessoire.
    expect(ROUTE, 'le recadrage doit avoir son PROPRE `catch`').toMatch(
      /donnees = await recadrer\([\s\S]{0,500}?\} catch \{/,
    )
  })

  it('le cadrage est ANNONCÉ au marchand', () => {
    // Une retouche silencieuse surprend. Il doit savoir ce qui a été fait à sa
    // photo — c'est ce qui rend le bouton de retour compréhensible.
    expect(ROUTE).toMatch(/appliquees\.push\('cadre carré'\)/)
  })
})
