/**
 * LA BOUCLE D'UN ÉCRAN — un appel, des juges, au plus une reprise (3c, brique 5).
 *
 * ── CE QUI REMPLACE LA RÈGLE DU DERNIER TOUR.
 *
 * L'ancienne boucle réécrivait l'application entière trois fois et livrait
 * le troisième tour quoi qu'il reste (M14 : 38 à 57 % de la durée en
 * réécriture de code accepté ; `9cc16d10` : 7 tables ni lues ni écrites,
 * livrées). Ici un écran est écrit SEUL, jugé SEUL, repris UNE fois avec ses
 * reproches, et s'il échoue encore il sort « À COMPLÉTER » — visible, nommé,
 * compté dans la ligne. Rien n'est livré cassé en silence.
 *
 * ── LES JUGES, DANS L'ORDRE DU MOINS CHER AU PLUS CHER :
 *   · la forme : UN fichier `ecrans/<slug>.tsx`, `export default function Ecran`,
 *     rien d'autre d'exporté, pas de réponse coupée ;
 *   · les imports : des paquets servis seulement, et en relatif UNIQUEMENT
 *     `../systeme/*` (le modèle n'écrit qu'un fichier) ;
 *   · l'interdit : createClient, fetch, localStorage, window, location — la
 *     base, la session et la navigation sont à Deribfy ;
 *   · les jetons et le contrat des pièces (juge-jetons, juge-contrat), la devise ;
 *   · LE MONTAGE DE L'ÉCRAN SEUL : squelette avec la session déjà posée sur son
 *     rôle, les autres écrans « à compléter », assemblage réel, juge d'exécution
 *     à son adresse — un écran qui ne se monte pas, ou dont un contrôle est
 *     muet, est repris.
 */
import { assembler } from './bac-a-sable'
import { fichiersSysteme } from './bibliotheque-ui'
import { consigneEcran } from './consigne-ecran'
import { importsDe, importsInterdits, lireFichiers, PAQUETS_PROPOSES } from './ecriture-directe'
import type { EntiteDeclaree } from './entites-declarees'
import { jugerContrat, reprocheContrat } from './juge-contrat'
import { jugerDevise, marqueRecommandee } from './juge-devise'
import { jugerExecution } from './juge-execution'
import { jugerJetons } from './juge-jetons'
import { ROLE_VISITEUR, type Plan, type PlanEcran } from './plan-ecrans'
import { fichiersSquelette } from './squelette'

export const TENTATIVES_ECRAN = 2
/** Plafond de sortie d'un écran : M16 mesure 2 300 jetons pour un écran complet ; 12 000 laisse cinq fois la place. */
export const MAX_JETONS_ECRAN = 12_000

export type JetonsEcran = { readonly entree: number; readonly sortie: number; readonly reflexion: number }
export type AppelEcran = (
  system: string,
  messages: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[],
) => Promise<{ readonly texte: string; readonly tronquee: boolean; readonly usage: JetonsEcran }>

export type TentativeEcran = { readonly rang: number; readonly ms: number; readonly reproches: readonly string[]; readonly tronquee: boolean }
export type EcranEcrit = {
  readonly nom: string
  readonly slug: string
  readonly resultat: 'ok' | 'a_completer'
  /** Le contenu de `ecrans/<slug>.tsx` quand l'écran est accepté. */
  readonly fichier: string | null
  readonly tentatives: readonly TentativeEcran[]
  readonly ms: number
  readonly jetons: JetonsEcran
  /** Les reproches de la DERNIÈRE tentative — ce qui a empêché l'écran. */
  readonly reproches: readonly string[]
  /** Le brut du dernier essai quand l'écran a échoué : sans lui, impossible de dire si le modèle écrit mal ou si le lecteur lit mal. */
  readonly dernierTexte: string | null
}

const INTERDITS: readonly { readonly motif: RegExp; readonly quoi: string }[] = [
  { motif: /\bcreateClient\s*\(/u, quoi: 'createClient — la base est à Deribfy (useTable)' },
  { motif: /\bfetch\s*\(/u, quoi: 'fetch — les données passent par useTable' },
  { motif: /\b(?:localStorage|sessionStorage)\b/u, quoi: 'localStorage — l’état passe par useEtat / useParcours' },
  { motif: /\bwindow\.(?:location|DERIBFY_BASE)\b|\blocation\.hash\s*=/u, quoi: 'window et location — la navigation passe par naviguer()' },
  { motif: /\bclassName\s*=/u, quoi: 'className — il n’y a pas de feuille de style : style={{ }}' },
]
const SYSTEME_PERMIS = /^\.\.\/systeme\/(?:ui|argent|base|etat|navigation|types|jetons|donnees)$/u

/** Les reproches de FORME et d'IMPORTS d'un fichier d'écran — purs, sans montage. */
export function reprochesStatiques(
  slug: string,
  contenu: string,
  systeme: ReadonlyMap<string, string>,
  devise: string | undefined,
): string[] {
  const reproches: string[] = []
  const chemin = `ecrans/${slug}.tsx`
  if (!/export\s+default\s+function\s+Ecran\b/u.test(contenu)) {
    reproches.push(`LA FORME : le fichier doit déclarer \`export default function Ecran({ session }: { session: Session })\` — c'est ce que l'application importe.`)
  }
  const autresExports = contenu.split('\n').filter((l) => /^\s*export\b/u.test(l) && !/^\s*export\s+default\b/u.test(l))
  if (autresExports.length > 0) reproches.push(`LA FORME : rien d'autre n'est exporté (${autresExports.map((l) => l.trim().slice(0, 50)).join(' ; ')}).`)
  const paquets = importsInterdits([{ chemin, contenu }])
  if (paquets.length > 0) reproches.push(`PAQUETS INTERDITS : ${paquets.join(', ')}. Tu ne peux importer que : ${PAQUETS_PROPOSES.join(', ')}, et ../systeme/*.`)
  const relatifsRefuses = importsDe(contenu).filter((i) => (i.startsWith('.') || i.startsWith('/')) && !SYSTEME_PERMIS.test(i))
  if (relatifsRefuses.length > 0) reproches.push(`IMPORTS RELATIFS REFUSÉS : ${relatifsRefuses.join(', ')} — un seul fichier ; en relatif tu n'importes que ../systeme/ui, argent, base, etat, navigation, types, donnees.`)
  const interdits = INTERDITS.filter((i) => i.motif.test(contenu)).map((i) => `- ${i.quoi}`)
  if (interdits.length > 0) reproches.push(`INTERDIT DANS UN ÉCRAN :\n${interdits.join('\n')}`)
  const carte = new Map([[chemin, contenu]])
  const jetons = jugerJetons(carte, systeme).filter((d) => !d.reference.startsWith('className'))
  if (jetons.length > 0) {
    reproches.push(
      'DES JETONS QUI N’EXISTENT PAS — l’écran MOURRAIT au démarrage :\n' +
        jetons.slice(0, 15).map((d) => `- ${d.reference} — ce qui existe : ${d.connus.slice(0, 40).join(', ')}`).join('\n') +
        '\nEmploie EXACTEMENT les noms fournis, aucun autre.',
    )
  }
  const contrat = reprocheContrat(jugerContrat(carte, systeme))
  if (contrat !== null) reproches.push(contrat)
  if (devise !== undefined) {
    const devises = jugerDevise(carte, devise)
    if (devises.length > 0) {
      reproches.push(
        `UNE AUTRE MONNAIE QUE ${devise} : ${devises.map((d) => `« ${d.marque} » ×${String(d.occurrences)}`).join(', ')}. ` +
          `Tout montant passe par formaterMontant (elle écrit ${marqueRecommandee(devise)}) ; tu n'écris aucun symbole ni code de monnaie.`,
      )
    }
  }
  return reproches
}

/** Le reproche du montage — null quand l'écran se monte sans erreur ni contrôle muet. */
export function reprocheDeMontage(v: Awaited<ReturnType<typeof jugerExecution>>, nom: string): string | null {
  if (v.indisponible !== undefined) return null
  const reproches: string[] = []
  if (!v.monteDansSimulateur || v.erreurs.length > 0) {
    reproches.push(
      `L'ÉCRAN « ${nom} » NE SE MONTE PAS — dans un navigateur SIMULÉ, il échoue :\n` +
        (v.erreurs.length === 0 ? '- rien n’est rendu' : v.erreurs.slice(0, 8).map((e) => `- ${e.quoi} : ${e.message}${e.indice === '' ? '' : ` (${e.indice})`}`).join('\n')) +
        '\nCorrige la cause : un écran livré s’ouvre et affiche son contenu.',
    )
  }
  const muets = v.controlesMuets ?? []
  if (muets.length > 0) {
    reproches.push(
      'DES CONTRÔLES SANS NOM LISIBLE — rendus et pourtant inutilisables :\n' +
        muets.slice(0, 8).map((m) => `- <${m.balise}> : ${m.extrait}`).join('\n') +
        '\nDonne un texte visible à chacun (ou un aria-label s’il ne porte qu’une icône).',
    )
  }
  return reproches.length === 0 ? null : reproches.join('\n\n')
}

export async function ecrireEcran(o: {
  readonly ecran: PlanEcran
  readonly plan: Plan
  readonly entites: readonly EntiteDeclaree[]
  readonly devise: string | undefined
  readonly nom: string
  readonly roles: readonly string[]
  readonly style?: string | null
  readonly appeler: AppelEcran
  /** Remplaçable pour les tests ; par défaut le juge d'exécution réel. */
  readonly juger?: typeof jugerExecution
  readonly tentativesMax?: number
}): Promise<EcranEcrit> {
  const debutTotal = Date.now()
  const { ecran } = o
  const chemin = `ecrans/${ecran.slug}.tsx`
  const { system, user } = consigneEcran(ecran, o.plan, o.entites, o.devise)
  const bibliotheque = fichiersSysteme(o.devise)
  const squelette = fichiersSquelette({ plan: o.plan, entites: o.entites, nom: o.nom, roles: o.roles, style: o.style, sessionInitiale: { role: ecran.role === ROLE_VISITEUR ? ROLE_VISITEUR : ecran.role } })
  const systeme = new Map<string, string>([...bibliotheque, ...[...squelette].filter(([c]) => c.startsWith('systeme/'))])
  const juger = o.juger ?? jugerExecution
  const max = o.tentativesMax ?? TENTATIVES_ECRAN

  const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: user }]
  const tentatives: TentativeEcran[] = []
  const jetons = { entree: 0, sortie: 0, reflexion: 0 }
  let dernieres: string[] = []
  let dernierTexte = ''

  for (let rang = 1; rang <= max; rang += 1) {
    const debut = Date.now()
    const r = await o.appeler(system, messages)
    jetons.entree += r.usage.entree
    jetons.sortie += r.usage.sortie
    jetons.reflexion += r.usage.reflexion
    const reproches: string[] = []
    const lus = lireFichiers(r.texte)
    const fichier = lus.find((f) => f.chemin === chemin) ?? lus.find((f) => /\.tsx$/u.test(f.chemin))
    if (r.tronquee) reproches.push('Ta réponse a été coupée avant la fin : rends le fichier plus compact, sans commentaires ni variantes décoratives, toutes les fonctions demandées restant.')
    if (fichier === undefined) {
      reproches.push(`Aucun fichier reçu. Rends UNIQUEMENT \`=== ${chemin} ===\` suivi du code.`)
    } else {
      if (fichier.chemin !== chemin) reproches.push(`LE FICHIER S'APPELLE \`${chemin}\`, pas \`${fichier.chemin}\`.`)
      reproches.push(...reprochesStatiques(ecran.slug, fichier.contenu, systeme, o.devise))
      if (reproches.length === 0) {
        const carte = new Map<string, string>([...squelette, ...bibliotheque])
        carte.set(chemin, fichier.contenu)
        const v = await assembler(carte)
        if (!v.ok) reproches.push(`La construction a échoué :\n${v.erreur}`)
        else {
          const verdict = await juger(v.code, { adresse: `#${ecran.slug}` })
          const quoi = reprocheDeMontage(verdict, ecran.nom)
          if (quoi !== null) reproches.push(quoi)
        }
      }
    }
    tentatives.push({ rang, ms: Date.now() - debut, reproches, tronquee: r.tronquee })
    dernieres = reproches
    dernierTexte = r.texte
    if (reproches.length === 0 && fichier !== undefined) {
      return { nom: ecran.nom, slug: ecran.slug, resultat: 'ok', fichier: fichier.contenu, tentatives, ms: Date.now() - debutTotal, jetons, reproches: [], dernierTexte: null }
    }
    if (rang < max) {
      messages.push({ role: 'assistant', content: r.texte })
      messages.push({ role: 'user', content: `${reproches.join('\n\n')}\n\nRécris \`${chemin}\` EN ENTIER, corrigé — et rien d'autre.` })
    }
  }
  return { nom: ecran.nom, slug: ecran.slug, resultat: 'a_completer', fichier: null, tentatives, ms: Date.now() - debutTotal, jetons, reproches: dernieres, dernierTexte: dernierTexte.slice(0, 20_000) }
}
