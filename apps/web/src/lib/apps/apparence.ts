/**
 * L'APPARENCE D'UNE APPLI, CHOISIE PAR SON PROPRIÉTAIRE — SANS RÉÉCRIRE SON CODE
 * (surcharge de thème, 2026-11-18).
 *
 * ── LE DÉFAUT, MESURÉ.
 *
 * « Mets les boutons en vert » était refusée deux fois sur deux : le modèle
 * réécrivait `systeme/ui.tsx` (49 Ko) pour changer une couleur, et la réponse
 * était coupée. Et même réussie, elle n'aurait pas tenu : la couleur choisie
 * dans Réglages vit dans le `localStorage` de CELUI qui la choisit — le
 * propriétaire voit vert, ses clients voient bleu.
 *
 * ── LA SURCHARGE.
 *
 * La couleur vit dans le DOCUMENT de l'appli (`apparence.couleur`), versionnée
 * avec lui. Deribfy l'injecte AU SERVICE, dans la page qu'il assemble à chaque
 * visite : toutes les applis en profitent, déjà publiées comprises, sans
 * régénération et sans une ligne de leur code. Une retouche de couleur rend
 * `APPARENCE.json`, pas des fichiers.
 *
 * ── QUI GAGNE.
 *
 * La règle injectée est PLUS SPÉCIFIQUE que les styles de la bibliothèque
 * (`html:root:root:root`, contre `html:root[data-style=…]`) : elle l'emporte
 * pour tout le monde. Le choix PERSONNEL fait dans Réglages est posé EN LIGNE
 * sur la racine (`style.setProperty`) : il l'emporte encore, sur l'appareil
 * de celui qui l'a fait. C'est voulu.
 */

/** Le nom réservé, hors de l'espace des fichiers de l'application. */
export const FICHIER_APPARENCE = 'APPARENCE.json'

export type Apparence = {
  /** La couleur principale : boutons, accents, barre, premier graphique. `#rrggbb`. */
  readonly couleur: string
}

/**
 * LE TEXTE BLANC DES BOUTONS DOIT RESTER LISIBLE.
 *
 * `--primary-foreground` vaut `#ffffff` partout. Une couleur trop claire
 * rendrait chaque bouton illisible : on la REFUSE, on ne la corrige pas en
 * silence. Seuil WCAG AA pour du texte courant : 4,5:1.
 */
export const CONTRASTE_MIN = 4.5

const luminance = (hex: string): number => {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

/** Le contraste d'une couleur avec le blanc. */
export const contrasteAvecBlanc = (hex: string): number => 1.05 / (luminance(hex) + 0.05)

export type Validation =
  | { readonly ok: true; readonly apparence: Apparence }
  | { readonly ok: false; readonly motif: string }

/** Valide une apparence brute (lue d'un JSON). Seule `couleur` est connue. */
export function validerApparence(brut: unknown): Validation {
  const v = brut as { couleur?: unknown } | null
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    return { ok: false, motif: 'la description de l’apparence est illisible' }
  }
  const inconnues = Object.keys(v).filter((k) => k !== 'couleur')
  if (inconnues.length > 0) {
    return { ok: false, motif: `seule la couleur principale se règle ici (pas ${inconnues.join(', ')})` }
  }
  const couleur = typeof v.couleur === 'string' ? v.couleur.trim().toLowerCase() : ''
  if (!/^#[0-9a-f]{6}$/u.test(couleur)) {
    return { ok: false, motif: 'la couleur doit s’écrire #rrggbb' }
  }
  if (contrasteAvecBlanc(couleur) < CONTRASTE_MIN) {
    return {
      ok: false,
      motif: 'cette couleur est trop claire : le texte blanc des boutons deviendrait illisible',
    }
  }
  return { ok: true, apparence: { couleur } }
}

/** L'apparence portée par un document, ou `null` — jamais une valeur inventée. */
export function apparenceDuDocument(doc: unknown): Apparence | null {
  const brut = (doc as { apparence?: unknown } | null)?.apparence
  if (brut === undefined || brut === null) return null
  const v = validerApparence(brut)
  return v.ok ? v.apparence : null
}

export type ApparenceEnRoute = {
  /** Ce que la retouche demande, validé — `null` si elle ne demande rien. */
  readonly apparence: Apparence | null
  /** Pourquoi la demande a été refusée — `null` si rien n'a été refusé. */
  readonly refus: string | null
  /** Les fichiers de l'application, `APPARENCE.json` RETIRÉ. */
  readonly fichiers: ReadonlyMap<string, string>
}

/** Lit `APPARENCE.json` s'il est rendu, et rend les fichiers sans lui. */
export function lireApparenceEnRoute(fichiers: ReadonlyMap<string, string>): ApparenceEnRoute {
  const brut = fichiers.get(FICHIER_APPARENCE)
  if (brut === undefined) return { apparence: null, refus: null, fichiers }
  const restants = new Map([...fichiers].filter(([n]) => n !== FICHIER_APPARENCE))
  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return { apparence: null, refus: 'la description de l’apparence est illisible', fichiers: restants }
  }
  const v = validerApparence(valeur)
  return v.ok
    ? { apparence: v.apparence, refus: null, fichiers: restants }
    : { apparence: null, refus: v.motif, fichiers: restants }
}

/**
 * LA RÈGLE INJECTÉE DANS LA PAGE. Revalidée ici : une valeur qui n'est pas une
 * couleur ne doit jamais atteindre une balise `<style>`.
 */
export function cssApparence(a: Apparence | null | undefined): string {
  if (a === null || a === undefined) return ''
  const v = validerApparence(a)
  if (!v.ok) return ''
  const c = v.apparence.couleur
  return `<style>html:root:root:root{--primary:${c};--ring:${c};--sidebar-primary:${c};--chart-1:${c}}</style>`
}
