/**
 * (c) · LE JUGE QUI OUVRE UN VRAI NAVIGATEUR.
 *
 * ── POURQUOI IL EXISTE, ET CE QU'IL N'EST PAS.
 *
 * Il vient À CÔTÉ du simulateur, jamais à sa place. Le simulateur reste
 * rapide et gratuit ; le navigateur dit la vérité. Deux instruments,
 * deux rôles.
 *
 * ── L'ANGLE MORT QU'IL FERME, MESURÉ LE 2026-11-05.
 *
 *   le paquet embarqué : `globalThis.navigator.locks.request(…)` ×3
 *   happy-dom          : `navigator.locks` ABSENT
 *   un cadre isolé     : PRÉSENT, et `request()` refuse
 *   Safari             : `request@[native code]`
 *
 *   « Une API absente ne se teste pas. Le SDK prenait son chemin de
 *     repli, et le juge ne voyait ni succès ni échec. »
 *
 * Un juge aveugle par ABSENCE est pire qu'un juge permissif : le
 * permissif laisse passer, l'absent ne regarde même pas, et rien dans
 * son vert ne dit qu'il n'a rien regardé.
 *
 * ── LE CADRE EST CELUI DE L'APERÇU, AU SIGNE PRÈS.
 *
 * `sandbox="allow-scripts"` sans `allow-same-origin` : origine opaque,
 * stockage refusé, Web Locks refusés. Changer un seul mot de cet
 * attribut referait exactement le défaut qu'on vient de nommer — un
 * juge qui n'exécute pas dans les conditions du produit.
 *
 * ── ET LE RÉSEAU RESTE OUVERT, contrairement au simulateur.
 *
 * C'est la DEUXIÈME différence qu'on avait mesurée : le simulateur
 * refuse le réseau par conception, donc tout chemin d'authentification y
 * court-circuite avant d'atteindre les verrous. Ici on le laisse
 * joignable — c'est ce qui permet d'atteindre la ligne qui jette.
 *
 * Mais AUCUNE requête ne part vers un vrai service : la page est servie
 * depuis `about:blank` et toute requête sortante est INTERCEPTÉE et
 * refusée par le navigateur lui-même. On obtient donc l'échec RÉEL
 * d'une origine opaque, sans toucher à la base de personne.
 */
import { readFile, writeFile } from 'node:fs/promises'

const [, , cheminBundle, cheminSortie, attenteMs] = process.argv
const attente = Number(attenteMs ?? '4000')

const rendre = async (verdict) => {
  await writeFile(cheminSortie, JSON.stringify(verdict), 'utf8')
  process.exit(0)
}

let chromium
try {
  ;({ [process.env.JUGE_MOTEUR ?? 'webkit']: chromium } = await import('playwright'))
} catch (e) {
  // ── L'ABSENCE SE DIT, ELLE NE SE TAIT PAS.
  //
  // Un juge qui ne peut pas tourner doit le DIRE : son silence se
  // lirait comme « aucun défaut », et c'est précisément la faute qu'il
  // existe pour fermer.
  await rendre({
    aTourne: false,
    motif: `playwright est absent : ${e instanceof Error ? e.message : String(e)}`,
    erreurs: [],
  })
}

const code = await readFile(cheminBundle, 'utf8')

let navigateur
try {
  navigateur = await chromium.launch()
} catch (e) {
  await rendre({
    aTourne: false,
    motif: `le navigateur n’a pas démarré : ${e instanceof Error ? e.message : String(e)}`,
    erreurs: [],
  })
}

const erreurs = []
try {
  const page = await navigateur.newPage()

  // ── TOUTE SORTIE EST COUPÉE, AU NIVEAU DU NAVIGATEUR.
  //
  // On veut l'échec d'une origine opaque, pas une requête vers la base
  // d'un client. Le refus vient du navigateur, donc l'application le
  // rencontre exactement comme un réseau coupé — ce qui est aussi un
  // cas réel.
  await page.route('**/*', (r) => {
    const u = r.request().url()
    if (u.startsWith('about:') || u.startsWith('data:')) return r.continue()
    return r.abort()
  })

  // L'erreur peut naître DANS le cadre : on écoute la page ET ses cadres.
  page.on('pageerror', (e) => {
    erreurs.push({
      message: String(e.message ?? e).slice(0, 400),
      pile: String(e.stack ?? '').split('\n').slice(0, 6).join(' | ').slice(0, 600),
    })
  })
  page.on('console', (m) => {
    if (m.type() === 'error') {
      erreurs.push({ message: `[console] ${m.text().slice(0, 300)}`, pile: '' })
    }
  })

  await page.goto('about:blank')
  // ── LE MÊME ATTRIBUT QUE L'APERÇU, AU SIGNE PRÈS.
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><body><iframe id="cadre" sandbox="allow-scripts" srcdoc=""></iframe></body>`,
  )
  await page.evaluate(
    ([source]) => {
      const doc =
        '<!doctype html><meta charset="utf-8"><body><div id="racine"></div>' +
        '<script type="module">' +
        source +
        '<\/script></body>'
      const cadre = document.getElementById('cadre')
      cadre.srcdoc = doc
    },
    [code],
  )
  await page.waitForTimeout(attente)

  // ── ON NE LIT PAS LE CADRE DEPUIS LE PARENT, ET C'EST UNE LEÇON.
  //
  // Ma première forme tentait `contentDocument` dans un `try`. Chromium
  // avalait l'exception ; WEBKIT LA SIGNALE COMME UNE ERREUR DE PAGE —
  // et le juge rendait alors un défaut qui était LE SIEN, pas celui de
  // l'œuvre :
  //
  //   « Blocked a frame at "null" from accessing a frame at "null" »
  //   pile : at evaluate (:372:22)   ← MA ligne, pas la leur
  //
  // Un instrument qui se mesure lui-même rend un faux rouge, et un faux
  // rouge coûte plus cher qu'un vert : il envoie chercher un défaut qui
  // n'existe pas. L'origine opaque est VOULUE — on ne la contourne pas
  // pour regarder dedans, on écoute ce que le cadre DIT.
  await rendre({ aTourne: true, motif: null, erreurs })
} catch (e) {
  await rendre({
    aTourne: false,
    motif: `le juge a jeté : ${e instanceof Error ? e.message : String(e)}`,
    erreurs,
  })
} finally {
  await navigateur.close().catch(() => undefined)
}
