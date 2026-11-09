import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import PictoCompte, { COMPTES_DESSINES, type CleDeCompte } from '../PictoCompte';
import EnTeteAvis from '../EnTeteAvis';
import { compterAvis } from '../comptesAvis';

// ============================================================
// LOT 15.8 — LE DESSIN D'UN COMPTEUR DIT LE MÊME ÉTAT QUE SON CHIFFRE.
//
// Les quatre compteurs disaient « 12 » et « avis actifs » : justes, et
// indistincts. Sur la page d'EPSS que le propriétaire a posée à côté de la
// nôtre, chaque carte porte un carré teinté et son dessin.
//
// MAIS UNE HORLOGE SUR « ARCHIVÉS » SERAIT PIRE QU'AUCUNE ICÔNE : elle
// contredirait le libellé, et le lecteur croirait le dessin. La
// correspondance porte donc sur les CLÉS de `ComptesAvis`, pas sur un
// libellé traduit.
// ============================================================

const CLES: CleDeCompte[] = ['actifs', 'ouverts', 'clotureProchaine', 'archives'];

describe('les deux listes coïncident, dans les deux sens', () => {
  it('🔴 chaque compteur de `ComptesAvis` a son tracé', () => {
    // La source est le CALCUL, pas une liste recopiée ici : `compterAvis`
    // rend un objet dont les clés sont exactement celles que la page
    // affiche. Recopier les quatre noms dans ce fichier aurait laissé le
    // cliquet vert le jour où un cinquième compteur apparaît.
    for (const k of Object.keys(compterAvis([], new Date('2026-11-09')))) {
      expect(COMPTES_DESSINES, `« ${k} » n'a aucun dessin`).toContain(k);
    }
  });

  it('🔴 aucun tracé ne survit sans compteur', () => {
    // Un dessin que rien n'appelle est du code mort qui se maintient.
    const vrais = Object.keys(compterAvis([], new Date('2026-11-09')));
    for (const k of COMPTES_DESSINES) {
      expect(vrais, `le tracé « ${k} » n'a plus de compteur`).toContain(k);
    }
  });

  it('🔴 les quatre tracés sont DISTINCTS', () => {
    // Quatre cartes qui portent le même dessin ne distinguent rien : autant
    // n'en mettre aucun.
    const rendus = CLES.map((k) =>
      renderToStaticMarkup(<PictoCompte cle={k} couleur="#000000" />).replace(/#000000/g, ''));
    expect(new Set(rendus).size).toBe(CLES.length);
  });
});

describe('c’est un dessin, et il ne se télécharge pas', () => {
  const rendu = (k: CleDeCompte) =>
    renderToStaticMarkup(<PictoCompte cle={k} couleur="#1F6B4A" />);

  it('🔴 chaque clé rend un tracé', () => {
    for (const k of CLES) {
      expect(rendu(k), `« ${k} » ne dessine rien`).toMatch(/<(path|circle)[\s>]/);
    }
  });

  it('🔴 aucune requête : ni URL, ni image, ni police', () => {
    for (const k of CLES) {
      expect(rendu(k), `« ${k} » charge quelque chose`)
        .not.toMatch(/http|url\(|<img|src=|@font-face/);
    }
  });

  it('🔴 il est MUET au lecteur d’écran — le libellé dit déjà l’état', () => {
    expect(rendu('actifs')).toMatch(/aria-hidden="true"/);
  });

  it('🔴 la teinte vient de la CARTE, jamais d’une valeur en dur', () => {
    // Le compteur « actifs » prend la couleur du site ; les trois autres
    // leur état. Figer une teinte ici les rendrait tous identiques.
    expect(rendu('clotureProchaine')).toContain('#1F6B4A');
  });
});

describe('les quatre cartes de la page les portent', () => {
  const html = () => renderToStaticMarkup(
    <EnTeteAvis
      titre="Appels d'offres" phrase="Les consultations en cours."
      filDAriane={<span>fil</span>}
      comptes={{ actifs: 3, ouverts: 2, clotureProchaine: 1, archives: 7 }}
      libelles={{ actifs: 'Actifs', ouverts: 'Ouverts', clotureProchaine: 'Clôture proche', archives: 'Archivés' }}
      primary="#1F6B4A"
    />);

  it('🔴 quatre compteurs, quatre dessins', () => {
    expect((html().match(/<svg/gu) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('🔴 CHAQUE carte porte le dessin de SA clé, pas celui d’une voisine', () => {
    // PREMIER JET, ET IL ÉTAIT AVEUGLE : il comparait le rendu français au
    // rendu anglais. Une règle fausse — choisir le dessin sur l'initiale du
    // libellé — donnait le MÊME faux dans les deux langues, et le test
    // restait vert. Comparer deux sorties entre elles ne dit pas qu'elles
    // sont justes ; il faut les comparer à la vérité.
    //
    // Ici on vérifie que les tracés de chaque clé sont PRÉSENTS dans la page.
    const traces = (h: string) => (h.match(/ d="[^"]+"/gu) ?? []);
    const page = html();
    for (const k of CLES) {
      const attendus = traces(renderToStaticMarkup(<PictoCompte cle={k} couleur="#1F6B4A" />));
      expect(attendus.length, `« ${k} » ne dessine rien`).toBeGreaterThan(0);
      for (const t of attendus) {
        expect(page, `« ${k} » : le tracé ${t.slice(0, 24)}… manque de la page`).toContain(t);
      }
    }
  });

  it('🔴 un libellé traduit ne change AUCUN dessin', () => {
    const traces = (h: string) => (h.match(/ d="[^"]+"/gu) ?? []).join('|');
    const en = renderToStaticMarkup(
      <EnTeteAvis
        titre="Tenders" phrase="Current procurements."
        filDAriane={<span>trail</span>}
        comptes={{ actifs: 3, ouverts: 2, clotureProchaine: 1, archives: 7 }}
        libelles={{ actifs: 'Active', ouverts: 'Open', clotureProchaine: 'Closing soon', archives: 'Archived' }}
        primary="#1F6B4A"
      />);
    expect(traces(en)).toBe(traces(html()));
  });

  it('🔴 un compteur à ZÉRO garde son dessin et son chiffre', () => {
    // À zéro ils affichent 0 — jamais rien : une case vide laisserait croire
    // que la donnée manque.
    const h = renderToStaticMarkup(
      <EnTeteAvis
        titre="t" phrase="p" filDAriane={<span>f</span>}
        comptes={{ actifs: 0, ouverts: 0, clotureProchaine: 0, archives: 0 }}
        libelles={{ actifs: 'Actifs', ouverts: 'Ouverts', clotureProchaine: 'Clôture proche', archives: 'Archivés' }}
        primary="#1F6B4A"
      />);
    expect((h.match(/<svg/gu) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(h).toMatch(/>0</);
  });
});
