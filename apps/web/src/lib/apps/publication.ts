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
export const CSP_PAGE_PUBLIEE = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
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
