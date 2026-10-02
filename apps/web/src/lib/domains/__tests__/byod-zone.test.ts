import { describe, it, expect } from 'vitest';
import {
  analyserJetonsZone, diagnosticZone, construireAlerteMiParcours, SEUIL_ALERTE_BYOD,
} from '../byod-zone';

// ============================================================
// LE CAS QUI A IMPOSÉ CE MODULE : logonemoteurfils.com, audit du 2026-10-02.
// La zone portait le jeton PERSONNEL du marchand (8Rt99…) et pas le nôtre
// (30ozTXjj…) — le robot comptait en aveugle vers l'échec terminal.
// Les fixtures reprennent la VRAIE zone relevée au dig, fragments compris.
// ============================================================

const NOTRE = 'google-site-verification=30ozTXjj309fU_KDpTgttN8MNljMYO3YO_Gxxxxx';
const ZONE_LOGONE = [
  ['v=spf1 include:zohocloud.ca ~all'],
  ['google-site-verification=8Rt99ljYZvyWboPM-7z_im8OjEQ4tnvYDovxgg-Wuno'],
  ['zoho-verification=zb98893167.zmverify.zohocloud.ca'],
];

describe('analyserJetonsZone — ce que la zone contient vraiment', () => {
  it('le cas logonemoteurfils : jeton TIERS présent, le nôtre absent', () => {
    const a = analyserJetonsZone(ZONE_LOGONE, NOTRE);
    expect(a.notrePresent).toBe(false);
    expect(a.jetonsExternes).toHaveLength(1);
    expect(a.jetonsExternes[0]).toContain('8Rt99');
  });

  it('notre jeton posé : reconnu, même découpé en fragments TXT', () => {
    const moitie = NOTRE.length >> 1;
    const a = analyserJetonsZone([[NOTRE.slice(0, moitie), NOTRE.slice(moitie)]], NOTRE);
    expect(a.notrePresent).toBe(true);
    expect(a.jetonsExternes).toHaveLength(0);
  });

  it('zone sans aucun jeton Google : rien de faux, rien d’inventé', () => {
    const a = analyserJetonsZone([['v=spf1 -all']], NOTRE);
    expect(a.notrePresent).toBe(false);
    expect(a.jetonsExternes).toHaveLength(0);
  });

  it('les deux jetons cohabitent : le nôtre reconnu, le tiers listé', () => {
    const a = analyserJetonsZone([...ZONE_LOGONE, [NOTRE]], NOTRE);
    expect(a.notrePresent).toBe(true);
    expect(a.jetonsExternes).toHaveLength(1);
  });
});

describe('diagnosticZone — trois attentes, trois messages', () => {
  const lisible = { zoneLisible: true, notrePresent: false, jetonsExternes: [] as string[] };

  it('jeton tiers seul → vérification externe nommée, consigne d’AJOUT', () => {
    const d = diagnosticZone({ ...lisible, jetonsExternes: ['google-site-verification=x'] });
    expect(d).toContain('HORS Deribfy');
    expect(d).toContain('AJOUTER');
    expect(d).toContain('cohabitent');
  });

  it('notre jeton présent → propagation, pas faute du marchand', () => {
    const d = diagnosticZone({ ...lisible, notrePresent: true });
    expect(d).toContain('propagation');
  });

  it('zone vide → le TXT n’a pas été posé, dit sans détour', () => {
    expect(diagnosticZone(lisible)).toContain('pas posé le TXT');
  });

  it('zone illisible → dit illisible, jamais un verdict inventé', () => {
    expect(diagnosticZone({ ...lisible, zoneLisible: false })).toContain('illisible');
  });
});

describe('construireAlerteMiParcours — l’alerte part à 10, une seule fois', () => {
  it('le seuil est bien à mi-course, pas à l’autopsie', () => {
    expect(SEUIL_ALERTE_BYOD).toBe(10);
  });

  it('le courriel porte domaine, compteur, diagnostic, jeton et échéance', () => {
    const a = construireAlerteMiParcours({
      domain: 'logonemoteurfils.com', slug: 'logone-1', attempts: 10, max: 20,
      diagnostic: 'jeton tiers détecté', token: NOTRE,
    });
    expect(a.subject).toContain('logonemoteurfils.com');
    expect(a.subject).toContain('10/20');
    expect(a.html).toContain('jeton tiers détecté');
    expect(a.html).toContain(NOTRE);
    expect(a.html).toContain('~20 h');
    expect(a.html).toContain('une seule fois');
  });
});
