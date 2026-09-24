// ============================================================
// CLIQUET — LE NORMALISEUR NE MANGE PLUS AUCUN CHAMP.
//
// `normalizeProduct` RECONSTRUIT l'objet produit : tout champ que la
// projection émet et qu'il ne recopie pas est PERDU avant d'atteindre les
// vitrines Editorial, Noir, Vif et Aurora.
//
// CETTE CLASSE A FRAPPÉ TROIS FOIS, et chaque fois le marchand l'a découverte
// sur sa boutique en ligne, pas nous :
//   · dette 6c   — `forSale` perdu : l'achetabilité ignorée sur 4 vitrines/5 ;
//   · M2-208     — `whatsapp` et `sizes` perdus : AUCUN bouton dans la modale,
//                  alors que les cartes de collection les affichaient ;
//   · M2-237     — `images` et `encaisseEnLigne` perdus : cinq photos
//                  envoyées, UNE seule montrée.
//
// Le commentaire du normaliseur avertissait déjà, dès la première fois, que
// « tout champ non recopié ici est PERDU ». Un avertissement en prose n'arrête
// rien : il faut une mesure. La voici — elle compare les DEUX listes, et tout
// champ ajouté à la projection sans l'être au normaliseur la fait tomber.
// ============================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SHARED = readFileSync(
  join(process.cwd(), 'src', 'app', 'sites', '[slug]', 'themes', 'shared.tsx'),
  'utf8',
)

/** Les clés d'un bloc `return { ... }`, en ignorant les commentaires. */
function clefsDuBloc(source: string, depuis: number): string[] {
  const debut = source.indexOf('{', depuis)
  let profondeur = 0
  let fin = debut
  for (let i = debut; i < source.length; i += 1) {
    if (source[i] === '{') profondeur += 1
    else if (source[i] === '}') {
      profondeur -= 1
      if (profondeur === 0) { fin = i; break }
    }
  }
  const bloc = source
    .slice(debut, fin)
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '')
  // Seulement les clés de PREMIER niveau de l'objet.
  const clefs: string[] = []
  let prof = 0
  for (const ligne of bloc.split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/u.exec(ligne)
    if (prof === 1 && m) clefs.push(m[1]!)
    for (const c of ligne) {
      if (c === '{' || c === '[' || c === '(') prof += 1
      if (c === '}' || c === ']' || c === ')') prof -= 1
    }
  }
  return [...new Set(clefs)]
}

const CHAMPS_PROJECTION = clefsDuBloc(SHARED, SHARED.indexOf('return rows.map((p: any) => ('))
// On part du `return {` INTERNE, pas de l'accolade de la fonction : sinon on
// lit le corps de la fonction et les clés se trouvent un niveau plus bas.
// (Défaut de mon premier instrument : il rendait une liste vide, et déclarait
// donc TOUS les champs perdus — une alarme qui hurle sur tout n'apprend rien.)
const CHAMPS_NORMALISEUR = clefsDuBloc(
  SHARED,
  SHARED.indexOf('return {', SHARED.indexOf('export function normalizeProduct')),
)

describe('mapShopProducts → normalizeProduct', () => {
  it('les deux listes sont RÉELLEMENT lues — sinon ce cliquet ne garde rien', () => {
    expect(CHAMPS_PROJECTION.length, 'projection illisible').toBeGreaterThan(8)
    expect(CHAMPS_NORMALISEUR.length, 'normaliseur illisible').toBeGreaterThan(8)
    expect(CHAMPS_PROJECTION).toContain('whatsapp')
    expect(CHAMPS_NORMALISEUR).toContain('whatsapp')
  })

  it('AUCUN champ projeté n’est perdu par le normaliseur', () => {
    // `image` (singulier) est dérivé de `images` par le normaliseur lui-même,
    // et `cjVid` y change de nom : ce sont les deux seules traductions.
    const perdus = CHAMPS_PROJECTION.filter((c) => !CHAMPS_NORMALISEUR.includes(c))
    expect(
      perdus,
      `champ(s) mangé(s) par normalizeProduct — ils n’atteindront JAMAIS ` +
        `Editorial, Noir, Vif ni Aurora : ${perdus.join(', ')}`,
    ).toEqual([])
  })
})
