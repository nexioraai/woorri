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
import { creerSousDomaine, nomSuggere, nomValide, NOMS_RESERVES } from '../sous-domaine'

const SRC = join(__dirname, '..', '..', '..')
const nu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
// Next 16 : le routeur d'hôtes s'appelle `proxy.ts` — un middleware.ts à
// côté fait échouer le BUILD entier (mesuré : « Both middleware file and
// proxy file are detected »). Ce contrôle lit donc le vrai fichier.
const MIDDLEWARE = nu(readFileSync(join(SRC, 'proxy.ts'), 'utf8'))
const ROUTE_A = nu(readFileSync(join(SRC, 'app', 'a', '[sous]', 'route.ts'), 'utf8'))
const PUBLIER = nu(readFileSync(join(SRC, 'app', 'api', 'generateur', 'publier', 'route.ts'), 'utf8'))

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

  it('④ LE CNAME EST DNS-ONLY — derrière le proxy, c’est le 525 garanti', async () => {
    const captures: { corpsDns?: { proxied?: boolean; content?: string } } = {}
    doublure(captures)
    const r = await creerSousDomaine('cpa-tchad', CLEFS)
    expect(r.ok).toBe(true)
    expect(captures.corpsDns?.proxied, 'proxied doit être false : Vercel ne peut pas émettre le certificat derrière le nuage orange').toBe(false)
    expect(captures.corpsDns?.content).toBe('cname.vercel-dns.com')
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
    expect(MIDDLEWARE).toContain(".endsWith('.deribfy.com')")
    expect(MIDDLEWARE, 'les noms réservés ne sont plus écartés').toContain('NOMS_RESERVES.has(')
    expect(MIDDLEWARE, 'www serait réécrit vers une application').toContain("host !== 'www.deribfy.com'")
    expect(MIDDLEWARE).toContain("`/a/${nom}`")
    // Et le matcher du proxy écarte toujours /api et les actifs : la ligne
    // existante du dépôt, que cette logique NE doit PAS avoir délogée.
    expect(MIDDLEWARE).toMatch(/matcher:.*api.*_next/u)
  })

  it('⑦ L’ADRESSE NOMMÉE EXIGE UNE PUBLICATION, et n’appelle aucun modèle', () => {
    expect(ROUTE_A, 'un slug non publié répond encore').toContain('publication_jeton === null')
    for (const interdit of ['clientIA', 'appelerFournisseur', 'messages.create']) {
      expect(ROUTE_A, `l’adresse publique appelle un modèle (${interdit})`).not.toContain(interdit)
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
