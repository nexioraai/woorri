/**
 * CE QUE LA PUBLICATION REND LISIBLE — dit avec le contenu, pas les noms de table.
 *
 * ── LE DÉFAUT (décision 2 du propriétaire, 2026-11-16).
 *
 * L'avertissement disait « vehicule, reparation ». Exact sur les droits,
 * insuffisant sur le fond : un commerçant n'en tire rien. Mesuré le même
 * jour (simulation des vrais émetteurs, docs/elite-protocol/
 * ENQUETE_LECTURE_PUBLIQUE.md §2) : publier une table, c'est rendre TOUTES
 * ses colonnes conservées lisibles — montant de la main-d'œuvre,
 * description, immatriculation — et TOUTES ses lignes, la clé de lecture
 * étant dans la page.
 *
 * ── LE LIBELLÉ : DÉCLARÉ, OU LE NOM SANS SES TIRETS BAS. JAMAIS INVENTÉ.
 *
 * Le champ porte un `label` quand la déclaration l'a écrit (AIR 1.10,
 * air.ts:946). Sinon on montre le nom avec des espaces (« montant main
 * oeuvre ») : on ne devine ni accent ni traduction — la règle d'AIR
 * (air.ts:935-944) l'interdit, et un libellé deviné pourrait taire ce
 * que la colonne contient vraiment.
 *
 * ── LES COLONNES : CELLES QUE LE SCHÉMA CONSERVE.
 *
 * Même filtre que `champsConserves` du compilateur (schema-donnees.ts:87) :
 * un champ dérivé ou `sensitive` n'est pas stocké, il ne peut donc pas
 * être lu. Les dire publics serait faux dans l'autre sens.
 */
import { lecturePubliqueDe, lecturePubliqueLue, nomTable, type EntiteDeclaree } from './entites-declarees'

export type ContenuPublic = { readonly table: string; readonly champs: readonly string[]; readonly seulement?: string }

/** La phrase mesurée : ce n'est pas « quelqu'un pourrait tomber dessus ». */
export const PHRASE_LISTE_ENTIERE =
  'Ces informations sont téléchargeables d’un coup : la clé de lecture est dans la page publiée, ' +
  'et n’importe qui peut récupérer toutes les lignes visibles — pas seulement tomber sur l’une d’elles.'

type ChampLu = { readonly name?: unknown; readonly label?: unknown; readonly derived?: unknown; readonly sensitive?: unknown }

/** Le libellé déclaré (français d'abord), sinon le nom sans ses tirets bas. */
export function libelleChamp(f: ChampLu): string {
  if (Array.isArray(f.label)) {
    const textes = (f.label as unknown[]).filter(
      (l): l is { locale: string; text: string } =>
        l !== null && typeof l === 'object' &&
        typeof (l as { text?: unknown }).text === 'string' && (l as { text: string }).text.trim() !== '',
    )
    const choisi = textes.find((l) => typeof l.locale === 'string' && l.locale.toLowerCase().startsWith('fr')) ?? textes[0]
    if (choisi !== undefined) return choisi.text.trim()
  }
  return String(f.name ?? '').replace(/_+/gu, ' ').trim()
}

/**
 * CHAQUE TABLE PUBLIQUE, AVEC CE QU'UN VISITEUR Y LIRA — ET RIEN D'AUTRE
 * (2026-11-23). Ce sont les colonnes que la BASE lui accorde
 * (`lecturePubliqueLue`, copie de l'émetteur), pas toutes celles de la table :
 * la fenêtre dit exactement ce qui sera visible par tous. Une table publique
 * qui ne dit pas ses colonnes n'accorde RIEN, et la liste est vide.
 */
export function contenusPublics(entites: readonly EntiteDeclaree[]): ContenuPublic[] {
  return entites.filter(lecturePubliqueDe).map((e) => {
    const lue = lecturePubliqueLue(e)
    if (!lue.ok) return { table: nomTable(e), champs: [] }
    const parColonne = new Map((e.fields as readonly (ChampLu & { id: string })[]).map((f) => [f.id.replace(/^fld_/u, ''), f]))
    const conditions = new Set(lue.conditions.map((c) => c.champ))
    const champs = lue.colonnes
      .filter((c) => c !== 'id' && !conditions.has(c))
      .map((c) => { const f = parColonne.get(c); return f === undefined ? c : libelleChamp(f) })
      .filter((l) => l !== '')
    const seulement = lue.conditions
      .map((c) => {
        const f = parColonne.get(c.champ)
        const valeur = typeof c.vaut === 'boolean' ? (c.vaut ? 'oui' : 'non') : String(c.vaut)
        return `« ${f === undefined ? c.champ : libelleChamp(f)} » vaut ${valeur}`
      })
      .join(' et ')
    return { table: nomTable(e), champs, ...(seulement === '' ? {} : { seulement }) }
  })
}

/** « vehicule : marque, modele, immatriculation ; reparation : … » */
export function phraseContenus(contenus: readonly ContenuPublic[]): string {
  return contenus
    .map((c) => `« ${c.table} » (${c.champs.length > 0 ? c.champs.join(', ') : 'aucune colonne déclarée'}${c.seulement === undefined ? '' : ` — seulement les lignes où ${c.seulement}`})`)
    .join(' ; ')
}

/**
 * LES LISTES PUBLIQUES, DITES À UN CLIENT (2026-11-22). Le propriétaire a jugé
 * le texte technique incompréhensible (« clé de lecture », « page servie ») :
 * la fenêtre « Publier » nomme chaque liste par son LIBELLÉ et ses colonnes.
 */
export type ListePublique = { readonly nom: string; readonly champs: readonly string[]; readonly seulement?: string }

export function listesPubliques(entites: readonly EntiteDeclaree[]): ListePublique[] {
  return entites.filter(lecturePubliqueDe).map((e) => {
    const c = contenusPublics([e])[0]
    return {
      nom: libelleChamp(e as unknown as ChampLu) || nomTable(e),
      champs: c?.champs ?? [],
      ...(c?.seulement === undefined ? {} : { seulement: c.seulement }),
    }
  })
}

/** Une phrase par liste, sans un mot technique. */
export function phraseListePublique(l: ListePublique): string {
  // ── RIEN D'ACCORDÉ : on ne promet pas une liste visible qui sera vide.
  if (l.champs.length === 0) {
    return `À savoir : votre liste « ${l.nom} » ne sera visible par personne — l’application ne dit pas quelles informations montrer. Pour la montrer, demandez-le dans l’atelier.`
  }
  const lignes = l.seulement === undefined ? '' : ` Seules les lignes où ${l.seulement} le seront.`
  return `À savoir : de votre liste « ${l.nom} », ces informations seront visibles par tout le monde : ${l.champs.join(', ')}.${lignes} Le reste ne l’est pas. Personne ne pourra la modifier.`
}
export const PHRASE_SI_VOUS_NE_VOULEZ_PAS =
  'Si vous ne le voulez pas, annulez et demandez la modification dans l’atelier.'

/** Ce que l'écran reçoit, relu strictement : un contenu mal formé est écarté. */
export function lireContenus(v: unknown): ContenuPublic[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((c: unknown) => {
    if (c === null || typeof c !== 'object') return []
    const { table, champs } = c as { table?: unknown; champs?: unknown }
    if (typeof table !== 'string' || !Array.isArray(champs)) return []
    return [{ table, champs: champs.filter((x): x is string => typeof x === 'string') }]
  })
}
