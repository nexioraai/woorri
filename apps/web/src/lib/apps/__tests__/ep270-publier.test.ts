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
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import {
  CSP_PAGE_PUBLIEE,
  cspSousDomaine,
  ENTETES_PAGE_PUBLIEE,
  jetonPour,
  jetonValide,
  lienDePublication,
  nouveauJeton,
} from '../publication'
import { exigencesDuMagasin } from '../exigences-magasin'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')

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

  it('④bis L’INVARIANT EST CONDITIONNEL À LA ROUTE — et la raison est mesurée', () => {
    // ── POURQUOI CET ASSOUPLISSEMENT, ET POURQUOI IL N'EN EST PAS UN.
    //
    // ④ a été écrit quand une œuvre publiée n'avait NI base NI réseau. On
    // lui a donné une base le 2026-11-02. L'en-tête n'a pas été revue, et
    // trois jours d'applications mortes ont suivi :
    //
    //   snenak.deribfy.app    HTTP 200 → ARRÊTÉE
    //   cahier-…-technique    HTTP 200 → ARRÊTÉE
    //   deribfy.com/p/juwcrs… HTTP 200 → ARRÊTÉE
    //
    //     webkit   : SecurityError: Context's origin is opaque
    //     chromium : Access to the Locks API is denied in this context
    //                at gi.Lr [as lock] (…/:14740:44)
    //
    // Un cliquet qui défend un passé devenu faux pour une MOITIÉ de son
    // périmètre ne garde plus rien : il empêche la correction. Septième fois
    // cette semaine. Donc on sépare les deux régimes, et on ratifie CHACUN.
    //
    // ── LA DISSYMÉTRIE, MESURÉE LE 2026-11-05.
    //
    // `*.deribfy.app` est un domaine ENREGISTRABLE DIFFÉRENT de
    // `deribfy.com` : la session du produit y est hors d'atteinte avec ou
    // sans bac à sable. Le bac à sable n'y achetait que l'isolation ENTRE
    // applications — or `localStorage` est déjà cloisonné par origine.
    //
    // `/p/<jeton>` est servi par `www.deribfy.com`, MÊME ORIGINE que le
    // produit. MESURÉ : `src/lib/supabase.ts` appelle `createClient` SANS
    // options, donc `persistSession: true`, donc la session vit dans le
    // `localStorage` de `www.deribfy.com`. Y lever le bac à sable donnerait
    // à une application écrite par un modèle la lecture du jeton de session
    // de son propriétaire.
    const PRODUIT = lireSource(join(SRC, 'lib', 'supabase.ts'))
    expect(
      PRODUIT,
      'le client du produit ne crée plus sa session par défaut : la raison ' +
        'de l’asymétrie a changé, RELIS-LA avant de toucher aux régimes',
    ).toMatch(/createClient\(supabaseUrl, supabaseAnonKey\);?$/mu)

    // ── LE RÉGIME DU SOUS-DOMAINE : une vraie origine, un réseau borné.
    const sd = cspSousDomaine('https://psxbilpmnojtlzosokzz.supabase.co')
    expect(sd, 'le sous-domaine a perdu sa vraie origine — il remourra').toContain(
      'sandbox allow-scripts allow-same-origin',
    )
    // ── ET LE RÉSEAU NE S'OUVRE QU'AU SEUL PROJET, `wss:` COMPRIS.
    //
    // MESURÉ : le paquet embarqué porte `realtime` ×22 et `wss://` ×1.
    // `connect-src` avec une URL `https:` n'autorise PAS `wss:` — une œuvre
    // qui s'abonne démarrerait et échouerait SANS RIEN DIRE. On aurait
    // échangé un plantage franc contre une panne silencieuse.
    expect(sd, 'le temps réel est bloqué : panne silencieuse').toContain(
      'wss://psxbilpmnojtlzosokzz.supabase.co',
    )
    expect(sd, 'le réseau de l’application n’est plus borné à son projet').toMatch(
      /connect-src https:\/\/psxbilpmnojtlzosokzz\.supabase\.co wss:\/\/psxbilpmnojtlzosokzz\.supabase\.co/u,
    )
    // ── ON COMPARE DES JETONS, PAS DES MORCEAUX.
    //
    // Mon premier jet cherchait la sous-chaîne ` https:` — que
    // ` https://psxbilpmnojtlzosokzz…` contient. Le contrôle rougissait sur
    // du code juste. Une assertion satisfaite par un PRÉFIXE ne mesure pas
    // ce qu'elle prétend : c'est la famille déjà payée cinq fois cette
    // semaine.
    const sources = sd
      .slice(sd.indexOf('connect-src'), sd.indexOf('; sandbox'))
      .split(/\s+/u)
      .slice(1)
    expect(sources, 'connect-src ne nomme plus exactement deux sources').toEqual([
      'https://psxbilpmnojtlzosokzz.supabase.co',
      'wss://psxbilpmnojtlzosokzz.supabase.co',
    ])
    // ── SANS BASE, RIEN NE SORT. Le plus étroit est le défaut.
    expect(cspSousDomaine(''), 'une œuvre sans base peut appeler le réseau').toContain(
      "connect-src 'none'",
    )

    // ── ET LE RÉGIME PERMISSIF NE DOIT JAMAIS ATTEINDRE `deribfy.com`.
    //
    // C'est LÀ que vit le danger, et c'est la seule chose que la séparation
    // des deux chaînes ne garantit pas toute seule : il suffirait qu'une
    // route du produit importe la mauvaise.
    const JETON = lireSource(join(SRC, 'app', 'p', '[jeton]', 'route.ts'))
    expect(
      JETON,
      'la route servie depuis deribfy.com emploie le régime permissif : ' +
        'une application écrite par un modèle lirait la session du produit',
    ).not.toMatch(/entetesSousDomaine|cspSousDomaine/u)
    const SOUS = lireSource(join(SRC, 'app', 'a', '[sous]', 'route.ts'))
    expect(SOUS, 'le sous-domaine est retombé dans le régime opaque').toMatch(
      /entetesSousDomaine\(/u,
    )
    // ── ET IL N'Y A QUE DEUX PORTEURS. Une troisième route héritant du
    //    régime permissif passerait inaperçue.
    const porteurs = execFileSync('git', ['grep', '-l', 'entetesSousDomaine', '--', 'src/app'], {
      cwd: join(SRC, '..'),
    })
      .toString('utf8')
      .split('\n')
      .filter((f) => f !== '')
    expect(porteurs, 'une route inattendue porte le régime permissif').toEqual([
      'src/app/a/[sous]/route.ts',
    ])
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
