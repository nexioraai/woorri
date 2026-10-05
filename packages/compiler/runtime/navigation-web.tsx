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
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { NavigationRoot, type Navigateur } from "./navigation-contrat";

/** L'écran que l'adresse désigne. Le fragment, pour n'exiger aucun serveur. */
export function ecranDeLAdresse(defaut: string): string {
  if (typeof window === "undefined") return defaut;
  const brut = window.location.hash.replace(/^#\/?/, "");
  return brut === "" ? defaut : decodeURIComponent(brut.split("?")[0] ?? defaut);
}

/**
 * LES PARAMÈTRES DE L'ÉCRAN — et sans eux, tout écran de détail est VIDE.
 *
 * ── LE DÉFAUT, MESURÉ PAR LA GATE WEB LE 2026-10-05.
 *
 * La première version de `navigate` recevait `params` et ne les écrivait
 * nulle part. Un écran de détail — une fiche de membre, un plat, un chantier —
 * reçoit l'identifiant de l'élément par `route.params.itemId`. Sans lui, il
 * montre son état vide : l'application se compile, se monte, s'affiche, et NE
 * MARCHE PAS. C'est exactement la forme de défaut que ce dépôt paie en boucle
 * — produit, donc supposé bon.
 *
 * Les paramètres vivent dans la QUERY DU FRAGMENT (`#/ecran?itemId=42`) et
 * non dans un état en mémoire, pour la même raison que l'écran lui-même : un
 * lien vers une fiche doit pouvoir être partagé et rechargé.
 */
export function parametresDeLAdresse(): { itemId?: string } {
  if (typeof window === "undefined") return {};
  const apres = window.location.hash.split("?")[1];
  if (apres === undefined || apres === "") return {};
  const itemId = new URLSearchParams(apres).get("itemId");
  return itemId === null ? {} : { itemId };
}

/** `#/ecran?itemId=…` — la query n'apparaît que s'il y a un paramètre. */
const adresse = (nom: string, params?: Record<string, unknown>): string => {
  const brut = params?.["itemId"];
  // On ne transporte QUE `itemId`, parce que c'est le seul paramètre que le
  // contrat d'écran déclare (`AirScreenProps`). Recopier tout l'objet
  // mettrait dans l'URL des choses que personne n'a décidé d'y exposer.
  const q = brut === undefined || brut === null ? "" : `?itemId=${encodeURIComponent(String(brut))}`;
  return `#/${encodeURIComponent(nom)}${q}`;
};

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
      navigate: (name, params) => {
        if (typeof window === "undefined") return;
        window.location.hash = adresse(name, params);
      },
      reset: (state) => {
        if (typeof window === "undefined") return;
        const cible = state.routes[state.index]?.name ?? state.routes[0]?.name;
        if (cible === undefined) return;
        // `replaceState` et non `location.hash` : une destination principale
        // REMPLACE l'entrée d'historique au lieu d'en ajouter une. C'est ce qui
        // fait que le bouton retour quitte l'application au lieu de parcourir
        // les onglets à l'envers.
        window.history.replaceState(null, "", adresse(cible));
        redessiner((n) => n + 1);
      },
    }),
    [],
  );

  // L'écran courant est LU de l'adresse à chaque rendu : c'est elle qui fait
  // foi, jamais un état parallèle qui pourrait en diverger.
  // L'écran courant est lu par `Navigation` (fichier émis) à chaque rendu ;
  // la racine n'a qu'à garantir qu'un changement d'adresse redessine.
  void ecranDEntree;

  return <NavigationRoot navigateur={navigateur}>{children}</NavigationRoot>;
}
