'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ExternalLink, Pencil, Trash2, LogOut, Globe, MoreVertical } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { computeAiScore } from '@/app/lib/aiScore';
import { useTranslation } from '@/lib/translations';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
      } else {
        setUser(data.user);
        // M2-218 — un site supprimé (archivé) ne revient pas au rechargement.
        supabase.from('sites').select('*').eq('owner_email', data.user.email).is('archived_at', null)
          .order('created_at', { ascending: false })
          .then(({ data: sitesData }) => {
            setSites(sitesData || []);
            setLoading(false);
            const slugs = (sitesData || []).map((s: any) => s.slug);
            if (slugs.length > 0) {
              supabase.from('score_history')
                .select('slug, score, created_at')
                .in('slug', slugs)
                .order('created_at', { ascending: true })
                .then(({ data: hist }) => {
                  const grouped: Record<string, number[]> = {};
                  (hist || []).forEach((h: any) => {
                    if (!grouped[h.slug]) grouped[h.slug] = [];
                    grouped[h.slug].push(h.score);
                  });
                  setHistory(grouped);
                });
            }
          });
      }
    });
  }, []);

  // ── LA CORBEILLE N'EST PLUS DANS LA ZONE DU POUCE.
  //
  // SIGNALÉ PAR UN UTILISATEUR : « on peut supprimer par erreur ». C'était
  // exact, et la capture le montre — sur un téléphone, la rangée d'actions
  // passe à la ligne et la corbeille se retrouve seule, DIRECTEMENT SOUS
  // « Voir », le bouton qu'on vise le plus souvent. Un pouce qui glisse d'un
  // demi-centimètre tombe dessus.
  //
  // Elle part donc dans un menu discret, en haut à droite de la carte : loin
  // du bas de l'écran, loin des actions fréquentes, et derrière DEUX gestes au
  // lieu d'un. La confirmation reste — elle ne suffisait pas, elle n'est pas
  // devenue inutile pour autant : une boîte de dialogue qu'on voit surgir
  // après un geste qu'on n'a pas voulu se valide aussi par réflexe.
  const [menuOuvert, setMenuOuvert] = useState<string | null>(null);

  // Un menu qui ne se referme qu'en rouvrant reste ouvert sous le doigt, et
  // le prochain appui tombe dedans. Il se referme donc au clic extérieur et
  // à la touche Échap.
  useEffect(() => {
    if (!menuOuvert) return;
    const fermer = () => { setMenuOuvert(null); };
    const surEchap = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOuvert(null); };
    document.addEventListener('click', fermer);
    document.addEventListener('keydown', surEchap);
    return () => {
      document.removeEventListener('click', fermer);
      document.removeEventListener('keydown', surEchap);
    };
  }, [menuOuvert]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(t('dashboard.confirmDelete'))) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const res = await fetch(`/api/sites/${slug}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      const statuses = data.blockingStatuses?.length ? ` (${data.blockingStatuses.join(', ')})` : '';
      alert((data.error === 'site_archive_blocked' ? t('dashboard.archiveBlocked') : t('dashboard.deleteFailed')) + statuses);
      return;
    }
    setSites(sites.filter(s => s.slug !== slug));
    setMenuOuvert(null);
  };

  const handlePublish = async (slug: string, current: boolean) => {
    // Déjà en ligne : gestion de l'abonnement à venir (étape suivante)
    if (current) return;
    // Pas encore publié : passage par Stripe Checkout
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { router.push('/login'); return; }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || t('dashboard.paymentError'));
    }
  };

  if (loading) return (
    <div className="min-h-screen nexiora-bg flex items-center justify-center">
      <div className="text-white/40 text-lg">{t('dashboard.loading')}</div>
    </div>
  );

  return (
    <div className="min-h-screen nexiora-bg text-white flex">
      <Sidebar />
      <div className="flex-1 min-w-0 max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-medium mb-2" style={{ color: '#FA5D1E' }}>{t('dashboard.eyebrow')}</div>
            <h1 className="text-4xl font-black tracking-tight">{t('dashboard.title')}</h1>
          </div>
          <Link href="/" className="btn-nexiora flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm">
            <Plus className="w-4 h-4" />
            {t('dashboard.newSite')}
          </Link>
        </div>

        {sites.length === 0 ? (
          <div className="text-center py-24 border border-white/8 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Globe className="w-14 h-14 mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white/40 text-xl mb-6">{t('dashboard.empty')}</p>
            <Link href="/" className="btn-nexiora inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-semibold">
              <Plus className="w-4 h-4" />
              {t('dashboard.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div key={site.slug}
                className="group border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(20px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                  boxShadow: `inset 0 2px 0 ${site.primary_color || '#FA5D1E'}, inset 0 1px 0 rgba(255,255,255,0.10), 0 0 40px ${site.primary_color || '#FA5D1E'}18`,
                }}>
                <div className="h-28 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at 50% 50%, ${site.primary_color || '#FA5D1E'}45 0%, transparent 70%)` }} />

                  {/* ── LE MENU DISCRET. Loin du bas de l'écran, loin des
                      actions fréquentes. La suppression demande deux gestes
                      volontaires, plus un seul réflexe. */}
                  <div className="absolute top-2 right-2 z-20">
                    <button
                      type="button"
                      aria-label={t('dashboard.more')}
                      aria-haspopup="menu"
                      aria-expanded={menuOuvert === site.slug}
                      onClick={(e) => {
                        // Sans cela, l'écouteur global de fermeture reçoit le
                        // même clic et referme le menu dans la foulée.
                        e.stopPropagation();
                        setMenuOuvert(menuOuvert === site.slug ? null : site.slug);
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-white/35 hover:text-white/80 hover:bg-white/10 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOuvert === site.slug && (
                      <div
                        role="menu"
                        onClick={(e) => { e.stopPropagation(); }}
                        className="absolute right-0 mt-1 min-w-[190px] rounded-xl border border-white/10 bg-[#140d18] shadow-2xl overflow-hidden"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { void handleDelete(site.slug); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          {t('dashboard.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative text-center px-4">
                    <h2 className="text-xl font-black text-white">{site.name}</h2>
                    <span className="text-xs px-3 py-1 rounded-full mt-2 inline-block font-medium"
                      style={{ background: `${site.primary_color || '#FA5D1E'}25`, color: site.primary_color || '#FA5D1E' }}>
                      {site.type}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {site.slogan && (
                    <p className="text-white/40 text-sm mb-4 line-clamp-2">{site.slogan}</p>
                  )}
                  {(() => {
                    const { score, missing } = computeAiScore(site);
                    const color = score >= 80 ? '#34d399' : score >= 50 ? '#FA5D1E' : '#f87171';
                    return (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-white/60">{t('dashboard.aiVisibility')}</span>
                          <span className="text-sm font-black" style={{ color }}>{score}<span className="text-white/30 text-xs font-medium">/100</span></span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
                        </div>
                        {missing.length > 0 && (
                          <p className="text-[11px] text-white/40 mt-1.5">{t('dashboard.actionsToReach').replace('{n}', String(missing.length))}</p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-2">
                    <Link href={site.published ? `/sites/${site.slug}` : `/preview/${site.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ background: site.primary_color || '#FA5D1E' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('dashboard.view')}
                    </Link>
                    <Link href={`/edit/${site.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                      {t('dashboard.edit')}
                    </Link>
                    {site.published && (
                    <Link href={`/domaine/${site.slug}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                      <Globe className="w-3.5 h-3.5" />
                    </Link>
                    )}
                    <button onClick={() => handlePublish(site.slug, site.published)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${site.published ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-white/70 hover:text-white hover:border-white/30'}`}>
                      <span className={`w-2 h-2 rounded-full nexiora-pulse-dot ${site.published ? 'bg-emerald-400' : 'bg-[#FA5D1E]'}`} />
                      {site.published ? t('dashboard.online') : t('dashboard.publish')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
