import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import Partenaires, { monogrammeDe } from '../Partenaires';
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

// ============================================================
// LOT 15.7 — LE MONOGRAMME, PARCE QU'UN NOM GRIS DANS UN CADRE SE LIT
// COMME UNE IMAGE QUI N'A PAS CHARGÉ.
//
// Et un emplacement qu'on croit vide fait douter du reste de la page.
// ============================================================

describe('le monogramme suit la MÊME règle qu’en base', () => {
  it('🔴 un sigle entre parenthèses passe devant les initiales calculées', () => {
    // `initiales_du_site()` a déjà tranché ainsi. Deux règles d’abréviation
    // pour le même nom donneraient deux abréviations sur la même page.
    //
    // LES EXEMPLES SONT CHOISIS POUR DISTINGUER LES DEUX CHEMINS. Premier
    // jet : « Organisation mondiale de la santé (OMS) » — dont les initiales
    // CALCULÉES valent aussi OMS. Le test restait vert en débranchant la
    // règle qu'il prétendait tenir : il mesurait une coïncidence.
    expect(monogrammeDe('Fonds des Nations unies pour l’enfance (UNICEF)')).toBe('UNICEF');
    expect(monogrammeDe('Agence des États-Unis pour le développement (USAID)')).toBe('USAID');
  });

  it('🔴 sans sigle, les mots VIDES ne comptent pas', () => {
    // « Ministère de la Santé » doit donner MS, jamais MDLS.
    expect(monogrammeDe('Ministère de la Santé')).toBe('MS');
  });

  it('🔴 DEUX plafonds : six signes pour un sigle écrit, trois pour un calcul', () => {
    // Un sigle écrit par l’organisation EST son nom — couper UNICEF en
    // « UNIC » l’estropie. Des initiales calculées n’engagent que nous.
    expect(monogrammeDe('Organisation (ONUSIDA12)').length).toBeLessThanOrEqual(6);
    for (const n of ['Alpha Beta Gamma Delta Epsilon', 'X', 'Ministère de la Santé']) {
      expect(monogrammeDe(n).length, `« ${n} » déborde`).toBeLessThanOrEqual(3);
    }
  });

  it('🔴 un nom d’un seul mot garde deux lettres, pas une', () => {
    expect(monogrammeDe('Unicef')).toBe('UN');
  });
});

describe('la tuile sans logo tient debout toute seule', () => {
  it('🔴 elle porte le monogramme ET le nom entier', () => {
    // Le monogramme abrège pour l’œil ; il ne remplace pas ce que
    // l’organisation s’appelle.
    const html = renderToStaticMarkup(<Partenaires items={[{ nom: 'Ministère de la Santé' }]} />);
    expect(html).toContain('Ministère de la Santé');
    expect(html).toContain('MS');
  });

  it('🔴 le monogramme est MUET au lecteur d’écran', () => {
    // Il annoncerait « M S » juste avant de lire le nom entier.
    const html = renderToStaticMarkup(<Partenaires items={[{ nom: 'Ministère de la Santé' }]} />);
    const d = html.indexOf('MS<');
    expect(d).toBeGreaterThan(-1);
    const ouverture = html.slice(0, d).lastIndexOf('<span');
    expect(html.slice(ouverture, d)).toMatch(/aria-hidden="true"/);
  });
});

describe('un vrai logo se comporte comme un logo de partenaire', () => {
  it('🔴 il garde SES couleurs, toujours — jamais grisé ni pâli', () => {
    // INVERSÉ le 2026-11-10 à la demande du propriétaire : le logo de l'OMS,
    // sans lien, restait gris à jamais — le survol qui le recolorait n'existe
    // que sur une tuile cliquable. Un logo d'institution se montre tel qu'il
    // est.
    const html = renderToStaticMarkup(
      <Partenaires items={[{ nom: 'OMS', logo: '/oms.png' }, { nom: 'UE', logo: '/ue.png', url: 'https://europa.eu' }]} />,
    );
    expect(html).not.toMatch(/grayscale/);
    expect(html).not.toMatch(/\.logoPartenaire\s*\{[^}]*opacity/);
  });

  it('🔴 le relief du survol se coupe si le lecteur le demande', () => {
    const html = renderToStaticMarkup(
      <Partenaires items={[{ nom: 'OMS', logo: '/oms.png', url: 'https://who.int' }]} />,
    );
    const d = html.indexOf('prefers-reduced-motion');
    expect(d).toBeGreaterThan(-1);
    expect(html.slice(d)).toMatch(/transform:\s*none/);
  });
});

describe('LOT 18 — une seule liste, même quand le bandeau défile', () => {
  it('🔴 chaque nom, chaque lien et chaque texte alternatif n’apparaissent qu’UNE fois', () => {
    const items = [
      { nom: 'Organisation mondiale de la Santé (OMS)', logo: '/oms.png', url: 'https://who.int' },
      { nom: 'UNICEF', url: 'https://unicef.org' },
      { nom: 'Banque mondiale' },
      { nom: 'Union européenne' },
    ];
    const html = renderToStaticMarkup(<Partenaires items={items} />);
    const texte = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '|');
    // Avec un logo, le nom vit dans le texte alternatif ; sans logo, dans le texte.
    for (const p of items.filter((i) => !i.logo)) expect(texte.split(p.nom).length - 1, p.nom).toBe(1);
    expect(html.split('href="https://who.int"').length - 1).toBe(1);
    expect(html.split('alt="Organisation mondiale de la Santé (OMS)"').length - 1).toBe(1);
  });
});

describe('LOT 21 — un logo n’est présent qu’UNE fois comme image', () => {
  it('🔴 la copie du défilement ne contient aucune <img>', () => {
    const items = [1, 2, 3, 4].map((i) => ({ nom: `Partenaire ${i}`, logo: `/logo-${i}.png` }));
    const html = renderToStaticMarkup(<Partenaires items={items} />);
    for (const it of items) expect(html.split(`src="${it.logo}"`).length - 1, it.logo).toBe(1);
    const copie = html.slice(html.indexOf('aria-hidden="true" style="display:flex'));
    expect(copie.includes('<img')).toBe(false);
  });
});
