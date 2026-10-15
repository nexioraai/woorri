/**
 * ETAGE 4 — LES PREUVES DU SERVICE, A ZERO DOLLAR PAR CONSTRUCTION.
 *
 * La preuve maitresse est la DEPENSE IMPOSSIBLE : desarme (l'etat livre),
 * `tournerUneTranche` ne touche NI la base NI le moteur — compte d'appels a
 * l'appui. Meme deploye, l'etage 4 ne peut pas depenser un centime tant que
 * le proprietaire n'arme pas GO_EMISSION_IA.
 */
import { describe, expect, it } from 'vitest'
import { creerFrom, type JournalPostgrest } from '@/lib/testing/postgrest'
import { creerTravailleur, type BaseGeneration, type MoteurContinuation } from '../travailleur'
import { deposerGeneration, tournerUneTranche, etatGeneration, traduireRaison, RAISON_TECHNIQUE, RAISON_NON_ABOUTIE } from '../service-generations'

const sentinelle: MoteurContinuation = {
  poursuivreEmission: async () => {
    throw new Error('SENTINELLE: un depot ne lance JAMAIS le moteur')
  },
}

describe('deposerGeneration — un INSERT en_attente, aucun moteur', () => {
  it('la ligne nait en_attente, demande COMPLETE, et la sentinelle ne saute pas', async () => {
    const journal: JournalPostgrest = { filtres: {}, ecritures: {}, projections: {} }
    const from = creerFrom(
      { quelconque_test: { reponse: () => ({ data: [{ id: 'g-1' }], error: null }) } },
      journal,
    )
    const w = creerTravailleur({
      table: 'quelconque_test',
      base: { from } as unknown as BaseGeneration,
      moteur: sentinelle,
      budgetTrancheMs: 1,
      battementPerimeMs: 1000,
    })
    const longue = `une application ${'très '.repeat(80)}détaillée`
    const id = await deposerGeneration({ travailleur: w, demande: `  ${longue}  `, nom: 'app', email: 'a@b.c', proprietaire: 'user-1' })
    expect(id).toBe('g-1')
    const ecritures = journal.ecritures.quelconque_test ?? []
    expect(ecritures).toHaveLength(1)
    const charge = (ecritures[0] as { charge: Record<string, unknown> }).charge
    expect(charge.statut).toBe('en_attente')
    expect(charge.demande).toBe(longue) // jamais tronquee, juste ebarbee
    expect(charge.owner_email).toBe('a@b.c') // donnee d'affichage
    expect(charge.owner_id).toBe('user-1') // l'IDENTITE (dette 6a)
    expect(charge.etape).toBe('p0') // la premiere marche est VRAIE des le depot
  })

  it('une demande vide est refusee AVANT la base', async () => {
    const w = { deposer: async () => { throw new Error('NE DOIT PAS ETRE APPELE') } }
    await expect(
      deposerGeneration({ travailleur: w, demande: '   ', nom: 'x', email: null, proprietaire: 'user-1' }),
    ).rejects.toThrowError(/DEMANDE_VIDE/u)
  })
})

describe('tournerUneTranche — la garantie de depense, MECANIQUE', () => {
  it('DESARME (etat livre) : zero appel au travailleur, zero appel a quoi que ce soit', async () => {
    let appels = 0
    const travailleur = { tourner: async () => { appels += 1; return [] } }
    const r = await tournerUneTranche({ travailleur, env: {} })
    expect(r.desarme).toBe(true)
    expect(appels).toBe(0) // la preuve : rien ne part, PAR CONSTRUCTION
    const r2 = await tournerUneTranche({ travailleur, env: { GO_EMISSION_IA: '0' } })
    expect(r2.desarme).toBe(true)
    expect(appels).toBe(0)
  })

  it('ARME par le proprietaire : la tranche balaye', async () => {
    let appels = 0
    const travailleur = { tourner: async () => { appels += 1; return [] } }
    const r = await tournerUneTranche({ travailleur, env: { GO_EMISSION_IA: '1' } })
    expect(r.desarme).toBe(false)
    expect(appels).toBe(1)
  })
})

describe('etatGeneration — la lecture est au PROPRIETAIRE seul', () => {
  /** La doublure porte les DEUX lectures : la ligne (`eq.eq.maybeSingle`)
   *  et son historique (`eq.order`). `versions` par defaut vide — une
   *  generation qui n'a jamais suspendu n'a pas d'historique. */
  const baseAvec = (
    ligne: Record<string, unknown> | null,
    versions: Record<string, unknown>[] = [],
  ) => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, _v: string) => ({
          eq: (_c2: string, _v2: string) => ({
            maybeSingle: async () => ({ data: ligne, error: null }),
          }),
          order: async () => ({ data: versions, error: null }),
        }),
      }),
    }),
  })

  // ══════════════════════════════════════════════════════════════════
  // EP-226 · APRÈS UN ÉCHEC IL Y A UNE SORTIE, APRÈS UN SUCCÈS IL Y A
  // QUELQUE CHOSE À REGARDER.
  //
  // MESURE DU 2026-10-15, vérifiée contre la vraie ligne en base : une
  // génération morte en P0 n'affichait AUCUN bouton. `reprenable` faux
  // (rien d'écrit à reprendre — et c'est juste), `attendVous` faux,
  // `livree` faux, `document` nul. Zéro action possible : le propriétaire
  // était coincé, et la seule façon d'arrêter a été que j'écrive en base
  // à sa place. Personne ne doit dépendre de moi pour stopper une panne.
  //
  // Et le symétrique, plus sournois : l'aperçu ne se déclenchait que sur
  // `acquis`, écrit ENTRE deux tranches. Une génération qui aboutit sans
  // jamais se suspendre n'en écrit aucun — l'application existait, et
  // l'écran ne la montrait JAMAIS.
  // ══════════════════════════════════════════════════════════════════

  it("EP-233 — « comprise » suit le MODÈLE, jamais le vide", async () => {
    // MESURE sur la vraie ligne du 2026-10-15 à 20:51 : `attente_validation`
    // vrai, zéro section, et `modele: null`. L écran annonçait pourtant
    // « Votre demande a été comprise ». P0 n avait RIEN produit — un tirage
    // venait d être refusé par les juges.
    const sans = await etatGeneration({
      base: baseAvec({
        id: 'g-c', statut: 'en_attente', etape: 'p0', nom: 'conterak',
        cout_usd: 1.04, diagnostics: [], document: null, attente_validation: true,
        sections_acquises: { phase: 'p0', modele: null, acquis: null },
      }),
      table: 't_test', id: 'g-c', proprietaire: 'user-1',
    })
    expect(sans?.comprise, 'modele null : rien n a été compris').toBe(false)

    const avec = await etatGeneration({
      base: baseAvec({
        id: 'g-c', statut: 'en_attente', etape: 'p0', nom: 'conterak',
        cout_usd: 1.04, diagnostics: [], document: null, attente_validation: true,
        sections_acquises: { phase: 'p0', modele: { acteurs: [] }, acquis: null },
      }),
      table: 't_test', id: 'g-c', proprietaire: 'user-1',
    })
    expect(avec?.comprise, 'un modèle existe : la demande EST comprise').toBe(true)
  })

  it("EP-229 — un ARRÊT VOULU n est ni une panne, ni notre faute", async () => {
    // SIGNALÉ PAR LE PROPRIÉTAIRE, capture à l appui : il a appuyé sur
    // Arrêter, et l écran lui a répondu « La génération n a pas pu aboutir
    // cette fois. Nous avons été prévenus et regardons ce qui s est passé. »
    // Une panne racontée là où il y a eu une DÉCISION — et on ne prévient
    // personne quand quelqu un décide.
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-a', statut: 'refusee', etape: null, nom: 'conterak',
        cout_usd: 0, diagnostics: ['arret demande par le proprietaire'],
        document: null, sections_acquises: {},
      }),
      table: 't_test', id: 'g-a', proprietaire: 'user-1',
    })
    expect(e?.raison, "l écran doit dire que l arrêt vient de l humain").toMatch(/arrêté/u)
    expect(e?.raison, "et surtout PAS raconter une panne").not.toMatch(/n’a pas pu aboutir/u)
    expect(e?.notreFaute, "s accuser d une décision de l humain est un mensonge").toBe(false)
  })

  it("EP-229 — CONTRÔLE NÉGATIF : un vrai refus reste une panne de NOTRE côté", async () => {
    // Sans ce contrôle, traiter tout refus comme « voulu » ferait
    // disparaître l aveu légitime du cas précédent.
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-r', statut: 'refusee', etape: null, nom: 'conterak',
        cout_usd: 2, diagnostics: ['P0 refuse 3 fois'], document: null,
        sections_acquises: { tirages: [{ arret: 'P2', diagnostics: ['DERIVATION_CONFIRMATION_SANS_ECRITURE'] }] },
      }),
      table: 't_test', id: 'g-r', proprietaire: 'user-1',
    })
    expect(e?.notreFaute).toBe(true)
    expect(e?.raison).toMatch(/n’a pas pu aboutir/u)
  })

  it("EP-226 — une application LIVRÉE est regardable, même sans acquis", async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-l', statut: 'livree', etape: null, nom: 'conterak',
        cout_usd: 3, diagnostics: [], document: { app: { slug: 'conterak' } },
        sections_acquises: {},
      }),
      table: 't_test', id: 'g-l', proprietaire: 'user-1',
    })
    expect(
      e?.apercuVersion,
      "aucune empreinte d aperçu : l écran ne montrerait jamais l application livrée",
    ).not.toBeNull()
  })

  it("EP-226 — CONTRÔLE NÉGATIF : sans document, rien à regarder", async () => {
    // Sans ce contrôle, rendre une empreinte constante ferait croire
    // l écran qu il y a toujours quelque chose à afficher.
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-v', statut: 'refusee', etape: null, nom: 'x',
        cout_usd: 0, diagnostics: ['P0 refuse 3 fois'], document: null,
        sections_acquises: {},
      }),
      table: 't_test', id: 'g-v', proprietaire: 'user-1',
    })
    expect(e?.apercuVersion).toBeNull()
  })

  it("EP-226 — une ligne refusée reste RELANÇABLE même sans rien d acquis", async () => {
    // Le bouton « Relancer » s affiche sur le statut, pas sur `reprenable` :
    // c est toute la différence entre reprendre (ce qui est écrit) et
    // recommencer (la demande d origine). Ici `reprenable` DOIT être faux,
    // et l écran doit quand même avoir une sortie.
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-v', statut: 'refusee', etape: null, nom: 'x',
        cout_usd: 0, diagnostics: ['P0 refuse 3 fois'], document: null,
        sections_acquises: {},
      }),
      table: 't_test', id: 'g-v', proprietaire: 'user-1',
    })
    expect(e?.reprenable, 'rien n est écrit : il n y a rien à REPRENDRE').toBe(false)
    expect(e?.statut, 'mais le statut suffit à offrir une RELANCE').toBe('refusee')
  })

  // ══════════════════════════════════════════════════════════════════
  // EP-223 · UN DÉFAUT DU GÉNÉRATEUR N'EST PAS UNE INCOMPRÉHENSION.
  //
  // SIGNALÉ PAR LE PROPRIÉTAIRE, capture à l'appui (2026-10-15) : un refus
  // « P0 refuse 3 fois » s'affichait sous « Je n'ai pas compris — je ne
  // construis rien ». EP-135 classe ces codes en `faute_de_production`,
  // dont la définition dit l'inverse : l'humain n'a RIEN à répondre.
  //
  // Cause mesurée : la colonne `diagnostics` porte alors une PHRASE, que
  // `diagnosticsDepuisLigne` ne sait pas lire (regex `^[A-Z][A-Z0-9_]*$`).
  // Zéro diagnostic lu, donc zéro question, donc la branche par défaut.
  // Les VRAIS codes vivaient dans le journal des tirages, jamais relu.
  // ══════════════════════════════════════════════════════════════════

  const refusP0 = (tirages: unknown[]) => ({
    id: 'g-f', statut: 'refusee', etape: null, nom: 'conterak',
    cout_usd: 2.4386, diagnostics: ['P0 refuse 3 fois'], document: null,
    sections_acquises: { phase: 'terminee', acquis: null, modele: null, tirages },
  })

  it('EP-223 — un refus P0 est NOTRE faute, pas une incompréhension', async () => {
    const e = await etatGeneration({
      base: baseAvec(
        refusP0([{ arret: 'P2', diagnostics: ['DERIVATION_CONFIRMATION_SANS_ECRITURE'] }]),
      ),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    expect(e?.notreFaute, 'le code est classé faute_de_production : rien à demander').toBe(true)
    expect(e?.questions, 'une faute de production ne pose aucune question').toEqual([])
  })

  it('EP-223 — CONTRÔLE NÉGATIF : un refus que l humain peut trancher reste une QUESTION', async () => {
    // Sans ce contrôle, on aurait pu déclarer TOUT refus « notre faute » et
    // ne plus jamais rien demander — l'autre moitié du même mensonge.
    const e = await etatGeneration({
      base: baseAvec(refusP0([{ arret: 'P1', diagnostics: ['MODELE_DISCRIMINANT_ABSENT'] }])),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    const aDesQuestions = (e?.questions.length ?? 0) > 0
    expect(
      aDesQuestions || e?.notreFaute === true,
      'un refus doit TOUJOURS aboutir a une question ou a un aveu — jamais au silence',
    ).toBe(true)
    if (aDesQuestions) expect(e?.notreFaute).toBe(false)
  })

  it('EP-223 — un refus inclassable est NOTRE faute : fail-closed vers nous', async () => {
    const e = await etatGeneration({
      base: baseAvec(refusP0([])),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    expect(
      e?.notreFaute,
      'ne pas savoir classer n autorise pas a mettre la faute sur l humain',
    ).toBe(true)
  })

  it('EP-223 — la marche du refus est déduite de l artefact, jamais effacée', async () => {
    const sansRien = await etatGeneration({
      base: baseAvec(refusP0([])),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    expect(sansRien?.etape, 'ni modele ni acquis : le refus est en P0').toBe('p0')

    const ligne = refusP0([]) as Record<string, unknown>
    ligne.sections_acquises = { phase: 'terminee', acquis: { ecrans: {} }, modele: {}, tirages: [] }
    const avecAcquis = await etatGeneration({
      base: baseAvec(ligne),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    expect(avecAcquis?.etape, 'des sections existent : le refus n est PAS en P0').toBeNull()
  })

  it('EP-223 — l aveu ne fait fuir AUCUN code : ni entrailles, ni coût', async () => {
    const e = await etatGeneration({
      base: baseAvec(
        refusP0([{ arret: 'P2', diagnostics: ['DERIVATION_CONFIRMATION_SANS_ECRITURE'] }]),
      ),
      table: 't_test', id: 'g-f', proprietaire: 'user-1',
    })
    const paquet = JSON.stringify(e)
    expect(paquet, 'un code du moteur a fui vers l ecran').not.toMatch(/DERIVATION_/u)
    expect(paquet, 'un cout a fui vers l ecran').not.toMatch(/2\.4386/u)
    expect(paquet).not.toMatch(/P0 refuse/u)
  })

  it('le payload utilisateur est DEGRAISSE : ni cout, ni diagnostics — un devtools ne voit que ceci', async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
        cout_usd: 1.5, diagnostics: ['X@y'], document: null,
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e).toMatchObject({
      id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'depenses',
      aDocument: false, raison: null,
    })
    // la preuve par les CLES : rien d'autre ne sort — le triptyque ajoute
    // des TEMPS et des COMPTES, jamais une entraille ni un cout.
    //
    // `questions` EST UN ELARGISSEMENT DELIBERE (2026-10-11), pas un oubli.
    // Le chemin synchrone partage deja les diagnostics (EP-135) : ce que
    // l'humain seul peut trancher devient une QUESTION et part a l'ecran,
    // code compris — l'ecran doit pouvoir referencer la question a laquelle
    // il repond. Le chemin asynchrone ne savait pas poser de question : une
    // ligne refusee disait non meme quand il suffisait de demander. Les deux
    // chemins exposent desormais la MEME chose, ni plus ni moins.
    //
    // `notreFaute` EST UN SECOND ELARGISSEMENT DELIBERE (2026-10-15), et il
    // n'ouvre RIEN : c'est un booleen de CLASSEMENT, pas une entraille. Il
    // dit « l'echec vient de nous », jamais lequel ni a quel prix — les
    // codes, les chemins et le cout restent en admin. Il existe parce que
    // l'ecran accusait le proprietaire d'un refus classe
    // `faute_de_production` : « Je n'ai pas compris — je ne construis
    // rien » sur un defaut qu'il ne pouvait pas corriger.
    // `comprise` EST UN TROISIEME ELARGISSEMENT DELIBERE (2026-10-15) : un
    // booleen, derive du seul fait qui compte — P0 a-t-il produit un modele.
    // Il existe parce que l'ecran annoncait « Votre demande a été comprise »
    // sur une ligne dont `modele` valait `null`.
    expect(Object.keys(e ?? {}).sort()).toEqual([
      'aDocument', 'activiteSec', 'apercuVersion', 'attendVous', 'comprise', 'creeIl',
      'defautsRestants',
      'etape', 'id', 'nom', 'notreFaute', 'questions', 'raison', 'reprenable', 'sections',
      'statut', 'tours', 'versions',
    ])
  })

  it('le dégraissage tient : ni coût, ni diagnostics bruts, ni entrailles', async () => {
    // L'elargissement ci-dessus ne doit rien ouvrir d'autre. On le verifie
    // sur une ligne REFUSEE — le seul cas qui porte des questions, et celui
    // ou les diagnostics bruts existent vraiment en base.
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'refusee', etape: null, nom: 'x',
        cout_usd: 16.0338,
        diagnostics: ['stagnation au tour 2 : 3 → 3 diagnostic(s)', 'SCHEMA@entities[2]'],
        document: null, created_at: '2026-10-10T10:00:00.000Z', battement: null,
        sections_acquises: {},
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    const vu = JSON.stringify(e)
    expect(vu).not.toContain('16.03')
    expect(vu).not.toContain('cout')
    // Le TEXTE brut de la raison du moteur ne sort pas : il est traduit.
    expect(vu).not.toContain('stagnation au tour')
    expect(e?.questions).toEqual([])
  })

  it('le triptyque est de la TELEMETRIE pure : ecoule, battement, fraction, defauts, empreinte', async () => {
    const battement = new Date(Date.now() - 42_000).toISOString()
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'en_cours', etape: 'reparation', nom: 'x',
        cout_usd: 9.9, diagnostics: [], document: null,
        created_at: '2026-10-10T10:00:00.000Z', battement,
        sections_acquises: { phase: 'reparation', defautsRestants: 12,
          acquis: { app: 1, screens: 2, actions: 3 } },
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.creeIl).toBe('2026-10-10T10:00:00.000Z')
    expect(e?.activiteSec).toBeGreaterThanOrEqual(41)
    expect(e?.activiteSec).toBeLessThanOrEqual(45)
    expect(e?.sections).toEqual({ faites: 3, total: 22 })
    expect(e?.defautsRestants).toBe(12)
    expect(e?.apercuVersion).toMatch(/^[0-9a-f]{8}$/u)
    // entre deux tranches : battement nul → activite nulle, jamais inventee
    const e2 = await etatGeneration({
      base: baseAvec({ id: 'g-1', statut: 'en_attente', etape: 'reparation', nom: 'x',
        diagnostics: [], document: null, created_at: '2026-10-10T10:00:00.000Z',
        battement: null, sections_acquises: {} }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e2?.activiteSec).toBeNull()
    expect(e2?.sections).toEqual({ faites: 0, total: 22 })
    expect(e2?.apercuVersion).toBeNull()
  })

  it("l'erreur de CREDIT ne sort JAMAIS brute — message generique, etat du compte invisible", async () => {
    const e = await etatGeneration({
      base: baseAvec({
        id: 'g-1', statut: 'refusee', etape: null, nom: 'x', cout_usd: 25.6,
        diagnostics: ['erreur fatale (non transitoire) : 400 {"type":"error"...Your credit balance is too low...'],
        document: null,
      }),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.raison).toBe(RAISON_TECHNIQUE)
    expect(JSON.stringify(e)).not.toMatch(/credit|balance|fatale|25\.6/iu)
  })

  it('les refus de convergence donnent le message rassurant, jamais le jargon du moteur', () => {
    for (const brute of [
      'non convergé en 3 tours de convergence (0 révélation(s) non comptée(s)) : reste 4 diagnostic(s)',
      'filet anti-boucle : 9 tentatives de réparation (suspensions comprises) pour 0 tour(s) achevé(s)',
      'réparation rejetée au tour 2 — TOUTES les bouchées amputent (3/3) : blk_entree_accroche',
      'stagnation au tour 2 : 5 → 5 diagnostic(s)',
      'raison inconnue du futur',
    ]) {
      const traduite = traduireRaison(brute)
      expect(traduite).toBe(RAISON_NON_ABOUTIE)
      expect(traduite).not.toMatch(/blk_|filet|bouchée/iu)
    }
    // et les familles techniques tombent toutes sur le generique
    expect(traduireRaison('echec repete x3: Request timed out.')).toBe(RAISON_TECHNIQUE)
    expect(traduireRaison('erreur fatale (non transitoire) : facturation')).toBe(RAISON_TECHNIQUE)
  })

  it('la ligne d un autre n existe pas : null, sans distinguer « absent » de « interdit »', async () => {
    expect(await etatGeneration({ base: baseAvec(null), table: 't_test', id: 'g-1', proprietaire: 'autre-user' })).toBeNull()
  })
})

describe('L’HISTORIQUE — des métadonnées, jamais le contenu', () => {
  const baseHisto = (versions: Record<string, unknown>[]) => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, _v: string) => ({
          eq: (_c2: string, _v2: string) => ({
            maybeSingle: async () => ({
              data: { id: 'g-1', statut: 'en_attente', etape: 'p0', nom: 'x',
                diagnostics: [], document: null, created_at: '2026-10-11T10:00:00.000Z',
                battement: null, sections_acquises: {}, attente_validation: true },
              error: null,
            }),
          }),
          order: async () => ({ data: versions, error: null }),
        }),
      }),
    }),
  })

  it('rend le rang, l’étape et la date — et RIEN du contenu', async () => {
    const e = await etatGeneration({
      base: baseHisto([
        { rang: 1, etape: 'p0', cree_le: '2026-10-11T10:01:00.000Z' },
        { rang: 2, etape: 'ecrans', cree_le: '2026-10-11T10:09:00.000Z' },
      ]),
      table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.versions).toEqual([
      { rang: 1, etape: 'p0', creeIl: '2026-10-11T10:01:00.000Z' },
      { rang: 2, etape: 'ecrans', creeIl: '2026-10-11T10:09:00.000Z' },
    ])
    // Mesure : le plus gros AIR du depot pese 112 ko, et cet ecran relit
    // la surface toutes les 5 s. L'etat ne doit JAMAIS y figurer.
    expect(JSON.stringify(e)).not.toContain('etat')
  })

  it('une génération sans historique rend une liste vide, pas une absence', async () => {
    const e = await etatGeneration({
      base: baseHisto([]), table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.versions).toEqual([])
  })

  it('« elle vous attend » remonte bien à l’écran', async () => {
    const e = await etatGeneration({
      base: baseHisto([]), table: 't_test', id: 'g-1', proprietaire: 'user-1',
    })
    expect(e?.attendVous).toBe(true)
  })
})
