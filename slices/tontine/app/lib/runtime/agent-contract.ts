// RUNTIME COPIÉ — LE CONTRAT DU PORT DE L'AGENT, TYPES PURS (2026-10-13).
//
// Separe de `agent-http.ts` pour la meme raison que le contrat de session
// l'est de ses implementations : l'ecran a besoin des TYPES, pas du
// transport. Un ecran qui importerait le transport traînerait `fetch`
// derriere lui, et le cliquet zero-reseau le verrait — a juste titre.
export interface AgentOperation {
  /** L'identifiant declare au document. */
  readonly id: string;
  /** Le NOM que le document lui donne. Jamais fabrique par le moteur. */
  readonly nom: string;
  /** Les champs que l'operation attend. */
  readonly attend: readonly string[];
}

export interface AgentCatalogue {
  readonly operations: readonly AgentOperation[];
  readonly confirmationRequise: boolean;
  readonly voix: boolean;
}

export interface AgentProposition {
  readonly operation: string;
  readonly nom: string;
  readonly entrees: Record<string, unknown>;
  /**
   * L'INTENTION SIGNEE, quand le document demande un accord avant d'agir.
   *
   * Absente si le document ne demande rien. Elle est produite par le serveur
   * et liee a l'appelant, aux valeurs et a une echeance : l'ecran ne la
   * fabrique pas et ne peut pas la modifier.
   */
  readonly intention?: string;
}

/**
 * CE QUE LE PORT REND — UN SUCCES, OU UN CODE.
 *
 * F3 : jamais de phrase. Le code est celui que le serveur a nomme ; c'est le
 * document qui porte les mots de la personne.
 */
export type ReponseAgent<T> =
  | { readonly ok: true; readonly valeur: T }
  | { readonly ok: false; readonly code: string };

export interface PortAgent {
  /** Ce que l'agent peut faire, selon le serveur — jamais selon l'ecran. */
  catalogue(): Promise<ReponseAgent<AgentCatalogue>>;
  /** Des mots, une PROPOSITION. Jamais un acte. */
  parler(mots: string): Promise<ReponseAgent<AgentProposition>>;
  /** L'acte, avec l'intention quand le document l'exige. */
  agir(
    operation: string,
    entrees: Record<string, unknown>,
    intention?: string,
  ): Promise<ReponseAgent<Record<string, unknown>>>;
}
