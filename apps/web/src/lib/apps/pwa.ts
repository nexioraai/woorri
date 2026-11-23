/**
 * L'APPLI PUBLIÉE S'INSTALLE COMME UNE VRAIE APPLI (décision du propriétaire, 2026-11-22).
 *
 * Objectif : le jour de Dari Tech, installer une appli Deribfy sur un téléphone
 * Android depuis Chrome, avec SON nom et SON icône, et qu'elle s'ouvre seule.
 * Google Play (Trusted Web Activity) viendra après : ce module en pose le
 * terrain (manifeste servi par l'origine, `id` stable, icône 512 « maskable »),
 * sans le coder.
 *
 * CE QUE DIT LA DOCUMENTATION ACTUELLE (lue le 2026-11-22, web.dev
 * « install-criteria » et developer.chrome.com « update-install-criteria ») :
 *   · HTTPS ; un manifeste avec `name` ou `short_name`, des icônes 192 ET 512,
 *     `start_url`, `display` parmi fullscreen/standalone/minimal-ui,
 *     `prefer_related_applications` absent ou faux ;
 *   · depuis Chrome 108 (mobile), l'installation par le MENU n'exige plus de
 *     service worker ; l'INVITE automatique, elle, exige encore un gestionnaire
 *     `fetch`. Le service worker ci-dessous en a un, qui sert vraiment
 *     (l'écran hors ligne) — pas une coquille vide.
 *
 * TOUT EST SERVI PAR L'ORIGINE DE L'APPLI (`<nom>.deribfy.app`), jamais cuit en
 * `data:` : un manifeste `data:` n'a pas d'origine, donc pas de `start_url`
 * résoluble ni de portée — et Bubblewrap (Play) lit un manifeste par son URL.
 */
import type { Apparence } from './apparence'

/** Les chemins publics, sous l'origine de l'appli. Le proxy les mène aux routes internes. */
export const CHEMIN_MANIFESTE = '/manifest.webmanifest'
export const CHEMIN_SERVICE_WORKER = '/sw.js'
export const CHEMINS_ICONES = {
  192: '/icone-192.png',
  512: '/icone-512.png',
  maskable: '/icone-maskable-512.png',
} as const
export type FormeIcone = keyof typeof CHEMINS_ICONES

/** La couleur des applis qui n'en ont pas choisi : celle de la page servie. */
export const COULEUR_PAR_DEFAUT = '#2a5bd7'
export const FOND_PAR_DEFAUT = '#f7f8fb'

/** Chrome tronque le nom sous l'icône vers 12 signes : on coupe au mot. */
const LONGUEUR_NOM_COURT = 12

export type IdentitePwa = {
  readonly nom: string
  readonly nomCourt: string
  readonly couleur: string
  /** La lettre de l'icône. */
  readonly initiale: string
}

export function identitePwa(titre: string, apparence: Apparence | null): IdentitePwa {
  const nom = titre.replace(/[<>&"]/gu, '').replace(/\s+/gu, ' ').trim() || 'Application'
  let nomCourt = nom
  if (nomCourt.length > LONGUEUR_NOM_COURT) {
    const mots = nom.split(' ')
    nomCourt = mots[0] ?? nom
    for (const m of mots.slice(1)) {
      if (`${nomCourt} ${m}`.length > LONGUEUR_NOM_COURT) break
      nomCourt = `${nomCourt} ${m}`
    }
    nomCourt = nomCourt.slice(0, LONGUEUR_NOM_COURT)
  }
  // La première LETTRE (accents compris), sinon le premier chiffre, sinon « A ».
  const lettre = /\p{L}|\p{N}/u.exec(nom)?.[0] ?? 'A'
  return { nom, nomCourt, couleur: apparence?.couleur ?? COULEUR_PAR_DEFAUT, initiale: lettre.toLocaleUpperCase('fr') }
}

/** Le manifeste de l'appli, servi à `CHEMIN_MANIFESTE`. */
export function manifestePwa(id: IdentitePwa): Record<string, unknown> {
  return {
    // `id` STABLE : Chrome (et Play) reconnaissent l'appli par lui, même si
    // son nom change. Relatif à l'origine — chaque appli a la sienne.
    id: '/',
    name: id.nom,
    short_name: id.nomCourt,
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: FOND_PAR_DEFAUT,
    theme_color: id.couleur,
    icons: [
      { src: CHEMINS_ICONES[192], sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: CHEMINS_ICONES[512], sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: CHEMINS_ICONES.maskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // `prefer_related_applications` ABSENT (critère d'installation). Le jour
    // de Play, `related_applications` s'ajoutera ici — sans le `prefer`.
  }
}
