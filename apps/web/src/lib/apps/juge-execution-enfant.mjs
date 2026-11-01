/**
 * LE CORPS DU JUGE D'EXÉCUTION — ce qui tourne DANS le processus cloisonné.
 *
 * Il est lancé par `juge-execution.ts` avec un environnement VIDE et les
 * drapeaux de permission. Il monte le bundle dans un DOM simulé, attend la
 * décantation de React, et rend un verdict sur la sortie standard.
 *
 * ── LES TROIS VERROUS, DU PLUS FIABLE AU MOINS.
 *
 * ① L'ENVIRONNEMENT VIDE : le processus ne reçoit AUCUN secret. Un code
 *    d'exfiltration n'a rien à prendre. C'est la vraie protection — le
 *    propriétaire l'a posée comme telle le 2026-10-31.
 * ② LE REFUS RÉSEAU, ici même : `--permission` de Node NE COUVRE PAS le
 *    réseau (mesuré : `require('net')` passe sous `--permission`). On
 *    neutralise donc les portes AVANT que le code du modèle existe —
 *    fetch, XHR, WebSocket, EventSource, sendBeacon — et un crochet de
 *    résolution refuse net/http/https/tls/dgram/dns.
 * ③ LES PERMISSIONS (posées par le parent) : ni fichiers, ni processus
 *    enfant, ni modules natifs. Une couche de plus, jamais la serrure.
 */
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'

// ── ② LE CROCHET DE RÉSOLUTION : les modules de réseau n'existent pas ici.
const INTERDITS = new Set([
  'net', 'node:net', 'http', 'node:http', 'https', 'node:https',
  'tls', 'node:tls', 'dgram', 'node:dgram', 'dns', 'node:dns',
  'dns/promises', 'node:dns/promises', 'http2', 'node:http2',
  'child_process', 'node:child_process', 'worker_threads', 'node:worker_threads',
])
// Armé PLUS BAS, après le chargement de notre propre infrastructure :
// le simulateur de DOM importe lui-même node:net, et un verrou posé ici
// tuerait le juge avant qu'il ait vu une ligne du modèle (mesuré).
function armerLeVerrouReseau() {
  registerHooks({
    resolve(specifier, contexte, suivant) {
      if (INTERDITS.has(specifier)) throw new Error('RESEAU_REFUSE:' + specifier)
      return suivant(specifier, contexte)
    },
  })
}

const [, , cheminBundle, cheminSortie, attenteMs] = process.argv

const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
GlobalRegistrator.register({ url: 'https://oeuvre.invalid/' })

// ── ② (suite) LES PORTES DU NAVIGATEUR, neutralisées avant tout code.
const refus = () => {
  throw new Error('RESEAU_REFUSE')
}
class PorteFermee {
  constructor() {
    throw new Error('RESEAU_REFUSE')
  }
}
Object.defineProperty(globalThis, 'fetch', { value: refus, configurable: false, writable: false })
for (const porte of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
  Object.defineProperty(globalThis, porte, {
    value: PorteFermee,
    configurable: false,
    writable: false,
  })
}
if (globalThis.navigator !== undefined) {
  try {
    Object.defineProperty(globalThis.navigator, 'sendBeacon', { value: refus, configurable: false })
  } catch {
    /* certaines implémentations gèlent déjà navigator : la porte reste fermée. */
  }
}

const erreurs = []
const noter = (quoi, e) => {
  const message = e instanceof Error ? e.message : String(e)
  const pile = e instanceof Error && typeof e.stack === 'string' ? e.stack.split('\n')[1] ?? '' : ''
  erreurs.push({ quoi, message: message.slice(0, 300), indice: pile.trim().slice(0, 160) })
}
process.on('uncaughtException', (e) => noter('exception', e))
process.on('unhandledRejection', (e) => noter('rejet', e))
// Une erreur React remontée par la console compte aussi : elle ne jette pas
// toujours, et une application vide « sans exception » reste cassée.
const consoleErreur = console.error.bind(console)
console.error = (...args) => {
  const texte = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')
  if (!/Warning:|act\(/u.test(texte)) erreurs.push({ quoi: 'console', message: texte.slice(0, 300), indice: '' })
  consoleErreur(...args)
}

document.body.innerHTML = '<div id="racine"></div>'
const code = readFileSync(cheminBundle, 'utf8')

// ── LE VERROU S'ARME ICI : tout ce qui suit est du code du modèle.
armerLeVerrouReseau()

let monte = false
try {
  const oeuvre = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  monte = true
  // La page autonome appelle le montage elle-même ; un module qui exporte
  // `monter` (notre témoin, et les œuvres qui suivent la bibliothèque)
  // reçoit le nœud. Les deux chemins sont couverts.
  if (typeof oeuvre.monter === 'function') {
    const racine = document.getElementById('racine')
    if (racine !== null) oeuvre.monter(racine)
  }
} catch (e) {
  noter('import', e)
}

// LA DÉCANTATION EST NÉCESSAIRE, MESURÉE : une œuvre rendait 57 caractères
// à 0 ms et 759 à 300 ms — React rend par tranches. Sans attente, on
// manquerait les erreurs d'effet et on jugerait un écran à moitié né.
await new Promise((r) => setTimeout(r, Number(attenteMs) || 400))

// ── CONDITION 4 DU PROPRIÉTAIRE : TOUS LES ÉCRANS, PAS SEULEMENT L'ENTRÉE.
//
// « Une page d'accueil qui démarre pendant que l'écran Paiements plante est
// exactement la demi-preuve qui nous a déjà coûté une journée. » Les œuvres
// déclarent leurs écrans en type d'union — illisible de façon fiable. On
// parcourt donc l'INTERFACE RÉELLE : chaque contrôle de navigation est
// actionné, et l'erreur est imputée à l'écran qu'il ouvre.
const racineNav = document.getElementById('racine')
const SELECTEUR = 'button, [role="button"], a[href^="#"], nav *[data-ecran]'
/** Combien de contrôles on accepte d'ouvrir. Borne de COÛT, pas de vérité. */
const BUDGET_VISITES = 24
let visites = 0
let decouverts = 0
let ecransDistincts = 1
const muets = []
const muetsVus = new Set()
/** Le texte de chaque ecran OUVERT, et s'il a ete EXERCE — base du juge de
 *  couverture : « couverte » doit vouloir dire ATTEINTE ET EXERCEE.
 *  DECLARE ICI, hors du bloc : il est lu a l'ecriture du verdict, et une
 *  portee trop etroite faisait sortir l'enfant SANS verdict, l'erreur
 *  avalee par le filet d'exceptions (mesure du 2026-11-01). */
const ecransOuverts = new Map()
if (racineNav !== null) {
  // ── ON RÉÉNUMÈRE APRÈS CHAQUE CLIC, et c'est la correction du défaut.
  //
  // MESURÉ le 2026-10-31 sur les œuvres stockées : la première version
  // énumérait UNE SEULE FOIS, avant tout clic. Les contrôles qui
  // n'apparaissent qu'APRÈS navigation n'étaient donc JAMAIS ouverts —
  // l'œuvre 7be93be8 porte 16 contrôles à l'accueil et un ensemble
  // DIFFÉRENT ensuite. Le juge ne voyait que le premier niveau, et ne le
  // disait pas : sixième visage du même défaut (« tout roule »,
  // « indisponible », « hors périmètre », la sonde qui signale,
  // l'arrêt à 24 muet).
  const vus = new Set()
  const connus = new Set()
  // ── L'ECRAN S'IDENTIFIE PAR CE QU'IL AFFICHE, pas par le bouton cliqué.
  //
  // Deux approximations ont ete mesurees et rejetees le 2026-10-31 :
  //   · clef « balise + texte » seule → SOUS-COMPTAIT (deux « Modifier » sur
  //     deux ecrans comptaient pour un), donc GONFLAIT le ratio : faux vert ;
  //   · ecran = libelle du controle cliqué → SUR-COMPTAIT (un bouton qui ne
  //     navigue pas creait un faux ecran : 161 « decouvertes » sur une
  //     oeuvre qui n'a qu'une poignee d'ecrans).
  // L'empreinte du CONTENU RENDU tranche : meme ecran = meme texte, qu'on y
  // arrive par un chemin ou par un autre, et un bouton qui ne change rien ne
  // cree aucun ecran.
  const empreinte = () => {
    const t =
      (racineNav.textContent ?? '').replace(/\s+/gu, ' ').trim() +
      '#' +
      String(racineNav.innerHTML.length)
    let h = 0
    for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) | 0
    return String(h)
  }
  let ecranCourant = empreinte()
  const texteEcran = () =>
    racineNav.innerHTML
      .replace(/<[^>]*>/gu, ' ')
      .replace(/&nbsp;|&#160;/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 1600)
  ecransOuverts.set(ecranCourant, { texte: texteEcran(), exerce: false })
  const ecransVus = new Set([ecranCourant])
  const clef = (c) =>
    `${c.tagName}|${ecranCourant}|${(c.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 60)}`
  for (let tour = 0; tour < BUDGET_VISITES; tour += 1) {
    const presents = [...racineNav.querySelectorAll(SELECTEUR)]
    // ── UN CONTRÔLE SANS NOM LISIBLE EST INUTILISABLE (2026-11-01).
    //
    // CLASSE NEUVE, vue sur trois écrans d'un tir réel : une pilule bleue
    // sans texte. Le juge de démarrage disait vrai — ça démarre. Le juge de
    // vivacité disait vrai — le contrôle est lié. Et pourtant personne ne
    // peut s'en servir : on ne sait pas ce qu'il fait. RENDU + LIÉ + MUET,
    // et aucun des cinq juges ne regardait ça. Le DOM est déjà là : la
    // mesure ne coûte rien.
    for (const c of presents) {
      const nom =
        (c.textContent ?? '').replace(/\s+/gu, ' ').trim() ||
        (c.getAttribute('aria-label') ?? '').trim() ||
        (c.getAttribute('title') ?? '').trim()
      if (nom === '') {
        const clefMuet = `${c.tagName}|${ecranCourant}|${c.outerHTML.slice(0, 60)}`
        if (!muetsVus.has(clefMuet)) {
          muetsVus.add(clefMuet)
          muets.push({ balise: c.tagName.toLowerCase(), extrait: c.outerHTML.replace(/\s+/gu, ' ').slice(0, 110) })
        }
      }
    }
    const cles = presents.map((c) => clef(c))
    for (const k of cles) connus.add(k)
    const rang = cles.findIndex((k) => !vus.has(k))
    if (rang === -1) break
    vus.add(cles[rang])
    const controle = presents[rang]
    const etiquette = (controle.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 40) || '(sans texte)'
    const avant = erreurs.length
    try {
      controle.click()
    } catch (e) {
      noter(`écran « ${etiquette} »`, e)
    }
    await new Promise((r) => setTimeout(r, 60))
    // Les erreurs nées de ce clic portent le nom de l'écran : un verdict qui
    // dit « ça plante » sans dire OÙ coûte un tour pour rien.
    for (let i = avant; i < erreurs.length; i += 1) {
      erreurs[i] = { ...erreurs[i], quoi: `${erreurs[i].quoi} — écran « ${etiquette} »` }
    }
    visites += 1
    const precedent = ecransOuverts.get(ecranCourant)
    if (precedent !== undefined) precedent.exerce = true
    // L'ECRAN COURANT devient celui que ce controle vient d'ouvrir : c'est
    // lui qui distingue deux « Modifier » poses sur deux ecrans.
    ecranCourant = empreinte()
    ecransVus.add(ecranCourant)
    if (!ecransOuverts.has(ecranCourant)) {
      ecransOuverts.set(ecranCourant, { texte: texteEcran(), exerce: false })
    }
  }
  // Ce qui reste connu mais non ouvert, le budget epuise : DIT, jamais taire.
  const restants = [...racineNav.querySelectorAll(SELECTEUR)].map((c) => clef(c))
  for (const k of restants) connus.add(k)
  decouverts = connus.size
  ecransDistincts = ecransVus.size
}

const racine = document.getElementById('racine')
const rendu = racine?.innerHTML ?? ''
const texte = (racine?.textContent ?? '').replace(/\s+/gu, ' ').trim()

const { writeFileSync } = await import('node:fs')
writeFileSync(
  cheminSortie,
  JSON.stringify({
    monte,
    erreurs,
    octetsRendus: rendu.length,
    texte: texte.slice(0, 400),
    ecransVisites: visites,
    ecransDecouverts: decouverts,
    ecransDistincts: ecransDistincts,
    controlesMuets: muets.slice(0, 12),
    ecrans: [...ecransOuverts.values()].map((e) => ({ texte: e.texte, exerce: e.exerce })),
  }),
)
process.exit(0)
