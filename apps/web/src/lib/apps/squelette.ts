/**
 * LE SQUELETTE — ce que Deribfy ÉCRIT LUI-MÊME dans chaque application (3c).
 *
 * ── CE QUE LE MODÈLE N'ÉCRIT PLUS, MESURÉ.
 *
 * M14 : 38 à 57 % de la durée d'une génération réémettait du code identique
 * au tour précédent, et 3 classes de refus sur 8 (données en mémoire, tables
 * interrogées avant connexion, chargement muet) tenaient à la couche d'accès
 * aux données que le modèle réécrivait à chaque tour. Ici cette couche, la
 * navigation, la barre du bas (Accueil + Compte), la coque de gestion, la
 * session et le magasin d'état sont du TEXTE ÉMIS par Deribfy : déterministe,
 * testé en montage réel, jamais demandé au modèle. Le modèle n'écrit que des
 * écrans (`ecrans/<slug>.tsx`), un par appel, dont le contrat tient en une
 * page (consigne-ecran).
 *
 * ── LES FICHIERS (tous sous `systeme/`, que le modèle ne peut pas écraser) :
 *   index.tsx                 monte <Application /> — et n'exporte rien
 *   systeme/types.ts          Session, Id, un type par table (depuis les entités)
 *   systeme/etat.ts           le magasin déterministe : lire / ecrire / useEtat,
 *                             la session (connecter / deconnecter), les clés de
 *                             parcours `<table>_en_cours` (réservation → paiement
 *                             → confirmation : la réservation choisie VOYAGE)
 *   systeme/base.ts           useTable<T>(table) : lignes, chargement, erreur,
 *                             ajouter, modifier, supprimer — en base si
 *                             DERIBFY_BASE.url, en mémoire sinon (l'aperçu)
 *   systeme/navigation.tsx    ECRANS (le plan), naviguer, l'écran courant par
 *                             `#<slug>` (`#gestion` = première section de
 *                             gestion), BarreDuBas, Compte
 *   systeme/application.tsx   la garde de rôle, la coque de gestion, la mise en
 *                             page publique ; importe chaque écran du plan
 *   ecrans/<slug>.tsx         un écran « À compléter » tant que le modèle n'en
 *                             a pas livré un (ou s'il a échoué deux fois)
 *   PERIMETRE.md              écrit par Deribfy : écrans livrés / à compléter
 *
 * ── CE QUE LE JUGE D'EXÉCUTION VOIT : des liens `<a href="#slug">` pour chaque
 * écran visible du rôle courant, et des boutons « Entrer comme <rôle> » sur
 * l'écran Compte en mode aperçu — il peut donc atteindre chaque écran.
 */
import type { EntiteDeclaree } from './entites-declarees'
import { nomColonne, nomTable } from './entites-declarees'
import { cle } from './lecture-brief'
import { ROLE_VISITEUR, type Plan, type PlanEcran } from './plan-ecrans'

export const ADRESSE_COMPTE = '#compte'
export const CLE_ETAT = 'deribfy:etat'

const typeTs = (t: string): string => (t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'string')
const nomType = (e: EntiteDeclaree): string => {
  const base = nomTable(e).split(/[^a-zA-Z0-9]+/u).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join('')
  return /^[A-Za-z]/u.test(base) ? base : `T${base}`
}
const nomComposant = (slug: string): string => 'Ecran_' + slug.replace(/-/gu, '_')
const j = (v: unknown): string => JSON.stringify(v)

/** `systeme/types.ts` — un type par table, et la session. */
export function sourceTypes(entites: readonly EntiteDeclaree[]): string {
  const types = entites.map((e) => {
    const champs = e.fields.map((f) => `  ${j(nomColonne(f))}: ${typeTs(f.type)}${f.required ? '' : ' | null'}`).join('\n')
    return `/** Table ${nomTable(e)} */\nexport type ${nomType(e)} = {\n  id: Id\n${champs}\n}`
  })
  return [
    '/** TYPES — émis par Deribfy depuis les tables déclarées. Ne pas réécrire. */',
    'export type Id = string',
    '/** Qui est là : un rôle du cahier, ou visiteur. */',
    `export type Session = { readonly role: string; readonly utilisateur: string | null }`,
    `export const ROLE_VISITEUR = ${j(ROLE_VISITEUR)}`,
    `export const TABLES = ${j(entites.map((e) => nomTable(e)))} as const`,
    'export type Table = (typeof TABLES)[number]',
    ...types,
    '',
  ].join('\n')
}

/** `systeme/etat.ts` — le magasin déterministe, la session, les parcours. */
export function sourceEtat(sessionInitiale?: { readonly role: string }): string {
  return `/** ÉTAT — émis par Deribfy. Un magasin clé → valeur, observable, conservé dans le navigateur quand c'est possible. */
import { useEffect, useState } from 'react'
import type { Session } from './types'
import { ROLE_VISITEUR } from './types'

const CLE = ${j(CLE_ETAT)}
type Ecouteur = () => void
const ecouteurs = new Set<Ecouteur>()
let memoire: Record<string, unknown> = charger()

function charger(): Record<string, unknown> {
  try {
    const brut = window.localStorage.getItem(CLE)
    const lu = brut === null ? {} : (JSON.parse(brut) as Record<string, unknown>)
    return typeof lu === 'object' && lu !== null ? lu : {}
  } catch {
    return {}
  }
}
function sauver(): void {
  try { window.localStorage.setItem(CLE, JSON.stringify(memoire)) } catch { /* l'aperçu peut refuser le stockage : la mémoire suffit */ }
}
function prevenir(): void { for (const f of ecouteurs) f() }

/** Lit une valeur, ou le défaut. */
export function lire<T>(clef: string, defaut: T): T {
  return clef in memoire ? (memoire[clef] as T) : defaut
}
/** Écrit une valeur et prévient tous les écrans qui la lisent. */
export function ecrire<T>(clef: string, valeur: T): void {
  memoire = { ...memoire, [clef]: valeur }
  sauver()
  prevenir()
}
export function effacer(clef: string): void {
  const copie = { ...memoire }
  delete copie[clef]
  memoire = copie
  sauver()
  prevenir()
}
export function surChangement(f: Ecouteur): () => void {
  ecouteurs.add(f)
  return () => { ecouteurs.delete(f) }
}
/** Une valeur du magasin, vivante : l'écran se redessine quand elle change. */
export function useEtat<T>(clef: string, defaut: T): [T, (valeur: T) => void] {
  const [valeur, poser] = useState<T>(() => lire(clef, defaut))
  useEffect(() => surChangement(() => { poser(lire(clef, defaut)) }), [clef])
  return [valeur, (v: T) => { ecrire(clef, v) }]
}

// ── LA SESSION : un rôle du cahier, ou visiteur. Dans l'aperçu, on la choisit ;
// en base, on se connecte d'abord (voir navigation.tsx › Compte).
const SESSION_VIDE: Session = { role: ROLE_VISITEUR, utilisateur: null }
${sessionInitiale === undefined ? '' : `if (!('session' in memoire)) memoire = { ...memoire, session: { role: ${j(sessionInitiale.role)}, utilisateur: null } }\n`}
export function sessionCourante(): Session { return lire<Session>('session', SESSION_VIDE) }
export function connecter(role: string, utilisateur: string | null = null): void { ecrire<Session>('session', { role, utilisateur }) }
export function deconnecter(): void { ecrire<Session>('session', SESSION_VIDE) }
export function useSession(): Session {
  const [s] = useEtat<Session>('session', SESSION_VIDE)
  return s
}

// ── LES PARCOURS : ce qu'un écran choisit voyage jusqu'au suivant.
// Clé : '<table>_en_cours' (la ligne choisie, ou null). Exemple : réservations
// écrit 'reservation_en_cours' puis navigue vers le paiement, qui la lit.
export function cleDeParcours(table: string): string { return table + '_en_cours' }
export function useParcours<T>(table: string): [T | null, (valeur: T | null) => void] {
  return useEtat<T | null>(cleDeParcours(table), null)
}
`
}

/** `systeme/base.ts` — l'accès aux données, en base ou en mémoire. */
export function sourceBase(): string {
  return `/** BASE — émis par Deribfy. useTable(table) lit et écrit une table, en base si l'application est publiée, en mémoire dans l'aperçu. */
import { useCallback, useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { lire, ecrire, surChangement } from './etat'
import type { Id } from './types'

type Config = { url: string; clePubliable: string; options?: Record<string, unknown> }
const b: Config = ((window as unknown as { DERIBFY_BASE?: Config }).DERIBFY_BASE) ?? { url: '', clePubliable: '' }
/** Vrai quand l'application est publiée et reliée à sa base. Dans l'aperçu (origine opaque ou url vide), tout vit en mémoire. */
export const enBase: boolean = b.url !== '' && window.origin !== 'null'
export const base: SupabaseClient | null = enBase ? createClient(b.url, b.clePubliable, b.options) : null

export type Table<T extends { id: Id }> = {
  readonly lignes: readonly T[]
  readonly chargement: boolean
  /** Un message lisible, ou null. Un chargement qui échoue ne ressemble JAMAIS à une liste vide. */
  readonly erreur: string | null
  ajouter(valeurs: Omit<T, 'id'>): Promise<T | null>
  modifier(id: Id, valeurs: Partial<Omit<T, 'id'>>): Promise<boolean>
  supprimer(id: Id): Promise<boolean>
  recharger(): Promise<void>
}

let compteur = 0
const cleMemoire = (table: string) => 'table:' + table
const idNeuf = () => 'm' + Date.now().toString(36) + '-' + String(++compteur)
const message = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : String(e))

/** La table, vivante : chaque écran qui l'emploie se redessine quand elle change. */
export function useTable<T extends { id: Id }>(table: string): Table<T> {
  const [lignes, poserLignes] = useState<readonly T[]>(() => (enBase ? [] : lire<readonly T[]>(cleMemoire(table), [])))
  const [chargement, poserChargement] = useState<boolean>(enBase)
  const [erreur, poserErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (base === null) { poserLignes(lire<readonly T[]>(cleMemoire(table), [])); return }
    poserChargement(true)
    const r = await base.from(table).select('*')
    if (r.error) { poserErreur('Impossible de charger ' + table + ' : ' + r.error.message) }
    else { poserErreur(null); poserLignes((r.data ?? []) as T[]) }
    poserChargement(false)
  }, [table])

  useEffect(() => {
    void recharger()
    if (base === null) return surChangement(() => { poserLignes(lire<readonly T[]>(cleMemoire(table), [])) })
    return undefined
  }, [recharger, table])

  const ajouter = useCallback(async (valeurs: Omit<T, 'id'>): Promise<T | null> => {
    if (base === null) {
      const ligne = { ...(valeurs as object), id: idNeuf() } as T
      ecrire(cleMemoire(table), [...lire<readonly T[]>(cleMemoire(table), []), ligne])
      return ligne
    }
    const r = await base.from(table).insert(valeurs as object).select('*').single()
    if (r.error) { poserErreur('Impossible d\\'ajouter dans ' + table + ' : ' + r.error.message); return null }
    await recharger()
    return r.data as T
  }, [recharger, table])

  const modifier = useCallback(async (id: Id, valeurs: Partial<Omit<T, 'id'>>): Promise<boolean> => {
    if (base === null) {
      ecrire(cleMemoire(table), lire<readonly T[]>(cleMemoire(table), []).map((l) => (l.id === id ? { ...l, ...(valeurs as object) } as T : l)))
      return true
    }
    const r = await base.from(table).update(valeurs as object).eq('id', id)
    if (r.error) { poserErreur('Impossible de modifier ' + table + ' : ' + r.error.message); return false }
    await recharger()
    return true
  }, [recharger, table])

  const supprimer = useCallback(async (id: Id): Promise<boolean> => {
    if (base === null) {
      ecrire(cleMemoire(table), lire<readonly T[]>(cleMemoire(table), []).filter((l) => l.id !== id))
      return true
    }
    const r = await base.from(table).delete().eq('id', id)
    if (r.error) { poserErreur('Impossible de retirer de ' + table + ' : ' + r.error.message); return false }
    await recharger()
    return true
  }, [recharger, table])

  return { lignes, chargement, erreur, ajouter, modifier, supprimer, recharger }
}

/** Erreur réseau ou base, rendue lisible pour un écran. */
export function messageDErreur(e: unknown): string { return message(e) }
`
}

/** Un écran du plan tel que la navigation le connaît. */
export type EcranNav = { readonly nom: string; readonly slug: string; readonly role: string; readonly navigation: 'public' | 'gestion'; readonly tables: readonly string[] }

const versNav = (e: PlanEcran): EcranNav => ({ nom: e.nom, slug: e.slug, role: e.role, navigation: e.navigation, tables: [...new Set([...e.tables.lit, ...e.tables.ecrit])] })

/** `systeme/navigation.tsx` — le plan, l'écran courant, la barre du bas, le compte. */
export function sourceNavigation(plan: Plan, roles: readonly string[], nom: string): string {
  const ecrans = plan.ecrans.map(versNav)
  const rolesConnus = [...new Set([...roles, ...plan.ecrans.map((e) => e.role)].filter((r) => cle(r) !== cle(ROLE_VISITEUR)))]
  return `/** NAVIGATION — émise par Deribfy : le plan, l'écran courant, la barre du bas, le compte. Ne pas réécrire. */
import React, { useEffect, useState } from 'react'
import { Bouton, EtatVide, Icone, EnTeteDeSection } from './ui'
import { connecter, deconnecter, useSession } from './etat'
import { base, enBase } from './base'
import { ROLE_VISITEUR } from './types'

export type Ecran = { readonly nom: string; readonly slug: string; readonly role: string; readonly navigation: 'public' | 'gestion'; readonly tables: readonly string[] }
/** LE PLAN : chaque écran lu dans le cahier, avec son rôle et sa navigation. */
export const ECRANS: readonly Ecran[] = ${j(ecrans)}
export const NOM_APPLICATION = ${j(nom)}
export const ROLES = ${j(rolesConnus)}
export const SLUG_COMPTE = 'compte'

const normaliser = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ')
/** Trouve un écran par son slug, ou par son nom tel que le cahier l'écrit. */
export function ecranDe(nomOuSlug: string): Ecran | undefined {
  const n = normaliser(nomOuSlug.replace(/^#/, ''))
  return ECRANS.find((e) => e.slug === n) ?? ECRANS.find((e) => normaliser(e.nom) === n)
}
const premierPublic = () => ECRANS.find((e) => e.slug === 'accueil') ?? ECRANS.find((e) => e.navigation === 'public' && e.role === ROLE_VISITEUR) ?? ECRANS.find((e) => e.navigation === 'public') ?? ECRANS[0]
const premiereGestion = () => ECRANS.find((e) => e.navigation === 'gestion')

/** Le slug que l'adresse désigne : '#slug', '#gestion' (première section de gestion), '#compte', ou l'accueil. */
export function slugDepuisAdresse(hash: string): string {
  const brut = hash.replace(/^#\\/?/, '').trim()
  if (brut === '') return premierPublic()?.slug ?? SLUG_COMPTE
  if (brut === 'gestion') return premiereGestion()?.slug ?? premierPublic()?.slug ?? SLUG_COMPTE
  if (brut === SLUG_COMPTE) return SLUG_COMPTE
  return ecranDe(brut)?.slug ?? premierPublic()?.slug ?? SLUG_COMPTE
}

// ── L'ÉCRAN COURANT : un petit magasin, synchronisé avec l'adresse quand le navigateur la donne.
const ecouteurs = new Set<() => void>()
let courant = slugDepuisAdresse(typeof window === 'undefined' ? '' : window.location.hash)
function poserCourant(slug: string): void {
  courant = slug
  for (const f of ecouteurs) f()
}
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => { poserCourant(slugDepuisAdresse(window.location.hash)) })
}
/** Va à un écran, par slug ou par nom du cahier ('récapitulatif/paiement'), ou au compte. */
export function naviguer(nomOuSlug: string): void {
  const slug = nomOuSlug === SLUG_COMPTE ? SLUG_COMPTE : (ecranDe(nomOuSlug)?.slug ?? slugDepuisAdresse('#' + nomOuSlug))
  try { if (window.location.hash !== '#' + slug) window.location.hash = '#' + slug } catch { /* l'adresse peut être figée dans un cadre */ }
  poserCourant(slug)
}
export function useSlugCourant(): string {
  const [slug, poser] = useState(courant)
  useEffect(() => { const f = () => { poser(courant) }; ecouteurs.add(f); return () => { ecouteurs.delete(f) } }, [])
  return slug
}

/** Les écrans que ce rôle peut ouvrir dans cette navigation. */
export function ecransPour(role: string, navigation: 'public' | 'gestion'): readonly Ecran[] {
  return ECRANS.filter((e) => e.navigation === navigation && (e.role === ROLE_VISITEUR || e.role === role))
}

const lien = (slug: string, texte: string, actif: boolean) => (
  <a key={slug} href={'#' + slug} onClick={(ev) => { ev.preventDefault(); naviguer(slug) }}
    aria-current={actif ? 'page' : undefined}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 10px', textDecoration: 'none', fontSize: 'var(--text-xs)', fontWeight: actif ? 700 : 500,
      color: actif ? 'var(--primary)' : 'var(--muted-foreground)', borderRadius: 'var(--radius-md)' }}>
    <span>{texte}</span>
  </a>
)

/** LA BARRE DU BAS : Accueil, les écrans publics de ce rôle, le compte. */
export function BarreDuBas({ slugCourant }: { slugCourant: string }) {
  const session = useSession()
  const publics = ecransPour(session.role, 'public')
  const accueil = premierPublic()
  return (
    <nav aria-label="Navigation" style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2, padding: '6px 8px', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
      {accueil !== undefined && lien(accueil.slug, 'Accueil', slugCourant === accueil.slug)}
      {publics.filter((e) => e.slug !== accueil?.slug).map((e) => lien(e.slug, e.nom.charAt(0).toUpperCase() + e.nom.slice(1), slugCourant === e.slug))}
      {lien(SLUG_COMPTE, session.role === ROLE_VISITEUR ? 'Compte' : 'Compte · ' + session.role, slugCourant === SLUG_COMPTE)}
    </nav>
  )
}

/** LE COMPTE : qui est là. Dans l'aperçu on choisit son rôle ; en base on se connecte d'abord. */
export function Compte({ attendu }: { attendu?: string }) {
  const session = useSession()
  const [courriel, poserCourriel] = useState('')
  const [motDePasse, poserMotDePasse] = useState('')
  const [erreur, poserErreur] = useState<string | null>(null)
  const [connecteEnBase, poserConnecteEnBase] = useState(false)
  const entrer = async (role: string) => {
    if (enBase && base !== null && !connecteEnBase) {
      const r = await base.auth.signInWithPassword({ email: courriel, password: motDePasse })
      if (r.error) { poserErreur('Connexion refusée : ' + r.error.message); return }
      poserConnecteEnBase(true)
      connecter(role, r.data.user?.email ?? courriel)
      return
    }
    connecter(role, session.utilisateur)
  }
  if (session.role !== ROLE_VISITEUR) {
    return (
      <section style={{ padding: 16, display: 'grid', gap: 12 }}>
        <EnTeteDeSection titre="Compte" description={'Connecté comme ' + session.role + (session.utilisateur ? ' (' + session.utilisateur + ')' : '')} />
        <Bouton texte="Se déconnecter" genre="secondaire" surClic={() => { deconnecter(); naviguer(premierPublic()?.slug ?? SLUG_COMPTE) }} />
      </section>
    )
  }
  return (
    <section style={{ padding: 16, display: 'grid', gap: 12 }}>
      <EnTeteDeSection titre="Qui êtes-vous ?" description={attendu ? 'Cet écran est réservé au rôle « ' + attendu + ' ».' : 'Choisissez votre rôle pour continuer.'} />
      {enBase && (
        <form onSubmit={(ev) => { ev.preventDefault() }} style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4 }}><span>Courriel</span><input type="email" value={courriel} onChange={(ev) => { poserCourriel(ev.target.value) }} style={{ padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--input)' }} /></label>
          <label style={{ display: 'grid', gap: 4 }}><span>Mot de passe</span><input type="password" value={motDePasse} onChange={(ev) => { poserMotDePasse(ev.target.value) }} style={{ padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--input)' }} /></label>
        </form>
      )}
      {erreur !== null && <p role="alert" style={{ color: 'var(--destructive)' }}>{erreur}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ROLES.map((r) => <Bouton key={r} texte={'Entrer comme ' + r} genre={attendu === r ? 'primaire' : 'secondaire'} surClic={() => { void entrer(r) }} />)}
      </div>
      {ROLES.length === 0 && <EtatVide icone="document" message="Aucun rôle n'est défini" detail="Le cahier ne nomme aucun rôle : tous les écrans sont publics." />}
      <Icone nom="document" taille={0} />
    </section>
  )
}
`
}

/** `systeme/application.tsx` — garde de rôle, coque de gestion, mise en page publique. */
export function sourceApplication(plan: Plan, style: string | null): string {
  const imports = plan.ecrans.map((e) => `import ${nomComposant(e.slug)} from '../ecrans/${e.slug}'`).join('\n')
  const table = plan.ecrans.map((e) => `  ${j(e.slug)}: ${nomComposant(e.slug)},`).join('\n')
  return `/** APPLICATION — émise par Deribfy : la garde de rôle, la coque de gestion, la mise en page publique. Ne pas réécrire. */
import React from 'react'
import { CoqueGestion, EtatVide } from './ui'
import { useSession, deconnecter } from './etat'
import { BarreDuBas, Compte, ECRANS, NOM_APPLICATION, SLUG_COMPTE, ecransPour, naviguer, useSlugCourant } from './navigation'
import { ROLE_VISITEUR } from './types'
import type { Session } from './types'
${imports}

type Composant = (props: { session: Session }) => React.ReactElement | null
const COMPOSANTS: Record<string, Composant> = {
${table}
}

export function Application() {
  const session = useSession()
  const slug = useSlugCourant()
  if (slug === SLUG_COMPTE) {
    return <><main style={{ minHeight: '80vh' }}><Compte /></main><BarreDuBas slugCourant={slug} /></>
  }
  const ecran = ECRANS.find((e) => e.slug === slug)
  if (ecran === undefined) {
    return <><main style={{ minHeight: '80vh' }}><EtatVide message="Cet écran n'existe pas" detail="Revenez à l'accueil." /></main><BarreDuBas slugCourant={slug} /></>
  }
  // ── LA GARDE DE RÔLE : un écran réservé s'ouvre quand on est ce rôle ; sinon, le compte.
  if (ecran.role !== ROLE_VISITEUR && session.role !== ecran.role) {
    return <><main style={{ minHeight: '80vh' }}><Compte attendu={ecran.role} /></main><BarreDuBas slugCourant={SLUG_COMPTE} /></>
  }
  const Ecran = COMPOSANTS[ecran.slug]
  const contenu = Ecran === undefined ? <EtatVide message="Écran manquant" /> : <Ecran session={session} />
  if (ecran.navigation === 'gestion') {
    const sections = ecransPour(session.role, 'gestion').map((e) => ({ cle: e.slug, libelle: e.nom.charAt(0).toUpperCase() + e.nom.slice(1), icone: 'document' }))
    return (
      <CoqueGestion nom={NOM_APPLICATION} ${style === null ? '' : `style=${j(style)} `}sections={sections} active={ecran.slug} surChoix={(cle) => { naviguer(cle) }}
        titre={ecran.nom.charAt(0).toUpperCase() + ecran.nom.slice(1)} utilisateur={session.utilisateur ?? session.role}
        surDeconnexion={() => { deconnecter(); naviguer(SLUG_COMPTE) }}>
        {contenu}
        <p style={{ marginTop: 24 }}><a href="#" onClick={(ev) => { ev.preventDefault(); naviguer(ECRANS.find((e) => e.navigation === 'public')?.slug ?? SLUG_COMPTE) }} style={{ color: 'var(--muted-foreground)' }}>Retour à l'accueil</a></p>
      </CoqueGestion>
    )
  }
  return (
    <>
      <main style={{ minHeight: '80vh', padding: '0 0 8px' }}>{contenu}</main>
      <BarreDuBas slugCourant={slug} />
    </>
  )
}
`
}

/** `index.tsx` — monte l'application, n'exporte rien. */
export const SOURCE_INDEX = `import React from 'react'
import { createRoot } from 'react-dom/client'
import { Application } from './systeme/application'

createRoot(document.getElementById('racine')!).render(<Application />)
`

/** `ecrans/<slug>.tsx` quand le modèle n'a rien livré d'acceptable : VISIBLE, NOMMÉ, jamais muet. */
export function sourceACompleter(ecran: PlanEcran, reproches: readonly string[]): string {
  const detail = reproches.length === 0 ? 'Cet écran n’a pas encore été écrit.' : 'Il n’a pas pu être écrit : ' + reproches.map((r) => r.split('\n')[0] ?? '').join(' · ').slice(0, 300)
  return `/** À COMPLÉTER — émis par Deribfy. */
import React from 'react'
import { EtatVide } from '../systeme/ui'
import type { Session } from '../systeme/types'

export default function Ecran(_props: { session: Session }) {
  return (
    <section style={{ padding: 16 }}>
      <div role="status" style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--foreground)', fontSize: 'var(--text-sm)' }}>
        À compléter : ${j(ecran.nom).slice(1, -1)}
      </div>
      <EtatVide icone="document" message={${j('À compléter : ' + ecran.nom)}} detail={${j(detail)}} />
    </section>
  )
}
`
}

export type ResultatEcran = { readonly nom: string; readonly slug: string; readonly resultat: 'ok' | 'a_completer'; readonly reproches: readonly string[] }

/** `PERIMETRE.md` — écrit par Deribfy, jamais par le modèle. */
export function sourcePerimetre(plan: Plan, resultats: readonly ResultatEcran[], questionsOuvertes: readonly string[]): string {
  const par = new Map(resultats.map((r) => [r.slug, r]))
  const lignes = plan.ecrans.map((e) => {
    const r = par.get(e.slug)
    const etat = r === undefined ? 'à compléter (non écrit)' : r.resultat === 'ok' ? 'livré' : 'À COMPLÉTER — ' + (r.reproches[0]?.split('\n')[0] ?? 'non livré').slice(0, 160)
    return `- ${e.nom} (${e.role}, ${e.navigation}${e.tables.lit.length + e.tables.ecrit.length > 0 ? ', tables : ' + [...new Set([...e.tables.lit, ...e.tables.ecrit])].join(', ') : ''}) : ${etat}`
  })
  return [
    '# Périmètre de cette version',
    '',
    `Écrans livrés : ${String(resultats.filter((r) => r.resultat === 'ok').length)} / ${String(plan.ecrans.length)}.`,
    '',
    ...lignes,
    ...(plan.refuses.length > 0 ? ['', '## Ce que le plan a refusé', ...plan.refuses.map((r) => `- ${r.quoi} : ${r.motif}`)] : []),
    ...(questionsOuvertes.length > 0 ? ['', '## Décisions que le cahier laisse ouvertes', ...questionsOuvertes.map((q) => `- ${q}`)] : []),
    '',
  ].join('\n')
}

/**
 * TOUS LES FICHIERS DU SQUELETTE, avec un écran « à compléter » pour chaque
 * écran du plan : l'orchestrateur remplace ceux que le modèle a livrés.
 */
export function fichiersSquelette(o: {
  readonly plan: Plan
  readonly entites: readonly EntiteDeclaree[]
  readonly nom: string
  readonly roles: readonly string[]
  readonly style?: string | null
  /** Pour juger UN écran seul : la session est déjà celle de son rôle. */
  readonly sessionInitiale?: { readonly role: string }
}): Map<string, string> {
  const carte = new Map<string, string>()
  carte.set('index.tsx', SOURCE_INDEX)
  carte.set('systeme/types.ts', sourceTypes(o.entites))
  carte.set('systeme/etat.ts', sourceEtat(o.sessionInitiale))
  carte.set('systeme/base.ts', sourceBase())
  carte.set('systeme/navigation.tsx', sourceNavigation(o.plan, o.roles, o.nom))
  carte.set('systeme/application.tsx', sourceApplication(o.plan, o.style ?? null))
  for (const e of o.plan.ecrans) carte.set(`ecrans/${e.slug}.tsx`, sourceACompleter(e, []))
  return carte
}
