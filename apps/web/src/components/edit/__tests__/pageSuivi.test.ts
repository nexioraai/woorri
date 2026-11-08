import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..', '..');
const code = (p: string) =>
  readFileSync(join(RACINE, p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGE = code('app/sites/[slug]/demandes/suivi/page.tsx');
const FORM = code('app/sites/[slug]/demandes/FormulaireSuivi.tsx');

// ============================================================
// LOT 8 — LA PAGE DE SUIVI NE DÉCIDE RIEN.
//
// Toute la décision est dans la route : l'écran ne fait qu'afficher ce
// qu'elle rend. S'il recalculait quoi que ce soit, il y aurait DEUX
// autorités sur ce qu'un demandeur a le droit de voir — et celle qu'on lit
// ne serait pas celle qui décide.
// ============================================================

describe('l’écran n’a aucune autorité propre', () => {
  it('🔴 il ne lit JAMAIS la table des messages', () => {
    expect(PAGE).not.toMatch(/from\(\s*['"]messages['"]/);
    expect(FORM).not.toMatch(/from\(\s*['"]messages['"]/);
  });

  it('🔴 il ne distingue pas les deux échecs — il n’a qu’un message', () => {
    // Un écran qui testerait « référence inconnue » séparément recréerait
    // la fuite que la route referme.
    expect(FORM).not.toMatch(/inconnue/i);
    expect(FORM).not.toMatch(/incorrect/i);
  });

  it('🔴 la branche de SUCCÈS n’affiche ni le message ni le nom', () => {
    // `reponse.message` existe légitimement — c'est le message NEUTRE
    // d'échec rendu par la route, pas le texte du demandeur. Ma première
    // assertion l'interdisait partout et rougissait sur du code correct :
    // un attendu qui ne décrit pas son sujet est un faux rouge.
    //
    // Ce qu'il faut garder, c'est la branche de succès : elle ne doit
    // jamais montrer le contenu écrit par le demandeur.
    // `indexOf('reponse.trouve')` trouve D'ABORD « !reponse.trouve » — la
    // branche d'ÉCHEC. Mon repère attrapait exactement le contraire de ce
    // qu'il visait. On exige donc l'absence du « ! ».
    const m = /[^!]reponse\.trouve\s*&&\s*\(/.exec(FORM);
    expect(m, 'la branche de succès doit exister').not.toBeNull();
    const succes = FORM.slice((m as RegExpExecArray).index);
    expect(succes).not.toMatch(/reponse\.message/);
    expect(succes).not.toMatch(/reponse\.name/);
  });

  it('🔴 le TYPE de la réponse ne prévoit même pas ces champs', () => {
    // La garde la plus sûre n'est pas une règle, c'est une forme qui ne
    // permet pas : le type « trouve: true » n'a ni `message` ni `name`,
    // donc les afficher ne compilerait pas.
    const t = FORM.slice(FORM.indexOf('type Reponse'), FORM.indexOf('export default'));
    const succes = t.slice(t.indexOf('trouve: true'), t.indexOf('trouve: false'));
    expect(succes).not.toMatch(/\bmessage\b/);
    expect(succes).not.toMatch(/\bname\b/);
  });

  it('🔴 un état inconnu de la base s’affiche TEL QUEL', () => {
    // Si la base gagnait un cinquième état, l'écran doit le montrer au lieu
    // de le faire disparaître — même règle que `etatVisible` des avis.
    expect(FORM).toMatch(/libelles\.etats\[reponse\.etat\]\s*\?\?\s*reponse\.etat/);
  });
});

describe('la page ne s’indexe pas', () => {
  it('🔴 `noindex` est posé — une page de données personnelles ne s’indexe pas', () => {
    // L'indexer inviterait à y entrer des références au hasard, et elle
    // n'apporte aucun contenu public.
    expect(PAGE).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('🔴 le canonical est résolu depuis le SITE, jamais d’une variable globale', () => {
    expect(PAGE).toMatch(/alternates:\s*\{\s*canonical/);
    expect(PAGE).toMatch(/resolveSiteBaseUrl/);
    expect(PAGE).not.toMatch(/NEXT_PUBLIC_SITE_URL/);
  });
});

describe('ses textes restent éditables', () => {
  it('🔴 elle lit une page déclarée, et rend ses blocs', () => {
    expect(PAGE).toMatch(/site_pages_public/);
    expect(PAGE).toMatch(/BlocsDePage/);
  });

  it('🔴 sans page déclarée, elle fonctionne quand même', () => {
    // Un site qui n'a rien déclaré ne doit pas voir une zone vide.
    expect(PAGE).toMatch(/textes\.length\s*>\s*0/);
  });
});
