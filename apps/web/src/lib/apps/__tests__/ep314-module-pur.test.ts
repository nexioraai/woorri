/**
 * EP-314 — UN MODULE DIT PUR N'IMPORTE RIEN, ET C'EST MESURÉ.
 *
 * ── CE QUE CE CLIQUET REMPLACE : UN COMMENTAIRE.
 *
 * `portee-epreuve.ts` est né le 2026-11-01 parce que j'avais rangé une
 * phrase partagée dans `juge-execution.ts` — le juge qui possède les
 * nombres, et qui importe `node:child_process` pour lancer son bac à sable.
 * L'écran de génération porte « use client ». L'import a tiré l'un dans
 * l'autre, et le build est mort sur six lignes d'erreur interne de
 * Turbopack dont aucune ne nommait la cause.
 *
 * J'ai écrit la règle en commentaire dans le fichier neuf : « CE FICHIER
 * N'IMPORTE RIEN ». Le propriétaire l'a refusée pour la bonne raison : un
 * commentaire ne fait échouer rien. Dans trois semaines, quelqu'un — moi —
 * y ajoute un import, et le commentaire le regarde faire.
 *
 * « Un garde qui signale doit faire échouer quelque chose. »
 *
 * ── POURQUOI UN CLIQUET DE TEXTE SUFFIT ICI.
 *
 * La gate attrape déjà cette classe — à l'étape `build`, après huit minutes,
 * avec un message illisible. Ce cliquet la rend rouge en quelques
 * millisecondes, et le message DIT quoi faire.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Les modules qui doivent rester chargeables par un paquet navigateur.
 *
 * Liste FERMÉE et courte : un module n'y entre que parce qu'un composant
 * client l'importe. L'allonger sans ce besoin ferait de la pureté une
 * esthétique au lieu d'une contrainte.
 */
const PURS = ['portee-epreuve.ts', 'nom-produit.ts', 'versions-oeuvre.ts'] as const

describe('EP-314 — les modules purs le restent', () => {
  it('① RIEN DE SERVEUR N’EST ATTEIGNABLE — contrôle TRANSITIF', () => {
    // ── MON PREMIER CRITÈRE ÉTAIT FAUX, ET CE CLIQUET L'A DIT.
    //
    // J'avais écrit « zéro ligne import ». `nom-produit.ts` a immédiatement
    // rougi : il importe `sous-domaine.ts`, qui est pur lui aussi. Un module
    // pur PEUT importer un module pur — ce qui le tue, c'est d'atteindre du
    // serveur, directement ou par un intermédiaire.
    //
    // Le critère est donc celui que le build applique : rien de `node:`,
    // aucun client Supabase, ATTEIGNABLE depuis le module. C'est ce
    // parcours-là qui aurait attrapé le défaut d'origine —
    // `juge-execution.ts` n'importait pas `node:child_process` « à côté »,
    // il l'importait, point.
    const INTERDIT = /^import[^']*'(node:[^']*|[^']*supabase(-admin)?)'/u
    for (const depart of PURS) {
      const vus = new Set<string>()
      const chemin = new Map<string, string>()
      // Le type est ELARGI a dessein : la file recoit les voisins locaux,
      // pas seulement les deux noms de la liste fermee.
      const file: string[] = [depart]
      let faute: string | null = null
      while (file.length > 0 && faute === null) {
        const nom = file.shift() as string
        if (vus.has(nom)) continue
        vus.add(nom)
        const code = readFileSync(join(__dirname, '..', nom), 'utf8')
        for (const ligne of code.split('\n').map((l) => l.trim())) {
          if (!/^import\b/u.test(ligne)) continue
          if (INTERDIT.test(ligne)) {
            faute = `${nom} → ${ligne}`
            break
          }
          // On ne suit que les voisins LOCAUX : un paquet npm pur reste pur,
          // et suivre node_modules ferait de ce cliquet un analyseur.
          const rel = /from '\.\/([a-zA-Z0-9_-]+)'/u.exec(ligne)
          if (rel !== null) {
            chemin.set(`${rel[1]}.ts`, nom)
            file.push(`${rel[1]}.ts`)
          }
        }
      }
      const par = faute === null ? '' : ` (atteint depuis ${depart} via ${[...chemin.keys()].join(' → ') || 'lui-même'})`
      expect(
        faute,
        `${depart} doit rester chargeable par un composant « use client » : ` +
          `un import de node:… ou d'un client Supabase tue le build, et ` +
          `Turbopack ne nomme pas la cause.${par}`,
      ).toBe(null)
    }
  })

  it('② LE DÉNOMINATEUR EST RÉEL — les fichiers existent et portent du code', () => {
    // Un chemin faux rendrait une chaîne vide, zéro import, et le cliquet
    // passerait en ne mesurant rien.
    for (const nom of PURS) {
      const code = readFileSync(join(__dirname, '..', nom), 'utf8')
      expect(code.length, `${nom} est vide`).toBeGreaterThan(400)
      expect(code, `${nom} n’exporte rien`).toMatch(/export /u)
    }
  })

  it('③ LA PHRASE PARTAGÉE EST BIEN CELLE DU MODULE PUR', () => {
    // Le juge la RE-EXPORTE : ses appelants d'hier ne changent pas, et il
    // n'y a toujours qu'une source. Si cette ré-exportation disparaissait,
    // quelqu'un recopierait la phrase — et deux phrases divergent.
    const juge = readFileSync(join(__dirname, '..', 'juge-execution.ts'), 'utf8')
    expect(juge).toMatch(/export \{ proportionEprouvee \} from '\.\/portee-epreuve'/u)
    const ecran = readFileSync(
      join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    // L'écran l'importe du module PUR, jamais du juge.
    expect(ecran).toContain("from '@/lib/apps/portee-epreuve'")
    expect(ecran.includes("proportionEprouvee } from '@/lib/apps/juge-execution'")).toBe(false)
  })
})
