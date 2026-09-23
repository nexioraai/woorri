import { describe, it, expect, vi, beforeEach } from 'vitest';

// LOT J (Mode 3 global, F-CUSTOM-01/F-CUSTOM-04) -- première couverture de
// cette route (aucune avant ce lot). Verrouille les 2 correctifs :
//   1. `slug` obligatoire + site réel requis (lie l'upload à un tenant).
//   2. SVG retiré des types acceptés.
// et la création de la ligne design_uploads (source de vérité pour
// checkout/route.ts).

const siteSelectMock = vi.fn();
/** AUDIT GLOBAL -- ce que rend le compteur de la borne de debit. */
let compteur: { count: number | null; error: unknown } = { count: 0, error: null };
/** LOT 5 -- la projection reellement demandee, et les filtres reellement poses. */
let colonnesDemandees = '';
const filtres: [string, unknown][] = [];
const storageUploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const designInsertMock = vi.fn();

function makeFrom() {
  return vi.fn((table: string) => {
    if (table === 'sites') {
      // ============================================================
      // LOT 5 / P5-01 -- CE HARNAIS MENTAIT, ET IL A MASQUE UNE PANNE TOTALE.
      //
      // `b.select = () => b` ignorait la liste de colonnes et le fixture
      // rendait `{ id, mode: 2 }`. La route, elle, ne demandait que `id` :
      // en production `site.mode` valait `undefined` et la route refusait
      // TOUT LE MONDE en 403. Un mock plus permissif que PostgREST rend
      // indetectable exactement la classe de defaut qu'il devrait attraper.
      //
      // La projection est desormais HONOREE : seules les colonnes reellement
      // demandees sont rendues, comme PostgREST. Les filtres sont captures
      // pour que leur retrait soit observable.
      // ============================================================
      const b: any = {};
      b.select = (cols?: string) => { colonnesDemandees = typeof cols === 'string' ? cols : ''; return b; };
      b.eq = (col: string, val: unknown) => { filtres.push([col, val]); return b; };
      b.is = (col: string, val: unknown) => { filtres.push([col, val]); return b; };
      b.maybeSingle = async () => {
        const { data, error } = await siteSelectMock();
        if (!data) return { data, error };
        const projete: Record<string, unknown> = {};
        for (const c of colonnesDemandees.split(',').map((x) => x.trim()).filter(Boolean)) {
          if (c in data) projete[c] = data[c];
        }
        return { data: projete, error };
      };
      return b;
    }
    if (table === 'checkout_anomalies') {
      // AUDIT GLOBAL -- le compteur de la borne. `count` via le thenable,
      // comme PostgREST le rend avec `head: true`.
      const b: any = {};
      const self = () => b;
      b.select = self; b.eq = (c: string, v: unknown) => { filtres.push([c, v]); return b; };
      b.is = (c: string, v: unknown) => { filtres.push([c, v]); return b; };
      b.gte = (c: string, v: unknown) => { filtres.push([c, v]); return b; };
      b.then = (r: (x: unknown) => unknown) => Promise.resolve(compteur).then(r);
      return b;
    }
    if (table === 'design_uploads') {
      const b: any = {};
      b.insert = (payload: unknown) => designInsertMock(payload);
      return b;
    }
    throw new Error('unexpected table: ' + table);
  });
}

let fromMock: ReturnType<typeof makeFrom>;
vi.mock('@/lib/supabase-admin', () => ({
  get supabaseAdmin() {
    return {
      from: (...a: [string]) => fromMock(...a),
      storage: {
        from: () => ({
          upload: (...a: unknown[]) => storageUploadMock(...a),
          getPublicUrl: (...a: unknown[]) => getPublicUrlMock(...a),
        }),
      },
    };
  },
}));

import { POST } from '../route';

// ── LES FIXTURES SONT DE VRAIES IMAGES DEPUIS M2-228, ET C'EST NECESSAIRE.
//
// Elles etaient des tampons de zeros portant un type MIME. La route s'en
// contentait : elle deposait le fichier BRUT sans jamais le decoder. Elle le
// decode desormais, pour en retirer l'EXIF -- donc les coordonnees GPS que
// cette route publiait dans un seau PUBLIC.
//
// Un double plus permissif que le vrai systeme rend du vert sur un code casse :
// des octets nuls ne prouvaient rien de ce qui arrive a un vrai design. Ces
// fixtures parcourent maintenant le chemin REEL, decodage compris.
/**
 * Copie un tampon `sharp` dans un `ArrayBuffer` PROPRE.
 *
 * Le `Buffer` de Node est adossé à un `ArrayBufferLike` — potentiellement
 * partagé — que `File` refuse. Recopier est la seule façon d'obtenir le type
 * exact sans rien affirmer au compilateur.
 */
function enOctets(b: Buffer): Uint8Array<ArrayBuffer> {
  const zone = new ArrayBuffer(b.byteLength);
  new Uint8Array(zone).set(b);
  return new Uint8Array(zone);
}

const PIXELS: Record<string, Uint8Array<ArrayBuffer>> = {};

async function imageReelle(type: string): Promise<Uint8Array<ArrayBuffer>> {
  const cle = type;
  if (!PIXELS[cle]) {
    const sharp = (await import('sharp')).default;
    // Canal alpha inclus : c'est le cas qui casse si le nettoyage aplatit.
    const base = sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 250, g: 93, b: 30, alpha: 1 } },
    });
    const buf =
      type === 'image/jpeg'
        ? await base.jpeg().toBuffer()
        : type === 'image/webp'
          ? await base.webp().toBuffer()
          : await base.png().toBuffer();
    PIXELS[cle] = enOctets(buf);
  }
  return PIXELS[cle]!;
}

async function makeRequest(fields: { file?: { name: string; type: string; size: number }; slug?: string | null }) {
  const fd = new FormData();
  if (fields.file) {
    // DEUX CAS OU DES OCTETS NULS RESTENT LE BON FIXTURE, et ce n'est pas un
    // relachement : la route les refuse AVANT tout decodage.
    //   · un type hors allowlist (SVG) -- rejete par le controle MIME ;
    //   · un fichier au-dela du plafond -- rejete par le controle de taille,
    //     et fabriquer 11 Mo d'image reelle ne prouverait rien de plus.
    const decodable = ['image/png', 'image/jpeg', 'image/webp'].includes(fields.file.type);
    const teste = decodable && fields.file.size <= 1024 * 1024;
    const bytes: Uint8Array<ArrayBuffer> = teste
      ? await imageReelle(fields.file.type)
      : new Uint8Array(new ArrayBuffer(fields.file.size));
    const file = new File([bytes], fields.file.name, { type: fields.file.type });
    fd.append('file', file);
  }
  if (fields.slug !== null && fields.slug !== undefined) fd.append('slug', fields.slug);
  return new Request('https://woorri.test/api/shop/upload-design', { method: 'POST', body: fd });
}

vi.mock('@/lib/anomaly', () => ({ logAnomaly: vi.fn() }));

beforeEach(() => {
  compteur = { count: 0, error: null };
  colonnesDemandees = '';
  filtres.length = 0;
  fromMock = makeFrom();
  siteSelectMock.mockReset().mockResolvedValue({ data: { id: 'site-1', mode: 2 }, error: null });
  storageUploadMock.mockReset().mockResolvedValue({ data: {}, error: null });
  getPublicUrlMock.mockReset().mockReturnValue({ data: { publicUrl: 'https://storage.test/custom-designs/abc.png' } });
  designInsertMock.mockReset().mockResolvedValue({ data: null, error: null });
});

describe('POST /api/shop/upload-design — LOT J (F-CUSTOM-01) : slug obligatoire', () => {
  it('slug absent -> 400, aucun upload storage tenté', async () => {
    const res = await POST(await makeRequest({ file: { name: 'a.png', type: 'image/png', size: 100 }, slug: null }));
    expect(res.status).toBe(400);
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it('slug ne correspond à aucun site réel (ou site archivé) -> 404, aucun upload storage tenté', async () => {
    siteSelectMock.mockResolvedValue({ data: null, error: null });
    const res = await POST(await makeRequest({ file: { name: 'a.png', type: 'image/png', size: 100 }, slug: 'inconnu' }));
    expect(res.status).toBe(404);
    expect(storageUploadMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/shop/upload-design — LOT J (F-CUSTOM-01) : SVG retiré', () => {
  it('image/svg+xml désormais rejeté (Invalid file type)', async () => {
    const res = await POST(await makeRequest({ file: { name: 'a.svg', type: 'image/svg+xml', size: 100 }, slug: 'my-shop' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid file type');
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it.each(['image/png', 'image/jpeg', 'image/webp'])('%s toujours accepté', async (type) => {
    const res = await POST(await makeRequest({ file: { name: 'a.png', type, size: 100 }, slug: 'my-shop' }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/shop/upload-design — cas nominal', () => {
  it('crée une ligne design_uploads liée au site résolu, avec la bonne public_url', async () => {
    const res = await POST(await makeRequest({ file: { name: 'a.png', type: 'image/png', size: 100 }, slug: 'my-shop' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.url).toBe('https://storage.test/custom-designs/abc.png');
    expect(designInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      site_id: 'site-1',
      public_url: 'https://storage.test/custom-designs/abc.png',
      mime_type: 'image/png',
    }));
  });

  it('taille > 10MB -> 400, aucun upload storage tenté', async () => {
    const res = await POST(await makeRequest({ file: { name: 'a.png', type: 'image/png', size: 11 * 1024 * 1024 }, slug: 'my-shop' }));
    expect(res.status).toBe(400);
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it("l'insertion design_uploads échoue -> 500 (jamais une URL publique renvoyée sans référence tracée)", async () => {
    designInsertMock.mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const res = await POST(await makeRequest({ file: { name: 'a.png', type: 'image/png', size: 100 }, slug: 'my-shop' }));
    expect(res.status).toBe(500);
  });
});

// ============================================================
// LOT 5 / P5-01 -- LA GARDE COMMERCIALE, MESUREE SUR LA PROJECTION REELLE.
//
// La route refusait TOUT LE MONDE en 403 parce qu'elle gardait sur une
// colonne qu'elle ne demandait pas. Ces tests ne peuvent exister que sur un
// harnais qui honore la projection : c'est la seule difference entre « la
// garde marche » et « la garde refuse tout ».
// ============================================================
const reqAvecFichier = async (slug = 'ma-boutique') =>
  makeRequest({ file: { name: 'd.png', type: 'image/png', size: 10 }, slug });

describe('POST /api/shop/upload-design — LOT 5 : la garde lit une colonne REELLEMENT demandee', () => {
  it('la projection contient `mode` -- sans quoi la garde est aveugle', async () => {
    siteSelectMock.mockResolvedValue({ data: { id: 'site-1', mode: 3 }, error: null });
    await POST(await reqAvecFichier());
    expect(colonnesDemandees).toContain('mode');
  });

  it.each([2, 3])('site Mode %s (commercant) -> upload accepte, ligne design_uploads creee', async (mode) => {
    siteSelectMock.mockResolvedValue({ data: { id: 'site-1', mode }, error: null });
    storageUploadMock.mockResolvedValue({ error: null });
    designInsertMock.mockResolvedValue({ error: null });
    const res = await POST(await reqAvecFichier());
    expect(res.status).toBe(200);
    expect(storageUploadMock).toHaveBeenCalled();
    expect(designInsertMock).toHaveBeenCalledWith(expect.objectContaining({ site_id: 'site-1' }));
  });

  it('site Mode 1 (vitrine) -> 403, aucun stockage, aucune ligne', async () => {
    siteSelectMock.mockResolvedValue({ data: { id: 'site-1', mode: 1 }, error: null });
    const res = await POST(await reqAvecFichier());
    expect(res.status).toBe(403);
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(designInsertMock).not.toHaveBeenCalled();
  });

  it('le site est resolu par SON slug -- jamais un site arbitraire', async () => {
    siteSelectMock.mockResolvedValue({ data: { id: 'site-1', mode: 3 }, error: null });
    await POST(await reqAvecFichier('ma-boutique'));
    expect(filtres).toContainEqual(['slug', 'ma-boutique']);
    expect(filtres).toContainEqual(['archived_at', null]);
  });
});

// ============================================================
// AUDIT GLOBAL — LA SEULE ECRITURE NON AUTHENTIFIEE ET NON BORNEE.
//
// Deux ecritures par appel : une ligne `design_uploads` ET un objet de 10 Mo
// dans le bucket. Ce qui est prouve ici n'est pas le code de statut, c'est
// que RIEN N'EST ECRIT quand la borne refuse.
// ============================================================
describe('POST /api/shop/upload-design — AUDIT GLOBAL : borne de debit', () => {
  it('sous la borne -> televersement accepte', async () => {
    compteur = { count: 9, error: null };
    const res = await POST(await reqAvecFichier());
    expect(res.status).toBe(200);
    expect(storageUploadMock).toHaveBeenCalled();
  });

  it('borne atteinte -> 429, AUCUN objet stocke, AUCUNE ligne creee', async () => {
    compteur = { count: 10, error: null };
    const res = await POST(await reqAvecFichier());
    expect(res.status).toBe(429);
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(designInsertMock).not.toHaveBeenCalled();
  });

  it('compteur en PANNE -> 503, AUCUN objet stocke (jamais fail-open)', async () => {
    compteur = { count: null, error: { message: 'db down' } };
    const res = await POST(await reqAvecFichier());
    expect(res.status).toBe(503);
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(designInsertMock).not.toHaveBeenCalled();
  });

  it('la borne porte sur CE site — un abuseur ne coupe pas tout le parc', async () => {
    await POST(await reqAvecFichier());
    expect(filtres).toContainEqual(['site_id', 'site-1']);
    expect(filtres).toContainEqual(['type', 'design_upload_request']);
  });

  it('un fichier refuse pour son TYPE ne consomme aucun jeton', async () => {
    // La borne se pose apres les controles gratuits : sinon un attaquant
    // viderait le seau d'un marchand avec des fichiers invalides.
    const res = await POST(await makeRequest({ file: { name: 'a.svg', type: 'image/svg+xml', size: 10 }, slug: 'ma-boutique' }));
    expect(res.status).toBe(400);
    expect(filtres).not.toContainEqual(['type', 'design_upload_request']);
  });
});

// ============================================================
// M2-228 — CE QUI EST REELLEMENT DEPOSE DANS LE SEAU PUBLIC N A PLUS D EXIF.
//
// LE DEFAUT : cette route deposait le fichier BRUT. Les coordonnees GPS du
// lieu de prise de vue partaient donc avec le design -- dans un seau PUBLIC
// (`getPublicUrl`), donc lisibles par quiconque obtenait l URL.
//
// POURQUOI CE TEST-CI EXISTE, ET PAS SEULEMENT CEUX DE LA FONCTION.
// Les cliquets de `lib/images/traitement` prouvent que `nettoyerPourImpression`
// fait son travail. Ils ne prouvent PAS que la ROUTE l appelle. MESURE : en
// remettant le depot brut dans la route, ces cliquets-la restaient TOUS VERTS.
// Un cliquet qui ne tombe pas ne garde rien -- celui-ci regarde les octets qui
// partent vraiment.
// ============================================================
describe('POST /api/shop/upload-design — M2-228 : les octets DEPOSES sont nettoyes', () => {
  /** Une image qui PORTE de l EXIF, comme une photo prise au telephone. */
  async function avecExif(): Promise<Uint8Array<ArrayBuffer>> {
    const sharp = (await import('sharp')).default;
    const buf = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 250, g: 93, b: 30, alpha: 1 } },
    })
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'POSITION-GPS-DU-MARCHAND' } } })
      .png()
      .toBuffer();
    return enOctets(buf);
  }

  function requeteAvec(bytes: Uint8Array<ArrayBuffer>) {
    const fd = new FormData();
    fd.append('file', new File([bytes], 'photo.png', { type: 'image/png' }));
    fd.append('slug', 'ma-boutique');
    return new Request('https://woorri.test/api/shop/upload-design', { method: 'POST', body: fd });
  }

  beforeEach(() => {
    siteSelectMock.mockResolvedValue({ data: { id: 'site-1', mode: 3 }, error: null });
  });

  it('le fichier ENVOYE au stockage ne porte plus aucun EXIF', async () => {
    const sharp = (await import('sharp')).default;
    const entree = await avecExif();
    expect(
      (await sharp(Buffer.from(entree)).metadata()).exif,
      'le fixture doit PORTER de l EXIF, sinon ce test ne prouve rien',
    ).toBeDefined();

    const res = await POST(requeteAvec(entree));
    expect(res.status).toBe(200);
    expect(storageUploadMock).toHaveBeenCalled();

    // Les octets REELLEMENT deposes, pas ceux qu on a envoyes.
    const deposes = storageUploadMock.mock.calls[0]![1] as Buffer;
    const m = await sharp(deposes).metadata();
    expect(m.exif, 'de l EXIF est parti dans le seau public').toBeUndefined();
  });

  it('l ORIENTATION est appliquee — sinon le design part couche chez l imprimeur', async () => {
    const sharp = (await import('sharp')).default;
    await POST(requeteAvec(await avecExif()));
    const deposes = storageUploadMock.mock.calls[0]![1] as Buffer;
    const m = await sharp(deposes).metadata();
    // L image stockee fait 64x64 ; avec l orientation 6 appliquee elle reste
    // carree, mais l orientation doit avoir ete NEUTRALISEE.
    expect(m.orientation, 'l orientation EXIF survit encore').toBeUndefined();
  });

  it('LA TRANSPARENCE survit — un logo aplati arrive avec un rectangle blanc imprime', async () => {
    const sharp = (await import('sharp')).default;
    const transparent = enOctets(
      await sharp({
        create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .png()
        .toBuffer(),
    );
    await POST(requeteAvec(transparent));
    const deposes = storageUploadMock.mock.calls[0]![1] as Buffer;
    const m = await sharp(deposes).metadata();
    expect(m.hasAlpha, 'le canal alpha a ete perdu a l enregistrement').toBe(true);
    expect(m.format, 'le PNG a ete converti — la transparence est morte').toBe('png');
  });

  it('un fichier ILLISIBLE comme image est REFUSE, jamais depose', async () => {
    // Le controle de type MIME plus haut se fie a ce que DECLARE le
    // navigateur ; celui-ci se fie a ce que le fichier EST. Sans lui, un
    // binaire quelconque entrait dans un seau public sous un nom d image.
    const res = await POST(requeteAvec(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])));
    expect(res.status).toBe(415);
    expect(storageUploadMock).not.toHaveBeenCalled();
  });
});
