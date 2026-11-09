import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { pictogrammeDe, RACINES_RECONNUES } from '../pictogrammeMenu';
import DessinDeMenu, { NOMS_DESSINES } from '../DessinDeMenu';
import MenuDeclare from '../MenuDeclare';
import type { EntreeMenu } from '../../pages/fetchPage';

// ============================================================
// LOT 15.1 / 15.7 — AUCUN PICTOGRAMME PLUTÔT QU'UN FAUX.
//
// EPSS pose une icône devant chaque rubrique. La nôtre se DÉDUIT du chemin :
// aucune colonne ajoutée, les 42 sites en profitent le jour même.
//
// Mais une icône de téléphone sur une page qui n'est pas « contact » trompe
// le lecteur plus qu'elle ne l'aide — et il la croira. La correspondance est
// donc FERMÉE, et un chemin inconnu ne reçoit RIEN.
//
// ── CE QUE LE 15.7 A AJOUTÉ, ET CE QU'IL A REMPLACÉ.
//
// Le 15.1 renvoyait des CARACTÈRES, et ce fichier vérifiait `длина <= 2`
// pour garantir « rien à télécharger ». Mesuré en ligne le 2026-11-09 : les
// caractères s'affichaient en CARRÉS GRIS, la police de la vitrine n'ayant
// aucun glyphe dessiné pour eux. L'assertion de forme était verte pendant
// que l'écran était faux.
//
// Elle est remplacée, pas supprimée : la perte qu'elle couvrait — une
// requête réseau pour une icône — est désormais couverte en lisant le rendu
// (aucune URL, aucune balise `img`), ce que la longueur ne regardait pas.
// ============================================================

const theme = (f: string) =>
  readFileSync(join(__dirname, '..', f), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const THEMES = ['EditorialTheme.tsx', 'VifTheme.tsx', 'NoirTheme.tsx', 'AuroraTheme.tsx'];

describe('la correspondance est fermée', () => {
  it('🔴 un chemin INCONNU ne reçoit aucun pictogramme', () => {
    for (const c of ['rubrique-inventee', 'zzz', 'x/y/z', '']) {
      expect(pictogrammeDe(c), `« ${c} » reçoit un pictogramme`).toBeNull();
    }
  });

  it('🔴 les SEPT entrées de la barre en ont un — pas quatre', () => {
    // LE DÉFAUT DU 2026-11-09, mesuré dans le HTML servi : « Accueil »,
    // « Appels d'offres » et « Contact » ne passent pas par le menu déclaré,
    // ils étaient donc restés nus. Une barre où trois entrées sur sept n'ont
    // pas d'icône se lit comme un oubli, pas comme un choix.
    for (const c of ['accueil', 'qui-sommes-nous', 'activites', 'catalogue',
                     'fournisseurs', 'appels-offres', 'contact']) {
      expect(pictogrammeDe(c), `« ${c} » n'en a pas`).toBeTruthy();
    }
  });

  it('🔴 une SOUS-PAGE porte le pictogramme de sa RACINE', () => {
    // Une sous-page appartient à sa rubrique : lui donner une autre icône
    // casserait la lecture de la hiérarchie.
    expect(pictogrammeDe('activites/stockage')).toBe(pictogrammeDe('activites'));
    expect(pictogrammeDe('qui-sommes-nous/histoire')).toBe(pictogrammeDe('qui-sommes-nous'));
  });

  it('🔴 les accents et la casse ne changent rien', () => {
    expect(pictogrammeDe('ACTIVITES')).toBe(pictogrammeDe('activites'));
    expect(pictogrammeDe('activités')).toBe(pictogrammeDe('activites'));
  });
});

describe('nommer et dessiner sont deux listes, et elles coïncident', () => {
  it('🔴 tout nom servi par la correspondance a un TRACÉ', () => {
    // Un nom sans dessin ne rendrait rien, et personne ne le verrait : la
    // rubrique perdrait son icône en silence.
    for (const r of RACINES_RECONNUES) {
      expect(NOMS_DESSINES, `« ${r} » nomme un dessin qui n'existe pas`)
        .toContain(pictogrammeDe(r)!);
    }
  });

  it('🔴 tout TRACÉ est atteignable par au moins une rubrique', () => {
    // Un dessin que rien n'appelle est du code mort qui se maintient — c'est
    // exactement ce qu'EP-365 refuse ailleurs.
    const servis = new Set(RACINES_RECONNUES.map((r) => pictogrammeDe(r)!));
    for (const n of NOMS_DESSINES) {
      expect(servis, `le tracé « ${n} » n'est jamais servi`).toContain(n);
    }
  });
});

describe('c’est un DESSIN, et il ne se télécharge pas', () => {
  const rendu = (c: string) => renderToStaticMarkup(<DessinDeMenu chemin={c} />);

  it('🔴 chaque rubrique reconnue rend un TRACÉ, jamais un caractère', () => {
    // LE DÉFAUT DU 15.1 : ▣ ◈ ▤ ◆ confiés à la police du lecteur, rendus en
    // carrés gris. Un pictogramme qui dépend d'une police est un pari.
    for (const r of RACINES_RECONNUES) {
      const h = rendu(r);
      expect(h, `« ${r} » ne rend aucun tracé`).toMatch(/<svg[\s>]/);
      expect(h, `« ${r} » ne dessine rien`).toMatch(/<(path|circle)[\s>]/);
    }
  });

  it('🔴 un chemin inconnu ne rend RIEN du tout', () => {
    expect(rendu('rubrique-inventee')).toBe('');
  });

  it('🔴 aucune requête : ni URL, ni image, ni police', () => {
    // La raison qui avait fait choisir des caractères reste servie — le tracé
    // est EN LIGNE. Rien n'arrive après le texte sur une connexion lente.
    for (const r of RACINES_RECONNUES) {
      const h = rendu(r);
      expect(h, `« ${r} » charge quelque chose`).not.toMatch(/http|url\(|<img|src=|@font-face/);
    }
  });

  it('🔴 il est `aria-hidden` — le libellé dit déjà la rubrique', () => {
    // Un lecteur d'écran qui annoncerait « image Nos activités » ajouterait
    // du bruit, pas de l'information.
    expect(rendu('activites')).toMatch(/aria-hidden="true"/);
  });

  it('🔴 sans couleur donnée, il reprend celle du TEXTE', () => {
    // Un thème sombre qui recevrait un bleu de marque afficherait un
    // pictogramme invisible sur son propre fond.
    expect(rendu('contact')).toMatch(/stroke="currentColor"/);
  });

  it('🔴 avec une couleur donnée, c’est celle du SITE qui sort', () => {
    expect(renderToStaticMarkup(<DessinDeMenu chemin="contact" couleur="#1F6B4A" />))
      .toContain('#1F6B4A');
  });
});

const SITE = { id: 's', slug: 'cpa', name: 'CPA', primary_color: null, lang: 'fr', custom_domain: null } as never;
const MENU = [
  { chemin: 'qui-sommes-nous', parent: null, titre: 'Qui sommes-nous', ordre: 1 },
  { chemin: 'qui-sommes-nous/histoire', parent: 'qui-sommes-nous', titre: 'Notre histoire', ordre: 1 },
  { chemin: 'rubrique-inventee', parent: null, titre: 'Rubrique inventée', ordre: 2 },
] as unknown as EntreeMenu[];

describe('le menu les sert sans jamais les annoncer au lecteur d’écran', () => {
  const html = () =>
    renderToStaticMarkup(<MenuDeclare site={SITE} host="cpa.test" entrees={MENU} />);

  it('🔴 la rubrique connue porte son dessin', () => {
    const h = html();
    const d = h.indexOf('Qui sommes-nous');
    expect(d).toBeGreaterThan(-1);
    // On remonte à l'OUVERTURE de l'entrée, pas d'un nombre de caractères :
    // un tracé fait cinq cents signes, et une fenêtre fixe tombait au milieu
    // du `<svg>` — le test échouait sur un rendu juste.
    const avant = h.slice(0, d);
    const ouverture = Math.max(avant.lastIndexOf('<a '), avant.lastIndexOf('<summary'));
    expect(ouverture).toBeGreaterThan(-1);
    expect(avant.slice(ouverture)).toMatch(/<svg[\s>]/);
  });

  it('🔴 la rubrique inconnue garde son libellé SEUL', () => {
    const h = html();
    const d = h.indexOf('Rubrique inventée');
    expect(d).toBeGreaterThan(-1);
    // On borne à l'ouverture du lien qui porte cette entrée : chercher plus
    // loin en arrière retomberait sur le dessin de l'entrée PRÉCÉDENTE et le
    // test mesurerait le voisin.
    const avant = h.slice(0, d);
    const ouverture = Math.max(avant.lastIndexOf('<a '), avant.lastIndexOf('<summary'));
    expect(ouverture).toBeGreaterThan(-1);
    expect(avant.slice(ouverture)).not.toMatch(/<svg[\s>]/);
  });
});

describe('la barre tient sur UNE ligne, et rien n’en sort', () => {
  it('🔴 une entrée ne se replie jamais en deux lignes', () => {
    // MESURÉ EN LIGNE LE 2026-11-09 : « Qui sommes-nous » coupé en deux et
    // « Contact » tranché par le bord de l'en-tête.
    const h = html2();
    expect((h.match(/white-space:\s*nowrap/gu) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('🔴 les QUATRE thèmes reculent leur barre quand le site DÉCLARE ses pages', () => {
    // MESURÉ AU NAVIGATEUR le 2026-11-09 : le conteneur est plafonné à 1200 px
    // utiles, l'enseigne en prend 182, la barre doit donc tenir dans 978 —
    // elle en réclamait 1053. Sept entrées exigent `xl`, pas `lg` : à 1024 px
    // « Contact » finissait à 1267. Reculer sur un thème et pas les autres,
    // c'est GEN-D049 : corriger pour une seule fois.
    for (const f of THEMES) {
      expect(theme(f), `${f} garde sa barre à md`).toMatch(/ancresEnBarre\s*\n?\s*\?\s*"hidden\s+md:flex/);
      expect(theme(f), `${f} n'a pas de barre xl`).toMatch(/:\s*"hidden\s+xl:flex/);
    }
  });

  it('🔴 le rideau du téléphone recule AVEC la barre, jamais seul', () => {
    // Sinon il reste une bande entre 768 et 1280 px où le site n'a PLUS
    // AUCUN menu : ni la barre, ni le hamburger.
    for (const f of THEMES) {
      expect(theme(f), `${f} laisse une bande sans menu`)
        .toMatch(/<MobileNav[^>]*seuil=\{ancresEnBarre\s*\?\s*"md"\s*:\s*"xl"\}/);
    }
  });
});

function html2() {
  return renderToStaticMarkup(<MenuDeclare site={SITE} host="cpa.test" entrees={MENU} />);
}
