import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import EditorialTheme from '../EditorialTheme';
import VifTheme from '../VifTheme';
import NoirTheme from '../NoirTheme';
import AuroraTheme from '../AuroraTheme';
import { CartProvider } from '../CartContext';
import type { Site } from '../shared';
import type { EntreeMenu } from '../../pages/fetchPage';

// ============================================================
// LOT 3 — 7 novembre 2026. LA BARRE APPARTIENT AUX PAGES DÉCLARÉES.
//
// LE DÉFAUT, VU À L'ÉCRAN sur cpa-tchad.deribfy.app : la barre portait les
// ancres d'une page unique (#about, #faq, #gallery…) ET les pages déclarées.
// Résultat : l'enseigne « Centrale Pharmaceutique d'Achats » touchait
// « Accueil », et le menu débordait.
//
// LA RÈGLE : un site qui DÉCLARE des pages voit sa barre leur revenir.
// Un site qui n'en déclare pas ne change pas — c'est le cas des 41 autres.
//
// LE SENS INVERSE EST TESTÉ. Un cliquet qui ne vérifie que la disparition
// passerait au vert sur une barre vide. On mesure donc les deux états avec
// le MÊME site : seule la liste des pages déclarées change.
// ============================================================

const MENU_CPA: EntreeMenu[] = [
  { chemin: 'qui-sommes-nous', parent: null, titre: 'Qui sommes-nous', ordre: 1 },
  { chemin: 'nos-activites', parent: null, titre: 'Nos activités', ordre: 2 },
] as unknown as EntreeMenu[];

function makeSite(): Site {
  return {
    id: 'site-cpa', slug: 'cpa-tchad', name: "Centrale Pharmaceutique d'Achats",
    mode: 1, lang: 'fr', hidden_sections: [],
    hero_title: 'CPA', hero_subtitle: 'Tchad',
    about: "La centrale approvisionne les structures sanitaires.",
    contact: { phone: '+235', email: 'a@b.c' }, social_links: {},
    testimonials: [{ name: 'Partenaire', text: 'Fiable.' }],
    sections: [{ name: 'Nos activités', items: [{ title: 'Approvisionnement', description: 'd' }] }],
    products: [], gallery: ['/g1.jpg'],
    faq: [{ question: 'Comment commander ?', answer: 'Par bon de commande.' }],
    publishes_tenders: true,
  } as unknown as Site;
}

const THEMES: Array<[string, (s: Site, m: EntreeMenu[]) => string]> = [
  ['Editorial', (s, m) => renderToStaticMarkup(<CartProvider><EditorialTheme site={s} menu={m} /></CartProvider>)],
  ['Vif', (s, m) => renderToStaticMarkup(<CartProvider><VifTheme site={s} menu={m} /></CartProvider>)],
  ['Noir', (s, m) => renderToStaticMarkup(<CartProvider><NoirTheme site={s} menu={m} /></CartProvider>)],
  ['Aurora', (s, m) => renderToStaticMarkup(<CartProvider><AuroraTheme site={s} menu={m} /></CartProvider>)],
];

/**
 * La barre du haut seule — `<nav class="hidden md:flex …">…</nav>`, ou
 * `hidden xl:flex` depuis le lot 15.7.
 *
 * POURQUOI DEUX SEUILS. Sept entrées déclarées ne tiennent pas dans 768 px :
 * mesuré en ligne le 2026-11-09, la barre se repliait sur deux lignes et
 * « Contact » sortait du cadre. Un site SANS page déclarée garde `md` — sa
 * barre a trois entrées, et rien ne change pour les 41 autres.
 *
 * Ce localisateur suit les DEUX formes. Le laisser sur `md` seul aurait
 * rendu les quatre assertions suivantes aveugles sur le cas qui compte.
 */
function barreDuHaut(html: string): string {
  const m = /<nav class="hidden (?:md|xl):flex/.exec(html);
  const d = m ? m.index : -1;
  expect(d, 'la barre du haut doit exister dans le rendu').toBeGreaterThan(-1);
  return html.slice(d, html.indexOf('</nav>', d));
}

describe('LOT 3 — la barre du haut quand le site déclare ses pages', () => {
  for (const [nom, rendre] of THEMES) {
    it(`${nom} : SANS page déclarée, les ancres RESTENT dans la barre`, () => {
      const barre = barreDuHaut(rendre(makeSite(), []));
      // LOT 21 — « À propos » est une vraie page ; les autres ancres restent.
      expect(barre).toContain('/a-propos"');
      expect(barre).not.toContain('"#about"');
      expect(barre).toContain('#faq');
    });

    it(`${nom} : AVEC des pages déclarées, les ancres QUITTENT la barre`, () => {
      const barre = barreDuHaut(rendre(makeSite(), MENU_CPA));
      expect(barre).not.toContain('#about');
      expect(barre).not.toContain('/a-propos"');
      expect(barre).not.toContain('#faq');
      expect(barre).not.toContain('#gallery');
      expect(barre).not.toContain('#testimonials');
    });

    it(`${nom} : les pages déclarées, Accueil et Contact restent servis`, () => {
      const barre = barreDuHaut(rendre(makeSite(), MENU_CPA));
      // LOT 21 — « Accueil » mène à l'adresse du site, plus à l'ancre #home.
      expect(barre).toContain('Accueil');
      expect(barre).not.toContain('#home');
      // LOT 18 — Contact est une vraie page, plus l'ancre de l'accueil.
      expect(barre).toContain('/contact"');
      expect(barre).toContain('Qui sommes-nous');
      expect(barre).toContain('Nos activités');
    });

    it(`${nom} : « Appels d'offres » vient APRÈS les pages déclarées`, () => {
      // Ordre arrêté avec le propriétaire le 7 novembre 2026 :
      // Accueil · pages déclarées ▾ · Appels d'offres · Contact.
      const barre = barreDuHaut(rendre(makeSite(), MENU_CPA));
      const accueil = barre.indexOf('Accueil');
      const declaree = barre.indexOf('Qui sommes-nous');
      const appels = barre.indexOf('appels-offres');
      const contact = barre.indexOf('/contact"');
      expect(appels, "le lien appels d'offres doit être servi").toBeGreaterThan(-1);
      expect(accueil).toBeLessThan(declaree);
      expect(declaree).toBeLessThan(appels);
      expect(appels).toBeLessThan(contact);
    });

    it(`${nom} : les SECTIONS masquées de la barre restent sur la page`, () => {
      const html = rendre(makeSite(), MENU_CPA);
      const apres = html.slice(html.indexOf('</nav>'));
      expect(apres).toContain('id="about"');
      expect(apres).toContain('id="faq"');
    });
  }
});
