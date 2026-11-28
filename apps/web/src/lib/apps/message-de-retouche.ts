/**
 * LE MESSAGE MONTRÉ À LA PERSONNE APRÈS UNE MODIFICATION (2026-11-23).
 *
 * Extrait de l'atelier (`app/atelier/[id]/page.tsx`), qui l'emploie : la boîte
 * noire enregistre le message RÉELLEMENT montré, calculé par la même fonction.
 * Mesuré sur la boîte 1a4298f8 : `messageMontre` valait `null`, parce que la
 * route lisait `corps.message` alors que l'écran compose sa phrase lui-même.
 *
 * `paye` est le suffixe du compteur (« Il vous en reste 36. », ou le coût pour
 * le fondateur) : l'écran le calcule depuis son compteur, la route depuis le
 * même calcul (`suffixeCompteur`).
 */
import { phraseApresRetouche, type EtatCompteur } from './compteur-phrases'
import { phraseParties, type Partie } from './parties-demande'

/** Ce que l'écran lit de la réponse d'une modification. */
export type CorpsRetouche = {
  readonly ok?: boolean
  readonly error?: string
  readonly horsPerimetre?: boolean
  readonly raison?: string
  readonly aConfirmer?: boolean
  readonly message?: string
  readonly fichiers?: readonly string[]
  readonly coutUsd?: number
  readonly migration?: string | boolean
  readonly couvertureNonMesuree?: boolean
  readonly declarationRejetee?: string
  readonly couleur?: string
  readonly modificationsRestantes?: number
  /** Les parties de la demande (`null` : la liste n'a pas pu s'établir). */
  readonly parties?: readonly Partie[] | null
  /** Ce que les contrôles de Deribfy ont mesuré non fait. */
  readonly constats?: readonly Partie[]
}

export type MessageRetouche =
  | { readonly genre: 'confirmation'; readonly texte: string }
  | { readonly genre: 'erreur'; readonly texte: string }
  | { readonly genre: 'avis'; readonly texte: string }

/** Le suffixe du compteur, comme l'écran le compose. */
export function suffixeCompteur(o: {
  readonly compteur: EtatCompteur | { readonly exempte: boolean } | null
  readonly livree: boolean
  readonly aConfirmer: boolean
  readonly coutUsd: number | undefined
  readonly modificationsRestantes: number | undefined
}): string {
  const voitLesCouts = o.compteur !== null && o.compteur.exempte
  return (
    (voitLesCouts && o.coutUsd !== undefined && o.coutUsd > 0 ? ` (${o.coutUsd.toFixed(3)} $ dépensés)` : '') +
    (o.aConfirmer ? '' : phraseApresRetouche(o.compteur as EtatCompteur | null, o.livree, o.modificationsRestantes))
  )
}

/** Ce que l'écran affiche, selon la réponse — confirmation, erreur ou avis. */
export function messageDeRetouche(d: CorpsRetouche, httpOk: boolean, paye: string): MessageRetouche {
  if (d.aConfirmer === true) return { genre: 'confirmation', texte: `${String(d.message)}\n\nAppliquer ?` }
  if (d.horsPerimetre === true) return { genre: 'erreur', texte: `${String(d.raison)}${paye}` }
  if (!httpOk || d.ok !== true) return { genre: 'erreur', texte: `${String(d.error ?? 'La modification a échoué.')}${paye}` }
  const nonMesure =
    d.couvertureNonMesuree === true ? ' La couverture du cahier n’a pas pu être vérifiée sur cette demande.' : ''
  // ── LA PHRASE SE FERME AVANT LE COMPTEUR (2026-11-23). Mesuré à l'écran :
  // « touché(s) Il vous en reste 36.. ». Le coût (fondateur) reste dans la
  // phrase, entre parenthèses ; le compteur est une phrase à lui.
  const cout = /^ \([^)]*\)/u.exec(paye)?.[0] ?? ''
  const compteur = paye.slice(cout.length)
  // ── TOUTES LES PARTIES DE LA DEMANDE, faites ou non (2026-11-28). Plus
  // jamais un message qui ne montre qu'une partie : « Ajouté : numero_suivi »
  // taisait la page publique, qui ne marchait pas.
  if (d.parties !== undefined) {
    return {
      genre: 'avis',
      texte:
        phraseParties(d.parties, d.constats ?? []) +
        (typeof d.migration === 'string' ? `\n${d.migration}` : '') +
        (cout === '' ? '' : `\n${cout.trim()}`) +
        (compteur === '' ? '' : `\n${compteur.trim()}`) +
        nonMesure +
        (d.declarationRejetee === undefined ? '' : ` ${d.declarationRejetee}`),
    }
  }
  return {
    genre: 'avis',
    texte:
      (d.migration === undefined
        ? d.couleur !== undefined && (d.fichiers ?? []).filter((f) => f !== 'APPARENCE.json').length === 0
          ? `Couleur principale appliquée${cout}.${compteur}`
          : `Modifié — ${String((d.fichiers ?? []).length)} fichier(s) touché(s)${cout}.${compteur}`
        : `${String(d.migration)}${paye}`) +
      nonMesure +
      (d.declarationRejetee === undefined ? '' : ` ${d.declarationRejetee}`),
  }
}
