/**
 * EP-313 — TOUT FICHIER DE WORKFLOW SE PARSE, ET SES ÉTAPES EXISTENT.
 *
 * ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-11-01.
 *
 * J'ai ajouté une étape à `sonde-apres-deploiement.yml` avec un heredoc dont
 * le contenu Python commençait COLONNE 0. Dans un scalaire `run: |`, une
 * ligne non indentée TERMINE le bloc : le fichier devenait invalide.
 *
 * Personne ne l'a vu. La gate complète est passée VERTE — elle ne lit que
 * `ci.yml`, pour en dériver ses propres étapes. Le défaut est parti sur
 * `main`, et c'est GITHUB qui l'a dit, après le push :
 *
 *   X main .github/workflows/sonde-apres-deploiement.yml · 41334251258
 *   X This run likely failed because of a workflow file issue.      (0 s)
 *
 * Mesuré ensuite avec l'analyseur que la gate emploie déjà :
 *   🔴 sonde-apres-deploiement.yml — Implicit keys need to be on a single
 *      line at line 100, column 1
 *
 * ── CE QUE CE CLIQUET FERME, ET POURQUOI IL EST SI PEU CHER.
 *
 * `yaml` est déjà une dépendance (la gate s'en sert pour lire `ci.yml`).
 * Parser TOUS les workflows au lieu d'un seul coûte quelques millisecondes,
 * et transforme « on l'apprend par un run rouge sur main » en « on l'apprend
 * avant le commit ».
 *
 * ── ET IL VÉRIFIE PLUS QUE LA SYNTAXE.
 *
 * Un fichier syntaxiquement valide dont les étapes ont disparu se parse très
 * bien. On exige donc un job, des étapes, et — pour celui qui porte une
 * épreuve d'échec — que son déclenchement manuel existe toujours : c'est lui
 * qui permet de voir la croix rouge sans abîmer la production.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const DOSSIER = join(__dirname, '..', '..', '..', '..', '..', '..', '.github', 'workflows')

const workflows = (): readonly { readonly nom: string; readonly texte: string }[] =>
  readdirSync(DOSSIER)
    .filter((n) => /\.ya?ml$/u.test(n))
    .map((nom) => ({ nom, texte: readFileSync(join(DOSSIER, nom), 'utf8') }))

describe('EP-313 — les workflows sont lisibles par GitHub', () => {
  it('① LE DÉNOMINATEUR EST RÉEL — des workflows sont bien trouvés', () => {
    // Sans ce contrôle, un dossier mal résolu rendrait zéro fichier et les
    // épreuves suivantes passeraient en ne mesurant rien.
    const liste = workflows()
    expect(liste.length, `aucun workflow trouvé dans ${DOSSIER}`).toBeGreaterThanOrEqual(2)
    expect(liste.map((w) => w.nom)).toContain('ci.yml')
  })

  it('② CHACUN SE PARSE — c’est ce que la gate ne vérifiait pas', () => {
    for (const { nom, texte } of workflows()) {
      let erreur = ''
      try {
        parse(texte)
      } catch (e) {
        erreur = e instanceof Error ? e.message.split('\n')[0] : String(e)
      }
      expect(
        erreur,
        `${nom} est invalide — GitHub refusera le run en 0 s en disant seulement ` +
          '« this run likely failed because of a workflow file issue »',
      ).toBe('')
    }
  })

  it('③ CHACUN PORTE UN JOB ET DES ÉTAPES', () => {
    // Un fichier vidé de ses étapes se parse parfaitement, et ne contrôle
    // plus rien. La syntaxe n'est pas la substance.
    for (const { nom, texte } of workflows()) {
      const doc = parse(texte) as { jobs?: Record<string, { steps?: unknown[] }> }
      const jobs = Object.entries(doc.jobs ?? {})
      expect(jobs.length, `${nom} n’a aucun job`).toBeGreaterThan(0)
      for (const [job, def] of jobs) {
        expect((def.steps ?? []).length, `${nom} · job ${job} n’a aucune étape`).toBeGreaterThan(0)
      }
    }
  })

  it('④ LA SONDE GARDE SON DÉCLENCHEMENT MANUEL ET SON ÉPREUVE D’ÉCHEC', () => {
    // C'est lui qui permet de VOIR la croix rouge sans abîmer la production.
    // Il a été ajouté parce que ce contrôle avait été modifié cinq fois sans
    // tourner une seule ; le perdre ramènerait ce silence.
    const texte = readFileSync(join(DOSSIER, 'sonde-apres-deploiement.yml'), 'utf8')
    const doc = parse(texte) as {
      on?: { workflow_dispatch?: { inputs?: Record<string, unknown> } }
    }
    expect(doc.on?.workflow_dispatch, 'le déclenchement manuel a disparu').toBeDefined()
    expect(Object.keys(doc.on?.workflow_dispatch?.inputs ?? {})).toContain('epreuve')
    expect(texte).toContain('divergence_forcee')
  })

  it('⑤ AUCUN HEREDOC NON INDENTÉ DANS UN BLOC `run:`', () => {
    // LA CAUSE EXACTE DU DÉFAUT, prise à la racine plutôt qu'au symptôme.
    // Une ligne colonne 0 à l'intérieur d'un scalaire de bloc le termine ;
    // le parseur le dira, mais ce contrôle-ci NOMME le motif pour que la
    // prochaine personne sache quoi écrire à la place (`python3 -c "…"`).
    for (const { nom, texte } of workflows()) {
      const lignes = texte.split('\n')
      let dansBloc = false
      for (const [i, l] of lignes.entries()) {
        if (/^\s*(run|script):\s*[|>]/u.test(l)) {
          dansBloc = true
          continue
        }
        if (dansBloc && l.trim() !== '' && !/^\s/u.test(l)) {
          // Une ligne non vide sans indentation : hors du bloc. Si c'est du
          // code et pas une clef YAML, le fichier est déjà cassé.
          expect(
            /^[a-z_]+\s*[:=]/iu.test(l) && !l.includes('='),
            `${nom}:${String(i + 1)} — ligne colonne 0 dans un bloc « run: | » : ` +
              `« ${l.slice(0, 40)} ». Un heredoc ne s'indente pas sans casser Python ; ` +
              'employez python3 -c "…" sur une seule ligne.',
          ).toBe(true)
          dansBloc = false
        }
      }
    }
  })
})
