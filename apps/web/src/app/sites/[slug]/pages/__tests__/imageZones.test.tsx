// CPA, 2026-11-17 — l'organigramme doit être LE dessin de la CPA, à
// l'identique, et chaque case cliquable : une image + des zones en %.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BlocsDePage from '../BlocsDePage';
import { zonesValables, lireBlocs, type Bloc } from '../blocs';

const z = (o: Partial<{ x: number; y: number; l: number; h: number; chemin: string; libelle: string }> = {}) =>
  ({ x: 10, y: 20, l: 15, h: 8, chemin: 'qui-sommes-nous/direction/rh', libelle: 'Responsable RH', ...o });

describe('image à zones cliquables', () => {
  it('chaque zone devient un lien posé en pourcentages, l’image n’est plus « agrandir »', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="/s" blocs={[{ type: 'image', url: '/org.png', alt: 'Organigramme', zones: [z()] } as Bloc]} />);
    expect(html).toContain('href="/s/qui-sommes-nous/direction/rh"');
    expect(html).toContain('aria-label="Responsable RH"');
    expect(html).toMatch(/left:10%;top:20%;width:15%;height:8%/);
    expect(html).not.toContain('Agrandir');
    // sort de la colonne de texte pour rester lisible, sans dépasser l'écran
    expect(html).toContain('width:min(1360px, calc(100vw - 32px))');
  });

  it('sans zone, le bloc image reste exactement l’ancien (s’ouvre en grand)', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="/s" blocs={[{ type: 'image', url: '/a.png', alt: 'a' } as Bloc]} />);
    expect(html).toContain('Agrandir : a');
    expect(html).toContain('href="/a.png"');
  });

  it('écarte les zones fausses : hors image, chemin étranger, libellé vide', () => {
    expect(zonesValables([z({ x: 95, l: 10 }), z({ chemin: 'https://ailleurs.com' }), z({ libelle: ' ' }), z({ h: 0 }), z()])).toHaveLength(1);
    expect(zonesValables('x')).toEqual([]);
  });

  it('la lecture de la base garde le bloc image avec ses zones', () => {
    expect(lireBlocs([{ type: 'image', url: '/o.png', alt: 'o', zones: [z()] }])).toHaveLength(1);
  });
});
