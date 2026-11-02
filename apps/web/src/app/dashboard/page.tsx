'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ExternalLink, Pencil, LogOut, Globe } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { computeAiScore } from '@/app/lib/aiScore';
import { useTranslation } from '@/lib/translations';
import { oublierGeneration } from '@/lib/apps/suivi-generation';
import {
  adresseProposee,
  AVERTISSEMENT_MARQUE,
  CE_QUE_RENOMMER_CHANGE,
  nomProduitValide,
  TITRE_SANS_NOM,
} from '@/lib/apps/nom-produit';
import { phraseVersion } from '@/lib/apps/versions-oeuvre';

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
  // Le lien public de l'application qu'on vient de publier — affiché sous la
  // carte, copiable. Un seul à la fois : publier en remplace l'affichage.
  const [lienPublic, setLienPublic] = useState<{ id: string; url: string } | null>(null);
  /**
   * LES VERSIONS D'UNE ŒUVRE — chargées à la demande, jamais en masse.
   *
   * La liste ne porte QUE `rang`, `etape`, `creeIl` et `restaurable` : le
   * document pèse 57 à 75 Ko et n'a rien à faire dans une carte. Il n'est lu
   * que par la route, au moment du retour.
   */
  const [versions, setVersions] = useState<{
    id: string;
    liste: { rang: number; etape: string | null; creeIl: string; restaurable: boolean }[];
  } | null>(null);

  /**
   * RENOMMER — pour les neuf oeuvres nees avant que le produit ait un nom.
   *
   * ON AFFICHE `CE_QUE_RENOMMER_CHANGE` APRES COUP, ET C'EST LE POINT.
   * L'onglet, le manifeste et cette carte prennent le nouveau nom (la page
   * est recompilee a chaque lecture) ; le nom ecrit DANS les ecrans par le
   * modele, non. Sans cette phrase, la personne renomme, voit la carte
   * changer, ouvre son application et y lit l'ancien nom.
   */
  const renommer = async (a: Application) => {
    setApercuErreur(null);
    // ── L'AVERTISSEMENT SUIT L'ENDROIT OU LE NOM SE CHOISIT.
    //
    // Il vivait dans la question du pre-vol ; cette question a casse la
    // production le 2026-11-01 et a ete retiree. Le nom se choisit donc ici,
    // et c'est ici que la phrase doit etre lue -- « dite une fois, a
    // l'endroit ou le nom se choisit ». Aucune liste n'empechera un nom
    // d'etre une marque existante : on ne promet rien, on previent.
    const propose = window.prompt(
      `Nom de votre application :\n\n${CE_QUE_RENOMMER_CHANGE}\n\n${AVERTISSEMENT_MARQUE}`,
      a.nom ?? '',
    );
    if (propose === null) return;
    const verdict = nomProduitValide(propose);
    if (!verdict.ok) { setApercuErreur(verdict.erreur); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expiree — reconnectez-vous.'); return; }
    const res = await fetch(`/api/generateur/renommer?id=${encodeURIComponent(a.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ nom: verdict.nom }),
    });
    const d = (await res.json().catch(() => ({}))) as { nom?: string; error?: string };
    if (!res.ok || typeof d.nom !== 'string') {
      setApercuErreur(String(d.error ?? 'Le changement de nom a echoue.'));
      return;
    }
    setApplications((liste) => liste.map((x) => (x.id === a.id ? { ...x, nom: d.nom ?? x.nom } : x)));
  };

  const voirVersions = async (a: Application) => {
    setApercuErreur(null);
    if (versions?.id === a.id) { setVersions(null); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expiree — reconnectez-vous.'); return; }
    const res = await fetch(`/api/generateur/version?id=${encodeURIComponent(a.id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const d = (await res.json().catch(() => ({}))) as { versions?: typeof versions extends null ? never : { rang: number; etape: string | null; creeIl: string; restaurable: boolean }[]; error?: string };
    if (!res.ok) { setApercuErreur(String(d.error ?? 'Historique illisible.')); return; }
    setVersions({ id: a.id, liste: d.versions ?? [] });
  };

  /**
   * REVENIR À UNE VERSION — gratuit, et il DIT ce qu'il va faire avant.
   *
   * « Revenir à celle-ci » et pas « revenir » : un bouton qui recopie la
   * précédente fait AVANCER au deuxième clic, parce que le second retour
   * recopierait le contenu d'avant le premier. La liste supprime
   * l'ambiguïté — on désigne la version qu'on veut.
   */
  const revenirA = async (a: Application, rang: number, creeIl: string) => {
    setApercuErreur(null);
    const quand = creeIl === '' ? `la version ${String(rang)}` : `la version ${String(rang)} du ${new Date(creeIl).toLocaleString('fr-FR')}`;
    if (!window.confirm(
      `Revenir à ${quand} ?\n\nLes fichiers de cette version remplaceront ceux d'aujourd'hui. ` +
      `C'est GRATUIT — aucun appel au modèle, on recopie ce qui est déjà stocké.\n\n` +
      `Rien n'est perdu : la version d'aujourd'hui reste dans la liste, et ce retour est lui-même annulable.`,
    )) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expiree — reconnectez-vous.'); return; }
    const res = await fetch(`/api/generateur/version?id=${encodeURIComponent(a.id)}&rang=${String(rang)}`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || d.ok !== true) { setApercuErreur(String(d.error ?? 'Le retour a echoue.')); return; }
    await voirVersions(a); await voirVersions(a);
  };

  const publier = async (a: Application) => {
    setApercuErreur(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expirée — reconnectez-vous.'); return; }
    // ── L'ADRESSE EST PROPOSEE DEPUIS LE NOM, ET RESTE MODIFIABLE.
    //
    // Cette ligne portait une TROISIEME copie de la regle de nommage — un
    // slug maison qui ignorait les noms reserves : proposer `admin` ou
    // `support` faisait refuser la publication apres le clic, sans que
    // l'ecran l'ait jamais annonce. `adresseProposee` est la meme fonction
    // que la route emploie, et elle rend vide quand elle n'a rien d'honnete
    // a proposer.
    //
    // DEUX CHAMPS, PAS UN : le nom est ce que le produit s'appelle,
    // l'adresse est ou on le trouve. Qui veut distinguer deux tontines
    // ecrira `tontine-moundou` plutot que de subir `tontine-2`.
    const suggestion = adresseProposee(a.nom ?? a.demande);
    const sous = window.prompt(
      `Adresse publique de « ${a.nom ?? 'votre application'} » :\n` +
        '<adresse>.deribfy.app\n\nMinuscules, chiffres et tirets. ' +
        'Un seul niveau : les points sont refuses. ' +
        'Laisser vide pour un lien simple.',
      suggestion,
    );
    if (sous === null) return; // la personne a annulé
    try {
      const res = await fetch(
        `/api/generateur/publier?id=${encodeURIComponent(a.id)}${sous.trim() !== '' ? `&sous=${encodeURIComponent(sous.trim().toLowerCase())}` : ''}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      // ── LE CHAMP S'APPELLE `lien`, PAS `url` — BUG ATTRAPÉ EN PROD.
      //
      // Mesuré le 2026-10-30 : la route a répondu 200 avec
      // {"lien":"https://…/p/…"} pendant que ce code lisait `d.url` — le
      // bouton aurait dit « échec » sur une publication RÉUSSIE. On lit les
      // deux : si la route renomme un jour, le bouton survit.
      const d = (await res.json().catch(() => null)) as {
        lien?: string; url?: string; error?: string; erreurSousDomaine?: string;
      } | null;
      const lien = d?.lien ?? d?.url;
      if (!res.ok || !lien) { setApercuErreur(d?.error ?? 'La publication a échoué.'); return; }
      // L'adresse nommee a pu echouer SANS casser la publication par jeton :
      // on montre le lien qui marche ET la raison de l'echec, jamais l'un
      // sans l'autre.
      if (d?.erreurSousDomaine) setApercuErreur(`Adresse nommée refusée : ${d.erreurSousDomaine}`);
      setLienPublic({ id: a.id, url: lien });
    } catch { setApercuErreur('La publication a échoué. Réessayez.'); }
  };

  // L'ADRESSE PUBLIQUE D'UN SITE : meme geste que pour une application.
  const adresseSite = async (site: { slug: string; name?: string }) => {
    setApercuErreur(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expirée — reconnectez-vous.'); return; }
    const suggestion = String(site.name ?? site.slug).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '');
    const nom = window.prompt(
      'Adresse publique de votre site :\n<nom>.deribfy.app\n\nMinuscules, chiffres et tirets.',
      suggestion,
    );
    if (nom === null || nom.trim() === '') return;
    try {
      const res = await fetch(
        `/api/sites/adresse?slug=${encodeURIComponent(site.slug)}&nom=${encodeURIComponent(nom.trim().toLowerCase())}`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const d = (await res.json().catch(() => null)) as { lien?: string; error?: string } | null;
      if (!res.ok || !d?.lien) { setApercuErreur(d?.error ?? "L'adresse n'a pas pu être créée."); return; }
      setLienPublic({ id: site.slug, url: d.lien });
    } catch { setApercuErreur("L'adresse n'a pas pu être créée. Réessayez."); }
  };

  /**
   * SUPPRIMER — doucement, et en disant ce qui disparaît.
   *
   * Le propriétaire a dû vider le stockage de son navigateur à la main pour
   * se débarrasser d'une ligne morte : la suppression nettoie donc AUSSI
   * la mémoire locale, sinon l'écran rouvrirait sur une œuvre effacée.
   */
  const supprimer = async (a: { id: string; nom: string | null }) => {
    const quoi = a.nom !== null && a.nom !== '' ? `« ${a.nom} »` : 'cette application';
    if (
      !window.confirm(
        `Supprimer ${quoi} ?\n\n` +
          '· Son lien public cessera de répondre immédiatement.\n' +
          '· Son adresse ne sera jamais réattribuée à quelqu’un d’autre.\n' +
          '· Le projet que vous avez téléchargé reste à vous, sur votre ordinateur,\n' +
          '  et continue de fonctionner.',
      )
    ) {
      return;
    }
    setApercuErreur(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expirée — reconnectez-vous.'); return; }
    const res = await fetch('/api/generateur/supprimer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: a.id }),
    });
    const d = (await res.json().catch(() => ({}))) as { error?: string; doitArreter?: boolean };
    if (!res.ok) {
      if (d.doitArreter === true) {
        if (!window.confirm(`${String(d.error)}\n\nArrêter la génération puis supprimer ?`)) return;
        const r2 = await fetch('/api/generateur/supprimer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: a.id, confirmerArret: true }),
        });
        if (!r2.ok) {
          setApercuErreur(String(((await r2.json().catch(() => ({}))) as { error?: string }).error ?? 'La suppression a échoué.'));
          return;
        }
      } else {
        setApercuErreur(String(d.error ?? 'La suppression a échoué.'));
        return;
      }
    }
    oublierGeneration(window.localStorage);
    setApplications((liste) => liste.filter((x) => x.id !== a.id));
  };

  const telecharger = async (a: Application) => {
    setApercuErreur(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApercuErreur('Session expirée — reconnectez-vous.'); return; }
    try {
      const res = await fetch(`/api/generateur/livraison?id=${encodeURIComponent(a.id)}&cible=web`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setApercuErreur(d?.error ?? `Le téléchargement a échoué (HTTP ${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'application-web.zip';
      lien.click();
      URL.revokeObjectURL(url);
    } catch { setApercuErreur('Le téléchargement a échoué. Réessayez.'); }
  };

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
      setApercuApp({ nom: a.nom ?? TITRE_SANS_NOM, html: await res.text() });
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
                    {site.published && (<>
                    <button type="button" onClick={() => { void adresseSite(site); }}
                      title="Adresse gratuite <nom>.deribfy.app"
                      className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                      .app
                    </button>
                    <Link href={`/domaine/${site.slug}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                      <Globe className="w-3.5 h-3.5" />
                    </Link>
                    </>)}
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
        {lienPublic !== null && (
          <div className="mt-6 flex items-center gap-2 text-sm">
            <a href={lienPublic.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline truncate">{lienPublic.url}</a>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(lienPublic.url); }}
              className="shrink-0 px-2 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white text-xs">
              Copier
            </button>
          </div>
        )}
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
                    <button type="button"
                      onClick={() => { void renommer(a); }}
                      title="Renommer cette application"
                      className="text-white/90 font-semibold text-sm truncate text-left hover:text-white">
                      {a.nom ?? TITRE_SANS_NOM}
                    </button>
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
                  {/* ── CE QUI DÉPEND DES FICHIERS, ET CE QUI N'EN DÉPEND PAS.
                      ÇA S'EST PRODUIT QUATRE FOIS. Le 19 octobre, une
                      génération refusée laissait l'écran SANS AUCUN BOUTON et
                      le propriétaire a dû vider le stockage de son navigateur
                      à la main. Le 1er novembre, rebelote : toute la rangée
                      était conditionnée à `a.revoyable`, donc « Supprimer »
                      disparaissait avec elle — alors que la suppression a été
                      écrite POUR les lignes mortes, et que la plupart des
                      cartes du propriétaire sont des refusées.

                      LA RÈGLE QUI EN SORT : une action ne dépend jamais d'une
                      condition qui ne la concerne pas. « Revoir », « Publier »
                      et « Télécharger » ont besoin de la matière — sans elle
                      ils promettraient un 404. « Supprimer » n'a besoin que du
                      droit de supprimer. */}
                  <div className="flex flex-col gap-2">
                    {a.revoyable ? (
                      // ── QUATRE ACTIONS, PAS TROIS PUIS UN MURMURE.
                      //
                      // « Historique » etait rendu APRES le bouton rouge
                      // « Supprimer », en text-[11px] text-white/35 : la plus
                      // petite et la plus pale typographie de la carte, sous
                      // l'action destructrice. Une fonctionnalite qu'on ne
                      // voit pas n'existe pas -- la meme erreur que les neuf
                      // « Application », un etage plus bas.
                      <div className="grid grid-cols-4 gap-2">
                        <button type="button" onClick={() => { void revoir(a); }}
                          className="px-2 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                          Revoir
                        </button>
                        <button type="button" onClick={() => { void publier(a); }}
                          className="px-2 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                          Publier
                        </button>
                        <button type="button" onClick={() => { void telecharger(a); }}
                          className="px-2 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                          Télécharger
                        </button>
                        <button type="button" onClick={() => { void voirVersions(a); }}
                          className="px-2 py-2 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all">
                          {versions?.id === a.id ? 'Masquer' : 'Historique'}
                        </button>
                      </div>
                    ) : (
                      /* L'INFORMATION RESTE, elle ne remplace plus l'action :
                         la personne doit savoir qu'il n'y a rien à revoir, ET
                         pouvoir retirer la ligne. */
                      <span className="text-center px-3 py-2 rounded-xl text-xs text-white/25 border border-white/[0.04]">
                        Aucun fichier conservé
                      </span>
                    )}
                      {/* LA SUPPRESSION NOMME CE QU'ELLE FAIT. « Êtes-vous
                          sûr ? » ne dit rien : la personne doit savoir que le
                          lien cesse de répondre, et que le projet déjà
                          téléchargé, lui, reste à elle et continue de
                          fonctionner. */}
                      <button type="button" onClick={() => { void supprimer(a); }}
                        className="px-2 py-2 rounded-xl text-xs font-semibold border border-red-500/20 text-red-300/70 hover:text-red-200 hover:border-red-400/40 transition-all">
                        Supprimer
                      </button>
                    {/* ── L'HISTORIQUE, ET POURQUOI « REVENIR À CELLE-CI ».
                        Un bouton « revenir » qui recopie la précédente fait
                        AVANCER au deuxième clic : le second retour
                        recopierait le contenu d'avant le premier. La liste
                        supprime l'ambiguïté — on désigne la version voulue,
                        avec sa date. */}
                    {versions?.id === a.id && (
                      <div className="flex flex-col gap-1">
                        {versions.liste.length === 0 && (
                          <span className="text-xs text-white/50">Aucune version enregistrée.</span>
                        )}
                        {versions.liste.map((v, i) => (
                          <div key={v.rang} className="flex items-center justify-between gap-2 text-xs">
                            {/* LES MOTS VIENNENT DU MOTEUR, pas de l'ecran :
                                deux ecrans diraient deux choses. */}
                            <span className="text-white/60 truncate">
                              {phraseVersion({ ...v, actuelle: i === 0 })}
                            </span>
                            {/* La version actuelle n'a pas de retour vers
                                elle-même, et une version de pipeline n'a pas
                                de fichiers : le serveur l'a dit. */}
                            {i > 0 && v.restaurable && (
                              <button type="button"
                                onClick={() => { void revenirA(a, v.rang, v.creeIl); }}
                                className="shrink-0 px-2 py-0.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all">
                                revenir à celle-ci
                              </button>
                            )}
                            {i > 0 && !v.restaurable && (
                              <span className="shrink-0 text-white/30" title="cette version ne contient pas les fichiers de l’application">
                                retour impossible
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {lienPublic?.id === a.id && (
                      <div className="flex items-center gap-2 text-xs">
                        <a href={lienPublic.url} target="_blank" rel="noreferrer"
                          className="flex-1 truncate text-emerald-400 underline">{lienPublic.url}</a>
                        <button type="button"
                          onClick={() => { void navigator.clipboard.writeText(lienPublic.url); }}
                          className="shrink-0 px-2 py-1 rounded-lg border border-white/10 text-white/60 hover:text-white">
                          Copier
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
