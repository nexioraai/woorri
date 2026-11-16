/**
 * LE JUGE DU CONTRAT DIT LES TYPES, ET VOIT UN NOMBRE REÇU EN LISTE (2026-11-16).
 *
 * MESURÉ sur l'Atelier (b010d704), code livré rejoué :
 *   tour 1 : <GrilleTableau lignes=…> — reproché « Ses réglages : colonnes,
 *     children, enfants » : des NOMS sans types.
 *   tour 2 : le modèle a renommé en colonnes= avec la MÊME liste d'objets.
 *     Ancien juge : aucun reproche (null) → accepté → l'écran tombait dès la
 *     première ligne. Ce cas se voit dans le code, sans données.
 */
import { describe, expect, it } from 'vitest'
import { jugerContrat, reprocheContrat, signaturesDe } from '../juge-contrat'
import { fichiersSysteme } from '../bibliotheque-ui'
import { motifTexte } from './motif-texte'

const systeme = fichiersSysteme(undefined)
const juger = (code: string) => jugerContrat(new Map([['composants/Clients.tsx', code]]), systeme)

describe('Le contrat dit les types', () => {
  it('① le type de chaque réglage est lu, commentaires ôtés', () => {
    const sig = signaturesDe(systeme)
    expect(sig.get('GrilleTableau')?.types.colonnes).toBe('number')
    expect(sig.get('GrilleTableau')?.nombres).toEqual(['colonnes'])
    for (const t of Object.values(sig.get('CarteDeChiffre')?.types ?? {})) expect(t).not.toMatch(/\*\//u)
  })

  it('② le tour 2 de l’Atelier — colonnes={[…]} — est REPROCHÉ', () => {
    const d = juger(`<GrilleTableau colonnes={[{ libelle: 'Nom', acces: 'nom' }]} enfants={lignes} />`)
    expect(d.map((x) => x.nature)).toEqual(['nombre-en-liste'])
    expect(reprocheContrat(d)).toMatch(motifTexte('« colonnes » attend un NOMBRE (number), pas une liste ni un objet'))
  })

  it('③ le tour 1 de l’Atelier — lignes= — reçoit les TYPES des réglages', () => {
    expect(reprocheContrat(juger(`<GrilleTableau lignes={x} />`))).toMatch(
      motifTexte('Ses réglages : colonnes (number), children (React.ReactNode), enfants (React.ReactNode)'),
    )
  })

  it('④ contrôle négatif : un nombre écrit, ou calculé, n’est pas reproché', () => {
    expect(juger(`<GrilleTableau colonnes={3}><Carte>a</Carte></GrilleTableau>`)).toEqual([])
    expect(juger(`<GrilleTableau colonnes={n}>x</GrilleTableau>`)).toEqual([])
  })
})
