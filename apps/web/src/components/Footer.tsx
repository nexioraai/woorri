'use client';
import Link from 'next/link';
import { useTranslation } from '@/lib/translations';

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

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/8 py-10 px-6" style={{ background: 'rgba(10,5,14,0.8)' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: 'radial-gradient(circle at 30% 30%, #4F6EF5 0%, transparent 60%), radial-gradient(circle at 70% 70%, #FA5D1E 0%, transparent 60%), #16090e' }}
          >
            W
          </div>
          <span className="font-black text-sm text-nexiora">deribfy</span>
        </div>

        <p className="text-white/30 text-xs text-center">
          {t('footer.copyright')}
        </p>

        <div className="flex flex-wrap gap-6 text-xs text-white/40 justify-center">
          <Link href="/about" className="hover:text-white transition-colors">{t('footer.about')}</Link>
          <Link href="/documentation" className="hover:text-white transition-colors">{t('footer.documentation')}</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">{t('footer.pricing')}</Link>
          <Link href="/blog" className="hover:text-white transition-colors">{t('footer.blog')}</Link>
          <Link href="/visibilite-ia" className="hover:text-white transition-colors">{t('footer.visibiliteIa')}</Link>
          <a href="mailto:contact@deribfy.com" className="hover:text-white transition-colors">{t('footer.contact')}</a>
          <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link>
          <Link href="/cookies" className="hover:text-white transition-colors">{t('footer.cookies')}</Link>
        </div>

      </div>
    </footer>
  );
}
