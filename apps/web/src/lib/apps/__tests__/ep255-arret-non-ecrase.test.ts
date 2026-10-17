/**
 * EP-255 · CLIQUET — UN ARRÊT DU PROPRIÉTAIRE NE SE FAIT PAS ÉCRASER.
 *
 * ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE.
 *
 * `arreter()` écrivait `statut: 'refusee'` et la raison de l'arrêt, puis
 * laissait `jeton_travailleur` EN PLACE sur la ligne.
 *
 * Or le travail en vol ne se tue pas — c'est écrit dans `arreter()`
 * lui-même : « on ne peut pas tuer une fonction distante ». Les écritures
 * terminales du travailleur sont clôturées par `.eq('jeton_travailleur',
 * jeton)`. Tant que le jeton reste posé, le travailleur qui revient trouve
 * sa ligne, écrit son verdict par-dessus, et l'arrêt disparaît — avec les
 * diagnostics qui le portaient, donc avec la seule trace permettant à
 * l'écran de dire « vous avez arrêté » plutôt que « ça n'a pas abouti ».
 *
 * ── CE QUE LE LOT 1 A CHANGÉ À LA GRAVITÉ.
 *
 * Avant le LOT 1, l'écrasement produisait au pire un REFUS — invisible,
 * puisque la ligne affichait déjà un refus. Depuis le LOT 1, toute œuvre
 * lisible et compilable est LIVRÉE : l'écrasement produit désormais une
 * application livrée, téléchargeable, sur une ligne que le propriétaire
 * venait explicitement d'arrêter.
 *
 * Le trou préexistait au LOT 1. Le LOT 1 en a augmenté la conséquence.
 *
 * ── CE QUI EST MESURÉ ICI, ET AVEC QUEL INSTRUMENT.
 *
 * Le double PostgREST du dépôt (`creerFrom`) refuse DÉLIBÉRÉMENT de simuler
 * le moteur de requêtes — sa doctrine, écrite dans son en-tête : « Le test
 * assert les filtres POSÉS ; c'est observable et suffisant. » On la suit,
 * plutôt que de construire un second moteur à croire.
 *
 * Deux faits observables, qui ne valent que PAIRÉS :
 *   ① l'arrêt met `jeton_travailleur` à `null` — la clôture est relâchée ;
 *   ② l'écriture terminale du travailleur clôture SUR CETTE COLONNE.
 *
 * ① sans ② ne prouverait rien (relâcher une clôture qui n'existe pas).
 * ② sans ① est le défaut lui-même. Ensemble : l'écriture du travailleur
 * touche zéro ligne, tombe dans `sortirDepossede` — qui n'écrit RIEN sur la
 * ligne et envoie le coût payé au journal des orphelins. L'arrêt tient,
 * l'argent reste compté.
 *
 * MUTATION : retirer `jeton_travailleur: null` de `arreter()` fait tomber ①.
 * Retirer `.eq('jeton_travailleur', jeton)` de l'écriture finale fait
 * tomber ②.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { migrateAirDocument } from '@deribfy/air-schema'
import { creerFrom, type JournalPostgrest } from '@/lib/testing/postgrest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'
import { RAISON_ARRET_PROPRIETAIRE } from '../journal'

/** Un vrai document : depuis le LOT 2 le travailleur COMPILE ce qu'il livre,
 *  et un jouet ne compile pas — la ligne sortirait « refusée » et l'on
 *  mesurerait autre chose que ce qu'on croit. */
const DOCUMENT_REEL = migrateAirDocument(
  JSON.parse(
    readFileSync(
      join(
        __dirname, '..', '..', '..', '..', '..', '..',
        'packages', 'golden-corpus', 'corpus-v3', 'bus-intercites.air.json',
      ),
      'utf8',
    ),
  ) as Record<string, unknown>,
)

const LIGNE = {
  id: 'ligne-arret',
  statut: 'en_attente',
  demande: 'test arret',
  created_at: new Date().toISOString(),
  sections_acquises: {},
  reprises: 0,
}

type Ecriture = { op: string; charge?: Record<string, unknown> }

/** Une base SAINE : la ligne rend ce qu'on vient d'y écrire. Rien n'est
 *  scénarisé en panne — c'est le chemin NORMAL qu'on veut mesurer. */
function baseSaine(): { base: BaseGeneration; journal: JournalPostgrest } {
  const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
  const from = creerFrom(
    {
      x_arret_test: {
        reponse: () => {
          const ecritures = (journal.ecritures.x_arret_test ?? []) as Ecriture[]
          const derniere = ecritures[ecritures.length - 1]
          // La saisie commence par LIRE les candidates : aucune écriture encore.
          if (derniere === undefined) return { data: [{ id: LIGNE.id }], error: null }
          return { data: [{ ...LIGNE, ...(derniere.charge ?? {}) }], error: null }
        },
      },
    },
    journal,
  )
  return { base: { from } as unknown as BaseGeneration, journal }
}

const moteurQuiLivre: MoteurContinuation = {
  poursuivreEmission: async () => ({
    fini: true,
    resultat: {
      ok: true,
      document: DOCUMENT_REEL,
      diagnostics: [],
      tirages: [],
      coutUsd: 0,
      jetons: { entree: 0, sortie: 0 },
    },
  }),
}

const travailleur = (base: BaseGeneration) =>
  creerTravailleur({
    table: 'x_arret_test',
    base,
    moteur: moteurQuiLivre,
    budgetTrancheMs: 10_000,
    battementPerimeMs: 90_000,
    battementRafraichiMs: 30_000,
  })

describe('EP-255 · l’arrêt du propriétaire survit au travail en vol', () => {
  it('① L’ARRÊT RELÂCHE LA CLÔTURE — `jeton_travailleur` part à null', async () => {
    const { base, journal } = baseSaine()
    const verdict = await travailleur(base).arreter({
      id: LIGNE.id,
      proprietaire: 'proprio-1',
    })
    expect(verdict, 'l’arrêt n’a pas abouti : on mesurerait une écriture absente').toBe(
      'arretee',
    )

    const ecritures = (journal.ecritures.x_arret_test ?? []) as Ecriture[]
    const arret = ecritures.find((e) => e.op === 'update')
    expect(arret, 'aucune écriture d’arrêt').not.toBeUndefined()
    const charge = arret?.charge ?? {}

    // Ce que l'arrêt a toujours écrit — on ne l'a pas perdu en corrigeant.
    expect(charge.statut).toBe('refusee')
    expect(charge.diagnostics).toEqual([RAISON_ARRET_PROPRIETAIRE])

    // LE CORRECTIF. La colonne doit être PRÉSENTE et nulle : absente, la
    // valeur précédente survit en base, et c'est exactement le défaut.
    expect(
      Object.prototype.hasOwnProperty.call(charge, 'jeton_travailleur'),
      'l’arrêt ne touche pas `jeton_travailleur` : le travailleur en vol retrouvera sa ligne',
    ).toBe(true)
    expect(charge.jeton_travailleur, '`jeton_travailleur` n’est pas relâché').toBeNull()
  })

  it('② L’ÉCRITURE TERMINALE CLÔTURE SUR CETTE MÊME COLONNE', async () => {
    const { base, journal } = baseSaine()
    const rapports = await travailleur(base).tourner()
    expect(rapports[0]?.issue, 'la tranche n’a pas livré : on ne mesure pas le bon chemin').toBe(
      'livree',
    )

    const clotures = (journal.filtres.x_arret_test ?? []).filter(
      ([op, colonne]) => op === 'eq' && colonne === 'jeton_travailleur',
    )
    expect(
      clotures.length,
      'l’écriture terminale n’est plus clôturée par le jeton : relâcher le jeton ne protège plus rien',
    ).toBeGreaterThan(0)

    // Le jeton posé par la saisie est un UUID, pas une valeur vide : clôturer
    // sur `undefined` filtrerait tout ou rien, selon PostgREST.
    expect(typeof clotures[0]?.[2], 'le jeton de clôture n’est pas une valeur').toBe('string')
  })

  it('③ AUCUNE REPRISE N’EST OUVERTE PAR CE RELÂCHEMENT', async () => {
    // ── LE CONTRÔLE QUI DIT POURQUOI LE CORRECTIF EST SÛR.
    //
    // Retirer le jeton pourrait rendre la ligne saisissable par le cron
    // suivant. Les deux saisies sont clôturées sur le STATUT —
    // `en_attente` pour une neuve, `en_cours` pour une périmée — et la
    // ligne arrêtée est `refusee`. Mesuré sur la source, parce que c'est
    // une propriété des REQUÊTES, pas d'une réponse.
    const source = readFileSync(join(__dirname, '..', 'travailleur.ts'), 'utf8')
    const saisies = source.split('\n').filter((l) => l.includes("jeton_travailleur: jeton"))
    expect(saisies.length, 'les saisies ont changé de forme — ce contrôle ne mesure plus rien').toBe(
      2,
    )
    for (const [i, l] of source.split('\n').entries()) {
      if (!l.includes('jeton_travailleur: jeton')) continue
      // La clôture de statut vit dans les lignes qui suivent immédiatement
      // l'`update` : la condition et l'écriture sont la MÊME instruction.
      const fenetre = source.split('\n').slice(i, i + 6).join('\n')
      expect(
        /\.eq\('statut', '(en_attente|en_cours)'\)/u.test(fenetre),
        `la saisie ligne ${String(i + 1)} n’est pas clôturée sur le statut`,
      ).toBe(true)
    }
  })
})
