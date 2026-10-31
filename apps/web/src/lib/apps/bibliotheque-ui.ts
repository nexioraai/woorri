/**
 * LA BIBLIOTHÈQUE INJECTÉE — Deribfy fournit l'interface, le modèle fournit
 * le métier.
 *
 * ── POURQUOI ELLE EXISTE (arbitrage du propriétaire, 2026-10-31).
 *
 * Comparaison mesurée avec Bolt : l'écart n'était pas du goût, c'était un
 * VOCABULAIRE absent — pas de jetons, deux niveaux de typo, zéro icône, des
 * cartes centrées et vides. Et mesuré sur le tir eb7b62b5 : 55 `className`
 * pour AUCUNE feuille de style — la moitié de l'intention tombait dans le
 * vide. Demander au modèle « plus joli » ne corrige rien : on lui FOURNIT
 * la bibliothèque, une fois, et toutes les générations futures en héritent
 * à coût modèle nul.
 *
 * ── LE MÉCANISME. Ces fichiers sont INJECTÉS dans la carte de chaque œuvre
 * avant les juges et l'assemblage — jamais écrits par le modèle, TOUJOURS
 * écrasés s'il les écrit. La CONSIGNE lui impose d'importer d'ici. La devise
 * du client est CUITE dans `systeme/argent.ts` : le modèle n'écrit plus un
 * code monnaie, et le juge de devise (EP-298) continue de le vérifier.
 *
 * Styles en ligne portés par les jetons : la page autonome n'a pas de
 * feuille, et un style inline ne peut pas pointer dans le vide.
 */

import { vocabulaireDe } from './juge-jetons'

/** Les jetons : la seule source des couleurs, espaces, rayons et niveaux. */
const JETONS = `/** JETONS DE DESIGN — fournis par Deribfy, ne pas modifier. */

/** Gris à six crans, biaisés froid — jamais un gris pur d'imprimante. */
export const GRIS = {
  g900: '#171c26', g700: '#3a4354', g500: '#67718a',
  g300: '#aab2c5', g150: '#e3e7ef', g50: '#f7f8fb',
} as const

export const SEMANTIQUE = {
  succes: '#1a7f4e', succesFond: '#e7f5ee',
  alerte: '#9a6b00', alerteFond: '#fdf3dd',
  danger: '#b3261e', dangerFond: '#fbeae9',
  neutre: '#3a4354', neutreFond: '#eef0f5',
} as const

/** Espacement en base 8 (4 pour les resserrements). */
export const ESPACE = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const

export const RAYON = { s: 6, m: 10, l: 14, rond: 999 } as const

export const OMBRE = {
  carte: '0 1px 2px rgba(23,28,38,.06), 0 4px 12px rgba(23,28,38,.05)',
  haute: '0 8px 28px rgba(23,28,38,.14)',
} as const

/**
 * L'échelle typographique, QUATRE niveaux nommés par leur rôle.
 * L'alignement est à GAUCHE partout : l'œil descend une colonne.
 */
export const TYPO = {
  surtitre: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GRIS.g500 },
  libelle: { fontSize: 14, fontWeight: 500, color: GRIS.g700 },
  valeur: { fontSize: 26, fontWeight: 700, color: GRIS.g900, fontVariantNumeric: 'tabular-nums' },
  legende: { fontSize: 12.5, fontWeight: 400, color: GRIS.g500 },
} as const

/** La teinte primaire se décline : fond de pastille à ~10 %, texte lisible. */
export function declinerTeinte(teinte: string): { vif: string; fond: string } {
  return { vif: teinte, fond: teinte + '1a' }
}
`

/** L'argent : la devise du client, cuite ici — une seule source. */
export function sourceArgent(devise: string | null): string {
  return `/** L'ARGENT — fourni par Deribfy. La devise vient de la configuration du
 * client : AUCUN code monnaie ne s'écrit ailleurs que dans ce fichier. */

export const DEVISE = ${devise === null ? 'null' : `'${devise}'`} as string | null

/** « 25 000 FCFA » — espace insécable étroite, locale française. */
export function formaterMontant(montant: number, devise?: string): string {
  const code = devise ?? DEVISE
  if (code === null || code === undefined) {
    return new Intl.NumberFormat('fr-FR').format(montant)
  }
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(montant)
  } catch {
    return new Intl.NumberFormat('fr-FR').format(montant) + '\\u202f' + code
  }
}
`
}

/** Les composants. Un seul fichier, pour que l'import du modèle soit court. */
const UI = `/** BIBLIOTHÈQUE D'INTERFACE — fournie par Deribfy, ne pas réécrire. */
import React from 'react'
import { ESPACE, GRIS, OMBRE, RAYON, SEMANTIQUE, TYPO, declinerTeinte } from './jetons'

/** LE JEU D'ICÔNES — traits 24×24, cohérents, aucun emoji. */
const TRACES: Record<string, string> = {
  accueil: 'M3 11.5 12 4l9 7.5M5.5 10v9h5v-5h3v5h5v-9',
  recherche: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm9.5 3-4.8-4.8',
  calendrier: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  personne: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  argent: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 12h.01M18 12h.01',
  graphique: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6',
  message: 'M4 5h16v11H8l-4 4z',
  reglages: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.9-1.7L14 2h-4l-.6 2.7a8 8 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5A8 8 0 0 0 4 12',
  fleche: 'M5 12h14m-6-6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  alerte: 'M12 3 2 21h20L12 3Zm0 8v4m0 3h.01',
  valide: 'M4 12.5 10 18 20 6',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2',
  document: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
}

export function Icone({ nom, taille = 20, couleur = 'currentColor' }: {
  nom: string; taille?: number; couleur?: string
}) {
  const d = TRACES[nom] ?? TRACES['document']!
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke={couleur} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Carte({ enfants, children }: { enfants?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: \`1px solid \${GRIS.g150}\`, borderRadius: RAYON.m,
      boxShadow: OMBRE.carte, padding: ESPACE.l, textAlign: 'left' }}>
      {enfants ?? children}
    </div>
  )
}

/**
 * LA CARTE DE CHIFFRE — icône teintée, surtitre, valeur, LIGNE DE CONTEXTE.
 * La ligne de contexte (delta, période, échéance) est ce qui sépare un
 * compte réel d'une maquette — exigée par le propriétaire, jamais omise.
 */
export function CarteDeChiffre({ icone, libelle, valeur, contexte, teinte = '#2a5bd7', ton = 'neutre' }: {
  icone: string; libelle: string; valeur: string; contexte: string
  teinte?: string; ton?: 'succes' | 'alerte' | 'danger' | 'neutre'
}) {
  const t = declinerTeinte(teinte)
  const couleurContexte = ton === 'neutre' ? GRIS.g500 : SEMANTIQUE[ton]
  return (
    <div style={{ background: '#fff', border: \`1px solid \${GRIS.g150}\`, borderRadius: RAYON.m,
      boxShadow: OMBRE.carte, padding: ESPACE.l, textAlign: 'left', display: 'flex',
      flexDirection: 'column', gap: ESPACE.s }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s }}>
        <span style={{ background: t.fond, color: t.vif, borderRadius: RAYON.s,
          width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom={icone} taille={18} />
        </span>
        <span style={TYPO.surtitre as React.CSSProperties}>{libelle}</span>
      </div>
      <div style={TYPO.valeur as React.CSSProperties}>{valeur}</div>
      <div style={{ ...(TYPO.legende as React.CSSProperties), color: couleurContexte }}>{contexte}</div>
    </div>
  )
}

export function EnTeteDeSection({ surtitre, titre, action, surAction }: {
  surtitre?: string; titre: string; action?: string; surAction?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between',
      margin: \`\${ESPACE.xl}px 0 \${ESPACE.m}px\`, textAlign: 'left' }}>
      <div>
        {surtitre !== undefined && <div style={TYPO.surtitre as React.CSSProperties}>{surtitre}</div>}
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 650, color: GRIS.g900 }}>{titre}</h2>
      </div>
      {action !== undefined && surAction !== undefined && (
        <button onClick={surAction} style={{ background: 'none', border: 'none', color: '#2a5bd7',
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{action}</button>
      )}
    </div>
  )
}

export function Pastille({ ton, enfant, children }: {
  ton: 'succes' | 'alerte' | 'danger' | 'neutre'; enfant?: React.ReactNode; children?: React.ReactNode
}) {
  return (
    <span style={{ background: SEMANTIQUE[(ton + 'Fond') as keyof typeof SEMANTIQUE],
      color: SEMANTIQUE[ton], borderRadius: RAYON.rond, fontSize: 12, fontWeight: 600,
      padding: \`2px \${ESPACE.s}px\` }}>
      {enfant ?? children}
    </span>
  )
}

/** LE FORMULAIRE A UNE GÉOMÉTRIE : le champ grandit, le bouton non. */
export function Bouton({ texte, surClic, genre = 'primaire', type = 'button' }: {
  texte: string; surClic?: () => void; genre?: 'primaire' | 'secondaire' | 'discret'
  type?: 'button' | 'submit'
}) {
  const fonds = { primaire: '#2a5bd7', secondaire: '#fff', discret: 'transparent' } as const
  const textes = { primaire: '#fff', secondaire: GRIS.g900, discret: '#2a5bd7' } as const
  return (
    <button type={type} onClick={surClic} style={{ background: fonds[genre], color: textes[genre],
      border: genre === 'secondaire' ? \`1px solid \${GRIS.g300}\` : 'none',
      borderRadius: RAYON.s, padding: \`\${ESPACE.s + 2}px \${ESPACE.m}px\`, fontSize: 14,
      fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>
      {texte}
    </button>
  )
}

export function EtatVide({ icone = 'document', message, detail }: {
  icone?: string; message: string; detail?: string
}) {
  return (
    <div style={{ textAlign: 'left', color: GRIS.g500, padding: ESPACE.xl,
      border: \`1px dashed \${GRIS.g300}\`, borderRadius: RAYON.m, display: 'flex',
      gap: ESPACE.m, alignItems: 'center' }}>
      <Icone nom={icone} taille={24} couleur={GRIS.g300} />
      <div>
        <div style={TYPO.libelle as React.CSSProperties}>{message}</div>
        {detail !== undefined && <div style={TYPO.legende as React.CSSProperties}>{detail}</div>}
      </div>
    </div>
  )
}
`

/** Les fichiers injectés, la devise du client cuite dans l'argent. */
export function fichiersSysteme(deviseConfiguree: string | undefined): ReadonlyMap<string, string> {
  const devise = /^[A-Z]{3}$/u.test((deviseConfiguree ?? '').trim().toUpperCase())
    ? (deviseConfiguree ?? '').trim().toUpperCase()
    : null
  return new Map([
    ['systeme/jetons.ts', JETONS],
    ['systeme/argent.ts', sourceArgent(devise)],
    ['systeme/ui.tsx', UI],
  ])
}

/**
 * LES NOMS EXACTS, ÉNUMÉRÉS AU MODÈLE — dérivés des fichiers émis.
 *
 * Mesuré sur le tir 88c94164 : le modèle a inventé dans TOUS les espaces
 * (TYPO.corps, GRIS.fond, SEMANTIQUE.attention, RAYON.moyen…) — onze
 * références mortes. Il avait les fichiers et devinait quand même. On les
 * lui DIT, et la liste se dérive de la source : la recopier ici la ferait
 * diverger au premier jeton ajouté.
 */
function vocabulaireEnumere(): string {
  const systeme = fichiersSysteme(undefined)
  const { espaces, icones } = vocabulaireDe(systeme)
  const lignes = [...espaces.entries()].map(([nom, membres]) => `     ${nom} : ${membres.join(', ')}`)
  return lignes.join('\n') + `\n     Icone nom= : ${icones.join(', ')}`
}

/** Ce que la CONSIGNE raconte de la bibliothèque — tenu au même endroit
 *  qu'elle, pour que le texte et les fichiers ne divergent jamais. */
export const CONSIGNE_BIBLIOTHEQUE = `L'INTERFACE VIENT DE LA BIBLIOTHÈQUE FOURNIE — tu ne la réécris jamais.
   Trois fichiers existent déjà dans le projet (ne les écris pas, ils te
   sont fournis et seront écrasés si tu les écris) :
   · ./systeme/jetons : GRIS, SEMANTIQUE, ESPACE, RAYON, OMBRE, TYPO —
     toute couleur, espace ou taille vient de là, jamais en dur.
     LES SEULS NOMS QUI EXISTENT, et tu n'en inventes AUCUN autre —
     en inventer un lit undefined et PLANTE l'application au démarrage
     (mesuré sur un tir réel : onze références mortes) :
${vocabulaireEnumere()}
   · ./systeme/argent : formaterMontant(montant) — TOUT montant affiché
     passe par lui ; tu n'écris JAMAIS un code ou symbole de monnaie.
   · ./systeme/ui : Icone (noms : accueil, recherche, calendrier, personne,
     argent, graphique, message, reglages, fleche, plus, alerte, valide,
     horloge, document), Carte, CarteDeChiffre (icône + libellé + valeur +
     LIGNE DE CONTEXTE obligatoire : delta, période ou échéance), 
     EnTeteDeSection, Pastille, Bouton (primaire/secondaire/discret),
     EtatVide (toute liste vide l'affiche).
   L'alignement est à GAUCHE partout — jamais de carte au contenu centré.
   Les données d'exemple RACONTENT une histoire cohérente : les totaux sont
   la somme des lignes, les dates se suivent, et au moins un cas NON
   NOMINAL existe (un retard, une alerte, un échec) — pas des nombres sans
   lien.`
