// 2026-11-12 — LE CONTRAT DES PIÈCES (pharmacie du propriétaire).
//
// Ce que ce fichier verrouille :
//   ① le vocabulaire est LU dans la bibliothèque, jamais recopié ;
//   ② la pharmacie réelle est refusée — chacun de ses réglages inventés ;
//   ③ ce qui est licite ne déclenche rien (pas de faux reproche) ;
//   ④ la consigne enseigne les MÊMES réglages que le juge exige ;
//   ⑤ la boucle reproche le contrat au tour où il est rompu ;
//   ⑥ un morceau qui plante ne fait plus tomber l'espace de gestion.
//
// Ce que ce cliquet NE VOIT PAS : une valeur CALCULÉE de mauvais type
// (`serie={uneChaine}`). Celle-là, seul le juge d'exécution la voit.
import { describe, it, expect } from 'vitest'
import { fichiersSysteme, CONSIGNE_BIBLIOTHEQUE } from '../bibliotheque-ui'
import { jugerContrat, reprocheContrat, signaturesDe } from '../juge-contrat'
import { boucleEcriture } from '../boucle-directe'
import { motifTexte } from './motif-texte'

const sys = fichiersSysteme('XAF')
const juger = (code: string) => jugerContrat(new Map([['composants/A.tsx', code]]), sys)

describe('le juge du contrat des pièces', () => {
  it('① les réglages sont lus dans les signatures de la bibliothèque', () => {
    const s = signaturesDe(sys)
    expect(s.get('Courbe')?.acceptes).toContain('donnees')
    expect(s.get('Courbe')?.listes).toContain('points')
    expect(s.get('CarteDeChiffre')?.listes).toEqual(['serie'])
    expect(s.get('CoqueGestion')?.acceptes).toContain('style')
    // Un défaut `() => {}` ne désaligne pas les virgules suivantes.
    expect(s.size).toBeGreaterThan(10)
  })

  it('② les réglages inventés de la pharmacie sont tous refusés', () => {
    const d = juger(`
      <CoqueGestion style="nature" sections={s} activeSection={a} onSelect={x}>
        <CarteDeChiffre icone="argent" libelle="Ventes" valeur="3" contexte="mois" serie="30 derniers jours" />
        <Courbe data={revenu} />
        <EnTeteDeSection surtitre="Pharmacie" libelle="Médicaments" legende="En stock" />
      </CoqueGestion>`)
    const vus = d.map((x) => `${x.piece}.${x.reglage}:${x.nature}`)
    expect(vus).toEqual(expect.arrayContaining([
      'CoqueGestion.activeSection:inconnu',
      'CoqueGestion.onSelect:inconnu',
      'CarteDeChiffre.serie:liste-en-texte',
      'Courbe.data:inconnu',
      'EnTeteDeSection.libelle:inconnu',
      'EnTeteDeSection.legende:inconnu',
    ]))
    expect(reprocheContrat(d)).toMatch(motifTexte('Ses réglages : titre, libelle, description'))
  })

  it('③ ce qui est licite ne déclenche rien', () => {
    expect(juger(`
      <CoqueGestion style="nature" sections={s} active={a} onChange={x} key="k">
        <CarteDeChiffre icone="argent" libelle="Ventes" valeur="3" contexte="mois" serie={parJour(v, 'date')} />
        <Courbe titre="Revenu" donnees={sommeParMois(v, 'date', 'montant')} />
        <Carte style={{ padding: 8 }}>x</Carte>
        <Bouton onClick={() => { go('a, b') }} {...reste}>Ok</Bouton>
      </CoqueGestion>`)).toEqual([])
    // Une pièce du même nom écrite par le modèle est LA SIENNE.
    expect(juger('function Courbe({ data }) { return null }\n<Courbe data={x} />')).toEqual([])
    // Un exemple en commentaire n'est pas du code.
    expect(juger('// <Courbe data={x} />\n/* <Barres data={y} /> */')).toEqual([])
  })

  it('④ la consigne enseigne les réglages que le juge exige', () => {
    expect(CONSIGNE_BIBLIOTHEQUE).toMatch(motifTexte('RÉGLAGES EXACTS de chaque'))
    for (const [piece, s] of signaturesDe(sys)) {
      if (s.acceptes === null) continue
      expect(CONSIGNE_BIBLIOTHEQUE, `${piece} n'est pas enseignée`).toContain(`     ${piece}(`)
    }
    expect(CONSIGNE_BIBLIOTHEQUE).toContain('CarteDeChiffre(icone, libelle, valeur, contexte, ton, tendance, serie[])')
  })

  it('⑤ la boucle reproche le contrat au tour où il est rompu', async () => {
    const appli = `=== index.tsx ===
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Courbe } from './systeme/ui'
createRoot(document.getElementById('racine')!).render(<Courbe data={[]} />)`
    const r = await boucleEcriture({
      demande: 'essai', entites: [], configuration: { currency: 'XAF' }, toursMax: 2,
      appeler: async () => ({ texte: appli, tronquee: false }),
      juger: async () => ({ monteDansSimulateur: true, erreurs: [], octetsRendus: 10, texte: 'x', ms: 1 }),
    })
    expect(r.tours[0]?.ok).toBe(false)
    expect(String(r.tours[0]?.motif)).toMatch(motifTexte('<Courbe data=…> — Courbe n’a pas « data »'))
  }, 60_000)

  it('⑥ un morceau qui plante ne fait plus tomber l’espace de gestion', () => {
    const ui = sys.get('systeme/ui.tsx') ?? ''
    expect(ui).toMatch(motifTexte('<Protection cle={active}>{children ?? enfants}</Protection>'))
    expect(ui).toMatch(motifTexte("componentDidCatch(e: unknown) { console.error('[section en erreur]', e) }"))
  })
})
