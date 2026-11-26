/**
 * TEXTES NEUTRES (lot 2, 2026-11-26).
 *
 * ① LA CPA NE CHANGE PAS : avec sa désignation (« la Centrale »), chaque
 *   fichier de mots, dans chaque langue, rend AU CARACTÈRE PRÈS le relevé
 *   pris avant le lot (fixtures/mots-cpa-avant.json) ;
 * ② UN AUTRE SITE ne lit plus jamais « la Centrale » ;
 * ③ les formes grammaticales (le / la / l’ / les ; en ; es ; ar) ;
 * ④ le sigle, miroir de la fonction SQL `initiales_du_site` ;
 * ⑤ les cliquets : plus de « la Centrale », de « DDM » ni d'exemple CPA écrits en dur.
 * Ce que ce fichier NE voit PAS : la base réelle (la colonne `designation`) et le rendu à l'œil.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import { accorder, exempleDeReference, institution, sigleDuSite, DESIGNATION_GENERIQUE } from '@/lib/sites/institution'
import { cpa } from './institutionCpa'

vi.mock('server-only', () => ({}))
const AVANT = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'mots-cpa-avant.json'), 'utf8')) as Record<string, Record<string, unknown>>
const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

const MODULES = {
  motsProfil: () => import('@/app/sites/[slug]/espace/motsProfil'),
  motsMessages: () => import('@/app/sites/[slug]/espace/motsMessages'),
  motsPrequalification: () => import('@/app/sites/[slug]/espace/motsPrequalification'),
  motsCommandes: () => import('@/app/sites/[slug]/espace/motsCommandes'),
  motsDossier: () => import('@/app/sites/[slug]/espace/motsDossier'),
  motsDocuments: () => import('@/app/sites/[slug]/espace/motsDocuments'),
  motsConsultations: () => import('@/app/sites/[slug]/espace/motsConsultations'),
  motsEchanges: () => import('@/app/sites/[slug]/espace/motsEchanges'),
  motsEspace: () => import('@/app/sites/[slug]/espace-client/motsEspace'),
  motsPostuler: () => import('@/app/sites/[slug]/appels-offres/motsPostuler'),
  motsAcces: () => import('@/app/sites/[slug]/acces/libelles'),
} as const
const LANGUES = ['fr', 'en', 'es', 'ar'] as const
type Fn = (l: string, i: ReturnType<typeof institution>) => unknown
const fn = async (nom: keyof typeof MODULES): Promise<Fn> => ((await MODULES[nom]()) as unknown as Record<string, Fn>)[nom]

/** Le seul écart voulu : en arabe, l'onglet de la Centrale disait « المركز » (le centre) ; il prend la désignation. */
const ECARTS_VOULUS = new Set(['motsMessages.ar.clients.filCentrale'])
function differences(a: unknown, b: unknown, chemin: string, out: string[]) {
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) differences((a as never)[k], (b as never)[k], `${chemin}.${k}`, out)
  } else if (a !== b && !ECARTS_VOULUS.has(chemin)) out.push(`${chemin} : ${JSON.stringify(b)} → ${JSON.stringify(a)}`)
}

describe('① la CPA ne change pas', () => {
  for (const nom of Object.keys(MODULES) as (keyof typeof MODULES)[]) {
    it(`${nom} : les 4 langues, au caractère près`, async () => {
      const f = await fn(nom)
      const ecarts: string[] = []
      for (const l of LANGUES) differences(f(l, cpa(l)), AVANT[nom][l], `${nom}.${l}`, ecarts)
      expect(ecarts).toEqual([])
    })
  }
  it('le relevé de référence porte bien « la Centrale » (sinon la comparaison ne prouverait rien)', () => {
    expect(JSON.stringify(AVANT.motsProfil.fr)).toMatch(motifTexte('Ce que la Centrale sait de vous'))
    expect(Object.keys(AVANT)).toHaveLength(11)
  })
})

/** Les seules VALEURS (les clés comme `filCentrale` sont du code, pas du texte affiché). */
const valeurs = (v: unknown): string[] => typeof v === 'string' ? [v] : v !== null && typeof v === 'object' ? Object.values(v).flatMap(valeurs) : []

describe('② un autre site', () => {
  for (const nom of Object.keys(MODULES) as (keyof typeof MODULES)[]) {
    it(`${nom} : aucune « Centrale », aucun jeton oublié, dans aucune langue`, async () => {
      const f = await fn(nom)
      for (const l of LANGUES) {
        const texte = valeurs(f(l, institution(l, null))).join(' ¦ ')
        expect(texte, `${nom}.${l}`).not.toMatch(/Centrale|\bCentral\b|المركزية|المركز'|\{\{/u)
      }
    })
  }
  it('un ministère : ses propres mots', async () => {
    const f = await fn('motsProfil')
    const m = f('fr', institution('fr', 'le Ministère de la Santé')) as { phrase: string; figee: string }
    expect(m.phrase).toBe('Ce que le Ministère de la Santé sait de vous, et ce que vous pouvez encore corriger.')
    expect(m.figee).toBe('Votre compte est suspendu : écrivez au Ministère de la Santé pour toute modification.')
  })
})

describe('③ les formes', () => {
  it('français : la, le, l’, les, et un nom propre', () => {
    expect(institution('fr', 'la Centrale')).toMatchObject({ la: 'la Centrale', La: 'La Centrale', de: 'de la Centrale', a: 'à la Centrale', nu: 'Centrale' })
    expect(institution('fr', 'le Ministère')).toMatchObject({ la: 'le Ministère', La: 'Le Ministère', de: 'du Ministère', a: 'au Ministère' })
    expect(institution('fr', 'l’Agence')).toMatchObject({ la: 'l’Agence', La: 'L’Agence', de: 'de l’Agence', a: 'à l’Agence', nu: 'Agence' })
    expect(institution('fr', "l'Hôpital")).toMatchObject({ de: 'de l’Hôpital', a: 'à l’Hôpital' })
    expect(institution('fr', 'les Services')).toMatchObject({ de: 'des Services', a: 'aux Services' })
    expect(institution('fr', 'Médecins du Monde')).toMatchObject({ la: 'Médecins du Monde', de: 'de Médecins du Monde' })
    expect(institution('fr', null)).toMatchObject({ la: 'l’établissement', La: 'L’établissement', de: 'de l’établissement', a: 'à l’établissement' })
  })
  it('anglais, espagnol, arabe ; une désignation n’est lue que dans la langue du site', () => {
    expect(institution('en', 'the Ministry')).toMatchObject({ the: 'the Ministry', The: 'The Ministry', nu: 'Ministry' })
    expect(institution('es', 'el Ministerio')).toMatchObject({ la: 'el Ministerio', de: 'del Ministerio', a: 'al Ministerio' })
    expect(institution('es', 'la Central')).toMatchObject({ de: 'de la Central', a: 'a la Central' })
    expect(institution('ar', 'الوزارة').al).toBe('الوزارة')
    expect(institution('fr', 'la Centrale').the).toBe(DESIGNATION_GENERIQUE.en)
    expect(institution('xx', null).la).toBe('l’établissement')
  })
  it('accorder remplace partout (chaînes, tableaux, objets) et ne touche à rien d’autre', () => {
    const i = institution('fr', 'la Centrale')
    expect(accorder({ a: ['écrire {{a}}', 3], b: { c: '{{La}} répond' }, d: null }, i)).toEqual({ a: ['écrire à la Centrale', 3], b: { c: 'La Centrale répond' }, d: null })
    expect(accorder('{inconnu} {{x}}', i)).toBe('{inconnu} {{x}}')
  })
})

describe('④ le sigle et l’exemple de référence', () => {
  it('miroir de `initiales_du_site` : le sigle donné prime, puis les initiales (4 au plus), puis REF', () => {
    expect(sigleDuSite("Centrale Pharmaceutique d'Achats (CPA)")).toBe('CPA')
    expect(sigleDuSite('Ministère de la Santé Publique')).toBe('MSP')
    expect(sigleDuSite('Agence Nationale des Routes du Tchad et du Sahel')).toBe('ANDR') // « des » a 3 lettres : la base le compte aussi
    expect(sigleDuSite('(ancienne cpa) Hôpital Général')).toBe('HG')
    expect(sigleDuSite('')).toBe('REF')
    const sql = lire('supabase/sql/messages_reference_sigle.sql')
    expect(sql).toMatch(motifTexte("'\\(([A-ZÀ-Ý]{2,6})\\)'"))
    expect(sql).toMatch(motifTexte("'([[:alnum:]]{3,})'"))
  })
  it('l’exemple du suivi : CPA-2026-XXXXXX pour la CPA, le sigle du site ailleurs', () => {
    expect(exempleDeReference("Centrale Pharmaceutique d'Achats (CPA)", 2026)).toBe('CPA-2026-XXXXXX')
    expect(exempleDeReference('Ministère de la Santé Publique', 2026)).toBe('MSP-2026-XXXXXX')
    expect(lire('src/app/sites/[slug]/demandes/suivi/page.tsx')).toMatch(motifTexte('exemple={exempleDeReference(s.name)}'))
    expect(lire('src/app/sites/[slug]/demandes/FormulaireSuivi.tsx')).toMatch(motifTexte('placeholder={exemple}'))
  })
})

// Le code SANS ses commentaires (lignes, blocs et commentaires JSX).
function codeSeul(src: string): string {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/gu, '').replace(/\/\*[\s\S]*?\*\//gu, '').split('\n').map((l) => (/^\s*\/\//u.test(l) ? '' : l.replace(/\s\/\/.*$/u, ''))).join('\n')
}
function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : fichiers(p)
    return /\.(ts|tsx)$/u.test(n) ? [p] : []
  })
}

describe('⑤ les cliquets', () => {
  const tous = [...fichiers(join(process.cwd(), 'src/app')), ...fichiers(join(process.cwd(), 'src/components'))]
  it('aucun « la Centrale » (ni ses formes) écrit en dur dans le code', () => {
    const fautifs = tous.filter((f) => /\b(la|La|de la|à la) Centrale\b|the Centrale|Centrale staff|— Service clients'/u.test(codeSeul(readFileSync(f, 'utf8'))))
    expect(fautifs.map((f) => f.replace(process.cwd() + '/', ''))).toEqual([])
  })
  it('aucun « DDM » ni exemple « CPA-2026 » / « /CPA/ » affiché', () => {
    const fautifs = tous.filter((f) => /\bDDM\b|CPA-20\d\d|\/CPA\//u.test(codeSeul(readFileSync(f, 'utf8'))))
    expect(fautifs.map((f) => f.replace(process.cwd() + '/', ''))).toEqual([])
  })
  it('le tableau de bord des agents a un libellé générique', () => {
    const g = lire('src/app/comptes/[slug]/GestionAgents.tsx')
    expect(g).toMatch(motifTexte('>Agents du service client</h2>'))
    expect(g).toMatch(motifTexte("{envoi ? 'Envoi…' : 'Nommer un agent'}"))
  })
  it('chaque fonction de mots exige l’institution (impossible de l’oublier à un appel)', () => {
    for (const f of ['espace/motsProfil.ts', 'espace/motsMessages.ts', 'espace-client/motsEspace.ts', 'acces/libelles.ts', 'appels-offres/motsPostuler.ts']) {
      expect(lire(`src/app/sites/[slug]/${f}`), f).toMatch(/export\sfunction\smots\w+\(lang:\s*string\s*\|\s*null\s*\|\s*undefined,\s*inst:\s*Institution\)/u)
    }
  })
})
