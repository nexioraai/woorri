import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================================
// CPA, 2026-11-25 — LE CLIENT PARLE À « LA CENTRALE », JAMAIS À LA DDM.
//
// Décision du propriétaire : aucun client (ni visiteur) ne doit savoir quel
// service traite ses commandes et ses messages. Le mot « DDM » ne paraît dans
// aucun texte d'écran du site (connexion, espace, messages), et la réponse de
// l'API du client ne porte pas l'auteur (l'adresse de l'agent).
// Les COMMENTAIRES du code peuvent le nommer : on n'examine que les chaînes.
// Hors de portée de ce cliquet : les pages rédigées en base (organigramme…),
// où « Chef division DDM » est un intitulé officiel voulu.
// ============================================================================

const RACINE = join(__dirname, '..', '..')
const lire = (p: string) => readFileSync(join(RACINE, p), 'utf-8')
/** Les littéraux de chaîne du fichier, commentaires retirés. */
const chaines = (src: string) => {
  const sansCommentaires = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return sansCommentaires.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g) ?? []
}

const ECRANS = [
  'app/sites/[slug]/acces/libelles.ts',
  'app/sites/[slug]/espace/motsMessages.ts',
  'app/sites/[slug]/espace-client/motsEspace.ts',
  'app/sites/[slug]/gestion-commandes/page.tsx',
  'app/sites/[slug]/mes-messages/page.tsx',
  'app/sites/[slug]/espace/FilMessages.tsx',
  'app/sites/[slug]/espace/MesMessages.tsx',
  'app/sites/[slug]/espace/CadreEspace.tsx',
  'app/sites/[slug]/espace/ComptesClients.tsx',
  'app/sites/[slug]/espace/TableauCommandes.tsx',
  'app/sites/[slug]/espace/navigationEspace.ts',
  'app/sites/[slug]/espace-client/EspaceClient.tsx',
  'app/sites/[slug]/acces/NouveauMotDePasse.tsx',
  'app/sites/[slug]/comptes-clients/page.tsx',
]

describe('« DDM » n’apparaît sur aucun écran du site', () => {
  for (const f of ECRANS) {
    it(`🔴 ${f}`, () => {
      const fautives = chaines(lire(f)).filter((c) => /\bDDM\b/.test(c))
      expect(fautives, `« DDM » visible dans ${f}`).toEqual([])
    })
  }

  it('🔴 la page de connexion publique ne montre aucun lien vers la porte des agents (2026-11-25)', () => {
    const page = lire('app/sites/[slug]/acces/PageAcces.tsx')
    expect(page).not.toMatch(/href=\{`[^`]*pour=agent/)
  })

  it('🔴 l’API du client ne renvoie pas l’auteur des réponses de la Centrale', () => {
    const route = lire('app/api/sites/[slug]/mes-messages/route.ts')
    expect(route).toMatch(/VU_MESSAGE_CLIENT/)
    expect(route).not.toMatch(/\bVU_MESSAGE\b(?!_)/)
    const champs = lire('lib/commandes/messages.ts').match(/VU_MESSAGE_CLIENT\s*=\s*'([^']*)'/)?.[1] ?? ''
    expect(champs.split(',')).not.toContain('auteur')
  })
})
