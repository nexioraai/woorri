// RUNTIME COPIÉ — LA RACINE DE L'AGENT (2026-10-13).
//
// Même motif que `navigation-contrat.tsx` : un contexte, et un défaut INERTE.
//
// ── POURQUOI INERTE ET NON UNE ERREUR.
//
// Une application montée sans racine d'agent ne doit pas TOMBER : elle doit
// simplement ne pas avoir d'agent. Lever ici ferait échouer les harnais de
// rendu qui montent un écran isolé — et ces harnais sont précisément ce qui
// prouve que les écrans se montent. Un agent absent rend donc un refus NOMMÉ,
// jamais une exception.
//
// F3 : aucun texte naturel. Le refus est un CODE.
import { createContext, useContext, type PropsWithChildren } from "react";
import type { PortAgent } from "./agent-contract";

const INERTE: PortAgent = {
  catalogue: () => Promise.resolve({ ok: false, code: "AIR_AGENT_ABSENT" }),
  parler: () => Promise.resolve({ ok: false, code: "AIR_AGENT_ABSENT" }),
  agir: () => Promise.resolve({ ok: false, code: "AIR_AGENT_ABSENT" }),
};

const Contexte = createContext<PortAgent>(INERTE);

export function AgentRoot({ port, children }: PropsWithChildren<{ port: PortAgent }>) {
  return <Contexte.Provider value={port}>{children}</Contexte.Provider>;
}

/** Le port de l'agent courant. Inerte si aucune racine ne le fournit. */
export function usePortAgent(): PortAgent {
  return useContext(Contexte);
}
