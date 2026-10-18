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
import { TABLE_SONDES } from './journal'
import { direQuelTirCommence, sdkJournalise } from './journal-appels'
// ── LE SDK EST IMPORTÉ ICI, NORMALEMENT, ET PASSÉ AU MOTEUR.
//
// MESURÉ EN PRODUCTION le 2026-10-14, sur une vraie demande :
//   « Cannot find package '/var/task/node_modules/@anthropic-ai/sdk/index.js'
//     imported from /var/task/benchmarks/air-emission/adaptateur-anthropic.mjs »
// Trois reprises, puis refus. Coût zéro — l'échec précède tout appel, mais la
// génération était morte.
//
// L'adaptateur est chargé en `webpackIgnore` : le bundler ne voit donc PAS
// son `await import("@anthropic-ai/sdk")`, et ne l'emporte pas. Le paquet est
// bien une dépendance de cette application, mais HISSÉ à la racine du dépôt —
// en local la résolution remonte et le trouve, dans la fonction déployée
// cette racine n'existe pas.
//
// C'EST EXACTEMENT LE DÉFAUT DÉJÀ PAYÉ EN P0 (`comprendre.ts`, 2026-10-09) et
// la même réparation : un import NORMAL, que le bundler suit tout seul avec
// les six dépendances du SDK. Allonger une liste de fichiers tracés ne marche
// pas — un fichier tracé est copié comme une DONNÉE, ses `import` ne sont pas
// lus.
import Anthropic from '@anthropic-ai/sdk'
import { racineDepot } from './racine'
import type { MoteurContinuation } from './travailleur'

export type Emission = {
  readonly ok: boolean
  readonly document?: unknown
  readonly modele?: unknown
  readonly diagnostics: { code?: string; path?: string }[]
  // `details` porte `path : message` — ce qui manquait pour diagnostiquer un
  // refus apres coup (EP-222). Optionnel : les traces deja en base ne l'ont pas.
  readonly tirages: {
    tentative: number
    arret: string
    coutUsd: number
    diagnostics: string[]
    details?: string[]
  }[]
  readonly coutUsd: number
  readonly jetons: { entree: number; sortie: number }
  readonly raison?: string
}

type Moteur = {
  creerMoteur: (o: {
    cleApi: string
    plafondUsd?: number
    paquets?: Record<string, unknown>
    /** Le SDK, fourni par le site : en ligne il ne se résout pas seul. */
    sdk?: unknown
    /**
     * LE PARTAGE DE LA SONDE DE GRAMMAIRE (EP-236, branché le 2026-10-18).
     *
     * Le moteur ne sait pas lire une base ; le site, si. Absent — campagne en
     * terminal — rien ne change : on sonde comme avant.
     */
    sondePartagee?: {
      lire: (empreinte: string) => Promise<unknown>
      ecrire: (empreinte: string, niveaux: unknown) => Promise<void>
    }
  }) => Promise<{
    emettreApplication: (d: { brief: string; slug: string }) => Promise<Emission>
    poursuivreEmission: (o: {
      brief: string
      slug: string
      etat: unknown
      budgetMs: number
    }) => Promise<unknown>
  }>
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
/**
 * LE PARTAGE DE LA SONDE DE GRAMMAIRE — ce que le moteur attendait depuis EP-236.
 *
 * ── CE QU'IL REPARE, ET C'EST LA MESURE DU PROPRIETAIRE.
 *
 * Avant d'ecrire une ligne d'application, le moteur teste sa grammaire : 9 a
 * 22 allers-retours, SEIZE MINUTES d'ecran muet sur une demande de 86
 * caracteres. Le resultat ne depend que du SCHEMA — la sonde envoie
 * `system: "x"`, `user: "x"` — donc il se calcule UNE FOIS.
 *
 * Le moteur sait le partager. Il ne manquait que ca : quelqu'un pour le lui
 * donner. `sondePartagee` n'existait nulle part ailleurs que dans le moteur
 * qui l'attend. Huitieme machine posee et debranchee de ce chantier.
 *
 * ── IL NE CASSE RIEN S'IL ECHOUE, ET C'EST VOULU.
 *
 * Le moteur entoure deja `lire` et `ecrire` de `try`. Un partage indisponible
 * fait retomber sur le comportement d'avant — on resonde. Une generation ne
 * doit JAMAIS mourir parce qu'un cache est en panne.
 */
function sondeDeLaBase() {
  // ── L'IMPORT EST PARESSEUX, ET CE N'EST PAS UN DÉTAIL DE STYLE.
  //
  // `supabase-admin` LÈVE au chargement si la clé de service manque. Importé
  // au sommet, il faisait échouer le CHARGEMENT de deux fichiers de test qui
  // ne touchent ni à la base ni à la sonde — mesuré : `plafond-jetons` et
  // `livrer-malgre-refus` affichaient « 0 test », exactement le silence
  // qu'EP-269 ferme ailleurs.
  //
  // Ici le client n'est construit que lorsqu'on s'en sert vraiment.
  const base = async () => (await import('@/lib/supabase-admin')).supabaseAdmin
  return {
    async lire(empreinte: string): Promise<unknown> {
      const r = await (await base())
        .from(TABLE_SONDES)
        .select('niveaux')
        .eq('empreinte', empreinte)
        .maybeSingle()
      if (r.error !== null || r.data === null) return null
      return r.data.niveaux
    },
    async ecrire(empreinte: string, niveaux: unknown): Promise<void> {
      // `upsert` et pas `insert` : deux generations peuvent sonder en meme
      // temps sur une empreinte neuve, et la seconde ne doit pas echouer sur
      // la cle primaire — elle ecrit la meme chose.
      await (await base()).from(TABLE_SONDES).upsert({ empreinte, niveaux })
    },
  }
}

/** La fabrique UNIQUE du moteur cote site — memes paquets, meme mode strict,
 *  pour l'emission d'un trait (conversation) ET la continuation (cron). */
async function moteurDuSite(cle: string) {
  const { creerMoteur } = (await import(
    /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/moteur.mjs`
  )) as Moteur
  const m = await creerMoteur({
    cleApi: cle,
    // ── LA SONDE PARTAGEE (EP-271). Sans cette ligne, chaque generation
    //    repaie 9 a 22 allers-retours pour redecouvrir la meme reponse.
    sondePartagee: sondeDeLaBase(),
    // Le SDK voyage par ici, jamais par une résolution depuis `benchmarks/`.
    // ── LE SDK EST INSTRUMENTÉ (EP-272, 2026-10-18).
    //
    // Le moteur compte les JETONS de chaque appel depuis toujours ; il n'a
    // jamais compté le TEMPS. On enveloppe donc la seule méthode qui part
    // sur le réseau, ICI, parce que `emission-coeur.mjs` est scellé.
    //
    // Rien n'est remplacé : flux, échéance de tranche et comptabilité
    // passent exactement comme avant. On observe.
    sdk: sdkJournalise(Anthropic as never),
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
  return m
}

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
  const m = await moteurDuSite(cle)
  return await m.emettreApplication({ brief, slug })
}

/**
 * ETAGE 4 — LA TRANCHE DU CRON. Un moteur NEUF par tranche (un processus
 * serverless est neuf de toute facon) ; l'etat ne survit QUE par la table.
 * Cle absente → erreur FATALE etiquetee : le travailleur refuse EN LE
 * DISANT au lieu de retenter un mur.
 */
export const poursuivreEmissionDuSite: MoteurContinuation['poursuivreEmission'] = async (o) => {
  const cle = process.env.ANTHROPIC_API_KEY ?? ''
  if (cle === '') {
    throw Object.assign(new Error('ANTHROPIC_API_KEY absente du serveur'), { transitoire: false })
  }
  const m = await moteurDuSite(cle)
  // Le journal des appels n'a que le slug pour recoudre ses lignes au tir :
  // c'est la seule chose que le client voit, et `gen-xxxxxxxx` suffit.
  direQuelTirCommence(o.slug)
  try {
    return (await m.poursuivreEmission(o)) as Awaited<
      ReturnType<MoteurContinuation['poursuivreEmission']>
    >
  } finally {
    // Une tranche qui se termine ne doit pas laisser son slug derrière elle :
    // le processus serverless est réutilisé, et les appels d'une AUTRE
    // génération seraient attribués à celle-ci.
    direQuelTirCommence(null)
  }
}
