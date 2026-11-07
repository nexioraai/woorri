import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import BlocsDePage from '../BlocsDePage';
import { TYPES_DE_BLOC, lireBlocs, type Bloc } from '../blocs';

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..');
const SQL = readFileSync(join(RACINE, 'supabase', 'sql', 'site_pages_blocs.sql'), 'utf-8');
/**
 * Le rendu PRIVÉ DE SES COMMENTAIRES.
 *
 * La première version lisait le fichier brut et rougissait sur le commentaire
 * qui ANNONCE l'interdiction. Un cliquet qui confond « le mot est écrit » et
 * « le mot est employé » mesure la prose, pas le code.
 */
const RENDU = readFileSync(join(__dirname, '..', 'BlocsDePage.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

// ============================================================
// LOT 4 — LE CORPS STRUCTURÉ.
//
// Trois choses sont gardées ici, et aucune ne fait le travail des autres :
//  A. le VOCABULAIRE est le même en base et dans le code ;
//  B. aucun bloc n'ouvre la porte à du HTML ;
//  C. chaque type est réellement DESSINÉ — un type déclaré mais non rendu
//     serait un mot du vocabulaire qui ne produit rien à l'écran.
// ============================================================

describe('A. le vocabulaire ne peut pas diverger entre la base et le code', () => {
  /** Les types listés dans la fonction SQL `site_pages_blocs_valides`. */
  const typesSQL = (() => {
    const d = SQL.indexOf("not in (");
    const f = SQL.indexOf(')', d);
    return [...SQL.slice(d, f).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  })();

  it('la fonction SQL déclare bien une liste de types', () => {
    expect(typesSQL.length).toBeGreaterThan(5);
  });

  it('🔴 tout type accepté par la base est connu du code', () => {
    expect([...typesSQL].sort()).toEqual([...TYPES_DE_BLOC].sort());
  });

  it("🔴 tout type connu du code est accepté par la base", () => {
    for (const t of TYPES_DE_BLOC) expect(typesSQL, `« ${t} » manque au SQL`).toContain(t);
  });
});

describe('A bis. ce que l’écran exige en plus du texte', () => {
  it('🔴 une image SANS texte de remplacement est écartée', () => {
    expect(lireBlocs([{ type: 'image', url: '/x.jpg' }])).toEqual([]);
    expect(lireBlocs([{ type: 'image', url: '/x.jpg', alt: '  ' }])).toEqual([]);
  });

  it('🔴 l’animation respecte `prefers-reduced-motion`', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[{ type: 'texte', texte: 'x' }]} />);
    expect(html).toContain('prefers-reduced-motion');
  });

  it('🔴 les tailles de texte suivent la largeur de l’écran', () => {
    // Ce que je lis sur un écran de bureau n'est PAS ce que le propriétaire
    // lit sur son téléphone — les tailles doivent être fluides, pas fixes.
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[{ type: 'titre', texte: 'x' }]} />);
    expect(html).toContain('clamp(');
  });

  it('🔴 une image est chargée paresseusement', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.image]} />);
    expect(html).toContain('loading="lazy"');
  });
});

describe('B. aucun chemin vers du HTML', () => {
  it('🔴 `dangerouslySetInnerHTML` est absent du rendu des blocs', () => {
    expect(RENDU).not.toContain('dangerouslySetInnerHTML');
  });

  it('🔴 un texte contenant du balisage est ÉCHAPPÉ, pas interprété', () => {
    const html = renderToStaticMarkup(
      <BlocsDePage base="" blocs={[{ type: 'texte', texte: '<img src=x onerror=alert(1)>' }]} />,
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

/** Un exemplaire bien formé de chaque type du vocabulaire. */
const EXEMPLES: Record<string, Bloc> = {
  titre: { type: 'titre', texte: 'Nos missions' },
  texte: { type: 'texte', texte: 'La Centrale approvisionne les structures sanitaires.' },
  liste: { type: 'liste', items: ['Sélection des produits', 'Contrôle qualité'] },
  etapes: { type: 'etapes', items: [{ titre: 'Déposer le dossier', texte: 'Au guichet.' }] },
  frise: { type: 'frise', items: [{ date: '1994', titre: 'Création de la Centrale' }] },
  chiffres: { type: 'chiffres', items: [{ valeur: '1 200', libelle: 'références au catalogue' }] },
  tableau: { type: 'tableau', entetes: ['Produit', 'Unité'], lignes: [['Paracétamol 500 mg', 'Boîte de 100']] },
  documents: { type: 'documents', items: [{ nom: 'Conditions générales', url: '/cga.pdf', format: 'PDF', poids: '180 Ko' }] },
  questions: { type: 'questions', items: [{ question: 'Qui peut commander ?', reponse: 'Les structures agréées.' }] },
  encadre: { type: 'encadre', texte: 'Les commandes se font par bon signé.' },
  liens: { type: 'liens', items: [{ libelle: 'Catalogue', chemin: 'catalogue' }] },
  appel: { type: 'appel', libelle: 'Devenir fournisseur', chemin: 'fournisseurs/enregistrement' },
  image: { type: 'image', url: '/entrepot.jpg', alt: "L'entrepôt central", legende: 'Entrepôt central' },
  galerie: { type: 'galerie', items: [{ url: '/g1.jpg', alt: 'Zone de stockage' }] },
  citation: { type: 'citation', texte: 'Un médicament qui arrive en retard ne soigne personne.', auteur: 'Direction générale' },
};

describe('C. chaque type du vocabulaire est réellement dessiné', () => {
  it('🔴 le jeu d’exemples couvre TOUT le vocabulaire', () => {
    expect(Object.keys(EXEMPLES).sort()).toEqual([...TYPES_DE_BLOC].sort());
  });

  for (const t of TYPES_DE_BLOC) {
    it(`« ${t} » produit du HTML et y met son contenu`, () => {
      const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES[t]]} />);
      expect(html.length, `« ${t} » ne rend RIEN`).toBeGreaterThan(20);
      const attendu: Record<string, string> = {
        titre: 'Nos missions', texte: 'approvisionne', liste: 'Contrôle qualité',
        etapes: 'Déposer le dossier', frise: '1994', chiffres: 'références au catalogue',
        tableau: 'Paracétamol', documents: 'Conditions générales', questions: 'structures agréées',
        encadre: 'bon signé', liens: 'Catalogue', appel: 'Devenir fournisseur',
        image: 'Entrepôt central', galerie: 'Zone de stockage', citation: 'ne soigne personne',
      };
      expect(html).toContain(attendu[t]);
    });
  }

  it('le tableau sort ses en-têtes en <th scope="col">', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.tableau]} />);
    expect(html).toContain('<th scope="col"');
  });

  it('🔴 trois photos ou plus deviennent un DIAPORAMA qui tourne seul', () => {
    const trois = { type: 'galerie', items: [
      { url: '/a.jpg', alt: 'a' }, { url: '/b.jpg', alt: 'b' }, { url: '/c.jpg', alt: 'c' }] } as Bloc;
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[trois]} />);
    expect(html).toMatch(/@keyframes\s+diapo/);
    expect(html).toContain('infinite');
    expect(html).toContain('animation-delay');
  });

  it('🔴 le diaporama se fige si le lecteur demande un mouvement réduit', () => {
    const trois = { type: 'galerie', items: [
      { url: '/a.jpg', alt: 'a' }, { url: '/b.jpg', alt: 'b' }, { url: '/c.jpg', alt: 'c' }] } as Bloc;
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[trois]} />);
    const d = html.search(/@keyframes\s+diapo/);
    expect(html.slice(d)).toContain('prefers-reduced-motion');
  });

  it('🔴 DEUX photos restent une grille, pas un diaporama', () => {
    const deux = { type: 'galerie', items: [{ url: '/a.jpg', alt: 'a' }, { url: '/b.jpg', alt: 'b' }] } as Bloc;
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[deux]} />);
    expect(html).not.toMatch(/@keyframes\s+diapo/);
  });

  it('les questions se déplient SANS JavaScript (<details> natif)', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.questions]} />);
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });
});

describe('D. un bloc mal formé est ÉCARTÉ, jamais rendu à moitié', () => {
  it('un tableau sans lignes ne passe pas la lecture', () => {
    expect(lireBlocs([{ type: 'tableau', entetes: ['A'], lignes: [] }])).toEqual([]);
  });

  it('une ligne plus courte que les en-têtes ne passe pas', () => {
    expect(lireBlocs([{ type: 'tableau', entetes: ['A', 'B'], lignes: [['x']] }])).toEqual([]);
  });

  it('un type inconnu est écarté même s’il arrive de la base', () => {
    expect(lireBlocs([{ type: 'script', texte: 'x' }])).toEqual([]);
  });

  it('les blocs VALIDES d’un lot mixte sont conservés', () => {
    const out = lireBlocs([{ type: 'script' }, EXEMPLES.texte, { type: 'liste', items: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('texte');
  });

  it('ce qui n’est pas un tableau JSON rend une liste vide', () => {
    expect(lireBlocs(null)).toEqual([]);
    expect(lireBlocs('<p>x</p>')).toEqual([]);
  });
});
