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
/**
 * LE PONT D'EXPORTS NOMMÉS AU-DESSUS DU PAQUET UMD DE SUPABASE.
 *
 * ── MESURÉ LE 2026-11-03, et c'est ce qui rend ce pont nécessaire.
 *
 * Servir `dist/umd/supabase.js` directement sous son propre nom donne :
 *
 *     [MISSING_EXPORT] « createClient » is not exported by
 *     "\0embarque:@supabase/supabase-js"
 *
 * Un paquet UMD POSE ses exports à l'exécution (`exports.createClient = …`)
 * au lieu de les déclarer. L'empaqueteur ne peut donc pas les voir
 * statiquement — il n'en expose que le défaut.
 *
 * ── POURQUOI L'UMD QUAND MÊME, et pas `dist/index.cjs`.
 *
 * `index.cjs` exige ses cinq dépendances (auth-js, postgrest-js,
 * realtime-js, storage-js, functions-js) et les leurs — donc le DISQUE de la
 * fonction décide à nouveau, le défaut exact que ce fichier existe pour
 * fermer (0,45 $ de tirs morts, quatre incidents en douze jours). L'UMD les
 * porte toutes, fondues, en un seul tenant.
 *
 * ── POURQUOI UN PONT ET PAS UNE ÉTAPE D'EMPAQUETAGE.
 *
 * ── ET CE N'EST PAS UN UMD : c'est une IIFE à variable globale.
 *
 * Troisième mesure du 2026-11-03, et celle qui a tranché. Le fichier
 * commence par `var supabase=(function(e){…})({})` et finit par
 * `e.createClient=vi,…,e})({})` — il ne consulte NI `module` NI `exports` :
 * il déclare une variable et la remplit.
 *
 * D'où les deux échecs précédents, et ils disaient tous les deux la vérité :
 *
 * · servi sous son nom → `MISSING_EXPORT: « createClient »` (il n'en
 *   déclare aucun) ;
 * · pont par `import umd from …` → `MISSING_EXPORT: « default »` (pas plus
 *   de défaut CommonJS, puisqu'il n'écrit pas dans `module.exports`) ;
 * · pont déclarant `exports`/`module` → il COMPILE, puis
 *   `createClient is not a function` à l'exécution. Le pire des trois :
 *   vert à l'assemblage, mort au chargement.
 *
 * Le pont lit donc la LIAISON QUE LE FICHIER CRÉE. Et comme le nom de cette
 * liaison est une supposition sur du code tiers, EP-327 l'EXÉCUTE : un
 * changement de nom à la prochaine montée de version rougit au lieu de
 * livrer une application morte.
 *
 * ── POUR MÉMOIRE, LE PONT PAR `exports`.
 *
 * Deuxième mesure du 2026-11-03 : un pont qui faisait
 * `import umd from '@supabase/supabase-js/umd'` a donné
 *
 *     [MISSING_EXPORT] « default » is not exported by
 *     "\0embarque:@supabase/supabase-js/umd"
 *
 * L'empaqueteur ne reconnaît pas ce fichier comme CommonJS : son niveau
 * supérieur ne touche ni `module` ni `exports` — tout se passe dans la
 * fabrique. Le pont ne DÉPEND donc d'aucune détection : il déclare les deux
 * liaisons, laisse la fabrique les remplir, et réexporte ce qu'il y trouve.
 *
 * Pré-empaqueter supabase en ESM marcherait aussi, au prix d'un bundler
 * dans le script générateur et d'un `contenuGenere()` devenu asynchrone —
 * donc du cliquet EP-294 qui le compare. Six lignes de pont font la même
 * chose sans toucher à la chaîne qui garde ce fichier.
 */
const GLOBALE_SUPABASE = 'supabase'

const pontSupabase = (iife: string): string =>
  [
    iife,
    `export const createClient = ${GLOBALE_SUPABASE}.createClient`,
    `export const SupabaseClient = ${GLOBALE_SUPABASE}.SupabaseClient`,
    `export const AuthError = ${GLOBALE_SUPABASE}.AuthError`,
    `export const FunctionsError = ${GLOBALE_SUPABASE}.FunctionsError`,
    `export default ${GLOBALE_SUPABASE}`,
  ].join('\n')

/**
 * spécificateur d'import → source servie en mémoire.
 *
 * LE MODÈLE IMPORTE `@supabase/supabase-js`, le nom réel du paquet — c'est
 * ce qui permet au MÊME CODE de fonctionner dans les deux provenances : ici
 * par la mémoire, et dans le zip téléchargé par la vraie dépendance npm.
 */
export const MODULES_EMBARQUES: ReadonlyMap<string, string> = new Map([
  ...Object.entries(donnees.modules),
  [
    '@supabase/supabase-js',
    pontSupabase(donnees.modules['@supabase/supabase-js/umd'] ?? ''),
  ],
])
