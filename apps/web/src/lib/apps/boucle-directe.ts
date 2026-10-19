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
import { importsInterdits, lireFichiers, PAQUETS_AUTORISES } from './ecriture-directe'

/**
 * LA CONSIGNE — et chaque phrase y répond à un défaut mesuré.
 *
 * Elle est COURTE. Celle du moteur actuel pèse ~17 500 jetons de règles,
 * renvoyés à chacun des neuf appels. Ici le modèle écrit du code : il sait
 * déjà le faire, on n'a pas à le lui apprendre.
 */
export const CONSIGNE = `Tu écris une application web complète, en React et TypeScript.

RENDS UNIQUEMENT DES FICHIERS, dans ce format exact, sans rien avant ni après :

=== index.tsx ===
<le code>
=== composants/Truc.tsx ===
<le code>

RÈGLES, et chacune vient d'un défaut réel :

1. \`index.tsx\` est le point d'entrée. Il monte l'application dans l'élément
   d'identifiant "racine" avec \`createRoot\`. Sans lui, rien ne s'affiche.

2. TU N'IMPORTES QUE CES PAQUETS : ${PAQUETS_AUTORISES.join(', ')}.
   Aucun autre, jamais, même pour une date ou un graphique. Un paquet hors
   de cette liste casse la construction de l'application mobile et fait
   refuser sa publication sur les magasins. Écris la fonction toi-même.

3. TU FAIS LE TRAVAIL DEMANDÉ. Si on demande un calcul, tu écris le calcul
   et tu l'exécutes à l'écran. Un bouton qui mène à un formulaire sans jamais
   calculer n'est pas une réponse.

4. Tu écris du français correct dans l'interface. Jamais un nom technique
   sous les yeux de quelqu'un : pas de \`releve_index_precedent\`, mais
   « Index précédent ».

5. Tu restes SOBRE et complet : ce qui est demandé, entièrement, et rien de
   décoratif. Pas d'images d'illustration, pas d'écrans en plus.

6. Tu écris des valeurs d'exemple PLAUSIBLES quand il en faut — des montants
   et des dates qu'une personne du métier reconnaîtrait.`

export type Tour = {
  readonly rang: number
  readonly fichiers: number
  readonly ok: boolean
  readonly motif?: string
  readonly ms: number
}

export type Resultat =
  | { readonly ok: true; readonly code: string; readonly fichiers: ReadonlyMap<string, string>; readonly tours: readonly Tour[] }
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

/** Ce que l'appelant fournit : un modèle, et rien d'autre. */
export type Appeler = (messages: readonly { role: 'user' | 'assistant'; content: string }[]) => Promise<string>

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
export async function boucleEcriture(o: {
  readonly demande: string
  readonly appeler: Appeler
  readonly toursMax?: number
}): Promise<Resultat> {
  const toursMax = o.toursMax ?? TOURS_MAX
  const tours: Tour[] = []
  let dernierTexte = ''
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: o.demande },
  ]

  for (let rang = 1; rang <= toursMax; rang += 1) {
    const debut = Date.now()
    const texte = await o.appeler(messages)
    dernierTexte = texte
    const lus = lireFichiers(texte)

    // ── TROIS REFUS, DANS CET ORDRE, DU MOINS CHER AU PLUS CHER.
    //
    // Lire coûte zéro. Vérifier les imports coûte zéro. Assembler coûte du
    // processeur. On ne paie le troisième que si les deux premiers passent.
    let motif: string | null = null
    if (lus.length === 0) {
      motif = 'Aucun fichier reçu. Rends UNIQUEMENT des fichiers au format « === chemin === ».'
    } else {
      const interdits = importsInterdits(lus)
      if (interdits.length > 0) {
        motif =
          `Paquets interdits : ${interdits.join(', ')}. ` +
          `Tu ne peux importer que : ${PAQUETS_AUTORISES.join(', ')}. Écris la fonction toi-même.`
      }
    }

    const carte = new Map(lus.map((f) => [f.chemin, f.contenu]))
    if (motif === null) {
      const v = await assembler(carte)
      if (v.ok) {
        tours.push({ rang, fichiers: lus.length, ok: true, ms: Date.now() - debut })
        return { ok: true, code: v.code, fichiers: carte, tours }
      }
      motif = `La construction a échoué :\n${v.erreur}`
    }

    tours.push({ rang, fichiers: lus.length, ok: false, motif, ms: Date.now() - debut })

    // ── ON RENVOIE L'ERREUR TELLE QUELLE, ET ON REDEMANDE TOUT.
    //
    // Pas de correctif partiel : le modèle réécrit les fichiers concernés
    // avec le reste. Un patch partiel exigerait un format de patch, donc une
    // grammaire — exactement ce qu'on vient de quitter.
    messages.push({ role: 'assistant', content: texte })
    messages.push({ role: 'user', content: `${motif}\n\nCorrige et rends TOUS les fichiers.` })
  }

  return {
    ok: false,
    motif: `Non convergé en ${String(toursMax)} tours.`,
    tours,
    dernierTexte,
  }
}

/**
 * LA PAGE — autonome, comme celle de l'aperçu.
 *
 * Elle ne demande rien à personne : ni police distante, ni script externe.
 * C'est ce qui lui permet d'être servie dans un cadre isolé, et d'être
 * publiée par le lien de partage sans toucher l'origine de Deribfy.
 */
export function pageAutonome(code: string, titre: string): string {
  const sur = titre.replace(/[<>&"]/gu, '')
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${sur}</title>`,
    '<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>',
    '</head><body><div id="racine"></div>',
    `<script type="module">${code}</script>`,
    '</body></html>',
  ].join('')
}
