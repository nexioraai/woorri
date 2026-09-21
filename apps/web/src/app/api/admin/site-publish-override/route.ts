import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAnomaly } from '@/lib/anomaly';

// ============================================================
// M2-212 — MISE EN LIGNE HORS STRIPE (paiement comptant).
//
// LE BESOIN, DIT PAR YOUSSOUF : « mes utilisateurs au Tchad n'ont pas de
// carte de crédit — ils me paient en comptant. Il me faut un moyen de mettre
// leurs sites en ligne depuis mon dashboard admin, sans que Stripe se
// déclenche pour moi, contrairement aux autres. »
//
// CE QUE LE MODÈLE PERMET DÉJÀ, ET QUE CETTE ROUTE EXPLOITE : `published`
// n'est bougé QUE par le webhook Stripe, et TOUJOURS par la clé
// `stripe_customer_id`. Un site payé comptant n'a pas de client Stripe —
// le webhook ne peut donc NI le publier NI le dépublier. Cette route est
// l'unique second chemin, réservé aux ADMIN_EMAILS, et chaque usage est
// journalisé avec son motif : un encaissement comptant laisse une trace.
//
// `subscription_status: 'offline'` — un état que seul ce chemin écrit.
// Vérifié avant d'écrire : AUCUN cron ni aucune route ne dépublie sur la
// valeur de `subscription_status` ; seul le webhook le fait, par la clé
// Stripe. Un site 'offline' est donc stable jusqu'à décision admin inverse.
//
// Même pattern d'autorisation que site-archive-override / ai-usage /
// cron-runs / system-health — pas de mécanisme parallèle.
// ============================================================
const ADMIN_EMAILS = ['issayamiyoussouf@gmail.com'];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug, publish, reason } = await req.json().catch(() => ({}));
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug requis' }, { status: 400 });
  }
  if (typeof publish !== 'boolean') {
    return NextResponse.json({ error: 'publish (true/false) requis' }, { status: 400 });
  }
  // Le motif est OBLIGATOIRE : « payé comptant le 21/09, reçu n°… » — c'est
  // la comptabilité de l'encaissement hors ligne, pas une formalité.
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return NextResponse.json({ error: 'Motif requis (5 caractères minimum)' }, { status: 400 });
  }

  const { data: site, error: findError } = await supabaseAdmin
    .from('sites')
    .select('id, slug, published, archived_at, subscription_status, owner_email')
    .eq('slug', slug)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
  // Un site archivé ne se publie pas par ce chemin : l'archivage a sa propre
  // autorité (site-archive-override) et ses propres garde-fous.
  if ((site as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ error: 'Site archivé — restaurer avant de publier' }, { status: 409 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('sites')
    .update({
      published: publish,
      // 'offline' = en ligne, payé hors Stripe. 'offline_ended' = retiré par
      // l'admin. Deux valeurs distinctes : l'historique se lit dans la table.
      subscription_status: publish ? 'offline' : 'offline_ended',
    })
    .eq('id', (site as { id: string }).id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await logAnomaly({
    type: 'admin_site_publish_override',
    severity: 'warning',
    siteId: (site as { id: string }).id,
    details: {
      adminEmail: user.email,
      slug,
      publish,
      reason: reason.trim(),
      ownerEmail: (site as { owner_email?: string }).owner_email ?? null,
      statutPrecedent: {
        published: (site as { published?: boolean }).published ?? null,
        subscription_status: (site as { subscription_status?: string }).subscription_status ?? null,
      },
    },
  });

  return NextResponse.json({ success: true, slug, published: publish });
}
