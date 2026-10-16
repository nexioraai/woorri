// PONT DE THÈME (D1, dossier 3.2 validé) — patron GAGNANT du banc P-003
// (bascule light/dark en 2 frames : les deux feuilles de style sont
// pré-calculées une fois au chargement, la bascule ne fait que changer de
// feuille via le contexte). Liaison STATIQUE aux tokens : la variance par
// app est un acte de COMPILATION (le compilateur émettra un module de
// tokens propre à chaque app — modèle copie-régénérable §3), jamais un
// mécanisme runtime.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Scheme, ThemeBridge } from "./contracts.ts";
import { SHEETS, type Sheet } from "./styles.ts";

const SchemeContext = createContext<ThemeBridge>({
  scheme: "light",
  setScheme: () => undefined,
});

export function ThemeRoot({
  children,
  initialScheme = "light",
}: PropsWithChildren<{ initialScheme?: Scheme }>) {
  const [scheme, setScheme] = useState<Scheme>(initialScheme);
  // ── LE SCHÉMA SUIT LE SYSTÈME QUAND CELUI-CI CHANGE.
  //
  // `useState` ne retient que la valeur du PREMIER rendu. Sans cette
  // synchronisation, une personne qui bascule son appareil en sombre
  // pendant que l'application est ouverte ne verrait rien changer — il
  // faudrait relancer. Apple et Google exigent tous deux que les deux
  // apparences soient servies ; servir la bonne seulement au démarrage ne
  // tient pas l'exigence.
  //
  // `setScheme` reste exposé : une préférence DANS l'application pourra
  // l'emporter plus tard. Aujourd'hui personne ne l'appelle, et le dire
  // vaut mieux que de laisser croire à un réglage qui n'existe pas.
  useEffect(() => {
    setScheme(initialScheme);
  }, [initialScheme]);
  const value = useMemo(() => ({ scheme, setScheme }), [scheme]);
  return <SchemeContext.Provider value={value}>{children}</SchemeContext.Provider>;
}

export function useThemeBridge(): ThemeBridge {
  return useContext(SchemeContext);
}

export function useStyles(): Sheet {
  return SHEETS[useContext(SchemeContext).scheme];
}
