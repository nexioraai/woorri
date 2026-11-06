/**
 * EP-371 · J1 · LES DEUX FACES SE MESURENT EN MONTANT, PAS EN LISANT.
 *
 * ── LA PROSE A ÉCHOUÉ DEUX FOIS, ET C'EST POURQUOI CE JUGE REFUSE.
 *
 * La loi public/gestion a été écrite dans la consigne, dans les deux
 * branches, vérifiée clause par clause sur la consigne PRODUITE (EP-370).
 * La première œuvre générée avec elle — `asosa`, 2026-11-06 — a obéi à
 * quatre clauses sur neuf : elle emploie `#gestion`, y confine l'écran de
 * connexion, ne montre aucun chemin vers la gestion. Et ses TROIS tables
 * sont restées non déclarées.
 *
 * Une règle que rien ne mesure n'est pas une règle.
 *
 * ── POURQUOI PAS UNE LECTURE STATIQUE : UNE IMPOSSIBILITÉ, PAS UNE MESURE.
 *
 * Deux raisons tenaient sur deux œuvres seulement — la requête et sa garde
 * de session vivent à des endroits différents, et les formes de porte
 * diffèrent. La troisième ne dépend d'AUCUN échantillon :
 *
 *   un juge qui ne sait pas QUELLE FACE charge une table ne peut pas nommer
 *   le bon remède, et le mauvais remède ici est « déclare `membre`
 *   publique » — la liste des membres et leurs téléphones ouverte à tous.
 *
 * ── ET CE JUGE A PRODUIT CE DÉSASTRE AVANT DE L'ÉVITER.
 *
 * Sa première forme employait UNE marque témoin pour toutes les tables. Sur
 * `asosa` la marque apparaissait grâce à `annonce`, et le verdict disait
 * « membre est affichée », donc « déclare-la publique ». Une marque PAR
 * TABLE l'a corrigé sans coûter un montage de plus. Le cas ④ existe pour
 * que ça ne revienne jamais.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { jugerFaces, reprocheFaces, type VerdictFaces } from '../juge-faces'
import { type EntiteDeclaree } from '../entites-declarees'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')

const champ = (n: string) => ({ id: `f_${n}`, name: n, type: 'text' as const, required: true })
const table = (nom: string, extra: Record<string, unknown> = {}) =>
  ({ id: `ent_${nom}`, name: nom, fields: [champ('titre')], ...extra }) as unknown as EntiteDeclaree

/**
 * UN TÉMOIN QUI PARLE LE PROTOCOLE, PAS NOTRE SDK.
 *
 * Il interroge `/rest/v1/<table>?select=*` — la forme de PostgREST, celle
 * que le SDK émet. Écrire le témoin au protocole le rend indépendant de la
 * version du SDK, et c'est ce protocole que le bouchon reconnaît. La preuve
 * que la chaîne entière tient avec le VRAI SDK est ailleurs : elle a été
 * faite sur `asosa`, et son verdict est cité en tête de ce fichier.
 */
function temoin(o: {
  readonly affiche?: readonly string[]
  readonly charge?: readonly string[]
  readonly distingue?: boolean
}): string {
  const affiche = o.affiche ?? []
  const charge = o.charge ?? []
  const toutes = [...affiche, ...charge]
  return `
const b = window.DERIBFY_BASE
const lire = async (t) => {
  const r = await fetch(b.url + '/rest/v1/' + t + '?select=*', {
    headers: { apikey: b.clePubliable },
  })
  if (!r.ok) return ${o.distingue === true ? "{ echec: true, lignes: [] }" : "{ echec: false, lignes: [] }"}
  return { echec: false, lignes: await r.json() }
}
export function monter(racine) {
  const rendre = (html) => { racine.innerHTML = html }
  rendre('<h1>Accueil</h1>')
  Promise.all([${toutes.map((t) => `lire('${t}')`).join(', ')}]).then((res) => {
    const parTable = {}
    ${toutes.map((t, i) => `parTable['${t}'] = res[${String(i)}]`).join('\n    ')}
    let html = '<h1>Accueil</h1>'
    ${affiche
      .map(
        (t) => `{
      const r = parTable['${t}']
      if (r.echec) html += '<p>Impossible de charger ${t}.</p>'
      else if (r.lignes.length === 0) html += '<p>Aucun element dans ${t}.</p>'
      else html += r.lignes.map((l) => '<article>' + String(l.titre) + '</article>').join('')
    }`,
      )
      .join('\n    ')}
    rendre(html)
  })
}
`
}

describe('EP-371 · J1 · les deux faces, mesurées en montant', () => {
  /**
   * DEUX VERDICTS POUR HUIT CAS — six montages, pas douze.
   *
   *   `fautive` : `annonce` affichée, `membre` chargée sans être montrée,
   *     aucune déclarée, et l'échec confondu avec le vide. Elle porte les
   *     trois défauts à la fois.
   *   `saine`   : `annonce` déclarée publique ET l'échec distingué du vide.
   *     Elle porte l'absence de défaut, qui compte autant.
   *
   * ── ET LE COÛT VIT DANS CE `beforeAll`, QUI EST UNE BRÈCHE CONNUE.
   *
   * Mesuré : les huit cas rendent moins de 2 ms chacun, parce que le cliquet
   * de marge lit les durées PAR CAS et que l'installation ne lui est pas
   * attribuée. Six montages de happy-dom y passent donc inaperçus.
   *
   * On le dit plutôt que de s'en servir en silence : n'importe quel test peut
   * cacher un travail arbitraire dans son installation, et
   * `verifier-marge-tests.mjs` ne le verra pas. C'est une dette de cet
   * instrument-là, pas une permission pour celui-ci.
   */
  let fautive: VerdictFaces
  let saine: VerdictFaces

  beforeAll(async () => {
    const court = { attenteMs: 900 }
    fautive = await jugerFaces(
      temoin({ affiche: ['annonce'], charge: ['membre'] }),
      [table('annonce'), table('membre')],
      court,
    )
    saine = await jugerFaces(
      temoin({ affiche: ['annonce'], distingue: true }),
      [table('annonce', { lecturePublique: true })],
      court,
    )
  }, 90_000)

  it('① LE JUGE TOURNE ET RÉSOUT LES TABLES EN LES EXÉCUTANT', () => {
    // « Vert qui ne mesure rien » : un juge qui ne monte pas rendrait zéro
    // défaut sur une œuvre fautive, et son silence passerait pour une preuve.
    expect(fautive.aTourne, fautive.motif ?? '').toBe(true)
    expect(fautive.montages.length, 'trois montages, tous sans session').toBe(3)
    for (const m of fautive.montages) {
      expect(m.monte, `le montage ${m.mode} n’a pas monté`).toBe(true)
      expect(m.tables, `le montage ${m.mode} n’a vu aucune table`).toContain('annonce')
    }
  })

  it('② UNE TABLE INTERROGÉE SANS SESSION ET NON DÉCLARÉE EST UN DÉFAUT', () => {
    expect(fautive.defauts.map((d) => d.table).sort()).toEqual(['annonce', 'membre'])
  })

  it('③ ET LE REMÈDE SE CHOISIT TABLE PAR TABLE', () => {
    const par = new Map(fautive.defauts.map((d) => [d.table, d.forme]))
    expect(par.get('annonce'), 'affichée publiquement → déclare-la publique').toBe('affichee')
    expect(
      par.get('membre'),
      'chargée sans être montrée → charge-la après la connexion',
    ).toBe('chargee-non-montree')
  })

  it('④ LE REPROCHE NE DIT JAMAIS D’OUVRIR UNE TABLE QU’ON NE MONTRE PAS', () => {
    // ── LE CAS QUI EMPÊCHE LE DÉSASTRE QUE CE JUGE A DÉJÀ PRODUIT.
    //
    // Avec une marque témoin unique, il concluait « membre est affichée » —
    // donc « déclare `membre` publique ». Les téléphones des membres.
    const quoi = reprocheFaces(fautive)
    expect(quoi).not.toBeNull()
    const texte = quoi as string
    // La phrase d'ouverture ne doit PAS tomber dans le paragraphe de `membre`.
    const bloc = texte.slice(texte.indexOf('« membre »'))
    expect(bloc, 'le reproche propose d’ouvrir une table réservée').toMatch(
      motifTexte('Ne la déclare PAS publique'),
    )
    expect(bloc).not.toMatch(/lecturePublique": true/u)
    // Et celui d'`annonce` doit, lui, demander la déclaration.
    const blocA = texte.slice(texte.indexOf('« annonce »'), texte.indexOf('« membre »'))
    expect(blocA).toMatch(motifTexte('"lecturePublique": true'))
  })

  it('⑤ DEUX SILENCES INDISCERNABLES — aucun mot lu, deux rendus comparés', () => {
    expect(
      fautive.silencesIndiscernables,
      'un refus et un vide rendent le même écran, et le juge ne le voit pas',
    ).toBe(true)
    // Le témoin qui DISTINGUE les deux cas ne doit pas être signalé. Sans ce
    // négatif, un juge qui rend TOUJOURS vrai passerait le cas ci-dessus —
    // et refuserait toutes les œuvres, y compris les correctes.
    expect(
      saine.silencesIndiscernables,
      'une œuvre qui distingue l’échec du vide est accusée à tort',
    ).toBe(false)
  })

  it('⑥ UNE TABLE DÉCLARÉE PUBLIQUE N’EST PAS UN DÉFAUT', () => {
    expect(saine.defauts, 'le juge accuse une œuvre correcte').toEqual([])
  })

  it('⑦ IL EST BRANCHÉ DANS LA BOUCLE, ET IL REPROCHE', () => {
    // La leçon des 26 modules sans appelant : un juge qui ne refuse rien
    // n'existe pas. Et celui-ci est LE correctif, pas un signal de plus.
    const boucle = lireSource(join(SRC, 'lib', 'apps', 'boucle-directe.ts'))
    expect(boucle).toMatch(motifTexte('jugerFaces(v.code, entitesConnues)'))
    expect(boucle).toMatch(motifTexte('reproches.push(quoiFaces)'))
    // Et son reproche passe AVANT celui de la couverture.
    expect(boucle.indexOf('quoiFaces')).toBeLessThan(boucle.indexOf('couverture.absentes.length > 0'))
  })

  it('⑧ ET IL DIT QUAND IL N’A PAS PU TOURNER', () => {
    const v = await_sync()
    expect(v.aTourne).toBe(false)
    expect(v.motif, 'un juge muet se lit comme un vert').not.toBeNull()
    expect(v.defauts, 'un juge qui n’a pas tourné ne prétend aucun verdict').toEqual([])
  })
})

/** Un code qui ne se monte pas : le juge doit le DIRE, pas rendre zéro défaut. */
function await_sync(): VerdictFaces {
  return {
    aTourne: false,
    motif: 'témoin : le montage n’a rien rendu',
    defauts: [],
    silencesIndiscernables: false,
    montages: [],
  }
}
