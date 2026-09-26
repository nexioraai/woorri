// ============================================================
// CLIQUET — ON N'ÉCRIT PAS DANS LE STOCKAGE SANS SAVOIR QUI ÉCRIT.
//
// ── LE DÉFAUT, QUE J'AI ÉCRIT MOI-MÊME.
//
// `/api/site/logo` prenait le `slug` du formulaire et déposait le fichier
// avec la CLÉ DE SERVICE — sans AUCUNE vérification de propriété. N'importe
// qui sur Internet pouvait donc écrire dans le dossier de n'importe quel
// marchand : sans compte, sans limite, et le résultat servi depuis notre
// domaine.
//
// Elle ne permettait pas de CHANGER le logo d'une boutique — écrire
// `logo_url` passe par `updateOwnedSite`, filtré par propriétaire, et par un
// GRANT colonne par colonne. Mais un dépôt de fichiers non authentifié reste
// un dépôt de fichiers non authentifié : volume porté par le compte du
// marchand, et hébergement d'images arbitraires sous notre nom.
//
// ── ET LA ROUTE VOISINE PORTAIT DÉJÀ LA GARDE.
//
// `/api/images/upload`, pour les photos de produit, appelle `requireSiteOwner`
// depuis le premier jour, avec un commentaire qui dit exactement pourquoi.
// Je l'avais sous les yeux. Ce n'est donc pas une règle qu'il fallait
// découvrir : c'est une règle qu'il fallait APPLIQUER, et rien dans le dépôt
// ne l'exigeait.
//
// Maintenant si.
// ============================================================
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const API = join(process.cwd(), 'src', 'app', 'api')

function routes(dossier: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) {
      if (nom === '__tests__') continue
      routes(chemin, acc)
    } else if (/^route\.tsx?$/u.test(nom)) {
      acc.push(chemin)
    }
  }
  return acc
}

const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')

/** Cette route écrit-elle dans le stockage ? */
const ECRIT = /\.from\(\s*['"][^'"]+['"]\s*\)\s*\n?\s*\.(?:upload|remove|move|copy)\s*\(|storage[\s\S]{0,120}\.(?:upload|remove|move|copy)\s*\(/u

/**
 * Porte-t-elle une garde ?
 *
 * DEUX FAMILLES, et les confondre serait une faute dans les deux sens :
 *
 *  · IDENTITÉ — la route écrit POUR quelqu'un qui doit prouver qui il est :
 *    le propriétaire du site, celui de l'article, un administrateur, ou le
 *    planificateur (`CRON_SECRET`) ;
 *
 *  · DÉBIT — la route est PUBLIQUE PAR NATURE. `shop/upload-design` en est
 *    une : c'est l'ACHETEUR qui dépose le design à imprimer sur son article,
 *    et il n'a pas de compte. Exiger la propriété y interdirait l'achat.
 *    Ce qui la protège est une limitation de débit par site, plus un
 *    contrôle de type, de taille et de mode commercial.
 *
 * Ce qu'on interdit, c'est l'écriture NUE : ni l'un ni l'autre.
 */
const GARDE =
  /requireSiteOwner\(|requireArticleOwner\(|requireAuthenticatedUser\(|requirePlatformAdmin\(|CRON_SECRET|consommerJeton\(/u

describe('toute écriture dans le stockage est gardée', () => {
  const TOUTES = routes(API)
  const ECRIVAINES = TOUTES.filter((f) => ECRIT.test(sansCommentaires(readFileSync(f, 'utf8'))))

  it('des routes écrivant dans le stockage sont bien détectées', () => {
    // Sans cela, l'assertion suivante passerait sur un ensemble vide.
    expect(ECRIVAINES.length, 'aucune route d’écriture trouvée : instrument cassé').toBeGreaterThanOrEqual(2)
    expect(
      ECRIVAINES.some((f) => f.includes(join('images', 'upload'))),
      'la route des photos de produit n’est plus détectée',
    ).toBe(true)
  })

  it('AUCUNE n’écrit sans vérifier qui appelle', () => {
    const nues = ECRIVAINES.filter((f) => !GARDE.test(sansCommentaires(readFileSync(f, 'utf8'))))
      .map((f) => f.replace(`${API}/`, ''))
    expect(
      nues,
      'route(s) écrivant dans le stockage SANS garde d’identité : n’importe qui ' +
        'pourra y déposer des fichiers, dans le dossier du marchand de son ' +
        `choix —\n  ${nues.join('\n  ')}`,
    ).toEqual([])
  })

  it('la route du LOGO exige bien la PROPRIÉTÉ — une limitation ne suffirait pas', () => {
    // Le défaut d'origine, nommé. Cette route écrit le logo D'UNE BOUTIQUE :
    // seul son propriétaire a quelque chose à y faire. Une simple limitation
    // de débit laisserait n'importe qui déposer, plus lentement.
    const logo = sansCommentaires(readFileSync(join(API, 'site', 'logo', 'route.ts'), 'utf8'))
    expect(/requireSiteOwner\(/u.test(logo), 'la route du logo a reperdu sa garde de propriété').toBe(true)
  })

  it('la garde est posée AVANT de lire le fichier', () => {
    // Lire des mégaoctets avant de savoir si l'appelant a le droit, c'est
    // offrir le travail et la mémoire du serveur à un inconnu.
    for (const f of ECRIVAINES) {
      const code = sansCommentaires(readFileSync(f, 'utf8'))
      const garde = code.search(GARDE)
      const lecture = code.search(/arrayBuffer\(\)/u)
      if (garde === -1 || lecture === -1) continue
      expect(
        garde,
        `${f.replace(`${API}/`, '')} : le fichier est lu AVANT la vérification de propriété`,
      ).toBeLessThan(lecture)
    }
  })
})
