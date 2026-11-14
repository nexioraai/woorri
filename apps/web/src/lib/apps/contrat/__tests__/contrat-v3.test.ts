// V3 · LES TREIZE ARCHÉTYPES — ce qui se juge sans navigateur (gate vitest).
//
//   ① le catalogue porte EXACTEMENT les treize archétypes, l'accueil et la
//      gestion d'une table compris ; chaque slot déclare son genre, s'il est
//      requis, et — pour une liste — sa cardinalité ; aucun nom de slot n'est
//      un attribut du web ;
//   ② chaque remplissage du témoin suit son archétype, et CHAQUE écran produit
//      passe le validateur du contrat (couches 1 et 2), sans un refus ;
//   ③ un remplissage faux est refusé par sa classe : archétype inconnu (avec le
//      plus proche), slot inconnu, slot manquant, mauvais type, cardinalité ;
//   ④ la compilation pose sur chaque texte sa clé FABRIQUÉE, et le
//      dictionnaire de chaque langue lue en porte une traduction ;
//   ⑤ le moteur n'écrit aucune propriété physique (left/right, marges et
//      remplissages gauche/droite) : la droite-à-gauche vient des propriétés
//      logiques ; et sa cible minimale vaut 48.
// Rouge-puis-vert : le refus de cardinalité retiré → ③ rouge ; un
// `paddingLeft` dans le moteur → ⑤ rouge.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ARCHETYPES, NOMS_ARCHETYPES, validerRemplissage } from '../archetypes'
import { textesDe } from '../textes'
import { validerFragment } from '../validateur'
import { motifTexte } from '../../__tests__/motif-texte'
import { CTX, REMPLISSAGES, appTemoin, specTemoin } from './temoin-v3'

describe('V3 · les archétypes', () => {
  it('① treize archétypes, des slots déclarés', () => {
    expect(NOMS_ARCHETYPES).toEqual(['auth', 'onboarding', 'accueil', 'liste', 'recherche', 'detail', 'formulaire', 'checkout', 'confirmation', 'profil', 'compte', 'dashboard', 'tableAdmin'])
    const LISTES = ['colonnes', 'liens', 'champs', 'textes', 'noeuds']
    for (const [a, def] of Object.entries(ARCHETYPES)) {
      for (const [k, d] of Object.entries(def.slots)) {
        expect(typeof d.requis, `${a}.${k}`).toBe('boolean')
        if (LISTES.includes(d.genre)) expect([d.min, d.max].every((x) => typeof x === 'number'), `${a}.${k} : cardinalité`).toBe(true)
        expect(['className', 'style', 'onClick', 'href', 'left', 'right', 'id'].includes(k), `${a}.${k}`).toBe(false)
      }
    }
  })

  it('② chaque remplissage du témoin est valide, et chaque écran produit passe le contrat', () => {
    const spec = specTemoin()
    for (const r of REMPLISSAGES) expect(validerRemplissage(r), r.route).toEqual([])
    for (const e of spec.ecrans) {
      const v = validerFragment({ ecran: e, traductions: spec.traductions }, CTX, { complet: true })
      expect(v.refus.map((x) => `${x.classe} · ${x.chemin} · ${x.quoi}`), String((e as { route: string }).route)).toEqual([])
      expect(v.zodOk, String((e as { route: string }).route)).toBe(true)
    }
    expect(spec.ecrans).toHaveLength(REMPLISSAGES.length)
  })

  it('③ un remplissage faux est refusé par sa classe', () => {
    const base = REMPLISSAGES.find((r) => r.archetype === 'liste')!
    const classes = (r: typeof base) => validerRemplissage(r).map((x) => [x.classe, x.slot, x.proche])
    expect(classes({ ...base, archetype: 'table-admin' })).toEqual([['ARCHETYPE_INCONNU', '', 'tableAdmin']])
    expect(classes({ ...base, slots: { ...base.slots, colonne: 'nom' } })).toEqual([['SLOT_INCONNU', 'colonne', 'colonnes']])
    const sansVide = Object.fromEntries(Object.entries(base.slots).filter(([k]) => k !== 'vide'))
    expect(classes({ ...base, slots: sansVide })).toEqual([['SLOT_MANQUANT', 'vide', null]])
    expect(classes({ ...base, slots: { ...base.slots, detail: 'Détail Offre' } })).toEqual([['SLOT_TYPE', 'detail', null]])
    expect(classes({ ...base, slots: { ...base.slots, colonnes: Array.from({ length: 7 }, (_x, i) => ({ colonne: `c${String(i)}`, libelle: 'x' })) } })).toEqual([['SLOT_CARDINALITE', 'colonnes', null]])
    const onboarding = REMPLISSAGES.find((r) => r.archetype === 'onboarding')!
    expect(classes({ ...onboarding, slots: { ...onboarding.slots, etapes: [{ composant: 'Bouton', libelle: 'x', effets: [] }] } })).toEqual([['SLOT_TYPE', 'etapes', null]])
    const auth = REMPLISSAGES.find((r) => r.archetype === 'auth')!
    expect(classes({ ...auth, slots: { ...auth.slots, natureIdentifiant: 'pseudo' } })).toEqual([['SLOT_TYPE', 'natureIdentifiant', null]])
  })

  it('④ chaque texte compilé porte sa clé fabriquée, traduite dans chaque langue', () => {
    const spec = specTemoin()
    const app = appTemoin()
    let n = 0
    app.ecrans.forEach((e, i) => {
      const textes = textesDe(spec.ecrans[i])
      for (const t of textes) {
        const compile = t.chemin.replace(/\[(\d+)\]/gu, '.$1').split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], e) as { $k: string; $t: string }
        expect(compile, t.chemin).toEqual({ $k: t.cle, $t: t.texte })
        for (const l of ['en', 'ar']) expect(app.dictionnaires[l]?.[t.cle], `${l} · ${t.cle}`).toBeDefined()
        n += 1
      }
    })
    // Mesuré : 143 textes dans le témoin.
    expect(n).toBeGreaterThan(140)
  })

  it('⑥ le moteur est ÉMIS, jamais exécuté par Deribfy : aucun module ne l’importe autrement qu’en type', () => {
    const racine = join(__dirname, '..', '..', '..', '..')
    const fautifs: string[] = []
    const marcher = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== '__tests__' && n !== 'rendu') marcher(p); continue }
        if (!/\.(tsx?|mjs)$/u.test(n) || /\.(test|navigateur|tir)\.tsx?$/u.test(n)) continue
        // Un import à la fois : sans `;` dans le code, `[^;]*?` traversait les imports précédents (faux positif mesuré sur generation.ts).
        for (const m of readFileSync(p, 'utf8').matchAll(/^import\s+(type\s+)?(?:(?!^import\b)[^;])*?from\s+['"]([^'"]*rendu\/(?:moteur|donnees|textes-systeme|base))['"]/gmu)) {
          if (m[1] === undefined) fautifs.push(`${relative(racine, p)} → ${m[2]!}`)
        }
      }
    }
    marcher(racine)
    expect(fautifs).toEqual([])
  })

  it('⑤ le moteur n’écrit aucune propriété physique ; sa cible minimale vaut 48', () => {
    const source = readFileSync(join(__dirname, '..', 'rendu', 'moteur.tsx'), 'utf8')
    expect(source.match(/\b(?:padding|margin|border)(?:Left|Right)\b|textAlign:\s*'(?:left|right)'|[{,\s](?:left|right):\s/gu) ?? []).toEqual([])
    expect(source).toMatch(motifTexte('const CIBLE = 48'))
  })
})
