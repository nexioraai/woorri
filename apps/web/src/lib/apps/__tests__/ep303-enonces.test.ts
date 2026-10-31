/**
 * EP-303 — LE DOCUMENT EST DÉCOUPÉ PAR UNE MACHINE, ET NUMÉROTÉ.
 *
 * Première pièce du chantier unifié (arbitrage du 2026-10-31) : le lexique
 * fermé du juge et la table fixe de l'élicitation sont le même défaut — une
 * liste écrite d'avance à la place du document. Le document décide ; mais la
 * DÉCOUPE reste déterministe, et le modèle ne rendra que des IDENTIFIANTS :
 * la provenance devient exacte par construction.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decouperEnEnonces, enoncesNumerotes } from '../enonces'

const CAHIER = readFileSync(
  join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'),
  'utf8',
)

describe('EP-303 · le découpage en énoncés', () => {
  const enonces = decouperEnEnonces(CAHIER)

  it('① LE CAHIER RÉEL REND L’ORDRE DE GRANDEUR MESURÉ — ni 5, ni 500', () => {
    // Mesuré le 2026-10-31 : 110 énoncés de puce + 25 de prose. Trop fin, la
    // liste est inutilisable ; trop gros, on a réinventé le lexique.
    expect(enonces.length).toBeGreaterThan(100)
    expect(enonces.length).toBeLessThan(200)
    const prose = enonces.filter((e) => e.forme === 'prose')
    expect(prose.length, 'la prose est redevenue invisible').toBeGreaterThan(10)
  })

  it('② LA PROSE PORTE DES EXIGENCES QUE LES PUCES N’ONT PAS', () => {
    // Correction du propriétaire : « que deviennent les exigences qui n'ont
    // pas eu la chance d'être une puce ? » — celle-ci est un principe
    // directeur du cahier, et elle vivait hors de toute puce.
    const texte = enonces.map((e) => e.texte).join(' ')
    expect(texte).toMatch(/jamais afficher une capacité comme disponible/u)
  })

  it('③ LES EN-TÊTES RÉPÉTÉS DU PDF NE SONT PAS DES EXIGENCES', () => {
    const entetes = enonces.filter((e) => /Cahier des charges —.*Page \d/u.test(e.texte))
    expect(entetes, 'le bruit de pagination est entré dans la liste').toEqual([])
  })

  it('④ LES NUMÉROS SONT DENSES ET STABLES — la provenance en dépend', () => {
    enonces.forEach((e, i) => {
      expect(e.id).toBe(i + 1)
    })
    // Rejouer le découpage rend exactement la même numérotation : sinon un
    // identifiant renvoyé par le modèle désignerait autre chose.
    expect(decouperEnEnonces(CAHIER).map((e) => e.texte)).toEqual(enonces.map((e) => e.texte))
  })

  it('⑤ LA PROSE NARRATIVE SANS VERBE DE CAPACITÉ N’EST PAS UNE EXIGENCE', () => {
    const r = decouperEnEnonces(
      'Notre société a été fondée en 1998 à N’Djamena. Nous sommes très fiers de notre histoire. ' +
        "L'application doit afficher le catalogue des produits.",
    )
    expect(r.map((e) => e.texte)).toEqual([
      "L'application doit afficher le catalogue des produits.",
    ])
  })

  it('⑥ UN BRIEF DE TROIS LIGNES REND PEU D’ÉNONCÉS, ET C’EST CORRECT', () => {
    // Cas MAJORITAIRE, pas cas limite : ce qui n'est pas écrit n'est pas un
    // trou. Cinq énoncés pour trois lignes est le bon résultat.
    const r = decouperEnEnonces(
      'Une application mobile pour une boutique de téléphones à N’Djamena : elle doit afficher ' +
        'le catalogue, permettre la commande par WhatsApp, gérer le paiement mobile money et ' +
        'enregistrer le suivi des commandes.',
    )
    expect(r.length).toBeGreaterThan(0)
    expect(r.length).toBeLessThan(6)
  })

  it('⑦ LE TEXTE NUMÉROTÉ EST CE QUE LE MODÈLE REÇOIT', () => {
    const t = enoncesNumerotes(enonces.slice(0, 3))
    expect(t.split('\n')).toHaveLength(3)
    expect(t.startsWith('1. ')).toBe(true)
  })
})
