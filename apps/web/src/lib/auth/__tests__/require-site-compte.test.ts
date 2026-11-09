import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUser, table, projections } = vi.hoisted(() => ({
  getUser: vi.fn(),
  table: { site: null as unknown, compte: null as unknown },
  // LE HARNAIS N'IGNORE PAS SES ARGUMENTS. Un faux `select()` qui accepte
  // tout laisse passer une projection trop large sans que rien ne le dise —
  // c'est ce que le cliquet `postgrestProjectionFidelity` refuse.
  projections: {} as Record<string, string>,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (t: string) => ({
      select: (cols: string) => {
        projections[t] = cols
        return ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: table.compte, error: null }) }),
          maybeSingle: async () => ({ data: t === 'sites_public' ? table.site : table.compte, error: null }),
        }),
      })
      },
    }),
  },
}));

import { requireSiteCompte } from '../require-site-compte';

// ============================================================
// LOT 10 — LE REFUS NE DIT JAMAIS POURQUOI.
//
// Session absente, compte inexistant, compte en attente, compte suspendu,
// mauvais rôle : le MÊME 403, mot pour mot. Distinguer « vous n'avez pas de
// compte » de « votre compte est suspendu » apprend à un inconnu qu'un
// compte existe à cette adresse.
//
// C'est la règle de `fetchPage` — ne pas distinguer « absente » de « non
// publiée » — et celle du suivi de demande, appliquées ici.
// ============================================================

const SITE = { id: 'site-1', slug: 'cpa' };
const COMPTE = {
  id: 'c1', site_id: 'site-1', user_id: 'u1', email: 'a@b.td',
  role: 'fournisseur' as const, etat: 'actif' as const,
  organisation: 'Société X', reference: null,
};

const req = (jeton: string | null = 'jwt-valide') =>
  new Request('https://x.test/api/espace', {
    headers: jeton ? { authorization: `Bearer ${jeton}` } : {},
  });

beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  table.site = SITE;
  table.compte = COMPTE;
});

/** Le corps ET le code du refus, pour les comparer mot pour mot. */
async function refus(r: { ok: boolean; response?: Response }) {
  expect(r.ok).toBe(false);
  const rep = (r as { response: Response }).response;
  return { statut: rep.status, corps: await rep.text() };
}

describe('tous les refus sont IDENTIQUES', () => {
  it('🔴 aucun en-tête d’autorisation', async () => {
    const a = await refus(await requireSiteCompte(req(null), 'cpa'));
    expect(a.statut).toBe(403);
    expect(a.corps).toContain('Accès refusé');
  });

  it('🔴 session invalide, compte absent, compte en attente, compte suspendu, mauvais rôle — MOT POUR MOT la même réponse', async () => {
    const cas: (() => void)[] = [
      () => { getUser.mockResolvedValue({ data: { user: null } }); },
      () => { table.compte = null; },
      () => { table.compte = { ...COMPTE, etat: 'en_attente' }; },
      () => { table.compte = { ...COMPTE, etat: 'suspendu' }; },
      () => { table.compte = { ...COMPTE, role: 'structure' }; },
    ];
    const vus: string[] = [];
    for (const preparer of cas) {
      getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
      table.site = SITE; table.compte = COMPTE;
      preparer();
      const r = await refus(await requireSiteCompte(req(), 'cpa', ['fournisseur']));
      vus.push(`${r.statut}|${r.corps}`);
    }
    expect(new Set(vus).size, 'les refus diffèrent selon la cause').toBe(1);
  });

  it('🔴 un site inconnu rend le même refus — pas un 404', async () => {
    // Un 404 dirait « ce site n'existe pas », un 403 ne dit rien.
    table.site = null;
    const r = await refus(await requireSiteCompte(req(), 'inconnu'));
    expect(r.statut).toBe(403);
  });
});

describe('un compte actif entre, et porte son rôle', () => {
  it('🔴 sans rôle exigé, n’importe quel rôle ACTIF passe', async () => {
    const r = await requireSiteCompte(req(), 'cpa');
    expect(r.ok).toBe(true);
    expect((r as { compte: { role: string } }).compte.role).toBe('fournisseur');
  });

  it('🔴 avec le bon rôle, il passe', async () => {
    expect((await requireSiteCompte(req(), 'cpa', ['fournisseur'])).ok).toBe(true);
  });

  it('🔴 avec un rôle parmi plusieurs, il passe', async () => {
    expect((await requireSiteCompte(req(), 'cpa', ['agent', 'fournisseur'])).ok).toBe(true);
  });

  it('🔴 « en attente » ne passe PAS — sinon l’examen serait décoratif', async () => {
    table.compte = { ...COMPTE, etat: 'en_attente' };
    expect((await requireSiteCompte(req(), 'cpa')).ok).toBe(false);
  });
});

describe('l’identité vient de l’authentification, pas d’une saisie', () => {
  it('🔴 le jeton du PORTEUR est employé pour lire qui il est', async () => {
    await requireSiteCompte(req('jwt-du-porteur'), 'cpa');
    expect(getUser).toHaveBeenCalled();
  });

  it('🔴 un en-tête mal formé est traité comme absent', async () => {
    const mauvais = new Request('https://x.test/api/espace', {
      headers: { authorization: 'jwt-sans-Bearer' },
    });
    expect((await requireSiteCompte(mauvais, 'cpa')).ok).toBe(false);
    // Et l'authentification n'est même pas interrogée : rien à interroger.
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe('la lecture ne rapatrie que ce qu’elle emploie', () => {
  it('🔴 le site n’est lu que par son `id` et son `slug`', async () => {
    await requireSiteCompte(req(), 'cpa');
    expect(projections.sites_public).toBe('id,slug');
  });

  it('🔴 le compte ne rapatrie aucune colonne de plus', async () => {
    await requireSiteCompte(req(), 'cpa');
    expect(projections.site_comptes)
      .toBe('id,site_id,user_id,email,role,etat,organisation,reference');
  });
});
