/**
 * EP-365 · UN MODULE PROUVÉ SANS APPELANT N'EXISTE PAS — TOUT LE DÉPÔT.
 *
 * ── CE CLIQUET EXISTE PARCE QUE LE PRÉCÉDENT NOMMAIT LE CAS SANS LE COUVRIR.
 *
 * EP-361 ouvre sur cinq modules prouvés sans appelant, et le premier de sa
 * liste est `extraction-exigences`. Son balayage ne lit que
 * `juge-*.ts` — donc il ne l'a jamais vu, ni aucun des autres. Une garde
 * qui écrit en prose le cas qui l'a motivée, et qui ne le mesure pas.
 *
 * C'est la même famille que les ancres qui lisent une FORME au lieu d'une
 * PROPRIÉTÉ : « juge-*.ts » est une forme de nom de fichier. La propriété
 * est « ce module est-il atteint depuis un chemin qui livre ? ».
 *
 * ── LE CHIFFRE RÉEL, MESURÉ LE 2026-11-06.
 *
 *   15  modules PROUVÉS par un test et appelés par AUCUN code de production
 *    7  modules sans test NI appelant
 *    4  modules atteignables SEULEMENT depuis un module mort
 *   ──
 *   26  modules · dont 3 exemptés légitimes → 23 de DETTE
 *
 * La mesure transitive en a trouvé un que la mesure « a-t-il un importeur »
 * ratait : `ai/module-selector.ts`, importé par `ai/test-selector.ts` — un
 * fichier de brouillon à `console.log`, sans aucun export, commité dans
 * `src/`. Signalé, pas corrigé : hors périmètre.
 *
 * On en avait trouvé SIX, un par un, par accident, en cherchant autre
 * chose. Ce n'est donc pas une série d'incidents : c'est une façon de
 * travailler. Et neuf des vingt-cinq sont sur le chemin qui GÉNÈRE
 * (`lib/apps/`), dont TROIS sont des règles générales que ce dépôt s'est
 * données et n'applique nulle part :
 *
 *   mesurer-la-sortie.ts   « la deuxième règle générale du 2026-11-02 »
 *   garde-correlee.ts      « la troisième règle générale du 2026-11-03 »
 *                           — et elle n'a même pas de test
 *   identites-derivees.ts  « LA RÈGLE, et pourquoi elle se répète »
 *
 * ── DEUX LISTES, ET LA DIFFÉRENCE COMPTE.
 *
 * `EXEMPTÉS` est une DÉCISION : le module est écrit pour être appelé par
 * des tests, et c'est correct. Sa raison se lit dans son propre fichier
 * (la règle d'EP-361, qu'on garde).
 *
 * `DETTE` est une BLESSURE : le module devrait être branché ou supprimé.
 * On n'exige pas qu'elle se résorbe aujourd'hui ; on interdit la 23ᵉ. Et
 * une entrée qui reprend vie doit SORTIR de la liste — sinon la dette
 * pourrit et sert de porte d'entrée à un nouveau mort sous un vieux nom.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, normalize, relative } from 'node:path'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')

/**
 * LES CONVENTIONS NEXT — LUES DANS LE PAQUET, PAS DEVINÉES.
 *
 * Next appelle ces fichiers PAR CONVENTION : aucun import ne les nomme, et
 * les compter comme morts rendrait un faux rouge. Mesuré : `src/proxy.ts`
 * (224 l.) y était, alors que `PROXY_LOCATION_REGEXP` vaut
 * `"(?:src/)?proxy"` et que ses symboles sont bien dans le build.
 *
 * Source : `node_modules/next/dist/lib/constants.js` —
 * `MIDDLEWARE_FILENAME`, `PROXY_FILENAME`, `INSTRUMENTATION_HOOK_FILENAME`.
 */
const RACINE = new Set(['proxy', 'middleware', 'instrumentation'])
const CONVENTIONS_APP = new Set([
  'page', 'layout', 'route', 'template', 'default', 'error', 'global-error',
  'loading', 'not-found', 'sitemap', 'robots', 'manifest', 'icon',
  'apple-icon', 'favicon', 'opengraph-image', 'twitter-image',
])

const MARQUE_EXEMPT = 'APPELÉ PAR LES TESTS, PAR CONSTRUCTION'

/** Le témoin de la fin de V4 : premier fichier de sa liste de suppression (critère de sortie, au registre). */
const TEMOIN_V4 = 'boucle-directe.ts'

/** Écrits pour être appelés par des tests. La raison vit AUSSI dans le fichier. */
const EXEMPTES: Readonly<Record<string, string>> = {
  'lib/testing/postgrest.ts': 'instrument de preuve — ses 31 appelants SONT des tests',
  'lib/architecture/checkDomainBoundaries.ts': 'contrôle d’architecture exécuté PAR un test',
  'app/sites/[slug]/themes/checkSectionOrder.ts': 'contrôle d’ordre exécuté PAR un test',
  'lib/apps/contrat/catalogue.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/consigne.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/contraintes.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/proche.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/validateur.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/textes.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/graphe.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/archetypes.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/deux-passes.ts': 'V4, bloc 1 (2026-11-14) : les deux passes et le repli sont prouvés SEULS, modèle simulé, à 0 $ ; le bloc 2 les branche sur la route de génération — il SORT alors de cette liste',
  'lib/apps/contrat/compiler.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/rendu/moteur.tsx': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/rendu/donnees.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
  'lib/apps/contrat/rendu/textes-systeme.ts': 'étape 1 du plan « assembler » (2026-11-13) : le contrat est prouvé SEUL, à 0 $, par ses tests ; l’étape 4 (deux passes + repli) le branche — il SORT alors de cette liste',
}

/** MESURÉ LE 2026-11-06. Cette liste ne grandit jamais. */
const DETTE: readonly string[] = [
  'ai/module-selector.ts',
  'app/sites/[slug]/themes/DesignUploader.tsx',
  'app/sites/[slug]/themes/FamilyFilter.tsx',
  'app/sites/[slug]/themes/ImageProduit.tsx',
  'app/sites/[slug]/themes/themeRegistry.ts',
  'components/ConfirmModal.tsx',
  'components/DashboardMobileNav.tsx',
  'components/onboarding/OnboardingFlow.tsx',
  'lib/apps/banc-jumelle.ts',
  'lib/apps/enonces.ts',
  'lib/apps/etat-local.ts',
  'lib/apps/extraction-exigences.ts',
  'lib/apps/garde-correlee.ts',
  'lib/apps/identites-derivees.ts',
  'lib/apps/juge-bandeau.ts',
  'lib/apps/mesurer-la-sortie.ts',
  'lib/apps/ronde-generation.ts',
  'lib/fulfillment/provider-change.ts',
  'lib/fulfillment/transition-rules.ts',
  'lib/images/fond.ts',
  'lib/languages.ts',
  'lib/systemHealth/buildHealthReport.ts',
  'lib/systemHealth/postHealthReport.ts',
]

const tous = (): string[] => {
  const out: string[] = []
  const marcher = (d: string): void => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) {
        if (n !== 'node_modules') marcher(p)
      } else if (/\.(tsx?|mjs)$/u.test(n)) out.push(p)
    }
  }
  marcher(SRC)
  return out
}

const estTest = (p: string): boolean =>
  p.includes('__tests__') || /\.(test|spec)\.tsx?$/u.test(p)

/** Un point d'entrée n'est atteint par AUCUN import — le compter serait un faux rouge. */
const estEntree = (p: string): boolean => {
  const rel = relative(SRC, p).replaceAll('\\', '/')
  const tige = (rel.split('/').pop() ?? '').replace(/\.(tsx?|mjs)$/u, '')
  if (!rel.includes('/') && RACINE.has(tige)) return true
  if (rel.startsWith('app/') && CONVENTIONS_APP.has(tige)) return true
  if (rel.startsWith('tirs/') || rel.endsWith('.tir.ts')) return true
  return rel.endsWith('.mjs')
}

/** Les cibles d'import RÉSOLUES — `@/x`, `./x`, et `new URL('./x.mjs')` (un spawn). */
const ciblesDe = (p: string, src: string): string[] => {
  const brutes = new Set<string>()
  for (const m of src.matchAll(/(?:from|import|require\()\s*['"]([^'"]+)['"]/gu)) brutes.add(m[1])
  for (const m of src.matchAll(/import\(\s*['"]([^'"]+)['"]/gu)) brutes.add(m[1])
  for (const m of src.matchAll(/new URL\(\s*['"]([^'"]+)['"]/gu)) brutes.add(m[1])
  const out: string[] = []
  for (const c of brutes) {
    const base = c.startsWith('@/')
      ? join(SRC, c.slice(2))
      : c.startsWith('.')
        ? normalize(join(dirname(p), c))
        : null
    if (base === null) continue
    for (const suf of ['', '.ts', '.tsx', '.mjs', '/index.ts', '/index.tsx']) {
      try {
        if (statSync(base + suf).isFile()) {
          out.push(base + suf)
          break
        }
      } catch {
        /* pas ce suffixe */
      }
    }
  }
  return out
}

type Carte = { appelants: Map<string, Set<string>>; fichiers: string[] }

const carte = (): Carte => {
  const fichiers = tous()
  const appelants = new Map<string, Set<string>>()
  for (const p of fichiers) {
    for (const c of ciblesDe(p, readFileSync(p, 'utf8'))) {
      const s = appelants.get(c) ?? new Set<string>()
      s.add(p)
      appelants.set(c, s)
    }
  }
  return { appelants, fichiers }
}

/**
 * LA PROPRIÉTÉ, ET PAS UNE FORME : CE MODULE EST-IL ATTEIGNABLE ?
 *
 * Ma première forme demandait « a-t-il un importeur de production ? ». Elle
 * ratait l'anneau suivant : `enonces.ts` EST importé — par
 * `extraction-exigences.ts`, qui est mort. Trois modules passaient ainsi.
 *
 * On remonte donc depuis les POINTS D'ENTRÉE, transitivement. Un module est
 * mort s'il n'existe AUCUN chemin d'import depuis quoi que ce soit que Next,
 * un tir ou un spawn lance. La profondeur ne change plus rien.
 */
const mortsTransitifs = ({ appelants, fichiers }: Carte): string[] => {
  const importe = new Map<string, string[]>()
  for (const [cible, src] of appelants) {
    for (const a of src) importe.set(a, [...(importe.get(a) ?? []), cible])
  }
  const vivants = new Set<string>()
  const pile = fichiers.filter((p) => estEntree(p))
  while (pile.length > 0) {
    const p = pile.pop() as string
    if (vivants.has(p)) continue
    vivants.add(p)
    for (const c of importe.get(p) ?? []) if (!vivants.has(c)) pile.push(c)
  }
  const out: string[] = []
  for (const p of fichiers) {
    if (estTest(p) || vivants.has(p)) continue
    const src = readFileSync(p, 'utf8')
    if (!/^export (?:async function|function|const|class|default)\b/mu.test(src)) continue
    out.push(relative(SRC, p).replaceAll('\\', '/'))
  }
  return out.sort()
}

describe('EP-365 · un module prouvé sans appelant n’existe pas', () => {
  it('① le balayage résout vraiment des imports — sinon tout paraîtrait mort', () => {
    const c = carte()
    // Un module dont on SAIT qu'il est appelé. Sans ce témoin, un résolveur
    // cassé rendrait « 400 modules morts » et le cliquet serait inutilisable.
    const vivant = join(SRC, 'lib', 'apps', 'juge-couverture.ts')
    expect([...(c.appelants.get(vivant) ?? [])].filter((a) => !estTest(a)).length).toBeGreaterThan(0)
    expect(c.fichiers.length).toBeGreaterThan(300)
  })

  it('② aucun module sans appelant en dehors des deux listes', () => {
    const connus = new Set([...Object.keys(EXEMPTES), ...DETTE])
    const nouveaux = mortsTransitifs(carte()).filter((p) => !connus.has(p))
    expect(
      nouveaux,
      'Ce module n’est appelé par AUCUN code de production. Branche-le, ' +
        'supprime-le, ou — si ses appelants SONT des tests par construction — ' +
        `ajoute-le à EXEMPTES avec sa raison, et écris « ${MARQUE_EXEMPT} » en ` +
        'tête de son fichier.',
    ).toEqual([])
  })

  it('③ une entrée de DETTE qui reprend vie doit SORTIR de la liste', () => {
    const morts = new Set(mortsTransitifs(carte()))
    const ressuscites = DETTE.filter((p) => !morts.has(p))
    expect(
      ressuscites,
      'Ces modules sont branchés maintenant : retire-les de DETTE. Une dette ' +
        'qui ne se vide pas sert de porte d’entrée à un nouveau mort sous un ' +
        'vieux nom.',
    ).toEqual([])
  })

  it('④ un EXEMPTÉ porte sa raison dans son propre fichier', () => {
    // La règle d'EP-361, gardée : « une exemption qui ne vit que dans ce test
    // ne prévient personne ». Elle doit être là où on ouvre le fichier.
    // Dans un COMMENTAIRE, un reformatage replie la phrase sur deux lignes
    // avec une étoile au milieu : `dansCommentaire = true` l'absorbe.
    const motif = motifTexte(MARQUE_EXEMPT, true)
    const sans = Object.keys(EXEMPTES).filter(
      (p) => !motif.test(readFileSync(join(SRC, p), 'utf8')),
    )
    expect(sans, `Écris « ${MARQUE_EXEMPT} » en tête de ces fichiers.`).toEqual([])
    for (const [p, raison] of Object.entries(EXEMPTES)) {
      expect(raison.length, `${p} : une exemption sans raison est un trou`).toBeGreaterThan(20)
    }
  })

  /**
   * B2 (2026-11-14) — L'EXEMPTION DU CONTRAT A UNE FIN, ET CE CAS LA FAIT RESPECTER.
   *
   * Les modules `lib/apps/contrat/*` sont exemptés « jusqu'à l'étape 4 » : le
   * contrat est prouvé seul, à 0 $, puis branché. Deux façons de laisser
   * l'exemption pourrir, deux contrôles :
   *   · un module du contrat DÉJÀ atteignable depuis la production reste
   *     inscrit → rouge, sans attendre V4 ;
   *   · V4 est TERMINÉE (son critère de sortie, inscrit au registre : la liste
   *     de suppression exécutée — dont `boucle-directe.ts`) et un module du
   *     contrat est encore exempté → rouge.
   */
  it('⑥ B2 — aucun module du contrat ne reste exempté une fois branché, ni après V4', () => {
    const contrat = Object.keys(EXEMPTES).filter((p) => p.startsWith('lib/apps/contrat/'))
    const morts = new Set(mortsTransitifs(carte()))
    expect(
      contrat.filter((p) => !morts.has(p)),
      'Ces modules du contrat sont branchés : retire-les d’EXEMPTES (et leur marque).',
    ).toEqual([])
    const v4Terminee = !existsSync(join(SRC, 'lib', 'apps', TEMOIN_V4))
    if (v4Terminee) {
      expect(contrat, 'V4 est terminée (sa liste de suppression est exécutée) : plus aucun module du contrat ne peut être exempté.').toEqual([])
    }
  })

  it('⑤ les conventions Next qu’on exempte existent encore dans le paquet', () => {
    // MESURER CE QUI PART, appliqué au cliquet lui-même : la liste des
    // points d'entrée est une HYPOTHÈSE sur Next. Si Next renomme sa
    // convention, un vrai point d'entrée serait compté mort (faux rouge) —
    // ou, pire, un module mort serait exempté sous un nom périmé.
    const constantes = readFileSync(
      join(SRC, '..', '..', '..', 'node_modules', 'next', 'dist', 'lib', 'constants.js'),
      'utf8',
    )
    // `motifTexte` et pas le littéral : dans un fichier COMPILÉ, l'espacement
    // autour du `=` n'est pas une propriété du paquet (EP-363/364).
    expect(constantes).toMatch(motifTexte("PROXY_FILENAME = 'proxy'"))
    expect(constantes).toMatch(motifTexte("MIDDLEWARE_FILENAME = 'middleware'"))
    expect(constantes).toMatch(motifTexte("INSTRUMENTATION_HOOK_FILENAME = 'instrumentation'"))
  })
})
