/**
 * VÉRIFIE LE TRAÇAGE CONSTRUIT — le `.nft.json`, jamais la config.
 *
 * ── POURQUOI, ET POURQUOI ICI.
 *
 * Quatre incidents en douze jours (avant/19-10, livraison/30-10, deux tirs
 * payés/31-10 — 0,45 $) : un module chargé au vol manquait sur le disque de
 * LA fonction déployée. À chaque fois la CONFIG déclarait le traçage ; c'est
 * la SORTIE qui ne le portait pas (clé morte à crochets, cache, groupement).
 * Un contrôle qui lit la config certifie une intention ; celui-ci lit ce que
 * le build a RÉELLEMENT décidé d'embarquer.
 *
 * Branché dans `npm run build` APRÈS `next build` : chez Vercel, un traçage
 * ampute = BUILD ROUGE = déploiement refusé — l'ancien reste en ligne. C'est
 * le lot B de l'arbitrage du 2026-10-31 : B empêche la classe de revenir par
 * une autre route, pendant qu'EP-294 (lot A) l'a tuée pour la famille react.
 *
 * ── LE CANARI. Le binding linux de rolldown n'existe qu'au build Vercel ;
 * sur macOS son glob ne matche rien et une clé morte serait invisible. D'où
 * `scheduler/**` dans BAC_A_SABLE : ~30 fichiers visibles sur TOUTE
 * plateforme. Canari exigé partout ; binding exigé sur Linux seulement, et
 * le saut est DIT (aucun plafond silencieux).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const APP = join(dirname(new URL(import.meta.url).pathname), '..', '.next', 'server', 'app')

/** Routes qui chargent la chaîne d'émission au vol (benchmarks/air-emission). */
export const ROUTES_EMISSION = [
  'api/generateur/avant',
  'api/generateur/lire-brief',
  'api/generateur/comprendre',
  'api/generateur/deposer',
  'api/generateur/produire',
  'api/cron/generations',
]

/**
 * Le juge d'exécution (EP-302) ne vit que dans la route qui écrit : son corps
 * et son simulateur de DOM doivent entrer dans CETTE fonction, sinon il se
 * déclare « indisponible » en ligne, en silence.
 */
export const ROUTES_JUGE_EXECUTION = ['api/generateur/direct']

/** Routes qui assemblent (rolldown) : binding natif + canari obligatoires. */
export const ROUTES_ASSEMBLEUSES = [
  'api/generateur/direct',
  'api/generateur/direct/[id]',
  'api/generateur/livraison',
  'api/generateur/apercu',
  'api/generateur/apercu-live',
  'api/generateur/sonde',
  'p/[jeton]',
  'a/[sous]',
]

export function verifier() {
  const echecs = []
  const compte = (route, motif) => {
    const nft = join(APP, route, 'route.js.nft.json')
    if (!existsSync(nft)) {
      echecs.push(`${route} : nft INTROUVABLE — route renommée ? mettez ce manifeste à jour`)
      return -1
    }
    const fichiers = JSON.parse(readFileSync(nft, 'utf8')).files
    return fichiers.filter((f) => f.includes(motif)).length
  }

  if (!existsSync(APP)) {
    console.error('verifier-tracage : .next/server/app absent — lancez `next build` d’abord.')
    process.exit(1)
    }

  for (const r of ROUTES_EMISSION) {
    const air = compte(r, 'benchmarks/air-emission')
    if (air === 0) echecs.push(`${r} : la chaîne d'émission n'est PAS tracée (0 fichier air-emission)`)
    else if (air > 0 && air < 40) echecs.push(`${r} : traçage d'émission AMPUTÉ (${air} fichiers, ≥ 40 attendus)`)
    const zod = compte(r, '/node_modules/zod/')
    if (zod === 0) echecs.push(`${r} : zod absent — les modules tracés sont copiés comme des DONNÉES, leurs paquets doivent suivre`)
  }

  // Le juge d'exécution (EP-302) ne vit que dans la route qui écrit : son
// corps et son simulateur de DOM doivent entrer dans CETTE fonction, sinon
// il se déclare « indisponible » en ligne, en silence.
for (const r of ROUTES_JUGE_EXECUTION) {
  if (compte(r, 'juge-execution-enfant.mjs') === 0) {
    echecs.push(`${r} : le corps du juge d'exécution n'est pas tracé — le juge sera muet en ligne`)
  }
  if (compte(r, 'happy-dom') === 0) {
    echecs.push(`${r} : le simulateur de DOM n'est pas tracé — le juge ne pourra rien monter`)
  }
}

for (const r of ROUTES_ASSEMBLEUSES) {
    const canari = compte(r, '/node_modules/scheduler/')
    if (canari === 0) echecs.push(`${r} : CANARI absent — la clé de traçage de cette route est morte`)
    if (process.platform === 'linux') {
      const binding = compte(r, '@rolldown/binding-linux-x64-gnu')
      if (binding === 0) echecs.push(`${r} : binding natif rolldown absent — l'assemblage mourrait au premier appel`)
    }
  }
  if (process.platform !== 'linux') {
    console.log(`verifier-tracage : binding linux non vérifiable sur ${process.platform} — il l'est au build Vercel.`)
  }

  if (echecs.length > 0) {
    console.error('🔴 TRAÇAGE CONSTRUIT INCOMPLET — ce build ne doit PAS servir :')
    for (const e of echecs) console.error('   · ' + e)
    process.exit(1)
  }
  console.log(`✅ traçage construit vérifié : ${ROUTES_EMISSION.length} routes d'émission, ${ROUTES_ASSEMBLEUSES.length} assembleuses.`)
}

// Exécution directe seulement : l'import du manifeste doit rester inerte.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  verifier()
}
