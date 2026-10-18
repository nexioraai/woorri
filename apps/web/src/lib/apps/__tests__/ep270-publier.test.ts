/**
 * EP-270 — PUBLIER : UNE ADRESSE QU'ON PEUT ENVOYER, ET AUCUN MENSONGE DESSUS.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Deux moitiés, parce que le propriétaire a demandé que les DEUX cibles soient
 * couvertes et qu'elles ne se publient pas du tout de la même façon :
 *
 *   · LE WEB se publie vraiment — un lien, servi par Deribfy, à coût zéro.
 *     Ce qui doit être tenu : le lien NE CHANGE PAS, et la page servie ne peut
 *     JAMAIS toucher l'origine de Deribfy.
 *
 *   · LE NATIF ne se publie pas sans argent ni identifiants. Ce qui doit être
 *     tenu : l'écran dit EXACTEMENT ce qui manque, en séparant ce qui est à
 *     nous de ce qui est à lui — et il le MESURE sur l'émission réelle.
 *
 * ── CE QU'IL NE PROUVE PAS.
 *
 * 🟠 Il ne prouve pas qu'un navigateur applique la CSP comme écrit. Ça se
 *    vérifie dans un navigateur, et la gate `app_web_rendu` en a un ; ce
 *    cliquet-ci tient la POLITIQUE, pas son exécution.
 * 🟠 Il ne prouve rien d'un magasin réel : aucune soumission n'a été faite.
 */
import { describe, expect, it } from 'vitest'
import {
  CSP_PAGE_PUBLIEE,
  ENTETES_PAGE_PUBLIEE,
  jetonPour,
  jetonValide,
  lienDePublication,
  nouveauJeton,
} from '../publication'
import { exigencesDuMagasin } from '../exigences-magasin'

describe('EP-270 · le web se publie', () => {
  it('① un jeton neuf est indevinable et ne porte aucun caractère ambigu', () => {
    const jetons = new Set(Array.from({ length: 500 }, () => nouveauJeton()))
    expect(jetons.size, 'deux jetons identiques sur 500 : le tirage est cassé').toBe(500)
    for (const j of jetons) {
      expect(jetonValide(j), `« ${j} » n'est pas de la forme attendue`).toBe(true)
      // Les caractères qu'une personne confond en recopiant un lien.
      expect(j, 'un caractère ambigu est passé').not.toMatch(/[0O1lI]/u)
    }
  })

  it('② REPUBLIER NE CHANGE PAS L’ADRESSE — c’est une promesse déjà écrite', () => {
    // `noteDeLivraison` promet noir sur blanc « le lien ne change pas ». Si
    // republier tirait un jeton neuf, tout lien déjà envoyé mourrait, et la
    // personne à qui on l'a envoyé ne saurait pas pourquoi.
    const premier = nouveauJeton()
    expect(jetonPour(premier), 'republier a changé le jeton').toBe(premier)
    // Et ce qui n'est PAS un jeton valide ne doit pas être conservé.
    for (const mauvais of [null, undefined, '', 'trop-court', 'A'.repeat(32), 123, {}]) {
      expect(jetonValide(mauvais), `« ${String(mauvais)} » a été jugé valide`).toBe(false)
      expect(jetonPour(mauvais), 'une valeur invalide a été gardée telle quelle').not.toBe(mauvais)
      expect(jetonValide(jetonPour(mauvais)), "le remplacement n'est pas valide").toBe(true)
    }
  })

  it('③ le lien se construit sans double barre, quelle que soit la base', () => {
    const j = nouveauJeton()
    expect(lienDePublication(j, 'https://deribfy.com')).toBe(`https://deribfy.com/p/${j}`)
    expect(lienDePublication(j, 'https://deribfy.com/')).toBe(`https://deribfy.com/p/${j}`)
    expect(lienDePublication(j, 'https://deribfy.com///')).toBe(`https://deribfy.com/p/${j}`)
  })

  it('④ LA PAGE PUBLIÉE NE PEUT PAS TOUCHER DERIBFY — l’invariant dur', () => {
    // ── POURQUOI CE CONTRÔLE EST LE PLUS IMPORTANT DU FICHIER.
    //
    // La page servie est du HTML produit par un modèle. Servie en même origine
    // que Deribfy, elle atteindrait les cookies de session, le `localStorage`
    // et toute requête authentifiée — pour CHAQUE application publiée.
    //
    // `allow-scripts` est indispensable : l'application EST du JavaScript.
    // `allow-same-origin` avec lui serait la porte grande ouverte. Les deux
    // ne doivent jamais voyager ensemble, et c'est exactement ce qu'un jour
    // quelqu'un voudra faire pour « juste » lire un stockage.
    expect(CSP_PAGE_PUBLIEE, 'la page tourne hors bac à sable').toContain('sandbox')
    expect(CSP_PAGE_PUBLIEE, "sans `allow-scripts` la page est un cadre blanc").toContain(
      'allow-scripts',
    )
    expect(
      CSP_PAGE_PUBLIEE,
      "`allow-same-origin` AVEC `allow-scripts` rend la session Deribfy " +
        'atteignable depuis une page écrite par un modèle. Jamais les deux.',
    ).not.toContain('allow-same-origin')
    // Elle ne parle à personne : ni télémétrie, ni police distante, ni appel
    // vers un domaine qu'un modèle aurait inventé.
    expect(CSP_PAGE_PUBLIEE).toContain("default-src 'none'")
    expect(CSP_PAGE_PUBLIEE).toContain("connect-src 'none'")
    expect(CSP_PAGE_PUBLIEE).toContain("form-action 'none'")
    // Un lien donné n'est pas une publication au monde.
    expect(ENTETES_PAGE_PUBLIEE['X-Robots-Tag']).toContain('noindex')
    // Republier doit se voir tout de suite.
    expect(ENTETES_PAGE_PUBLIEE['Cache-Control']).toBe('no-store')
  })
})

describe('EP-270 · le natif dit ce qui manque, et de quel côté', () => {
  const projet = (app: unknown, autres: readonly string[] = []): Map<string, string> => {
    const m = new Map<string, string>()
    if (app !== undefined) m.set('app.json', JSON.stringify(app))
    for (const c of autres) m.set(c, 'x')
    return m
  }

  it('⑤ sans manifeste lisible, le panneau le DIT au lieu de deviner', () => {
    for (const cas of [projet(undefined), new Map([['app.json', 'pas du json']])]) {
      const e = exigencesDuMagasin(cas)
      expect(e.exigences.length, 'le panneau est muet sur son propre aveuglement').toBe(1)
      expect(e.exigences[0]?.qui).toBe('moteur')
      expect(e.manquantsProprietaire, 'on réclame au propriétaire sans rien savoir').toBe(0)
    }
  })

  it('⑥ L’ESPACE D’APERÇU EST SIGNALÉ, et comme une phase connue', () => {
    const e = exigencesDuMagasin(
      projet({
        expo: {
          name: 'Tontine',
          version: '1.0.0',
          android: { package: 'com.deribfy.preview.tontine_sy' },
          ios: { bundleIdentifier: 'com.deribfy.preview.tontine-sy' },
        },
      }),
    )
    const sien = e.exigences.find((x) => x.quoi.includes('qui vous appartienne'))
    expect(sien, "l'identifiant d'aperçu passe en silence : un magasin rattacherait " +
      "l'application au compte Deribfy").toBeDefined()
    expect(sien?.qui, "c'est à NOUS de le construire, pas à lui de le fournir").toBe('moteur')
    expect(sien?.pourquoi, 'la décision du chantier n’est pas citée').toContain('D-013')
  })

  it('⑦ UN IDENTIFIANT QUI LUI APPARTIENT NE DÉCLENCHE RIEN', () => {
    // Contrôle NÉGATIF : sans lui, le contrôle ⑥ passerait même si on
    // signalait l'espace d'aperçu pour TOUTE application.
    const e = exigencesDuMagasin(
      projet({
        expo: {
          name: 'Tontine',
          version: '1.0.0',
          icon: './assets/icon.png',
          android: { package: 'com.sy.tontine' },
          ios: { bundleIdentifier: 'com.sy.tontine' },
        },
      }, ['assets/icon.png']),
    )
    expect(
      e.exigences.find((x) => x.quoi.includes('qui vous appartienne')),
      'un identifiant propre est signalé à tort',
    ).toBeUndefined()
    expect(e.manquantsMoteur, 'le moteur est déclaré en faute alors que tout y est').toBe(0)
  })

  it('⑧ L’ICÔNE ABSENTE EST BLOQUANTE, et le projet émis n’en porte aucune', () => {
    const sans = exigencesDuMagasin(
      projet({ expo: { name: 'T', version: '1.0.0', android: {}, ios: {} } }),
    )
    const icone = sans.exigences.find((x) => x.quoi.includes('icône'))
    expect(icone?.qui, 'une icône absente est présentée comme satisfaite').toBe('moteur')
    expect(icone?.pourquoi, 'les tailles exigées ne sont pas dites').toContain('512')
    // Déclarée au manifeste MAIS absente du projet : toujours bloquant. Un
    // chemin qui ne pointe sur rien casse la construction, pas l'inverse.
    const declareeSeule = exigencesDuMagasin(
      projet({ expo: { name: 'T', version: '1.0.0', icon: './assets/icon.png' } }),
    )
    expect(
      declareeSeule.exigences.find((x) => x.quoi.includes('icône'))?.qui,
      'une icône déclarée mais absente du projet passe pour satisfaite',
    ).toBe('moteur')
  })

  it('⑨ CE QUI EST À LUI N’EST JAMAIS RANGÉ AVEC CE QUI EST À NOUS', () => {
    // La distinction EST la valeur du panneau. Les confondre laisserait
    // quelqu'un payer 25 $ pour découvrir ensuite qu'il manquait une icône
    // que NOUS n'émettons pas.
    const e = exigencesDuMagasin(
      projet({ expo: { name: 'T', version: '1.0.0', android: {}, ios: {} } }),
    )
    const sien = e.exigences.filter((x) => x.qui === 'proprietaire')
    expect(sien.length, 'les exigences du propriétaire ont disparu').toBe(4)
    for (const x of sien) {
      expect(x.pourquoi, `« ${x.quoi} » est réclamé sans dire pourquoi`).toBeDefined()
    }
    // Les comptes coûtent de l'argent, et le panneau le CHIFFRE.
    expect(sien.map((x) => x.pourquoi).join(' ')).toContain('25 $')
    expect(sien.map((x) => x.pourquoi).join(' ')).toContain('99 $')
    // Les clés ne doivent PAS nous être confiées, et le panneau dit pourquoi.
    const cles = sien.find((x) => x.quoi.includes('signature'))
    expect(cles?.pourquoi, 'on ne dit pas pourquoi les clés restent chez lui').toContain(
      'qui tient la clé',
    )
  })

  it('⑩ LE PROJET RÉELLEMENT ÉMIS est mesuré — pas une liste écrite à côté', async () => {
    // ── ON APPELLE LE COMPILATEUR, comme EP-267 appelle le service.
    //
    // Un contrôle qui fabrique son propre `app.json` ne prouve rien du moteur :
    // il prouve que le module lit du JSON. Ici on compile une VRAIE tranche et
    // on mesure ce que l'émission porte.
    const { readFileSync } = await import('node:fs')
    const { migrateAirDocument } = await import('@deribfy/air-schema')
    const { compileProject } = await import('@deribfy/compiler')
    const air = migrateAirDocument(
      JSON.parse(readFileSync('../../slices/tontine/tontine.air.json', 'utf8')),
    )
    const e = exigencesDuMagasin(compileProject(air).files)
    // L'ÉTAT MESURÉ LE 2026-10-18 : le moteur porte le nom, la version et les
    // deux identifiants ; il ne porte NI icône NI identité propre au client.
    expect(e.exigences.some((x) => x.quoi.includes("nom d'application") && x.qui === 'satisfait'))
      .toBe(true)
    expect(e.exigences.some((x) => x.quoi.includes('icône') && x.qui === 'moteur')).toBe(true)
    expect(e.exigences.some((x) => x.quoi.includes('qui vous appartienne'))).toBe(true)
    // Deux blocages moteur, quatre du propriétaire. Les nombres ne peuvent que
    // BAISSER côté moteur : émettre une icône fera descendre celui-là.
    expect(e.manquantsMoteur, 'le compte des blocages moteur a changé').toBeLessThanOrEqual(2)
    expect(e.manquantsProprietaire).toBe(4)
  })
})
