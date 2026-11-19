'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslation } from '@/lib/translations';

// LA POLITIQUE DE REMBOURSEMENT (décision du propriétaire, 2026-11-19).
//
// `/remboursement` répondait 404, et Stripe exige une politique de
// remboursement visible. Le texte est celui du propriétaire, aligné sur Bolt,
// Wix, Replit et Lovable : une fenêtre sur le premier paiement seulement, rien
// sur les renouvellements, rien sur l'usage consommé.
//
// UNE PRÉCISION FIDÈLE AU CODE : les modifications non utilisées expirent à la
// fin de la PÉRIODE payée (30 jours à partir du paiement, décision du
// 2026-11-19), pas au 1er du mois — le compteur repart à chaque paiement.
const MISE_A_JOUR = new Date('2026-11-19T12:00:00Z');
const date = (langue: string) =>
  new Intl.DateTimeFormat(langue, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(MISE_A_JOUR);

const CONTENT = {
  fr: {
    title: 'Politique de remboursement',
    updated: `Dernière mise à jour : ${date('fr-CA')}`,
    intro:
      "Cette politique s'applique aux abonnements Deribfy (sites, boutiques, dropshipping et applications) et aux modifications qu'ils incluent. Deribfy est un service numérique : il n'y a ni livraison ni retour de marchandise.",
    sections: [
      { h: '1. Premier abonnement : 14 jours', p: ["Si vous n'êtes pas satisfait, écrivez-nous à contact@deribfy.com dans les 14 jours qui suivent votre premier paiement. Nous vous remboursons intégralement."] },
      { h: '2. Renouvellements', p: ["Les renouvellements ne sont pas remboursés. Vous pouvez résilier à tout moment : votre abonnement continue jusqu'au bout de la période déjà payée, puis il s'arrête."] },
      { h: '3. Modifications consommées', p: ["Une modification consommée n'est jamais remboursée. Une modification que Deribfy n'arrive pas à faire n'est jamais décomptée : il n'y a donc rien à rembourser."] },
      { h: '4. Modifications non utilisées', p: ["Les modifications non utilisées expirent à la fin de la période d'abonnement en cours. Le compteur repart à chaque nouveau paiement."] },
      { h: '5. Erreur de facturation', p: ['Une erreur de facturation est remboursée intégralement, sans condition.'] },
      { h: '6. Tout autre cas', p: ['Écrivez-nous à contact@deribfy.com. Chaque demande est examinée une à la fois.'] },
    ],
  },
  en: {
    title: 'Refund policy',
    updated: `Last updated: ${date('en-US')}`,
    intro:
      'This policy applies to Deribfy subscriptions (websites, stores, dropshipping and applications) and to the modifications they include. Deribfy is a digital service: there is no shipping and no return of goods.',
    sections: [
      { h: '1. First subscription: 14 days', p: ['If you are not satisfied, write to us at contact@deribfy.com within 14 days of your first payment. We will refund you in full.'] },
      { h: '2. Renewals', p: ['Renewals are not refunded. You can cancel at any time: your subscription runs until the end of the period already paid for, then stops.'] },
      { h: '3. Used modifications', p: ['A modification that has been used is never refunded. A modification Deribfy fails to make is never counted, so there is nothing to refund.'] },
      { h: '4. Unused modifications', p: ['Unused modifications expire at the end of the current subscription period. The counter resets with each new payment.'] },
      { h: '5. Billing errors', p: ['A billing error is refunded in full, with no conditions.'] },
      { h: '6. Any other case', p: ['Write to us at contact@deribfy.com. Each request is reviewed one at a time.'] },
    ],
  },
};

export default function RemboursementPage() {
  const { lang } = useTranslation();
  const c = CONTENT[lang === 'en' ? 'en' : 'fr'];

  return (
    <main className="nexiora-bg min-h-screen text-white">
      <Navbar />
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <Link
          href="/"
          className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200 mb-6 inline-block whitespace-nowrap"
        >
          ← {lang === 'en' ? 'Home' : 'Accueil'}
        </Link>

        <div className="glass rounded-3xl p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2">{c.title}</h1>
          <p className="text-sm text-slate-400 mb-8">{c.updated}</p>
          <p className="text-slate-300 leading-relaxed mb-8">{c.intro}</p>
          <div className="space-y-8">
            {c.sections.map((s) => (
              <div key={s.h}>
                <h2 className="text-lg font-bold text-white mb-3">{s.h}</h2>
                {s.p.map((para) => (
                  <p key={para} className="text-slate-300 leading-relaxed mb-3">{para}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
