/**
 * LA BOUCLE — l'IA écrit, le compilateur répond, l'IA corrige.
 *
 * ── CE QU'ELLE REMPLACE, ET CE QUE ÇA COÛTAIT.
 *
 * Le moteur actuel répare un DOCUMENT avec nos propres juges, qui jugent du
 * SENS : « ce parcours a-t-il une étape sans écran ? ». Mesuré le 2026-10-18 :
 * neuf appels en file, une à cinq minutes chacun, 26 minutes, 8,46 $, et le
 * verdict ne dit jamais si l'application MARCHE.
 *
 * Ici, le juge est le compilateur. Son verdict est précis — « ligne 14,
 * import introuvable » —, gratuit, et instantané. Et quand il se tait,
 * l'application tient debout pour de vrai.
 *
 * ── BORNÉE, ET LA BORNE EST UN CLIQUET, PAS UNE ESPÉRANCE.
 *
 * Trois tours. Au quatrième, on s'arrête et on le DIT. Une boucle sans
 * borne a déjà coûté ici : « 6,87 $ brûlés, seul le garde-fou du harnais a
 * arrêté » — c'est écrit dans le moteur actuel.
 */
import { assembler } from './bac-a-sable'
import {
  importsInterdits,
  lireFichiers,
  PAQUETS_AUTORISES,
  PAQUETS_PROPOSES,
} from './ecriture-directe'
import { jugerGestion, reprocheGestion } from './juge-gestion'
import { jugerFaces, reprocheFaces, type VerdictFaces } from './juge-faces'
import { jugerVivacite, type DefautVivacite } from './juge-vivacite'
import { FICHIER_PERIMETRE, jugerCouverture, type RapportCouverture } from './juge-couverture'
import {
  FICHIER_DECLARATION,
  fusionnerEntites,
  lireDeclarationEnRoute,
} from './declaration-en-route'
import { jugerDevise, marqueRecommandee } from './juge-devise'
import { CONSIGNE_BIBLIOTHEQUE, fichiersSysteme, VARIABLES_CSS } from './bibliotheque-ui'
import {
  blocBase,
  REGLE_6_COMMUN,
  type EntiteDeclaree,
  type RefusEntite,
} from './entites-declarees'
import { jugerJetons, type DefautJeton } from './juge-jetons'
import {
  jugerPersistance,
  preuvesDeMemoire,
  reprochePersistance,
  type DefautPersistance,
} from './juge-persistance'
import { jugerExecution, type VerdictExecution } from './juge-execution'

/**
 * LA CONSIGNE — et chaque phrase y répond à un défaut mesuré.
 *
 * Elle est COURTE. Celle du moteur actuel pèse ~17 500 jetons de règles,
 * renvoyés à chacun des neuf appels. Ici le modèle écrit du code : il sait
 * déjà le faire, on n'a pas à le lui apprendre.
 */
/**
 * LA RÈGLE 6, TELLE QU'ELLE EST SANS BASE — et c'est son texte exact.
 *
 * Elle est extraite pour pouvoir être REMPLACÉE. Quand une œuvre déclare ses
 * données, le bloc de base prend sa place : les deux branches ne coexistent
 * jamais dans la même consigne, sinon le modèle produit un code hybride que
 * personne ne verrait.
 */
/**
 * LA TÊTE DE LA RÈGLE 6 QUAND AUCUNE TABLE N'EST DÉCLARÉE.
 *
 * Elle ne porte QUE ce qui dépend de cette situation. Tout ce qui vaut
 * dans les deux cas vit dans `REGLE_6_COMMUN` et s'y compose — voir
 * l'angle mort mesuré le 2026-11-05, et EP-360 qui le ferme.
 *
 * ── LA GARDER COURTE EST UNE GARDE, PAS UN GOÛT.
 *
 * Une tête courte ne peut pas cacher une règle générale : elle n'y tient
 * pas. EP-360 borne sa taille pour cette raison, et pas pour la place.
 */
export const REGLE_6_TETE_SANS_BASE: readonly string[] = [
  '6. Tu écris des valeurs d’exemple PLAUSIBLES quand il en faut — des montants',
  '   et des dates qu’une personne du métier reconnaîtrait.',
  '',
  '   MAIS SI ELLE DOIT CONSERVER quelque chose qu’on retrouve au prochain',
  '   démarrage — historique, journal, relevés —, DIS-LE et tu auras une base.',
  '   Rends ce fichier EN PLUS des autres (il ne part pas dans l’application) :',
  '',
  '   === DONNEES.json ===',
  '   [{"name":"chose","fields":[{"name":"champ","type":"text","required":true}]}]',
  '',
  '   `chose` est REFUSÉ exprès : recopie ce gabarit et ta table sera écartée.',
  '   Types : text, number, date, boolean.',
]

export const REGLE_6_SANS_BASE = [...REGLE_6_TETE_SANS_BASE, ...REGLE_6_COMMUN].join('\n')

export const CONSIGNE = `Tu écris une application web complète, en React et TypeScript.

RENDS UNIQUEMENT DES FICHIERS, dans ce format exact, sans rien avant ni après :

=== index.tsx ===
<le code>
=== composants/Truc.tsx ===
<le code>

RÈGLES, et chacune vient d'un défaut réel :

1. \`index.tsx\` est le point d'entrée. Il monte l'application dans l'élément
   d'identifiant "racine" avec \`createRoot\`. Sans lui, rien ne s'affiche.

2. TU N'IMPORTES QUE CES PAQUETS : ${PAQUETS_PROPOSES.join(', ')}.
   Aucun autre, jamais, même pour une date ou un graphique. L'environnement
   d'assemblage ne fournit QUE ces paquets : un import hors liste casse la
   construction, ici même, à coup sûr. Écris la fonction toi-même.

3. TU FAIS LE TRAVAIL DEMANDÉ. Si on demande un calcul, tu écris le calcul
   et tu l'exécutes à l'écran. Un bouton qui mène à un formulaire sans jamais
   calculer n'est pas une réponse.

4. Tu écris du français correct dans l'interface. Jamais un identifiant de
   base de données sous les yeux de quelqu'un : le libellé se lit, il ne se
   décode pas.

5. Tu restes SOBRE et complet : ce qui est demandé, entièrement, et rien de
   décoratif. Pas d'images d'illustration, pas d'écrans en plus.

${REGLE_6_SANS_BASE}

7. LA NAVIGATION SUIT LA LOI DU PRODUIT, la même que son moteur de rendu :
   à partir de 840 px de largeur, une BARRE LATÉRALE GAUCHE fixe — jamais
   une barre horizontale en haut ; EN DESSOUS de 840 px, une BARRE DU BAS
   fixe, pas un menu replié. Règles posées par le propriétaire (2026-10-30 :
   latérale à gauche ; 2026-10-31 : barre du bas sur petit écran, mesurée
   absente sur un tir réel pendant que la légende de l'aperçu l'annonçait).

8. AUCUN CONTRÔLE MORT. Chaque bouton, champ ou formulaire est relié à une
   action réelle : un état qui change, un calcul exécuté, une liste qui
   s'allonge. Ce que tu ne peux pas câbler réellement, tu le marques
   \`data-demonstration\` ET tu écris « Démonstration » à l'écran, visible.
   Un écran qui a l'air de fonctionner et ne fait rien est le pire défaut
   de ce produit : il se découvre après l'achat.

9. LES FORMULAIRES ONT UNE GÉOMÉTRIE : le CHAMP grandit avec la place, le
   BOUTON prend la largeur de son contenu — jamais l'inverse (mesuré : un
   « Envoyer » large de cinq champs). Et TOUT texte rendu appartient à un
   composant et à un niveau de l'échelle typographique — jamais une phrase
   qui flotte hors de toute carte.

10. ${CONSIGNE_BIBLIOTHEQUE}

11. TU DÉCLARES CE QUE TU NE LIVRES PAS. Un fichier \`PERIMETRE.md\` liste ce
   que le cahier demande et que cette version ne couvre pas, un motif d'une
   ligne par entrée. Le silence est interdit : une exigence absente de
   l'application ET de ce fichier te sera renvoyée.`

export type Tour = {
  readonly rang: number
  readonly fichiers: number
  readonly ok: boolean
  readonly motif?: string
  readonly ms: number
  /** Le fournisseur a-t-il coupé ce tour ? Jamais déduit — toujours lu. */
  readonly tronquee?: boolean
  /**
   * LES FICHIERS DU TOUR REFUSÉ, ENTIERS — ordre du propriétaire après le
   * 2026-10-31 : le tir refusé de 08:18 avait produit 30 fichiers, plus que
   * la version livrée (14), et ils n'étaient pas stockés — la comparaison
   * de couverture était impossible après coup. Borné à 200 000 caractères
   * par tour : assez pour comparer, pas assez pour gonfler la ligne.
   */
  readonly source?: Record<string, string>
}

export type Resultat =
  | {
      readonly ok: true
      readonly code: string
      readonly fichiers: ReadonlyMap<string, string>
      readonly tours: readonly Tour[]
      /** Les contrôles encore morts à l'acceptation — JAMAIS tus (EP-297). */
      /** Les jetons inventés encore présents à l'acceptation (EP-301). */
      readonly jetons: readonly DefautJeton[]
      /** Ce qu'a donné le montage réel — null si les jetons l'ont évité. */
      readonly execution: VerdictExecution | null
      readonly vivacite: readonly DefautVivacite[]
      /** Le rapport chiffré qui accompagne toute génération (EP-297). */
      readonly couverture: RapportCouverture
      /** J1 · les deux faces, `null` quand l'œuvre n'a aucune table. */
      readonly faces: VerdictFaces | null
      /**
       * CE QUI RESTE EN MÉMOIRE AU DERNIER TOUR — dit, jamais tu.
       *
       * ── LE DÉFAUT QUE CE CHAMP FERME, et il était le mien.
       *
       * Au dernier tour, les défauts restants n'empêchent pas la livraison
       * (refuser re-brûlerait l'argent du propriétaire). Les quatre autres
       * juges font voyager leur verdict ; le mien, non. Une œuvre amnésique
       * partait donc SANS QU'UNE LIGNE NE LE DISE — exactement la famille
       * de défaut que ce juge existe pour fermer.
       */
      readonly persistance: readonly DefautPersistance[]
      /**
       * LES ENTITÉS TELLES QUE LA BOUCLE LES CONNAÎT À LA FIN.
       *
       * Le cahier les amorce, le CONSTRUCTEUR les complète. C'est cette
       * liste-là qui émet le schéma : émettre depuis l'entrée perdrait
       * exactement les tables que le constructeur a découvert devoir
       * exister — et l'application repartirait sans la base de l'écran
       * qu'elle vient de dessiner.
       */
      readonly entites: readonly EntiteDeclaree[]
      /** Ce que la déclaration en route a refusé — jamais tu. */
      readonly refusEntites: readonly RefusEntite[]
    }
  | {
      readonly ok: false
      readonly motif: string
      readonly tours: readonly Tour[]
      /**
       * CE QUE LE MODÈLE AVAIT ÉCRIT AU DERNIER TOUR, BRUT.
       *
       * DÉFAUT MESURÉ LE 2026-10-18 : le premier tir direct a échoué en
       * 63 secondes pour 4 centimes — « Non convergé en 3 tours » — et je
       * n'avais AUCUN moyen de dire pourquoi. Ni l'erreur du compilateur, ni
       * ce que le modèle avait produit.
       *
       * C'est exactement le défaut que j'avais décrit le matin même sur
       * l'autre moteur, et que je venais de reproduire. Un échec qu'on ne
       * sait pas lire est un échec qu'on repaiera pour comprendre.
       */
      readonly dernierTexte: string
    }

/**
 * Ce que l'appelant fournit : un modèle, et rien d'autre.
 *
 * IL REND DEUX CHOSES, ET LA SECONDE N'EST PAS UN CONFORT. Un texte seul ne
 * dit pas s'il est ENTIER. Sans `tronquee`, une réponse coupée et une réponse
 * fausse arrivent ici sous la même forme — et c'est exactement la confusion
 * qui a coûté deux tirs le 2026-10-19.
 */
export type Appeler = (
  messages: readonly { role: 'user' | 'assistant'; content: string }[],
) => Promise<{ readonly texte: string; readonly tronquee: boolean }>

export const TOURS_MAX = 3

/**
 * Écrit l'application, et la corrige tant que le compilateur refuse.
 *
 * ── POURQUOI L'APPEL EST INJECTÉ.
 *
 * `appeler` est fourni par la route. Toute la boucle se teste donc avec un
 * faux modèle, sans réseau et sans un centime — et c'est ainsi qu'elle a été
 * écrite, avant qu'un seul appel payant ne parte.
 */
/** La configuration éludée, telle que le pré-vol la résout. */
export type ConfigurationClient = { readonly [cle: string]: unknown }

/**
 * LE BLOC DE CONFIGURATION — la source de vérité AVANT le cahier.
 *
 * MESURÉ LE 2026-10-31 (tir eb7b62b5) : le pré-vol validait la devise
 * (EP-293) puis l'écran n'envoyait que la demande — plateforme tchadienne
 * rendue en EUR. Ce bloc précède le cahier dans le message : ce que le
 * client a RÉPONDU prime sur ce que le modèle déduirait du document.
 *
 * Dernier rempart sur la devise : l'élicitation valide en amont, mais une
 * requête forgée peut contourner l'écran — une devise qui n'a pas la forme
 * d'un code (trois lettres) n'est JAMAIS transmise comme un fait.
 */
export function texteDeConfiguration(configuration: ConfigurationClient): string {
  const lignes: string[] = []
  const libelles: Record<string, string> = {
    nom_produit:
      'NOM DU PRODUIT (c’est ainsi que l’application s’appelle : écris-le\n  tel quel dans le titre, la barre latérale et l’en-tête — n’invente pas\n  d’autre nom, n’écris jamais « Application »)',
    currency: 'DEVISE (tous les montants affichés l’emploient, aucune autre)',
    market: 'MARCHÉ VISÉ',
    collector_msisdn: 'NUMÉRO D’ENCAISSEMENT',
    logistics: 'LOGISTIQUE',
  }
  for (const [cle, valeur] of Object.entries(configuration)) {
    if (typeof valeur !== 'string' || valeur.trim() === '') continue
    if (cle === 'currency' && !/^[A-Z]{3}$/u.test(valeur.trim().toUpperCase())) continue
    lignes.push(`- ${libelles[cle] ?? cle.toUpperCase()} : ${valeur.trim()}`)
  }
  if (lignes.length === 0) return ''
  return (
    'CONFIGURATION DU CLIENT — source de vérité, elle PRIME sur toute ' +
    'déduction du cahier :' + '\n' +
    lignes.join('\n') +
    '\n\n'
  )
}

/**
 * LA CONSIGNE DE CETTE ŒUVRE — assemblée par œuvre, pas universelle.
 *
 * ── UN ÉCHANGE DE TEXTE, PAS UN AJOUT.
 *
 * Avec entités : le bloc de base PREND LA PLACE de la règle 6. Sans
 * entités : `CONSIGNE` à l'octet près, inchangée depuis toujours.
 *
 * C'est ce qui supprime la tension au lieu de la gérer. Un bloc de base
 * ajouté À CÔTÉ de « écris des valeurs d'exemple plausibles » produirait un
 * code à moitié branché sur la base et à moitié sur des valeurs en dur — le
 * modèle obéirait aux deux, et la moitié des écrans serait amnésique.
 *
 * ── ET ELLE NE GROSSIT PAS.
 *
 * Mesuré : la variante sans base fait 5 904 signes, exactement comme avant.
 * La variante avec base échange deux lignes contre le bloc — EP-319 ⑥ borne
 * les deux.
 */
export function consignePour(entites: readonly EntiteDeclaree[]): string {
  if (entites.length === 0) return CONSIGNE
  return CONSIGNE.replace(REGLE_6_SANS_BASE, blocBase(entites))
}

export async function boucleEcriture(o: {
  readonly demande: string
  readonly configuration?: ConfigurationClient
  readonly appeler: Appeler
  readonly toursMax?: number
  /**
   * LE JUGE D'EXÉCUTION, REMPLAÇABLE — et le défaut reste le VRAI.
   *
   * Les contrôles qui éprouvent la couverture ou la devise n'ont pas à
   * payer un processus par tour (mesuré : +800 ms chacun, deux cliquets
   * passés sous la marge de la gate). Ils injectent donc un juge muet.
   * L'oubli en production ne désarme RIEN : sans injection, c'est le juge
   * réel qui tourne — fail-closed, comme tout le reste de cette boucle.
   */
  readonly juger?: typeof jugerExecution
  /**
   * J1 INJECTABLE — même idiome que `juger`, et pour la même raison.
   *
   * Le vrai juge des faces monte l'œuvre TROIS fois dans des processus
   * séparés : ~3,9 s. Un test qui éprouve un AUTRE juge n'a pas à payer ça,
   * ni à voir son nombre de tours changer parce que sa fixture tombe aussi
   * sur celui-ci (mesuré : EP-326 ⑧ passait de 2 tours à 3).
   *
   * Le vrai est éprouvé dans EP-371, et EP-371 ⑦ vérifie que la boucle
   * appelle bien celui-là par défaut — sinon ce serait un juge prouvé sans
   * appelant, et on en a compté vingt-six.
   */
  readonly jugerFaces?: typeof jugerFaces
  /**
   * LES ENTITÉS DÉCLARÉES — ce que le juge de persistance a besoin de savoir.
   *
   * Elles ne peuvent PAS se déduire du code rendu : une table absente du
   * code est exactement ce qu'on cherche. Elles viennent donc du cahier,
   * par la même valeur qui a construit la consigne.
   */
  readonly entites?: readonly EntiteDeclaree[]
  /**
   * LA GRAMMAIRE DU CAHIER — celle qui valide les entités de la lecture.
   *
   * Elle est PASSÉE et non importée : elle vit dans le schéma AIR, que
   * cette boucle n'a pas à connaître. Sans elle, la déclaration en route
   * est ignorée — on ne valide pas une table avec une seconde grammaire,
   * ce sont les deux qui divergeraient.
   */
  readonly validerEntite?: (e: unknown) => boolean
}): Promise<Resultat> {
  const toursMax = o.toursMax ?? TOURS_MAX
  const tours: Tour[] = []
  let dernierTexte = ''
  // ── CE QUE LA BOUCLE SAIT DES DONNÉES, ET ÇA GRANDIT.
  //
  // Le cahier amorce ; le constructeur AJOUTE ce qu'il découvre en
  // construisant. « La vérité sur ce qu'il faut conserver n'est pas dans la
  // demande, elle est dans ce qui a été CONSTRUIT. »
  let entitesConnues: readonly EntiteDeclaree[] = o.entites ?? []
  let refusEnRoute: readonly RefusEntite[] = []
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: texteDeConfiguration(o.configuration ?? {}) + o.demande },
  ]

  for (let rang = 1; rang <= toursMax; rang += 1) {
    const debut = Date.now()
    const { texte, tronquee } = await o.appeler(messages)
    dernierTexte = texte
    let lus = lireFichiers(texte)

    // ── LA DÉCLARATION EN ROUTE, LUE AVANT TOUT LE RESTE.
    //
    // Elle doit partir des fichiers AVANT qu'ils soient assemblés : livrer
    // `DONNEES.json` mettrait un fichier mort dans l'archive, et le juge de
    // couverture compterait un fichier qu'aucun écran n'ouvre.
    if (o.validerEntite !== undefined) {
      const carteBrute = new Map(lus.map((f) => [f.chemin, f.contenu]))
      const dec = lireDeclarationEnRoute(carteBrute, o.validerEntite)
      if (dec.entites.length > 0 || dec.refus.length > 0) {
        const fusion = fusionnerEntites(entitesConnues, dec.entites)
        entitesConnues = fusion.entites
        // ── UNE PERTE DE FUSION PART PAR LE MÊME CANAL QU'UN REFUS.
        //
        // Elle en EST un : le modèle a déclaré quelque chose et ne l'a pas
        // obtenu. Avant, cette fonction jetait l'entité entière sans un mot
        // — y compris un CHAMP EN PLUS, donc une colonne qui n'existe
        // jamais. Le canal existait déjà ; elle ne s'en servait pas.
        refusEnRoute = [
          ...refusEnRoute,
          ...dec.refus,
          ...fusion.pertes.map((pe) => ({
            quoi: `${pe.table}.${pe.quoi}`,
            motif: pe.pourquoi,
          })),
        ]
      }
      if (carteBrute.size !== dec.fichiers.size) {
        lus = lus.filter((f) => f.chemin !== FICHIER_DECLARATION)
      }
    }

    // ── QUATRE REFUS, DANS CET ORDRE, DU MOINS CHER AU PLUS CHER.
    //
    // Lire coûte zéro. Vérifier les imports coûte zéro. Assembler coûte du
    // processeur. On ne paie le dernier que si les précédents passent.
    //
    // ET LA TRONCATURE PASSE AVANT TOUT, parce qu'elle est la CAUSE et que
    // les autres n'en seraient que les symptômes. Une réponse coupée échoue
    // aussi à l'assemblage — « Expected } but found EOF » — et ce message-là
    // est vrai mais trompeur : il décrit le texte, pas ce qui lui est arrivé.
    // Le 2026-10-19 j'ai relayé ce symptôme au modèle comme un diagnostic. Il
    // a « corrigé » du code qui n'était pas faux, et s'est fait couper encore.
    let motif: string | null = null
    if (tronquee) {
      motif =
        'Ta réponse a été coupée : tu as atteint le plafond de jetons avant ' +
        "d'avoir fini. Le code n'est pas faux, il est incomplet."
    } else if (lus.length === 0) {
      motif = 'Aucun fichier reçu. Rends UNIQUEMENT des fichiers au format « === chemin === ».'
    } else {
      const interdits = importsInterdits(lus)
      if (interdits.length > 0) {
        motif =
          `Paquets interdits : ${interdits.join(', ')}. ` +
          // ── ON DIT POURQUOI, PAS SEULEMENT « NON ».
          //
          // `expo` n'est pas interdit : il n'existe pas ICI. Un refus qui
          // ne dit pas « tu te trompes de cible » invite à réessayer avec
          // un paquet natif voisin — un tour payé pour rien.
          (interdits.some((i) => PAQUETS_AUTORISES.includes(i))
            ? 'Ces paquets sont faits pour une application NATIVE ; celle-ci est une page web. '
            : '') +
            `Tu ne peux importer que : ${PAQUETS_PROPOSES.join(', ')}. Écris la fonction toi-même.`
      }
    }

    // ── LE PRÉFIXE systeme/ EST À DERIBFY, EN BLOC : ce que le modèle y
    // écrit n'entre JAMAIS dans la carte — pas seulement les trois noms
    // fournis : un systeme/autre.tsx écrit par le modèle échapperait aux
    // juges (qui sautent le préfixe) et y cacherait ce qu'on interdit
    // ailleurs. Un import vers un fichier écarté casse l'assemblage avec un
    // chemin nommé : le modèle se corrige au tour suivant.
    const carte = new Map(
      lus.filter((f) => !f.chemin.startsWith('systeme/')).map((f) => [f.chemin, f.contenu]),
    )
    // La bibliothèque fournie s'injecte ensuite. La devise du client est
    // CUITE dans systeme/argent.ts — une seule source, jamais un code
    // monnaie écrit par le modèle (lot UI du 2026-10-31).
    const systeme = fichiersSysteme(
      typeof o.configuration?.currency === 'string' ? o.configuration.currency : undefined,
    )
    for (const [chemin, contenu] of systeme) {
      carte.set(chemin, contenu)
    }
    if (motif === null) {
      const v = await assembler(carte)
      if (v.ok) {
        // ── LES DEUX JUGES (EP-297) : « ça s'assemble » ne suffit plus.
        //
        // Mesuré le 2026-10-31 (tir eb7b62b5) : un « Agent IA premium » sans
        // un seul gestionnaire — la PHOTO de la fonction centrale — et une
        // couverture paiement 2/34, livrés sans un mot. Le compilateur juge
        // la syntaxe ; ces deux-là jugent la vie et la parole tenue.
        // EP-301 : les jetons AVANT tout le reste — c'est le moins cher des
        // juges (lecture pure) et il ferme la famille qui a tué le tir
        // 88c94164 : onze références inventées (TYPO.corps, GRIS.fond,
        // SEMANTIQUE.attention…) dans une œuvre pourtant livrée.
        const jetons = jugerJetons(carte, systeme)
        const vivacite = jugerVivacite(carte)
        // EP-298 : l'argent parle la devise configurée. EP-296 transmet,
        // celui-ci VÉRIFIE — une instruction sans contrôle est un vœu
        // (mesuré : 10× EUR sur une base tchadienne, devise validée).
        const deviseConfiguree =
          typeof o.configuration?.currency === 'string' ? o.configuration.currency : undefined
        const devises = jugerDevise(carte, deviseConfiguree)
        // EP-302 : ÇA DÉMARRE. Le quatrième critère, et le seul qui ait vu
        // le défaut qui a frappé l'écran du propriétaire. N'est exercé que
        // si les jetons sont sains : inutile de monter une œuvre dont on
        // sait déjà qu'elle mourra, et un tour coûte de l'argent.
        const execution: VerdictExecution | null =
          jetons.length === 0 ? await (o.juger ?? jugerExecution)(v.code) : null
        // La couverture se juge APRÈS l'exécution : elle a besoin des ÉCRANS
        // RÉELLEMENT OUVERTS. Jugée avant, elle ne voyait que des mots — et
        // « réservation couverte » avec 2 occurrences pour 59 au cahier
        // était le prix exact de cet ordre-là (mesuré le 2026-11-01).
        const couverture = jugerCouverture(o.demande, carte, execution?.ecrans ?? [])
        // ── LE JUGE DE LA PERSISTANCE (lot D5 ③, 2026-11-03).
        //
        // Il voit le défaut HYBRIDE qu'aucun autre ne voit : une œuvre
        // moitié branchée sur la base, moitié sur un `useState`. Les cinq
        // juges ci-dessus en sont CONTENTS — un écran alimenté par un
        // tableau en mémoire vit, s'affiche et couvre son exigence. Seul le
        // rechargement dit la vérité, et il la dit à la personne qui vient
        // de perdre son travail.
        const persistance = jugerPersistance(entitesConnues, carte)
        // ── A2 · LA GESTION : « remplissable » n'est pas « tenable ».
        //
        // `jugerPersistance` dit si la table est lue ET écrite. Il disait
        // « rien à redire » sur TROIS œuvres à tables sur QUATRE qui
        // n'avaient ni `update` ni `delete` — une faute de frappe y était
        // définitive. Celui-ci mesure ce qu'il ne mesure pas.
        //
        // Il refuse de juger si son hypothèse tombe : voir `juge-gestion`.
        const gestion = jugerGestion(entitesConnues, carte)
        // ── J1 · LES DEUX FACES, MESURÉES EN MONTANT SANS SESSION.
        //
        // Il ne tourne QUE s'il y a des tables : sans table il n'y a pas de
        // face publique à tromper, et trois montages coûteraient ~4,5 s pour
        // rien.
        //
        // ── POURQUOI IL REFUSE, ET PAS SEULEMENT SIGNALE.
        //
        // La loi a été écrite dans la consigne, dans les deux branches,
        // vérifiée clause par clause sur la consigne produite. La première
        // œuvre générée avec elle (`asosa`, 2026-11-06) a obéi à quatre
        // clauses sur neuf et laissé ses TROIS tables non déclarées. La
        // prose a échoué deux fois ; une règle que rien ne mesure n'est pas
        // une règle.
        const faces: VerdictFaces | null =
          entitesConnues.length > 0 && jetons.length === 0
            ? await (o.jugerFaces ?? jugerFaces)(v.code, entitesConnues)
            : null
        const reproches: string[] = []
        if (jetons.length > 0) {
          reproches.push(
            'DES JETONS QUI N’EXISTENT PAS — l’application MOURRAIT au démarrage ' +
              '(mesuré : undefined.fontSize sur un tir réel) :\n' +
              jetons
                .slice(0, 15)
                .map((d) => `- ${d.fichier} : ${d.reference} — ce qui existe : ${d.connus.join(', ')}`)
                .join('\n') +
              '\nEmploie EXACTEMENT les noms fournis par la bibliothèque, aucun autre.',
          )
        }
        if (devises.length > 0 && deviseConfiguree !== undefined) {
          reproches.push(
            `LA DEVISE DU CLIENT EST ${deviseConfiguree} (affichée « ${marqueRecommandee(deviseConfiguree)} ») — le code montre d'autres monnaies :\n` +
              devises
                .map((d) => `- ${d.fichier} : « ${d.marque} » ×${String(d.occurrences)}`)
                .join('\n') +
              '\nRemplace chacune : tous les montants visibles emploient la devise du client, aucune autre.',
          )
        }
        if (vivacite.length > 0) {
          reproches.push(
            'DES CONTRÔLES MORTS — un écran qui a l’air de fonctionner et ne fait rien :\n' +
              vivacite
                .slice(0, 12)
                .map((d) => `- ${d.fichier} : ${d.manque} → ${d.extrait}`)
                .join('\n') +
              '\nLie chacun à une action réelle (état qui change, calcul exécuté), ou marque-le data-demonstration ET dis « Démonstration » à l’écran.',
          )
        }
        if (execution !== null && execution.indisponible === undefined && !execution.monteDansSimulateur) {
          reproches.push(
            "L'APPLICATION NE SE MONTE PAS — dans un navigateur SIMULÉ, elle " +
              'échoue avant de rendre quoi que ce soit :\n' +
              execution.erreurs
                .slice(0, 8)
                .map((e) => `- ${e.quoi} : ${e.message}${e.indice === '' ? '' : ` (${e.indice})`}`)
                .join('\n') +
              '\nCorrige la cause : une application livrée doit s’ouvrir et afficher ses écrans.',
          )
        }
        if ((execution?.controlesMuets ?? []).length > 0) {
          reproches.push(
            'DES CONTRÔLES SANS NOM LISIBLE — rendus, liés, et pourtant ' +
              'inutilisables : personne ne sait ce qu’ils font :\n' +
              (execution?.controlesMuets ?? [])
                .slice(0, 8)
                .map((m) => `- <${m.balise}> : ${m.extrait}`)
                .join('\n') +
              '\nDonne un texte visible à chacun (ou un aria-label s’il ne porte qu’une icône).',
          )
        }
        if (persistance.length > 0) {
          // ── LE DERNIER REPROCHE SE SAIT DERNIER.
          //
          // Les reproches partent aux tours 1..toursMax-1 ; la réponse au
          // dernier est LIVRÉE telle quelle. Le modèle recevait donc trois
          // fois la même phrase sans savoir laquelle était la dernière —
          // une information qui lui manquait objectivement.
          reproches.push(
            reprochePersistance(persistance, preuvesDeMemoire(carte), rang === toursMax - 1),
          )
        }
        // ── A3 · LE REPROCHE DE GESTION, APRÈS LA PERSISTANCE.
        //
        // L'ordre compte : une table jamais écrite se reproche d'abord
        // (`jugerPersistance`), et `jugerGestion` l'écarte précisément
        // pour ne pas reprocher deux fois le même manque. Les reproches
        // se lisent donc du plus grave au plus fin.
        const quoiGestion = reprocheGestion(gestion)
        if (quoiGestion !== null) reproches.push(quoiGestion)
        // ── ET SI L'HYPOTHÈSE EST TOMBÉE, ON NE SE TAIT PAS.
        //
        // Ce n'est pas un reproche au modèle — il n'y peut rien. C'est un
        // avertissement pour nous, dans le journal du tour, parce qu'un
        // juge qui cesse de juger en silence est un juge qu'on croit
        // encore actif. Il ne bloque pas la livraison.
        if (gestion.hypotheseTombee !== null) {
          console.warn(`[boucle] juge de gestion inactif — ${gestion.hypotheseTombee}`)
        }
        // ── ET SON REPROCHE PASSE DEVANT LA COUVERTURE.
        //
        // Une page publique vide chez tout le monde est plus grave qu'une
        // exigence muette : la première rend l'œuvre invendable, la seconde
        // la rend incomplète.
        const quoiFaces = faces === null ? null : reprocheFaces(faces)
        if (quoiFaces !== null) reproches.push(quoiFaces)
        // Un juge qui n'a pas pu tourner le DIT : son silence se lirait comme
        // un vert, et c'est la faute qu'il existe pour fermer.
        if (faces !== null && !faces.aTourne) {
          console.warn(`[boucle] juge des faces inactif — ${faces.motif ?? 'motif inconnu'}`)
        }
        if (couverture.absentes.length > 0) {
          reproches.push(
            'DES EXIGENCES DU CAHIER SONT MUETTES — ni dans l’application, ni déclarées :\n' +
              couverture.absentes
                .map((e) =>
                  e.statut === 'nommee'
                    ? `- ${e.exigence} : le code en PARLE (${e.code} fois) mais aucun écran ouvert ne la porte — une mention n’est pas une couverture`
                    : e.statut === 'declaree-mais-centrale'
                      ? `- ${e.exigence} : déclarée hors périmètre alors que le cahier y insiste ${e.cahier} fois — trop central pour être écarté sans l’accord du client`
                      : `- ${e.exigence} (le cahier y insiste ${e.cahier} fois, le code n’en dit rien)`,
                )
                .join('\n') +
              `\nCouvre-les, ou déclare-les dans ${FICHIER_PERIMETRE} avec un motif d’une ligne. Le silence est interdit.`,
          )
        }
        if (reproches.length > 0 && rang < toursMax) {
          motif = reproches.join('\n\n')
        } else {
          // Au dernier tour, les défauts restants ne REFUSENT pas l'œuvre —
          // ils l'ACCOMPAGNENT, dits : refuser re-brûlerait l'argent du
          // propriétaire, taire referait le défaut fondateur.
          tours.push({ rang, fichiers: lus.length, ok: true, ms: Date.now() - debut })
          return {
            ok: true,
            code: v.code,
            fichiers: carte,
            tours,
            jetons,
            execution,
            vivacite,
            couverture,
            persistance,
            faces,
            entites: entitesConnues,
            refusEntites: refusEnRoute,
          }
        }
      } else {
        motif = `La construction a échoué :\n${v.erreur}`
      }
    }

    // ── LE TOUR REFUSÉ GARDE SES SOURCES — bornées, jamais tues (EP-297).
    const source: Record<string, string> = {}
    let budget = 200_000
    for (const f of lus) {
      const part = f.contenu.slice(0, Math.max(0, budget))
      source[f.chemin] = part.length < f.contenu.length ? part + '\n— tronqué par le journal —' : part
      budget -= part.length
    }
    tours.push({ rang, fichiers: lus.length, ok: false, motif, tronquee, ms: Date.now() - debut, source })

    // ── ON RENVOIE L'ERREUR TELLE QUELLE, ET ON REDEMANDE TOUT.
    //
    // Pas de correctif partiel : le modèle réécrit les fichiers concernés
    // avec le reste. Un patch partiel exigerait un format de patch, donc une
    // grammaire — exactement ce qu'on vient de quitter.
    //
    // MAIS ON NE DEMANDE PAS LA MÊME CHOSE DANS LES DEUX CAS, et c'est le
    // cœur de la correction. « Corrige » n'a aucun sens pour un texte coupé :
    // il n'y a rien à corriger, il y a trop à écrire. Redemander la même
    // application au même modèle la ferait couper au même endroit.
    const suite = tronquee
      ? 'Récris la MÊME application, en entier, mais plus COMPACTE : moins de ' +
        'lignes, pas de commentaires, pas de variantes décoratives. Toutes les ' +
        'fonctions demandées restent, aucune ne disparaît.'
      : 'Corrige et rends TOUS les fichiers.'
    messages.push({ role: 'assistant', content: texte })
    messages.push({ role: 'user', content: `${motif}\n\n${suite}` })
  }

  return {
    ok: false,
    motif: `Non convergé en ${String(toursMax)} tours.`,
    tours,
    dernierTexte,
  }
}

/**
 * LE PRÉLUDE — ce que la page doit à l'application avant qu'elle démarre.
 *
 * ── CE QU'IL RÉPARE, MESURÉ LE 2026-10-19.
 *
 * Première application livrée du projet. Elle compile, elle pèse 63 695
 * caractères, et l'écran est resté BLANC.
 *
 *     SecurityError: Failed to read the 'localStorage' property from
 *     'Window': The document is sandboxed and lacks the 'allow-same-origin'
 *     flag.
 *         at commitHookEffectListMount
 *
 * Le cadre qui montre l'application porte `sandbox="allow-scripts"` SANS
 * `allow-same-origin`, et c'est délibéré : sans cette restriction,
 * l'application générée pourrait lire le site qui l'héberge. On ne touche
 * donc pas au cadre.
 *
 * Mais dans une origine opaque, `localStorage` LÈVE à la simple lecture.
 * L'application en faisait un usage parfaitement normal — un `useEffect` qui
 * oublie un identifiant à la déconnexion. React a propagé, démonté, et laissé
 * du blanc.
 *
 * ── ET CE N'EST PAS UN DÉFAUT DE CETTE APPLICATION-LÀ.
 *
 * TOUTE application qui garde des données ferait exactement ça. Demander au
 * modèle d'entourer chaque accès d'un `try` serait traiter le symptôme :
 * c'est la PAGE qui doit offrir une plateforme qui fonctionne, pas
 * l'application qui doit deviner dans quel cadre on l'a mise.
 *
 * Deux gestes, donc, et ils ne coûtent qu'un millier de caractères :
 *
 *   ① UN STOCKAGE DE SECOURS, en mémoire, installé seulement si le vrai est
 *      inaccessible. L'application fonctionne ; ses données vivent le temps
 *      de la session. Dans un aperçu, c'est exactement ce qu'on veut.
 *   ② UN FILET QUI AFFICHE. Une page blanche ne dit rien à personne — ni au
 *      propriétaire, ni à moi. Il m'a fallu poser ce filet à la main pour
 *      trouver ce défaut en deux minutes ; il reste désormais posé.
 */
const PRELUDE = `(function(){
try{window.localStorage.getItem("_")}catch(e){
var M={},S={};
function faux(m){return{getItem:function(k){return k in m?m[k]:null},
setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},
clear:function(){for(var k in m)delete m[k]},
key:function(i){return Object.keys(m)[i]||null},
get length(){return Object.keys(m).length}}}
try{Object.defineProperty(window,"localStorage",{value:faux(M),configurable:true});
Object.defineProperty(window,"sessionStorage",{value:faux(S),configurable:true})}catch(e2){}}
function montrer(titre,detail){
var p=document.createElement("div");
p.setAttribute("data-deribfy-erreur","1");
p.style.cssText="padding:18px;font:14px/1.5 system-ui,-apple-system,sans-serif;color:#7f1d1d;background:#fef2f2;border-bottom:2px solid #dc2626";
var h=document.createElement("strong");h.textContent=titre;
var d=document.createElement("details");d.style.marginTop="8px";
var r=document.createElement("summary");r.textContent="Detail technique";r.style.cursor="pointer";
var c=document.createElement("pre");
c.style.cssText="white-space:pre-wrap;font:12px ui-monospace,monospace;margin:8px 0 0";
c.textContent=detail;d.appendChild(r);d.appendChild(c);
p.appendChild(h);p.appendChild(d);
(document.body||document.documentElement).insertBefore(p,(document.body||document.documentElement).firstChild)}
window.__deribfyErreur=function(e){
montrer("Cette application s'est arretee en cours d'execution.",
String((e&&e.message)||e)+"\\n\\n"+String((e&&e.stack)||""))};
window.addEventListener("error",function(e){
montrer("Cette application s'est arretee en cours d'execution.",
String(e.message||"")+"\\n\\n"+String((e.error&&e.error.stack)||""))});
window.addEventListener("unhandledrejection",function(e){
montrer("Cette application s'est arretee en cours d'execution.",
String((e.reason&&e.reason.stack)||e.reason))});
})()`

/**
 * L'ENVELOPPE DU MODULE — du texte ÉMIS, comme le prélude.
 *
 * Elle capture l'erreur DANS le module, donc dans le même royaume que le
 * code du client : un `iframe sandbox="allow-scripts"` avec `srcDoc` a une
 * ORIGINE OPAQUE, et le navigateur masque alors l'erreur d'un script qu'il
 * juge d'une autre origine — « Script error. », sans fichier ni ligne.
 * C'est l'écran que le propriétaire a vu le 2026-11-01.
 *
 * Elle est NOMMÉE pour que le cliquet EP-280 puisse la borner : comme
 * `PRELUDE`, elle contient des appels de navigateur qui ne s'exécutent
 * JAMAIS ici. Un `window.` posé ailleurs dans ce module doit continuer de
 * faire rougir.
 */
const ENVELOPPE_MODULE = {
  avant: 'try{\n',
  apres: '\n}catch(e){window.__deribfyErreur&&window.__deribfyErreur(e)}',
} as const

/**
 * LA PAGE — autonome, comme celle de l'aperçu.
 *
 * Elle ne demande rien à personne : ni police distante, ni script externe.
 * C'est ce qui lui permet d'être servie dans un cadre isolé, et d'être
 * publiée par le lien de partage sans toucher l'origine de Deribfy.
 */
/**
 * N2 (2026-10-31) — LA PAGE PUBLIÉE S'INSTALLE SUR LE TÉLÉPHONE.
 *
 * Arbitrage du propriétaire : N3 a retiré la promesse native fausse ; N2
 * rend VRAIE la phrase « s'installe sur le téléphone » — manifeste PWA cuit
 * en data:, icônes PNG pleines embarquées (552 et 1996 caractères — aucune
 * requête externe, la page reste autonome), affichage standalone, et les
 * balises Apple pour « Sur l'écran d'accueil ». Chrome n'exige plus de
 * service worker pour installer ; iOS passe par ses balises. La CSP de
 * publication autorise manifest-src data: — mesurée bloquante sinon.
 */
const ICONE_192 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAABZElEQVR42u3SQQ0AAAjEsNODJYRjBwuEd5MqWJbqgbdIgIEwEAbCQGAgDISBMBAYCANhIAwEBsJAGAgDgYEwEAbCQBgIDISBMBAGAgNhIAyEgcBAGAgDYSAwEAbCQBgIA4GBMBAGwkBgIAyEgTAQGAgDYSAMBAbCQBgIA4GBMBAGwkAYCAyEgTAQBgIDYSAMhIHAQBgIA2EgMBAGwkAYCAOBgTAQBsJAYCAMhIEwEBgIA2EgDAQGwkAYCANhIDAQBsJAGAgMhIEwEAYCA2EgDISBwEAYCANhIDAQBsJAGAgDgYEwEAbCQGAgDISBMBAYCANhIAwEBsJAGAgDYSAwEAbCQBgIDISBMBAGAgNhIAyEgcBAGAgDYSAMpAIGwkAYCAOBgTAQBsJAYCAMhIEwEBgIA2EgDAQGwkAYCANhIDAQBsJAGAgMhIEwEAYCA2EgDISBwEAYCANhIAwEBsJAGAgDwdUCr6bLbgmsov8AAAAASUVORK5CYII='
const ICONE_512 = 'iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAFn0lEQVR42u3VMQ0AAAgEsdeDJYRjBw+sNKmCWy7VA8BDkQDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADADAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADADAAFQAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAMAAVAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAwAAkADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADADAAFQAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAMQAUAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADADAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADADAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwAwAAAMAAADAMAAADAAAAwAAAMAwAAAMAAADAAAAwDAAAAwAAAMAAADAMAAADAAAAwAgJsFHTpRkbhBA2kAAAAASUVORK5CYII='

function manifesteDataUri(titre: string): string {
  const manifeste = {
    name: titre,
    short_name: titre.slice(0, 24),
    display: 'standalone',
    start_url: '.',
    background_color: '#f7f8fb',
    theme_color: '#2a5bd7',
    icons: [
      { src: 'data:image/png;base64,' + ICONE_192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'data:image/png;base64,' + ICONE_512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
  return 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifeste))
}

/**
 * LES MOTIFS QU'UN DOCUMENT SERVI NE DOIT JAMAIS PORTER.
 *
 * ── ET POURQUOI CHACUN EXIGE DE QUOI ÊTRE SÛR.
 *
 * Un `postgresql://` NU peut légitimement apparaître dans une application
 * qui parle de bases de données — une documentation, un exemple, un champ de
 * saisie. Ce qui est un secret, c'est la chaîne AVEC ses identifiants. On
 * exige donc le `user:motdepasse@`, et pas seulement le protocole.
 *
 * Même discipline pour les clés : un préfixe sans corps est un contrôle de
 * préfixe, pas une valeur — le cliquet des secrets a déjà accusé un
 * `token.startsWith("sbp_")` parfaitement légitime.
 */
const SECRETS_INTERDITS: readonly (readonly [RegExp, string])[] = [
  [/postgres(?:ql)?:\/\/[^\s:/@]+:[^\s@]{4,}@/u, 'une chaîne de connexion avec ses identifiants'],
  [new RegExp('sb_' + 'secret_[A-Za-z0-9_-]{16,}', 'u'), 'une clé secrète Supabase'],
  [new RegExp('sbp' + '_[A-Za-z0-9]{32,}', 'u'), 'un jeton de Management API'],
]

/**
 * LA PAGE AUTONOME — et elle REFUSE de porter un secret.
 *
 * ── POURQUOI UN REFUS BRUYANT PLUTÔT QU'UN NETTOYAGE SILENCIEUX.
 *
 * « Un secret dans une page publiée ne se rattrape pas : elle est déjà
 * servie. » Retirer discrètement la chaîne fautive laisserait croire que
 * tout va bien, et personne ne saurait qu'un identifiant a failli partir.
 *
 * Un échec se voit, se lit, et se corrige. Un nettoyage, non.
 *
 * ── ET LE CONTRÔLE PORTE SUR LE DOCUMENT ASSEMBLÉ, pas sur ses morceaux.
 *
 * Le titre traverse la page à quatre endroits (`<title>`, le manifeste, les
 * balises Apple), le code du modèle à un cinquième, et la configuration
 * injectée à un sixième. Juger chaque entrée séparément reviendrait à tenir
 * une liste des chemins — et c'est le chemin qu'on oublie qui sert.
 *
 * C'est la leçon du zip du 2026-11-02 : on mesure ce qui PART.
 */
/**
 * CE QUE L'APPLICATION PUBLIÉE REÇOIT DE SA BASE.
 *
 * ── LE SEUL POINT D'INJECTION, ET IL EXISTAIT DÉJÀ.
 *
 * Mesuré le 2026-11-02 : la page autonome n'avait AUCUN endroit où poser une
 * configuration. Le `PRELUDE` est le seul candidat — il part en premier, en
 * script ordinaire (un module serait différé, donc installé APRÈS que
 * l'application a déjà échoué).
 *
 * ── MÊME CODE, DEUX PROVENANCES.
 *
 * Publiée, Deribfy fournit l'adresse et la clé publiable. Téléchargée, les
 * deux sont VIDES et le LISEZ-MOI dit quoi mettre. L'application lit le même
 * objet dans les deux cas : elle n'a pas à savoir d'où elle vient.
 *
 * ── ET SEULEMENT CES DEUX VALEURS.
 *
 * La clé publiable est publique par conception — c'est ce qui ship dans tout
 * client Supabase, et la porte ne s'ouvre qu'avec un jeton de session. Rien
 * d'autre n'entre : EP-323 fait échouer l'émission d'un document portant une
 * clé secrète, une chaîne de connexion ou un jeton d'administration.
 */
export type ConfigurationOeuvre = {
  /** L'adresse du projet, ou '' quand l'archive part sans base. */
  readonly url: string
  /** La clé PUBLIABLE. Jamais la secrète — EP-323 refuserait le document. */
  readonly clePubliable: string
  /** Le schéma de cette œuvre. L'application ne le pose JAMAIS à la main. */
  readonly schema: string
}

/**
 * LES OPTIONS PRÊTES — pour retirer au modèle un choix qu'il rate.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-02 SUR LA VRAIE BASE.
 *
 * PostgREST emploie `Accept-Profile` pour LIRE et `Content-Profile` pour
 * ÉCRIRE. Une application qui ne pose que le premier :
 *
 *     LECTURE  (Accept-Profile)       HTTP 200  [{"id":"m1"},{"id":"m2"}]
 *     ÉCRITURE (Accept-Profile seul)  HTTP 404  PGRST205 « Could not find
 *                                               the table 'public.membre' »
 *
 * Le symptôme est méchant : la lecture marche, donc tout a l'air branché, et
 * la PREMIÈRE ÉCRITURE échoue sur une table introuvable — parce qu'elle est
 * allée la chercher dans `public`.
 *
 * ── CE QUI FERME LA CLASSE : `db.schema`.
 *
 * L'option `db: { schema }` de `supabase-js` pose LES DEUX en-têtes. Mesuré
 * dans les deux sens : lecture ET écriture passent.
 *
 * On injecte donc les options TOUTES FAITES. L'application écrit
 * `createClient(b.url, b.clePubliable, b.options)` et n'a aucune décision à
 * prendre — un choix qu'on ne lui laisse pas est un choix qu'elle ne rate
 * pas.
 */
export function optionsPour(schema: string): Record<string, unknown> {
  return { db: { schema }, auth: { persistSession: true } }
}

/**
 * LA TROISIÈME ZONE ÉMISE — et elle est NOMMÉE, comme les deux autres.
 *
 * ── POURQUOI UNE CONSTANTE PLUTÔT QU'UN GABARIT EN PLACE.
 *
 * EP-280 n'autorise les appels de navigateur que dans des zones ÉMISES
 * DÉCLARÉES : le prélude, et l'enveloppe du module. Mon injection en était
 * une troisième, anonyme au milieu d'une fonction — et le cliquet l'a
 * refusée, à raison.
 *
 * Élargir son exception à « tout ce qui est dans `pageAutonome` » aurait
 * dissous la garde : c'est précisément là que le code émis s'assemble. Une
 * zone nommée, en revanche, se compte — et le cliquet peut exiger que leur
 * liste reste close.
 *
 * Ce texte n'est JAMAIS exécuté ici : il part dans la page et tourne chez la
 * personne.
 */
/**
 * LE BANDEAU DE L'APPLICATION NON RELIÉE.
 *
 * Il ne dit pas « erreur » — rien n'est cassé. Il dit ce qui manque et où
 * lire la suite, dans les mots de quelqu'un qui vient de dézipper.
 */
/**
 * DEUX CONTEXTES, DEUX PHRASES — l'une annonce, l'autre instruit.
 *
 * ── LE DÉFAUT DE FORMULATION, SIGNALÉ LE 2026-11-04.
 *
 * Cette phrase avait été écrite pour l'application TÉLÉCHARGÉE : là, le
 * LISEZ-MOI existe vraiment et le propriétaire a quelque chose à faire.
 *
 * Dans l'APERÇU, elle tombe à côté. La personne vient de voir naître son
 * application, et la première chose qu'elle lit est un avertissement en
 * ambre qui parle d'un fichier qu'elle n'a pas encore. Ça ressemble à une
 * panne alors que c'est une étape pas encore franchie.
 *
 *   « Dis ce qui va se passer, pas ce qui manque. »
 */
const CADRE_BANDEAU =
  '<div role="status" style="background:#fff4e5;border-bottom:1px solid #f0c48a;' +
  'color:#7a4a00;padding:10px 14px;font:14px/1.5 system-ui,-apple-system,sans-serif">'

/** L'APERÇU : ce qui va se passer. Rien n'est cassé, rien n'est à faire. */
const BANDEAU_APERCU =
  CADRE_BANDEAU +
  '<strong>Votre base de données sera créée à la publication.</strong> ' +
  'Pour l’instant c’est un aperçu : ce que vous saisissez ici ne sera pas ' +
  'conservé.</div>'

/**
 * L'APERÇU D'UNE ŒUVRE DÉJÀ PUBLIÉE — et c'est le défaut mesuré le
 * 2026-11-05.
 *
 * ── CE QUE L'ÉCRAN DISAIT, ET POURQUOI C'ÉTAIT FAUX.
 *
 * L'atelier appelle `pageAutonome(code, titre)` SANS configuration : la
 * page part donc avec `url: ''`, et le bandeau de l'aperçu s'affiche —
 *
 *     « Votre base de données sera créée à la publication. »
 *
 * Sur une œuvre DÉJÀ publiée, cette phrase est un mensonge : la base
 * existe, le schéma est posé, les données sont là. La personne lit qu'il
 * reste une étape alors qu'elle l'a franchie.
 *
 * ── ET LA BASE NE PEUT PAS ÊTRE INJECTÉE ICI, C'EST STRUCTUREL.
 *
 * MESURÉ dans les deux moteurs, sur un cadre `sandbox="allow-scripts"` :
 *
 *     location.origin  = null        localStorage    → SecurityError
 *     navigator.locks  = undefined   crypto.subtle   = undefined
 *     isSecureContext  = false
 *
 * Une origine opaque envoie `Origin: null`, et aucun service ne
 * l'autorise. L'aperçu NE PEUT PAS atteindre la base — injecter l'adresse
 * ne ferait qu'échanger un mensonge contre un plantage.
 *
 * Donc on le DIT, et on donne le seul endroit où ça marche : l'adresse
 * publiée.
 */
const BANDEAU_PUBLIEE = (adresse: string): string =>
  CADRE_BANDEAU +
  '<strong>Les données ne sont pas accessibles depuis cet aperçu.</strong> ' +
  'Ouvrez votre application publiée pour vous connecter et voir vos ' +
  `données : <a href="${adresse}" target="_blank" rel="noopener noreferrer" ` +
  `style="color:#7a4a00;font-weight:600">${adresse.replace(/^https:\/\//u, '')}</a></div>`

/**
 * L'ŒUVRE SERVIE AU PUBLIC QUI NE CONSERVE RIEN (⑥, 2026-11-05).
 *
 * ── LE TROU QUE J'AVAIS LAISSÉ DANS A, et c'est moi qui l'ai signalé.
 *
 * A n'avait corrigé que l'ATELIER. Sur `/a/<sous>` et `/p/<jeton>`,
 * `adressePubliee` valait `null` et le bandeau de l'aperçu partait tel quel.
 *
 * MESURÉ sur `sneapp.deribfy.app`, HTTP 200, publiée depuis le 2026-11-04 :
 *
 *     « Votre base de données sera créée à la publication. »
 *
 * Elle EST publiée. Et elle n'aura jamais de base : son schéma ne porte
 * aucun `create table` (363 o de préambule), `jugerPersistance` rend `[]`,
 * et `baseDeLOeuvre` n'injecte donc rien — à juste titre.
 *
 * La phrase juste n'est ni « ce sera créé » (faux) ni « ouvrez la version
 * publiée » (on y est) : c'est que cette application ne garde rien.
 */
const BANDEAU_SANS_MEMOIRE =
  CADRE_BANDEAU +
  '<strong>Cette application ne conserve pas de données.</strong> ' +
  'Ce que vous saisissez disparaît au rechargement de la page.</div>'

/** LE TÉLÉCHARGEMENT : ce qu'il reste à faire, et où c'est écrit. */
const BANDEAU_TELECHARGE =
  CADRE_BANDEAU +
  '<strong>Cette application n’est pas encore reliée à une base.</strong> ' +
  'Ce que vous saisissez ne sera pas conservé. Voyez le fichier ' +
  '<code>LISEZ-MOI.md</code> de l’archive — section « Vos données ».</div>'

const CONFIGURATION_EMISE = (injectee: ConfigurationOeuvre): string =>
  `<script>window.DERIBFY_BASE=Object.freeze(${JSON.stringify(injectee)});</script>`

export function pageAutonome(
  code: string,
  titre: string,
  configuration?: ConfigurationOeuvre,
  /**
   * OÙ CETTE PAGE SERA LUE.
   *
   * `apercu` par défaut : l'atelier et le lien public sont les deux
   * endroits où quelqu'un REGARDE son application. `archive` est le zip,
   * le seul endroit où le LISEZ-MOI existe et où il y a un geste à faire.
   */
  /**
   * `servie` : la page est lue par le PUBLIC, à son adresse. Ni un aperçu
   * ni une archive — il n'y a rien à annoncer et rien à faire, seulement
   * la vérité sur ce que l'application garde.
   */
  destination: 'apercu' | 'archive' | 'servie' = 'apercu',
  /**
   * L'ADRESSE PUBLIÉE DE CETTE ŒUVRE, quand elle en a une.
   *
   * Elle ne change RIEN à la page servie au public : elle ne sert qu'à
   * l'aperçu, pour pointer vers l'endroit où les données sont joignables.
   * Absente, le bandeau d'avant est rendu tel quel.
   */
  adressePubliee: string | null = null,
): string {
  const sur = titre.replace(/[<>&"]/gu, '')
  // ── LA CONFIGURATION EST SÉRIALISÉE EN JSON, PAS INTERPOLÉE À LA MAIN.
  //
  // `JSON.stringify` échappe ce qu'il faut ; une concaténation de guillemets
  // laisserait une adresse mal formée casser le script — et un script cassé
  // en tête de page empêche l'application de démarrer, sans message.
  //
  // `Object.freeze` : l'application LIT cette configuration, elle ne la
  // réécrit pas. Un code qui la modifierait travaillerait contre la porte.
  const injectee = {
    url: configuration?.url ?? '',
    clePubliable: configuration?.clePubliable ?? '',
    schema: configuration?.schema ?? '',
    // LES OPTIONS PRÊTES : `db.schema` pose `Accept-Profile` ET
    // `Content-Profile`. Sans elles, l'application lirait dans son schéma et
    // écrirait dans `public` — la lecture marcherait, la première écriture
    // échouerait sur une table introuvable.
    options: optionsPour(configuration?.schema ?? ''),
  }
  const morceaux = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${sur}</title>`,
    // N2 : installable — manifeste cuit, balises Apple, couleur de thème.
    `<link rel="manifest" href="${manifesteDataUri(sur)}" />`,
    '<meta name="theme-color" content="#2a5bd7" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    `<meta name="apple-mobile-web-app-title" content="${sur}" />`,
    `<link rel="apple-touch-icon" href="data:image/png;base64,${ICONE_192}" />`,
    `<style>${VARIABLES_CSS}*{box-sizing:border-box}body{margin:0;background:var(--background);color:var(--foreground);font-family:system-ui,-apple-system,sans-serif}</style>`,
    // LE PRÉLUDE PART EN PREMIER, et en script ORDINAIRE : un module serait
    // différé, donc installé APRÈS que l'application a déjà échoué.
    `<script>${PRELUDE}</script>`,
    // L'ADRESSE ET LA CLÉ, AVANT LE CODE DE L'APPLICATION : elle doit pouvoir
    // les lire dès sa première ligne.
    CONFIGURATION_EMISE(injectee),
    '</head><body>',
    // ── CE QUI NE MARCHE PAS ENCORE EXPLIQUE POURQUOI, LÀ OÙ ON LE DÉCOUVRE.
    //
    // L'archive part avec les trois valeurs VIDES. « Un emplacement, pas un
    // trou » est juste côté code — mais celui qui dézippe, lance
    // l'application et voit une liste vide ne saura pas si elle est cassée,
    // si c'est normal, ou s'il a raté une étape.
    //
    // Le bandeau vit HORS de `#racine` : React monte dans la racine et
    // effacerait tout ce qui s'y trouve. Et il n'apparaît QUE sans adresse —
    // une application reliée ne porte aucun bandeau.
    //
    // Même discipline que « AUCUNE DONNÉE DÉCLARÉE » dans `schema.sql`.
    // LE BANDEAU DÉPEND DE LÀ OÙ LA PAGE EST LUE, pas seulement de l'état
    // de sa base : la même absence se dit « ce sera créé » dans l'atelier
    // et « voici ce qu'il reste à faire » dans l'archive.
    // ── TROIS SITUATIONS, TROIS PHRASES. La deuxième était un mensonge.
    //
    //   l'archive          → ce qu'il reste à faire, et où c'est écrit
    //   l'aperçu, publiée  → où les données sont joignables (2026-11-05)
    //   l'aperçu, pas encore → ce qui va se passer
    //
    // Et une œuvre SERVIE au public ne porte aucun bandeau : sa base est
    // là et son origine est la sienne.
    injectee.url !== ''
      ? ''
      : destination === 'archive'
        ? BANDEAU_TELECHARGE
        : destination === 'servie'
          ? BANDEAU_SANS_MEMOIRE
          : adressePubliee !== null
            ? BANDEAU_PUBLIEE(adressePubliee)
            : BANDEAU_APERCU,
    '<div id="racine"></div>',
    `<script type="module">${ENVELOPPE_MODULE.avant}${code}${ENVELOPPE_MODULE.apres}</script>`,
    '</body></html>',
  ]
  const document = morceaux.join('')
  for (const [motif, quoi] of SECRETS_INTERDITS) {
    if (motif.test(document)) {
      throw new Error(
        `PAGE_AUTONOME_SECRET: le document servi porterait ${quoi}. ` +
          'Une page publiée ne se rattrape pas — elle est déjà servie.',
      )
    }
  }
  return document
}
