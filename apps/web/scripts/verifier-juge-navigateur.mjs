/**
 * LE JUGE NAVIGATEUR MORD-IL ENCORE ? — contrôle de l'instrument, en CI.
 *
 * ── CE QUI SE VÉRIFIE ICI, ET CE QUI NE S'Y VÉRIFIE PAS.
 *
 * PAS les œuvres : le balayage des applications livrées est un TIR, lancé
 * à la main, qui lit la base et dépend de ce qui s'y trouve. Ici on
 * vérifie l'INSTRUMENT : qu'il se lance, qu'il laisse passer une œuvre
 * saine, et qu'il ATTRAPE les deux défauts pour lesquels il existe.
 *
 * « Un contrôle qui ne s'exerce que sur le chemin heureux ne prouve pas
 *   une garde — il prouve qu'il n'y avait rien à garder ce jour-là. »
 *
 * D'où DEUX témoins, pas un :
 *
 *   ① LE SAIN      → aucune erreur. Un instrument qui rougit sur du code
 *                    juste coûte plus cher qu'un instrument aveugle : il
 *                    envoie chercher un défaut qui n'existe pas.
 *   ② LE STOCKAGE  → `localStorage.setItem` dans une origine opaque.
 *                    C'est la trame `The operation is insecure.`
 *   ③ LE RÉSEAU    → un `fetch` vers un service. Le bouchon répond, SANS
 *                    en-tête permissif : la requête part, traverse, et
 *                    revient refusée — « Origin null is not allowed ».
 *
 * ② et ③ sont les deux moitiés du défaut mesuré sur l'aperçu publié. Si
 * l'instrument cessait de les voir, son vert ne vaudrait plus rien, et
 * RIEN ne le dirait.
 *
 * ── POURQUOI UN SCRIPT ET PAS UN TEST DE LA GATE.
 *
 * Un lancement coûte ~7 s mesurés — quatre fois le plafond de marge de la
 * gate (1 666 ms). Et la gate interdit le réseau, ce qui est juste pour
 * elle et faux pour un navigateur. Étape séparée, donc, comme les autres
 * contrôles lents du dépôt.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const ENFANT = join(ICI, '..', 'src', 'lib', 'apps', 'juge-navigateur-enfant.mjs')
const MOTEUR = process.env.JUGE_MOTEUR ?? 'webkit'

const TEMOINS = [
  {
    nom: 'le sain',
    // Rien d'interdit : il écrit dans le DOM et s'arrête.
    code: `document.getElementById('racine').textContent = 'vivant'`,
    attend: null,
  },
  {
    nom: 'le stockage',
    code: `localStorage.setItem('x', '1')`,
    attend: /insecure|localStorage|SecurityError|denied/iu,
  },
  {
    nom: 'le réseau',
    code:
      `fetch('https://exemple.supabase.co/rest/v1/t?select=*')` +
      `.then((r) => r.json()).then(() => {}).catch((e) => { throw e })`,
    attend: /Origin null|Access-Control-Allow-Origin|access control/iu,
  },
]

async function juger(code) {
  const dossier = await mkdtemp(join(tmpdir(), 'deribfy-nav-ci-'))
  try {
    const bundle = join(dossier, 'oeuvre.js')
    const sortie = join(dossier, 'verdict.json')
    await writeFile(bundle, code, 'utf8')
    // ── LA DÉCANTATION EST COURTE ICI, ET C'EST MESURÉ.
    //
    // Une ŒUVRE a besoin de 6 s : elle monte des centaines de balises,
    // visite des écrans, et son défaut peut naître au troisième. Ces
    // TÉMOINS, eux, agissent à la première ligne. Mesuré : 3×5 023 ms
    // avec 4 s d'attente, 3×~1 400 ms avec 1,2 s — même verdict sur les
    // trois. Garder 4 s coûterait 11 s de CI pour rien.
    const enfant = spawn(process.execPath, [ENFANT, bundle, sortie, '1200'], {
      env: { ...process.env, JUGE_MOTEUR: MOTEUR },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let bruit = ''
    enfant.stderr.on('data', (d) => {
      bruit += String(d)
    })
    let tue = false
    const minuteur = setTimeout(() => {
      tue = true
      enfant.kill('SIGKILL')
    }, 90_000)
    await new Promise((res) => {
      enfant.on('exit', res)
      enfant.on('error', res)
    })
    clearTimeout(minuteur)
    if (tue) return { aTourne: false, motif: 'dépassement de 90 s', erreurs: [] }
    const brut = await readFile(sortie, 'utf8').catch(() => '')
    if (brut === '') {
      return { aTourne: false, motif: `aucune sortie du juge — ${bruit.slice(0, 300)}`, erreurs: [] }
    }
    return JSON.parse(brut)
  } finally {
    await rm(dossier, { recursive: true, force: true }).catch(() => undefined)
  }
}

let fautes = 0
const t0 = Date.now()
for (const t of TEMOINS) {
  const debut = Date.now()
  const v = await juger(t.code)
  const ms = Date.now() - debut
  const trames = (v.erreurs ?? []).map((e) => e.message).join(' ⁄ ')
  // ── L'INSTRUMENT D'ABORD : son silence ne doit jamais passer pour un vert.
  if (v.aTourne !== true) {
    console.log(`  ✗ ${t.nom} — LE JUGE N’A PAS TOURNÉ : ${v.motif ?? 'sans motif'}`)
    fautes += 1
    continue
  }
  const vu = t.attend === null ? trames === '' : t.attend.test(trames)
  console.log(
    `  ${vu ? '✓' : '✗'} ${t.nom} · ${String(ms)} ms · ${MOTEUR}` +
      (trames === '' ? '  (aucune erreur)' : `\n      ${trames.slice(0, 300)}`),
  )
  if (!vu) {
    fautes += 1
    console.log(
      t.attend === null
        ? '      ↑ FAUX ROUGE : l’instrument accuse du code juste'
        : `      ↑ LE JUGE NE MORD PLUS : attendu ${String(t.attend)}`,
    )
  }
}
console.log(`\n  ${String(TEMOINS.length)} témoins · ${String(Date.now() - t0)} ms au total`)
if (fautes > 0) {
  console.error(`\nJUGE_NAVIGATEUR_DEFAILLANT: ${String(fautes)} témoin(s) en faute.`)
  process.exit(1)
}
console.log('  l’instrument mord, et ne mord pas le code juste.')
