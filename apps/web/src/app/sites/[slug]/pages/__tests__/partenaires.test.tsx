import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import Partenaires from '../Partenaires';
import { lireBlocs } from '../blocs';

// ============================================================
// LOT 15.5 — LE BANDEAU DES PARTENAIRES.
//
// LE LOGO EST FACULTATIF, et c'est tout le point. Exiger un logo aurait
// rendu le bloc inutilisable jusqu'à ce que quelqu'un trouve les fichiers —
// c'est-à-dire jamais. Sans fichier, le NOM s'affiche.
//
// LE NOM, LUI, EST OBLIGATOIRE : un logo sans nom est illisible au lecteur
// d'écran et indéchiffrable pour qui ne connaît pas l'organisation.
// ============================================================

const SIX = Array.from({ length: 6 }, (_, i) => ({ nom: `Partenaire ${i + 1}` }));

describe('le bloc fonctionne sans aucun fichier', () => {
  it('🔴 sans logo, le NOM s’affiche', () => {
    const html = renderToStaticMarkup(<Partenaires items={[{ nom: 'Ministère de la Santé' }]} />);
    expect(html).toContain('Ministère de la Santé');
    expect(html).not.toContain('<img');
  });

  it('🔴 avec logo, l’image porte le nom en texte de remplacement', () => {
    const html = renderToStaticMarkup(
      <Partenaires items={[{ nom: 'OMS', logo: '/oms.png' }]} />,
    );
    expect(html).toContain('alt="OMS"');
  });

  it('🔴 un partenaire SANS nom est écarté à la lecture', () => {
    expect(lireBlocs([{ type: 'partenaires', items: [{ logo: '/x.png' }] }])).toEqual([]);
  });

  it('🔴 une adresse rend la tuile cliquable, sans fuite d’onglet', () => {
    const html = renderToStaticMarkup(
      <Partenaires items={[{ nom: 'OMS', url: 'https://who.int' }]} />,
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="OMS"');
  });
});

describe('le défilement sert, il ne décore pas', () => {
  it('🔴 moins de quatre partenaires NE défilent PAS', () => {
    // Trois logos qui glissent sur un écran large donnent un vide mouvant ;
    // posés, ils se lisent.
    const html = renderToStaticMarkup(<Partenaires items={SIX.slice(0, 3)} />);
    expect(html).not.toMatch(/@keyframes\s+defilePartenaires/);
  });

  it('🔴 quatre ou plus défilent', () => {
    expect(renderToStaticMarkup(<Partenaires items={SIX} />))
      .toMatch(/@keyframes\s+defilePartenaires/);
  });

  it('🔴 la bande S’ARRÊTE au survol ET au clavier', () => {
    // Un logo qui s'enfuit sous le curseur ne se clique pas, et une bande
    // qui défile pendant qu'on tabule rend la page inutilisable.
    const html = renderToStaticMarkup(<Partenaires items={SIX} />);
    expect(html).toMatch(/:hover[\s\S]{0,120}animation-play-state:\s*paused/);
    expect(html).toMatch(/focus-within/);
  });

  it('🔴 le mouvement se coupe sur demande, et la bande reste PARCOURABLE', () => {
    // Couper l'animation sans rendre la bande défilable à la main
    // cacherait les derniers partenaires.
    const html = renderToStaticMarkup(<Partenaires items={SIX} />);
    const d = html.indexOf('prefers-reduced-motion');
    expect(d).toBeGreaterThan(-1);
    expect(html.slice(d)).toMatch(/overflow-x:\s*auto/);
  });

  it('🔴 la copie qui boucle est MASQUÉE au lecteur d’écran', () => {
    // Sans ça, il annoncerait deux fois chaque partenaire.
    const html = renderToStaticMarkup(<Partenaires items={SIX} />);
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/Partenaire 1/gu) ?? []).length).toBe(2);
  });

  it('🔴 aucun partenaire → aucun bandeau', () => {
    expect(renderToStaticMarkup(<Partenaires items={[]} titre="Nos partenaires" />)).toBe('');
  });
});
