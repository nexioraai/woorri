import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { lirePieces } from '../fetchAvis';

// ============================================================
// LOT 5b — UN APPEL D'OFFRES PORTE SON DOSSIER.
//
// `appels_offres` avait 24 colonnes et pas UNE ne tenait un fichier. Il
// existait `document_url` : UNE adresse pour UN document. Un dossier de
// consultation, c'est le règlement, le cahier des charges, le bordereau de
// prix et les annexes — un fournisseur qui n'a qu'un lien ne peut pas répondre.
// ============================================================

describe('une pièce à moitié formée n’est pas affichée à moitié', () => {
  it('🔴 une pièce sans adresse est ÉCARTÉE', () => {
    expect(lirePieces([{ nom: 'Règlement' }])).toEqual([]);
  });

  it('🔴 une pièce sans nom est ÉCARTÉE', () => {
    expect(lirePieces([{ url: '/r.pdf' }])).toEqual([]);
  });

  it('🔴 un nom ou une adresse d’espaces est ÉCARTÉ', () => {
    expect(lirePieces([{ nom: '   ', url: '/r.pdf' }])).toEqual([]);
    expect(lirePieces([{ nom: 'Règlement', url: '  ' }])).toEqual([]);
  });

  it('🔴 les pièces VALIDES d’un lot mixte sont conservées', () => {
    const out = lirePieces([{ nom: 'x' }, { nom: 'Règlement', url: '/r.pdf' }, null]);
    expect(out).toHaveLength(1);
    expect(out[0].nom).toBe('Règlement');
  });

  it('🔴 ce qui n’est pas un tableau rend une liste vide', () => {
    expect(lirePieces(null)).toEqual([]);
    expect(lirePieces('<a href=x>')).toEqual([]);
    expect(lirePieces({ nom: 'x', url: '/y' })).toEqual([]);
  });

  it('format et poids ne sont gardés que s’ils disent quelque chose', () => {
    const [p] = lirePieces([{ nom: 'R', url: '/r.pdf', format: '  ', poids: '1,2 Mo' }]);
    expect('format' in p).toBe(false);
    expect(p.poids).toBe('1,2 Mo');
  });

  it('les espaces de bord sont retirés — ils produisent des URL illisibles', () => {
    const [p] = lirePieces([{ nom: ' Règlement ', url: ' /r.pdf ' }]);
    expect(p.nom).toBe('Règlement');
    expect(p.url).toBe('/r.pdf');
  });
});
