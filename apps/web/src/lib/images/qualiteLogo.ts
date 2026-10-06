/**
 * EST-CE SEULEMENT UN LOGO ?
 *
 * MESURÉ SUR LE PARC RÉEL le 2026-10-06. Trois boutiques sur vingt-sept
 * avaient déposé un logo, et sur ces trois :
 *
 *   · l'une avait déposé UNE PHOTO DE SA DEVANTURE — 1504×688, des pick-up
 *     devant un magasin. Dans l'en-tête, elle devient un timbre-poste de
 *     200 px ; dans l'onglet, une bouillie ;
 *   · une autre, un logo doré SUR FOND NOIR, en JPEG — donc sans transparence
 *     possible. Sur un en-tête clair, le visiteur voit un rectangle noir.
 *
 * Le seul garde-fou existant regardait le RAPPORT largeur/hauteur, et refusait
 * au-delà de 2,5. La photo de devanture valait 2,19 : elle passait dessous. Un
 * critère de FORME ne peut pas voir un problème de CONTENU.
 *
 * Un logo a peu de couleurs et une grande plage dominante ; une photo a
 * l'inverse. Mesuré (couleurs distinctes / part de la dominante) :
 *
 *     vrai logo de synthèse    13 / 58 %
 *     chanorfie                51 / 83 %
 *     alloufbusines            26 / 80 %
 *     ──────────────────────────────────
 *     photo de devanture      162 /  5 %
 *     photo de sandale        106 / 11 %
 *     photo de pantalon       117 / 21 %
 *
 * Les deux mesures séparent les six cas dans le même sens, avec une marge
 * nette de part et d'autre.
 *
 * ON AVERTIT, ON NE REFUSE PAS. Le logo appartient au marchand ; notre rôle
 * est de lui dire ce que son choix donnera, pas de choisir à sa place.
 */
import sharp from 'sharp'

export type AvisLogo = { code: string; message: string }

/** Quantification à 4 bits par canal : on compte des APLATS, pas des nuances.
 *  Sans elle, le bruit de compression ferait passer un logo pour une photo. */
export async function mesurerAplats(
  entree: Buffer,
): Promise<{ dominante: number; couleurs: number }> {
  const { data, info } = await sharp(entree)
    .removeAlpha()
    .resize(128, 128, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels = info.width * info.height
  const bacs = new Map<number, number>()
  for (let i = 0; i < pixels; i += 1) {
    const k = (data[i * 3]! >> 4) * 256 + (data[i * 3 + 1]! >> 4) * 16 + (data[i * 3 + 2]! >> 4)
    bacs.set(k, (bacs.get(k) ?? 0) + 1)
  }
  const parts = [...bacs.values()].sort((x, y) => y - x)
  return {
    dominante: (parts[0] ?? 0) / pixels,
    couleurs: parts.filter((v) => v / pixels >= 0.001).length,
  }
}

export async function evaluerLogo(entree: Buffer): Promise<AvisLogo[]> {
  const meta = await sharp(entree).metadata()
  const largeur = meta.width ?? 0
  const hauteur = meta.height ?? 0
  const { dominante, couleurs } = await mesurerAplats(entree)
  const avis: AvisLogo[] = []

  if (couleurs > 90 || dominante < 0.3) {
    avis.push({
      code: 'semble_une_photo',
      message:
        'Ceci ressemble à une photo, pas à un logo. Réduite à la taille d’un ' +
        'en-tête ou d’un onglet, une photo devient illisible. Un symbole ou le ' +
        'nom de la boutique dessiné sera bien plus reconnaissable.',
    })
  }

  if (meta.hasAlpha !== true && dominante > 0.5) {
    avis.push({
      code: 'fond_opaque',
      message:
        'Votre logo a un fond plein, et le format choisi ne garde pas la ' +
        'transparence. Il apparaîtra comme un rectangle de cette couleur sur ' +
        'les fonds clairs. Un PNG à fond transparent s’intègre partout.',
    })
  }

  // Les deux gardes de FORME, conservées telles quelles : elles disent des
  // choses vraies que les mesures d'aplats ne disent pas.
  const rapport = hauteur === 0 ? 1 : largeur / hauteur
  if (rapport > 2.5 || rapport < 0.4) {
    avis.push({
      code: 'tres_allonge',
      message:
        'Ce logo est très allongé. Dans les onglets et les résultats Google, ' +
        'l’icône est carrée : il y paraîtra petit. Un logo carré ou un ' +
        'symbole seul y sera bien plus lisible.',
    })
  }
  if (Math.min(largeur, hauteur) < 256) {
    avis.push({
      code: 'definition_juste',
      message:
        'Définition un peu juste pour l’écran d’accueil d’un téléphone (192 px). ' +
        'Un export à 512 px serait plus net.',
    })
  }
  return avis
}
