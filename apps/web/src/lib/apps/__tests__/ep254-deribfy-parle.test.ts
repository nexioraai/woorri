/**
 * EP-254 · LOT 3 — DERIBFY DIT CE QU'IL SAIT DÉJÀ.
 *
 * ── CE QUI A COMMANDÉ CE FICHIER.
 *
 * En analysant Lovable le 2026-10-16, trois phrases ont sauté aux yeux :
 * une hypothèse ASSUMÉE avec l'endroit où la changer, une limite AVOUÉE avec
 * son contournement, et l'endroit où vivent les données — non demandé, dit
 * quand même.
 *
 * Et Deribfy possédait déjà tout ça. Mesuré sur `tontine.air.json` :
 * QUATRE besoins `unexpressible`, chacun avec son motif exact, un `backend`
 * déclaré, une unité ISO sur chaque champ d'argent, 43 lignes de
 * démonstration comptées. Dans un JSON de 62 ko que personne n'ouvre.
 *
 * Le propriétaire a dépensé ~29 $ sans jamais lire une phrase de ce que le
 * moteur avait compris, supposé, ou renoncé à faire.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * ① Les quatre faits sortent du DOCUMENT, jamais d'une politesse inventée.
 * ② La note VOYAGE dans le zip — un fichier survit à la conversation.
 * ③ Un document muet rend une note honnête, pas une note rassurante.
 * ④ Aucune déduction de pays : la loi EP-201 l'interdit, et v0 vient d'en
 *    donner la démonstration en déduisant « France » du français, puis en
 *    affichant un tarif EDF à qui n'est pas en France.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { migrateAirDocument, type ProjectAir } from '@deribfy/air-schema'
import { ceQuIlFautDire, noteDeLivraison } from '../ce-que-je-dois-dire'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(
      readFileSync(join(RACINE, 'slices', 'tontine', 'tontine.air.json'), 'utf8'),
    ) as Record<string, unknown>,
  )

describe('EP-254 · ce que Deribfy sait, il le dit', () => {
  it('LES HYPOTHÈSES VIENNENT DU DOCUMENT — devise, données, identité, entrée', () => {
    const d = ceQuIlFautDire(document())
    const tout = d.hypotheses.map((h) => `${h.quoi} ${h.ou ?? ''}`).join(' | ')

    // La devise est LUE sur les champs (`unit`), jamais déduite d un pays.
    expect(tout, 'la devise n est pas dite').toMatch(/XAF/u)
    // Les données de démonstration sont COMPTÉES, pas évoquées.
    expect(tout, 'le nombre de lignes d exemple n est pas dit').toMatch(/43 lignes/u)
    // L identité visuelle est nommée — Base44 l annonce, Deribfy se taisait.
    expect(tout, 'le thème du document n est pas nommé').toMatch(/tontine_sobre/u)
    // L écran d entrée est nommé par son TITRE, pas par son identifiant.
    expect(tout, 'l écran d ouverture est donné en code machine').toMatch(
      /Mon tableau de bord/u,
    )
    expect(tout, 'un identifiant technique est montré à un humain').not.toMatch(/scr_/u)
  })

  it('AUCUN PAYS N EST DÉDUIT — la loi EP-201, et l erreur de v0', () => {
    // ── POURQUOI CE CONTRÔLE EXISTE.
    //
    // v0, observé le même jour : prompt en français → « Compteur Linky »,
    // « 0,2516 €/kWh », l euro. Il a déduit la FRANCE de la LANGUE. Pour un
    // utilisateur camerounais ou tchadien, tout est faux.
    //
    // La devise se LIT sur le champ ; le pays ne se déduit jamais.
    const d = ceQuIlFautDire(document())
    const tout = JSON.stringify(d)
    for (const mot of ['France', 'Cameroun', 'Tchad', 'Linky', 'EDF']) {
      expect(tout, `« ${mot} » a été deviné : aucun document ne le dit`).not.toContain(mot)
    }
  })

  it('CE QUI N EST PAS TENU EST DIT — statement d abord, motif ensuite', () => {
    const d = ceQuIlFautDire(document())
    expect(d.horsPortee.length, 'les besoins non tenus ont disparu').toBe(4)

    for (const h of d.horsPortee) {
      // La phrase du CAHIER se lit sans connaître le moteur.
      expect(h.quoi.length, 'une exigence vide').toBeGreaterThan(20)
      expect(h.pourquoi.length, `« ${h.quoi.slice(0, 40)} » sans motif`).toBeGreaterThan(20)
    }

    // ET LE SÉQUESTRE EN FAIT PARTIE — c est le cœur du métier de ce cahier,
    // et le moteur ne le tient pas. Le taire serait le pire des silences.
    expect(d.horsPortee.map((h) => h.quoi).join(' ')).toMatch(/séquestre/u)
  })

  it('OÙ VIVENT LES DONNÉES — répondu, jamais esquivé', () => {
    const d = ceQuIlFautDire(document())
    expect(d.donnees, 'la question est esquivée').not.toBe('')
    // Le document déclare un serveur À CONSTRUIRE : on le dit, sans
    // laisser croire qu il existe.
    expect(d.donnees, 'le serveur déclaré n est pas mentionné').toMatch(/spring_boot/u)
    expect(d.donnees, 'on laisse croire que les données sortent déjà').toMatch(
      /rien ne sort de l'appareil/u,
    )
  })

  it('LA NOTE VOYAGE — et les réserves l OUVRENT', () => {
    // Depuis le LOT 1 une application peut être livrée AVEC RÉSERVES. Les
    // taire referait le silence que le LOT 1 vient de casser.
    const note = noteDeLivraison(document(), ['DERIVATION_TRAVERSEE_ACTEUR@ecrans[x]'])
    expect(note.indexOf('réserve'), 'les réserves n ouvrent pas la note').toBeLessThan(
      note.indexOf('Ce que j’ai supposé'),
    )
    expect(note).toMatch(/DERIVATION_TRAVERSEE_ACTEUR/u)
    expect(note).toMatch(/# Tontine\.SY/u)

    // SANS RÉSERVE, aucune alarme : un avertissement toujours présent
    // n avertit plus de rien.
    const propre = noteDeLivraison(document(), [])
    expect(propre, 'une alarme s affiche alors que rien ne cloche').not.toMatch(/⚠️/u)
    expect(propre, 'le reste de la note a disparu avec l alarme').toMatch(/Où vivent vos données/u)
  })

  it('UN DOCUMENT MUET REND UNE NOTE HONNÊTE, pas une note rassurante', () => {
    // ── LE CONTRÔLE QUI EMPÊCHE D INVENTER.
    //
    // Si le document ne porte ni devise, ni données, ni besoins, ce module
    // doit SE TAIRE sur ces points. Une phrase rassurante non fondée serait
    // pire que le silence d aujourd hui : on la croirait.
    const muet = JSON.parse(JSON.stringify(document())) as ProjectAir & {
      datasets?: unknown[]
      intent?: { needs?: unknown[] }
      backend?: unknown
    }
    muet.datasets = []
    if (muet.intent !== undefined) muet.intent.needs = []
    delete muet.backend
    for (const e of muet.entities) {
      for (const f of e.fields) delete (f as { unit?: string }).unit
    }

    const d = ceQuIlFautDire(muet)
    expect(d.horsPortee, 'des besoins non tenus ont été inventés').toEqual([])
    expect(
      d.hypotheses.map((h) => h.quoi).join(' '),
      'une devise a été inventée',
    ).not.toMatch(/XAF|EUR|USD/u)
    // Mais la question des données reçoit TOUJOURS une réponse.
    expect(d.donnees, 'la question des données est restée sans réponse').toMatch(
      /ne quittent pas l'appareil/u,
    )
  })

  it('LA NOTE EST DANS LE ZIP — le branchement, pas l intention', () => {
    // Une fonction écrite et débranchée ne dit rien à personne : c est la
    // forme de défaut que ce dépôt a payée plusieurs fois.
    const route = readFileSync(
      join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'livraison', 'route.ts'),
      'utf8',
    )
    expect(route, 'la route n appelle pas la note').toMatch(/noteDeLivraison/u)
    expect(route, 'la note n est pas ajoutée au zip').toMatch(/LISEZ-MOI\.md/u)
    expect(route, 'les réserves de la ligne ne sont pas lues').toMatch(/diagnostics/u)
  })
})
