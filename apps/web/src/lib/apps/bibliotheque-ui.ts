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


/**
 * LES VARIABLES, ET D'OU VIENNENT LEURS NOMS.
 *
 * ── LE DEFAUT MESURE (tir 88c94164) : ONZE NOMS INVENTES.
 *
 * GRIS.fond, GRIS.carte, GRIS.bordure, GRIS.texte, GRIS.texteSecondaire,
 * SEMANTIQUE.attention, SEMANTIQUE.information, RAYON.moyen, TYPO.corps,
 * TYPO.petit, TYPO.h1 — ONZE, et AUCUN composant. Le modele avait les
 * fichiers sous les yeux et inventait quand meme.
 *
 * LA CAUSE N'ETAIT PAS QUE LE VOCABULAIRE ETAIT INCONNU : C'ETAIT LE
 * MAUVAIS AXE. Notre echelle etait par ROLE (surtitre, libelle, valeur,
 * legende) ; le modele cherchait des TAILLES (« du texte normal », « du
 * petit texte », « un titre »). Aucun role ne lui repondait.
 *
 * ── LES NOMS SONT CITES, PAS TRADUITS.
 *
 * Couleurs et rayon : `apps/v4/app/globals.css` du depot shadcn-ui/ui (MIT).
 * Echelle de texte : `packages/tailwindcss/theme.css` — shadcn n'en definit
 * AUCUNE (mesure : zero variable --text-* dans son globals.css).
 *
 * ON EMPRUNTE LES NOMS, PAS LES CHAINES : ni shadcn, ni Tailwind ne sont
 * installes. Les valeurs sont les notres.
 */
export const VARIABLES_CSS = `:root{
--background:#ffffff;--foreground:#171c26;
--card:#ffffff;--card-foreground:#171c26;
--popover:#ffffff;--popover-foreground:#171c26;
--primary:#2a5bd7;--primary-foreground:#ffffff;
--secondary:#eef0f5;--secondary-foreground:#3a4354;
--muted:#f7f8fb;--muted-foreground:#67718a;
--accent:#e7f0ff;--accent-foreground:#1d3f96;
--destructive:#b3261e;--destructive-foreground:#ffffff;
--success:#1a7f4e;--success-foreground:#ffffff;
--warning:#9a6b00;--warning-foreground:#ffffff;
--border:#e3e7ef;--input:#e3e7ef;--ring:#2a5bd7;
--sidebar:#f7f8fb;--sidebar-foreground:#171c26;
--sidebar-primary:#2a5bd7;--sidebar-primary-foreground:#ffffff;
--radius:0.625rem;
--radius-sm:calc(var(--radius) * 0.6);--radius-md:calc(var(--radius) * 0.8);
--radius-lg:var(--radius);--radius-xl:calc(var(--radius) * 1.4);
--text-xs:0.75rem;--text-sm:0.875rem;--text-base:1rem;--text-lg:1.125rem;
--text-xl:1.25rem;--text-2xl:1.5rem;--text-3xl:1.875rem;
}`

/** Les noms declares ci-dessus — source unique du juge et de la CONSIGNE. */
export const NOMS_VARIABLES: readonly string[] = [
  ...new Set([...VARIABLES_CSS.matchAll(/(--[a-z0-9-]+)\s*:/gu)].map((m) => m[1]!)),
]

/** Les jetons : la seule source des couleurs, espaces, rayons et niveaux. */
const JETONS = `/** JETONS — fournis par Deribfy, ne pas modifier.
 *
 * LES COULEURS, LES RAYONS ET LES TAILLES DE TEXTE SONT DES VARIABLES CSS,
 * et leurs noms sont ceux que tout le monde connaît : shadcn pour les
 * couleurs et le rayon, Tailwind pour l'échelle de texte. Elles sont
 * déclarées dans la page elle-même — AUCUNE bibliothèque n'est installée.
 *
 * Écris-les directement : style={{ color: 'var(--muted-foreground)' }}.
 */

/** Espacement en base 8 (4 pour les resserrements). */
export const ESPACE = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const

export const OMBRE = {
  carte: '0 1px 2px rgba(23,28,38,.06), 0 4px 12px rgba(23,28,38,.05)',
  haute: '0 8px 28px rgba(23,28,38,.14)',
} as const

/**
 * LES RÔLES — employés PAR LES COMPOSANTS de cette bibliothèque.
 *
 * Deux vocabulaires, et une règle d'emploi : les RÔLES quand un composant
 * décide (il sait quelle taille va où), les TAILLES quand tu écris
 * toi-même. Deux vocabulaires sans règle seraient une invention de plus.
 */
export const ROLE = {
  surtitre: { fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' },
  libelle: { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--foreground)' },
  valeur: { fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' },
  legende: { fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--muted-foreground)' },
} as const
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
import { ESPACE, OMBRE, ROLE } from './jetons'

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

const CARTE: React.CSSProperties = {
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: OMBRE.carte,
  padding: ESPACE.l,
  textAlign: 'left',
}

export function Carte({ enfants, children }: { enfants?: React.ReactNode; children?: React.ReactNode }) {
  return <div style={CARTE}>{enfants ?? children}</div>
}

/**
 * LA CARTE DE CHIFFRE — icône teintée, surtitre, valeur, LIGNE DE CONTEXTE.
 * La ligne de contexte (delta, période, échéance) sépare un compte réel
 * d'une maquette — exigée par le propriétaire, jamais omise.
 */
export function CarteDeChiffre({ icone, libelle, valeur, contexte, ton = 'neutre' }: {
  icone: string; libelle: string; valeur: string; contexte: string
  ton?: 'succes' | 'alerte' | 'danger' | 'neutre'
}) {
  const couleurs = {
    succes: 'var(--success)', alerte: 'var(--warning)',
    danger: 'var(--destructive)', neutre: 'var(--muted-foreground)',
  } as const
  return (
    <div style={{ ...CARTE, display: 'flex', flexDirection: 'column', gap: ESPACE.s }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s }}>
        <span style={{ background: 'var(--accent)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)',
          width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom={icone} taille={18} />
        </span>
        <span style={ROLE.surtitre as React.CSSProperties}>{libelle}</span>
      </div>
      <div style={ROLE.valeur as React.CSSProperties}>{valeur}</div>
      <div style={{ ...(ROLE.legende as React.CSSProperties), color: couleurs[ton] }}>{contexte}</div>
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
        {surtitre !== undefined && <div style={ROLE.surtitre as React.CSSProperties}>{surtitre}</div>}
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 650, color: 'var(--foreground)' }}>{titre}</h2>
      </div>
      {action !== undefined && surAction !== undefined && (
        <button onClick={surAction} style={{ background: 'none', border: 'none', color: 'var(--primary)',
          fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>{action}</button>
      )}
    </div>
  )
}

export function Pastille({ ton, enfant, children }: {
  ton: 'succes' | 'alerte' | 'danger' | 'neutre'; enfant?: React.ReactNode; children?: React.ReactNode
}) {
  const fonds = { succes: 'var(--success)', alerte: 'var(--warning)', danger: 'var(--destructive)', neutre: 'var(--secondary-foreground)' } as const
  return (
    <span style={{ background: 'var(--secondary)', color: fonds[ton], borderRadius: 999,
      fontSize: 'var(--text-xs)', fontWeight: 600, padding: \`2px \${ESPACE.s}px\` }}>
      {enfant ?? children}
    </span>
  )
}

/** LE FORMULAIRE A UNE GÉOMÉTRIE : le champ grandit, le bouton non. */
export function Bouton({ texte, surClic, genre = 'primaire', type = 'button' }: {
  texte: string; surClic?: () => void; genre?: 'primaire' | 'secondaire' | 'discret'
  type?: 'button' | 'submit'
}) {
  const fonds = { primaire: 'var(--primary)', secondaire: 'var(--card)', discret: 'transparent' } as const
  const textes = { primaire: 'var(--primary-foreground)', secondaire: 'var(--foreground)', discret: 'var(--primary)' } as const
  return (
    <button type={type} onClick={surClic} style={{ background: fonds[genre], color: textes[genre],
      border: genre === 'secondaire' ? '1px solid var(--border)' : 'none',
      borderRadius: 'var(--radius-md)', padding: \`\${ESPACE.s + 2}px \${ESPACE.m}px\`,
      fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>
      {texte}
    </button>
  )
}

export function EtatVide({ icone = 'document', message, detail }: {
  icone?: string; message: string; detail?: string
}) {
  return (
    <div style={{ textAlign: 'left', color: 'var(--muted-foreground)', padding: ESPACE.xl,
      border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex',
      gap: ESPACE.m, alignItems: 'center' }}>
      <Icone nom={icone} taille={24} couleur="var(--border)" />
      <div>
        <div style={ROLE.libelle as React.CSSProperties}>{message}</div>
        {detail !== undefined && <div style={ROLE.legende as React.CSSProperties}>{detail}</div>}
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
function vocabulaireIcones(): string {
  return vocabulaireDe(fichiersSysteme(undefined)).icones.join(', ')
}

/** Les variables, en colonnes lisibles — dérivées du bloc :root lui-même. */
function vocabulaireVariables(): string {
  const n = NOMS_VARIABLES
  const lignes: string[] = []
  for (let i = 0; i < n.length; i += 4) lignes.push('     ' + n.slice(i, i + 4).join('  '))
  return lignes.join('\n')
}

function vocabulaireEnumere(): string {
  const systeme = fichiersSysteme(undefined)
  const { espaces, icones } = vocabulaireDe(systeme)
  const lignes = [...espaces.entries()].map(([nom, membres]) => `     ${nom} : ${membres.join(', ')}`)
  return lignes.join('\n') + `\n     Icone nom= : ${icones.join(', ')}`
}

/** Ce que la CONSIGNE raconte de la bibliothèque — tenu au même endroit
 *  qu'elle, pour que le texte et les fichiers ne divergent jamais. */
export const CONSIGNE_BIBLIOTHEQUE = `L'INTERFACE VIENT DE LA BIBLIOTHÈQUE FOURNIE — tu ne la réécris jamais.
   Trois fichiers existent déjà (ne les écris pas, ils seront écrasés) :
   · ./systeme/jetons : ESPACE, OMBRE, ROLE.
   · ./systeme/argent : formaterMontant(montant) — TOUT montant passe par
     lui ; tu n'écris JAMAIS un code ou symbole de monnaie.
   · ./systeme/ui : Icone (noms : ${vocabulaireIcones()}), Carte,
     CarteDeChiffre (icône + libellé + valeur + LIGNE DE CONTEXTE
     obligatoire), EnTeteDeSection, Pastille, Bouton, EtatVide.

11. LES COULEURS, RAYONS ET TAILLES SONT DES VARIABLES CSS, déjà déclarées
   dans la page. Tu les écris directement :
       style={{ color: 'var(--muted-foreground)', borderRadius: 'var(--radius-lg)' }}
   LES SEULES QUI EXISTENT, et tu n'en inventes AUCUNE autre :
${vocabulaireVariables()}

12. TAILWIND N'EXISTE PAS ICI, ET AUCUNE FEUILLE DE STYLE NON PLUS.
   Les noms ci-dessus sont ceux de shadcn et de Tailwind, mais NI L'UN NI
   L'AUTRE n'est installé : il n'y a que ces variables, déclarées à la main
   dans la page. Donc tu N'ÉCRIS JAMAIS D'ATTRIBUT className — ni
   « bg-primary », ni « flex gap-4 », ni un nom de classe à toi. Mesuré sur
   une œuvre réelle : 55 className dans un projet sans la moindre feuille
   de style — elles ne rendaient RIEN, et sans la moindre erreur. Un défaut
   silencieux coûte plus cher qu'un défaut bruyant. Tout le style passe par
   l'attribut style={{ }}.

13. DEUX VOCABULAIRES, UNE RÈGLE D'EMPLOI :
   · les RÔLES (ROLE.surtitre, ROLE.libelle, ROLE.valeur, ROLE.legende)
     quand un composant de la bibliothèque décide — il sait quelle taille
     va où ;
   · les TAILLES (var(--text-sm), var(--text-2xl)…) quand TU écris
     toi-même un style.
   L'alignement est à GAUCHE partout — jamais de carte au contenu centré.
   Les données d'exemple RACONTENT une histoire : les totaux sont la somme
   des lignes, les dates se suivent, et au moins un cas NON NOMINAL existe
   (un retard, une alerte, un échec) — pas des nombres sans lien.`
