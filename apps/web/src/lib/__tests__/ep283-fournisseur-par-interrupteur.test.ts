/**
 * EP-283 — UN FOURNISSEUR NE SE CHOISIT PAS DANS UNE ROUTE.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-30.
 *
 * Le propriétaire voulait éprouver les trois modes de génération de site. Il
 * n'a jamais pu : la route qui les produit répondait 400.
 *
 *     POST /v1/messages → HTTP 400
 *     « Your credit balance is too low to access the Anthropic API. »
 *     request_id req_011CgYG67NamPZSwwLkJEdrY
 *
 * Le sondage ne coûte rien — un solde épuisé refuse AVANT d'émettre.
 *
 * ── CE QUI L'AVAIT CAUSÉ : UNE MIGRATION ARRÊTÉE À MI-CHEMIN.
 *
 * La bascule vers l'autre fournisseur avait doté le dépôt d'un interrupteur,
 * `clientIA()`, qui lit la configuration. Mais DEUX routes seulement s'en
 * servaient. Douze autres portaient leur propre
 * `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` et des noms de
 * modèles Claude écrits en dur.
 *
 * Elles n'avaient pas changé d'une ligne — et elles sont mortes quand même.
 * C'est la signature d'une connaissance mal placée : une route qui SAIT quel
 * fournisseur répond se périme le jour où il change, sans que personne la
 * touche.
 *
 * ── CE QUE CE CLIQUET TIENT, ET CE QU'IL NE PRÉTEND PAS TENIR.
 *
 * Il ne dit pas que la dette est soldée — elle ne l'est pas. Il la NOMME,
 * fichier par fichier, et interdit qu'elle GROSSISSE. Une route nouvelle qui
 * se construirait son propre client fait rougir ; une route migrée fait
 * baisser le compte, et la liste doit alors être réduite à la main.
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

/** Le code NU : sans commentaires. Un commentaire qui CITE l'ancien code
 *  n'est pas l'ancien code — ma propre correction en portait un, et il
 *  faisait un faux positif. */
const nu = (f: string) =>
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, ' ')
    .replace(/^\s*\/\/.*$/gmu, ' ')

const rel = (f: string) => relative(SRC, f).split(/[\\/]/u).join('/')

const TOUS = fichiers(SRC).sort()

/**
 * LES DEUX SEULS ENDROITS QUI ONT LE DROIT DE CONSTRUIRE UN CLIENT.
 *
 * Ce sont les modules de DIALECTE : leur raison d'être est précisément de
 * savoir qui répond et comment on lui parle. Tout le reste doit l'ignorer.
 */
const DIALECTE = new Set(['lib/ia/client.ts', 'lib/apps/fournisseur.ts'])

/**
 * LA DETTE, NOMMÉE. Chaque entrée est une route qui mourra au prochain
 * changement de fournisseur. Cette liste ne peut que RÉTRÉCIR.
 */
const DETTE = [
  // ── NEUF ENTREES SOLDEES LE 2026-10-30, ET DEUX RAISONS DE RESTER.
  //
  // Blog, Catalogue, Marketing, Agent et le cron de synchronisation passent
  // desormais par `clientIA()`. `lib/anthropic.ts` a ete SUPPRIME : personne
  // ne l'importait, il ne servait qu'a porter une cle morte.
  //
  // `generateur/sonde` construit un client avec une fausse cle pour verifier
  // la FORME du SDK, sans jamais appeler — c'est un instrument, pas un
  // appelant. `comprendre.ts` appartient a la chaine AIR et connait son
  // dialecte, flux compris.
  'app/api/generateur/sonde/route.ts',
  'lib/apps/comprendre.ts',
]

describe('EP-283 · le fournisseur vient de l’interrupteur', () => {
  const porteursDeClient = TOUS.filter((f) => /new Anthropic\s*\(/u.test(nu(f))).map(rel)

  it('① LE DÉNOMINATEUR EST RÉEL — un balayage vide passerait aussi', () => {
    expect(TOUS.length, 'le balayage ne trouve plus de fichiers').toBeGreaterThan(200)
    expect(porteursDeClient, 'le motif ne reconnaît plus un client construit').toContain(
      'lib/ia/client.ts',
    )
  })

  it('② AUCUNE ROUTE NOUVELLE NE SE CONSTRUIT SON PROPRE CLIENT', () => {
    const inconnus = porteursDeClient.filter((f) => !DIALECTE.has(f) && !DETTE.includes(f))
    expect(
      inconnus,
      'ces fichiers construisent leur propre client : ils mourront au prochain ' +
        'changement de fournisseur, exactement comme la génération de site le ' +
        '2026-10-30. Passez par `clientIA()`.',
    ).toEqual([])
  })

  it('③ LA DETTE NE GROSSIT PAS — et la liste ne ment pas', () => {
    // ── DEUX SENS, ET LE SECOND COMPTE AUTANT.
    //
    // Une entrée qui RESTE alors que le fichier est migré rendrait la liste
    // fausse : elle dirait une dette qui n'existe plus, et masquerait la
    // prochaine. On exige donc l'égalité, pas l'inclusion.
    const restants = DETTE.filter((f) => porteursDeClient.includes(f))
    expect(
      DETTE.filter((f) => !restants.includes(f)),
      'ces entrées sont soldées : retirez-les de DETTE, sinon la liste ment',
    ).toEqual([])
    expect(restants.length, 'la dette a grossi').toBeLessThanOrEqual(DETTE.length)
  })

  it('⑤ AUCUN CLIENT N’EST CONSTRUIT À L’IMPORT', () => {
    // ── LA LEÇON QUE J'AI REDÉCOUVERTE À MES DÉPENS, LE 2026-10-30.
    //
    // `clientIA()` JETTE quand la clé manque — c'est une garde réelle, et
    // elle doit le rester. Mais appelée au NIVEAU MODULE, elle casse le
    // simple IMPORT du fichier : rien n'est appelé, et tout est déjà mort.
    //
    // La gate l'a dit avant la production : `sectorPrompt.test.ts` est tombé
    // à l'import. Et la règle était DÉJÀ ÉCRITE dans `onboarding/route.ts`,
    // qui avait commis puis corrigé exactement cette faute une heure plus
    // tôt. Je l'avais lue. Je l'ai refaite.
    //
    // Un commentaire ne retient pas une faute : un contrôle, si.
    const fautifs = TOUS.filter((f) => {
      // Les modules de dialecte sont exemptés : leur travail EST de
      // construire. On regarde les autres, et seulement au niveau module —
      // une ligne sans indentation.
      if (DIALECTE.has(rel(f))) return false
      return /^(?:const|let|var)\s+\w+\s*=\s*clientIA\s*\(/mu.test(nu(f))
    }).map(rel)
    expect(
      fautifs,
      'ces fichiers appellent `clientIA()` au niveau module : importer le ' +
        'fichier suffit à le casser quand la clé manque. Appelez-le DANS le ' +
        'handler.',
    ).toEqual([])
  })

  it('④ LA GÉNÉRATION DE SITE EST MIGRÉE — c’est elle qui bloquait les trois modes', () => {
    // ── LE CONTRÔLE QUI PORTE LE DÉFAUT MESURÉ.
    //
    // `/api/chat` est l'appel que l'entretien déclenche quand il aboutit.
    // Tant qu'il tenait sa propre clé, aucun des trois modes n'était
    // atteignable — l'entretien pouvait être parfait, le mur suivant
    // répondait 400.
    const f = join(SRC, 'app', 'api', 'chat', 'route.ts')
    const code = nu(f)
    expect(code, 'la génération de site s’est reconstruit un client').not.toMatch(
      /new Anthropic\s*\(/u,
    )
    expect(code, 'elle ne passe pas par l’interrupteur').toContain('clientIA()')
    expect(code, 'un nom de modèle est de nouveau écrit en dur').not.toMatch(
      /["']claude-[a-z0-9]/u,
    )
    // Les deux paliers sont employés, et chacun à sa place : le léger pour le
    // classement court, le lourd pour l'œuvre que la personne paie.
    expect(code).toContain('MODELE_LEGER')
    expect(code).toContain('MODELE_LOURD')
  })
})
