/**
 * EP-364 · P-b — UNE NOUVELLE ANCRE SUR DU SOURCE TOLÈRE LES REPLIS.
 *
 * ── LA FAMILLE, ET POURQUOI UN CLIQUET PLUTÔT QUE DE LA DISCIPLINE.
 *
 * Quatre fois le 2026-11-05, un contrôle a rougi sur un texte dont le
 * sens n'avait pas bougé — seulement la largeur. Dont UNE écrite en
 * corrigeant les trois autres. La discipline ne tient pas : il faut que
 * la tolérance vienne de la construction.
 *
 * `motifTexte` (EP-363) la donne. Ce cliquet-ci empêche qu'on s'en passe.
 *
 * ── CE QU'IL COUVRE, ET CE QU'IL NE COUVRE PAS. MESURÉ.
 *
 * Sur 2 156 assertions `toMatch`/`toContain` du dépôt :
 *
 *   321  sujet TRAÇABLE jusqu'à une lecture de source
 *  1549  sujet manifestement autre (une valeur calculée)
 *   286  AMBIGU — un nom d'habitude (`t`, `src`, `CODE`), aucune trace
 *
 * Les 286 sont la raison pour laquelle ce cliquet ne prétend PAS tout
 * couvrir. Les réclamer produirait 286 demandes sur des contrôles
 * justes, et une garde qui gêne le chemin ordinaire est une garde qu'on
 * retire. Il tient donc la ligne sur ce qu'il peut PROUVER.
 *
 * ── ET C'EST UN CLIQUET DE DETTE, PAS UNE MIGRATION.
 *
 * 117 ancres traçables sont fragiles aujourd'hui, et ce sont surtout des
 * motifs de CODE (`const diagnostics: string[] = []`,
 * `type: 'storefront_query_failed'`). Les convertir toutes serait un
 * chantier, pas une garde — et sans valeur : elles cassent sur un
 * reformatage automatique, pas sur une reformulation humaine.
 *
 * Le nombre ne peut donc que DESCENDRE. Comme `lint_cliquet` : « la dette
 * ne grossit plus ».
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..', '..', '..')

/** MESURÉ LE 2026-11-06. Ce nombre ne monte jamais. */
const DETTE = 117

/**
 * LA SECONDE DETTE : les ancres dont le SUJET n'est pas traçable, dans un
 * fichier qui lit du source. MESURÉ LE 2026-11-06, et il ne monte jamais.
 *
 * ── CE CHIFFRE A ÉTÉ FAUX PENDANT UNE HEURE, ET LA RAISON COMPTE.
 *
 * J'ai d'abord écrit 361 : un chiffre relevé par un script Python jetable,
 * pas par l'instrument finalement livré ici. Les deux ne comptaient pas la
 * même chose. Le vrai est 376 — et personne ne l'a vu, parce que le relevé
 * était déclaré sans qu'AUCUN cas ne le lise.
 *
 * La règle : un relevé se mesure avec l'instrument qui le gardera, et il
 * naît AVEC son cas. Sinon c'est un commentaire.
 *
 * Sans elle, il suffisait de nommer sa variable `t` pour échapper au
 * cliquet pour toujours — une porte de sortie permanente.
 */
const DETTE_OPAQUE = 376

const fichiersDeControle = (dossier: string): string[] => {
  const out: string[] = []
  for (const n of readdirSync(dossier)) {
    const p = join(dossier, n)
    if (statSync(p).isDirectory()) out.push(...fichiersDeControle(p))
    else if (/\.test\.tsx?$/u.test(n)) out.push(p)
  }
  return out
}

/**
 * LES ANCRES D'UN FICHIER QUI LIT DU SOURCE — traçables ET opaques.
 *
 * ── LES OPAQUES SONT UNE PORTE DE SORTIE PERMANENTE.
 *
 * Le cliquet de dette empêche le 118ᵉ traçable. Mais il suffisait de
 * nommer sa variable `t` pour qu'une ancre fragile lui échappe POUR
 * TOUJOURS. Rien n'empêchait le 362ᵉ opaque.
 *
 * ── ET LA FERMETURE NE COÛTE RIEN, MESURÉ.
 *
 * On pouvait craindre qu'exiger la tolérance sur un sujet qui n'est PAS
 * du source gêne des contrôles justes — `expect(html).toContain('Ajouter
 * au panier')` sur une page rendue. Ça ne gêne pas : un HTML rendu se
 * replie aussi, et `motifTexte('Ajouter au panier')` y est strictement
 * meilleur. La demande est donc la même pour les deux, sans faux poids.
 *
 * Le périmètre reste les fichiers qui LISENT du source : un fichier qui
 * n'en lit jamais ne peut pas porter d'ancre sur du source, et on ne lui
 * demande rien.
 */
function ancresTracables(src: string): {
  tolerantes: number
  fragiles: string[]
  opaquesFragiles: string[]
} {
  const sans = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')
  const lecteurs = new Set<string>()
  for (const m of sans.matchAll(
    /(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:\(\)\s*(?::[^=]+)?=>\s*)?(?:lireSource|lireSourceBrut|readFileSync)/gu,
  )) {
    lecteurs.add(m[1] ?? '')
  }
  const litSource = new RegExp('lireSource|lireSourceBrut|readFileSync', 'u').test(sans)
  let tolerantes = 0
  const fragiles: string[] = []
  const opaquesFragiles: string[] = []
  for (const m of sans.matchAll(
    /expect\(\s*([A-Za-z_][A-Za-z0-9_.()]*)[^)]*\)[\s\S]{0,140}?\.(?:not\.)?(?:toMatch|toContain)\(\s*(\/(?:[^/\\\n]|\\.)+\/[a-z]*|['"`](?:[^'"`\\\n]|\\.)+['"`]|motifTexte|motifEntre)/gu,
  )) {
    const sujet = m[1] ?? ''
    const lit = m[2] ?? ''
    const racine = sujet.split(/[.(]/u)[0] ?? ''
    const tracable = /^(?:lireSource|lireSourceBrut|readFileSync)/u.test(sujet) || lecteurs.has(racine)
    if (!tracable && !litSource) continue
    const corps = lit.startsWith('/')
      ? lit.slice(1, lit.lastIndexOf('/'))
      : /^['"`]/u.test(lit)
        ? lit.slice(1, -1)
        : lit
    // TOLÉRANTE : construite par l'utilitaire, ou portant déjà une
    // tolérance au blanc, ou sans aucun espace à replier.
    const ok =
      lit === 'motifTexte' ||
      lit === 'motifEntre' ||
      corps.includes('\\s') ||
      !/[^\\] /u.test(corps)
    if (ok) tolerantes += 1
    else if (tracable) fragiles.push(corps.slice(0, 60))
    else opaquesFragiles.push(corps.slice(0, 60))
  }
  return { tolerantes, fragiles, opaquesFragiles }
}

describe('EP-364 · les ancres sur du source tolèrent les replis', () => {
  const tout = (): { tolerantes: number; fragiles: string[]; opaquesFragiles: string[] } => {
    let tolerantes = 0
    const fragiles: string[] = []
    const opaquesFragiles: string[] = []
    for (const f of fichiersDeControle(SRC)) {
      const r = ancresTracables(readFileSync(f, 'utf8'))
      tolerantes += r.tolerantes
      fragiles.push(...r.fragiles)
      opaquesFragiles.push(...r.opaquesFragiles)
    }
    return { tolerantes, fragiles, opaquesFragiles }
  }

  it('① L’INSTRUMENT TROUVE DES ANCRES — sinon il ne garde rien', () => {
    // « Vert qui ne mesure rien » : un balayage à vide passerait tout.
    const r = tout()
    expect(
      r.tolerantes + r.fragiles.length,
      'aucune ancre traçable trouvée : le balayage est cassé',
    ).toBeGreaterThan(200)
  })

  it('② LA DETTE NE GROSSIT PLUS', () => {
    // ── LE CHIFFRE NE MONTE JAMAIS.
    //
    // Les 117 d'aujourd'hui sont surtout des motifs de CODE, qui cassent
    // sur un reformatage automatique et non sur une reformulation. Les
    // convertir serait un chantier sans valeur. Mais une ancre NEUVE n'a
    // aucune excuse : `motifTexte` existe.
    const r = tout()
    expect(
      r.fragiles.length,
      `${String(r.fragiles.length)} ancres fragiles contre ${String(DETTE)} au relevé : ` +
        'une nouvelle ancre sur du source a été écrite sans tolérance au repli. ' +
        'Employez `motifTexte(…)` — voir EP-363, et les quatre rouges du 2026-11-05.',
    ).toBeLessThanOrEqual(DETTE)
  })

  it('③ ET LE RELEVÉ SUIT LA RÉALITÉ — un chiffre périmé ne garde rien', () => {
    // ── UN CLIQUET DE DETTE SE DÉSARME TOUT SEUL S'IL NE SE RESSERRE PAS.
    //
    // Si la dette descend à 90 et que `DETTE` reste à 117, il reste 27
    // places libres pour en écrire de nouvelles — et il dira vert.
    // L'écart toléré est étroit, et le resserrer est le geste normal.
    const r = tout()
    expect(
      DETTE - r.fragiles.length,
      `la dette est tombée à ${String(r.fragiles.length)} : abaissez DETTE, ` +
        'sinon le cliquet laisse de la place à des ancres neuves',
    ).toBeLessThanOrEqual(10)
  })

  /**
   * ── ET CES DEUX CAS-LÀ MANQUAIENT, UNE HEURE DURANT.
   *
   * `DETTE_OPAQUE` a été mesuré, commenté, commité et POUSSÉ sans qu'aucun
   * cas ne le lise. Le relevé existait ; le cliquet, non. Un juge inerte,
   * écrit en fermant un trou de cette forme exacte.
   *
   * C'est pourquoi le cas ① compte `tolerantes + fragiles` : il n'a jamais
   * regardé les opaques, donc il ne pouvait pas me prévenir.
   */
  it('④ LA DETTE OPAQUE NE GROSSIT PLUS NON PLUS', () => {
    const r = tout()
    expect(
      r.opaquesFragiles.length,
      `${String(r.opaquesFragiles.length)} ancres fragiles à sujet OPAQUE contre ` +
        `${String(DETTE_OPAQUE)} au relevé. Sans ce cliquet, nommer sa variable ` +
        '`t` suffisait à échapper au précédent pour toujours. Employez ' +
        '`motifTexte(…)` : sur un HTML rendu comme sur du source, il est ' +
        'strictement meilleur que le littéral.',
    ).toBeLessThanOrEqual(DETTE_OPAQUE)
  })

  it('⑤ ET LE RELEVÉ OPAQUE SUIT LA RÉALITÉ', () => {
    const r = tout()
    expect(
      DETTE_OPAQUE - r.opaquesFragiles.length,
      `la dette opaque est tombée à ${String(r.opaquesFragiles.length)} : ` +
        'abaissez DETTE_OPAQUE',
    ).toBeLessThanOrEqual(10)
  })

  it('⑥ LE BALAYAGE VOIT VRAIMENT DES OPAQUES — sinon ④ garde le vide', () => {
    // La leçon du cas ① appliquée à la seconde moitié : un `opaquesFragiles`
    // toujours vide rendrait ④ vert pour toujours, et c'est exactement
    // comment ce relevé est né inerte.
    expect(tout().opaquesFragiles.length).toBeGreaterThan(100)
  })
})
