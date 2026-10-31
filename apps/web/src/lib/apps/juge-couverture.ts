/**
 * LE JUGE DE COUVERTURE — le silence est interdit.
 *
 * ── LE DÉFAUT FONDATEUR, MESURÉ LE 2026-10-31 (tir eb7b62b5).
 *
 * Même cahier (22 866 caractères), application « livrée » : paiement
 * 2 occurrences au code pour 34 au cahier ; anglais, arabe, RTL, connexion,
 * notifications : ZÉRO. Le critère d'acceptation de la boucle était « ça
 * s'assemble » — jamais « ça couvre ». L'analyse qui a trouvé ça a été faite
 * À LA MAIN ; ce module EST cette analyse, automatisée.
 *
 * ── LA RÈGLE (du propriétaire) : chaque exigence du cahier est COUVERTE,
 * ou DÉCLARÉE HORS PÉRIMÈTRE avec un motif (fichier PERIMETRE.md écrit par
 * le générateur). Une exigence absente des deux est un DÉFAUT. Un rapport
 * chiffré accompagne chaque génération — et sans lui, « livrée » ne se dit
 * pas.
 *
 * ── CE QUE CE JUGE EST, ET N'EST PAS.
 *
 * Un LEXIQUE MÉTIER, pas une compréhension : il compte des familles de
 * termes dans le cahier et les cherche dans le code. Il attrape les absences
 * CRIANTES (paiement 34→0), pas les nuances. Zéro appel de modèle, zéro
 * centime, déterministe — rejouable sur tout tir passé.
 */

export type ExigenceJugee = {
  readonly exigence: string
  readonly cahier: number
  readonly code: number
  readonly statut: 'couverte' | 'declaree-hors-perimetre' | 'absente'
}

export type RapportCouverture = {
  readonly exigences: readonly ExigenceJugee[]
  /** Les absentes MUETTES : ni couvertes, ni déclarées. Le défaut. */
  readonly absentes: readonly ExigenceJugee[]
  /** couvertes + déclarées, sur le total retenu. Entre 0 et 1. */
  readonly taux: number
}

/** Une exigence n'est RETENUE que si le cahier y insiste. */
const SEUIL_CAHIER = 3

/**
 * Le lexique : une exigence = une famille de termes. Les motifs s'appliquent
 * au texte en minuscules. Chaque entrée vient d'une famille d'applications
 * réelle — pas d'un inventaire théorique.
 */
const LEXIQUE: readonly (readonly [string, RegExp])[] = [
  // ② DU TIR DE VALIDATION 88c94164 : le cahier disait « Application mobile
  // Android et iPhone », le modèle a TENTÉ react-native au tour 1 (refusé
  // par le fail-closed) — et ce juge, sans famille correspondante, n'a rien
  // exigé en retour. Le système savait, et se taisait. Plus maintenant.
  ['application native (Android/iPhone)', /\bandroid\b|\biphone\b|\bios\b|app store|google play|application mobile|application native/gu],
  ['paiement', /paiement|payer\b|payeur/gu],
  ['mobile money', /mobile money|airtel|moov|orange money|mtn\b|wave\b/gu],
  ['carte bancaire', /carte bancaire|visa\b|mastercard|stripe|paypal/gu],
  ['connexion et comptes', /connexion|se connecter|authentifi|mot de passe|inscription/gu],
  ['multilingue', /anglais|arabe|english|multilingue|plusieurs langues/gu],
  ['interface RTL', /\brtl\b|droite [àa] gauche/gu],
  ['notifications', /notification/gu],
  ['agences', /agence/gu],
  ['entreprises', /entreprise/gu],
  ['agent IA', /agent (?:d['’]\s*)?(?:intelligence|ia\b)|assistant (?:ia|intelligent)|chatbot/gu],
  ['réservation', /r[ée]servation|r[ée]server/gu],
  ['recherche', /recherche|rechercher/gu],
  ['administration', /\badmin/gu],
  ['tableau de bord', /statistique|tableau de bord|dashboard/gu],
  ['facturation', /facture/gu],
  ['abonnement', /abonnement/gu],
  ['livraison', /livraison|livrer\b/gu],
  ['messagerie', /messagerie|\bchat\b/gu],
]

const compte = (texte: string, motif: RegExp): number => {
  motif.lastIndex = 0
  let n = 0
  while (motif.exec(texte) !== null) n += 1
  return n
}

/** Le fichier où le générateur déclare ce qu'il NE couvre pas, et pourquoi. */
export const FICHIER_PERIMETRE = 'PERIMETRE.md'

export function jugerCouverture(
  demande: string,
  fichiers: ReadonlyMap<string, string>,
): RapportCouverture {
  const cahier = demande.toLowerCase()
  const perimetre = (fichiers.get(FICHIER_PERIMETRE) ?? '').toLowerCase()
  const codeEntier = [...fichiers.entries()]
    // La bibliothèque injectée est à DERIBFY : ses mots (« recherche » d'une
    // icône…) ne couvrent pas une exigence du cahier à la place du modèle.
    .filter(([n]) => n !== FICHIER_PERIMETRE && !n.startsWith('systeme/'))
    .map(([, c]) => c)
    .join('\n')
    .toLowerCase()

  const exigences: ExigenceJugee[] = []
  for (const [exigence, motif] of LEXIQUE) {
    const dansCahier = compte(cahier, motif)
    if (dansCahier < SEUIL_CAHIER) continue
    const dansCode = compte(codeEntier, motif)
    const declaree = compte(perimetre, motif) > 0
    exigences.push({
      exigence,
      cahier: dansCahier,
      code: dansCode,
      statut: dansCode > 0 ? 'couverte' : declaree ? 'declaree-hors-perimetre' : 'absente',
    })
  }
  const absentes = exigences.filter((e) => e.statut === 'absente')
  const taux =
    exigences.length === 0 ? 1 : (exigences.length - absentes.length) / exigences.length
  return { exigences, absentes, taux }
}
