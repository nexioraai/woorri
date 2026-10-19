/**
 * EP-280 — LA PAGE DOIT UNE PLATEFORME QUI FONCTIONNE À L'APPLICATION.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-19.
 *
 * Première application livrée du projet : 63 695 caractères, un seul tour,
 * 0,067 $, aucune troncature, et elle COMPILE. L'écran est resté blanc.
 *
 *     SecurityError: Failed to read the 'localStorage' property from
 *     'Window': The document is sandboxed and lacks the 'allow-same-origin'
 *     flag.
 *         at commitHookEffectListMount
 *
 * L'application faisait quelque chose de parfaitement normal : oublier un
 * identifiant à la déconnexion, dans un `useEffect`. React a propagé,
 * démonté, et laissé du blanc.
 *
 * ── ET CE N'EST PAS LE DÉFAUT DE CETTE APPLICATION-LÀ.
 *
 * Le cadre qui la montre porte `sandbox="allow-scripts"` SANS
 * `allow-same-origin`, délibérément : sans cette restriction, l'application
 * générée pourrait lire le site qui l'héberge. On ne touche pas au cadre.
 *
 * Mais dans une origine opaque, `localStorage` LÈVE à la simple lecture.
 * TOUTE application qui garde des données ferait exactement ça. Demander au
 * modèle d'entourer chaque accès d'un `try` traiterait le symptôme : c'est la
 * PAGE qui doit offrir une plateforme qui marche, pas l'application qui doit
 * deviner dans quel cadre on l'a mise.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Les deux gestes, et l'ORDRE dans lequel ils arrivent. Un filet installé
 * après l'application ne rattrape rien ; un stockage installé après le
 * premier rendu arrive trop tard.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pageAutonome } from '../boucle-directe'

const page = pageAutonome('console.log("app")', 'Mon application')

describe('EP-280 · la page offre une plateforme', () => {
  it('① LE PRÉLUDE EST POSÉ AVANT L’APPLICATION, et sans attendre', () => {
    // ── L'ORDRE EST LE CONTRÔLE, pas la présence.
    //
    // Le code de l'application part en `type="module"`, donc DIFFÉRÉ : il
    // s'exécute après l'analyse du document. Le prélude, lui, doit être un
    // script ORDINAIRE placé AVANT — sinon il s'installerait après que
    // l'application a déjà échoué, et ne rattraperait rien.
    const iPrelude = page.indexOf('<script>')
    const iApp = page.indexOf('<script type="module">')
    expect(iPrelude, 'aucun prélude dans la page').toBeGreaterThan(-1)
    expect(iApp).toBeGreaterThan(-1)
    expect(iPrelude, 'le prélude arrive APRÈS l’application : il ne rattrape rien').toBeLessThan(
      iApp,
    )
    // Dans le `<head>`, donc avant que le corps existe.
    expect(iPrelude).toBeLessThan(page.indexOf('</head>'))
  })

  it('② UN STOCKAGE DE SECOURS, et seulement si le vrai est inaccessible', () => {
    // La sonde d'abord : on ne REMPLACE jamais un stockage qui marche, sinon
    // une application publiée perdrait ses données entre deux visites alors
    // que rien ne l'y obligeait.
    expect(page, 'le prélude ne sonde pas le vrai stockage avant de le remplacer').toContain(
      'window.localStorage.getItem',
    )
    expect(page, 'aucun substitut n’est installé').toContain('"localStorage"')
    expect(page, 'sessionStorage est oublié : même origine opaque, même refus').toContain(
      '"sessionStorage"',
    )
    // Les cinq gestes que l'API impose : une application qui en appelle un
    // manquant planterait exactement comme avant.
    for (const geste of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      expect(page, `le substitut n’offre pas ${geste}`).toContain(`${geste}:`)
    }
  })

  it('③ UNE ERREUR S’AFFICHE — une page blanche ne dit rien à personne', () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // Il m'a fallu poser ce filet À LA MAIN pour trouver le défaut du
    // 2026-10-19 en deux minutes. Sans lui, j'avais passé une demi-heure à
    // écarter des hypothèses sur une page muette. Il reste posé.
    expect(page, 'aucune erreur d’exécution ne serait montrée').toContain(
      "addEventListener(\"error\"",
    )
    expect(page, 'une promesse rejetée laisserait encore du blanc').toContain(
      'addEventListener("unhandledrejection"',
    )
    // La personne lit une phrase, pas une pile d'appels — le détail
    // technique reste disponible, replié.
    expect(page).toContain("s'est arretee")
    expect(page, 'le détail technique est perdu : indiagnosticable').toContain('details')
  })

  it('④ LE TEXTE MONTRÉ PASSE PAR textContent, jamais par du HTML', () => {
    // Le message d'erreur peut contenir n'importe quoi — y compris du texte
    // venu de l'application générée. Le poser en HTML l'exécuterait.
    expect(page).toContain('textContent')
    expect(page, 'un message d’erreur injecté en HTML serait exécuté').not.toContain('innerHTML')
  })

  it('⑥ LES APIS DE NAVIGATEUR NE VIVENT QUE DANS LE PRÉLUDE', () => {
    // ── CE CONTRÔLE BORNE UNE DÉROGATION, ET C'EST TOUT SON OBJET.
    //
    // `businessLayerPortability` interdit les APIs de navigateur dans
    // `src/lib/` : la couche métier doit rester consommable par un client qui
    // n'est pas un navigateur. Ce fichier y figure en dérogation, parce que
    // ses douze occurrences vivent dans une CHAÎNE ÉMISE, jamais exécutée
    // ici — un client natif qui appelle `pageAutonome()` reçoit du texte.
    //
    // Mais une dérogation couvre le FICHIER ENTIER. Sans ce contrôle, un
    // vrai `localStorage` posé un jour dans la boucle elle-même passerait
    // invisible, protégé par une ligne écrite pour autre chose.
    const brut = readFileSync(join(__dirname, '..', 'boucle-directe.ts'), 'utf8')
    const code = brut.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
    // LE MÊME MOTIF que le cliquet d'architecture : s'ils divergeaient, l'un
    // des deux mesurerait autre chose que ce qu'il prétend.
    const NAVIGATEUR =
      /\blocalStorage\b|\bsessionStorage\b|\bdocument\s*\.\s*(?:getElementById|querySelector|createElement|cookie|body|head)\b|\bwindow\s*\.\s*\w+|\bnavigator\s*\.\s*\w+|\bIndexedDB\b/gu
    const debut = code.indexOf('const PRELUDE = `')
    const fin = code.indexOf('`', debut + 17)
    expect(debut, 'la constante PRELUDE a disparu : ce contrôle ne borne plus rien').toBeGreaterThan(
      -1,
    )
    const dehors = [...code.matchAll(NAVIGATEUR)]
      .filter((m) => (m.index ?? 0) < debut || (m.index ?? 0) > fin)
      .map((m) => m[0])
    expect(
      dehors,
      'une API de navigateur est APPELÉE dans ce module, hors du prélude émis : ' +
        'la dérogation de portabilité ne la couvre pas',
    ).toEqual([])
    // Et le dénominateur est réel : un prélude vidé passerait aussi.
    expect([...code.slice(debut, fin).matchAll(NAVIGATEUR)].length).toBeGreaterThan(5)
  })

  it('⑤ LA PAGE RESTE AUTONOME — aucune demande à l’extérieur', () => {
    // La raison d'être de cette page : être servie dans un cadre isolé et
    // publiée sans rien emprunter à personne.
    expect(page).not.toMatch(/src=["']https?:/u)
    expect(page).not.toMatch(/@import|fonts\.googleapis/u)
    expect(page).toContain('<div id="racine"></div>')
  })
})
