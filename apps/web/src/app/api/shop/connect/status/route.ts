import { NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/require-site-owner';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProvider } from '@/lib/payments';

/** GET /api/shop/connect/status?slug=... → { connected, ready } */
export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    // M2-02 -- la verification de propriete etait reimplementee ici (copie
    // verbatim de la meme fonction dans 5 routes, plus 2 controles inline).
    // Toutes portaient la MEME regle, mais sur `owner_email` SEUL, la ou la
    // primitive canonique priorise `owner_id` -- identite stable, insensible
    // a un changement d'adresse. Delegation : une seule regle, un seul
    // endroit, aucune divergence possible.
    const auth = await requireSiteOwner(req, slug, 'id, payment_account_id, payment_provider');
    if (!auth.ok) return auth.response;

    if (!(auth.site as any).payment_account_id) return NextResponse.json({ connected: false, ready: false });

    const provider = getProvider((auth.site as any).payment_provider);
    const { ready } = await provider.getStatus((auth.site as any).payment_account_id);
    return NextResponse.json({ connected: true, ready });
  } catch (e: unknown) {
    // `unknown`, pas `any` : une erreur attrapee peut etre n'importe quoi,
    // et seul ce test le dit honnetement.
    const messageErreur = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: messageErreur }, { status: 500 });
  }
}
