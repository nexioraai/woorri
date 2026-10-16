/**
 * CLIQUET — UNE DEPENSE LAISSE TOUJOURS UNE TRACE, ET SA BASE.
 *
 * Ecrit APRES la perte, et contre elle. Le 2026-10-10, une generation reelle
 * a coute 16,03 $ et 53 minutes pour 1 252 757 jetons d'entree. Le moteur l'a
 * refusee, et la ligne synchrone a tout jete : `document = null`,
 * `sections_acquises = {}`, trois diagnostics reduits a « SCHEMA » sans le
 * moindre chemin. Rien a examiner, rien a reprendre, tout a repayer.
 *
 * ── CE QUI SE JOUE ICI, ET QUI N'EST PAS EVIDENT.
 *
 * Le chemin ASYNCHRONE avait deja tranche, et en l'ecrivant : un refus n'a
 * pas d'oeuvre a livrer (la contrainte `livree_a_document` le dit), mais il a
 * une BASE, et c'est elle qui evite de tout repayer. Elle vit donc dans
 * `sections_acquises.acquis`, pas dans `document`.
 *
 * Ma premiere correction rangeait la base DANS `document` — une seconde
 * convention pour la meme chose. Deux rangements, c'est pire que n'importe
 * lequel des deux : un lecteur ne sait plus ou chercher. Ces tests tiennent
 * l'UNIQUE convention, et le fait que les deux ecrivains la partagent.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sansCommentaires } from './sans-commentaires'
import { codeEtChemin, diagnosticsDepuisLigne } from '../journal'

const SRC = join(__dirname, '..', '..', '..')
const lire = (...p: string[]): string => sansCommentaires(readFileSync(join(SRC, ...p), 'utf8'))

const POUR = lire('lib', 'apps', 'pour.ts')
const JOURNAL = lire('lib', 'apps', 'journal.ts')
const TRAVAILLEUR = lire('lib', 'apps', 'travailleur.ts')

describe('le produit du moteur est GARDE — au MEME endroit des deux côtés', () => {
  // ── CE QUI A CHANGE LE 2026-10-16, ET CE QUI NE CHANGE PAS.
  //
  // L'invariant de ce fichier n'a jamais ete « acquis » : c'est « une depense
  // laisse toujours une trace, et au MEME endroit des deux cotes ». Le
  // rangement, lui, a change — et c'est une decision, pas une derive.
  //
  // AVANT : un seul diagnostic restant suffisait a mettre `document: null`.
  // L'oeuvre existait et on la detruisait. Douze generations sur CONTERAK,
  // ~29 $, et jamais une application a l'ecran.
  //
  // DEPUIS : le produit va dans `document`, des deux cotes. Les juges
  // gardent la parole — `ok` porte leur verdict exact — mais perdent le
  // veto. `acquis` ne garde plus que ce qui n'est PAS livrable.
  it('le journal synchrone range le produit dans `document`, toujours', () => {
    expect(JOURNAL).toContain('document: l.document ?? null')
    // Et il ne le conditionne PLUS au verdict des juges.
    expect(JOURNAL).not.toMatch(/document:\s*l\.ok\s*\?/u)
  })

  it('le travailleur range au même endroit — c’est lui la référence', () => {
    expect(TRAVAILLEUR).toContain('document: oeuvre')
    expect(TRAVAILLEUR).not.toMatch(/document:\s*res\.ok\s*\?/u)
  })

  it('« LIVREE » veut dire TELECHARGEABLE — on parse avant de promettre', () => {
    // Promettre une application qu'on ne peut pas prendre serait pire qu'un
    // refus franc : la route de livraison parse et rend 500. Les DEUX
    // ecrivains parsent donc avant d'ecrire le statut.
    expect(TRAVAILLEUR).toContain('projectAirSchema.safeParse')
    expect(JOURNAL).toContain('projectAirSchema.safeParse')
  })

  it('ce qui n’est PAS livrable survit quand même, pour la reprise', () => {
    // Une base illisible n'est pas une oeuvre, mais elle evite de tout
    // repayer : elle reste dans `acquis`.
    expect(TRAVAILLEUR).toContain('acquis: brut')
  })

  it('le moteur rend son produit même en refusant, et on le transmet', () => {
    // Sans cette ligne, il n'y a rien a ranger : c'est la source de tout.
    expect(POUR).toContain('document: emission.document')
    expect(POUR).not.toMatch(/document:\s*emission\.ok\s*\?/u)
  })

  it('le journal reçoit aussi de quoi instruire le refus', () => {
    for (const champ of ['modele:', 'tiragesDetail:', 'raison:']) {
      expect(POUR).toContain(champ)
    }
  })
})

describe('« CODE@chemin » n’existe qu’à UN seul endroit', () => {
  it('la fonction fait ce qu’elle promet', () => {
    expect(codeEtChemin({ code: 'SCHEMA', path: 'entities[2].fields[0]' })).toBe(
      'SCHEMA@entities[2].fields[0]',
    )
    // Chemin vide — le cas exact d'une clé inconnue : le code reste seul.
    expect(codeEtChemin({ code: 'SCHEMA', path: '' })).toBe('SCHEMA')
    expect(codeEtChemin({ code: 'SCHEMA' })).toBe('SCHEMA')
    expect(codeEtChemin({ path: 'x' })).toBe('?@x')
    // Borne : il localise, il ne transporte pas un document.
    expect(codeEtChemin({ code: 'C', path: 'a'.repeat(500) })).toHaveLength(2 + 120)
  })

  it('les DEUX écrivains l’appellent au lieu de la recopier', () => {
    expect(TRAVAILLEUR).toContain('res.diagnostics.map(codeEtChemin)')
    expect(POUR).toContain('emission.diagnostics.map(codeEtChemin)')
    // La forme recopiee a la main est interdite chez les deux : c'est elle
    // qui aurait diverge.
    for (const fichier of [TRAVAILLEUR, POUR]) {
      expect(fichier).not.toMatch(/slice\(0,\s*120\)/u)
    }
  })

  it('la raison OUVRE la liste des deux côtés', () => {
    expect(JOURNAL).toMatch(/!l\.ok && l\.raison !== undefined\s*\? \[l\.raison/u)
    expect(TRAVAILLEUR).toMatch(/!res\.ok && res\.raison !== undefined \? \[res\.raison/u)
  })
})

describe('une écriture de journal qui échoue ne peut plus se taire', () => {
  it('les TROIS insertions regardent la valeur rendue', () => {
    // `supabase-js` rend `{ error }` : ne pas la lire, c'est ne rien savoir.
    // Mesure : trois appels payants, UNE seule ligne enregistree.
    const vues = JOURNAL.match(/const \{ error \} = await supabaseAdmin\.from\(/gu) ?? []
    expect(vues).toHaveLength(3)
  })

  it('chaque table est nommée dans un signalement', () => {
    expect(JOURNAL).toContain("direLEchecDEcriture('ai_usage_log'")
    expect(JOURNAL).toContain("direLEchecDEcriture('ai_usage_log (orpheline)'")
  })

  it('plus aucun catch muet', () => {
    expect(JOURNAL).not.toMatch(/\}\s*catch\s*\{\s*\}/u)
    // Les seuls `catch` sans liaison sont les deux imports du client :
    // ils n'ont rien a signaler, ils rendent la main.
    expect((JOURNAL.match(/catch\s*\{/gu) ?? [])).toHaveLength(2)
  })

  it('le signalement part au SERVEUR, jamais vers l’écran', () => {
    expect(JOURNAL).toContain('console.error')
    expect(JOURNAL).not.toMatch(/credit balance|Plans & Billing|anthropic-ratelimit/iu)
  })
})

describe('le chemin retour — relire ce que la ligne a gardé', () => {
  it('reconstruit code et chemin', () => {
    expect(diagnosticsDepuisLigne(['SCHEMA@entities[2].fields[0]'])).toEqual([
      { code: 'SCHEMA', path: 'entities[2].fields[0]' },
    ])
    expect(diagnosticsDepuisLigne(['SCHEMA'])).toEqual([{ code: 'SCHEMA' }])
  })

  it('IGNORE la raison en français qui ouvre la liste d’un refus', () => {
    // La forme exacte vue en base le 2026-10-10. Fabriquer une question a
    // partir de cette phrase serait pire qu'une question manquante.
    const ligne = ['stagnation au tour 2 : 3 → 3 diagnostic(s)', 'SCHEMA@a.b', 'SCHEMA@c']
    expect(diagnosticsDepuisLigne(ligne)).toEqual([
      { code: 'SCHEMA', path: 'a.b' },
      { code: 'SCHEMA', path: 'c' },
    ])
  })

  it('survit à l’aller-retour, quel que soit le diagnostic', () => {
    for (const d of [
      { code: 'SCHEMA', path: 'entities[0]' },
      { code: 'AIR_IMAGE_ORPHELINE' },
      { code: 'A_B_2', path: 'x@y' },
    ]) {
      expect(diagnosticsDepuisLigne([codeEtChemin(d)])[0]).toEqual(d)
    }
  })

  it('ne se laisse pas prendre par une phrase contenant une arobase', () => {
    expect(diagnosticsDepuisLigne(['écrivez à moi@exemple.fr'])).toEqual([])
  })
})
