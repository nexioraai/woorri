/**
 * EP-288 — UNE BORNE QUE LA RÉFLEXION ÉPUISE N'EST PAS UNE BORNE.
 *
 * ── LE DÉFAUT, MESURÉ QUATRE FOIS EN UNE JOURNÉE.
 *
 * Le fournisseur actuel rend ses réponses en DEUX blocs — `thinking` puis
 * `text` — et LA RÉFLEXION EST FACTURÉE SUR `max_tokens`. L'ancien ne
 * réfléchissait pas. Toute borne héritée est donc trop basse d'un budget que
 * personne n'avait prévu.
 *
 * Et l'échec est MUET : aucune erreur n'est levée. Le texte revient vide, le
 * code lit `""`, et le repli s'enclenche comme si de rien n'était.
 *
 *     deepseek-flash  max=150, une image → blocs [thinking] SEUL, texte VIDE
 *     deepseek-flash  max=400, un brief  → blocs [thinking] SEUL, texte VIDE
 *     deepseek-flash  max=4000, idem     → blocs [thinking, text], 831 car.
 *
 * ── CE QU'IL A COÛTÉ, CONCRÈTEMENT.
 *
 * `lire-brief` existe POUR éviter qu'on redemande ce qu'un cahier des
 * charges dit déjà. Elle portait 400. Le propriétaire a joint douze pages et
 * s'est vu demander « Que fait votre application avec l'argent ? » — la
 * question exacte que cette route devait supprimer.
 *
 * ── CE QUE CE CLIQUET TIENT, ET POURQUOI 2 000.
 *
 * Il ne devine pas le budget de réflexion : il refuse les bornes dont on a
 * MESURÉ qu'elles s'épuisent. 150 et 400 ont rendu du vide ; 2 000 est le
 * plancher applique au lot de migration du meme jour.
 *
 * Il n'interdit rien au-dessus : une route qui a besoin de 60 000 les prend.
 * Il ferme le bas, qui est le seul côté où l'échec est invisible.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', '..')

function fichiers(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      if (e !== '__tests__' && e !== 'node_modules') fichiers(p, out)
    } else if (/\.tsx?$/u.test(e) && !/\.test\./u.test(e)) out.push(p)
  }
  return out
}

const nu = (f: string) =>
  readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')

/** Mesuré : en dessous, la réflexion seule a déjà rendu du vide. */
const PLANCHER = 2_000

/** Mesuré : au-delà, le SDK exige le flux et refuse l'appel côté client. */
const SEUIL_FLUX = 21_312

type Trouvaille = { fichier: string; valeur: number }

const bornes: Trouvaille[] = []
for (const f of fichiers(SRC)) {
  const code = nu(f)
  for (const m of code.matchAll(/max_tokens:\s*([0-9_]+)/gu)) {
    bornes.push({
      fichier: relative(SRC, f).split(/[\\/]/u).join('/'),
      valeur: Number((m[1] ?? '0').replace(/_/gu, '')),
    })
  }
}

describe('EP-288 · aucune borne que la réflexion épuise', () => {
  it('① LE BALAYAGE TROUVE BIEN DES BORNES — une liste vide passerait aussi', () => {
    expect(bornes.length, 'plus aucune borne trouvée : ce contrôle ne mesure rien').toBeGreaterThan(
      5,
    )
    // La route qui a revele le defaut doit etre vue.
    expect(bornes.map((b) => b.fichier)).toContain('app/api/generateur/lire-brief/route.ts')
  })

  it('② AUCUNE BORNE SOUS LE PLANCHER MESURÉ', () => {
    const trop = bornes.filter((b) => b.valeur < PLANCHER)
    expect(
      trop.map((b) => `${b.fichier} = ${String(b.valeur)}`),
      `sous ${String(PLANCHER)} jetons, la reflexion seule peut tout consommer : le texte ` +
        'revient VIDE, aucune erreur ne se leve, et le repli s’enclenche en silence. ' +
        'C’est ce qui a fait reposer a une personne les questions que son cahier des ' +
        'charges repondait deja.',
    ).toEqual([])
  })

  it('③ AUCUNE BORNE AU-DESSUS DU SEUIL SANS FLUX', () => {
    // L'autre cote du meme probleme, mesure le meme jour : au-dela de
    // 21 312, le SDK REFUSE l'appel cote client et rien ne part.
    const hautes = bornes.filter((b) => b.valeur > SEUIL_FLUX)
    for (const b of hautes) {
      const code = nu(join(SRC, ...b.fichier.split('/')))
      expect(
        code,
        `${b.fichier} borne a ${String(b.valeur)} sans flux : au-dela de ` +
          `${String(SEUIL_FLUX)}, le SDK refuse avant d’envoyer`,
      ).toContain('.stream(')
    }
  })

  it('⑤ LA CONSIGNE LIT LE SILENCE D’UN DOCUMENT COMPLET', () => {
    // ── LE DEFAUT LE PLUS REPETE DE CE CHANTIER, 2026-10-30.
    //
    // L'ancienne consigne disait « si ce n'est pas ecrit, tu OMETS la cle ».
    // Le modele obeissait : un cahier des charges COMPLET, sans un mot sur
    // l'argent, rendait {} pour ARGENT_DANS_APP — et la question « Que fait
    // votre application avec l'argent ? » revenait, encore et encore, alors
    // que le silence du document Y REPONDAIT. Mesure sur trois briefs apres
    // correction : complet-sans-argent → "aucun" ; court → {} ; complet-
    // avec-encaissement → "paiements".
    //
    // La frontiere n'est pas « ecrit ou pas » mais « document complet ou
    // fragment ». Ce controle tient les DEUX moities : le silence structure
    // se lit, la demande vague continue de declencher les questions.
    const code = readFileSync(
      join(SRC, 'app', 'api', 'generateur', 'lire-brief', 'route.ts'),
      'utf8',
    )
    const bloc = code.slice(code.indexOf('const CONSIGNE'), code.indexOf('].join'))
    // ── M166 N'A PAS MORDU SUR /silence/i : le MOT survivait a une regle
    // affaiblie. On exige la REGLE — « aucun » rattache au document complet.
    expect(bloc, 'la consigne ne lit plus le silence d’un document complet').toMatch(
      /aucun[\s\S]{0,120}cahier des charges COMPLET/u,
    )
    expect(bloc, 'la moitié « fragment » a disparu : une demande vague cesserait de questionner').toMatch(
      /COURTE ou VAGUE/u,
    )
    // Et l'interdit de DEVINER reste entier — c'est lui qui sépare cette
    // lecture de l'erreur de v0 (pays déduit de la langue).
    expect(bloc, 'l’interdit de deviner a disparu avec la correction').toMatch(/deviner/iu)
  })

  it('④ `lire-brief` DISTINGUE « RIEN DÉDUIT » DE « PAS PU LIRE »', () => {
    // ── LE DEFAUT PROFOND, celui qui rendait le precedent invisible.
    //
    // La route rendait `{}` dans les DEUX cas. Un brief muet et une lecture
    // ratee produisaient la meme reponse : l'ecran posait ses questions, et
    // personne ne pouvait savoir laquelle des deux s'etait produite.
    const code = nu(join(SRC, 'app', 'api', 'generateur', 'lire-brief', 'route.ts'))
    // ── MA PREMIERE VERSION NE MORDAIT PAS.
    //
    // Elle cherchait le mot « illisible » n'importe ou dans le fichier. Or
    // il figure aussi dans le message de journal. Supprimer le CHAMP de la
    // reponse laissait donc le controle vert — mutation M163. On exige le
    // champ, dans l'objet rendu.
    expect(code, 'la route ne signale plus son incapacite a lire DANS SA REPONSE').toMatch(
      /illisible:\s*true/u,
    )
    expect(
      code,
      'elle ne distingue plus la troncature du reste : une borne trop basse ' +
        'et un modele muet donneraient le meme message',
    ).toMatch(/stop_reason\s*===\s*['"]max_tokens['"]/u)
  })
})
