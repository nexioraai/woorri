/**
 * EP-260 · L'APERÇU À LA TAILLE D'UN APPAREIL.
 *
 * ── D'OÙ VIENT CE LOT.
 *
 * Le propriétaire a entouré cette icône dans une capture de v0 (2026-10-17) :
 * un sélecteur téléphone / tablette / bureau, posé dans la barre de l'aperçu.
 * Et il a demandé de VÉRIFIER qu'il soit mis au bon endroit.
 *
 * ── POURQUOI CE N'EST PAS DÉCORATIF, ET C'EST MESURÉ.
 *
 * L'aperçu est bâti par `compileWeb` : c'est la cible WEB. Deux mécanismes y
 * dépendent de la largeur, et tous deux lisent la FENÊTRE — donc, dans un
 * `iframe`, la largeur de l'iframe :
 *
 *   ① les ruptures CSS du document émis : `@media (min-width: 400|600|1024)` ;
 *   ② la disposition de la navigation : `useLargeurDeFenetre()` rend
 *      `window.innerWidth` via `useSyncExternalStore` avec un écouteur
 *      `resize`. Au-delà de `SEUIL_LATERALE = 840`, la barre du bas devient
 *      un RAIL latéral.
 *
 * Quatre seuils, donc — et jusqu'ici l'`iframe` était figé en pleine largeur :
 * ils existaient et personne ne pouvait les voir.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * ① les trois largeurs traversent les QUATRE seuils ;
 * ② le sélecteur est AU-DESSUS du cadre, dans la barre de l'aperçu ;
 * ③ il règle la LARGEUR du cadre, jamais une mise à l'échelle — `scale`
 *    tromperait, `window.innerWidth` resterait celui du conteneur ;
 * ④ les DEUX aperçus du générateur le portent, pas seulement un ;
 * ⑤ le `sandbox` reste sans `allow-same-origin`.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { APPAREILS, legendeAppareil } from '../appareils'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), 'utf8')

const CONVERSATION = (): string =>
  lire('apps', 'web', 'src', 'components', 'onboarding', 'Conversation.tsx')
const ECRAN = (): string =>
  lire('apps', 'web', 'src', 'components', 'onboarding', 'ConversationApplication.tsx')

/** Les seuils que la cible WEB franchit réellement, lus à la source. */
const seuilsDuMoteur = (): number[] => {
  const web = lire('packages', 'compiler', 'src', 'emit-web.ts')
  const css = [...web.matchAll(/min-width:\s*(\d+)px/gu)].map((m) => Number(m[1]))
  const nav = lire('packages', 'compiler', 'runtime', 'disposition-navigation.ts')
  const rail = /SEUIL_LATERALE\s*=\s*(\d+)/u.exec(nav)
  return [...new Set([...css, Number(rail?.[1] ?? 0)])].filter((n) => n > 0).sort((a, b) => a - b)
}

// ── LES LARGEURS NE SE LISENT PLUS DANS L'ECRAN, MAIS A LEUR SOURCE.
//
// Elles vivaient dans `Conversation.tsx` ; depuis le 2026-11-02 elles vivent
// dans `appareils.ts`, parce que l'ATELIER montre la meme application dans
// les memes tailles et que deux listes auraient diverge au premier ajout.
//
// Ce controle s'en trouve RENFORCE : il ne lit plus une expression dans du
// JSX, il importe les valeurs reelles. Une faute de frappe dans un libelle
// ne peut plus le tromper, et un deuxieme tableau d'appareils ailleurs ne
// passerait plus inapercu -- le point ⑥ l'interdit.
const largeursProposees = (): number[] => APPAREILS.map((a) => a.largeur).sort((a, b) => a - b)

describe('EP-260 · le sélecteur d’appareil', () => {
  it('① LES LARGEURS TRAVERSENT TOUS LES SEUILS DU MOTEUR', () => {
    const seuils = seuilsDuMoteur()
    const largeurs = largeursProposees()
    expect(seuils.length, 'aucun seuil lu : le contrôle ne mesure plus rien').toBeGreaterThanOrEqual(
      4,
    )
    expect(largeurs.length, 'aucune largeur proposée').toBeGreaterThanOrEqual(3)

    // ── UN SEUIL SANS TÉMOIN DES DEUX CÔTÉS N'EST PAS ÉPROUVABLE.
    //
    // Pour chaque seuil, il faut au moins une largeur EN DESSOUS et une
    // AU-DESSUS : sinon la bascule qu'il commande reste invisible, et le
    // sélecteur ne sert à rien pour ce seuil-là.
    for (const s of seuils) {
      expect(
        largeurs.some((l) => l < s),
        `aucune largeur sous le seuil ${String(s)} px : sa bascule est invisible`,
      ).toBe(true)
      expect(
        largeurs.some((l) => l >= s),
        `aucune largeur au-dessus du seuil ${String(s)} px`,
      ).toBe(true)
    }
  })

  it('② LE SÉLECTEUR EST AU-DESSUS DU CADRE — la place que le propriétaire a montrée', () => {
    const c = CONVERSATION()
    const barre = c.indexOf('aria-pressed')
    const cadre = c.indexOf('<iframe')
    expect(barre, 'aucun sélecteur').toBeGreaterThan(-1)
    expect(cadre, 'aucun cadre').toBeGreaterThan(-1)
    expect(
      barre < cadre,
      'le sélecteur est sous le cadre : il ne se lit plus comme « ceci règle ce que je vois dessous »',
    ).toBe(true)
  })

  it('③ IL RÈGLE LA LARGEUR DU CADRE, JAMAIS UNE MISE À L’ÉCHELLE', () => {
    // ── POURQUOI CETTE DISTINCTION DÉCIDE DE TOUT.
    //
    // Un `transform: scale()` rétrécirait l'image SANS changer
    // `window.innerWidth` : la navigation ne basculerait pas, les `@media`
    // non plus. On verrait une maquette, pas l'application à cette taille.
    const c = CONVERSATION()
    const i = c.indexOf('export function ApercuAppareil')
    const bloc = c.slice(i, c.indexOf('export function', i + 40))
    // La regex tolere la mise en forme : le style du cadre s'ecrit sur
    // plusieurs lignes depuis que la hauteur peut etre relative. Ce qui est
    // garde, c'est que la LARGEUR soit pilotee par un style en ligne.
    expect(bloc, 'la largeur du cadre n’est pas pilotée').toMatch(/style=\{\{\s*width:/u)
    expect(bloc, 'une mise à l’échelle trompeuse est utilisée').not.toMatch(/scale\(/u)
    // `overflow-auto` a remplace `overflow-x-auto` le 2026-11-02 : la
    // hauteur du cadre final est devenue relative a la fenetre, et sans
    // defilement VERTICAL un contenu plus haut que le cadre redeviendrait
    // inatteignable. Les deux axes satisfont la propriete, un seul non.
    expect(bloc, 'le cadre ne peut pas déborder : les grandes largeurs seraient écrasées').toMatch(
      /overflow-(x-)?auto/u,
    )
  })

  it('④ LES DEUX APERÇUS LE PORTENT — pas seulement un', () => {
    // La leçon du LOT 3, payée une fois : une fonction écrite et à moitié
    // branchée ne sert qu'à moitié. Le générateur a DEUX aperçus — celui qui
    // se construit, et le final.
    const e = ECRAN()
    const occurrences = [...e.matchAll(/<ApercuAppareil/gu)].length
    expect(occurrences, 'un seul aperçu porte le sélecteur, ou aucun').toBe(2)
    // ET AUCUN IFRAME NU NE SUBSISTE dans cet écran : un aperçu oublié
    // resterait figé en pleine largeur sans que rien ne le signale.
    expect(
      [...e.matchAll(/<iframe/gu)].length,
      'un iframe nu subsiste : cet aperçu-là ne se règle pas',
    ).toBe(0)
  })

  it('⑤ L’ICÔNE PORTE LE SENS, MAIS LE MOT RESTE', () => {
    // ── POURQUOI UNE ICÔNE SEULE NE SUFFIT PAS.
    //
    // Un bouton d'icône nue est un mot de passe visuel : qui ne reconnaît pas
    // le pictogramme ne peut pas deviner ce qu'il règle. Les trois portent
    // donc leur libellé, et le groupe se nomme pour qui navigue au clavier
    // ou à la voix.
    const c = CONVERSATION()
    const i = c.indexOf('export function ApercuAppareil')
    const bloc = c.slice(i, c.indexOf('export function', i + 40))
    for (const icone of ['Smartphone', 'Tablet', 'Monitor']) {
      expect(c, `l’icône ${icone} n’est pas importée`).toMatch(
        new RegExp(`\\b${icone}\\b.*lucide-react|lucide-react.*\\b${icone}\\b`, 'u'),
      )
    }
    // L'icône ne vient plus du tableau lui-même (`<a.Icone`) mais d'une
    // table `clé → composant` tenue dans l'écran : le module des appareils
    // doit rester PUR, et un composant React dedans l'aurait tué.
    expect(bloc, 'les boutons n’affichent aucune icône').toMatch(/<Icone\b/u)
    // ── CETTE ASSERTION A ÉTÉ CORRIGÉE APRÈS AVOIR ÉTÉ VERTE À TORT.
    //
    // Elle cherchait d'abord `{a.libelle}` n'importe où dans le bloc. Mesuré
    // par mutation le 2026-10-17 : retirer le libellé AFFICHÉ la laissait
    // VERTE, parce que `a.libelle` subsiste dans l'attribut `title`. Un
    // contrôle vert pour une mauvaise raison ne contrôle rien.
    //
    // On exige donc le libellé comme ENFANT JSX — `>{a.libelle}<` — ce qu'un
    // attribut ne peut pas produire.
    expect(bloc, 'le libellé a disparu : l’icône devient un mot de passe visuel').toMatch(
      />\{a\.libelle\}</u,
    )
    expect(bloc, 'le groupe n’est pas nommé pour les technologies d’assistance').toMatch(
      /aria-label="Taille de l’aperçu"/u,
    )
    // L'ÉTAT COURANT EST DIT EN TOUTES LETTRES sous le cadre : la couleur
    // seule ne porterait pas l'information pour qui ne la distingue pas.
    expect(bloc, 'la taille courante n’est pas écrite').toMatch(/legendeAppareil\(courant\)/u)
    // ── CETTE ASSERTION PORTAIT SUR LE CHAMP QUI CAUSAIT LE DEFAUT.
    //
    // Elle exigeait `courant.note`, « la disposition courante ». Or cette
    // note a ete VIDEE de son sens le 2026-10-31 : elle promettait « barre
    // du bas » la ou un tir reel rendait un rail lateral, parce que la loi
    // de disposition vit dans le moteur de rendu et pas dans les oeuvres du
    // moteur direct. Reduite a la seule largeur, elle REPETAIT la valeur
    // d'a cote -- l'ecran affichait « 1280 px · 1280 px », vu sur une
    // capture le 2026-11-02.
    //
    // UN CLIQUET QUI EXIGE UN CHAMP VIDE DE SENS PROTEGE LE DEFAUT. On
    // controle donc ce qui compte vraiment : la legende nomme la taille, et
    // n'ecrit le nombre QU'UNE FOIS.
    for (const a of APPAREILS) {
      const legende = legendeAppareil(a)
      expect(legende, 'la légende ne nomme pas la taille').toContain(a.libelle)
      expect(
        [...legende.matchAll(new RegExp(String(a.largeur), 'gu'))].length,
        `la légende répète le nombre : « ${legende} »`,
      ).toBe(1)
    }
  })

  it('⑥ LE BAC À SABLE RESTE FERMÉ — l’application ne lit rien du site hôte', () => {
    const c = CONVERSATION()
    expect(c, 'le sandbox a disparu').toMatch(/sandbox="allow-scripts"/u)
    expect(
      c,
      '`allow-same-origin` autoriserait l’application à lire le site qui l’héberge',
    ).not.toMatch(/allow-same-origin/u)
  })

  it('LES DEUX MÉCANISMES DE LARGEUR LISENT BIEN LA FENÊTRE — sinon rien ne bougerait', () => {
    // ── CE CONTRÔLE GARDE LA PRÉMISSE DU LOT.
    //
    // Si `useLargeurDeFenetre` cessait de lire `window.innerWidth`, régler la
    // largeur du cadre ne changerait plus la navigation, et ce sélecteur
    // deviendrait un ornement — vert, et faux.
    const plateforme = lire('packages', 'compiler', 'runtime', 'plateforme-web.tsx')
    expect(plateforme, 'la largeur ne vient plus de la fenêtre').toMatch(/window\.innerWidth/u)
    expect(
      plateforme,
      'aucun écouteur `resize` : la bascule ne serait plus vivante',
    ).toMatch(/addEventListener\("resize"/u)
    const nav = lire('packages', 'compiler', 'runtime', 'disposition-navigation.ts')
    expect(nav, 'le seuil du rail a disparu').toMatch(/SEUIL_LATERALE/u)
  })
})
