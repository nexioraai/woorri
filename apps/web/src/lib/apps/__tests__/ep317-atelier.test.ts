/**
 * EP-317 · L'ATELIER — et surtout la boucle qui le rend utile.
 *
 * ── LE DÉFAUT QUE CE LOT FERME, MESURÉ SUR LES CAPTURES DU PROPRIÉTAIRE.
 *
 * L'aperçu était greffé sur la page de création : l'application occupait un
 * quart de la fenêtre, flottait dans le fond violet, était coupée en bas, et
 * il restait autour la barre latérale marketing, le titre « Création sur
 * mesure » et le champ de création d'une AUTRE application.
 *
 * ── CE QUE CE CLIQUET TIENT, ET POURQUOI CHAQUE POINT A COÛTÉ QUELQUE CHOSE.
 *
 * ① L'ATELIER EST TROUVABLE. Leçon payée le 2026-11-01 : l'historique des
 *    versions marchait de bout en bout — base, route, affichage — et
 *    personne ne le trouvait, parce qu'il avait la typographie la plus pâle
 *    de la carte. Un écran qu'aucun lien n'atteint n'existe pas.
 * ② L'APERÇU REMPLIT LA HAUTEUR. Une hauteur en dur coupe forcément
 *    quelque part : elle ne peut pas savoir dans quelle fenêtre elle
 *    s'affiche. Et `min-h-0` n'est pas une décoration — sans lui, un enfant
 *    flex refuse de rétrécir sous son contenu et DÉBORDE la fenêtre, ce qui
 *    reproduit exactement « coupée en bas ».
 * ③ LE CHAMP DE SAISIE EST HORS DE LA ZONE QUI DÉFILE. Un champ qui part
 *    avec le fil oblige à remonter pour écrire.
 * ④ L'APERÇU SE RAFRAÎCHIT APRÈS CHAQUE GESTE. C'est LA raison d'être de
 *    l'atelier. Sans ce point, les quatre autres ne servent à rien : on
 *    demanderait du vert et il faudrait aller le chercher ailleurs.
 * ⑤ UNE SEULE LISTE D'APPAREILS. Le dépôt a déjà payé trois copies de la
 *    règle de nommage, dont une ignorait les noms réservés : la publication
 *    échouait APRÈS le clic.
 * ⑥ L'ATELIER N'ATTEINT RIEN DU SERVEUR. C'est un composant client : un
 *    import de serveur y tirerait le SDK du fournisseur ou un client
 *    Supabase dans le paquet navigateur — la classe de défaut d'EP-314, qui
 *    a déjà tué un build.
 * ⑦ LE FIL DIT LES MOTS DE LA PERSONNE, et n'invente rien quand il n'en a
 *    pas.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { echangesDe, heureCourte } from '../fil-atelier'
import { etapeRetouche } from '../retouche'
import { APPAREILS } from '../appareils'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), 'utf8')
const WEB = ['apps', 'web', 'src']

const ATELIER = (): string => lire(...WEB, 'app', 'atelier', '[id]', 'page.tsx')
const CADRE = (): string => lire(...WEB, 'components', 'atelier', 'CadreApercu.tsx')

/** Le corps d'une fonction de l'écran, de sa déclaration à la suivante. */
const corpsDe = (source: string, nom: string): string => {
  const i = source.indexOf(`const ${nom} =`)
  expect(i, `la fonction ${nom} n’existe pas`).toBeGreaterThan(-1)
  const j = source.indexOf('\n  const ', i + 10)
  return source.slice(i, j === -1 ? source.length : j)
}

/** Tous les fichiers de code sous `src`, hors tests. */
const sources = (): string[] => {
  const out: string[] = []
  const marcher = (d: string): void => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) {
        if (e !== '__tests__' && e !== 'node_modules') marcher(p)
      } else if (/\.tsx?$/u.test(e)) out.push(p)
    }
  }
  marcher(join(RACINE, ...WEB))
  return out
}

describe('EP-317 · l’atelier', () => {
  it('① IL EST TROUVABLE — depuis les projets ET depuis la création', () => {
    // Deux chemins, parce qu'une application se travaille à deux moments :
    // juste après l'avoir générée, et en y revenant plus tard.
    const tableau = lire(...WEB, 'app', 'dashboard', 'page.tsx')
    expect(tableau, 'aucune carte n’ouvre l’atelier').toMatch(/\/atelier\/\$\{/u)
    const creation = lire(...WEB, 'components', 'onboarding', 'ConversationApplication.tsx')
    expect(creation, 'la page de création ne mène pas à l’atelier').toMatch(/\/atelier\/\$\{/u)
    // ET IL RAMÈNE : un plein écran sans sortie est un piège.
    expect(ATELIER(), 'l’atelier ne ramène pas aux projets').toMatch(/href="\/dashboard"/u)
    expect(ATELIER(), 'le retour n’est pas nommé').toMatch(/Mes projets/u)
  })

  it('② L’APERÇU REMPLIT LA HAUTEUR — aucune hauteur en dur', () => {
    const c = CADRE()
    // ── CE CONTROLE A ETE VERT A TORT, ET LA MUTATION L'A DIT.
    //
    // Il cherchait `min-h-0` N'IMPORTE OU dans le fichier. Or la section
    // englobante le porte aussi : le retirer du CADRE — le seul endroit ou
    // il empeche le debordement — laissait le cliquet vert. On interroge
    // donc la classe du cadre defilant elle-meme.
    const classeDuCadre = /className="([^"]*overflow-auto[^"]*)"/u.exec(c)?.[1] ?? ''
    expect(classeDuCadre, 'le cadre défilant n’a pas été trouvé').not.toBe('')
    expect(classeDuCadre, 'le cadre ne prend pas la hauteur restante').toContain('flex-1')
    // `min-h-0` N'EST PAS UNE DECORATION : sans lui, un enfant flex refuse
    // de retrecir sous la taille de son contenu et DEBORDE la fenetre —
    // l'application est coupee en bas, le defaut exact qu'on ferme.
    expect(classeDuCadre, 'sans min-h-0 le cadre débordera : application coupée en bas')
      .toContain('min-h-0')
    // ── UNE HAUTEUR EN PIXELS EST L'EXACTE CAUSE DU DÉFAUT.
    //
    // On interdit donc `height: '420px'`, `h-[420px]` et leurs variantes
    // dans le cadre de l'atelier. La LARGEUR en pixels, elle, reste exigée
    // ailleurs : c'est ce que l'application LIT.
    expect(c, 'une hauteur en pixels est revenue : elle coupera l’application')
      .not.toMatch(/height:\s*[`'"]?\$?\{?\s*\d+\s*px/u)
    expect(c, 'une hauteur en pixels est revenue (classe utilitaire)')
      .not.toMatch(/\bh-\[\d+px\]/u)
    // LE CONTENU DÉFILE DANS LE CADRE au lieu d'être tronqué.
    expect(c, 'le cadre ne défile pas : un contenu plus grand serait inatteignable')
      .toMatch(/overflow-auto/u)
    // Et la largeur reste RÉELLE, jamais une mise à l'échelle trompeuse.
    expect(c, 'la largeur n’est pas pilotée').toMatch(/style=\{\{\s*width:/u)
    expect(c, 'une mise à l’échelle trompeuse est utilisée').not.toMatch(/scale\(/u)
  })

  it('③ LE CHAMP DE SAISIE EST HORS DE LA ZONE QUI DÉFILE', () => {
    const a = ATELIER()
    // La zone du fil va de son conteneur défilant jusqu'à l'ancre de bas de
    // fil. Si un champ de saisie se trouve DEDANS, il part avec le fil.
    const debut = a.indexOf('overflow-auto')
    const fin = a.indexOf('ref={basDuFil}')
    expect(debut, 'le fil ne défile pas').toBeGreaterThan(-1)
    expect(fin, 'le fil n’a pas d’ancre de bas').toBeGreaterThan(debut)
    expect(
      a.slice(debut, fin).includes('<textarea'),
      'le champ de saisie est dans la zone qui défile : il partira avec le fil',
    ).toBe(false)
    expect(a, 'le bloc de saisie peut être comprimé').toMatch(/shrink-0[^]*<textarea/u)
  })

  it('④ L’APERÇU SE RAFRAÎCHIT APRÈS CHAQUE GESTE — le cœur de la boucle', () => {
    const a = ATELIER()
    // ── SANS CE POINT, L'ATELIER NE SERT À RIEN.
    //
    // La personne écrit « mets les boutons en vert » et doit VOIR le vert.
    // Si elle doit recharger la page ou cliquer ailleurs, on a construit une
    // page de plus, pas un atelier.
    const envoyer = corpsDe(a, 'envoyer')
    expect(envoyer, 'une retouche ne rafraîchit pas l’aperçu').toMatch(/chargerApercu\(\)/u)
    expect(envoyer, 'une retouche ne rafraîchit pas le fil').toMatch(/chargerVersions\(\)/u)
    // Et un RETOUR EN ARRIÈRE aussi : sinon l'œil garde la version d'après.
    const revenir = corpsDe(a, 'revenirA')
    expect(revenir, 'un retour en arrière ne rafraîchit pas l’aperçu').toMatch(/chargerApercu\(\)/u)
    // LE RAFRAÎCHISSEMENT NE COÛTE RIEN : il passe par la route qui
    // recompile des fichiers déjà en base, et n'appelle aucun modèle.
    expect(a, 'l’aperçu ne vient pas de la route gratuite').toMatch(/\/api\/generateur\/direct\//u)
  })

  it('⑤ UNE SEULE LISTE D’APPAREILS DANS TOUT LE DÉPÔT', () => {
    // Deux listes divergent au premier ajout. Celle-ci est lue par l'aperçu
    // de création ET par celui de l'atelier.
    const porteurs = sources().filter((f) => /largeur:\s*390\b/u.test(readFileSync(f, 'utf8')))
    expect(
      porteurs.map((f) => f.replace(`${RACINE}/`, '')),
      'une deuxième liste d’appareils est apparue',
    ).toEqual(['apps/web/src/lib/apps/appareils.ts'])
    expect(APPAREILS.length, 'la liste a perdu une taille').toBe(3)
  })

  it('⑥ L’ATELIER N’ATTEINT RIEN DU SERVEUR', () => {
    // Un composant client qui importe du serveur emporte le SDK du
    // fournisseur dans le paquet navigateur. EP-314 garde les modules purs ;
    // ce contrôle garde les deux écrans qui les consomment.
    // ── CE CONTROLE A ETE VERT A TORT, ET LA MUTATION L'A DIT.
    //
    // Il cherchait la chaine `'fournisseur`. Un import reel s'ecrit
    // `from '@/lib/apps/fournisseur'` : le guillemet precede le `@`, donc
    // l'aiguille n'apparaissait jamais. On extrait desormais les SOURCES
    // d'import et on les juge une par une.
    for (const [nom, source] of [['atelier', ATELIER()], ['cadre', CADRE()]] as const) {
      const sources = [...source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/gu)].map((m) => m[1])
      // Le cadre en a exactement trois (react, lucide, appareils) : exiger
      // davantage etait MON defaut, pas le sien. Le garde-fou doit prouver
      // que l'extraction marche, pas imposer un nombre d'imports.
      expect(sources.length, `${nom} n’a aucun import : le contrôle ne mesure rien`)
        .toBeGreaterThanOrEqual(3)
      for (const interdit of ['supabase-admin', 'fournisseur', 'journal', 'bac-a-sable']) {
        const fautifs = sources.filter((s2) => s2.includes(interdit))
        expect(fautifs, `${nom} atteint ${interdit} — le SDK partirait dans le navigateur`)
          .toEqual([])
      }
      // `node:` ne doit apparaitre dans AUCUN import d'un composant client.
      expect(sources.filter((s2) => s2.startsWith('node:')), `${nom} atteint node:`).toEqual([])
    }
    expect(ATELIER(), 'l’atelier n’est pas déclaré côté client').toMatch(/^'use client'/u)
  })

  it('⑦ LE FIL DIT LES MOTS DE LA PERSONNE, ET N’INVENTE RIEN', () => {
    const fil = echangesDe('une tontine pour mon quartier', [
      { rang: 1, etape: null, creeIl: '2026-11-02T09:00:00Z', coutUsd: 4.2 },
      { rang: 3, etape: etapeRetouche('mets les boutons en vert'), creeIl: '', coutUsd: 0.01 },
      { rang: 2, etape: 'pipeline', creeIl: '', coutUsd: 0 },
    ])
    // L'ORDRE EST CELUI D'UNE CONVERSATION : on lit vers le bas.
    expect(fil.map((e) => e.rang), 'le fil n’est pas dans l’ordre').toEqual([1, 2, 3])
    // ① Le rang 1 porte la demande d'origine, celle qui a tout déclenché.
    expect(fil[0].demande).toBe('une tontine pour mon quartier')
    // ② Une retouche rend ses mots SANS notre préfixe : « modifiée : mets
    //    les boutons en vert » afficherait notre phrase, plus la sienne.
    expect(fil[2].demande).toBe('mets les boutons en vert')
    expect(fil[2].demande).not.toContain('modifiée')
    // ③ Une étape qui n'est pas une demande n'en invente pas une.
    expect(fil[1].demande).toBeNull()
    // Et on ne dit que ce qu'on sait : aucun compte de fichiers deviné.
    expect(fil[2].fait).not.toMatch(/\d/u)
    // UNE DATE ILLISIBLE S'EFFACE, elle ne s'affiche pas « Invalid Date ».
    expect(heureCourte('')).toBeNull()
    expect(heureCourte('pas une date')).toBeNull()
    expect(heureCourte('2026-11-02T09:00:00Z')).not.toBeNull()
  })

  it('⑨ UN SEUL ENDROIT POUR LA RETOUCHE — plus de double', () => {
    // ── LE DEFAUT, ET POURQUOI IL ETAIT GRAVE SANS RIEN CASSER.
    //
    // La carte du tableau de bord a porte sa propre zone de retouche
    // pendant une journee : son plafond, son perimetre, sa gestion du refus
    // hors perimetre, sa confirmation de baisse de couverture. Un DOUBLE de
    // celle de l'atelier.
    //
    // Rien ne plantait. C'est exactement ce qui le rendait dangereux : au
    // premier changement du moteur, il fallait se souvenir des DEUX, et le
    // dépôt a déjà payé cette dette — trois copies de la règle de nommage,
    // dont une ignorait les noms réservés.
    //
    // Le geste vit donc là où l'œuvre se voit : dans l'atelier.
    const ecrivains = sources().filter((f) =>
      /\/api\/generateur\/retoucher[^'"`]*`?,?\s*\n?\s*\{?[^;]{0,400}method:\s*'POST'/u.test(
        readFileSync(f, 'utf8'),
      ) || /method:\s*'POST'[^;]{0,400}\/api\/generateur\/retoucher/u.test(readFileSync(f, 'utf8')),
    )
    expect(
      ecrivains.map((f) => f.replace(`${RACINE}/`, '')),
      'deux écrans écrivent une retouche : au prochain changement du moteur, un des deux mentira',
    ).toEqual(['apps/web/src/app/atelier/[id]/page.tsx'])
  })

  it('⑧ LE PRIX S’ANNONCE AVANT, ET C’EST UN PLAFOND', () => {
    const a = ATELIER()
    // Le plafond vient du SERVEUR : le calculer ici importerait
    // `fournisseur.ts`, donc le SDK du fournisseur dans le navigateur.
    expect(a, 'le plafond n’est pas demandé au serveur').toMatch(
      /\/api\/generateur\/retoucher\?id=/u,
    )
    // Il est AFFICHÉ sur le bouton, pas seulement reçu : une mesure qu'on ne
    // montre pas ne protège personne.
    expect(a, 'le plafond n’est pas affiché sur le bouton').toMatch(/Modifier — \$\{plafond\}/u)
    // ET LE PÉRIMÈTRE EST DIT AVANT D'ÉCRIRE, pas après le refus.
    expect(a, 'le périmètre n’est pas annoncé').toMatch(/\{perimetre\}/u)
  })
})
