/**
 * EP-329 · CE QU'ON IMPORTE ICI EST DÉCLARÉ ICI.
 *
 * ── LA PANNE, ET ELLE A DURÉ DIX-SEPT HEURES.
 *
 *   ./apps/web/src/lib/apps/poser-oeuvre.ts:54
 *   Error: Module not found: Can't resolve 'pg'
 *   trace : poser-oeuvre.ts → api/generateur/publier/route.ts
 *
 * Quatre déploiements de suite ont échoué. La production a continué de
 * servir un commit vieux de dix-sept heures — ni D4 ni D5 n'étaient en
 * ligne — pendant que la gate locale était VERTE à chaque fois.
 *
 * ── POURQUOI LA GATE NE POUVAIT PAS LE VOIR.
 *
 *   La gate construit dans un arbre où tout est remonté à la racine.
 *   Vercel construit l'espace de travail SEUL. Une dépendance employée
 *   ici mais déclarée ailleurs est invisible en local et fatale en
 *   production.
 *
 * `pg` vivait dans les `devDependencies` de la RACINE. En local, npm le
 * remonte dans `node_modules/` et tout résout. Sur Vercel, `apps/web` est
 * installé seul : le paquet n'existe pas.
 *
 * Ce n'est donc pas un oubli isolé, c'est une CLASSE — et elle est
 * silencieuse par construction, parce que l'endroit où on la mesure n'est
 * pas l'endroit où elle casse.
 *
 * ── CE QUE CE CONTRÔLE MESURE, ET CE QU'IL NE PEUT PAS MESURER.
 *
 * Il lit du SOURCE, et il le dit. L'artefact qui trancherait vraiment —
 * l'installation isolée de l'espace de travail — n'existe que chez Vercel :
 * la reproduire ici coûterait un `npm ci` dans un arbre élagué à chaque
 * gate, pour une propriété qu'une lecture statique donne exactement.
 *
 * Il dépouille donc commentaires, gabarits et chaînes avant de chercher —
 * sans quoi il compte les faux imports des fixtures (mesuré : un premier
 * relevé annonçait vingt-huit « paquets manquants » dont `lodash`, `moment`
 * et `@expo/vector-icons`, tous écrits À L'INTÉRIEUR de chaînes de test qui
 * servent justement à prouver qu'on les refuse).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { importsDe, paquetDe } from '../../apps/ecriture-directe'

const RACINE = join(__dirname, '..', '..', '..', '..')

/** Retire ce qui RESSEMBLE à du code sans en être : prose, gabarits, chaînes. */
const sansTexte = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/gu, '``')
    .replace(/'(?:\\.|[^'\\\n])*'(?=\s*[,)\]};:])/gu, "''")
    .replace(/"(?:\\.|[^"\\\n])*"(?=\s*[,)\]};:])/gu, '""')

/** Un nom de paquet npm valide — ce qui écarte les débris d'expressions régulières. */
const NOM_NPM = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u

/** Les modules du moteur Node, avec ou sans le préfixe moderne. */
const NATIFS = new Set([
  'assert', 'buffer', 'child_process', 'crypto', 'dns', 'events', 'fs', 'http', 'https',
  'module', 'net', 'os', 'path', 'process', 'readline', 'stream', 'timers', 'tls', 'url',
  'util', 'worker_threads', 'zlib',
])

const fichiersDe = (d: string, out: string[] = []): string[] => {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.next') continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) fichiersDe(p, out)
    else if (/\.(tsx?|mjs|jsx)$/u.test(e)) out.push(p)
  }
  return out
}

const manifeste = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
const DEP = new Set(Object.keys(manifeste.dependencies ?? {}))
const DEV = new Set(Object.keys(manifeste.devDependencies ?? {}))
const FICHIERS = fichiersDe(join(RACINE, 'src'))

type Usage = { readonly paquet: string; readonly fichier: string; readonly test: boolean }

const USAGES: Usage[] = []
for (const f of FICHIERS) {
  const test = /__tests__|\.test\.|\.tir\./u.test(f)
  for (const i of importsDe(sansTexte(readFileSync(f, 'utf8')))) {
    if (i.startsWith('.') || i.startsWith('@/') || i.startsWith('data:') || i.startsWith('\0')) continue
    const p = i.startsWith('node:') ? i.slice(5).split('/')[0] : paquetDe(i)
    if (p === undefined || NATIFS.has(p) || !NOM_NPM.test(p)) continue
    USAGES.push({ paquet: p, fichier: f.replace(`${RACINE}/`, ''), test })
  }
}

describe('EP-329 · les dépendances de cet espace de travail', () => {
  it('① LE DÉNOMINATEUR EST RÉEL — sans lui, tout ce qui suit passerait à vide', () => {
    expect(FICHIERS.length, 'plus aucun fichier lu').toBeGreaterThan(500)
    expect(USAGES.length, 'plus aucun import vu : le dépouillage a tout mangé').toBeGreaterThan(200)
    // ET LE CAS QUI A CASSÉ LA PRODUCTION EST BIEN VU : si `poser-oeuvre`
    // cessait d'être lu, ce contrôle deviendrait décoratif.
    expect(
      USAGES.some((u) => u.paquet === 'pg' && u.fichier.endsWith('apps/poser-oeuvre.ts')),
      'l’import qui a gelé la production n’est plus vu par ce contrôle',
    ).toBe(true)
  })

  it('② TOUT IMPORT NU RÉSOUT VERS UN PAQUET DÉCLARÉ ICI', () => {
    const absents = [...new Set(USAGES.filter((u) => !DEP.has(u.paquet) && !DEV.has(u.paquet)))]
    const dits = absents.map((u) => `${u.paquet} (${u.fichier})`)
    expect(
      dits,
      'paquet(s) importés dans apps/web et déclarés nulle part dans son package.json. ' +
        'En local npm les remonte depuis la racine et tout marche ; sur Vercel, qui ' +
        'installe cet espace de travail SEUL, le build échoue sur « Module not found »',
    ).toEqual([])
  })

  it('③ LE CODE DE PRODUCTION N’EMPLOIE PAS UN PAQUET DE DÉVELOPPEMENT', () => {
    // ── LA MOITIÉ DU DÉFAUT QUE LE PREMIER CONTRÔLE NE VOIT PAS.
    //
    // Vercel installe les `devDependencies` POUR CONSTRUIRE, puis ne garde
    // que les `dependencies` à l'exécution. Un paquet de développement
    // employé par une route construit sans broncher et meurt au premier
    // appel — plus tard, et chez l'utilisateur.
    const fautifs = USAGES.filter((u) => !u.test && !DEP.has(u.paquet) && DEV.has(u.paquet))
    expect(
      [...new Set(fautifs.map((u) => `${u.paquet} (${u.fichier})`))],
      'paquet(s) de développement employés par du code de production : le build passe, ' +
        'l’exécution échoue',
    ).toEqual([])
  })

  it('④ « DÉPLOYÉ » SE MESURE — la route qui rend l’empreinte servie existe', () => {
    // ── POURQUOI UN CLIQUET SUR UNE ROUTE DE VERSION.
    //
    // Pendant les dix-sept heures de gel, mes rapports disaient « déployé »
    // en comparant deux empreintes GIT. Git disait vrai ; le déploiement,
    // non. Et aucun instrument ne permettait de lire ce qui était servi :
    // pas de CLI, pas d'identifiant de construction lisible.
    //
    // Sans instrument, « déployé » ne peut être qu'une déduction.
    const route = readFileSync(join(RACINE, 'src', 'app', 'api', 'version', 'route.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^[ \t]*\/\/.*$/gmu, '')
    // ── L'EMPREINTE EST LUE PAR UNE DÉRIVATION PARTAGÉE (étape 2, 2026-11-13).
    //
    // La ligne de génération enregistre désormais le déploiement qui l'a
    // servie (la ligne c4522e43 ne pouvait pas dire le sien). Pour que ce
    // que la ligne écrit et ce que cette route affiche ne divergent jamais,
    // la lecture de `VERCEL_GIT_COMMIT_SHA` vit dans lib/apps/deploiement.ts
    // et la route l'appelle. La propriété de ce cliquet est intacte : la
    // route rend l'empreinte SERVIE — elle la lit, par cette fonction.
    expect(route, 'la route ne lit plus l’empreinte du commit').toContain('commitDuDeploiement(process.env)')
    const derivation = readFileSync(join(RACINE, 'src', 'lib', 'apps', 'deploiement.ts'), 'utf8')
    expect(derivation, 'la dérivation partagée ne lit pas l’empreinte du commit').toContain('VERCEL_GIT_COMMIT_SHA')
    expect(route, 'une empreinte mise en cache dirait l’ancien déploiement').toMatch(
      /force-dynamic|no-store/u,
    )
    // ET RIEN D'AUTRE NE SORT : une route de diagnostic qui grossit devient
    // une fuite. Sept signes sur un dépôt privé ne donnent de prise à
    // personne ; une variable de plus, si.
    // Depuis la dérivation partagée, la route ne lit AUCUNE variable en
    // direct : `process.env` passe entier à `commitDuDeploiement`, qui ne
    // rend que sept signes. Une lecture directe ici contournerait la
    // dérivation unique ; une clef de plus dans la réponse serait la fuite.
    const autresVariables = [...route.matchAll(/process\.env\.(\w+)/gu)].map((m) => m[1])
    expect(autresVariables, 'la route de version lit une variable en direct — la dérivation partagée est contournée').toEqual([])
    expect(route, 'la route de version expose autre chose que l’empreinte').toMatch(
      /NextResponse\.json\(\s*\{\s*commit:\s*commitDuDeploiement\(process\.env\)\s*\}/u,
    )
  })
})
