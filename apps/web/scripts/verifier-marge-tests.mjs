// ============================================================
// CLIQUET — UN TEST LENT SE VOIT ICI, PLUS EN CI.
//
// LE DÉFAUT PAYÉ DEUX FOIS, À DEUX JOURS D'INTERVALLE :
//
//   2026-09-21  `api/domains/status` : une sonde RÉSEAU réelle, 8 s de délai
//               contre 5 s de budget. Verte en local, rouge en CI.
//   2026-09-23  `lib/images/traitement` : 12 encodages d'images, 4380 ms
//               mesurés — 10 % de marge. Verte en local, rouge en CI.
//
// LA CAUSE EST LA MÊME LES DEUX FOIS, et ce n'est pas le réseau ni l'image :
// **je vérifie sur une machine qui n'est pas celle qui juge.** Un portable est
// rapide et connecté ; un runner partagé est lent et cloisonné. Tout ce qui
// dépend du TEMPS ou du MONDE EXTÉRIEUR diffère — et c'est invisible en local,
// par construction. `vitest.setup.ts` a fermé l'axe RÉSEAU. Celui-ci ferme
// l'axe TEMPS.
//
// ── POURQUOI UN SEUIL À 3× ET PAS « ça passe ».
//
// Un runner partagé tourne couramment 2 à 3 fois plus lentement qu'un portable.
// Un test qui consomme plus du TIERS de son budget ici tombera là-bas. La marge
// n'est pas du confort : c'est la seule façon de mesurer sur une machine ce qui
// s'exécutera sur une autre.
//
// ── CE QUE CE CLIQUET NE SAIT PAS FAIRE, ET COMMENT ON LE COMPENSE.
//
// Il ne distingue pas un test LENT (calcul) d'un test qui ATTEND (minuteur).
// Les deux durent, seul le premier ralentit sur une machine lente :
// `resolveShipping` dure 3000 ms ici et 3000 ms partout, parce qu'il attend un
// délai qu'il a lui-même armé. La distinction est donc portée par un REGISTRE
// écrit à la main — et c'est voulu : y inscrire un test oblige son auteur à
// dire POURQUOI il est lent. C'est exactement la question que je ne me suis
// pas posée deux fois de suite.
// ============================================================
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const RAPPORT = join(ICI, '..', 'vitest-results.json')

/** Budget par défaut de vitest, en millisecondes. */
const BUDGET = 5000

/** Marge exigée : un test doit tenir dans le tiers de son budget. */
const MARGE = 3
const PLAFOND = BUDGET / MARGE

/**
 * REGISTRE DES LENTEURS CONNUES — chacune avec sa RAISON.
 *
 * Y entrer n'est pas une formalité : c'est déclarer qu'on a regardé pourquoi le
 * test est lent, et que la lenteur est de nature à ne PAS empirer sur une
 * machine plus lente. Un test qui calcule n'a rien à faire ici — il doit être
 * allégé, comme `traitement.test.ts` l'a été (4380 ms → 157 ms).
 *
 * État mesuré le 2026-09-23.
 */
const CONNUS = [
  {
    motif: /cjFetch[\s\S]*timeout/u,
    plafond: 16_000,
    raison:
      'ATTENTE de minuteur, et le test déclare son propre délai : il éprouve ' +
      'le comportement d’expiration d’un fournisseur. Dure autant partout.',
  },
  {
    motif: /quoteInvariants/u,
    plafond: 4000,
    raison: 'ATTENTE d’un délai armé par le test lui-même. Ne ralentit pas sur machine lente.',
  },
  {
    motif: /resolveShipping[\s\S]*DELAI MAXIMAL/u,
    plafond: 3600,
    raison: 'ATTENTE de 3 s, armée par le test : c’est le fait qu’il mesure.',
  },
  {
    motif: /checkout\/__tests__\/characterization/u,
    plafond: 2800,
    raison: 'ATTENTE de ~2,2 s par cas (délais d’idempotence simulés).',
  },
]

if (!existsSync(RAPPORT)) {
  console.error(
    `Rapport introuvable : ${RAPPORT}\n` +
      'Lancez d’abord : npx vitest run --reporter=json --outputFile=vitest-results.json',
  )
  process.exit(2)
}

const rapport = JSON.parse(readFileSync(RAPPORT, 'utf8'))

/** Tous les cas, aplatis, avec leur fichier et leur durée. */
const cas = []
for (const fichier of rapport.testResults ?? []) {
  const chemin = String(fichier.name ?? '').replace(`${process.cwd()}/`, '')
  for (const t of fichier.assertionResults ?? []) {
    cas.push({
      nom: `${chemin} > ${String(t.fullName ?? t.title ?? '')}`,
      ms: Number(t.duration ?? 0),
    })
  }
}

if (cas.length < 100) {
  // Sans ce garde-fou, un rapport vide ou tronqué rendrait ce cliquet
  // trivialement vert — c'est-à-dire inutile.
  console.error(`Seulement ${String(cas.length)} cas lus : le rapport est incomplet, refus de conclure.`)
  process.exit(2)
}

const lents = cas.filter((c) => c.ms > PLAFOND).sort((a, b) => b.ms - a.ms)
const echecs = []

for (const c of lents) {
  const connu = CONNUS.find((k) => k.motif.test(c.nom))
  if (!connu) {
    echecs.push(
      `  ${String(Math.round(c.ms)).padStart(6)} ms  ${c.nom}\n` +
        `          → marge ×${(BUDGET / c.ms).toFixed(1)} seulement. Allégez la fixture, ou\n` +
        '            inscrivez ce test au registre de `verifier-marge-tests.mjs` EN DISANT POURQUOI.',
    )
  } else if (c.ms > connu.plafond) {
    echecs.push(
      `  ${String(Math.round(c.ms)).padStart(6)} ms  ${c.nom}\n` +
        `          → registre : ${String(connu.plafond)} ms. Cette lenteur EMPIRE.`,
    )
  }
}

console.log(`marge des tests : ${String(cas.length)} cas · plafond ${String(PLAFOND)} ms (×${String(MARGE)} sur ${String(BUDGET)} ms)`)
console.log(`  ${String(lents.length)} au-dessus du plafond, dont ${String(lents.length - echecs.length)} au registre`)

if (echecs.length > 0) {
  console.error('\n🔴 TESTS TROP LENTS — ils tomberont sur un runner plus lent :\n')
  console.error(echecs.join('\n'))
  console.error(
    '\nUn test vert en local et rouge en CI est PIRE qu’un test rouge :\n' +
      'on finit par ne plus lire le CI du tout.',
  )
  process.exit(1)
}

console.log('  🟢 tous les cas tiennent dans leur marge.')
