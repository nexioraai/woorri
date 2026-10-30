/**
 * EP-287 — UNE APPLICATION PRODUITE DOIT POUVOIR ÊTRE REVUE.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-30.
 *
 * Douze routes d'API lisaient la table des générations. AUCUNE PAGE ne la
 * lisait. L'aperçu n'existait qu'en mémoire du navigateur : on ferme
 * l'onglet, on recharge, et l'œuvre est perdue — alors qu'elle est en base,
 * entière, et que la personne l'a payée.
 *
 * Le propriétaire a produit CONTERAK DEUX FOIS. Les deux fois, la seule
 * façon de la revoir a été que je sorte les fichiers à la main vers un
 * dossier temporaire. Une application qu'on ne peut revoir qu'en passant par
 * moi n'est pas livrée : elle est prêtée.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 *   ① REVOIR NE COÛTE RIEN. La route recompile les fichiers stockés ; elle
 *      n'appelle AUCUN modèle. Le jour où elle en appellerait un, revoir
 *      deviendrait payant — et le produit redeviendrait une démonstration.
 *   ② L'IDENTITÉ FILTRE LA REQUÊTE, elle ne la vérifie pas après coup.
 *   ③ L'ÉCRAN N'OFFRE « REVOIR » QUE SI LA MATIÈRE EXISTE. Le statut dit ce
 *      que la machine a cru ; les fichiers disent ce qu'elle a gardé.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const API = join(__dirname, '..', '..', '..', 'app', 'api', 'generateur')
const lire = (...p: string[]) => readFileSync(join(API, ...p), 'utf8')
const nu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')

const REVOIR = nu(lire('direct', '[id]', 'route.ts'))
const LISTE = nu(lire('mes-applications', 'route.ts'))
const ECRAN = nu(
  readFileSync(join(__dirname, '..', '..', '..', 'app', 'dashboard', 'page.tsx'), 'utf8'),
)

describe('EP-287 · revoir une application', () => {
  it('① REVOIR NE COÛTE RIEN — aucun modèle n’est appelé', () => {
    // ── LE CONTRÔLE LE PLUS IMPORTANT DU LOT.
    //
    // Les fichiers sont déjà en base. Les recompiler coûte du processeur,
    // pas un centime. Si cette route se mettait un jour à appeler un modèle
    // — pour « améliorer », « réparer », « rafraîchir » — revoir son travail
    // deviendrait payant, et le produit redeviendrait ce qu'il était : une
    // démonstration qu'on ne peut pas garder.
    for (const interdit of ['clientIA', 'appelerFournisseur', 'messages.create', 'messages.stream']) {
      expect(REVOIR, `revoir appelle désormais un modèle (${interdit}) : ce n’est plus gratuit`).not.toContain(
        interdit,
      )
    }
    // Elle recompile, et c'est tout.
    expect(REVOIR, 'la route ne recompile plus les fichiers stockés').toContain('assembler(')
    expect(REVOIR).toContain('pageAutonome(')
  })

  it('② L’IDENTITÉ FILTRE LA REQUÊTE — elle ne la vérifie pas après coup', () => {
    // Invariant du dépôt, appris à ses dépens : lire d'abord puis comparer
    // ensuite laisse une fenêtre où l'on détient déjà la donnée d'autrui.
    for (const [nom, src] of [['revoir', REVOIR], ['liste', LISTE]] as const) {
      expect(src, `« ${nom} » n’exige plus une session`).toContain('requireAuthenticatedUser')
      expect(src, `« ${nom} » ne filtre plus par propriétaire`).toMatch(
        /\.eq\(\s*['"]owner_id['"]\s*,/u,
      )
    }
    // La route qui vise UNE ligne par son id doit filtrer les DEUX.
    expect(REVOIR, 'revoir ne vise plus une ligne précise').toMatch(/\.eq\(\s*['"]id['"]\s*,/u)
  })

  it('③ LA LISTE NE TRANSPORTE JAMAIS LES ŒUVRES ENTIÈRES', () => {
    // Un `document` pèse des dizaines de milliers de caractères. En rendre
    // cinquante pour afficher des noms rendrait la page inutilisable — et
    // ferait voyager l'œuvre là où seul son titre est nécessaire.
    expect(LISTE, 'la liste rend le document entier').not.toMatch(
      /applications[\s\S]{0,400}document:\s*(?:g\.)?document/u,
    )
    // Elle rend le COMPTE de fichiers, pas leur contenu.
    expect(LISTE).toContain('revoyable')
  })

  it('④ L’ÉCRAN N’OFFRE « REVOIR » QUE SI LA MATIÈRE EXISTE', () => {
    // ── POURQUOI LE STATUT NE SUFFIT PAS.
    //
    // `livree` dit ce que la machine a cru au moment de ranger la ligne. Les
    // fichiers disent ce qu'elle a effectivement gardé. Les deux divergent —
    // on l'a mesuré : des lignes `refusee` existent sans aucun fichier, et
    // rien n'interdit une `livree` vide. Offrir le lien sans la matière,
    // c'est promettre un 404 et faire croire à la personne qu'elle a perdu
    // son application une seconde fois.
    const i = ECRAN.indexOf('/api/generateur/direct/')
    expect(i, 'l’écran ne mène plus à une application').toBeGreaterThan(-1)
    expect(
      ECRAN.slice(Math.max(0, i - 400), i),
      'le lien « Revoir » n’est plus conditionné à l’existence des fichiers',
    ).toContain('revoyable')
  })

  it('⑤ L’ŒUVRE EST SERVIE EN DOCUMENT, jamais montée dans la page', () => {
    // L'application tourne dans un cadre isolé. Servie comme un document
    // entier, elle ne peut rien lire du site qui l'héberge. Montée dans
    // l'arbre React, elle le pourrait.
    expect(REVOIR).toMatch(/text\/html/u)
    // Et aucun cache partagé ne retient l'œuvre d'une personne.
    expect(REVOIR, 'un proxy pourrait retenir l’application d’une personne').toMatch(
      /private[^'"]*no-store|no-store[^'"]*private/u,
    )
  })
})
