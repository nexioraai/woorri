/**
 * LE CAHIER DES CHARGES JOINT — LU DANS LE NAVIGATEUR, JAMAIS EN CACHETTE.
 *
 * ── POURQUOI CE FICHIER EXISTE.
 *
 * « Beaucoup d'utilisateurs sérieux arrivent avec un document — les faire
 * re-taper est pénible et appauvrit le résultat. » Un cahier des charges de
 * tontine, par exemple, dit en huit pages ce qu'une zone de texte de mille
 * caractères ne peut pas contenir.
 *
 * ── DEUX DÉCISIONS QUI TIENNENT TOUT.
 *
 * ① L'EXTRACTION A LIEU DANS LE NAVIGATEUR. Le document ne monte JAMAIS au
 *    serveur : pas de limite de corps, pas de fichier stocké, et la
 *    confidentialité par construction — le cahier des charges d'un client ne
 *    quitte pas sa machine.
 *
 * ② LE TEXTE EXTRAIT REMPLIT LA ZONE DE TEXTE. Il est VU, et corrigeable.
 *    L'injecter en cachette enverrait aussi les pieds de page juridiques et
 *    les signatures — et personne ne saurait ce qui a été envoyé.
 *
 * ── CE QUE CE MODULE NE FAIT PAS.
 *
 * Il ne charge PAS pdfjs : c'est l'appelant qui l'importe dynamiquement, et
 * seulement quand un PDF arrive. Ici ne vivent que les DÉCISIONS — format,
 * estimation du coût, détection d'un scan — toutes pures, donc prouvables
 * sans navigateur.
 */

/** Les formats lus aujourd'hui. Ni .docx ni OCR : ils exigeraient l'un une
 *  dépendance de plus, l'autre un appel payant par document. */
export type FormatJoint = 'texte' | 'pdf' | 'refuse'

export function formatDuFichier(nom: string, type: string): FormatJoint {
  const n = nom.toLowerCase()
  if (type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('text/') || /\.(txt|md|markdown)$/u.test(n)) return 'texte'
  return 'refuse'
}

/** Ce qu'on dit à quelqu'un qui joint un format qu'on ne lit pas — nommé,
 *  jamais un refus muet. */
export function raisonDuRefus(nom: string): string {
  const n = nom.toLowerCase()
  if (/\.(docx?|odt|rtf|pages)$/u.test(n)) {
    return 'Les documents Word ne sont pas encore lus. Enregistrez-le en PDF ou en texte, ou copiez-collez son contenu.'
  }
  if (/\.(png|jpe?g|webp|heic|gif|tiff?)$/u.test(n)) {
    return "Une image n'est pas encore lue (il faudrait de la reconnaissance de texte). Si c'est un document scanné, copiez-collez son contenu."
  }
  return `Ce type de fichier n'est pas lu. Formats acceptés : PDF avec texte, .txt, .md.`
}

/**
 * LE PDF SANS COUCHE TEXTE — un SCAN. Dit, jamais deviné.
 *
 * Un PDF scanné est une suite d'images : pdfjs en extrait zéro ou quelques
 * caractères parasites. Envoyer ce vide produirait une application fondée
 * sur rien, et le propriétaire ne saurait pas pourquoi. Le seuil est
 * volontairement bas (quelques dizaines de caractères pour tout un
 * document) : au-dessous, aucun cahier des charges n'existe.
 */
export const SEUIL_COUCHE_TEXTE = 40

export function estProbablementUnScan(texte: string, nombreDePages: number): boolean {
  const utile = texte.replace(/\s+/gu, ' ').trim()
  if (utile.length < SEUIL_COUCHE_TEXTE) return true
  // Un document de dix pages qui rend trente caractères par page n'a pas de
  // couche texte non plus : la moyenne compte autant que le total.
  return nombreDePages > 0 && utile.length / nombreDePages < 20
}

export const MESSAGE_SCAN =
  "Ce PDF semble être un SCAN : il ne contient pas de texte, seulement des images. " +
  "Deribfy ne sait pas encore le lire (il faudrait de la reconnaissance de caractères). " +
  "Copiez-collez son contenu dans la zone de texte, ou joignez une version avec du texte.";

/**
 * L'ESTIMATION DU COÛT, AFFICHÉE AVANT L'ENVOI.
 *
 * MESURE QUI JUSTIFIE CET AFFICHAGE : le texte de la demande voyage dans
 * CHAQUE appel d'émission et de réparation (`contexteClient`, orchestration
 * scellée) — une trentaine d'appels. Sur un tir réel, l'entrée totalisait
 * 401 627 jetons, soit ~2 $ des ~8 $ dépensés. Un cahier de quarante pages
 * ajouterait donc ~3 $, pas 0,10 $.
 *
 * C'est pourquoi le moteur n'envoie le texte COMPLET qu'à P0, et garde la
 * demande courte pour l'émission : le modèle métier que P0 produit EST la
 * distillation du cahier, et il voyage déjà dans le prescriptif.
 *
 * Le chiffre affiché est donc celui du chemin RÉEL : un seul appel P0.
 */
export const PRIX_ENTREE_PAR_MTOK = 5
export const JETONS_PAR_CARACTERE = 1 / 4 // approximation usuelle, français compris

export function estimation(texte: string): {
  caracteres: number
  jetons: number
  coutUsd: number
  libelle: string
} {
  const caracteres = texte.length
  const jetons = Math.round(caracteres * JETONS_PAR_CARACTERE)
  const coutUsd = (jetons / 1_000_000) * PRIX_ENTREE_PAR_MTOK
  return {
    caracteres,
    jetons,
    coutUsd,
    libelle: `~${jetons.toLocaleString('fr-FR')} jetons · +${coutUsd.toFixed(2)} $ sur la compréhension`,
  }
}

/** La borne de la zone de texte quand un cahier des charges peut y entrer.
 *  Les trois modes gardent la leur (1000) : cette valeur est OPTIONNELLE. */
export const LONGUEUR_AVEC_DOCUMENT = 200_000
