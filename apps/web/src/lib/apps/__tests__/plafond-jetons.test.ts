/**
 * CLIQUET — LE PLAFOND DU SITE EST CELUI DE LA CAMPAGNE.
 *
 * ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE.
 *
 * Le site tirait à 9000 jetons, la campagne à 40000. Un modèle métier riche
 * — une marketplace avec ses acteurs, ses états de commande, ses parcours —
 * dépasse le premier et pas le second. Mesuré par le propriétaire, EN LIGNE,
 * au second tour de sa conversation : le premier message passait, le second,
 * plus précis, était coupé.
 *
 * Deux plafonds qui divergent produisent un défaut invisible aux demandes
 * courtes — c'est-à-dire à tous les essais qu'on fait soi-même.
 *
 * ── ET LE SIGNAL QUI NE REMONTAIT PAS.
 *
 * Le juge attend la troncature sous `meta.tronquee`. Je lui passais une
 * variable `meta` que `lireReponse` ne rend pas : la garde était toujours
 * fausse, et une sortie COUPÉE était rapportée « sortie non parsable ». Le
 * dépôt avait déjà payé ce défaut (D-078) et l'avait écrit en toutes lettres.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLAFOND_JETONS } from '../comprendre'
import { direALUtilisateur } from '../pour'
import { sansCommentaires } from './sans-commentaires'

const RACINE = join(process.cwd(), '..', '..')
const lire = (p: string): string => readFileSync(join(RACINE, p), 'utf8')

describe('CLIQUET — le plafond de jetons', () => {
  it('le site n est JAMAIS plus etroit que la campagne', () => {
    // PREMIERE VERSION DE CE TEST : j'exigeais l'EGALITE avec la campagne.
    // C'etait lier le site a un chiffre herite — et le proprietaire a eu
    // raison de demander a quoi il servait. La campagne tire a 40000 pour ses
    // propres raisons de budget ; le site, lui, sert des gens qui decrivent
    // une application entiere. Ce qui compte n'est pas l'egalite, c'est que
    // le site ne soit jamais le plus etroit des deux.
    const campagne = /^const MAX_TOKENS = (\d+);$/mu.exec(lire('benchmarks/air-emission/emit-v3.mjs'))
    expect(campagne, 'MAX_TOKENS introuvable dans emit-v3.mjs').not.toBeNull()
    expect(PLAFOND_JETONS).toBeGreaterThanOrEqual(Number(campagne![1]))
  })

  it('le plafond est celui du MODELE, mesure, pas un chiffre choisi', () => {
    // Demande a l'API, qui repond en 400 donc sans rien facturer :
    //   « max_tokens: 999999 > 128000, which is the maximum allowed number
    //     of output tokens for claude-opus-5 »
    // Le generateur n'a donc plus de plafond A LUI : aucune application ne
    // sera coupee par une borne que j'aurais choisie.
    expect(PLAFOND_JETONS).toBe(128_000)
    const src = lire('apps/web/src/lib/apps/comprendre.ts')
    // La mesure est CONSIGNEE : un nombre nu se reecrirait sans preuve.
    expect(src).toContain('req_011CfpVM6K6gxenpSx4o6LrA')
    // Et le modele mesure est bien celui que l'adaptateur appelle.
    expect(lire('benchmarks/air-emission/adaptateur-anthropic.mjs')).toContain('model: "claude-opus-5"')
  })

  it('le plafond est reellement passe a l appel', () => {
    // LE CODE SEUL : la mesure de l'API est CITEE en commentaire, et elle
    // contient « max_tokens: 999999 ». Le test butait sur sa propre preuve —
    // quatrieme fois que ce piege se referme dans ce depot.
    const src = sansCommentaires(lire('apps/web/src/lib/apps/comprendre.ts'))
    expect(src).toContain('max_tokens: PLAFOND_JETONS')
    // Le nombre nu ne doit plus apparaitre dans l'appel : c'est par la qu'il
    // divergerait sans que personne le voie.
    expect(src).not.toMatch(/max_tokens:\s*\d/u)
  })
})

describe('CLIQUET — le signal de troncature arrive jusqu au juge', () => {
  const ADAPTATEUR = lire('benchmarks/air-emission/adaptateur-anthropic.mjs')
  const COMPRENDRE = lire('apps/web/src/lib/apps/comprendre.ts')

  it("`lireReponse` rend bien `tronquee`, et c'est ce qu'on lit", () => {
    // La forme est RELEVÉE dans l'adaptateur, pas supposée. C'est l'écart
    // entre la forme supposée (`meta`) et la vraie qui a produit le défaut.
    expect(ADAPTATEUR).toMatch(/tronquee:\s*reponse\.stop_reason === "max_tokens"/u)
    expect(COMPRENDRE).toContain('const { texte, tronquee, refusee } = adaptateur.lireReponse(reponse)')
  })

  it('le juge recoit la troncature sous la forme qu il attend', () => {
    // `jugerSortieP0` teste `meta?.tronquee === true`. Lui passer autre chose
    // qu'un objet portant ce champ desarme la garde en silence.
    expect(lire('benchmarks/air-emission/passe0.mjs')).toContain('meta?.tronquee === true')
    expect(COMPRENDRE).toContain('passe0.jugerSortieP0(texte, propre, { tronquee })')
  })

  it('une sortie coupee se NOMME, elle ne devient pas un JSON casse', async () => {
    // LE CONTROLE DE BOUT EN BOUT, avec le VRAI juge — pas une imitation.
    // Un JSON tronque est exactement ce que le propriétaire a vu : du texte
    // qui s'arrete au milieu.
    const { jugerSortieP0 } = (await import(
      join(RACINE, 'benchmarks/air-emission/passe0.mjs')
    )) as {
      jugerSortieP0: (
        t: string,
        b: string,
        m: unknown,
      ) => { ok: boolean; diagnostics?: { code?: string }[] }
    }
    const coupe = '{"version":"modele-metier/1.2.0","acteurs":[{"id":"act_a","nom":"Vend'

    // AVEC le signal : la cause est nommee pour ce qu'elle est.
    const avec = jugerSortieP0(coupe, 'une marketplace', { tronquee: true })
    expect(avec.ok).toBe(false)
    expect(avec.diagnostics?.[0]?.code).toBe('P0_SORTIE_TRONQUEE')

    // SANS le signal — l'etat dans lequel j'avais laisse le site : le MEME
    // texte est rapporte comme un JSON casse. C'est exactement le message
    // que le propriétaire a lu a l'ecran.
    const sans = jugerSortieP0(coupe, 'une marketplace', undefined)
    expect(sans.diagnostics?.[0]?.code).toBe('P0_SORTIE_NON_JSON')
  })
})

describe('CLIQUET — l ecran ne parle JAMAIS le vocabulaire du moteur', () => {
  // Ce que le propriétaire a lu : « sortie non parsable (1 defaut(s) de
  // production) ». Exact, et incomprehensible — il ne peut rien en faire.
  // EP-136 pose la regle pour les questions ; elle vaut pour un echec.
  const INTERDITS = [
    'P0_',
    'MODELE_',
    'parsable',
    'instrument',
    'tirage',
    'diagnostic',
    'defaut(s) de production',
    'couverture.',
    'stop_reason',
  ]

  for (const code of ['P0_SORTIE_TRONQUEE', 'P0_SORTIE_NON_JSON', 'P0_REPONSE_REFUSEE', 'MODELE_SCHEMA']) {
    it(`« ${code} » devient une phrase lisible`, () => {
      const phrase = direALUtilisateur([{ code, path: 'couverture.nonRetenus[0]', message: 'x' }])
      for (const mot of INTERDITS) expect(phrase, `${code} laisse passer « ${mot} »`).not.toContain(mot)
      // Et elle DIT de quel cote est le defaut : sans cela, l utilisateur
      // reecrit sa phrase en pensant s etre mal exprime.
      expect(phrase).toContain('de mon côté')
    })
  }

  it('la troncature dit QUOI FAIRE, pas seulement que ca a rate', () => {
    const phrase = direALUtilisateur([{ code: 'P0_SORTIE_TRONQUEE' }])
    expect(phrase).toContain('deux messages')
  })
})

describe('CLIQUET — l appel est STREAME, et les routes ont le temps', () => {
  const COMPRENDRE = sansCommentaires(lire('apps/web/src/lib/apps/comprendre.ts'))

  it('le SDK refuse un appel non streame au-dela de 21 333 jetons', () => {
    // MESURE, a cout nul (erreur levee cote client, aucune requete ne part) :
    //   plafond maximum SANS streaming : 21 333
    //   40 000 (la campagne) et 128 000 (le maximum) : refuses
    // J avais pousse 128 000 en production sans un seul vrai tir — la lecture
    // par IA etait morte depuis ce commit. Ce test interdit le retour en
    // arriere : avec ce plafond, l appel DOIT etre streame.
    expect(PLAFOND_JETONS).toBeGreaterThan(21_333)
    expect(COMPRENDRE).toContain('.stream(')
    expect(COMPRENDRE).toContain('.finalMessage()')
    expect(COMPRENDRE).not.toMatch(/client\.messages\.create\(/u)
  })

  it('les trois routes laissent le temps a la lecture', () => {
    // MESURE : 96 SECONDES pour la marketplace du proprietaire. `comprendre`
    // coupait a 120, `apercu` a 120, `produire` a 60 — et les deux dernieres
    // relisent la phrase quand aucun document ne leur est fourni.
    for (const r of ['comprendre', 'apercu', 'produire']) {
      const src = sansCommentaires(lire(`apps/web/src/app/api/generateur/${r}/route.ts`))
      const m = /maxDuration = (\d+)/u.exec(src)
      expect(m, r).not.toBeNull()
      expect(Number(m![1]), `${r} doit laisser au moins le double des 96 s mesurees`).toBeGreaterThanOrEqual(200)
    }
  })
})
