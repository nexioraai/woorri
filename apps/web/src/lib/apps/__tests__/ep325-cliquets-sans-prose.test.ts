/**
 * EP-325 · UN CLIQUET DE LA PORTE NE LIT JAMAIS UNE PROSE.
 *
 * ── CE QU'IL REND OBLIGATOIRE, ET POURQUOI PAS MÉMORABLE.
 *
 * Neuf fois le 2026-11-02, une assertion sur du source a été satisfaite par
 * un commentaire. J'ai « aligné » les contrôles un par un — et le
 * propriétaire l'a dit : « aligner un contrôle à la fois veut dire que le
 * prochain cliquet naîtra sans, et le suivant aussi. C'est précisément ce
 * qui s'est produit neuf fois. »
 *
 * Ce contrôle ferme la classe pour les cliquets qui gardent LA PORTE ET LE
 * SCHÉMA : s'ils lisent du source, ils passent par `lireSource`. Pas une
 * convention à se rappeler — le seul chemin disponible.
 *
 * ── POURQUOI CE SOUS-ENSEMBLE, ET PAS LES 258.
 *
 * Mesuré : 282 fichiers de test lisent du source, 24 seulement en retirent
 * les commentaires. Les 258 autres sont à traiter, et ils attendent D5 —
 * décision du propriétaire, parce que la part du travail portant sur
 * l'appareil de mesure ne cesse de croître.
 *
 * Mais ceux-ci gardent des propriétés de SÉCURITÉ. « Si l'un d'eux était
 * vert par une prose, ce n'est pas un test qui ment — c'est une porte dont
 * on croit qu'elle ferme. »
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource, lireSourceBrut } from './lire-source'
import {
  DEGUISEMENTS,
  QUESTION_DEVANT_UN_CLIQUET,
  REGLE_MESURER_LA_SORTIE,
} from '../mesurer-la-sortie'

/** Les cliquets de la porte et du schéma. Leur liste est le périmètre. */
const GARDIENS: readonly string[] = [
  'ep318-schema-donnees.test.ts',
  'ep320-porte-donnees.test.ts',
  'ep321-base-oeuvres.test.ts',
  'ep322-poser-oeuvre.test.ts',
  'ep323-document-sans-secret.test.ts',
  'ep324-compte-oeuvre.test.ts',
]

describe('EP-325 · les cliquets de la porte', () => {
  it('① AUCUN D’EUX NE LIT DU SOURCE SANS LE DÉPOUILLER', () => {
    const fautifs: string[] = []
    for (const nom of GARDIENS) {
      // On lit le cliquet SANS sa prose : sinon son propre bloc de tête, qui
      // explique pourquoi `readFileSync` est interdit, le ferait rougir.
      // C'est le défaut qu'il garde, appliqué à lui-même.
      const code = lireSource(join(__dirname, nom))
      if (/\breadFileSync\s*\(/u.test(code)) fautifs.push(`${nom} — readFileSync direct`)
      if (/\bsansCommentaires\s*=/u.test(code)) {
        fautifs.push(`${nom} — redéfinit le dépouillage au lieu d’employer le commun`)
      }
    }
    expect(fautifs, 'un cliquet de la porte lit du source avec sa prose').toEqual([])
    expect(GARDIENS.length, 'le périmètre s’est vidé : le contrôle ne mesure rien')
      .toBeGreaterThanOrEqual(6)
  })

  it('② `lireSource` RETIRE VRAIMENT LA PROSE — témoin', () => {
    // ── SANS CE TÉMOIN, « 42 VERTS » NE DISTINGUE PAS DEUX CHOSES.
    //
    // « Aucun cliquet ne mentait » et « ma fonction ne retire rien » donnent
    // la même sortie. Le témoin lit un fichier dont une phrase ne vit QUE
    // dans un commentaire, et exige qu'elle disparaisse.
    const cible = join(__dirname, '..', 'identites-derivees.ts')
    const brut = lireSourceBrut(cible)
    const code = lireSource(cible)
    // ── MON PREMIER TÉMOIN A ÉCHOUÉ, ET POUR LA BONNE RAISON.
    //
    // J'avais choisi « attend son tour », qui vit AUSSI dans la constante
    // exportée. Un témoin doit porter sur une phrase qui n'existe QUE dans
    // un commentaire — sinon il mesure la présence du code, pas le retrait
    // de la prose.
    // Sans apostrophe : la droite et la typographique coexistent dans ce
    // depot, et un temoin qui choisit la mauvaise mesure sa propre faute.
    const PROSE_SEULE = 'TROIS COSTUMES EN UNE'
    expect(brut, 'le fichier témoin a changé : il ne porte plus la phrase attendue')
      .toContain(PROSE_SEULE)
    expect(code, 'lireSource ne retire pas les blocs de commentaire')
      .not.toContain(PROSE_SEULE)
    // ET IL NE MANGE PAS LE CODE : un dépouillage qui vide tout passerait
    // tous les contrôles en silence.
    expect(code, 'lireSource a mangé le code avec la prose')
      .toContain('REGLE_IDENTITES_DERIVEES')
  })

  it('④ LA RÈGLE DE LA SORTIE EST ÉCRITE, à côté de celle des identités', () => {
    // ── LA DEUXIÈME RÈGLE GÉNÉRALE DE LA JOURNÉE.
    //
    // Le propriétaire l'a formulée mieux que moi : « le dépouillage n'était
    // qu'un pansement. Un cliquet qui lit du source peut toujours être
    // trompé — une prose aujourd'hui, un gabarit demain, une chaîne
    // reconstruite après-demain. Un cliquet qui lit ce qui part ne le peut
    // pas : il n'y a plus d'écart entre ce qu'il mesure et ce qui arrive à
    // l'utilisateur. »
    //
    // Et ça change ce qui reste : non pas « convertir 243 cliquets au
    // dépouillage », mais « lesquels gardent une propriété de CE QUI PART ».
    // Beaucoup moins de travail, et meilleur.
    expect(REGLE_MESURER_LA_SORTIE, 'la règle ne dit plus ce qui trompe un cliquet')
      .toMatch(/toujours être trompé/u)
    expect(REGLE_MESURER_LA_SORTIE, 'la règle ne nomme plus l’absence d’écart')
      .toMatch(/écart/u)
    expect(REGLE_MESURER_LA_SORTIE, 'la règle ne dit plus que le dépouillage est un pansement')
      .toMatch(/pansement/u)
    expect(DEGUISEMENTS.length, 'les déguisements connus ne sont plus listés')
      .toBeGreaterThanOrEqual(3)
    expect(QUESTION_DEVANT_UN_CLIQUET, 'la question à se poser a disparu')
      .toMatch(/puis-je la regarder/u)
  })

  it('③ LES DEUX QUI NE LISENT AUCUN SOURCE SONT LES MIEUX FAITS', () => {
    // ── LA MEILLEURE FORME N'EST PAS DE DÉPOUILLER, C'EST DE NE PAS LIRE.
    //
    // `ep320` juge le SQL émis, `ep323` le document servi. Aucune prose ne
    // peut les tromper, parce qu'ils ne regardent pas la source : ils
    // regardent CE QUI PART. C'est la même discipline que le cliquet qui lit
    // le zip, et c'est la direction vers laquelle les 258 autres devraient
    // tendre quand on les reprendra.
    for (const nom of ['ep320-porte-donnees.test.ts', 'ep323-document-sans-secret.test.ts']) {
      const code = lireSource(join(__dirname, nom))
      expect(code, `${nom} s’est mis à lire du source : qu’il juge la SORTIE`)
        .not.toMatch(/lireSource\(|readFileSync\(/u)
    }
  })
})
