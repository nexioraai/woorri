import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TYPES_DE_BLOC } from '../../../app/sites/[slug]/pages/blocs';

const SRC = readFileSync(join(__dirname, '..', '..', 'EditeurBlocs.tsx'), 'utf-8');
const PAGES = readFileSync(join(__dirname, '..', '..', 'EditeurPages.tsx'), 'utf-8');
const ROUTE = readFileSync(join(__dirname, '..', '..', '..', 'app', 'api', 'sites', '[slug]', 'pages', 'route.ts'), 'utf-8');
const FICH = readFileSync(join(__dirname, '..', '..', '..', 'app', 'api', 'sites', '[slug]', 'fichiers', 'route.ts'), 'utf-8');
const TELE = readFileSync(join(__dirname, '..', '..', 'TeleverseurFichiers.tsx'), 'utf-8');

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
    expect(SRC).toMatch(/Supprimer\s+le\s+bloc/);
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
    expect(PAGES).toMatch(/modifier\(p\.id,\s*'blocs'/);
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

// ============================================================
// LOT 5 — LE FICHIER RÉEL.
//
// Le bloc « documents » n'affichait que des liens vers des URL : il n'y avait
// AUCUN endroit où déposer un fichier, et les quatre liens de
// /fournisseurs/documents ne menaient nulle part.
// ============================================================

describe('la route des fichiers ne laisse pas le client choisir le chemin', () => {
  it('🔴 le chemin est CONSTRUIT à partir de l’id rendu par la garde', () => {
    expect(FICH).toMatch(/sites\/\$\{garde\.site\.id\}/);
  });

  it('🔴 le chemin n’est jamais lu du corps de la requête', () => {
    expect(FICH).not.toMatch(/form\.get\(\s*['"]chemin['"]/);
    expect(FICH).not.toMatch(/body[\s\S]{0,40}\.chemin/);
  });

  it('🔴 les trois verbes passent par requireSiteOwner', () => {
    const gardes = FICH.match(/requireSiteOwner\(/gu) ?? [];
    expect(gardes.length).toBe(3);
  });

  it('🔴 DELETE existe dès le premier jour', () => {
    expect(FICH).toMatch(/export\s+async\s+function\s+DELETE/);
  });

  it('🔴 le dépôt ET le retrait sont RELUS avant d’être annoncés', () => {
    expect(FICH).toMatch(/Depot\s+non\s+confirme/);
    expect(FICH).toMatch(/Retrait\s+non\s+confirme/);
  });

  it('🔴 les plafonds ne sont pas recopiés depuis le stockage', () => {
    // 26214400 et la liste des types vivent dans storage.buckets. Les
    // recopier ici créerait une seconde vérité qui divergerait.
    expect(FICH).not.toContain('26214400');
  });

  it('🔴 les dossiers sont une liste BLANCHE', () => {
    expect(FICH).toMatch(/DOSSIERS\s*=\s*\[/);
  });
});

describe('l’écran de téléversement', () => {
  it('🔴 les trois appels portent l’en-tête Authorization', () => {
    const appels = TELE.match(/fetch\(/gu) ?? [];
    const entetes = TELE.match(/headers:\s*(?:h|await entete\(\))/gu) ?? [];
    expect(appels.length).toBe(3);
    expect(entetes.length).toBe(3);
  });

  it('🔴 un fichier peut être RETIRÉ', () => {
    expect(TELE).toMatch(/method:\s*'DELETE'/);
    expect(TELE).toMatch(/Retirer\s/);
  });

  it('🔴 la liste est RECHARGÉE depuis la route après chaque écriture', () => {
    const rech = TELE.match(/await recharger\(\)/gu) ?? [];
    expect(rech.length).toBeGreaterThanOrEqual(3);
  });

  it('🔴 un champ `url` ouvre le téléversement au lieu d’exiger une adresse', () => {
    expect(SRC).toContain('TeleverseurFichiers');
    expect(SRC).toMatch(/chemin\[chemin\.length\s*-\s*1\]\s*===\s*'url'/);
  });
});
