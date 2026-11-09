import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import ReseauxSociaux, { reseauxRemplis } from '../ReseauxSociaux';

// ============================================================
// LOT 15.4 — LES RÉSEAUX D'UNE INSTITUTION.
//
// LE DÉFAUT, MESURÉ le 2026-11-09 : le moteur ne connaissait que quatre
// réseaux — Instagram, Facebook, TikTok, WhatsApp. C'est la panoplie d'un
// MARCHAND. Une centrale d'achats publique communique sur X, YouTube,
// LinkedIn et Telegram, ceux qu'EPSS affiche.
//
// Et chaque thème recopiait SON bloc : quatre thèmes, aucun moyen
// d'ajouter un réseau sans toucher quatre fichiers, donc sans en oublier un.
// ============================================================

describe('les huit réseaux sont servis', () => {
  it('🔴 les quatre d’une institution sont reconnus', () => {
    const r = reseauxRemplis({
      x: 'cpa_tchad', youtube: 'cpatchad',
      linkedin: 'https://www.linkedin.com/company/cpa-tchad', telegram: 'cpa_tchad',
    });
    expect(r.map((n) => n.cle).sort()).toEqual(['linkedin', 'telegram', 'x', 'youtube']);
  });

  it('🔴 les quatre d’un marchand le restent — aucun site existant ne perd rien', () => {
    const r = reseauxRemplis({
      instagram: 'cpa', facebook: 'cpa', tiktok: 'cpa', whatsapp: '+235 22 00 00 00',
    });
    expect(r).toHaveLength(4);
  });

  it('🔴 Telegram résout vers t.me', () => {
    expect(reseauxRemplis({ telegram: 'cpa_tchad' })[0].url).toBe('https://t.me/cpa_tchad');
  });

  it('🔴 une URL COMPLÈTE est respectée telle quelle', () => {
    // C'est ce qui permet à une institution d'employer une page
    // LinkedIn `/company/` alors que la base par défaut est `/in/`.
    const url = 'https://www.linkedin.com/company/cpa-tchad';
    expect(reseauxRemplis({ linkedin: url })[0].url).toBe(url);
  });
});

describe('rien n’est annoncé qui n’existe pas', () => {
  it('🔴 aucun réseau rempli → AUCUN bloc', () => {
    // Un titre « Suivez-nous » au-dessus de zéro lien annonce une présence
    // qui n'existe pas.
    expect(renderToStaticMarkup(
      <ReseauxSociaux social={{ facebook: '', x: '   ' }} libelle="Suivez-nous" />,
    )).toBe('');
  });

  it('🔴 `social_links` absent ou nul ne casse rien', () => {
    expect(renderToStaticMarkup(<ReseauxSociaux social={null} />)).toBe('');
    expect(renderToStaticMarkup(<ReseauxSociaux social={undefined} />)).toBe('');
  });

  it('🔴 seuls les réseaux REMPLIS paraissent', () => {
    const html = renderToStaticMarkup(
      <ReseauxSociaux social={{ x: 'cpa', facebook: '' }} />,
    );
    expect(html).toContain('aria-label="X"');
    expect(html).not.toContain('aria-label="Facebook"');
  });
});

describe('l’ordre est stable et les liens sont sûrs', () => {
  it('🔴 deux lectures rendent le MÊME ordre', () => {
    const social = { whatsapp: '+235220000', x: 'a', facebook: 'b', youtube: 'c' };
    const un = reseauxRemplis(social).map((r) => r.cle);
    const deux = reseauxRemplis({ ...social }).map((r) => r.cle);
    expect(un).toEqual(deux);
    // Facebook et X d'abord : ce qu'une institution emploie le plus.
    expect(un[0]).toBe('facebook');
  });

  it('🔴 chaque lien porte `noopener` — sinon la page ouverte garde une poignée', () => {
    const html = renderToStaticMarkup(<ReseauxSociaux social={{ x: 'cpa' }} />);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('🔴 chaque icône porte un nom lisible au lecteur d’écran', () => {
    const html = renderToStaticMarkup(
      <ReseauxSociaux social={{ x: 'a', youtube: 'b', linkedin: 'c', telegram: 'd' }} />,
    );
    for (const nom of ['X', 'YouTube', 'LinkedIn', 'Telegram']) {
      expect(html).toContain(`aria-label="${nom}"`);
    }
  });
});
