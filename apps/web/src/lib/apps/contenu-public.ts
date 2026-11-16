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
import { lecturePubliqueDe, nomTable, type EntiteDeclaree } from './entites-declarees'

export type ContenuPublic = { readonly table: string; readonly champs: readonly string[] }

/** La phrase mesurée : ce n'est pas « quelqu'un pourrait tomber dessus ». */
export const PHRASE_LISTE_ENTIERE =
  'La liste ENTIÈRE est téléchargeable : la clé de lecture est dans la page publiée, ' +
  'et n’importe qui peut récupérer toutes les lignes d’un coup — pas seulement tomber sur l’une d’elles.'

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

/** Chaque table publique, avec ce qu'on y lira. */
export function contenusPublics(entites: readonly EntiteDeclaree[]): ContenuPublic[] {
  return entites.filter(lecturePubliqueDe).map((e) => ({
    table: nomTable(e),
    champs: (e.fields as readonly ChampLu[])
      .filter((f) => f.derived === undefined && f.sensitive !== true)
      .map(libelleChamp)
      .filter((l) => l !== ''),
  }))
}

/** « vehicule : marque, modele, immatriculation ; reparation : … » */
export function phraseContenus(contenus: readonly ContenuPublic[]): string {
  return contenus
    .map((c) => `« ${c.table} » (${c.champs.length > 0 ? c.champs.join(', ') : 'aucune colonne déclarée'})`)
    .join(' ; ')
}

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
