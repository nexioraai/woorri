// ============================================================
// M2-226 — LE GARDE-FOU RÉSEAU DOIT ÊTRE VIVANT, SINON IL NE GARDE RIEN.
//
// `vitest.setup.ts` arrête tout appel réseau EXTERNE parti d'un test. Un
// garde-fou qu'on ne voit jamais mordre est indiscernable d'un garde-fou
// absent : ces deux cas l'éprouvent DANS LES DEUX SENS.
//
// CE QU'IL EMPÊCHE, concrètement, et ce n'est pas théorique : cinq tests de
// `api/domains/status` sont morts en CI sur « Test timed out in 5000ms »
// (run 35800661169) parce qu'un module non masqué ouvrait quatre adresses
// réelles avec un délai de 8 s. Le symptôme ne nommait ni le module, ni
// l'adresse, ni la cause — et il ne se reproduisait pas en local.
// ============================================================
import { describe, expect, it } from 'vitest';

describe('M2-226 — aucun test ne sort sur le réseau', () => {
  it('un appel EXTERNE est arrêté, et il se NOMME', async () => {
    await expect(fetch('https://api.exemple-inexistant.test/v1/ping')).rejects.toThrow(
      /APPEL RÉSEAU EXTERNE/,
    );
    // Le message doit porter l'ADRESSE : sans elle, le lecteur du CI ne sait
    // toujours pas quel module masquer — c'est exactement ce qui manquait.
    await expect(fetch('https://api.exemple-inexistant.test/v1/ping')).rejects.toThrow(
      /api\.exemple-inexistant\.test/,
    );
  });

  it('la boucle locale N EST PAS arrêtée — un test qui monte son serveur reste possible', async () => {
    // Port fermé volontairement : l'appel échoue, mais il doit échouer au
    // RÉSEAU (connexion refusée), jamais sur le garde-fou. Si un jour il
    // échouait sur le garde-fou, `reportingPipeline.integration` mourrait avec.
    await expect(fetch('http://127.0.0.1:1/ping')).rejects.not.toThrow(/APPEL RÉSEAU EXTERNE/);
  });

  it('une adresse ILLISIBLE est arrêtée — jamais laissée passer par défaut', async () => {
    await expect(fetch('pas-une-url')).rejects.toThrow(/APPEL RÉSEAU EXTERNE/);
  });
});
