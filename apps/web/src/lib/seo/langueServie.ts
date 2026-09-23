import { headers } from 'next/headers'

// ============================================================
// LA LANGUE RÉELLEMENT SERVIE DANS LE HTML — PAS CELLE CORRIGÉE APRÈS COUP.
//
// LE DÉFAUT MESURÉ (2026-09-23, sur la base de production) : `HtmlLang` est un
// composant CLIENT qui corrige `document.documentElement.lang` dans un
// `useEffect`. Le HTML SERVI, lui, porte toujours `lang="fr"` — celui du layout
// racine, écrit en dur. Or c'est le HTML servi que lit un moteur.
//
// CE QUE ÇA COÛTE, EN CHIFFRES : sur les 5 sites publiés, **3 sont en anglais**
// (`techflow-electronics`, `cosmopo`, et `yiaglobalcommodities.com` qui porte un
// vrai domaine). Tous les trois s'annoncent en français. Ce n'est pas une
// hypothèse : c'est l'état de la base.
//
// POURQUOI LE LAYOUT RACINE ET PAS UN LAYOUT DE SITE : seul le layout racine
// rend la balise `<html>`. Un layout imbriqué ne peut pas en changer les
// attributs. La solution idiomatique de Next — deux layouts racine dans deux
// groupes de routes — exigerait de déplacer 82 fichiers et casserait les
// chemins littéraux qu'affirment plusieurs cliquets d'architecture. Hors
// périmètre : la modification minimale est ici.
//
// CE QUE ÇA COÛTE, ET JE LE DIS : lire un en-tête rend le layout racine
// DYNAMIQUE, donc les 6 pages encore statiques de la plateforme le deviennent.
// Cinq d'entre elles ne font AUCUNE entrée-sortie (`/cookies`, `/pricing`,
// `/visibilite-ia`, `/_not-found`, `/terms`) — les rendre à la demande revient
// à assembler du JSX. Seule `/blog` interroge la base, une requête minuscule.
// Mesuré et assumé ; consigné dans PROGRESS.md.
// ============================================================

/** En-tête posé par `proxy.ts` quand la requête sert un site marchand. */
export const EN_TETE_LANGUE = 'x-deribfy-lang'

/** Langue de la plateforme elle-même. Voir PROGRESS.md, choix nº 2. */
export const LANGUE_PLATEFORME = 'fr'

/** Écritures de droite à gauche. Zéro site concerné aujourd'hui — la liste
 *  existe pour que le premier site arabe ne doive pas attendre un correctif. */
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'])

/** Codes acceptés : deux ou trois lettres, avec région facultative. Tout le
 *  reste est ignoré — un en-tête est une entrée, donc jamais digne de confiance. */
const CODE_VALIDE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/

export type LangueServie = { lang: string; dir: 'ltr' | 'rtl' }

/** Normalise un code de langue, ou rend `null` s'il n'est pas exploitable. */
export function normaliserLangue(brut: string | null | undefined): string | null {
  const c = (brut ?? '').trim()
  if (!c || !CODE_VALIDE.test(c)) return null
  return c
}

export function directionDe(lang: string): 'ltr' | 'rtl' {
  return RTL.has(lang.split('-')[0]!.toLowerCase()) ? 'rtl' : 'ltr'
}

/**
 * Langue à écrire dans `<html>` pour la requête en cours.
 *
 * FAIL-SAFE : toute absence, tout code illisible retombe sur la langue de la
 * plateforme. Un `lang` erroné est pire que pas de `lang` du tout — il fait
 * dire au document quelque chose de faux.
 */
export async function langueServie(): Promise<LangueServie> {
  let brut: string | null = null
  try {
    brut = (await headers()).get(EN_TETE_LANGUE)
  } catch {
    // Rendu hors requête (génération statique, tests) : la plateforme.
  }
  const lang = normaliserLangue(brut) ?? LANGUE_PLATEFORME
  return { lang, dir: directionDe(lang) }
}
