// ============================================================
// M2-219 — L'OPÉRATEUR AGIT POUR SES CLIENTS, ET SEULEMENT LUI.
//
// BESOIN : les marchands tchadiens paient comptant et ne feront jamais les
// manipulations techniques. L'opérateur publie déjà pour eux ; il doit
// pouvoir connecter leur domaine de la même façon.
//
// CE QUE CE TEST GARDE, ET C'EST LE POINT SENSIBLE : la liste reste
// NOMINATIVE. Un marchand ne gagne aucun droit sur le site d'un autre —
// c'est exactement ce qu'il ne faut jamais casser en élargissant.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'require-site-owner.ts'),
  'utf8',
);

describe('M2-219 · la garde de propriété reste stricte sauf pour l’opérateur', () => {
  it('LA LISTE EST NOMINATIVE — jamais un rôle, jamais un domaine d’e-mail', () => {
    const m = SRC.match(/const ADMIN_EMAILS = \[([^\]]*)\]/);
    expect(m, 'ADMIN_EMAILS introuvable').not.toBeNull();
    const entrees = (m?.[1] ?? '').split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
    expect(entrees.length, 'la liste doit rester courte et nominative').toBeLessThanOrEqual(2);
    for (const e of entrees) {
      // Une adresse complète, jamais un joker (`@domaine`, `*`) qui ouvrirait
      // la garde à quiconque possède une adresse de ce domaine.
      expect(e, e).toMatch(/^[^@*\s]+@[^@*\s]+\.[a-z]{2,}$/i);
    }
  });

  it('LE PROPRIÉTAIRE RESTE LA RÈGLE — l’admin est une EXCEPTION, pas un remplacement', () => {
    // `isOwner` doit rester calculé et testé en premier : si quelqu'un
    // remplaçait la condition par le seul test admin, tout marchand perdrait
    // l'accès à son propre site.
    expect(SRC).toMatch(/const isOwner = siteOwnerId != null/);
    expect(SRC).toMatch(/if \(!isOwner && !isAdmin\)/);
  });

  it('UN ACCÈS OPÉRATEUR EST SIGNALÉ — jamais silencieux', () => {
    // `viaAdmin` est ce qui permet aux appelants de journaliser. Sans lui,
    // un contournement de propriété ne laisserait aucune trace.
    expect(SRC).toMatch(/viaAdmin: !isOwner && isAdmin/);
  });

  it('LA ROUTE DOMAINES JOURNALISE CET ACCÈS', () => {
    const route = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'app', 'api', 'domains', 'route.ts'),
      'utf8',
    );
    expect(route).toContain('auth.viaAdmin');
    expect(route).toContain('domain_connect_via_admin');
  });
});
