/**
 * LA FAMILLE REACT, EMBARQUÉE DANS LE BUNDLE DU SERVEUR.
 *
 * ── POURQUOI, MESURÉ LE 2026-10-31 (0,45 $).
 *
 * Deux tirs payés sont morts sur « react non embarqué » : le disque de la
 * fonction Vercel de la génération n'avait pas `node_modules/react`, pendant
 * que /p/[jeton] assemblait la même œuvre sur le sien. L'assemblage dépendait
 * du traçage de CHAQUE fonction — quatrième incident de cette classe en douze
 * jours. Ici, l'empaqueteur résout le JSON généré À LA CONSTRUCTION : les
 * sources voyagent dans le code du serveur, le disque ne décide plus de rien.
 *
 * ── POURQUOI UN JSON ET PAS DU TYPESCRIPT.
 *
 * C'est une DONNÉE : 580 Ko de sources react transportées, jamais exécutées
 * ici. En .ts, trois cliquets de contenu (portabilité navigateur, JSON-LD,
 * isolation du banc) tiraient dessus — à raison : ils scannent du code. Le
 * JSON les laisse muets SANS les affaiblir d'une dérogation.
 *
 * Régénérer : `node scripts/generer-react-embarque.mjs` — et le cliquet
 * EP-294 rougit si le commité dérive d'un octet des paquets du lockfile.
 */
import donnees from './react-embarque.genere.json'

/** Préfixe des modules servis depuis la mémoire — jamais depuis le disque. */
export const PREFIXE_EMBARQUE = '\0embarque:'

/** Versions installées au moment de la génération — épinglées par EP-294. */
export const VERSIONS_EMBARQUEES: Readonly<Record<string, string>> = donnees.versions

/** spécificateur d'import → source CJS de production, prête pour rolldown. */
export const MODULES_EMBARQUES: ReadonlyMap<string, string> = new Map(
  Object.entries(donnees.modules),
)
