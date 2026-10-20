/**
 * ETAGE 4 — LA LOGIQUE DU SUIVI, PURE ET PROUVABLE SANS NAVIGATEUR.
 *
 * L'ecran ne fait que du polling de statut : AUCUNE generation ne part
 * d'ici. Tout ce qui se decide (quelle marche, quelle raison, quel id
 * reprendre apres un rafraichissement) vit dans ces fonctions pures —
 * les 4 etats se prouvent avec des reponses simulees, le navigateur
 * n'apporte rien de plus.
 */

/** Les marches du suivi — meme langage que l'escalier des trois modes. */
export const ETAPES_SUIVI = [
  'En file d’attente',
  'Comprendre la demande',
  'Écrire l’application',
  'Vérifier et réparer',
  'Application livrée',
] as const

export type EtatPourSuivi = {
  readonly statut: 'en_attente' | 'en_cours' | 'livree' | 'refusee'
  readonly etape: string | null
  /** Une ligne qui attend l'accord a DÉJÀ travaillé : elle n'est pas en file. */
  readonly attendVous?: boolean
  /** Ce qui est déjà écrit. Zéro ne prouve rien ; plus de zéro, si. */
  readonly sections?: { readonly faites: number; readonly total: number }
  /** Deja TRADUITE par le serveur — le brut du moteur ne voyage jamais. */
  readonly raison: string | null
}

export type Marche = {
  readonly courante: number
  readonly livree: boolean
  readonly refusee: boolean
  /** La raison LISIBLE d'un refus — la premiere ligne des diagnostics, qui
   *  l'ouvre depuis le trou d'observabilite n°2 du premier tir. */
  readonly raison: string | null
  readonly enCours: boolean
}

/**
 * L'ETAPE DU MOTEUR, LUE EN MARCHE — une seule table pour `en_cours` ET
 * pour `refusee`. Deux lectures separees, c'est deux verites possibles
 * pour un meme etat : exactement le defaut que ce fichier a porte.
 */
function marcheDeLEtape(etape: string | null): number {
  return etape === 'p0' ? 1 : etape === 'reparation' ? 3 : 2
}

export function marcheDuSuivi(etat: EtatPourSuivi | null): Marche {
  if (etat === null) {
    return { courante: 0, livree: false, refusee: false, raison: null, enCours: true }
  }
  if (etat.statut === 'livree') {
    return { courante: ETAPES_SUIVI.length - 1, livree: true, refusee: false, raison: null, enCours: false }
  }
  if (etat.statut === 'refusee') {
    return {
      // ── LA MARCHE DU REFUS N'EST PLUS UN MENSONGE (defaut 2026-10-15).
      //
      // Elle valait 3 EN DUR — « Verifier et reparer » — quel que soit
      // l'endroit ou la generation etait morte. Capture du proprietaire a
      // l'appui : un tir mort en P0, avec `sections=0` et `modele: null`,
      // affichait « Comprendre la demande » ET « Ecrire l'application »
      // cochees. Deux marches vertes jamais atteintes, et la troisieme
      // presentee comme en cours alors qu'elle n'avait jamais commence.
      //
      // On lit desormais l'etape REELLE — la meme table que `en_cours`,
      // une seule lecture pour les deux statuts.
      courante: marcheDeLEtape(etat.etape),
      livree: false,
      refusee: true,
      raison:
        etat.raison ??
        'La génération n’a pas pu aboutir cette fois. Nous avons été prévenus et regardons ce qui s’est passé.',
      enCours: false,
    }
  }
  if (etat.statut === 'en_attente') {
    // ── « EN FILE D'ATTENTE » SUR UNE APPLICATION DÉJÀ ÉCRITE (2026-10-15).
    //
    // MESURE, capture du propriétaire à l'appui : `sections 22/22`, phase
    // `reparation`, 7,818 $ dépensés — et l'escalier affichait « En file
    // d'attente », toutes les marches suivantes grisées.
    //
    // Cause : une ligne SUSPENDUE repasse `en_attente` (c'est juste : le
    // verrou n'est tenu que pendant une tranche), et cette branche rendait
    // la marche 0 sans regarder ce qui avait déjà été fait.
    //
    // Une ligne qui ATTEND L'ACCORD du propriétaire, ou qui porte des
    // sections, a forcément déjà travaillé. Elle n'est pas en file : elle
    // est posée, à l'étape où elle s'est arrêtée.
    const aTravaille = etat.attendVous === true || (etat.sections?.faites ?? 0) > 0
    if (!aTravaille) {
      return { courante: 0, livree: false, refusee: false, raison: null, enCours: true }
    }
    return {
      courante: marcheDeLEtape(etat.etape),
      livree: false,
      refusee: false,
      raison: null,
      enCours: etat.attendVous !== true,
    }
  }
  // en_cours : l'etape du moteur dit la marche — p0 comprend, reparation
  // verifie, tout le reste est l'ecriture des sections.
  const marche = marcheDeLEtape(etat.etape)
  return { courante: marche, livree: false, refusee: false, raison: null, enCours: true }
}

/** Le drapeau : l'UX synchrone existante ne bouge pas tant qu'il est OFF. */
export function modeAsyncActif(valeur: string | undefined): boolean {
  return valeur === '1'
}

type StockageMinimal = {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
}

const CLE_STOCKAGE = 'deribfy-generation-en-cours'

/** Survit au rafraichissement : l'URL d'abord (partageable), le stockage en
 *  secours (la page a ete quittee sans l'URL). */
export function generationDepuisUrl(search: string, stockage: StockageMinimal): string | null {
  const id = new URLSearchParams(search).get('generation')
  if (id !== null && id !== '') return id
  const garde = stockage.getItem(CLE_STOCKAGE)
  return garde === null || garde === '' ? null : garde
}

export function memoriserGeneration(id: string, stockage: StockageMinimal): string {
  stockage.setItem(CLE_STOCKAGE, id)
  return `?generation=${encodeURIComponent(id)}`
}

export function oublierGeneration(stockage: StockageMinimal): void {
  stockage.removeItem(CLE_STOCKAGE)
}

/**
 * CE QU'ON FAIT D'UNE REPONSE DU SUIVI — pure, donc prouvable sans navigateur.
 *
 * MESURE (defaut 2026-10-19, capture du proprietaire) : l'ecran ne traitait
 * QUE `res.ok`. Un 404 — la ligne n'existe plus pour ce proprietaire — ne
 * produisait rien : pas d'etat, donc aucun bouton (pas meme Arreter, qui
 * existait et etait teste) ; pas de message ; et une relecture toutes les
 * 5 s d'une ligne inexistante, indefiniment.
 *
 * Les trois issues sont differentes et doivent le rester :
 *  - `lire`        : on a un etat, on l'affiche.
 *  - `abandonner`  : DEFINITIF. Une ligne absente ne reapparait pas ; on
 *                    libere l'ecran et on arrete de demander.
 *  - `reessayer`   : PASSAGER — jeton expire (401), coupure, 5xx. La
 *                    prochaine lecture retentera, et c'est juste.
 */
export type IssueDuSuivi = 'lire' | 'abandonner' | 'reessayer'

export function decisionDuSuivi(status: number): IssueDuSuivi {
  if (status >= 200 && status < 300) return 'lire'
  if (status === 404) return 'abandonner'
  return 'reessayer'
}

/**
 * LA FOURCHETTE AFFICHEE AU DEPOT — arbitrage proprietaire du 2026-10-10 :
 * prudente mais pas effrayante. SOURCE : mesures de session (P0 2-4 min,
 * emission+juge 25-30 min, un appel ecrans streame 15-30 min, 2-3 tours) —
 * AUCUN livree reel n'existe encore pour faire une mediane.
 * TODO (visible, voulu) : recalibrer depuis la MEDIANE des premiers vrais
 * livree — requete SQL sur duree_ms, 0 $. Jamais de compte a rebours.
 */
export const FOURCHETTE_DUREE = 'généralement 30 à 60 minutes'

/** « en cours depuis 12 min » — l'ecoule REEL, jamais une prediction. */
export function ecouleDepuis(creeIl: string, maintenant: number): string {
  const min = Math.max(0, Math.floor((maintenant - new Date(creeIl).getTime()) / 60_000))
  if (min < 1) return 'depuis moins d’une minute'
  if (min < 60) return `depuis ${String(min)} min`
  return `depuis ${String(Math.floor(min / 60))} h ${String(min % 60).padStart(2, '0')}`
}

/** L'anti-« planté » : le battement est de la telemetrie pure. Entre deux
 *  tranches (battement nul), la reprise est au pire a une minute (cron). */
export function ligneActivite(statut: string, activiteSec: number | null): string | null {
  if (statut === 'en_cours' && activiteSec !== null) {
    return activiteSec < 90
      ? `travail actif il y a ${String(activiteSec)} s`
      : `travail actif il y a ${String(Math.round(activiteSec / 60))} min`
  }
  if (statut === 'en_attente') return 'reprise sous une minute'
  return null
}
