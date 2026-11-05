/**
 * EP-351 · A — L'APERÇU D'UNE ŒUVRE PUBLIÉE NE MENT PLUS.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-05.
 *
 * L'atelier appelait `pageAutonome(code, titre)` SANS configuration. La
 * page partait donc avec `url: ''`, et le bandeau de l'aperçu s'affichait :
 *
 *     « Votre base de données sera créée à la publication. »
 *
 * Sur `snenak`, DÉJÀ publiée — base posée, schéma
 * `oeuvre_15158240_c5c6_4bf6_b8d0_218eb2cb4301`, clé publiable en place,
 * `persistSession: true` (mesuré sur la page servie, 774 660 o) — cette
 * phrase est un mensonge. La personne lit qu'il reste une étape alors
 * qu'elle l'a franchie.
 *
 * ── ET ON N'INJECTE PAS LA BASE POUR AUTANT. C'EST STRUCTUREL.
 *
 * MESURÉ dans les DEUX moteurs, sur `sandbox="allow-scripts"` :
 *
 *     location.origin  = null         localStorage   → SecurityError
 *     window.origin    = null         navigator.locks = undefined
 *     isSecureContext  = false        crypto.subtle   = undefined
 *
 * Une origine opaque envoie `Origin: null`, qu'aucun service n'autorise.
 * L'aperçu NE PEUT PAS atteindre la base : injecter l'adresse échangerait
 * un mensonge contre un plantage.
 *
 * « L'isolation qui protège la session deribfy.com est exactement ce qui
 *   coupe l'application de ses données. »
 *
 * ── D'OÙ DEUX GESTES, ET ILS NE SE REMPLACENT PAS.
 *
 * ① L'HÔTE le dit, hors de `#racine` — donc même si le code de l'œuvre
 *    est cassé, la phrase s'affiche.
 * ② L'ŒUVRE ne tente pas la base et ne montre pas son écran de connexion,
 *    sur la JOIGNABILITÉ et non sur la publication.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { pageAutonome, type ConfigurationOeuvre } from '../boucle-directe'
import { adressePubliee } from '../sous-domaine'
import { blocBase } from '../entites-declarees'

const SRC = join(__dirname, '..', '..', '..')
const ATELIER = join(SRC, 'app', 'api', 'generateur', 'direct', '[id]', 'route.ts')
const CODE = "document.getElementById('racine').textContent = 'x'"
const RELIEE: ConfigurationOeuvre = {
  url: 'https://psxbilpmnojtlzosokzz.supabase.co',
  // ── PAS UNE CHAÎNE EN FORME DE CLÉ, ET C'EST UN CLIQUET QUI ME L'A APPRIS.
  //
  // Mon premier jet portait `sb_publishable_` suivi de vingt-six signes.
  // EP-321 ③ interdit une clé dans un fichier SUIVI PAR GIT, et il ne peut
  // pas distinguer une fausse d'une vraie — un contrôle qui essaierait
  // devinerait, et finirait par exempter un vrai secret un jour de hâte.
  //
  // ET LA GATE NE L'AVAIT PAS VU : EP-321 ③ interroge `git grep`, donc les
  // fichiers SUIVIS. Ce test était encore hors de l'index quand j'ai lancé
  // la suite — 5 383 verts qui ne mesuraient pas l'état commité. Un cliquet
  // qui lit Git rend un verdict DIFFÉRENT avant et après `git add`.
  clePubliable: 'valeur-de-controle-pas-une-cle',
  schema: 'oeuvre_1',
}

describe('EP-351 · l’aperçu d’une œuvre publiée', () => {
  it('① IL DIT OÙ LES DONNÉES SONT JOIGNABLES — la phrase, et le lien', () => {
    const page = pageAutonome(CODE, 'Snenak', undefined, 'apercu', 'https://snenak.deribfy.app')
    // ── LA PHRASE EXACTE, parce que c'est elle qu'on lit à l'écran.
    expect(page, 'la phrase de l’aperçu publié a disparu').toContain(
      'Les données ne sont pas accessibles depuis cet aperçu.',
    )
    expect(page, 'l’aperçu ne dit pas quoi faire').toContain(
      'Ouvrez votre application publiée pour vous connecter et voir vos données',
    )
    // ── ET LE LIEN EST CLIQUABLE, pas une adresse à recopier.
    expect(page, 'l’adresse n’est pas un lien').toMatch(
      /href="https:\/\/snenak\.deribfy\.app"[^>]*target="_blank"/u,
    )
    expect(page, 'un lien externe sans rel=noopener').toMatch(/rel="noopener noreferrer"/u)
    // ── ET LA BALISE EST FERMÉE.
    //
    // Une mutation me l'a appris : j'avais retiré le `</a>` et ce contrôle
    // restait VERT. Un ancrage non fermé fait de tout ce qui suit un lien
    // — y compris le reste de la page de quelqu'un.
    expect(page, 'l’ancrage du lien n’est pas fermé').toMatch(/<a [^>]*>[^<]*<\/a>/u)
    // ── LE MENSONGE EST PARTI.
    expect(page, 'l’ancienne phrase mensongère est encore servie').not.toContain(
      'sera créée à la publication',
    )
    // ── ET IL VIT HORS DE `#racine` : React efface ce qu'il y trouve.
    //
    // C'est ce qui le rend utile justement quand l'œuvre plante : un
    // bandeau DANS la racine disparaîtrait au montage, ou ne s'afficherait
    // jamais si le montage échoue.
    expect(page.indexOf('Les données ne sont pas accessibles')).toBeLessThan(
      page.indexOf('<div id="racine">'),
    )
  })

  it('② UNE ŒUVRE PAS ENCORE PUBLIÉE GARDE SA PHRASE — rien n’est cassé', () => {
    const page = pageAutonome(CODE, 'Neuve', undefined, 'apercu', null)
    expect(page, 'l’aperçu d’avant publication a perdu sa phrase').toContain(
      'Votre base de données sera créée à la publication',
    )
    expect(page, 'l’aperçu neuf parle d’une application publiée').not.toContain(
      'Ouvrez votre application publiée',
    )
    // ET L'ARCHIVE GARDE LA SIENNE : c'est le seul endroit où le LISEZ-MOI
    // existe et où il y a un geste à faire.
    const zip = pageAutonome(CODE, 'Zip', undefined, 'archive', 'https://snenak.deribfy.app')
    expect(zip, 'l’archive a perdu son LISEZ-MOI').toContain('LISEZ-MOI.md')
  })

  it('③ ET LA PAGE SERVIE AU PUBLIC NE PORTE AUCUN BANDEAU', () => {
    // Sa base est là et son origine est la sienne : rien à expliquer.
    // Un bandeau ici serait un avertissement permanent sur l'application
    // d'un client, lu par SES clients.
    const servie = pageAutonome(CODE, 'Snenak', RELIEE, 'apercu', 'https://snenak.deribfy.app')
    for (const phrase of [
      'Les données ne sont pas accessibles',
      'sera créée à la publication',
      'LISEZ-MOI.md',
    ]) {
      expect(servie, `la page publique porte « ${phrase} »`).not.toContain(phrase)
    }
    // ET ELLE PORTE SA BASE, elle : le bandeau n'est pas parti avec.
    expect(servie, 'la page publique a perdu sa base').toContain('psxbilpmnojtlzosokzz')
  })

  it('④ L’ATELIER LIT LA PUBLICATION ET LA TRANSMET', () => {
    const src = lireSource(ATELIER)
    // ── UNE COLONNE NON SÉLECTIONNÉE N'ARRIVE JAMAIS, et l'écran reste
    //    muet sans que rien ne rougisse. « C'est écrit » et « ça arrive »
    //    sont deux choses.
    expect(src, 'la publication n’est pas lue en base').toMatch(
      /\.select\([^)]*publication_slug[^)]*publication_jeton/u,
    )
    expect(src, 'l’adresse n’est pas transmise à la page').toMatch(
      /pageAutonome\([^)]*adresse\)/u,
    )
    // ── ET LA BASE N'EST TOUJOURS PAS INJECTÉE DANS LE CADRE OPAQUE.
    //
    // Mesuré : `Origin: null` n'est autorisé par aucun service. Passer
    // une configuration ici échangerait le mensonge contre un plantage —
    // c'est le lot B, avec sa propre revue, pas un effet de bord.
    expect(src, 'une configuration part dans un cadre opaque').toMatch(
      /pageAutonome\(v\.code, titre, undefined,/u,
    )
  })

  it('⑤ ET L’ŒUVRE SE DÉCIDE SUR LA JOIGNABILITÉ, PAS SUR LA PUBLICATION', () => {
    const bloc = blocBase([
      {
        id: 'ent_m',
        name: 'membre',
        fields: [{ id: 'f', name: 'nom', type: 'text', required: true }],
      },
    ])
    // ── `b.url !== ''` SEUL NE SUFFIT PAS, et c'est tout le défaut.
    //
    // Après publication l'adresse est REMPLIE. Une œuvre qui ne regarde
    // que ça crée son client dans l'aperçu, affiche son écran de
    // connexion, et la tentative part d'une origine que le service
    // refuse. L'origine, elle, dit la vérité.
    expect(bloc, 'la consigne ne regarde plus l’origine').toMatch(
      /window\.origin !== 'null'/u,
    )
    expect(bloc, 'la consigne décide encore sur la seule publication').toMatch(
      /b\.url !== '' && window\.origin !== 'null'/u,
    )
    // ── ET L'ÉCRAN DE CONNEXION SUIT CETTE MÊME CONDITION.
    expect(bloc, 'l’écran de connexion ne suit plus la joignabilité').toMatch(
      /CET ÉCRAN NE S’AFFICHE QUE SI[\s\S]{0,80}`enBase`/u,
    )
  })

  it('⑥ L’ADRESSE SE CONSTRUIT EN UN SEUL ENDROIT', () => {
    // Trois appelants la voudraient ; trois exemplaires divergeraient au
    // premier changement de domaine. On exerce la fonction, on ne lit pas
    // un littéral dans une route — la leçon d'EP-349 ①, le lendemain.
    expect(adressePubliee('snenak', 'jt')).toBe('https://snenak.deribfy.app')
    expect(adressePubliee(null, 'jt')).toMatch(/\/p\/jt$/u)
    expect(adressePubliee('', '')).toBeNull()
    for (const route of ['mes-applications', join('direct', '[id]')]) {
      const src = lireSource(join(SRC, 'app', 'api', 'generateur', route, 'route.ts'))
      expect(src, `${route} rebâtit l’adresse à la main`).toMatch(/adressePubliee\(/u)
      expect(src, `${route} porte encore le domaine en dur`).not.toMatch(/\.deribfy\.app/u)
    }
  })
})
