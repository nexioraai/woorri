/**
 * LES SECRETS N'ENTRENT PAS DANS LE NAVIGATEUR — deux angles morts fermés (2026-11-20).
 *
 * MESURÉ le 2026-11-20 (décision du propriétaire : « ferme-les ») :
 *
 *   ① 57 fichiers lisaient une variable secrète (clé de service, jeton, secret
 *      de webhook…) SANS porter `import 'server-only'`. Aucun n'était atteint
 *      par le navigateur, mais DEBT-081 ne les voyait pas : il ne cherche que
 *      la marque. Ils la portent tous désormais, et ce fichier exige qu'un
 *      nouveau lecteur de secret la porte aussi.
 *
 *   ② DEBT-081 ne suit pas les imports chargés à la demande (`import('…')`).
 *      Mesuré : `lib/apps/journal.ts` charge `supabase-admin` ainsi. Ce fichier
 *      les suit.
 *
 * CE QUI COMPTE COMME UN LIEN : un import qui EMPORTE du code — statique ou
 * chargé à la demande. Un `import type` / `export type` est effacé à la
 * compilation : il n'emporte rien et n'est pas suivi (mesuré : le paquet
 * client de la gate ne contient aucune trace de supabase-admin malgré deux
 * imports de type qui y mènent). DEBT-081, plus prudent, continue de les
 * compter : les deux cliquets se complètent.
 *
 * CE QU'IL NE VOIT PAS, dit plutôt que caché : un secret lu par un autre
 * moyen que `process.env.NOM` (destructuration, `process.env[nom]`), et les
 * paquets npm (hors du graphe de `src/`). Le dernier filet reste `next build`.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const SRC = join(__dirname, '..', '..', '..')
const tous: string[] = []
;(function parcourir(d: string) {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') parcourir(p) }
    else if (/\.tsx?$/u.test(e) && !/\.test\.tsx?$/u.test(e)) tous.push(p)
  }
})(SRC)

const lire = (f: string) => readFileSync(f, 'utf8')
const rel = (f: string) => f.slice(SRC.length + 1)

/** Une variable secrète : jamais `NEXT_PUBLIC_`, et un nom de secret. */
const SECRET = /process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|TOKEN|_KEY)\b/u
const MARQUE = /^\s*import\s+['"]server-only['"]/mu
const CLIENT = /^\s*['"]use client['"]/mu

function resoudre(depuis: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(depuis), spec)
  else return null
  for (const s of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    const c = base + s
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}

const STATIQUE = /(?:^|\n)\s*(import|export)(\s+type)?[\s\S]*?from\s*['"]([^'"]+)['"]/gu
const DYNAMIQUE = /import\(\s*['"]([^'"]+)['"]\s*\)/gu

/** Les imports qui EMPORTENT du code : statiques (hors `type`) et à la demande. */
export function liens(f: string): { cible: string; dynamique: boolean }[] {
  const s = lire(f)
  const out: { cible: string; dynamique: boolean }[] = []
  for (const m of s.matchAll(STATIQUE)) {
    if (m[2] !== undefined) continue // `import type` / `export type` : effacé
    const c = resoudre(f, m[3] as string)
    if (c) out.push({ cible: c, dynamique: false })
  }
  for (const m of s.matchAll(DYNAMIQUE)) {
    const c = resoudre(f, m[1] as string)
    if (c) out.push({ cible: c, dynamique: true })
  }
  return out
}

const clients = tous.filter((f) => CLIENT.test(lire(f)))

describe('les secrets n’entrent pas dans le navigateur', () => {
  it('le dénominateur est réel, et l’import à la demande est VU (journal.ts → supabase-admin)', () => {
    expect(clients.length).toBeGreaterThan(100)
    const journal = join(SRC, 'lib', 'apps', 'journal.ts')
    const admin = join(SRC, 'lib', 'supabase-admin.ts')
    expect(liens(journal).some((l) => l.cible === admin && l.dynamique), 'le détecteur ne voit plus les import() dynamiques').toBe(true)
  })

  it('① tout fichier qui lit une variable secrète porte `import \'server-only\'`', () => {
    const sansMarque = tous.filter((f) => SECRET.test(lire(f)) && !MARQUE.test(lire(f))).map(rel)
    expect(sansMarque, `lecteur(s) de secret sans la marque « serveur seulement » :\n  ${sansMarque.join('\n  ')}`).toEqual([])
  })

  it('② aucun fichier client n’atteint un fichier « serveur seulement », imports à la demande compris', () => {
    const fautes: string[] = []
    for (const c of clients) {
      const vus = new Set<string>()
      const pile: { f: string; via: string[] }[] = [{ f: c, via: [rel(c)] }]
      while (pile.length > 0) {
        const { f, via } = pile.pop() as { f: string; via: string[] }
        if (vus.has(f)) continue
        vus.add(f)
        if (f !== c && (MARQUE.test(lire(f)) || SECRET.test(lire(f)))) { fautes.push(via.join(' → ')); continue }
        for (const l of liens(f)) if (!vus.has(l.cible)) pile.push({ f: l.cible, via: [...via, rel(l.cible) + (l.dynamique ? ' (à la demande)' : '')] })
      }
    }
    expect(fautes, `chemin(s) du navigateur vers un secret :\n  ${fautes.join('\n  ')}`).toEqual([])
  })
})
