import 'server-only'
import { NextResponse } from 'next/server';
import { sansQuota } from '@/lib/admin-emails';
import { assurerAdresseSite } from '@/lib/sites/adresse-site';
import { logAnomaly } from '@/lib/anomaly';
import { TYPE_APPLICATION, traiterFactureAppli } from '@/lib/payments/abonnement-appli';
import { abonnementDeFacture } from '@/lib/payments/facture-stripe';
import { publierApresPaiement } from '@/lib/payments/publier-apres-paiement';
import { traiterEchecAppli, traiterLitigeAppli, traiterRemboursementAppli, type ResultatCycle } from '@/lib/payments/cycle-de-vie-appli';

import { supabaseAdmin as supabase, supabaseAdmin } from '@/lib/supabase-admin';
import { getStripe } from '@/lib/stripe';
import { handlePaidCheckout } from '@/lib/shop/handlePaidCheckout';
import { provisionDomain } from '@/lib/domains/provision';
import { resilierRenouvellement } from '@/lib/domains/renewal';
import { consignerEvenementDomaine } from '@/lib/domains/history';

// ── LE MÊME AVIS DEUX FOIS (2026-11-22). Pour les avis du CYCLE DE VIE d'une
//    appli (échec, remboursement, litige), dont les alertes ne sont pas
//    idempotentes : l'identifiant de l'avis est noté APRÈS succès, et un avis
//    déjà noté n'est pas rejoué. Une lecture ou une écriture ratée du journal
//    ne bloque rien : les effets en base restent idempotents par eux-mêmes.
//    L'achat (`invoice.paid`) n'y passe pas : la facture fait déjà référence.
async function avisDejaTraite(id: string): Promise<boolean> {
  const r = await supabaseAdmin.from('stripe_avis_traites').select('evenement').eq('evenement', id).maybeSingle();
  return r.error === null && r.data !== null;
}
async function noterAvisTraite(id: string, type: string): Promise<void> {
  const r = await supabaseAdmin.from('stripe_avis_traites').insert({ evenement: id, type });
  if (r.error) console.error('[stripe] journal des avis non écrit', id, r.error.message);
}
const AVIS_DU_CYCLE = new Set(['invoice.payment_failed', 'charge.refunded', 'charge.dispute.created']);

// provisionDomain() enchaine Porkbun + Vercel + plusieurs ecritures DNS +
// Google, en serie : sans ce delai plus long (meme valeur que la route de
// provisioning manuel domains/provision/route.ts, qui fait exactement la
// meme chaine), Vercel pouvait couper la fonction avant la fin sur un achat
// lent, laissant le domaine bloque en 'paid' sans qu'aucun cron ne le
// reprenne (domain-retry ne surveille que 'failed').
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: unknown) {
    // `unknown`, pas `any` : une erreur attrapee peut etre n'importe quoi,
    // et seul ce test le dit honnetement.
    const messageErreur = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature verification failed:', messageErreur);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── CHAQUE AVIS LAISSE UNE LIGNE (2026-11-20). Mesuré : une livraison
  //    réussie ne laissait AUCUNE trace dans les journaux — la preuve de
  //    l'arrivée d'un avis ne pouvait venir que du compteur de Stripe.
  console.log(`[stripe] avis reçu ${event.type} ${event.id}`);

  if (AVIS_DU_CYCLE.has(event.type) && (await avisDejaTraite(event.id))) {
    console.log(`[stripe] avis déjà traité ${event.id} : rien de plus`);
    return NextResponse.json({ received: true, deja: true });
  }

  try {
    let cycle: ResultatCycle = { traitee: false };
    switch (event.type) {
      // Argent encaisse : c'est le seul moment ou Nexiora engage une depense
      // chez Porkbun. Vaut aussi pour les renouvellements annuels, d'ou la
      // reprise via provisionDomain qui saute les etapes deja faites.
      case 'invoice.paid': {
        const inv: any = event.data.object;
        // ── UNE APPLICATION (décision 9A, 2026-11-20) : enregistrée par la
        //    fonction unique de tous les paiements ; jamais par le chemin des
        //    domaines ni des sites. Une erreur de base relance l'avis (500).
        const appli = await traiterFactureAppli(inv);
        if (appli.traitee) {
          if (!appli.ok) {
            await logAnomaly({ type: 'stripe_facture_application', severity: 'blocked', details: { facture: inv?.id ?? null, erreur: appli.erreur } });
            if (!/attendu USD|sans identifiant|sans marque/u.test(appli.erreur)) throw new Error('facture d’application non enregistrée : ' + appli.erreur);
          } else {
            // ── LE PAIEMENT REÇU PUBLIE (2026-11-22), au nom enregistré au
            //    clic. Après l'enregistrement, jamais avant ; ne lève jamais.
            const effet = await publierApresPaiement({ app: appli.app, proprietaire: appli.proprietaire, accordLecture: appli.accordLecture });
            console.log(`[stripe] appli ${appli.app} après paiement → ${effet}`);
          }
          break;
        }
        // Version dahlia (mesurée) : `inv.subscription` n'existe plus — lu dans
        // `parent.subscription_details`, avec repli sur l'ancienne forme.
        const subId = abonnementDeFacture(inv).id;
        if (!subId) break;
        const sub = await getStripe().subscriptions.retrieve(subId);
        const domainId = (sub.metadata as any)?.nexiora_domain_id;
        if (!domainId) break;
        // ============================================================
        // F-1 -- LE RENOUVELLEMENT N'ATTEIGNAIT JAMAIS LA BASE.
        //
        // L'unique ecriture etait filtree par `.eq('status', 'pending')`. En
        // annee 2, le statut vaut `sitemap_submitted` : RIEN n'etait ecrit,
        // `renews_at` restait fige sur l'annee 1, et `provisionDomain`
        // sortait immediatement. Deribfy encaissait un renouvellement et n'en
        // gardait aucune trace.
        //
        // DEUX ECRITURES DISTINCTES DESORMAIS, parce que ce sont deux faits
        // differents :
        //   * `renews_at` est vrai a CHAQUE facture payee -- premier achat
        //     comme renouvellement. Il est donc ecrit sans condition de
        //     statut.
        //   * `status: 'paid'` est une TRANSITION du provisionnement initial.
        //     La conditionner a `pending` reste correct : un renouvellement ne
        //     doit surtout pas ramener un domaine deja provisionne a un etat
        //     anterieur.
        //
        // CE QUE STRIPE PROUVE ET CE QU'IL NE PROUVE PAS. Une facture payee
        // prouve que le CLIENT a paye Deribfy. Elle ne prouve pas que le
        // registraire a renouvele : c'est l'auto-renouvellement du compte qui
        // le fait, hors de ce code. `renews_at` reflete donc la periode
        // FACTUREE, jamais une garantie d'enregistrement -- et le journal
        // consigne l'evenement pour que l'ecart soit reconciliable.
        // ============================================================
        // Version dahlia (mesurée) : `current_period_end` a quitté l'abonnement
        // pour ses lignes (`items.data[0]`) ; l'ancienne forme reste lue en repli.
        const finSecondes = (sub as any).items?.data?.[0]?.current_period_end ?? (sub as any).current_period_end;
        const finPeriode = finSecondes
          ? new Date(finSecondes * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from('site_domains')
          .update({ renews_at: finPeriode, updated_at: new Date().toISOString() })
          .eq('id', domainId);

        const { data: ligneRenouvelee } = await supabaseAdmin
          .from('site_domains')
          .select('site_id, domain, status')
          .eq('id', domainId)
          .maybeSingle();

        if (ligneRenouvelee?.domain) {
          await consignerEvenementDomaine({
            siteId: (ligneRenouvelee.site_id as string) ?? null,
            domain: ligneRenouvelee.domain as string,
            evenement:
              (ligneRenouvelee.status as string) === 'pending' ? 'achat_confirme' : 'renouvellement',
            origine: 'webhook',
            details: { domainId, renewsAt: finPeriode },
          });
        }

        await supabaseAdmin
          .from('site_domains')
          .update({
            status: 'paid',
            renews_at: finPeriode,
            // Marqueur de fraicheur explicite : domain-retry s'en sert pour
            // reprendre un provisioning coupe en route (fonction interrompue
            // avant que provisionDomain n'ait pu ecrire un statut plus
            // avance), sans dependre d'un trigger DB non verifiable ici.
            updated_at: new Date().toISOString(),
          })
          .eq('id', domainId)
          .eq('status', 'pending');
        await provisionDomain(domainId);
        break;
      }

      // Paiement echoue : aucun achat, la ligne reste en erreur explicite.
      case 'invoice.payment_failed': {
        const inv: any = event.data.object;
        // ── UNE APPLICATION (2026-11-22) : rien ne se prolonge, on alerte ;
        //    jamais le chemin des domaines.
        cycle = await traiterEchecAppli(inv);
        if (cycle.traitee) break;
        // Version dahlia (mesurée) : `inv.subscription` n'existe plus — lu dans
        // `parent.subscription_details`, avec repli sur l'ancienne forme.
        const subId = abonnementDeFacture(inv).id;
        if (!subId) break;
        const sub = await getStripe().subscriptions.retrieve(subId);
        const domainId = (sub.metadata as any)?.nexiora_domain_id;
        if (!domainId) break;
        await supabaseAdmin
          .from('site_domains')
          .update({ status: 'failed', last_error: 'Paiement refuse' })
          .eq('id', domainId);
        break;
      }

      // ── REMBOURSEMENT et CONTESTATION d'une application (2026-11-22).
      //    Un paiement qui n'est pas celui d'une facture d'appli : ignoré ici.
      case 'charge.refunded': {
        cycle = await traiterRemboursementAppli(event.data.object);
        break;
      }
      case 'charge.dispute.created': {
        cycle = await traiterLitigeAppli(event.data.object);
        break;
      }

      // Abonnement activé / renouvelé : on publie
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const obj: any = event.data.object;
        // Achat boutique (mode=payment) : fulfillment dropshipping, PAS un abonnement.
        if (event.type === 'checkout.session.completed' && obj?.mode === 'payment') {
          await handlePaidCheckout(obj);
          break;
        }
        const customerId = obj.customer as string;

        // ── UNE APPLICATION ne publie ni ne dépublie AUCUN site (2026-11-20) :
        //    son paiement passe par `invoice.paid`, son compteur par la base.
        if (obj?.metadata?.deribfy_type === TYPE_APPLICATION) break;

        // Un abonnement domaine ne dit rien de la publication du site : il ne
        // doit ni publier ni depublier quoi que ce soit. Sans ce filtre,
        // acheter un domaine (abonnement cree en 'incomplete') depublierait
        // tous les sites du marchand.
        if (obj?.metadata?.nexiora_domain_id) break;

        const isCheckout = event.type === 'checkout.session.completed';
        const status = isCheckout ? 'active' : (obj.status || 'active');
        const isActive = status === 'active' || status === 'trialing';

        await supabase
          .from('sites')
          .update({
            published: isActive,
            subscription_status: status,
          })
          .eq('stripe_customer_id', customerId);

        // ── L'ADRESSE, À LA PUBLICATION (2026-11-19) : chaque site publié par
        //    ce paiement reçoit son <nom>.deribfy.app s'il n'en a pas. Un échec
        //    ne fait pas échouer le webhook (Stripe le renverrait en boucle) :
        //    il est journalisé, et la prochaine publication réessaie.
        if (isActive) {
          const { data: publies } = await supabase
            .from('sites')
            .select('id, slug, name')
            .eq('stripe_customer_id', customerId);
          for (const site of (publies ?? []) as { id: string; slug: string; name: string | null }[]) {
            const a = await assurerAdresseSite(site.slug, site.name);
            if (!a.ok) await logAnomaly({ type: 'site_adresse_non_attribuee', severity: 'warning', siteId: site.id, details: { slug: site.slug, erreur: a.erreur } });
          }
        }
        break;
      }
      // Abonnement annulé : on dépublie
      case 'customer.subscription.deleted': {
        const obj: any = event.data.object;
        const customerId = obj.customer as string;
        // Une APPLICATION résiliée : aucun site n'est concerné. Elle reste payée
        // jusqu'à la fin de sa période ; la suite suit la règle de l'impayé.
        if (obj?.metadata?.deribfy_type === TYPE_APPLICATION) break;

        // ============================================================
        // F-2 -- CETTE SORTIE ETAIT INERTE, ET ELLE COUTAIT DE L'ARGENT.
        //
        // Le filtre est JUSTE : l'arret d'un abonnement domaine ne doit pas
        // depublier les sites du marchand. Mais sortir sans rien faire
        // laissait le registraire auto-renouveler AUX FRAIS DE DERIBFY, sans
        // plafond ni alerte. Le client cessait de payer ; nous continuions.
        //
        // L'annulation est desormais PROPAGEE au registraire par l'autorite
        // partagee. Son echec n'est jamais avale : il laisse un etat de
        // reconciliation explicite et une anomalie bloquante.
        // ============================================================
        const domainIdAnnule = obj?.metadata?.nexiora_domain_id;
        if (domainIdAnnule) {
          const { data: ligne } = await supabaseAdmin
            .from('site_domains')
            .select('site_id, domain')
            .eq('id', domainIdAnnule)
            .maybeSingle();
          if (ligne?.site_id && ligne?.domain) {
            await resilierRenouvellement({
              siteId: ligne.site_id as string,
              domain: ligne.domain as string,
              origine: 'webhook',
            });
          }
          break;
        }

        // ── LES SITES DU PROPRIÉTAIRE NE TOMBENT PAS (2026-11-19).
        //
        // Annuler un abonnement dépubliait TOUS les sites du client Stripe. Le
        // propriétaire de Deribfy annule son propre abonnement de test (15 CAD,
        // le seul abonné réel) : son site `yia-global-commodities` serait parti
        // hors ligne. Les comptes exemptés (`sansQuota`) gardent leurs sites en
        // ligne et leur état intact ; tous les autres sont dépubliés comme avant.
        //
        // UNE LECTURE QUI ÉCHOUE NE DÉPUBLIE RIEN AU HASARD : on lève, la route
        // répond 500, et Stripe renvoie l'événement plus tard.
        // L'IDENTITÉ VIENT DU COMPTE (`owner_id` → auth), jamais de la colonne
        // `owner_email` (DETTE 6a) : c'est l'adresse du compte authentifié qui
        // dit s'il est exempté.
        const { data: lies, error: erreurLecture } = await supabase
          .from('sites')
          .select('id, owner_id')
          .eq('stripe_customer_id', customerId);
        if (erreurLecture) throw new Error('webhook: sites du client illisibles — ' + erreurLecture.message);
        for (const site of (lies ?? []) as { id: string; owner_id: string | null }[]) {
          if (site.owner_id) {
            const { data: compte, error: erreurCompte } = await supabaseAdmin.auth.admin.getUserById(site.owner_id);
            if (erreurCompte) throw new Error('webhook: compte du propriétaire illisible — ' + erreurCompte.message);
            if (sansQuota(compte.user?.email)) continue;
          }
          await supabase
            .from('sites')
            .update({
              published: false,
              subscription_status: 'canceled',
            })
            .eq('id', site.id);
        }
        break;
      }
    }
    if (cycle.traitee) {
      console.log(`[stripe] cycle d’une appli ${event.type} ${event.id} → ${cycle.effet}`);
      await noterAvisTraite(event.id, event.type);
    }
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
}
