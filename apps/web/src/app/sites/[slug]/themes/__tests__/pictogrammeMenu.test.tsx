import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { pictogrammeDe, RACINES_RECONNUES } from '../pictogrammeMenu';
import MenuDeclare from '../MenuDeclare';
import type { EntreeMenu } from '../../pages/fetchPage';

// ============================================================
// LOT 15.1 — AUCUN PICTOGRAMME PLUTÔT QU'UN FAUX.
//
// EPSS pose une icône devant chaque rubrique. La nôtre se DÉDUIT du chemin :
// aucune colonne ajoutée, les 42 sites en profitent le jour même.
//
// Mais une icône de téléphone sur une page qui n'est pas « contact » trompe
// le lecteur plus qu'elle ne l'aide — et il la croira. La correspondance est
// donc FERMÉE, et un chemin inconnu ne reçoit RIEN.
// ============================================================

describe('la correspondance est fermée', () => {
  it('🔴 un chemin INCONNU ne reçoit aucun pictogramme', () => {
    for (const c of ['rubrique-inventee', 'zzz', 'x/y/z', '']) {
      expect(pictogrammeDe(c), `« ${c} » reçoit un pictogramme`).toBeNull();
    }
  });

  it('🔴 les rubriques que le générateur produit en ont un', () => {
    for (const c of ['qui-sommes-nous', 'activites', 'catalogue', 'appels-offres', 'fournisseurs', 'contact']) {
      expect(pictogrammeDe(c), `« ${c} » n'en a pas`).toBeTruthy();
    }
  });

  it('🔴 une SOUS-PAGE porte le pictogramme de sa RACINE', () => {
    // Une sous-page appartient à sa rubrique : lui donner une autre icône
    // casserait la lecture de la hiérarchie.
    expect(pictogrammeDe('activites/stockage')).toBe(pictogrammeDe('activites'));
    expect(pictogrammeDe('qui-sommes-nous/histoire')).toBe(pictogrammeDe('qui-sommes-nous'));
  });

  it('🔴 les accents et la casse ne changent rien', () => {
    expect(pictogrammeDe('ACTIVITES')).toBe(pictogrammeDe('activites'));
    expect(pictogrammeDe('activités')).toBe(pictogrammeDe('activites'));
  });

  it('🔴 ce sont des CARACTÈRES, jamais une image à charger', () => {
    for (const r of RACINES_RECONNUES) {
      const p = pictogrammeDe(r)!;
      expect(p.length).toBeLessThanOrEqual(2);
      expect(p).not.toContain('<');
      expect(p).not.toContain('http');
    }
  });
});

const SITE = { id: 's', slug: 'cpa', name: 'CPA', primary_color: null, lang: 'fr', custom_domain: null } as never;
const MENU = [
  { chemin: 'qui-sommes-nous', parent: null, titre: 'Qui sommes-nous', ordre: 1 },
  { chemin: 'qui-sommes-nous/histoire', parent: 'qui-sommes-nous', titre: 'Notre histoire', ordre: 1 },
  { chemin: 'rubrique-inventee', parent: null, titre: 'Rubrique inventée', ordre: 2 },
] as unknown as EntreeMenu[];

describe('le menu les sert sans jamais les annoncer au lecteur d’écran', () => {
  const html = () =>
    renderToStaticMarkup(<MenuDeclare site={SITE} host="cpa.test" entrees={MENU} />);

  it('🔴 la rubrique connue porte son pictogramme', () => {
    expect(html()).toContain(pictogrammeDe('qui-sommes-nous')!);
  });

  it('🔴 la rubrique inconnue garde son libellé SEUL', () => {
    const h = html();
    expect(h).toContain('Rubrique inventée');
    // Et rien d'autre ne s'ajoute devant : on vérifie qu'aucun pictogramme
    // connu ne s'est glissé sur elle.
    const d = h.indexOf('Rubrique inventée');
    const avant = h.slice(Math.max(0, d - 120), d);
    for (const r of RACINES_RECONNUES) {
      expect(avant).not.toContain(pictogrammeDe(r)!);
    }
  });

  it('🔴 le pictogramme est `aria-hidden` — le libellé dit déjà la rubrique', () => {
    // Un lecteur d'écran qui annoncerait « losange noir Nos activités »
    // ajouterait du bruit, pas de l'information.
    expect(html()).toMatch(/aria-hidden="true"[^>]*>\s*[^<\s]/);
  });
});
