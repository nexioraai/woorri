/**
 * EP-284 — UNE BORNE JUSTE POUR UN MODÈLE EST FAUSSE POUR LE SUIVANT.
 *
 * ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-10-30.
 *
 * Première boutique en mode 2 après la migration de fournisseur :
 *
 *     failure_type = json_parse · stop_reason = MAX_TOKENS
 *     « Unterminated string in JSON at position 4025 »
 *     fin du brut : "Nous acceptons les cartes de crédit   ← coupé net
 *
 * Ce n'était pas un JSON mal formé : c'était un JSON INTERROMPU. L'écran, lui,
 * disait « La génération IA a produit un résultat invalide » — il accusait le
 * modèle là où c'était notre borne qui coupait.
 *
 * ── POURQUOI 8 000 NE SUFFISAIT PLUS, ALORS QU'IL SUFFISAIT AVANT.
 *
 * 8 000 avait été calibré sur `claude-haiku` (mesure d'époque : 4 227 et
 * 4 416 jetons en succès). Le nouveau fournisseur rend ses réponses en DEUX
 * blocs — `thinking` puis `text` — et LA RÉFLEXION EST FACTURÉE SUR
 * `max_tokens`. Mesuré :
 *
 *     deepseek-flash  max=150, une image  → blocs [thinking] SEUL, texte VIDE
 *     deepseek-flash  max=250, texte      → blocs [thinking, text]
 *
 * Toute borne héritée de l'ancien fournisseur est donc trop basse d'un
 * budget de réflexion que personne n'avait prévu.
 *
 * ── ET UNE SECONDE CHOSE, QUI N'ÉTAIT PAS UN BOGUE MAIS UN TROU.
 *
 * SEPT routes enregistrent leur consommation — blog, catalogue, marketing,
 * agent. La génération de SITE, celle que le produit vend, ne l'a jamais
 * fait : `ai_usage_log` comptait 14 lignes et PAS UNE génération de site.
 *
 * À la question « combien coûte un site en mode 1, 2, 3 ? », la seule
 * réponse honnête était « je ne sais pas ». Les jetons étaient dans la
 * réponse ; personne ne les rangeait.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = readFileSync(join(__dirname, '..', 'route.ts'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')

describe('EP-284 · la borne tient compte de la réflexion', () => {
  it('① LA BORNE PRINCIPALE EST AU-DESSUS DE CE QUI A COUPÉ', () => {
    const m = CODE.match(/MAIN_MAX_TOKENS\s*=\s*([0-9_]+)/u)
    expect(m, 'la borne principale a disparu').not.toBeNull()
    const borne = Number((m?.[1] ?? '0').replace(/_/gu, ''))
    // 8 000 EST LA VALEUR QUI A COUPÉ UNE BOUTIQUE MODE 2. Toute valeur de
    // cet ordre reproduirait le défaut mesuré.
    expect(borne, 'cette borne a déjà coupé une boutique mode 2 en production').toBeGreaterThan(
      8_000,
    )
    // Et jamais au-dessus du plafond réel de l'API — mesuré : 393 216.
    // Au-delà, l'appel est un 400 et le tir est perdu avant d'émettre.
    expect(borne, 'au-delà du plafond de l’API, chaque appel est un 400').toBeLessThanOrEqual(
      393_216,
    )
  })

  it('② LA COUPURE SE DIT, elle ne se cache pas derrière « invalide »', () => {
    // ── CE QUI SE PASSE SANS CELA.
    //
    // Un JSON tronqué et un JSON fautif ne se réparent pas pareil : l'un
    // demande une borne plus haute, l'autre un modèle qui écrit mieux. Les
    // confondre a déjà coûté deux nuits sur l'autre moteur, où le compilateur
    // disait « Expected } but found EOF » et où je lisais « mauvais code ».
    // ── MA PREMIÈRE VERSION DE CE CONTRÔLE NE MORDAIT PAS.
    //
    // Elle cherchait `stop_reason === 'max_tokens'` DANS TOUT LE FICHIER. Or
    // ce test existe DEUX fois : ici, et dans la relance. Débrancher le
    // message laissait l'autre occurrence satisfaire le contrôle. La
    // mutation M148 est passée au vert contre du vide.
    //
    // On regarde donc la PHRASE, et ce qui la décide juste au-dessus.
    const i = SRC.indexOf('coupée avant la fin')
    expect(i, 'la coupure n’est pas nommée à la personne').toBeGreaterThan(-1)
    expect(
      SRC.slice(Math.max(0, i - 260), i),
      'la phrase de coupure n’est plus décidée par le motif d’arrêt : elle ' +
        's’afficherait toujours, ou jamais',
    ).toMatch(/stop_reason\s*===\s*['"]max_tokens['"]/u)
  })

  it('③ CE QU’UN SITE COÛTE EST ENREGISTRÉ, ET PAR MODE', () => {
    // Sans cette ligne, « combien coûte un site en mode 2 ? » n'a pas de
    // réponse mesurable — seulement des suppositions.
    // ── ET ICI AUSSI MON CONTRÔLE ÉTAIT FAUX.
    //
    // `toContain('logAiUsage')` était satisfait par la simple LIGNE
    // D'IMPORT : supprimer l'appel laissait le contrôle vert. On exige
    // l'APPEL, avec ce qu'il transporte.
    expect(CODE, 'la génération de site n’enregistre pas sa consommation').toMatch(
      /await\s+logAiUsage\s*\(\s*\{/u,
    )
    // LE MODE VOYAGE DANS LE TYPE : les trois se comparent sans jointure.
    expect(CODE, 'le mode n’est pas distinguable dans le journal').toMatch(
      /site_mode\$\{String\(siteMode\)\}|site_mode/u,
    )
    // Et les jetons viennent de la RÉPONSE, jamais d'une estimation.
    expect(CODE, 'les jetons sont estimés au lieu d’être lus').toMatch(
      /usage:\s*response\.usage/u,
    )
  })

  it('④ LE PRÉ-CONTRÔLE RESTE AU PALIER LÉGER, LE SITE AU LOURD', () => {
    // Le pré-contrôle classe une phrase ; le second écrit le site entier.
    // Les confondre, c'est payer le lourd pour dire « bonjour » — ou écrire
    // une boutique avec le modèle du tri.
    const i = CODE.indexOf('max_tokens: 250')
    expect(i, 'le pré-contrôle a disparu').toBeGreaterThan(-1)
    expect(CODE.slice(Math.max(0, i - 200), i), 'le pré-contrôle n’est plus au palier léger').toContain(
      'MODELE_LEGER',
    )
    // L'APPEL PRINCIPAL, repéré par sa borne — pas par une occurrence
    // quelconque de `MODELE_LOURD` ailleurs dans le fichier.
    const j = CODE.indexOf('max_tokens: MAIN_MAX_TOKENS')
    expect(j, 'l’appel principal a disparu').toBeGreaterThan(-1)
    expect(
      CODE.slice(Math.max(0, j - 200), j),
      'le site n’est plus écrit par le palier lourd : c’est le modèle du tri ' +
        'qui écrirait l’œuvre que la personne paie',
    ).toContain('MODELE_LOURD')
  })
})
