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
import { boucleEcriture, CONSIGNE, pageAutonome, TOURS_MAX } from '../boucle-directe'
import { PAQUETS_AUTORISES } from '../ecriture-directe'

/** Un faux modèle : il rend les textes qu'on lui dicte, dans l'ordre. */
const modele = (...reponses: string[]) => {
  let i = 0
  const vus: { role: string; content: string }[][] = []
  const appeler = async (m: readonly { role: 'user' | 'assistant'; content: string }[]) => {
    vus.push([...m])
    return reponses[Math.min(i++, reponses.length - 1)] ?? ''
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

describe('EP-276 · la boucle', () => {
  it('① DU CODE QUI TIENT PASSE AU PREMIER TOUR', async () => {
    const { appeler } = modele(BON)
    const r = await boucleEcriture({ demande: 'calcule ma facture', appeler })
    expect(r.ok, r.ok ? '' : `refusé : ${r.motif}`).toBe(true)
    expect(r.tours.length, 'un tour inutile a été payé').toBe(1)
    if (r.ok) {
      expect(r.fichiers.size).toBe(2)
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
  it('⑦ LA CONSIGNE NOMME LES PAQUETS AUTORISÉS, un par un', () => {
    // Si la liste n'est pas DANS la consigne, le modèle importe ce qu'il veut
    // et on ne fait que le refuser après — un tour payé pour rien.
    for (const p of PAQUETS_AUTORISES) {
      expect(CONSIGNE, `« ${p} » manque à la consigne`).toContain(p)
    }
    // Et elle exige le travail, pas la navigation : c'est le défaut mesuré
    // sur CONTERAK, dont le bouton « Calculer » naviguait vers un formulaire.
    expect(CONSIGNE).toContain('tu écris le calcul')
    expect(CONSIGNE, 'rien n’interdit les noms techniques à l’écran').toContain(
      'releve_index_precedent',
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
