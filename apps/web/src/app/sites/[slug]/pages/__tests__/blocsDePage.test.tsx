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
  articles: { type: 'articles', categorie: 'communique', titre: 'Derniers communiqués' },
  partenaires: { type: 'partenaires', titre: 'Nos partenaires', items: [
    { nom: 'Ministère de la Santé publique' },
    { nom: 'Agence du médicament', logo: '/l.png', url: 'https://exemple.td' },
  ] },
  organigramme: { type: 'organigramme', titre: 'Organisation', items: [
    { cle: 'ca', fonction: 'Conseil d’administration' },
    { cle: 'dg', parent: 'ca', fonction: 'Direction générale' },
    { cle: 'aq', parent: 'dg', fonction: 'Direction de l’assurance qualité' },
  ] },
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
        // Sans articles fournis, le bloc affiche son titre ET dit pourquoi
        // la liste est vide. Une section qui disparaît ferait croire à une
        // page cassée.
        articles: 'Derniers communiqués',
        organigramme: 'Conseil d’administration',
        partenaires: 'Ministère de la Santé publique',
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

describe('C bis. le bloc « articles » ne porte aucun contenu', () => {
  it('🔴 une catégorie INVENTÉE est écartée à la lecture', () => {
    // Un bloc qui vise une catégorie inconnue n'afficherait jamais rien, et
    // personne ne saurait pourquoi.
    expect(lireBlocs([{ type: 'articles', categorie: 'rubrique-inventee' }])).toEqual([]);
    expect(lireBlocs([{ type: 'articles' }])).toEqual([]);
  });

  it('🔴 les trois catégories réelles passent', () => {
    for (const c of ['article', 'communique', 'evenement']) {
      expect(lireBlocs([{ type: 'articles', categorie: c }])).toHaveLength(1);
    }
  });

  it('🔴 sans article, la section DIT pourquoi au lieu de disparaître', () => {
    const html = renderToStaticMarkup(
      <BlocsDePage base="" blocs={[EXEMPLES.articles]} videArticles="Aucun communiqué pour l’instant." />,
    );
    expect(html).toContain('Aucun communiqué');
    expect(html).toContain('Derniers communiqués');
  });

  it('🔴 avec des articles, chacun porte son lien et sa date', () => {
    const posts = [{ slug: 'rappel-de-lot', title: 'Rappel de lot', excerpt: null,
      cover_image: null, published_at: '2026-10-02T00:00:00Z', categorie: 'communique' as const }];
    const html = renderToStaticMarkup(
      <BlocsDePage base="https://x.test" blocs={[EXEMPLES.articles]} lang="fr"
        articles={new Map([['communique' as const, posts]])} videArticles="vide" />,
    );
    expect(html).toContain('Rappel de lot');
    expect(html).toContain('/blog/rappel-de-lot');
    expect(html).toContain('2026');
  });
});

describe('C ter. un organigramme est un ARBRE', () => {
  it('🔴 une entrée SANS clé ou SANS fonction est écartée', () => {
    expect(lireBlocs([{ type: 'organigramme', items: [{ fonction: 'Direction' }] }])).toEqual([]);
    expect(lireBlocs([{ type: 'organigramme', items: [{ cle: 'd' }] }])).toEqual([]);
  });

  it('🔴 le NOM reste facultatif — pas de nom inventé sur un site d’État', () => {
    expect(lireBlocs([EXEMPLES.organigramme])).toHaveLength(1);
  });

  it('🔴 la hiérarchie est RENDUE, pas aplatie', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.organigramme]} />);
    // Trois niveaux → au moins deux listes imbriquées, et un dépliant natif.
    expect((html.match(/<ul/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('<details');
    expect(html).toMatch(/Direction\s+de\s+l’assurance\s+qualité/);
  });

  it('🔴 une entrée ORPHELINE remonte à la racine au lieu de disparaître', () => {
    // Un responsable qui s'évapore parce qu'on a mal tapé une clé est pire
    // qu'un responsable mal placé : personne ne comprend sa disparition.
    const orphelin = { type: 'organigramme', items: [
      { cle: 'dg', fonction: 'Direction générale' },
      { cle: 'x', parent: 'cle-inexistante', fonction: 'Service perdu' },
    ] } as Bloc;
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[orphelin]} />);
    expect(html).toMatch(/Service\s+perdu/);
  });

  it('🔴 l’effet visuel ne coûte AUCUN JavaScript', () => {
    // La 3D a été écartée pour trois raisons vérifiables. En voici une :
    // tout l'effet est en CSS, donc l'arbre reste entier si le script
    // échoue. Un canevas 3D ne s'afficherait pas du tout.
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.organigramme]} />);
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/onclick/i);
    expect(html).toMatch(/@keyframes\s+brancheOuvre/);
  });

  it('🔴 le mouvement de l’ARBRE se coupe si le lecteur le demande', () => {
    // MON PREMIER CLIQUET ÉTAIT AVEUGLE. Il cherchait
    // « prefers-reduced-motion » n'importe où — et `BlocsDePage` pose SA
    // PROPRE règle. Retirer celle de l'organigramme le laissait vert :
    // il trouvait celle du parent. La mutation l'a démasqué.
    //
    // On vise donc la règle QUI DÉSARME L'ARBRE, pas le mot.
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.organigramme]} />);
    const d = html.indexOf('.organigramme');
    expect(d, 'le style de l’organigramme doit exister').toBeGreaterThan(-1);
    const styleArbre = html.slice(d);
    expect(styleArbre).toMatch(/prefers-reduced-motion/);
    expect(styleArbre).toMatch(/\.organigramme\s+details\[open\]\s*>\s*ul\s*\{\s*animation:\s*none/);
  });

  it('🔴 un arbre large se fait glisser, il ne pousse PAS la page de côté', () => {
    // Sans ce cadre, un organigramme à six colonnes ferait défiler la page
    // entière horizontalement sur téléphone.
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.organigramme]} />);
    expect(html).toMatch(/overflow-x:\s*auto/);
  });

  it('🔴 le focus CLAVIER se voit, pas seulement le survol', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[EXEMPLES.organigramme]} />);
    expect(html).toMatch(/focus-visible/);
  });

  it('🔴 une entrée qui se désigne elle-même ne boucle pas', () => {
    const boucle = { type: 'organigramme', items: [
      { cle: 'a', parent: 'a', fonction: 'Service circulaire' },
    ] } as Bloc;
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[boucle]} />);
    expect(html).toMatch(/Service\s+circulaire/);
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
