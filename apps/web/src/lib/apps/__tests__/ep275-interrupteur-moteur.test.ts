/**
 * EP-275 — UN SEUL MOTEUR ATTEIGNABLE À LA FOIS, ET ON SAIT LEQUEL.
 *
 * ── CE QUE LE PROPRIÉTAIRE A EXIGÉ, LE 2026-10-18.
 *
 * « il faut que un soit accessible depuis interface le temps tester ce qui
 * est accessible l'autre ne doit pas etre accessible en meme temps ».
 *
 * Deux boutons côte à côte auraient été plus faciles à écrire et bien pires
 * à vivre. Treize tirs et 66 $ ont déjà été dépensés sans pouvoir attribuer
 * un résultat après coup. Une épreuve dont on ne sait pas lire le verdict
 * n'est pas une épreuve.
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 *   ① le défaut est le CONNU — on ne bascule jamais sur l'inconnu par
 *      accident, une faute de frappe ne doit pas changer d'architecture ;
 *   ② chaque génération ENREGISTRE son moteur — sans quoi on ne saura plus
 *      qui a produit quoi ;
 *   ③ la DDL reste LISIBLE — un backtick dans un commentaire SQL ferme le
 *      littéral TypeScript qui la porte. Mesuré deux fois aujourd'hui.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { direLeMoteur, moteurChoisi } from '../interrupteur-moteur'

// ── `journal.ts` N'EST PAS IMPORTÉ EN TÊTE, ET C'EST DÉLIBÉRÉ.
//
// Mesuré le 2026-10-18 : un backtick glissé dans un commentaire SQL casse
// `journal.ts`, et un import de tête faisait cesser TOUT ce fichier de se
// charger — « 0 test », sans qu'aucun contrôle ne nomme la cause. Le
// contrôle ④ existe précisément pour nommer cette cause : il doit donc
// survivre à l'accident qu'il décrit.

describe('EP-275 · l’interrupteur', () => {
  it('① SEULE LA VALEUR EXACTE BASCULE — tout le reste sert le moteur VIVANT', () => {
    // ── LA MISSION N'A PAS BOUGÉ, SON SENS A SUIVI LES FAITS (EP-305).
    //
    // Règle d'origine : à la moindre faute de frappe, on retombe sur le
    // moteur CONNU-BON — et le 2026-10-18 c'était `air`. Le 2026-10-31,
    // `air` est éteint depuis la veille, son dernier tir a échoué, et
    // toute la production sert `direct`. Mesuré en exerçant la fonction :
    // `undefined`, `""`, `DIRECT`, `dirct` tombaient tous sur le moteur
    // MORT — une faute de casse chez l'hébergeur y renvoyait la production.
    //
    // Le fail-safe pointe donc vers `direct`, et c'est `air` qui demande
    // désormais une intention EXACTE. Il reste atteignable, intact.
    expect(moteurChoisi('air'), 'l’option 2 n’est plus atteignable du tout').toBe('air')
    for (const v of [undefined, '', 'AIR', 'Air', ' air', 'air ', '1', 'true', 'direct']) {
      expect(moteurChoisi(v), `« ${String(v)} » ne sert pas le moteur vivant`).toBe('direct')
    }
  })

  it('② L’ÉCRAN DIT LEQUEL TRAVAILLE, en français et sans jargon', () => {
    // « air » et « direct » sont du vocabulaire de moteur. La personne qui
    // attend son application n'a pas à les connaître — mais elle doit savoir
    // qu'elle est sur une version à l'essai.
    expect(direLeMoteur('direct')).toContain('essai')
    expect(direLeMoteur('air')).toContain('habituelle')
    for (const m of ['air', 'direct'] as const) {
      expect(direLeMoteur(m), 'du vocabulaire de moteur fuit à l’écran').not.toMatch(
        /\bair\b|\bdirect\b/iu,
      )
    }
  })
})

describe('EP-275 · la trace en base', () => {
  it('③ LA COLONNE EXISTE, et son défaut est le moteur historique', async () => {
    const { SQL_TABLE, TABLE_GENERATIONS } = await import('../journal')
    expect(SQL_TABLE, 'rien n’enregistre quel moteur a produit la ligne').toContain('moteur text')
    // Les lignes antérieures viennent toutes de `air` : le défaut doit le
    // dire, sinon treize générations deviennent d'origine inconnue.
    expect(SQL_TABLE).toMatch(/moteur\s+text\s+not null\s+default\s+'air'/u)
    expect(SQL_TABLE).toContain(`public.${TABLE_GENERATIONS}`)
  })

  it('④ AUCUN BACKTICK DANS LA DDL — il fermerait le littéral qui la porte', () => {
    // ── DÉFAUT MESURÉ DEUX FOIS LE MÊME JOUR, PAR MOI.
    //
    // La DDL vit dans un littéral de gabarit TypeScript. Un backtick dans un
    // commentaire SQL le FERME, et le fichier cesse de compiler — avec une
    // erreur qui parle de « module declaration », à cent lieues de la cause.
    //
    // Le contrôle lit la SOURCE, pas la chaîne construite : une fois la
    // chaîne bâtie, le backtick fautif a déjà fait son dégât.
    const source = readFileSync(join(__dirname, '..', 'journal.ts'), 'utf8')
    const debut = source.indexOf('function sqlPour(')
    const fin = source.indexOf('function sqlVersionsPour(')
    const ddl = source.slice(debut, fin > debut ? fin : source.length)
    const lignesSql = ddl.split('\n').filter((l) => l.trimStart().startsWith('--'))
    const fautives = lignesSql.filter((l) => l.includes('`'))
    expect(
      fautives,
      `commentaire(s) SQL portant un backtick : ${fautives.map((l) => l.trim().slice(0, 50)).join(' | ')}`,
    ).toEqual([])
  })
})
