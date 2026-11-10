import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { construireMenuTelephone } from '../MobileNav';
import type { EntreeMenu } from '../../pages/fetchPage';

// ============================================================
// LOT 3b — LE MENU DU TÉLÉPHONE EST HIÉRARCHIQUE.
//
// LE DÉFAUT, VU À L'ÉCRAN par le propriétaire le 2026-11-08 : le hamburger
// servait TRENTE entrées à plat, les sous-pages décalées par un tiret.
// J'avais écrit en commentaire qu'un menu dépliant « se replierait mal au
// doigt » — une supposition, et elle était fausse : trente lignes à faire
// défiler se replient bien plus mal.
//
// LE CALCUL EST TESTÉ, PAS LE RENDU. Le panneau ne se rend que s'il est
// OUVERT : un premier test rendait le composant fermé et mesurait une chaîne
// vide en croyant mesurer un menu. C'est pour ça que le calcul est une
// fonction pure exportée.
//
// CE QUE CE FICHIER NE MESURE PAS, ET POURQUOI. Il ne lit pas la source du
// composant pour y chercher `<details>`. Un test qui lit du source rend
// TOUTES les ancres du fichier « opaques » au sens d'EP-364, et mes
// assertions sur des libellés à espace (« Notre histoire ») faisaient
// grossir la dette. La hiérarchie est prouvée par le calcul ; la forme du
// dépliant relève du rendu, et une sonde d'écran est le bon instrument.
// ============================================================

const MENU: EntreeMenu[] = [
  { chemin: 'qui-sommes-nous', parent: null, titre: 'Qui sommes-nous', ordre: 1 },
  { chemin: 'qui-sommes-nous/histoire', parent: 'qui-sommes-nous', titre: 'Notre histoire', ordre: 1 },
  { chemin: 'qui-sommes-nous/missions', parent: 'qui-sommes-nous', titre: 'Nos missions', ordre: 2 },
  { chemin: 'activites', parent: null, titre: 'Nos activités', ordre: 2 },
  { chemin: 'activites/qualite', parent: 'activites', titre: 'Assurance qualité', ordre: 1 },
] as unknown as EntreeMenu[];

const T = { nav: { about: 'À propos', services: 'Services', shop: 'Boutique', gallery: 'Galerie', reviews: 'Avis', contact: 'Contact' } };
const bati = (pages: EntreeMenu[], avisTitre: string | null = null) =>
  construireMenuTelephone({ pages, base: 'https://cpa-tchad.deribfy.app', hidden: () => false, hasShop: true, t: T, avisTitre });

describe('le hamburger ne sert plus une liste à plat', () => {
  it('🔴 cinq pages déclarées donnent DEUX entrées de premier niveau, pas cinq', () => {
    const m = bati(MENU);
    expect(m.filter((e) => e.label === 'Qui sommes-nous' || e.label === 'Nos activités')).toHaveLength(2);
    expect(m.some((e) => e.label.startsWith('—'))).toBe(false);
  });

  it('🔴 les sous-pages sont PORTÉES par leur parent', () => {
    const qsn = bati(MENU).find((e) => e.label === 'Qui sommes-nous');
    expect(qsn?.enfants?.map((e) => e.label)).toContain('Notre histoire');
    expect(qsn?.enfants?.map((e) => e.label)).toContain('Nos missions');
  });

  it('🔴 la page d’entrée reste atteignable DEPUIS son sous-menu', () => {
    // Replier un parent ne doit pas le rendre inaccessible.
    const qsn = bati(MENU).find((e) => e.label === 'Qui sommes-nous');
    expect(qsn?.enfants?.[0].href).toBe('https://cpa-tchad.deribfy.app/qui-sommes-nous');
  });

  it('🔴 avec des pages déclarées, les ancres QUITTENT le menu', () => {
    const h = bati(MENU).map((e) => e.href);
    expect(h).not.toContain('#about');
    expect(h).not.toContain('#gallery');
    expect(h).not.toContain('#testimonials');
  });

  it('🔴 SANS page déclarée, les ancres RESTENT — les 41 autres sites', () => {
    const h = bati([]).map((e) => e.href);
    // LOT 21 — « À propos » devient une vraie page ; la galerie reste une ancre.
    expect(h.some((x) => x.endsWith('/a-propos'))).toBe(true)
    expect(h).not.toContain('#about');
    expect(h).toContain('#gallery');
  });

  it('🔴 Contact est servi, et toujours en dernier', () => {
    for (const m of [bati(MENU), bati([])]) {
      expect(m[m.length - 1].href).toMatch(/\/contact$/);
    }
  });

  it('🔴 une page sans enfant reste un lien simple, pas un dépliant vide', () => {
    const seule = [{ chemin: 'contact-direct', parent: null, titre: 'Contact direct', ordre: 1 }] as unknown as EntreeMenu[];
    expect(bati(seule).find((e) => e.label === 'Contact direct')?.enfants).toBeUndefined();
  });

});

// ============================================================
// LOT 15.7 — CE QUE LE BUREAU SERT, LE TÉLÉPHONE LE SERT AUSSI.
//
// MESURÉ LE 2026-11-09 : la barre du bureau portait « Appels d'offres », le
// rideau du téléphone ne la portait PAS. La page existait et était publiée,
// elle était simplement inatteignable au doigt. Le propriétaire l'avait dit
// la veille : « ce que je vois sur ordi est différent de téléphone ».
// ============================================================

describe('les appels d’offres sont au téléphone comme au bureau', () => {
  it('🔴 le site qui en publie a son entrée, AVANT Contact', () => {
    const e = bati(MENU, 'Appels d’offres');
    const i = e.findIndex((x) => x.href.endsWith('/appels-offres'));
    expect(i, 'le rideau n’a pas d’entrée appels d’offres').toBeGreaterThan(-1);
    expect(i).toBeLessThan(e.length - 1);
    expect(e[e.length - 1].href).toMatch(/\/contact$/);
  });

  it('🔴 le site qui n’en publie pas n’en a AUCUNE', () => {
    // La règle d’ouverture reste à un seul endroit : le thème lit
    // `publishes_tenders`, ce calcul ne fait que suivre. Deux lectures de la
    // même colonne, c’est deux comportements qui divergeront un jour.
    expect(bati(MENU, null).some((x) => x.href.endsWith('/appels-offres'))).toBe(false);
  });

  it('🔴 chaque entrée porte sa RACINE, pour en déduire son pictogramme', () => {
    // On ne la devine pas depuis `href` : une ancre et une page déclarée
    // n’ont pas la même forme, et la déduction se tromperait en silence.
    const e = bati(MENU, 'Appels d’offres');
    for (const attendu of ['qui-sommes-nous', 'activites', 'appels-offres', 'contact']) {
      expect(e.some((x) => x.chemin === attendu), `« ${attendu} » n’a pas de racine`).toBe(true);
    }
  });
});
