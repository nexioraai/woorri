'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProductPage } from './fetchProduct'
import AddToCartButton from '../../themes/AddToCartButton'
import { achatPossible, choixDeVarianteRequis } from '../../themes/variantRequirement'
import DesignCanvas from '../../themes/DesignCanvas'
import { THEME_TOKENS, ThemeKey } from '../../themes/CatalogSearch'
import { lienAppel, lienCommandeWhatsApp, marcheSansCarte, numerosDEncaissement } from '@/lib/whatsappOrder'

const CART_LABELS: Record<string, string> = {
  fr: 'Ajouter au panier',
  en: 'Add to cart',
  ar: 'أضف إلى السلة',
  es: 'Añadir al carrito',
}

// DETTE 6c — meme forme que CART_LABELS ci-dessus : ce fichier porte deja ses
// libelles en local, en inventer un autre mecanisme ici serait gratuit.
const NOT_FOR_SALE_LABELS: Record<string, string> = {
  fr: 'Ce produit n’est pas en vente',
  en: 'This product is not for sale',
  ar: 'هذا المنتج غير معروض للبيع',
  es: 'Este producto no está a la venta',
}

// M2-202 — LA FICHE PARLE AUSSI LE PARCOURS HORS APPLICATION.
// « Mobile Money » est une CATÉGORIE générique, pas une marque : aucun nom
// d'opérateur n'entre ici — le numéro du vendeur fonctionne quel que soit le
// sien, et nommer des opérateurs serait une connaissance régionale figée.
const SIZES_LABELS: Record<string, string> = {
  fr: 'Tailles',
  en: 'Sizes',
  ar: 'المقاسات',
  es: 'Tallas',
}
const WA_ORDER_LABELS: Record<string, string> = {
  fr: 'Commander sur WhatsApp',
  en: 'Order on WhatsApp',
  ar: 'اطلب عبر واتساب',
  es: 'Pedir por WhatsApp',
}
const PAY_TITLE_LABELS: Record<string, string> = {
  fr: 'Paiement par Mobile Money',
  en: 'Pay by mobile money',
  ar: 'الدفع عبر المحفظة الجوالة',
  es: 'Pago por dinero móvil',
}
const PAY_HINT_LABELS: Record<string, string> = {
  fr: 'Envoyez le montant à ce numéro, puis partagez la capture du paiement sur WhatsApp — le vendeur confirme et livre.',
  en: 'Send the amount to this number, then share the payment screenshot on WhatsApp — the seller confirms and delivers.',
  ar: 'أرسل المبلغ إلى هذا الرقم ثم شارك لقطة الدفع عبر واتساب — يؤكد البائع ويسلّم.',
  es: 'Envíe el importe a este número y comparta la captura del pago por WhatsApp: el vendedor confirma y entrega.',
}

// M2-206 — la construction du lien vit dans `@/lib/whatsappOrder`, module
// PUR partagé avec la modale de la vitrine : deux copies auraient divergé.

type VarianteFournisseur = { variant_id: string; name: string }

export default function ProductPageView({ product }: { product: ProductPage }) {
  const [imgIndex, setImgIndex] = useState(0)
  // M2-202 — la taille choisie entre dans le récapitulatif WhatsApp.
  const [tailleChoisie, setTailleChoisie] = useState<string | null>(null)
  // `?? []` : un appelant d'avant M2-202 — fixture, cache, autre montage —
  // peut livrer un produit SANS le champ. Une fiche ne tombe pas pour ça.
  const tailles = product.sizes ?? []
  // LOT 4 / R4-01 -- meme source de variantes que la modale de la vitrine
  // (`/api/catalog/variants`), meme regle : tant qu'une variante est proposee,
  // aucun achat n'est possible sans en choisir une.
  const [variantes, setVariantes] = useState<VarianteFournisseur[]>([])
  const [varianteChoisie, setVarianteChoisie] = useState<string | null>(null)
  // ETAT INITIAL = « en chargement » DES QU'UNE VARIANTE EST REQUISE.
  //
  // Ce n'est pas un detail d'affichage : sans cela, le bouton est rendu ACTIF
  // pendant tout l'intervalle entre le premier rendu et la reponse de
  // `/api/catalog/variants`. Un visiteur rapide ajoute alors au panier un
  // article sans variante -- que le checkout refuse desormais (409). Le
  // bouton doit etre inactif tant que le choix n'est pas possible.
  const [chargementVariantes, setChargementVariantes] = useState(product.requiresVariant)
  useEffect(() => {
    if (!product.requiresVariant || !product.supplierId || !product.supplierProductId) return
    setChargementVariantes(true)
    const params = new URLSearchParams({
      // LOT 6 / DEBT-057 -- le slug est desormais REQUIS : la route ne parle
      // au fournisseur que pour un site reel, admis, et un produit indexe.
      slug: product.siteSlug,
      supplier_id: product.supplierId,
      supplier_product_id: product.supplierProductId,
    })
    let annule = false
    fetch('/api/catalog/variants?' + params.toString(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (annule) return
        setVariantes(Array.isArray(d.variants) ? d.variants : [])
      })
      .catch(() => { if (!annule) setVariantes([]) })
      .finally(() => { if (!annule) setChargementVariantes(false) })
    return () => { annule = true }
  }, [product.requiresVariant, product.supplierId, product.supplierProductId])
  // LOT 4 / R4-02 -- LA CONDITION NE DEPEND PLUS DE LA LISTE.
  //
  // Elle etait `requiresVariant && variantes.length > 0` : une liste revenue
  // VIDE -- rupture totale, ou erreur avalee par `/api/catalog/variants` --
  // rendait la condition fausse, donc le bouton ACTIF, pour un produit que le
  // checkout refuse. Ma propre correction du LOT 4 portait encore ce proxy :
  // la contre-verification l'a trouve. La regle vient de la donnee, pas de la
  // reponse reseau.
  const variantsRequises = choixDeVarianteRequis(product.requiresVariant, variantes.length)
  // LOT 5 / P5-02 -- LA FICHE RECOIT LE MEME PARCOURS QUE LA MODALE.
  //
  // Elle n'avait AUCUN televerseur : `grep DesignCanvas` y rendait 0. Or
  // `usesCatalogSelections(3, 'pod_custom')` est vrai, donc la fiche est
  // servie ET publiee au sitemap. Tout achat depuis la fiche partait donc en
  // fabrication SANS design -- un blanc, aux frais de la plateforme.
  const [designs, setDesigns] = useState<{ url: string }[]>([])
  const achetable = achatPossible({
    requiresVariant: product.requiresVariant,
    variantesConnues: variantes.length,
    varianteChoisie,
    chargementEnCours: chargementVariantes,
    designRequis: product.requiresDesign,
    designsFournis: designs.length,
  })
  const imgs = product.images.length > 0 ? product.images : []
  const tokens = THEME_TOKENS[(product.theme as ThemeKey)] || THEME_TOKENS.editorial
  const priceLabel =
    product.priceNumber > 0
      ? product.priceNumber.toFixed(2) + ' ' + product.currency
      : ''
  const addLabel = CART_LABELS[product.lang] || CART_LABELS.en
  const notForSaleLabel = NOT_FOR_SALE_LABELS[product.lang] || NOT_FOR_SALE_LABELS.en

  return (
    <div style={{ background: tokens.modalBg, color: tokens.modalText, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <Link
          href={'/sites/' + product.siteSlug}
          style={{ fontSize: 14, opacity: 0.7, textDecoration: 'none', color: 'inherit' }}
        >
          ← {product.siteName}
        </Link>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 40,
            marginTop: 24,
            alignItems: 'start',
          }}
        >
          <div>
            {imgs.length > 0 ? (
              <>
                <img
                  src={imgs[imgIndex]}
                  alt={product.name}
                  style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '1 / 1' }}
                />
                {imgs.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {imgs.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        style={{
                          border: i === imgIndex ? '2px solid ' + product.primary : '1px solid rgba(128,128,128,0.4)',
                          borderRadius: 8,
                          padding: 0,
                          cursor: 'pointer',
                          background: 'none',
                          lineHeight: 0,
                        }}
                      >
                        <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'rgba(128,128,128,0.15)', borderRadius: 16 }} />
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{product.name}</h1>
            {priceLabel && (
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 16 }}>{priceLabel}</div>
            )}
            {!product.inStock && (
              <div style={{ marginTop: 8, color: '#e05b5b', fontSize: 14 }}>Rupture de stock</div>
            )}
            {product.description && (
              <p style={{ marginTop: 24, lineHeight: 1.6, whiteSpace: 'pre-wrap', opacity: 0.9 }}>{product.description}</p>
            )}
            {/* DETTE 6c — la fiche produit applique la MEME regle que la
                vitrine : un produit retire de la vente reste entierement
                consultable (titre, images, prix, description), il n'a
                simplement plus de chemin d'achat. Le bouton n'est pas
                seulement desactive, il n'est pas rendu : un bouton grise
                invite a reessayer, et le checkout refuserait de toute
                facon (409). `inStock` garde son comportement propre --
                epuise et non-vendable sont deux etats differents. */}
            {/* ============================================================
                LOT 4 / R4-01 -- LA FICHE OFFRE ENFIN LE MEME CHOIX QUE LA
                MODALE DE LA VITRINE.

                Elle emettait `catalog-<uuid>` SANS variante, alors que la
                modale, pour le MEME produit, rend son bouton inactif tant
                qu'aucune variante n'est choisie. Deux surfaces d'achat du
                meme article, deux contrats. Mesure en production : deux
                commandes sont parties sans variante, et le fulfillment a
                retenu `variants[0]` -- une variante ARBITRAIRE.

                Le checkout refuse desormais une telle ligne (`catalogStock`,
                regle derivee de `supplier_parent_id`). Sans ce selecteur, le
                bouton des 19 fiches publiees deviendrait une impasse : les
                deux moities appartiennent a la meme correction.

                Un produit du marchand (`shop_products`) n'a pas de
                fournisseur : `supplierId` vaut `null`, aucun appel n'est
                fait, le rendu est rigoureusement celui d'avant.
            ============================================================ */}
            {variantes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
                  {product.lang === 'fr' ? 'Taille / Couleur' : 'Size / Color'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {variantes.map((v) => (
                    <button
                      key={v.variant_id}
                      type="button"
                      onClick={() => setVarianteChoisie(v.variant_id === varianteChoisie ? null : v.variant_id)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                        border: v.variant_id === varianteChoisie ? '2px solid ' + product.primary : '1.5px solid rgba(0,0,0,0.12)',
                        background: v.variant_id === varianteChoisie ? product.primary + '15' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >{v.name}</button>
                  ))}
                </div>
              </div>
            )}

            {/* M2-202 — TAILLES DU PRODUIT MARCHAND. Même geste que les
                variantes fournisseur au-dessus : des puces, re-presser
                désélectionne. Les deux ne coexistent jamais — un produit
                marchand n'a pas de variantes, un produit catalogue n'a pas
                de `sizes`. */}
            {tailles.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
                  {SIZES_LABELS[product.lang] || SIZES_LABELS.en}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tailles.map((taille) => (
                    <button
                      key={taille}
                      type="button"
                      onClick={() => setTailleChoisie(taille === tailleChoisie ? null : taille)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                        border: taille === tailleChoisie ? '2px solid ' + product.primary : '1.5px solid rgba(0,0,0,0.12)',
                        background: taille === tailleChoisie ? product.primary + '15' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >{taille}</button>
                  ))}
                </div>
              </div>
            )}

            {product.requiresDesign && (
              <div style={{ marginTop: 24 }}>
                <DesignCanvas
                  productImage={imgs[0]}
                  variantId={varianteChoisie || product.supplierProductId || undefined}
                  onDesignChange={(d) => setDesigns(d as { url: string }[])}
                  primary={product.primary}
                  lang={product.lang}
                  slug={product.siteSlug}
                />
              </div>
            )}

            <div style={{ marginTop: 28 }}>
              {product.forSale ? (
                <AddToCartButton
                  id={product.id + (varianteChoisie ? '::' + varianteChoisie : '')}
                  customDesigns={designs.length > 0 ? designs : undefined}
                  customDesignUrl={designs[0]?.url}
                  name={product.name + (varianteChoisie ? ' \u2014 ' + (variantes.find((v) => v.variant_id === varianteChoisie)?.name || '') : '')}
                  priceNumber={product.priceNumber}
                  currency={product.currency}
                  image={imgs[0]}
                  primary={product.primary}
                  variantId={varianteChoisie || undefined}
                  label={chargementVariantes ? (product.lang === 'fr' ? 'Chargement…' : 'Loading…') : (achetable ? addLabel : (product.lang === 'fr' ? 'Choisissez une option' : 'Choose an option'))}
                  disabled={!product.inStock || !achetable}
                />
              ) : (
                <div style={{ fontSize: 14, opacity: 0.7 }}>{notForSaleLabel}</div>
              )}
            </div>

            {/* ============================================================
                M2-202 — LE PARCOURS HORS APPLICATION, SUR LA FICHE.

                Demande de Youssouf : « quand les acheteurs cliquent sur un
                produit, sa fiche affiche description, tailles, prix, bouton
                WhatsApp, bouton payer par transfert mobile ». Le parcours :
                voir le numéro → payer par Mobile Money → envoyer la capture
                au vendeur via WhatsApp → le vendeur livre.

                UN SEUL NUMÉRO, et c'est la spécification : celui de WhatsApp
                (`social_links.whatsapp`) sert la commande ET l'encaissement —
                « ce numéro sera le même pour tous vos produits, et servira
                aussi à vous joindre ». Aucun opérateur n'est nommé : le
                numéro du vendeur fonctionne quel que soit le sien.

                RIEN N'EST INVENTÉ : sans numéro renseigné par le marchand,
                ce bloc n'existe pas. Et l'application ne CONFIRME aucun
                paiement — elle ne le voit pas passer ; la confirmation est
                humaine, par la capture envoyée au vendeur.
                ============================================================ */}
            {/* M2-207 — porte du marché : XAF/XOF seulement. Les marchés
                carte (Stripe) gardent leur parcours, intact. */}
            {product.forSale && product.whatsapp && marcheSansCarte(product.currency) && (
              <div
                style={{
                  marginTop: 20,
                  border: '1.5px solid rgba(128,128,128,0.25)',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
                  {PAY_TITLE_LABELS[product.lang] || PAY_TITLE_LABELS.en}
                </p>
                {/* M2-210 — tous les numéros d'encaissement, libellés par
                    le marchand (opérateurs multiples = aucune vente perdue). */}
                {numerosDEncaissement(product.mobileMoney, product.whatsapp).map((n) => (
                  <div key={n.label + n.number} style={{ marginTop: 8 }}>
                    {n.label && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, display: 'block' }}>{n.label}</span>}
                    <a
                      href={'tel:' + n.number.replace(/[^\d+]/g, '')}
                      style={{ display: 'inline-block', fontSize: 20, fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
                    >
                      {n.number}
                    </a>
                  </div>
                ))}
                <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.75, marginTop: 8, marginBottom: 12 }}>
                  {PAY_HINT_LABELS[product.lang] || PAY_HINT_LABELS.en}
                </p>
                {/* M2-206 — l'APPEL DIRECT, demandé explicitement : « bouton
                    appel direct du marchand ». Vital sur ce marché. */}
                {(() => {
                  const appel = lienAppel(product.whatsapp)
                  return appel && (
                    <a
                      href={appel}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        border: '1.5px solid ' + product.primary, color: product.primary,
                        fontWeight: 600, fontSize: 14, padding: '12px 20px',
                        borderRadius: 10, textDecoration: 'none', marginRight: 10,
                      }}
                    >
                      {product.lang === 'fr' ? 'Appeler le vendeur' : 'Call the seller'}
                    </a>
                  )
                })()}
                {(() => {
                  const lien = lienCommandeWhatsApp({
                    whatsapp: product.whatsapp,
                    productName: product.name,
                    size: tailleChoisie,
                    priceLabel,
                    url: typeof window === 'undefined' ? '' : window.location.href,
                  })
                  return lien && (
                    <a
                      href={lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#25D366', color: '#fff', fontWeight: 600,
                        fontSize: 14, padding: '12px 20px', borderRadius: 10,
                        textDecoration: 'none',
                      }}
                    >
                      {WA_ORDER_LABELS[product.lang] || WA_ORDER_LABELS.en}
                    </a>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
