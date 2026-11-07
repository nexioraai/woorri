import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TYPES_DE_BLOC } from '../../../app/sites/[slug]/pages/blocs';

const SRC = readFileSync(join(__dirname, '..', '..', 'EditeurBlocs.tsx'), 'utf-8');
const PAGES = readFileSync(join(__dirname, '..', '..', 'EditeurPages.tsx'), 'utf-8');
const ROUTE = readFileSync(join(__dirname, '..', '..', '..', 'app', 'api', 'sites', '[slug]', 'pages', 'route.ts'), 'utf-8');

// NOTE DE PLACEMENT. Ce fichier a d'abord ete ecrit dans
// `src/components/__tests__/` — un dossier qui n'est PAS dans la liste
// `include` de vitest. Il y serait reste vert sans jamais s'executer.
// `src/components/edit/**` est balaye ; c'est pour ca qu'il est ici.
// ============================================================
// LOT 4 — CE QUE LE MOTEUR GÉNÈRE, LE CLIENT DOIT POUVOIR L'EFFACER.
//
// GEN-D044 a été payé une fois : l'éditeur savait POSER un contenu et pas
// le RETIRER. Remplir 30 pages de blocs générés sans écran pour les
// remplacer referait exactement ce défaut.
// ============================================================

describe('l’éditeur de blocs ferme GEN-D044', () => {
  it('🔴 un bloc peut être SUPPRIMÉ', () => {
    expect(SRC).toContain('Supprimer le bloc');
    expect(SRC).toMatch(/onChange\(blocs\.filter\(/);
  });

  it('🔴 un bloc peut être RÉORDONNÉ', () => {
    expect(SRC).toContain('aria-label="Monter"');
    expect(SRC).toContain('aria-label="Descendre"');
  });

  it('🔴 la route accepte bien le champ `blocs`', () => {
    expect(ROUTE).toMatch(/CHAMPS = \[[\s\S]*?'blocs'/);
  });

  it('🔴 la route RELIT `blocs` après écriture', () => {
    expect(ROUTE).toContain('maj_le,blocs');
  });

  it("🔴 l’éditeur est branché dans l’écran des pages", () => {
    expect(PAGES).toContain('<EditeurBlocs');
    expect(PAGES).toMatch(/modifier\(p\.id, 'blocs'/);
  });
});

describe('le vocabulaire n’est écrit qu’à un seul endroit', () => {
  it('🔴 l’éditeur LIT `TYPES_DE_BLOC`, il ne le recopie pas', () => {
    expect(SRC).toContain('TYPES_DE_BLOC');
    const liste = SRC.match(/const TYPES_DE_BLOC\s*=/);
    expect(liste, "l'éditeur redéfinit le vocabulaire au lieu de l'importer").toBeNull();
  });

  it('🔴 chaque type du vocabulaire a une étiquette ET un squelette neuf', () => {
    for (const t of TYPES_DE_BLOC) {
      expect(SRC, `« ${t} » n'a pas d'étiquette lisible`).toMatch(new RegExp(`\\b${t}:\\s*['"]`));
      expect(SRC, `« ${t} » n'a pas de squelette`).toMatch(new RegExp(`\\b${t}:\\s*\\{\\s*type:\\s*'${t}'`));
    }
  });
});
