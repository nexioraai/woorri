/**
 * CLIQUET — ON SURVEILLE LE COUT, ON NE L'OPPOSE PAS A L'UTILISATEUR.
 *
 * « Si ce que demande l'utilisateur coute plus de 6 $, alors d'apres toi il
 *   faut empecher ? Retire-moi ce putain de plafond insense. »
 *
 * Le plafond etait la meme erreur que les 40 000 jetons : un nombre que
 * j'avais choisi, qui ne mesure rien, et qui refuse de construire. Ces tests
 * tiennent les deux moities de la correction — plus de plafond, et un cout
 * reellement consigne.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SQL_TABLE } from '../journal'
import { sansCommentaires } from './sans-commentaires'

const RACINE = join(process.cwd(), '..', '..')
const lire = (p: string): string => readFileSync(join(RACINE, p), 'utf8')

describe('CLIQUET — aucun plafond n ecrase une demande', () => {
  it('le moteur ne borne plus la depense par defaut', () => {
    const MJS = sansCommentaires(lire('benchmarks/air-emission/moteur.mjs'))
    expect(MJS).toContain('plafondUsd = Infinity')
    const TS = sansCommentaires(lire('apps/web/src/lib/apps/moteur.ts'))
    // Le site ne passe AUCUN plafond : c'est par la que celui de 6 $ entrait.
    expect(TS).not.toMatch(/plafondUsd:\s*\w/u)
    expect(TS).not.toContain('PLAFOND_USD_PAR_APPLICATION')
  })
})

describe('CLIQUET — chaque generation laisse une ligne', () => {
  const POUR = sansCommentaires(lire('apps/web/src/lib/apps/pour.ts'))

  it('le journal est ecrit sur le chemin payant, reussite OU refus', () => {
    expect(POUR).toContain('journaliser({')
    // L'appel precede les deux sorties — succes et refus — donc il arrive
    // dans les deux cas. Le verifier par position plutot que par confiance :
    // un refus non journalise cacherait justement la depense perdue.
    const i = POUR.indexOf('journaliser({')
    expect(i).toBeGreaterThan(0)
    expect(POUR.indexOf('emission.ok && emission.document')).toBeGreaterThan(i)
    expect(POUR.indexOf('incompris: true', i)).toBeGreaterThan(i)
  })

  it('il porte le cout ET les jetons reellement consommes', () => {
    for (const champ of ['coutUsd: emission.coutUsd', 'jetonsEntree: emission.jetons.entree', 'jetonsSortie: emission.jetons.sortie']) {
      expect(POUR, champ).toContain(champ)
    }
  })
})

describe('CLIQUET — le SQL et le code ecrivent les MEMES colonnes', () => {
  // « Une liste ecrite deux fois diverge. » Ici les deux listes sont le SQL
  // de la table et l'insertion qui la remplit : une colonne ajoutee d'un
  // cote seulement echouerait EN LIGNE, et en silence, puisque le journal
  // avale ses erreurs pour ne jamais casser une generation.
  const JOURNAL = sansCommentaires(lire('apps/web/src/lib/apps/journal.ts'))

  it('toute colonne inseree existe dans le SQL', () => {
    const bloc = JOURNAL.slice(JOURNAL.indexOf("from('app_generations').insert({"))
    const inserees = [...bloc.slice(0, bloc.indexOf('})')).matchAll(/^\s*([a-z_]+):/gmu)].map((m) => m[1])
    expect(inserees.length).toBeGreaterThan(5)
    for (const c of inserees) expect(SQL_TABLE, `colonne ${c}`).toContain(c)
  })

  it('la table refuse l acces anonyme', () => {
    // Le depot a deja trouve une ecriture anonyme REELLE par les privileges
    // par defaut sur les tables. Ce n'est pas une precaution theorique.
    expect(SQL_TABLE).toContain('enable row level security')
    expect(SQL_TABLE).toMatch(/revoke all on public\.app_generations from anon/u)
  })
})

describe('CLIQUET — le journal ne casse jamais ce qu il observe', () => {
  it('le client Supabase est charge PARESSEUSEMENT', () => {
    // MESURE : un import de haut niveau de  — qui LEVE quand
    // la clef de service manque — a fait cesser de se charger DEUX fichiers
    // de test, en silence. 112 cas annonces, 99 reellement executes, et le
    // compte restait vert. Un observateur qui casse ce qu il observe.
    const J = sansCommentaires(lire('apps/web/src/lib/apps/journal.ts'))
    expect(J).not.toMatch(/^import .*supabase-admin/mu)
    expect(J).toMatch(/await import\('@\/lib\/supabase-admin'\)/u)
  })
})

describe('CLIQUET — l administration ouvre bien la page', () => {
  it('une carte cliquable mene aux applications generees', () => {
    const ADMIN = sansCommentaires(lire('apps/web/src/app/admin/page.tsx'))
    expect(ADMIN).toContain('href="/admin/applications"')
  })

  it('la page dit POURQUOI elle est vide quand la table manque', () => {
    // Une page qui afficherait zero sans rien dire ferait croire que
    // personne n'a jamais rien genere.
    const PAGE = sansCommentaires(lire('apps/web/src/app/admin/applications/page.tsx'))
    expect(PAGE).toContain('tableAbsente')
    expect(PAGE).toContain('Payé pour rien')
  })
})
