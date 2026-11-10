import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUPPORTED_LANGUAGE_CODES } from '@/lib/i18n/supportedLanguages';
import { creerFrom, journalVierge } from '@/lib/testing/postgrest';

// ============================================================
// CHANTIER 8 (MODE 1) — LE SITEMAP : MESURE, PAS SUPPOSITION.
//
// Le chantier nommait trois surfaces i18n. Deux en portaient réellement une :
// le panier et `llms.txt`. LE SITEMAP, NON — et c'est un CONSTAT MESURÉ,
// pas une omission :
//
//   * il n'émet que des URL, des dates, des `changefreq` et des `priority` —
//     aucun texte en langue naturelle, donc rien à traduire ;
//   * `hreflang` ne s'appliquerait pas : il déclare des ALTERNATIVES d'une
//     même page en plusieurs langues. Un site Woorri porte UNE langue et UNE
//     URL. Émettre `hreflang` ici déclarerait aux moteurs des variantes qui
//     n'existent pas — une affirmation fausse, pire que rien.
//
// Ce fichier ne corrige donc rien : il VERROUILLE le constat. Si un jour un
// intitulé en langue naturelle entre dans ce sitemap, ces tests échouent —
// exactement ce qui manquait à `llms.txt`, où onze intitulés français ont pu
// s'installer sans que rien ne le signale.
//
// C'est aussi la PREMIÈRE couverture de cette route (préfixe vitest ajouté).
// ============================================================

let siteRow: Record<string, unknown> | null;

vi.mock('@/app/sites/[slug]/themes/shared', () => ({
  fetchSite: async () => siteRow,
  resolveSiteBaseUrl: () => 'https://yiaglobalcommodities.com',
  WOORRI_SITE_URL: 'https://www.deribfy.com',
}));

// LOT BLOG 8 -- le blog est desormais annonce par cette surface. Elle importe
// donc `fetchBlogEntries`, qui charge le client anon au chargement du module.
// Ce double le neutralise ET permet d'asserter ce qui est annonce.
let articlesBlog: { slug: string; title: string; published_at: string | null; updated_at: string | null }[] = [];
// LOT 18 -- le plan lit aussi les pages déclarées, les avis et le catalogue.
// Harnais fidèle à PostgREST (`creerFrom`) : la projection est honorée.
let pagesDeclarees: { chemin: string; maj_le: string | null }[] = [];
let avisPublies: { reference_slug: string; objet: string; cree_le: string | null }[] = [];
let catalogue: { reference: string; maj_le: string | null }[] = [];
const journal = journalVierge();
vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => creerFrom({
  site_pages_public: { reponse: () => ({ data: pagesDeclarees, error: null }) },
}, journal)(t) } }));
vi.mock('@/app/sites/[slug]/appels-offres/fetchAvis', () => ({ fetchAvisEntries: async () => avisPublies }));
vi.mock('@/app/sites/[slug]/catalogue/fetchCatalogue', () => ({ fetchCatalogue: async () => catalogue }));
vi.mock('@/app/sites/[slug]/blog/fetchPosts', () => ({ fetchBlogEntries: async () => articlesBlog }));

vi.mock('@/lib/anomaly', () => ({ logAnomaly: vi.fn() }));

function site(over: Record<string, unknown> = {}) {
  return {
    id: 'site-1', slug: 'yia', name: 'YIA Global Commodities', mode: 1,
    created_at: '2026-01-15T00:00:00.000Z', lang: 'en', products: [],
    ...over,
  };
}

async function xml() {
  const { GET } = await import('../route');
  const res = await GET(new Request('https://yiaglobalcommodities.com/sitemap.xml'), {
    params: Promise.resolve({ slug: 'yia' }),
  });
  return { statut: res.status, texte: await res.text(), type: res.headers.get('Content-Type') };
}

beforeEach(() => { siteRow = site(); pagesDeclarees = []; avisPublies = []; catalogue = []; });

describe('CHANTIER 8 — 🔒 CLIQUET : le sitemap est INVARIANT par la langue', () => {
  it('les quatre langues produisent un XML RIGOUREUSEMENT identique', async () => {
    const rendus = new Set<string>();
    for (const lang of SUPPORTED_LANGUAGE_CODES) {
      siteRow = site({ lang });
      rendus.add((await xml()).texte);
    }
    expect(rendus.size, 'le sitemap dépend de la langue — il ne devrait pas').toBe(1);
  });

  it('une langue absente ou inconnue ne change rien non plus', async () => {
    siteRow = site({ lang: 'en' });
    const reference = (await xml()).texte;
    for (const lang of [null, undefined, '', 'de', 'fr-FR', 42]) {
      siteRow = site({ lang });
      expect((await xml()).texte, String(lang)).toBe(reference);
    }
  });

  it('🔴 AUCUN texte en langue naturelle n’est émis', async () => {
    // Le défaut de `llms.txt` était exactement celui-là, non détecté pendant
    // des mois. Ici on le rend impossible à installer en silence.
    const { texte } = await xml();
    for (const mot of ['propos', 'Questions', 'Téléphone', 'Adresse', 'Accueil',
                       'About', 'Contact', 'Products', 'Produits', 'Deribfy']) {
      expect(texte, `texte en langue naturelle : « ${mot} »`).not.toContain(mot);
    }
  });

  it('🔴 aucun hreflang n’est déclaré — il n’existe aucune variante à annoncer', async () => {
    const { texte } = await xml();
    expect(texte).not.toContain('hreflang');
    expect(texte).not.toContain('xhtml:link');
  });

  it('le sitemap ne porte que les balises attendues', async () => {
    const { texte } = await xml();
    const balises = new Set([...texte.matchAll(/<([a-z:]+)[ >]/g)].map((m) => m[1]));
    expect([...balises].sort()).toEqual(['changefreq', 'lastmod', 'loc', 'priority', 'url', 'urlset']);
  });
});

describe('CHANTIER 8 — première couverture : le contrat de la route tient', () => {
  it('un site publié rend un urlset XML valide avec son URL racine', async () => {
    const { statut, texte, type } = await xml();
    expect(statut).toBe(200);
    expect(type).toContain('application/xml');
    expect(texte.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(texte).toContain('<loc>https://yiaglobalcommodities.com</loc>');
    expect(texte.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('un site introuvable rend 404, jamais un XML vide', async () => {
    siteRow = null;
    expect((await xml()).statut).toBe(404);
  });

  it('les produits publiés obtiennent leur URL, les produits sans id sont ignorés', async () => {
    siteRow = site({ mode: 2, products: [{ id: 'p1' }, { id: null }, {}] });
    const { texte } = await xml();
    expect(texte).toContain('/produits/p1');
    expect([...texte.matchAll(/<url>/g)]).toHaveLength(2);
  });

  it('INVARIANT MODE 1 — une vitrine n’expose AUCUNE URL de produit', async () => {
    siteRow = site({ mode: 1, products: [] });
    const { texte } = await xml();
    expect(texte).not.toContain('/produits/');
    expect([...texte.matchAll(/<url>/g)]).toHaveLength(1);
  });
});

const ARTICLES_BLOG = [
  { slug: 'nos-horaires', title: 'Nos horaires', published_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-05T09:00:00Z' },
  { slug: 'notre-histoire', title: 'Notre histoire', published_at: '2026-07-01T10:00:00Z', updated_at: '2026-07-02T09:00:00Z' },
];

describe('LOT BLOG 8 — le blog entre dans le sitemap du site', () => {
  beforeEach(() => { articlesBlog = []; });

  it('aucun article -> ni index de blog, ni URL d’article annoncés', async () => {
    const doc = (await xml()).texte;
    expect(doc).not.toContain('/blog');
  });

  it('des articles -> l’index ET chaque article sont annoncés', async () => {
    articlesBlog = ARTICLES_BLOG;
    const doc = (await xml()).texte;
    expect(doc).toContain('<loc>https://yiaglobalcommodities.com/blog</loc>');
    expect(doc).toContain('<loc>https://yiaglobalcommodities.com/blog/nos-horaires</loc>');
    expect(doc).toContain('<loc>https://yiaglobalcommodities.com/blog/notre-histoire</loc>');
  });

  it('DEBT-034 — le `<lastmod>` d’un article suit `updated_at`, pas la fraîcheur du site', async () => {
    articlesBlog = ARTICLES_BLOG;
    const doc = (await xml()).texte;
    const bloc = doc.split('<url>').find((u) => u.includes('/blog/nos-horaires'))!;
    expect(bloc).toContain('<lastmod>2026-08-05T09:00:00.000Z</lastmod>');
  });

  it('un slug d’article est ENCODÉ — un XML de sitemap n’accepte pas d’URL brute', async () => {
    // Mutation survivante détectée : ce cas n'était couvert par aucun test.
    // Un slug est contraint par la base (`^[a-z0-9]+(-[a-z0-9]+)*$`), mais le
    // sitemap ne doit pas dépendre de cette contrainte pour rester valide.
    articlesBlog = [{ slug: 'a b&c', title: 'T', published_at: null, updated_at: null }];
    const doc = (await xml()).texte;
    expect(doc).toContain('/blog/a%20b%26c');
    expect(doc).not.toContain('/blog/a b');
  });

  it('un article sans `updated_at` retombe sur la fraîcheur du site, jamais sur `undefined`', async () => {
    articlesBlog = [{ slug: 'x', title: 'X', published_at: null, updated_at: null }];
    const doc = (await xml()).texte;
    const bloc = doc.split('<url>').find((u) => u.includes('/blog/x'))!;
    expect(bloc).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
    expect(bloc).not.toContain('undefined');
  });
});

// ============================================================
// LOT 18 — LES PAGES DU SITE SONT ANNONCÉES (mesuré le 2026-11-10 : le plan
// de la CPA ne listait que l'accueil et le blog, sur 30 pages publiées).
// ============================================================
describe('LOT 18 — toutes les pages publiques, aucune page privée', () => {
  const B = 'https://yiaglobalcommodities.com';

  it('🔴 chaque page déclarée publiée est annoncée, avec son adresse réelle', async () => {
    pagesDeclarees = [{ chemin: 'qui-sommes-nous', maj_le: '2026-11-01T00:00:00Z' }, { chemin: 'qui-sommes-nous/missions', maj_le: null }];
    const { texte } = await xml();
    expect(texte).toContain(`<loc>${B}/qui-sommes-nous</loc>`);
    expect(texte).toContain(`<loc>${B}/qui-sommes-nous/missions</loc>`);
    expect(texte).toContain(`<loc>${B}/plan-du-site</loc>`);
  });

  it('🔴 les écrans privés (connexion, inscription, espace) ne sont JAMAIS annoncés, même déclarés', async () => {
    pagesDeclarees = [{ chemin: 'connexion', maj_le: null }, { chemin: 'inscription', maj_le: null }, { chemin: 'espace-client', maj_le: null }, { chemin: 'contact', maj_le: null }];
    const { texte } = await xml();
    for (const c of ['connexion', 'inscription', 'espace-client']) expect(texte).not.toContain(`${B}/${c}<`);
    expect(texte).toContain(`<loc>${B}/contact</loc>`);
  });

  it('🔴 un site qui publie des appels d’offres annonce la liste ET chaque avis', async () => {
    siteRow = site({ publishes_tenders: true });
    avisPublies = [{ reference_slug: 'aoi-001-2026', objet: 'x', cree_le: '2026-11-02T00:00:00Z' }];
    const { texte } = await xml();
    expect(texte).toContain(`<loc>${B}/appels-offres</loc>`);
    expect(texte).toContain(`<loc>${B}/appels-offres/aoi-001-2026</loc>`);
  });

  it('🔴 chaque référence du catalogue public est annoncée', async () => {
    catalogue = [{ reference: 'MED 001', maj_le: null }];
    const { texte } = await xml();
    expect(texte).toContain(`<loc>${B}/catalogue/MED%20001</loc>`);
  });

  it('🔴 une adresse n’est jamais annoncée deux fois', async () => {
    pagesDeclarees = [{ chemin: 'appels-offres', maj_le: null }];
    siteRow = site({ publishes_tenders: true });
    const { texte } = await xml();
    expect(texte.split(`<loc>${B}/appels-offres</loc>`).length - 1).toBe(1);
  });

  it('🔴 une boutique d’une page n’annonce pas de plan du site', async () => {
    const { texte } = await xml();
    expect(texte).not.toContain('plan-du-site');
  });
});
