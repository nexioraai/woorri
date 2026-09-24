'use client';

import { useState, useEffect } from 'react';
import { achatPossible } from './variantRequirement';
import { X } from 'lucide-react';
import AddToCartButton from './AddToCartButton';
import { lienAppel, lienCommandeWhatsApp, numerosDEncaissement, urlProduitDepuisLaPage } from '@/lib/whatsappOrder';
import { contactDirectRequis } from '@/lib/contactDirect';

interface MerchantProduct {
  /** M2-232 — la boutique encaisse-t-elle en ligne ? Sans compte
   *  d'encaissement, le contact direct est le SEUL parcours d'achat. */
  encaisseEnLigne?: boolean;
  id?: string;
  name: string;
  description: string;
  price: string;
  priceNumber?: number;
  currency?: string;
  image?: string;
  variants?: { variant_id: string; label: string; price: number; currency: string }[];
  supplierId?: string | null;
  supplierProductId?: string | null;
  /** LOT 4 / R4-02 -- voir la condition `disabled` ci-dessous. */
  requiresVariant?: boolean;
  /** M2-206 — tailles du produit marchand (S, M, L, 42…), projetées par
   *  mapShopProducts. La sélection entre dans le récapitulatif WhatsApp. */
  sizes?: string[];
  /** M2-206 — le numéro du vendeur : appel direct ET commande WhatsApp. */
  whatsapp?: string | null;
  /** M2-210 — numéros d'encaissement {label, number}, libellés du marchand. */
  mobileMoney?: { label: string; number: string }[];
  /** M2-217 — prix barré, prêt à afficher. Présent = strictement supérieur. */
  compareAt?: string;
}

interface Props {
  product: MerchantProduct;
  primary: string;
  lang?: string;
  /** LOT 6 / DEBT-057 -- requis par l'admission de `/api/catalog/variants`. */
  slug: string;
  onClose: () => void;
  // Optionnel, retro-compatible : Editorial/Vif/Aurora ne le passent pas et
  // conservent donc exactement la fiche blanche actuelle (aucun diff visuel).
  // 'dark' n'est utilise que par Noir -- meme categorie de probleme deja
  // corrigee sur CatalogSearch/ContactForm/MobileNav : une fiche produit
  // entierement blanche, seule interaction ouverte sur la quasi-totalite
  // des visites (parcourir un produit), rompait completement l'identite
  // sombre de Noir. Palette generique (pas d'import des tons NoirTheme :
  // ce composant reste theme-agnostique, reutilisable par d'autres themes
  // sombres futurs).
  variant?: 'light' | 'dark';
}

// M2-206 — même mécanique locale que le reste du fichier (en/fr).
const CONTACT_LABELS: Record<string, { call: string; order: string; sizes: string; payTitle: string; payHint: string }> = {
  en: {
    call: 'Call the seller', order: 'Order on WhatsApp', sizes: 'Sizes',
    payTitle: 'Pay by mobile money',
    payHint: 'Send the amount to this number, then share the payment screenshot on WhatsApp — the seller confirms and delivers.',
  },
  fr: {
    call: 'Appeler le vendeur', order: 'Commander sur WhatsApp', sizes: 'Tailles',
    payTitle: 'Paiement Mobile Money',
    payHint: 'Envoyez le montant à ce numéro, puis partagez la capture du paiement sur WhatsApp — le vendeur confirme et livre.',
  },
};

const LABELS: Record<string, Record<string, string>> = {
  en: { addToCart: 'Add to cart', description: 'Description', chooseOption: 'Choose an option', loadingVariants: 'Loading options\u2026', options: 'Options' },
  fr: { addToCart: 'Ajouter au panier', description: 'Description', chooseOption: 'Choisissez une option', loadingVariants: 'Chargement des options\u2026', options: 'Options' },
};

const TOKENS = {
  light: {
    cardBg: '#ffffff', text: '#0a0a0a',
    imageBg: '#f7f7f7',
    labelMuted: 'rgba(0,0,0,0.55)',
    border: 'rgba(0,0,0,0.08)',
    variantBorder: 'rgba(0,0,0,0.12)',
    descText: 'rgba(0,0,0,0.7)',
  },
  dark: {
    cardBg: '#161109', text: '#F5F3EE',
    imageBg: '#1F1810',
    labelMuted: 'rgba(245,243,238,0.55)',
    border: 'rgba(245,243,238,0.12)',
    variantBorder: 'rgba(245,243,238,0.18)',
    descText: 'rgba(245,243,238,0.75)',
  },
}

export default function MerchantProductModal({ product: p, primary, lang = 'en', slug, onClose, variant = 'light' }: Props) {
  const t = LABELS[lang] || LABELS.en;
  const c = TOKENS[variant]
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  // M2-206 — la taille choisie entre dans le récapitulatif WhatsApp.
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const cachedVariants = Array.isArray(p.variants) ? p.variants : [];
  const [liveVariants, setLiveVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Les variantes ne sont pas en cache : on les recupere en direct chez le
  // fournisseur, comme le fait ProductModal cote recherche.
  useEffect(() => {
    if (cachedVariants.length > 0) return;
    if (!p.supplierId || !p.supplierProductId) return;
    setLoadingVariants(true);
    const params = new URLSearchParams({
      // LOT 6 / DEBT-057 -- slug requis par l'admission de la route.
      slug,
      supplier_id: p.supplierId,
      supplier_product_id: p.supplierProductId,
    });
    fetch('/api/catalog/variants?' + params.toString(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.variants) ? d.variants : [];
        if (list.length === 0) return;
        setLiveVariants(list.map((v: any) => ({
          variant_id: v.variant_id,
          label: v.name,
          price: v.price,
          currency: p.currency || 'USD',
        })));
      })
      .catch(() => { /* garder l'etat precedent */ })
      .finally(() => setLoadingVariants(false));
  }, [p.supplierId, p.supplierProductId]);

  const variants = cachedVariants.length > 0 ? cachedVariants : liveVariants;
  const achetable = achatPossible({ requiresVariant: p.requiresVariant, variantesConnues: variants.length, varianteChoisie: selectedVariant, chargementEnCours: loadingVariants });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'mpFade 0.2s ease',
      }}
    >
      <style>{'@keyframes mpFade { from { opacity: 0 } to { opacity: 1 } } @keyframes mpSlide { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }'}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: c.cardBg, color: c.text,
          borderRadius: 20, maxWidth: 900, width: '100%', maxHeight: '92vh',
          overflow: 'auto', position: 'relative',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          animation: 'mpSlide 0.3s ease',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            border: 'none', borderRadius: '50%', width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
          }}
        ><X size={20} /></button>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 0 }} className="merchant-modal-grid">
          <div style={{ background: c.imageBg, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {p.image ? (
              <img src={p.image} alt={p.name} style={{ width: '100%', height: 480, objectFit: 'contain', display: 'block' }} />
            ) : (
              <span style={{ fontSize: 56, opacity: 0.15 }}>?</span>
            )}
          </div>

          <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>{p.name}</h2>
            {/* M2-217 — le prix barré au-dessus du prix : l'acheteur voit
                l'économie d'un coup d'œil. Rendu SEULEMENT si le barré est
                strictement supérieur (garanti par la projection). */}
            {p.compareAt && (
              <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 2px', textDecoration: 'line-through', opacity: 0.45 }}>
                {p.compareAt}
              </p>
            )}
            <p style={{ fontSize: 32, fontWeight: 800, margin: p.compareAt ? '0 0 24px' : '0 0 24px', color: primary }}>
              {p.price}
            </p>

            {variants.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.labelMuted }}>
                  {lang === 'fr' ? 'Taille / Couleur' : 'Size / Color'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {variants.map((v) => (
                    <button
                      key={v.variant_id}
                      onClick={() => setSelectedVariant(v.variant_id === selectedVariant ? null : v.variant_id)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                        border: v.variant_id === selectedVariant ? '2px solid ' + primary : '1.5px solid ' + c.variantBorder,
                        background: v.variant_id === selectedVariant ? primary + '15' : 'transparent',
                        color: c.text, transition: 'all 0.15s',
                      }}
                    >{v.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* M2-207 — une carte de COLLECTION (pas de priceNumber) n'est
                pas une ligne de panier : sa fiche informe et fait parler au
                vendeur. Le bouton panier n'y est pas rendu. */}
            {p.priceNumber != null && <AddToCartButton
              id={(p.id || p.name) + (selectedVariant ? '::' + selectedVariant : '')}
              name={p.name + (selectedVariant ? ' \u2014 ' + (variants.find(v => v.variant_id === selectedVariant)?.label || '') : '')}
              priceNumber={p.priceNumber || 0}
              currency={p.currency || 'USD'}
              image={p.image}
              primary={primary}
            // ============================================================
            // LOT 4 / R4-02 -- LA CONDITION N'EST PLUS UN PROXY.
            //
            // C'etait `variants.length > 0 && !selectedVariant` : « il y a des
            // options, donc il faut en choisir une ». Le proxy s'effondre quand
            // la liste revient VIDE -- rupture totale de stock, ou erreur
            // avalee par `/api/catalog/variants`, qui rend `{variants: []}`
            // dans les deux cas. Le bouton s'activait alors pour un produit
            // dont l'identifiant de panier n'aurait AUCUNE variante, et que le
            // checkout refuse (garde `catalogStock`, LOT 4). Bouton actif,
            // refus garanti : exactement la divergence « ce que l'UI permet
            // n'est pas ce que le checkout vend » que ce lot ferme.
            //
            // `requiresVariant` vient de la donnee (`supplier_parent_id`), pas
            // d'une heuristique. `undefined` pour un produit sans fournisseur
            // (Mode 2, maquettes POD) : comportement rigoureusement inchange.
            // ============================================================
              label={loadingVariants ? t.loadingVariants : (achetable ? t.addToCart : t.chooseOption)}
              disabled={!achetable}
              onAdded={onClose}
            />}

            {/* M2-206 — TAILLES DU PRODUIT MARCHAND, même geste que les
                variantes : re-presser désélectionne. Les deux familles ne
                coexistent jamais (un produit marchand n'a pas de variantes
                fournisseur). */}
            {(p.sizes ?? []).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.labelMuted }}>
                  {(CONTACT_LABELS[lang] || CONTACT_LABELS.en).sizes}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(p.sizes ?? []).map((taille) => (
                    <button
                      key={taille}
                      onClick={() => setSelectedSize(taille === selectedSize ? null : taille)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                        border: taille === selectedSize ? '2px solid ' + primary : '1.5px solid ' + c.variantBorder,
                        background: taille === selectedSize ? primary + '15' : 'transparent',
                        color: c.text, transition: 'all 0.15s',
                      }}
                    >{taille}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================
                M2-206 — APPEL DIRECT + COMMANDE WHATSAPP, SUR LA MODALE.

                Demandé après inspection : la modale est CE QUI S'OUVRE au
                clic sur un produit — les boutons doivent y être, pas
                seulement sur la page /produits/<id>.

                LE VENDEUR REÇOIT LE PRODUIT PRÉCIS : le message porte le
                LIEN du produit, que WhatsApp déroule en aperçu — photo, nom
                — via l'og:image que la page produit déclare déjà. Un lien
                wa.me ne peut PAS joindre une image ; l'aperçu du lien est
                le chemin fiable.

                RIEN N'EST INVENTÉ : sans numéro renseigné par le marchand
                (réseaux sociaux du site), aucun des deux boutons n'existe.
                ============================================================ */}
            {/* M2-207 — PORTE DU MARCHÉ (Youssouf) : ces boutons ne
                concernent QUE les marchés sans carte (XAF/XOF). Un marchand
                Stripe (EUR, USD, CAD…) garde son parcours panier, intact. */}
            {/* M2-208 — LE NUMÉRO MOBILE MONEY, VISIBLE POUR PAYER (Youssouf :
                « les acheteurs peuvent voir le numéro mobile money pour payer
                via mobile »). Marché sans carte uniquement — même porte que
                les boutons. */}
            {p.whatsapp &&
              contactDirectRequis({
                devise: p.currency,
                libellePrix: p.price,
                numero: p.whatsapp,
              }) && (
              <div style={{ marginTop: 18, border: '1.5px solid ' + c.border, borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.labelMuted }}>
                  {(CONTACT_LABELS[lang] || CONTACT_LABELS.en).payTitle}
                </p>
                {/* M2-210 — TOUS les numéros du marchand, avec leur libellé
                    (Airtel Money, Moov Money… — texte LIBRE saisi par lui).
                    L'acheteur paie sur celui de SON opérateur : on ne perd
                    pas une vente faute d'avoir couvert un réseau. */}
                {numerosDEncaissement(p.mobileMoney, p.whatsapp).map((n) => (
                  <div key={n.label + n.number} style={{ marginTop: 6 }}>
                    {n.label && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.labelMuted, display: 'block' }}>{n.label}</span>
                    )}
                    <a href={'tel:' + n.number.replace(/[^\d+]/g, '')} style={{ display: 'inline-block', fontSize: 20, fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                      {n.number}
                    </a>
                  </div>
                ))}
                <p style={{ fontSize: 13, lineHeight: 1.5, color: c.descText, marginTop: 6, marginBottom: 0 }}>
                  {(CONTACT_LABELS[lang] || CONTACT_LABELS.en).payHint}
                </p>
              </div>
            )}
            {p.whatsapp &&
              contactDirectRequis({
                devise: p.currency,
                libellePrix: p.price,
                numero: p.whatsapp,
              }) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {(() => {
                  const appel = lienAppel(p.whatsapp);
                  return appel && (
                    <a
                      href={appel}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        border: '1.5px solid ' + primary, color: primary, fontWeight: 600,
                        fontSize: 14, padding: '12px 20px', borderRadius: 10, textDecoration: 'none',
                      }}
                    >{(CONTACT_LABELS[lang] || CONTACT_LABELS.en).call}</a>
                  );
                })()}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const lien = lienCommandeWhatsApp({
                      whatsapp: p.whatsapp ?? '',
                      productName: p.name,
                      size: selectedSize,
                      priceLabel: p.price,
                      // L'URL se résout depuis la page courante : valable sur
                      // deribfy.com/sites/<slug> comme sur un domaine propre.
                      url: p.id ? urlProduitDepuisLaPage(window.location.origin, window.location.pathname, p.id, slug) : (p.image ?? ''),
                    });
                    if (lien) window.open(lien, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25D366', color: '#fff', fontWeight: 600,
                    fontSize: 14, padding: '12px 20px', borderRadius: 10, textDecoration: 'none',
                  }}
                >{(CONTACT_LABELS[lang] || CONTACT_LABELS.en).order}</a>
              </div>
            )}

            {p.description && (
              <div style={{ marginTop: 28, borderTop: '1px solid ' + c.border, paddingTop: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.labelMuted }}>{t.description}</p>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: c.descText, margin: 0, whiteSpace: 'pre-wrap' }}>{p.description}</p>
              </div>
            )}
          </div>
        </div>

        <style>{'@media (max-width: 720px) { .merchant-modal-grid { grid-template-columns: 1fr !important; } }'}</style>
      </div>
    </div>
  );
}
