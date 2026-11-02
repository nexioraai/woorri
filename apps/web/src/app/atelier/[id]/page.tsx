'use client';

/**
 * L'ATELIER — un écran dédié pour travailler sur UNE application.
 *
 * ── LE DÉFAUT MESURÉ, SUR LES CAPTURES DU PROPRIÉTAIRE.
 *
 * L'aperçu était greffé sur la page de création. L'application occupait un
 * quart de la fenêtre, flottait dans le fond violet, était coupée en bas, et
 * il restait autour la barre latérale marketing, le titre « Création sur
 * mesure » et le champ de création d'une NOUVELLE application — à côté de
 * celle qu'on essayait de juger.
 *
 * Impossible de juger une application dans ces conditions. Impossible de
 * demander un changement en la regardant. C'était notre plus grand écart
 * avec la catégorie : Bolt, Lovable et v0 ont tous un atelier.
 *
 * ── CE QUE CET ÉCRAN N'ÉCRIT PAS, ET C'EST L'ESSENTIEL.
 *
 * Aucun moteur. La retouche, les juges, les versions, le pointeur, l'aperçu
 * gratuit : tout existait et tout est prouvé. Cet écran ASSEMBLE :
 *
 *   GET  /api/generateur/direct/{id}   → l'application assemblée, coût ZÉRO
 *   GET  /api/generateur/version       → l'historique et le pointeur
 *   GET  /api/generateur/retoucher     → le plafond de prix de CETTE œuvre
 *   POST /api/generateur/retoucher     → la retouche, et une version de plus
 *   POST /api/generateur/version       → revenir à une version
 *
 * ── LE CŒUR DE LA BOUCLE : L'APERÇU SE RAFRAÎCHIT TOUT SEUL.
 *
 * On écrit « mets les boutons en vert » à gauche, et le vert apparaît à
 * droite sans cliquer ailleurs. C'est la seule raison d'être de l'atelier :
 * sans ce rafraîchissement, il ne serait qu'une page de plus.
 *
 * Il ne coûte rien. `direct/{id}` recompile des fichiers déjà en base et
 * n'appelle AUCUN modèle — on peut donc le rejouer après chaque geste, y
 * compris après un retour en arrière.
 *
 * ── UNE SEULE VÉRITÉ À L'ÉCRAN.
 *
 * Choisir une version DÉPLACE LE POINTEUR, elle ne fait pas que regarder.
 * Si l'aperçu pouvait montrer une version que le pointeur n'a pas, « Publier »
 * et « Télécharger » agiraient sur autre chose que ce que l'œil voit — et la
 * personne publierait ce qu'elle ne regarde pas. Un seul courant, partout.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  ExternalLink,
  Globe,
  History,
  Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CadreApercu } from '@/components/atelier/CadreApercu';
import { adresseProposee, TITRE_SANS_NOM } from '@/lib/apps/nom-produit';
import { echangesDe, heureCourte, type VersionLue } from '@/lib/apps/fil-atelier';
import { phraseVersion } from '@/lib/apps/versions-oeuvre';

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

export default function AtelierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [app, setApp] = useState<Application | null>(null);
  const [versions, setVersions] = useState<{ liste: VersionLue[]; courante: number | null } | null>(null);
  const [html, setHtml] = useState('');
  const [etatApercu, setEtatApercu] = useState('Chargement de l’aperçu…');
  const [texte, setTexte] = useState('');
  const [plafond, setPlafond] = useState('');
  const [perimetre, setPerimetre] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [lienPublic, setLienPublic] = useState<string | null>(null);
  const basDuFil = useRef<HTMLDivElement | null>(null);

  /** Le jeton de session, ou `null` — et dans ce cas on le DIT. */
  const jeton = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErreur('Session expirée — reconnectez-vous.');
      return null;
    }
    return session.access_token;
  }, []);

  /**
   * L'APERÇU — rejoué après CHAQUE geste, parce qu'il ne coûte rien.
   *
   * Un échec ici ne doit pas vider l'écran : on garde ce qui est affiché et
   * on dit ce qui s'est passé. Un aperçu périmé reste plus utile qu'un cadre
   * blanc sans explication — le défaut du 2026-10-19, payé une demi-heure.
   */
  const chargerApercu = useCallback(async () => {
    const t = await jeton();
    if (t === null) return;
    try {
      const res = await fetch(`/api/generateur/direct/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setEtatApercu(d?.error ?? `Aperçu indisponible (HTTP ${String(res.status)}).`);
        return;
      }
      setHtml(await res.text());
    } catch {
      setEtatApercu('Le chargement de l’aperçu a échoué.');
    }
  }, [id, jeton]);

  const chargerVersions = useCallback(async () => {
    const t = await jeton();
    if (t === null) return;
    try {
      const res = await fetch(`/api/generateur/version?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const d = (await res.json()) as { versions?: VersionLue[]; courante?: number | null };
      setVersions({ liste: d.versions ?? [], courante: d.courante ?? null });
    } catch { /* le fil garde ce qu'il a */ }
  }, [id, jeton]);

  // ── L'ENTRÉE DANS L'ATELIER : identité, métadonnées, plafond, aperçu.
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const t = session.access_token;

      // Le nom et la demande d'origine viennent de la liste : elle existe,
      // elle est déjà prouvée, et l'atelier n'a pas besoin d'une route de
      // plus pour une donnée qu'une route rend déjà.
      try {
        const res = await fetch('/api/generateur/mes-applications', {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const d = (await res.json()) as { applications?: Application[] };
          const trouve = (d.applications ?? []).find((a) => a.id === id) ?? null;
          setApp(trouve);
          if (trouve === null) setErreur('Cette application est introuvable.');
        }
      } catch { setErreur('Impossible de lire cette application.'); }

      // LE PLAFOND AVANT D'ÉCRIRE, PAS APRÈS. Il se demande au serveur :
      // le calculer ici y importerait `fournisseur.ts`, donc le SDK du
      // fournisseur dans le paquet navigateur (EP-314).
      try {
        const res = await fetch(`/api/generateur/retoucher?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const d = (await res.json()) as { plafond?: string; perimetre?: string };
          setPlafond(d.plafond ?? '');
          setPerimetre(d.perimetre ?? '');
        }
      } catch { /* le bouton dira « Modifier » sans prix plutôt que rien */ }

      await Promise.all([chargerVersions(), chargerApercu()]);
    })();
  }, [id, router, chargerApercu, chargerVersions]);

  // Le fil se lit vers le bas : après chaque échange, on descend.
  useEffect(() => {
    basDuFil.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [versions]);

  /**
   * LA RETOUCHE — et le rafraîchissement qui la suit.
   *
   * `confirme` n'est pas un drapeau d'interface : c'est la réponse à la
   * question que la route pose quand la couverture BAISSE. Supprimer un
   * écran est légitime ; on demande, on ne bloque pas.
   */
  const envoyer = async (confirme: boolean) => {
    const demande = texte.trim();
    if (demande === '' || app === null) return;
    const t = await jeton();
    if (t === null) return;
    setErreur(null);
    setEnCours(true);
    setAvis('Modification en cours — une vingtaine de secondes.');
    try {
      const res = await fetch(
        `/api/generateur/retoucher?id=${encodeURIComponent(id)}${confirme ? '&confirme=1' : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ demande }),
        },
      );
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; horsPerimetre?: boolean; raison?: string;
        aConfirmer?: boolean; message?: string; fichiers?: string[]; coutUsd?: number; rang?: number;
      };
      // CE QUI A ÉTÉ DÉPENSÉ SE DIT, MÊME QUAND ÇA RATE. Un refus gratuit et
      // un refus payé ne sont pas la même nouvelle.
      const paye = d.coutUsd === undefined || d.coutUsd === 0 ? '' : ` (${d.coutUsd.toFixed(3)} $ dépensés)`;
      setAvis(null);

      if (d.aConfirmer === true) {
        setEnCours(false);
        if (window.confirm(`${String(d.message)}\n\nAppliquer quand même ?`)) {
          await envoyer(true);
          return;
        }
        setErreur(`Modification abandonnée${paye}.`);
        return;
      }
      if (d.horsPerimetre === true) {
        setErreur(`Hors de ce que je peux retoucher : ${String(d.raison)}${paye}`);
        return;
      }
      if (!res.ok || d.ok !== true) {
        setErreur(`${String(d.error ?? 'La modification a échoué.')}${paye}`);
        return;
      }

      setTexte('');
      setAvis(
        `Modifié — ${String((d.fichiers ?? []).length)} fichier(s) touché(s)${paye}.`,
      );
      // ── LE CŒUR DE LA BOUCLE. On ne demande rien à la personne : le fil
      // et l'aperçu se remettent à jour, et le vert apparaît.
      await Promise.all([chargerVersions(), chargerApercu()]);
    } catch {
      setAvis(null);
      setErreur('La modification a échoué. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  /** Revenir à une version : le pointeur bouge, l'aperçu suit. Gratuit. */
  const revenirA = async (rang: number) => {
    const t = await jeton();
    if (t === null) return;
    setMenu(false);
    setErreur(null);
    if (!window.confirm(
      `Revenir à la version ${String(rang)} ?\n\n` +
      'Cela ramène L’APPLICATION telle qu’elle était — ses écrans, ses ' +
      'textes, ses couleurs. Les données saisies dans l’application ne sont ' +
      'pas concernées.\n\nAucune version n’est perdue : vous pouvez repartir ' +
      'en avant ensuite.',
    )) return;
    try {
      const res = await fetch(
        `/api/generateur/version?id=${encodeURIComponent(id)}&rang=${String(rang)}`,
        { method: 'POST', headers: { Authorization: `Bearer ${t}` } },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setErreur(d?.error ?? 'Le retour à cette version a échoué.');
        return;
      }
      setAvis(`Revenu à la version ${String(rang)}.`);
      await Promise.all([chargerVersions(), chargerApercu()]);
    } catch { setErreur('Le retour à cette version a échoué. Réessayez.'); }
  };

  const publier = async () => {
    const t = await jeton();
    if (t === null || app === null) return;
    setErreur(null);
    const sous = window.prompt(
      `Adresse publique de « ${app.nom ?? 'votre application'} » :\n` +
        '<adresse>.deribfy.app\n\nMinuscules, chiffres et tirets. ' +
        'Un seul niveau : les points sont refusés. Laisser vide pour un lien simple.',
      adresseProposee(app.nom ?? app.demande),
    );
    if (sous === null) return;
    try {
      const res = await fetch(
        `/api/generateur/publier?id=${encodeURIComponent(id)}${sous.trim() !== '' ? `&sous=${encodeURIComponent(sous.trim().toLowerCase())}` : ''}`,
        { method: 'POST', headers: { Authorization: `Bearer ${t}` } },
      );
      // Le champ s'appelle `lien`, pas `url` — bug attrapé en production le
      // 2026-10-30. On lit les deux : si la route renomme, le bouton survit.
      const d = (await res.json().catch(() => null)) as {
        lien?: string; url?: string; error?: string; erreurSousDomaine?: string;
      } | null;
      const lien = d?.lien ?? d?.url;
      if (!res.ok || lien === undefined) { setErreur(d?.error ?? 'La publication a échoué.'); return; }
      if (d?.erreurSousDomaine !== undefined) setErreur(`Adresse nommée refusée : ${d.erreurSousDomaine}`);
      setLienPublic(lien);
    } catch { setErreur('La publication a échoué. Réessayez.'); }
  };

  const telecharger = async () => {
    const t = await jeton();
    if (t === null) return;
    setErreur(null);
    try {
      const res = await fetch(`/api/generateur/livraison?id=${encodeURIComponent(id)}&cible=web`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setErreur(d?.error ?? `Le téléchargement a échoué (HTTP ${String(res.status)}).`);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application-web.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch { setErreur('Le téléchargement a échoué. Réessayez.'); }
  };

  const nom = app?.nom ?? TITRE_SANS_NOM;
  const echanges = echangesDe(app?.demande ?? '', versions?.liste ?? []);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#0A050E] text-white">
      {/* ── ① LA BARRE DU HAUT, MINIMALE.
          Rien de marketing. Le nom de l'application, le retour vers les
          projets, et les trois gestes qu'on fait depuis un atelier. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 py-2.5">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          Mes projets
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">{nom}</h1>

        <div className="relative flex shrink-0 items-center gap-1.5">
          {/* ── L'HISTORIQUE EST UN MENU DÉROULANT, PAS UN PANNEAU.
              Un panneau séparé poussait l'aperçu vers le bas : on perdait de
              la hauteur d'application pour lire une liste qu'on consulte
              rarement. Le menu la rend sans rien coûter à l'aperçu. */}
          <button
            type="button"
            onClick={() => { setMenu((v) => !v); }}
            aria-expanded={menu}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <History size={14} strokeWidth={2} aria-hidden />
            Historique
            {versions !== null && (
              <span className="tabular-nums text-slate-500">{versions.liste.length}</span>
            )}
            <ChevronDown size={13} strokeWidth={2} aria-hidden />
          </button>
          {menu && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-[22rem] max-h-[60vh] overflow-auto rounded-xl border border-white/10 bg-[#120A18] p-1.5 shadow-2xl shadow-black/60">
              {versions === null || versions.liste.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-slate-400">Aucune version enregistrée.</p>
              ) : (
                [...versions.liste].sort((a, b) => b.rang - a.rang).map((v) => {
                  const actuelle = v.rang === versions.courante;
                  return (
                    <button
                      key={v.rang}
                      type="button"
                      disabled={actuelle}
                      onClick={() => { void revenirA(v.rang); }}
                      className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        actuelle
                          ? 'cursor-default bg-[#FA5D1E]/[0.12] text-white'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {/* La phrase vient de `phraseVersion` : l'écran ne
                          reformule pas une liste que le moteur sait dire. */}
                      {phraseVersion({ rang: v.rang, etape: v.etape, creeIl: v.creeIl, actuelle })}
                      {!actuelle && <span className="ml-1.5 text-[#FA5D1E]">· revenir</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => { void publier(); }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <Globe size={14} strokeWidth={2} aria-hidden />
            Publier
          </button>
          <button
            type="button"
            onClick={() => { void telecharger(); }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <Download size={14} strokeWidth={2} aria-hidden />
            Télécharger
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* ── ② LA CONVERSATION — un tiers, et le champ toujours visible.
            C'est un fil qui se souvient : chaque échange porte ce qui a été
            demandé, ce que Deribfy a fait, et la version que ça a créée. Les
            trois viennent de l'historique des versions — aucune table de
            messages, donc aucune seconde vérité à côté. */}
        <section className="flex w-full max-w-[26rem] min-w-0 shrink-0 flex-col gap-2 lg:w-1/3">
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
            {echanges.length === 0 ? (
              <p className="text-xs text-slate-400">
                Le fil se remplira à mesure que vous demanderez des changements.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {echanges.map((e) => (
                  <li key={e.rang} className="flex flex-col gap-1.5">
                    {e.demande !== null && e.demande !== '' && (
                      <p className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#FA5D1E]/[0.14] px-3 py-2 text-xs leading-relaxed text-white">
                        {e.demande}
                      </p>
                    )}
                    <div className="self-start max-w-[90%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                      <p className="text-xs leading-relaxed text-slate-200">{e.fait}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        <span
                          className={`rounded px-1.5 py-0.5 tabular-nums ${
                            e.rang === versions?.courante
                              ? 'bg-[#FA5D1E]/20 text-[#FA5D1E]'
                              : 'bg-white/[0.06] text-slate-400'
                          }`}
                        >
                          version {e.rang}
                          {e.rang === versions?.courante ? ' · actuelle' : ''}
                        </span>
                        {heureCourte(e.creeIl) !== null && <span>{heureCourte(e.creeIl)}</span>}
                        {e.coutUsd > 0 && <span className="tabular-nums">{e.coutUsd.toFixed(3)} $</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div ref={basDuFil} />
          </div>

          {/* LE CHAMP EN BAS, TOUJOURS VISIBLE : il est hors de la zone qui
              défile. Un champ qui part avec le fil oblige à remonter pour
              écrire — et c'est exactement ce qu'un atelier doit éviter. */}
          <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            {avis !== null && <p className="mb-2 text-[11px] text-emerald-400">{avis}</p>}
            {erreur !== null && <p className="mb-2 text-[11px] text-red-400">{erreur}</p>}
            {lienPublic !== null && (
              <a
                href={lienPublic}
                target="_blank"
                rel="noreferrer noopener"
                className="mb-2 flex items-center gap-1.5 text-[11px] text-[#FA5D1E] hover:underline"
              >
                <ExternalLink size={12} strokeWidth={2} aria-hidden />
                {lienPublic}
              </a>
            )}
            <textarea
              value={texte}
              onChange={(e) => { setTexte(e.target.value); }}
              onKeyDown={(e) => {
                // Entrée envoie, Maj+Entrée va à la ligne : la convention de
                // tous les fils de discussion.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!enCours) void envoyer(false);
                }
              }}
              rows={3}
              disabled={enCours}
              placeholder="mets les boutons en vert"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-[#FA5D1E]/60 focus:outline-none disabled:opacity-60"
            />
            {perimetre !== '' && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">{perimetre}</p>
            )}
            <button
              type="button"
              disabled={enCours || texte.trim() === ''}
              onClick={() => { void envoyer(false); }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FA5D1E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#FA5D1E]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} strokeWidth={2} aria-hidden />
              {/* LE PRIX S'ANNONCE AVANT, JAMAIS APRÈS. Et c'est un plafond :
                  « au plus », pas « environ ». */}
              {enCours ? 'Modification…' : plafond === '' ? 'Modifier' : `Modifier — ${plafond}`}
            </button>
          </div>
        </section>

        {/* ── ③ L'APERÇU — deux tiers, toute la hauteur, défilement interne. */}
        <CadreApercu titre={nom} srcDoc={html} etat={etatApercu} />
      </div>
    </main>
  );
}
