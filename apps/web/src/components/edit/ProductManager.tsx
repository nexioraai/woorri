'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/translations';
// DETTE 6c — l'etat initial du formulaire, la lecture d'un produit existant
// et la charge envoyee vivent desormais dans un module PUR, verifiable sans
// jsdom (ce depot n'en a pas). Ce composant ne garde que le rendu et les
// appels reseau. Voir productDraft.ts pour le raisonnement complet.
import { ancienPrixRetenu, draftVierge, draftFromProduct, payloadFromDraft, type ProductDraft } from './productDraft';

// Couleur accent admin Nexiora — changer ici se répercute partout dans ce composant.
const ACCENT = '#FA5D1E';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[];
  stock: number;
  /** ÉTAPE 7 — politique d'inventaire. `false` = stock non suivi, `stock` inerte. */
  track_inventory: boolean;
  published: boolean;
  /** ÉTAPE 8, VOLET A — achetabilité. `false` = présenté mais non vendable. */
  for_sale: boolean;
  /** M2-217 — prix barré. Posé par le marchand ou par l'outil Promo. */
  compare_at_price?: number | null;
  position: number;
};

export default function ProductManager({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ProductDraft>(draftVierge(products));
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  // ÉTAPE 7 — état de la CRÉATION uniquement. Jamais lu par le PATCH.
  const [createStock, setCreateStock] = useState('0');
  // ÉTAPE 7 — état de l'ACTE de comptage, strictement séparé de `draft`.
  const [countUnits, setCountUnits] = useState('');
  const [countBusy, setCountBusy] = useState(false);
  const [conseils, setConseils] = useState<{ code: string; message: string }[]>([]);
  /** Avancement d'un envoi MULTIPLE — `null` quand rien n'est en cours. */
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  /** Pour chaque vignette RETOUCHÉE, l'URL de la photo d'origine. C'est ce qui
   *  rend la retouche d'office révocable, et donc acceptable. */
  const [originaux, setOriginaux] = useState<Record<string, string>>({});
  // M2-217 — L'OUTIL PROMO : pourcentage + portée décidée par le marchand
  // (tous les produits, ou la sélection cochée). Réversible d'un clic.
  const [promoPct, setPromoPct] = useState('20');
  const [promoSel, setPromoSel] = useState<Set<string>>(new Set());
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [msg, setMsg] = useState('');

  async function authHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    };
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/products?slug=${encodeURIComponent(slug)}`, {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (res.ok) setProducts(json.products ?? []);
      else setMsg(json.error ?? 'Erreur de chargement');
    } catch (e: any) {
      setMsg(e.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('products-updated', handler);
    return () => window.removeEventListener('products-updated', handler);
  }, [slug]);

  function resetForm() {
    // M2-201 — la devise vient de la BOUTIQUE, pas d'une constante. Un
    // marchand qui vend en XAF ne retape pas sa monnaie a chaque produit.
    setDraft(draftVierge(products));
    setEditingId(null);
    setCreateStock('0');
    setCountUnits('');
  }

  // ── L'ENVOI PASSE PAR `/api/images/upload`, PLUS PAR LE DÉPÔT BRUT.
  //
  // CE QUE FAISAIT L'ANCIEN CHEMIN : il poussait le fichier tel quel dans le
  // stockage, depuis le navigateur. Une photo d'iPhone de 8 Mo était servie
  // telle quelle à des visiteurs en 3G ; l'orientation EXIF n'était pas
  // appliquée, donc les photos de portrait s'affichaient couchées ; et
  // surtout LES MÉTADONNÉES PARTAIENT AVEC — dont les coordonnées GPS du lieu
  // de la prise de vue, c'est-à-dire très souvent le domicile du marchand,
  // publiées en clair pour qui télécharge l'image.
  //
  // Le dernier point n'est pas une question de performance : c'était une fuite
  // de données personnelles, et elle vaut à elle seule ce détour.
  // ============================================================
  // PLUSIEURS PHOTOS D'UN COUP, ET RETOUCHÉES SANS RIEN DEMANDER.
  //
  // DEUX DEMANDES DU MARCHAND, et elles vont ensemble :
  //   « il accepte seulement une image » ;
  //   « personne ne veut passer des heures à modifier les images — s'il peut
  //     simplement prendre une photo avec son téléphone et envoyer ».
  //
  // CE QUE JE FAISAIS DE TRAVERS. L'envoi ne prenait que `files[0]` : sept
  // photos exigeaient sept allers-retours. Et chaque envoi ouvrait un
  // comparateur BLOQUANT — une décision à prendre avant de continuer. Sept
  // photos, sept décisions : exactement les heures qu'il refuse de passer.
  //
  // CE QUI CHANGE. Toutes les photos partent en une fois, et la version
  // RETOUCHÉE est retenue D'OFFICE : c'est le réglage que veut quelqu'un qui
  // photographie au téléphone entre deux clients. Rien ne s'interpose.
  //
  // CE QUI NE CHANGE PAS, ET QUI EST LA CONTREPARTIE : l'original est toujours
  // conservé, et chaque vignette porte un « ↺ » pour y revenir. Le défaut
  // devient révocable d'un geste, au lieu d'être une question posée sept fois.
  //
  // AUCUN PLAFOND DE NOMBRE, ni minimum ni maximum : le marchand sait combien
  // de vues son article demande. Le seul plafond est celui de la TAILLE d'un
  // fichier (15 Mo), et il protège l'envoi lui-même, pas un quota.
  //
  // ENVOI SÉQUENTIEL, et c'est délibéré : sept requêtes simultanées depuis une
  // connexion 3G se gênent l'une l'autre et échouent ensemble. Une par une,
  // avec l'avancement affiché — et une photo qui échoue n'emporte pas les autres.
  // ============================================================
  async function handleImageUpload(e: any) {
    const fichiers: File[] = Array.from(e.target.files ?? []);
    if (fichiers.length === 0) return;
    // Le champ est vidé tout de suite : sans cela, renvoyer LE MÊME fichier
    // juste après ne déclenche aucun `change`, et le marchand croit l'envoi mort.
    e.target.value = '';

    setMsg('');
    setConseils([]);
    setProgression({ fait: 0, total: fichiers.length });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMsg('Session expirée, reconnectez-vous.');
      setProgression(null);
      return;
    }

    const conseilsRecus = new Map<string, string>();
    const echecs: string[] = [];

    for (const [i, file] of fichiers.entries()) {
      setProgression({ fait: i, total: fichiers.length });
      try {
        const corps = new FormData();
        corps.append('file', file);
        corps.append('slug', slug);
        const res = await fetch('/api/images/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: corps,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          echecs.push(`${file.name} : ${String(data.error ?? 'envoi impossible')}`);
          continue;
        }

        // La RETOUCHÉE est retenue d'office quand elle existe ; l'original
        // reste connu, donc le geste est réversible.
        const affichee: string = data.amelioration?.url ?? data.url;
        if (data.amelioration?.url) {
          setOriginaux((o) => ({ ...o, [affichee]: data.url }));
        }
        setDraft((d) => ({ ...d, images: [...d.images, affichee] }));

        // Les conseils sont DÉDOUBLONNÉS : sept photos sombres ne doivent pas
        // produire sept fois le même message — on cesserait de les lire.
        for (const c of (Array.isArray(data.avertissements) ? data.avertissements : []) as {
          code: string;
          message: string;
        }[]) {
          conseilsRecus.set(c.code, c.message);
        }
        if (data.analyse?.gpsRetire) {
          conseilsRecus.set(
            'gps',
            'Certaines photos contenaient votre position GPS. Elle a été retirée avant publication.',
          );
        }
      } catch {
        echecs.push(`${file.name} : connexion interrompue`);
      }
    }

    setProgression(null);
    setConseils([...conseilsRecus].map(([code, message]) => ({ code, message })));
    // Un échec PARTIEL se dit : sans cela, le marchand compte ses vignettes et
    // ne comprend pas pourquoi il en manque une.
    if (echecs.length > 0) {
      setMsg(
        echecs.length === fichiers.length
          ? 'Aucune photo n’a pu être envoyée. Vérifiez votre connexion.'
          : `${String(echecs.length)} photo(s) sur ${String(fichiers.length)} n’ont pas pu être envoyées.`,
      );
    }
  }

  /** Revenir à la photo d'origine pour UNE vignette. */
  function revenirOriginal(affichee: string) {
    const origine = originaux[affichee];
    if (!origine) return;
    setDraft((d) => ({ ...d, images: d.images.map((u) => (u === affichee ? origine : u)) }));
    setOriginaux((o) => {
      const copie = { ...o };
      delete copie[affichee];
      return copie;
    });
  }

  function removeImage(url: string) {
    setDraft((d) => ({ ...d, images: d.images.filter((i) => i !== url) }));
  }

  const lancerPromo = async (action: 'apply' | 'remove', tous: boolean) => {
    setPromoBusy(true);
    setPromoMsg('');
    try {
      const res = await fetch('/api/shop/promo', {
        method: 'POST', headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          action,
          percent: parseFloat(promoPct) || 0,
          productIds: tous ? null : Array.from(promoSel),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPromoMsg(action === 'apply'
        ? `Promo appliquée à ${data.touches} produit(s) — l'ancien prix est affiché barré.`
        : `Promo retirée de ${data.touches} produit(s) — prix d'origine restaurés.`);
      setPromoSel(new Set());
      await load();
    } catch (e: any) {
      setPromoMsg(e.message);
    } finally {
      setPromoBusy(false);
    }
  };

  function startEdit(p: Product) {
    setEditingId(p.id);
    setDraft(draftFromProduct(p));
    // Le comptage ne se pré-remplit PAS avec le stock actuel : un champ
    // pré-rempli invite à re-valider une valeur qu'on n'a pas comptée, ce qui
    // est précisément l'affirmation sans preuve que la barrière de l'étape 2
    // refuse. Le marchand saisit ce qu'il vient de compter, ou rien.
    setCountUnits('');
    setMsg('');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleSubmit() {
    if (!draft.name.trim()) { setMsg('Le nom est requis'); return; }
    setBusy(true);
    setMsg('');
    const payload = payloadFromDraft(draft);
    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/shop/products/${editingId}`, {
          method: 'PATCH', headers: await authHeaders(), body: JSON.stringify(payload),
        });
      } else {
        // Seul le POST porte un stock : c'est le stock de départ d'un produit
        // qui n'existait pas encore, pas la révision d'un compteur existant.
        res = await fetch('/api/shop/products', {
          method: 'POST', headers: await authHeaders(),
          body: JSON.stringify({ slug, ...payload, stock: parseInt(createStock) || 0 }),
        });
      }
      const json = await res.json();
      if (!res.ok) { setMsg(json.error ?? 'Erreur'); setBusy(false); return; }
      resetForm();
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  /**
   * ÉTAPE 7 — ACTE DE COMPTAGE. Passe par la route d'inventaire dédiée, jamais
   * par le PATCH générique : `track_inventory` et `stock_counted_at` sont
   * exclus de ses allowlists (étape 6), et seule la RPC `enable_stock_tracking`
   * pose les trois colonnes ensemble en faisant avancer l'horodatage de
   * comptage — ce que la barrière de l'étape 2 exige pour rouvrir un suivi.
   */
  async function handleCount(id: string) {
    const units = parseInt(countUnits, 10);
    if (!Number.isInteger(units) || units < 0) { setMsg(t('pm.inv.invalid')); return; }
    setCountBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/shop/products/${id}/inventory`, {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify({ units }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(json.error ?? t('pm.inv.failed')); setCountBusy(false); return; }
      setCountUnits('');
      await load();
      setMsg(t('pm.inv.counted'));
    } catch (e: any) {
      setMsg(e.message);
    }
    setCountBusy(false);
  }

  /**
   * ÉTAPE 7 — ARRÊT DU SUIVI. `track_inventory = false` seul, côté serveur.
   * `stock_counted_at` n'est pas effacé : c'est la preuve du dernier comptage
   * réel, et elle doit survivre pour qu'une réactivation future soit jugeable.
   */
  async function handleStopTracking(id: string) {
    setCountBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/shop/products/${id}/inventory`, {
        method: 'DELETE', headers: await authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(json.error ?? t('pm.inv.failed')); setCountBusy(false); return; }
      await load();
      setMsg(t('pm.inv.stopped'));
    } catch (e: any) {
      setMsg(e.message);
    }
    setCountBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('pm.confirmDelete'))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/shop/products/${id}`, {
        method: 'DELETE', headers: await authHeaders(),
      });
      if (res.ok) { if (editingId === id) resetForm(); await load(); }
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="glass glass-hover rounded-3xl p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">{t('pm.title')}</h3>
        <p className="text-sm text-white/40 mt-1">{t('pm.subtitle')}</p>
      </div>

      {/* Liste produits */}
      {/* ============================================================
          M2-217 — PROMOTIONS. Le marchand choisit le pourcentage ET la
          portée : tous ses produits, ou seulement ceux qu'il coche dans la
          liste ci-dessous. L'ancien prix devient le prix BARRÉ des fiches ;
          « Retirer la promo » restaure exactement les prix d'origine.
          Tout le calcul est SERVEUR — le navigateur n'envoie jamais un prix.
          ============================================================ */}
      {products.length > 0 && (
        <div className="mb-6 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-1">Promotion</h3>
          <p className="text-xs text-white/40 mb-3">
            Réduction en % — sur tous les produits, ou seulement ceux cochés
            ({promoSel.size} sélectionné{promoSel.size > 1 ? 's' : ''}).
            L&apos;ancien prix s&apos;affiche barré ; retirer la promo restaure les prix.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number" min={1} max={90} value={promoPct}
              onChange={(e) => setPromoPct(e.target.value)}
              className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-white/30 transition"
              aria-label="Pourcentage de réduction"
            />
            <span className="text-sm text-white/50 mr-2">%</span>
            <button onClick={() => lancerPromo('apply', true)} disabled={promoBusy}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
              {promoBusy ? '…' : 'Appliquer à TOUT'}
            </button>
            <button onClick={() => lancerPromo('apply', false)} disabled={promoBusy || promoSel.size === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
              {promoBusy ? '…' : `Appliquer à la sélection`}
            </button>
            <button onClick={() => lancerPromo('remove', true)} disabled={promoBusy}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/15 text-white/70 hover:bg-white/5 transition disabled:opacity-40">
              Retirer la promo (tout)
            </button>
            <button onClick={() => lancerPromo('remove', false)} disabled={promoBusy || promoSel.size === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/15 text-white/70 hover:bg-white/5 transition disabled:opacity-40">
              Retirer (sélection)
            </button>
          </div>
          {promoMsg && <p className="text-xs mt-2 text-white/60">{promoMsg}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-white/40 text-sm">Chargement…</p>
      ) : products.length === 0 ? (
        <p className="text-white/40 text-sm">{t('pm.empty')}</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-2xl p-3">
              {/* M2-217 — sélection pour la promo ciblée. */}
              <input
                type="checkbox"
                checked={promoSel.has(p.id)}
                onChange={(e) => {
                  const next = new Set(promoSel);
                  if (e.target.checked) next.add(p.id); else next.delete(p.id);
                  setPromoSel(next);
                }}
                className="w-4 h-4 accent-[#FA5D1E] shrink-0"
                aria-label={`Sélectionner ${p.name} pour la promo`}
              />
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                : <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{p.name}</span>
                  {!p.published && <span className="text-[10px] uppercase tracking-wide text-white/40 border border-white/15 rounded-full px-2 py-0.5">{t('pm.hidden')}</span>}
                  {p.for_sale === false && <span className="text-[10px] uppercase tracking-wide text-white/40 border border-white/15 rounded-full px-2 py-0.5">{t('pm.notForSale')}</span>}
                </div>
                <div className="text-sm text-white/50">
                  {p.compare_at_price != null && Number(p.compare_at_price) > p.price && (
                    <span className="line-through opacity-50 mr-1.5">{Number(p.compare_at_price).toFixed(2)}</span>
                  )}
                  {p.price.toFixed(2)} {p.currency} · {p.track_inventory === false ? t('pm.inv.untracked') : `${t('pm.field.stock')} ${p.stock}`}
                </div>
              </div>
              <button onClick={() => startEdit(p)} className="text-sm px-3 py-1.5 rounded-lg transition" style={{ background: `${ACCENT}1a`, color: ACCENT }}>{t('pm.edit')}</button>
              <button onClick={() => handleDelete(p.id)} disabled={busy} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition">{t('pm.delete')}</button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      <div ref={formRef} className="pt-6 border-t border-white/10 space-y-4">
        <p className="text-sm font-semibold text-white/70">{editingId ? t('pm.formEdit') : t('pm.formNew')}</p>

        <PField label={t('pm.field.name')}>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition" />
        </PField>

        <PField label={t('pm.field.description')}>
          <textarea value={draft.description} rows={3} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition resize-y" />
        </PField>

        {/* M2-202 — TAILLES : texte libre (« S, M, L » ou « 40, 42 »), la
            conversion en tableau vit dans productDraft, pure et testee. */}
        <PField label={t('pm.field.sizes')}>
          <input value={draft.sizes} onChange={(e) => setDraft({ ...draft, sizes: e.target.value })}
            placeholder="S, M, L"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition" />
        </PField>

        <div className={editingId ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-2 sm:grid-cols-4 gap-3'}>
          <PField label={t('pm.field.price')}>
            <input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition" />
          </PField>
          {/* ── M2-234 — L'ANCIEN PRIX, CELUI QU'ON BARRE.
              Le geste le plus courant du commerce de détail : « avant 25 000,
              aujourd'hui 20 000 ». La colonne existait, l'affichage aussi, et
              l'outil Promo la posait EN MASSE — mais le marchand ne pouvait
              pas solder UN SEUL article, ce qui est pourtant le cas le plus
              fréquent. Il ne pouvait donc pas faire ce que fait n'importe quel
              commerçant de son marché. */}
          <PField label="Ancien prix (barré)">
            <input
              type="number"
              step="0.01"
              value={draft.compare_at_price}
              placeholder="facultatif"
              onChange={(e) => { setDraft({ ...draft, compare_at_price: e.target.value }); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition"
            />
          </PField>
          <PField label={t('pm.field.currency')}>
            <input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition" />
          </PField>
          {/* ÉTAPE 7 — le stock ne se saisit dans CE formulaire qu'à la
              création. En édition, il relève de l'acte de comptage ci-dessous :
              un champ de sauvegarde générale ne peut pas affirmer un comptage. */}
          {!editingId && (
            <PField label={t('pm.field.stock')}>
              <input type="number" value={createStock} onChange={(e) => setCreateStock(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition" />
            </PField>
          )}
        </div>

        {/* ===== ÉTAPE 7 — INVENTAIRE : UN ACTE, PAS UN CHAMP =====
            Rendu HORS du flux de sauvegarde : ses boutons appellent la route
            d'inventaire directement et ne touchent jamais `draft`. Le bouton
            « Enregistrer » ne peut donc ni le déclencher, ni l'annuler, ni
            écraser son résultat. */}
        {editingId && (() => {
          const current = products.find((p) => p.id === editingId);
          const tracked = current?.track_inventory !== false;
          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white/70">{t('pm.inv.title')}</span>
                <span className="text-xs text-white/40">
                  {tracked ? `${t('pm.inv.tracked')} · ${current?.stock ?? 0}` : t('pm.inv.untracked')}
                </span>
              </div>
              <p className="text-xs text-white/40">{t('pm.inv.help')}</p>
              <div className="flex gap-2">
                <input type="number" min="0" value={countUnits} placeholder={t('pm.inv.placeholder')}
                  onChange={(e) => setCountUnits(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-white/30 transition" />
                <button type="button" onClick={() => handleCount(editingId)} disabled={countBusy}
                  className="px-4 py-2.5 rounded-xl font-semibold transition disabled:opacity-40"
                  style={{ background: `${ACCENT}1a`, color: ACCENT }}>
                  {t('pm.inv.count')}
                </button>
              </div>
              {tracked && (
                <button type="button" onClick={() => handleStopTracking(editingId)} disabled={countBusy}
                  className="text-xs text-white/40 hover:text-white/70 underline transition disabled:opacity-40">
                  {t('pm.inv.stop')}
                </button>
              )}
            </div>
          );
        })()}

        {/* Un prix barré INFÉRIEUR OU ÉGAL au prix actuel n'annonce aucune
            remise : il ferait croire à une affaire qui n'existe pas.
            `ancienPrixRetenu` le neutralise à l'enregistrement — on le DIT
            ici, sinon le marchand croit avoir posé une promotion invisible. */}
        {draft.compare_at_price.trim() !== '' &&
          ancienPrixRetenu(draft.compare_at_price, draft.price) === null && (
            <p className="text-xs leading-relaxed rounded-lg px-3 py-2 border border-white/10 text-white/50" style={{ background: 'rgba(255,255,255,0.03)' }}>
              L’ancien prix doit être <strong className="text-white/70">plus élevé</strong> que le prix
              actuel pour s’afficher barré. Sinon il ne sera pas enregistré.
            </p>
          )}

        <PField label={t('pm.field.images')}>
          {draft.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {draft.images.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-contain bg-white/[0.04] border border-white/10" />
                  <button onClick={() => removeImage(url)} title="Retirer" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-xs border border-white/20">×</button>
                  {/* ── LE RETOUR À L'ORIGINAL TIENT EN UN GESTE, SUR LA VIGNETTE.
                      La retouche est appliquée d'office : c'est ce que veut
                      quelqu'un qui photographie au téléphone entre deux clients.
                      Mais « d'office » n'est acceptable QUE si c'est révocable —
                      et révocable ici, sur la photo qu'on regarde, pas dans un
                      écran de réglages qu'il faudra retrouver.
                      N'apparaît que si une version d'origine existe vraiment. */}
                  {originaux[url] && (
                    <button
                      onClick={() => { revenirOriginal(url); }}
                      title="Revenir à ma photo d’origine"
                      className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-[10px] leading-none border border-white/20"
                    >
                      ↺
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="block w-full text-center py-3 rounded-xl cursor-pointer font-semibold transition border"
            style={{ background: `${ACCENT}1a`, color: ACCENT, borderColor: `${ACCENT}33` }}>
            {progression
              ? `Envoi ${String(progression.fait + 1)} / ${String(progression.total)}…`
              : t('pm.addImage')}
            {/* `multiple` : le marchand choisit SES photos d'un coup. Sans lui,
                sept vues d'un article exigeaient sept allers-retours.
                AUCUN PLAFOND DE NOMBRE, ni minimum ni maximum — il sait mieux
                que nous combien de vues son article demande.
                HEIC accepté explicitement : c'est le format par défaut des
                iPhone, et `accept="image/*"` seul le laisse parfois de côté
                selon le navigateur — le marchand voyait alors ses photos
                grisées dans le sélecteur, sans comprendre pourquoi. */}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,image/*"
              onChange={handleImageUpload}
              disabled={progression !== null}
              className="hidden"
            />
          </label>

          {/* LA CONSIGNE EST DONNÉE AVANT LA PRISE, pas après le refus. Un
              marchand qui photographie mal ne le sait pas : personne ne le lui
              a dit. Trois phrases valent mieux qu'un message d'erreur. */}
          <p className="mt-2 text-xs leading-relaxed text-white/40">
            Choisissez autant de photos que vous voulez, d’un seul coup. Elles sont
            redressées, allégées et retouchées automatiquement — le « ↺ » sur une
            vignette revient à votre photo d’origine, toujours conservée.
            <br />
            Pour un meilleur rendu : 1200 px, format carré ou vertical, produit bien
            éclairé sur fond uni. JPG, PNG, WebP ou HEIC, 15 Mo par photo.
          </p>

          {/* ── COMPARATEUR AVANT / APRÈS.
              Deux images côte à côte, et rien d'autre. Pas de curseur à faire
              glisser : sur un téléphone, le geste est imprécis et le marchand
              ne voit jamais les deux états en entier au même moment — or c'est
              exactement ce qu'il doit comparer.
              L'original reste retenu tant qu'il n'a pas choisi : ne rien faire
              ne doit jamais modifier sa boutique. */}
          {conseils.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {conseils.map((c) => (
                <li
                  key={c.code}
                  className="text-xs leading-relaxed rounded-lg px-3 py-2 border"
                  style={{
                    // Ton d'information, jamais d'erreur : la photo EST publiée.
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {c.message}
                </li>
              ))}
            </ul>
          )}
        </PField>

        {/* ÉTAPE 8, VOLET A — DEUX cases, et non une. `published` décide de ce
            que le visiteur VOIT ; `for_sale` de ce qu'il peut PAYER. Les
            confondre était le défaut : retirer un produit de la vente
            obligeait à le faire disparaître de la vitrine, de sa fiche et du
            sitemap. Elles restent côte à côte parce que le marchand les pense
            ensemble, mais elles ne sont jamais liées dans le code. */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
            {t('pm.field.published')}
          </label>
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" checked={draft.for_sale} onChange={(e) => setDraft({ ...draft, for_sale: e.target.checked })} />
            {t('pm.field.forSale')}
          </label>
          <p className="text-xs text-white/40">{t('pm.forSale.help')}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={busy}
            className="flex-1 py-3 rounded-2xl font-semibold transition disabled:opacity-40"
            style={{ background: ACCENT, color: '#fff' }}>
            {busy ? '…' : editingId ? t('pm.save') : t('pm.add')}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-semibold transition">{t('pm.cancel')}</button>
          )}
        </div>

        {msg && <p className="text-sm text-white/60">{msg}</p>}
      </div>
    </div>
  );
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/50 mb-2">{label}</label>
      {children}
    </div>
  );
}
