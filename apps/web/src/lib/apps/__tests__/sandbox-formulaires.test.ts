/**
 * LES FORMULAIRES D'UNE APPLI GÉNÉRÉE S'ENVOIENT, PARTOUT OÙ ELLE TOURNE (2026-11-28).
 *
 * MESURÉ sur « Suivi de colis », A/B dans un vrai Chromium avec la page servie
 * et sa CSP : sans `allow-forms`, « Blocked form submission … 'allow-forms'
 * permission is not set » — le gestionnaire `onSubmit` ne s'exécute jamais, la
 * recherche publique n'affiche rien. Avec `allow-forms` (et `form-action
 * 'none'` gardé), elle affiche « En transit · N'Djaména ». WebKit envoyait :
 * c'est pourquoi la gestion marchait dans Safari et rien ne marchait dans
 * Chrome ni sur Android.
 *
 * ① l'en-tête des applis publiées et celui des pages par lien portent
 *   `allow-forms`, et `form-action 'none'` reste posé ;
 * ② CLIQUET DE CLASSE : toute déclaration `sandbox` du code qui laisse tourner
 *   des scripts porte aussi `allow-forms` — un cadre neuf ne peut pas rouvrir
 *   le défaut par un autre chemin.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSP_PAGE_PUBLIEE, entetesSousDomaine } from '../publication'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')

const sources = (dossier: string): string[] => {
  const out: string[] = []
  for (const n of readdirSync(dossier)) {
    const p = join(dossier, n)
    if (statSync(p).isDirectory()) { if (n !== '__tests__' && n !== 'node_modules') out.push(...sources(p)) }
    else if (/\.(?:ts|tsx|mjs)$/u.test(n) && !/\.test\.tsx?$/u.test(n)) out.push(p)
  }
  return out
}

describe('les formulaires des applis générées', () => {
  it('① publiée et par lien : allow-forms, et form-action none gardé', () => {
    const sousDomaine = entetesSousDomaine('https://psxbilpmnojtlzosokzz.supabase.co')['Content-Security-Policy'] ?? ''
    for (const csp of [sousDomaine, CSP_PAGE_PUBLIEE]) {
      const sandbox = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('sandbox')) ?? ''
      expect(sandbox.split(/\s+/u)).toContain('allow-forms')
      expect(csp).toMatch(motifTexte("form-action 'none'"))
    }
  })

  it('② toute déclaration sandbox qui laisse tourner des scripts porte allow-forms', () => {
    const fautives: string[] = []
    let vues = 0
    for (const f of sources(SRC)) {
      // Les commentaires et la prose entre accents graves PARLENT d'un cadre,
      // ils n'en déclarent pas : seul le code compte.
      const texte = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//gu, '')
        .replace(/^\s*\/\/.*$/gmu, '')
      for (const m of texte.matchAll(/(?<!`)sandbox(?:=["']|\s+)(allow-[a-z-]+(?:\s+allow-[a-z-]+)*)/gu)) {
        const permissions = (m[1] ?? '').split(/\s+/u)
        if (!permissions.includes('allow-scripts')) continue
        vues += 1
        if (!permissions.includes('allow-forms')) fautives.push(`${f.slice(SRC.length + 1)} : ${m[0]}`)
      }
    }
    expect(vues, 'le balayage ne trouve plus aucun cadre : il est cassé').toBeGreaterThanOrEqual(9)
    expect(fautives, 'un cadre fait tourner une appli sans pouvoir envoyer ses formulaires').toEqual([])
  })
})
