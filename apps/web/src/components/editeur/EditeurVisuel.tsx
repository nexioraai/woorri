'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronDown, ChevronRight, Monitor, Smartphone, Check, Undo2, ExternalLink,
  Search, Image as ImageIcon, LayoutGrid, Settings, Plus, ArrowUp, ArrowDown, Trash2, Eye, EyeOff,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchOwnedSite, updateOwnedSite } from '@/lib/supabase-owned-site'
import { lireBlocs, TYPES_DE_BLOC, type Bloc } from '@/app/sites/[slug]/pages/blocs'
import { champsDuBloc, champEstUnFichier, poser, type Chemin } from '@/components/edit/champsDeBloc'
import { ETIQUETTES, NEUF } from '@/components/EditeurBlocs'
import TeleverseurFichiers from '@/components/TeleverseurFichiers'
import { photoValable } from '@/app/sites/[slug]/pages/photoValable'

// ============================================================================
// L'ÉDITEUR VISUEL — maquette validée par le propriétaire le 2026-11-12.
//
// Le défaut qu'il corrige : dans l'ancien éditeur, l'essentiel (les pages, les
// sections de l'accueil) était caché derrière un petit bouton rond « Menu »,
// et l'on modifiait à l'aveugle. Ici, trois colonnes toujours visibles :
//   · gauche  — la STRUCTURE du site (accueil, pages, réglages) ;
//   · centre  — l'APERÇU RÉEL du site, ordinateur ou téléphone ; un clic sur
//               un bloc le sélectionne ;
//   · droite  — les RÉGLAGES du bloc sélectionné.
// Sur téléphone, les trois colonnes deviennent trois onglets.
//
// IL N'INVENTE AUCUNE ÉCRITURE. Les pages passent par `/api/sites/<slug>/pages`
// (propriété vérifiée côté serveur) ; les sections de l'accueil par
// `updateOwnedSite`, exactement comme l'ancien éditeur. Chaque écriture est
// RELUE depuis la base, puis l'aperçu se recharge : l'écran ne montre jamais un
// état supposé.
// ============================================================================

type Page = {
  id: string; chemin: string; parent: string | null; titre: string; chapeau: string | null
  ordre: number; menu: boolean; publie: boolean; blocs?: unknown
}
type Item = { title?: string; description?: string; image?: string; lien?: string } & Record<string, unknown>
type Section = { name?: string; items?: Item[] } & Record<string, unknown>
type Site = { slug: string; name: string; published: boolean; sections?: Section[] | null } & Record<string, unknown>

type Selection =
  | { quoi: 'section'; i: number }
  | { quoi: 'page'; id: string }
  | { quoi: 'bloc'; id: string; i: number }
  | null

type Annulation = { quoi: 'page'; id: string; blocs: unknown } | { quoi: 'sections'; sections: Section[] } | null

/** Pages techniques : jamais listées comme des pages du site. */
const CACHEES = /^(accueil-hero|couleur-de-marque|assistant-du-site|essai-)/
const CHEMIN_HERO = 'accueil-hero'
const LARGEUR_ORDINATEUR = 1280

function estFicheSansPhoto(p: Page): boolean {
  const b = Array.isArray(p.blocs) ? (p.blocs[0] as { type?: string; photo?: unknown } | undefined) : undefined
  return !!b && b.type === 'citation' && typeof b.photo === 'string' && !photoValable(b.photo)
}

/** Noms de champs lisibles (le reste s'affiche tel quel). */
const NOMS: Record<string, string> = {
  image: 'Photo', photo: 'Photo', texte: 'Texte', titre: 'Titre', libelle: 'Libellé court', auteur: 'Signature',
  fonction: 'Fonction', nom: 'Nom', url: 'Adresse', alt: 'Description de la photo', legende: 'Légende',
  question: 'Question', reponse: 'Réponse', valeur: 'Valeur', date: 'Date', chemin: 'Page', lien: 'Lien',
  detail: 'Détail', couleur: 'Couleur', logo: 'Logo', format: 'Format', poids: 'Poids', note: 'Note',
}
const nomLisible = (chemin: Chemin) => {
  const mots = chemin.filter((x): x is string => typeof x === 'string' && x !== 'items')
  return mots.map((m) => NOMS[m] ?? m).join(' · ') || 'Texte'
}

const champ = 'w-full rounded-[10px] border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FA5D1E]/60'

export default function EditeurVisuel({ slug }: { slug: string }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [pages, setPages] = useState<Page[] | null>(null)
  const [introuvable, setIntrouvable] = useState(false)
  const [sel, setSel] = useState<Selection>(null)
  const [appareil, setAppareil] = useState<'ordinateur' | 'telephone'>('ordinateur')
  const [onglet, setOnglet] = useState<'structure' | 'apercu' | 'reglages'>('apercu')
  const [etat, setEtat] = useState<'ok' | 'enCours' | 'erreur'>('ok')
  const [erreur, setErreur] = useState<string | null>(null)
  const [annulation, setAnnulation] = useState<Annulation>(null)
  const [recherche, setRecherche] = useState('')
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({})
  const [televerse, setTeleverse] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)
  const [version, setVersion] = useState(0)
  const cadre = useRef<HTMLIFrameElement | null>(null)
  const zoneApercu = useRef<HTMLDivElement | null>(null)
  const [echelle, setEchelle] = useState(1)

  // ── LECTURES ───────────────────────────────────────────────────────────────
  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null

  const chargerPages = useCallback(async () => {
    const j = await jeton()
    const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/pages`, { headers: j ? { Authorization: `Bearer ${j}` } : {}, cache: 'no-store' })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setErreur(d.error ?? 'Lecture des pages impossible.'); setPages([]); return }
    setPages((d.pages ?? []) as Page[])
  }, [slug])

  useEffect(() => {
    let vivant = true
    const id = setTimeout(() => {
      void (async () => {
        const { data } = await supabase.auth.getUser()
        if (!data.user?.email) { router.push('/login'); return }
        const s = await fetchOwnedSite<Site>(slug, data.user.email)
        if (!vivant) return
        if (!s) { setIntrouvable(true); return }
        setEmail(data.user.email); setSite(s)
        await chargerPages()
      })()
    }, 0)
    return () => { vivant = false; clearTimeout(id) }
  }, [slug, router, chargerPages])

  // ── DÉRIVÉS ────────────────────────────────────────────────────────────────
  const sections: Section[] = useMemo(() => (Array.isArray(site?.sections) ? site!.sections! : []), [site])
  const hero = pages?.find((p) => p.chemin === CHEMIN_HERO) ?? null
  const visibles = useMemo(() => (pages ?? []).filter((p) => !CACHEES.test(p.chemin)), [pages])
  const enfants = useCallback((parent: string | null) =>
    visibles.filter((p) => (p.parent ?? null) === parent).sort((a, b) => a.ordre - b.ordre || a.titre.localeCompare(b.titre)), [visibles])
  const sansPhoto = (p: Page) => enfants(p.chemin).filter(estFicheSansPhoto).length
  const pageSel = sel && sel.quoi !== 'section' ? (pages ?? []).find((p) => p.id === sel.id) ?? null : null
  const blocsSel = useMemo(() => (pageSel && Array.isArray(pageSel.blocs) ? (pageSel.blocs as unknown[]) : []), [pageSel])

  // L'adresse de l'aperçu suit la sélection.
  const apercu = (() => {
    const base = site?.published ? `/sites/${slug}` : `/preview/${slug}`
    if (!sel || sel.quoi === 'section' || (pageSel && pageSel.chemin === CHEMIN_HERO)) return base
    if (pageSel && pageSel.publie && site?.published) return `${base}/${pageSel.chemin}`
    return null
  })()
  const ancre = sel?.quoi === 'section' ? (sel.i === 0 ? 'services' : `section-${sel.i}`) : (pageSel?.chemin === CHEMIN_HERO ? 'home' : null)

  // ── L'APERÇU : clic → sélection, surlignage de la sélection ────────────────
  const brancherApercu = useCallback(() => {
    const doc = cadre.current?.contentDocument
    if (!doc || !doc.body) return
    if (!doc.getElementById('ed-style')) {
      const st = doc.createElement('style'); st.id = 'ed-style'
      // Les zones de l'accueil ont une boîte ; les repères de bloc
      // (`data-bloc`, display: contents) n'en ont pas : on surligne leurs enfants.
      st.textContent = '[data-ed-sel]:not([data-bloc]),[data-bloc][data-ed-sel]>*{outline:3px solid #FA5D1E!important;outline-offset:-3px}' +
        '[data-ed-cible]:not([data-bloc]):hover,[data-bloc][data-ed-cible]:hover>*{outline:2px dashed rgba(250,93,30,.7)!important;outline-offset:-2px;cursor:pointer}' +
        // Dans l'APERÇU seulement : le bandeau des cookies et le guide
        // d'installation recouvraient le site qu'on modifie.
        '[data-cookie-consent-panel],[data-installer-deribfy]{display:none!important}'
      doc.head.appendChild(st)
    }
    doc.querySelectorAll('[data-ed-sel]').forEach((e) => e.removeAttribute('data-ed-sel'))
    doc.querySelectorAll('[data-ed-cible]').forEach((e) => e.removeAttribute('data-ed-cible'))
    // Zones de l'accueil (ids posés par le thème).
    const zones: [string, Selection][] = []
    if (hero) zones.push(['home', { quoi: 'bloc', id: hero.id, i: 0 }])
    sections.forEach((_, i) => zones.push([i === 0 ? 'services' : `section-${i}`, { quoi: 'section', i }]))
    for (const [idZone] of zones) doc.getElementById(idZone)?.setAttribute('data-ed-cible', '')
    // Blocs d'une page : chacun porte son repère `data-bloc` (BlocsDePage).
    // Le n-ième bloc LU par la page n'est pas forcément le n-ième bloc stocké
    // (un bloc mal formé est écarté à la lecture) : on traduit l'un en l'autre.
    const conteneur = doc.querySelector('.blocs-page')
    const lus = blocsSel.map((b, i) => (lireBlocs([b]).length === 1 ? i : -1)).filter((i) => i >= 0)
    if (pageSel && pageSel.chemin !== CHEMIN_HERO && conteneur) {
      conteneur.querySelectorAll(':scope > [data-bloc]').forEach((e) => {
        const stocke = lus[Number((e as HTMLElement).dataset.bloc)]
        if (stocke === undefined) return
        e.setAttribute('data-ed-cible', ''); (e as HTMLElement).dataset.edBloc = String(stocke)
      })
    }
    // Surlignage.
    let cible: Element | null = null
    if (sel?.quoi === 'section') cible = doc.getElementById(sel.i === 0 ? 'services' : `section-${sel.i}`)
    else if (sel?.quoi === 'bloc' && pageSel?.chemin === CHEMIN_HERO) cible = doc.getElementById('home')
    else if (sel?.quoi === 'bloc') cible = conteneur?.querySelector(`[data-ed-bloc="${sel.i}"]`) ?? null
    if (cible) {
      cible.setAttribute('data-ed-sel', '')
      // Un repère sans boîte ne se fait pas défiler : on vise son premier enfant.
      const boite = cible.hasAttribute('data-bloc') ? cible.firstElementChild : cible
      boite?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    else if (ancre) doc.getElementById(ancre)?.scrollIntoView({ block: 'start' })

    doc.onclick = (ev) => {
      const t = ev.target as Element | null
      if (!t) return
      // L'aperçu ne navigue pas : un clic sélectionne.
      if (t.closest('a, button, summary')) ev.preventDefault()
      const b = t.closest('[data-ed-bloc]') as HTMLElement | null
      if (b && pageSel) { setSel({ quoi: 'bloc', id: pageSel.id, i: Number(b.dataset.edBloc) }); setOnglet('reglages'); return }
      for (const [idZone, s] of zones) {
        if (t.closest(`#${idZone}`)) { setSel(s); setOnglet('reglages'); return }
      }
    }
  }, [sel, pageSel, blocsSel, sections, hero, ancre])

  useEffect(() => {
    const id = setTimeout(brancherApercu, 0)
    return () => clearTimeout(id)
  }, [brancherApercu])

  const rechargerApercu = () => setVersion((v) => v + 1)

  // L'APERÇU « ORDINATEUR » EST UN VRAI ÉCRAN DE 1280 PX, réduit à la colonne.
  // Sans cela, la colonne (≈ 800 px, plus haute que large) recevait la mise en
  // page TABLETTE du site — mesuré le 2026-11-12 sur le hero de la CPA.
  useEffect(() => {
    const z = zoneApercu.current
    if (!z || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setEchelle(Math.min(1, e.contentRect.width / LARGEUR_ORDINATEUR)))
    ro.observe(z)
    return () => ro.disconnect()
  }, [site, pages])

  // ── ÉCRITURES ──────────────────────────────────────────────────────────────
  const ecrirePage = async (p: Page, changements: Record<string, unknown>, memoriser = true) => {
    setEtat('enCours'); setErreur(null)
    const j = await jeton()
    const r = await fetch(`/api/sites/${encodeURIComponent(slug)}/pages`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(j ? { Authorization: `Bearer ${j}` } : {}) },
      body: JSON.stringify({ id: p.id, ...changements }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setEtat('erreur'); setErreur(d.error ?? 'Enregistrement refusé.'); return false }
    if (memoriser && 'blocs' in changements) setAnnulation({ quoi: 'page', id: p.id, blocs: p.blocs })
    await chargerPages(); setEtat('ok'); rechargerApercu(); return true
  }

  const ecrireBlocs = (p: Page, blocs: unknown[]) => ecrirePage(p, { blocs })

  const ecrireSections = async (nouvelles: Section[], memoriser = true) => {
    if (!email || !site) return
    setEtat('enCours'); setErreur(null)
    const avant = sections
    const res = await updateOwnedSite(slug, email, { sections: nouvelles }) as { error?: { message?: string } | null } | undefined
    if (res?.error) { setEtat('erreur'); setErreur(res.error.message ?? 'Enregistrement refusé.'); return }
    const relu = await fetchOwnedSite<Site>(slug, email)
    if (relu) setSite(relu)
    if (memoriser) setAnnulation({ quoi: 'sections', sections: avant })
    setEtat('ok'); rechargerApercu()
  }

  const annuler = async () => {
    const a = annulation
    if (!a) return
    setAnnulation(null)
    if (a.quoi === 'sections') { await ecrireSections(a.sections, false); return }
    const p = (pages ?? []).find((x) => x.id === a.id)
    if (p) await ecrirePage(p, { blocs: a.blocs }, false)
  }

  // ── RENDU ──────────────────────────────────────────────────────────────────
  if (introuvable) return (
    <div className="min-h-screen bg-[#0B0711] text-white flex items-center justify-center p-6 text-center">
      <div><p className="mb-4">Ce site est introuvable, ou il ne vous appartient pas.</p>
        <Link href="/dashboard" className="text-[#FFB08F] underline">Retour au tableau de bord</Link></div>
    </div>
  )
  if (!site || !pages) return <div className="min-h-screen bg-[#0B0711] text-white/60 flex items-center justify-center">Chargement de l’éditeur…</div>

  const filtre = recherche.trim().toLowerCase()
  const correspond = (t: string) => !filtre || t.toLowerCase().includes(filtre)
  const lienArbre = (actif: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] ${actif ? 'bg-[#FA5D1E]/15 font-semibold text-[#FFB08F]' : 'text-white/80 hover:bg-white/5'}`

  const arbre = (parent: string | null, profondeur: number): React.ReactNode => (
    <>
      {enfants(parent).map((p) => {
        const sous = enfants(p.chemin)
        const ouvert = ouverts[p.chemin] ?? (filtre !== '' || (sel?.quoi !== 'section' && !!pageSel && pageSel.chemin.startsWith(`${p.chemin}/`)))
        const visible = correspond(p.titre) || sous.some((s) => correspond(s.titre))
        if (!visible) return null
        const n = sansPhoto(p)
        return (
          <div key={p.id}>
            <div className="flex items-center" style={{ paddingInlineStart: profondeur * 14 }}>
              {sous.length > 0 ? (
                <button type="button" aria-label={ouvert ? `Replier ${p.titre}` : `Déplier ${p.titre}`} aria-expanded={ouvert}
                  onClick={() => setOuverts((o) => ({ ...o, [p.chemin]: !ouvert }))}
                  className="flex h-8 w-6 shrink-0 items-center justify-center text-white/50 hover:text-white">
                  {ouvert ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : <span className="w-6 shrink-0" />}
              <button type="button" onClick={() => { setSel({ quoi: 'page', id: p.id }); setOnglet('reglages') }}
                className={lienArbre(pageSel?.id === p.id)}>
                <span className={`flex-1 truncate ${p.publie ? '' : 'italic text-white/45'}`}>{p.titre}</span>
                {n > 0 && <span className="rounded-full bg-[#FFB08F] px-1.5 text-[11px] font-bold leading-5 text-[#1A0A03]" title={`${n} fiche(s) sans photo`}>{n}</span>}
              </button>
            </div>
            {ouvert && sous.length > 0 && arbre(p.chemin, profondeur + 1)}
          </div>
        )
      })}
    </>
  )

  const structure = (
    <nav aria-label="Structure du site" className="flex flex-col gap-1">
      <label htmlFor="ed-recherche" className="sr-only">Rechercher une page</label>
      <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-white/50" aria-hidden />
        <input id="ed-recherche" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une page…"
          className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/40" />
      </div>
      <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold tracking-[0.14em] text-white/45">ACCUEIL</div>
      {hero && correspond('hero parcours photos') && (
        <button type="button" onClick={() => { setSel({ quoi: 'bloc', id: hero.id, i: 0 }); setOnglet('reglages') }}
          className={lienArbre(pageSel?.id === hero.id)}><ImageIcon className="h-4 w-4 shrink-0" aria-hidden />Hero — photos de l’accueil</button>
      )}
      {sections.map((s, i) => correspond(s.name ?? '') && (
        <button key={i} type="button" onClick={() => { setSel({ quoi: 'section', i }); setOnglet('reglages') }}
          className={lienArbre(sel?.quoi === 'section' && sel.i === i)}><LayoutGrid className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{s.name || `Section ${i + 1}`}</span></button>
      ))}
      <div className="px-2.5 pb-1 pt-4 text-[11px] font-semibold tracking-[0.14em] text-white/45">PAGES · {visibles.filter((p) => p.publie).length}</div>
      {arbre(null, 0)}
      <div className="px-2.5 pb-1 pt-4 text-[11px] font-semibold tracking-[0.14em] text-white/45">RÉGLAGES DU SITE</div>
      <Link href={`/edit/${slug}`} className={lienArbre(false)}><Settings className="h-4 w-4 shrink-0" aria-hidden />Identité, logo, couleurs, coordonnées</Link>
    </nav>
  )

  const cadreApercu = apercu ? (
    <iframe
      key={`${apercu}-${version}`}
      ref={cadre}
      title="Aperçu du site"
      src={apercu}
      onLoad={brancherApercu}
      className="block border-0 bg-white"
      // Sur un écran étroit (téléphone), l'aperçu est toujours celui du téléphone :
      // un écran d'ordinateur réduit au quart y serait illisible.
      style={appareil === 'ordinateur' && echelle >= 0.45
        ? { width: LARGEUR_ORDINATEUR, height: `${100 / echelle}%`, transform: `scale(${echelle})`, transformOrigin: '0 0' }
        : { width: '100%', height: '100%' }}
    />
  ) : (
    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[#111]/70">
      Cette page n’est pas publiée : elle n’a pas encore d’aperçu.<br />Publiez-la depuis le panneau de droite pour la voir ici.
    </div>
  )

  const centre = (
    <div className="flex h-full min-h-0 flex-col items-center">
      <p className="mb-3 text-center text-xs text-white/50">Aperçu en direct · cliquez sur un bloc pour le modifier</p>
      <div ref={zoneApercu} className={`min-h-0 flex-1 overflow-hidden bg-white shadow-2xl ${appareil === 'ordinateur' ? 'w-full rounded-[10px] border border-white/10' : 'w-[390px] max-w-full rounded-[28px] border-8 border-[#1C1528]'}`}>
        {cadreApercu}
      </div>
    </div>
  )

  // ── Le panneau de droite ──
  const champs = (p: Page, i: number) => {
    const b = blocsSel[i] as Bloc | undefined
    if (!b) return null
    const estHero = p.chemin === CHEMIN_HERO
    const majChamp = (chemin: Chemin, valeur: string) => {
      const c = [...blocsSel]; c[i] = poser(b, chemin, valeur); void ecrireBlocs(p, c)
    }
    const bouger = (d: number) => {
      const j = i + d; if (j < 0 || j >= blocsSel.length) return
      const c = [...blocsSel]; [c[i], c[j]] = [c[j], c[i]]; void ecrireBlocs(p, c).then((ok) => { if (ok) setSel({ quoi: 'bloc', id: p.id, i: j }) })
    }
    const duree = (b as { duree?: unknown }).duree
    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-white/45">BLOC SÉLECTIONNÉ</div>
          <div className="mt-1 text-[17px] font-bold text-white">{estHero ? 'Hero — photos de l’accueil' : `${ETIQUETTES[b.type] ?? b.type}`}</div>
          {!estHero && (
            <button type="button" onClick={() => setSel({ quoi: 'page', id: p.id })} className="mt-1 text-[13px] text-[#FFB08F] hover:underline">← {p.titre}</button>
          )}
        </div>
        {estHero && b.type === 'etapes' && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-white/75">Chaque photo reste</span>
            <div className="flex gap-1.5">
              {[2, 4, 6].map((s) => {
                const actif = (typeof duree === 'number' ? duree : 4) === s
                return (
                  <button key={s} type="button" aria-pressed={actif} onClick={() => { const c = [...blocsSel]; c[i] = { ...b, duree: s }; void ecrireBlocs(p, c) }}
                    className={`rounded-[10px] px-3.5 py-2 text-[13px] ${actif ? 'bg-[#FA5D1E] font-bold text-[#1A0A03]' : 'border border-white/12 bg-white/[0.04] text-white/80'}`}>{s} s</button>
                )
              })}
            </div>
          </div>
        )}
        {champsDuBloc(b).map(({ chemin, valeur }) => {
          const cle = chemin.join('.')
          const nom = nomLisible(chemin)
          const rang = chemin.find((s) => typeof s === 'number')
          const fichier = champEstUnFichier(b.type, chemin[chemin.length - 1])
          return (
            <div key={`${i}-${cle}-${version}`} className="flex flex-col gap-1.5">
              <label htmlFor={`ed-${cle}`} className="text-[12.5px] text-white/65">
                {typeof rang === 'number' ? `${rang + 1}. ` : ''}{nom}
              </label>
              {fichier && photoValable(valeur) && /\.(png|jpe?g|webp|gif|avif)(\?|$)|images\.pexels/i.test(valeur) ? (
                // eslint-disable-next-line @next/next/no-img-element -- fichier du marchand, hors loader
                <img id={`ed-${cle}`} src={valeur} alt="" className="h-28 w-full rounded-[10px] border border-white/10 object-cover" />
              ) : fichier && !photoValable(valeur) ? (
                <div id={`ed-${cle}`} className="flex h-20 items-center justify-center rounded-[10px] border border-dashed border-white/20 text-[12.5px] text-white/50">Aucune photo</div>
              ) : valeur.length > 70
                ? <textarea id={`ed-${cle}`} defaultValue={valeur} rows={3} onBlur={(e) => { if (e.target.value !== valeur) majChamp(chemin, e.target.value) }} className={champ} />
                : <input id={`ed-${cle}`} defaultValue={valeur} onBlur={(e) => { if (e.target.value !== valeur) majChamp(chemin, e.target.value) }} className={champ} />}
              {fichier && (
                <div>
                  <button type="button" onClick={() => setTeleverse(televerse === cle ? null : cle)} className="text-[12.5px] font-semibold text-[#FFB08F]">
                    {televerse === cle ? 'Fermer' : photoValable(valeur) ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {televerse === cle && (
                    <div className="mt-2 rounded-lg border border-white/10 p-2">
                      <TeleverseurFichiers slug={slug} dossier={b.type === 'documents' ? 'documents' : 'photos'}
                        onChoisir={(f) => { setTeleverse(null); majChamp(chemin, f.url) }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!estHero && (
          <div className="flex gap-2 border-t border-white/10 pt-4">
            <button type="button" onClick={() => bouger(-1)} aria-label="Monter le bloc" className="rounded-lg border border-white/12 p-2 text-white/80 hover:bg-white/5"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => bouger(1)} aria-label="Descendre le bloc" className="rounded-lg border border-white/12 p-2 text-white/80 hover:bg-white/5"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={() => { if (confirm(`Supprimer ce bloc « ${ETIQUETTES[b.type] ?? b.type} » ?`)) { const c = blocsSel.filter((_, j) => j !== i); void ecrireBlocs(p, c).then((ok) => { if (ok) setSel({ quoi: 'page', id: p.id }) }) } }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-2 text-[13px] text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" aria-hidden />Supprimer</button>
          </div>
        )}
      </div>
    )
  }

  const panneauPage = (p: Page) => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-white/45">PAGE</div>
        <div className="mt-1 text-[17px] font-bold text-white">{p.titre}</div>
        <div className="text-[12.5px] text-white/50">/{p.chemin}</div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ed-titre" className="text-[12.5px] text-white/65">Titre de la page</label>
        <input key={`t-${p.id}-${version}`} id="ed-titre" defaultValue={p.titre} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== p.titre) void ecrirePage(p, { titre: e.target.value }) }} className={champ} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ed-chapeau" className="text-[12.5px] text-white/65">Phrase d’introduction</label>
        <textarea key={`c-${p.id}-${version}`} id="ed-chapeau" rows={3} defaultValue={p.chapeau ?? ''} onBlur={(e) => { if (e.target.value !== (p.chapeau ?? '')) void ecrirePage(p, { chapeau: e.target.value || null }) }} className={champ} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void ecrirePage(p, { publie: !p.publie })}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold ${p.publie ? 'bg-emerald-400/10 text-emerald-300' : 'border border-white/12 text-white/80'}`}>
          {p.publie ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}{p.publie ? 'Publiée' : 'Brouillon — publier'}
        </button>
        <button type="button" onClick={() => void ecrirePage(p, { menu: !p.menu })}
          className="rounded-lg border border-white/12 px-3 py-2 text-[13px] text-white/80">{p.menu ? 'Dans le menu' : 'Hors du menu'}</button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-white/75">Les blocs de la page · cliquez pour modifier</span>
        {blocsSel.length === 0 && <p className="text-[13px] text-white/50">Aucun bloc pour l’instant.</p>}
        {blocsSel.map((b, i) => {
          const x = b as { type: string; texte?: string; titre?: string; libelle?: string }
          const apercuTexte = x.titre ?? x.texte ?? x.libelle ?? ''
          return (
            <button key={i} type="button" onClick={() => setSel({ quoi: 'bloc', id: p.id, i })}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-left hover:border-white/20">
              <span className="w-6 text-center text-[12px] text-white/40">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-white">{ETIQUETTES[x.type] ?? x.type}</span>
                {apercuTexte && <span className="block truncate text-[12px] text-white/50">{apercuTexte}</span>}
              </span>
              <ChevronRight className="h-4 w-4 text-white/30" aria-hidden />
            </button>
          )
        })}
      </div>
      <div>
        <button type="button" onClick={() => setAjout(!ajout)} className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 text-[13.5px] font-semibold text-white hover:bg-white/10">
          <Plus className="mr-1 inline h-4 w-4" aria-hidden />Ajouter un bloc
        </button>
        {ajout && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {TYPES_DE_BLOC.map((t) => (
              <button key={t} type="button" onClick={() => { setAjout(false); const c = [...blocsSel, NEUF[t]]; void ecrireBlocs(p, c).then((ok) => { if (ok) setSel({ quoi: 'bloc', id: p.id, i: c.length - 1 }) }) }}
                className="rounded-lg border border-white/10 px-2.5 py-2 text-left text-[12.5px] text-white/85 hover:bg-white/5">{ETIQUETTES[t]}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const panneauSection = (i: number) => {
    const s = sections[i]
    if (!s) return null
    const items = Array.isArray(s.items) ? s.items : []
    const cibles = visibles.filter((p) => p.publie).map((p) => ({ v: p.chemin, t: p.titre }))
    const majItem = (k: number, champNom: string, valeur: string) => {
      const n = sections.map((x, j) => j !== i ? x : { ...x, items: items.map((it, m) => m !== k ? it : { ...it, [champNom]: valeur || undefined }) })
      void ecrireSections(n)
    }
    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-white/45">SECTION DE L’ACCUEIL</div>
          <div className="mt-1 text-[17px] font-bold text-white">{s.name}</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ed-sec-nom" className="text-[12.5px] text-white/65">Titre de la section</label>
          <input key={`s-${i}-${version}`} id="ed-sec-nom" defaultValue={s.name ?? ''} className={champ}
            onBlur={(e) => { if (e.target.value !== (s.name ?? '')) void ecrireSections(sections.map((x, j) => j === i ? { ...x, name: e.target.value } : x)) }} />
        </div>
        <span className="text-[13px] text-white/75">Les cartes, et la page où elles mènent</span>
        {items.map((it, k) => (
          <div key={`${k}-${version}`} className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
            <label className="sr-only" htmlFor={`ed-it-t-${k}`}>Titre de la carte {k + 1}</label>
            <input id={`ed-it-t-${k}`} defaultValue={it.title ?? ''} className={`${champ} font-semibold`} onBlur={(e) => { if (e.target.value !== (it.title ?? '')) majItem(k, 'title', e.target.value) }} />
            <label className="sr-only" htmlFor={`ed-it-d-${k}`}>Texte de la carte {k + 1}</label>
            <textarea id={`ed-it-d-${k}`} rows={2} defaultValue={it.description ?? ''} className={champ} onBlur={(e) => { if (e.target.value !== (it.description ?? '')) majItem(k, 'description', e.target.value) }} />
            <label htmlFor={`ed-it-l-${k}`} className="text-[12px] text-white/60">Mène à</label>
            <select id={`ed-it-l-${k}`} value={typeof it.lien === 'string' ? it.lien : ''} onChange={(e) => majItem(k, 'lien', e.target.value)} className={champ}>
              <option value="">— aucune page (fiche simple)</option>
              <option value="#partenaires">Section Partenaires de l’accueil</option>
              {cibles.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
            </select>
            <button type="button" onClick={() => setTeleverse(televerse === `sec-${k}` ? null : `sec-${k}`)} className="self-start text-[12.5px] font-semibold text-[#FFB08F]">
              {televerse === `sec-${k}` ? 'Fermer' : it.image ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {televerse === `sec-${k}` && (
              <div className="rounded-lg border border-white/10 p-2">
                <TeleverseurFichiers slug={slug} dossier="photos" onChoisir={(f) => { setTeleverse(null); majItem(k, 'image', f.url) }} />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const reglages = (
    <div>
      {erreur && <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{erreur}</p>}
      {!sel && <p className="text-sm text-white/60">Choisissez un élément dans la structure, ou cliquez sur un bloc dans l’aperçu.</p>}
      {sel?.quoi === 'section' && panneauSection(sel.i)}
      {sel?.quoi === 'page' && pageSel && panneauPage(pageSel)}
      {sel?.quoi === 'bloc' && pageSel && champs(pageSel, sel.i)}
    </div>
  )

  const segment = (actif: boolean) => `inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] ${actif ? 'bg-[#2A2138] font-semibold text-white' : 'text-white/60 hover:text-white'}`
  const lienPublic = site.published ? `/sites/${slug}` : `/preview/${slug}`

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0B0711] text-white" data-editeur-visuel="">
      <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0E0915] px-3 md:px-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-white/80 hover:text-white">
          <ChevronLeft className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Tableau de bord</span>
        </Link>
        <span className="hidden h-6 w-px bg-white/10 md:block" />
        <span className="hidden truncate text-sm font-semibold md:block">{site.name}</span>
        <div className="mx-auto hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-[3px] lg:flex">
          <button type="button" aria-pressed={appareil === 'ordinateur'} onClick={() => setAppareil('ordinateur')} className={segment(appareil === 'ordinateur')}><Monitor className="h-4 w-4" aria-hidden />Ordinateur</button>
          <button type="button" aria-pressed={appareil === 'telephone'} onClick={() => setAppareil('telephone')} className={segment(appareil === 'telephone')}><Smartphone className="h-4 w-4" aria-hidden />Téléphone</button>
        </div>
        <span className={`ms-auto inline-flex items-center gap-1.5 text-[13px] lg:ms-0 ${etat === 'erreur' ? 'text-red-300' : etat === 'enCours' ? 'text-white/60' : 'text-emerald-300'}`} aria-live="polite">
          {etat === 'ok' && <Check className="h-3.5 w-3.5" aria-hidden />}
          {etat === 'ok' ? 'Enregistré' : etat === 'enCours' ? 'Enregistrement…' : 'Non enregistré'}
        </span>
        <button type="button" onClick={() => void annuler()} disabled={!annulation}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-white/80 hover:text-white disabled:opacity-35">
          <Undo2 className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Annuler</span>
        </button>
        <a href={lienPublic} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#FA5D1E] px-3.5 py-2 text-sm font-bold text-[#1A0A03] hover:brightness-110">
          <ExternalLink className="h-4 w-4" aria-hidden />Voir le site
        </a>
      </header>

      {/* Téléphone et tablette : trois onglets. */}
      <div role="tablist" aria-label="Vue de l’éditeur" className="mx-3 mt-2.5 grid shrink-0 grid-cols-3 gap-1 rounded-[14px] bg-white/[0.05] p-1 lg:hidden">
        {([['structure', 'Structure'], ['apercu', 'Aperçu'], ['reglages', 'Réglages']] as const).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)}
            className={`rounded-[11px] py-2.5 text-sm ${onglet === k ? 'bg-[#2A2138] font-semibold text-white' : 'text-white/60'}`}>{t}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={`${onglet === 'structure' ? 'block' : 'hidden'} w-full overflow-y-auto border-white/[0.08] bg-[#0E0915] p-3 lg:block lg:w-[268px] lg:shrink-0 lg:border-e`}>
          {structure}
        </aside>
        <section aria-label="Aperçu en direct" className={`${onglet === 'apercu' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col bg-[#07040B] p-3 lg:flex lg:p-5`}>
          {centre}
        </section>
        <aside aria-label="Réglages" className={`${onglet === 'reglages' ? 'block' : 'hidden'} w-full overflow-y-auto border-white/[0.08] bg-[#0E0915] p-4 lg:block lg:w-[340px] lg:shrink-0 lg:border-s`}>
          {reglages}
        </aside>
      </div>
    </div>
  )
}
