/**
 * EP-360 · C0b — LES DEUX MOITIÉS DE LA RÈGLE 6 NE PEUVENT PLUS DIVERGER.
 *
 * ── L'ANGLE MORT, MESURÉ LE 2026-11-05 : TROIS DÉFAUTS AU MÊME ENDROIT.
 *
 * La consigne a deux versions de sa règle 6 — courte quand aucune table
 * n'est déclarée, longue quand il y en a. Les règles 1-5 et 7-13 sont
 * IDENTIQUES : tout l'écart vit là. Et trois interdictions GÉNÉRALES
 * s'étaient logées d'un seul côté :
 *
 *   « N'ÉCRIS AUCUN BANDEAU »   ×0 sans table · ×1 avec
 *   « AUCUN FICHIER »           ×0 sans table · ×1 avec
 *   « JAMAIS localStorage »     ×1 sans table · ×0 AVEC   ← l'autre sens
 *
 * La troisième est celle que personne n'avait cherchée.
 *
 * ── ET LA CONSÉQUENCE S'EST VUE EN PRODUCTION.
 *
 * Une demande qui ne décrit rien ne déclare aucune table, reçoit donc la
 * moitié courte, et le modèle a écrit son propre bandeau — « Mode
 * démonstration — les données ne sont pas persistées » — par-dessus celui
 * de la plateforme. La correction écrite la veille ne pouvait pas
 * s'appliquer : elle vivait dans l'autre moitié.
 *
 * ── CE CLIQUET NE TIENT PAS UNE LISTE DE RÈGLES. IL VÉRIFIE UNE FORME.
 *
 * Une liste tenue à la main aurait le MÊME angle mort que la consigne :
 * elle ne contiendrait que ce à quoi on a pensé. Ici, les deux moitiés
 * COMPOSENT un bloc commun nommé, et ce qui est vérifié est la
 * composition — plus le fait que les têtes restent trop courtes pour
 * qu'une règle générale puisse s'y cacher.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import {
  consignePour,
  REGLE_6_SANS_BASE,
  REGLE_6_TETE_SANS_BASE,
} from '../boucle-directe'
import { blocBase, REGLE_6_COMMUN, type EntiteDeclaree } from '../entites-declarees'

const APPS = join(__dirname, '..')
const UNE: EntiteDeclaree[] = [
  {
    id: 'ent_chose',
    name: 'chose',
    fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }],
  },
]
const utiles = (lignes: readonly string[]): string[] =>
  lignes.map((l) => l.trim()).filter((l) => l !== '')

describe('EP-360 · la règle 6 se compose', () => {
  it('① CE QUI VAUT DANS LES DEUX CAS EST DANS LES DEUX, UNE SEULE FOIS', () => {
    const sans = consignePour([])
    const avec = consignePour(UNE)
    for (const ligne of utiles(REGLE_6_COMMUN)) {
      expect(
        sans.split(ligne).length - 1,
        `« ${ligne.slice(0, 44)}… » n’apparaît pas exactement une fois SANS table`,
      ).toBe(1)
      expect(
        avec.split(ligne).length - 1,
        `« ${ligne.slice(0, 44)}… » n’apparaît pas exactement une fois AVEC table`,
      ).toBe(1)
    }
    // ── ET LE BLOC N'EST PAS VIDE : un bloc commun vide passerait tout.
    expect(utiles(REGLE_6_COMMUN).length, 'le bloc commun s’est vidé').toBeGreaterThanOrEqual(6)
  })

  it('② LES TROIS INTERDICTIONS MESURÉES Y SONT, et des deux côtés', () => {
    // Elles ne sont pas une liste à tenir : elles sont les trois CAS
    // MESURÉS qui ont fuité. Les perdre, c'est rouvrir ce qu'on ferme.
    const sans = consignePour([])
    const avec = consignePour(UNE)
    for (const [quoi, motif] of [
      ['le bandeau', /N’ÉCRIS AUCUN BANDEAU/u],
      ['les fichiers', /AUCUN FICHIER/u],
      ['localStorage', /JAMAIS localStorage/u],
    ] as const) {
      expect(sans, `${quoi} : absent SANS table`).toMatch(motif)
      expect(avec, `${quoi} : absent AVEC table`).toMatch(motif)
    }
  })

  it('③ LES DEUX MOITIÉS COMPOSENT — elles ne recopient pas', () => {
    // ── C'EST LA GARDE DE FOND.
    //
    // Si une moitié ré-inscrivait le texte au lieu de composer la
    // constante, ① passerait le jour même et divergerait le mois
    // suivant — exactement ce qui vient d'arriver.
    const boucle = lireSource(join(APPS, 'boucle-directe.ts'))
    const entites = lireSource(join(APPS, 'entites-declarees.ts'))
    expect(boucle, 'la moitié sans table ne compose plus le bloc commun').toMatch(
      /REGLE_6_SANS_BASE = \[\.\.\.REGLE_6_TETE_SANS_BASE, \.\.\.REGLE_6_COMMUN\]/u,
    )
    expect(entites, 'la moitié avec table ne compose plus le bloc commun').toMatch(
      /\.\.\.REGLE_6_COMMUN,/u,
    )
    // ET LE BLOC N'EST DÉFINI QU'UNE FOIS.
    expect(
      (entites.match(/REGLE_6_COMMUN:\s*readonly string\[\]/gu) ?? []).length,
      'le bloc commun est défini plusieurs fois',
    ).toBe(1)
  })

  it('④ LA TÊTE RESTE TROP COURTE POUR CACHER UNE RÈGLE GÉNÉRALE', () => {
    // ── UN BUDGET, ET JE L'APPELLE UN BUDGET.
    //
    // Aucun contrôle mécanique ne distingue « général » de « propre aux
    // tables » : c'est du sens. Ce qu'on peut faire, c'est rendre la
    // cachette trop petite. Une tête de douze lignes ne loge pas une
    // interdiction de plus sans qu'on le voie ici.
    //
    // Ce n'est donc PAS une preuve — c'est une gêne mesurée, et elle
    // oblige à passer par le bloc commun, qui est le chemin juste.
    //
    // ── 8 → 9 LE 2026-11-05, et la raison est écrite (C4).
    //
    // Le gabarit `DONNEES.json` de la tête nommait une table `releve`
    // avec un champ `date`. Privé de cahier, le modèle a recopié ce seul
    // exemple concret qu'on lui donnait et a produit une application de
    // relevés de compteur électrique que personne n'avait demandée.
    //
    // Le gabarit nomme désormais `chose`, que `NOMS_REFUSES` écarte : le
    // recopier fait tomber la table, avec un motif qui dit quoi faire.
    // La ligne qui l'explique est la NEUVIÈME, et elle est propre à la
    // tête — elle ne porte aucune règle générale.
    //
    // MESURÉ : 9 lignes utiles, et la borne vaut EXACTEMENT 9.
    //
    // Deux essais m'ont amené là. À 12, une mutation de trois lignes
    // passait au vert. À 9, UNE ligne passait encore — et une ligne
    // suffit à loger une interdiction. Un budget qui laisse du jeu laisse
    // passer exactement ce qu'il devait arrêter.
    //
    // La tête décrit UNE situation et n'a pas à grandir. Si une neuvième
    // ligne est nécessaire un jour, elle se justifie ici, comme les
    // bornes de prose d'EP-319.
    expect(
      utiles(REGLE_6_TETE_SANS_BASE).length,
      'la tête sans base a grossi : une règle générale peut s’y cacher',
    ).toBe(9)
    // La moitié AVEC table est longue par nature — elle décrit les
    // tables. On borne ce qu'elle ajoute PAR TABLE, pas son total : voir
    // EP-319 ④, qui tient les deux bornes de taille.
    //
    // ── 3 700 → 5 500 LE 2026-11-06, ET JE DIS QUE J'ÉLÈVE UN BUDGET.
    //
    // La loi public/gestion est entrée ici : 3 523 → 5 407 signes. Élever
    // une borne parce qu'on vient de la dépasser est exactement le geste
    // dont il faut se méfier, donc voici la mesure et la raison.
    //
    // CE QUI A GONFLÉ, mesuré bloc par bloc : la liste des cinq clauses de
    // la face publique vaut 659 signes, l'espace de gestion 301, le lien
    // page↔table 460, le retour 131, l'anecdote datée 243. Aucune clause
    // n'est retranchable — elles sont la loi, dictées une par une.
    //
    // POURQUOI ELLE NE PEUT PAS ALLER DANS LE BLOC COMMUN, qui serait la
    // sortie élégante : le bloc commun est composé par les DEUX moitiés, y
    // compris celle SANS base. Or sans base il n'y a pas de session, donc
    // pas d'espace de gestion, donc rien à cacher d'un visiteur. Dicter
    // cette loi à une œuvre qui ne peut pas se connecter lui ferait écrire
    // une porte vers le vide — voir EP-370 ⑥, qui garde cette frontière.
    //
    // ET CE QUI REMPLACE LA GÊNE PERDUE : EP-370 nomme les neuf clauses une
    // par une sur la consigne PRODUITE. La borne ne retient plus seule — la
    // moitié peut être grande, mais son contenu est énuméré ailleurs, et
    // une dixième règle générale qui s'y glisserait ne serait couverte par
    // aucun des deux. C'est plus fort que la borne d'hier, pas moins.
    const sansTables = blocBase([]).length
    expect(sansTables, 'la moitié avec table a enflé hors des tables').toBeLessThan(5500)
  })

  it('⑤ ET LES AUTRES RÈGLES RESTENT IDENTIQUES DES DEUX CÔTÉS', () => {
    // ── CE QUI FONDE TOUT LE RESTE, et il faut le tenir.
    //
    // Mesuré : les règles 1-5 et 7-13 sont identiques, seule la 6 diffère.
    // Si une AUTRE règle se mettait à dépendre des tables, l'angle mort
    // se rouvrirait ailleurs — et ce fichier ne regarderait plus au bon
    // endroit.
    const decouper = (t: string): Map<string, string> => {
      const m = [...t.matchAll(/^(\d+)\. /gmu)]
      const out = new Map<string, string>()
      for (const [i, d] of m.entries()) {
        const fin = i + 1 < m.length ? (m[i + 1]?.index ?? t.length) : t.length
        out.set(d[1] ?? '', t.slice(d.index ?? 0, fin).trim())
      }
      return out
    }
    const a = decouper(consignePour([]))
    const b = decouper(consignePour(UNE))
    expect([...b.keys()], 'les règles ne sont plus les mêmes des deux côtés').toEqual([...a.keys()])
    const differentes = [...a.keys()].filter((n) => a.get(n) !== b.get(n))
    expect(
      differentes,
      'une règle AUTRE que la 6 dépend des tables : l’angle mort se rouvre ailleurs',
    ).toEqual(['6'])
  })

  it('⑥ LA MOITIÉ COURTE NE PART PAS SANS SON BLOC', () => {
    // Le défaut tel qu'il s'est produit : la moitié courte émise seule.
    expect(REGLE_6_SANS_BASE, 'la moitié courte a perdu le bloc commun').toContain(
      utiles(REGLE_6_COMMUN)[0] ?? '∅',
    )
    expect(
      REGLE_6_SANS_BASE.length,
      'la moitié courte est plus courte que son seul bloc commun',
    ).toBeGreaterThan(REGLE_6_COMMUN.join('\n').length)
  })
})
