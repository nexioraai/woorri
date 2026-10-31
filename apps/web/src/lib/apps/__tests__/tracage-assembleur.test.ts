/**
 * EP-278 — TOUTE ROUTE QUI ASSEMBLE EMMÈNE SON ASSEMBLEUR.
 *
 * ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-10-19.
 *
 * Premier tir du propriétaire avec le plafond corrigé. Les trois tours ont
 * échoué sur la même ligne, et elle ne parle pas du modèle :
 *
 *     « Failed to load external module rolldown :
 *       Cannot find native binding »
 *
 * `rolldown` est natif. Next le déclare `serverExternalPackages`, donc il ne
 * l'empaquette pas — mais le traceur ne suit pas le chargement d'un `.node`,
 * et la liaison Linux n'entre dans une fonction que si on l'y DÉSIGNE, route
 * par route.
 *
 * Quatre routes la désignaient déjà. La cinquième — la mienne, ajoutée la
 * veille — ne la désignait pas. Coût : 0,11 $, trois tours, et un
 * compilateur qui n'a jamais lu une ligne du code produit.
 *
 * ── POURQUOI UN CLIQUET DE PLUS, ALORS QUE `tracage-cloture` EXISTE.
 *
 * Parce qu'ils ne regardent pas la même chose, et que c'est tout le sujet.
 *
 *   · `tracage-cloture` vérifie que les paquets INSCRITS emmènent leurs
 *     dépendances transitives. Il regarde le CONTENU de la liste.
 *   · Celui-ci vérifie QUI DOIT Y FIGURER. Il regarde sa COMPLÉTUDE.
 *
 * Le premier était vert pendant que le second manquait. Une liste juste mais
 * incomplète passe tous les contrôles et meurt en ligne.
 *
 * ── ET POURQUOI LA PREUVE LOCALE NE POUVAIT PAS LE VOIR.
 *
 * En local, `@rolldown/binding-darwin-arm64` est installé : `assembler`
 * fonctionne, les tests passent, et la gate est verte. Le binaire Linux
 * n'existe qu'AU BUILD, sur Vercel. Aucun test d'exécution ne peut donc
 * attraper ce défaut — seule la LECTURE DE LA CONFIGURATION le peut.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../../../next.config'

const SRC = join(__dirname, '..', '..', '..')
const APP = join(SRC, 'app')

/** La liaison native, telle que la configuration doit la nommer. */
const LIAISON = '@rolldown/binding-linux-x64-gnu'

/**
 * CE QU'ON CHERCHE : le PAQUET, pas un fichier.
 *
 * Ma première version de ce contrôle visait `bac-a-sable.ts`, l'assembleur de
 * la route directe — et ne trouvait qu'UNE route sur cinq. `apercu.ts` charge
 * `rolldown` de son côté, sans passer par lui.
 *
 * Viser un fichier, c'est viser UN chemin. Viser le paquet, c'est viser le
 * BESOIN : quel que soit le module qui le charge, la fonction qui l'atteint
 * doit emmener sa liaison native.
 */
const PAQUET = 'rolldown'

/** Tous les `route.ts` de l'application, où qu'ils soient. */
function routes(dir: string, trouve: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) routes(p, trouve)
    else if (e.name === 'route.ts' || e.name === 'route.tsx') trouve.push(p)
  }
  return trouve
}

/**
 * Résout un `import` vers un fichier du dépôt, ou `null` s'il sort d'ici.
 *
 * Deux formes seulement, parce que ce sont les deux que le dépôt emploie :
 * l'alias `@/` et le chemin relatif. Un paquet de `node_modules` ne nous
 * intéresse pas — il ne peut pas tirer l'assembleur.
 */
function resoudre(depuis: string, spec: string): string | null {
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : spec.startsWith('.')
      ? resolve(dirname(depuis), spec)
      : null
  if (base === null) return null
  for (const suffixe of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    const c = base + suffixe
    if (existsSync(c) && !c.endsWith('/')) return c
  }
  return null
}

/** Atteint-on le paquet depuis ce fichier, par n'importe quel chemin ? */
function atteintLePaquet(depart: string): boolean {
  const vus = new Set<string>()
  const pile = [depart]
  while (pile.length > 0) {
    const f = pile.pop()
    if (f === undefined || vus.has(f)) continue
    vus.add(f)
    let src = ''
    try {
      src = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    // `from '…'` couvre import et export ; `import('…')` couvre le dynamique.
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/gu)) {
      const spec = m[1] ?? ''
      // LE PAQUET LUI-MÊME, ou un sous-chemin : on s'arrête là.
      if (spec === PAQUET || spec.startsWith(`${PAQUET}/`)) return true
      const r = resoudre(f, spec)
      if (r !== null) pile.push(r)
    }
  }
  return false
}

/** `src/app/api/generateur/direct/route.ts` → `/api/generateur/direct`. */
const cheminDeRoute = (fichier: string): string =>
  '/' + relative(APP, dirname(fichier)).split(/[\\/]/u).join('/')

describe('EP-278 · toute route qui assemble emmène son assembleur', () => {
  const traces = (nextConfig.outputFileTracingIncludes ?? {}) as Record<string, string[]>

  // Une clé LITTÉRALE s'applique aussi à ses routes descendantes (mesuré au
  // nft le 2026-10-31 : '/p' a porté ses fichiers jusqu'à /p/[jeton]). Une
  // clé à CROCHETS, elle, ne matche jamais rien — EP-295 les interdit. La
  // couverture d'une route se lit donc : sa clé exacte + ses clés ancêtres.
  const entreesPour = (route: string): string[] =>
    Object.entries(traces)
      .filter(([cle]) => cle === route || route.startsWith(cle + '/'))
      .flatMap(([, entrees]) => entrees)

  const concernees = routes(APP)
    .filter((f) => atteintLePaquet(f))
    .map(cheminDeRoute)
    .sort()

  it('① LA MESURE TROUVE BIEN DES ROUTES — sinon elle ne mesure rien', () => {
    // Un marcheur cassé rendrait une liste vide, et une liste vide passe
    // tous les contrôles suivants sans rien vérifier. C'est le défaut que
    // « Vert qui ne mesure rien » a déjà coûté une fois.
    expect(concernees.length, 'le marcheur d’imports ne trouve plus rien').toBeGreaterThanOrEqual(4)
    // La route qui a révélé le défaut doit en faire partie, sinon le
    // contrôle ne regarde pas l'endroit où le défaut s'est produit.
    expect(concernees).toContain('/api/generateur/direct')
  })

  it('② CHACUNE DÉSIGNE LA LIAISON NATIVE DE rolldown', () => {
    // ── CE QUI SE PASSE SI ELLE NE LA DÉSIGNE PAS.
    //
    // La fonction démarre, accepte la demande, appelle le modèle — donc
    // DÉPENSE — puis meurt à l'assemblage sur « Cannot find native binding ».
    // L'échec arrive APRÈS la dépense, et il ne dit rien du modèle.
    const manques = concernees.filter(
      (r) => !entreesPour(r).some((c) => c.includes(LIAISON)),
    )
    expect(
      manques,
      `ces routes assemblent sans emmener ${LIAISON} : elles paieront le ` +
        'modèle puis mourront à la compilation, comme le 2026-10-19',
    ).toEqual([])
  })

  it('④ CHAQUE ROUTE QUI ASSEMBLE PORTE LE CANARI — et plus jamais react', () => {
    // ── L'HISTOIRE A DEUX TEMPS, ET LE CONTRÔLE LES RACONTE.
    //
    // 2026-10-30 : Next emploie SA copie vendue de React, le traceur
    // n'embarque donc jamais node_modules/react-dom — rolldown laissait
    // `react-dom/client` en import externe et le navigateur mourait. On a
    // alors TRACÉ react, route par route. 2026-10-31 : deux tirs payés
    // meurent quand même — clé morte, cache — et EP-294 ferme la classe en
    // EMBARQUANT les sources dans le bundle du serveur.
    //
    // Donc désormais : le CANARI (scheduler, visible sur toute plateforme,
    // vérifié aussi au build par scripts/verifier-tracage.mjs) prouve que la
    // clé de la route est VIVANTE ; et le traçage react/react-dom est
    // INTERDIT — un retour signalerait un contournement d'EP-294, du poids
    // mort qui remettrait l'assemblage sous la loi du disque.
    const sansCanari = concernees.filter(
      (r) => !entreesPour(r).some((c) => c.includes('node_modules/scheduler/')),
    )
    expect(
      sansCanari,
      'ces routes assemblent sans canari : leur clé de traçage est morte ou absente',
    ).toEqual([])
    for (const interdit of ['node_modules/react/', 'node_modules/react-dom/']) {
      const revenus = Object.entries(traces)
        .filter(([, entrees]) => entrees.some((c) => c.includes(interdit)))
        .map(([cle]) => cle)
      expect(
        revenus,
        `${interdit} est revenu dans le traçage : EP-294 l'embarque déjà dans le bundle — poids mort, et retour sous la loi du disque`,
      ).toEqual([])
    }
  })

  it('⑤ L’ASSEMBLEUR REFUSE UN BUNDLE QUI IMPORTE ENCORE', async () => {
    // La parade cote CODE, independante du milieu : meme si une fonction
    // perd ses node_modules demain, le defaut devient un refus NOMME au lieu
    // d'une livraison morte. On le prouve en executant l'assembleur sur un
    // import qu'aucun environnement ne fournit.
    const { assembler } = await import('../bac-a-sable')
    const v = await assembler(
      new Map([['index.tsx', "import x from 'paquet-fantome-qui-nexiste-pas'\nexport default x"]]),
    )
    expect(v.ok, 'un bundle troue est reparti avec un verdict vert').toBe(false)
    if (!v.ok) {
      expect(v.erreur, 'le refus ne nomme pas le paquet manquant').toContain(
        'paquet-fantome-qui-nexiste-pas',
      )
    }
  })

  it('③ rolldown RESTE EXTERNE — sinon la liaison désignée ne sert à rien', () => {
    // Si Next l'empaquetait, le `.node` serait cherché dans le bundle et non
    // dans `node_modules` : la liaison tracée deviendrait inutile et le
    // contrôle ② resterait vert contre du vide.
    expect(nextConfig.serverExternalPackages ?? []).toContain('rolldown')
  })
})
