/**
 * M1 · CE QUI A CHANGÉ ENTRE DEUX DÉCLARATIONS, ET CE QU'ON S'INTERDIT.
 *
 * ── LE CHANTIER, DANS LES MOTS DU PROPRIÉTAIRE.
 *
 *   « Une fois l'application générée, les utilisateurs doivent pouvoir
 *     demander des ajouts et des améliorations SANS régénérer une autre
 *     application. Sinon il faudrait dire à leurs propres clients
 *     "quittez cette appli, venez sur celle-ci" — ça n'a aucun sens. »
 *
 * Modifier une œuvre qui porte les VRAIES données de quelqu'un est le
 * geste le plus risqué de ce produit. Ce module ne touche à rien : il
 * REGARDE deux déclarations et dit ce qui se passerait. Aucun SQL, aucune
 * base, aucune dépense.
 *
 * ── LE PIRE MODE D'ÉCHEC EST SILENCIEUX, ET IL N'EST PAS L'EFFACEMENT.
 *
 * `releve` porte 2 lignes. Le modèle déclare `releves`. La migration émet
 * `create table if not exists releves` :
 *
 *     releve  → 2 lignes      releves → 0 ligne      total → 2
 *
 * AUCUNE BAISSE. Un contrôle qui compte les lignes avant et après est
 * VERT — et l'utilisateur voit ses relevés disparaître. Ils sont là,
 * invisibles, dans une table que plus personne ne lit. Une erreur franche
 * serait meilleure.
 *
 * J'avais écrit que le comptage était « la garde qui compte ». C'est
 * faux : il constate les EFFACEMENTS, il est aveugle aux ABANDONS. La
 * garde qui couvre ce cas est celle-ci, et elle doit donc être étanche —
 * pas un filet d'appoint.
 *
 * ── LA RÈGLE, DANS SA FORME EXACTE.
 *
 *   TOUTE TABLE PRÉSENTE DANS L'ANCIENNE DÉCLARATION ET ABSENTE DE LA
 *   NOUVELLE ARRÊTE LA MIGRATION. On demande, on ne devine pas — qu'une
 *   table nouvelle apparaisse ou non.
 *
 * La première forme disait « une table disparaît ET une table apparaît ».
 * Un renommage accompagné d'un ajout légitime serait passé entre les deux
 * conditions. La disparition suffit, seule.
 *
 * ── ET L'IDENTITÉ EST L'IDENTIFIANT, JAMAIS LE NOM AFFICHÉ.
 *
 * Le SQL nomme ses tables depuis `id` (sans son préfixe), pas depuis
 * `name`. Comparer les noms affichés ferait passer un simple changement
 * de libellé — « relevé » devient « Relevé mensuel » — pour un abandon,
 * et arrêterait une modification parfaitement sûre.
 *
 * On emploie donc EXACTEMENT la règle de nommage du SQL. Une seconde
 * règle divergerait, et la divergence se découvrirait sur les données de
 * quelqu'un.
 */
import { nomColonne, nomTable, type EntiteDeclaree } from './entites-declarees'

/** Un écart entre deux déclarations, et ce qu'il impliquerait. */
export type EcartMigration =
  | { readonly genre: 'table-ajoutee'; readonly table: string }
  | {
      readonly genre: 'champ-ajoute'
      readonly table: string
      readonly champ: string
    }
  | { readonly genre: 'table-abandonnee'; readonly table: string }
  | { readonly genre: 'champ-abandonne'; readonly table: string; readonly champ: string }
  | {
      readonly genre: 'type-change'
      readonly table: string
      readonly champ: string
      readonly avant: string
      readonly apres: string
    }
  | { readonly genre: 'unicite-changee'; readonly table: string; readonly champ: string }
  | { readonly genre: 'obligation-changee'; readonly table: string; readonly champ: string }
  | { readonly genre: 'porte-changee'; readonly table: string }

/**
 * LES TROIS SORTS D'UN ÉCART, et ils ne se mélangent pas.
 *
 * · `ajout`     — M2 l'émettra. Strictement additif.
 * · `arret`     — la migration s'arrête et on DEMANDE. Jamais de devinette.
 * · `sansEffet` — rien à faire en base, mais ça se DIT : un écart tu est
 *                 un écart qu'on croira appliqué.
 */
export type SortEcart = 'ajout' | 'arret' | 'sansEffet'

export function sortDe(e: EcartMigration): SortEcart {
  switch (e.genre) {
    case 'table-ajoutee':
    case 'champ-ajoute':
      return 'ajout'
    // ── CE QUI ARRÊTE, ET POURQUOI CHACUN.
    //
    // · une table ou un champ ABANDONNÉ : ses lignes ne sont dans AUCUN
    //   historique — les versions gardent le code, jamais les données ;
    // · un TYPE changé : `alter column type` peut échouer ou tronquer ;
    // · une UNICITÉ ajoutée : l'index échoue si des doublons existent
    //   déjà, et c'est précisément sur des données réelles que ça arrive.
    case 'table-abandonnee':
    case 'champ-abandonne':
    case 'type-change':
    case 'unicite-changee':
      return 'arret'
    // ── CE QUI NE TOUCHE À RIEN.
    //
    // L'obligation : on n'ajoute JAMAIS `not null` à une colonne posée sur
    // des lignes qui existent — l'obligation vit dans l'écran. Changer
    // `required` ne produit donc aucun SQL, dans les deux sens.
    //
    // La porte : les politiques font `drop policy if exists` avant
    // `create policy`, donc les réappliquer suffit. Rien à migrer.
    case 'obligation-changee':
    case 'porte-changee':
      return 'sansEffet'
  }
}

export type PlanMigration = {
  readonly ecarts: readonly EcartMigration[]
  readonly ajouts: readonly EcartMigration[]
  readonly arrets: readonly EcartMigration[]
  readonly sansEffet: readonly EcartMigration[]
  /** `false` dès qu'un seul écart arrête. Jamais « en grande partie sûr ». */
  readonly peutAvancer: boolean
}

/** La clé d'un champ dans sa table — la MÊME que celle du SQL. */
function clesDesChamps(e: EntiteDeclaree): Map<string, EntiteDeclaree['fields'][number]> {
  return new Map(e.fields.map((f) => [nomColonne(f), f]))
}

/**
 * COMPARE DEUX DÉCLARATIONS. Ne touche à rien, ne décide de rien.
 *
 * ── CE QUE L'APPELANT DEVRA GARANTIR, ET CE MODULE NE PEUT PAS LE FAIRE.
 *
 * La déclaration NOUVELLE doit être écrite par un modèle à qui l'on a
 * montré l'ANCIENNE. Sans ça il réinvente ses identifiants à chaque tour,
 * toutes les tables paraissent abandonnées, et la migration s'arrête
 * systématiquement — garde étanche, produit inutilisable.
 *
 * C'est une contrainte de M4, pas de M1. Elle est écrite ici parce que
 * c'est ici qu'on la découvrirait trop tard.
 */
export function comparerDeclarations(
  ancienne: readonly EntiteDeclaree[],
  nouvelle: readonly EntiteDeclaree[],
): PlanMigration {
  const avant = new Map(ancienne.map((e) => [nomTable(e), e]))
  const apres = new Map(nouvelle.map((e) => [nomTable(e), e]))
  const ecarts: EcartMigration[] = []

  // ── LA GARDE ÉTANCHE, EN PREMIER : toute table qui s'en va arrête.
  //
  // Seule, sans condition sur ce qui apparaît par ailleurs.
  for (const table of avant.keys()) {
    if (!apres.has(table)) ecarts.push({ genre: 'table-abandonnee', table })
  }

  for (const [table, neuve] of apres) {
    const vieille = avant.get(table)
    if (vieille === undefined) {
      ecarts.push({ genre: 'table-ajoutee', table })
      continue
    }
    const champsAvant = clesDesChamps(vieille)
    const champsApres = clesDesChamps(neuve)

    for (const champ of champsAvant.keys()) {
      if (!champsApres.has(champ)) ecarts.push({ genre: 'champ-abandonne', table, champ })
    }
    for (const [champ, f] of champsApres) {
      const g = champsAvant.get(champ)
      if (g === undefined) {
        ecarts.push({ genre: 'champ-ajoute', table, champ })
        continue
      }
      if (g.type !== f.type) {
        ecarts.push({ genre: 'type-change', table, champ, avant: g.type, apres: f.type })
      }
      // L'unicité ne se RETIRE pas sans risque non plus : un index qu'on
      // laisse tomber est une contrainte que l'application croit tenir.
      if ((g.unique === true) !== (f.unique === true)) {
        ecarts.push({ genre: 'unicite-changee', table, champ })
      }
      if (g.required !== f.required) {
        ecarts.push({ genre: 'obligation-changee', table, champ })
      }
    }
    if ((vieille.appendOnly === true) !== (neuve.appendOnly === true)) {
      ecarts.push({ genre: 'porte-changee', table })
    }
  }

  const ajouts = ecarts.filter((e) => sortDe(e) === 'ajout')
  const arrets = ecarts.filter((e) => sortDe(e) === 'arret')
  const sansEffet = ecarts.filter((e) => sortDe(e) === 'sansEffet')
  return { ecarts, ajouts, arrets, sansEffet, peutAvancer: arrets.length === 0 }
}

/**
 * CE QU'ON DIT À LA PERSONNE QUAND ON S'ARRÊTE.
 *
 * ── UN ARRÊT QU'ON NE COMPREND PAS EST UN ARRÊT QU'ON CONTOURNE.
 *
 * Le propriétaire n'a pas à savoir ce qu'est une migration. Il doit
 * savoir ce qui a failli arriver à SES données, et quoi faire. On nomme
 * donc la table dans ses mots, et on propose le geste — pas le concept.
 */
export function phraseArret(plan: PlanMigration): string | null {
  if (plan.peutAvancer) return null
  const abandons = plan.arrets.filter(
    (e) => e.genre === 'table-abandonnee' || e.genre === 'champ-abandonne',
  )
  const lignes = plan.arrets.map((e) => {
    switch (e.genre) {
      case 'table-abandonnee':
        return `- « ${e.table} » n’est plus déclarée : ses données ne seraient plus lues par personne.`
      case 'champ-abandonne':
        return `- « ${e.champ} » disparaît de « ${e.table} » : ce qui y est saisi serait abandonné.`
      case 'type-change':
        return `- « ${e.champ} » change de nature dans « ${e.table} » (${e.avant} → ${e.apres}) : les valeurs déjà saisies pourraient ne plus tenir.`
      case 'unicite-changee':
        return `- « ${e.champ} » change de règle d’unicité dans « ${e.table} » : la base refuserait si des doublons existent déjà.`
      default:
        return `- ${e.genre}`
    }
  })
  return (
    'CETTE MODIFICATION TOUCHERAIT À DES DONNÉES DÉJÀ ENREGISTRÉES — elle est ' +
    'arrêtée avant d’être appliquée :\n' +
    lignes.join('\n') +
    (abandons.length > 0
      ? '\n\nSi vous vouliez RENOMMER quelque chose, dites-le explicitement : ' +
        'renommer et supprimer se ressemblent de l’extérieur, et seule l’une ' +
        'des deux conserve ce qui est déjà saisi.'
      : '') +
    '\n\nRien n’a été modifié. Vos données sont intactes.'
  )
}
