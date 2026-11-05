/**
 * EP-358 · UNE ŒUVRE EN BASE NE DIT PAS QU'ELLE NE L'EST PAS.
 *
 * ── LE DÉFAUT, MESURÉ SUR LA GÉNÉRATION DE CONTRÔLE DE A1 (2026-11-05).
 *
 * L'œuvre calculait sa condition JUSTE — `b.url !== "" && window.origin
 * !== "null"` — et affichait, sur ses trois écrans :
 *
 *     enBase && <div>« Mode aperçu – données en mémoire, non
 *                      conservées. »</div>
 *
 * Mesuré dans la page servie : `origin` réel, `url` posée, `enBase`
 * calculé à `true`, et le message affiché quand même. Un client aurait lu
 * que son travail n'est pas sauvegardé ALORS QU'IL L'EST.
 *
 * ── CE QUI SE JUGE ICI : LA PAIRE, JAMAIS LE MOT.
 *
 * Un texte qui nie la conservation n'est pas un défaut — il est JUSTE
 * quand il n'y a pas de base. Le défaut est la CONTRADICTION : ce texte
 * dans une branche prise quand la base EST joignable. Les contrôles
 * ci-dessous exercent donc les deux sens, et le cas juste doit passer.
 */
import { describe, expect, it } from 'vitest'
import { jugerBandeau } from '../juge-bandeau'

const f = (code: string): ReadonlyMap<string, string> => new Map([['index.tsx', code]])

describe('EP-358 · le bandeau contredit', () => {
  it('① LE DÉFAUT MESURÉ EST ATTRAPÉ — la forme exacte de l’œuvre', () => {
    const d = jugerBandeau(
      f(`const enBase = b.url !== "" && window.origin !== "null";
return (<div>
  {enBase && <Pastille>Mode aperçu – données en mémoire, non conservées.</Pastille>}
</div>)`),
    )
    expect(d.length, 'la contradiction n’est pas vue').toBe(1)
    expect(d[0]?.fichier).toBe('index.tsx')
    expect(d[0]?.condition, 'la condition fautive n’est pas nommée').toBe('enBase &&')
    expect(d[0]?.texte, 'le texte fautif n’est pas rapporté').toMatch(/Mode aperçu/u)
  })

  it('② LE CAS JUSTE PASSE — `!enBase` dit vrai, et doit être laissé', () => {
    // ── C'EST LA MOITIÉ QUI COMPTE LE PLUS.
    //
    // « Un contrôle qui ne s'exerce que sur le chemin heureux ne prouve
    // pas une garde. » L'inverse aussi : un juge qui refuse le cas juste
    // serait retiré dans la semaine — et il a déjà fallu en retirer.
    for (const juste of [
      `{!enBase && <Pastille>données en mémoire, non conservées</Pastille>}`,
      `{enBase === false && <p>Mode aperçu</p>}`,
      `{!enBase ? <p>rien ne sera conservé</p> : <Liste />}`,
    ]) {
      expect(
        jugerBandeau(f(`const enBase = b.url !== "";\n${juste}`)),
        `le cas juste est refusé : ${juste}`,
      ).toEqual([])
    }
  })

  it('③ ET UN TEXTE SANS CONDITION N’EST PAS JUGÉ', () => {
    // Un fichier qui ne connaît pas `enBase` ne peut pas se contredire :
    // le juger serait chasser un mot.
    expect(jugerBandeau(f(`<p>Mode aperçu – données en mémoire</p>`))).toEqual([])
    // Et une œuvre qui parle de `enBase` sans rien nier non plus.
    expect(jugerBandeau(f(`const enBase = true;\n{enBase && <Liste />}`))).toEqual([])
  })

  it('④ LA FENÊTRE EST BORNÉE — une condition lointaine ne commande plus', () => {
    // Douze lignes couvrent un bloc JSX ordinaire. Au-delà, rattacher le
    // texte à cette condition serait une supposition, et une supposition
    // qui rougit est un faux rouge.
    const loin = `{enBase && <A />}\n${'const x = 1\n'.repeat(20)}<p>non conservées</p>`
    expect(jugerBandeau(f(loin)), 'une condition à vingt lignes est rattachée').toEqual([])
  })

  it('⑥ CHAQUE FORMULATION EST EXERCÉE SEULE', () => {
    // ── POURQUOI CE CONTRÔLE EXISTE, ET C'EST UNE MUTATION QUI L'A DIT.
    //
    // Retirer `/mode aperçu/` de la liste ne faisait rien rougir : la
    // phrase mesurée — « Mode aperçu – données en mémoire, non
    // conservées. » — déclenche TROIS motifs à la fois. Aucun n'était
    // donc porteur, et la liste aurait pu se vider motif par motif sans
    // qu'un seul contrôle ne bouge.
    //
    // Chaque formulation est désormais exercée SEULE, par une phrase que
    // les autres motifs ne reconnaissent pas.
    for (const [quoi, phrase] of [
      ['aperçu seul', 'Mode aperçu'],
      ['mémoire seule', 'Les données en mémoire'],
      ['rechargement', 'Tout disparaîtra au rechargement'],
      ['pas sauvegardé', 'Vos saisies ne seront pas sauvegardées'],
      ['non conservé', 'Travail non conservé'],
    ] as const) {
      const d = jugerBandeau(f(`const enBase = true;\n{enBase && <p>${phrase}</p>}`))
      expect(d.length, `« ${quoi} » n’est reconnu par aucun motif`).toBe(1)
    }
  })

  it('⑤ LA DERNIÈRE CONDITION DÉCIDE — pas la première rencontrée', () => {
    // Une œuvre peut employer `enBase` plusieurs fois. C'est la mention la
    // plus PROCHE du texte qui le commande ; prendre la première rendrait
    // un verdict au hasard de l'ordre d'écriture.
    const inverse = `{enBase && <Liste />}\n{!enBase && <p>non conservées</p>}`
    expect(jugerBandeau(f(inverse)), 'la condition la plus proche est ignorée').toEqual([])
    const fautif = `{!enBase && <Liste />}\n{enBase && <p>non conservées</p>}`
    expect(jugerBandeau(f(fautif)).length, 'le défaut après un cas juste est manqué').toBe(1)
  })
})
