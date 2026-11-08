import { describe, it, expect, vi, beforeEach } from 'vitest';

const { selectMock, ligne } = vi.hoisted(() => ({ selectMock: vi.fn(), ligne: { value: null as unknown } }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: (...a: unknown[]) => { selectMock(...a); return {
        eq: () => ({ maybeSingle: async () => ({ data: ligne.value, error: null }) }),
      }; },
    }),
  }),
}));

import { POST } from '../route';

// ============================================================
// LOT 8 — LE SUIVI NE DIT JAMAIS CE QU'IL CACHE.
//
// Référence inconnue ou courriel qui ne correspond pas : le MÊME message.
// Distinguer les deux révélerait qu'une référence EXISTE à quelqu'un qui
// n'en est pas l'auteur — la règle de `fetchPage`, où distinguer « n'existe
// pas » de « existe mais pas publiée » révélerait un brouillon par son code
// de retour.
// ============================================================

const DEMANDE = {
  reference: 'CPA-2026-DJKRVV', email: 'alice@test.td',
  etat: 'en_cours', created_at: '2026-11-01T10:00:00Z', maj_le: '2026-11-05T09:00:00Z',
};

const req = (body: unknown, ip = '10.0.0.1') =>
  new Request('https://x.test/api/demandes/suivi', {
    method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': ip },
  });

let compteur = 0;
const ipNeuve = () => `10.0.${++compteur}.1`;

beforeEach(() => { selectMock.mockReset(); ligne.value = null; });

describe('les deux échecs rendent le MÊME message', () => {
  it('🔴 référence inconnue', async () => {
    ligne.value = null;
    const r = await POST(req({ reference: 'CPA-2026-XXXXXX', email: 'alice@test.td' }, ipNeuve()));
    expect(await r.json()).toEqual({ trouve: false, message: 'Aucune demande ne correspond à ces informations.' });
  });

  it('🔴 courriel qui ne correspond pas — mot pour mot le même', async () => {
    ligne.value = DEMANDE;
    const r = await POST(req({ reference: DEMANDE.reference, email: 'bob@test.td' }, ipNeuve()));
    expect(await r.json()).toEqual({ trouve: false, message: 'Aucune demande ne correspond à ces informations.' });
  });

  it('🔴 et les DEUX rendent 200 — un 404 redirait ce que le message cache', async () => {
    ligne.value = null;
    expect((await POST(req({ reference: 'A', email: 'a@b.td' }, ipNeuve()))).status).toBe(200);
    ligne.value = DEMANDE;
    expect((await POST(req({ reference: DEMANDE.reference, email: 'bob@test.td' }, ipNeuve()))).status).toBe(200);
  });

  it('🔴 les deux chemins font la MÊME lecture en base', async () => {
    // Si un chemin interrogeait la base et l'autre non, le temps de réponse
    // redirait la différence que le message cache.
    ligne.value = null;
    await POST(req({ reference: 'CPA-2026-XXXXXX', email: 'a@b.td' }, ipNeuve()));
    const lectureA = selectMock.mock.calls.length;
    selectMock.mockReset();
    ligne.value = DEMANDE;
    await POST(req({ reference: DEMANDE.reference, email: 'bob@test.td' }, ipNeuve()));
    expect(selectMock.mock.calls.length).toBe(lectureA);
  });
});

describe('l’auteur retrouve sa demande', () => {
  it('🔴 référence et courriel justes → l’état est rendu', async () => {
    ligne.value = DEMANDE;
    const r = await POST(req({ reference: DEMANDE.reference, email: DEMANDE.email }, ipNeuve()));
    expect(await r.json()).toMatchObject({ trouve: true, etat: 'en_cours', reference: DEMANDE.reference });
  });

  it('🔴 la casse et les espaces ne lui font pas perdre sa demande', async () => {
    ligne.value = DEMANDE;
    const r = await POST(req({ reference: '  cpa-2026-djkrvv ', email: ' Alice@Test.TD ' }, ipNeuve()));
    expect(await r.json()).toMatchObject({ trouve: true });
  });

  it('🔴 le MESSAGE lui-même n’est JAMAIS rendu', async () => {
    // L'auteur l'a écrit, il le connaît. Le renvoyer ferait d'une référence
    // devinée une fuite de contenu.
    ligne.value = { ...DEMANDE, message: 'Secret', name: 'Alice' };
    const j = await (await POST(req({ reference: DEMANDE.reference, email: DEMANDE.email }, ipNeuve()))).json();
    expect(j).not.toHaveProperty('message');
    expect(j).not.toHaveProperty('name');
    expect(JSON.stringify(j)).not.toContain('Secret');
  });

  it('la projection ne demande jamais le corps du message', async () => {
    ligne.value = DEMANDE;
    await POST(req({ reference: DEMANDE.reference, email: DEMANDE.email }, ipNeuve()));
    expect(String(selectMock.mock.calls[0]?.[0])).not.toContain('message');
  });
});

describe('six caractères ne protègent que si l’on ne peut pas tout essayer', () => {
  it('🔴 au-delà du plafond, la même adresse est bloquée', async () => {
    // 31^6 = 1,07 milliard. À mille tentatives par seconde, cela tombe en
    // douze jours : la limite est la VRAIE protection, pas la longueur.
    const ip = ipNeuve();
    ligne.value = null;
    let dernier = 200;
    for (let i = 0; i < 40; i += 1) {
      dernier = (await POST(req({ reference: 'A', email: 'a@b.td' }, ip))).status;
    }
    expect(dernier).toBe(429);
  });

  it('🔴 une autre adresse n’est pas punie pour autant', async () => {
    ligne.value = DEMANDE;
    const r = await POST(req({ reference: DEMANDE.reference, email: DEMANDE.email }, ipNeuve()));
    expect(r.status).toBe(200);
  });
});

describe('une requête malformée ne révèle rien non plus', () => {
  it('🔴 corps illisible, champs absents, mauvais types → le même message', async () => {
    for (const corps of [{}, { reference: 'A' }, { email: 'a@b.td' }, { reference: 42, email: true }]) {
      const r = await POST(req(corps, ipNeuve()));
      expect(await r.json()).toEqual({ trouve: false, message: 'Aucune demande ne correspond à ces informations.' });
    }
  });
});
