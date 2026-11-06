/**
 * PROUVER QUE LA GARDE DU TÉMOIN CRIE VRAIMENT — GEN-D037 ③.
 *
 * ── POURQUOI CE FICHIER EXISTE.
 *
 * `avecTemoin` promet, dans son propre commentaire, que le retrait « est
 * VÉRIFIÉ ». Lire le code ne suffit pas à le croire : il faut METTRE LA
 * RELECTURE EN ÉCHEC et regarder si l'alerte part. Consigne du propriétaire,
 * 2026-11-06 : « ne la corrige pas par raisonnement ».
 *
 * `fetch` est intercepté : la suppression passe normalement, et SEULE la
 * relecture de vérification reçoit une erreur.
 *
 * ── LE 5xx NE MARCHE PAS, ET C'EST LA DÉCOUVERTE DE LA SÉANCE.
 *
 * Première tentative : 503. Mesure — supabase-js REJOUE la requête. La trace
 * montre #4 tuée en 503, puis #5, le MÊME GET, en 200. `reste.status` valait
 * 200, et l'alerte restait muette POUR UNE AUTRE RAISON que le défaut. Ma
 * « démonstration » ne démontrait rien : le client guérissait la panne que je
 * croyais injecter. Une injection non vérifiée est une mutation sans assert.
 *
 * Un 4xx n'est pas rejoué. D'où le 403 / 42501 ci-dessous — qui est aussi la
 * panne réaliste : un privilège retiré en cours de route.
 *
 * ── RÉSULTAT MESURÉ LE 2026-11-06.
 *
 *   code d'origine (HEAD)  →  alerte MUETTE, et le journal imprime « retiré »
 *   code corrigé           →  alerte, avec la cause exacte
 *
 * Usage : node scripts/prouver-garde-temoin.mjs
 */
const vraiFetch = globalThis.fetch
let n = 0, tuee = false
globalThis.fetch = async (url, init) => {
  const m = (init?.method ?? 'GET').toUpperCase()
  const u = String(url)
  const chemin = u.split('/rest/v1/')[1]?.slice(0, 52) ?? u.slice(0, 52)
  n += 1
  // ON NE TUE QUE LA DERNIÈRE REQUÊTE DU CYCLE : la relecture de
  // vérification est le SEUL GET sur la table après la suppression finale.
  const estRelecture = m === 'GET' && u.includes('app_generations') && u.includes('id=eq.')
  if (estRelecture && !tuee) {
    tuee = true
    console.log(`      #${n} ${m} ${chemin}   ← TUÉE (403)`)
    // 403 ET NON 503 : mesuré le 2026-11-06, supabase-js REJOUE un 5xx —
    // la requête tuée en 503 revenait en 200 au second essai, et mon
    // injection ne mesurait rien. Un 4xx n'est pas rejoué.
    return new Response('{"code":"42501","message":"permission denied for table app_generations"}', { status: 403, headers: { 'content-type': 'application/json' } })
  }
  console.log(`      #${n} ${m.padEnd(6)} ${chemin}`)
  return vraiFetch(url, init)
}
const { avecTemoin } = await import('./temoin-en-base.mjs')
const lignes = []
const vraiLog = console.log
console.log = (...a) => { lignes.push(a.join(' ')); vraiLog(...a) }
await avecTemoin({ table: 'app_generations', champs: {}, mesure: async () => 'ok' })
console.log = vraiLog
const alerte = lignes.some((l) => l.includes('RETRAIT RATÉ'))
// PAS DE \b AUTOUR D'UN MOT ACCENTUÉ : en JavaScript \b se fonde sur
// [A-Za-z0-9_], et « é » n'en fait pas partie — la frontière n'existe pas et
// le test est TOUJOURS faux. Mesuré le 2026-11-06 : l'indicateur annonçait
// « non » sur un journal qui imprimait « retiré ». Resserrer une vérification
// correcte l'avait rendue aveugle.
const retire = lignes.some((l) => l.includes('retiré') && !l.includes('RATÉ'))
console.log(`\n   une relecture a-t-elle été tuée ? ${tuee ? 'OUI' : 'NON — injection ratée, mesure nulle'}`)
console.log(`   alerte « RETRAIT RATÉ » ?         ${alerte ? '🟢 OUI' : '🔴 NON'}`)
console.log(`   journal annonce « retiré » ?      ${retire ? '🔴 OUI — il ment' : '🟢 non'}`)
