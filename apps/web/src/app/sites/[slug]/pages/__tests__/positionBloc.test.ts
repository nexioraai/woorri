import { describe, it, expect } from 'vitest';
import { lirePosition, lireBlocs } from '../blocs';

// ============================================================
// LOT 5bis — LA POSITION D'UN BLOC.
//
// Ce qui manquait pour la colonne latérale n'était pas un type de bloc : un
// « Besoin d'aide ? » est un encadré, des liens rapides sont un bloc
// `liens`. C'était une POSITION.
//
// UNE VALEUR INCONNUE NE FAIT PAS DISPARAÎTRE LE BLOC. Un bloc qui s'évapore
// parce qu'on a mal tapé un mot est pire qu'un bloc mal placé : personne ne
// comprend pourquoi son texte a disparu.
// ============================================================

describe('la position est sûre, et elle ne fait rien disparaître', () => {
  it('🔴 « cote » est la seule valeur reconnue', () => {
    expect(lirePosition('cote')).toBe('cote');
  });

  it('🔴 tout le reste vaut « au-dessus », jamais « nulle part »', () => {
    for (const v of ['bas-gauche', 'COTE', 'droite', '', null, undefined, 42, {}]) {
      expect(lirePosition(v)).toBeNull();
    }
  });

  it('🔴 un bloc mal positionné reste un bloc VALIDE', () => {
    // Il s'affiche au-dessus, comme s'il n'avait rien demandé. La position
    // ne doit JAMAIS décider de l'existence.
    const out = lireBlocs([{ type: 'texte', texte: 'Un texte.', position: 'n’importe quoi' }]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('texte');
  });

  it('🔴 la position n’empêche pas un bloc mal formé d’être écarté', () => {
    // Une position correcte ne rattrape pas un contenu absent.
    expect(lireBlocs([{ type: 'texte', position: 'cote' }])).toEqual([]);
  });

  it('un bloc placé « cote » traverse la lecture sans perdre sa position', () => {
    const out = lireBlocs([{ type: 'encadre', texte: 'Besoin d’aide ?', position: 'cote' }]);
    expect(out).toHaveLength(1);
    expect(lirePosition((out[0] as { position?: string }).position)).toBe('cote');
  });
});
