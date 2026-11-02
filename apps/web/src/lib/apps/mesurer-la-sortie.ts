/**
 * MESURER CE QUI PART — la deuxième règle générale du 2026-11-02.
 *
 * ── LA RÈGLE.
 *
 *   UN CLIQUET QUI LIT DU SOURCE PEUT TOUJOURS ÊTRE TROMPÉ.
 *   UN CLIQUET QUI LIT CE QUI PART NE LE PEUT PAS.
 *
 * Parce qu'il n'y a plus d'écart entre ce qu'il mesure et ce qui arrive à la
 * personne.
 *
 * ── CE QUI A MENÉ À ELLE, ET LE PANSEMENT QU'ELLE REMPLACE.
 *
 * Neuf fois dans la journée, une assertion sur du source a été satisfaite
 * par une PROSE : un `toContain` que la ligne d'import comblait, un motif
 * `reload config` trouvé dans le bloc de tête, un `not.toContain('Math
 * .random')` rougissant sur la phrase qui explique qu'on ne l'emploie pas.
 *
 * Le remède immédiat a été de retirer les commentaires avant de chercher
 * (`lireSource`). C'EST UN PANSEMENT. La prose n'est qu'un des déguisements :
 *
 * · aujourd'hui une prose qui cite ce qu'elle explique ;
 * · demain un GABARIT — `emit-spring.ts` porte du Java commenté, et
 *   dépouiller l'émetteur mutile ce qu'il émet ;
 * · après-demain une CHAÎNE RECONSTRUITE — `'sb_' + 'secret_'` qu'aucune
 *   recherche de texte ne verra passer.
 *
 * Chaque fois, la cause est la même : LE CLIQUET MESURE UN INTERMÉDIAIRE.
 *
 * ── LES DEUX CLIQUETS QUI N'ONT JAMAIS PU ÊTRE TROMPÉS.
 *
 * Mesuré en auditant les six gardiens de la porte : `ep320` juge le SQL
 * ÉMIS, `ep323` le DOCUMENT SERVI. Aucun des deux ne lit une source. Aucune
 * prose, aucun gabarit, aucune concaténation ne peut les abuser — ils
 * regardent l'artefact, exactement celui que la base appliquera et que le
 * navigateur recevra.
 *
 * Et c'est aussi ce qui a attrapé les deux pires défauts du jour :
 *
 * · l'import `@deribfy/compiler` glissé DANS le gabarit `vite.config.ts`,
 *   invisible à `tsc` parce qu'à l'intérieur d'un littéral c'est une chaîne.
 *   Le cliquet qui LIT LE ZIP l'a vu ; ma relecture de la source, non.
 * · le titre d'une œuvre qui traverse la page à quatre endroits. Juger
 *   chaque entrée séparément aurait demandé de tenir la liste des chemins,
 *   et c'est le chemin qu'on oublie qui sert.
 *
 * ── CE QUE LA RÈGLE CHANGE POUR LE RESTE.
 *
 * Mesuré : 282 fichiers de test lisent du source, 24 en retirent les
 * commentaires. Le travail qui reste N'EST PAS « convertir 258 cliquets au
 * dépouillage ».
 *
 * C'est : PARMI EUX, LESQUELS GARDENT UNE PROPRIÉTÉ DE CE QUI PART ?
 *
 * · Ceux-là se repointent sur l'artefact — le document émis, le SQL émis,
 *   le zip, la réponse HTTP — et deviennent inattaquables.
 * · Les autres lisent du source parce que c'est tout ce qu'ils ont : un
 *   cliquet d'architecture qui interdit un import, une couture qui n'a pas
 *   de sortie observable. Pour ceux-là, `lireSource` suffit.
 *
 * C'est beaucoup moins de travail, et c'est meilleur.
 *
 * ── LA QUESTION À SE POSER DEVANT UN CLIQUET.
 *
 * « Quelle est la chose que l'utilisateur recevra, et puis-je la regarder ? »
 * Si oui, c'est elle qu'on mesure. Sinon, et seulement sinon, on lit la
 * source — dépouillée.
 */
export const REGLE_MESURER_LA_SORTIE =
  'Un cliquet qui lit du source peut toujours être trompé — par une prose, ' +
  'un gabarit, une chaîne reconstruite. Un cliquet qui lit CE QUI PART ne le ' +
  'peut pas : il n’y a plus d’écart entre ce qu’il mesure et ce qui arrive à ' +
  'la personne. Le dépouillage des commentaires est un pansement ; se ' +
  'repointer sur l’artefact est le remède.'

/** Ce qui a trompé un cliquet lisant du source, dans l'ordre où on l'a vu. */
export const DEGUISEMENTS: readonly string[] = [
  'une prose qui cite ce qu’elle explique (neuf fois le 2026-11-02)',
  'un gabarit portant du code d’une autre langue, avec ses propres commentaires',
  'une chaîne reconstruite par concaténation, qu’aucune recherche ne voit',
]

/**
 * CE QU'IL RESTE À FAIRE, FORMULÉ COMME UNE QUESTION ET PAS COMME UNE LISTE.
 *
 * Une liste de 258 fichiers invite à les traiter mécaniquement. La question,
 * elle, se pose fichier par fichier et rend la bonne réponse — qui est
 * souvent « repointe-le sur l'artefact », pas « dépouille-le ».
 */
export const QUESTION_DEVANT_UN_CLIQUET =
  'Quelle est la chose que l’utilisateur recevra, et puis-je la regarder ? ' +
  'Si oui, c’est elle qu’on mesure. Sinon, et seulement sinon, on lit la ' +
  'source — dépouillée.'
