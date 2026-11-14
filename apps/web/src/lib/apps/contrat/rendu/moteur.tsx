/**
 * V3 — LE MOTEUR DE RENDU (code de l'application générée, web).
 *
 * Il ne reçoit AUCUN code du modèle : une spec compilée (écrans du contrat,
 * textes à clés de Deribfy, dictionnaires) et une source de données. Ce que
 * chaque écran gagne sans que personne l'écrive :
 *   - les CINQ ÉTATS de toute donnée (Lignes, Fiche) : squelette pendant
 *     l'attente — jamais l'état vide —, erreur avec « Réessayer », vide avec
 *     son appel à l'action, partiel avec un bandeau, idéal ;
 *   - TROIS CLASSES DE LARGEUR : compact < 600, moyen 600–839, étendu ≥ 840 ;
 *   - la DROITE-À-GAUCHE par propriétés logiques (inline-start/end), jamais
 *     left/right ; `lang` et `dir` posés sur le document ;
 *   - des CIBLES d'au moins 48 × 48 ;
 *   - deux thèmes (`data-theme="clair" | "sombre"` sur le document).
 * Conventions du juge d'expérience tenues : `#racine`, `main`, la barre
 * `nav[aria-label="Navigation"]`, la route dans le fragment, `data-langue`,
 * la garde `data-deribfy="garde"` / `data-role`.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import type { Ligne, Source } from './donnees'
import { texteSysteme, type CleSysteme } from './textes-systeme'

export type TexteCompile = string | { readonly $k: string; readonly $t: string }
export type Noeud = { readonly composant: string } & Readonly<Record<string, unknown>>
export type EcranCompile = {
  readonly route: string
  readonly acces: string
  readonly titre: TexteCompile
  readonly icone?: string
  readonly etat?: readonly { readonly nom: string; readonly nature: string; readonly initial?: unknown }[]
  readonly corps: readonly Noeud[]
  readonly tetrade?: { readonly table: string; readonly vue: string }
}
export type LangueApp = { readonly code: string; readonly dir: 'ltr' | 'rtl'; readonly libelle: string }
export type AppCompilee = {
  readonly nom: string
  readonly langues: readonly LangueApp[]
  readonly devise: string | null
  readonly ecrans: readonly EcranCompile[]
  readonly barre: readonly string[]
  readonly dictionnaires: Readonly<Record<string, Readonly<Record<string, string>>>>
  /** Le kit de couleurs de l'application (V4.3d) : un monde visuel propre à chaque œuvre. */
  readonly kit?: string
}

type Action = Readonly<Record<string, unknown>> & { readonly faire: string }
type Portee = { readonly ligne: Ligne; readonly table: string } | null
type Largeur = 'compact' | 'moyen' | 'etendu'
type Theme = 'clair' | 'sombre'
type Session = { readonly role: string; readonly utilisateur: string | null }

export const classeDeLargeur = (l: number): Largeur => (l < 600 ? 'compact' : l < 840 ? 'moyen' : 'etendu')

// ── LES JETONS : des noms du contrat → des variables CSS ou des pas.
const ESPACE: Readonly<Record<string, number>> = { aucun: 0, xs: 4, s: 8, m: 16, l: 24, xl: 32 }
const RAYON: Readonly<Record<string, number>> = { aucun: 0, s: 4, m: 8, l: 16, plein: 999 }
const TAILLE: Readonly<Record<string, number>> = { legende: 13, corps: 16, sousTitre: 18, titre: 22, grandTitre: 28 }
const OMBRE: Readonly<Record<string, string>> = { plat: 'none', leve: '0 1px 3px var(--dx-ombre)', flottant: '0 6px 18px var(--dx-ombre)' }
const couleur = (n: unknown, defaut: string) => `var(--dx-${typeof n === 'string' ? n : defaut})`
const CIBLE = 48

// ── LES KITS (V4.3d) : un monde de couleurs par application, chacun en clair ET en sombre.
// Jetons : fond, surface, barre (menu), texte, texteDiscret, texteNav, accent, surAccent,
// succes, alerte, danger, bordure, ombre, squelette. Contraste ≥ 4,5:1 vérifié par cliquet.
export type Palette = Readonly<Record<'fond' | 'surface' | 'barre' | 'texte' | 'texteDiscret' | 'texteNav' | 'accent' | 'surAccent' | 'succes' | 'alerte' | 'danger' | 'bordure' | 'ombre' | 'squelette', string>>
export const KITS: Readonly<Record<string, { readonly nom: string; readonly clair: Palette; readonly sombre: Palette; readonly defaut: 'clair' | 'sombre' }>> = {
  azur: { nom: 'Azur', defaut: 'clair',
    clair: { fond: '#f4f6fa', surface: '#ffffff', barre: '#ffffff', texte: '#121826', texteDiscret: '#5b6475', texteNav: '#3a4253', accent: '#3157d5', surAccent: '#ffffff', succes: '#1d7a46', alerte: '#9a5b00', danger: '#c0262d', bordure: '#e3e7ee', ombre: 'rgba(17,24,39,.06)', squelette: '#e9edf3' },
    sombre: { fond: '#0f1320', surface: '#161b2b', barre: '#121726', texte: '#e8ebf3', texteDiscret: '#a3abbd', texteNav: '#c4cad8', accent: '#8aa6ff', surAccent: '#0b1230', succes: '#6fd39a', alerte: '#f0c06a', danger: '#ff8f8a', bordure: '#283048', ombre: 'rgba(0,0,0,.4)', squelette: '#222a3e' } },
  terracotta: { nom: 'Terracotta', defaut: 'clair',
    clair: { fond: '#f5f0e8', surface: '#fbf8f3', barre: '#f1ebe1', texte: '#23211d', texteDiscret: '#6b645a', texteNav: '#3d3a34', accent: '#b0431a', surAccent: '#ffffff', succes: '#2f6b4f', alerte: '#855610', danger: '#a3281f', bordure: '#e4dccf', ombre: 'rgba(60,40,20,.07)', squelette: '#ebe3d6' },
    sombre: { fond: '#1a1714', surface: '#24201c', barre: '#1f1b18', texte: '#f2ebe2', texteDiscret: '#bcb1a3', texteNav: '#d9cfc3', accent: '#ef8a5c', surAccent: '#1a0d06', succes: '#7fcf9f', alerte: '#e8b866', danger: '#ff8f80', bordure: '#3a332c', ombre: 'rgba(0,0,0,.45)', squelette: '#2e2823' } },
  nuit: { nom: 'Nuit', defaut: 'sombre',
    clair: { fond: '#f6f3f0', surface: '#ffffff', barre: '#ffffff', texte: '#1b1714', texteDiscret: '#62584f', texteNav: '#3a322c', accent: '#9c4f2b', surAccent: '#ffffff', succes: '#2d7a4b', alerte: '#855610', danger: '#b42318', bordure: '#e6ddd5', ombre: 'rgba(30,20,10,.07)', squelette: '#ece5de' },
    sombre: { fond: '#070605', surface: '#13100e', barre: '#0b0908', texte: '#f3ece6', texteDiscret: '#a99d92', texteNav: '#d4c9bf', accent: '#d9875a', surAccent: '#1a0b03', succes: '#6fd39a', alerte: '#f0c06a', danger: '#ff8a80', bordure: '#2a2420', ombre: 'rgba(0,0,0,.6)', squelette: '#1f1a17' } },
  savane: { nom: 'Savane', defaut: 'clair',
    clair: { fond: '#f3f6f2', surface: '#ffffff', barre: '#ffffff', texte: '#16201a', texteDiscret: '#55625a', texteNav: '#34413a', accent: '#1d7148', surAccent: '#ffffff', succes: '#1d7148', alerte: '#8a5a00', danger: '#b42318', bordure: '#dfe6e0', ombre: 'rgba(16,40,24,.06)', squelette: '#e7ede8' },
    sombre: { fond: '#0e1511', surface: '#151e18', barre: '#111914', texte: '#e6efe9', texteDiscret: '#a2b2a8', texteNav: '#c2cfc6', accent: '#6fd3a0', surAccent: '#06150d', succes: '#6fd3a0', alerte: '#f0c06a', danger: '#ff8a80', bordure: '#26332b', ombre: 'rgba(0,0,0,.45)', squelette: '#1e2a23' } },
}
const varsDe = (p: Palette) => Object.entries(p).map(([k, v]) => `--dx-${k}:${v}`).join(';')
const STYLE = `
:root{${varsDe(KITS.azur!.clair)}}
${Object.entries(KITS).map(([id, k]) => `:root[data-kit="${id}"]{${varsDe(k.clair)}}:root[data-kit="${id}"][data-theme="sombre"]{${varsDe(k.sombre)}}`).join('\n')}
:root[data-theme="sombre"]:not([data-kit]){${varsDe(KITS.azur!.sombre)}}
html,body{margin:0;background:var(--dx-fond);color:var(--dx-texte);font-family:"Inter","SF Pro Text",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;-webkit-font-smoothing:antialiased}
.dx-chiffre{font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.dx-carte{background:var(--dx-surface);border:1px solid var(--dx-bordure);border-radius:14px;box-shadow:0 1px 2px var(--dx-ombre)}
.dx-doux{background:color-mix(in srgb,var(--dx-accent) 12%,var(--dx-surface))}
*{box-sizing:border-box}
#racine{min-height:100vh;overflow-x:hidden}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--dx-accent);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){[data-squelette]{animation:dx-pulse 1.2s ease-in-out infinite}}
@keyframes dx-pulse{50%{opacity:.55}}
`

// ── LE CONTEXTE.
type Ctx = {
  readonly app: AppCompilee
  readonly magasin: Source
  readonly langue: string
  readonly largeur: Largeur
  readonly session: Session
  readonly parcours: ReadonlyMap<string, Ligne>
  readonly etats: Readonly<Record<string, unknown>>
  readonly brouillons: Readonly<Record<string, unknown>>
  readonly poserEtat: (nom: string, v: unknown) => void
  readonly poserBrouillon: (cle: string, v: unknown) => void
  readonly executer: (effets: unknown, portee: Portee) => void
  readonly t: (x: unknown) => string
  readonly s: (c: CleSysteme) => string
}
const Contexte = createContext<Ctx | null>(null)
const useCtx = (): Ctx => { const c = useContext(Contexte); if (c === null) throw new Error('moteur hors contexte'); return c }

function useLecture(magasin: Source, table: string) {
  return useSyncExternalStore((e) => magasin.abonner(e), () => magasin.lire(table))
}

const chaine = (x: unknown): string | null => (typeof x === 'string' ? x : null)
const liste = (x: unknown): readonly unknown[] => (Array.isArray(x) ? x : [])
const objet = (x: unknown): Readonly<Record<string, unknown>> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null)
const liaisonDe = (x: unknown): string | null => chaine(objet(x)?.$data)

function vrai(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'string') return v.trim() !== ''
  return Boolean(v)
}

function valeurDe(d: string, c: Ctx, portee: Portee): unknown {
  if (d in c.brouillons) return c.brouillons[d]
  const [source, a, b] = d.split('.')
  switch (source) {
    case 'table': return a !== undefined ? c.magasin.lire(a).lignes : []
    case 'ligne': return a !== undefined && portee !== null ? portee.ligne[a] : undefined
    case 'parcours': return a !== undefined && b !== undefined ? c.parcours.get(a)?.[b] : undefined
    case 'etat': return a !== undefined ? c.etats[a] : undefined
    case 'session': return a === 'role' ? c.session.role : a === 'utilisateur' ? c.session.utilisateur : undefined
    default: return undefined
  }
}

function formater(v: unknown, format: string | null, c: Ctx): string {
  if (v === null || v === undefined || v === '') return '—'
  if (format === 'montant' && typeof v === 'number' || (format === 'montant' && !Number.isNaN(Number(v)))) {
    const n = Number(v)
    return c.app.devise !== null ? new Intl.NumberFormat(c.langue, { style: 'currency', currency: c.app.devise, maximumFractionDigits: 0 }).format(n) : new Intl.NumberFormat(c.langue).format(n)
  }
  if (format === 'nombre' && !Number.isNaN(Number(v))) return new Intl.NumberFormat(c.langue).format(Number(v))
  if (format === 'date') { const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(c.langue) }
  return String(v)
}

// ── LES PICTOGRAMMES : un tracé par icône du catalogue (les flèches se retournent en droite-à-gauche).
const TRACES: Readonly<Record<string, string>> = {
  accueil: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z', recherche: 'M10 4a6 6 0 104.5 10l5 5 1.5-1.5-5-5A6 6 0 0010 4z', filtre: 'M3 5h18l-7 8v6l-4 2v-8z',
  calendrier: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', horloge: 'M12 3a9 9 0 110 18 9 9 0 010-18zm0 4v5l3 3', paiement: 'M3 6h18v12H3zM3 10h18',
  document: 'M6 3h9l4 4v14H6zM14 3v5h5', message: 'M4 5h16v11H8l-4 4z', utilisateur: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  reglages: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4', aide: 'M12 3a9 9 0 110 18 9 9 0 010-18zM9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 17v.5',
  localisation: 'M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 8a2 2 0 110 4 2 2 0 010-4z', valide: 'M4 12l5 5L20 6', fermer: 'M5 5l14 14M19 5L5 19',
  alerte: 'M12 3l10 18H2zM12 10v5M12 18v.5', information: 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 11v6M12 7.5v.5', ajouter: 'M12 5v14M5 12h14',
  modifier: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', supprimer: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', retour: 'M15 5l-7 7 7 7', suivant: 'M9 5l7 7-7 7',
  partager: 'M18 8a3 3 0 10-3-3l-7 4a3 3 0 100 6l7 4a3 3 0 103-3', telephone: 'M5 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z',
  courriel: 'M3 6h18v12H3zM3 6l9 7 9-7',
  // Ceux des médias (posés par le moteur seul).
  appareil: 'M3 8h4l2-3h6l2 3h4v12H3zM12 10a4 4 0 110 8 4 4 0 010-8z', image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01',
}
const DIRECTIONNELLES = new Set(['retour', 'suivant'])
function Picto({ nom, coul }: { nom: string; coul?: unknown }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false"
      style={{ flex: 'none', color: couleur(coul, 'texte'), transform: DIRECTIONNELLES.has(nom) ? 'scaleX(var(--dx-sens, 1))' : undefined }}>
      <path d={TRACES[nom] ?? 'M12 4a8 8 0 110 16 8 8 0 010-16z'} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── LES BOUTONS : une cible d'au moins 48 × 48, quel que soit le genre.
const FONDS: Readonly<Record<string, [string, string, string]>> = {
  principal: ['var(--dx-accent)', 'var(--dx-surAccent)', 'transparent'],
  secondaire: ['var(--dx-surface)', 'var(--dx-texte)', 'var(--dx-bordure)'],
  discret: ['transparent', 'var(--dx-accent)', 'transparent'],
  danger: ['var(--dx-surface)', 'var(--dx-danger)', 'var(--dx-danger)'],
}
function BoutonBrut({ libelle, genre, icone, surClic, presse, attributs }: { libelle: string; genre: string; icone?: string | null; surClic: () => void; presse?: boolean; attributs?: Readonly<Record<string, string>> }) {
  const [fond, texte, bord] = FONDS[genre] ?? FONDS.secondaire!
  return (
    <button type="button" onClick={surClic} aria-pressed={presse} {...attributs}
      style={{ minHeight: CIBLE, minWidth: CIBLE, paddingInline: 16, paddingBlock: 8, borderRadius: 8, border: `1px solid ${bord}`, background: fond, color: texte,
        fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}>
      {icone ? <Picto nom={icone} coul={genre === 'principal' ? 'surAccent' : genre === 'danger' ? 'danger' : 'accent'} /> : null}
      <span>{libelle}</span>
    </button>
  )
}

// ── LES ÉTATS D'UNE DONNÉE.
function Squelette() {
  const { s } = useCtx()
  return (
    <div data-etat="chargement" aria-busy="true" role="status" style={{ display: 'grid', gap: 12 }}>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{s('chargement')}</span>
      {[0, 1, 2].map((i) => <div key={i} data-squelette="" style={{ height: 56, borderRadius: 8, background: 'var(--dx-squelette)' }} />)}
    </div>
  )
}
function EtatErreur() {
  const c = useCtx()
  return (
    <div data-etat="erreur" role="alert" style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 8, border: '1px solid var(--dx-danger)', background: 'var(--dx-surface)' }}>
      <p style={{ margin: 0, color: 'var(--dx-danger)' }}>{c.s('erreur')}</p>
      <div><BoutonBrut libelle={c.s('reessayer')} genre="secondaire" icone="retour" surClic={() => { c.executer([{ faire: 'emit', evenement: 'rafraichir' }], null) }} /></div>
    </div>
  )
}
function EtatVide({ n, portee }: { n: Noeud; portee: Portee }) {
  const c = useCtx()
  // L'appel à l'action ne s'affiche que s'il agit (videSi) : « Effacer la recherche » sur une recherche vide ne s'affiche pas.
  const action = 'videSi' in n && !vrai(valeurDe(liaisonDe(n.videSi) ?? '', c, portee)) ? [] : liste(n.videAction)
  return (
    <div data-etat="vide" style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 8, border: '1px dashed var(--dx-bordure)', background: 'var(--dx-surface)', textAlign: 'start' }}>
      <p style={{ margin: 0, color: 'var(--dx-texteDiscret)' }}>{n.vide !== undefined ? c.t(n.vide) : c.s('vide')}</p>
      {action.length > 0 ? <div><BoutonBrut libelle={c.t(n.videLibelle ?? '…')} genre="principal" surClic={() => { c.executer(action, portee) }} /></div> : null}
    </div>
  )
}
function Bandeau() {
  const { s } = useCtx()
  return <p role="status" style={{ margin: 0, padding: 12, borderRadius: 8, background: 'var(--dx-surface)', border: '1px solid var(--dx-alerte)', color: 'var(--dx-alerte)' }}>{s('partiel')}</p>
}

function Lignes({ n, portee }: { n: Noeud; portee: Portee }) {
  const c = useCtx()
  const table = (liaisonDe(n.donnee) ?? '').split('.')[1] ?? ''
  const lecture = useLecture(c.magasin, table)
  if (lecture.etat === 'attente') return <Squelette />
  if (lecture.etat === 'erreur') return <EtatErreur />
  const filtres = liste(n.filtre).map(objet).filter((f): f is Readonly<Record<string, unknown>> => f !== null)
  const lignes = lecture.lignes.filter((l) => filtres.every((f) => {
    const v = valeurDe(liaisonDe(f.egal) ?? '', c, portee)
    return !vrai(v) || String(l[String(f.champ)] ?? '') === String(v)
  }))
  if (lignes.length === 0) return <EtatVide n={n} portee={portee} />
  // « liste » : des rangées, les plus récentes d'abord, bornées par `limite` (les derniers ajouts).
  const enListe = n.disposition === 'liste' || n.disposition === 'recents'
  const limite = n.disposition === 'recents' ? 5 : null
  const ordonnees = enListe ? [...lignes].sort((a, b) => (dateDe(b)?.getTime() ?? 0) - (dateDe(a)?.getTime() ?? 0)) : lignes
  const montrees = limite !== null ? ordonnees.slice(0, limite) : ordonnees
  const colonnes = enListe || c.largeur === 'compact' ? 1 : c.largeur === 'moyen' ? 2 : 3
  return (
    <div data-etat={lecture.etat === 'partiel' ? 'partiel' : 'ideal'} style={{ display: 'grid', gap: 12 }}>
      {lecture.etat === 'partiel' ? <Bandeau /> : null}
      <div className={enListe ? 'dx-carte' : undefined} style={{ display: 'grid', gap: enListe ? 0 : 12, gridTemplateColumns: `repeat(${String(colonnes)}, minmax(0, 1fr))` }}>
        {enListe && n.titre !== undefined
          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingInline: 20, paddingBlock: 14, borderBlockEnd: '1px solid var(--dx-bordure)' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{c.t(n.titre)}</h2>
              {liste(n.voirTout).length > 0 ? <button type="button" onClick={() => { c.executer(n.voirTout, null) }} style={{ minHeight: CIBLE, border: 0, background: 'transparent', color: 'var(--dx-accent)', fontWeight: 600, cursor: 'pointer', paddingInline: 4 }}>{c.s('voirTout')} <span aria-hidden="true" style={{ display: 'inline-block', transform: 'scaleX(var(--dx-sens, 1))' }}>→</span></button> : null}
            </div>
          : null}
        {montrees.map((l, k) => <div key={l.id} style={{ display: 'grid', gap: 8, minWidth: 0, ...(enListe ? { paddingInline: 20, paddingBlock: 12, borderBlockStart: k === 0 ? 'none' : '1px solid var(--dx-bordure)' } : {}) }}>{liste(n.modele).map((m, i) => <Rendu key={i} n={m} portee={{ ligne: l, table }} />)}</div>)}
      </div>
    </div>
  )
}

function Fiche({ n }: { n: Noeud }) {
  const c = useCtx()
  const table = (liaisonDe(n.donnee) ?? '').split('.')[1] ?? ''
  const lecture = useLecture(c.magasin, table)
  if (lecture.etat === 'attente') return <Squelette />
  if (lecture.etat === 'erreur') return <EtatErreur />
  const choisie = c.parcours.get(table)
  const ligne = choisie !== undefined ? lecture.lignes.find((l) => l.id === choisie.id) ?? null : null
  if (ligne === null) return <EtatVide n={n} portee={null} />
  return (
    <div data-etat={lecture.etat === 'partiel' ? 'partiel' : 'ideal'} style={{ display: 'grid', gap: 12 }}>
      {lecture.etat === 'partiel' ? <Bandeau /> : null}
      {liste(n.modele).map((m, i) => <Rendu key={i} n={m} portee={{ ligne, table }} />)}
    </div>
  )
}

// ── LES MÉDIAS (2026-11-14) : photo, vidéo, document joint, position — pour toute application.
const NATURES_MEDIA = new Set(['photo', 'video', 'fichier', 'localisation'])
const MO = 1024 * 1024
const LIMITE: Readonly<Record<string, number>> = { photo: 20 * MO, video: 50 * MO, fichier: 20 * MO }
const ACCEPTE: Readonly<Record<string, string>> = { photo: 'image/*', video: 'video/*', fichier: 'application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt,.ods' }
const estBlob = (v: unknown): v is Blob => typeof Blob !== 'undefined' && v instanceof Blob
/** Une valeur est-elle un média (fichier choisi, chemin gardé en base, adresse d'image ou de vidéo) ? */
function estMedia(v: unknown): boolean {
  if (estBlob(v)) return true
  return typeof v === 'string' && (/^(media:|blob:|data:(image|video|application)\/)/u.test(v) || /^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif|heic|mp4|webm|mov|pdf)(\?\S*)?$/iu.test(v))
}
function sorteDe(v: unknown, adresse: string): 'image' | 'video' | 'fichier' {
  const type = estBlob(v) ? v.type : /^data:([a-z]+)\//u.exec(adresse)?.[1] ?? /^blob:[^#]+#([a-z]+)\//u.exec(adresse)?.[1] ?? ''
  if (type.startsWith('image')) return 'image'
  if (type.startsWith('video')) return 'video'
  const ext = /\.([a-z0-9]+)(\?|$)/iu.exec(typeof v === 'string' ? v : adresse)?.[1]?.toLowerCase() ?? ''
  return /^(jpe?g|png|webp|gif|avif|heic)$/u.test(ext) ? 'image' : /^(mp4|webm|mov|m4v)$/u.test(ext) ? 'video' : 'fichier'
}
/** Une photo réduite AU TÉLÉPHONE avant l'envoi (1 600 px, JPEG) : moins de données, même lisibilité. */
async function reduire(f: File): Promise<File> {
  if (!f.type.startsWith('image/') || f.type === 'image/gif' || f.type === 'image/svg+xml' || typeof createImageBitmap === 'undefined') return f
  try {
    const b = await createImageBitmap(f)
    const k = Math.min(1, 1600 / Math.max(b.width, b.height))
    const toile = document.createElement('canvas')
    toile.width = Math.round(b.width * k); toile.height = Math.round(b.height * k)
    toile.getContext('2d')?.drawImage(b, 0, 0, toile.width, toile.height)
    const sortie = await new Promise<Blob | null>((ok) => { toile.toBlob(ok, 'image/jpeg', 0.85) })
    return sortie === null || sortie.size >= f.size ? f : new File([sortie], f.name.replace(/\.[^.]+$/u, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return f }
}
/** Ce qu'un média montre : l'image, la vidéo, ou le lien vers le document. */
function MediaVu({ v, alternative }: { v: unknown; alternative?: string }) {
  const c = useCtx()
  // Un fichier choisi : son adresse locale, rendue quand il change. Un chemin gardé en base : résolu (lien signé).
  const locale = useMemo(() => (estBlob(v) ? URL.createObjectURL(v) : null), [v])
  useEffect(() => () => { if (locale !== null) URL.revokeObjectURL(locale) }, [locale])
  const [resolue, poserResolue] = useState<{ readonly cle: string; readonly adresse: string | null } | null>(null)
  useEffect(() => {
    if (typeof v !== 'string' || !v.startsWith('media:')) return undefined
    let vivant = true
    void (c.magasin.media?.(v) ?? Promise.resolve(null)).then((a) => { if (vivant) poserResolue({ cle: v, adresse: a }) })
    return () => { vivant = false }
  }, [v, c.magasin])
  const adresse = locale ?? (typeof v !== 'string' ? null : v.startsWith('media:') ? (resolue?.cle === v ? resolue.adresse : null) : v)
  if (adresse === null) return <div aria-busy="true" style={{ inlineSize: '100%', maxInlineSize: 320, aspectRatio: '4 / 3', borderRadius: 8, background: 'var(--dx-squelette)' }} />
  const sorte = sorteDe(v, adresse)
  // Une application générée, pas une page Next : `next/image` n'y existe pas.
  // eslint-disable-next-line @next/next/no-img-element
  if (sorte === 'image') return <img data-media="image" src={adresse} alt={alternative ?? ''} style={{ display: 'block', maxInlineSize: '100%', inlineSize: 320, maxBlockSize: 320, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--dx-bordure)' }} />
  if (sorte === 'video') return <video data-media="video" src={adresse} controls playsInline style={{ display: 'block', maxInlineSize: '100%', inlineSize: 320, borderRadius: 8 }} />
  return <a data-media="fichier" href={adresse} target="_blank" rel="noreferrer" style={{ color: 'var(--dx-accent)', fontWeight: 600, overflowWrap: 'anywhere' }}>{estBlob(v) && 'name' in v ? String((v as File).name) : c.s('ouvrirFichier')}</a>
}
/** Un bouton qui OUVRE l'appareil ou la galerie : une étiquette de fichier (le juge ne la presse pas ; un test y dépose un vrai fichier). */
function BoutonFichier({ libelle, accepte, capture, principal, surFichier, icone }: { libelle: string; accepte: string; capture?: 'environment'; principal: boolean; surFichier: (f: File) => void; icone: string }) {
  const [fond, texte, bord] = FONDS[principal ? 'principal' : 'secondaire'] ?? FONDS.secondaire!
  return (
    <label className="dx-fichier" style={{ position: 'relative', minHeight: CIBLE, paddingInline: 16, paddingBlock: 8, borderRadius: 8, border: `1px solid ${bord}`, background: fond, color: texte, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
      <Picto nom={icone} coul={principal ? 'surAccent' : 'accent'} />
      <span>{libelle}</span>
      <input type="file" accept={accepte} {...(capture !== undefined ? { capture } : {})} onChange={(e) => { const f = e.target.files?.[0]; if (f !== undefined) surFichier(f); e.target.value = '' }}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', inlineSize: '100%', blockSize: '100%' }} />
    </label>
  )
}
function ChampMedia({ nature, libelle, requis, aide, v, poser }: { nature: string; libelle: string; requis: boolean; aide: string | null; v: unknown; poser: (x: unknown) => void }) {
  const c = useCtx()
  const [erreur, poserErreur] = useState<string | null>(null)
  // UNE PRISE SE VÉRIFIE (T1, norme des appareils photo) : une photo ou une vidéo prise attend
  // « Reprendre » ou « Valider » ; seule une prise validée entre dans le formulaire.
  const [enAttente, poserEnAttente] = useState<File | null>(null)
  const prendre = (f: File) => {
    const limite = LIMITE[nature] ?? 20 * MO
    if (f.size > limite) { poserErreur(c.s('tropLourd').replace('{n}', String(Math.round(limite / MO)))); return }
    poserErreur(null)
    void reduire(f).then((x) => { if (nature === 'fichier') poser(x); else poserEnAttente(x) })
  }
  const valider = () => { if (enAttente !== null) { poser(enAttente); poserEnAttente(null) } }
  const localiser = () => {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined) { poserErreur(c.s('positionIndisponible')); return }
    navigator.geolocation.getCurrentPosition(
      (p) => { poserErreur(null); poser(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`) },
      () => { poserErreur(c.s('positionIndisponible')) },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }
  const plein = v !== null && v !== undefined && v !== ''
  const champ: React.CSSProperties = { minHeight: CIBLE, width: '100%', paddingInline: 12, borderRadius: 8, border: '1px solid var(--dx-bordure)', background: 'var(--dx-surface)', boxSizing: 'border-box' }
  return (
    <div role="group" aria-label={libelle} data-nature={nature} style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{libelle}{requis ? ' *' : ''}</span>
      {nature === 'localisation'
        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input type="text" aria-label={libelle} value={typeof v === 'string' ? v : ''} onChange={(e) => { poser(e.target.value) }} style={{ ...champ, flex: '1 1 200px', width: 'auto' }} />
            <BoutonBrut libelle={c.s('maPosition')} genre="secondaire" icone="localisation" surClic={localiser} />
          </div>
        : enAttente !== null
          ? <div data-attente="oui" style={{ display: 'grid', gap: 8 }}>
              <MediaVu v={enAttente} alternative={libelle} />
              <span role="status" style={{ fontSize: TAILLE.legende, color: 'var(--dx-alerte)', fontWeight: 600 }}>{c.s('verifierPrise')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <BoutonFichier libelle={c.s('reprendre')} accepte={ACCEPTE[nature] ?? '*/*'} capture="environment" principal={false} icone="appareil" surFichier={prendre} />
                <BoutonBrut libelle={c.s('valider')} genre="principal" icone="valide" surClic={valider} />
              </div>
            </div>
          : <>
            {plein ? <MediaVu v={v} alternative={libelle} /> : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {nature === 'photo' ? <>
                  <BoutonFichier libelle={c.s('prendrePhoto')} accepte={ACCEPTE.photo!} capture="environment" principal={!plein} icone="appareil" surFichier={prendre} />
                  <BoutonFichier libelle={c.s('choisirImage')} accepte={ACCEPTE.photo!} principal={false} icone="image" surFichier={prendre} />
                </>
                : nature === 'video' ? <>
                  <BoutonFichier libelle={c.s('filmer')} accepte={ACCEPTE.video!} capture="environment" principal={!plein} icone="appareil" surFichier={prendre} />
                  <BoutonFichier libelle={c.s('choisirVideo')} accepte={ACCEPTE.video!} principal={false} icone="image" surFichier={prendre} />
                </>
                : <BoutonFichier libelle={c.s('joindre')} accepte={ACCEPTE.fichier!} principal={!plein} icone="document" surFichier={prendre} />}
              {plein ? <BoutonBrut libelle={c.s('retirer')} genre="discret" surClic={() => { poser(null) }} /> : null}
            </div>
          </>}
      {erreur !== null ? <span role="alert" style={{ fontSize: TAILLE.legende, color: 'var(--dx-danger)' }}>{erreur}</span> : null}
      {aide !== null ? <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{aide}</span> : null}
    </div>
  )
}

function Champ({ n, portee }: { n: Noeud; portee: Portee }) {
  const c = useCtx()
  const d = liaisonDe(n.donnee) ?? ''
  const nature = chaine(n.nature) ?? 'texte'
  const v = valeurDe(d, c, portee)
  const poser = (x: unknown) => { if (d.startsWith('etat.')) c.poserEtat(d.slice(5), x); else c.poserBrouillon(d, x) }
  const libelle = c.t(n.libelle)
  const champ: React.CSSProperties = { minHeight: CIBLE, width: '100%', paddingInline: 12, borderRadius: 8, border: '1px solid var(--dx-bordure)', background: 'var(--dx-surface)' }
  if (NATURES_MEDIA.has(nature)) return <ChampMedia nature={nature} libelle={libelle} requis={n.requis === true} aide={n.aide !== undefined ? c.t(n.aide) : null} v={v} poser={poser} />
  if (nature === 'case') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: CIBLE }}>
        <input type="checkbox" checked={vrai(v)} onChange={(e) => { poser(e.target.checked) }} style={{ width: CIBLE, height: CIBLE, margin: 0, accentColor: 'var(--dx-accent)' }} />
        <span>{libelle}</span>
      </label>
    )
  }
  const types: Readonly<Record<string, string>> = { texte: 'text', nombre: 'number', date: 'date', courriel: 'email', telephone: 'tel', secret: 'password' }
  return (
    <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{libelle}{n.requis === true ? ' *' : ''}</span>
      {nature === 'choix'
        ? <select value={String(v ?? '')} onChange={(e) => { poser(e.target.value) }} style={champ}>
            <option value="">—</option>
            {liste(n.choix).map(objet).filter((o): o is Readonly<Record<string, unknown>> => o !== null).map((o) => <option key={String(o.valeur)} value={String(o.valeur)}>{c.t(o.libelle)}</option>)}
          </select>
        : <input type={types[nature] ?? 'text'} value={String(v ?? '')} onChange={(e) => { poser(e.target.value) }} style={champ} />}
      {n.aide !== undefined ? <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{c.t(n.aide)}</span> : null}
    </label>
  )
}

// ── V4.3f · LE TABLEAU DE BORD. Chaque chiffre est CALCULÉ ici, depuis les lignes réelles.
const COLONNES_DATE = ['created_at', 'cree_le', 'date_creation', 'date', 'date_inscription']
function dateDe(l: Ligne): Date | null {
  for (const k of COLONNES_DATE) { const v = l[k]; if (typeof v === 'string' || typeof v === 'number') { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d } }
  return null
}
const initialesDe = (t: string) => t.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('') || '·'
function Initiales({ texte }: { texte: string }) {
  return <span aria-hidden="true" className="dx-doux" style={{ inlineSize: 36, blockSize: 36, borderRadius: 999, display: 'inline-grid', placeItems: 'center', color: 'var(--dx-accent)', fontWeight: 700, fontSize: 14, flex: 'none' }}>{initialesDe(texte)}</span>
}
/** La carte d'un chiffre ou d'un graphique : son état dans `data-mesure` (`data-etat` reste aux listes et fiches, qui portent l'appel à l'action). */
function Carte({ children, etat }: { children: React.ReactNode; etat?: string }) {
  return <section className="dx-carte" data-mesure={etat} style={{ display: 'grid', gap: 10, padding: 20, minWidth: 0, alignContent: 'start' }}>{children}</section>
}
/** Un statut, coloré par son sens : réussi (vert), en cours (orange), refusé (rouge), sinon neutre. */
const TON_STATUT: readonly [RegExp, string][] = [
  [/pay|valid|confirm|actif|active|termin|livr|publi|complet|done|paid|success|approuv|accept/iu, 'succes'],
  [/attente|cours|brouillon|pending|draft|progress|nouveau|ouvert|open|planifi/iu, 'alerte'],
  [/annul|refus|rejet|echou|échou|cancel|fail|expir|bloqu|inactif|perdu/iu, 'danger'],
]
function PastilleStatut({ texte }: { texte: string }) {
  const ton = TON_STATUT.find(([r]) => r.test(texte))?.[1] ?? 'texteDiscret'
  return <span style={{ justifySelf: 'start', paddingInline: 10, paddingBlock: 3, borderRadius: 999, fontSize: 12, fontWeight: 650, color: `var(--dx-${ton})`, background: `color-mix(in srgb, var(--dx-${ton}) 13%, transparent)`, whiteSpace: 'nowrap' }}>{texte}</span>
}

/** Les réglages, dans le compte : la langue et l'apparence — jamais dans l'en-tête. */
function Reglages({ g }: { g: Global }) {
  const s = g.s
  return (
    <section className="dx-carte" style={{ display: 'grid', gap: 16, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{s('reglages')}</h2>
      {g.app.langues.length > 1
        ? <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--dx-texteDiscret)' }}>{s('langue')}</span>
            <div role="group" aria-label={s('langue')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {g.app.langues.map((l) => <BoutonBrut key={l.code} libelle={l.libelle} genre={l.code === g.langue ? 'principal' : 'secondaire'} presse={l.code === g.langue} attributs={{ 'data-langue': l.code, lang: l.code }} surClic={() => { g.poserLangue(l.code) }} />)}
            </div>
          </div>
        : null}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--dx-texteDiscret)' }}>{s('theme')}</span>
        <div role="group" aria-label={s('theme')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['clair', 'sombre'] as const).map((t) => <BoutonBrut key={t} libelle={s(t)} genre={t === g.theme ? 'principal' : 'secondaire'} presse={t === g.theme} surClic={() => { g.poserTheme(t) }} />)}
        </div>
      </div>
    </section>
  )
}

/** La table qu'un écran liste (sa première `Lignes`) : la source de son compteur dans le menu. */
function tableListee(e: EcranCompile): string | null {
  const trouver = (x: unknown): string | null => {
    if (Array.isArray(x)) { for (const y of x) { const r = trouver(y); if (r !== null) return r } return null }
    const o = objet(x)
    if (o === null) return null
    if (o.composant === 'Lignes') return (liaisonDe(o.donnee) ?? '').split('.')[1] ?? null
    for (const v of Object.values(o)) { const r = trouver(v); if (r !== null) return r }
    return null
  }
  return trouver(e.corps)
}
function Compteur({ magasin, table }: { magasin: Source; table: string }) {
  const l = useLecture(magasin, table)
  if (l.etat === 'attente' || l.etat === 'erreur') return null
  return <span className="dx-chiffre" style={{ marginInlineStart: 'auto', fontSize: 12, color: 'var(--dx-texteDiscret)', paddingInline: 8, paddingBlock: 1, borderRadius: 999, background: 'var(--dx-fond)' }}>{l.lignes.length}</span>
}

function Reessayer() {
  const c = useCtx()
  return <div><BoutonBrut libelle={c.s('reessayer')} genre="secondaire" icone="retour" surClic={() => { c.executer([{ faire: 'emit', evenement: 'rafraichir' }], null) }} /></div>
}
function Indicateur({ n }: { n: Noeud }) {
  const c = useCtx()
  const table = (liaisonDe(n.donnee) ?? '').split('.')[1] ?? ''
  const lecture = useLecture(c.magasin, table)
  // « Maintenant » est fixé une fois : un rendu ne lit pas l'horloge.
  const [maintenant] = useState(() => Date.now())
  const tete = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--dx-texteDiscret)', fontWeight: 500 }}>{c.t(n.libelle)}</span>
      {chaine(n.icone) !== null ? <span className="dx-doux" style={{ inlineSize: 32, blockSize: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--dx-accent)' }}><Picto nom={chaine(n.icone)!} coul="accent" /></span> : null}
    </div>
  )
  if (lecture.etat === 'attente') return <Carte etat="chargement">{tete}<div data-squelette="" style={{ blockSize: 36, inlineSize: '50%', borderRadius: 6, background: 'var(--dx-squelette)' }} /></Carte>
  if (lecture.etat === 'erreur') return <Carte etat="erreur">{tete}<span style={{ color: 'var(--dx-danger)', fontSize: 13 }}>{c.s('erreur')}</span><Reessayer /></Carte>
  const lignes = lecture.lignes
  const col = chaine(n.colonne)
  const colDate = chaine(n.date)
  // Le mois d'une ligne : sa colonne de date nommée, sinon une colonne de création reconnue.
  const dateLigne = (l: Ligne): Date | null => { if (colDate !== null) { const v = l[colDate]; if (typeof v === 'string' || typeof v === 'number') { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d } return null } return dateDe(l) }
  // Les mois se comptent en UTC : une date « 2026-11-01 » est en novembre partout.
  const m0 = new Date(maintenant)
  const moisDe = (k: number) => new Date(Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() - k, 1))
  const dansMois = (l: Ligne, k: number) => { const d = dateLigne(l); const a = moisDe(k); return d !== null && d.getUTCFullYear() === a.getUTCFullYear() && d.getUTCMonth() === a.getUTCMonth() }
  const mesurer = (ls: readonly Ligne[]) => (n.mesure === 'somme' && col !== null ? ls.reduce((a, l) => a + (Number(l[col]) || 0), 0) : ls.length)
  const valeur = n.mesure === 'mois' ? mesurer(lignes.filter((l) => dansMois(l, 0))) : mesurer(lignes)
  const datees = lignes.filter((l) => dateLigne(l) !== null)
  // La tendance : ce mois-ci contre le mois précédent, calculée ; absente sans dates.
  // Un TOTAL se compare au total à la fin du mois précédent ; « ce mois-ci » au mois précédent.
  const debutMois = moisDe(0).getTime()
  const [actuel, avant] = n.mesure === 'mois'
    ? [mesurer(lignes.filter((l) => dansMois(l, 0))), mesurer(lignes.filter((l) => dansMois(l, 1)))]
    : [valeur, mesurer(lignes.filter((l) => { const d = dateLigne(l); return d !== null && d.getTime() < debutMois }))]
  const tendance = datees.length > 0 && avant > 0 ? Math.round(((actuel - avant) / avant) * 100) : null
  const serie = datees.length > 0 ? [5, 4, 3, 2, 1, 0].map((k) => mesurer(lignes.filter((l) => dansMois(l, k)))) : []
  const maxSerie = Math.max(1, ...serie)
  const sous = lignes.length === 0 ? c.s('pasEncore') : tendance !== null ? c.s('vsMois') : null
  return (
    <Carte etat={lignes.length === 0 ? 'vide' : 'ideal'}>
      {tete}
      <span className="dx-chiffre" style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', fontWeight: 750, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{formater(valeur, chaine(n.format) === 'montant' ? 'montant' : 'nombre', c)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minBlockSize: 22 }}>
        {tendance !== null
          ? <span className="dx-chiffre" style={{ fontSize: 12, fontWeight: 650, paddingInline: 8, paddingBlock: 2, borderRadius: 999, color: tendance >= 0 ? 'var(--dx-succes)' : 'var(--dx-danger)', background: `color-mix(in srgb, var(--dx-${tendance >= 0 ? 'succes' : 'danger'}) 12%, transparent)` }}>{tendance >= 0 ? '↗' : '↘'} {tendance >= 0 ? '+' : ''}{new Intl.NumberFormat(c.langue).format(tendance)} %</span>
          : null}
        {sous !== null ? <span style={{ fontSize: 13, color: 'var(--dx-texteDiscret)' }}>{sous}</span> : null}
      </div>
      {serie.length > 0 && lignes.length > 0
        ? <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, blockSize: 28, direction: 'ltr' }}>{serie.map((v, i) => <span key={i} style={{ flex: 1, blockSize: `${String(Math.max(12, (v / maxSerie) * 100))}%`, borderRadius: 3, background: i === serie.length - 1 ? 'var(--dx-accent)' : 'color-mix(in srgb, var(--dx-accent) 22%, var(--dx-surface))' }} />)}</div>
        : null}
    </Carte>
  )
}
type Groupe = { readonly cle: string; readonly libelle: string; readonly valeur: number }
function groupes(lignes: readonly Ligne[], par: string, valeur: string | null, langue: string): { liste: Groupe[]; parDate: boolean } {
  const ajout = (l: Ligne) => (valeur !== null ? Number(l[valeur]) || 0 : 1)
  const dates = lignes.map((l) => { const v = l[par]; const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null; return d !== null && !Number.isNaN(d.getTime()) && typeof v === 'string' && /\d{4}-\d{2}/u.test(v) ? d : null })
  if (lignes.length > 0 && dates.filter((d) => d !== null).length >= lignes.length / 2) {
    const fin = new Date()
    const mois = Array.from({ length: 6 }, (_x, i) => new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - 5 + i, 1)))
    const cle = (d: Date) => `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1)}`
    const somme = new Map<string, number>()
    lignes.forEach((l, i) => { const d = dates[i]; if (d !== null && d !== undefined) somme.set(cle(d), (somme.get(cle(d)) ?? 0) + ajout(l)) })
    return { parDate: true, liste: mois.map((d) => ({ cle: cle(d), libelle: new Intl.DateTimeFormat(langue, { month: 'short', timeZone: 'UTC' }).format(d), valeur: somme.get(cle(d)) ?? 0 })) }
  }
  const somme = new Map<string, number>()
  for (const l of lignes) { const k = String(l[par] ?? '—'); somme.set(k, (somme.get(k) ?? 0) + ajout(l)) }
  return { parDate: false, liste: [...somme.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ cle: k, libelle: k, valeur: v })) }
}
/** La couleur d'une part : le sens de son statut s'il en a un (payée, en attente, annulée), sinon une nuance de l'accent. */
const NUANCES = ['var(--dx-accent)', 'color-mix(in srgb, var(--dx-accent) 60%, var(--dx-surface))', 'color-mix(in srgb, var(--dx-accent) 35%, var(--dx-surface))', 'var(--dx-texteDiscret)', 'var(--dx-bordure)']
function teinteDe(libelle: string, i: number): string {
  const ton = TON_STATUT.find(([r]) => r.test(libelle))?.[1]
  return ton !== undefined ? `var(--dx-${ton})` : NUANCES[i % NUANCES.length]!
}
function Graphique({ n }: { n: Noeud }) {
  const c = useCtx()
  const table = (liaisonDe(n.donnee) ?? '').split('.')[1] ?? ''
  const lecture = useLecture(c.magasin, table)
  const titre = <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{c.t(n.titre)}</h2>
  if (lecture.etat === 'attente') return <Carte etat="chargement">{titre}<div data-squelette="" style={{ blockSize: 160, borderRadius: 8, background: 'var(--dx-squelette)' }} /></Carte>
  if (lecture.etat === 'erreur') return <Carte etat="erreur">{titre}<span style={{ color: 'var(--dx-danger)', fontSize: 13 }}>{c.s('erreur')}</span><Reessayer /></Carte>
  const { liste: gs } = groupes(lecture.lignes, chaine(n.par) ?? '', chaine(n.valeur), c.langue)
  const total = gs.reduce((a, g) => a + g.valeur, 0)
  if (lecture.lignes.length === 0 || total === 0) {
    return (
      <Carte etat="vide">{titre}
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 10, blockSize: 120, opacity: 0.5 }}>{[30, 55, 40, 70, 50, 85].map((h, i) => <div key={i} style={{ flex: 1, blockSize: `${String(h)}%`, borderRadius: 6, background: 'var(--dx-squelette)' }} />)}</div>
        <span style={{ fontSize: 13, color: 'var(--dx-texteDiscret)' }}>{c.s('pasEncore')}</span>
      </Carte>
    )
  }
  const nf = new Intl.NumberFormat(c.langue)
  if (n.forme === 'anneau') {
    const R = 52, P = 2 * Math.PI * R
    const parts = gs.map((g) => (g.valeur / total) * P)
    const decalages = parts.map((_x, i) => parts.slice(0, i).reduce((a, b) => a + b, 0))
    return (
      <Carte etat="ideal">{titre}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
          <svg viewBox="0 0 140 140" width={140} height={140} role="img" aria-label={`${c.t(n.titre)} : ${nf.format(total)}`}>
            <circle cx={70} cy={70} r={R} fill="none" stroke="var(--dx-squelette)" strokeWidth={18} />
            {gs.map((g, i) => <circle key={g.cle} cx={70} cy={70} r={R} fill="none" stroke={teinteDe(g.libelle, i)} strokeWidth={18} strokeDasharray={`${String(parts[i]!)} ${String(P - parts[i]!)}`} strokeDashoffset={String(-decalages[i]!)} transform="rotate(-90 70 70)" />)}
            <text x={70} y={68} textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: 'var(--dx-texte)' }}>{nf.format(total)}</text>
          </svg>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, minWidth: 0 }}>
            {gs.map((g, i) => <li key={g.cle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span aria-hidden="true" style={{ inlineSize: 10, blockSize: 10, borderRadius: 3, background: teinteDe(g.libelle, i) }} /><span style={{ overflowWrap: 'anywhere' }}>{g.libelle}</span><strong className="dx-chiffre" style={{ marginInlineStart: 'auto', paddingInlineStart: 12 }}>{nf.format(g.valeur)}</strong></li>)}
          </ul>
        </div>
      </Carte>
    )
  }
  const max = Math.max(1, ...gs.map((g) => g.valeur))
  return (
    <Carte etat="ideal">{titre}
      <div role="img" aria-label={`${c.t(n.titre)} : ${gs.map((g) => `${g.libelle} ${nf.format(g.valeur)}`).join(', ')}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${String(gs.length)}, minmax(0, 1fr))`, alignItems: 'end', gap: 12, blockSize: 180, paddingBlockStart: 20 }}>
        {gs.map((g, i) => (
          <div key={g.cle} style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 6, blockSize: '100%', minWidth: 0, textAlign: 'center' }}>
            <span className="dx-chiffre" style={{ fontSize: 12, color: 'var(--dx-texteDiscret)' }}>{nf.format(g.valeur)}</span>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><div style={{ inlineSize: '100%', blockSize: `${String(Math.max(4, (g.valeur / max) * 100))}%`, minBlockSize: 4, borderRadius: 6, background: i === gs.length - 1 ? 'var(--dx-accent)' : 'color-mix(in srgb,var(--dx-accent) 22%,var(--dx-surface))' }} /></div>
            <span style={{ fontSize: 12, color: 'var(--dx-texteDiscret)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.libelle}</span>
          </div>
        ))}
      </div>
    </Carte>
  )
}

function Rendu({ n, portee }: { n: unknown; portee: Portee }) {
  const c = useCtx()
  const o = objet(n)
  if (o === null) return null
  if ('si' in o && !vrai(valeurDe(liaisonDe(o.si) ?? '', c, portee))) return null
  if ('siNon' in o && vrai(valeurDe(liaisonDe(o.siNon) ?? '', c, portee))) return null
  // L'accueil d'un rôle : une fois le rôle choisi, seules ses cartes (et les publiques) restent.
  // `pourRole` (2026-11-14) : montré à CE rôle seulement ; « visiteur » : à qui n'a pas encore choisi.
  if (typeof o.pourRole === 'string' && c.session.role !== o.pourRole) return null
  const enfants = (k = 'enfants') => liste(o[k]).map((m, i) => <Rendu key={i} n={m} portee={portee} />)
  const effets = liste(o.effets)
  switch (o.composant) {
    case 'Pile': {
      const ligne = o.sens === 'ligne'
      const aligner: Readonly<Record<string, string>> = { debut: 'flex-start', centre: 'center', fin: 'flex-end', etirer: 'stretch' }
      // Dans une rangée (V4.3f) : les cartes se partagent la largeur, une colonne de texte prend la place qui reste.
      const croissance = (m: unknown): string => { const x = objet(m); return x === null ? '0 1 auto' : x.composant === 'Pile' && x.sens !== 'ligne' ? '1 1 160px' : x.composant === 'Graphique' ? (x.forme === 'anneau' ? '1 1 280px' : '2 1 420px') : x.composant === 'Indicateur' || x.composant === 'Encart' ? '1 1 220px' : '0 1 auto' }
      return <div style={{ display: 'flex', flexDirection: ligne ? 'row' : 'column', flexWrap: ligne ? 'wrap' : 'nowrap', gap: ESPACE[chaine(o.espace) ?? 'm'] ?? 16, alignItems: aligner[chaine(o.aligner) ?? (ligne ? 'centre' : 'etirer')] ?? 'stretch', minWidth: 0 }}>
        {ligne ? liste(o.enfants).map((m, i) => <div key={i} style={{ flex: croissance(m), minWidth: 0, display: 'grid' }}><Rendu n={m} portee={portee} /></div>) : enfants()}
      </div>
    }
    case 'Encart': {
      const style: React.CSSProperties = { display: 'grid', gap: 8, padding: ESPACE[chaine(o.espace) ?? 'm'] ?? 16, borderRadius: RAYON[chaine(o.rayon) ?? 'm'] ?? 8, background: couleur(o.fond, 'surface'),
        boxShadow: OMBRE[chaine(o.elevation) ?? 'leve'] ?? 'none', border: '1px solid var(--dx-bordure)', minWidth: 0, minHeight: CIBLE, textAlign: 'start', alignContent: 'start' }
      if (effets.length === 0) return <div style={style}>{enfants()}</div>
      const agir = () => { c.executer(effets, portee) }
      return <div role="button" tabIndex={0} onClick={agir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); agir() } }} style={{ ...style, cursor: 'pointer' }}>{enfants()}</div>
    }
    case 'Titre': {
      const niveau = chaine(o.niveau) ?? 'section'
      const taille = niveau === 'page' ? (c.largeur === 'compact' ? 24 : c.largeur === 'moyen' ? 28 : 32) : niveau === 'section' ? 20 : 17
      const Balise = niveau === 'page' ? 'h1' : niveau === 'section' ? 'h2' : 'h3'
      return <Balise style={{ margin: 0, fontSize: taille, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{c.t(o.texte)}</Balise>
    }
    case 'Phrase':
      return <p style={{ margin: 0, fontSize: TAILLE[chaine(o.taille) ?? 'corps'] ?? 16, color: couleur(o.couleur, 'texte'), lineHeight: 1.5, overflowWrap: 'anywhere' }}>{c.t(o.texte)}</p>
    case 'Valeur': {
      const lien = liaisonDe(o.donnee) ?? ''
      const brut = valeurDe(lien, c, portee)
      // Le rôle « visiteur » se dit dans la langue de l'usager, pas avec son nom technique.
      const v = lien === 'session.role' && brut === 'visiteur' ? c.s('visiteur') : brut
      const format = chaine(o.format)
      if (format === 'initiales') return <Initiales texte={String(v ?? '')} />
      // Une photo, une vidéo ou un document se MONTRE, où qu'il soit lu (liste, fiche, tableau).
      if (estMedia(v)) return (
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          {o.libelle !== undefined ? <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{c.t(o.libelle)}</span> : null}
          <MediaVu v={v} alternative={o.libelle !== undefined ? c.t(o.libelle) : ''} />
        </div>
      )
      return (
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          {o.libelle !== undefined ? <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{c.t(o.libelle)}</span> : null}
          {format === 'statut'
            ? <PastilleStatut texte={formater(v, null, c)} />
            : <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{formater(v, format, c)}</span>}
        </div>
      )
    }
    case 'Bouton': {
      // Le retour discret à l'accueil, posé en bas de chaque écran pour le graphe : la coque le donne déjà (menu, barre).
      if (chaine(o.icone) === 'accueil' && chaine(o.genre) === 'discret' && effets.length === 1 && objet(effets[0])?.route === 'accueil') return null
      // Un choix de langue DÉJÀ fait est un état, pas une action : il se dit pressé.
      const langueChoisie = effets.length === 1 && objet(effets[0])?.evenement === 'choisirLangue' && objet(effets[0])?.valeur === c.langue
      return <div style={{ display: 'flex', maxWidth: '100%' }}><BoutonBrut libelle={c.t(o.libelle)} genre={chaine(o.genre) ?? 'secondaire'} icone={chaine(o.icone)} presse={langueChoisie ? true : undefined} surClic={() => { c.executer(effets, portee) }} /></div>
    }
    case 'Champ':
      return <Champ n={o as Noeud} portee={portee} />
    case 'Lignes':
      return <Lignes n={o as Noeud} portee={portee} />
    case 'Fiche':
      return <Fiche n={o as Noeud} />
    case 'Pastille': {
      const ton = chaine(o.ton) ?? 'neutre'
      const coul: Readonly<Record<string, string>> = { neutre: 'texteDiscret', succes: 'succes', alerte: 'alerte', danger: 'danger', information: 'accent' }
      return <span style={{ justifySelf: 'start', paddingInline: 10, paddingBlock: 2, borderRadius: 999, border: `1px solid ${couleur(coul[ton], 'texteDiscret')}`, color: couleur(coul[ton], 'texteDiscret'), fontSize: TAILLE.legende }}>{c.t(o.texte)}</span>
    }
    case 'Pictogramme':
      return <Picto nom={chaine(o.icone) ?? ''} coul={o.couleur} />
    case 'Illustration': {
      const brut = valeurDe(liaisonDe(o.donnee) ?? '', c, portee)
      if (estBlob(brut) || (typeof brut === 'string' && brut.startsWith('media:'))) return <MediaVu v={brut} alternative={c.t(o.alternative)} />
      const src = chaine(brut)
      return src !== null && src !== ''
        // Une application générée, pas une page Next : `next/image` n'y existe pas.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={c.t(o.alternative)} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }} />
        : <div role="img" aria-label={c.t(o.alternative)} style={{ aspectRatio: '16 / 9', maxWidth: '100%', borderRadius: 8, background: 'var(--dx-squelette)' }} />
    }
    case 'Message': {
      const nature = chaine(o.nature) ?? 'information'
      const coul: Readonly<Record<string, string>> = { vide: 'texteDiscret', erreur: 'danger', chargement: 'texteDiscret', partiel: 'alerte', succes: 'succes' }
      return (
        <div role="status" data-message={nature} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 8, border: `1px solid ${couleur(coul[nature], 'bordure')}`, background: 'var(--dx-surface)' }}>
          <p style={{ margin: 0, color: couleur(coul[nature], 'texte') }}>{c.t(o.texte)}</p>
          {effets.length > 0 ? <div><BoutonBrut libelle={c.s('reessayer')} genre="secondaire" surClic={() => { c.executer(effets, portee) }} /></div> : null}
        </div>
      )
    }
    case 'Indicateur':
      return <Indicateur n={o as Noeud} />
    case 'Graphique':
      return <Graphique n={o as Noeud} />
    case 'Trait':
      return <hr style={{ border: 0, borderBlockStart: '1px solid var(--dx-bordure)', marginBlock: ESPACE[chaine(o.espace) ?? 's'] ?? 8, marginInline: 0 }} />
    default:
      return null
  }
}

const routeCourante = () => decodeURIComponent(location.hash.replace(/^#\/?/u, ''))

/** Le pont des épreuves : la langue et le thème se règlent de l'extérieur (captures). */
declare global { interface Window { __deribfy?: { langue: (code: string) => void; theme: (t: 'clair' | 'sombre') => void; visiteur?: () => void } } }

/**
 * Aller à une route : on écrit le FRAGMENT. Mesuré : dans un cadre `srcdoc` (l'aperçu,
 * le juge), `location.assign('#x')` se résout contre l'adresse du PARENT et recharge
 * le cadre ; `location.hash` reste dans le document.
 */
function allerA(route: string): void { window.location.hash = route }

type Global = {
  readonly app: AppCompilee
  readonly magasin: Source
  readonly langue: string
  readonly poserLangue: (code: string) => void
  readonly theme: Theme
  readonly poserTheme: (t: Theme) => void
  readonly largeur: Largeur
  readonly session: Session
  readonly poserSession: React.Dispatch<React.SetStateAction<Session>>
  readonly parcours: ReadonlyMap<string, Ligne>
  readonly poserParcours: React.Dispatch<React.SetStateAction<ReadonlyMap<string, Ligne>>>
  readonly t: (x: unknown) => string
  readonly s: (c: CleSysteme) => string
}

/**
 * UN ÉCRAN VIVANT, recréé à chaque route (`key`) : son état part de ses valeurs
 * initiales sans qu'aucun effet ne le remette à zéro.
 */
function EcranVivant({ g, ecran }: { g: Global; ecran: EcranCompile }) {
  const [etats, poserEtats] = useState<Readonly<Record<string, unknown>>>(() => Object.fromEntries((ecran.etat ?? []).map((x) => [x.nom, x.initial ?? (x.nature === 'booleen' ? false : '')])))
  const [brouillons, poserBrouillons] = useState<Readonly<Record<string, unknown>>>({})
  const [annonce, poserAnnonce] = useState<string | null>(null)
  const { magasin, s } = g

  const ctx: Ctx = {
    app: g.app, magasin, langue: g.langue, largeur: g.largeur, session: g.session, parcours: g.parcours, etats, brouillons, t: g.t, s,
    poserEtat: (nom, v) => { poserEtats((e) => ({ ...e, [nom]: v })) },
    poserBrouillon: (k, v) => { poserBrouillons((b) => ({ ...b, [k]: v })) },
    executer: (effets, portee) => {
      for (const brut of liste(effets)) {
        const a = objet(brut) as Action | null
        if (a === null) continue
        const val = (x: unknown) => { const d = liaisonDe(x); return d !== null ? valeurDe(d, ctx, portee) : x }
        switch (a.faire) {
          case 'navigate': {
            if (a.avec !== undefined && portee !== null) g.poserParcours((p) => new Map(p).set(portee.table, portee.ligne))
            allerA(String(a.route))
            break
          }
          case 'submit': {
            const table = String(a.table)
            const valeurs = Object.fromEntries(liste(a.valeurs).map(objet).filter((v): v is Readonly<Record<string, unknown>> => v !== null).map((v) => [String(v.champ), val(v.depuis)]))
            const cible = portee !== null && portee.table === table ? portee.ligne : g.parcours.get(table) ?? null
            const ecriture = a.ecriture === 'modifier' || a.ecriture === 'supprimer' ? a.ecriture : 'creer'
            const ecrit = magasin.ecrire(table, ecriture, ecriture === 'creer' ? null : cible, valeurs)
            // En base l'écriture répond plus tard : l'écran ne dit « enregistré » qu'après, et dit l'échec sinon.
            if (ecrit instanceof Promise) void ecrit.then((erreur) => { poserAnnonce(erreur === null ? s('enregistre') : erreur) })
            else poserAnnonce(s('enregistre'))
            break
          }
          case 'emit': {
            const ev = String(a.evenement)
            if (ev === 'connexion') {
              const charge = Object.fromEntries(liste(a.charge).map(objet).filter((v): v is Readonly<Record<string, unknown>> => v !== null).map((v) => [String(v.champ), val(v.depuis)]))
              const identifiant = chaine(charge.identifiant)
              if (magasin.connecter !== undefined) {
                // En base : la vraie connexion ; la session ne change qu'après sa réponse.
                void magasin.connecter(identifiant ?? '', chaine(charge.secret) ?? '').then((erreur) => {
                  if (erreur === null) { g.poserSession((x) => ({ role: x.role, utilisateur: identifiant })); poserAnnonce(s('connecte')) }
                  else poserAnnonce(erreur)
                })
              } else {
                g.poserSession((x) => ({ role: x.role, utilisateur: identifiant }))
                poserAnnonce(s('connecte'))
              }
            } else if (ev === 'deconnexion') { g.poserSession({ role: 'visiteur', utilisateur: null }); poserAnnonce(s('deconnecte')) }
            else if (ev === 'choisirLangue') { const code = chaine(a.valeur); if (code !== null) g.poserLangue(code) }
            else if (ev === 'rafraichir') { magasin.recharger(); poserAnnonce(s('actualise')) }
            else if (ev === 'partager') poserAnnonce(s('partage'))
            else if (ev === 'contacter') poserAnnonce(s('transmis'))
            break
          }
          case 'setState': {
            const chemin = String(a.chemin)
            if (chemin.startsWith('etat.')) ctx.poserEtat(chemin.slice(5), val(a.valeur))
            break
          }
          default:
        }
      }
    },
  }

  const garde = ecran.acces !== 'visiteur' && g.session.role !== ecran.acces
  return (
    <Contexte.Provider value={ctx}>
      {annonce !== null ? <p role="status" style={{ margin: 0, padding: 12, borderRadius: 8, background: 'var(--dx-surface)', border: '1px solid var(--dx-succes)', color: 'var(--dx-succes)' }}>{annonce}</p> : null}
      {garde
        // La garde est une CARTE qui explique (V4.3f) — pas une question posée seule sur une page vide.
        ? <section data-deribfy="garde" className="dx-carte" style={{ display: 'grid', gap: 16, padding: 28, maxInlineSize: 520, justifySelf: 'center', inlineSize: '100%', textAlign: 'center', justifyItems: 'center' }}>
            <span aria-hidden="true" className="dx-doux" style={{ inlineSize: 56, blockSize: 56, borderRadius: 16, display: 'grid', placeItems: 'center' }}><Picto nom="utilisateur" coul="accent" /></span>
            <h1 style={{ margin: 0, fontSize: 24 }}>{s('quiEtesVous')}</h1>
            <p style={{ margin: 0, color: 'var(--dx-texteDiscret)', lineHeight: 1.5 }}>{s('garde').replace('{r}', ecran.acces)}</p>
            <div data-role={ecran.acces}><BoutonBrut libelle={`${s('entrerComme')} ${ecran.acces}`} genre="principal" surClic={() => { g.poserSession((x) => ({ ...x, role: ecran.acces })) }} /></div>
          </section>
        : <section style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            {ecran.corps.map((n, i) => <Rendu key={i} n={n} portee={null} />)}
            {ecran.route === 'compte' ? <Reglages g={g} /> : null}
          </section>}
    </Contexte.Provider>
  )
}

function Application({ app, magasin, parcoursInitial }: { app: AppCompilee; magasin: Source; parcoursInitial: ReadonlyMap<string, Ligne> }) {
  const [langue, poserLangue] = useState(app.langues[0]?.code ?? 'fr')
  const [route, poserRoute] = useState(() => routeCourante() || 'accueil')
  const [largeur, poserLargeur] = useState<Largeur>(() => classeDeLargeur(window.innerWidth))
  const [theme, poserTheme] = useState<Theme>(() => (document.documentElement.getAttribute('data-theme') === 'sombre' ? 'sombre' : app.kit === 'nuit' ? 'sombre' : 'clair'))
  const [session, poserSessionBrute] = useState<Session>(() => sessionInitiale(app))
  // Le rôle se choisit UNE fois : il est gardé (mémoire, et stockage quand la page en a un).
  const poserSession: React.Dispatch<React.SetStateAction<Session>> = (x) => { poserSessionBrute((avant) => { const s = typeof x === 'function' ? x(avant) : x; garderSession(app, s); return s }) }
  const [parcours, poserParcours] = useState<ReadonlyMap<string, Ligne>>(parcoursInitial)
  const [aujourdhui] = useState(() => new Date())
  const ecran = app.ecrans.find((e) => e.route === route) ?? app.ecrans.find((e) => e.route === 'accueil') ?? app.ecrans[0]
  const dir = app.langues.find((l) => l.code === langue)?.dir ?? 'ltr'

  useEffect(() => {
    const h = () => { poserRoute(routeCourante() || 'accueil') }
    const r = () => { poserLargeur(classeDeLargeur(window.innerWidth)) }
    window.addEventListener('hashchange', h)
    window.addEventListener('resize', r)
    // `visiteur` : un nouvel usager (le juge d'expérience suit le parcours comme lui, sans le rôle d'une visite précédente).
    window.__deribfy = { langue: poserLangue, theme: (t) => { poserTheme(t) }, visiteur: () => { const s = { role: 'visiteur', utilisateur: null }; garderSession(app, s); poserSessionBrute(s) } }
    return () => { window.removeEventListener('hashchange', h); window.removeEventListener('resize', r) }
  }, [app])
  useEffect(() => {
    document.documentElement.lang = langue
    document.documentElement.dir = dir
    document.documentElement.style.setProperty('--dx-sens', dir === 'rtl' ? '-1' : '1')
  }, [langue, dir])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-kit', app.kit ?? 'azur')
  }, [theme, app.kit])

  const t = (x: unknown): string => {
    if (typeof x === 'string') return x
    const o = objet(x)
    if (o === null) return ''
    const k = chaine(o.$k)
    return (k !== null ? app.dictionnaires[langue]?.[k] : undefined) ?? chaine(o.$t) ?? ''
  }
  const s = (k: CleSysteme) => texteSysteme(langue, k)
  const g: Global = { app, magasin, langue, poserLangue, theme, poserTheme, largeur, session, poserSession, parcours, poserParcours, t, s }

  const marge = largeur === 'compact' ? 16 : largeur === 'moyen' ? 24 : 32
  // ── LA COQUE (V4.3f, v2). Bureau : menu latéral groupé + en-tête (titre, avatar). Tablette :
  // un rail d'icônes. Téléphone : en-tête + barre du bas. Les langues et l'apparence sont dans le Compte.
  const gestion = app.ecrans.find((e) => e.route === 'gestion')
  const voitGestion = gestion !== undefined && session.role === gestion.acces
  // Le menu (2026-11-14) : l'accueil, puis les écrans que CE profil peut ouvrir — ceux de la barre,
  // puis ceux de son espace (les raccourcis de son accueil) — jamais l'écran de connexion (il est
  // dans l'en-tête), jamais l'écran d'un autre rôle ; sept au plus, l'accueil donne le reste.
  const connexion = app.ecrans.find((e) => emetConnexion(e.corps))
  const ouvrable = (e: EcranCompile) => e.route !== connexion?.route && e.route !== 'compte' && e.route !== 'gestion' && (e.acces === 'visiteur' || e.acces === session.role)
  const accueilApp = app.ecrans.find((e) => e.route === 'accueil')
  const ordre = [...new Set(['accueil', ...app.barre, ...(accueilApp !== undefined && session.role !== 'visiteur' ? routesDuRole(accueilApp.corps, session.role, null) : [])])]
  const principaux = ordre.map((r) => app.ecrans.find((e) => e.route === r)).filter((e): e is EcranCompile => e !== undefined && ouvrable(e)).slice(0, MENU_MAX)
  const compte = app.ecrans.find((e) => e.route === 'compte')
  const tous = [...principaux.slice(0, largeur === 'compact' ? BARRE_MAX - (voitGestion ? 2 : 1) : MENU_MAX), ...(voitGestion ? [gestion] : []), ...(compte !== undefined ? [compte] : [])]
  // Pas sur l'accueil du visiteur : la page y porte déjà le bouton principal « Se connecter ».
  const seConnecter = connexion !== undefined && session.utilisateur === null && route !== connexion.route && !(route === 'accueil' && session.role === 'visiteur')
    ? <BoutonBrut libelle={s('seConnecter')} genre="principal" surClic={() => { allerA(connexion.route) }} />
    : null
  const libelleNav = (e: EcranCompile) => (e.route === 'accueil' ? s('accueil') : e.route === 'compte' ? s('compte') : e.route === 'gestion' ? s('gestion') : t(e.titre))
  const profil = session.role === 'visiteur' ? s('visiteur') : session.role
  const sousMarque = s('espace').replace('{r}', profil)
  const avatar = (
    <button type="button" aria-label={`${s('compte')} · ${profil}`} title={profil} onClick={() => { allerA('compte') }}
      style={{ inlineSize: CIBLE, blockSize: CIBLE, borderRadius: 999, border: '1px solid var(--dx-bordure)', background: 'color-mix(in srgb, var(--dx-accent) 14%, var(--dx-surface))', color: 'var(--dx-accent)', fontWeight: 750, cursor: 'pointer', flex: 'none' }}>
      {initialesDe(session.utilisateur ?? profil)}
    </button>
  )
  const marque = (compacte: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <span aria-hidden="true" style={{ inlineSize: 40, blockSize: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--dx-accent)', color: 'var(--dx-surAccent)', fontWeight: 800, fontSize: 18, flex: 'none' }}>{initialesDe(app.nom).slice(0, 1)}</span>
      {compacte ? null : <span style={{ display: 'grid', minWidth: 0 }}><strong style={{ fontSize: 15, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.nom}</strong><span style={{ fontSize: 12, color: 'var(--dx-texteDiscret)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sousMarque}</span></span>}
    </div>
  )
  const lien = (e: EcranCompile, forme: 'menu' | 'rail' | 'barre') => {
    const actif = e.route === route
    const libelle = libelleNav(e)
    const table = forme === 'menu' ? tableListee(e) : null
    const base: React.CSSProperties = { border: 0, cursor: 'pointer', color: actif ? 'var(--dx-accent)' : 'var(--dx-texteNav)', background: 'transparent' }
    const style: React.CSSProperties = forme === 'menu'
      ? { ...base, minHeight: CIBLE - 4, borderRadius: 10, background: actif ? 'color-mix(in srgb, var(--dx-accent) 13%, var(--dx-barre))' : 'transparent', fontWeight: actif ? 650 : 500, display: 'flex', alignItems: 'center', gap: 12, paddingInline: 12, textAlign: 'start', inlineSize: '100%', boxSizing: 'border-box', minBlockSize: CIBLE }
      : { ...base, minHeight: forme === 'rail' ? 64 : 56, minWidth: CIBLE, borderRadius: 12, fontWeight: 600, fontSize: 11.5, display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 3, paddingInline: 4, ...(forme === 'rail' && actif ? { background: 'color-mix(in srgb, var(--dx-accent) 13%, var(--dx-barre))' } : {}) }
    return (
      <button key={e.route} type="button" aria-current={actif ? 'page' : undefined} title={libelle} onClick={() => { allerA(e.route) }} style={style}>
        <Picto nom={e.icone ?? 'document'} coul={actif ? 'accent' : 'texteNav'} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxInlineSize: '100%', ...(forme === 'menu' ? { flex: 1, minWidth: 0 } : {}) }}>{forme === 'menu' ? libelle : libelleCourt(libelle)}</span>
        {table !== null ? <Compteur magasin={magasin} table={table} /> : null}
      </button>
    )
  }
  const groupe = (titre: string, ecrans: readonly EcranCompile[]) => ecrans.length === 0 ? null : (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
      <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dx-texteDiscret)', fontWeight: 650, paddingInline: 12, paddingBlockEnd: 6 }}>{titre}</span>
      {ecrans.map((e) => lien(e, 'menu'))}
    </div>
  )
  const enTete = (
    <header style={{ position: 'sticky', insetBlockStart: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingInline: marge, paddingBlock: 10, borderBlockEnd: '1px solid var(--dx-bordure)', background: 'color-mix(in srgb, var(--dx-surface) 92%, transparent)', backdropFilter: 'blur(8px)' }}>
      {largeur === 'compact'
        ? marque(false)
        // Au large, le titre est dans la page : l'en-tête porte la date du jour et l'espace (comme un tableau de bord tenu à jour).
        : <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dx-texteDiscret)', fontWeight: 650 }}>{new Intl.DateTimeFormat(langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(aujourdhui)}</span>
            <span style={{ fontSize: 12, fontWeight: 650, paddingInline: 10, paddingBlock: 3, borderRadius: 999, color: 'var(--dx-accent)', background: 'color-mix(in srgb, var(--dx-accent) 12%, transparent)' }}>{sousMarque}</span>
          </div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>{seConnecter}{avatar}</div>
    </header>
  )
  const contenu = <main style={{ flex: 1, width: '100%', maxWidth: largeur === 'etendu' ? 1240 : 1040, marginInline: 'auto', paddingInline: marge, paddingBlock: largeur === 'compact' ? 20 : 28, display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>{ecran !== undefined ? <EcranVivant key={ecran.route} g={g} ecran={ecran} /> : null}</main>
  // Le menu : un fond sur toute la hauteur de la page, un contenu qui reste visible au défilement.
  const coteBarre: React.CSSProperties = { position: 'sticky', insetBlockStart: 0, blockSize: '100vh', display: 'flex', flexDirection: 'column' }
  const fondBarre: React.CSSProperties = { alignSelf: 'stretch', background: 'var(--dx-barre)', borderInlineEnd: '1px solid var(--dx-bordure)' }
  return (
    <>
      <style>{STYLE}</style>
      {largeur === 'etendu'
        ? <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '264px minmax(0, 1fr)', alignItems: 'start' }}>
            <div style={fondBarre}><aside style={{ ...coteBarre, gap: 24, padding: 20 }}>
              {marque(false)}
              {/* Une colonne bornée : un libellé long se coupe, il ne pousse plus le menu sur la page. */}
              <nav aria-label="Navigation" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
                {groupe(s('menu'), principaux)}
                {voitGestion && gestion !== undefined ? groupe(s('gestion'), [gestion]) : null}
                {compte !== undefined ? groupe(s('compte'), [compte]) : null}
              </nav>
              <div style={{ marginBlockStart: 'auto', display: 'grid', gap: 4, padding: 14, borderRadius: 12, background: 'var(--dx-fond)', border: '1px solid var(--dx-bordure)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}><span aria-hidden="true" style={{ inlineSize: 8, blockSize: 8, borderRadius: 999, background: session.role === 'visiteur' ? 'var(--dx-bordure)' : 'var(--dx-succes)' }} />{s('profil')} : {profil}</span>
                {session.utilisateur !== null ? <span style={{ fontSize: 12, color: 'var(--dx-texteDiscret)', overflowWrap: 'anywhere' }}>{session.utilisateur}</span> : null}
              </div>
            </aside></div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>{enTete}{contenu}</div>
          </div>
        : largeur === 'moyen'
          ? <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', alignItems: 'start' }}>
              <div style={fondBarre}><aside style={{ ...coteBarre, alignItems: 'center', gap: 16, paddingBlock: 16, paddingInline: 8 }}>
                {marque(true)}
                <nav aria-label="Navigation" style={{ display: 'grid', gap: 6, inlineSize: '100%' }}>{tous.map((e) => lien(e, 'rail'))}</nav>
              </aside></div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>{enTete}{contenu}</div>
            </div>
          : <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {enTete}
              {contenu}
              <nav aria-label="Navigation" style={{ position: 'sticky', bottom: 0, display: 'grid', gridTemplateColumns: `repeat(${String(Math.max(1, tous.length))}, minmax(0, 1fr))`, gap: 2, padding: 4, background: 'var(--dx-barre)', borderBlockStart: '1px solid var(--dx-bordure)' }}>
                {tous.map((e) => lien(e, 'barre'))}
              </nav>
            </div>}
    </>
  )
}

/** Un libellé de barre du bas : court tel quel ; long, son premier mot (« Rechercher un fournisseur » → « Rechercher »). */
const PETITS_MOTS = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'mon', 'ma', 'mes', 'votre', 'vos', 'toutes', 'tous', 'tout', 'voir', 'the', 'a', 'an', 'all', 'my', 'your', 'of', 'to'])
export function libelleCourt(t: string): string {
  if (t.length <= 14) return t
  const mots = t.split(/[\s'’]+/u).filter((m) => m !== '' && !PETITS_MOTS.has(m.toLowerCase()))
  const m = mots[0] ?? t
  return m.charAt(0).toUpperCase() + m.slice(1)
}

const MENU_MAX = 7
const BARRE_MAX = 5
/** L'écran de connexion : celui qui émet `connexion`. */
function emetConnexion(x: unknown): boolean {
  if (Array.isArray(x)) return x.some(emetConnexion)
  const o = objet(x)
  if (o === null) return false
  if (o.faire === 'emit' && o.evenement === 'connexion') return true
  return Object.values(o).some(emetConnexion)
}
/** Les destinations réservées à ce rôle dans un écran (les raccourcis de son espace), dans l'ordre. */
function routesDuRole(x: unknown, role: string, herite: string | null): string[] {
  if (Array.isArray(x)) return x.flatMap((y) => routesDuRole(y, role, herite))
  const o = objet(x)
  if (o === null) return []
  const r = typeof o.pourRole === 'string' ? o.pourRole : herite
  const ici = r === role && o.faire === 'navigate' && typeof o.route === 'string' ? [o.route] : []
  return [...ici, ...Object.values(o).flatMap((v) => routesDuRole(v, role, r))]
}

/** Les rôles que l'application protège (ses écrans non publics). */
export function rolesDeLApplication(app: AppCompilee): string[] {
  return [...new Set(app.ecrans.map((e) => e.acces).filter((r) => r !== 'visiteur'))]
}
const cleSession = (app: AppCompilee) => `deribfy:session:${app.nom}`
/** UN seul rôle : pas de question, la session le porte d'emblée. Sinon : le rôle gardé, ou visiteur. */
function sessionInitiale(app: AppCompilee): Session {
  const roles = rolesDeLApplication(app)
  if (roles.length === 1) return { role: roles[0]!, utilisateur: null }
  try {
    const lu = JSON.parse(window.localStorage.getItem(cleSession(app)) ?? 'null') as Session | null
    if (lu !== null && typeof lu.role === 'string' && (lu.role === 'visiteur' || roles.includes(lu.role))) return { role: lu.role, utilisateur: typeof lu.utilisateur === 'string' ? lu.utilisateur : null }
  } catch { /* l'aperçu (origine opaque) n'a pas de stockage : la mémoire suffit */ }
  return { role: 'visiteur', utilisateur: null }
}
function garderSession(app: AppCompilee, s: Session): void {
  try { window.localStorage.setItem(cleSession(app), JSON.stringify(s)) } catch { /* aperçu : la mémoire suffit */ }
}

/** Monte l'application dans `#racine`. */
export function monter(app: AppCompilee, magasin: Source, parcoursInitial: ReadonlyMap<string, Ligne> = new Map()): void {
  const racine = document.getElementById('racine')
  if (racine === null) throw new Error('#racine absent')
  createRoot(racine).render(<Application app={app} magasin={magasin} parcoursInitial={parcoursInitial} />)
}

