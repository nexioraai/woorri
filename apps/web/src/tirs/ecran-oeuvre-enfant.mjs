/**
 * LE NAVIGATEUR SIMULÉ QUI PILOTE L'ŒUVRE GÉNÉRÉE — réseau OUVERT.
 *
 * ── CE QUI LE DISTINGUE DU JUGE D'EXÉCUTION.
 *
 * `juge-execution-enfant.mjs` FERME le réseau : il mesure « ça démarre »
 * sans laisser l'œuvre sortir, et il a raison — un juge qui dépend d'un
 * service distant devient intermittent.
 *
 * Ici c'est l'inverse qu'on veut. La preuve est « on inscrit un membre, on
 * recharge, il est encore là » : elle n'existe que si l'écriture atteint la
 * VRAIE base. Ce fichier n'est donc pas un juge, c'est une MESURE.
 *
 * ── ET LE « RECHARGEMENT » EST UN VRAI PROCESSUS NEUF.
 *
 * Deux passes, deux exécutions : `inscrire` puis `relire`. Un second montage
 * dans le même processus partagerait le `localStorage` et la mémoire de
 * React — on prouverait que React garde son état, pas que la base garde la
 * donnée. Un processus neuf n'a rien à partager.
 *
 *   usage : node ecran-oeuvre-enfant.mjs <dossier> <inscrire|relire> <nom>
 */
import { readFileSync, appendFileSync } from 'node:fs'

const [, , dossier, passe, nomMembre] = process.argv
const dire = (l) => {
  appendFileSync(`${dossier}/ecran.txt`, l + '\n')
}

const oeuvre = JSON.parse(readFileSync(`${dossier}/oeuvre.json`, 'utf8'))
const html = readFileSync(`${dossier}/document.html`, 'utf8')
const code = readFileSync(`${dossier}/bundle.js`, 'utf8')

// ── LA CONFIGURATION VIENT DU DOCUMENT SERVI, pas de mes mains.
//
// La recopier ici mesurerait ma recopie. On la découpe dans la page que le
// navigateur recevrait vraiment.
const m = /window\.DERIBFY_BASE\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/u.exec(html)
if (m === null) {
  dire('  ECHEC : le document ne porte pas window.DERIBFY_BASE')
  process.exit(1)
}
const configBase = JSON.parse(m[1])

const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
GlobalRegistrator.register({ url: 'https://oeuvre.invalid/' })
globalThis.window.DERIBFY_BASE = Object.freeze(configBase)

const requetes = []
const fetchReel = globalThis.fetch.bind(globalThis)
globalThis.fetch = async (u, init) => {
  const r = await fetchReel(u, init)
  requetes.push(`${String(init?.method ?? 'GET')} ${String(u).replace(/^https?:\/\/[^/]+/u, '')} -> ${String(r.status)}`)
  return r
}

const DEBUT = Date.now()
const chien = setTimeout(() => {
  dire(`  ECHEC : chien de garde — rien ne s’est conclu en 150 s (dernière étape ci-dessus)`)
  process.exit(2)
}, 150_000)
chien.unref?.()

const erreurs = []
process.on('uncaughtException', (e) => {
  erreurs.push(String(e?.message ?? e))
  // Une exception de MON harnais arrête ; une exception de l'ŒUVRE est une
  // mesure et se note. On ne peut pas toujours les distinguer, donc on
  // l'écrit et on continue — mais on l'écrit TOUT DE SUITE.
  dire(`  (exception : ${String(e?.message ?? e).slice(0, 160)})`)
})
process.on('unhandledRejection', (e) => {
  erreurs.push(String(e?.message ?? e))
  dire(`  (rejet : ${String(e?.message ?? e).slice(0, 160)})`)
})

document.body.innerHTML = '<div id="racine"></div>'

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/** Attend qu'une condition devienne vraie, bornée — et le dit si elle ne vient pas. */
const attendre = async (quoi, test, limiteMs = 20000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < limiteMs) {
    if (test()) return true
    await dormir(250)
  }
  dire(`  ECHEC : ${quoi} — pas venu en ${String(limiteMs / 1000)} s`)
  return false
}

/**
 * ÉCRIT DANS UN CHAMP CONTRÔLÉ PAR REACT.
 *
 * Poser `.value` ne suffit pas : React garde sa propre valeur et la
 * réécrirait au prochain rendu. On passe par le descripteur natif, puis on
 * émet l'événement que React écoute.
 */
const saisir = (champ, valeur) => {
  // ── UN CHAMP ABSENT DOIT LE DIRE, pas jeter dans le vide.
  //
  // Mes deux premiers blocages viennent de là : `saisir(undefined, …)`
  // jetait, mon propre gestionnaire d'exception l'avalait, et le script
  // attendait le chien de garde. Une erreur capturée sans être dite est
  // pire qu'une erreur.
  if (!champ) {
    dire(`  ECHEC : champ absent pour « ${String(valeur).slice(0, 20)} »`)
    dire(`  champs présents : ${[...document.querySelectorAll('input')].map((i) => i.type).join(', ') || 'aucun'}`)
    process.exit(1)
  }
  const proto = Object.getPrototypeOf(champ)
  const d = Object.getOwnPropertyDescriptor(proto, 'value')
  if (d && d.set) d.set.call(champ, valeur)
  else champ.value = valeur
  champ.dispatchEvent(new Event('input', { bubbles: true }))
  champ.dispatchEvent(new Event('change', { bubbles: true }))
}

const texte = () => document.body.textContent ?? ''
/**
 * LES CHAMPS D'UN TYPE — lus sur la PROPRIÉTÉ, pas sur l'attribut.
 *
 * ── MON DÉFAUT, ET IL M'A COÛTÉ DEUX BLOCAGES.
 *
 * `input[type="text"]` NE MATCHE PAS un `<input>` sans attribut `type`, alors
 * que sa propriété `.type` vaut « text ». Le champ « Nom » de l'œuvre n'a
 * pas d'attribut : je mesurais `text=0` sur un écran qui en portait un.
 *
 * C'est la même famille que « mesurer ce qui part » : l'attribut est un
 * intermédiaire, la propriété est ce que le navigateur a résolu.
 */
const champs = (type) => [...document.querySelectorAll('input')].filter((i) => i.type === type)
const boutons = () => [...document.querySelectorAll('button')]
const boutonQuiDit = (motif) =>
  boutons().find((b) => motif.test((b.textContent ?? '').trim())) ?? null
/**
 * CLIQUE COMME UN NAVIGATEUR, pas comme un événement.
 *
 * ── MESURÉ : un `dispatchEvent(new Event('click'))` sur un bouton de
 *    soumission NE DÉCLENCHE PAS le `onSubmit` du formulaire sous
 *    happy-dom. L'écran de connexion restait affiché, sans message
 *    d'erreur — parce que le gestionnaire n'avait jamais tourné.
 *
 * On appelle donc `.click()`, qui suit le chemin du navigateur, ET on émet
 * la soumission du formulaire si le bouton y est — les deux, parce qu'une
 * œuvre peut câbler l'un ou l'autre et qu'on ne décide pas pour elle.
 */
/**
 * CLIQUE COMME UN NAVIGATEUR — et déclenche DEUX FOIS, sciemment.
 *
 * ── CE QUE ÇA A MESURÉ, et pourquoi je ne l'ai pas « corrigé ».
 *
 * `.click()` PUIS la soumission du formulaire : les deux passent. Mesuré en
 * passe 1 — `POST /rest/v1/membre -> 201` suivi d'un `-> 409`. Le 409 vient
 * de CE HARNAIS, pas de l'œuvre, et il a prouvé au passage que la
 * contrainte `unique` sur le téléphone tient en base.
 *
 * J'ai écrit la correction (soumettre OU cliquer, jamais les deux), puis je
 * l'ai RETIRÉE : la preuve de D5 ④ a été produite par CETTE version. La
 * remplacer sans rejouer laisserait au dépôt un harnais dont rien ne dit
 * qu'il mesure encore — et le rejouer coûte une génération payante.
 *
 * C'est donc consigné, pas fait en silence : au prochain tir payant, ce
 * `cliquer` se réduit à un seul déclenchement et la trace ne doit plus
 * porter de 409.
 *
 * ── ET POURQUOI LES DEUX AU DÉPART.
 *
 * Un `dispatchEvent(new Event('click'))` seul NE DÉCLENCHE PAS le
 * `onSubmit` d'un formulaire sous happy-dom : l'écran de connexion restait
 * affiché sans message, parce que le gestionnaire n'avait jamais tourné.
 */
const cliquer = (b) => {
  if (!b) return
  if (typeof b.click === 'function') b.click()
  else b.dispatchEvent(new Event('click', { bubbles: true }))
  const form = b.closest?.('form')
  if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

try {
  await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
} catch (e) {
  dire(`  ECHEC : l’œuvre ne se monte pas — ${String(e?.message ?? e)}`)
  process.exit(1)
}

dire(`== PASSE « ${passe} » — processus ${String(process.pid)}`)
if (!(await attendre('un écran rendu', () => (document.querySelector('#racine')?.childElementCount ?? 0) > 0))) {
  process.exit(1)
}

// ── ① LA CONNEXION, par le formulaire de l'œuvre.
if (!(await attendre('le formulaire de connexion', () => champs('password').length > 0))) {
  dire(`  écran rendu : ${texte().slice(0, 160)}`)
  process.exit(1)
}
const adresse = champs('email')[0] ?? document.querySelector('input[type="text"]')
const motDePasse = champs('password')[0]
saisir(adresse, oeuvre.adresse)
saisir(motDePasse, oeuvre.motDePasse)
const entrer = boutonQuiDit(/connect|entrer|se connecter/iu) ?? boutons()[0]
dire(`  connexion : ${oeuvre.adresse} · bouton « ${(entrer?.textContent ?? '').trim()} »`)
cliquer(entrer)

if (!(await attendre('la session ouverte (le mot de passe disparaît de l’écran)', () => champs('password').length === 0, 30000))) {
  dire(`  écran : ${texte().slice(0, 240)}`)
  dire(`  requêtes vues : ${requetes.length === 0 ? 'AUCUNE — le gestionnaire n’a pas tourné' : requetes.slice(0, 6).join(' · ')}`)
  process.exit(1)
}
dire(`  CONNECTÉ · ${requetes.slice(0, 3).join(' · ')}`)

// ── ② LES MEMBRES.
dire(`  boutons visibles : ${boutons().map((b) => (b.textContent ?? '').trim()).filter(Boolean).slice(0, 8).join(' | ')}`)
const versMembres = boutonQuiDit(/membre/iu)
if (versMembres) {
  dire(`  navigation : « ${(versMembres.textContent ?? '').trim()} »`)
  cliquer(versMembres)
}
// ── ON ATTEND LES CHAMPS, on ne dort pas un temps choisi au hasard.
//
// Mesuré : 1 200 ms ne suffisaient pas — l'écran des membres ne rend son
// formulaire qu'après le chargement des lignes. Un délai fixe fait croire
// que l'écran est vide alors qu'il n'est pas encore venu.
await attendre(
  'le formulaire des membres',
  () => champs('tel').length > 0 || champs('text').length > 0,
  30000,
)
dire(`  champs : text=${String(champs('text').length)} tel=${String(champs('tel').length)} number=${String(champs('number').length)}`)

if (passe === 'inscrire') {
  if (!(await attendre('le formulaire d’inscription', () => champs('tel').length > 0 || champs('text').length > 0))) {
    dire(`  écran : ${texte().slice(0, 240)}`)
    process.exit(1)
  }
  const nom = champs('text')[0]
  const tel = champs('tel')[0]
  saisir(nom, nomMembre)
  saisir(tel, '66' + String(Date.now()).slice(-6))
  const ajouter = boutonQuiDit(/ajouter|inscrire|enregistrer|valider/iu)
  dire(`  inscription : « ${nomMembre} » · bouton « ${(ajouter?.textContent ?? '').trim()} »`)
  cliquer(ajouter)
  const vu = await attendre(`« ${nomMembre} » affiché après inscription`, () => texte().includes(nomMembre), 30000)
  dire(vu ? `  INSCRIT ET AFFICHÉ : ${nomMembre}` : `  ECHEC : ${nomMembre} n’apparaît pas`)
  dire(`  durée : ${((Date.now() - DEBUT) / 1000).toFixed(1)} s`)
  if (!vu) {
    dire(`  écran : ${texte().slice(0, 300)}`)
    dire(`  requêtes : ${requetes.slice(-6).join(' · ')}`)
    process.exit(1)
  }
  dire(`  requêtes : ${requetes.slice(-4).join(' · ')}`)
} else {
  const vu = await attendre(`« ${nomMembre} » retrouvé APRÈS RECHARGEMENT`, () => texte().includes(nomMembre), 30000)
  dire(vu ? `  ENCORE LÀ : ${nomMembre}` : `  ECHEC : ${nomMembre} a disparu`)
  if (!vu) {
    dire(`  écran : ${texte().slice(0, 300)}`)
    dire(`  requêtes : ${requetes.slice(-6).join(' · ')}`)
    process.exit(1)
  }
  dire(`  requêtes : ${requetes.slice(-4).join(' · ')}`)
}

if (erreurs.length > 0) dire(`  (erreurs signalées par l’œuvre : ${erreurs.slice(0, 3).join(' | ')})`)
clearTimeout(chien)
dire(`  FIN en ${((Date.now() - DEBUT) / 1000).toFixed(1)} s`)
process.exit(0)
