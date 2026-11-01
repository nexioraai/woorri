/**
 * EP-310 — TOUT STATUT QUE LE CODE ÉCRIT, LA BASE L'ACCEPTE.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-01 DEVANT LE PROPRIÉTAIRE.
 *
 * Une suppression a échoué, bandeau rouge : « la suppression a échoué —
 * rien n'a changé ». Sur la vraie table :
 *
 *   UPDATE {"statut":"supprimee"} → 23514
 *     violates check constraint "app_generations_statut_valide"
 *   UPDATE {"statut":"annulee"}   → 23514   (la MÊME contrainte)
 *
 * Le lot de suppression avait inventé DEUX statuts que la contrainte
 * refuse. Le DDL qui porte cette liste est versionné à deux fichiers de là
 * (`journal.ts`), et je ne l'ai pas lu.
 *
 * ── POURQUOI LE CLIQUET VOISIN NE L'A PAS VU.
 *
 * `journal.test.ts` confronte depuis longtemps le SQL au code — mais il
 * compare des COLONNES. Une colonne manquante faisait rougir ; une VALEUR
 * interdite dans une colonne contrainte, non. Le trou était dans la nature
 * de la comparaison, pas dans son absence.
 *
 * ── CE QUE CELUI-CI COMPARE, ET IL LE DÉRIVE.
 *
 * D'un côté la liste du `check (statut in …)`, lue dans le SQL émis. De
 * l'autre, tous les statuts que le code écrit, lus dans les sources. Aucune
 * des deux listes n'est recopiée ici : les recopier reproduirait exactement
 * la faute qu'on ferme.
 */
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { SQL_TABLE } from '../journal'

/** Le code de la route, LU — l'importer exigerait les clefs Supabase. */
const SOURCE_ROUTE = execFileSync('cat', ['src/app/api/generateur/supprimer/route.ts'], {
  cwd: new URL('../../../..', import.meta.url).pathname,
  encoding: 'utf8',
})

/** Le statut des œuvres supprimées, relevé dans la route plutôt que recopié. */
const STATUT_SUPPRIMEE = /STATUT_SUPPRIMEE = '([a-z_]+)'/u.exec(SOURCE_ROUTE)?.[1] ?? ''

/** Les statuts que la base accepte, LUS dans le DDL versionné. */
function statutsDuDdl(): readonly string[] {
  const m = /check \(statut in \(([^)]*)\)\)/u.exec(SQL_TABLE)
  if (m === null) return []
  return [...m[1].matchAll(/'([a-z_]+)'/gu)].map((x) => x[1])
}

/**
 * Les statuts que le code ÉCRIT dans la colonne, relevés sur le disque.
 *
 * On ne retient que les écritures de la colonne (`statut: 'x'` dans un objet
 * d'`update`/`insert`), ce qui écarte les champs `statut` d'autres objets —
 * l'élicitation en a un, avec ses propres valeurs (`aucune_question`), qui
 * ne touche aucune table.
 */
function statutsEcrits(): readonly string[] {
  const sortie = execFileSync(
    'grep',
    [
      '-rhoE',
      "statut: '[a-z_]+'",
      '--include=*.ts',
      '--include=*.tsx',
      // LES TESTS SONT EXCLUS, et c'est volontaire : une fixture pose les
      // statuts qu'elle veut pour éprouver un chemin. Ce cliquet juge ce qui
      // part en PRODUCTION.
      '--exclude-dir=__tests__',
      '--exclude=*.obs.tsx',
      '--exclude=*.verif.mts',
      // ── LA SONDE DE SCHÉMA EST EXCLUE, ET C'EST SON MÉTIER QUI L'EXIGE.
      //
      // `schema-vivant.ts` écrit `statut: 'statut_qui_nexiste_pas'` POUR
      // qu'il soit refusé : c'est ainsi qu'on exerce la contrainte. Le
      // compter comme un statut du produit ferait rougir ce cliquet pour la
      // pièce même qui mesure la contrainte. L'exclusion est nommée ici
      // plutôt que devinée par un filtre.
      '--exclude=schema-vivant.ts',
      'src',
    ],
    { cwd: new URL('../../../..', import.meta.url).pathname, encoding: 'utf8' },
  )
  const vus = new Set<string>()
  for (const l of sortie.split('\n')) {
    const m = /statut: '([a-z_]+)'/u.exec(l)
    // `aucune_question` est le statut du PRÉ-VOL, pas de la table : il ne
    // part dans aucune requête. Le nommer ici est la seule exception, et
    // elle est écrite plutôt que devinée.
    if (m !== null && m[1] !== 'aucune_question') vus.add(m[1])
  }
  return [...vus]
}

describe('EP-310 — les statuts du code et ceux de la base', () => {
  it('① AUCUN STATUT ÉCRIT N’EST REFUSÉ PAR LA CONTRAINTE', () => {
    const acceptes = statutsDuDdl()
    expect(acceptes.length, 'la liste du check n’a pas été trouvée dans le SQL').toBeGreaterThan(3)
    const ecrits = statutsEcrits()
    expect(ecrits.length, 'aucune écriture de statut trouvée dans les sources').toBeGreaterThan(3)
    const refuses = ecrits.filter((v) => !acceptes.includes(v))
    expect(
      refuses,
      'statut(s) que le code écrit et que la base refuse (erreur 23514 en ligne) : ' +
        refuses.join(', ') +
        ' — allongez le check de `sqlPour` dans journal.ts, PUIS appliquez le SQL',
    ).toEqual([])
  })

  it('② LES DEUX STATUTS DU LOT DE SUPPRESSION Y SONT', () => {
    // Nommés explicitement : ce sont eux qui ont échoué en production, et un
    // cliquet dérivé seul ne dirait pas lequel manquait.
    const acceptes = statutsDuDdl()
    expect(acceptes, 'le statut des œuvres supprimées').toContain(STATUT_SUPPRIMEE)
    expect(acceptes, 'le statut d’une génération arrêtée').toContain('annulee')
  })

  it('③ LA CONTRAINTE SE REMPLACE, elle ne se crée pas « si absente »', () => {
    // LE PIÈGE QUI AURAIT SURVÉCU AU CORRECTIF : `do $$ … exception when
    // duplicate_object then null` ne fait RIEN quand la contrainte existe
    // déjà. Allonger la liste sans `drop` laisserait le dépôt dire six
    // statuts pendant que la base en refuse deux — et l'écart serait
    // invisible jusqu'à la prochaine suppression ratée.
    const drop = SQL_TABLE.search(/drop constraint if exists \w+_statut_valide/u)
    const ajout = SQL_TABLE.search(/add constraint\s+\w+_statut_valide/u)
    expect(ajout, 'la contrainte de statut a disparu du SQL').toBeGreaterThan(0)
    expect(
      drop,
      'la contrainte de statut n’est pas déposée avant d’être reposée : allonger sa liste ne changerait rien sur une base déjà posée',
    ).toBeGreaterThan(0)
    expect(drop, 'le drop vient APRÈS le add — l’ordre annulerait la contrainte').toBeLessThan(ajout)
  })

  it('④ LA ROUTE DE SUPPRESSION DIT LA CAUSE, pas une phrase générique', () => {
    // Le bandeau disait « la suppression a échoué — rien n'a changé » : vrai,
    // et inutile. L'erreur de Postgres nommait la contrainte, et la route la
    // jetait. Une journée perdue pour un message qui existait déjà.
    const bloc = SOURCE_ROUTE.slice(SOURCE_ROUTE.indexOf('if (efface.error !== null)'))
    expect(bloc).toMatch(/efface\.error\.(message|code)/u)
    // ET LE CODE 23514 EST NOMMÉ : c'est le seul cas où l'on peut dire le
    // geste à faire au lieu de rendre un numéro d'erreur.
    expect(bloc).toContain("'23514'")
  })

  it('⑤ TOUTE COLONNE QU’UNE ROUTE ÉCRIT EST DÉCLARÉE DANS LE DDL', () => {
    // LE TROU TROUVÉ LE 2026-11-01, EN REMETTANT LA JUMELLE À NIVEAU :
    // `publication_slug` est écrit par quatre routes et n'était déclaré
    // NULLE PART dans `sqlPour`. La vraie table ne le portait que parce
    // qu'il y avait été ajouté à la main, un jour, dans la console — donc
    // toute base reconstruite depuis le dépôt naissait sans la colonne qui
    // tient la quarantaine des noms.
    //
    // Le cliquet voisin (`journal.test.ts`) comparait le SQL au code depuis
    // des mois, mais il ne lisait que l'INSERT du journal. Une colonne qui
    // ne s'écrit qu'en UPDATE, depuis une route, passait dessous.
    const racine = new URL('../../../..', import.meta.url).pathname
    const fichiers = execFileSync(
      'grep',
      ['-rl', 'TABLE_GENERATIONS', '--include=*.ts', 'src/app', 'src/lib'],
      { cwd: racine, encoding: 'utf8' },
    )
      .split('\n')
      .filter((f) => f !== '' && !f.includes('__tests__'))

    // ON NE SUIT QUE LA CHAÎNE DE CETTE TABLE. Un fichier qui parle de
    // `TABLE_GENERATIONS` écrit souvent aussi ailleurs (`ai_usage`, `sites`)
    // — compter ces colonnes-là accuserait ce DDL de colonnes qui ne sont
    // pas les siennes. On part donc de chaque `from(TABLE_GENERATIONS)` et
    // on lit le premier `update`/`insert` de la même chaîne.
    //
    // LIMITE CONNUE, ÉCRITE PLUTÔT QUE TAIRE : `travailleur.ts` passe par un
    // helper `t()` dont la table est injectée, et ses écritures échappent à
    // ce relevé. Le cliquet voisin de `journal.test.ts` couvre son insert.
    const ecrites = new Set<string>()
    for (const f of fichiers) {
      const code = execFileSync('cat', [f], { cwd: racine, encoding: 'utf8' })
      let depart = code.indexOf('from(TABLE_GENERATIONS)')
      while (depart >= 0) {
        const fenetre = code.slice(depart, depart + 500)
        const verbe = /\.(update|insert)\(\{/u.exec(fenetre)
        if (verbe !== null) {
          let profondeur = 0
          let j = depart + (verbe.index ?? 0) + verbe[0].length - 1
          for (; j < code.length; j += 1) {
            const c = code[j]
            if (c === '{') profondeur += 1
            else if (c === '}') { profondeur -= 1; if (profondeur === 0) break }
            else if (profondeur === 1 && /[a-z_]/u.test(c)) {
              // Clefs de PREMIER niveau seulement : `sections_acquises` porte
              // des clefs internes qui ne sont pas des colonnes.
              const m = /^([a-z_]+)\s*:/u.exec(code.slice(j))
              if (m !== null) { ecrites.add(m[1]); j += m[0].length - 1 }
            }
          }
        }
        depart = code.indexOf('from(TABLE_GENERATIONS)', depart + 1)
      }
    }
    expect(ecrites.size, 'aucune écriture de colonne trouvée').toBeGreaterThan(5)

    // ── ON CHERCHE UNE DÉCLARATION, PAS UNE OCCURRENCE.
    //
    // MA PREMIÈRE VERSION TESTAIT `SQL_TABLE.includes(colonne)` — et elle
    // est restée VERTE pendant la mutation, parce que le nom de la colonne
    // apparaissait dans un COMMENTAIRE du DDL. Un contrôle qui se satisfait
    // de sa propre prose ne mesure rien. On retire donc les commentaires,
    // et on ne retient que les deux formes qui DÉCLARENT vraiment.
    const sansCommentaires = SQL_TABLE.replace(/^\s*--.*$/gmu, '')
    const declarees = new Set([
      ...[...sansCommentaires.matchAll(/add column if not exists\s+([a-z_]+)/gu)].map((m) => m[1]),
      ...[...sansCommentaires.matchAll(
        /^\s{2,}([a-z_]+)\s+(uuid|text|jsonb|boolean|integer|numeric|timestamptz)/gmu,
      )].map((m) => m[1]),
    ])
    expect(declarees.size, 'aucune colonne déclarée trouvée dans le DDL').toBeGreaterThan(10)
    const absentes = [...ecrites].filter((c) => !declarees.has(c))
    expect(
      absentes,
      'colonne(s) écrite(s) par le code et absente(s) du DDL de `sqlPour` — ' +
        'une base reconstruite depuis le dépôt ne les aurait pas : ' + absentes.join(', '),
    ).toEqual([])
  })
})
