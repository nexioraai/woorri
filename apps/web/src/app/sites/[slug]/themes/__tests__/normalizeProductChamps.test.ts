// ============================================================
// M2-208 — CE QUE LA PROJECTION INJECTE, LE NORMALISEUR NE LE PERD PLUS.
//
// DÉFAUT VU À L'ÉCRAN PAR YOUSSOUF, capture à l'appui : la modale d'un
// produit de la BOUTIQUE n'affichait ni bouton WhatsApp ni appel, pendant
// que les cartes de COLLECTION les affichaient. Même modale, même porte —
// la différence était le CHEMIN : les produits boutique passent par
// `normalizeProduct`, qui RECONSTRUIT l'objet, et dont le commentaire
// prévenait déjà : « tout champ non recopié ici est PERDU ». `whatsapp` et
// `sizes` étaient injectés par mapShopProducts, puis jetés là.
//
// C'est la même classe que la DETTE 6c (forSale, perdu au même endroit).
// Ce test la ferme par CONTRAT : tout champ de la projection doit survivre.
//
// INVARIANT STRUCTUREL : rien ici ne nomme un pays. Les drapeaux sont la
// monnaie (code ISO) et le numéro du vendeur — la réponse structurelle,
// seule chose que le moteur voit.
// ============================================================
import { describe, expect, it, vi } from 'vitest';

// Même préambule que forSaleStorefront.test.tsx : `shared.tsx` instancie son
// client Supabase au chargement du module — le mock DOIT précéder l'import.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { normalizeProduct } from '../shared';

describe('M2-208 · normalizeProduct préserve les champs de la projection', () => {
  const PROJETE = {
    id: 'p-1',
    name: 'Sandales cuir',
    description: 'Artisanales',
    price: '8500.00 XAF',
    priceNumber: 8500,
    currency: 'XAF',
    image: 'https://x.test/s.png',
    sizes: ['40', '41', '42'],
    whatsapp: '+23566131260',
    mobileMoney: [{ label: 'Moov Money', number: '+235 99 44 55 66' }],
    cjVid: null,
    forSale: true,
  };

  it("WHATSAPP SURVIT — sans lui, aucune fiche boutique n'a de bouton", () => {
    expect(normalizeProduct(PROJETE).whatsapp).toBe('+23566131260');
  });

  it('SIZES SURVIT — les tailles atteignent la modale', () => {
    expect(normalizeProduct(PROJETE).sizes).toEqual(['40', '41', '42']);
  });

  it('ABSENTS, ILS NE SONT PAS INVENTÉS — null et []', () => {
    const n = normalizeProduct({ name: 'x', description: '', price: '' });
    expect(n.whatsapp).toBeNull();
    expect(n.sizes).toEqual([]);
    expect(n.mobileMoney).toEqual([]);
  });

  it('LE CONTRAT COMPLET — chaque champ de la projection survit au normaliseur', () => {
    // Le cliquet de CLASSE : si mapShopProducts gagne un champ destiné au
    // visiteur et que ce normaliseur le perd, ce test doit être RECALÉ en
    // conscience — jamais découvert à l'écran par un marchand.
    const n = normalizeProduct(PROJETE);
    for (const champ of [
      'id', 'name', 'description', 'price', 'priceNumber', 'currency',
      'image', 'sizes', 'whatsapp', 'mobileMoney', 'cjVid', 'forSale',
    ] as const) {
      expect(n[champ as keyof typeof n], champ).toEqual(PROJETE[champ]);
    }
  });
});
