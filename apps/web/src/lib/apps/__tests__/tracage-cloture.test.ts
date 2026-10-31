/**
 * CLIQUET — UN PAQUET TRACÉ EMMÈNE SES DÉPENDANCES, OU IL NE PART PAS.
 *
 * ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE.
 *
 * `outputFileTracingIncludes` copie des fichiers dans la fonction serverless
 * COMME DES DONNÉES : le traceur ne lit pas leurs `import`. Tracer un paquet
 * sans tracer ses dépendances produit une fonction qui démarre, répond, et
 * meurt à la première ligne qui a besoin du paquet manquant.
 *
 * Mesuré en ligne, sur la lecture par IA du générateur :
 *   « Cannot find package 'standardwebhooks' imported from
 *     /var/task/node_modules/@anthropic-ai/sdk/resources/beta/webhooks.mjs »
 *
 * La règle était ÉCRITE dans `next.config.ts`, juste au-dessus de la liste.
 * Elle a été appliquée à `zod` et `acorn` — qui n'ont aucune dépendance — et
 * pas au seul paquet de la liste qui en avait six. Un commentaire ne vérifie
 * rien : il fallait un test.
 *
 * ── CE QUI EST EXEMPTÉ, ET POURQUOI.
 *
 * Un paquet déclaré dans `serverExternalPackages` n'est PAS copié comme une
 * donnée : Next le résout normalement et suit ses `import`. Pour ceux-là, la
 * liste ne sert qu'à faire entrer des fichiers que le traceur ne voit pas
 * (du WebAssembly, un binaire natif), pas le code. Les exempter n'affaiblit
 * pas le cliquet : ça le rend exact.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// ── LA CONFIGURATION EST IMPORTÉE, PAS RELUE COMME DU TEXTE.
//
// Première version : je parsais `next.config.ts` à l'expression régulière.
// Puis j'ai factorisé la liste partagée dans une constante — et mon parseur,
// qui cherchait des tableaux littéraux, a cessé de voir trois routes sur
// quatre. Il restait vert en couvrant moins.
//
// C'est le défaut nommé de longue date dans ce dépôt : je vérifiais un
// MODÈLE du contrôle au lieu du contrôle. Ici, c'est l'objet réellement
// exporté — celui que Next lira — qui est mesuré.
import nextConfig from '../../../../next.config'
import { sansCommentaires } from './sans-commentaires'

const RACINE = join(__dirname, '../../../../../..')
const MODULES = join(RACINE, 'node_modules')

/** Le nom de paquet contenu dans un chemin `node_modules/...`, ou null. */
function paquetDe(chemin: string): string | null {
  const i = chemin.indexOf('node_modules/')
  if (i === -1) return null
  const reste = chemin.slice(i + 'node_modules/'.length).split('/')
  if (reste.length === 0 || reste[0] === '') return null
  // Les paquets à périmètre (`@x/y`) portent leur nom sur deux segments.
  return reste[0].startsWith('@') ? `${reste[0]}/${reste[1] ?? ''}` : reste[0]
}

/**
 * UN PAQUET SANS AUCUN FICHIER EXÉCUTABLE NE PEUT PAS ÊTRE CHARGÉ.
 *
 * `happy-dom` déclare `@types/node`, `@types/whatwg-mimetype` et, par
 * ricochet, `undici-types` dans ses `dependencies` — MESURÉ le 2026-10-31 :
 * zéro `.js`, zéro `.cjs`, zéro `.mjs`, zéro `.node` ; uniquement des
 * déclarations de types, lues par le compilateur, jamais par l'exécution.
 * Les tracer mettrait 2,5 Mo de poids mort dans une fonction bornée à 250.
 *
 * L'exemption est MESURÉE, pas devinée au préfixe du nom : un paquet nommé
 * « @types/x » qui porterait du code serait exigé comme les autres. C'est la
 * même doctrine que celle déjà écrite plus haut pour `serverExternalPackages`
 * — exempter ce qui ne peut pas être chargé rend le cliquet EXACT.
 */
function porteDuCodeExecutable(nom: string): boolean {
  const racine = join(MODULES, nom)
  if (!existsSync(racine)) return true
  const pile = [racine]
  while (pile.length > 0) {
    const d = pile.pop()
    if (d === undefined) continue
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) pile.push(join(d, e.name))
      else if (/\.(js|cjs|mjs|node)$/u.test(e.name)) return true
    }
  }
  return false
}

/** Fermeture transitive des `dependencies` réelles, lue dans node_modules. */
function cloture(nom: string, vus = new Set<string>()): Set<string> {
  if (vus.has(nom)) return vus
  if (!porteDuCodeExecutable(nom)) return vus
  vus.add(nom)
  const manifeste = join(MODULES, nom, 'package.json')
  if (!existsSync(manifeste)) return vus
  const j = JSON.parse(readFileSync(manifeste, 'utf8')) as { dependencies?: Record<string, string> }
  for (const d of Object.keys(j.dependencies ?? {})) cloture(d, vus)
  return vus
}

describe('CLIQUET — tracage : la cloture des dependances', () => {
  const traces = nextConfig.outputFileTracingIncludes ?? {}
  const externes = new Set(nextConfig.serverExternalPackages ?? [])

  it('la configuration declare bien des routes a mesurer', () => {
    expect(Object.keys(traces).length).toBeGreaterThan(0)
  })

  it('chaque paquet trace emmene TOUTES ses dependances transitives', () => {
    const manques: string[] = []
    for (const [route, chemins] of Object.entries(traces)) {
      const declares = new Set(chemins.map(paquetDe).filter((x): x is string => x !== null))
      for (const paquet of declares) {
        // Un paquet de `serverExternalPackages` n'est pas copié comme une
        // donnée : Next le résout et suit ses `import`. L'exempter rend le
        // cliquet exact, il ne l'affaiblit pas.
        if (externes.has(paquet)) continue
        for (const requis of cloture(paquet)) {
          if (!declares.has(requis)) {
            manques.push(`${route} : « ${paquet} » a besoin de « ${requis} », qui n'est pas tracé`)
          }
        }
      }
    }
    expect(manques).toEqual([])
  })

  it('TOUTE route qui charge le moteur d emission le TRACE', () => {
    // Le défaut que je viens de commettre en branchant le dialogue :
    // `apercu`, `produire` et la sonde se sont mises à charger
    // `elicitation.mjs` sans que leur tracage suive. Trois fonctions
    // seraient mortes en ligne, du défaut même que je corrigeais.
    //
    // Les routes sont DÉCOUVERTES, pas listées : une cinquième route qui
    // chargerait un module d'émission se ferait attraper sans que personne
    // pense à revenir ici.
    // ── TOUT `api/`, PAS SEULEMENT `api/generateur/` (2026-10-14).
    //
    // Cette preuve promettait : « les routes sont DECOUVERTES, pas listees ».
    // Elles l'etaient — dans UN SEUL dossier. Et le travail reel de
    // l'emission ne s'y trouve pas : il est dans `api/cron/generations`, qui
    // passe chaque minute et porte TOUTE la generation.
    //
    // MESURE EN PRODUCTION : la generation du proprietaire est morte sur
    // « Cannot find module '/var/task/benchmarks/air-emission/moteur.mjs' »,
    // trois reprises, parce que cette route n'etait pas dans la liste de
    // tracage — et que cette preuve-ci ne regardait pas la ou elle vit.
    //
    // Un angle mort dans un cliquet est pire qu'une absence de cliquet : il
    // donne le vert ET la tranquillite.
    const racineApi = join(RACINE, 'apps/web/src/app/api')
    const routesDeApi = (dossier: string, prefixe: string): string[] => {
      const trouvees: string[] = []
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        if (!e.isDirectory()) continue
        const chemin = join(dossier, e.name)
        const route = `${prefixe}/${e.name}`
        const f = join(chemin, 'route.ts')
        if (existsSync(f)) trouvees.push(route)
        trouvees.push(...routesDeApi(chemin, route))
      }
      return trouvees
    }
    const chargeurs: string[] = []
    for (const route of routesDeApi(racineApi, '/api')) {
      const f = join(RACINE, 'apps/web/src/app', route.slice(1), 'route.ts')
      const code = sansCommentaires(readFileSync(f, 'utf8'))
      // Direct, ou par un module de `lib/apps` qui charge le moteur.
      // `moteur` s'ajoute a la liste : c'est par lui que le cron atteint
      // `moteur.mjs`, et l'ignorer laissait passer le defaut.
      //
      // `service-generations` N'Y EST PAS, et c'est delibere : mesure, il est
      // aussi importe par `/api/generateur/etat`, qui ne fait que LIRE une
      // ligne. L'inclure accusait une route qui ne charge rien — un cliquet
      // qui crie a tort finit par etre desarme.
      const indirect =
        /from '@\/lib\/apps\/(dialogue|comprendre|pour|apercu|moteur)'/.test(code)
      if (indirect || code.includes('air-emission')) chargeurs.push(route)
    }
    expect(chargeurs.length).toBeGreaterThan(0)
    for (const route of chargeurs) {
      const liste = (traces as Record<string, string[]>)[route] ?? []
      expect(liste.join(' '), route).toContain('benchmarks/air-emission')
    }
  })

  it("le SDK Anthropic n'est PAS trace : il est importe, donc le bundler le suit", () => {
    // Les deux moitiés de la correction, et elles tiennent ensemble : retirer
    // le tracage SANS l'import rendrait le paquet introuvable, l'inverse le
    // ferait partir deux fois.
    for (const chemins of Object.values(traces)) {
      for (const c of chemins) expect(c).not.toContain('@anthropic-ai/sdk')
    }
    const comprendre = sansCommentaires(
      readFileSync(join(RACINE, 'apps/web/src/lib/apps/comprendre.ts'), 'utf8'),
    )
    expect(comprendre).toContain("import Anthropic from '@anthropic-ai/sdk'")
    // `creerClient` chargeait le SDK derriere un `webpackIgnore`, invisible au
    // bundler. Ce chemin ne doit pas revenir cote serveur.
    expect(comprendre).not.toContain('creerClient')
  })
})
