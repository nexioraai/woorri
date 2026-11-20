import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Chantier Site Web / Mode 1 — le webhook Stripe est le seul point d'entrée
// qui engage une vraie dépense (achat Porkbun) : jamais testé avant ce
// chantier. Verrouille la frontière entre abonnement domaine et abonnement
// site (metadata.nexiora_domain_id), et que provisionDomain() n'est appelé
// que dans les cas réellement attendus.
// ============================================================

const constructEventMock = vi.fn();
const subscriptionsRetrieveMock = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => subscriptionsRetrieveMock(...args) },
  }),
}));

const provisionDomainMock = vi.fn();
vi.mock('@/lib/domains/provision', () => ({
  provisionDomain: (...args: unknown[]) => provisionDomainMock(...args),
}));

const handlePaidCheckoutMock = vi.fn();
const updateAutoRenewMock = vi.fn();
vi.mock('@/lib/domains/porkbun', () => ({
  updateAutoRenew: (...a: unknown[]) => updateAutoRenewMock(...a),
}));
vi.mock('@/lib/shop/handlePaidCheckout', () => ({
  handlePaidCheckout: (...args: unknown[]) => handlePaidCheckoutMock(...args),
}));

/**
 * F-1/F-2 -- LE DOUBLE NE CONNAISSAIT QUE `update`. Le webhook LIT desormais
 * la ligne du domaine (pour consigner l'evenement et pour resilier) : un
 * double qui ignore `.select()` faisait tomber la route en 500, c'est-a-dire
 * qu'il rendait le nouveau comportement intestable.
 *
 * `lignes` permet a chaque test de decider ce que la base rend, table par
 * table -- exactement comme PostgREST.
 */
function makeSupabaseMock(lignes: Record<string, unknown> = {}) {
  const updateCalls: { table: string; payload: any; eqCalls: [string, unknown][] }[] = [];
  const selects: string[] = [];
  const from = vi.fn((table: string) => {
    const eqCalls: [string, unknown][] = [];
    const b: any = {};
    let colonnes = '';
    b.select = (cols?: string) => {
      colonnes = typeof cols === 'string' ? cols : '';
      selects.push(table + ':' + colonnes);
      return b;
    };
    b.update = (payload: unknown) => {
      updateCalls.push({ table, payload, eqCalls });
      return b;
    };
    b.insert = () => b;
    b.eq = (col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return b;
    };
    const rendu = () => {
      const brut = (lignes as Record<string, unknown>)[table] ?? null;
      if (!brut || typeof brut !== 'object') return { data: brut ?? null, error: null };
      // Projection honoree, comme PostgREST.
      const liste = colonnes.split(',').map((c) => c.trim()).filter(Boolean);
      // Plusieurs lignes : la même projection, ligne par ligne (2026-11-19).
      if (Array.isArray(brut)) {
        return { data: brut.map((l: Record<string, unknown>) => (!liste.length || liste.includes('*') ? l : Object.fromEntries(liste.filter((c) => c in l).map((c) => [c, l[c]])))), error: null };
      }
      if (!liste.length || liste.includes('*')) return { data: brut, error: null };
      const out: Record<string, unknown> = {};
      for (const c of liste) if (c in (brut as Record<string, unknown>)) out[c] = (brut as Record<string, unknown>)[c];
      return { data: out, error: null };
    };
    b.maybeSingle = async () => rendu();
    b.single = async () => rendu();
    b.then = (resolve: any) => resolve(rendu());
    return b;
  });
  // Les comptes : `owner_id` → adresse, comme `auth.admin.getUserById`.
  const comptes: Record<string, string> = { 'u-proprio': 'issayamiyoussouf@gmail.com', 'u-marchand': 'marchand@example.com' };
  const auth = { admin: { getUserById: async (id: string) => ({ data: { user: id in comptes ? { id, email: comptes[id] } : null }, error: null }) } };
  return { supabaseAdmin: { from, auth }, updateCalls, selects };
}

// Les factures d'APPLICATION (2026-11-20) : leur traitement a ses propres tests.
const traiterFactureAppliMock = vi.fn(async (..._a: unknown[]) => ({ traitee: false as boolean, ok: true, statut: 'enregistre', jusquAu: null }));
vi.mock('@/lib/payments/abonnement-appli', () => ({ TYPE_APPLICATION: 'application', traiterFactureAppli: (...a: unknown[]) => traiterFactureAppliMock(...a) }));

// L'adresse donnée à la publication (2026-11-19) : observée, pas exécutée ici.
const assurerAdresseMock = vi.fn(async (..._a: unknown[]) => ({ ok: true as const, nom: 'x', lien: 'https://x.deribfy.app' }));
vi.mock('@/lib/sites/adresse-site', () => ({ assurerAdresseSite: (...a: unknown[]) => assurerAdresseMock(...a) }));

let currentMock: ReturnType<typeof makeSupabaseMock>;
vi.mock('@/lib/supabase-admin', () => ({
  get supabaseAdmin() {
    return currentMock.supabaseAdmin;
  },
}));

function makeRequest(rawBody = '{}') {
  return new Request('https://woorri.test/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig-test' },
    body: rawBody,
  });
}

beforeEach(() => {
  constructEventMock.mockReset();
  subscriptionsRetrieveMock.mockReset();
  provisionDomainMock.mockReset().mockResolvedValue({ ok: true, status: 'dns_configured' });
  handlePaidCheckoutMock.mockReset();
  updateAutoRenewMock.mockReset().mockResolvedValue({ ok: true });
  currentMock = makeSupabaseMock();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

describe('POST /api/stripe/webhook — invoice.paid (frontière domaine vs abonnement site)', () => {
  it('appelle provisionDomain avec le bon domainId quand la facture porte metadata.nexiora_domain_id', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { subscription: 'sub_123' } },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      metadata: { nexiora_domain_id: 'dom-abc' },
      current_period_end: 1735689600,
    });

    const { POST } = await import('../route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(provisionDomainMock).toHaveBeenCalledWith('dom-abc');
    const paidUpdate = currentMock.updateCalls.find((u) => u.payload.status === 'paid');
    expect(paidUpdate).toBeDefined();
    expect(paidUpdate!.payload.updated_at).toBeDefined();
    expect(paidUpdate!.eqCalls).toContainEqual(['status', 'pending']);
  });

  // ── 2026-11-20 : LA FORME RÉELLE. Le test ci-dessus emploie l'ANCIENNE forme
  //    (`subscription` sur la facture) — c'est pourquoi il restait vert pendant
  //    que la production, en version dahlia, s'arrêtait sur chaque facture.
  it('version dahlia (mesurée sur le compte) : la facture porte l’abonnement dans parent.subscription_details', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { id: 'in_d', parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_123', metadata: {} } } } },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      metadata: { nexiora_domain_id: 'dom-abc' },
      items: { data: [{ current_period_end: 1735689600 }] },
    });
    provisionDomainMock.mockClear();
    const { POST } = await import('../route');
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_123');
    expect(provisionDomainMock).toHaveBeenCalledWith('dom-abc');
    const renouvellement = currentMock.updateCalls.find((u) => u.payload.renews_at !== undefined);
    expect(renouvellement?.payload.renews_at).toBe(new Date(1735689600 * 1000).toISOString());
  });

  it('n\'appelle JAMAIS provisionDomain pour une facture d\'abonnement SANS metadata.nexiora_domain_id (abonnement site, pas domaine)', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { subscription: 'sub_456' } },
    });
    subscriptionsRetrieveMock.mockResolvedValue({ metadata: {}, current_period_end: null });

    const { POST } = await import('../route');
    await POST(makeRequest());

    expect(provisionDomainMock).not.toHaveBeenCalled();
  });

  it('n\'appelle jamais provisionDomain si la facture n\'a aucun abonnement rattaché', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { subscription: null } },
    });

    const { POST } = await import('../route');
    await POST(makeRequest());

    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled();
    expect(provisionDomainMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/webhook — invoice.payment_failed', () => {
  it('marque le domaine failed et n\'appelle jamais provisionDomain', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_789' } },
    });
    subscriptionsRetrieveMock.mockResolvedValue({ metadata: { nexiora_domain_id: 'dom-xyz' } });

    const { POST } = await import('../route');
    await POST(makeRequest());

    expect(provisionDomainMock).not.toHaveBeenCalled();
    const failedUpdate = currentMock.updateCalls.find((u) => u.payload.status === 'failed');
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate!.eqCalls).toContainEqual(['id', 'dom-xyz']);
  });
});

describe('POST /api/stripe/webhook — signature invalide', () => {
  it('rejette avec 400 et n\'exécute aucune logique métier', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('signature invalide');
    });

    const { POST } = await import('../route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect(provisionDomainMock).not.toHaveBeenCalled();
  });
});

// ============================================================
// F-1 -- LE RENOUVELLEMENT N'ATTEIGNAIT JAMAIS LA BASE.
//
// L'unique ecriture etait filtree par `.eq('status', 'pending')`. En annee 2,
// le statut vaut `sitemap_submitted` : RIEN n'etait ecrit, `renews_at`
// restait fige sur l'annee 1. Deribfy encaissait un renouvellement et n'en
// gardait aucune trace.
//
// CE QUI EST PROUVE ICI : `renews_at` est mis a jour a CHAQUE facture payee,
// et le statut du provisionnement n'est JAMAIS ramene en arriere.
// ============================================================
/** Les tests existants importent la route DYNAMIQUEMENT, apres avoir arme
 *  les doubles. On conserve cette convention plutot que d'en introduire une
 *  seconde : un import statique figerait les mocks au chargement du module. */
async function appelerWebhook() {
  const { POST } = await import('../route');
  return POST(makeRequest());
}

describe('F-1 — renouvellement annuel', () => {
  function factureDomaine(ligne: Record<string, unknown>, finPeriode = 1799000000) {
    constructEventMock.mockReturnValue({ type: 'invoice.paid', data: { object: { subscription: 'sub_r' } } });
    subscriptionsRetrieveMock.mockResolvedValue({
      metadata: { nexiora_domain_id: 'dom-abc' },
      current_period_end: finPeriode,
    });
    currentMock = makeSupabaseMock({ site_domains: ligne });
  }
  const misesAJour = () => currentMock.updateCalls.filter((u) => u.table === 'site_domains');

  it('PREMIER ACHAT (pending) -> statut `paid` ET `renews_at` posé', async () => {
    factureDomaine({ id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'pending' });
        const res = await appelerWebhook();
    expect(res.status).toBe(200);
    const charges = misesAJour().map((u) => u.payload);
    expect(charges.some((p) => p.status === 'paid')).toBe(true);
    expect(charges.some((p) => typeof p.renews_at === 'string')).toBe(true);
  });

  it('RENOUVELLEMENT après `sitemap_submitted` -> `renews_at` EST mis à jour', async () => {
    // C'EST LA REGRESSION QUE CE TEST EXISTE POUR EMPECHER.
    factureDomaine({ id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted' });
        await appelerWebhook();
    const inconditionnelle = misesAJour().find((u) => !u.eqCalls.some(([c]) => c === 'status'));
    expect(inconditionnelle, 'une mise à jour de renews_at sans condition de statut doit exister').toBeTruthy();
    expect(typeof inconditionnelle!.payload.renews_at).toBe('string');
  });

  it('le renouvellement ne RAMÈNE JAMAIS un domaine provisionné en arrière', async () => {
    factureDomaine({ id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted' });
        await appelerWebhook();
    // La transition vers `paid` reste conditionnee a `pending`.
    const versPaid = misesAJour().filter((u) => u.payload.status === 'paid');
    for (const u of versPaid) {
      expect(u.eqCalls).toContainEqual(['status', 'pending']);
    }
  });

  it('DOUBLE WEBHOOK -> même effet, aucun état incohérent', async () => {
    factureDomaine({ id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted' });
        await appelerWebhook();
    const premier = misesAJour().length;
    currentMock = makeSupabaseMock({ site_domains: { id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted' } });
        await appelerWebhook();
    expect(misesAJour().length).toBe(premier);
  });

  it('facture SANS metadata domaine -> aucune écriture sur site_domains', async () => {
    constructEventMock.mockReturnValue({ type: 'invoice.paid', data: { object: { subscription: 'sub_x' } } });
    subscriptionsRetrieveMock.mockResolvedValue({ metadata: {}, current_period_end: 1799000000 });
    currentMock = makeSupabaseMock();
        await appelerWebhook();
    expect(misesAJour()).toHaveLength(0);
  });

  it('P1 — le renouvellement est CONSIGNÉ à l’historique', async () => {
    factureDomaine({ id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted' });
        await appelerWebhook();
    expect(currentMock.selects.some((s) => s.startsWith('site_domains:'))).toBe(true);
  });
});

// ============================================================
// F-2 -- L'ANNULATION D'ABONNEMENT DOMAINE ETAIT INERTE.
//
// Le webhook sortait proprement en 200 pendant que le registraire continuait
// d'auto-renouveler AUX FRAIS DE DERIBFY. Le defaut ne se voyait dans aucun
// code de statut : ce qui doit etre asserte, c'est L'APPEL.
// ============================================================
describe('F-2 — annulation d’un abonnement domaine', () => {
  it('l’annulation est PROPAGÉE au registraire', async () => {
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', metadata: { nexiora_domain_id: 'dom-abc' } } },
    });
    currentMock = makeSupabaseMock({
      site_domains: { id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'sitemap_submitted', auto_renew: true, renews_at: null, renewal_sync_error: null },
    });
        const res = await appelerWebhook();
    expect(res.status).toBe(200);
    expect(updateAutoRenewMock).toHaveBeenCalledWith('client.com', false);
  });

  it('l’annulation d’un abonnement domaine ne DÉPUBLIE JAMAIS les sites', async () => {
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', metadata: { nexiora_domain_id: 'dom-abc' } } },
    });
    currentMock = makeSupabaseMock({
      site_domains: { id: 'dom-abc', site_id: 'site-1', domain: 'client.com', status: 'ok', auto_renew: true, renews_at: null, renewal_sync_error: null },
    });
        await appelerWebhook();
    expect(currentMock.updateCalls.filter((u) => u.table === 'sites' && u.payload.published === false)).toHaveLength(0);
  });

  it('l’annulation d’un abonnement de SITE dépublie toujours (comportement inchangé)', async () => {
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', metadata: {} } },
    });
    currentMock = makeSupabaseMock({ sites: [{ id: 'site-1', owner_id: 'u-marchand' }] });
        await appelerWebhook();
    expect(currentMock.updateCalls.some((u) => u.table === 'sites' && u.payload.published === false)).toBe(true);
    expect(updateAutoRenewMock).not.toHaveBeenCalled();
  });

  // ── 2026-11-19 : le propriétaire annule son propre abonnement ; son site reste en ligne.
  it('les sites d’un compte exempté ne sont JAMAIS dépubliés ; les autres du même client, si', async () => {
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_proprio', metadata: {} } },
    });
    currentMock = makeSupabaseMock({
      sites: [
        { id: 'site-proprio', owner_id: 'u-proprio' },
        { id: 'site-autre', owner_id: 'u-marchand' },
      ],
    });
    const res = await appelerWebhook();
    expect(res.status).toBe(200);
    const depublies = currentMock.updateCalls.filter((u) => u.table === 'sites' && u.payload.published === false)
    expect(depublies.map((u) => u.eqCalls)).toEqual([[['id', 'site-autre']]]);
  });

  it('ligne de domaine introuvable -> aucun appel registraire, aucune exception', async () => {
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1', metadata: { nexiora_domain_id: 'inconnu' } } },
    });
    currentMock = makeSupabaseMock();
        const res = await appelerWebhook();
    expect(res.status).toBe(200);
    expect(updateAutoRenewMock).not.toHaveBeenCalled();
  });
});

// ── 2026-11-19 : un site publié par un paiement reçoit son <nom>.deribfy.app.
describe('l’adresse donnée à la publication', () => {
  it('abonnement actif → chaque site du client reçoit son adresse', async () => {
    assurerAdresseMock.mockClear();
    constructEventMock.mockReturnValue({ type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'active', metadata: {} } } });
    currentMock = makeSupabaseMock({ sites: [{ id: 's1', slug: 'goura-doula-1', name: 'Goura Doula' }] });
    const res = await appelerWebhook();
    expect(res.status).toBe(200);
    expect(assurerAdresseMock).toHaveBeenCalledWith('goura-doula-1', 'Goura Doula');
  });

  it('abonnement inactif → aucune adresse demandée', async () => {
    assurerAdresseMock.mockClear();
    constructEventMock.mockReturnValue({ type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'past_due', metadata: {} } } });
    currentMock = makeSupabaseMock({ sites: [{ id: 's1', slug: 'goura-doula-1', name: 'Goura Doula' }] });
    await appelerWebhook();
    expect(assurerAdresseMock).not.toHaveBeenCalled();
  });
});

// ── 2026-11-20 : une APPLICATION ne touche jamais aux sites ni aux domaines.
describe('les avis d’une application', () => {
  it('invoice.paid d’une appli : traitée par le module des applis, et le chemin des domaines n’est pas pris', async () => {
    traiterFactureAppliMock.mockResolvedValueOnce({ traitee: true, ok: true, statut: 'enregistre', jusquAu: null });
    subscriptionsRetrieveMock.mockClear();
    constructEventMock.mockReturnValue({ id: 'evt_1', type: 'invoice.paid', data: { object: { id: 'in_1', parent: { subscription_details: { subscription: 'sub_1', metadata: { deribfy_type: 'application' } } } } } });
    currentMock = makeSupabaseMock();
    const res = await appelerWebhook();
    expect(res.status).toBe(200);
    expect(traiterFactureAppliMock).toHaveBeenCalled();
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled();
  });

  it('subscription.updated / deleted d’une appli : aucun site n’est publié ni dépublié', async () => {
    for (const type of ['customer.subscription.updated', 'customer.subscription.deleted']) {
      constructEventMock.mockReturnValue({ id: 'evt_2', type, data: { object: { customer: 'cus_compte', status: 'active', metadata: { deribfy_type: 'application' } } } });
      currentMock = makeSupabaseMock({ sites: [{ id: 's1', owner_id: 'u-marchand', slug: 'x', name: 'X' }] });
      await appelerWebhook();
      expect(currentMock.updateCalls.filter((u) => u.table === 'sites'), type).toEqual([]);
    }
  });
});
