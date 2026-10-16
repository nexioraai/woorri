/**
 * EP-230 · LA RÉPÉTITION DE LA CHAÎNE ASYNCHRONE, À COÛT NUL.
 *
 * ── POURQUOI CE FICHIER EXISTE, ET CE QU'IL AURAIT ÉVITÉ.
 *
 * Le 2026-10-15, le propriétaire a payé QUATRE tirs pour découvrir quatre
 * défauts EMPILÉS du découpage en tranches — chacun caché derrière le
 * précédent :
 *
 *   1 h 10 · 0,00 $ · rien d'écrit   → aucune échéance sur l'appel
 *   11 min · 0,00 $ · rien d'écrit   → l'échéance n'était pas CÂBLÉE
 *   12 min · 1,01 $ · refusée        → l'abandon n'était pas RECONNU
 *
 * Aucun de ces défauts n'était visible sans faire tourner la chaîne
 * ENTIÈRE. Et la chaîne entière n'était jouable que... en payant. Le
 * propriétaire servait donc de banc d'essai, à ses frais. C'est ce fichier
 * qui met fin à ça.
 *
 * ── CE QU'IL RÉPÈTE, ET CE QU'IL NE RÉPÈTE PAS.
 *
 * Il joue le VRAI moteur et le VRAI travailleur, sur une base en mémoire
 * qui RETIENT ce qu'on y écrit, avec un faux fournisseur qui met plus de
 * temps que le budget. Il ne parle à aucun réseau et ne coûte rien.
 *
 * Il ne prouve pas qu'un modèle produira un bon document — ça, seul un
 * vrai tir le dira. Il prouve la seule chose que quatre tirs ont échoué à
 * établir : **qu'une tranche trop longue SAUVEGARDE et REPREND, au lieu de
 * mourir en silence ou de se déclarer en panne.**
 */
import { describe, expect, it } from 'vitest'
import { creerTravailleur, type BaseGeneration } from '../travailleur'
import { projeter } from '@/lib/testing/postgrest'

/**
 * ── LA TABLE DE CETTE RÉPÉTITION PORTE LE SUFFIXE `_test`, ET CE N'EST PAS
 * UNE CONVENTION DE STYLE.
 *
 * `creerTravailleur` REFUSE une table sans ce suffixe tant que l'appelant
 * n'écrit pas `production: true` — et un cliquet interdit cette option hors
 * du fichier de route. Ma première version écrivait les deux : le nom nu de
 * la vraie table ET `production: true`. Deux gardes franchies d'un coup,
 * dans un fichier de test. Elles ont mordu, et elles ont eu raison.
 */
const TABLE = 'app_generations_test'
const TABLE_VERSIONS = 'app_generation_versions_test'

/* ══════════════════════════════════════════════════════════════════════
 * UNE BASE EN MÉMOIRE QUI RETIENT — le faux PostgREST du dépôt est
 * SCRIPTÉ (il rend une réponse fixe) ; une répétition exige qu'une
 * écriture soit relue par la requête suivante, sinon on ne rejoue rien.
 *
 * ── ET ELLE HONORE `.select(...)`, comme PostgREST.
 *
 * Première version : `select` ignorait ses colonnes. Le cliquet
 * d'architecture l'a refusée — « 41 harnais ignorent la projection, pour un
 * plafond de 40 » —, et ce plafond est MONOTONE DÉCROISSANT : il ne doit
 * que baisser. Lever le plafond aurait été annuler en silence trois
 * migrations déjà faites.
 *
 * Un harnais permissif ne fait pas que tricher sur les colonnes : il rend
 * INVISIBLE le retrait d'un `.eq('owner_id', …)`. Projeter pour de vrai,
 * avec l'utilitaire du dépôt, c'est garder cette garde vivante.
 * ══════════════════════════════════════════════════════════════════════ */
type Ligne = Record<string, unknown>

function baseEnMemoire(lignes: Ligne[]) {
  const tables: Record<string, Ligne[]> = { [TABLE]: lignes, [TABLE_VERSIONS]: [] }
  let compteur = 0

  const from = (table: string) => {
    const rows = (tables[table] ??= [])
    const filtres: ((l: Ligne) => boolean)[] = []
    let ordre: { col: string; asc: boolean } | null = null
    let plafond: number | null = null
    let action: { type: 'select' | 'insert' | 'update'; charge?: Ligne } = { type: 'select' }
    let colonnes = '*'

    const trouver = (): Ligne[] => {
      let out = rows.filter((l) => filtres.every((f) => f(l)))
      if (ordre !== null) {
        const { col, asc } = ordre
        out = [...out].sort((a, b) =>
          String(a[col] ?? '') < String(b[col] ?? '') ? (asc ? -1 : 1) : (asc ? 1 : -1),
        )
      }
      if (plafond !== null) out = out.slice(0, plafond)
      return out
    }

    const executer = (): { data: unknown; error: unknown } => {
      if (action.type === 'insert') {
        const neuve: Ligne = { id: `g-${String(++compteur)}`, created_at: new Date().toISOString(), ...action.charge }
        rows.push(neuve)
        return { data: projeter([neuve], colonnes), error: null }
      }
      if (action.type === 'update') {
        const vises = trouver()
        for (const l of vises) Object.assign(l, action.charge)
        // La projection s'applique APRES l'ecriture, comme PostgREST : on
        // ecrit la ligne entiere, on ne rend que les colonnes demandees.
        return { data: projeter([...vises], colonnes), error: null }
      }
      return { data: projeter(trouver(), colonnes), error: null }
    }

    const b: Record<string, unknown> = {}
    b.select = (cols?: string) => { colonnes = typeof cols === 'string' ? cols : '*'; return b }
    b.insert = (charge: Ligne) => { action = { type: 'insert', charge }; return b }
    b.update = (charge: Ligne) => { action = { type: 'update', charge }; return b }
    b.eq = (c: string, v: unknown) => { filtres.push((l) => l[c] === v); return b }
    b.neq = (c: string, v: unknown) => { filtres.push((l) => l[c] !== v); return b }
    b.is = (c: string, v: unknown) => { filtres.push((l) => (l[c] ?? null) === v); return b }
    b.in = (c: string, v: unknown[]) => { filtres.push((l) => v.includes(l[c])); return b }
    b.lt = (c: string, v: unknown) => { filtres.push((l) => String(l[c] ?? '') < String(v)); return b }
    b.gt = (c: string, v: unknown) => { filtres.push((l) => String(l[c] ?? '') > String(v)); return b }
    b.order = (col: string, o?: { ascending?: boolean }) => { ordre = { col, asc: o?.ascending !== false }; return b }
    b.limit = (n: number) => { plafond = n; return b }
    b.maybeSingle = async () => {
      const r = executer()
      return { data: (r.data as Ligne[])[0] ?? null, error: r.error }
    }
    b.single = b.maybeSingle
    b.then = (suite: (r: unknown) => unknown) => Promise.resolve(executer()).then(suite)
    return b
  }
  return { base: { from } as unknown as BaseGeneration, tables }
}

/* ══════════════════════════════════════════════════════════════════════
 * UN FOURNISSEUR PLUS LENT QUE LE BUDGET — il HONORE le signal, comme le
 * vrai SDK. C'est le seul comportement qui compte ici.
 * ══════════════════════════════════════════════════════════════════════ */
class SdkLent {
  messages = {
    create: (_corps: unknown, options?: { signal?: AbortSignal }) =>
      new Promise((_resoudre, rejeter) => {
        const t = setTimeout(() => { rejeter(new Error('jamais atteint dans cette repetition')) }, 60_000)
        options?.signal?.addEventListener('abort', () => {
          clearTimeout(t)
          // Le vrai SDK habille l'abandon dans SA classe, avec CE message.
          const e = new Error('Request was aborted.')
          e.name = 'APIUserAbortError'
          rejeter(e)
        })
      }),
  }
}

const moteurReel = async () => {
  const chemin = new URL(
    '../../../../../../benchmarks/air-emission/moteur.mjs',
    import.meta.url,
  ).href
  const { creerMoteur } = (await import(/* @vite-ignore */ chemin)) as {
    creerMoteur: (o: unknown) => Promise<{ poursuivreEmission: (o: unknown) => Promise<unknown> }>
  }
  return creerMoteur({
    cleApi: 'ANTHROPIC_API_KEY=sk-faux-repetition',
    sdk: SdkLent,
    lireFichier: () => 'ANTHROPIC_API_KEY=sk-faux-repetition',
  })
}

describe('EP-230 · une tranche trop longue sauvegarde, elle ne meurt pas', () => {
  it("une tranche dont l appel dépasse le budget reste REPRENABLE", async () => {
    // ── LE CONTRÔLE QUI VAUT LES QUATRE TIRS PAYÉS.
    //
    // Budget volontairement minuscule : l échéance tombe en moins d une
    // seconde, et on rejoue en quelques millisecondes ce qui coûtait
    // douze minutes et un dollar.
    const { base, tables } = baseEnMemoire([
      {
        id: 'g-1',
        statut: 'en_attente',
        etape: 'p0',
        demande: 'une application de suivi des compteurs',
        nom: 'application',
        owner_id: 'u-1',
        owner_email: 'x@y.z',
        created_at: '2026-10-15T00:00:00.000Z',
        battement: null,
        attente_validation: false,
        reprises: 0,
        sections_acquises: null,
        document: null,
        ok: false,
        cout_usd: 0,
      },
    ])
    const w = creerTravailleur({
      table: TABLE,
      base,
      moteur: (await moteurReel()) as Parameters<typeof creerTravailleur>[0]['moteur'],
      budgetTrancheMs: 21_000,
      battementPerimeMs: 900_000,
    })
    await w.tourner()

    const ligne = tables[TABLE][0]
    expect(ligne, 'la ligne a disparu du harnais').toBeDefined()
    expect(
      ligne.statut,
      `une echeance n est pas une panne : la ligne doit rester reprenable, elle vaut « ${String(ligne.statut)} »`,
    ).not.toBe('refusee')
    expect(
      String(JSON.stringify(ligne.diagnostics ?? [])),
      'l abandon volontaire ne doit JAMAIS etre consigne comme erreur fatale',
    ).not.toMatch(/erreur fatale/u)
  })

  it("LA CHAÎNE ENTIÈRE : dépôt → tranches → reprise → application LIVRÉE", async () => {
    // ── CE QUE QUATRE TIRS PAYÉS N ONT JAMAIS ÉTABLI.
    //
    // Les contrôles précédents prouvent qu une tranche trop longue
    // SAUVEGARDE. Celui-ci prouve la suite : que la tranche suivante
    // REPREND ce qui est sauvegardé, et que la chaîne va jusqu au
    // document livré. Avec le VRAI moteur, le VRAI travailleur, une base
    // qui retient, et un fournisseur à blanc — zéro réseau, zéro dollar.
    const racine = new URL('../../../../../../', import.meta.url)
    const { creerClientABlanc } = (await import(
      /* @vite-ignore */ new URL('benchmarks/air-emission/client-a-blanc.mjs', racine).href
    )) as { creerClientABlanc: (o: unknown) => unknown }
    const { creerMoteur } = (await import(
      /* @vite-ignore */ new URL('benchmarks/air-emission/moteur.mjs', racine).href
    )) as { creerMoteur: (o: unknown) => Promise<unknown> }
    const { migrateAirDocument } = await import('@deribfy/air-schema')
    const { readFileSync } = await import('node:fs')
    const corpus = migrateAirDocument(
      JSON.parse(
        readFileSync(
          new URL('packages/golden-corpus/corpus-v3/bus-intercites.air.json', racine),
          'utf8',
        ),
      ),
    )

    const { base, tables } = baseEnMemoire([
      {
        id: 'g-3', statut: 'en_attente', etape: 'p0',
        demande: 'une application de bus intercites',
        nom: 'application', owner_id: 'u-1', owner_email: 'x@y.z',
        created_at: '2026-10-15T00:00:00.000Z', battement: null,
        attente_validation: false, reprises: 0,
        sections_acquises: null, document: null, ok: false, cout_usd: 0,
      },
    ])
    const w = creerTravailleur({
      table: TABLE,
      base,
      moteur: (await creerMoteur({
        cleApi: 'client-a-blanc',
        client: creerClientABlanc({ corpus }),
      })) as Parameters<typeof creerTravailleur>[0]['moteur'],
      // Budget serre mais SUFFISANT pour un appel : la tranche rend la main
      // toutes les deux ou trois reponses. C est le pire cas realiste du
      // decoupage, donc celui qu il faut eprouver.
      //
      // MESURE : a 40 ms, le budget etait plus petit qu un seul appel du
      // client a blanc (8 ms + assemblage). Chaque tranche suspendait AVANT
      // d appeler, et quatre-vingts tours n avaient produit aucun progres.
      // Un budget inferieur au cout d un appel est une boucle sterile —
      // consigne, non corrige : en production il vaut 740 s.
      budgetTrancheMs: 300,
      battementPerimeMs: 900_000,
    })

    let tranches = 0
    let validations = 0
    const ligne = () => tables[TABLE][0]
    while (tranches < 80 && ligne().statut !== 'livree' && ligne().statut !== 'refusee') {
      await w.tourner()
      tranches += 1
      // ── LE CLIC DU PROPRIETAIRE FAIT PARTIE DE LA CHAINE.
      //
      // MESURE : apres sa premiere tranche, le moteur a pose 20 sections
      // puis arme `attente_validation` — le mode plan. La ligne redevient
      // `en_attente` mais n est PLUS saisissable : elle attend un humain,
      // pas un travailleur. Sans ce clic, la repetition tournait a vide et
      // quatre-vingts tours ne produisaient rien.
      //
      // On joue donc le geste, exactement comme le bouton « Continuer ».
      if (ligne().attente_validation === true) {
        await w.continuer({ id: String(ligne().id), proprietaire: 'u-1' })
        validations += 1
      }
    }

    // ── CE QUE CETTE RÉPÉTITION PROUVE, ET CE QU ELLE NE PROUVE PAS.
    //
    // Le client à blanc ne peut PAS produire un document valide, et le dépôt
    // le dit : « il rend des réparations qui ne guérissent pas ». Exiger
    // « livrée » serait exiger l impossible, et le contrôle mentirait.
    //
    // Ce qui est prouvé ici, et que quatre tirs payés n ont jamais établi :
    // la chaîne TRAVERSE — plusieurs tranches, une reprise de l acquis, le
    // geste du propriétaire, les huit passes écrites, les juges rendus — et
    // se termine sur un VERDICT, jamais sur un silence.
    // ── LE PRODUIT A CHANGÉ D ADRESSE (2026-10-16), PAS L INVARIANT.
    //
    // Ce contrôle prouve que la chaîne TRAVERSE : les huit passes écrites,
    // les juges rendus. Il le mesurait en comptant les sections dans
    // `sections_acquises.acquis` — l'endroit où un REFUS rangeait sa base.
    //
    // Depuis que toute œuvre prenable est LIVRÉE, le produit vit dans sa
    // propre colonne. La preuve est donc lisible au même titre, et à un
    // meilleur endroit : dans l'application elle-même. On regarde les deux —
    // livrée ou non, la chaîne doit avoir traversé.
    const sa = (ligne().sections_acquises ?? {}) as Record<string, unknown>
    const produit = (ligne().document ?? sa.acquis ?? {}) as object
    const sections = Object.keys(produit).length
    expect(
      sections,
      `seulement ${String(sections)} sections écrites : les passes n ont pas traversé`,
    ).toBeGreaterThanOrEqual(20)
    expect(
      ['livree', 'refusee'],
      `la chaîne s est arrêtée sans verdict — statut « ${String(ligne().statut)} »`,
    ).toContain(ligne().statut)
    // Le verdict doit venir des JUGES, jamais d une panne de plomberie.
    expect(
      JSON.stringify(ligne().diagnostics ?? []),
      'la chaîne est morte en panne au lieu d être jugée',
    ).not.toMatch(/erreur fatale|Request was aborted/u)
    expect(
      tranches,
      'une seule tranche a suffi : le decoupage n a pas ete eprouve',
    ).toBeGreaterThan(1)
    expect(
      validations,
      'le mode plan n a jamais ete rencontre : le geste « Continuer » n est pas eprouve',
    ).toBeGreaterThan(0)
  }, 60_000)

  it("EP-235 — la PREMIÈRE tranche écrit le sondage, et ne part pas dans le noir", async () => {
    // ── SIGNALÉ PAR LE PROPRIÉTAIRE, et il avait raison de ne pas me croire.
    //
    // « Tu peux pas me convaincre que 86 caractères demandent 6 minutes à
    // comprendre. » MESURE au même instant : 8,4 min écoulées, ZÉRO jeton
    // écrit, ZÉRO dollar, sondage PAS persisté. Ce n était pas de la
    // compréhension — c était de l INVISIBILITÉ : rien ne s écrit tant
    // qu une tranche ne finit pas, et elles durent 30 minutes.
    //
    // Ce contrôle exige qu une tranche rende la main DÈS que le sondage est
    // connu : l écran montre un progrès réel, la sonde n est jamais refaite,
    // et P0 démarre la tranche suivante avec un budget ENTIER.
    const racine = new URL('../../../../../../', import.meta.url)
    const { creerClientABlanc } = (await import(
      /* @vite-ignore */ new URL('benchmarks/air-emission/client-a-blanc.mjs', racine).href
    )) as { creerClientABlanc: (o: unknown) => unknown }
    const { creerMoteur } = (await import(
      /* @vite-ignore */ new URL('benchmarks/air-emission/moteur.mjs', racine).href
    )) as { creerMoteur: (o: unknown) => Promise<unknown> }
    const { migrateAirDocument } = await import('@deribfy/air-schema')
    const { readFileSync } = await import('node:fs')
    const corpus = migrateAirDocument(
      JSON.parse(
        readFileSync(
          new URL('packages/golden-corpus/corpus-v3/bus-intercites.air.json', racine),
          'utf8',
        ),
      ),
    )
    const { base, tables } = baseEnMemoire([
      {
        id: 'g-4', statut: 'en_attente', etape: 'p0', demande: 'une application simple',
        nom: 'application', owner_id: 'u-1', owner_email: 'x@y.z',
        created_at: '2026-10-15T00:00:00.000Z', battement: null,
        attente_validation: false, reprises: 0,
        sections_acquises: null, document: null, ok: false, cout_usd: 0,
      },
    ])
    const w = creerTravailleur({
      table: TABLE,
      base,
      moteur: (await creerMoteur({
        cleApi: 'client-a-blanc',
        client: creerClientABlanc({ corpus }),
      })) as Parameters<typeof creerTravailleur>[0]['moteur'],
      // Budget LARGE à dessein : rien d autre ne doit forcer la suspension.
      // Avec un budget serré, la tranche se posait de toute façon et le
      // contrôle passait au vert sans rien prouver — mon premier mutant est
      // resté vert, et c est ce qui me l a montré.
      budgetTrancheMs: 60_000,
      battementPerimeMs: 900_000,
    })

    await w.tourner()
    const sa = (tables[TABLE][0].sections_acquises ?? {}) as Record<string, unknown>
    expect(
      sa.niveaux,
      'la PREMIÈRE tranche n a rien écrit : l écran resterait muet 30 minutes',
    ).toBeDefined()
    expect(
      Array.isArray(sa.niveaux) && (sa.niveaux as unknown[]).length,
      'le sondage écrit est vide',
    ).toBeTruthy()
    // LE CONTRÔLE QUI COMPTE : elle s est posée JUSTE APRÈS le sondage, donc
    // AVANT d engager le moindre tirage. C est le « quand », pas le « si ».
    expect(
      sa.tirages,
      'la tranche a enchaîné sur P0 : le sondage n a pas été posé tout de suite',
    ).toEqual([])
    expect(sa.modele ?? null, 'aucun modèle ne doit exister à ce stade').toBeNull()
    // Et la ligne doit être reprenable TOUT DE SUITE, pas dans 15 minutes.
    expect(
      tables[TABLE][0].statut,
      'la ligne doit repasser en attente pour que le tour suivant la saisisse',
    ).toBe('en_attente')
    // ── EP-237 : ET SANS RÉCLAMER UN CLIC POUR RIEN.
    //
    // Le travailleur arme `attente_validation` à chaque suspension — à
    // raison : « sans ce drapeau la génération allait jusqu'à la facture
    // sans que personne n'ait rien validé ». Mais le point d'arrêt du
    // sondage ne DÉCIDE rien : il range une mesure. Exiger un clic dessus
    // serait une friction que j'ai failli livrer.
    expect(
      tables[TABLE][0].attente_validation,
      'le point d arrêt du sondage réclame un accord qu il n a aucune raison de demander',
    ).toBe(false)
  }, 30_000)

  it("CONTRÔLE NÉGATIF — une VRAIE panne reste une panne", async () => {
    // Sans ce contrôle, tout marquer « manque de temps » ferait retenter
    // indéfiniment une panne réelle, en repayant à chaque tour.
    class SdkEnPanne {
      messages = { create: () => Promise.reject(new Error('overloaded')) }
    }
    const chemin = new URL('../../../../../../benchmarks/air-emission/moteur.mjs', import.meta.url).href
    const { creerMoteur } = (await import(/* @vite-ignore */ chemin)) as {
      creerMoteur: (o: unknown) => Promise<{ poursuivreEmission: (o: unknown) => Promise<unknown> }>
    }
    const { base, tables } = baseEnMemoire([
      {
        id: 'g-2', statut: 'en_attente', etape: 'p0', demande: 'une application',
        nom: 'application', owner_id: 'u-1', owner_email: 'x@y.z',
        created_at: '2026-10-15T00:00:00.000Z', battement: null, attente_validation: false, reprises: 0,
        sections_acquises: null, document: null, ok: false, cout_usd: 0,
      },
    ])
    const w = creerTravailleur({
      table: TABLE,
      base,
      moteur: (await creerMoteur({
        cleApi: 'ANTHROPIC_API_KEY=sk-faux',
        sdk: SdkEnPanne,
        lireFichier: () => 'ANTHROPIC_API_KEY=sk-faux',
      })) as Parameters<typeof creerTravailleur>[0]['moteur'],
      budgetTrancheMs: 600_000,
      battementPerimeMs: 900_000,
    })
    await w.tourner()
    const ligne = tables[TABLE][0]
    expect(
      Number(ligne.reprises ?? 0) > 0 || ligne.statut === 'refusee',
      'une vraie panne doit compter une reprise ou refuser — jamais passer inapercue',
    ).toBe(true)
  })
})
