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
import { racineDepot } from './racine'

export type Emission = {
  readonly ok: boolean
  readonly document?: unknown
  readonly modele?: unknown
  readonly diagnostics: { code?: string; path?: string }[]
  readonly tirages: { tentative: number; arret: string; coutUsd: number; diagnostics: string[] }[]
  readonly coutUsd: number
  readonly raison?: string
}

type Moteur = {
  creerMoteur: (o: {
    cleApi: string
    plafondUsd?: number
  }) => Promise<{ emettreApplication: (d: { brief: string; slug: string }) => Promise<Emission> }>
}

/** Le plafond par application. Mesure : un tir complet reste sous ce seuil,
 *  et les passes s'arretent dessus AVANT d'appeler plutot que de le depasser. */
export const PLAFOND_USD_PAR_APPLICATION = 6

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
    return { ok: false, raison: 'Clé Anthropic absente du serveur.', diagnostics: [], tirages: [], coutUsd: 0 }
  }
  const { creerMoteur } = (await import(
    /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/moteur.mjs`
  )) as Moteur
  const m = await creerMoteur({ cleApi: cle, plafondUsd: PLAFOND_USD_PAR_APPLICATION })
  return await m.emettreApplication({ brief, slug })
}
