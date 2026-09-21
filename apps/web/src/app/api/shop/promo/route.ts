import { NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/require-site-owner';
import { canTransact } from '@/lib/commerce-admission/canTransact';
import { supabaseAdmin } from '@/lib/supabase-admin';

// ============================================================
// M2-217 — L'OUTIL PROMO DU MARCHAND (Mode 2).
//
// DEMANDE DE YOUSSOUF : « les marchands doivent pouvoir faire des
// réductions quand ils le souhaitent, pour augmenter les ventes — tous les
// produits OU certains produits, on les laisse décider eux-mêmes. »
//
// LE MÉCANISME EST UNE PAIRE RÉVERSIBLE :
//   appliquer : compare_at_price := prix actuel (s'il n'est pas déjà posé),
//               price := compare_at_price × (1 − p/100)
//   retirer   : price := compare_at_price, compare_at_price := NULL
//
// L'ancien prix devient le PRIX BARRÉ des fiches — la promo et le barré
// sont UNE seule vérité, jamais deux états à réconcilier. Retirer restaure
// exactement le prix d'avant : aucune perte, même après plusieurs promos
// (le barré d'origine est conservé, jamais écrasé par une seconde remise).
//
// TOUT LE CALCUL EST SERVEUR, sur les prix SERVEUR : le client n'envoie
// que le pourcentage et la portée — jamais un prix.
// ============================================================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, action, percent, productIds } = body as {
      slug?: string;
      action?: string;
      percent?: number;
      productIds?: string[] | null;
    };
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    if (action !== 'apply' && action !== 'remove') {
      return NextResponse.json({ error: "action 'apply' ou 'remove' requise" }, { status: 400 });
    }
    if (action === 'apply') {
      if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 1 || percent > 90) {
        return NextResponse.json({ error: 'percent entre 1 et 90 requis' }, { status: 400 });
      }
    }
    // Portée : null/absent = TOUS les produits ; sinon la sélection exacte.
    const cible = Array.isArray(productIds)
      ? productIds.filter((x): x is string => typeof x === 'string').slice(0, 500)
      : null;
    if (cible !== null && cible.length === 0) {
      return NextResponse.json({ error: 'Sélection vide — choisis des produits ou tous' }, { status: 400 });
    }

    // Même admission que la création de produit : propriété + mode commerçant.
    const auth = await requireSiteOwner(req, slug, 'id, mode');
    if (!auth.ok) return auth.response;
    if (!canTransact((auth.site as { mode?: unknown }).mode)) {
      return NextResponse.json(
        { error: 'Ce site est une vitrine : il ne peut pas exercer d’activité commerciale.' },
        { status: 403 }
      );
    }
    const siteId = (auth.site as { id: string }).id;

    let query = supabaseAdmin
      .from('shop_products')
      .select('id, price, compare_at_price')
      .eq('site_id', siteId);
    if (cible !== null) query = query.in('id', cible);
    const { data: produits, error: readError } = await query;
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    let touches = 0;
    for (const p of produits ?? []) {
      const prix = p.price != null ? Number(p.price) : null;
      const barre = p.compare_at_price != null ? Number(p.compare_at_price) : null;
      if (action === 'apply') {
        // Base de calcul = le barré s'il existe (promo re-appliquée), sinon
        // le prix courant. Le prix D'ORIGINE reste la référence : deux
        // promos successives ne se composent pas en cascade.
        const base = barre ?? prix;
        if (base == null || base <= 0) continue;
        const nouveau = Math.round(base * (1 - (percent as number) / 100) * 100) / 100;
        if (nouveau <= 0) continue;
        const { error } = await supabaseAdmin
          .from('shop_products')
          .update({ compare_at_price: base, price: nouveau })
          .eq('id', p.id)
          .eq('site_id', siteId);
        if (!error) touches += 1;
      } else {
        if (barre == null) continue; // pas de promo posée : rien à retirer
        const { error } = await supabaseAdmin
          .from('shop_products')
          .update({ price: barre, compare_at_price: null })
          .eq('id', p.id)
          .eq('site_id', siteId);
        if (!error) touches += 1;
      }
    }
    return NextResponse.json({ success: true, touches });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
