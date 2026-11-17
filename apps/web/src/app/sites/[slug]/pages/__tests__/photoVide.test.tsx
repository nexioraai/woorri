// CPA, 2026-11-11 — le gabarit de l'éditeur (`https://`, « Décrivez la photo »)
// s'affichait au public sur une fiche. Et une fiche sans photo doit garder sa
// mise en page (médaillon d'attente) : l'équipe pose la photo dans /edit.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BlocsDePage from '../BlocsDePage';
import { estUneFiche } from '../FicheResponsable';
import { photoValable } from '../photoValable';
import type { Bloc } from '../blocs';

describe('photo vide', () => {
  it('le gabarit « https:// » n’est pas une photo ; une vraie adresse ou un chemin relatif oui', () => {
    expect(photoValable('https://')).toBe(false);
    expect(photoValable('')).toBe(false);
    expect(photoValable('//x.jpg')).toBe(false);
    expect(photoValable('https://cdn.exemple.td/a.jpg')).toBe(true);
    expect(photoValable('/a.jpg')).toBe(true);
  });

  it('un bloc image laissé en gabarit ne produit rien', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[{ type: 'image', url: 'https://', alt: 'Décrivez la photo' } as Bloc]} />);
    expect(html).not.toContain('Décrivez la photo');
    expect(html).not.toContain('<img');
  });

  it('une galerie ne garde que les vraies photos', () => {
    const html = renderToStaticMarkup(<BlocsDePage base="" blocs={[{ type: 'galerie', items: [
      { url: 'https://', alt: 'Décrivez la photo' }, { url: '/b.jpg', alt: 'b' }] } as Bloc]} />);
    expect(html).not.toContain('Décrivez la photo');
    expect(html).toContain('/b.jpg');
  });

  it('une citation au champ photo VIDE est une fiche ; une citation sans champ photo ne l’est pas', () => {
    expect(estUneFiche([{ type: 'citation', texte: 'x', auteur: '', photo: '' } as Bloc])).toBe(true);
    expect(estUneFiche([{ type: 'citation', texte: 'x', auteur: '' } as Bloc])).toBe(false);
  });
});

// CPA, 2026-11-17 — « Ses missions » déplacé au-dessus du mot : la fiche du
// chef comptable perdait son portrait rond (rendu en carré, page ordinaire).
import FicheResponsable from '../FicheResponsable';
describe('fiche : le mot n’a pas à être en tête', () => {
  const photo = 'https://cdn.exemple.td/chef.png';
  const blocs = [
    { type: 'titre', texte: 'Ses missions' },
    { type: 'citation', texte: 'La comptabilité doit rendre compte.', titre: 'Mot du chef comptable', auteur: 'Chef comptable', photo },
    { type: 'liste', items: ['Tenir les comptes'] },
    { type: 'appel', chemin: 'qui-sommes-nous/direction', libelle: 'Retour' },
    { type: 'image', url: photo, alt: 'Décrivez la photo' },
  ] as Bloc[];
  const html = () => renderToStaticMarkup(<FicheResponsable site={{ name: 'CPA' }} titre="Chef comptable" blocs={blocs} base="" accent="#1e4d8c" parent={null} freres={[]} cheminCourant="x" />);

  it('reste une fiche', () => expect(estUneFiche(blocs)).toBe(true));
  it('le portrait rond porte la photo, une seule fois', () => {
    const h = html();
    expect(h).toContain('class="portrait"');
    // compte les <img> affichées (React ajoute aussi un <link rel=preload>)
    expect(h.split(`<img`).filter((x) => x.includes(`src="${photo}"`)).length).toBe(1);
  });
  it('« Ses missions » titre les missions, sans titre orphelin en double', () => {
    expect(html().split('Ses missions').length - 1).toBe(1);
  });
  it('une page sans mot n’est pas une fiche', () => {
    expect(estUneFiche([{ type: 'texte', texte: 'x' }, { type: 'citation', texte: 'y' }] as Bloc[])).toBe(false);
  });
});
