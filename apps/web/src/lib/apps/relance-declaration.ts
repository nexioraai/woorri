/**
 * UNE DÉCLARATION REFUSÉE SE RENVOIE AU MODÈLE, AVEC L'ERREUR EXACTE (2026-11-28).
 *
 * ── LE DÉFAUT MESURÉ : la retouche de 18:06 sur « Suivi de colis » (0178c047).
 *
 * La demande : un numéro de suivi par colis, retrouvable sur la page publique.
 * Le modèle a écrit le code ET déclaré la lecture par clé dans DONNEES.json.
 * La déclaration a été jetée (prose après le JSON), personne ne l'a dit au
 * modèle, et l'écran a affiché « Modifié » — alors que la demande principale
 * avait échoué : la page appelait une fonction qui n'existait pas.
 *
 * ── LA RÈGLE.
 *
 * ① Le lecteur est tolérant (`extraireJson`) : il ne rejette que s'il ne
 *   trouve aucun JSON valide.
 * ② Si le JSON reste illisible, ou si le contrat le refuse, l'erreur EXACTE
 *   repart au modèle — jusqu'à `ESSAIS_DECLARATION_MAX` nouveaux essais.
 *   Seule la section `DONNEES.json` de sa réponse est prise : le code qu'il
 *   a déjà écrit a été jugé sur la déclaration qu'il visait.
 * ③ Après le dernier essai : échec. Rien n'est écrit, rien n'est décompté
 *   (l'issue n'est ni « livrée » ni « en attente », la réservation est
 *   libérée), l'appli reste à sa version d'avant.
 *
 * L'appel au modèle est INJECTÉ : la règle se teste sans réseau et sans un
 * centime, comme la boucle de génération.
 */
import { lireFichiers } from './ecriture-directe'
import { FICHIER_DECLARATION, type DeclarationEnRoute } from './declaration-en-route'

/** Nouveaux essais après le premier refus — la demande du propriétaire, 2026-11-28. */
export const ESSAIS_DECLARATION_MAX = 2

/** Ce que voit la personne quand la déclaration reste refusée. Jamais « Modifié ». */
export const PHRASE_ECHEC_DECLARATION =
  'Échec : rien n’a été modifié. La description des données de cette modification est restée ' +
  'refusée après plusieurs essais. Votre application est restée à sa version précédente.'

/** Le message qui repart au modèle : l'erreur exacte, et ce qu'on attend. */
export function messageRelance(probleme: string): string {
  return (
    'TA DÉCLARATION DONNEES.json A ÉTÉ REFUSÉE — rien n’a encore été appliqué :\n' +
    `${probleme}\n\n` +
    'Corrige-la. Rends UNIQUEMENT la section `=== DONNEES.json ===` : un tableau JSON seul, ' +
    'sans texte ni explication avant ou après, dans la grammaire de la consigne. ' +
    'Ne réécris aucun autre fichier : seule cette section sera lue.'
  )
}

/** La section DONNEES.json d'une réponse ; à défaut, la réponse entière (un JSON nu). */
export function declarationDuTexte(texte: string): string {
  return lireFichiers(texte).find((f) => f.chemin === FICHIER_DECLARATION)?.contenu ?? texte
}

export type Correction =
  | { readonly ok: true; readonly fichiers: ReadonlyMap<string, string>; readonly declaration: DeclarationEnRoute; readonly relances: number }
  | { readonly ok: false; readonly probleme: string; readonly relances: number }

/**
 * Lit la déclaration ; tant qu'elle pose un problème, la renvoie au modèle.
 *
 * `relancer` rend le texte du modèle, ou `null` s'il n'a pas pu répondre
 * (réseau, réponse coupée, temps) — un essai perdu, pas une exception.
 */
export async function corrigerDeclaration(o: {
  readonly fichiers: ReadonlyMap<string, string>
  readonly lire: (f: ReadonlyMap<string, string>) => DeclarationEnRoute
  readonly probleme: (d: DeclarationEnRoute) => string | null
  readonly relancer: (consigne: string) => Promise<string | null>
  readonly essaisMax?: number
}): Promise<Correction> {
  const max = o.essaisMax ?? ESSAIS_DECLARATION_MAX
  let fichiers = o.fichiers
  let declaration = o.lire(fichiers)
  let probleme = o.probleme(declaration)
  let relances = 0
  while (probleme !== null && relances < max) {
    relances += 1
    const texte = await o.relancer(messageRelance(probleme))
    if (texte === null) continue
    fichiers = new Map([...fichiers, [FICHIER_DECLARATION, declarationDuTexte(texte)]])
    declaration = o.lire(fichiers)
    probleme = o.probleme(declaration)
  }
  if (probleme !== null) return { ok: false, probleme, relances }
  return { ok: true, fichiers, declaration, relances }
}
