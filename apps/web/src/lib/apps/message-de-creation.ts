/**
 * LE MESSAGE MONTRÉ À LA PERSONNE APRÈS UNE CRÉATION (2026-11-23).
 *
 * Extrait MOT POUR MOT de `ConversationApplication.tsx`, qui l'emploie : la
 * boîte noire enregistre ainsi le message RÉELLEMENT montré, calculé par la
 * même fonction que l'écran. Une copie dans la route aurait divergé à la
 * première phrase changée — c'est exactement ce qui avait laissé
 * `messageMontre` à une phrase fixe (« J'ai créé votre application. »)
 * alors que l'écran en disait bien plus.
 */
import { proportionEprouvee } from './portee-epreuve'

/** Ce que l'écran lit de la réponse d'une création réussie. */
export type CorpsCreation = {
  readonly tours?: readonly unknown[]
  readonly dureeMs?: number
  readonly jetons?: readonly { readonly fichier: string; readonly reference: string }[]
  readonly execution?: {
    readonly monteDansSimulateur: boolean
    readonly indisponible?: string
    readonly ecransVisites?: number
    readonly ecransDecouverts?: number
    readonly ecransDistincts?: number
    readonly erreurs: readonly { readonly quoi: string; readonly message: string }[]
  }
  readonly persistance?: readonly { readonly table: string; readonly lue: boolean; readonly ecrite: boolean }[]
  readonly vivacite?: readonly { readonly fichier: string; readonly manque: string }[]
  readonly couverture?: {
    readonly exigences?: readonly { readonly exigence: string; readonly statut: string }[]
    readonly absentes?: readonly { readonly exigence: string; readonly cahier: number }[]
    readonly taux?: number | null
  }
}

/** Les lignes de la bulle « Votre application est prête », dans l'ordre de l'écran. */
export function messageDeCreation(d: CorpsCreation): string[] {
  return [
    `Votre application est prête en ${String(Math.round((d.dureeMs ?? 0) / 1000))} secondes` +
      ` (${String(d.tours?.length ?? 1)} essai(s)).`,
    ...(() => {
      const ex = d.couverture?.exigences ?? [];
      const absentes = d.couverture?.absentes ?? [];
      const morts = d.vivacite ?? [];
      const lignes: string[] = [];
      if (ex.length > 0) {
        const couvertes = ex.filter((x) => x.statut === 'couverte').length;
        const declarees = ex.filter((x) => x.statut === 'declaree-hors-perimetre');
        lignes.push(
          `Couverture du cahier : ${String(couvertes)}/${String(ex.length)} exigences couvertes` +
            (declarees.length > 0
              ? `, ${String(declarees.length)} déclarée(s) hors périmètre (${declarees.map((x) => x.exigence).join(', ')})`
              : '') +
            '.',
        );
      } else if (d.couverture !== undefined && d.couverture.taux === null) {
        // ── LE SILENCE ÉTAIT LE PIRE DES DEUX.
        //
        // La ligne au-dessus ne s'affichait que `si ex.length > 0`.
        // Sur une demande ordinaire, le contrôle ne retient AUCUNE
        // exigence — mesuré sur quatre demandes réalistes sur
        // quatre, dont un site institutionnel. La ligne disparaissait
        // donc entièrement, et la personne lisait « votre application
        // est prête en 34 secondes », rien d'autre.
        //
        // Un silence, à l'endroit exact où quelqu'un décide de garder
        // l'œuvre, se lit comme « rien à signaler ». C'est pour ça que
        // ceci est un AVEU et pas un score.
        lignes.push(
          '⚠ Couverture du cahier : NON MESURÉE. Votre demande ne contient aucune ' +
            'des familles d’exigences que ce contrôle sait reconnaître — il ne l’a ' +
            'donc PAS vérifiée sur ce point. Les autres contrôles ci-dessus, eux, ' +
            'ont bien tourné.',
        );
      }
      // ── CE QUI NE SE CONSERVE PAS, DIT À LA LIVRAISON.
      //
      // C'est le moment où la personne décide de garder l'œuvre ou
      // de la faire corriger. Le verdict voyageait dans la réponse
      // depuis le 2026-11-03 et AUCUN écran ne le lisait — une
      // pièce détachée de plus, sur le seul défaut dont la
      // conséquence tombe après la livraison.
      const enMemoire = d.persistance ?? [];
      if (enMemoire.length > 0) {
        lignes.push(
          `⚠ Données NON CONSERVÉES : ${enMemoire
            .map(
              (x) =>
                `${x.table} (${x.lue ? 'lue, jamais écrite' : x.ecrite ? 'écrite, jamais lue' : 'ni lue ni écrite'})`,
            )
            .join(', ')} — ce qui y est saisi disparaîtra au rechargement.`,
        );
      }
      if (absentes.length > 0) {
        lignes.push(
          `⚠ Non couvert et non déclaré : ${absentes.map((x) => x.exigence).join(', ')} — à exiger ou à accepter en connaissance.`,
        );
      }
      const exec = d.execution;
      if (exec !== undefined) {
        lignes.push(
          exec.indisponible !== undefined
            ? '⚠ Le juge de montage n’a pas pu s’exécuter : cette application n’a PAS été éprouvée.'
            : exec.monteDansSimulateur
              ? (() => {
                  const vus = exec.ecransVisites ?? 0;
                  const trouves = Math.max(exec.ecransDecouverts ?? vus, vus);
                  // LE DÉNOMINATEUR SE DIT TOUJOURS : un rapport qui
                  // ne le donne que lorsqu'il est mauvais est un
                  // rapport qu'on apprend à ne plus lire.
                  // LA PROPORTION, PAS LA PAIRE SEULE : « 24 » se
                  // lit comme beaucoup, « 21 % » se lit comme ce
                  // que c'est. Calculée par `proportionEprouvee`,
                  // une seule source pour les trois affichages.
                  return trouves > vus
                    ? `⚠ Montée dans un simulateur, PARTIELLEMENT éprouvée : ${proportionEprouvee(vus, trouves, exec.ecransDistincts ?? 0)}. NON VÉRIFIÉE DANS UN NAVIGATEUR.`
                    : `Montée dans un simulateur : ${proportionEprouvee(vus, trouves, exec.ecransDistincts ?? 0)}. NON VÉRIFIÉE DANS UN NAVIGATEUR.`;
                })()
              : `⚠ L’application ne se monte pas (simulateur) : ${exec.erreurs[0]?.message ?? 'cause inconnue'}.`,
        );
      }
      const jetonsMorts = d.jetons ?? [];
      if (jetonsMorts.length > 0) {
        lignes.push(
          `⚠ ${String(jetonsMorts.length)} référence(s) à des éléments inexistants (${[...new Set(jetonsMorts.map((x) => x.reference))].slice(0, 4).join(', ')}) — l’application peut s’arrêter au démarrage.`,
        );
      }
      if (morts.length > 0) {
        lignes.push(
          `⚠ ${String(morts.length)} contrôle(s) sans action réelle (${[...new Set(morts.map((x) => x.fichier))].slice(0, 3).join(', ')}).`,
        );
      }
      return lignes;
    })(),
  ]
}
