/**
 * LE CONTRÔLE D'APRÈS-DÉPLOIEMENT — il ROUGIT, il ne signale pas.
 *
 * ── POURQUOI CE FICHIER EXISTE (exigence du propriétaire, 2026-10-31).
 *
 * La sonde RAPPORTAIT la divergence des deux réglages du moteur. Rapporter
 * n'est pas échouer : « dire » dans un corps JSON que personne n'ouvre est
 * la QUATRIÈME version du même défaut — après « TOUT ROULE » pendant qu'un
 * maillon était mort, « indisponible » en silence, et « hors périmètre »
 * devenu poli. Un contrôle rend rouge, ou il n'existe pas.
 *
 * Il lit le corps de la sonde sur l'entrée standard et sort en 1 à la
 * moindre anomalie. Le workflow l'appelle ; une sortie non nulle devient
 * une croix sur main et un courriel.
 *
 * Mesurable hors production : on lui donne un corps forgé et on lit son
 * code de sortie. C'est ainsi qu'on prouve qu'il mord sans casser le site.
 */

import { readFileSync } from 'node:fs'

const anomalies = []

/**
 * CE QUE LE NAVIGATEUR A RECU, lu dans la PAGE PUBLIQUE DEPLOYEE.
 *
 * Deux versions precedentes etaient fausses : lire les deux variables cote
 * serveur (mentait si le reglage changeait sans redeploiement), puis graver
 * la valeur au build (deplacait le faux vert — rien ne prouvait que
 * l'hebergeur avait regenere). Ici on MESURE le paquet client la ou il vit :
 * la balise est posee par un composant `'use client'`, donc sa valeur est
 * celle substituee a la compilation dans le JavaScript telecharge.
 */
export function moteurDuClient(html) {
  const m = /<meta[^>]*name="deribfy-moteur-client"[^>]*>/u.exec(String(html))
  if (m === null) return null
  const contenu = /content="([^"]*)"/u.exec(m[0])
  const posee = /data-posee="([^"]*)"/u.exec(m[0])
  if (contenu === null) return null
  return { moteur: contenu[1], posee: posee?.[1] === 'oui' }
}

/**
 * Juge le corps de la sonde ET la page publique. `html` peut etre null quand
 * la page n'a pas pu etre lue — c'est alors une anomalie, pas un silence.
 */
export function jugerSonde(corps, html = undefined) {
  const out = []
  const i = corps?.interrupteur
  if (i === undefined) out.push('la sonde ne rapporte pas son réglage de moteur')
  if (html !== undefined) {
    const client = moteurDuClient(html)
    if (client === null) {
      out.push(
        'la page publique ne porte pas la balise du moteur client : impossible de vérifier ' +
          "que l'écran et le serveur sont d'accord",
      )
    } else if (i !== undefined && client.moteur !== i.serveur) {
      out.push(
        `LES DEUX MONDES DU MOTEUR DIVERGENT : le serveur sert « ${String(i.serveur)} » ` +
          `(exécution) et le navigateur a reçu « ${client.moteur} » (paquet client). Une ` +
          'génération lancée frappera une porte fermée. Alignez les deux réglages chez ' +
          "l'hébergeur PUIS REDÉPLOYEZ : changer le réglage sans redéployer ne change pas " +
          "ce que l'écran a reçu.",
      )
    }
  }
  // Publier n'ecrit plus de DNS : tout repose sur le CNAME generique.
  // Mort, il ne casse rien AUJOURD'HUI — il casse la PROCHAINE
  // publication, et on l'apprendrait par un client.
  const g = corps?.generique
  if (g === undefined) out.push('la sonde ne rapporte pas l’état du CNAME générique')
  else if (g.vivant !== true) {
    out.push(
      g.resout === false
        ? `LE CNAME GÉNÉRIQUE EST MORT : « ${String(g.temoin)} » ne résout plus ` +
          `(${String(g.detail)}). Toute publication future rendra un lien introuvable.`
        : `LA POIGNÉE DE MAIN TLS ÉCHOUE sur « ${String(g.temoin)} », qui résout pourtant ` +
          `(${String(g.detail)}). DEUX CAUSES POSSIBLES, dans cet ordre :\n` +
          `     1. le témoin a été DÉTACHÉ du projet chez Vercel — vérifiez-le d'abord, ` +
          `c'est un domaine comme un autre et un ménage suffit à l'emporter ;\n` +
          `     2. Vercel n'émet plus les certificats à la demande — alors les adresses ` +
          'publiées répondront « connexion non sécurisée », et c\'est grave.',
    )
  }

  const e = corps?.execution
  if (e === undefined) out.push('la sonde ne rapporte pas le juge de démarrage')
  else if (e.utilisable !== true) {
    out.push(`le juge de démarrage est INDISPONIBLE en ligne : ${String(e.indisponible ?? '?')}`)
  }
  const a = corps?.assemblage
  if (a === undefined || a.ok !== true) out.push('l’assembleur ne rend plus de bundle')
  return out
}

// Exécution directe : lire l'entrée standard, juger, sortir 0 ou 1.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  let brut = ''
  for await (const bout of process.stdin) brut += bout
  let corps
  try {
    corps = JSON.parse(brut)
  } catch {
    console.error('🔴 la sonde n’a pas rendu de JSON lisible')
    process.exit(1)
  }
  const html = process.argv[2] === undefined ? undefined : readFileSync(process.argv[2], 'utf8')
  anomalies.push(...jugerSonde(corps, html))
  if (anomalies.length > 0) {
    console.error('🔴 SONDE EN ÉCHEC — ce déploiement ne doit pas être considéré comme sain :')
    for (const a of anomalies) console.error('   · ' + a)
    process.exit(1)
  }
  const e = corps.execution ?? {}
  const c = html === undefined ? null : moteurDuClient(html)
  console.log(
    `✅ sonde saine : serveur « ${String(corps.interrupteur?.serveur)} »` +
      (c === null ? ' (page non lue)' : ` et navigateur « ${c.moteur} » d'accord`) +
      ', ' +
      `juge de démarrage utilisable sur ${String(e.surQuoi ?? '?')} en ${String(e.ms ?? '?')} ms.`,
  )
  // ── CE QUE VAUT CE VERT, DIT EN PROPORTION ET PAS EN PAIRE BRUTE.
  //
  // Mesure du 2026-11-01 sur l'oeuvre f21071cf : 24 controles ouverts sur
  // 113 decouverts. Un lecteur presse lit « 24 » et croit que c'est
  // beaucoup : c'est 21 %. Et avec `verifieDansNavigateur: false` a cote,
  // les deux disent exactement ce qu'une application « livree » a traverse.
  //
  // Ce n'est PAS une anomalie -- la sonde reste verte -- mais un vert qui
  // taira la proportion se lira comme « eprouvee », et ce mot serait faux.
  const vus = Number(e.visites ?? 0)
  const trouves = Number(e.decouverts ?? 0)
  const pour = trouves > 0 ? Math.round((vus / trouves) * 100) : null
  console.log(
    '   portée de l’épreuve : ' +
      (pour === null
        ? `${String(vus)} contrôle(s), dénominateur inconnu`
        : `${String(vus)} contrôles sur ${String(trouves)} (${String(pour)} %) ` +
          `des contrôles des ${String(e.ecrans ?? '?')} écran(s) atteint(s)`) +
      ` · dans un navigateur réel : ${e.verifieDansNavigateur === true ? 'OUI' : 'NON'}`,
  )
}
