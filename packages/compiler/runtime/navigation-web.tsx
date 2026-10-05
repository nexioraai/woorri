// LA COUTURE DE NAVIGATION, REMPLIE PAR LE NAVIGATEUR (cible web).
//
// ── CE QUI CHANGE, ET CE QUI NE CHANGE PAS.
//
// Le contrat est le même que sur le natif : `navigate` et `reset`. Ce qui
// change est le support — une pile en mémoire d'un côté, l'HISTORIQUE DU
// NAVIGATEUR de l'autre.
//
// ── POURQUOI L'URL, ET NON UN ÉTAT EN MÉMOIRE.
//
// Sur le web, l'adresse EST l'état. Une application qui navigue sans changer
// d'URL casse trois choses que personne ne pardonne : le bouton RETOUR, le
// PARTAGE d'un lien, et le RECHARGEMENT de la page. Un état en mémoire aurait
// été plus simple à écrire et aurait produit une application qui se comporte
// mal — c'est-à-dire le genre de simplicité qui coûte cher.
//
// ── `reset` REMPLACE, `navigate` EMPILE.
//
// La distinction vient du natif et elle a la même raison ici : une destination
// PRINCIPALE n'empile pas. Sans cela, revenir en arrière ferait défiler les
// onglets à l'envers — défaut vu sur appareil (voir `racines-navigation`), et
// qui se reproduirait à l'identique avec le bouton retour du navigateur.
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { NavigationRoot, type Navigateur } from "./navigation-contrat";

/** L'écran que l'adresse désigne. Le fragment, pour n'exiger aucun serveur. */
export function ecranDeLAdresse(defaut: string): string {
  if (typeof window === "undefined") return defaut;
  const brut = window.location.hash.replace(/^#\/?/, "");
  return brut === "" ? defaut : decodeURIComponent(brut.split("?")[0] ?? defaut);
}

export function NavigationWeb({
  ecranDEntree,
  children,
}: PropsWithChildren<{ ecranDEntree: string }>) {
  const [, redessiner] = useState(0);

  // ── LE BOUTON RETOUR DOIT MARCHER, ET IL NE MARCHE PAS TOUT SEUL.
  //
  // Changer le fragment met à jour l'adresse mais ne redessine rien : React ne
  // surveille pas `location`. Sans cet abonnement, le bouton retour change
  // l'URL et laisse l'écran précédent affiché — l'application paraît gelée.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const surChangement = () => {
      redessiner((n) => n + 1);
    };
    window.addEventListener("hashchange", surChangement);
    window.addEventListener("popstate", surChangement);
    return () => {
      window.removeEventListener("hashchange", surChangement);
      window.removeEventListener("popstate", surChangement);
    };
  }, []);

  const navigateur = useMemo<Navigateur>(
    () => ({
      navigate: (name) => {
        if (typeof window === "undefined") return;
        window.location.hash = `#/${encodeURIComponent(name)}`;
      },
      reset: (state) => {
        if (typeof window === "undefined") return;
        const cible = state.routes[state.index]?.name ?? state.routes[0]?.name;
        if (cible === undefined) return;
        // `replaceState` et non `location.hash` : une destination principale
        // REMPLACE l'entrée d'historique au lieu d'en ajouter une. C'est ce qui
        // fait que le bouton retour quitte l'application au lieu de parcourir
        // les onglets à l'envers.
        window.history.replaceState(null, "", `#/${encodeURIComponent(cible)}`);
        redessiner((n) => n + 1);
      },
    }),
    [],
  );

  // L'écran courant est LU de l'adresse à chaque rendu : c'est elle qui fait
  // foi, jamais un état parallèle qui pourrait en diverger.
  const courant = ecranDeLAdresse(ecranDEntree);
  const rendre = useCallback(() => courant, [courant]);
  void rendre;

  return <NavigationRoot navigateur={navigateur}>{children}</NavigationRoot>;
}
