/**
 * LE MONTAGE SANS SESSION — ce que voit un visiteur, mesuré en l'exécutant.
 *
 * ── POURQUOI UN ENFANT À PART, et pas une option du juge d'exécution.
 *
 * Celui-là REFUSE le réseau en dur : `fetch` jette `RESEAU_REFUSE`, et c'est
 * une garantie voulue — un code de modèle ne doit atteindre aucun service.
 * On ne l'affaiblit pas. Ici le réseau n'est pas plus ouvert : il va à un
 * BOUCHON qui enregistre et répond lui-même. Aucune requête ne sort.
 *
 * ── ET IL FAUT TROIS MONTAGES, PAS DEUX.
 *
 * Le propriétaire a accordé un « montage double ». Deux ne suffisent pas, et
 * la raison est la distinction qu'il exige lui-même dans le reproche :
 *
 *   `refus`  : les tables répondent 401. On voit ce qu'un visiteur obtient
 *              quand la table n'est PAS publique.
 *   `vide`   : les tables répondent `[]`. On voit ce qu'il obtient quand il
 *              n'y a sincèrement rien.
 *   `temoin` : les tables répondent UNE ligne marquée. On voit si l'écran
 *              public AFFICHE cette table, ou s'il la charge sans la montrer.
 *
 * `refus` contre `vide` donne le défaut des deux silences indiscernables.
 * `temoin` donne le REMÈDE : une table affichée publiquement doit être
 * déclarée publique ; une table chargée sans être montrée doit être chargée
 * après la connexion. Sans ce troisième montage, le reproche ne peut pas
 * choisir — et un modèle qui choisit au hasard ouvre une fois sur deux la
 * table des téléphones.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [, , cheminBundle, cheminSortie, regime, attenteMs] = process.argv
const attente = Number(attenteMs ?? '1200')

const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
GlobalRegistrator.register({ url: 'https://oeuvre.invalid/' })

/**
 * UNE MARQUE PAR TABLE, ET C'EST LA CORRECTION QUI COMPTE.
 *
 * Ma première forme employait UNE marque pour toutes les tables. Éprouvé sur
 * `asosa` : les trois tables rendaient la même marque, elle apparaissait à
 * l'écran grâce à `annonce`, et le juge concluait « membre est affichée » —
 * donc « déclare `membre` publique », donc la liste des membres et leurs
 * téléphones ouverte à tout le monde.
 *
 * C'est le désastre exact que le propriétaire avait nommé, produit par le
 * juge censé l'empêcher. Une marque par table le règle sans coûter un
 * montage de plus : on lit QUELLES marques apparaissent.
 */
const marqueDe = (table) => `ZQX-${table}-7731`

const vues = []
const erreurs = []
/**
 * ON ATTEND LE SILENCE DU RÉSEAU, PAS UN DÉLAI DEVINÉ.
 *
 * Mesuré : avec un délai fixe de 450 ms, un témoin qui DISTINGUE l'échec du
 * vide était accusé de les confondre — le rendu asynchrone n'avait pas eu
 * lieu, les deux textes valaient « Accueil », et le juge criait au défaut.
 * UN FAUX POSITIF QUI REFUSERAIT UNE ŒUVRE CORRECTE.
 *
 * Allonger le délai ne corrige pas la nature du défaut : il le déplace vers
 * l'œuvre un peu plus lente. On mesure donc la quiétude — plus aucune
 * requête depuis `REPOS_MS` — avec un plafond pour ne jamais pendre.
 */
let derniereRequete = Date.now()
let enVol = 0

/**
 * LE BOUCHON. Il parle PostgREST et GoTrue, et il ne sort jamais.
 *
 * Le nom de table se lit dans le chemin `/rest/v1/<table>` — c'est la forme
 * de PostgREST, pas une convention à nous.
 */
const bouchon = async (entree, init) => {
  derniereRequete = Date.now()
  enVol += 1
  try {
    return await repondre(entree, init)
  } finally {
    enVol -= 1
    derniereRequete = Date.now()
  }
}

const repondre = async (entree, init) => {
  const url = typeof entree === 'string' ? entree : String(entree?.url ?? entree)
  // ── `fetch(url)` SANS OPTIONS EST UN GET, et ma première forme l'ignorait.
  //
  // Elle écrivait `init?.method ?? (…) ?? 'GET'`. Avec un fetch nu, la
  // branche du milieu rend `''` — qui n'est PAS nullish, donc le `?? 'GET'`
  // ne s'appliquait jamais. Méthode vide, donc traitée comme une écriture,
  // donc 401 DANS LES TROIS MODES. Ça ne se voyait pas sur `asosa` : le SDK
  // passe `method: 'GET'` explicitement. C'est le témoin écrit au protocole
  // qui a exercé la forme que le SDK n'exerce pas.
  const brute =
    init?.method ?? (typeof entree === 'object' && entree !== null ? entree.method : undefined)
  const methode = String(
    typeof brute === 'string' && brute.trim() !== '' ? brute : 'GET',
  ).toUpperCase()
  const rest = /\/rest\/v1\/([A-Za-z0-9_]+)/u.exec(url)
  const json = (statut, corps) =>
    new Response(JSON.stringify(corps), {
      status: statut,
      headers: { 'content-type': 'application/json' },
    })

  // ── AUCUNE SESSION, DANS LES TROIS MODES.
  //
  // C'est le point de la mesure : on regarde la face PUBLIQUE. Un refus
  // d'authentification est la réponse honnête à un visiteur sans compte.
  if (/\/auth\/v1\//u.test(url)) {
    vues.push(`${methode} auth`)
    if (/\/auth\/v1\/(?:token|signup)/u.test(url)) {
      return json(400, { error: 'invalid_grant', error_description: 'bouchon' })
    }
    return json(200, { data: { session: null, user: null }, session: null, user: null })
  }

  if (rest !== null) {
    const table = rest[1]
    vues.push(`${methode} ${table}`)
    if (methode !== 'GET' && methode !== 'HEAD') {
      // Une écriture depuis la face publique est refusée, toujours.
      return json(401, { code: '42501', message: `permission denied for table ${table}` })
    }
    if (regime === 'refus') {
      // Le code et le message de PostgREST sur un refus de privilège.
      return json(401, { code: '42501', message: `permission denied for table ${table}`, details: null, hint: null })
    }
    if (regime === 'vide') return json(200, [])
    // `temoin` : une ligne dont chaque champ texte porte la marque DE CETTE
    // TABLE. C'est ce qui permet de dire laquelle est montrée.
    const mq = marqueDe(table)
    return json(200, [
      { id: `${mq}-id`, titre: mq, nom: mq, contenu: mq, texte: mq, libelle: mq, objet: mq, message: mq, description: mq, publiee: true, publie: true, actif: true, date_publication: '2026-01-01', date: '2026-01-01' },
    ])
  }
  vues.push(`${methode} inconnu`)
  return json(404, {})
}

Object.defineProperty(globalThis, 'fetch', { value: bouchon, configurable: false, writable: true })

// ── LA BASE EST JOIGNABLE, SINON L'ŒUVRE TOURNE EN MÉMOIRE ET N'INTERROGE RIEN.
globalThis.window.DERIBFY_BASE = {
  url: 'https://bouchon.invalid',
  clePubliable: 'bouchon-cle-publiable',
  options: {},
}

const noter = (quoi, e) => {
  const m = e instanceof Error ? e.message : String(e)
  erreurs.push({ quoi, message: m.slice(0, 240) })
}
process.on('uncaughtException', (e) => { noter('exception', e) })
process.on('unhandledRejection', (e) => { noter('rejet', e) })
const consoleErreur = console.error.bind(console)
console.error = (...args) => {
  const t = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')
  if (!/Warning:|act\(/u.test(t)) erreurs.push({ quoi: 'console', message: t.slice(0, 240) })
}

document.body.innerHTML = '<div id="racine"></div>'
const code = readFileSync(cheminBundle, 'utf8')

let monte = false
try {
  const oeuvre = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  monte = true
  if (typeof oeuvre.monter === 'function') {
    const racine = document.getElementById('racine')
    if (racine !== null) oeuvre.monter(racine)
  }
} catch (e) {
  noter('import', e)
}

// ── LA QUIÉTUDE : plus aucune requête en vol, et plus rien depuis REPOS_MS.
const REPOS_MS = 250
const PLAFOND_MS = Math.max(attente, 8000)
const debut = Date.now()
for (;;) {
  await new Promise((r) => setTimeout(r, 60))
  const repos = Date.now() - derniereRequete
  if (enVol === 0 && repos >= REPOS_MS) break
  if (Date.now() - debut > PLAFOND_MS) {
    erreurs.push({ quoi: 'quietude', message: `le réseau ne s’est pas calmé en ${String(PLAFOND_MS)} ms` })
    break
  }
}
// Et un dernier tour de boucle d'événements pour laisser React peindre.
await new Promise((r) => setTimeout(r, 120))

const racine = document.getElementById('racine')
const texte = (racine?.textContent ?? '').replace(/\s+/gu, ' ').trim()

writeFileSync(
  cheminSortie,
  JSON.stringify({
    regime,
    monte,
    erreurs,
    // Les tables interrogées, dédoublonnées : c'est la base de J1.
    tables: [...new Set(vues.filter((v) => !/ (auth|inconnu)$/u.test(v)).map((v) => v.split(' ')[1]))],
    requetes: [...new Set(vues)].slice(0, 30),
    texte: texte.slice(0, 1200),
    // QUELLES tables l'écran public montre réellement — une par une.
    tablesMontrees: [...new Set(vues.map((v) => v.split(' ')[1]))]
      .filter((t) => t !== undefined && t !== 'auth' && t !== 'inconnu')
      .filter((t) => texte.includes(marqueDe(t))),
  }),
)
process.exit(0)
