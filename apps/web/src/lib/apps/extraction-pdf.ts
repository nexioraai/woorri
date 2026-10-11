/**
 * L'EXTRACTION DU TEXTE D'UN PDF — DANS LE NAVIGATEUR, À LA DEMANDE.
 *
 * pdfjs n'est chargé QUE lorsqu'un PDF arrive (import dynamique) : le
 * bundle de l'accueil n'en porte pas un octet. Les trois modes ne
 * l'atteignent jamais.
 *
 * Isolé dans son fichier pour que la DÉCISION (`document-joint.ts`) reste
 * pure et prouvable sans navigateur, et que seule la mécanique dépende d'une
 * bibliothèque.
 */
import { estProbablementUnScan } from './document-joint'

export type ResultatExtraction =
  | { readonly ok: true; readonly texte: string; readonly pages: number }
  | { readonly ok: false; readonly raison: 'scan'; readonly pages: number }
  | { readonly ok: false; readonly raison: 'illisible'; readonly detail: string }

/** La surface de pdfjs dont ce module dépend — pas une ligne de plus. */
export interface Pdfjs {
  readonly GlobalWorkerOptions?: { workerSrc: string }
  readonly getDocument: (o: {
    data: ArrayBuffer
    isEvalSupported: boolean
    disableStream?: boolean
    disableAutoFetch?: boolean
    useWorkerFetch?: boolean
  }) => {
    readonly promise: Promise<{
      readonly numPages: number
      readonly getPage: (n: number) => Promise<{
        /** LE FLUX BRUT, et pas `getTextContent()` — voir la lecture
         *  ci-dessous : c'est cette méthode-là qui marche dans Safari. */
        readonly streamTextContent: (o?: Record<string, unknown>) => {
          readonly getReader: () => {
            readonly read: () => Promise<{
              done: boolean
              value?: { items?: { str?: string }[] }
            }>
          }
        }
      }>
    }>
  }
}

/**
 * LE CHARGEUR PAR DÉFAUT — LE BUILD `legacy`, DANS LE NAVIGATEUR AUSSI.
 *
 * MESURÉ DANS SAFARI (2026-10-10, premier essai réel du trombone) : le build
 * moderne échoue sur « undefined is not a function (near '...value of
 * readableStream...') ». Safari ne gère pas les mêmes primitives de flux que
 * Chrome, et le build moderne s'en sert.
 *
 * Le build `legacy` existe précisément pour ça : il vise les environnements
 * qui n'ont pas les dernières primitives. Il servait déjà aux preuves en
 * Node — l'adopter ici supprime DEUX problèmes d'un coup : Safari marche, et
 * les preuves exercent désormais EXACTEMENT le code du navigateur. Une
 * preuve qui teste un autre chemin que celui qui tourne ne prouve rien.
 */
async function chargerPdfjsDuNavigateur(): Promise<Pdfjs> {
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as Pdfjs & {
    GlobalWorkerOptions: { workerSrc: string }
  }
  // Le worker vit dans le paquet, version legacy ASSORTIE au moteur : un
  // worker d'une autre variante se charge et échoue plus loin, ce qui est
  // pire qu'une erreur franche. Aucune requête vers un CDN — la politique
  // réseau l'interdirait, et un document privé ne quitte pas la machine.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()
  return pdfjs
}

/**
 * @param octets le PDF, déjà lu en mémoire par le navigateur
 * @param chargerPdfjs injecté par les preuves (build legacy en Node)
 */
export async function extraireTexteDuPdf(
  octets: ArrayBuffer,
  chargerPdfjs: () => Promise<Pdfjs> = chargerPdfjsDuNavigateur,
): Promise<ResultatExtraction> {
  try {
    const pdfjs = await chargerPdfjs()
    // LES FLUX SONT COUPÉS, DÉLIBÉRÉMENT. Le PDF est DÉJÀ en mémoire : il
    // n'y a rien à télécharger progressivement, et c'est précisément le
    // chemin de flux qui casse dans Safari. `isEvalSupported: false` ferme
    // en plus l'évaluation dynamique — un document d'inconnu ne s'exécute
    // pas chez nous.
    const doc = await pdfjs.getDocument({
      data: octets,
      isEvalSupported: false,
      disableStream: true,
      disableAutoFetch: true,
      useWorkerFetch: false,
    }).promise
    const morceaux: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      // ── POURQUOI PAS `getTextContent()`, LA MÉTHODE ÉVIDENTE.
      //
      // MESURE (Safari, 2026-10-10, deux échecs de suite) : « undefined is
      // not a function (near '...value of readableStream...') ». La cause
      // est à la ligne 22362 de pdfjs — DANS `getTextContent` :
      //
      //     for await (const value of readableStream) { … }
      //
      // `for await … of` sur un ReadableStream exige
      // `Symbol.asyncIterator`, que Safari n'implémente PAS. Le code est
      // IDENTIQUE dans les builds moderne et legacy : changer de build ne
      // pouvait rien y faire, et c'est l'erreur que j'ai commise d'abord.
      //
      // `streamTextContent()` est publique et rend le flux brut. On le lit
      // avec `getReader()` — que Safari gère — et personne n'a besoin qu'on
      // rafistole un prototype global dans son navigateur.
      const lecteur = page.streamTextContent({ disableNormalization: false }).getReader()
      const bouts: string[] = []
      for (;;) {
        const { done, value } = await lecteur.read()
        if (done) break
        for (const item of value?.items ?? []) bouts.push(item.str ?? '')
      }
      morceaux.push(bouts.join(' '))
    }
    const texte = morceaux.join('\n\n').replace(/[ \t]+/gu, ' ').trim()
    if (estProbablementUnScan(texte, doc.numPages)) {
      return { ok: false, raison: 'scan', pages: doc.numPages }
    }
    return { ok: true, texte, pages: doc.numPages }
  } catch (e) {
    return {
      ok: false,
      raison: 'illisible',
      detail: e instanceof Error ? e.message.slice(0, 160) : 'erreur inconnue',
    }
  }
}
