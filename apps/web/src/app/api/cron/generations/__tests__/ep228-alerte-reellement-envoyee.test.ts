/**
 * EP-228 · « NOUS AVONS ÉTÉ PRÉVENUS » DOIT ÊTRE VRAI.
 *
 * ── LA PROMESSE, ET LE FAIT.
 *
 * Sur CHAQUE échec, l'écran affiche : « La génération n'a pas pu aboutir
 * cette fois. Nous avons été prévenus et regardons ce qui s'est passé. »
 *
 * MESURE DU 2026-10-15 : `alerter()` n'était appelée que depuis les routes
 * du chemin SYNCHRONE (`comprendre`, `apercu`). Sur le chemin de
 * l'interface — le seul que le propriétaire utilise — PERSONNE n'était
 * prévenu, jamais.
 *
 * Le fait qui le prouve : à 14:54, une génération est morte sur un refus
 * de l'API (crédit épuisé). Aucun message n'est parti. Le propriétaire ne
 * l'a su qu'en me le demandant, trois heures plus tard.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRÉTEND PAS TENIR.
 *
 * Il n'envoie aucun courriel et ne teste pas le fournisseur d'envoi. Il
 * tient la seule chose qui manquait : que le chemin ASYNCHRONE appelle
 * bien l'alerte sur un échec, et qu'il ne l'appelle PAS quand tout va
 * bien. Le cron tourne toutes les minutes — alerter a chaque tour ferait
 * un courriel par minute, et une alerte qui crie sans cesse est filtrée
 * en une journée. Le filtre est donc la moitié utile du correctif.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const CRON = readFileSync(join(ICI, '..', 'route.ts'), 'utf8')
const SUIVI = readFileSync(
  join(ICI, '..', '..', '..', '..', '..', 'lib', 'apps', 'suivi-generation.ts'),
  'utf8',
)

describe('EP-228 · le chemin asynchrone prévient pour de vrai', () => {
  it('le cron APPELLE alerter', () => {
    expect(
      CRON,
      "le cron ne prévient personne : l'écran promet pourtant qu'on a été prévenu",
    ).toMatch(/alerter\(/u)
  })

  it("il ne prévient QUE sur un échec, jamais sur une tranche saine", () => {
    // CONTRÔLE NÉGATIF : sans filtre, chaque tour du cron enverrait un
    // courriel — soixante par heure, pour des tranches qui vont bien.
    expect(CRON, "aucun filtre sur l'issue : toutes les tranches alerteraient").toMatch(
      /issue === 'refusee'|issue === 'erreur'/u,
    )
  })

  it("une alerte qui échoue ne fait PAS échouer la tranche", () => {
    // Le travail est déjà écrit en base quand on prévient. Laisser une
    // panne d'envoi remonter ferait croire au cron que la tranche a raté,
    // et il la reprendrait — en repayant.
    const avant = CRON.slice(0, CRON.indexOf('alerter('))
    const apres = CRON.slice(CRON.indexOf('alerter('))
    expect(avant.includes('try {'), "l'appel doit vivre dans un try").toBe(true)
    expect(apres, "l'échec d'envoi doit être avalé").toMatch(/catch/u)
  })

  it('la promesse affichée reste cohérente avec ce que le code fait', () => {
    // Si un jour on retire l'alerte, ce contrôle oblige à retirer AUSSI la
    // phrase — ou à assumer de mentir sciemment.
    if (/Nous avons été prévenus/u.test(SUIVI)) {
      expect(
        CRON,
        "l'écran promet d'avoir prévenu, mais le chemin async n'alerte pas",
      ).toMatch(/alerter\(/u)
    }
  })
})
