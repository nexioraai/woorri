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

export function marcheDuSuivi(etat: EtatPourSuivi | null): Marche {
  if (etat === null) {
    return { courante: 0, livree: false, refusee: false, raison: null, enCours: true }
  }
  if (etat.statut === 'livree') {
    return { courante: ETAPES_SUIVI.length - 1, livree: true, refusee: false, raison: null, enCours: false }
  }
  if (etat.statut === 'refusee') {
    return {
      courante: 3,
      livree: false,
      refusee: true,
      raison:
        etat.raison ??
        'La génération n’a pas pu aboutir cette fois. Nous avons été prévenus et regardons ce qui s’est passé.',
      enCours: false,
    }
  }
  if (etat.statut === 'en_attente') {
    return { courante: 0, livree: false, refusee: false, raison: null, enCours: true }
  }
  // en_cours : l'etape du moteur dit la marche — p0 comprend, reparation
  // verifie, tout le reste est l'ecriture des sections.
  const marche = etat.etape === 'p0' ? 1 : etat.etape === 'reparation' ? 3 : 2
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
