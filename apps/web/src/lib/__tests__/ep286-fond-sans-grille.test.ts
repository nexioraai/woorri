/**
 * EP-286 — LE FOND DE MARQUE N'A PLUS DE GRILLE, ET N'EN REPREND PAS.
 *
 * ── LA DEMANDE, 2026-10-30.
 *
 * Le propriétaire a vu le quadrillage au travers de l'écran de création et a
 * demandé son retrait « de manière chirurgicale ».
 *
 * ── CE QUE « CHIRURGICAL » VOULAIT DIRE ICI.
 *
 * La grille ne vivait pas seule : elle était les DEUX PREMIÈRES COUCHES d'un
 * composite qui porte aussi les quatre halos de marque (bleu, accent, or,
 * prune) et la couleur de fond. `.nexiora-bg` est appliquée sur 22 fichiers —
 * accueil, admin, édition, aperçu, tarifs, mentions, connexion.
 *
 * Retirer le quadrillage sans toucher aux halos, c'était ça l'opération.
 *
 * ── LE PIÈGE QUE CE CLIQUET SURVEILLE VRAIMENT.
 *
 * `background-size` s'aligne sur les couches de `background` DANS L'ORDRE,
 * poste par poste. Retirer deux couches sans retirer leurs deux `40px 40px`
 * aurait décalé tout le reste d'un cran : chaque halo aurait pris la taille
 * du suivant, et le dernier n'en aurait plus eu.
 *
 * Le rendu aurait été faux SANS qu'aucune erreur ne se lève — CSS ne se
 * plaint jamais d'un décalage de liste. C'est exactement la classe de panne
 * silencieuse que ce dépôt paie depuis une semaine.
 *
 * ── ET UNE PORTE DÉROBÉE, FERMÉE EN PASSANT.
 *
 * Une classe `.grid-bg` portait le MÊME quadrillage et n'était utilisée par
 * AUCUN fichier. Laissée en place, elle aurait fait revenir la grille le jour
 * où quelqu'un l'aurait appliquée en croyant bien faire. Supprimée.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CSS = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8')

/** Le corps de la règle `.nexiora-bg`, commentaires exclus. */
const bloc = (() => {
  const sansCommentaires = CSS.replace(/\/\*[\s\S]*?\*\//gu, ' ')
  const m = sansCommentaires.match(/\.nexiora-bg\s*\{([\s\S]*?)\n\}/u)
  return m?.[1] ?? ''
})()

describe('EP-286 · le fond de marque', () => {
  it('① LA RÈGLE EXISTE ENCORE — un bloc absent passerait tout le reste', () => {
    expect(bloc, '`.nexiora-bg` a disparu : 22 fichiers perdraient leur fond').not.toBe('')
    expect(bloc).toContain('#0a050e')
  })

  it('② PLUS AUCUNE LIGNE DE GRILLE', () => {
    // Le motif exact d'un quadrillage : une ligne d'un pixel suivie de
    // transparent. Peu importe l'opacité choisie — c'est la FORME qui trace.
    expect(bloc, 'le quadrillage est revenu dans le fond de marque').not.toMatch(
      /1px,\s*transparent\s+1px/u,
    )
    expect(bloc, 'une taille de tuile subsiste : la grille revient par là').not.toMatch(
      /40px\s+40px/u,
    )
  })

  it('③ LES QUATRE HALOS DE MARQUE SONT INTACTS', () => {
    // ── L'OPERATION DEVAIT ETRE CHIRURGICALE.
    //
    // Retirer la grille ET les halos aurait aussi fait disparaitre le
    // quadrillage — et aurait detruit l'identite visuelle au passage. Ce
    // controle distingue les deux.
    for (const [nom, couleur] of [
      ['bleu', '79,110,245'],
      ['accent', '224,112,64'],
      ['or', '201,168,76'],
      ['prune', '139,34,82'],
    ] as const) {
      expect(bloc, `le halo ${nom} a disparu avec la grille`).toContain(couleur)
    }
  })

  it('④ `background-size` COMPTE AUTANT DE POSTES QUE DE COUCHES', () => {
    // ── LE VRAI PIEGE, ET IL EST MUET.
    //
    // `background-size` s'aligne poste par poste sur `background`. Un
    // decalage ne leve AUCUNE erreur : il deforme chaque halo en silence.
    const fond = bloc.split('background:')[1]?.split('background-size')[0] ?? ''
    const couches = (fond.match(/gradient\(/gu) ?? []).length + (fond.match(/#[0-9a-f]{6}/giu) ?? []).length
    const tailles = (bloc.split('background-size:')[1] ?? '').split(';')[0].split(',').length
    expect(couches, 'plus aucune couche de fond : ce contrôle ne mesure rien').toBeGreaterThan(0)
    expect(
      tailles,
      `${String(couches)} couche(s) de fond pour ${String(tailles)} taille(s) : chaque halo ` +
        'prendra la taille du suivant, sans qu’aucune erreur ne se lève',
    ).toBe(couches)
  })

  it('⑤ LA CLASSE DÉROBÉE N’EST PAS REVENUE', () => {
    // `.grid-bg` portait le meme quadrillage et n'etait employee nulle part.
    // Laissee en place, elle aurait rouvert la porte au premier qui l'aurait
    // appliquee en croyant bien faire.
    expect(
      CSS.replace(/\/\*[\s\S]*?\*\//gu, ' '),
      '`.grid-bg` est revenue : elle reintroduit le quadrillage par une autre porte',
    ).not.toMatch(/\.grid-bg\s*\{/u)
  })
})
