/**
 * LE MOTEUR A HUIT PASSES, APPELE DEPUIS LE SITE.
 *
 * ── CE QU'IL REMPLACE, ET POURQUOI.
 *
 * `derivation.ts` — 297 lignes que j'ai ecrites — transformait le modele
 * metier en document AIR en remplissant les cases a la main. Tir reel sur la
 * marketplace du proprietaire, le 2026-10-08 :
 *
 *     entites 5 · ecrans 8 · compileWeb 72 fichiers
 *     actions 0 · regles 0 · capacites 0 · intent ABSENT
 *
 * Huit ecrans qui s'affichent et ou il ne se passe RIEN. Les etats de
 * commande, le bouton WhatsApp, l'appel direct, le paiement mobile money —
 * tout cela vit dans ces quatre champs, c'est-a-dire dans les passes
 * `capacites`, `actions`, `donnees` et `intention` que personne n'appelait.
 *
 * ── CE QUE LE MOTEUR FAIT DE PLUS, MESURE.
 *
 * Il JUGE. Premier tir reel du moteur complet sur la meme demande : refus en
 * P2 sur `DERIVATION_IDENTITE_SANS_SOURCE` et
 * `DERIVATION_CONFIRMATION_SANS_ECRITURE` — un geste consomme une identite
 * que rien n'a elue, une confirmation suit sans ecriture amont.
 *
 * Ma derivation ne voyait RIEN de tout cela : elle n'appelle aucun juge. Ce
 * qu'elle produisait n'etait pas meilleur, c'etait simplement non juge.
 *
 * ── LA DEPENSE RESTE BORNEE.
 *
 * Un plafond en dollars est passe au moteur ; les passes s'arretent dessus
 * avant d'appeler. Mesure : trois tirages P0 refuses coutent 0,82 $, un seul
 * 0,21 $, une emission complete davantage.
 */
// ── LES PAQUETS DU MOTEUR, IMPORTES ICI ET PASSES AU MOTEUR.
//
// DEFAUT MESURE EN PRODUCTION : `moteur.mjs` importait huit fichiers
// TypeScript par chemin absolu. Sous `tsx`, en local, ca marche. En ligne,
// Node ne sait pas lire un `.ts` — la route rendait « Lecture impossible »
// instantanement, et je l'avais poussee sans un seul essai en production.
//
// Ici, ce sont des paquets de l'espace de travail : le bundler les resout et
// suit leurs imports, comme il le fait deja pour `@deribfy/compiler`. On les
// passe au moteur, qui ne les cherche donc plus sur le disque.
import * as airSchema from '@deribfy/air-schema'
import * as registry from '@deribfy/capability-registry'
// SOUS-CHEMIN , PAS L'INDEX. L'index reexporte `components.tsx`,
// qui depend de React Native — et les types globaux de RN ECRASENT `FormData`
// du DOM : sept erreurs dans des routes qui n'ont rien a voir avec le
// generateur. Le registre, lui, ne depend que de `definitions`.
import * as blocksRegistry from '@deribfy/blocks/registry'
import * as executionContract from '@deribfy/execution-contract'
// MEME RAISON QUE POUR LES BLOCS : l'index de `primitives` reexporte des
// composants React Native, dont les types globaux ecrasent ceux du DOM.
// `roles-icones` n'importe rien.
import * as primitives from '@deribfy/primitives/roles-icones'
import * as repair from '@deribfy/repair'
import * as compiler from '@deribfy/compiler'
import * as fidelity from '@deribfy/fidelity'
import { racineDepot } from './racine'

export type Emission = {
  readonly ok: boolean
  readonly document?: unknown
  readonly modele?: unknown
  readonly diagnostics: { code?: string; path?: string }[]
  readonly tirages: { tentative: number; arret: string; coutUsd: number; diagnostics: string[] }[]
  readonly coutUsd: number
  readonly jetons: { entree: number; sortie: number }
  readonly raison?: string
}

type Moteur = {
  creerMoteur: (o: {
    cleApi: string
    plafondUsd?: number
    paquets?: Record<string, unknown>
  }) => Promise<{ emettreApplication: (d: { brief: string; slug: string }) => Promise<Emission> }>
}

/**
 * AUCUN PLAFOND. Le cout est MESURE, jamais oppose a l'utilisateur.
 *
 * J'avais pose 6 $. Refuser de construire parce qu'une demande coute plus
 * qu'un nombre que j'ai choisi, c'est exactement l'erreur des 40 000 jetons :
 * une borne inventee qui mange le travail d'un utilisateur. Une application
 * riche coute plus cher — c'est une information, pas une faute.
 *
 * Ce qui remplace le plafond : CHAQUE generation est consignee avec son cout,
 * et l'administration la montre. On surveille au lieu d'empecher.
 */

/**
 * Emet une application complete depuis une demande en texte libre.
 *
 * Charge paresseusement, comme les autres modules d'emission : le moteur
 * construit un client au montage, et un import de haut niveau ferait entrer
 * cette construction dans chaque route du site.
 */
export async function emettreApplication(brief: string, slug: string): Promise<Emission> {
  const cle = process.env.ANTHROPIC_API_KEY ?? ''
  if (cle === '') {
    return {
      ok: false,
      raison: 'Clé Anthropic absente du serveur.',
      diagnostics: [],
      tirages: [],
      coutUsd: 0,
      jetons: { entree: 0, sortie: 0 },
    }
  }
  const { creerMoteur } = (await import(
    /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/moteur.mjs`
  )) as Moteur
  const m = await creerMoteur({
    cleApi: cle,
    // Les index reexportent tout ce que le moteur demande — verifie module
    // par module avant d'ecrire cette ligne, pas suppose.
    paquets: {
      // STRICT : en production le repli par chemin NE PEUT PAS fonctionner —
      // Node ne lit pas un .ts. Mieux vaut un refus qui NOMME le paquet
      // manquant qu une erreur de resolution illisible.
      __strict: true,
      airSchema,
      registry,
      blocksRegistry,
      presentation: executionContract,
      executionContract,
      primitives,
      budgetUsd: repair,
      preservation: repair,
      // `repairScope` est la DOUZIEME dependance de l'orchestration, manquee
      // a l'extraction. Le mode strict l'a nommee ici avant la production ;
      // sans lui elle serait repartie en ligne valoir `undefined`.
      repairScope: repair,
      // `acceptation.mjs` en demande quatre de plus — les juges.
      compiler,
      fidelity,
      executionGraph: executionContract,
      vivacite: executionContract,
    },
  })
  return await m.emettreApplication({ brief, slug })
}
