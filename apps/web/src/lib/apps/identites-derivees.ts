/**
 * DÉRIVER UNE IDENTITÉ D'UNE AUTRE — la règle, et pourquoi elle se répète.
 *
 * ── LA RÈGLE.
 *
 *   DÉRIVER UNE IDENTITÉ D'UNE TRONCATURE D'IDENTITÉ EST UNE COLLISION QUI
 *   ATTEND SON TOUR.
 *
 * Et son corollaire, qui est la vraie leçon :
 *
 *   UNE GARDE QUI TIENT « EN PRATIQUE » NE TIENT PAS.
 *
 * ── TROIS COSTUMES EN UNE JOURNÉE, LE 2026-11-02.
 *
 * ① LA SAISIE BORNÉE À 50 SIGNES. Le nom de schéma d'une œuvre faisait 57
 *    octets au pire, sous la limite de 63 de Postgres. Ça tenait — par
 *    accident : il suffisait d'allonger le préfixe `oeuvre_`, de changer la
 *    forme de l'identifiant, ou de passer à un identifiant plus long, et 57
 *    devenait 64.
 *
 * ② LE NOM DE SCHÉMA À 63 OCTETS. Postgres tronque un identifiant plus long
 *    SANS RIEN DIRE. Deux œuvres qui ne diffèrent qu'après le 63e octet
 *    obtiendraient le même schéma, et la seconde écrirait dans les tables de
 *    la première.
 *
 * ③ L'ADRESSE DE COMPTE À 8 SIGNES. J'avais écrit « huit signes suffisent à
 *    l'unicité pratique ». Deux œuvres dont les identifiants partageaient
 *    leur préfixe obtenaient LA MÊME ADRESSE — et la seconde publication
 *    volait le compte de la première en « réparant » sa revendication.
 *
 * Les trois fois, la garde existait et semblait suffisante. Les trois fois,
 * elle reposait sur une propriété de l'entrée du jour plutôt que sur la
 * limite réelle de ce qui sort.
 *
 * ── CE QUE LA RÈGLE EXIGE CONCRÈTEMENT.
 *
 * · ON MESURE CE QUI PART, PAS CE QUI ENTRE. La borne porte sur la chaîne
 *   PRODUITE, juste avant qu'elle serve — jamais sur une saisie qui se
 *   trouve la contraindre.
 *
 * · DANS L'UNITÉ DE LA LIMITE. Postgres compte des OCTETS, une adresse
 *   compte des SIGNES, `length` compte des unités UTF-16. Les confondre
 *   rend la garde fausse sur le premier accent.
 *
 * · ON ÉCHOUE BRUYAMMENT PLUTÔT QUE DE TRONQUER. Une troncature silencieuse
 *   fabrique deux identités identiques, et le défaut ne se voit qu'au
 *   moment où des données se mélangent.
 *
 * · ET QUAND DEUX IDENTITÉS SE RENCONTRENT QUAND MÊME, ON REFUSE. L'unicité
 *   garantie aujourd'hui peut se rompre demain par un chemin qu'on n'a pas
 *   prévu. Le refus, lui, tient encore — c'est pourquoi
 *   `assurerCompteOeuvre` distingue une revendication ABSENTE (qu'on répare)
 *   d'une revendication DIFFÉRENTE (qu'on refuse) : la première est un
 *   oubli, la seconde est le compte de quelqu'un d'autre.
 *
 * ── POURQUOI CE MODULE N'EXPORTE QU'UN TEXTE.
 *
 * La règle ne se code pas : elle s'applique à chaque dérivation, et chacune
 * a sa limite propre. Ce qui se code, ce sont les gardes — `nomSchemaOeuvre`
 * pour les 63 octets, `adresseCompteOeuvre` pour les 64 signes. Ce fichier
 * existe pour que la QUATRIÈME fois, quelqu'un la reconnaisse avant de
 * l'écrire.
 */
export const REGLE_IDENTITES_DERIVEES =
  'Dériver une identité d’une troncature d’identité est une collision qui ' +
  'attend son tour. Corollaire : une garde qui tient « en pratique » ne ' +
  'tient pas. On mesure ce qui PART, dans l’unité de la limite, et on échoue ' +
  'bruyamment plutôt que de tronquer. Et quand deux identités se rencontrent ' +
  'malgré tout, on refuse — réparer ce qui appartient à un autre, c’est le ' +
  'lui prendre.'

/** Les trois fois où elle s'est présentée, pour la reconnaître à la quatrième. */
export const COSTUMES_CONNUS: readonly string[] = [
  'la saisie bornée à 50 signes, qui donnait 57 octets « sous la limite »',
  'le nom de schéma à 63 octets, que Postgres tronque sans rien dire',
  'l’adresse de compte à 8 signes, « suffisants à l’unicité pratique »',
]
