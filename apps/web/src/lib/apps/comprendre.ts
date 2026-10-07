/**
 * COMPRENDRE UNE DEMANDE — LA PREMIERE PASSE, CELLE QUI LIT.
 *
 * ── CE QU'ELLE FAIT.
 *
 * Elle transforme « je veux une application de tontine pour mon quartier » en
 * FAITS du metier : les acteurs, les concepts et leurs attributs, les
 * relations, les parcours, les etats. Pas une application — les faits dont une
 * application se deduit.
 *
 * ── POURQUOI ELLE EXISTE A COTE DE `emission.ts`.
 *
 * `emission.ts` lit la phrase avec des expressions regulieres. Elle en tire un
 * nom et un ordre de grandeur, et elle DIT qu'elle ne devine rien d'autre.
 * C'est honnete et c'est pauvre.
 *
 * Ici, c'est un modele qui lit. Il comprend « tontine » : des membres, des
 * cotisations, un ordre de passage. La difference n'est pas de degre.
 *
 * ── CE QUE J'AI REFUSE DE FAIRE, ET IL FAUT LE DIRE.
 *
 * Le depot possede une chaine complete — P0 PUIS cinq appels structures qui
 * produisent l'AIR. Les cinq sont enfermes dans `emit-v3.mjs`, un script qui
 * s'EXECUTE au chargement : 624 lignes a extraire, dans l'artefact qui a
 * produit le corpus de reference, ET SANS MOYEN DE VERIFIER l'extraction sans
 * lancer des appels payants.
 *
 * P0, lui, est DEJA un module pur, exporte et SCELLE par une empreinte. On
 * prend donc ce qui est deja sorti, et l'extraction des cinq parties reste une
 * decision separee, avec sa taille annoncee.
 *
 * ── LA DEPENSE NE SE PRESUME PAS (EP-018).
 *
 * Un appel payant exige un jeton explicite dans l'environnement. C'est la
 * regle du depot — `dry-run-p0.mjs` refuse de partir sans
 * `GO_DRY_RUN_P0="OUI-15-CENTIMES"` — et elle vaut ici aussi. Sans le jeton,
 * cette fonction REFUSE ; elle ne se degrade pas en silence vers autre chose.
 */
import { documentDepuisModele, type Derivation, type TableGestes } from './derivation'

/** Les faits que P0 tire d'une demande. Forme du contrat `modele-metier`. */
export type ModeleMetier = {
  readonly acteurs?: { id?: string; nom?: string }[]
  readonly concepts?: { id?: string; nom?: string; attributs?: { nom?: string; nature?: string }[] }[]
  readonly parcours?: { acteur?: string; besoin?: string; etapes?: unknown[] }[]
}

export type Comprehension =
  | { ok: true; modele: ModeleMetier; coutUsd: number; jetons: { entree: number; sortie: number } }
  | { ok: false; raison: string; refusDeDepense?: boolean }

/** Le jeton budgetaire. Son absence n'est pas une panne : c'est un refus. */
export const JETON_DEPENSE = 'GO_EMISSION_IA'

export function depenseAutorisee(): boolean {
  return (process.env[JETON_DEPENSE] ?? '') !== ''
}

/**
 * Appelle P0 sur une demande en texte libre.
 *
 * Les modules de `benchmarks/air-emission/` sont charges PARESSEUSEMENT, et
 * seulement apres la garde : ils construisent un client au chargement, et un
 * import de haut niveau ferait entrer cette construction dans chaque route du
 * site — y compris celles qui n'emettront jamais rien.
 */
export async function comprendre(demande: string): Promise<Comprehension> {
  if (!depenseAutorisee()) {
    return {
      ok: false,
      refusDeDepense: true,
      raison:
        `Lecture par IA non autorisee : la variable ${JETON_DEPENSE} est absente. ` +
        'Une depense ne se presume pas.',
    }
  }
  const propre = demande.trim()
  if (propre === '') return { ok: false, raison: 'Demande vide.' }

  try {
    const { racineDepot } = await import('./racine')
    const base = racineDepot()
    const passe0 = (await import(/* webpackIgnore: true */ `${base}/benchmarks/air-emission/passe0.mjs`)) as {
      construireRequeteP0: (brief: string) => { system: string; user: string; grammaire: unknown }
      jugerSortieP0: (texte: string, brief: string, meta: unknown) => { ok: boolean; diagnostics?: { message?: string }[] }
    }
    const adaptateur = (await import(
      /* webpackIgnore: true */ `${base}/benchmarks/air-emission/adaptateur-anthropic.mjs`
    )) as {
      construireAppel: (r: unknown, g: unknown) => unknown
      lireReponse: (r: unknown) => { texte: string; meta: unknown }
      lireUsage: (u: unknown) => unknown
      coutUsd: (u: unknown) => number
      creerClient: (lire: unknown, o?: unknown) => Promise<{ messages: { create: (a: unknown) => Promise<unknown> } }>
    }

    const requete = passe0.construireRequeteP0(propre)
    // ── LA CLÉ VIENT DE L'ENVIRONNEMENT, PAS D'UN FICHIER.
    //
    // L'adaptateur a été écrit pour une campagne lancée à la main : il lit
    // `apps/web/.env.local`. Ce fichier n'est PAS déployé — il est ignoré par
    // git, et c'est très bien ainsi. Sur le serveur, la clé vit dans
    // `process.env`.
    //
    // On ne modifie pas l'adaptateur pour autant : il prend un LECTEUR en
    // argument, et c'est précisément là pour ça. On lui en fournit un qui rend
    // le contenu qu'il attend, construit depuis l'environnement.
    const cle = process.env.ANTHROPIC_API_KEY ?? ''
    if (cle === '') return { ok: false, raison: 'Clé Anthropic absente du serveur.' }
    const client = await adaptateur.creerClient(() => `ANTHROPIC_API_KEY=${cle}`)
    const appel = adaptateur.construireAppel(requete, { max_tokens: 9000 })
    const reponse = (await client.messages.create(appel)) as { usage?: unknown }
    const { texte, meta } = adaptateur.lireReponse(reponse)

    const verdict = passe0.jugerSortieP0(texte, propre, meta)
    if (!verdict.ok) {
      return {
        ok: false,
        raison: (verdict.diagnostics ?? []).map((d) => d.message ?? '').join(' · ') || 'Lecture refusee.',
      }
    }
    const usage = adaptateur.lireUsage(reponse.usage) as { entree?: number; sortie?: number }
    return {
      ok: true,
      modele: JSON.parse(texte) as ModeleMetier,
      coutUsd: adaptateur.coutUsd(usage),
      jetons: { entree: usage.entree ?? 0, sortie: usage.sortie ?? 0 },
    }
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : 'Lecture impossible.' }
  }
}

/** Ce qu'on montre a l'utilisateur : des phrases, pas un objet JSON. */
export function direCeQuOnACompris(m: ModeleMetier): string[] {
  const lignes: string[] = []
  const acteurs = (m.acteurs ?? []).map((a) => a.nom ?? a.id).filter(Boolean)
  const concepts = (m.concepts ?? []).map((c) => c.nom ?? c.id).filter(Boolean)
  if (acteurs.length > 0) lignes.push(`Les personnes : ${acteurs.join(', ')}`)
  if (concepts.length > 0) lignes.push(`Ce que l'application manipule : ${concepts.join(', ')}`)
  for (const p of (m.parcours ?? []).slice(0, 4)) {
    if (p.besoin !== undefined) lignes.push(`${p.acteur ?? 'Quelqu un'} veut : ${p.besoin}`)
  }
  return lignes
}

/**
 * LE MODÈLE DEVIENT UNE APPLICATION — sans un appel de plus.
 *
 * P0 a déjà payé pour comprendre. Ce qu'il a compris commande maintenant la
 * construction : les concepts donnent les entités, les besoins donnent les
 * écrans, et les gestes donnent les blocs — `TABLE_GESTES` le dit depuis
 * longtemps, il suffisait de la lire.
 *
 * La table est CHARGÉE, jamais recopiée. Le dépôt a vu quatre fois « une liste
 * écrite deux fois diverge » ; une cinquième copie ne ferait pas exception.
 */
export async function construireDepuisModele(
  modele: ModeleMetier,
  identite: { nom: string; description: string | null },
): Promise<Derivation | null> {
  try {
    const { racineDepot } = await import('./racine')
    const mm = (await import(
      /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/modele-metier.mjs`
    )) as { TABLE_GESTES: TableGestes }
    return documentDepuisModele(modele as never, mm.TABLE_GESTES, identite)
  } catch {
    // La table absente ne doit pas faire perdre la compréhension : l'appelant
    // retombe sur la lecture simple, et le DIT.
    return null
  }
}
