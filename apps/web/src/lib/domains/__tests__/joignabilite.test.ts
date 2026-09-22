// ============================================================
// M2-221 — AUCUN ÉTAT INTERNE NE REMPLACE L'ESSAI.
//
// DÉFAUT PAYÉ DEUX FOIS : Vercel disait `attached: true, verified: true`,
// la base disait `custom_domain` posé — et `https://www.<domaine>` ne
// répondait PAS. Le marchand voyait « connecté », ses visiteurs une page
// morte. Tous les indicateurs internes étaient au vert.
//
// Ce module ouvre les QUATRE adresses qu'un visiteur peut taper. Ces tests
// gardent ce qui a manqué : que `www` soit testé, et qu'une absence de
// réponse compte comme une panne — pas comme un inconnu.
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifierJoignabilite } from '../joignabilite';

afterEach(() => { vi.unstubAllGlobals(); });

/** Un faux réseau : chaque URL rend le code voulu, ou jette (injoignable). */
function reseau(table: Record<string, number | 'echec'>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const v = table[String(url)];
    if (v === undefined || v === 'echec') throw new Error('injoignable');
    return { status: v } as Response;
  }));
}

describe('M2-221 · la joignabilité réelle des quatre adresses', () => {
  it('LES QUATRE ADRESSES SONT ESSAYÉES — dont `www`, celle qui manquait', async () => {
    reseau({
      'https://x.test': 200, 'https://www.x.test': 200,
      'http://x.test': 200, 'http://www.x.test': 200,
    });
    const r = await verifierJoignabilite('x.test');
    expect(r.adresses.map((a) => a.url).sort()).toEqual([
      'http://www.x.test', 'http://x.test', 'https://www.x.test', 'https://x.test',
    ]);
    expect(r.complet).toBe(true);
    expect(r.enPanne).toEqual([]);
  });

  it('LE DÉFAUT EXACT D`ALLOUFSHOP EST DÉTECTÉ — le nu marche, `www` non', async () => {
    reseau({
      'https://x.test': 200, 'http://x.test': 200,
      'https://www.x.test': 'echec', 'http://www.x.test': 'echec',
    });
    const r = await verifierJoignabilite('x.test');
    expect(r.complet, 'la panne de www doit être vue').toBe(false);
    expect(r.enPanne).toContain('https://www.x.test');
    expect(r.adresses.find((a) => a.url === 'https://www.x.test')?.code).toBe(0);
  });

  it('UNE ABSENCE DE RÉPONSE EST UNE PANNE, jamais un inconnu', async () => {
    // C'est précisément ce que le visiteur vit : rien. L'appeler « inconnu »
    // aurait laissé le marchand croire que tout allait bien.
    reseau({});
    const r = await verifierJoignabilite('x.test');
    expect(r.adresses.every((a) => a.ok === false && a.code === 0)).toBe(true);
    expect(r.enPanne).toHaveLength(4);
  });

  it('UN 4xx/5xx COMPTE AUSSI COMME PANNE', async () => {
    reseau({
      'https://x.test': 200, 'http://x.test': 200,
      'https://www.x.test': 404, 'http://www.x.test': 500,
    });
    const r = await verifierJoignabilite('x.test');
    expect(r.complet).toBe(false);
    expect(r.enPanne.sort()).toEqual(['http://www.x.test', 'https://www.x.test']);
  });

  it('UN DOMAINE DONNÉ AVEC `www.` EST NORMALISÉ — pas de www.www', async () => {
    reseau({
      'https://x.test': 200, 'https://www.x.test': 200,
      'http://x.test': 200, 'http://www.x.test': 200,
    });
    const r = await verifierJoignabilite('www.x.test');
    expect(r.adresses.some((a) => a.url.includes('www.www'))).toBe(false);
    expect(r.complet).toBe(true);
  });

  it('LES REDIRECTIONS SONT SUIVIES — on juge ce que le visiteur OBTIENT', async () => {
    // Une redirection vers une adresse morte est un échec, pas un succès :
    // `redirect: follow` est ce qui rend ce jugement possible.
    const src = new URL('../joignabilite.ts', import.meta.url).pathname;
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(src, 'utf8')).toContain("redirect: 'follow'");
  });
});
