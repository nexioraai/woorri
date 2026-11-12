'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, Pencil, Users, Inbox, BookOpen, Globe, BarChart3, Link2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/lib/translations'
import { computeAiScore } from '@/app/lib/aiScore'
import { prochainesActions, compterFiches, type ActionProjet } from '@/lib/dashboard/prochainesActions'

// ============================================================================
// L'ACCUEIL DU PROJET (maquette validée par le propriétaire, 2026-11-12).
//
// Remplace la carte du tableau de bord, dont les boutons étaient des icônes
// muettes (boîte, personnes, livre, « .app », globe). Ici, dans l'ordre :
// le site (aperçu, statut, lien réel, Voir / Modifier), les PROCHAINES
// ACTIONS calculées sur les vraies données (lib/dashboard/prochainesActions),
// l'ACTIVITÉ chiffrée, la visibilité IA, et des RACCOURCIS nommés.
//
// AUCUNE FONCTION DE L'ANCIENNE CARTE N'EST PERDUE : Voir, Éditer, offres
// reçues, comptes, guide, adresse .deribfy.app, domaine, mise en ligne — tout
// y est, avec un nom. Les gestes eux-mêmes (paiement, attribution d'adresse)
// restent ceux du tableau de bord, passés en props.
//
// Une lecture ratée n'affiche pas « 0 » : elle affiche « — ». Un zéro dirait
// « rien à faire », ce qu'on n'a pas mesuré.
// ============================================================================

type Site = {
  slug: string; name: string; published: boolean; type?: string | null
  hero_image?: string | null; primary_color?: string | null
  logo_url?: string | null; custom_domain?: string | null
  contact?: { email?: string | null; phone?: string | null } | null
  publishes_tenders?: boolean | null; ouvre_des_comptes?: boolean | null
} & Record<string, unknown>

type Props = {
  site: Site
  /** Comptes en attente (déjà lus par le tableau de bord) ; undefined = non lu. */
  comptesEnAttente?: number
  /** Offres reçues non décidées ; undefined = non lu. */
  offresRecues?: number
  onPublier: () => void
  onAdresseApp: () => void
}

const carte = 'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 md:p-6'

export default function AccueilProjet({ site, comptesEnAttente, offresRecues, onPublier, onAdresseApp }: Props) {
  const { t } = useTranslation()
  const [lien, setLien] = useState<string | null>(null)
  const [pages, setPages] = useState<{ blocs?: unknown; publie?: boolean }[] | null>(null)
  const [avisPublie, setAvisPublie] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<number | null>(null)
  const [copie, setCopie] = useState(false)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const { data: sess } = await supabase.auth.getSession()
      const jeton = sess.session?.access_token
      if (!jeton) return
      const lire = async <T,>(url: string): Promise<T | null> => {
        try {
          const r = await fetch(url, { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' })
          return r.ok ? ((await r.json()) as T) : null
        } catch { return null }
      }
      const s = encodeURIComponent(site.slug)
      const [adr, pg, av, dm] = await Promise.all([
        lire<{ lien: string | null }>(`/api/sites/adresse?slug=${s}`),
        lire<{ pages: { blocs?: unknown; publie?: boolean }[] }>(`/api/sites/${s}/pages`),
        site.publishes_tenders === true ? lire<{ avis: { publie?: boolean }[] }>(`/api/sites/${s}/avis`) : Promise.resolve(null),
        lire<{ demandes: { etat?: string }[] }>(`/api/sites/${s}/demandes`),
      ])
      if (!vivant) return
      setLien(adr?.lien ?? null)
      setPages(pg?.pages ?? null)
      setAvisPublie(av ? av.avis.some((a) => a.publie === true) : null)
      setMessages(dm ? dm.demandes.filter((d) => d.etat === 'recu').length : null)
    })()
    return () => { vivant = false }
  }, [site.slug, site.publishes_tenders])

  const { score, missing } = computeAiScore(site as never)
  const fiches = pages ? compterFiches(pages) : null
  const actions = prochainesActions({
    slug: site.slug, published: site.published, logo_url: site.logo_url, custom_domain: site.custom_domain,
    contact: site.contact, publishes_tenders: site.publishes_tenders,
    lacunesIA: missing, fiches: fiches ? fiches.fiches : null, fichesSansPhoto: fiches ? fiches.sansPhoto : null, avisPublie,
  })
  const faites = actions.filter((a) => a.faite).length
  const pagesPubliees = pages ? pages.filter((p) => p.publie === true).length : null

  const adressePublique = site.custom_domain ? `https://${site.custom_domain}` : lien
  const lienVoir = adressePublique ?? (site.published ? `/sites/${site.slug}` : `/preview/${site.slug}`)
  const couleur = site.primary_color || '#FA5D1E'

  const libelle = (a: ActionProjet): string => {
    const k = `projet.a.${a.cle}${a.faite ? '.ok' : ''}` as const
    return t(k as never).replace('{n}', String(a.n ?? ''))
  }
  const detail = (a: ActionProjet): string | null => {
    if (a.faite) return null
    if (a.cle === 'logo') return t('projet.a.logo.detail')
    if (a.cle === 'visibilite' && a.n) return t('dashboard.actionsToReach').replace('{n}', String(a.n))
    if (a.cle === 'domaine' && adressePublique) return adressePublique.replace(/^https?:\/\//, '')
    return null
  }
  const nombre = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(n))

  return (
    <div className="flex min-w-0 flex-col gap-5 md:gap-6">
      {/* ── LE SITE */}
      <section className={`${carte} flex flex-col md:flex-row gap-5 md:gap-7 md:items-center`}>
        <div className="relative w-full md:w-64 h-36 md:h-40 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="absolute inset-x-0 top-0 h-4" style={{ background: couleur }} />
          {typeof site.hero_image === 'string' && site.hero_image.startsWith('http') && (
            // eslint-disable-next-line @next/next/no-img-element -- image du marchand, hors loader
            <img src={site.hero_image} alt="" className="absolute inset-x-0 top-4 bottom-0 h-[calc(100%-1rem)] w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-white">{site.name}</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${site.published ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-white/60'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${site.published ? 'bg-emerald-300' : 'bg-white/40'}`} />
              {site.published ? t('projet.enLigne') : t('projet.horsLigne')}
            </span>
          </div>
          {adressePublique && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span className="truncate">{adressePublique.replace(/^https?:\/\//, '')}</span>
              <button type="button"
                onClick={() => { void navigator.clipboard.writeText(adressePublique); setCopie(true); setTimeout(() => setCopie(false), 1800) }}
                className="font-semibold text-[#FFB08F] hover:text-[#FFD2BF]">
                {copie ? t('projet.copie') : t('projet.copier')}
              </button>
            </div>
          )}
          <div className="mt-1 grid grid-cols-2 sm:flex gap-3">
            <a href={lienVoir} target={adressePublique ? '_blank' : undefined} rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
              <ExternalLink className="h-4 w-4" aria-hidden />{t('projet.voir')}
            </a>
            <Link href={`/edit/${site.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FA5D1E] px-4 py-2.5 text-sm font-bold text-[#1A0A03] hover:brightness-110">
              <Pencil className="h-4 w-4" aria-hidden />{t('projet.modifier')}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ── PROCHAINES ACTIONS */}
        <section className={carte} aria-labelledby="titre-actions">
          <div className="flex items-baseline gap-3">
            <h3 id="titre-actions" className="text-[17px] font-bold text-white">{t('projet.actions')}</h3>
            <span className="text-[13px] text-white/60">{t('projet.faites').replace('{n}', String(faites)).replace('{total}', String(actions.length))}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#FA5D1E] transition-[width] duration-500" style={{ width: `${Math.round((faites / Math.max(1, actions.length)) * 100)}%` }} />
          </div>
          {faites === actions.length && <p className="mt-4 text-sm text-emerald-300">{t('projet.toutFait')}</p>}
          <ul className="mt-2">
            {actions.map((a) => (
              <li key={a.cle} className="flex items-center gap-3.5 border-b border-white/[0.06] py-3 last:border-0">
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${a.faite ? 'bg-emerald-300' : 'border-2 border-white/25'}`}>
                  {a.faite && <Check className="h-3.5 w-3.5 text-[#0B0711]" strokeWidth={3.2} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[14.5px] font-semibold ${a.faite ? 'text-white/45 line-through' : 'text-white'}`}>{libelle(a)}</div>
                  {detail(a) && <div className="mt-0.5 truncate text-[13px] text-white/55">{detail(a)}</div>}
                </div>
                {!a.faite && (a.vers === 'publier'
                  ? <button type="button" onClick={onPublier} className="shrink-0 rounded-lg border border-[#FA5D1E]/40 px-3 py-2 text-[13px] font-semibold text-[#FFB08F] hover:bg-[#FA5D1E]/10">{t('projet.cta.faire')}</button>
                  : <Link href={a.vers} className="shrink-0 rounded-lg border border-[#FA5D1E]/40 px-3 py-2 text-[13px] font-semibold text-[#FFB08F] hover:bg-[#FA5D1E]/10">{t('projet.cta.faire')}</Link>)}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          {/* ── ACTIVITÉ */}
          <section className={carte} aria-labelledby="titre-activite">
            <h3 id="titre-activite" className="mb-4 text-[17px] font-bold text-white">{t('projet.activite')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {site.ouvre_des_comptes === true && (
                <Link href={`/comptes/${site.slug}`} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 hover:border-white/15">
                  <div className="text-3xl font-bold tabular-nums text-white">{nombre(comptesEnAttente)}</div>
                  <div className="mt-0.5 text-[13px] text-white/70">{t('projet.act.comptes')}</div>
                </Link>
              )}
              <Link href={`/comptes/${site.slug}`} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 hover:border-white/15">
                <div className="text-3xl font-bold tabular-nums text-white">{nombre(messages)}</div>
                <div className="mt-0.5 text-[13px] text-white/70">{t('projet.act.demandes')}</div>
              </Link>
              {site.publishes_tenders === true && (
                <Link href={`/offres/${site.slug}`} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 hover:border-white/15">
                  <div className="text-3xl font-bold tabular-nums text-white">{nombre(offresRecues)}</div>
                  <div className="mt-0.5 text-[13px] text-white/70">{t('projet.act.offres')}</div>
                </Link>
              )}
              <Link href={`/edit/${site.slug}`} className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 hover:border-white/15">
                <div className="text-3xl font-bold tabular-nums text-white">{nombre(pagesPubliees)}</div>
                <div className="mt-0.5 text-[13px] text-white/70">{t('projet.act.pages')}</div>
              </Link>
            </div>
          </section>

          {/* ── VISIBILITÉ IA */}
          <section className={carte}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px] font-bold text-white">{t('dashboard.aiVisibility')}</h3>
              <span className="text-2xl font-bold tabular-nums" style={{ color: score >= 80 ? '#6EE7A8' : score >= 50 ? '#FFB08F' : '#FCA5A5' }}>
                {score}<span className="text-sm text-white/50">/100</span>
              </span>
            </div>
            <div className="mb-2.5 mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 80 ? '#6EE7A8' : score >= 50 ? '#FA5D1E' : '#F87171' }} />
            </div>
            {missing.length > 0 && <p className="text-[13px] text-white/60">{t('dashboard.actionsToReach').replace('{n}', String(missing.length))}</p>}
          </section>

          {/* ── RACCOURCIS — toutes les fonctions de l'ancienne carte, nommées. */}
          <section className={carte} aria-labelledby="titre-raccourcis">
            <h3 id="titre-raccourcis" className="mb-3.5 text-[17px] font-bold text-white">{t('projet.raccourcis')}</h3>
            <div className="flex flex-col">
              {site.publishes_tenders === true && <Raccourci href={`/offres/${site.slug}`} icone={<Inbox className="h-4 w-4" />} texte={t('projet.r.offres')} pastille={offresRecues} />}
              {site.ouvre_des_comptes === true && <Raccourci href={`/comptes/${site.slug}`} icone={<Users className="h-4 w-4" />} texte={t('projet.r.comptes')} pastille={comptesEnAttente} />}
              {site.ouvre_des_comptes === true && <Raccourci href={`/guide/${site.slug}`} icone={<BookOpen className="h-4 w-4" />} texte={t('projet.r.guide')} />}
              <Raccourci href={`/domaine/${site.slug}`} icone={<Globe className="h-4 w-4" />} texte={t('projet.r.domaine')} />
              {site.published && (
                <button type="button" onClick={onAdresseApp} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-white/85 hover:bg-white/5">
                  <Link2 className="h-4 w-4 text-white/60" aria-hidden /><span className="flex-1">{t('projet.r.app')}</span><ChevronRight className="h-4 w-4 text-white/30" aria-hidden />
                </button>
              )}
              <Raccourci href="/visibilite-ia" icone={<BarChart3 className="h-4 w-4" />} texte={t('dashboard.aiVisibility')} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Raccourci({ href, icone, texte, pastille }: { href: string; icone: React.ReactNode; texte: string; pastille?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-white/85 hover:bg-white/5">
      <span className="text-white/60" aria-hidden>{icone}</span>
      <span className="flex-1">{texte}</span>
      {pastille !== undefined && pastille > 0 && (
        <span className="min-w-[20px] rounded-full bg-[#4F6EF5] px-1.5 text-center text-[11px] font-bold leading-5 text-white">{pastille}</span>
      )}
      <ChevronRight className="h-4 w-4 text-white/30" aria-hidden />
    </Link>
  )
}
