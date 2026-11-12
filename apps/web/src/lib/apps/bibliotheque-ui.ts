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
--sidebar-accent:#e7f0ff;--sidebar-accent-foreground:#1d3f96;
--sidebar-border:#e3e7ef;--sidebar-ring:#2a5bd7;
--chart-1:#2a5bd7;--chart-2:#1a7f4e;--chart-3:#9a6b00;--chart-4:#b3261e;--chart-5:#67718a;
--radius:0.625rem;
--radius-sm:calc(var(--radius) * 0.6);--radius-md:calc(var(--radius) * 0.8);
--radius-lg:var(--radius);--radius-xl:calc(var(--radius) * 1.4);
--text-xs:0.75rem;--text-sm:0.875rem;--text-base:1rem;--text-lg:1.125rem;
--text-xl:1.25rem;--text-2xl:1.5rem;--text-3xl:1.875rem;
--vedette:#22303a;--vedette-foreground:#f4f1ea;
}
:root[data-fond="beige"]{
--background:#f6f1ea;--card:#fbf8f3;--popover:#fbf8f3;--muted:#efe8de;
--secondary:#ede5da;--accent:#f4e4d8;--border:#e6ddd1;--input:#e6ddd1;
--sidebar:#f3ede4;--sidebar-border:#e6ddd1;--sidebar-accent:#eadfd2;--sidebar-accent-foreground:#2b2620;
--foreground:#2b2620;--card-foreground:#2b2620;--muted-foreground:#7a7064;--vedette:#2f3a33;
}
:root[data-fond="gris"]{
--background:#eef0f4;--card:#ffffff;--muted:#e7eaf0;--secondary:#e4e7ee;
--border:#dde1e9;--input:#dde1e9;--sidebar:#e7eaf0;--sidebar-border:#dde1e9;
}
:root[data-fond="nuit"]{
--background:#14161c;--foreground:#e9ecf2;--card:#1c1f27;--card-foreground:#e9ecf2;
--popover:#1c1f27;--popover-foreground:#e9ecf2;--muted:#232733;--muted-foreground:#9aa3b5;
--secondary:#262a35;--secondary-foreground:#c9cfdb;--accent:#233250;--accent-foreground:#c7d6ff;
--border:#2c313d;--input:#2c313d;--sidebar:#171a21;--sidebar-foreground:#e9ecf2;
--sidebar-accent:#233250;--sidebar-accent-foreground:#c7d6ff;--sidebar-border:#2c313d;
--vedette:#2a3550;--vedette-foreground:#f4f1ea;
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

export function Carte({ children, enfants }: { children?: React.ReactNode; enfants?: React.ReactNode }) {
  return <div style={CARTE}>{children ?? enfants}</div>
}

/**
 * LA CARTE DE CHIFFRE — icône teintée, surtitre, valeur, LIGNE DE CONTEXTE.
 * La ligne de contexte (delta, période, échéance) sépare un compte réel
 * d'une maquette — exigée par le propriétaire, jamais omise.
 */
export function CarteDeChiffre({ icone, libelle, valeur, contexte, ton = 'neutre', tendance, serie }: {
  icone: string; libelle: string; valeur: string; contexte: string
  ton?: 'succes' | 'alerte' | 'danger' | 'neutre'
  /** Évolution en % par rapport à la période précédente (systeme/donnees : tendance). */
  tendance?: number | null
  /** Quelques valeurs récentes, pour le petit graphique (systeme/donnees : parJour / parMois). */
  serie?: number[]
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: ESPACE.s }}>
        <div style={ROLE.valeur as React.CSSProperties}>{valeur}</div>
        <Tendance valeur={tendance} />
      </div>
      <div style={{ ...(ROLE.legende as React.CSSProperties), color: couleurs[ton] }}>{contexte}</div>
      {serie !== undefined && serie.length > 1 && <MiniBarres serie={serie} />}
    </div>
  )
}

export function EnTeteDeSection({ surtitre, titre, description, action, surAction, onAction, onClick }: {
  surtitre?: string; titre: string; description?: string; icone?: string; action?: string
  surAction?: () => void; onAction?: () => void; onClick?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between',
      margin: \`\${ESPACE.xl}px 0 \${ESPACE.m}px\`, textAlign: 'left' }}>
      <div>
        {surtitre !== undefined && <div style={ROLE.surtitre as React.CSSProperties}>{surtitre}</div>}
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 650, color: 'var(--foreground)' }}>{titre}</h2>
        {description !== undefined && <div style={ROLE.legende as React.CSSProperties}>{description}</div>}
      </div>
      {action !== undefined && (onClick ?? onAction ?? surAction) !== undefined && (
        <button onClick={onClick ?? onAction ?? surAction} style={{ background: 'none', border: 'none', color: 'var(--primary)',
          fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>{action}</button>
      )}
    </div>
  )
}

export function Pastille({ ton, children, enfant }: {
  ton: 'succes' | 'alerte' | 'danger' | 'neutre'; children?: React.ReactNode; enfant?: React.ReactNode
}) {
  const fonds = { succes: 'var(--success)', alerte: 'var(--warning)', danger: 'var(--destructive)', neutre: 'var(--secondary-foreground)' } as const
  return (
    <span style={{ background: 'var(--secondary)', color: fonds[ton], borderRadius: 999,
      fontSize: 'var(--text-xs)', fontWeight: 600, padding: \`2px \${ESPACE.s}px\` }}>
      {children ?? enfant}
    </span>
  )
}

/**
 * LE FORMULAIRE A UNE GÉOMÉTRIE : le champ grandit, le bouton non.
 *
 * IL ACCEPTE LA CONVENTION REACT — children et onClick — parce que c'est
 * ce que le modèle écrit (mesuré le 2026-11-01 : trois boutons rendus VIDES
 * et INERTES, libellé et gestionnaire jetés). \`texte\` et \`surClic\`
 * restent acceptés : aucune œuvre déjà livrée ne doit casser.
 */
export function Bouton({ texte, children, surClic, onClick, genre = 'primaire', type = 'button' }: {
  texte?: string; children?: React.ReactNode
  surClic?: () => void; onClick?: () => void
  genre?: 'primaire' | 'secondaire' | 'discret'
  type?: 'button' | 'submit'
}) {
  const fonds = { primaire: 'var(--primary)', secondaire: 'var(--card)', discret: 'transparent' } as const
  const textes = { primaire: 'var(--primary-foreground)', secondaire: 'var(--foreground)', discret: 'var(--primary)' } as const
  return (
    <button type={type} onClick={onClick ?? surClic} style={{ background: fonds[genre], color: textes[genre],
      border: genre === 'secondaire' ? '1px solid var(--border)' : 'none',
      borderRadius: 'var(--radius-md)', padding: \`\${ESPACE.s + 2}px \${ESPACE.m}px\`,
      fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}>
      {children ?? texte}
    </button>
  )
}

/**
 * L'ÉTAT VIDE ACCEPTE LES DEUX NOMS. Mesuré le 2026-11-12 sur une œuvre en
 * ligne (« asosa ») : le modèle écrivait titre= et description=, la pièce
 * attendait message= et detail= — la boîte s'affichait SANS AUCUN TEXTE.
 */
export function EtatVide({ icone = 'document', message, titre, detail, description }: {
  icone?: string; message?: string; titre?: string; detail?: string; description?: string
}) {
  const texte = message ?? titre ?? ''
  const sous = detail ?? description
  return (
    <div style={{ textAlign: 'left', color: 'var(--muted-foreground)', padding: ESPACE.xl,
      border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex',
      gap: ESPACE.m, alignItems: 'center' }}>
      <Icone nom={icone} taille={24} couleur="var(--border)" />
      <div>
        <div style={ROLE.libelle as React.CSSProperties}>{texte}</div>
        {sous !== undefined && <div style={ROLE.legende as React.CSSProperties}>{sous}</div>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * LE TABLEAU DE BORD — fourni par Deribfy (2026-11-12).
 *
 * L'espace de gestion d'une application n'était qu'un menu et des tableaux.
 * Ces pièces lui donnent un ACCUEIL : chiffres clés avec tendance et petit
 * graphique, carte mise en avant, courbe comparée, anneau, classement,
 * derniers ajouts — et la COQUE (barre latérale, en-tête, barre du bas sur
 * téléphone). Tout se nourrit des VRAIES données : les fonctions de
 * ./systeme/donnees les calculent. Aucun chiffre ne s'invente.
 * ══════════════════════════════════════════════════════════════════════════ */

function useLargeur(): number {
  const [l, setL] = React.useState(typeof window === 'undefined' ? 1280 : window.innerWidth)
  React.useEffect(() => {
    const f = () => setL(window.innerWidth)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return l
}

/** L'APPARENCE CHOISIE : fond (blanc, beige, gris, nuit) et couleur. */
const CLE_APPARENCE = 'deribfy-apparence:' + (typeof location === 'undefined' ? '' : location.host + location.pathname)
export const FONDS = { blanc: 'Blanc', beige: 'Beige', gris: 'Gris clair', nuit: 'Nuit' } as const
export const COULEURS = { bleu: '#2a5bd7', vert: '#1f8a5b', corail: '#d2603a', violet: '#6b46c1', bordeaux: '#9b2c4a', ardoise: '#334155' } as const
function appliquerApparence(fond: string, couleur: string | null) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.fond = fond
  const r = document.documentElement.style
  if (couleur) { r.setProperty('--primary', couleur); r.setProperty('--ring', couleur); r.setProperty('--sidebar-primary', couleur); r.setProperty('--chart-1', couleur) }
  else { r.removeProperty('--primary'); r.removeProperty('--ring'); r.removeProperty('--sidebar-primary'); r.removeProperty('--chart-1') }
}
function lireApparence(): { fond: string; couleur: string | null } {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_APPARENCE) ?? 'null')
    if (v && typeof v.fond === 'string') return { fond: v.fond, couleur: typeof v.couleur === 'string' ? v.couleur : null }
  } catch { /* stockage indisponible : l'apparence par défaut */ }
  return { fond: 'blanc', couleur: null }
}
if (typeof window !== 'undefined') { const a = lireApparence(); appliquerApparence(a.fond, a.couleur) }

/** Le panneau des réglages d'apparence — à poser dans la section Réglages. */
export function ChoixApparence() {
  const [a, setA] = React.useState(lireApparence)
  const choisir = (fond: string, couleur: string | null) => {
    const n = { fond, couleur }
    setA(n); appliquerApparence(fond, couleur)
    try { localStorage.setItem(CLE_APPARENCE, JSON.stringify(n)) } catch { /* navigation privée */ }
  }
  const pastille = (actif: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: ESPACE.s,
    padding: ESPACE.m, borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: 'var(--card)', color: 'var(--foreground)',
    border: actif ? '2px solid var(--primary)' : '1px solid var(--border)', fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'left' })
  const apercus: Record<string, string> = { blanc: '#ffffff', beige: '#f6f1ea', gris: '#eef0f4', nuit: '#14161c' }
  return (
    <Carte>
      <div style={ROLE.libelle as React.CSSProperties}>Fond de l'application</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: ESPACE.s, margin: ESPACE.s + 'px 0 ' + ESPACE.l + 'px' }}>
        {Object.entries(FONDS).map(([cle, nom]) => (
          <button key={cle} type="button" onClick={() => choisir(cle, a.couleur)} aria-pressed={a.fond === cle} style={pastille(a.fond === cle)}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: apercus[cle], border: '1px solid var(--border)' }} />{nom}
          </button>
        ))}
      </div>
      <div style={ROLE.libelle as React.CSSProperties}>Couleur principale</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE.s, marginTop: ESPACE.s }}>
        {Object.entries(COULEURS).map(([cle, hex]) => (
          <button key={cle} type="button" aria-label={'Couleur ' + cle} aria-pressed={a.couleur === hex}
            onClick={() => choisir(a.fond, cle === 'bleu' ? null : hex)}
            style={{ width: 36, height: 36, borderRadius: 10, background: hex, cursor: 'pointer',
              border: (a.couleur ?? COULEURS.bleu) === hex ? '3px solid var(--foreground)' : '3px solid transparent' }} />
        ))}
      </div>
    </Carte>
  )
}

/** LA COQUE DE L'ESPACE DE GESTION : barre latérale (≥ 840 px) ou barre du bas. */
export type SectionGestion = { cle: string; libelle: string; icone?: string; nombre?: number }
export function CoqueGestion({ nom, sousTitre = 'Espace de gestion', sections, active, surChoix, onChange,
  titre, description, action, surAction, onAction, onClick, utilisateur, surDeconnexion, children, enfants }: {
  nom: string; sousTitre?: string; sections: SectionGestion[]; active: string
  surChoix?: (cle: string) => void; onChange?: (cle: string) => void
  titre?: string; description?: string; action?: string; surAction?: () => void; onAction?: () => void; onClick?: () => void
  utilisateur?: string; surDeconnexion?: () => void
  children?: React.ReactNode; enfants?: React.ReactNode
}) {
  const large = useLargeur() >= 840
  const choisir = surChoix ?? onChange ?? (() => {})
  const agir = onClick ?? surAction ?? onAction
  const courante = sections.find((s) => s.cle === active)
  const initiale = (nom || '?').trim().charAt(0).toUpperCase()
  const bouton = (s: SectionGestion): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: ESPACE.s + 2,
    width: '100%', padding: (ESPACE.s + 2) + 'px ' + (ESPACE.s + 4) + 'px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
    fontSize: 'var(--text-sm)', textAlign: 'left', background: s.cle === active ? 'var(--sidebar-accent)' : 'transparent',
    color: s.cle === active ? 'var(--sidebar-accent-foreground)' : 'var(--sidebar-foreground)', fontWeight: s.cle === active ? 650 : 500 })
  const enTete = (
    <header style={{ display: 'flex', alignItems: 'center', gap: ESPACE.m, flexWrap: 'wrap', padding: (large ? ESPACE.l : ESPACE.m) + 'px ' + (large ? ESPACE.xl : ESPACE.m) + 'px',
      borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: large ? 'var(--text-2xl)' : 'var(--text-xl)', fontWeight: 750, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{titre ?? courante?.libelle ?? nom}</h1>
        {description !== undefined && <div style={ROLE.legende as React.CSSProperties}>{description}</div>}
      </div>
      {action !== undefined && agir !== undefined && <div style={{ marginLeft: 'auto' }}><Bouton onClick={agir}>{'+ ' + action}</Bouton></div>}
    </header>
  )
  const contenu = <main style={{ padding: large ? ESPACE.xl : ESPACE.m, display: 'flex', flexDirection: 'column', gap: ESPACE.l, paddingBottom: large ? ESPACE.xl : 96 }}>{children ?? enfants}</main>
  if (!large) {
    const visibles = sections.slice(0, 5)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s, padding: ESPACE.m, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 750 }}>{initiale}</span>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--foreground)' }}>{nom}</div>
        </div>
        {enTete}{contenu}
        <nav aria-label="Navigation" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(' + visibles.length + ', minmax(0, 1fr))',
          background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '6px 4px 12px' }}>
          {visibles.map((s) => (
            <button key={s.cle} type="button" onClick={() => choisir(s.cle)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 44,
              border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: s.cle === active ? 700 : 500,
              color: s.cle === active ? 'var(--primary)' : 'var(--muted-foreground)' }}>
              <Icone nom={s.icone ?? 'document'} taille={22} />{s.libelle}
            </button>
          ))}
        </nav>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <aside style={{ width: 248, flexShrink: 0, background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)', padding: ESPACE.m + 'px ' + (ESPACE.s + 4) + 'px',
        display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s + 2, padding: '4px 8px ' + ESPACE.l + 'px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 750, fontSize: 'var(--text-lg)' }}>{initiale}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--sidebar-foreground)' }}>{nom}</div>
            <div style={ROLE.legende as React.CSSProperties}>{sousTitre}</div>
          </div>
        </div>
        {sections.map((s) => (
          <button key={s.cle} type="button" onClick={() => choisir(s.cle)} aria-current={s.cle === active ? 'page' : undefined} style={bouton(s)}>
            <Icone nom={s.icone ?? 'document'} taille={18} />
            <span style={{ flex: 1 }}>{s.libelle}</span>
            {typeof s.nombre === 'number' && (
              <span style={{ fontSize: 'var(--text-xs)', padding: '1px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums',
                background: s.cle === active ? 'var(--primary)' : 'var(--secondary)', color: s.cle === active ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}>{s.nombre}</span>
            )}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: ESPACE.s + 4, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s, fontSize: 'var(--text-xs)', color: 'var(--foreground)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--success)' }} />Données à jour
          </div>
          {utilisateur !== undefined && <div style={{ ...(ROLE.legende as React.CSSProperties), marginTop: 4, overflowWrap: 'anywhere' }}>{utilisateur}</div>}
          {surDeconnexion !== undefined && <button type="button" onClick={surDeconnexion} style={{ marginTop: ESPACE.s, border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Se déconnecter</button>}
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>{enTete}{contenu}</div>
    </div>
  )
}

/** Une grille qui range les cartes : 4 par ligne sur ordinateur, 2 ou 1 sur téléphone. */
export function GrilleTableau({ colonnes = 4, children, enfants }: { colonnes?: number; children?: React.ReactNode; enfants?: React.ReactNode }) {
  const min = colonnes >= 4 ? 210 : colonnes === 3 ? 260 : 320
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(' + min + 'px, 100%), 1fr))', gap: ESPACE.m }}>{children ?? enfants}</div>
}

/** Petit graphique en bâtons dans une carte : les derniers points en couleur. */
function MiniBarres({ serie }: { serie: number[] }) {
  const max = Math.max(1, ...serie)
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginTop: ESPACE.s }}>
      {serie.map((v, i) => (
        <span key={i} style={{ flex: 1, borderRadius: 3, height: Math.max(3, Math.round((v / max) * 32)),
          background: i >= serie.length - 3 ? 'var(--primary)' : 'var(--secondary)' }} />
      ))}
    </div>
  )
}

/** La tendance : ↗ +12 % en vert, ↘ −4 % en rouge. null : rien. */
function Tendance({ valeur }: { valeur: number | null | undefined }) {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return null
  const hausse = valeur >= 0
  return (
    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
      background: hausse ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--destructive) 12%, transparent)',
      color: hausse ? 'var(--success)' : 'var(--destructive)' }}>
      {(hausse ? '↗ +' : '↘ ') + new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(valeur) + ' %'}
    </span>
  )
}

/** LA CARTE MISE EN AVANT — le chiffre qui compte le plus, sur fond foncé. */
export function CarteVedette({ libelle, valeur, contexte, tendance, details = [] }: {
  libelle: string; valeur: string; contexte?: string; tendance?: number | null; details?: [string, string][]
}) {
  return (
    <div style={{ background: 'var(--vedette)', color: 'var(--vedette-foreground)', borderRadius: 'var(--radius-xl)', padding: ESPACE.l,
      display: 'flex', flexDirection: 'column', gap: ESPACE.s, position: 'relative', overflow: 'hidden' }}>
      <span aria-hidden="true" style={{ position: 'absolute', right: -50, top: -50, width: 170, height: 170, borderRadius: 999, border: '1px solid color-mix(in srgb, var(--vedette-foreground) 14%, transparent)' }} />
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, opacity: 0.8 }}>{libelle}</div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{valeur}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s, flexWrap: 'wrap', fontSize: 'var(--text-xs)', opacity: 0.85 }}>
        {tendance !== null && tendance !== undefined && Number.isFinite(tendance) && (
          <b style={{ fontWeight: 700 }}>{(tendance >= 0 ? '↗ +' : '↘ ') + new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(tendance) + ' %'}</b>
        )}{contexte}
      </div>
      {details.map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: ESPACE.s, fontSize: 'var(--text-xs)', paddingTop: ESPACE.s,
          borderTop: '1px solid color-mix(in srgb, var(--vedette-foreground) 14%, transparent)' }}>
          <span style={{ opacity: 0.75 }}>{l}</span><b>{v}</b>
        </div>
      ))}
    </div>
  )
}

type Point = { libelle: string; valeur: number }

function CadreGraphique({ titre, description, valeur, children }: { titre: string; description?: string; valeur?: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARTE, display: 'flex', flexDirection: 'column', gap: ESPACE.s, minWidth: 0 }}>
      <div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--foreground)' }}>{titre}</div>
        {description !== undefined && <div style={ROLE.legende as React.CSSProperties}>{description}</div>}
      </div>
      {valeur !== undefined && <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>{valeur}</div>}
      {children}
    </div>
  )
}

/** LA COURBE — une série dans le temps, avec ou sans la période précédente en pointillé. */
export function Courbe({ titre, description, valeur, points, comparaison }: {
  titre: string; description?: string; valeur?: string; points: Point[]; comparaison?: number[]
}) {
  if (points.length === 0) return <CadreGraphique titre={titre} description={description}><EtatVide message="Pas encore de données" detail="La courbe apparaîtra dès les premiers ajouts." /></CadreGraphique>
  const L = 600, H = 180, n = points.length
  const max = Math.max(1, ...points.map((p) => p.valeur), ...(comparaison ?? []))
  const x = (i: number) => (n === 1 ? L / 2 : (i * L) / (n - 1))
  const y = (v: number) => H - 8 - (v / max) * (H - 24)
  const trace = points.map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.valeur).toFixed(1)).join(' ')
  const id = 'grad-' + titre.replace(/[^a-z0-9]/gi, '').slice(0, 12)
  return (
    <CadreGraphique titre={titre} description={description} valeur={valeur}>
      <svg viewBox={'0 0 ' + L + ' ' + H} preserveAspectRatio="none" role="img" aria-label={titre} style={{ width: '100%', height: 180 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={L} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="4 6" />)}
        {comparaison !== undefined && comparaison.length > 1 && (
          <path d={comparaison.map((v, i) => (i === 0 ? 'M' : 'L') + ((i * L) / (comparaison.length - 1)).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')}
            fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
        )}
        <path d={trace + ' L' + x(n - 1).toFixed(1) + ' ' + H + ' L' + x(0).toFixed(1) + ' ' + H + ' Z'} fill={'url(#' + id + ')'} />
        <path d={trace} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...(ROLE.legende as React.CSSProperties) }}>
        {points.map((p, i) => <span key={i}>{p.libelle}</span>)}
      </div>
    </CadreGraphique>
  )
}

/** LES BARRES — une valeur par période ou par catégorie ; la dernière en couleur. */
export function Barres({ titre, description, valeur, points }: { titre: string; description?: string; valeur?: string; points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.valeur))
  return (
    <CadreGraphique titre={titre} description={description} valeur={valeur}>
      {points.length === 0 ? <EtatVide message="Pas encore de données" /> : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: ESPACE.m, height: 190, paddingTop: ESPACE.m }}>
          {points.map((p, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{p.valeur}</span>
              <div style={{ width: '100%', maxWidth: 48, borderRadius: '8px 8px 3px 3px', height: Math.max(4, Math.round((p.valeur / max) * 140)),
                background: i === points.length - 1 ? 'var(--primary)' : 'var(--accent)' }} />
              <span style={{ ...(ROLE.legende as React.CSSProperties), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.libelle}</span>
            </div>
          ))}
        </div>
      )}
    </CadreGraphique>
  )
}

/** L'ANNEAU — une répartition (par état, par type). */
export function Anneau({ titre, description, parts }: { titre: string; description?: string; parts: Point[] }) {
  const total = parts.reduce((s, p) => s + p.valeur, 0)
  const teintes = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
  let cumul = 0
  const arcs = parts.map((p, i) => {
    const debut = total === 0 ? 0 : (cumul / total) * 100
    cumul += p.valeur
    const fin = total === 0 ? 0 : (cumul / total) * 100
    return teintes[i % teintes.length] + ' ' + debut.toFixed(2) + '% ' + fin.toFixed(2) + '%'
  })
  return (
    <CadreGraphique titre={titre} description={description}>
      {total === 0 ? <EtatVide message="Pas encore de données" /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE.l, flexWrap: 'wrap', paddingTop: ESPACE.s }}>
          <div style={{ width: 132, height: 132, borderRadius: 999, background: 'conic-gradient(' + arcs.join(', ') + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 96, height: 96, borderRadius: 999, background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--foreground)' }}>{total}</span>
              <span style={ROLE.legende as React.CSSProperties}>au total</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACE.s, flex: 1, minWidth: 120 }}>
            {parts.map((p, i) => (
              <div key={p.libelle} style={{ display: 'flex', alignItems: 'center', gap: ESPACE.s, fontSize: 'var(--text-sm)', color: 'var(--foreground)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: teintes[i % teintes.length] }} />{p.libelle}
                <b style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{p.valeur}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </CadreGraphique>
  )
}

/** LE CLASSEMENT — d'où viennent les choses (quartier, produit, canal). */
export function Classement({ titre, description, lignes }: { titre: string; description?: string; lignes: Point[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur))
  return (
    <CadreGraphique titre={titre} description={description}>
      {lignes.length === 0 ? <EtatVide message="Pas encore de données" /> : lignes.slice(0, 6).map((l, i) => (
        <div key={l.libelle} style={{ paddingTop: ESPACE.s }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--foreground)' }}>
            <b>{l.libelle}</b><span style={{ fontVariantNumeric: 'tabular-nums' }}>{l.valeur}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--secondary)', marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: Math.round((l.valeur / max) * 100) + '%', background: i % 2 ? 'var(--chart-2)' : 'var(--primary)' }} />
          </div>
        </div>
      ))}
    </CadreGraphique>
  )
}

/** LES DERNIERS AJOUTS — les éléments les plus récents, toutes tables confondues. */
export function ListeRecente({ titre = 'Derniers ajouts', elements, action, surAction, onAction, onClick }: {
  titre?: string; elements: { titre: string; detail?: string; genre?: string; quand?: string }[]
  action?: string; surAction?: () => void; onAction?: () => void; onClick?: () => void
}) {
  const agir = onClick ?? surAction ?? onAction
  return (
    <div style={{ ...CARTE, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: ESPACE.m + 'px ' + ESPACE.l + 'px' }}>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--foreground)' }}>{titre}</div>
        {action !== undefined && agir !== undefined && <button type="button" onClick={agir} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{action}</button>}
      </div>
      {elements.length === 0 && <div style={{ padding: '0 ' + ESPACE.l + 'px ' + ESPACE.l + 'px' }}><EtatVide message="Rien pour l'instant" detail="Les derniers ajouts apparaîtront ici." /></div>}
      {elements.slice(0, 6).map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: ESPACE.m, padding: (ESPACE.s + 4) + 'px ' + ESPACE.l + 'px', borderTop: '1px solid var(--border)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            background: 'var(--accent)', color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>{(e.titre || '?').charAt(0).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titre}</div>
            {e.detail !== undefined && <div style={ROLE.legende as React.CSSProperties}>{e.detail}</div>}
          </div>
          {e.genre !== undefined && <Pastille ton="neutre">{e.genre}</Pastille>}
          {e.quand !== undefined && <span style={{ ...(ROLE.legende as React.CSSProperties), whiteSpace: 'nowrap' }}>{e.quand}</span>}
        </div>
      ))}
    </div>
  )
}
`

/** Les calculs du tableau de bord — sur les vraies données, jamais en dur. */
const DONNEES = `/** LES DONNÉES DU TABLEAU DE BORD — fournies par Deribfy, ne pas réécrire.
 *
 * Chaque chiffre et chaque graphique de l'accueil se CALCULE ici, à partir
 * des vraies lignes de l'application. Aucun nombre ne s'écrit en dur : un
 * tableau de bord aux chiffres inventés montre la même chose à tout le
 * monde — et ment à chacun.
 */

export type Point = { libelle: string; valeur: number }

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

/** Lit une date (texte ISO, horodatage, Date) ; null si illisible. */
export function lireDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function valeur(e: unknown, champ: string): unknown {
  return e !== null && typeof e === 'object' ? (e as Record<string, unknown>)[champ] : undefined
}

/** Combien d'éléments par mois, sur les nombre derniers mois (le mois courant inclus). */
export function parMois(elements: readonly unknown[], champ: string, nombre = 6): Point[] {
  const maintenant = new Date()
  const cases: Point[] = []
  const index = new Map<string, number>()
  for (let i = nombre - 1; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1)
    index.set(d.getFullYear() + '-' + d.getMonth(), cases.length)
    cases.push({ libelle: MOIS[d.getMonth()]!, valeur: 0 })
  }
  for (const e of elements) {
    const d = lireDate(valeur(e, champ))
    if (d === null) continue
    const k = index.get(d.getFullYear() + '-' + d.getMonth())
    if (k !== undefined) cases[k]!.valeur++
  }
  return cases
}

/** Combien d'éléments par jour, sur les nombre derniers jours. */
export function parJour(elements: readonly unknown[], champ: string, nombre = 7): Point[] {
  const aujourdHui = new Date(); aujourdHui.setHours(0, 0, 0, 0)
  const cases: Point[] = []
  const index = new Map<number, number>()
  for (let i = nombre - 1; i >= 0; i--) {
    const d = new Date(aujourdHui); d.setDate(d.getDate() - i)
    index.set(d.getTime(), cases.length)
    cases.push({ libelle: JOURS[d.getDay()]!, valeur: 0 })
  }
  for (const e of elements) {
    const d = lireDate(valeur(e, champ))
    if (d === null) continue
    const j = new Date(d); j.setHours(0, 0, 0, 0)
    const k = index.get(j.getTime())
    if (k !== undefined) cases[k]!.valeur++
  }
  return cases
}

/** La somme d'un champ chiffré, par mois — pour une courbe de montants. */
export function sommeParMois(elements: readonly unknown[], champDate: string, champMontant: string, nombre = 6): Point[] {
  const maintenant = new Date()
  const cases: Point[] = []
  const index = new Map<string, number>()
  for (let i = nombre - 1; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1)
    index.set(d.getFullYear() + '-' + d.getMonth(), cases.length)
    cases.push({ libelle: MOIS[d.getMonth()]!, valeur: 0 })
  }
  for (const e of elements) {
    const d = lireDate(valeur(e, champDate))
    const m = Number(valeur(e, champMontant))
    if (d === null || !Number.isFinite(m)) continue
    const k = index.get(d.getFullYear() + '-' + d.getMonth())
    if (k !== undefined) cases[k]!.valeur += m
  }
  return cases
}

/** Combien d'éléments par valeur d'un champ (état, quartier, catégorie), du plus grand au plus petit. */
export function compterPar(elements: readonly unknown[], champ: string, libelles: Record<string, string> = {}): Point[] {
  const c = new Map<string, number>()
  for (const e of elements) {
    const brut = valeur(e, champ)
    const k = typeof brut === 'boolean' ? (brut ? 'oui' : 'non') : brut === null || brut === undefined || brut === '' ? 'non renseigné' : String(brut)
    c.set(k, (c.get(k) ?? 0) + 1)
  }
  return [...c.entries()].map(([k, n]) => ({ libelle: libelles[k] ?? k, valeur: n })).sort((a, b) => b.valeur - a.valeur)
}

/** La somme d'un champ chiffré. */
export function somme(elements: readonly unknown[], champ: string): number {
  let s = 0
  for (const e of elements) { const n = Number(valeur(e, champ)); if (Number.isFinite(n)) s += n }
  return s
}

/** Les éléments dont la date tombe dans les jours derniers jours (décalés de decalage jours). */
export function recents(elements: readonly unknown[], champ: string, jours = 30, decalage = 0): unknown[] {
  const fin = Date.now() - decalage * 86400000
  const debut = fin - jours * 86400000
  return elements.filter((e) => { const d = lireDate(valeur(e, champ)); return d !== null && d.getTime() > debut && d.getTime() <= fin })
}

/** L'évolution en % entre deux périodes ; null si la période précédente est vide. */
export function tendance(actuel: number, precedent: number): number | null {
  if (!Number.isFinite(actuel) || !Number.isFinite(precedent) || precedent === 0) return null
  return ((actuel - precedent) / precedent) * 100
}

/** Les nombre éléments les plus récents d'après un champ date. */
export function plusRecents<T>(elements: readonly T[], champ: string, nombre = 5): T[] {
  return [...elements]
    .filter((e) => lireDate(valeur(e, champ)) !== null)
    .sort((a, b) => lireDate(valeur(b, champ))!.getTime() - lireDate(valeur(a, champ))!.getTime())
    .slice(0, nombre)
}

/** « à l'instant », « il y a 2 h », « hier », « 9 nov. ». */
export function ilYA(v: unknown): string {
  const d = lireDate(v)
  if (d === null) return ''
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min'
  if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h'
  if (s < 172800) return 'hier'
  return d.getDate() + ' ' + MOIS[d.getMonth()]
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
    ['systeme/donnees.ts', DONNEES],
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
     obligatoire ; tendance=, serie=), EnTeteDeSection, Pastille, Bouton,
     EtatVide (message=, detail=), et le TABLEAU DE BORD : CoqueGestion,
     GrilleTableau, CarteVedette, Courbe, Barres, Anneau, Classement,
     ListeRecente, ChoixApparence.
   · ./systeme/donnees : parMois, parJour, sommeParMois, compterPar, somme,
     recents, tendance, plusRecents, ilYA.

   UN ESPACE DE GESTION = <CoqueGestion> (jamais ta propre barre ; chaque
   section porte nombre= de sa table) qui S'OUVRE SUR « Accueil », un
   tableau de bord composé selon CES données : 3-4 CarteDeChiffre
   (tendance des 30 derniers jours si une date existe) ; un montant →
   CarteVedette + Courbe(sommeParMois) ; une date → Courbe/Barres(parMois) ;
   un état → Anneau(compterPar) ; une catégorie ou un lieu →
   Classement(compterPar) ; puis ListeRecente. Seulement les blocs qui ont
   un sens ici. AUCUN chiffre en dur : tout sort de ./systeme/donnees.
   « Réglages » contient <ChoixApparence /> (fond et couleur).

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
