/**
 * AVANT DE DÉPENSER — CE QU'ON DEMANDE PENDANT QUE ÇA COÛTE ENCORE 0,00 $.
 *
 * ── LE DÉFAUT MESURÉ, ET IL A COÛTÉ ~29 $.
 *
 * Deribfy ne posait AUCUNE question avant de payer. L'ordre réel était :
 * dépenser → faire juger → questionner. Les questions existaient — deux
 * diagnostics sur dix-neuf passent le critère « un humain peut y répondre
 * sans connaître le moteur » (EP-135) — mais elles PROJETTENT un diagnostic,
 * et un diagnostic n'existe qu'après que P0 a lu. Donc après la dépense.
 *
 * ── CE QUE REPLIT FAIT, CHRONOMÉTRÉ LE 2026-10-16.
 *
 * Prompt d'une ligne à 19:42. À 19:42, TREIZE SECONDES plus tard : une
 * reformulation et une question — trois boutons radio, plus un champ libre.
 * Le code n'a commencé qu'après.
 *
 * ET LE CHAMP LIBRE A TOUT CHANGÉ. L'option cochée disait « relevés
 * seulement » ; le commentaire libre a transformé une application de saisie
 * manuelle en application de RECONNAISSANCE D'IMAGE. Les trois options
 * n'étaient pas les bonnes. L'échappatoire n'est pas un ornement : c'est
 * elle qui a sauvé le cas réel.
 *
 * ── CE QUE CE MODULE N'EST PAS.
 *
 * Il n'invente aucune question : elles viennent de `QUESTIONS_DE_CONFIGURATION`
 * (EP-201), dont l'en-tête dit qu'elles « recueillent ce que l'humain SEUL
 * peut fournir avant qu'un juge n'existe ». Elles étaient posées là depuis
 * le début, avec ZÉRO appelant en production — mesuré le 2026-10-17.
 *
 * Il ne devine aucun domaine. Demander « dans quel pays votre BOUTIQUE
 * vend-elle » à un propriétaire de tontine serait l'erreur de v0 retournée.
 * C'est l'humain qui aiguille, par un choix fermé.
 *
 * ── ET IL NE DÉPENSE RIEN.
 *
 * Aucun appel réseau, aucune clé, aucun document. Pure lecture d'une table
 * et d'un objet de réponses. EP-257 le mesure plutôt que de le promettre.
 */
import { racineDepot } from './racine'

/** Un choix cliquable. `valeur` part au moteur, `texte` reste à l'écran. */
export interface Choix {
  readonly valeur: string
  readonly texte: string
}

/** Une question du pré-vol. `choix` présent ⇒ réponse fermée. */
export interface QuestionAvant {
  readonly code: string
  /** Ce que la réponse devient — jamais du texte libre (EP-201). */
  readonly structure: string
  readonly texte: string
  readonly choix?: readonly Choix[]
  /** Le défaut proposé, modifiable. Présent seulement s'il est connu. */
  readonly suggestion?: string
}

/** La réponse structurelle. Aucun nom de pays n'y survit (EP-201 B). */
export interface ConfigurationRetenue {
  readonly encaissement?: 'aucun' | 'paiements' | 'produits'
  readonly currency?: string
  readonly logistiqueParLeMarchand?: boolean
  readonly numeroEncaisseur?: string
}

export interface PreVol {
  /** Ce qu'il reste à demander. Vide ⇒ on peut dépenser. */
  readonly questions: readonly QuestionAvant[]
  /** Ce qui est déjà acquis, à chaque tour — pas seulement à la fin. */
  readonly configuration: ConfigurationRetenue
  /** `true` quand plus rien ne manque. */
  readonly complet: boolean
}

type Module = {
  configurationADemander: (o: {
    interlocuteur?: boolean
    reponses?: Record<string, unknown>
  }) => { statut: string; questions: QuestionAvant[] }
  configurationDe: (r: Record<string, unknown>) => ConfigurationRetenue
}

/** Chargé paresseusement, comme `dialogue.ts` : le module vit hors d'apps/web
 *  et ses cliquets s'exécutent au chargement. */
async function charger(): Promise<Module> {
  return (await import(
    /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/elicitation.mjs`
  )) as Module
}

/**
 * CE QU'IL RESTE À DEMANDER, ET CE QUI EST DÉJÀ ACQUIS.
 *
 * `interlocuteur: true` parce qu'il y en a un — c'est toute la différence
 * avec une campagne, où le module dégrade en REFUS plutôt que de supposer.
 *
 * LA CONFIGURATION SORT À CHAQUE TOUR, pas seulement à la fin : l'écran peut
 * montrer « j'afficherai vos montants en XAF » dès que le pays est répondu,
 * au lieu de faire attendre la fin du dialogue pour dire ce qu'il a compris.
 */
export async function preVol(reponses: Record<string, unknown> = {}): Promise<PreVol> {
  const m = await charger()
  const r = m.configurationADemander({ interlocuteur: true, reponses })
  return {
    questions: r.questions,
    configuration: m.configurationDe(reponses),
    complet: r.questions.length === 0,
  }
}

/**
 * L'ÉCHAPPATOIRE EN TEXTE LIBRE, ET POURQUOI ELLE EST DANS LE BRIEF.
 *
 * Le brief est SCELLÉ une fois pour toutes : le hold-out l'exige, et une
 * empreinte qui couvrirait un texte évolutif ne prouverait plus rien. On ne
 * le réécrit donc jamais APRÈS — on le COMPOSE une fois, avant de sceller.
 *
 * C'est aussi pour cela que l'échappatoire ne passe pas par l'addendum :
 * l'addendum est réservé aux réponses à des questions PROJETÉES, et
 * `repondre` refuse tout code hors table — à raison, sinon un client
 * fabriquerait un addendum arbitraire.
 *
 * LES DEUX MORCEAUX SONT LES MOTS DE L'HUMAIN. Rien de ce module ne s'y
 * ajoute : aucune connaissance du moteur, aucune reformulation. Un texte
 * vide ne laisse aucune trace — un intitulé suivi de rien ferait croire à
 * une précision qui n'existe pas.
 */
export function briefAvec(
  demande: string,
  autreChose?: string | null,
  configuration?: ConfigurationRetenue | null,
): string {
  const parts = [demande.trim()]
  const a = (autreChose ?? '').trim()
  if (a !== '') parts.push(`Autre chose d’important :\n${a}`)
  const p = precisionsStructurelles(configuration ?? {})
  if (p !== '') parts.push(p)
  return parts.join('\n\n')
}

/**
 * LES RÉPONSES DU PRÉ-VOL, EN TEXTE, POUR QUE P0 LES LISE.
 *
 * ── SANS CECI, ON DEMANDERAIT ET ON JETTERAIT.
 *
 * Mesuré le 2026-10-17 : `configurationDe` rend
 * `{ currency, logistiqueParLeMarchand, numeroEncaisseur }` et possède ZÉRO
 * consommateur dans tout le dépôt. Poser les questions sans brancher leur
 * réponse serait pire que le silence d'aujourd'hui — on aurait fait répondre
 * quelqu'un pour rien.
 *
 * ── LA FRONTIÈRE D'EP-201 EST TENUE, ET C'EST LE POINT DÉLICAT.
 *
 * Ce qui part est la DONNÉE STRUCTURELLE, jamais ce qui l'a produite : le
 * code ISO 4217, pas le nom du pays ; le numéro au format E.164, pas un
 * opérateur. Le test d'EP-201 énonce la règle : « une table pays→X n'est
 * admise que si X est une norme publique citable — pays→devise et
 * pays→indicatif PASSENT ; pays→moyen de paiement NE PASSE PAS. »
 *
 * AUCUN MOYEN DE PAIEMENT N'EST NOMMÉ ICI. Il vient du choix EXPLICITE de
 * l'humain à `MODELE_COMMERCE_ABSENT`, et d'aucune déduction. C'est la loi
 * EP-201 du dépôt : la devise se déduit, l'opérateur jamais.
 *
 * ── ET POURQUOI DU TEXTE, PLUTÔT QU'UN CHAMP.
 *
 * P0 lit un brief. Lui passer un objet exigerait d'ouvrir le module scellé
 * qui l'appelle. Le texte entre par le seul canal que P0 possède déjà — et
 * il entre AVANT le scellement, donc il est jugé comme le reste : la
 * couverture inventorie le brief complet, addendum compris.
 */
export function precisionsStructurelles(c: ConfigurationRetenue): string {
  const l: string[] = []
  if (c.currency !== undefined) {
    l.push(`- Les montants s’affichent en ${c.currency} (code ISO 4217).`)
  }
  if (c.encaissement === 'aucun') {
    l.push("- L’application n’encaisse aucun paiement : elle affiche des montants.")
  }
  if (c.encaissement === 'paiements') l.push("- L’application encaisse des paiements.")
  if (c.encaissement === 'produits') {
    l.push("- L’application vend des produits qui doivent être livrés.")
  }
  if (c.logistiqueParLeMarchand === true) {
    l.push('- Le marchand gère lui-même le stock et la livraison.')
  }
  if (c.logistiqueParLeMarchand === false) {
    l.push('- Le stock et la livraison passent par un tiers.')
  }
  if (c.numeroEncaisseur !== undefined) {
    l.push(`- Le numéro qui reçoit les paiements est ${c.numeroEncaisseur}.`)
  }
  return l.length === 0 ? '' : `Précisions données avant la construction :\n${l.join('\n')}`
}
