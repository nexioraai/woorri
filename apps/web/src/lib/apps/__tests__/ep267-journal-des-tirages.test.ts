/**
 * EP-267 · LE JOURNAL D'UNE GÉNÉRATION ATTEINT CELUI QUI PAIE.
 *
 * ── LE DÉFAUT, MESURÉ.
 *
 * Le moteur persiste le détail de chaque tirage depuis le 2026-10-15 :
 * tentative, arrêt, coût, diagnostics, chemins, et les RÉPARATIONS qu'il a
 * faites lui-même. `etatGeneration` le LIT dans `sections_acquises.tirages` —
 * et ne le rend pas. L'écran de suivi montre cinq marches, une fraction, un
 * compteur.
 *
 * Le propriétaire a regardé 53 minutes de génération à 16,03 $ sans savoir ce
 * qui se passait, alors que le moteur l'écrivait.
 *
 * SIXIÈME « machine posée, débranchée » de ce chantier. La forme est toujours
 * la même et c'est toujours le dernier maillon.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * ① le brut du moteur ne traverse JAMAIS — ni code, ni chemin de validateur ;
 * ② un arrêt inconnu est TU, pas deviné ;
 * ③ les réparations du moteur arrivent telles qu'il les a écrites ;
 * ④ le coût est sommé, et `null` ne devient pas « 0,00 $ » ;
 * ⑤ et le journal est RENDU par l'état, pas seulement traduit.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { journalDesTirages, resumeDuJournal } from '../journal-tirages'

/** Un tirage tel que le moteur l'écrit — forme lue dans `moteur.mjs`. */
const TIRAGE_REFUSE = {
  tentative: 1,
  arret: 'P2',
  coutUsd: 0.1234,
  diagnostics: ['DERIVATION_IDENTITE_SANS_SOURCE', 'DERIVATION_CONFIRMATION_SANS_ECRITURE'],
  details: ['parcours.p_soin.etapes[2] : une identité élue doit atteindre son consommateur'],
  reparations: ['« lire soin » posé juste après « choisir soin » (étape 3)'],
}
const TIRAGE_ACCEPTE = {
  tentative: 2,
  arret: 'passe',
  coutUsd: 0.2,
  diagnostics: [],
  details: [],
  reparations: [],
}

describe('EP-267 · le journal des tirages', () => {
  it('① LE BRUT DU MOTEUR NE TRAVERSE JAMAIS', () => {
    const lignes = journalDesTirages([TIRAGE_REFUSE, TIRAGE_ACCEPTE])
    const tout = JSON.stringify(lignes)
    // Les CODES sont de l'outillage, pas une information pour qui attend son
    // application. Seul leur NOMBRE sort — l'ampleur sans le jargon.
    expect(tout, 'un code du moteur atteint l’écran').not.toContain('DERIVATION_')
    // Les CHEMINS du validateur localisent un défaut dans un document ; ils
    // n'apprennent rien à celui qui paie, et ils restent en base où un
    // diagnostic les trouve.
    expect(tout, 'un chemin de validateur atteint l’écran').not.toContain('parcours.')
    expect(tout, 'les détails bruts atteignent l’écran').not.toContain('etapes[')
    // ET L'AMPLEUR EST DITE.
    expect(lignes[0]?.points, 'le nombre de points n’est pas dit').toBe(2)
  })

  it('② UN ARRÊT INCONNU EST TU, PAS DEVINÉ', () => {
    // ── POURQUOI SE TAIRE VAUT MIEUX QU'UNE PHRASE GÉNÉRIQUE.
    //
    // Le dépôt a déjà payé cette leçon : « Réessayez dans un moment »
    // s'affichait sur un solde épuisé, et le propriétaire pouvait cliquer dix
    // fois pour rien. Une phrase fabriquée sur un code qu'on ne connaît pas
    // donne l'impression qu'on sait.
    const lignes = journalDesTirages([{ ...TIRAGE_REFUSE, arret: 'P9_INCONNU' }])
    expect(lignes, 'un arrêt inconnu produit une ligne inventée').toEqual([])
    // Et une forme qui n'est pas un objet ne fait pas tomber la traduction :
    // un journal corrompu ne doit pas emporter l'écran de suivi avec lui.
    expect(journalDesTirages([null, 42, 'x', TIRAGE_ACCEPTE]).length).toBe(1)
    expect(journalDesTirages(undefined)).toEqual([])
  })

  it('③ LES RÉPARATIONS DU MOTEUR ARRIVENT TELLES QU’IL LES A ÉCRITES', () => {
    // Elles sont DÉJÀ en français — le moteur les compose dans
    // `reparation-parcours.mjs`. Les reformuler serait réécrire ce qu'il a
    // fait, donc risquer de le dire faux. C'est aussi ce qui rend ce lot
    // petit : la matière la plus parlante était déjà prête.
    const lignes = journalDesTirages([TIRAGE_REFUSE])
    expect(lignes[0]?.reparations, 'la réparation n’est pas transmise').toEqual([
      '« lire soin » posé juste après « choisir soin » (étape 3)',
    ])
  })

  it('④ LE COÛT EST DIT — décision du propriétaire, et par la bonne porte', () => {
    // ── CE CONTRÔLE A CHANGÉ DE SENS DEUX FOIS EN UN JOUR, ET C'EST NORMAL.
    //
    // ① J'avais mis le coût par essai. Le cliquet du DÉGRAISSAGE l'a refusé —
    //    « des TEMPS et des COMPTES, jamais une entraille ni un coût » — et
    //    j'ai RETIRÉ plutôt que de contourner, puis posé la question.
    // ② Le propriétaire a tranché : « oui je veux voir et il faut mettre dans
    //    admin si c possible » (2026-10-18).
    //
    // La règle est donc réécrite par celui à qui elle appartient. La différence
    // entre les deux chemins n'est pas le résultat — c'est QUI décide.
    const lignes = journalDesTirages([TIRAGE_REFUSE, TIRAGE_ACCEPTE])
    expect(lignes[0]?.coutUsd, 'le coût de l’essai n’est pas dit').toBeCloseTo(0.1234, 4)
    expect(lignes[1]?.coutUsd, 'le coût de l’essai n’est pas dit').toBeCloseTo(0.2, 4)
    // UN COÛT INCONNU NE DEVIENT PAS ZÉRO : « 0,00 $ » se lit comme gratuit.
    expect(
      journalDesTirages([{ ...TIRAGE_ACCEPTE, coutUsd: undefined }])[0]?.coutUsd,
      'un coût inconnu est présenté comme zéro',
    ).toBeNull()

    // ── ET LE RÉSUMÉ NE SOMME PAS LES ESSAIS, DÉLIBÉRÉMENT.
    //
    // Les tirages ne portent que le coût de la passe P0 ; une génération paie
    // aussi ses tours de réparation. Une somme serait toujours INFÉRIEURE au
    // vrai total et se lirait comme le total. Le vrai montant vient de la
    // colonne `cout_usd`, et il voyage à part.
    const r = resumeDuJournal(lignes)
    expect(r.tirages).toBe(2)
    expect(JSON.stringify(r), 'le résumé fabrique un total par addition').not.toContain('cout')
  })

  it('⑤ L’ÉTAT REND VRAIMENT LE JOURNAL — mesuré, pas lu dans la source', async () => {
    // ── CE CONTRÔLE A ÉTÉ RÉÉCRIT APRÈS AVOIR SURVÉCU À SA MUTATION.
    //
    // Sa première forme cherchait le mot `journalDesTirages` dans la source du
    // service. Mesuré : remplacer `journal: journalDesTirages(sa.tirages)` par
    // `journal: []` le laissait VERT — l'import, lui, restait. Un contrôle qui
    // lit des mentions ne mesure pas un câblage.
    //
    // C'est la troisième fois du jour. On APPELLE donc le service, avec le
    // double PostgREST du dépôt, et on lit ce qu'il rend.
    const { creerFrom } = await import('@/lib/testing/postgrest')
    const { etatGeneration } = await import('../service-generations')
    // Le double exige les TROIS registres : filtres, projections, écritures.
    const journal = { filtres: {}, projections: {}, ecritures: {} }
    const LIGNE = {
      id: 'gen-1',
      statut: 'refusee',
      etape: 'p0',
      nom: 'Essai',
      diagnostics: ['P0 refuse 3 fois'],
      document: null,
      created_at: new Date(0).toISOString(),
      battement: null,
      sections_acquises: { phase: 'terminee', tirages: [TIRAGE_REFUSE, TIRAGE_ACCEPTE] },
      cout_usd: 0.32,
      jetons_entree: 10,
      jetons_sortie: 20,
      attente_validation: false,
    }
    const base = {
      from: creerFrom(
        {
          // `maybeSingle` attend un OBJET, pas un tableau : le double rend ce
          // que le stub donne, projeté. J avais passé `[LIGNE]`, et
          // `sections_acquises` était donc `undefined` — journal vide pour une
          // raison qui n était pas le défaut mesuré.
          gen: { reponse: () => ({ data: LIGNE, error: null }) },
          app_generation_versions: { reponse: () => ({ data: [], error: null }) },
        },
        journal,
      ),
    }
    const etat = await etatGeneration({
      base: base as unknown as Parameters<typeof etatGeneration>[0]['base'],
      table: 'gen',
      id: 'gen-1',
      proprietaire: 'u-1',
    })
    expect(etat, 'le service ne rend aucun état').not.toBeNull()
    expect(
      etat?.journal.length,
      'l’état ne porte pas le journal : `tirages` reste lu en base et jamais ' +
        'rendu — le défaut exact qu’on répare',
    ).toBe(2)
    expect(etat?.journal[0]?.quoi, 'l’arrêt n’est pas traduit').toBe(
      'Le plan des écrans n’était pas cohérent',
    )
    // ET LE BRUT NE SORT TOUJOURS PAS PAR CE CHEMIN-LÀ.
    expect(JSON.stringify(etat?.journal), 'un code traverse l’état').not.toContain('DERIVATION_')
    // ── LE COÛT RÉEL VIENT DE LA COLONNE, PAS D'UNE SOMME.
    //
    // La ligne porte `cout_usd: 0.32` ; les deux tirages valent 0,1234 et 0,2,
    // soit 0,3234. Exiger 0,32 prouve qu'on rend la COLONNE — le montant que
    // le moteur a réellement dépensé, tours de réparation compris — et non une
    // addition qui serait toujours trop basse.
    expect(etat?.coutUsd, 'le coût réel de la génération n’est pas rendu').toBeCloseTo(0.32, 4)
  })

  it('⑥ L’ÉCRAN AFFICHE LE JOURNAL — le dernier maillon, exigé nommément', () => {
    // ── POURQUOI UNE LECTURE DE SOURCE ICI, ET POURQUOI ELLE EST PRÉCISE.
    //
    // L'écran est du JSX dans une page Next : le monter demanderait un
    // navigateur, que ce dépôt refuse d'exiger pour une propriété de câblage.
    // On lit donc la source — mais on exige l'ÉLÉMENT, pas le mot.
    //
    // Mesuré : ma première forme cherchait `/journal/` n'importe où. Retirer
    // l'élément `<JournalGeneration …/>` la laissait verte, parce que l'import
    // subsistait. On exige l'élément ET que le journal lui soit passé.
    const ecran = readFileSync(
      join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    expect(
      ecran,
      'l’écran de suivi ne rend pas le journal : il resterait rendu par l’API ' +
        'et invisible — le défaut déplacé d’un étage, pas fermé',
    ).toContain('<JournalGeneration')
    const i = ecran.indexOf('<JournalGeneration')
    const zone = ecran.slice(i, ecran.indexOf('/>', i))
    // ── ON EXIGE LA PROP NOMMÉMENT, ET C'EST UNE CORRECTION.
    //
    // Première forme : « la zone contient `etatGen?.journal` ». Mesuré en
    // remplaçant `lignes={etatGen?.journal ?? []}` par `lignes={[]}` : le
    // contrôle restait VERT, parce que l'autre prop (`resume=`) mentionne la
    // même expression. Chercher une expression quelque part dans une zone, ce
    // n'est pas vérifier qu'elle alimente la bonne entrée.
    expect(
      zone,
      'les lignes du panneau ne viennent pas de l’état : le journal serait rendu ' +
        'par l’API, passé au composant, et affiché vide',
    ).toMatch(/lignes=\{etatGen\?\.journal/u)
    expect(zone, 'le résumé ne vient pas de l’état').toMatch(/resume=\{resumeDuJournal\(etatGen\?\.journal/u)
    expect(
      zone,
      'le coût n’est pas passé au panneau : le propriétaire a demandé à le voir',
    ).toMatch(/coutUsd=\{etatGen\?\.coutUsd/u)
  })

  it('⑦ L’ADMIN AFFICHE LE DÉTAIL PAR TIRAGE — pas seulement le compte', () => {
    // ── LE MÊME DÉFAUT, UN ÉTAGE PLUS HAUT.
    //
    // `api/admin/applications/route.ts` renvoie `journal: sections_acquises.tirages`
    // DEPUIS LE DÉBUT — chaque essai avec son arrêt, son coût, ses codes, ses
    // chemins et ses réparations. La page n'affichait que le COMPTE.
    //
    // « 3 » ne dit ni ce que ces trois essais ont coûté, ni pourquoi ils ont
    // échoué. Et le commentaire de `travailleur.ts` le dit : sans le chemin,
    // diagnostiquer un refus exigeait de RE-PAYER un tir entier.
    //
    // ICI LE BRUT EST LÉGITIME : l'admin est l'endroit où les codes vivent.
    // C'est l'écran du propriétaire qui les traduit, pas celui-ci.
    const api = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'admin', 'applications', 'route.ts'),
      'utf8',
    )
    expect(api, 'l’API admin ne renvoie plus le journal').toContain('journal:')
    const page = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'admin', 'applications', 'page.tsx'),
      'utf8',
    )
    expect(
      page,
      'l’admin n’affiche pas le journal que son API renvoie : la donnée est là ' +
        'et personne ne la regarde',
    ).toMatch(/l\.journal/u)
    for (const champ of ['arret', 'coutUsd', 'details', 'reparations']) {
      expect(page, `l’admin n’affiche pas \`${champ}\` de chaque tirage`).toContain(`t.${champ}`)
    }
  })
})
