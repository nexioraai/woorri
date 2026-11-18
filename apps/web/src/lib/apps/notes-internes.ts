/**
 * LES NOTES DE NOTRE CONTRÔLE QUALITÉ — pas les défauts de l'appli (point 5, 2026-11-18).
 *
 * MESURÉ sur les cinq applis récentes : « ⚠ 1 point à surveiller » affichait
 * toujours la même phrase, « Application PARTIELLEMENT éprouvée : 24 sur N
 * contrôles… ». Le juge d'exécution s'arrête à 24 contrôles quelle que soit
 * l'appli : c'est le plafond de NOTRE outil, pas un manque de l'appli. Écrite
 * à la génération, jamais mise à jour par une retouche, et le commerçant n'y
 * pouvait rien.
 *
 * Ces notes restent dans `diagnostics` (l'administrateur les voit) ; le
 * commerçant ne voit que ce sur quoi il peut agir. Les préfixes sont écrits
 * UNE fois ici, et la route qui écrit les notes les emploie : un filtre qui
 * recopierait le texte divergerait au premier changement de phrase.
 */
export const NOTE_EPROUVEE_PARTIELLEMENT = 'Application PARTIELLEMENT éprouvée : '
export const NOTE_JUGE_INDISPONIBLE = 'Le juge de demarrage n a pas pu s executer'

const PREFIXES_INTERNES: readonly string[] = [NOTE_EPROUVEE_PARTIELLEMENT, NOTE_JUGE_INDISPONIBLE]

/** Une note de notre contrôle, que le commerçant ne peut pas régler. */
export const estNoteInterne = (diagnostic: string): boolean =>
  PREFIXES_INTERNES.some((p) => diagnostic.startsWith(p))

/** Ce que le commerçant voit : seulement ce sur quoi il peut agir. */
export const diagnosticsPourLeCommercant = (diagnostics: readonly string[]): string[] =>
  diagnostics.filter((d) => !estNoteInterne(d))
