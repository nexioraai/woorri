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
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
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
}

type Action = Readonly<Record<string, unknown>> & { readonly faire: string }
type Portee = { readonly ligne: Ligne; readonly table: string } | null
type Largeur = 'compact' | 'moyen' | 'etendu'
type Session = { readonly role: string; readonly utilisateur: string | null }

export const classeDeLargeur = (l: number): Largeur => (l < 600 ? 'compact' : l < 840 ? 'moyen' : 'etendu')

// ── LES JETONS : des noms du contrat → des variables CSS ou des pas.
const ESPACE: Readonly<Record<string, number>> = { aucun: 0, xs: 4, s: 8, m: 16, l: 24, xl: 32 }
const RAYON: Readonly<Record<string, number>> = { aucun: 0, s: 4, m: 8, l: 16, plein: 999 }
const TAILLE: Readonly<Record<string, number>> = { legende: 13, corps: 16, sousTitre: 18, titre: 22, grandTitre: 28 }
const OMBRE: Readonly<Record<string, string>> = { plat: 'none', leve: '0 1px 3px var(--dx-ombre)', flottant: '0 6px 18px var(--dx-ombre)' }
const couleur = (n: unknown, defaut: string) => `var(--dx-${typeof n === 'string' ? n : defaut})`
const CIBLE = 48

const STYLE = `
:root,[data-theme="clair"]{--dx-fond:#f7f7f5;--dx-surface:#ffffff;--dx-texte:#1b1d21;--dx-texteDiscret:#4f5560;--dx-accent:#1f5fbf;--dx-surAccent:#ffffff;--dx-succes:#1d7a46;--dx-alerte:#8a5a00;--dx-danger:#b42318;--dx-bordure:#d5d8de;--dx-ombre:rgba(0,0,0,.14);--dx-squelette:#e6e8ec}
[data-theme="sombre"]{--dx-fond:#14161a;--dx-surface:#1e2127;--dx-texte:#eef0f3;--dx-texteDiscret:#b4bac4;--dx-accent:#7fb0ff;--dx-surAccent:#0b1a33;--dx-succes:#6fd39a;--dx-alerte:#f0c06a;--dx-danger:#ff8a80;--dx-bordure:#3a3f48;--dx-ombre:rgba(0,0,0,.5);--dx-squelette:#2b3038}
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
  reglages: 'M12 9a3 3 0 110 6 3 3 0 010-6zM12 2v4M12 18v4M2 12h4M18 12h4', aide: 'M12 3a9 9 0 110 18 9 9 0 010-18zM9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4M12 17v.5',
  localisation: 'M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 8a2 2 0 110 4 2 2 0 010-4z', valide: 'M4 12l5 5L20 6', fermer: 'M5 5l14 14M19 5L5 19',
  alerte: 'M12 3l10 18H2zM12 10v5M12 18v.5', information: 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 11v6M12 7.5v.5', ajouter: 'M12 5v14M5 12h14',
  modifier: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', supprimer: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', retour: 'M15 5l-7 7 7 7', suivant: 'M9 5l7 7-7 7',
  partager: 'M18 8a3 3 0 10-3-3l-7 4a3 3 0 100 6l7 4a3 3 0 103-3', telephone: 'M5 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z',
  courriel: 'M3 6h18v12H3zM3 6l9 7 9-7',
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
        {montrees.map((l, k) => <div key={l.id} style={{ display: 'grid', gap: 8, minWidth: 0, ...(enListe ? { paddingInline: 16, paddingBlock: 12, borderBlockStart: k === 0 ? 'none' : '1px solid var(--dx-bordure)' } : {}) }}>{liste(n.modele).map((m, i) => <Rendu key={i} n={m} portee={{ ligne: l, table }} />)}</div>)}
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

function Champ({ n, portee }: { n: Noeud; portee: Portee }) {
  const c = useCtx()
  const d = liaisonDe(n.donnee) ?? ''
  const nature = chaine(n.nature) ?? 'texte'
  const v = valeurDe(d, c, portee)
  const poser = (x: unknown) => { if (d.startsWith('etat.')) c.poserEtat(d.slice(5), x); else c.poserBrouillon(d, x) }
  const libelle = c.t(n.libelle)
  const champ: React.CSSProperties = { minHeight: CIBLE, width: '100%', paddingInline: 12, borderRadius: 8, border: '1px solid var(--dx-bordure)', background: 'var(--dx-surface)' }
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
  const valeur = n.mesure === 'somme' && col !== null ? lignes.reduce((a, l) => a + (Number(l[col]) || 0), 0) : lignes.length
  const datees = lignes.filter((l) => dateDe(l) !== null)
  const recents = datees.filter((l) => maintenant - dateDe(l)!.getTime() < 30 * 86_400_000).length
  const sous = lignes.length === 0 ? c.s('pasEncore') : datees.length > 0 ? `+${new Intl.NumberFormat(c.langue).format(recents)} ${c.s('ces30')}` : null
  return (
    <Carte etat={lignes.length === 0 ? 'vide' : 'ideal'}>
      {tete}
      <span className="dx-chiffre" style={{ fontSize: c.largeur === 'compact' ? 28 : 34, fontWeight: 700, lineHeight: 1.1 }}>{formater(valeur, chaine(n.format) === 'montant' ? 'montant' : 'nombre', c)}</span>
      {sous !== null ? <span style={{ fontSize: 13, color: lignes.length === 0 ? 'var(--dx-texteDiscret)' : 'var(--dx-succes)' }}>{sous}</span> : null}
    </Carte>
  )
}
type Groupe = { readonly cle: string; readonly libelle: string; readonly valeur: number }
function groupes(lignes: readonly Ligne[], par: string, valeur: string | null, langue: string): { liste: Groupe[]; parDate: boolean } {
  const ajout = (l: Ligne) => (valeur !== null ? Number(l[valeur]) || 0 : 1)
  const dates = lignes.map((l) => { const v = l[par]; const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null; return d !== null && !Number.isNaN(d.getTime()) && typeof v === 'string' && /\d{4}-\d{2}/u.test(v) ? d : null })
  if (lignes.length > 0 && dates.filter((d) => d !== null).length >= lignes.length / 2) {
    const fin = new Date()
    const mois = Array.from({ length: 6 }, (_x, i) => new Date(fin.getFullYear(), fin.getMonth() - 5 + i, 1))
    const cle = (d: Date) => `${String(d.getFullYear())}-${String(d.getMonth() + 1)}`
    const somme = new Map<string, number>()
    lignes.forEach((l, i) => { const d = dates[i]; if (d !== null && d !== undefined) somme.set(cle(d), (somme.get(cle(d)) ?? 0) + ajout(l)) })
    return { parDate: true, liste: mois.map((d) => ({ cle: cle(d), libelle: new Intl.DateTimeFormat(langue, { month: 'short' }).format(d), valeur: somme.get(cle(d)) ?? 0 })) }
  }
  const somme = new Map<string, number>()
  for (const l of lignes) { const k = String(l[par] ?? '—'); somme.set(k, (somme.get(k) ?? 0) + ajout(l)) }
  return { parDate: false, liste: [...somme.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ cle: k, libelle: k, valeur: v })) }
}
const TEINTES = ['accent', 'succes', 'alerte', 'danger', 'texteDiscret', 'bordure']
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
            {gs.map((g, i) => <circle key={g.cle} cx={70} cy={70} r={R} fill="none" stroke={`var(--dx-${TEINTES[i % TEINTES.length]!})`} strokeWidth={18} strokeDasharray={`${String(parts[i]!)} ${String(P - parts[i]!)}`} strokeDashoffset={String(-decalages[i]!)} transform="rotate(-90 70 70)" />)}
            <text x={70} y={68} textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: 'var(--dx-texte)' }}>{nf.format(total)}</text>
          </svg>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, minWidth: 0 }}>
            {gs.map((g, i) => <li key={g.cle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span aria-hidden="true" style={{ inlineSize: 10, blockSize: 10, borderRadius: 3, background: `var(--dx-${TEINTES[i % TEINTES.length]!})` }} /><span style={{ overflowWrap: 'anywhere' }}>{g.libelle}</span><strong className="dx-chiffre" style={{ marginInlineStart: 'auto', paddingInlineStart: 12 }}>{nf.format(g.valeur)}</strong></li>)}
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
  if (typeof o.pourRole === 'string' && c.session.role !== 'visiteur' && c.session.role !== o.pourRole) return null
  const enfants = (k = 'enfants') => liste(o[k]).map((m, i) => <Rendu key={i} n={m} portee={portee} />)
  const effets = liste(o.effets)
  switch (o.composant) {
    case 'Pile': {
      const ligne = o.sens === 'ligne'
      const aligner: Readonly<Record<string, string>> = { debut: 'flex-start', centre: 'center', fin: 'flex-end', etirer: 'stretch' }
      // Dans une rangée (V4.3f) : les cartes se partagent la largeur, une colonne de texte prend la place qui reste.
      const croissance = (m: unknown): string => { const x = objet(m); return x === null ? '0 1 auto' : x.composant === 'Pile' && x.sens !== 'ligne' ? '1 1 160px' : x.composant === 'Indicateur' || x.composant === 'Graphique' || x.composant === 'Encart' ? '1 1 240px' : '0 1 auto' }
      return <div style={{ display: 'flex', flexDirection: ligne ? 'row' : 'column', flexWrap: ligne ? 'wrap' : 'nowrap', gap: ESPACE[chaine(o.espace) ?? 'm'] ?? 16, alignItems: aligner[chaine(o.aligner) ?? (ligne ? 'centre' : 'etirer')] ?? 'stretch', minWidth: 0 }}>
        {ligne ? liste(o.enfants).map((m, i) => <div key={i} style={{ flex: croissance(m), minWidth: 0, display: 'grid' }}><Rendu n={m} portee={portee} /></div>) : enfants()}
      </div>
    }
    case 'Encart': {
      const style: React.CSSProperties = { display: 'grid', gap: 8, padding: ESPACE[chaine(o.espace) ?? 'm'] ?? 16, borderRadius: RAYON[chaine(o.rayon) ?? 'm'] ?? 8, background: couleur(o.fond, 'surface'),
        boxShadow: OMBRE[chaine(o.elevation) ?? 'leve'] ?? 'none', border: '1px solid var(--dx-bordure)', minWidth: 0, minHeight: CIBLE, textAlign: 'start' }
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
      return (
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          {o.libelle !== undefined ? <span style={{ fontSize: TAILLE.legende, color: 'var(--dx-texteDiscret)' }}>{c.t(o.libelle)}</span> : null}
          {format === 'statut'
            ? <span style={{ justifySelf: 'start', paddingInline: 10, paddingBlock: 2, borderRadius: 999, background: 'var(--dx-fond)', border: '1px solid var(--dx-bordure)' }}>{formater(v, null, c)}</span>
            : <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{formater(v, format, c)}</span>}
        </div>
      )
    }
    case 'Bouton': {
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
      const src = chaine(valeurDe(liaisonDe(o.donnee) ?? '', c, portee))
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
          </section>}
    </Contexte.Provider>
  )
}

function Application({ app, magasin, parcoursInitial }: { app: AppCompilee; magasin: Source; parcoursInitial: ReadonlyMap<string, Ligne> }) {
  const [langue, poserLangue] = useState(app.langues[0]?.code ?? 'fr')
  const [route, poserRoute] = useState(() => routeCourante() || 'accueil')
  const [largeur, poserLargeur] = useState<Largeur>(() => classeDeLargeur(window.innerWidth))
  const [session, poserSessionBrute] = useState<Session>(() => sessionInitiale(app))
  // Le rôle se choisit UNE fois : il est gardé (mémoire, et stockage quand la page en a un).
  const poserSession: React.Dispatch<React.SetStateAction<Session>> = (x) => { poserSessionBrute((avant) => { const s = typeof x === 'function' ? x(avant) : x; garderSession(app, s); return s }) }
  const [parcours, poserParcours] = useState<ReadonlyMap<string, Ligne>>(parcoursInitial)
  const ecran = app.ecrans.find((e) => e.route === route) ?? app.ecrans.find((e) => e.route === 'accueil') ?? app.ecrans[0]
  const dir = app.langues.find((l) => l.code === langue)?.dir ?? 'ltr'

  useEffect(() => {
    const h = () => { poserRoute(routeCourante() || 'accueil') }
    const r = () => { poserLargeur(classeDeLargeur(window.innerWidth)) }
    window.addEventListener('hashchange', h)
    window.addEventListener('resize', r)
    // `visiteur` : un nouvel usager (le juge d'expérience suit le parcours comme lui, sans le rôle d'une visite précédente).
    window.__deribfy = { langue: poserLangue, theme: (t) => { document.documentElement.setAttribute('data-theme', t) }, visiteur: () => { const s = { role: 'visiteur', utilisateur: null }; garderSession(app, s); poserSessionBrute(s) } }
    if (!document.documentElement.hasAttribute('data-theme')) document.documentElement.setAttribute('data-theme', 'clair')
    return () => { window.removeEventListener('hashchange', h); window.removeEventListener('resize', r) }
  }, [app])
  useEffect(() => {
    document.documentElement.lang = langue
    document.documentElement.dir = dir
    document.documentElement.style.setProperty('--dx-sens', dir === 'rtl' ? '-1' : '1')
  }, [langue, dir])

  const t = (x: unknown): string => {
    if (typeof x === 'string') return x
    const o = objet(x)
    if (o === null) return ''
    const k = chaine(o.$k)
    return (k !== null ? app.dictionnaires[langue]?.[k] : undefined) ?? chaine(o.$t) ?? ''
  }
  const s = (k: CleSysteme) => texteSysteme(langue, k)
  const g: Global = { app, magasin, langue, poserLangue, largeur, session, poserSession, parcours, poserParcours, t, s }

  const marge = largeur === 'compact' ? 16 : largeur === 'moyen' ? 24 : 32
  // ── LA COQUE (V4.3f). Au large : un menu latéral (la barre + la gestion) et un en-tête ;
  // au téléphone : un en-tête et une barre du bas à icônes et libellés courts.
  const gestion = app.ecrans.find((e) => e.route === 'gestion')
  const routesNav = [...app.barre, ...(gestion !== undefined && !app.barre.includes('gestion') && (session.role === 'visiteur' || session.role === gestion.acces) ? ['gestion'] : [])]
  const nav = routesNav.map((r) => app.ecrans.find((e) => e.route === r)).filter((e): e is EcranCompile => e !== undefined)
  const large = largeur === 'etendu'
  const langues = app.langues.length > 1
    ? <div role="group" aria-label={s('langue')} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {app.langues.map((l) => <BoutonBrut key={l.code} libelle={l.libelle} genre={l.code === langue ? 'principal' : 'discret'} presse={l.code === langue} attributs={{ 'data-langue': l.code, lang: l.code }} surClic={() => { poserLangue(l.code) }} />)}
      </div>
    : null
  // L'accueil et le compte se disent « Accueil » et « Compte » dans la barre, quel que soit leur titre.
  const libelleNav = (e: EcranCompile) => (e.route === 'accueil' ? s('accueil') : e.route === 'compte' ? s('compte') : t(e.titre))
  const pastilleRole = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--dx-texteDiscret)', minWidth: 0 }}>
      <span aria-hidden="true" style={{ inlineSize: 8, blockSize: 8, borderRadius: 999, background: session.role === 'visiteur' ? 'var(--dx-bordure)' : 'var(--dx-succes)' }} />
      <span style={{ overflowWrap: 'anywhere' }}>{s('profil')} : {session.role === 'visiteur' ? s('visiteur') : session.role}</span>
    </span>
  )
  const marque = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <span aria-hidden="true" style={{ inlineSize: 36, blockSize: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--dx-accent)', color: 'var(--dx-surAccent)', fontWeight: 800, flex: 'none' }}>{initialesDe(app.nom).slice(0, 1)}</span>
      <strong style={{ overflowWrap: 'anywhere', fontSize: 16 }}>{app.nom}</strong>
    </div>
  )
  const lienNav = (e: EcranCompile, court: boolean) => {
    const actif = e.route === route
    const libelle = libelleNav(e)
    return (
      <button key={e.route} type="button" aria-current={actif ? 'page' : undefined} title={libelle} onClick={() => { allerA(e.route) }}
        style={court
          ? { minHeight: 56, minWidth: CIBLE, border: 0, borderRadius: 10, background: 'transparent', color: actif ? 'var(--dx-accent)' : 'var(--dx-texteDiscret)', fontWeight: 600, fontSize: 12, display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 2, paddingInline: 4 }
          : { minHeight: CIBLE, border: 0, borderRadius: 10, background: actif ? 'color-mix(in srgb,var(--dx-accent) 12%,var(--dx-surface))' : 'transparent', color: actif ? 'var(--dx-accent)' : 'var(--dx-texte)', fontWeight: actif ? 650 : 500, display: 'flex', alignItems: 'center', gap: 12, paddingInline: 12, textAlign: 'start', inlineSize: '100%' }}>
        <Picto nom={e.icone ?? 'document'} coul={actif ? 'accent' : 'texteDiscret'} />
        <span style={court ? { maxInlineSize: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{court ? libelleCourt(libelle) : libelle}</span>
      </button>
    )
  }
  const contenu = <main style={{ flex: 1, width: '100%', maxWidth: large ? 1200 : 1040, marginInline: 'auto', paddingInline: marge, paddingBlock: large ? 28 : 20, display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>{ecran !== undefined ? <EcranVivant key={ecran.route} g={g} ecran={ecran} /> : null}</main>
  return (
    <>
      <style>{STYLE}</style>
      {large
        ? <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '256px minmax(0, 1fr)' }}>
            <aside style={{ position: 'sticky', insetBlockStart: 0, blockSize: '100vh', display: 'flex', flexDirection: 'column', gap: 20, padding: 20, background: 'var(--dx-surface)', borderInlineEnd: '1px solid var(--dx-bordure)' }}>
              {marque}
              <nav aria-label="Navigation" style={{ display: 'grid', gap: 4 }}>{nav.map((e) => lienNav(e, false))}</nav>
              <div style={{ marginBlockStart: 'auto', padding: 12, borderRadius: 12, background: 'var(--dx-fond)' }}>{pastilleRole}</div>
            </aside>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingInline: marge, paddingBlock: 12, borderBlockEnd: '1px solid var(--dx-bordure)', background: 'var(--dx-surface)' }}>
                <span style={{ fontSize: 14, color: 'var(--dx-texteDiscret)', overflowWrap: 'anywhere' }}>{app.nom} <span aria-hidden="true">/</span> <strong style={{ color: 'var(--dx-texte)' }}>{ecran !== undefined ? t(ecran.titre) : ''}</strong></span>
                {langues}
              </header>
              {contenu}
            </div>
          </div>
        : <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingInline: marge, paddingBlock: 8, borderBlockEnd: '1px solid var(--dx-bordure)', background: 'var(--dx-surface)' }}>
              {marque}
              {langues}
            </header>
            {contenu}
            <nav aria-label="Navigation" style={{ position: 'sticky', bottom: 0, display: 'grid', gridTemplateColumns: `repeat(${String(Math.max(1, nav.length))}, minmax(0, 1fr))`, gap: 2, padding: 4, background: 'var(--dx-surface)', borderBlockStart: '1px solid var(--dx-bordure)' }}>
              {nav.map((e) => lienNav(e, true))}
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

