/**
 * EP-356 · P5 — L'ÉCRAN DIT CE QUI SERA PUBLIC, AVANT QUE L'ADRESSE EXISTE.
 *
 * ── POURQUOI P4 NE SUFFIT PAS, ET C'EST TOUT LE LOT.
 *
 * P4 fait voir à M1 une table qui DEVIENT publique dans une modification.
 * Mais LA PREMIÈRE GÉNÉRATION N'A PAS DE DIFF : une table publique dès sa
 * naissance ne passe devant personne. Sans ce refus, l'écran du
 * propriétaire ne nommerait jamais ce qu'il ouvre.
 *
 * ── LE CAS QUI LE JUSTIFIE.
 *
 * Un modèle qui lit « les appels d'offres sont publics » peut déclarer
 * publique la table des SOUMISSIONS des fournisseurs. Sur un marché
 * public, ce serait une faute grave : les offres concurrentes doivent
 * rester SCELLÉES jusqu'à l'ouverture des plis.
 *
 * Rien dans la FORME de la déclaration ne distingue ces deux tables.
 * Aucune grammaire ne peut donc trancher — seul un humain qui lit la
 * liste le peut, et il faut qu'il la lise AVANT.
 *
 * ── ET C'EST UN REFUS, PAS UN AVERTISSEMENT.
 *
 * « Un secret dans une page publiée ne se rattrape pas : elle est déjà
 * servie. » Une liste affichée à côté d'un bouton qu'on peut presser sans
 * la lire n'est pas une garde.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const ROUTE = join(
  __dirname, '..', '..', '..', 'app', 'api', 'generateur', 'publier', 'route.ts',
)

describe('EP-356 · P5 · publier nomme ce qui sera public', () => {
  const src = (): string => lireSource(ROUTE)

  it('① LA LISTE EST CALCULÉE DEPUIS LA DÉCLARATION STOCKÉE', () => {
    // ── PAS DEPUIS LE SQL, ET PAS DEPUIS LA DEMANDE.
    //
    // Le SQL émis la porte aussi, mais le relire demanderait de
    // l'analyser — et un analyseur de SQL écrit à la main est exactement
    // ce qu'on a refusé pour M2. La déclaration voyage avec l'œuvre
    // depuis M4 (a) ; c'est elle la source.
    expect(src(), 'la route ne lit plus la déclaration stockée').toMatch(
      /entites\?: readonly EntiteDeclaree\[\]/u,
    )
    expect(src(), 'la liste n’est plus calculée').toMatch(
      /\(docPublie\?\.entites \?\? \[\]\)\.filter\(lecturePubliqueDe\)\.map\(nomTable\)/u,
    )
    // LA MÊME LECTURE STRICTE QUE TOUTE LA CHAÎNE : une route qui lirait
    // le drapeau autrement nommerait d'autres tables que celles que le
    // SQL ouvre. Deux vérités, et c'est celle du moteur qui sert.
    expect(src(), 'la route emploie sa propre lecture du drapeau').not.toMatch(
      /lecturePublique === true|Boolean\(.*lecturePublique/u,
    )
  })

  it('② SANS ACCORD EXPLICITE, LA PUBLICATION EST REFUSÉE', () => {
    const s = src()
    expect(s, 'le refus a disparu').toMatch(/publiques\.length > 0 && !accord/u)
    expect(s, 'le refus n’est plus un refus').toMatch(/publiques\.length > 0 && !accord[\s\S]{0,2400}status: 409/u)
    // ── L'ACCORD EST UN `=== true`, pas une valeur vraie.
    //
    // Un corps qui porterait `"non"` passerait par coercition, et la
    // garde s'ouvrirait sur le mot qui la refuse.
    expect(s, 'l’accord se lit par coercition').toMatch(
      /lecturePubliqueAcceptee === true/u,
    )
    // ── ET UN CORPS ILLISIBLE NE VAUT PAS ACCORD.
    //
    // Publier sans corps JSON est le cas ORDINAIRE de cette route. Si une
    // exception valait `true`, il suffirait d'envoyer du texte brut pour
    // franchir la garde.
    expect(s, 'un corps illisible pourrait valoir accord').toMatch(
      /catch \{[\s\S]{0,60}accord = false/u,
    )
  })

  it('③ LE REFUS NOMME LES TABLES, ET DIT CE QUI RESTE FERMÉ', () => {
    const s = src()
    expect(s, 'le refus ne dit pas la conséquence').toMatch(
      /lisible[\s\S]{0,30}PAR TOUT LE MONDE, sans compte/u,
    )
    // Sans cette phrase, « publique » se lit comme « ouverte », et la
    // personne croit son site réécrivable par n'importe qui.
    expect(s, 'le refus laisse croire que l’écriture s’ouvre').toMatch(
      /Personne ne pourra y écrire/u,
    )
    // ── LA LISTE VOYAGE EN DONNÉES, pas seulement dans la phrase.
    //    L'écran doit pouvoir nommer chaque table, pas répéter un texte.
    expect(s, 'la liste ne voyage pas').toMatch(/tables: publiques/u)
    expect(s, 'l’écran ne peut pas distinguer ce refus des autres').toMatch(
      /lecturePublique: true/u,
    )
    // ── ET IL DIT QUOI FAIRE : un mur sans sortie est pire qu'un refus.
    expect(s, 'le refus ne propose rien').toMatch(/quoiFaire/u)
    expect(s, 'le refus ne dit pas que c’est irrattrapable').toMatch(
      /ne se rattrape pas/u,
    )
  })

  it('④ UNE ŒUVRE SANS TABLE PUBLIQUE N’EST PAS GÊNÉE', () => {
    // ── LA GARDE NE DOIT PAS S'EXERCER SUR LE CHEMIN ORDINAIRE.
    //
    // « Un contrôle qui ne s'exerce que sur le chemin heureux ne prouve
    // pas une garde. » L'inverse est vrai aussi : une garde qui gêne le
    // chemin ordinaire sera contournée, puis retirée.
    //
    // `publiques.length > 0` est la condition : zéro table publique, zéro
    // refus, et aucun second appel à faire.
    expect(src(), 'la garde s’exerce sur toute publication').toMatch(
      /if \(publiques\.length > 0 && !accord\)/u,
    )
  })

  it('⑤ ET ELLE PASSE AVANT QUE QUOI QUE CE SOIT SOIT POSÉ', () => {
    // ── L'ORDRE EST LA GARDE.
    //
    // Refuser APRÈS avoir posé le schéma, créé le compte ou écrit le
    // sous-domaine laisserait une œuvre à moitié publiée — et l'adresse
    // existerait déjà. « Avant que l'adresse existe » est littéral.
    const s = src()
    const refus = s.indexOf('publiques.length > 0 && !accord')
    expect(refus, 'le refus a disparu').toBeGreaterThan(0)
    for (const apres of ['poserOeuvre(', 'assurerCompteOeuvre(']) {
      const i = s.indexOf(apres)
      if (i < 0) continue
      expect(i, `« ${apres} » s’exécute AVANT le refus`).toBeGreaterThan(refus)
    }
  })
})
