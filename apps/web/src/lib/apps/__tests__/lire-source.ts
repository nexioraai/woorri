/**
 * LIRE DU SOURCE POUR Y CHERCHER QUELQUE CHOSE — sans sa prose.
 *
 * ── CE QUE NEUF FAUX VERTS ONT APPRIS LE 2026-11-02.
 *
 * Une assertion sur du source est satisfaite par un commentaire plus souvent
 * qu'on ne l'imagine, parce qu'un bon commentaire CITE ce qu'il explique :
 *
 * · un `toContain('CE_QUE_DECLARER_CHANGE')` satisfait par la ligne d'import ;
 * · un `toContain("notify pgrst, 'reload config'")` satisfait par le bloc de
 *   tête qui raconte pourquoi cette notification existe ;
 * · un `not.toContain('Math.random')` rougissant sur un module qui explique
 *   qu'il n'emploie PAS `Math.random` ;
 * · un `not.toContain('user_metadata')` rougissant sur la phrase qui met en
 *   garde contre `user_metadata` ;
 * · une mutation qui frappe la phrase explicative au lieu de la constante.
 *
 * Les neuf ont été trouvés PAR HASARD, en écrivant la mutation suivante.
 * Aucun ne venait d'une faute de raisonnement : ils venaient tous de ce que
 * la prose et le code vivent dans le même fichier.
 *
 * ── POURQUOI UNE FONCTION ET PAS UNE CONVENTION.
 *
 * « Aligner un contrôle à la fois veut dire que le prochain cliquet naîtra
 * sans, et le suivant aussi — c'est précisément ce qui s'est produit neuf
 * fois. » Un cliquet qui cherche dans du source emploie `lireSource`, et
 * c'est tout : il n'y a rien à se rappeler.
 *
 * ── CE QU'ELLE NE FAIT PAS.
 *
 * Elle ne retire pas un commentaire de FIN DE LIGNE (`code; // note`), et
 * c'est assumé : le retirer demanderait de distinguer un `//` de code d'un
 * `//` de prose, donc un analyseur. La formule couvre les blocs — qui
 * portent l'essentiel de la prose de ce dépôt — et les lignes qui
 * commencent par `//`.
 *
 * Elle n'est PAS un analyseur syntaxique : sur un gabarit qui contient du
 * code d'une autre langue avec ses propres commentaires (`emit-spring.ts`
 * émet du Java commenté), elle retirerait aussi ceux-là. Un cliquet qui juge
 * un ÉMETTEUR doit donc juger sa SORTIE, pas sa source — ce qui est de
 * toute façon la bonne discipline.
 */
import { readFileSync } from 'node:fs'

/** Retire les blocs `/* … *\/` et les lignes qui commencent par `//`. */
export function sansCommentaires(texte: string): string {
  return texte.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')
}

/**
 * LIT UN FICHIER DE CODE ET REND SON CODE.
 *
 * `brut` existe pour les rares cas où la prose EST l'objet du contrôle —
 * un cliquet qui exige qu'une décision soit documentée, par exemple. Il
 * doit alors le dire explicitement, et c'est le but : rendre le choix
 * visible plutôt que par défaut.
 */
export function lireSource(chemin: string): string {
  return sansCommentaires(readFileSync(chemin, 'utf8'))
}

/** La prose comprise — à n'employer que lorsqu'on juge la prose elle-même. */
export function lireSourceBrut(chemin: string): string {
  return readFileSync(chemin, 'utf8')
}
