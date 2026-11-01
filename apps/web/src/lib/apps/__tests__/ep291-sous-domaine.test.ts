/**
 * EP-291 — UNE APPLICATION A UNE ADRESSE : <nom>.deribfy.com.
 *
 * ── LA DEMANDE, 2026-10-30 : « chaque appli doit avoir appli.deribfy.com ».
 *
 * Le lien par jeton marche mais ne se retient pas. Contrainte mesurée : le
 * DNS est chez Cloudflare — pas de wildcard Vercel sans déménager les
 * nameservers. Donc : un CNAME par publication, créé par l'API, domaine
 * attaché chez Vercel, middleware qui route l'hôte.
 *
 * ── CE QUE CE CLIQUET TIENT, ET POURQUOI CHAQUE PIÈCE EST UN RISQUE RÉEL.
 *
 *   · le CNAME est DNS-ONLY (proxied: false) — derrière le proxy orange,
 *     Vercel ne peut ni servir ni émettre le certificat : c'est le 525 déjà
 *     vu sur ce domaine, recréé volontairement ;
 *   · le middleware est le PREMIER du dépôt et voit TOUTES les requêtes —
 *     il ne doit toucher qu'au cas exact des sous-domaines d'application ;
 *   · les noms réservés (admin, login, paiement…) sont refusés — l'adresse
 *     est lue par des humains, un escroc choisirait exactement ceux-là ;
 *   · l'échec du sous-domaine n'avale JAMAIS la publication par jeton.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  creerSousDomaine,
  nomSuggere,
  nomValide,
  NOMS_RESERVES,
  TEMOIN_GENERIQUE,
} from '../sous-domaine'

const SRC = join(__dirname, '..', '..', '..')
const nu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
// Next 16 : le routeur d'hôtes s'appelle `proxy.ts` — un middleware.ts à
// côté fait échouer le BUILD entier (mesuré : « Both middleware file and
// proxy file are detected »). Ce contrôle lit donc le vrai fichier.
const MIDDLEWARE = nu(readFileSync(join(SRC, 'proxy.ts'), 'utf8'))
const ROUTE_A = nu(readFileSync(join(SRC, 'app', 'a', '[sous]', 'route.ts'), 'utf8'))
const PUBLIER = nu(readFileSync(join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts'), 'utf8'))
const ADRESSE = nu(readFileSync(join(SRC, 'app', 'api', 'sites', 'adresse', 'route.ts'), 'utf8'))

afterEach(() => { vi.unstubAllGlobals() })

describe('EP-291 · le nom', () => {
  it('① LES NOMS VALIDES PASSENT, les pièges non', () => {
    for (const bon of ['cpa-tchad', 'conterak', 'ma-boutique-2026']) {
      expect(nomValide(bon), `« ${bon} » devrait passer`).toBe(true)
    }
    for (const mauvais of ['CPA', 'a', '-cpa', 'cpa-', 'cpa--tchad', 'cpa.tchad', 'x'.repeat(41), '']) {
      expect(nomValide(mauvais), `« ${mauvais} » devrait être refusé`).toBe(false)
    }
  })

  it('② LES NOMS RÉSERVÉS SONT REFUSÉS — l’adresse est lue par des humains', () => {
    // admin.deribfy.com ou paiement.deribfy.com servi en page d'application :
    // c'est l'hameçonnage clé en main, signé par notre propre domaine.
    for (const r of ['www', 'admin', 'login', 'paiement', 'api', 'support']) {
      expect(NOMS_RESERVES.has(r), `« ${r} » doit être réservé`).toBe(true)
      expect(nomValide(r)).toBe(false)
    }
  })

  it('③ LA SUGGESTION PRODUIT TOUJOURS UN NOM VALIDE', () => {
    for (const texte of ['CPA- Tchad Site officiel', 'Éclat & Coiffure !!', 'CAHIER DES CHARGES Nouvelle plateforme']) {
      const n = nomSuggere(texte)
      expect(nomValide(n), `suggestion invalide pour « ${texte} » : « ${n} »`).toBe(true)
    }
  })
})

describe('EP-291 · la liste des noms réservés est ADOPTÉE, pas rédigée', () => {
  it('⑩ ELLE VIENT D’UNE SOURCE PUBLIÉE, citée et datée', () => {
    // Une liste fermée qui grandit à chaque défaut révélé est la maladie
    // que ce dépôt soigne partout ailleurs. On prend celle que le monde
    // maintient (The Big Username Blacklist, MIT) et on n'écrit que le
    // français — DÉRIVÉ, mot à mot, de ce qui est déjà réservé en anglais.
    const brut = JSON.parse(
      readFileSync(join(__dirname, '..', 'noms-reserves.genere.json'), 'utf8'),
    ) as { source: string; licence: string; anglais: string[]; francais: string[] }
    expect(brut.source).toMatch(/Big Username Blacklist/u)
    expect(brut.licence).toMatch(/MIT/u)
    expect(brut.anglais.length, 'la liste adoptée a fondu').toBeGreaterThan(400)
    expect(brut.francais.length, 'le français a disparu').toBeGreaterThan(20)
  })

  it('⑪ LES MOTS DE CONFIANCE SONT COUVERTS DANS LES DEUX LANGUES', () => {
    // Le propriétaire vise un produit mondial : une liste française ne
    // protégerait que la moitié de ses utilisateurs, et l'inverse est vrai.
    for (const en of ['login', 'secure', 'verify', 'account', 'payment', 'support']) {
      expect(NOMS_RESERVES.has(en), `« ${en} » n’est plus réservé`).toBe(true)
    }
    for (const fr of ['connexion', 'securise', 'verification', 'compte', 'paiement', 'assistance']) {
      expect(NOMS_RESERVES.has(fr), `« ${fr} » n’est plus réservé`).toBe(true)
    }
  })

  it('⑫ LE TÉMOIN DE LA SONDE EST RÉSERVÉ — sinon elle mentirait', () => {
    // S'il était publié, il résoudrait par SON propre enregistrement et la
    // sonde dirait « générique vivant » alors qu'il serait mort.
    expect(NOMS_RESERVES.has(TEMOIN_GENERIQUE)).toBe(true)
    expect(nomValide(TEMOIN_GENERIQUE), 'le témoin est publiable').toBe(false)
  })

  it('⑬ CE QU’AUCUNE LISTE NE FERA — et c’est écrit là où on serait tenté', () => {
    // `orange-money.deribfy.app` ou le nom d'une vraie banque passeront
    // toujours : les marques du monde ne tiennent pas dans un fichier.
    // Cela relève des conditions d'utilisation et du RETRAIT, qui existe.
    const src = readFileSync(join(__dirname, '..', 'sous-domaine.ts'), 'utf8')
    expect(src, 'l’avertissement a disparu : quelqu’un rallongera la liste').toMatch(
      /n'allongez pas la\s+\*?\s*liste/u,
    )
  })
})

describe('EP-291 · la création, exécutée sur doublures réseau', () => {
  const doublure = (captures: { corpsDns?: unknown }) =>
    vi.stubGlobal('fetch', async (url: string | URL, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/zones?name=')) {
        return { json: async () => ({ success: true, result: [{ id: 'zone-1' }] }) }
      }
      if (u.includes('/dns_records?')) {
        return { json: async () => ({ result: [] }) }
      }
      if (u.includes('/dns_records')) {
        captures.corpsDns = JSON.parse(String(init?.body ?? '{}'))
        return { json: async () => ({ success: true }) }
      }
      if (u.includes('vercel.com')) {
        return { ok: true, status: 200, json: async () => ({}) }
      }
      throw new Error(`appel inattendu : ${u}`)
    })

  const CLEFS = { cloudflareToken: 'cf', vercelToken: 'vc', vercelProjectId: 'prj' }

  it('④ PUBLIER N’ÉCRIT PLUS DE DNS — le générique s’en charge', async () => {
    // MESURE DU 2026-11-01 : une publication a rendu un lien mort
    // (ERR_NAME_NOT_RESOLVED). Le nom n'existait pas encore au premier
    // clic, et le SOA met le NXDOMAIN en cache 1800 SECONDES — trente
    // minutes sans recours.
    //
    // Un CNAME `*` supprime le problème au lieu de l'expliquer : tout nom
    // résout, il n'y a plus de vide à mémoriser. Le certificat GÉNÉRIQUE,
    // lui, est refusé par Vercel (mesuré : HTTP 449,
    // dns_pretest_cns_not_using_vercel_ns_error — il exige ses propres
    // nameservers) ; mais celui du nom PRÉCIS est émis à la demande dès
    // qu'il est attaché, puisqu'il résout. Mesuré sur un nom créé vingt
    // secondes plus tôt : TLS 0.
    //
    // Publier ne doit donc plus toucher au DNS. Ce contrôle l'exige : un
    // appel à Cloudflare ici voudrait dire qu'on a réintroduit l'attente.
    const appels: string[] = []
    vi.stubGlobal('fetch', async (url: string | URL) => {
      appels.push(String(url))
      return { ok: true, status: 200, json: async () => ({}) }
    })
    const r = await creerSousDomaine('cpa-tchad', CLEFS)
    expect(r.ok).toBe(true)
    expect(
      appels.filter((u) => u.includes('cloudflare')),
      'publier écrit encore du DNS : l’attente de trente minutes revient',
    ).toEqual([])
    expect(appels.some((u) => u.includes('vercel.com')), 'le nom n’est pas attaché').toBe(true)
  })

  it('④bis L’ANCIEN CONTRÔLE DU CNAME — conservé, et il ne s’applique plus', async () => {
    // Le CNAME par nom n'existe plus ; l'enregistrement `*` qui le remplace
    // vit chez Cloudflare, hors du code. C'est la SONDE qui le surveille :
    // elle interroge un nom jamais créé à chaque déploiement, et le
    // contrôle d'après-déploiement rougit s'il a disparu.
    const captures: { corpsDns?: { proxied?: boolean } } = {}
    doublure(captures)
    const r = await creerSousDomaine('cpa-tchad', CLEFS)
    expect(r.ok).toBe(true)
    expect(captures.corpsDns, 'aucun enregistrement DNS ne doit être écrit').toBeUndefined()
  })

  it('⑤ UN NOM RÉSERVÉ NE PART JAMAIS SUR LE RÉSEAU', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('aucun appel ne devait partir') })
    const r = await creerSousDomaine('admin', CLEFS)
    expect(r.ok).toBe(false)
  })
})

describe('EP-291 · le middleware et les routes', () => {
  it('⑥ LE PROXY NE TOUCHE QU’AUX SOUS-DOMAINES D’APPLICATION', () => {
    // Premier middleware du dépôt : il voit TOUT. Les domaines clients
    // (biyaminchine.com…) ne finissent pas par .deribfy.com et doivent
    // passer sans qu'un doigt soit posé dessus.
    // deribfy.app est LE domaine du contenu client depuis le 2026-10-30.
    expect(MIDDLEWARE).toContain(".endsWith('.deribfy.app')")
    expect(MIDDLEWARE, 'les noms réservés ne sont plus écartés').toContain('NOMS_RESERVES.has(')
    // L'apex et www du domaine client ramènent à la plateforme.
    expect(MIDDLEWARE).toContain("host === 'deribfy.app' || host === 'www.deribfy.app'")
    expect(MIDDLEWARE).toContain("`/a/${nom}`")
    // SITE D'ABORD : le proxy sait lire sites_public, pas la table des
    // générations — et publier refuse les collisions en face.
    expect(MIDDLEWARE, 'le site n’est plus servi en priorité sur le sous-domaine').toContain(
      'fetchSiteParSlug(',
    )
    // Le legacy .deribfy.com (cpa) continue de servir.
    expect(MIDDLEWARE).toContain(".endsWith('.deribfy.com')")
    // Et le matcher du proxy écarte toujours /api et les actifs.
    expect(MIDDLEWARE).toMatch(/matcher:.*api.*_next/u)
  })

  it('⑦ L’ADRESSE NOMMÉE EXIGE UNE PUBLICATION, et n’appelle aucun modèle', () => {
    expect(ROUTE_A, 'un slug non publié répond encore').toContain('publication_jeton === null')
    for (const interdit of ['clientIA', 'appelerFournisseur', 'messages.create']) {
      expect(ROUTE_A, `l’adresse publique appelle un modèle (${interdit})`).not.toContain(interdit)
    }
  })

  it('⑧bis UN NOM QUI HEURTE UN SITE EST REFUSÉ', () => {
    // Le proxy sert les sites D'ABORD : une application nommée comme un site
    // existant montrerait LE SITE à l'adresse qu'on vient d'annoncer.
    expect(PUBLIER, 'la collision avec un slug de site n’est plus vérifiée').toMatch(
      /from\(['"]sites['"]\)[\s\S]{0,120}\.eq\(\s*['"]slug['"]/u,
    )
  })

  it('⑨ L’ADRESSE D’UN SITE TIENT LES MÊMES RÈGLES QUE CELLE D’UNE APP', () => {
    // Même machinerie, mêmes garde-fous : propriété filtrée DANS la requête,
    // nom validé, collisions croisées (sites ↔ applications), aucun modèle.
    expect(ADRESSE).toContain('requireAuthenticatedUser')
    // `owner_id`, PAS `owner_email` : le cliquet de dette 6a a refusé la
    // gate quand cette route est née avec le courriel — un courriel se
    // change et se réassigne, l'id du jeton non.
    expect(ADRESSE, 'la propriété du site n’est plus filtrée dans la requête').toMatch(
      /\.eq\(\s*['"]owner_id['"]/u,
    )
    expect(ADRESSE, 'owner_email est revenu comme clé d’identité').not.toMatch(
      /\.eq\(\s*['"]owner_email['"]/u,
    )
    expect(ADRESSE).toContain('nomValide(')
    expect(ADRESSE, 'la collision avec une application n’est plus vérifiée').toContain(
      'publication_slug',
    )
    for (const interdit of ['clientIA', 'appelerFournisseur', 'messages.create']) {
      expect(ADRESSE, `l’adresse d’un site appelle un modèle (${interdit})`).not.toContain(interdit)
    }
  })

  it('⑧ L’ÉCHEC DU SOUS-DOMAINE N’AVALE PAS LA PUBLICATION', () => {
    // Le jeton d'abord, le nom ensuite : si Cloudflare refuse, la personne
    // repart avec un lien qui MARCHE et la raison de l'échec — jamais un
    // échec sec sur une œuvre pourtant publiée.
    expect(PUBLIER, 'l’erreur de sous-domaine n’est plus portée à l’écran').toContain('erreurSousDomaine')
    expect(PUBLIER, 'l’unicité ne s’évalue plus contre les AUTRES œuvres').toMatch(
      /\.neq\(\s*['"]id['"]/u,
    )
  })
})
