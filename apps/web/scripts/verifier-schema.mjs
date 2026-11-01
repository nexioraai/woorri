/**
 * LE VERDICT DE LA SONDE DE SCHÉMA — et il sort en 1.
 *
 * ── POURQUOI LE VERDICT N'EST PAS DANS LA ROUTE.
 *
 * « Un contrôle dont on n'a jamais vu l'ÉCHEC n'est pas un contrôle. » Le
 * workflow d'après-déploiement a été modifié CINQ fois sans tourner une
 * seule, et c'est le propriétaire qui l'a relevé. Si la route rendait
 * « conforme / écart », on ne pourrait éprouver son échec qu'en abîmant la
 * base.
 *
 * Elle rend donc la MESURE BRUTE, et ce script en tire le verdict. On peut
 * alors lui présenter un corps FORGÉ — une réponse amputée d'une colonne —
 * et voir la croix rouge pour de vrai, sans toucher à la base.
 *
 *   node scripts/verifier-schema.mjs < mesure.json      → 0 si conforme
 *   node scripts/verifier-schema.mjs < mesure-forgee.json → 1
 *
 * ── CE QUI FAIT ROUGIR, ET CE QUI NE FAIT PAS.
 *
 * Rougissent : une colonne manquante, une colonne vivante non déclarée, un
 * écart de type/nullabilité/défaut, une contrainte absente ou trop étroite,
 * une contrainte déclarée sans sonde, et TOUT « non mesuré » — on ne conclut
 * jamais « conforme » sur ce qu'on n'a pas pu mesurer.
 *
 * Ne rougit pas : `parDecision`, ce qu'on a DÉCIDÉ de ne pas mesurer. Mais
 * c'est IMPRIMÉ à chaque fois : une décision assumée n'est pas un silence, à
 * condition qu'on la lise.
 *
 * ── ET UNE MESURE VIDE EST UN ÉCHEC, PAS UN SUCCÈS.
 *
 * Sans cette garde, une route cassée rendant `{}` passerait pour un schéma
 * parfait — le faux vert dans sa forme la plus pure.
 */
import { readFileSync } from 'node:fs'

const CHAMPS_ROUGES = [
  ['colonnesManquantes', 'déclarée(s) au dépôt, ABSENTE(S) de la base'],
  ['colonnesNonDeclarees', 'vivante(s) en base, DÉCLARÉE(S) NULLE PART'],
  ['colonnesEnEcart', 'de forme différente (type / nullabilité / défaut)'],
  ['contraintesEnEcart', 'contrainte(s) que la base n’applique pas comme déclaré'],
  ['contraintesSansSonde', 'contrainte(s) déclarée(s) qu’aucune sonde n’exerce'],
  ['nonMesure', 'NON MESURÉ — on ne conclut pas sans mesure'],
]

const brut = readFileSync(process.stdin.fd, 'utf8')
let mesure
try {
  mesure = JSON.parse(brut)
} catch {
  console.error('🔴 mesure illisible : la réponse de la sonde n’est pas du JSON')
  process.exit(1)
}

const ecarts = Array.isArray(mesure.ecarts) ? mesure.ecarts : []
if (ecarts.length === 0) {
  console.error('🔴 mesure VIDE : aucune table mesurée — la sonde n’a rien rendu')
  process.exit(1)
}

let rouge = 0
for (const e of ecarts) {
  console.log(`── ${String(e.table)}`)
  for (const d of e.parDecision ?? []) console.log(`   · par décision : ${String(d)}`)
  for (const [champ, libelle] of CHAMPS_ROUGES) {
    const v = e[champ] ?? []
    if (v.length === 0) continue
    rouge += v.length
    console.log(`   🔴 ${String(v.length)} ${libelle} :`)
    for (const x of v) {
      console.log(`      - ${typeof x === 'string' ? x : JSON.stringify(x)}`)
    }
  }
  if (!CHAMPS_ROUGES.some(([c]) => (e[c] ?? []).length > 0)) console.log('   ✅ conforme')
}

// ── LA FONCTION DE LECTURE DU SCHEMA NE DOIT PAS ETRE PUBLIQUE.
//
// Mesure du 2026-11-01 : revoquer « anon » laissait l'heritage de PUBLIC
// intact, et la clef anonyme appelait la fonction. Elle ne rend que du
// schema, mais une capacite ouverte sans qu'on le sache reste une capacite
// ouverte — et c'est ma propre affirmation qui etait fausse.
if (mesure.rpcOuverteAuPublic === true) {
  rouge += 1
  console.log('   🔴 la fonction `contraintes_vivantes` repond a la CLEF ANONYME —')
  console.log('      revoquez PUBLIC, pas seulement anon (voir `sqlPour`)')
} else if (mesure.rpcOuverteAuPublic === null || mesure.rpcOuverteAuPublic === undefined) {
  rouge += 1
  // LA CAUSE SE NOMME, comme pour le temoin detache : sans cette phrase, la
  // croix rouge ferait chercher une derive de schema la ou il manque une
  // variable d'environnement.
  console.log('   🔴 ouverture au public NON MESUREE — la variable')
  console.log('      NEXT_PUBLIC_SUPABASE_ANON_KEY manque sur le serveur qui a repondu.')
  console.log('      CE N\'EST PAS UNE DERIVE DE SCHEMA : c\'est une variable a poser')
  console.log('      chez l\'hebergeur. Tant qu\'elle manque, la revocation de la')
  console.log('      fonction `contraintes_vivantes` n\'est pas verifiee.')
}

if ((mesure.fantomesRetires ?? []).length > 0) {
  // PAS un écart de schéma, mais ça se DIT : un fantôme signale une sonde
  // tuée avant son nettoyage, et personne ne doit l'apprendre par hasard.
  console.log(`⚠ ${String(mesure.fantomesRetires.length)} témoin(s) fantôme(s) retiré(s) à l’ouverture`)
}

if (rouge > 0) {
  console.error(`\n🔴 SCHÉMA EN ÉCART — ${String(rouge)} point(s). La base en ligne ne correspond pas au DDL du dépôt.`)
  process.exit(1)
}
console.log('\n✅ SCHÉMA CONFORME au DDL du dépôt.')
