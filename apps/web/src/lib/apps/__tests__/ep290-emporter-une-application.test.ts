/**
 * EP-290 — PUBLIER ET EMPORTER UNE ŒUVRE DU MOTEUR DIRECT.
 *
 * ── LES TROIS QUESTIONS DU PROPRIÉTAIRE, 2026-10-30, ET LEURS MESURES.
 *
 * « Publier mène à quoi ? ou c'est juste un bouton coquille ? » — Mesuré en
 * production : POST publier → 200, lien /p/<jeton> ; ouvert SANS COMPTE →
 * 200, 957 898 caractères, l'application dedans, CSP sandbox, noindex.
 * Ce n'est pas une coquille. MAIS le bouton de l'écran lisait `d.url` alors
 * que la route rend `lien` : il aurait dit « échec » sur une publication
 * RÉUSSIE. Le mensonge inverse d'une coquille — un vrai geste annoncé raté.
 *
 * « Télécharger mène à quoi ? » — Mesuré : un zip de 198 346 octets portant
 * les sources et une page. Honnête, mais PAS UN PROJET : ni package.json,
 * ni outillage, ni mode d'emploi. « il faut que ça soit de bonnes applis web
 * téléchargeables, sinon je veux pas accepter. »
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Le zip est un PROJET COMPLET, la page publique sert le format direct, et
 * l'écran lit le champ que la route rend vraiment.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projetLivrable } from '../projet-livrable'

const SRC = join(__dirname, '..', '..', '..')
const nu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
const LIVRAISON = nu(readFileSync(join(SRC, 'app', 'api', 'generateur', 'livraison', 'route.ts'), 'utf8'))
const PUBLIC = nu(readFileSync(join(SRC, 'app', 'p', '[jeton]', 'route.ts'), 'utf8'))
const ECRAN = nu(readFileSync(join(SRC, 'app', 'dashboard', 'page.tsx'), 'utf8'))

describe('EP-290 · emporter une application', () => {
  const zip = projetLivrable(
    { 'index.tsx': 'code', 'components/App.tsx': 'code' },
    '<!doctype html><html>page</html>',
  )

  it('① LE ZIP EST UN PROJET, pas un tas de fichiers', () => {
    // Chaque pièce manquante casse un usage précis : sans package.json, pas
    // de `npm install` ; sans dev.html, pas de serveur de développement ;
    // sans README, personne ne sait qu'il y a DEUX façons de s'en servir.
    for (const piece of ['index.html', 'README.md', 'package.json', 'vite.config.ts', 'tsconfig.json', 'dev.html']) {
      expect([...zip.keys()], `le projet livré n’a plus de ${piece}`).toContain(piece)
    }
    // Les sources vivent sous src/, d'un bloc — leurs imports relatifs
    // survivent au déplacement du dossier entier.
    expect([...zip.keys()]).toContain('src/index.tsx')
    expect([...zip.keys()]).toContain('src/components/App.tsx')
  })

  it('② REACT EST ÉPINGLÉ SUR LA VERSION QUI A COMPILÉ', () => {
    // Une version flottante ferait diverger le projet téléchargé de la page
    // compilée livrée à côté : même zip, deux comportements.
    const pkg = JSON.parse(zip.get('package.json') ?? '{}') as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies?.react, 'react n’est plus épinglé').toMatch(/^\d/u)
    expect(pkg.dependencies?.react).toBe(pkg.dependencies?.['react-dom'])
    // Et le README donne les deux chemins, en français.
    const readme = zip.get('README.md') ?? ''
    expect(readme).toContain('index.html')
    expect(readme).toContain('npm install')
  })

  it('③ LA LIVRAISON DIRECTE PASSE PAR LE PROJET LIVRABLE', () => {
    expect(LIVRAISON, 'la livraison est revenue au tas de fichiers').toContain('projetLivrable(')
  })

  it('④ LA PAGE PUBLIQUE SERT LE FORMAT DIRECT, en recompilant', () => {
    // Sans cette branche, le lien public d'une œuvre directe rend 404 — une
    // application livrée et payée, impubliable.
    expect(PUBLIC, 'le lien public ne sert plus le format direct').toContain('assembler(')
    expect(PUBLIC).toContain('pageAutonome(')
    // Et JAMAIS un modèle : publier reste gratuit.
    for (const interdit of ['clientIA', 'appelerFournisseur', 'messages.create']) {
      expect(PUBLIC, `la page publique appelle un modèle (${interdit})`).not.toContain(interdit)
    }
  })

  it('⑤ L’ÉCRAN LIT LE CHAMP QUE LA ROUTE REND VRAIMENT', () => {
    // ── BUG ATTRAPÉ EN PRODUCTION : la route rend `lien`, l'écran lisait
    // `url`. Le bouton aurait dit « échec » sur une publication réussie —
    // et la personne aurait cru son application impubliable.
    const i = ECRAN.indexOf('generateur/publier')
    expect(i, 'l’écran ne publie plus').toBeGreaterThan(-1)
    expect(
      ECRAN.slice(i, i + 900),
      'l’écran ne lit plus `lien` : la route rend ce champ-là, mesuré en production',
    ).toMatch(/d\?\.lien/u)
  })
})
