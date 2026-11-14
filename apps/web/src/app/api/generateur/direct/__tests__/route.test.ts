/**
 * EP-276 (suite) — LA ROUTE DE L'ÉCRITURE DIRECTE EST APPELÉE, PAS RELUE.
 *
 * EP-267 a coûté la leçon : un contrôle qui lit des MENTIONS dans la source
 * ne mesure pas un câblage. On appelle donc la poignée avec un faux modèle
 * et le double PostgREST du dépôt, et on lit ce qu'elle rend.
 *
 * ── LES TROIS PROPRIÉTÉS QUI COMPTENT ICI.
 *
 *   ① UNE SEULE PORTE : si l'interrupteur n'est pas sur `direct`, la route
 *      REFUSE. Sans ce refus, les deux architectures seraient joignables en
 *      même temps et on ne saurait plus laquelle a produit quoi.
 *   ② LA LIGNE EST ÉCRITE DANS LES DEUX CAS. Un échec non journalisé est un
 *      échec qu'on repaiera pour comprendre — défaut mesuré le 2026-10-10 :
 *      trois appels payants, une seule ligne en base.
 *   ③ LE MOTEUR EST ESTAMPILLÉ. Treize tirs ont déjà été dépensés sans
 *      pouvoir attribuer un résultat après coup.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// LE NOM DE LA TABLE VIENT DE LA CONSTANTE, jamais écrit nu : un cliquet du
// dépôt l'exige, et il a raison — un nom recopié survit au jour où la vraie
// table change, et le test passerait au vert contre du vide.
import { TABLE_GENERATIONS, TABLE_VERSIONS } from '@/lib/apps/journal'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { CONFIGS } from '@/lib/apps/fournisseur'

const { reponses, journal } = vi.hoisted(() => ({
  reponses: { texte: [] as string[], i: 0, plan: '', brouillon: '' },
  journal: { postgrest: null as unknown as { ecritures: Record<string, unknown[]> } },
}))

/** Les lignes réellement insérées, telles que le double les a vues. */
const lignesEcrites = (): Record<string, unknown>[] =>
  ((journal.postgrest?.ecritures[TABLE_GENERATIONS] ?? []) as { charge?: unknown }[]).map(
    (e) => (e.charge ?? {}) as Record<string, unknown>,
  )

vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: () => ({ ok: true, userId: 'u-1', email: 'a@b.c' }),
}))

/**
 * LE DOUBLE EST CELUI DU DÉPÔT — `lib/testing/postgrest`.
 *
 * `postgrestProjectionFidelity` plafonne les harnais permissifs, et ce
 * nombre ne peut que BAISSER. Mon premier double, écrit à la main, l'a fait
 * monter — mesuré. Le cliquet dit lui-même quoi faire : un harnais NOUVEAU
 * passe par le double du dépôt, qui honore la projection et capture tout.
 */
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom, journalVierge } = await import('@/lib/testing/postgrest')
  const j = journalVierge()
  journal.postgrest = j
  return {
    supabaseAdmin: {
      from: creerFrom(
        {
          [TABLE_GENERATIONS]: { reponse: { data: { id: 'g-1' }, error: null } },
          // LA LIVRAISON ECRIT SA VERSION : le harnais doit connaitre la
          // table, sinon il jette « table non prevue » et le test accuse la
          // route d'un defaut qui est le sien.
          [TABLE_VERSIONS]: { reponse: { data: null, error: null } },
        },
        j,
      ),
    },
  }
})

/**
 * Un faux modèle : aucun réseau, aucun centime.
 *
 * IL N'EXPOSE QUE `stream`, PAS `create` — et c'est délibéré.
 *
 * DÉFAUT MESURÉ LE 2026-10-18, au premier essai du propriétaire : le SDK
 * REFUSE un appel non-streamé dès que `max_tokens` autorise une réponse
 * pouvant dépasser dix minutes. Ma route appelait `create`. Rien n'est parti,
 * rien n'a été facturé, et rien ne pouvait marcher.
 *
 * Un double qui offrirait AUSSI `create` laisserait la route y revenir sans
 * que personne le voie. Ici, y revenir fait rougir.
 */
// ── 3c (2026-11-13) : DEUX appels par génération. Le PLAN part au modèle léger
// par `messages.create` (comme la lecture du brief) ; chaque ÉCRAN part au gros
// modèle par `messages.stream`. Le faux SDK rend le plan, puis les écrans.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: reponses.plan }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
      // V4 : la réponse se choisit par la CONSIGNE reçue (passe A, passe B), pas
      // par un rang partagé — les générations des tests voisins, dont personne
      // ne lit le flux, tournent encore et consommeraient le rang.
      stream: (args: { system: { text: string }[] }) => ({
        finalMessage: () => ({
          content: [
            { type: 'text', text: args.system[0]?.text.startsWith('Tu rédiges') === true ? reponses.brouillon : reponses.texte[Math.min(reponses.i++, reponses.texte.length - 1)] ?? '' },
          ],
          usage: { input_tokens: 1200, output_tokens: 3400 },
        }),
      }),
    }
  },
}))

import { POST } from '../route'

// V4 (2026-11-14) : le modèle ne remplit que les SLOTS d'un archétype, en deux
// passes — A, un brouillon en texte libre ; B, sa conversion en JSON strict.
// L'écran lu « facture » n'a pas de table : son archétype, déduit par règle, est
// une page de contenu (onboarding).
const BROUILLON = '### titre\nFacture SNE\n### etapes\n- Le total se lit sur votre relevé.\n### fin\naccueil\n### libelleFin\nCommencer\n'
const BON = JSON.stringify({ slots: { titre: 'Facture SNE', etapes: [{ composant: 'Phrase', texte: 'Le total se lit sur votre relevé.' }], fin: 'accueil', libelleFin: 'Commencer' } })
// 3c-2 : l'accueil est écrit par Deribfy ; l'écran du modèle s'appelle « facture », nommé par la lecture.
const PLAN = JSON.stringify({ ECRANS: [{ nom: 'facture', role: 'visiteur', navigation: 'public', lit: [], ecrit: [], extrait: '' }] })

/**
 * L'APPEL PORTE UN NOM DE PRODUIT (EP-309, 2026-11-01).
 *
 * La route le REFUSE s'il manque — aucune valeur par défaut, parce qu'un
 * défaut est précisément ce qui a produit neuf cartes « Application ». Ce
 * constructeur en donne un valide pour que les épreuves voisines mesurent ce
 * qu'elles visent ; le refus, lui, a son propre test ci-dessous.
 */
// `null` DIT « n'envoie pas de nom », et pas `undefined` : passer `undefined`
// à un paramètre à valeur par défaut RÉVEILLE le défaut. Ma première version
// croyait omettre le nom et envoyait « Facture SNE » — l'épreuve du refus
// mesurait donc un succès.
const appel = (demande = 'calcule ma facture SNE', nom: string | null = 'Facture SNE') =>
  new Request('https://deribfy.test/api/generateur/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer j' },
    body: JSON.stringify({ demande, ...(nom === null ? {} : { nom }), lectureBrief: { resultat: 'reussie', tables: 0, ecrans: ['facture'] } }),
  })

beforeEach(() => {
  reponses.brouillon = BROUILLON
  reponses.texte = [BON]
  reponses.i = 0
  reponses.plan = PLAN
  if (journal.postgrest !== null) {
    journal.postgrest.ecritures[TABLE_GENERATIONS] = []
    // LA REMISE A ZERO COUVRE TOUTES LES TABLES ECRITES : sans cette ligne,
    // les versions s'accumulaient d'un test a l'autre et le compte mesurait
    // la suite, pas le tir.
    journal.postgrest.ecritures[TABLE_VERSIONS] = []
  }
  process.env.GENERATEUR_MOTEUR = 'direct'
  process.env.ANTHROPIC_API_KEY = 'cle-de-test'
})

describe('EP-276 · la route de l’écriture directe', () => {
  it('① UNE SEULE PORTE — sur « air », cette route REFUSE', async () => {
    // ── EXIGENCE DU PROPRIÉTAIRE, 2026-10-18.
    //
    // « il faut que un soit accessible depuis interface le temps tester ce
    // qui est accessible l'autre ne doit pas etre accessible en meme temps ».
    //
    // ── CE QUI A CHANGÉ LE 2026-10-31, ET POURQUOI CE CONTRÔLE SUIT.
    //
    // La mission est intacte : une seule porte à la fois. Mais le fail-safe
    // a basculé (EP-305) : `air` est éteint depuis le 30, son dernier tir a
    // échoué, et toute la production sert `direct`. Une valeur fautive —
    // absente, vide, « DIRECT » — renvoyait la production vers le moteur
    // MORT ; elle sert désormais le vivant. Ce contrôle épingle donc ce
    // qu'il doit : seul `air` EXACT ferme cette porte, et une valeur
    // fautive ne la ferme plus. La symétrie, elle, est tenue par EP-306 ⑤,
    // qui exerce la porte d'en face.
    for (const v of ['air']) {
      process.env.GENERATEUR_MOTEUR = v
      const res = await POST(appel())
      expect(res.status, `« ${v} » laisse la porte ouverte`).toBe(409)
      expect(lignesEcrites().length, 'une ligne a été écrite alors que la route refuse').toBe(0)
    }
    // Et le fail-safe : une valeur fautive ne doit PAS fermer la porte du
    // moteur vivant — sinon une faute de casse chez l'hébergeur arrêterait
    // la production (mesuré : c'était le cas avant EP-305).
    for (const v of [undefined, '', 'DIRECT', 'dirct']) {
      if (v === undefined) delete process.env.GENERATEUR_MOTEUR
      else process.env.GENERATEUR_MOTEUR = v
      const res = await POST(appel())
      expect(res.status, `« ${String(v)} » ferme la porte du moteur vivant`).not.toBe(409)
    }
  })

  it('② UN SUCCÈS REND LA PAGE, ET ESTAMPILLE LE MOTEUR', async () => {
    const DEMANDE = 'calcule ma facture SNE — succès'
    const d = (await (await POST(appel(DEMANDE))).json()) as {
      ok: boolean
      html: string
      fichiers: number
      coutUsd: number
    }
    expect(d.ok, 'la boucle n’aboutit pas').toBe(true)
    // V4 : le moteur de rendu (4 fichiers), l'application compilée, l'entrée = 6.
    expect(d.fichiers).toBe(6)
    expect(d.html, 'la page n’est pas montable').toMatch(motifTexte('<div id="racine">'))
    // LE COÛT EST RÉEL, pas inventé : la passe A et la passe B (1200 + 3400
    // chacune) au tarif du gros modèle, le plan (100 + 50) au tarif du modèle
    // LÉGER qui l'a écrit (V4, bloc 3 — il était compté au tarif du gros).
    const c = CONFIGS.anthropic
    expect(d.coutUsd).toBeCloseTo((2 * 1200 * c.prix.pointe.entree + 2 * 3400 * c.prix.pointe.sortie + 100 * c.prixLeger.pointe.entree + 50 * c.prixLeger.pointe.sortie) / 1e6, 9)
    const l = lignesEcrites().find((x) => x.demande === DEMANDE) ?? {}
    expect(l.moteur, 'la ligne ne dit pas quel moteur l’a produite').toBe('direct')
    expect(l.statut).toBe('livree')
    expect(l.jetons_sortie).toBe(6850)
    const sa = l.sections_acquises as { ecrans?: { route: string; archetype: string; choix: string; tentativesA: number; tentativesB: number; repli: boolean; cout: number }[]; plan?: { ecrans: unknown[] }; reflexion?: number; contrat?: unknown[] }
    // La ligne porte CHAQUE écran : le socle et la page lue.
    expect(sa.ecrans?.map((e) => `${e.route}:${e.archetype}:${e.choix}`)).toEqual(['accueil:accueil:deribfy', 'compte:compte:deribfy', 'aide:pageDuCompte:deribfy', 'contact:pageDuCompte:deribfy', 'legal:pageDuCompte:deribfy', 'facture:onboarding:regle'])
    expect(sa.ecrans?.find((e) => e.route === 'facture')).toMatchObject({ tentativesA: 1, tentativesB: 1, repli: false })
    expect(sa.ecrans?.find((e) => e.route === 'facture')?.cout).toBeCloseTo((2 * 1200 * 5 + 2 * 3400 * 25) / 1e6, 9)
    expect(sa.contrat).toEqual([])
    expect(sa.plan?.ecrans).toHaveLength(2)
    expect(sa.reflexion).toBe(0)
    expect((l.sections_acquises as { plan_flash?: unknown }).plan_flash).toEqual({ entree: 100, sortie: 50, coutUsd: (100 * c.prixLeger.pointe.entree + 50 * c.prixLeger.pointe.sortie) / 1e6 })
  })

  it('③ UNE PASSE B REFUSÉE TROIS FOIS PASSE EN REPLI — journalisé avec ses refus et son coût', async () => {
    // ── DÉFAUT MESURÉ LE 2026-10-10 : trois appels payants, UNE SEULE ligne
    // en base, et le propriétaire incapable de savoir ce qu'il avait dépensé.
    // V4 : la passe B est relancée deux fois au plus ; refusée encore, Deribfy
    // écrit l'écran depuis sa table — visible, nommé, compté, et son coût aussi.
    reponses.texte = ['{ pas du json']
    // Une demande UNIQUE : la ligne se retrouve par elle, quoi qu'écrivent les tests voisins.
    const DEMANDE = 'calcule ma facture SNE — écran fautif'
    const d = (await (await POST(appel(DEMANDE))).json()) as { ok: boolean; tours: unknown[]; ecrans: { route: string; repli: boolean; tentativesA: number; tentativesB: number }[] }
    expect(d.ok, 'l’application doit être livrée, avec son écran en repli').toBe(true)
    expect(d.ecrans.find((e) => e.route === 'facture')).toMatchObject({ repli: true, tentativesA: 1, tentativesB: 3 })
    expect(d.tours.length, 'la borne de deux relances ne mord pas').toBe(4)
    // Une livraison INSÈRE la ligne puis repositionne son pointeur de version
    // (une mise à jour sur la même table) : on compte les INSERTIONS.
    const insertions = ((journal.postgrest?.ecritures[TABLE_GENERATIONS] ?? []) as { op?: string; charge?: unknown }[])
      .filter((e) => e.op === 'insert')
      .map((e) => (e.charge ?? {}) as Record<string, unknown>)
      .filter((x) => x.demande === DEMANDE)
    const l = insertions[0] ?? {}
    expect(insertions.length, 'un échec payé n’est pas journalisé').toBe(1)
    expect(l.statut).toBe('livree')
    expect(l.moteur).toBe('direct')
    expect(Number(l.cout_usd), 'un échec payé est compté à zéro').toBeGreaterThan(0)
    const fichiers = (l.document as { fichiers?: Record<string, string> } | null)?.fichiers ?? {}
    expect(Object.keys(fichiers).sort()).toEqual(['app.ts', 'index.tsx', 'rendu/base.ts', 'rendu/donnees.ts', 'rendu/moteur.tsx', 'rendu/textes-systeme.ts'])
    expect((l.diagnostics as string[]).some((x) => x.startsWith('1 écran(s) en repli') && x.endsWith(': facture')), 'le repli n’est pas dit dans la ligne').toBe(true)
  })

  it('⑤ L’APPEL EST EN FLUX — sinon le SDK refuse avant même d’envoyer', async () => {
    // ── DÉFAUT MESURÉ SUR LE PREMIER ESSAI DU PROPRIÉTAIRE, 2026-10-18.
    //
    // « Streaming is required for operations that may take longer than 10
    // minutes. » Le SDK refuse côté client : rien ne part, rien n’est
    // facturé, et l’écran montre une erreur qui n’a aucun rapport avec
    // l’architecture qu’on met à l’épreuve.
    //
    // Le moteur AIR réglait déjà ce point de son côté. Cette route l’avait
    // ignoré. Ce contrôle lit la SOURCE parce que le défaut est dans le NOM
    // de la méthode appelée — le double ne peut que le refléter, pas le dire.
    // L'APPEL A DÉMÉNAGÉ dans `fournisseur.ts` quand DeepSeek est arrivé :
    // deux dialectes, un seul endroit qui les connaît. Le contrôle suit.
    const src = readFileSync(
      join(__dirname, '..', '..', '..', '..', '..', 'lib', 'apps', 'fournisseur.ts'),
      'utf8',
    )
    const code = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    expect(code, 'l’appel n’est pas en flux : le SDK refusera avant d’envoyer').toContain(
      'client.messages.stream(',
    )
    expect(code, 'un appel non streamé subsiste').not.toContain('client.messages.create(')
  })

  it('⑤bis SANS NOM, LA ROUTE CONSTRUIT QUAND MÊME — elle a bloqué, et ça a cassé', async () => {
    // ── LA PANNE DU 2026-11-01, FIGÉE ICI POUR QU'ELLE NE REVIENNE PAS.
    //
    // J'avais rendu le nom OBLIGATOIRE « pour que le trou se voie ». Mesuré
    // sur cinq captures de production : TROIS chemins appellent `construire`
    // sans nom (le repli quand le pré-vol échoue, son `catch`, et la
    // dernière ligne d'`envoyer`). Chacun recevait 400, l'écran affichait
    // « Donnez un nom à votre application », l'utilisateur retapait, et le
    // pré-vol REPARTAIT DE LA PREMIÈRE QUESTION. Plus personne ne pouvait
    // générer.
    //
    // UNE VALIDATION QUI BLOQUE UN CHEMIN QU'ELLE NE CONTRÔLE PAS N'EST PAS
    // UN CLIQUET, C'EST UNE PANNE.
    const sansNom = (await (await POST(appel('une appli de tontine', null))).json()) as {
      ok?: boolean; error?: string
    }
    expect(sansNom.error, `la route refuse encore sans nom : ${String(sansNom.error)}`).toBeUndefined()
    expect(sansNom.ok, JSON.stringify(sansNom).slice(0, 120)).toBe(true)

  })

  it('⑤bis·2 UN REMPLISSAGE NE DEVIENT PAS UN NOM — il est ignoré, pas stocké', async () => {
    // ── DÉCOUPÉ DE ⑤bis LE 2026-11-04, et pour une raison mesurée.
    //
    // Les deux assertions vivaient dans un seul test, qui faisait donc
    // DEUX générations complètes : 1287 ms isolé, 1723 ms sous la charge
    // de la gate — au-dessus du plafond de marge (×3 sur 5 s).
    //
    // Alléger la fixture aurait retiré ce que le test prouve : il
    // exerce l'assemblage RÉEL et le juge d'exécution RÉEL à travers la
    // route, et c'est précisément ce qui a attrapé la panne du 11-01.
    // Un test ne doit pas porter deux générations ; deux tests le
    // peuvent.
    //
    // La page retombera sur `TITRE_SANS_NOM`, comme les neuf œuvres
    // d'avant.
    const remplissage = (await (await POST(appel('une appli de tontine', 'application'))).json()) as {
      ok?: boolean
    }
    expect(remplissage.ok).toBe(true)
  })

  it('⑤ter LA LIVRAISON ÉCRIT SA VERSION — sans quoi on ne peut rien annuler', async () => {
    // ── « Avant de laisser modifier, il faut pouvoir annuler. »
    //
    // MESURÉ AVANT D'ÉCRIRE LE LOT : les deux œuvres livrées par ce moteur
    // avaient ZÉRO version. `app_generation_versions` ne servait qu'au
    // pipeline AIR, et son `etat` ne porte pas les fichiers — donc rien vers
    // quoi revenir.
    // LE CORPS DOIT ETRE CONSOMME : cette route rend un FLUX QUI BAT, et
    // tant que personne ne le lit, le travail -- dont l'ecriture de la
    // version -- n'a pas lieu. Un `await POST(...)` seul mesurait zero
    // ecriture et accusait la route a tort.
    await (await POST(appel())).json()
    const versions = (journal.postgrest?.ecritures[TABLE_VERSIONS] ?? []) as {
      charge?: { rang?: number; etape?: string; etat?: { forme?: string; fichiers?: Record<string, string> } }
    }[]
    expect(versions.length, 'la livraison n’écrit aucune version').toBe(1)
    const v = versions[0].charge
    expect(v?.rang, 'la première version n’est pas le rang 1').toBe(1)
    expect(v?.etape).toBe('livraison')
    // ET ELLE PORTE LES FICHIERS. Une version qui n'en contient pas n'est
    // pas une version : c'est ce que les dix lignes du pipeline nous ont
    // appris, et c'est ce que ce cliquet empêche de refaire.
    expect(v?.etat?.forme).toBe('document')
    expect(Object.keys(v?.etat?.fichiers ?? {}).length, 'la version ne porte aucun fichier').toBeGreaterThan(0)
  })

  it('⑥ UN ÉCRAN ÉCHOUÉ GARDE TOUT CE QU’IL FAUT POUR LE COMPRENDRE', async () => {
    // ── DÉFAUT MESURÉ SUR LE PREMIER TIR DIRECT, 2026-10-18.
    //
    // 63 secondes, 4 centimes, « Non convergé en 3 tours » — et AUCUN moyen
    // de dire pourquoi. Ni l'erreur du compilateur, ni ce que le modèle avait
    // écrit. Un échec qu'on ne sait pas lire est un échec qu'on repaiera.
    // V4 : la même exigence, par passe — chaque tentative refusée garde sa
    // CLASSE et son écran, et la ligne de l'écran garde les refus d'avant le repli.
    reponses.texte = ['{ pas du json']
    const DEMANDE = 'calcule ma facture SNE — écran fautif, à comprendre'
    await (await POST(appel(DEMANDE))).json()
    const l = lignesEcrites().find((x) => x.demande === DEMANDE) ?? {}
    const sa = l.sections_acquises as {
      tours?: { passe: string; ok: boolean; motif?: string }[]
      ecrans?: { route: string; repli: boolean; refus: string[] }[]
    }
    expect(sa.tours?.map((t) => `${t.passe}:${String(t.ok)}`), 'les tentatives ne sont pas gardées').toEqual(['A:true', 'B:false', 'B:false', 'B:false'])
    // Chaque tentative refusée garde SON motif — sinon on sait qu'elle a échoué, pas pourquoi.
    for (const t of sa.tours?.filter((x) => !x.ok) ?? []) {
      expect(t.motif).toMatch(/^\[facture\] JSON_ILLISIBLE · /u)
    }
    const e = sa.ecrans?.find((x) => x.route === 'facture')
    expect(e?.repli).toBe(true)
    expect(e?.refus.length ?? 0).toBeGreaterThan(0)
    expect(e?.refus[0]).toMatch(/^JSON_ILLISIBLE · /u)
  })

  it('④ UNE DEMANDE VIDE EST REFUSÉE AVANT TOUT APPEL', async () => {
    const res = await POST(appel('   '))
    expect(res.status).toBe(400)
    expect(lignesEcrites().length).toBe(0)
  })
})
