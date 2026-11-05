/**
 * EP-350 · (c) — LE JUGE NAVIGATEUR, ET CE QUI LE REND HONNÊTE.
 *
 * ── CE QU'IL FERME, MESURÉ LE 2026-11-05.
 *
 *   le paquet embarqué : `navigator.locks.request(…)` ×3
 *   happy-dom          : `navigator.locks` ABSENT — ni succès ni échec
 *   WebKit, opaque     : « undefined is not an object »
 *   sur le réseau      : « Origin null is not allowed by
 *                          Access-Control-Allow-Origin »
 *
 * ── POURQUOI CE CLIQUET LIT DES PROPRIÉTÉS ET N'OUVRE PAS DE NAVIGATEUR.
 *
 * Un lancement coûte ~4,2 s — plus du double du plafond de marge de la
 * gate (1 666 ms). L'exercice VIVANT est une étape séparée, comme les
 * autres contrôles lents du dépôt. Ici on garde ce qui rendrait le juge
 * menteur s'il changeait.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const APPS = join(__dirname, '..')
const ENVELOPPE = join(APPS, 'juge-navigateur.ts')
const ENFANT = join(APPS, 'juge-navigateur-enfant.mjs')

describe('EP-350 · le juge navigateur', () => {
  it('① LE MOTEUR PAR DÉFAUT EST WEBKIT — Chromium refait l’angle mort', () => {
    // ── LE RAISONNEMENT, ET IL EST MESURÉ.
    //
    // `request@[native code]` est une trame SAFARI. Nos utilisateurs
    // demandent des « applications mobiles ». Et sur la même œuvre :
    //
    //   chromium · localStorage → « Failed to read the 'localStorage'… »
    //   webkit   · localStorage → « The operation is insecure. »
    //
    // Un juge Chromium reproduirait, un cran plus haut, exactement le
    // défaut qu'on ferme : un juge qui n'exécute pas dans les conditions
    // du produit.
    expect(lireSource(ENVELOPPE), 'le moteur par défaut n’est plus WebKit').toMatch(
      /options\.moteur \?\? 'webkit'/u,
    )
  })

  it('② LE CADRE EST CELUI DE L’APERÇU, AU SIGNE PRÈS', () => {
    const src = lireSource(ENFANT)
    expect(src, 'le bac à sable du juge a divergé de celui de l’aperçu').toContain(
      'sandbox="allow-scripts"',
    )
    // ── `allow-same-origin` LE RENDRAIT AVEUGLE.
    //
    // C'est l'attribut qui donne une vraie origine, donc un stockage qui
    // marche et des Web Locks qui répondent. L'ajouter referait
    // exactement happy-dom, en plus lent.
    expect(src, 'le juge s’est donné une vraie origine').not.toMatch(/allow-same-origin/u)
  })

  it('③ LE RÉSEAU VA À UN BOUCHON, PAS DANS LE VIDE', () => {
    // ── UNE REQUÊTE ABORTÉE N'EST PAS UNE REQUÊTE REFUSÉE.
    //
    // La première meurt au transport ; la seconde traverse jusqu'à la
    // gestion d'erreur — là où les verrous, les relances et la session
    // entrent en jeu. Avec `abort()`, le juge n'exerçait que le chemin
    // heureux dans un vrai navigateur.
    const src = lireSource(ENFANT)
    expect(src, 'le juge aborte de nouveau : il n’exerce que le démarrage').not.toMatch(
      /r\.abort\(\)/u,
    )
    expect(src, 'aucune réponse n’est fabriquée').toMatch(/r\.fulfill\(/u)
    // ET LE BOUCHON REFUSE L'ORIGINE OPAQUE, comme un vrai service.
    expect(src, 'le bouchon autorise l’origine opaque — il ment').toMatch(
      /access-control-allow-origin[^\n]*deribfy\.invalid/u,
    )
  })

  it('④ UN JUGE QUI N’A PAS TOURNÉ LE DIT — son silence serait un vert', () => {
    // ── CHAQUE CAS D'ÉCHEC VIT OÙ IL SE PRODUIT.
    //
    // L'ENFANT connaît l'absence de playwright et le navigateur qui ne
    // démarre pas ; L'ENVELOPPE connaît le dépassement et le lancement
    // raté. Les chercher tous dans le même fichier faisait rougir sur
    // du code juste — une ancre qui vise le mauvais endroit mesure le
    // rangement, pas la propriété.
    const enfant = lireSource(ENFANT)
    for (const cas of [/playwright est absent/u, /le navigateur n’a pas démarré/u]) {
      expect(enfant, `l’enfant tait un échec : ${String(cas)}`).toMatch(cas)
    }
    const enveloppe = lireSource(ENVELOPPE)
    for (const cas of [/le juge n’a pas pu être lancé/u, /a dépassé/u, /aucune sortie du juge/u]) {
      expect(enveloppe, `l’enveloppe tait un échec : ${String(cas)}`).toMatch(cas)
    }
    // ET AUCUN DE CES CAS NE REND `aTourne: true` : un juge qui n'a pas
    // tourné ne doit jamais ressembler à un juge sans défaut.
    expect(enveloppe, 'un échec pourrait passer pour un succès').toMatch(
      /aTourne: v\.aTourne === true/u,
    )
  })

  it('⑤ ET LES REQUÊTES VUES VOYAGENT — zéro n’est pas « rien à dire »', () => {
    // ── LE PLAFOND SILENCIEUX QU'ON REFUSE.
    //
    // Mesuré sur `snenak` : ZÉRO requête en 8 s — il affiche son écran
    // de connexion et attend. Son vert ne vaut donc que pour le
    // DÉMARRAGE, et le taire laisserait croire que le chemin réseau a
    // été éprouvé.
    expect(lireSource(ENVELOPPE), 'les requêtes vues ne remontent pas').toMatch(
      /requetes: v\.requetes \?\? \[\]/u,
    )
    expect(lireSource(ENFANT), 'l’enfant ne compte pas ce qui part').toMatch(
      /requetes: vues\.slice/u,
    )
  })

  it('⑦ IL EST BRANCHÉ LÀ OÙ IL PEUT TOURNER — et le gate le compte', () => {
    // ── UN JUGE SANS APPELANT N'EXISTE PAS. Quatre fois cette semaine.
    //
    // `extraction-exigences`, `poserOeuvre`, l'injection de la base,
    // `assurerCompteOeuvre` : prouvés, jamais appelés. Celui-ci a le
    // défaut SYMÉTRIQUE à éviter — être câblé dans la route, où il ne
    // peut structurellement pas tourner :
    //
    //   playwright      : devDependency ^1.64.1, élaguée au runtime
    //   les navigateurs : 1,0 Go, HORS node_modules, jamais tracés
    //
    // Il rendrait « playwright est absent » à CHAQUE génération réelle.
    // D'où DEUX appelants, et aucun dans le chemin d'une requête.
    const ci = lireSource(join(APPS, '..', '..', '..', '..', '..', '.github', 'workflows', 'ci.yml'))
    expect(ci, 'le CI n’exerce plus l’instrument').toMatch(
      /node scripts\/verifier-juge-navigateur\.mjs/u,
    )
    // ── ET SANS LE NAVIGATEUR, LE SCRIPT N'A RIEN À LANCER.
    expect(ci, 'le CI ne pose plus WebKit').toMatch(/playwright install[^\n]*webkit/u)
    // ── UNE ÉTAPE QUI ROUGIT SANS RIEN ARRÊTER N'EXISTE PAS.
    //
    // « Seule la ligne du gate dit vrai » : les étapes portent
    // `continue-on-error`, donc une étape absente du verdict final
    // rougirait en silence pendant des semaines.
    expect(ci, 'le gate ne compte pas le juge navigateur').toMatch(
      /steps\.juge_navigateur\.outcome \}\}" != "success" \]; then/u,
    )

    // ── LE SCRIPT MORD DANS LES DEUX SENS, et c'est le cœur.
    //
    // Deux témoins fautifs SEULS prouveraient un juge qui rougit sur
    // tout ; le témoin SAIN seul prouverait un juge aveugle. Les trois
    // ensemble, et rien d'autre, disent que l'instrument discrimine.
    const script = lireSource(join(APPS, '..', '..', '..', 'scripts', 'verifier-juge-navigateur.mjs'))
    expect(script, 'le témoin sain a disparu : un juge aveugle passerait').toMatch(
      /nom: 'le sain',[\s\S]{0,200}attend: null/u,
    )
    for (const [nom, trame] of [
      ['le stockage', /insecure/u],
      ['le réseau', /Origin null/u],
    ] as const) {
      const i = script.indexOf(`nom: '${nom}'`)
      expect(i, `le témoin « ${nom} » a disparu`).toBeGreaterThan(0)
      expect(
        script.slice(i, i + 400),
        `le témoin « ${nom} » n’attend plus sa trame`,
      ).toMatch(trame)
    }
    // ET L'ÉCHEC D'UN TÉMOIN SORT EN CODE NON NUL : un script qui
    // imprime son défaut et rend 0 est une étape verte.
    expect(script, 'le script ne fait plus échouer le CI').toMatch(/process\.exit\(1\)/u)
  })

  it('⑧ ET LE BALAYAGE DES ŒUVRES RÉELLES EXISTE, hors de la gate', () => {
    // ── CE QUE LE CI NE PEUT PAS FAIRE : juger les VRAIES œuvres.
    //
    // Elles vivent en base ; le CI n'a pas à en dépendre, et un contrôle
    // dont le verdict change avec le contenu d'une table n'est pas un
    // contrôle. Mais sans ce balayage, l'instrument ne serait prouvé que
    // sur MES témoins — exactement « une sonde qui prouve le chemin du
    // témoin, pas tous les chemins ».
    //
    // Il a produit sa première trouvaille le jour de son écriture :
    //
    //   cec8bddf → [console] Origin null is not allowed by
    //              Access-Control-Allow-Origin. Status code: 200
    //
    // L'œuvre émet une requête AU DÉMARRAGE, et l'origine opaque la fait
    // refuser. C'est la racine, reproduite par un instrument au lieu
    // d'une capture d'écran.
    const tir = lireSource(join(APPS, '..', '..', 'tirs', 'juge-navigateur-vivant.tir.ts'))
    expect(tir, 'le balayage n’ouvre plus de navigateur').toMatch(/jugerNavigateur\(/u)
    // ── DEUX ROUGES SÉPARÉS, et les confondre ferait chercher à côté.
    //
    // ① l'instrument n'a pas tourné → le tir ne prouve RIEN
    // ② une œuvre jette → c'est une TROUVAILLE
    expect(tir, 'l’instrument muet ne rougit plus : son silence passerait pour un vert').toMatch(
      /ce tir ne prouve RIEN/u,
    )
    expect(tir, 'une œuvre cassée ne rougit plus').toMatch(
      /une œuvre livrée jette dans un vrai navigateur/u,
    )
    // ── ET ZÉRO ŒUVRE EST UN ROUGE.
    //
    // « Vert qui ne mesure rien » : un balayage qui ne trouve rien à
    // monter n'a rien mesuré, et son vert dirait le contraire.
    expect(tir, 'un balayage à vide passerait pour vert').toMatch(
      /aucune œuvre livrée à monter[\s\S]{0,80}toBeGreaterThan\(0\)/u,
    )
  })

  it('⑥ ET L’INSTRUMENT NE SE MESURE PAS LUI-MÊME', () => {
    // ── LE FAUX ROUGE QUE J'AI FABRIQUÉ, PUIS RETIRÉ.
    //
    // Ma première forme lisait `contentDocument` du cadre. Chromium
    // avalait l'exception ; WEBKIT LA SIGNALAIT comme une erreur de
    // page, et le juge rendait un défaut qui était LE SIEN :
    //
    //   « Blocked a frame at "null" from accessing a frame at "null" »
    //   pile : at evaluate (:372:22)   ← MA ligne, pas la leur
    //
    // Un faux rouge coûte plus cher qu'un vert : il envoie chercher un
    // défaut qui n'existe pas.
    expect(
      lireSource(ENFANT),
      'le juge lit le cadre opaque depuis le parent — il se mesure lui-même',
    ).not.toMatch(/contentDocument/u)
  })
})
