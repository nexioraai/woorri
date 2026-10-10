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
  readonly getDocument: (o: { data: ArrayBuffer; isEvalSupported: boolean }) => {
    readonly promise: Promise<{
      readonly numPages: number
      readonly getPage: (n: number) => Promise<{
        readonly getTextContent: () => Promise<{ readonly items: { str?: string }[] }>
      }>
    }>
  }
}

/**
 * LE CHARGEUR PAR DÉFAUT — le navigateur, et seulement à la demande.
 *
 * pdfjs REFUSE le build moderne hors navigateur (« Please use the `legacy`
 * build in Node.js environments », puis `hashOriginal.toHex is not a
 * function`). Le chargeur est donc INJECTABLE : le navigateur prend celui-ci,
 * les preuves prennent le build legacy. Motif maison — ce qui dépend de
 * l'environnement s'injecte, et la mécanique devient prouvable.
 */
async function chargerPdfjsDuNavigateur(): Promise<Pdfjs> {
  const pdfjs = (await import('pdfjs-dist')) as unknown as Pdfjs & {
    GlobalWorkerOptions: { workerSrc: string }
  }
  // Le worker vit dans le paquet : aucune requête vers un CDN — la politique
  // réseau l'interdirait, et un document privé ne sort pas de la machine.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
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
    const doc = await pdfjs.getDocument({ data: octets, isEvalSupported: false }).promise
    const morceaux: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const contenu = await page.getTextContent()
      morceaux.push(contenu.items.map((i) => i.str ?? '').join(' '))
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
