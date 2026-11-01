/**
 * LE NOM DU PRODUIT — et pourquoi ce n'est PAS son adresse.
 *
 * ── LE DÉFAUT, VU PAR LE PROPRIÉTAIRE LE 2026-11-01.
 *
 * Neuf œuvres livrées, neuf cartes qui disent « Application ». L'onglet du
 * navigateur disait « Votre application ». Le manifeste d'installation
 * aussi. Et l'adresse publique devait être tapée à la main dans une fenêtre
 * de dialogue, parce que rien ne savait comment l'œuvre s'appelle.
 *
 * UNE cause pour les quatre symptômes : LE PRODUIT N'A PAS DE NOM. Trois
 * littéraux cuits dans le moteur (`direct/route.ts`, `p/[jeton]/route.ts`,
 * l'écran de conversation) tenaient la place d'une donnée.
 *
 * ── DEUX CHAMPS, PAS UN. C'est l'arbitrage du propriétaire, et il a raison.
 *
 * Dériver l'adresse du nom et l'imposer produit `tontine-2.deribfy.app` —
 * une adresse qu'on n'écrit sur aucune carte de visite. Et comme un nom
 * publié ne se recycle JAMAIS (c'est la quarantaine d'EP-308, et elle est
 * volontaire), les noms génériques s'épuisent : le dixième client aurait
 * `tontine-9`.
 *
 * Donc : LE NOM est ce que le produit s'appelle (« Tontine »), libre.
 * L'ADRESSE est pré-remplie depuis le nom, et LIBREMENT MODIFIABLE : la
 * personne écrira `tontine-moundou`, qui dit quelque chose, plutôt que de
 * subir `tontine-2`, qui dit qu'elle est arrivée deuxième. Le suffixe
 * automatique reste — comme SECOURS, jamais comme règle.
 *
 * ── UN SEUL NIVEAU. MESURÉ, ET CE N'EST PAS NÉGOCIABLE.
 *
 * `tontine.youssouf.deribfy.app` serait la sortie élégante au problème
 * d'épuisement. Elle n'existe pas : un certificat générique `*.deribfy.app`
 * ne couvre QU'UN niveau, et le certificat générique lui-même nous est
 * refusé (POST /v7/certs → HTTP 449, `dns_pretest_cns_not_using_vercel_ns_
 * error`, mesuré le 2026-11-01 : la zone n'est pas sur les serveurs de noms
 * de Vercel). Chaque nom reçoit son certificat à la demande, en un seul
 * niveau. Un point dans l'adresse est donc refusé par `nomValide` — par sa
 * grammaire, pas par un contrôle qu'on pourrait oublier.
 */
import { nomSuggere, nomValide } from './sous-domaine'

/**
 * NOS PROPRES MOTS DE REMPLISSAGE — la seule liste fermée admissible ici.
 *
 * Même inversion que pour les noms réservés : on interdit CE QUI EST À
 * NOUS, on autorise tout le reste. Ces huit chaînes sont exactement les
 * littéraux que le moteur écrivait à la place d'un nom. Les refuser empêche
 * le défaut de revenir par la porte de l'appelant — un écran qui enverrait
 * `nom: 'application'` par confort reçoit un 400, et plus personne ne
 * stocke de remplissage en base.
 *
 * Ce n'est PAS une liste de noms interdits aux clients. Un client dont le
 * produit s'appellerait vraiment « Application » lit le message et écrit
 * autre chose ; aucun vocabulaire de métier n'est touché.
 */
export const REMPLISSAGES: ReadonlySet<string> = new Set([
  'application',
  'applications',
  'app',
  'votre application',
  'mon application',
  'nouvelle application',
  'projet',
  'sans titre',
])

/**
 * LE TITRE DES ŒUVRES NÉES AVANT CE LOT — un seul endroit, et c'est exprès.
 *
 * Neuf applications ont été livrées sans nom. Leur en inventer un à la
 * lecture serait mentir ; les régénérer coûterait de l'argent pour un mot.
 * Elles portent donc ce titre, et « Renommer » les sort de là gratuitement.
 *
 * CETTE CONSTANTE EST LA RAISON POUR LAQUELLE LE CLIQUET PEUT ÊTRE STRICT :
 * EP-309 ⑥ interdit le littéral « Application » dans tout le moteur. Le
 * repli passe par ici, nommé et expliqué, au lieu d'être réécrit à la main
 * au prochain endroit qui n'aura rien à afficher.
 */
export const TITRE_SANS_NOM = 'Application'

/** Ce qui casserait un titre HTML ou le JSON du manifeste. */
const SIGNES_INTERDITS = /[<>&"`]/u

export type VerdictNom =
  | { readonly ok: true; readonly nom: string }
  | { readonly ok: false; readonly erreur: string }

/**
 * Le nom du produit, tel qu'on accepte de l'écrire en base et dans un titre.
 *
 * Permissif par construction : 2 à 40 signes, n'importe quelle langue,
 * accents et espaces compris. On ne refuse que trois choses — le vide, nos
 * propres remplissages, et les signes qui casseraient le titre.
 */
export function nomProduitValide(brut: string): VerdictNom {
  const nom = brut.trim().replace(/\s{2,}/gu, ' ')
  if (nom.length < 2) {
    return { ok: false, erreur: 'Donnez un nom a votre application (2 signes au moins).' }
  }
  if (nom.length > 40) {
    return { ok: false, erreur: 'Ce nom depasse 40 signes — il ne tiendra pas dans un onglet.' }
  }
  if (SIGNES_INTERDITS.test(nom)) {
    return { ok: false, erreur: 'Ce nom contient des signes qui casseraient le titre : < > & " `' }
  }
  if (REMPLISSAGES.has(nom.toLowerCase())) {
    return {
      ok: false,
      erreur:
        `« ${nom} » est le mot que Deribfy employait quand il ne savait pas ` +
        'comment votre produit s appelle. Donnez-lui son vrai nom.',
    }
  }
  return { ok: true, nom }
}

/**
 * L'ADRESSE PROPOSÉE depuis le nom — un pré-remplissage, pas une décision.
 *
 * Rend `''` quand le nom ne donne rien d'utilisable (un nom entièrement
 * non-latin, par exemple) : l'écran demande alors l'adresse au lieu d'en
 * inventer une. Le vide est une réponse honnête ; `app-` suivi de rien n'en
 * est pas une.
 */
export function adresseProposee(nom: string): string {
  const propose = nomSuggere(nom)
  return nomValide(propose) ? propose : ''
}

/**
 * LE SECOURS, quand l'adresse proposée est déjà prise.
 *
 * On s'arrête à 9. Au-delà, un chiffre ne distingue plus rien et l'adresse
 * devient une insulte au produit : on rend `''`, et l'appelant DEMANDE.
 * C'est la différence entre un secours et une règle.
 */
export function adresseDeSecours(nom: string, estPris: (adresse: string) => boolean): string {
  const base = adresseProposee(nom)
  if (base === '') return ''
  if (!estPris(base)) return base
  for (let n = 2; n <= 9; n += 1) {
    const essai = `${base.slice(0, 38).replace(/-+$/u, '')}-${String(n)}`
    if (nomValide(essai) && !estPris(essai)) return essai
  }
  return ''
}

/**
 * LA PHRASE SUR LES MARQUES — dite UNE FOIS, à l'endroit où le nom se choisit.
 *
 * Un nom proposé par le modèle peut être une marque existante. Aucune liste
 * ne l'empêchera : c'est établi depuis les adresses, et pour la même raison
 * — le registre des marques du monde n'est pas une liste qu'on embarque.
 * Donc on ne promet rien, on prévient, et le retrait propre existe (la
 * suppression d'EP-308 retire l'adresse du jour au lendemain).
 */
export const AVERTISSEMENT_MARQUE =
  'Ce nom peut appartenir a quelqu un d autre : Deribfy ne verifie aucun ' +
  'registre de marques. Si vous publiez, c est votre choix — et vous pouvez ' +
  'retirer l application a tout moment.'

/**
 * CE QUE RENOMMER CHANGE, ET CE QUE ÇA NE CHANGE PAS.
 *
 * MESURÉ, pas supposé : la page publique est recompilée à la LECTURE
 * (`p/[jeton]` appelle `pageAutonome` à chaque requête), donc l'onglet et le
 * manifeste d'installation prennent le nouveau nom immédiatement. Mais le
 * nom que le modèle a écrit DANS les écrans — le titre de la barre latérale
 * — vit dans le code stocké. Renommer ne le touche pas.
 *
 * Le dire est obligatoire : sans cette phrase, la personne renomme, voit sa
 * carte changer, ouvre son application et y lit l'ancien nom. Encore un
 * écran qui dit une chose pendant qu'une autre est vraie — exactement ce
 * qu'on passe nos journées à fermer.
 */
export const CE_QUE_RENOMMER_CHANGE =
  'Renommer change votre liste, l onglet du navigateur et le nom ' +
  'd installation. Le nom ecrit A L INTERIEUR des ecrans a ete compose avec ' +
  'l application : il ne changera qu en la modifiant.'
