/**
 * LES TROIS TAILLES D'APERÇU — UNE SEULE LISTE, LUE PARTOUT.
 *
 * ── POURQUOI UN MODULE, ET PAS UNE CONSTANTE DANS CHAQUE ÉCRAN.
 *
 * L'atelier et la page de création montrent la même application dans les
 * mêmes trois tailles. Deux listes auraient divergé au premier ajout, et le
 * dépôt a déjà payé ça : trois copies de la règle de nommage, dont une
 * ignorait les noms réservés — la publication échouait APRÈS le clic.
 *
 * Les icônes restent dans les composants : ce module doit rester PUR (aucun
 * React, aucun serveur), parce qu'il est lu des deux côtés.
 *
 * ── POURQUOI CES TROIS LARGEURS.
 *
 * Elles traversent les quatre seuils de la mise en page, vérifié :
 *   390  → aucun seuil franchi
 *   768  → 400 et 600 franchis
 *   1280 → les quatre franchis
 *
 * Deux largeurs auraient laissé un seuil sans témoin.
 */
export type Appareil = {
  readonly cle: 'telephone' | 'tablette' | 'bureau'
  readonly libelle: string
  readonly largeur: number
}

export const APPAREILS: readonly Appareil[] = [
  { cle: 'telephone', libelle: 'Téléphone', largeur: 390 },
  { cle: 'tablette', libelle: 'Tablette', largeur: 768 },
  { cle: 'bureau', libelle: 'Bureau', largeur: 1280 },
]

/**
 * LA LÉGENDE D'UN APERÇU — « Bureau — 1280 px ».
 *
 * ── LE DÉFAUT QU'ELLE CORRIGE, VU SUR UNE CAPTURE.
 *
 * L'écran affichait « 1280 px · 1280 px » : deux fois le même nombre. La
 * cause était un champ `note` qui, après une correction du 2026-10-31,
 * ne contenait plus QUE la largeur — il répétait donc la valeur d'à côté.
 *
 * Avant cette correction, `note` annonçait la DISPOSITION (« barre du bas »,
 * « rail latéral »). On l'a vidée parce qu'elle mentait : la loi de
 * disposition vit dans le moteur de rendu, pas dans les œuvres du moteur
 * direct, et un tir réel rendait un rail là où la note promettait une barre.
 * Vidée de son sens, elle n'avait plus qu'à disparaître — et un champ vidé
 * qu'on garde finit toujours par s'afficher deux fois.
 *
 * LA LÉGENDE NE DIT DONC QUE CE QUI EST VRAI POUR TOUTE ŒUVRE : le nom de
 * la taille, et la largeur que l'application LIT vraiment.
 */
export function legendeAppareil(a: Appareil): string {
  return `${a.libelle} — ${String(a.largeur)} px`
}

/** La taille choisie, ou la plus petite — jamais `undefined` à l'écran. */
export function appareilDe(largeur: number): Appareil {
  return APPAREILS.find((a) => a.largeur === largeur) ?? APPAREILS[0]
}
