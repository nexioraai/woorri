/**
 * LA COUCHE « FOURNISSEUR MOBILE MONEY » — le contrat (2026-11-21).
 *
 * Décision du propriétaire : MoneRails doit pouvoir être remplacé par un autre
 * prestataire SANS refaire le formulaire, l'enregistrement du paiement ni le
 * webhook. Tout ce qui dépend du prestataire vit derrière ce contrat ; le
 * reste (route, écran, registre `app_paiements`) ne parle que ces types.
 *
 * Fichier de TYPES seulement : aucun import serveur, l'écran peut s'en servir.
 */

/** Ce que le client choisit : un opérateur ouvert dans un pays. */
export type Operateur = {
  /** Le code du prestataire, à renvoyer tel quel (ex. « AIRTEL »). */
  readonly code: string
  /** Le nom affiché (ex. « Airtel Money »). */
  readonly nom: string
  /** Comment le client approuve : PIN sur le téléphone, code à saisir, page externe. */
  readonly validation: readonly ('aucune' | 'pin' | 'code' | 'page')[]
}

/** Où en est un encaissement. `reussi`, `echoue`, `expire` sont définitifs. */
export type EtatEncaissement = 'en_attente' | 'code_requis' | 'en_cours' | 'reussi' | 'echoue' | 'expire'

/** Ce que le client doit faire maintenant, tel que l'opérateur le dit. */
export type ActionClient =
  | { readonly type: 'approuver'; readonly message: string | null; readonly ussd: string | null }
  | { readonly type: 'code'; readonly message: string | null; readonly ussd: string | null }
  | { readonly type: 'page'; readonly url: string }

export type ObjetPaiement = 'abonnement' | 'lot'

/** Ce que Deribfy attache à un encaissement, et retrouve dans l'avis. */
export type Rattachement = {
  readonly app: string
  readonly proprietaire: string
  /** Ce que paie l'encaissement : un mois d'abonnement, ou un lot de modifications (2026-11-24). */
  readonly objet: ObjetPaiement
  /**
   * Le montant inscrit dans la demande, pour TRACE seulement (2026-11-21) :
   * jamais une preuve. À l'avis, le montant attendu est RECALCULÉ depuis les
   * réglages et l'opérateur de l'avis. `null` si absent.
   */
  readonly montantInscrit: number | null
}

export type Encaissement = {
  /** L'identifiant du prestataire : c'est la référence du registre (anti-doublon). */
  readonly id: string
  readonly etat: EtatEncaissement
  readonly montant: number
  readonly devise: string
  /** Le code de l'opérateur, tel que le prestataire le rend (ex. « AIRTEL ») ; `null` s'il manque. */
  readonly operateur: string | null
  readonly test: boolean
  readonly action: ActionClient | null
  readonly rattachement: Rattachement | null
  readonly echec: string | null
}

export type DemandeEncaissement = {
  readonly montant: number
  readonly devise: 'XAF'
  readonly pays: 'TD'
  readonly operateur: string
  /** Numéro au format international, chiffres seulement (ex. 23566000000). */
  readonly telephone: string
  readonly nomClient: string
  readonly description: string
  readonly rattachement: Rattachement
  /** La part abonnement et la part frais du montant, inscrites pour trace. */
  readonly ventilation: { readonly prix: number; readonly frais: number }
  /** Clé d'idempotence : deux clics, un seul encaissement. */
  readonly cle: string
}

/**
 * Un encaissement déjà demandé pour une appli (2026-11-21, double paiement) :
 * de quoi savoir s'il empêche une nouvelle demande. `creeLeMs` = l'horloge du
 * prestataire ; `null` s'il ne la donne pas.
 */
export type EncaissementOuvert = {
  readonly id: string
  readonly etat: EtatEncaissement
  readonly creeLeMs: number | null
}

/** Un avis du prestataire, signature VÉRIFIÉE. */
export type AvisVerifie = {
  readonly id: string
  readonly type: 'encaissement_reussi' | 'encaissement_echoue' | 'autre'
  readonly encaissement: Encaissement | null
}

/** Une erreur du prestataire, dite en clair, avec le statut HTTP à rendre. */
export class ErreurFournisseur extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null = null, readonly brut: unknown = null) {
    super(message)
  }
}

/** Le contrat. Un nouveau prestataire = une nouvelle implémentation, rien d'autre. */
export interface FournisseurMobileMoney {
  /** Le nom inscrit dans `app_paiements.fournisseur` (contrainte CHECK). */
  readonly nom: 'monerails'
  /** Les opérateurs ouverts pour cette devise et ce pays. */
  operateurs(devise: 'XAF', pays: 'TD'): Promise<Operateur[]>
  encaisser(demande: DemandeEncaissement): Promise<Encaissement>
  lire(id: string): Promise<Encaissement>
  /** Les encaissements demandés pour CETTE appli, les plus récents d'abord. */
  encaissementsDe(app: string): Promise<EncaissementOuvert[]>
  /** Envoie le code à usage unique saisi par le client. */
  autoriser(id: string, code: string): Promise<Encaissement>
  /** Vérifie un avis (corps BRUT, en-têtes) ; `null` = signature refusée. */
  verifierAvis(corpsBrut: string, entetes: Headers, maintenantSecondes?: number): AvisVerifie | null
}
