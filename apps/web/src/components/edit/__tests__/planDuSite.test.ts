import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(__dirname, '..', '..', '..', 'app', 'sites', '[slug]', 'plan-du-site', 'page.tsx'), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

// ============================================================
// LOT 9 — « ENGENDRÉ » EST LE MOT DU PLAN, ET C'EST TOUT LE LOT.
//
// Une liste d'adresses recopiée à la main dit la vérité le jour où on
// l'écrit, puis ment à chaque page ajoutée — exactement le défaut du menu
// trouvé le 7 novembre, où une page créée n'apparaissait nulle part.
// ============================================================

describe('le plan est construit, jamais recopié', () => {
  it('🔴 les pages viennent de la BASE, pas d’une liste en dur', () => {
    expect(SRC).toMatch(/fetchMenu\(/);
  });

  it('🔴 aucune liste d’adresses écrite à la main', () => {
    // Un tableau de chemins en dur serait la liste qui ment demain.
    expect(SRC).not.toMatch(/\[\s*'qui-sommes-nous'/);
    expect(SRC).not.toMatch(/'activites'\s*,\s*'catalogue'/);
  });

  it('🔴 la hiérarchie vient du champ `parent`, pas d’une convention de chemin', () => {
    expect(SRC).toMatch(/p\.parent/);
  });
});

describe('le plan ne révèle rien de non publié', () => {
  it('🔴 il lit les VUES publiques, jamais les tables', () => {
    for (const vue of ['sites_public', 'catalogue_produits_public']) {
      expect(SRC).toContain(vue);
    }
    // LE BLOG FAIT EXCEPTION, ET C'EST UNE RÈGLE D'ARCHITECTURE : sa vue
    // n'est lue QUE par son module (cliquet blogTenantBoundaries). Le plan
    // du site passe donc par `compterArticlesPublies`, pas par la vue.
    expect(SRC).not.toMatch(/site_blog_posts_public/);
    expect(SRC).toMatch(/compterArticlesPublies/);
    expect(SRC).not.toMatch(/from\(\s*['"]catalogue_produits['"]\s*\)/);
    expect(SRC).not.toMatch(/from\(\s*['"]site_pages['"]\s*\)/);
  });

  it('🔴 il ne filtre JAMAIS sur `publie` lui-même', () => {
    // C'est la vue qui applique l'invariant. Le refaire ici créerait une
    // seconde autorité, et celle qu'on lit ne serait pas celle qui décide.
    expect(SRC).not.toMatch(/publie/);
  });
});

describe('une adresse annoncée est une adresse qui a du contenu', () => {
  it('🔴 le catalogue ne paraît QUE s’il a au moins un produit', () => {
    expect(SRC).toMatch(/nbProduits\s*\?\?\s*0\)\s*>\s*0/);
  });

  it('🔴 les actualités ne paraissent QUE s’il y a un article', () => {
    expect(SRC).toMatch(/nbArticles\s*>\s*0/);
  });

  it('🔴 les appels d’offres ne paraissent que si le site le DÉCLARE', () => {
    // `publishes_tenders` est une capacité déclarée, pas un état déduit :
    // la CPA passe des marchés même la semaine où elle n'en publie aucun.
    expect(SRC).toMatch(/publishes_tenders\s*===\s*true/);
  });

  it('🔴 les comptes sont demandés en `head`, sans rapatrier les lignes', () => {
    // Un plan du site qui télécharge tout le catalogue pour compter est un
    // plan qui coûte cher à afficher.
    expect((SRC.match(/head:\s*true/gu) ?? []).length).toBe(1);
  });
});
