/**
 * PUBLIER — DONNER À L'APPLICATION UNE ADRESSE QU'ON PEUT ENVOYER À QUELQU'UN.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-18.
 *
 * Une application générée n'avait que DEUX sorties : un zip à télécharger, et
 * un aperçu derrière une connexion. Aucune des deux ne se montre à quelqu'un
 * d'autre. Le but du chantier tout entier — qu'une application soit enfin VUE —
 * butait sur la dernière marche.
 *
 * ── CE QUI EXISTAIT DÉJÀ, ET CE QUI MANQUAIT VRAIMENT.
 *
 * `construireApercu` rend UNE PAGE HTML AUTONOME : son propre commentaire le
 * dit, « elle s'affiche sans rien demander au site qui l'héberge ». Tout le
 * travail difficile était fait. Ne manquaient qu'une adresse et une porte.
 *
 * ── POURQUOI UN JETON ET PAS UN IDENTIFIANT DE GÉNÉRATION.
 *
 * L'identifiant d'une génération est un UUID v4 — indevinable, donc on
 * pourrait croire qu'il suffit. Il ne suffit pas, pour une raison qui n'a rien
 * à voir avec l'entropie : il est DÉJÀ CONNU d'autres surfaces (les routes
 * d'état, les journaux, les diagnostics). Publier reviendrait à transformer
 * rétroactivement un identifiant interne en secret public, et un secret qui a
 * déjà circulé n'en est pas un.
 *
 * Le jeton de publication est donc un secret NEUF, créé au moment du geste, et
 * qui ne sert qu'à ça.
 *
 * ── ET POURQUOI IL NE CHANGE JAMAIS ENSUITE.
 *
 * `noteDeLivraison` promet déjà, noir sur blanc, « le lien ne change pas, et
 * la version complète remplacera celle-ci ». Republier doit donc rendre LE
 * MÊME jeton : un lien envoyé hier doit montrer l'application d'aujourd'hui.
 * C'est pourquoi `jetonPour` prend le jeton existant et ne le remplace pas.
 */
import { randomBytes } from 'node:crypto'

/**
 * 32 caractères base32url, soit 160 bits d'entropie.
 *
 * ── POURQUOI CETTE TAILLE ET CET ALPHABET.
 *
 * L'entropie d'abord : ce jeton est la SEULE chose qui protège la page. 160
 * bits, c'est le niveau d'une clé de session ; deviner relève de l'impossible
 * physique, pas de la difficulté.
 *
 * L'alphabet ensuite, et il est choisi pour l'œil autant que pour la machine :
 * pas de `+` ni de `/` (qui demandent un échappement dans une URL), pas de
 * `0`/`O` ni de `1`/`l`/`I` (qu'une personne confond en recopiant un lien lu
 * à voix haute ou sur une capture d'écran). Un lien se transmet aussi mal
 * qu'un numéro de téléphone — autant que les caractères ne s'en mêlent pas.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LONGUEUR = 32

export function nouveauJeton(): string {
  // On tire plus d'octets que nécessaire et on les projette sur l'alphabet.
  // `% ALPHABET.length` sur 31 symboles introduit un biais de l'ordre de
  // 31/256 — négligeable devant 160 bits, et le dire vaut mieux que le taire.
  const octets = randomBytes(LONGUEUR)
  let out = ''
  for (const o of octets) out += ALPHABET[o % ALPHABET.length]
  return out
}

/** Un jeton valide : exactement notre forme, rien d'autre. */
export function jetonValide(jeton: unknown): boolean {
  if (typeof jeton !== 'string' || jeton.length !== LONGUEUR) return false
  for (const c of jeton) if (!ALPHABET.includes(c)) return false
  return true
}

/**
 * Le jeton à écrire pour cette ligne : celui qui existe, ou un neuf.
 *
 * IDEMPOTENT PAR CONSTRUCTION. Republier ne change pas l'adresse — c'est la
 * promesse déjà écrite dans la note de livraison, et la casser enverrait les
 * gens sur une page morte sans qu'ils sachent pourquoi.
 */
export function jetonPour(existant: unknown): string {
  return jetonValide(existant) ? (existant as string) : nouveauJeton()
}

/** L'adresse publique, telle qu'on la donne à lire et à copier. */
export function lienDePublication(jeton: string, base: string): string {
  const racine = base.replace(/\/+$/u, '')
  return `${racine}/p/${jeton}`
}

/**
 * LA PAGE PUBLIÉE NE DOIT JAMAIS TOUCHER DERIBFY, ET C'EST LE POINT DUR.
 *
 * ── LE DANGER, DIT PRÉCISÉMENT.
 *
 * Servir du HTML produit par un modèle depuis NOTRE origine, c'est lui donner
 * la même origine que l'application Deribfy : les cookies de session, le
 * `localStorage`, les requêtes authentifiées — tout devient atteignable depuis
 * la page générée. Ce n'est pas un risque théorique : c'est la définition
 * d'une faille d'origine, et elle vaudrait pour CHAQUE application publiée.
 *
 * ── LA FERMETURE, ET POURQUOI `sandbox` SEUL NE SUFFIT PAS.
 *
 * `sandbox` sans `allow-same-origin` place la page dans une origine OPAQUE :
 * plus de cookies, plus de stockage, plus de même-origine. C'est la pièce
 * maîtresse. Mais `allow-scripts` est indispensable — l'application EST du
 * JavaScript, une page sans script serait un cadre blanc.
 *
 * Et `allow-scripts` avec `allow-same-origin` serait une porte grande ouverte.
 * Les deux ne doivent JAMAIS voyager ensemble : c'est l'invariant que le
 * cliquet EP-270 tient, parce qu'un jour quelqu'un voudra « juste » lire un
 * `localStorage` et ajoutera le second.
 *
 * `default-src 'none'` ferme le reste : la page ne parle à personne. Pas de
 * télémétrie, pas de police distante, pas d'appel sortant vers un domaine
 * qu'un modèle aurait inventé. Elle ne peut utiliser que ce qu'elle porte.
 */
/**
 * ── ET LA DISSYMÉTRIE DES DEUX ADRESSES EST LE CŒUR DE L'AFFAIRE
 *    (2026-11-05, après trois jours d'applications mortes).
 *
 * Le raisonnement ci-dessus a été écrit quand une œuvre publiée n'avait NI
 * base NI réseau. On lui a donné une base le 2026-11-02. L'en-tête n'a pas
 * été revue, et le résultat est mesuré :
 *
 *   snenak.deribfy.app              HTTP 200 → ARRÊTÉE
 *   cahier-…-technique.deribfy.app  HTTP 200 → ARRÊTÉE
 *   deribfy.com/p/juwcrs…           HTTP 200 → ARRÊTÉE
 *
 *     webkit   : SecurityError: Context's origin is opaque
 *     chromium : Access to the Locks API is denied in this context
 *                at gi.Lr [as lock] (…/:14740:44)
 *
 * `sandbox` sans `allow-same-origin` rend l'origine opaque MÊME sur un
 * document de premier niveau en https. `navigator.locks` existe alors
 * (contexte sûr) mais REFUSE — et `@supabase/gotrue-js` l'appelle à son
 * premier geste. Détail cruel : dans un CADRE opaque l'API est `undefined`,
 * donc le SDK prend son repli et survit. La vraie page, elle, meurt.
 *
 * ── DEUX ROUTES, DEUX RÉGIMES. Et la raison est une mesure.
 *
 * `*.deribfy.app` est un domaine ENREGISTRABLE DIFFÉRENT de `deribfy.com` :
 * la session du produit y est hors d'atteinte avec ou sans bac à sable. Le
 * bac à sable n'y achetait que l'isolation ENTRE applications — or
 * `localStorage` est déjà cloisonné par origine, donc par sous-domaine.
 *
 * `/p/<jeton>` est servi par `www.deribfy.com` : LA MÊME ORIGINE que le
 * produit. MESURÉ le 2026-11-05 : `src/lib/supabase.ts` appelle
 * `createClient` sans options, donc `persistSession: true` par défaut, donc
 * la session vit dans le `localStorage` de `www.deribfy.com`. Y lever le bac
 * à sable donnerait à une application écrite par un modèle la lecture du
 * jeton de session de son propriétaire. Il reste, et il est PORTEUR.
 *
 * ── LE CANAL RÉSIDUEL, DIT AVEC SA FORME.
 *
 * Avec `allow-same-origin` sur `*.deribfy.app`, l'application d'un client
 * peut poser un cookie sur `.deribfy.app` — que l'application d'un AUTRE
 * client lira. Pas le SDK : il emploie `localStorage`, cloisonné par
 * origine. Mais une application écrite par le modèle peut appeler
 * `document.cookie` avec `domain=.deribfy.app`, et rien ne l'en empêche.
 *
 * LA PARADE CONNUE : inscrire `deribfy.app` à la PUBLIC SUFFIX LIST. Un
 * cookie de domaine parent devient alors structurellement impossible — le
 * navigateur refuse `domain=.deribfy.app` comme il refuse `domain=.com`.
 * C'est LONG à obtenir (des mois), donc ça se demande TÔT. Non fait.
 */
const hoteDe = (url: string): string => {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/**
 * CE QUE L'APPLICATION PEUT JOINDRE : son projet, et rien d'autre.
 *
 * ── POURQUOI `wss://` Y FIGURE, ET C'EST MESURÉ.
 *
 * Le paquet embarqué porte `realtime` ×22 et `wss://` ×1. `connect-src`
 * avec une URL `https:` n'autorise PAS `wss:` — une œuvre qui s'abonne
 * démarrerait et échouerait SANS RIEN DIRE. On aurait échangé un plantage
 * franc contre une panne silencieuse.
 *
 * ── ET L'ALLER-RETOUR EST PROUVÉ, pas supposé.
 *
 * Octets de production de `snenak`, servis sous cet en-tête, connexion
 * tentée avec une adresse manifestement fausse :
 *
 *     POST /auth/v1/token → 400 → « Identifiants invalides. »
 *
 * La requête sort, le service répond, le SDK gère, et l'écran dit vrai.
 *
 * ── SANS BASE, RIEN NE SORT. C'est le plus étroit, et c'est le défaut.
 */
const connectSrcPour = (urlProjet: string): string => {
  const h = hoteDe(urlProjet)
  return h === '' ? "connect-src 'none'" : `connect-src https://${h} wss://${h}`
}

/** Le tronc commun : tout ce que les deux régimes partagent. */
const CSP_TRONC: readonly string[] = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  // N2 : le manifeste PWA est cuit dans la page (data:). Mesuré bloquant
  // sous default-src 'none' — sans cette ligne, rien ne s'installe.
  'manifest-src data:',
  'font-src data:',
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
]

/**
 * LE RÉGIME DU SOUS-DOMAINE — une vraie origine, un réseau borné.
 *
 * `allow-same-origin` est ici indispensable et non dangereux : voir la
 * dissymétrie ci-dessus. Il ne doit JAMAIS apparaître sur une route servie
 * depuis `deribfy.com`.
 */
export const cspSousDomaine = (urlProjet: string): string =>
  [...CSP_TRONC, connectSrcPour(urlProjet), 'sandbox allow-scripts allow-same-origin'].join('; ')

/** Les en-têtes d'une page servie sous son propre sous-domaine. */
export const entetesSousDomaine = (urlProjet: string): Readonly<Record<string, string>> => ({
  ...ENTETES_PAGE_PUBLIEE,
  'Content-Security-Policy': cspSousDomaine(urlProjet),
})

export const CSP_PAGE_PUBLIEE = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  // N2 : le manifeste PWA est cuit dans la page (data:). Mesuré bloquant
  // sous default-src 'none' — sans cette ligne, rien ne s'installe.
  "manifest-src data:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  'sandbox allow-scripts',
].join('; ')

/** Les en-têtes d'une page publiée. Une seule décision, un seul endroit. */
export const ENTETES_PAGE_PUBLIEE: Readonly<Record<string, string>> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': CSP_PAGE_PUBLIEE,
  // Elle ne doit pas finir dans un moteur de recherche : le propriétaire a
  // choisi de donner un LIEN, pas de publier au monde.
  'X-Robots-Tag': 'noindex, nofollow',
  // Pas de mise en cache partagée : republier doit se voir tout de suite.
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
}
