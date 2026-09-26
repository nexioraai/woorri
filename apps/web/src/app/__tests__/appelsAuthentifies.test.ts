// ============================================================
// CLIQUET — UN APPEL CLIENT VERS UNE ROUTE PROTÉGÉE PORTE SON JETON.
//
// ── LE DÉFAUT, PAYÉ EN PRODUCTION LE JOUR MÊME DE LA LIVRAISON.
//
// Le sélecteur de produits d'une page demandait la liste au serveur avec
// `credentials: 'include'`, donc SANS en-tête `Authorization`. Or les routes
// marchandes lisent un jeton `Bearer` (`require-site-owner.ts`) : la requête
// repartait en 401.
//
// Conséquence à l'écran : le marchand crée sa page « Chaussures », ne trouve
// AUCUN produit à cocher, et conclut que la fonctionnalité ne marche pas.
// Elle ne marchait pas.
//
// ── POURQUOI CE DÉFAUT NE SE VOIT PAS À LA RELECTURE.
//
// `credentials: 'include'` A L'AIR d'une authentification. C'en est une —
// pour un serveur qui lit des cookies. Celui-ci n'en lit pas. Rien dans le
// code appelant ne le dit, et le compilateur ne peut rien en savoir : la
// seule façon de s'en apercevoir est d'essayer, ou de mesurer.
//
// Ce cliquet mesure. Tout appel client vers une route marchande doit porter
// `Authorization` — et la liste des préfixes protégés est explicite, pour que
// la garde reste lisible plutôt que devinée.
// ============================================================
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

/**
 * Les routes protégées sont DÉDUITES, jamais recopiées.
 *
 * Une liste de préfixes écrite à la main serait fausse dès le premier jour :
 * `/api/shop/` contient aussi bien `products` (propriétaire) que `checkout`
 * et `promo/validate` (VISITEUR — un acheteur n'est pas connecté). Exiger un
 * jeton là serait casser l'achat.
 *
 * On lit donc les fichiers de route et on retient ceux qui appellent
 * réellement une garde d'authentification. Une route protégée demain le sera
 * ici sans que personne y pense.
 */
const GARDES = /requireSiteOwner\(|requireAuthenticatedUser\(|requirePlatformAdmin\(/u

function cheminDeRoute(fichier: string): string {
  return fichier
    .replace(join(SRC, 'app'), '')
    .replace(/\/route\.tsx?$/u, '')
    .replace(/\/\([^/]+\)/gu, '') // groupes de routage, absents de l'URL
}

function fichiers(dossier: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) {
      if (nom === 'node_modules' || nom === '__tests__') continue
      fichiers(chemin, acc)
    } else if (/\.tsx?$/u.test(nom) && !/\.test\.tsx?$/u.test(nom)) {
      acc.push(chemin)
    }
  }
  return acc
}

/** Les appels `fetch(...)` d'un fichier, avec leur texte complet. */
function appelsFetch(source: string): string[] {
  const out: string[] = []
  let i = source.indexOf('fetch(')
  while (i > -1) {
    let prof = 0
    let j = i + 'fetch'.length
    for (; j < source.length; j += 1) {
      if (source[j] === '(') prof += 1
      else if (source[j] === ')') {
        prof -= 1
        if (prof === 0) break
      }
    }
    out.push(source.slice(i, j + 1))
    i = source.indexOf('fetch(', j)
  }
  return out
}

describe('les appels clients vers les routes marchandes portent leur jeton', () => {
  const TOUS = fichiers(SRC)
  const CLIENTS = TOUS.filter((f) => readFileSync(f, 'utf8').startsWith("'use client'"))

  /** Chemins d'URL des routes qui exigent une authentification. */
  const PROTEGES = TOUS.filter((f) => /\/route\.tsx?$/u.test(f) && GARDES.test(readFileSync(f, 'utf8')))
    .map(cheminDeRoute)

  it('des routes protégées sont bien détectées — sinon ce cliquet ne garde rien', () => {
    expect(PROTEGES.length, 'aucune route protégée trouvée : instrument cassé').toBeGreaterThan(5)
    expect(PROTEGES.some((c) => c.startsWith('/api/shop/products'))).toBe(true)
    // Et les routes VISITEUR n'y sont pas : exiger un jeton à l'achat
    // casserait le paiement.
    expect(PROTEGES.some((c) => c.startsWith('/api/shop/checkout'))).toBe(false)
  })

  it('le balayage trouve bien des fichiers clients — sinon ce cliquet ne garde rien', () => {
    expect(CLIENTS.length, 'aucun composant client trouvé : instrument cassé').toBeGreaterThan(10)
  })

  it('AUCUN appel vers une route protégée ne part sans `Authorization`', () => {
    const fautifs: string[] = []
    for (const f of CLIENTS) {
      // ── SANS LES COMMENTAIRES, ET C'EST INDISPENSABLE.
      //
      // Mon premier jet lisait le fichier brut. Le composant fautif portait le
      // mot « Authorization » dans le commentaire qui EXPLIQUE le défaut : le
      // test passait en lisant sa propre justification. Le dépôt connaît ce
      // piège — `jsonLdMounting` et `porteMarcheSansCarte` le documentent pour
      // la même raison. On vérifie le CODE, jamais la prose qui l'entoure.
      const source = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//gu, '')
        .replace(/^[ \t]*\/\/.*$/gmu, '')
      for (const appel of appelsFetch(source)) {
        // ── LE CHEMIN EXACT, PAS UN PRÉFIXE.
        //
        // `/api/shop/promo` est une route MARCHANDE (créer un code) ; 
        // `/api/shop/promo/validate` et `/api/shop/promo/active` sont des
        // routes VISITEUR. Une comparaison par préfixe les confondrait et
        // exigerait un jeton d'un acheteur non connecté — donc casserait
        // l'achat pour « corriger » une sécurité qui n'avait rien.
        const url = /['"`]([^'"`]*\/api\/[^'"`?]*)/u.exec(appel)?.[1]
        if (!url) continue
        const segmentDynamique = (p: string) => p.includes('/[')
        const touche = PROTEGES.some((p) =>
          segmentDynamique(p) ? url.startsWith(p.slice(0, p.indexOf('/['))) : url === p,
        )
        if (!touche) continue
        // Le jeton peut être posé dans l'appel, ou porté par une variable du
        // fichier (`headers`, `authHeaders`). On exige alors qu'il existe
        // quelque part dans ce fichier : c'est le défaut réel qu'on garde —
        // un composant qui n'authentifie NULLE PART.
        if (/Authorization/u.test(appel) || /authHeaders/u.test(appel)) continue
        // ── LE REPLI NE VAUT QUE POUR UNE INDIRECTION.
        //
        // Un appel peut porter ses en-têtes dans une VARIABLE (`headers`,
        // `authHeaders`) : on accepte alors que le jeton soit posé ailleurs
        // dans le fichier. Mais un appel qui n'a AUCUN en-tête n'a aucune
        // indirection à invoquer — et le repli le masquerait.
        //
        // IL L'A MASQUÉ. `/api/site/logo` a reçu sa garde de propriété, et
        // l'envoi depuis l'éditeur ne portait pas de jeton : ce test est
        // passé au vert parce que le MÊME FICHIER authentifie ailleurs (la
        // suppression de boutique). Une garde qui se laisse satisfaire par
        // une ligne sans rapport ne garde rien.
        if (/headers/u.test(appel) && /Authorization/u.test(source)) continue
        fautifs.push(`${f.replace(`${SRC}/`, '')} → ${appel.slice(0, 90).replace(/\s+/gu, ' ')}`)
      }
    }
    expect(
      fautifs,
      'appel(s) client vers une route protégée SANS jeton : la requête repartira ' +
        'en 401 et l’écran affichera une erreur de chargement, sans que rien ' +
        `ne l’explique —\n  ${fautifs.join('\n  ')}`,
    ).toEqual([])
  })

  it('`credentials: \'include\'` ne suffit PAS, et le test le sait', () => {
    // La moitié qui empêche de « corriger » en remettant des cookies : le
    // serveur n'en lit aucun. Un appel qui ne porterait que `credentials`
    // doit continuer de faire tomber ce test.
    const faux = "fetch(`/api/shop/products?slug=x`, { credentials: 'include' })"
    expect(/Authorization/u.test(faux) || /authHeaders/u.test(faux)).toBe(false)
  })
})
