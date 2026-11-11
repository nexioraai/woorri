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
