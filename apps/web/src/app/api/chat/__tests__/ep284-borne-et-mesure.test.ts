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

  it('⑤ L’APPEL PRINCIPAL PART EN FLUX — sinon le SDK refuse avant d’envoyer', () => {
    // ── LE DÉFAUT QUE J'AVAIS DÉJÀ RÉSOLU, ET REFAIT DOUZE JOURS APRÈS.
    //
    // En relevant la borne à 32 000 pour corriger une troncature, j'ai
    // franchi un seuil du SDK : il REFUSE côté client dès que `max_tokens`
    // autorise une réponse longue.
    //
    //     « Streaming is required for operations that may take longer
    //       than 10 minutes. »
    //
    // Rien ne partait. L'écran disait « Failed to generate business » et la
    // table des échecs restait VIDE — parce qu'aucune réponse n'existait à
    // enregistrer. Mode 1 est mort ainsi, après avoir fonctionné.
    //
    // Seuil mesuré par dichotomie, à coût nul puisque aucune requête ne
    // part : dernier accepté 21 312, premier refusé 21 406.
    //
    // J'avais tiré cette leçon le 2026-10-18 sur l'autre moteur, et j'y
    // avais posé un cliquet. Il ne regardait pas cette route. UN CLIQUET NE
    // PROTÈGE QUE CE QU'IL REGARDE.
    expect(CODE, 'l’appel principal n’est pas en flux : au-delà de 21 312 le SDK refusera').toMatch(
      /messages\.stream\(mainCallParams\)\.finalMessage\(\)/u,
    )
    expect(CODE, 'un appel non streamé subsiste sur le chemin principal').not.toMatch(
      /messages\.create\(mainCallParams\)/u,
    )
    // LA COHÉRENCE DES DEUX : une borne au-dessus du seuil SANS flux est la
    // combinaison exacte qui a tué le mode 1.
    const m = CODE.match(/MAIN_MAX_TOKENS\s*=\s*([0-9_]+)/u)
    const borne = Number((m?.[1] ?? '0').replace(/_/gu, ''))
    if (borne > 21_312) {
      expect(
        CODE,
        `la borne vaut ${String(borne)}, au-dessus du seuil mesuré du SDK (21 312) : ` +
          'sans flux, chaque appel est refusé avant d’être envoyé',
      ).toContain('.stream(')
    }
  })

  it('④ LE PRÉ-CONTRÔLE RESTE AU PALIER LÉGER, LE SITE AU LOURD', () => {
    // Le pré-contrôle classe une phrase ; le second écrit le site entier.
    // Les confondre, c'est payer le lourd pour dire « bonjour » — ou écrire
    // une boutique avec le modèle du tri.
    // ── L'ANCRE NE PEUT PAS ÊTRE UNE VALEUR DE BORNE.
    //
    // Elle cherchait `max_tokens: 250`. Deux heures plus tard, cette borne
    // est passée à 2 000 — parce que 250 était justement trop bas pour un
    // fournisseur qui réfléchit avant de répondre — et ce contrôle est
    // tombé. Il épinglait un CHIFFRE là où il voulait désigner un APPEL.
    //
    // `preCheck` nomme ce qu'il est : le classement court qui précède tout.
    // Il survivra au prochain réglage de borne.
    const i = CODE.indexOf('preCheck = await')
    expect(i, 'le pré-contrôle a disparu').toBeGreaterThan(-1)
    // Le modèle est déclaré APRÈS l'ouverture de l'appel, pas avant : on
    // regarde donc vers l'avant. Mon ancre précédente était une borne, et
    // elle se lisait à rebours ; en la changeant j'ai dû changer le sens.
    expect(CODE.slice(i, i + 400), 'le pré-contrôle n’est plus au palier léger').toContain(
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
