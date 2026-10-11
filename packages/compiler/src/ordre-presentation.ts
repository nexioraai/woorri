/**
 * REMETTRE LES ONGLETS DANS L'ORDRE — SANS PAYER, ET SANS RIEN INVENTER.
 *
 * ── CE QUI A ETE MESURE, LE 2026-10-11.
 *
 * Deux juges de presentation savent exactement ou doivent aller l'accueil
 * (en premier) et le compte (en dernier). Leur verdict est PUBLIE et
 * JAMAIS BLOQUANT — `jugerBase` n'est appele qu'a un seul endroit, dans un
 * bloc qui le dit noir sur blanc. Il n'entre donc pas dans la boucle de
 * reparation payante : ces defauts ne coutent RIEN.
 *
 * Mais ils ARRIVENT A L'ECRAN. Le compilateur ecrit `order: d.order` puis
 * trie dessus : il RESPECTE l'ordre du document au lieu de le corriger. Si
 * le modele a mis le compte en premier, l'application affiche le compte en
 * premier. Le moteur le sait, le dit dans un journal, et personne ne le lit.
 *
 * ── POURQUOI ICI, ET PAS DANS LE JUGE.
 *
 * `presentation.ts` est SCELLE. Ce module ne le modifie pas : il mire sa
 * regle d'identification — l'accueil est l'ecran d'entree, le compte est
 * l'ecran de genre `account_home` — exactement comme `libellePrimitif` le
 * fait deja dans ce meme compilateur. Le precedent existe : le compilateur
 * ECRASE DEJA le libelle des deux primitives. Ecraser leur ordre est le
 * meme geste, au meme endroit.
 *
 * ── CE QUE CE MODULE NE FAIT PAS.
 *
 * Il ne touche QUE les deux primitives. Toute destination du domaine garde
 * sa place relative — l'imposer ferait de la barre un gabarit, et c'est
 * exactement ce que le compilateur refuse deja pour les libelles.
 *
 * Il ne traite PAS l'ordre du bas de l'espace compte : sa regle vit dans le
 * juge scelle avec une correspondance bouton → ecran → genre qu'il faudrait
 * recopier. Deux copies d'une meme regle divergent toujours ; celle-la
 * attendra que la regle soit exportee.
 */
import type { ProjectAir } from "@deribfy/air-schema";

export interface Normalisation {
  readonly air: ProjectAir;
  /** CE QUI A BOUGE, dit et non taire : une correction muette est une
   *  correction qu'on ne peut pas contester. */
  readonly deplacements: readonly string[];
}

/** L'ecran d'une route, par son identifiant de route. */
function ecranDeLaRoute(air: ProjectAir, routeId: string): string | undefined {
  return air.navigation.routes.find((r) => r.id === routeId)?.screenId;
}

/** Les deux primitives, identifiees comme le fait `libellePrimitif`. */
function roleDeLaDestination(
  air: ProjectAir,
  routeId: string,
): "accueil" | "compte" | undefined {
  const ecran = ecranDeLaRoute(air, routeId);
  if (ecran === undefined) return undefined;
  if (ecran === air.navigation.entryScreenId) return "accueil";
  return air.screens.some((e) => e.id === ecran && e.purpose === "account_home")
    ? "compte"
    : undefined;
}

/**
 * @returns le document avec l'accueil en premier et le compte en dernier,
 *          et la liste de ce qui a ete deplace. Rien d'autre ne bouge.
 */
export function normaliserOrdreDestinations(air: ProjectAir): Normalisation {
  const barre = air.navigation.primary;
  if (barre === undefined || barre.destinations.length < 2) {
    return { air, deplacements: [] };
  }

  const avant = [...barre.destinations].sort((a, b) => a.order - b.order);
  const accueil = avant.filter((d) => roleDeLaDestination(air, d.routeId) === "accueil");
  const compte = avant.filter((d) => roleDeLaDestination(air, d.routeId) === "compte");
  const domaine = avant.filter((d) => roleDeLaDestination(air, d.routeId) === undefined);
  const apres = [...accueil, ...domaine, ...compte];

  const deplacements: string[] = [];
  for (const [i, d] of apres.entries()) {
    const rangAvant = avant.findIndex((x) => x.routeId === d.routeId);
    if (rangAvant !== i) {
      deplacements.push(`${d.routeId} : rang ${String(rangAvant)} → ${String(i)}`);
    }
  }
  if (deplacements.length === 0) return { air, deplacements: [] };

  return {
    air: {
      ...air,
      navigation: {
        ...air.navigation,
        primary: {
          ...barre,
          destinations: apres.map((d, i) => ({ ...d, order: i })),
        },
      },
    },
    deplacements,
  };
}
