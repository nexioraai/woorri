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

  it('le détail projette les 19 rubriques AFFICHÉES, plus trois colonnes nommées', async () => {
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
    ]
    const EN_PLUS = {
      reference_slug: "porte l'URL, jamais affichée comme rubrique",
      devise: 'rendue AVEC la valeur, pas comme rubrique propre',
      cree_le: 'date de publication, en tête de page, pas une rubrique',
    }
    avisTable = { data: AVIS, error: null }
    await fetchAvis(SITE.slug, AVIS.reference_slug)
    const cols = journal.projections.appels_offres_public.split(',')

    expect(RUBRIQUES).toHaveLength(19)
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

describe('cliquet structurel — surface publique des avis', () => {
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

  const code = (f: string) =>
    readFileSync(f, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const rel = (f: string) => f.replace(RACINE, 'appels-offres')

  it('les quatre fichiers de la surface sont bien vus par ce cliquet', () => {
    // LE DÉNOMINATEUR EST RÉEL. Un fichier ajouté à la surface sans entrer
    // ici échapperait à tous les contrôles qui suivent — la classe GEN-D032.
    expect(fichiers.map(rel).sort()).toEqual(
      [
        'appels-offres/fetchAvis.ts',
        'appels-offres/labels.ts',
        'appels-offres/page.tsx',
        'appels-offres/[reference]/page.tsx',
      ].sort()
    )
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

  it('les DEUX pages exposent `generateMetadata`, avec un canonical résolu', () => {
    const pages = fichiers.filter((x) => x.endsWith('page.tsx'))
    expect(pages).toHaveLength(2)
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
