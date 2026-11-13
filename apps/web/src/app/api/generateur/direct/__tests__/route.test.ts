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

const { reponses, journal } = vi.hoisted(() => ({
  reponses: { texte: [] as string[], i: 0, plan: '' },
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
      stream: () => ({
        finalMessage: () => ({
          content: [
            { type: 'text', text: reponses.texte[Math.min(reponses.i++, reponses.texte.length - 1)] ?? '' },
          ],
          usage: { input_tokens: 1200, output_tokens: 3400 },
        }),
      }),
    }
  },
}))

import { POST } from '../route'

// 3c : le modèle n'écrit qu'un ÉCRAN par appel ; sans lecture ni table dans la
// demande, le plan ne tient qu'un accueil. Le calcul de la facture y vit.
const BON = [
  '=== ecrans/accueil.tsx ===',
  "import React from 'react'",
  "import type { Session } from '../systeme/types'",
  'const facture = (k: number) => Math.min(k,150)*85 + Math.max(0,k-150)*125 + 402',
  'export default function Ecran(_p: { session: Session }) {',
  '  return <section><h1>Facture SNE</h1><p>Total pour 159 kWh : {facture(159)}</p></section>',
  '}',
].join('\n')
const PLAN = JSON.stringify({ ECRANS: [{ nom: 'accueil', role: 'visiteur', navigation: 'public', lit: [], ecrit: [], extrait: '' }] })

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
    body: JSON.stringify({ demande, ...(nom === null ? {} : { nom }) }),
  })

beforeEach(() => {
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
    // 3c : 1 écran du modèle + le squelette de Deribfy (index, 5 modules
    // systeme, PERIMETRE.md) + 4 de la bibliothèque injectée (EP-299) = 12.
    expect(d.fichiers).toBe(12)
    expect(d.html, 'la page n’est pas montable').toContain('<div id="racine">')
    // LE COÛT EST RÉEL, pas inventé : le plan (100 + 50) et l'écran (1200 +
    // 3400) aux tarifs du fournisseur. S'il tombait à zéro, personne ne
    // verrait la dépense.
    expect(d.coutUsd).toBeCloseTo(((1200 + 100) * 5 + (3400 + 50) * 25) / 1e6, 6)
    const l = lignesEcrites().find((x) => x.demande === DEMANDE) ?? {}
    expect(l.moteur, 'la ligne ne dit pas quel moteur l’a produite').toBe('direct')
    expect(l.statut).toBe('livree')
    expect(l.jetons_sortie).toBe(3450)
    const sa = l.sections_acquises as { ecrans?: { slug: string; resultat: string }[]; plan?: { ecrans: unknown[] }; reflexion?: number }
    expect(sa.ecrans?.map((e) => `${e.slug}:${e.resultat}`)).toEqual(['accueil:ok'])
    expect(sa.plan?.ecrans).toHaveLength(1)
    expect(sa.reflexion).toBe(0)
  })

  it('③ UN ÉCRAN ÉCHOUÉ DEUX FOIS EST LIVRÉ « À COMPLÉTER » — journalisé avec ses reproches et son coût', async () => {
    // ── DÉFAUT MESURÉ LE 2026-10-10 : trois appels payants, UNE SEULE ligne
    // en base, et le propriétaire incapable de savoir ce qu'il avait dépensé.
    // 3c : plus de « Non convergé » ni de règle du dernier tour. L'écran qui
    // échoue deux fois sort visible, nommé, compté — et ce qu'il a coûté aussi.
    reponses.texte = ['=== ecrans/accueil.tsx ===\nconst x = {{{ ;']
    // Une demande UNIQUE : la ligne se retrouve par elle, quoi qu'écrivent les tests voisins.
    const DEMANDE = 'calcule ma facture SNE — écran fautif'
    const d = (await (await POST(appel(DEMANDE))).json()) as { ok: boolean; tours: unknown[]; ecrans: { nom: string; resultat: string; tentatives: number }[] }
    expect(d.ok, 'l’application doit être livrée, avec son écran à compléter').toBe(true)
    expect(d.ecrans).toEqual([{ nom: 'accueil', resultat: 'a_completer', tentatives: 2 }])
    expect(d.tours.length, 'la borne de deux tentatives ne mord pas').toBe(2)
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
    expect(fichiers['ecrans/accueil.tsx'], 'l’écran échoué doit être livré « à compléter », pas muet').toContain('À compléter : accueil')
    expect(fichiers['PERIMETRE.md']).toContain('Écrans livrés : 0 / 1.')
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
    // 3c : la même exigence, par écran — chaque tentative garde son motif, et
    // le brut du dernier essai est conservé dans la ligne.
    reponses.texte = ['=== ecrans/accueil.tsx ===\nconst x = {{{ ;']
    const DEMANDE = 'calcule ma facture SNE — écran fautif, à comprendre'
    await (await POST(appel(DEMANDE))).json()
    const l = lignesEcrites().find((x) => x.demande === DEMANDE) ?? {}
    const sa = l.sections_acquises as {
      tours?: { ok: boolean; motif?: string }[]
      ecrans?: { resultat: string; reproches: string[]; dernierTexte: string | null; tentatives: number }[]
    }
    expect(sa.tours?.length, 'les tentatives ne sont pas gardées').toBe(2)
    expect(sa.tours?.every((t) => !t.ok && typeof t.motif === 'string' && t.motif.length > 0)).toBe(true)
    // Chaque tentative garde SON motif — sinon on sait qu'il a échoué deux fois, pas pourquoi.
    expect(sa.tours?.[0]?.motif).toMatch(/\[accueil\]/u)
    expect(sa.tours?.[0]?.motif).toMatch(/export default function Ecran|construction a échoué/u)
    const e = sa.ecrans?.[0]
    expect(e?.resultat).toBe('a_completer')
    expect(e?.reproches.length ?? 0).toBeGreaterThan(0)
    expect(
      e?.dernierTexte,
      'le brut du dernier essai est perdu : impossible de dire si le modèle ' +
        'écrit mal ou si le lecteur lit mal',
    ).toContain('{{{')
  })

  it('④ UNE DEMANDE VIDE EST REFUSÉE AVANT TOUT APPEL', async () => {
    const res = await POST(appel('   '))
    expect(res.status).toBe(400)
    expect(lignesEcrites().length).toBe(0)
  })
})
