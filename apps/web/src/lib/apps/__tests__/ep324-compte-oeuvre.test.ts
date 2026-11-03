/**
 * EP-324 · LE COMPTE D'UNE ŒUVRE — réparer n'est pas voler.
 *
 * ── LES DEUX CAS QUE J'AVAIS CONFONDUS.
 *
 *   revendication ABSENTE    → on RÉPARE. Le serveur connaît l'identifiant
 *                              de l'œuvre qu'il publie, il repose la même
 *                              valeur de la même main.
 *   revendication DIFFÉRENTE → on REFUSE, bruyamment. Ce compte appartient
 *                              à une autre œuvre ; le réparer, c'est le
 *                              voler, et son propriétaire ne pourrait plus
 *                              ouvrir sa propre application.
 *
 * J'avais écrit une seule branche, qui réparait dès que la valeur ne
 * correspondait pas. Le défaut s'est manifesté le 2026-11-02 : deux œuvres
 * ont partagé une adresse tronquée, et la seconde publication a pris le
 * compte de la première. Ma mesure a lu le résultat À L'ENVERS — le jeton de
 * A voyait les données de B — et j'ai failli conclure à une faille de la
 * porte avant de comprendre que mon test était faux.
 *
 * ── ET C'EST CE REFUS QUI TIENDRA ENCORE.
 *
 * L'unicité de l'adresse est garantie aujourd'hui (l'identifiant entier, pas
 * huit signes). Mais elle peut se rompre demain par un chemin qu'on n'a pas
 * prévu. Le cliquet encode donc les DEUX branches, pas seulement la
 * non-collision.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { adresseCompteOeuvre, DOMAINE_COMPTES, engendrerMotDePasse } from '../compte-oeuvre'
import { COSTUMES_CONNUS, REGLE_IDENTITES_DERIVEES } from '../identites-derivees'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const SOURCE = (): string =>
  lireSource(join(RACINE, 'apps', 'web', 'src', 'lib', 'apps', 'compte-oeuvre.ts'))

/**
 * LE CODE SANS SA PROSE — et c'est nécessaire, pas cosmétique.
 *
 * Ce module EXPLIQUE qu'il n'emploie ni `Math.random` ni `user_metadata`.
 * Mes assertions lisaient donc l'explication et rougissaient sur un fichier
 * juste. C'est la huitième fois le 2026-11-02 qu'une prose interfère avec
 * une mesure — un `toContain` satisfait par une ligne d'import, un motif
 * `reload config` trouvé dans le bloc de tête, une mutation qui frappe un
 * commentaire au lieu d'une constante.
 *
 * La règle qui en sort : UNE ASSERTION SUR DU CODE SE FAIT SUR DU CODE.
 * `travailleur-isolation.test.ts` le faisait déjà ; on fait pareil.
 */

const MODULE = (): string => SOURCE()

/**
 * LE CORPS D'UNE FONCTION, et pas le module entier.
 *
 * ── DEUX DE MES ASSERTIONS NE MESURAIENT RIEN, POUR CETTE RAISON.
 *
 * Elles cherchaient une chaîne N'IMPORTE OÙ dans le module. Retirer le refus
 * de `assurerCompteOeuvre` laissait celui de `renouvelerMotDePasse`, qui
 * contient le même texte — et le contrôle restait vert sur un module dont la
 * pose acceptait de voler un compte.
 *
 * C'est la même erreur que le `min-h-0` cherché dans tout un fichier alors
 * que la section englobante le portait aussi. ON MESURE À L'ENDROIT DU
 * DÉFAUT.
 */
const corpsDe = (nom: string): string => {
  const m = MODULE()
  const i = m.indexOf(`export async function ${nom}`)
  expect(i, `la fonction ${nom} a disparu`).toBeGreaterThan(-1)
  const j = m.indexOf('\nexport ', i + 10)
  return m.slice(i, j === -1 ? m.length : j)
}

describe('EP-324 · le compte d’une œuvre', () => {
  it('① DEUX ŒUVRES N’OBTIENNENT JAMAIS LA MÊME ADRESSE', () => {
    // ── LE DÉFAUT EXACT, REJOUÉ : deux identifiants qui partagent leur
    // préfixe. Mon adresse n'en gardait que huit signes.
    const paires: readonly (readonly [string, string])[] = [
      ['fa0ede2c-1a1a-4a1a-8a1a-1a1a1a1a1a1a', 'fa0ede2c-1b1b-4b1b-8b1b-1b1b1b1b1b1b'],
      ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'],
      ['abcdefab-cdef-4bcd-8bcd-abcdefabcdef', 'abcdefab-cdef-4bcd-8bcd-abcdefabcde0'],
    ]
    for (const [a, b] of paires) {
      expect(
        adresseCompteOeuvre(a),
        `deux œuvres partagent une adresse : ${a} et ${b}`,
      ).not.toBe(adresseCompteOeuvre(b))
    }
    // ET ELLE EST DÉTERMINISTE : c'est ce qui permet de RETROUVER le compte
    // au lieu d'en créer un second à chaque publication.
    const id = 'fa0ede2c-1111-4111-8111-111111111111'
    expect(adresseCompteOeuvre(id)).toBe(adresseCompteOeuvre(id))
    expect(adresseCompteOeuvre(id.toUpperCase())).toBe(adresseCompteOeuvre(id))
    expect(adresseCompteOeuvre(id)).toContain(`@${DOMAINE_COMPTES}`)
    // L'IDENTIFIANT ENTIER Y EST, pas un morceau.
    expect(adresseCompteOeuvre(id).split('@')[0]).toContain(id.replace(/-/gu, ''))
  })

  it('② LA BORNE PORTE SUR L’ADRESSE PRODUITE', () => {
    // Même forme que les 63 octets du nom de schéma : on mesure CE QUI PART.
    const prefixe = adresseCompteOeuvre('a'.repeat(8)).split('@')[0].length - 8
    const juste = 'a'.repeat(64 - prefixe)
    expect(adresseCompteOeuvre(juste).split('@')[0].length).toBe(64)
    expect(
      () => adresseCompteOeuvre(`${juste}a`),
      'une partie locale de 65 signes est acceptée : elle serait tronquée',
    ).toThrow(/TROP_LONGUE/u)
    // Un identifiant trop court n'est pas une identité.
    expect(() => adresseCompteOeuvre('abc')).toThrow(/INVALIDE/u)
  })

  it('③ RÉPARER N’EST PAS VOLER — les deux branches sont écrites', () => {
    // ── CHAQUE GARDE EST JUGÉE DANS LA FONCTION QUI LA PORTE.
    const pose = corpsDe('assurerCompteOeuvre')
    // LE REFUS EXISTE DANS LA POSE, et il nomme ce qu'il refuse.
    expect(pose, 'la pose a perdu son refus : une revendication différente serait « réparée »')
      .toContain('COMPTE_OEUVRE_APPARTIENT_AILLEURS')
    // IL PORTE SUR « DIFFÉRENTE », pas sur « absente ».
    expect(pose, 'le refus ne distingue pas une revendication absente d’une autre')
      .toMatch(/porte !== undefined && porte !== null && porte !== ''/u)
    // ET LA RÉPARATION EXISTE DANS LA POSE AUSSI : refuser les deux cas
    // fermerait la porte d'un compte qui a juste perdu sa revendication.
    //
    // On exige l'ÉCRITURE, pas seulement le drapeau qu'elle rend : remplacer
    // l'appel par un objet factice laissait `revendicationReparee: true` dans
    // le `return` et le contrôle restait vert.
    expect(pose, 'la réparation n’écrit plus rien : un compte sans revendication reste muré')
      .toMatch(/updateUserById\([\s\S]{0,160}app_metadata/u)
    expect(pose, 'la pose ne dit plus qu’elle a réparé').toContain('revendicationReparee: true')

    // ── LE RENOUVELLEMENT N'EST PAS UN CHEMIN DE CONTOURNEMENT.
    //
    // C'est le cas que je n'avais pas vu : sans le même garde, le bouton
    // « refaire le mot de passe » aurait coupé le voisin de son application.
    // Prouvé sur la vraie base le 2026-11-02 : REFUSÉ.
    expect(
      corpsDe('renouvelerMotDePasse'),
      'le renouvellement est devenu le chemin de vol que la pose refuse',
    ).toContain('COMPTE_OEUVRE_APPARTIENT_AILLEURS')
  })

  it('④ LE MOT DE PASSE EST LONG ET CRYPTOGRAPHIQUE', () => {
    // L'adresse se déduit de l'identifiant de l'œuvre, qui est dans l'URL
    // publique : TOUT le secret tient dans le mot de passe.
    const m = MODULE()
    expect(m, 'le mot de passe vient d’un générateur de confort, pas de clé')
      .not.toContain('Math.random')
    expect(m, 'le mot de passe ne vient plus d’un générateur cryptographique')
      .toContain('randomBytes')
    const a = engendrerMotDePasse()
    const b = engendrerMotDePasse()
    expect(a.length, 'le mot de passe est trop court').toBeGreaterThanOrEqual(28)
    expect(a, 'deux mots de passe identiques : le générateur ne tire rien').not.toBe(b)
    // Pas de signes qu'un double-clic coupe : la personne va le recopier.
    expect(a, 'le mot de passe porte des signes qu’un double-clic coupe')
      .toMatch(/^[A-Za-z0-9]+$/u)
  })

  it('⑤ LA BOÎTE AUX LETTRES N’EXISTE PAS : le compte est confirmé d’office', () => {
    // Sans `email_confirm`, la confirmation partirait vers une boîte
    // inexistante et le compte resterait incapable de se connecter — sans
    // que rien ne l'explique. Prouvé sur la vraie base : connexion du
    // premier coup.
    expect(MODULE(), 'le compte attendrait une confirmation qui n’arrivera jamais')
      .toContain('email_confirm: true')
  })

  it('⑥ JAMAIS `user_metadata` À L’ÉCRITURE', () => {
    // EP-320 ⑨ garde la POLITIQUE ; celui-ci garde l'ÉCRITURE. Les deux
    // noms se ressemblent, et `user_metadata` est modifiable par son
    // porteur : il y écrirait l'identifiant d'une autre œuvre.
    expect(MODULE(), 'la revendication est écrite dans une métadonnée réinscriptible')
      .not.toContain('user_metadata')
    expect(MODULE()).toContain('app_metadata')
  })

  it('⑧ L’ATELIER MONTRE LES IDENTIFIANTS, ET PERMET DE LES REFAIRE', () => {
    // ── LE DÉFAUT ÉTAIT EN PRODUCTION, ET IL S'ACCUMULAIT.
    //
    // La publication créait un compte dont le mot de passe de 31 signes
    // était rendu UNE FOIS dans une réponse JSON que personne ne lisait.
    // Chaque œuvre publiée fabriquait donc une clé PERDUE à l'instant où
    // elle était faite — et le propriétaire ne pouvait pas atteindre ses
    // propres données.
    const atelier = lireSource(
      join(RACINE, 'apps', 'web', 'src', 'app', 'atelier', '[id]', 'page.tsx'),
    )
    expect(atelier, 'l’atelier ne lit pas l’état du compte')
      .toContain('/api/generateur/compte?id=')
    expect(atelier, 'l’adresse n’est pas affichée').toContain('compte.adresse')
    // ── L'USAGE, PAS LA DÉFINITION.
    //
    // `toContain('renouvelerCle')` était satisfait par `const renouvelerCle
    // = async () =>` : retirer le bouton laissait le contrôle vert. Même
    // classe que la ligne d'import ce matin.
    expect(atelier, 'le bouton de renouvellement n’appelle plus rien')
      .toContain('void renouvelerCle()')

    // ── IL DIT QUE LE MOT DE PASSE NE SE RELIT PAS.
    //
    // Sans cette phrase, le propriétaire chercherait où il est affiché. On
    // ne relit pas un mot de passe ; prétendre le contraire serait mentir à
    // l'écran.
    // ── DEUX PHRASES, DEUX MOMENTS, ET IL FAUT LES DEUX.
    //
    // Mon motif en alternance était satisfait par l'une quand l'autre
    // disparaissait. Or elles ne disent pas la même chose :
    //
    // · le PANNEAU dit « ne se relit pas » — pour qui revient plus tard et
    //   cherche où le mot de passe est affiché ;
    // · l'AVIS dit « ne se relira pas » — à l'instant où il vient de
    //   s'afficher, pour qu'on le note TOUT DE SUITE.
    //
    // Perdre la seconde, c'est laisser quelqu'un fermer l'onglet sur un mot
    // de passe qu'il croyait pouvoir retrouver.
    expect(atelier, 'le panneau ne dit pas que le mot de passe ne se relit pas')
      .toContain('ne se relit pas')
    // La phrase vit DEUX FOIS — dans l'avis et sous le mot de passe affiché.
    // Un motif sur la phrase seule était satisfait par l'autre occurrence :
    // on assertionne donc sur L'APPEL.
    expect(atelier, 'l’avis de renouvellement ne dit plus de le noter maintenant')
      .toMatch(/setAvis\([^)]*se relira pas/u)
    expect(atelier, 'le mot de passe affiché ne dit plus de le noter')
      .toMatch(/Notez-le maintenant/u)

    // ── ET LA ROUTE NE REND JAMAIS LE MOT DE PASSE EN LECTURE.
    //
    // C'est la propriété qui compte : un GET qui le rendrait signifierait
    // qu'il est stocké en clair quelque part.
    const route = lireSource(
      join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'compte', 'route.ts'),
    )
    const get = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'))
    expect(get, 'le GET rend un mot de passe : il serait donc stocké en clair')
      .not.toContain('motDePasse')
    // Le POST, lui, le rend — une fois, celui qu'il vient d'écrire.
    const post = route.slice(route.indexOf('export async function POST'))
    expect(post, 'le renouvellement ne rend pas le nouveau mot de passe')
      .toContain('motDePasse')

    // ── TROIS ÉTATS, PAS DEUX. « Sans données » est un RÉSULTAT, « non
    // publiée » est une ÉTAPE. Les confondre ferait chercher une panne.
    for (const etat of ['sans-donnees', 'non-publiee', 'actif']) {
      expect(route, `l’état « ${etat} » n’est plus distingué`).toContain(etat)
      expect(atelier, `l’écran ne traite plus l’état « ${etat} »`).toContain(etat)
    }
  })

  it('⑦ LA RÈGLE DES IDENTITÉS DÉRIVÉES EST ÉCRITE', () => {
    // ── TROIS COSTUMES EN UNE JOURNÉE, et elle se présentera une quatrième.
    //
    // La saisie bornée à 50 signes, le nom de schéma à 63 octets, l'adresse
    // à 8. Les trois fois la garde existait et semblait suffisante ; les
    // trois fois elle reposait sur une propriété de l'entrée du jour.
    expect(REGLE_IDENTITES_DERIVEES, 'la règle ne dit plus le défaut')
      .toMatch(/troncature d’identité/u)
    expect(REGLE_IDENTITES_DERIVEES, 'le corollaire a disparu — c’est la vraie leçon')
      .toMatch(/en pratique/u)
    expect(REGLE_IDENTITES_DERIVEES, 'la règle ne dit pas qu’on mesure ce qui part')
      .toMatch(/ce qui PART/u)
    expect(REGLE_IDENTITES_DERIVEES, 'la règle ne dit pas qu’on refuse ce qui est à un autre')
      .toMatch(/on refuse/u)
    expect(COSTUMES_CONNUS.length, 'les costumes connus ne sont plus listés')
      .toBeGreaterThanOrEqual(3)
  })
})
