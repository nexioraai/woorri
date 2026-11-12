/**
 * EP-276 — LA BOUCLE : L'IA ÉCRIT, LE COMPILATEUR RÉPOND, L'IA CORRIGE.
 *
 * ── CE QU'ELLE REMPLACE.
 *
 * Le moteur actuel répare un DOCUMENT avec nos juges, qui jugent du SENS.
 * Mesuré le 2026-10-18 : neuf appels en file, 26 minutes, 8,46 $ — et le
 * verdict ne dit jamais si l'application MARCHE.
 *
 * Ici le juge est le compilateur : précis, gratuit, instantané. Quand il se
 * tait, l'application tient debout.
 *
 * ── POURQUOI TOUT SE TESTE SANS DÉPENSER.
 *
 * `appeler` est INJECTÉ. La boucle entière s'éprouve avec un faux modèle —
 * et elle a été écrite ainsi, avant qu'un seul appel payant ne parte. Treize
 * tirs et 66 $ ont été dépensés en apprenant par la facture ; plus jamais.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Que le vrai modèle écrive du bon code. Ça se mesure sur un tir, et le
 *    propriétaire décide quand. Ici on prouve que la MACHINE est juste :
 *    qu'elle borne, qu'elle refuse, qu'elle renvoie l'erreur utile.
 */
import { describe, expect, it } from 'vitest'
import { lireFichiers, sansClotureMarkdown } from '../ecriture-directe'
import { boucleEcriture, CONSIGNE, pageAutonome, TOURS_MAX } from '../boucle-directe'
import { PAQUETS_PROPOSES, PAQUETS_AUTORISES } from '../ecriture-directe'

/**
 * Un faux modèle : il rend les textes qu'on lui dicte, dans l'ordre.
 *
 * UN TEXTE SEUL EST UNE RÉPONSE ENTIÈRE. Pour dire qu'un tour a été COUPÉ —
 * le défaut du 2026-10-19 —, on passe `coupe('…')` à la place.
 */
const coupe = (texte: string) => ({ texte, tronquee: true })

const modele = (...reponses: (string | { texte: string; tronquee: boolean })[]) => {
  let i = 0
  const vus: { role: string; content: string }[][] = []
  const appeler = async (m: readonly { role: 'user' | 'assistant'; content: string }[]) => {
    vus.push([...m])
    const r = reponses[Math.min(i++, reponses.length - 1)] ?? ''
    return typeof r === 'string' ? { texte: r, tronquee: false } : r
  }
  return { appeler, vus }
}

const BON = [
  '=== index.tsx ===',
  "import { facture } from './calcul'",
  'export const total = facture(159)',
  '=== calcul.ts ===',
  'export const facture = (kwh: number) =>',
  '  Math.min(kwh, 150) * 85 + Math.max(0, kwh - 150) * 125 + 402',
].join('\n')

describe('EP-276 · le lecteur retire la clôture markdown', () => {
  it('⑩ UN FICHIER ENVELOPPÉ DANS ```tsx EST LU QUAND MÊME', () => {
    // MESURE DU 2026-11-01, tir b21cf508, 0,147 $ perdus : le modèle a
    // enveloppé CHACUN de ses dix-huit fichiers dans une clôture markdown.
    // Le code ne commençait plus par un import mais par trois accents
    // graves, et l'assembleur laissait react dehors — trois tours, trois
    // refus, sur un moteur qui assemblait parfaitement par ailleurs.
    const texte =
      '=== index.tsx ===\n```tsx\n' +
      "import React from 'react';\nexport const a = 1;\n" +
      '```\n=== autre.ts ===\n```\nexport const b = 2\n```'
    const lus = lireFichiers(texte)
    expect(lus.map((f) => f.chemin)).toEqual(['index.tsx', 'autre.ts'])
    expect(lus[0]!.contenu.startsWith('import React'), 'la clôture est restée').toBe(true)
    expect(lus[0]!.contenu.endsWith('export const a = 1;'), 'la fermante est restée').toBe(true)
    expect(lus[1]!.contenu).toBe('export const b = 2')
  })

  it('⑪ UN FICHIER SANS CLÔTURE N’EST PAS ABÎMÉ — contrôle négatif', () => {
    const lus = lireFichiers("=== a.ts ===\nexport const a = 1\n=== b.ts ===\nexport const b = 2")
    expect(lus.map((f) => f.contenu)).toEqual(['export const a = 1', 'export const b = 2'])
  })

  it('⑫ UN BLOC DE CODE DANS UN COMMENTAIRE NE FAIT PAS PERDRE LA FIN', () => {
    // La fermante n'est retirée que si elle clôt VRAIMENT le fichier.
    const contenu = sansClotureMarkdown('const doc = `exemple :\n```\nx\n```\n`\nexport const z = 1')
    expect(contenu.endsWith('export const z = 1')).toBe(true)
  })
})

describe('EP-276 · la boucle', () => {
  it('① DU CODE QUI TIENT PASSE AU PREMIER TOUR', async () => {
    const { appeler } = modele(BON)
    const r = await boucleEcriture({ demande: 'calcule ma facture', appeler })
    expect(r.ok, r.ok ? '' : `refusé : ${r.motif}`).toBe(true)
    expect(r.tours.length, 'un tour inutile a été payé').toBe(1)
    if (r.ok) {
      // Les 2 fichiers du modèle + les 3 de la bibliothèque injectée
      // (EP-299 : systeme/jetons, systeme/argent, systeme/ui — fournis par
      // Deribfy dans TOUTE œuvre, jamais écrits par le modèle).
      // + systeme/donnees (2026-11-12) : les calculs du tableau de bord.
      expect(r.fichiers.size).toBe(6)
      expect(r.fichiers.has('systeme/ui.tsx'), 'la bibliothèque manque à l’œuvre').toBe(true)
      expect(r.code.length, 'rien n’est assemblé').toBeGreaterThan(0)
    }
  })

  it('② UNE ERREUR DE CONSTRUCTION REPART AU MODÈLE, puis ça passe', async () => {
    const { appeler, vus } = modele('=== index.tsx ===\nconst x = {{{ ;', BON)
    const r = await boucleEcriture({ demande: 'calcule', appeler })
    expect(r.ok, 'la correction n’a pas eu lieu').toBe(true)
    expect(r.tours.length, 'le second tour n’a pas servi').toBe(2)
    // ── L'ERREUR DU COMPILATEUR EST VRAIMENT RENVOYÉE, pas reformulée.
    const second = vus[1] ?? []
    const dernier = second[second.length - 1]?.content ?? ''
    expect(dernier, 'le modèle ne reçoit pas l’erreur : il corrigera à l’aveugle').toContain(
      'La construction a échoué',
    )
    expect(dernier).toContain('TOUS les fichiers')
  })

  it('③ UN PAQUET INTERDIT EST REFUSÉ SANS ASSEMBLER — et nommé au modèle', async () => {
    // ── LE REFUS LE PLUS IMPORTANT, ET LE MOINS CHER.
    //
    // Un paquet hors liste casse le build natif à quarante minutes et fait
    // refuser une soumission. Ici il coûte une phrase. On le refuse AVANT
    // d'assembler : lire est gratuit, assembler coûte du processeur.
    const { appeler, vus } = modele(
      "=== index.tsx ===\nimport m from 'moment'\nexport const x = m()",
      BON,
    )
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.ok).toBe(true)
    const second = vus[1] ?? []
    const dernier = second[second.length - 1]?.content ?? ''
    expect(dernier, 'le paquet fautif n’est pas nommé').toContain('moment')
    expect(dernier, 'le modèle n’apprend pas ce qu’il PEUT importer').toContain('react')
  })

  it('④ DU BAVARDAGE SANS FICHIER EST REPRIS, pas accepté', async () => {
    const { appeler, vus } = modele('Bien sûr ! Voici votre application.', BON)
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.ok).toBe(true)
    const second = vus[1] ?? []
    expect(second[second.length - 1]?.content ?? '').toContain('Aucun fichier reçu')
  })

  it('⑤ LA BORNE MORD — trois tours, puis on s’arrête et on le DIT', async () => {
    // ── UNE BOUCLE SANS BORNE A DÉJÀ COÛTÉ ICI.
    //
    // C'est écrit dans le moteur actuel : « 6,87 $ brûlés, seul le garde-fou
    // du harnais a arrêté ». La borne est un cliquet, pas une espérance.
    const { appeler, vus } = modele('=== a.tsx ===\nconst x = {{{ ;')
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.ok, 'du code invalide a été accepté').toBe(false)
    expect(r.tours.length, 'la borne ne mord pas').toBe(TOURS_MAX)
    expect(vus.length, 'plus d’appels que de tours autorisés').toBe(TOURS_MAX)
    if (!r.ok) expect(r.motif).toContain('Non convergé')
  })

  it('⑥ LE JOURNAL DES TOURS DIT CE QUI S’EST PASSÉ, tour par tour', async () => {
    const { appeler } = modele('rien du tout', "=== a.tsx ===\nimport z from 'lodash'", BON)
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.tours.length).toBe(3)
    expect(r.tours[0]?.motif, 'le premier échec n’est pas expliqué').toContain('Aucun fichier')
    expect(r.tours[1]?.motif).toContain('lodash')
    expect(r.tours[2]?.ok, 'le dernier tour devait réussir').toBe(true)
    // Chaque tour porte son temps : c'est ce qui manquait au moteur actuel,
    // qui comptait les jetons et jamais les secondes.
    for (const t of r.tours) expect(typeof t.ms, 'un tour sans durée').toBe('number')
  })
})

describe('EP-276 · la consigne et la page', () => {
  it('⑨ UNE RÉPONSE COUPÉE EST NOMMÉE COUPÉE, pas fautive', async () => {
    // ── LE DÉFAUT QUI A COÛTÉ DEUX TIRS, 2026-10-19.
    //
    // Mesuré : 24 576 jetons de sortie pour trois tours — 8 192 au jeton près
    // à chaque tour, soit MA borne atteinte trois fois. Le compilateur disait
    // « Expected } but found EOF », et je relayais ce message au modèle comme
    // une faute de syntaxe. Il « corrigeait » du code qui n'était pas faux,
    // et se faisait couper au même endroit. Trois fois, pour rien.
    //
    // Un texte coupé et un texte fautif se ressemblent. Seul le fournisseur
    // sait lequel des deux il vient de rendre.
    const { appeler, vus } = modele(coupe('=== a.tsx ===\nconst x = {{{ ;'), BON)
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.ok).toBe(true)

    const dit = vus[1]?.at(-1)?.content ?? ''
    // LA CAUSE EST NOMMÉE, et le symptôme ne la masque pas.
    expect(dit, 'la coupure n’est pas nommée au modèle').toContain('coupée')
    expect(dit, 'on accuse le code alors qu’il est seulement incomplet').toContain('incomplet')
    expect(dit, 'le symptôme du compilateur masque encore la cause').not.toContain(
      'La construction a échoué',
    )

    // ── ET ON NE DEMANDE PAS LA MÊME CHOSE. C'est le cœur de la correction.
    //
    // « Corrige » n'a aucun sens pour un texte coupé : il n'y a rien à
    // corriger, il y a trop à écrire. Redemander à l'identique le ferait
    // couper exactement au même endroit.
    expect(dit, 'on redemande une correction là où il faut demander plus court').toContain(
      'COMPACTE',
    )
    expect(dit, 'le modèle va sacrifier des fonctions pour tenir').toContain('aucune ne disparaît')
  })

  it('⑩ LE TOUR GARDE QU’IL A ÉTÉ COUPÉ — sinon le journal ment', async () => {
    // Sans ce fait dans la ligne, le propriétaire relit un échec et ne peut
    // pas distinguer « le modèle écrit mal » de « ma borne l'a coupé ». C'est
    // exactement l'aveuglement qui a duré deux tirs.
    const { appeler } = modele(coupe('=== a.tsx ===\nconst x = {{{ ;'))
    const r = await boucleEcriture({ demande: 'x', appeler })
    expect(r.ok).toBe(false)
    expect(r.tours.every((t) => t.tronquee === true), 'la coupure n’est pas journalisée').toBe(true)

    // Et l'inverse : un échec ORDINAIRE ne doit pas se faire passer pour une
    // coupure, sinon on irait chercher une borne qui n'a rien fait.
    const o = await boucleEcriture({
      demande: 'x',
      appeler: modele('=== a.tsx ===\nconst x = {{{ ;').appeler,
    })
    expect(o.tours.every((t) => t.tronquee === false)).toBe(true)
  })

  it('⑦ LA CONSIGNE NOMME CE QU’ON SERT, un par un — et RIEN D’AUTRE', () => {
    // Si la liste n'est pas DANS la consigne, le modèle importe ce qu'il veut
    // et on ne fait que le refuser après — un tour payé pour rien.
    //
    // ── ET LA LISTE A CHANGÉ DE SOURCE LE 2026-11-03, pour la même raison.
    //
    // Ce contrôle exigeait les QUINZE paquets du train. Mesuré par
    // assemblage réel : 3 sont servables. Nommer les douze autres faisait
    // exactement ce que la première phrase redoute — sauf que le tour payé
    // venait de notre propre consigne, pas du choix du modèle.
    for (const p of PAQUETS_PROPOSES) {
      expect(CONSIGNE, `« ${p} » est servable et manque à la consigne`).toContain(p)
    }
    const natifs = PAQUETS_AUTORISES.filter((x) => !PAQUETS_PROPOSES.includes(x))
    expect(natifs.length, 'plus aucun paquet natif : ce contrôle ne mesure rien').toBeGreaterThan(5)
    for (const p of natifs) {
      expect(
        CONSIGNE,
        `« ${p} » est proposé au modèle et ne s’assemble pas : trois tours payés pour rien`,
      ).not.toContain(p)
    }
    // Et elle exige le travail, pas la navigation : c'est le défaut mesuré
    // sur CONTERAK, dont le bouton « Calculer » naviguait vers un formulaire.
    expect(CONSIGNE).toContain('tu écris le calcul')
    // ── L'ANCRE PRENAIT L'EXEMPLE POUR LA RÈGLE (2026-11-05).
    //
    // Elle exigeait le littéral `releve_index_precedent`. C'était
    // l'ILLUSTRATION de la règle 4, et cette illustration a dû partir :
    // privé de cahier, le modèle l'a recopiée et a produit une
    // application de relevés de compteur que personne n'avait demandée.
    //
    // Une ancre qui prend l'exemple pour preuve de la règle empêche de
    // retirer l'exemple. La propriété est : la consigne INTERDIT qu'un
    // identifiant de base paraisse dans un libellé.
    //
    // ET MON PREMIER REMPLACEMENT A REFAIT LE DÉFAUT : le motif
    // enjambait le retour à la ligne entre « identifiant de » et « base
    // de données ». Quatrième fois le même jour. Les espaces du motif
    // tolèrent donc un saut de ligne — c'est la seule forme qui mesure
    // le texte et non sa largeur.
    expect(CONSIGNE, 'rien n’interdit les noms techniques à l’écran').toMatch(
      /identifiant\s+de\s+base\s+de\s+données/u,
    )
  })

  it('⑧ LA PAGE EST AUTONOME — elle ne demande rien à personne', async () => {
    const h = pageAutonome('console.log(1)', 'Ma facture')
    expect(h).toContain('<div id="racine">')
    expect(h).toContain('Ma facture')
    // Aucune ressource distante : c'est ce qui lui permet d'être servie dans
    // un cadre isolé et publiée par le lien de partage.
    expect(h, 'la page appelle un domaine distant').not.toMatch(/https?:\/\//u)
    // Et le titre ne peut pas injecter de balise.
    expect(pageAutonome('', '<script>alert(1)</script>')).not.toContain('<script>alert')
  })
})
