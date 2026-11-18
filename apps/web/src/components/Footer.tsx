'use client';
import Link from 'next/link';
import { useTranslation } from '@/lib/translations';
import { RESEAUX_SOCIAUX, type ReseauSocial } from '@/lib/reseaux-sociaux';

// ============================================================
// CE PIED DE PAGE EST LE SEUL CHEMIN VERS LES PAGES PUBLIQUES.
//
// MESURÉ LE 2026-10-02, sur la production : la page d'ACCUEIL ne contenait
// AUCUN lien vers `/about`, `/pricing`, `/blog` ni `/documentation` — elle
// rend `Sidebar` (qui ne mène qu'à `/`, `/admin`, `/parametres`), jamais
// `Navbar`. Search Console le disait mot pour mot sur `/blog` :
// « Referring page: None detected ».
//
// Les pages existaient, le sitemap les listait (214 URLs), `robots.txt` le
// référençait — mais RIEN NE MENAIT À ELLES. Un sitemap annonce ; ce sont les
// liens qui font découvrir. C'est ce qui rendait les résultats Google
// « éparpillés » : sans autre page atteignable, Google ne pouvait montrer que
// l'accueil, encore et encore.
//
// Ajouter un lien ici, c'est donc l'ajouter à TOUTES les pages publiques.
// Avant d'en retirer un, vérifier qu'un autre chemin y mène.
// ============================================================

// ── EN COLONNES DEPUIS LE 2026-11-18 (décision du propriétaire) : Produit ·
// Ressources · Entreprise · Mentions légales, et l'entité qui exploite
// Deribfy avec son NEQ. Les mentions légales ne sont plus noyées entre Blog
// et Tarifs. Les liens restent ÉCRITS EN TOUTES LETTRES (`href="/…"`) : le
// cliquet `pagesPubliquesAtteignables` les lit dans ce fichier.

const lien = 'text-white/45 hover:text-white transition-colors duration-200'

function IconeReseau({ reseau }: { reseau: ReseauSocial['reseau'] }) {
  return reseau === 'facebook' ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M6.9 8.6H4V20h2.9V8.6zM5.4 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20 13.3c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.8-2.8 1.5V8.6H10V20h2.9v-6c0-1.5.6-2.6 2-2.6s1.9 1 1.9 2.6v6H20v-6.7z" />
    </svg>
  )
}

const NOM_RESEAU = { facebook: 'Facebook', linkedin: 'LinkedIn' } as const

export default function Footer({ reseaux = RESEAUX_SOCIAUX }: { reseaux?: readonly ReseauSocial[] } = {}) {
  const { t } = useTranslation();
  const visibles = reseaux.filter((r) => r.url !== '');

  return (
    <footer className="border-t border-white/8 pt-12 pb-8 px-6" style={{ background: 'rgba(10,5,14,0.8)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">

          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
                style={{ background: 'radial-gradient(circle at 30% 30%, #4F6EF5 0%, transparent 60%), radial-gradient(circle at 70% 70%, #FA5D1E 0%, transparent 60%), #16090e' }}
              >
                D
              </div>
              <span className="font-black text-sm text-nexiora">deribfy</span>
            </div>
            {visibles.length > 0 && (
              <div className="mt-5 flex gap-3">
                {visibles.map((r) => (
                  <a
                    key={r.reseau}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Deribfy — ${NOM_RESEAU[r.reseau]}`}
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-brand-gold/60 transition-colors duration-200"
                  >
                    <IconeReseau reseau={r.reseau} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label={t('footer.col.product')}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{t('footer.col.product')}</h2>
            <ul className="mt-4 space-y-3 text-xs">
              <li><Link href="/pricing" className={lien}>{t('footer.pricing')}</Link></li>
              <li><Link href="/visibilite-ia" className={lien}>{t('footer.visibiliteIa')}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t('footer.col.resources')}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{t('footer.col.resources')}</h2>
            <ul className="mt-4 space-y-3 text-xs">
              <li><Link href="/documentation" className={lien}>{t('footer.documentation')}</Link></li>
              <li><Link href="/blog" className={lien}>{t('footer.blog')}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t('footer.col.company')}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{t('footer.col.company')}</h2>
            <ul className="mt-4 space-y-3 text-xs">
              <li><Link href="/about" className={lien}>{t('footer.about')}</Link></li>
              <li><a href="mailto:contact@deribfy.com" className={lien}>{t('footer.contact')}</a></li>
            </ul>
          </nav>

          <nav aria-label={t('footer.col.legal')}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{t('footer.col.legal')}</h2>
            <ul className="mt-4 space-y-3 text-xs">
              <li><Link href="/privacy" className={lien}>{t('footer.privacy')}</Link></li>
              <li><Link href="/terms" className={lien}>{t('footer.terms')}</Link></li>
              <li><Link href="/cookies" className={lien}>{t('footer.cookies')}</Link></li>
            </ul>
          </nav>

        </div>

        <div className="mt-10 pt-6 border-t border-white/8 flex flex-col md:flex-row gap-2 md:items-center md:justify-between text-[11px] text-white/30">
          <p>{t('footer.copyright')}</p>
          <p>{t('footer.operatedBy')}</p>
        </div>
      </div>
    </footer>
  );
}
