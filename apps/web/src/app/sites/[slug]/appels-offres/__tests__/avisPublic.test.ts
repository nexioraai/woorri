import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { creerFrom, journalVierge, type ReponseTable } from '@/lib/testing/postgrest'

// ============================================================
// A2 (c) -- SURFACE PUBLIQUE DES AVIS DE MARCHE.
//
// HARNAIS FIDELE (`@/lib/testing/postgrest`) : il honore la projection comme
// PostgREST et CAPTURE les filtres. C'est indispensable ici plus qu'ailleurs --
// c'est precisement le retrait d'un `.eq('site_id', ...)` qu'il faut rendre
// observable, et un double permissif le masquerait entierement.
//
// CE QUE CE CLIQUET NE PEUT PAS GARDER, ET QUI EST GARDE AILLEURS.
// L'invariant « avis publie ET site publie ET site non archive » vit dans la
// DEFINITION DE LA VUE, pas dans ce code. Aucun test unitaire ne peut le
// prouver -- il se mesure en base, par `scripts/mesurer-appels-offres.mjs`
// (21 points, 2026-11-06). Ce fichier garde l'autre moitie : que le code ne
// contourne jamais la vue, et ne reimplemente jamais ce qu'elle porte.
// ============================================================

const journal = journalVierge()
let sitesPublic: ReponseTable = { data: null, error: null }
let avisTable: ReponseTable = { data: null, error: null }

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) =>
      creerFrom(
        {
          sites_public: { reponse: () => sitesPublic },
          appels_offres_public: { reponse: () => avisTable },
        },
        journal
      )(t),
  },
}))

import { fetchAvisIndex, fetchAvis, fetchAvisEntries } from '../fetchAvis'
import { getAvisLabels, echeanceAffichee } from '../labels'

const SITE = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  slug: 'centrale-pharmaceutique-d-achats-cpa-1793979506814',
  name: "Centrale Pharmaceutique d'Achats (CPA)",
  slogan: 'Approvisionner la santé publique au Tchad',
  about: null,
  primary_color: '#1F6B4A',
  lang: 'fr',
  custom_domain: null,
  contact: { email: 'contact@cpa.td', phone: '+235 22 51 00 00' },
}

const AVIS = {
  reference: '004/AONO/CENAME/2025',
  reference_slug: '004-aono-cename-2025',
  objet: 'Fourniture de médicaments essentiels',
  remise_le: '2026-12-01T10:00:00Z',
  etat: 'ouvert',
  description: 'Lot unique.',
  methode: "Appel d'offres national ouvert",
  methode_detail: null,
  valeur: 150000000,
  devise: 'XAF',
  questions_avant: '2026-11-20T10:00:00Z',
  ouverture_plis: '2026-12-01T11:00:00Z',
  criteres_elim: 'Agrément pharmaceutique.',
  criteres_notes: 'Prix 60 %, délai 40 %.',
  soumission: 'Dépôt physique sous pli fermé.',
  allotissement: 'Lot unique.',
  local_prix_dossier: '50 000 XAF',
  local_caution: '3 000 000 XAF',
  local_validite_jours: 90,
  canal_officiel_url: 'https://example.td/journal',
  document_url: 'https://example.td/dao.pdf',
  cree_le: '2026-11-06T10:00:00Z',
}

beforeEach(() => {
  sitesPublic = { data: SITE, error: null }
  avisTable = { data: [AVIS], error: null }
  for (const c of [journal.filtres, journal.projections, journal.ecritures]) {
    for (const k of Object.keys(c)) delete (c as Record<string, unknown>)[k]
  }
})

describe('fetchAvisIndex', () => {
  it('résout le site puis SES avis, filtrés par `site_id`', async () => {
    const r = await fetchAvisIndex(SITE.slug)
    expect(r?.avis).toHaveLength(1)
    expect(journal.filtres.appels_offres_public).toContainEqual(['eq', 'site_id', SITE.id])
  })

  it('lit la VUE, jamais la table', async () => {
    await fetchAvisIndex(SITE.slug)
    expect(Object.keys(journal.projections)).toContain('appels_offres_public')
    expect(Object.keys(journal.projections)).not.toContain('appels_offres')
  })

  it('trie par échéance la plus PROCHE, les avis sans échéance en dernier', async () => {
    await fetchAvisIndex(SITE.slug)
    const ordre = journal.filtres.appels_offres_public.filter((f) => f[0] === 'order')
    expect(ordre).toHaveLength(1)
    expect(ordre[0][1]).toBe('remise_le')
    expect(ordre[0][2]).toMatchObject({ ascending: true, nullsFirst: false })
  })

  it('la liste ne projette QUE les quatre colonnes de l’écran, plus l’adresse', async () => {
    // Loi du lot A2 ① : référence, objet, date ET heure limite, état. La
    // cinquième colonne projetée est `reference_slug`, qui n'est PAS affichée
    // -- elle porte l'URL. Toute colonne de plus serait un champ qui transite
    // sans être décidé.
    await fetchAvisIndex(SITE.slug)
    expect(journal.projections.appels_offres_public.split(',').sort()).toEqual(
      ['etat', 'objet', 'reference', 'reference_slug', 'remise_le']
    )
  })

  it('`publie` n’est JAMAIS projetée ni filtrée — la vue ne l’expose même pas', async () => {
    await fetchAvisIndex(SITE.slug)
    expect(journal.projections.appels_offres_public).not.toMatch(/\bpublie\b/)
    for (const f of journal.filtres.appels_offres_public) expect(f[1]).not.toBe('publie')
  })

  it('site absent de `sites_public` -> `null`, et AUCUNE requête d’avis', async () => {
    sitesPublic = { data: null, error: null }
    expect(await fetchAvisIndex('inconnu')).toBeNull()
    expect(journal.projections.appels_offres_public).toBeUndefined()
  })

  it('site publié sans aucun avis -> liste VIDE, jamais `null`', async () => {
    // Loi du lot A2 ③ : les comptes ne mentent pas quand ils sont à zéro.
    // Rendre `null` ferait tomber la page en 404 alors que le portail existe
    // et n'a simplement rien à publier -- deux faits très différents.
    avisTable = { data: [], error: null }
    const r = await fetchAvisIndex(SITE.slug)
    expect(r).not.toBeNull()
    expect(r?.avis).toEqual([])
  })

  it('une panne de lecture des avis ne fabrique pas un site introuvable', async () => {
    avisTable = { data: null, error: { message: 'boom' } }
    const r = await fetchAvisIndex(SITE.slug)
    expect(r?.site.id).toBe(SITE.id)
    expect(r?.avis).toEqual([])
  })

  it('le site projeté ne porte AUCUNE donnée sensible', async () => {
    await fetchAvisIndex(SITE.slug)
    const p = journal.projections.sites_public
    for (const interdit of ['owner_id', 'owner_email', 'subscription_status', 'published', 'archived_at']) {
      expect(p, interdit).not.toMatch(new RegExp(`\\b${interdit}\\b`))
    }
  })
})

describe('fetchAvis — résolution par le COUPLE (site_id, reference_slug)', () => {
  it('filtre sur `site_id` ET sur `reference_slug`, jamais sur la référence seule', async () => {
    avisTable = { data: AVIS, error: null }
    const r = await fetchAvis(SITE.slug, AVIS.reference_slug)
    expect(r?.avis.reference).toBe(AVIS.reference)
    const f = journal.filtres.appels_offres_public
    expect(f).toContainEqual(['eq', 'site_id', SITE.id])
    expect(f).toContainEqual(['eq', 'reference_slug', AVIS.reference_slug])
  })

  it('la MÊME référence chez un AUTRE acheteur ne peut pas être servie ici', async () => {
    // L'unicité en base est `(site_id, reference_slug)`. Deux acheteurs
    // publics peuvent numéroter « 001-aono-2025 » la même année ; servir
    // l'avis du mauvais acheteur est pire qu'une page absente.
    avisTable = { data: null, error: null }
    expect(await fetchAvis(SITE.slug, '001-aono-2025')).toBeNull()
    expect(journal.filtres.appels_offres_public).toContainEqual(['eq', 'site_id', SITE.id])
  })

  it('avis absent — préparation, autre site, site archivé — rend `null` INDISTINCTEMENT', async () => {
    avisTable = { data: null, error: null }
    expect(await fetchAvis(SITE.slug, AVIS.reference_slug)).toBeNull()
  })

  it('site absent -> `null`, aucune requête d’avis', async () => {
    sitesPublic = { data: null, error: null }
    expect(await fetchAvis('inconnu', AVIS.reference_slug)).toBeNull()
    expect(journal.projections.appels_offres_public).toBeUndefined()
  })

  it('le détail projette les 22 rubriques AFFICHÉES, plus quatre colonnes nommées', async () => {
    // RECTIFICATION DU 2026-11-06 — MON PREMIER ATTENDU DISAIT « 19 » ET
    // MESURAIT 22. Les dix-neuf sont les RUBRIQUES À L'ÉCRAN ; la projection
    // en porte trois de plus, et chacune a sa raison. Écrire « 19 » sans les
    // nommer aurait fait rougir un état correct — et un attendu qui ne décrit
    // pas son instrument est un faux rouge (GEN-D034, même journée).
    const RUBRIQUES = [
      'reference', 'objet', 'etat', 'description', 'methode', 'methode_detail',
      'valeur', 'remise_le', 'questions_avant', 'ouverture_plis',
      'criteres_elim', 'criteres_notes', 'soumission', 'allotissement',
      'local_prix_dossier', 'local_caution', 'local_validite_jours',
      'document_url', 'canal_officiel_url',
      // AJOUT DU 2026-11-08 (LOT 5c) — le RÉSULTAT. Ces trois rubriques ne
      // paraissent que sur un avis attribué : la base interdit leurs valeurs
      // sur tout autre état, donc elles sont `null` et la rubrique s'efface
      // d'elle-même. Un portail qui annonce « Attribué » sans dire à qui,
      // c'est de l'opacité avec l'apparence de la transparence.
      'attributaire', 'montant_attribue', 'attribue_le',
    ]
    const EN_PLUS = {
      reference_slug: "porte l'URL, jamais affichée comme rubrique",
      devise: 'rendue AVEC la valeur, pas comme rubrique propre',
      cree_le: 'date de publication, en tête de page, pas une rubrique',
      // AJOUT DU 2026-11-08 (LOT 5b) — `pieces` n'est PAS une vingtième
      // rubrique : elle est rendue DANS la rubrique `document_url`, qui
      // cesse d'être un lien pour devenir le dossier de consultation.
      // `document_url` reste projetée et affichée — des avis ne portent
      // qu'elle, et la retirer aurait cassé ce qui marche.
      pieces: 'le dossier de consultation, rendu DANS la rubrique document_url',
    }
    avisTable = { data: AVIS, error: null }
    await fetchAvis(SITE.slug, AVIS.reference_slug)
    const cols = journal.projections.appels_offres_public.split(',')

    expect(RUBRIQUES).toHaveLength(22)
    expect(cols.sort()).toEqual([...RUBRIQUES, ...Object.keys(EN_PLUS)].sort())
    expect(cols).not.toContain('publie')
  })
})

describe('fetchAvisEntries — surfaces dérivées', () => {
  it('même vue, même filtre `site_id` : un sitemap ne peut pas annoncer ce que la page refuse', async () => {
    await fetchAvisEntries(SITE.id)
    expect(journal.filtres.appels_offres_public).toContainEqual(['eq', 'site_id', SITE.id])
    expect(Object.keys(journal.projections)).not.toContain('appels_offres')
  })
})

// ============================================================
// LA SURFACE, ÉNUMÉRÉE UNE SEULE FOIS.
//
// Ces trois outils vivaient DANS le `describe` structurel. Les blocs ajoutés
// ensuite ne les voyaient pas, et la réponse facile aurait été de les
// recopier — donc d'avoir DEUX dénominateurs. Deux énumérations de la même
// surface finissent par diverger, et c'est celle qu'on ne regarde pas qui
// laisse passer le fichier non gardé. Un seul balayage, partagé.
// ============================================================
const RACINE = join(__dirname, '..')
const fichiers: string[] = []
;(function walk(d: string) {
  for (const e of readdirSync(d)) {
    const f = join(d, e)
    if (statSync(f).isDirectory()) {
      if (e !== '__tests__') walk(f)
    } else if (/\.tsx?$/.test(e)) fichiers.push(f)
  }
})(RACINE)

/** Le code SANS ses commentaires : une règle citée dans une explication n'est
 *  pas une règle appliquée. */
const code = (f: string) =>
  readFileSync(f, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const rel = (f: string) => f.replace(RACINE, 'appels-offres')

describe('cliquet structurel — surface publique des avis', () => {

  it('les HUIT fichiers de la surface sont bien vus par ce cliquet', () => {
    // LE DÉNOMINATEUR EST RÉEL. Un fichier ajouté à la surface sans entrer
    // ici échapperait à tous les contrôles qui suivent — la classe GEN-D032.
    // `cycleDeVie.ts` est entré le 2026-11-06 (lot A2 b) : ce cliquet a rougi
    // le jour même, et c'est exactement ce qu'on lui demande.
    expect(fichiers.map(rel).sort()).toEqual(
      [
        'appels-offres/cycleDeVie.ts',
        'appels-offres/fetchAvis.ts',
        // Entré le 2026-11-08 (lot 5) : le filtre des avis. Il se décide sur
        // l'état VISIBLE, pas sur la colonne — et ce cliquet a rougi le jour
        // même, comme pour `cycleDeVie.ts`. C'est ce qu'on lui demande.
        'appels-offres/filtrerAvis.ts',
        // Entrés le 2026-11-08 (lot 5d) — l'archive des consultations closes.
        // `archiver.ts` décide la coupure, `archive/page.tsx` la sert. Les
        // deux entrent ici le jour même : un fichier de la surface qui
        // n'y figure pas échappe à TOUS les contrôles qui suivent.
        'appels-offres/archive/page.tsx',
        'appels-offres/archiver.ts',
        'appels-offres/labels.ts',
        'appels-offres/page.tsx',
        'appels-offres/[reference]/page.tsx',
      ].sort()
    )
  })

  it('l’état affiché est DÉRIVÉ, jamais lu brut sur les deux pages', () => {
    // `libelleEtat(avis.etat, …)` afficherait « Ouvert » sur un avis échu —
    // une invitation à déposer une offre qui sera rejetée.
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).toMatch(/etatVisible\(/)
      expect(code(f), rel(f)).not.toMatch(/libelleEtat\(\s*(a|avis)\.etat/)
    }
  })

  it('l’heure est lue UNE SEULE FOIS par rendu', () => {
    // Deux `new Date()` dans le même rendu peuvent tomber de part et d'autre
    // d'une échéance : une ligne dirait « Ouvert » pendant que le tri la
    // classerait close. Un écran qui se contredit lui-même est pire qu'un
    // écran en retard.
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      const n = (code(f).match(/new Date\(\)/g) ?? []).length
      expect(n, `${rel(f)} : ${n} lectures d'horloge`).toBeLessThanOrEqual(1)
    }
  })

  it('la TABLE `appels_offres` n’est JAMAIS interrogée — seule la VUE l’est', () => {
    for (const f of fichiers) {
      expect(code(f), rel(f)).not.toMatch(/\.from\(\s*['"`]appels_offres['"`]\s*\)/)
    }
  })

  it('AUCUN `supabaseAdmin` — la surface publique lit sous la clé anon', () => {
    for (const f of fichiers) expect(code(f), rel(f)).not.toMatch(/supabaseAdmin/)
  })

  it('AUCUN `export const revalidate` — un cache partagé entre locataires', () => {
    for (const f of fichiers) expect(code(f), rel(f)).not.toMatch(/export\s+const\s+revalidate/)
  })

  it('AUCUN `dangerouslySetInnerHTML` sur la surface publique', () => {
    for (const f of fichiers) expect(code(f), rel(f)).not.toMatch(/dangerouslySetInnerHTML/)
  })

  it('aucune page ne réimplémente la visibilité — elle vit dans la vue', () => {
    // Un `.eq('publie', true)` ici serait une SECONDE autorité sur le même
    // invariant. Deux autorités divergent toujours, et celle qu'on lit n'est
    // jamais celle qui décide.
    // LA BORNE PORTE SUR L'IDENTIFIANT CITÉ, PAS SUR LE MOT.
    // Premier jet : /archived_at|\bpublished\b/. Il rougissait sur
    // `labels.ts`, dont la copie anglaise dit « No tender notice is currently
    // published. » — une PHRASE, pas une colonne. Un cliquet qui interdit un
    // mot de la langue au lieu d'un appel au schéma interdit d'écrire
    // correctement, et finit par être désarmé ou contourné.
    for (const f of fichiers) {
      expect(code(f), rel(f)).not.toMatch(/['"`](publie|published|archived_at)['"`]/)
    }
  })

  it('les liens passent par `resolveSiteBaseUrl` — jamais un chemin plateforme en dur', () => {
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).toMatch(/resolveSiteBaseUrl/)
      expect(code(f), rel(f)).not.toMatch(/['"`]\/sites\//)
    }
  })

  it('les TROIS pages exposent `generateMetadata`, avec un canonical résolu', () => {
    const pages = fichiers.filter((x) => x.endsWith('page.tsx'))
    expect(pages).toHaveLength(3)
    for (const f of pages) {
      expect(code(f), rel(f)).toMatch(/export\s+async\s+function\s+generateMetadata/)
      expect(code(f), rel(f)).toMatch(/alternates:\s*\{\s*canonical/)
      expect(code(f), rel(f)).not.toMatch(/NEXT_PUBLIC_SITE_URL/)
    }
  })

  it('le JSON-LD ne déclare JAMAIS un avis de marché en produit en vente', () => {
    // schema.org ne modélise pas l'avis de marché. Lui attribuer `Product`
    // ou `Offer` dirait aux moteurs qu'un marché public est un article en
    // vente — un portail d'État ne se déclare pas en boutique faute de
    // vocabulaire.
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).not.toMatch(/['"`]@type['"`]\s*:\s*['"`](Product|Offer|AggregateOffer)['"`]/)
    }
  })

  it('la liste affiche QUATRE en-têtes de colonne, et pas un de plus', () => {
    const liste = code(fichiers.find((f) => f.endsWith('appels-offres/page.tsx'))!)
    const m = liste.match(/\[t\.colReference,\s*t\.colObjet,\s*t\.colRemise,\s*t\.colEtat\]/)
    expect(m, 'les quatre colonnes de la loi A2 ①, dans cet ordre').toBeTruthy()
    expect(liste).not.toMatch(/t\.col(?!Reference|Objet|Remise|Etat)[A-Z]/)
  })

  it('l’échéance est rendue avec l’HEURE, jamais par la fonction date du blog', () => {
    // Un soumissionnaire qui dépose à 15 h sur une échéance fixée à 10 h perd
    // son marché. `formatDate` du blog ne rend que la date.
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).not.toMatch(/\bformatDate\b(?!Heure)/)
    }
    const l = code(fichiers.find((f) => f.endsWith('labels.ts'))!)
    expect(l).toMatch(/hour:\s*['"]2-digit['"]/)
    expect(l).toMatch(/minute:\s*['"]2-digit['"]/)
    expect(l, 'une heure limite sans fuseau est ambiguë de plusieurs heures').toMatch(/timeZoneName/)
  })
})


// ============================================================
// A2 (b) — LE CYCLE DE VIE VISIBLE.
//
// `maintenant` EST INJECTÉ DANS CHAQUE CAS. Un test qui lirait l'horloge
// passerait aujourd'hui et rougirait en décembre, et personne ne saurait
// pourquoi — un cliquet dont le verdict dépend du jour n'est pas un cliquet.
// ============================================================
import { etatVisible, estEnCours, estPrevisionnel, partager } from '../cycleDeVie'

const T = (iso: string) => new Date(iso)
const MAINTENANT = T('2026-11-06T12:00:00Z')

describe('etatVisible — ce que la base stocke n’est pas ce que l’écran dit', () => {
  it('`ouvert` dont l’échéance est PASSÉE devient `clos`', () => {
    expect(etatVisible({ etat: 'ouvert', remise_le: '2026-11-06T11:59:59Z' }, MAINTENANT)).toBe('clos')
  })

  it('`ouvert` dont l’échéance est À VENIR reste `ouvert`', () => {
    expect(etatVisible({ etat: 'ouvert', remise_le: '2026-11-06T12:00:01Z' }, MAINTENANT)).toBe('ouvert')
  })

  it('l’échéance À LA SECONDE PRÈS ferme — on ne dépose plus à l’heure dite', () => {
    expect(etatVisible({ etat: 'ouvert', remise_le: '2026-11-06T12:00:00Z' }, MAINTENANT)).toBe('clos')
  })

  it('`ouvert` SANS échéance reste `ouvert` — absence ≠ dépassement', () => {
    // Fermer un avis que l'acheteur a laissé ouvert exprès serait inventer
    // une échéance qu'il n'a pas posée.
    expect(etatVisible({ etat: 'ouvert', remise_le: null }, MAINTENANT)).toBe('ouvert')
  })

  it('une DATE ILLISIBLE ne ferme pas — « rien pu lire » ≠ « c’est passé »', () => {
    expect(etatVisible({ etat: 'ouvert', remise_le: 'pas-une-date' }, MAINTENANT)).toBe('ouvert')
  })

  it('`attribue` reste `attribue`, échéance passée ou non', () => {
    expect(etatVisible({ etat: 'attribue', remise_le: '2020-01-01T00:00:00Z' }, MAINTENANT)).toBe('attribue')
    expect(etatVisible({ etat: 'attribue', remise_le: '2099-01-01T00:00:00Z' }, MAINTENANT)).toBe('attribue')
  })

  it('`preparation` ne « clôture » pas — on n’annonce pas la fin de ce qui n’a pas commencé', () => {
    expect(etatVisible({ etat: 'preparation', remise_le: '2020-01-01T00:00:00Z' }, MAINTENANT)).toBe('preparation')
  })

  it('un état INCONNU se rend tel quel, au lieu d’être avalé', () => {
    // Si la base gagnait un quatrième état, l'écran le montrerait.
    expect(etatVisible({ etat: 'annule', remise_le: null }, MAINTENANT)).toBe('annule')
  })

  it('AUCUN état visible ne manque à `labels` — dans les QUATRE langues', () => {
    for (const lang of ['fr', 'en', 'es', 'ar']) {
      for (const e of ['preparation', 'ouvert', 'clos', 'attribue']) {
        const l = getAvisLabels(lang).etats[e]
        expect(l, `${lang}/${e}`).toBeTruthy()
        expect(l, `${lang}/${e} : la valeur brute fuit à l’écran`).not.toBe(e)
      }
    }
  })
})

describe('partager — deux sections, deux ordres opposés', () => {
  const A = { reference_slug: 'a', etat: 'ouvert', remise_le: '2026-12-01T10:00:00Z' }
  const B = { reference_slug: 'b', etat: 'ouvert', remise_le: '2026-11-20T10:00:00Z' }
  const C = { reference_slug: 'c', etat: 'ouvert', remise_le: '2026-10-01T10:00:00Z' } // échu
  const D = { reference_slug: 'd', etat: 'attribue', remise_le: '2026-09-01T10:00:00Z' }
  const E = { reference_slug: 'e', etat: 'ouvert', remise_le: null }

  it('les échus et les attribués quittent « en cours »', () => {
    const { enCours, clotures } = partager([A, B, C, D, E], MAINTENANT)
    expect(enCours.map((x) => x.reference_slug)).toEqual(['b', 'a', 'e'])
    expect(clotures.map((x) => x.reference_slug)).toEqual(['c', 'd'])
  })

  it('en cours : échéance la plus PROCHE d’abord', () => {
    expect(partager([A, B], MAINTENANT).enCours.map((x) => x.reference_slug)).toEqual(['b', 'a'])
  })

  it('clôturés : échéance la plus RÉCENTE d’abord', () => {
    expect(partager([C, D], MAINTENANT).clotures.map((x) => x.reference_slug)).toEqual(['c', 'd'])
  })

  it('les avis SANS échéance ferment leur groupe — une absence ne se classe pas', () => {
    expect(partager([E, B], MAINTENANT).enCours.map((x) => x.reference_slug)).toEqual(['b', 'e'])
  })

  it('AUCUN avis n’est perdu entre les deux groupes', () => {
    // Un avis qui disparaîtrait du partage disparaîtrait de la page, sans
    // erreur et sans trace. Le compte doit être conservé.
    const tous = [A, B, C, D, E]
    const { enCours, clotures } = partager(tous, MAINTENANT)
    expect(enCours.length + clotures.length).toBe(tous.length)
    expect([...enCours, ...clotures].map((x) => x.reference_slug).sort())
      .toEqual(tous.map((x) => x.reference_slug).sort())
  })

  it('`estEnCours` et `partager` ne peuvent pas diverger', () => {
    const { enCours, clotures } = partager([A, B, C, D, E], MAINTENANT)
    for (const x of enCours) expect(estEnCours(etatVisible(x, MAINTENANT)), x.reference_slug).toBe(true)
    for (const x of clotures) expect(estEnCours(etatVisible(x, MAINTENANT)), x.reference_slug).toBe(false)
  })
})


// ============================================================
// A2 (b1) — ARBITRAGE B : `publie` EST LE SEUL INTERRUPTEUR.
//
// Mesuré sur la vue déployée le 2026-11-06 : les trois états avec
// `publie = true` sont VISIBLES. La vue ne filtre que `publie`. Le
// propriétaire a tranché B — annoncer un marché à venir est l'étape
// `planning` d'OCDS, et ce n'est pas à la plateforme de décider ce qu'un
// acheteur public a le droit de publier.
//
// B N'EST BON QU'À DEUX CONDITIONS, et ce bloc les garde.
// ============================================================
describe('b1 ② — la date d’un avis en préparation n’est PAS une échéance', () => {
  it('`preparation` est prévisionnel, et lui seul', () => {
    expect(estPrevisionnel('preparation')).toBe(true)
    for (const e of ['ouvert', 'clos', 'attribue', 'annule']) {
      expect(estPrevisionnel(e), e).toBe(false)
    }
  })

  it('une seule autorité : `estPrevisionnel` suit `etatVisible`, jamais `avis.etat`', () => {
    // Un avis STOCKÉ `ouvert` et échu est `clos` à l'écran — donc PAS
    // prévisionnel. Brancher la marque sur l'état brut la poserait au mauvais
    // endroit, et c'est le genre d'écart qu'on ne voit qu'en production.
    const echu = { etat: 'ouvert', remise_le: '2026-10-01T10:00:00Z' }
    expect(estPrevisionnel(etatVisible(echu, MAINTENANT))).toBe(false)
    const prep = { etat: 'preparation', remise_le: '2026-10-01T10:00:00Z' }
    expect(estPrevisionnel(etatVisible(prep, MAINTENANT))).toBe(true)
  })

  // ── LA RÈGLE SE TIENT PAR SON COMPORTEMENT, PLUS PAR SA PRÉSENCE ──
  //
  // La version précédente de ce bloc vérifiait que `t.previsionnel` FIGURE
  // dans le fichier de la liste. MESURÉ le 2026-11-06 : muter le rendu en
  // `{false && <span>{t.previsionnel}</span>}` laissait les 49 tests VERTS —
  // le texte restait, le marqueur disparaissait de l'écran. Une ancre de
  // forme qui ne couvre pas la perte qu'elle prétend garder.
  //
  // La règle vit désormais dans `echeanceAffichee`, et ces cas la tiennent.

  it('une date d’avis EN PRÉPARATION porte la marque', () => {
    const r = echeanceAffichee('2026-12-01T10:00:00Z', 'preparation', 'fr')
    expect(r?.previsionnelle).toBe(true)
    expect(r?.marque).toBe(getAvisLabels('fr').previsionnel)
  })

  it('une date d’avis OUVERT, CLOS ou ATTRIBUÉ ne la porte pas', () => {
    for (const e of ['ouvert', 'clos', 'attribue']) {
      const r = echeanceAffichee('2026-12-01T10:00:00Z', e, 'fr')
      expect(r?.previsionnelle, e).toBe(false)
      expect(r?.marque, e).toBeNull()
    }
  })

  it('sans date → `null`, jamais une chaîne vide ni « — »', () => {
    // L'écran décide comment rendre une absence ; cette fonction ne la
    // maquille pas en date vide.
    expect(echeanceAffichee(null, 'preparation', 'fr')).toBeNull()
    expect(echeanceAffichee('pas-une-date', 'ouvert', 'fr')).toBeNull()
  })

  it('la marque existe et diffère dans les QUATRE langues', () => {
    for (const lang of ['fr', 'en', 'es', 'ar']) {
      const r = echeanceAffichee('2026-12-01T10:00:00Z', 'preparation', lang)
      expect(r?.marque, lang).toBeTruthy()
      expect(r?.texte, lang).toBeTruthy()
    }
  })

  // ── CE QUE CE CLIQUET NE PEUT PAS GARDER, ET QUI L'EST AILLEURS ──
  //
  // MESURÉ le 2026-11-06 : muter le JSX de la liste en
  // `{false && <span>{ech.marque}</span>}` laisse ces 53 tests VERTS. La
  // règle est juste, la fonction la rend, et l'écran ne l'affiche pas.
  //
  // Aucun test lisant le SOURCE ne peut distinguer `{ech.marque && …}` de
  // `{false && …}` autrement que par une ancre de forme — c'est-à-dire par
  // la chose même qui vient de nous tromper. La frontière est ici : ce
  // fichier garde la RÈGLE, la sonde d'écran garde le RENDU.
  //
  // `scripts/prouver-ecran-appels-offres.mjs` pose un témoin `preparation`
  // et exige la marque DANS LE HTML SERVI. C'est le seul instrument qui voit
  // cette dernière marche, et il est versionné avec cette note.

  it('les DEUX surfaces passent par la fonction, aucune ne réimplémente', () => {
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).toMatch(/echeanceAffichee\(/)
      // `formatDateHeure` en direct dans une page recréerait une seconde
      // autorité sur l'affichage d'une échéance.
      expect(code(f), rel(f)).not.toMatch(/formatDateHeure\(\s*a\.remise_le/)
    }
    // Et sur le détail, le LIBELLÉ change : « Date et heure limite de remise »
    // est faux sur un avis non ouvert, un suffixe ne suffirait pas.
    const detail = code(fichiers.find((f) => f.endsWith('[reference]/page.tsx'))!)
    expect(detail).toMatch(/t\.rRemisePrevue/)
  })

  it('b1 ① — le détail DIT qu’aucune offre n’est encore recevable', () => {
    const detail = code(fichiers.find((f) => f.endsWith('[reference]/page.tsx'))!)
    expect(detail, 'condition non négociable du propriétaire').toMatch(/t\.pasEncoreRecevable/)
  })

  it('les trois intitulés existent dans les QUATRE langues, et disent quelque chose', () => {
    for (const lang of ['fr', 'en', 'es', 'ar']) {
      const l = getAvisLabels(lang)
      for (const [cle, v] of [['previsionnel', l.previsionnel], ['pasEncoreRecevable', l.pasEncoreRecevable], ['rRemisePrevue', l.rRemisePrevue]] as const) {
        expect(v, `${lang}/${cle}`).toBeTruthy()
        expect(v.length, `${lang}/${cle} trop court pour informer`).toBeGreaterThan(3)
      }
      // Le libellé prévisionnel ne doit PAS être celui de l'échéance ferme :
      // deux significations opposées sous les mêmes mots, c'est le défaut.
      expect(l.rRemisePrevue, lang).not.toBe(l.r.remise_le)
    }
  })

  it('AUCUNE surface ne décide elle-même qu’une date est ferme', () => {
    // Un `etat === 'preparation'` écrit dans une page serait une SECONDE
    // autorité. Deux autorités divergent toujours.
    for (const f of fichiers.filter((x) => x.endsWith('page.tsx'))) {
      expect(code(f), rel(f)).not.toMatch(/['"`]preparation['"`]/)
    }
  })
})
