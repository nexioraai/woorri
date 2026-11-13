/**
 * APPELÉ PAR LES TESTS, PAR CONSTRUCTION — à l’étape 1 seulement (EP-365) : branché par l’étape 4.
 *
 * LA CONSIGNE DU CONTRAT — GÉNÉRÉE, jamais écrite à la main.
 *
 * Tout identifiant y figure entre accents graves, et vient du catalogue :
 * un cliquet compare l'ensemble des identifiants de la consigne à
 * `identifiantsDuCatalogue()` dans les DEUX sens (rien d'oublié, rien
 * d'inventé). La prose qui les relie ne nomme rien qui ne soit au catalogue.
 *
 * Cette consigne est celle de la passe stricte (B) de l'étape 4 ; à l'étape 1
 * elle n'est envoyée à aucun modèle.
 */
import {
  ACTIONS, COMPOSANTS, EVENEMENTS, ICONES, JETONS, NATURES_ETAT, PROPS_COMMUNES, PROPS_ECRAN, PROPS_SPEC, ROUTES_SOCLE,
  SOURCES, VUES_TETRADE, type DefProp, type Genre,
} from './catalogue'

const q = (x: string) => `\`${x}\``

function decrireGenre(g: Genre): string {
  switch (g.g) {
    case 'texte': return `texte ${q('{ "$t": … }')}`
    case 'liaison': return `liaison ${q('{ "$data": … }')}`
    case 'jeton': return `jeton ${q(g.jeu)}`
    case 'variante': return g.valeurs.map(q).join(' | ')
    case 'icone': return 'une icône'
    case 'booleen': return 'true | false'
    case 'enfants': return 'liste de composants'
    case 'effets': return 'liste d’actions, au moins une'
    case 'choix': return `liste de ${q('{ "valeur": …, "libelle": { "$t": … } }')}`
    case 'filtres': return `liste de ${q('{ "champ": …, "egal": { "$data": … } }')}`
    case 'ecritures': return `liste de ${q('{ "champ": …, "depuis": { "$data": … } }')} (ou une valeur simple)`
    case 'route': return 'une route du plan'
    case 'table': return 'une table déclarée'
    case 'chemin': return `${q('etat')}.<nom>`
    case 'donneeOuValeur': return 'une valeur simple, ou une liaison'
    case 'codeLangue': return 'un code de langue lue'
  }
}

const ligneProp = (nom: string, d: DefProp) => `    - ${q(nom)} (${d.requis ? 'requis' : 'facultatif'}) : ${decrireGenre(d.genre)} — ${d.aide}`

export function genererConsigne(): string {
  const s: string[] = []
  s.push('Tu rends UN SEUL objet JSON qui suit ce contrat, et rien d’autre. Toute clé absente du contrat est refusée ; tout nom inventé est refusé, avec le nom valide le plus proche.')
  s.push('')
  s.push('APPLICATION :')
  for (const [k, aide] of Object.entries(PROPS_SPEC)) s.push(`  - ${q(k)} : ${aide}`)
  s.push(`  Une traduction : ${q('langue')}, ${q('textes')} ; un texte traduit : ${q('cle')}, ${q('texte')}.`)
  s.push('')
  s.push('ÉCRAN :')
  for (const [k, aide] of Object.entries(PROPS_ECRAN)) s.push(`  - ${q(k)} : ${aide}`)
  s.push(`  Tétrade : ${q('table')}, ${q('vue')} parmi ${VUES_TETRADE.map(q).join(', ')}.`)
  s.push(`  État : ${q('nom')}, ${q('nature')} parmi ${NATURES_ETAT.map(q).join(', ')}, ${q('initial')}.`)
  s.push(`  Rôle : un rôle lu, ou ${q('visiteur')}. Routes du socle, écrites par Deribfy : ${ROUTES_SOCLE.map(q).join(', ')}.`)
  s.push('')
  s.push(`COMPOSANTS — chacun s’écrit ${q('{ "composant": … }')} :`)
  for (const [nom, def] of Object.entries(COMPOSANTS)) {
    s.push(`  ${q(nom)} — ${def.aide}`)
    for (const [prop, d] of Object.entries(def.props)) s.push(ligneProp(prop, d))
  }
  s.push('  Tous les composants acceptent aussi :')
  for (const [prop, d] of Object.entries(PROPS_COMMUNES)) s.push(ligneProp(prop, d))
  s.push(`  Un choix : ${q('valeur')}, ${q('libelle')}. Un filtre : ${q('champ')}, ${q('egal')}. Une écriture : ${q('champ')}, ${q('depuis')}.`)
  s.push('')
  s.push('JETONS — des noms, jamais une valeur :')
  for (const [jeu, valeurs] of Object.entries(JETONS)) s.push(`  - ${q(jeu)} : ${valeurs.map(q).join(', ')}`)
  s.push('')
  s.push(`ICÔNES : ${ICONES.map(q).join(', ')}`)
  s.push('')
  s.push(`ACTIONS — chacune s’écrit ${q('{ "faire": … }')} :`)
  for (const [faire, def] of Object.entries(ACTIONS)) {
    s.push(`  ${q(faire)} — ${def.aide}`)
    for (const [arg, d] of Object.entries(def.args as Readonly<Record<string, DefProp>>)) s.push(ligneProp(arg, d))
  }
  s.push(`  Événements : ${EVENEMENTS.map(q).join(', ')}.`)
  s.push('')
  s.push(`TEXTES : jamais une phrase en dur — une clé ${q('$t')}, traduite dans CHAQUE langue lue.`)
  s.push(`DONNÉES : jamais une valeur inventée — une liaison ${q('$data')} :`)
  for (const [src, aide] of Object.entries(SOURCES)) s.push(`  - ${q(src)} : ${aide.replace(/`([^`]+)`/gu, '$1')}`)
  s.push('')
  s.push('RÈGLES :')
  s.push('  - aucune langue, devise, moyen de paiement ni pays que la lecture du cahier ne nomme ;')
  s.push(`  - un ${q('Bouton')} porte au moins un effet, et cet effet change ce que l’écran montre ou mène ailleurs ;`)
  s.push(`  - un ${q('Champ')} sert : sa donnée est lue par un filtre, une écriture ou un affichage ;`)
  s.push(`  - on écrit une table par ${q('submit')}, jamais par ${q('setState')} ;`)
  s.push('  - chaque écran a une entrée et une sortie ; le parcours lu se suit d’écran en écran.')
  return s.join('\n')
}

/** Les identifiants que la consigne nomme (entre accents graves, découpés en mots du contrat). */
export function identifiantsDeLaConsigne(consigne: string): Set<string> {
  const s = new Set<string>()
  for (const m of consigne.matchAll(/`([^`]+)`/gu)) {
    const brut = m[1]!
    for (const mot of brut.match(/\$?[A-Za-z][A-Za-z0-9]*/gu) ?? []) s.add(mot)
  }
  return s
}
