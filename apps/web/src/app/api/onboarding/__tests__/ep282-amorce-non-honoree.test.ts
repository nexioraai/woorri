/**
 * EP-282 — L'AMORCE N'EST PAS HONORÉE PAR TOUS LES FOURNISSEURS.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-30 CONTRE L'API RÉELLEMENT SERVIE.
 *
 * La route posait une amorce `{ role: 'assistant', content: '{' }` puis
 * rajoutait `'{'` au texte reçu, en pariant que le modèle CONTINUE après
 * l'accolade. Sondage réel (31 jetons d'entrée, 19 de sortie) :
 *
 *     DeepSeek rend  {"type":"ask","reply":"Bonjour ! Comment ..."}
 *                    ↑ il RECOMMENCE, il ne continue pas
 *     route assemble {{"type":"ask",...
 *     JSON.parse     ÉCHOUE — « Expected property name or '}' at position 1 »
 *
 * ── CE QUE LA PERSONNE VOYAIT, ET QUI N'ÉTAIT PAS LE MODÈLE.
 *
 * Les deux replis de cette route, pris pour des réponses de l'IA :
 *
 *   ① LA CHAÎNE BRUTE, NON DÉSÉCHAPPÉE. Le repli tolérant extrait `reply`
 *      à la regex, donc sans interpréter les échappements : l'écran
 *      affichait « …immigration !\n\nSouhaitez-vous… » en toutes lettres.
 *   ② « Pouvez-vous préciser votre activité ? » — la phrase de secours,
 *      écrite en dur à trois endroits. Elle revenait après deux « passer »
 *      et donnait l'impression que le modèle avait tout oublié. Il n'avait
 *      rien oublié : la route renonçait à le lire.
 *
 * ── POURQUOI LA CORRECTION NE NOMME AUCUN FOURNISSEUR.
 *
 * Anthropic honore l'amorce, DeepSeek non. Brancher sur le nom du
 * fournisseur ferait porter à cette route une connaissance de dialecte qui
 * ne lui appartient pas — et se périmerait au troisième. On n'ajoute donc
 * l'accolade QUE SI ELLE MANQUE : juste dans les deux cas.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(__dirname, '..', 'route.ts'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')

/** L'assemblage de la route, isolé — la ligne même qui a cassé. */
const assembler = (recu: string) =>
  (recu.trimStart().startsWith('{') ? recu : '{' + recu).trim()

const CORPS = '"type":"ask","reply":"Parfait !\\n\\nSouhaitez-vous une couleur ?","skippable":true}'

describe('EP-282 · l’assemblage survit aux deux comportements d’amorce', () => {
  it('① AMORCE IGNORÉE — le modèle recommence, et ça parse quand même', () => {
    // Le comportement MESURÉ sur le fournisseur actif.
    const parsed = JSON.parse(assembler('{' + CORPS)) as { type: string; reply: string }
    expect(parsed.type).toBe('ask')
    // ── LE VRAI CONTRÔLE EST ICI.
    //
    // Si l'assemblage casse, le repli regex rend la chaîne BRUTE et l'écran
    // affiche « \n\n » en toutes lettres. Un vrai saut de ligne prouve que
    // le JSON a été parsé, pas rapiécé.
    expect(parsed.reply, 'les échappements ne sont pas interprétés').toContain('\n\n')
    expect(parsed.reply, 'l’écran afficherait « \\n\\n » en toutes lettres').not.toContain('\\n')
  })

  it('② AMORCE HONORÉE — le modèle continue, et ça parse aussi', () => {
    // Le comportement d'Anthropic. La route doit rester juste si le
    // fournisseur change, ou si un troisième arrive.
    const parsed = JSON.parse(assembler(CORPS)) as { type: string; reply: string }
    expect(parsed.type).toBe('ask')
    expect(parsed.reply).toContain('\n\n')
  })

  it('③ LA ROUTE N’AJOUTE PLUS L’ACCOLADE SANS REGARDER', () => {
    // ── CE CONTRÔLE LIT LA SOURCE, et c'est voulu.
    //
    // Le défaut était une CONCATÉNATION inconditionnelle. Aucun double
    // d'exécution ne peut le voir : il faut lire la ligne.
    expect(
      CODE,
      'l’accolade est de nouveau ajoutée sans condition : avec un fournisseur ' +
        'qui n’honore pas l’amorce, on reconstruit « {{ » et tout casse',
    ).not.toMatch(/\(\s*['"]\{['"]\s*\+\s*interview\.content/u)
    expect(CODE, 'la condition sur l’accolade a disparu').toMatch(
      /startsWith\(\s*['"]\{['"]\s*\)/u,
    )
  })

  it('④ LE REPLI TOLÉRANT NE DÉSÉCHAPPE TOUJOURS PAS — c’est pourquoi il doit rester rare', () => {
    // On ne corrige PAS le repli ici : il sert aussi aux JSON cassés par le
    // contenu (apostrophes, guillemets), où rien ne garantit qu'un
    // déséchappement soit correct. Ce contrôle NOMME la limite, pour que
    // personne ne croie le repli inoffensif.
    // `\}` ÉCHAPPÉ : sous le drapeau `u`, une accolade nue est une erreur de
    // syntaxe — « Lone quantifier brackets ». Le fichier ne se chargeait pas,
    // et vitest disait « Tests no tests » sans rien mesurer. Lire « Test
    // Files », jamais seulement « Tests ».
    const m = CORPS.match(/"reply"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"skippable"|\})/u)
    expect(m?.[1], 'le repli rend la chaîne brute — c’est connu et borné').toContain('\\n')
  })
})
