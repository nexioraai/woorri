/**
 * LA CONSIGNE D'UN ÉCRAN — courte, et bornée dès le premier jour (3c, brique 4).
 *
 * ── MESURÉ (M16, 2026-11-13) : cette consigne (2 806 signes) + la fiche d'un
 * écran (1 259 signes) font écrire à `deepseek-v4-pro`, réflexion coupée, un
 * fichier de 8 622 signes en 18 s pour 0,0053 $. La consigne de génération
 * entière faisait 8 927 signes et le modèle réécrivait 38 à 57 % de code déjà
 * accepté (M14). Ici le modèle n'écrit qu'UN fichier : l'écran.
 *
 * ── DEUX TEXTES : le CONTRAT (system), le même pour tous les écrans, et la
 * FICHE (user), propre à l'écran : rôle, tables avec leurs colonnes, parcours,
 * écrans voisins, extrait du cahier. Les réglages exacts des pièces sont LUS
 * dans la bibliothèque (reglagesEnumeres), jamais recopiés.
 */
import { CONSIGNE_BIBLIOTHEQUE, vocabulaireEnumere, vocabulaireVariables } from './bibliotheque-ui'
import type { EntiteDeclaree } from './entites-declarees'
import { nomColonne, nomTable } from './entites-declarees'
import { ROLE_VISITEUR, type Plan, type PlanEcran } from './plan-ecrans'

/** Le bloc « RÉGLAGES EXACTS … » de la bibliothèque, tel qu'il est enseigné à la génération entière. */
export function reglagesDesPieces(): string {
  const m = /RÉGLAGES EXACTS[\s\S]*?(?=\n {3}· \.\/systeme\/donnees)/u.exec(CONSIGNE_BIBLIOTHEQUE)
  return m === null ? '' : m[0].replace(/^ {5}/gmu, '  ')
}

export const CONTRAT_ECRAN = `Tu écris UN SEUL écran d'une application web React + TypeScript déjà construite par Deribfy.
RENDS UNIQUEMENT ce fichier, dans ce format exact, sans rien avant ni après :
=== ecrans/<slug>.tsx ===
<le code>

CONTRAT — chaque règle vient d'un défaut réel :
1. \`export default function Ecran({ session }: { session: Session })\`. Rien d'autre n'est exporté ; aucun autre fichier.
2. LES DONNÉES passent par \`import { useTable } from '../systeme/base'\` :
   \`const r = useTable<Reservation>('reservation')\` rend { lignes, chargement, erreur, ajouter(valeurs), modifier(id, valeurs), supprimer(id) }.
   Les types viennent de \`../systeme/types\` (un type par table, Session). Tu n'écris JAMAIS createClient, fetch, localStorage, window ni de routeur.
3. LE PARCOURS : ce qu'un écran choisit voyage jusqu'au suivant avec \`import { useParcours } from '../systeme/etat'\` :
   \`const [enCours, poser] = useParcours<Reservation>('reservation')\` ; puis \`import { naviguer } from '../systeme/navigation'\` et \`naviguer('récapitulatif/paiement')\` (le nom de l'écran, tel que la fiche l'écrit).
4. L'INTERFACE vient de \`../systeme/ui\` (réglages exacts ci-dessous — un nom inventé est refusé) et de \`../systeme/argent\` (formaterMontant : tout montant passe par lui, jamais un symbole de monnaie écrit).
5. TROIS ÉTATS EXPLICITES, toujours : chargement, vide (EtatVide, message utile), erreur (le message, et quoi faire). Un chargement qui échoue ne ressemble jamais à une liste vide.
6. Couleurs, rayons et tailles sont des variables CSS déjà déclarées : style={{ color: 'var(--muted-foreground)' }}. AUCUN className : il n'y a pas de feuille de style.
7. Français correct ; chaque bouton porte un texte visible ; un champ porte son libellé. Pas de chiffre en dur : tout sort des lignes lues.
8. Tu couvres ce que le cahier dit de CET écran, entièrement, et rien de décoratif. Si l'écran écrit une table, il offre ajouter ET modifier ET retirer.
9. Un écran de gestion vit déjà dans la coque de Deribfy : tu n'écris ni menu, ni barre, ni en-tête d'application — seulement le contenu.`

/** Les noms de types tels que `systeme/types.ts` les exporte. */
export function nomDuType(e: EntiteDeclaree): string {
  const base = nomTable(e).split(/[^a-zA-Z0-9]+/u).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join('')
  return /^[A-Za-z]/u.test(base) ? base : `T${base}`
}

const colonnes = (e: EntiteDeclaree) => e.fields.map((f) => `${nomColonne(f)} (${f.type}${f.required ? '' : ', facultatif'})`).join(', ')

/**
 * LES CONTRAINTES FERMÉES, lues dans le cahier (3c-2, correction 3) : langues,
 * devises, moyens de paiement, pays. Tout écran les reçoit ; un juge statique
 * refuse une valeur hors lecture (cas réel : « Kiswahili » dans 94cf0489, que
 * le cahier Hayine ne nomme nulle part).
 */
export type ContraintesFermees = {
  readonly langues: readonly string[]
  readonly devises: readonly string[]
  readonly moyensPaiement: readonly string[]
  readonly pays: readonly string[]
}

/** LA FICHE de l'écran : ce qui ne vaut que pour lui. */
export function ficheEcran(ecran: PlanEcran, plan: Plan, entites: readonly EntiteDeclaree[], devise: string | undefined, contraintes?: ContraintesFermees): string {
  const parNom = new Map(entites.map((e) => [nomTable(e), e]))
  const tables = [...new Set([...ecran.tables.lit, ...ecran.tables.ecrit])]
  const lignesTables = tables.map((t) => {
    const e = parNom.get(t)
    const usage = ecran.tables.ecrit.includes(t) ? 'lit et ÉCRIT' : 'lit'
    return e === undefined ? `- ${t} (${usage})` : `- ${t} (${usage}) · type ${nomDuType(e)} · colonnes : ${colonnes(e)}`
  })
  const voisins = plan.ecrans.filter((e) => e.slug !== ecran.slug && (e.role === ecran.role || e.role === ROLE_VISITEUR)).map((e) => `'${e.nom}'`)
  const parcours = tables.map((t) => `'${t}' → useParcours<${parNom.get(t) === undefined ? 'unknown' : nomDuType(parNom.get(t)!)}>('${t}')`)
  return [
    `ÉCRAN : ${ecran.nom} · FICHIER : ecrans/${ecran.slug}.tsx`,
    `RÔLE : ${ecran.role === ROLE_VISITEUR ? 'visiteur (sans compte)' : ecran.role} · NAVIGATION : ${ecran.navigation}${ecran.navigation === 'gestion' ? ' (dans la coque de gestion)' : ''}`,
    `DEVISE : ${devise ?? 'celle de la configuration'} — toujours via formaterMontant.`,
    tables.length === 0 ? 'TABLES : aucune — cet écran ne lit ni n’écrit de table.' : `TABLES :\n${lignesTables.join('\n')}`,
    parcours.length === 0 ? '' : `PARCOURS DISPONIBLES : ${parcours.join(' ; ')}`,
    voisins.length === 0 ? '' : `ÉCRANS VOISINS (naviguer) : ${voisins.join(', ')}`,
    contraintes === undefined ? '' : [
      'CONTRAINTES FERMÉES (lues dans le cahier — AUCUNE autre valeur, jamais) :',
      `  langues : ${contraintes.langues.join(', ') || 'non précisées — n’en propose aucune'}${contraintes.langues.length > 1 ? " · la langue se lit et se choisit par useLangue / choisirLangue de '../systeme/langue'" : ''}`,
      `  devises : ${contraintes.devises.join(', ') || (devise ?? 'non précisée')}`,
      `  moyens de paiement : ${contraintes.moyensPaiement.join(', ') || 'non précisés — n’en nomme aucun'}`,
      `  pays : ${contraintes.pays.join(', ') || 'non précisés — n’en nomme aucun'}`,
    ].join('\n'),
    ecran.extrait === '' ? 'CE QUE LE CAHIER DIT DE CET ÉCRAN : rien de précis — fais le strict nécessaire pour son nom et ses tables.' : `CE QUE LE CAHIER DIT DE CET ÉCRAN :\n« ${ecran.extrait} »`,
  ].filter((l) => l !== '').join('\n')
}

/**
 * LE VOCABULAIRE EXACT — jetons, icônes, variables CSS — GÉNÉRÉ depuis la
 * bibliothèque, jamais écrit à la main (3c-2, correction 1).
 *
 * MESURÉ sur 94cf0489 : 88 % des écrans repris, et les refus étaient des noms
 * inventés que la consigne d'écran n'enseignait pas — var(--espace-4) ×4,
 * var(--rayon), var(--bordure), var(--primaire), Icone nom="chargement" ×4,
 * nom="info", nom="search"… La consigne de l'application entière les
 * énumérait ; celle de l'écran les avait perdus.
 */
export function vocabulaireDesPieces(): string {
  return [
    'NOMS EXACTS — aucun autre n’existe, un nom inventé est REFUSÉ :',
    '  JETONS (import depuis ../systeme/jetons) et ICÔNES (<Icone nom=…>) :',
    vocabulaireEnumere().replace(/^ {5}/gmu, '    '),
    "  VARIABLES CSS (style={{ … 'var(--nom)' … }}) :",
    vocabulaireVariables().replace(/^ {5}/gmu, '    '),
  ].join('\n')
}

/** La consigne complète d'un écran : le contrat + les pièces + le vocabulaire (system), la fiche (user). */
export function consigneEcran(ecran: PlanEcran, plan: Plan, entites: readonly EntiteDeclaree[], devise: string | undefined, contraintes?: ContraintesFermees): { readonly system: string; readonly user: string } {
  return { system: `${CONTRAT_ECRAN}\n${reglagesDesPieces()}\n${vocabulaireDesPieces()}`, user: ficheEcran(ecran, plan, entites, devise, contraintes) }
}
