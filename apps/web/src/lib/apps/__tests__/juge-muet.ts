/**
 * UN JUGE D'EXÉCUTION MUET, pour les contrôles qui n'éprouvent PAS le
 * démarrage.
 *
 * Le vrai juge monte un processus par tour (mesuré : ~800 ms). Les cliquets
 * de couverture et de devise n'ont rien à prouver là-dessus — EP-302 le
 * prouve, et lui paie les processus. Ce muet dit « ça démarre » sans rien
 * exécuter : employé AILLEURS que dans un test, il rendrait le juge
 * décoratif, et c'est pourquoi il vit dans le dossier des contrôles.
 */
import type { jugerExecution } from '../juge-execution'

export const jugeMuet: typeof jugerExecution = async () => ({
  monteDansSimulateur: true,
  erreurs: [],
  octetsRendus: 1,
  texte: '',
  ms: 0,
})
