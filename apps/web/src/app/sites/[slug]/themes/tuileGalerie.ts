// LA GRILLE DE LA GALERIE NE LAISSE PAS DE TROU (CPA, 2026-11-26).
// Grande tuile en tête (à partir de 3 photos), puis des tuiles 4/5. Avec 4
// photos, la dernière restait seule sur sa ligne, deux cases vides à côté :
// la DERNIÈRE photo s'étend maintenant sur ce qui reste de sa ligne, au même
// hauteur que ses voisines (8/5 sur deux colonnes, 12/5 sur trois).
// Téléphone : 2 colonnes ; écran large : 3 colonnes.
export function tuileGalerie(i: number, n: number): string {
  const grande = n >= 3
  if (grande && i === 0) return 'col-span-2 md:row-span-2 aspect-square'
  if (i !== n - 1) return 'aspect-[4/5]'
  const resteTel = (n - (grande ? 1 : 0)) % 2
  const resteLarge = grande ? (n - 3) % 3 : n % 3
  const tel = resteTel === 1 ? 'col-span-2 aspect-[8/5]' : 'aspect-[4/5]'
  const large = resteLarge === 1 ? 'md:col-span-3 md:aspect-[12/5]'
    : resteLarge === 2 ? 'md:col-span-2 md:aspect-[8/5]'
    : 'md:col-span-1 md:aspect-[4/5]'
  return `${tel} ${large}`
}
