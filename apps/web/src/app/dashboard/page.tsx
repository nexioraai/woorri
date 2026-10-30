'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ExternalLink, Pencil, LogOut, Globe } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { computeAiScore } from '@/app/lib/aiScore';
import { useTranslation } from '@/lib/translations';

/**
 * UNE APPLICATION TELLE QUE LA LISTE LA MONTRE.
 *
 * Le fichier environnant emploie `any` pour ses sites — dette anterieure que
 * je ne touche pas. Mais je n'en AJOUTE pas : ce panneau est neuf, son
 * contrat est connu, et le declarer coute une dizaine de lignes.
 *
 * `revoyable` est le champ qui compte : il dit si les FICHIERS existent, pas
 * si le statut promet. Les deux divergent, et c'est cette divergence qui
 * decide d'afficher « Revoir » ou non.
 */
type Application = {
  id: string;
  creeLe: string;
  statut: string;
  nom: string | null;
  demande: string;
  dureeMs: number;
  fichiers: number;
  revoyable: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  // ── LES APPLICATIONS N'APPARAISSAIENT NULLE PART, JAMAIS.
  //
  // DEFAUT MESURE LE 2026-10-30 : douze routes d'API lisaient la table des
  // generations, AUCUNE PAGE ne la lisait. Le proprietaire a produit CONTERAK
  // deux fois ; les deux fois, la seule facon de la retrouver a ete d'en
  // sortir les fichiers a la main. Une oeuvre payee que le produit perdait.
  const [applications, setApplications] = useState<Application[]>([]);
  // ── L'APPLICATION SE REGARDE DANS UN CADRE ISOLE, JAMAIS EN ONGLET.
  //
  // DEFAUT MESURE LE 2026-10-30, au premier clic du proprietaire : « Revoir »
  // etait un simple lien vers la route — un onglet neuf n'envoie AUCUN jeton,
  // la route repondait {"error":"Non authentifie."}.
  //
  // Et le lien etait une faute DEUX fois : meme authentifie, un document
  // ouvert en onglet s'execute avec l'ORIGINE deribfy.com — l'application
  // generee pourrait lire la session du site qui l'heberge. Le cadre
  // sandbox="allow-scripts" (sans allow-same-origin) est la meme isolation
  // que l'ecran de generation : l'app tourne, et ne voit rien de Deribfy.
  const [apercuApp, setApercuApp] = useState<{ nom: string; html: string } | null>(null);
  const [apercuErreur, setApercuErreur] = useState<string | null>(null);

  const revoir = async (a: Application) => {
    setApercuErreur(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expirée — reconnectez-vous.'); return; }
    try {
      const res = await fetch(`/api/generateur/direct/${a.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setApercuErreur(d?.error ?? `Impossible d'ouvrir cette application (HTTP ${res.status}).`);
        return;
      }
      setApercuApp({ nom: a.nom ?? 'Votre application', html: await res.text() });
    } catch {
      setApercuErreur("Le chargement de l'application a échoué. Réessayez.");
    }
  };
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  // Les applications se chargent A COTE des sites : si leur route echoue, le
  // tableau de bord affiche quand meme ce qu'il sait. Un panneau vide vaut
  // mieux qu'une page blanche.
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch('/api/generateur/mes-applications', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const d = (await res.json()) as { applications?: Application[] };
        setApplications(Array.isArray(d.applications) ? d.applications : []);
      } catch { /* le panneau reste vide, le reste du tableau de bord vit */ }
    })();
  }, []);

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

  // ── LA SUPPRESSION N'EST PLUS ICI DU TOUT.
  //
  // SIGNALÉ PAR UN UTILISATEUR : « on peut supprimer par erreur ». La
  // corbeille vivait dans la rangée d'actions, en `flex-wrap` : sur un
  // téléphone elle passait à la ligne et se retrouvait SEULE, directement
  // sous « Voir » — le bouton qu'on vise le plus souvent.
  //
  // Un premier correctif l'avait mise dans un menu « ⋯ » en haut de la carte.
  // Mieux, et pas assez : elle restait à UN geste de la liste, sur l'écran
  // qu'on ouvre le plus souvent. Elle vit désormais au BAS de la page
  // d'édition de la boutique concernée (`/edit/[slug]`), dans une zone
  // sensible, derrière un mot à taper — le même idiome que la suppression de
  // compte dans `/parametres`, qui existait déjà dans ce dépôt.
  //
  // Le tableau de bord ne porte donc plus AUCUN chemin de suppression : on ne
  // peut plus effacer une boutique depuis la liste de toutes les autres.

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
      // `assign` plutot qu'une affectation : la regle d'immutabilite refuse
        // l'ecriture sur `location.href`, et `assign` dit la meme chose en
        // nommant le geste — on NAVIGUE, on ne modifie pas un objet.
        window.location.assign(data.url);
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

        {/* ── LES APPLICATIONS, ENFIN VISIBLES.
            Le panneau ne s'affiche que s'il y a quelque chose a montrer : un
            cadre vide sur un tableau de bord de sites ne dirait rien a qui
            n'a jamais genere d'application. */}
        {apercuErreur !== null && (
          <p className="mt-6 text-sm text-red-400">{apercuErreur}</p>
        )}
        {apercuApp !== null && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4 sm:p-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/90 font-semibold">{apercuApp.nom}</span>
              <button type="button" onClick={() => setApercuApp(null)}
                className="text-sm text-white/60 hover:text-white underline">
                Fermer
              </button>
            </div>
            {/* sandbox SANS allow-same-origin : l'application tourne et ne
                peut rien lire du site qui l'héberge — même garantie que
                l'écran de génération. */}
            <iframe title={apercuApp.nom} sandbox="allow-scripts" srcDoc={apercuApp.html}
              className="flex-1 w-full rounded-2xl border border-white/10 bg-white" />
          </div>
        )}
        {applications.length > 0 && (
          <div className="mt-16">
            <h2 className="text-white/90 text-xl font-semibold mb-6">Vos applications</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((a) => (
                <div key={a.id}
                  className="border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/90 font-semibold text-sm truncate">
                      {a.nom ?? 'Application'}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${
                      a.statut === 'livree'
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                        : 'border-white/10 text-white/50'
                    }`}>
                      {a.statut === 'livree' ? 'livrée' : a.statut}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed line-clamp-3">{a.demande}</p>
                  <div className="text-white/30 text-[11px] flex items-center gap-3 mt-auto pt-2">
                    <span>{new Date(a.creeLe).toLocaleDateString('fr-FR')}</span>
                    {a.fichiers > 0 && <span>{a.fichiers} fichier{a.fichiers > 1 ? 's' : ''}</span>}
                    {a.dureeMs > 0 && <span>{Math.round(a.dureeMs / 1000)} s</span>}
                  </div>
                  {/* ── « REVOIR » N'APPARAIT QUE SI LA MATIERE EXISTE.
                      Le statut dit ce que la machine a cru ; les fichiers
                      disent ce qu'elle a garde. Offrir le lien sans la
                      matiere, c'est promettre un 404 — et faire croire a la
                      personne qu'elle a perdu son application une 2e fois. */}
                  {a.revoyable ? (
                    <button type="button" onClick={() => { void revoir(a); }}
                      className="text-center px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                      Revoir
                    </button>
                  ) : (
                    <span className="text-center px-3 py-2 rounded-xl text-xs text-white/25 border border-white/[0.04]">
                      Aucun fichier conservé
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
