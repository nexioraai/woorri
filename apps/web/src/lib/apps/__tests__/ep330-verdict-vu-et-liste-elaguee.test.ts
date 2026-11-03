/**
 * EP-330 · LE VERDICT SE VOIT, ET L'ÉLAGAGE SE DIT.
 *
 * ── A — POURQUOI UN ÉCRAN, ET POURQUOI DEUX.
 *
 * Le verdict de persistance voyageait dans le `Resultat`, était journalisé,
 * et AUCUN écran ne le lisait. Une pièce détachée de plus — sur le SEUL
 * défaut dont la conséquence tombe APRÈS la livraison.
 *
 * Les quatre autres juges se disent à la livraison et c'est assez : des
 * jetons inexistants tuent au démarrage, un contrôle mort se voit, une
 * couverture partielle se lit. Une table en mémoire, elle, MARCHE à
 * l'écran — c'est le rechargement qui l'apprend, à la personne qui vient
 * de perdre sa saisie.
 *
 * · À LA LIVRAISON, parce que c'est le moment où l'on décide de garder.
 * · DANS L'ATELIER, parce que la conséquence tombe plus tard et que c'est
 *   là qu'on revient — dans le panneau des DONNÉES, à côté des
 *   identifiants, l'endroit où l'on vient chercher ses données.
 *
 * ── B — POURQUOI L'ÉLAGAGE SE JOURNALISE.
 *
 * « La disponibilité de CHAQUE œuvre dépend de la validité de TOUTES les
 * autres entrées. » Une entrée morte ne casse pas son œuvre : elle les
 * casse TOUTES, parce que PostgREST construit UN SEUL cache pour toute la
 * liste (mesuré le 2026-11-03 : 6 exposés, 4 inexistants, PGRST002 partout).
 *
 * L'élagage n'est donc pas un entretien, c'est une RÉPARATION. Et une
 * réparation muette ne s'explique pas le jour où l'on cherche pourquoi une
 * œuvre a disparu de la liste.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { listeAvecSchema, schemasMorts } from '../poser-oeuvre'
import { lireSource } from './lire-source'

const WEB = join(__dirname, '..', '..', '..')

describe('EP-330 · A · le verdict se voit', () => {
  it('① LA ROUTE DU COMPTE LE REND, pour les trois états', () => {
    // ── LES TROIS ÉTATS, PAS SEULEMENT `actif`.
    //
    // Une œuvre pas encore publiée peut DÉJÀ être amnésique, et c'est le
    // meilleur moment pour l'apprendre : avant de la publier.
    const src = lireSource(join(WEB, 'app', 'api', 'generateur', 'compte', 'route.ts'))
    expect(src, 'la route ne lit pas le verdict journalisé').toContain('sections_acquises')
    expect(src, 'le verdict ne remonte pas').toMatch(/persistance/u)
    const rendus = [...src.matchAll(/enMemoire/gu)].length
    expect(rendus, 'le verdict n’accompagne pas les trois états').toBeGreaterThanOrEqual(4)
  })

  it('② L’ATELIER L’AFFICHE — là où l’on revient chercher ses données', () => {
    const src = lireSource(join(WEB, 'app', 'atelier', '[id]', 'page.tsx'))
    expect(src, 'l’atelier ne lit pas le verdict').toMatch(/compte\?\.enMemoire/u)
    // ── ET IL DIT LE SENS QUI MANQUE, pas « il y a un problème ».
    //
    // « lue, jamais écrite » et « écrite, jamais lue » appellent des
    // corrections DIFFÉRENTES. Les confondre renvoie au hasard.
    expect(src, 'l’atelier ne distingue pas lue-non-écrite').toMatch(/lue, jamais écrite/u)
    expect(src, 'l’atelier ne distingue pas écrite-non-lue').toMatch(/écrite, jamais lue/u)
    // ET IL DIT QUOI FAIRE : un avertissement sans geste se contemple.
    expect(src, 'l’atelier ne dit pas comment corriger').toMatch(/Demandez la correction/u)
  })

  it('③ LA LIVRAISON LE DIT AUSSI — c’est là qu’on décide de garder', () => {
    const src = lireSource(
      join(WEB, 'components', 'onboarding', 'ConversationApplication.tsx'),
    )
    expect(src, 'l’écran de livraison ne lit pas le verdict').toMatch(/d\.persistance/u)
    expect(src, 'la livraison ne nomme pas la conséquence').toMatch(
      /disparaîtra au rechargement/u,
    )
  })
})

describe('EP-330 · B · l’élagage se dit', () => {
  const porte = (l: string): string[] => [`pgrst.db_schemas=${l}`]

  it('④ LES MORTS SONT NOMMÉS, pas seulement retirés', () => {
    expect(
      schemasMorts(porte('public, graphql_public, oeuvre_a, oeuvre_morte'), [
        'public',
        'graphql_public',
        'oeuvre_a',
      ]),
    ).toEqual(['oeuvre_morte'])
    // RIEN À DIRE QUAND RIEN N'EST MORT : un journal qui parle pour ne rien
    // dire est un journal qu'on apprend à ne plus lire.
    expect(schemasMorts(porte('public, oeuvre_a'), ['public', 'oeuvre_a'])).toEqual([])
  })

  it('⑤ CE QUI EST NOMMÉ EST EXACTEMENT CE QUI EST RETIRÉ', () => {
    // ── LES DEUX FONCTIONS DOIVENT S'ACCORDER, sinon le journal ment.
    //
    // Déduire l'élagage en comparant deux chaînes serait le refaire à
    // l'envers ; les faire diverger ferait journaliser un retrait qui n'a
    // pas eu lieu, ou taire celui qui a eu lieu.
    const avant = porte('public, oeuvre_a, oeuvre_morte, oeuvre_autre_morte')
    const existants = ['public', 'oeuvre_a', 'oeuvre_neuve']
    const morts = schemasMorts(avant, existants)
    const apres = listeAvecSchema(avant, 'oeuvre_neuve', existants)
    expect(morts).toEqual(['oeuvre_morte', 'oeuvre_autre_morte'])
    expect(apres).toBe('public, oeuvre_a, oeuvre_neuve')
    for (const m of morts) {
      expect(apres ?? '', `« ${m} » est annoncé retiré mais reste dans la liste`).not.toContain(m)
    }
  })

  it('⑥ LA PUBLICATION LE JOURNALISE, et le retour le porte', () => {
    const pose = lireSource(join(WEB, 'lib', 'apps', 'poser-oeuvre.ts'))
    expect(pose, 'le retour ne porte pas ce qui a été élagué').toMatch(/readonly elagues/u)
    // LES DEUX SORTIES VICTORIEUSES le portent : celle qui écrit la liste
    // ET celle qui n'avait rien à écrire. Une seule des deux suffirait à
    // perdre l'information la moitié du temps.
    expect(
      [...pose.matchAll(/return \{ ok: true[^}]*elagues[^}]*\}/gu)].length,
      'un chemin de succès ne porte pas l’élagage',
    ).toBe(2)
    const publier = lireSource(
      join(WEB, 'app', 'api', 'generateur', 'publier', 'route.ts'),
    )
    expect(publier, 'la publication n’écrit rien quand elle élague').toMatch(
      /console\.warn[\s\S]{0,200}elagu/u,
    )
  })
})
