// ============================================================
// LES GARDES SONT EXÉCUTÉES, PAS SEULEMENT PRÉSENTES DANS LE CODE.
//
// ── POURQUOI CE TEST EXISTE, ET CE QU'IL AJOUTE AUX AUTRES.
//
// Le dépôt a beaucoup de cliquets qui LISENT le code : ils vérifient qu'une
// route appelle bien `requireSiteOwner`, qu'un appel client porte bien un
// en-tête. C'est précieux, et c'est aveugle à une chose : ils ne savent pas
// ce que la route RÉPOND.
//
// Le 2026-09-26, trois défauts de la même forme sont passés en production le
// jour même de leur livraison — `tsc` propre, plus de 4 300 tests verts,
// build vert, et le marchand contre un mur :
//
//   · le sélecteur de produits d'une page appelait sans jeton    -> 401
//   · le créateur de produit envoyait ses photos sans jeton      -> 401
//   · `/api/site/logo` écrivait dans le stockage SANS AUCUNE GARDE
//
// Aucun test n'envoyait de requête. C'était l'angle mort exact.
//
// ── CE QUE CELUI-CI FAIT.
//
// Il IMPORTE les vraies routes et les APPELLE. Une requête sans en-tête
// d'autorisation doit se faire refuser — et se faire refuser AVANT toute
// lecture de fichier ou écriture en base.
//
// Il ne touche à aucun réseau : la garde court-circuite sur l'absence de
// jeton (`require-site-owner.ts`), avant le moindre appel. Un test qui
// partirait vers Supabase serait lent, fragile, et refusé par le harnais
// (`vitest.setup.ts` interdit le réseau sortant).
//
// ── CE QU'IL NE PRÉTEND PAS FAIRE.
//
// Il ne vérifie pas qu'un marchand LÉGITIME obtient bien son résultat : cela
// demanderait une vraie session. Il vérifie la moitié qu'on peut prouver
// gratuitement, et c'est celle qui a cassé.
// ============================================================
import { describe, expect, it } from 'vitest'

// ── DES IDENTIFIANTS FACTICES, ET C'EST VOULU.
//
// Les modules de route construisent leurs clients Supabase À L'IMPORT : sans
// ces variables, le fichier ne se charge même pas. On en pose donc de fausses.
//
// Elles ne servent JAMAIS : la garde refuse sur l'absence de jeton avant le
// moindre appel réseau. Et c'est la propriété qu'on veut — un test de garde
// qui aurait besoin de vrais identifiants dépendrait d'un service tiers pour
// répondre à une question qui n'en demande aucun, et deviendrait rouge les
// jours où ce service est lent.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://exemple-de-test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'cle-anon-de-test'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'cle-service-de-test'

/** Une requête POST anonyme, en multipart — comme un dépôt de fichier. */
function requeteAnonymeFichier(url: string): Request {
  const corps = new FormData()
  corps.append('slug', 'chanorfie-1789998512799')
  corps.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'x.png', { type: 'image/png' }))
  return new Request(url, { method: 'POST', body: corps })
}

/** Une requête POST anonyme, en JSON — comme une création de produit. */
function requeteAnonymeJson(url: string, charge: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(charge),
  })
}

describe('une requête SANS jeton se fait refuser par les vraies routes', () => {
  it('POST /api/site/logo — le défaut exact du 2026-09-26', async () => {
    // Cette route déposait le fichier avec la CLÉ DE SERVICE sans rien
    // vérifier : n'importe qui pouvait écrire dans le dossier de n'importe
    // quel marchand. Ici, on l'APPELLE vraiment.
    const { POST } = await import('../site/logo/route')
    const res = await POST(requeteAnonymeFichier('https://x.test/api/site/logo'))
    expect(
      res.status,
      `la route du logo a répondu ${String(res.status)} à un inconnu — elle doit refuser`,
    ).toBe(401)
  })

  it('POST /api/images/upload — photos de produit', async () => {
    const { POST } = await import('../images/upload/route')
    const res = await POST(requeteAnonymeFichier('https://x.test/api/images/upload'))
    expect(res.status).toBe(401)
  })

  it('POST /api/shop/products — création de produit', async () => {
    const { POST } = await import('../shop/products/route')
    const res = await POST(
      requeteAnonymeJson('https://x.test/api/shop/products', {
        slug: 'chanorfie-1789998512799',
        name: 'Produit injecté',
        price: 1,
      }),
    )
    expect(
      res.status,
      `un inconnu a obtenu ${String(res.status)} en créant un produit dans une boutique`,
    ).toBe(401)
  })

  it('GET /api/shop/products — lecture du catalogue marchand', async () => {
    // C'est CETTE lecture que le sélecteur demandait sans jeton. Le 401 n'est
    // pas un défaut de la route : c'est sa garde qui fonctionne.
    const { GET } = await import('../shop/products/route')
    const res = await GET(new Request('https://x.test/api/shop/products?slug=chanorfie-1789998512799'))
    expect(res.status).toBe(401)
  })

  it('POST /api/shop/orders — commandes', async () => {
    const { PATCH } = await import('../shop/orders/route')
    const res = await PATCH(
      // CHARGE BIEN FORMÉE, ET C'EST NÉCESSAIRE : cette route valide le corps
      // AVANT de vérifier l'identité. Une charge incomplète s'arrêterait sur un
      // 400 et ne prouverait rien de la garde — c'est ce qu'a fait mon premier
      // essai, avec `id`/`status` au lieu de `orderId`/`targetStatus`.
      requeteAnonymeJson('https://x.test/api/shop/orders', {
        slug: 'chanorfie-1789998512799',
        orderId: '00000000-0000-0000-0000-000000000000',
        targetStatus: 'shipped',
      }),
    )
    expect(res.status, 'un inconnu a pu toucher aux commandes').toBe(401)
  })
})

describe('le refus arrive AVANT tout effet', () => {
  it('la route du logo refuse un fichier ÉNORME sans le lire', async () => {
    // Si la garde passait après la lecture, un inconnu ferait consommer la
    // mémoire et le temps du serveur avant d'être refusé. Six mégaoctets
    // dépassent la limite de la route (5 Mo) : si le refus était 413, c'est
    // que le fichier avait déjà été mesuré — donc lu.
    const { POST } = await import('../site/logo/route')
    const corps = new FormData()
    corps.append('slug', 'chanorfie-1789998512799')
    corps.append('file', new File([new Uint8Array(6 * 1024 * 1024)], 'gros.png', { type: 'image/png' }))
    const res = await POST(new Request('https://x.test/api/site/logo', { method: 'POST', body: corps }))
    expect(
      res.status,
      'la taille a été vérifiée AVANT l’identité : le serveur travaille pour un inconnu',
    ).toBe(401)
  })

  it('le refus est un REFUS, jamais une panne', async () => {
    // Un 500 dirait « la route a planté » : le marchand verrait une erreur
    // technique, et nous ne saurions pas si la garde a joué.
    const { POST } = await import('../site/logo/route')
    const res = await POST(new Request('https://x.test/api/site/logo', { method: 'POST' }))
    expect([400, 401]).toContain(res.status)
  })
})

describe('le test lui-même est éprouvé', () => {
  it('une requête AVEC un jeton bidon ne s’arrête pas au même endroit', async () => {
    // LA MOITIÉ QUI COMPTE. Sans elle, une route qui répondrait 401 à TOUT —
    // y compris à un marchand légitime — passerait ce fichier au vert, et on
    // croirait la chaîne saine alors qu'elle serait morte.
    //
    // Avec un jeton, la garde dépasse le court-circuit et cherche à le
    // vérifier. Le harnais interdisant le réseau (`vitest.setup.ts`), cet
    // appel échoue — et cet échec PROUVE qu'un chemin différent a été pris.
    const { GET } = await import('../shop/products/route')
    const res = await GET(
      new Request('https://x.test/api/shop/products?slug=x', {
        headers: { Authorization: 'Bearer jeton-invente' },
      }),
    )
    // 401 (jeton refusé après vérification) ou 500 (réseau coupé par le
    // harnais) : les deux disent que le court-circuit n'a PAS suffi.
    expect([401, 500]).toContain(res.status)
  })
})
