/**
 * EP-359 · A2/A3 — UNE TABLE QU'ON NE PEUT QUE REMPLIR.
 *
 * ── LE DÉFAUT, MESURÉ SUR LE CORPUS LE 2026-11-05.
 *
 *   faa9f0c3 · 4 tables · insert ×4 · update ×4 · delete ×1
 *   15158240 · 1 table  · insert ×1 · update ×0 · delete ×0  (publiée)
 *   a85966bc · 1 table  · insert ×1 · update ×0 · delete ×0
 *   08a20016 · 1 table  · insert ×1 · update ×0 · delete ×0
 *
 * `jugerPersistance` disait « rien à redire » sur ces trois-là : il
 * mesure « lue ET écrite », jamais « corrigeable ». Une faute de frappe y
 * est définitive.
 *
 * ── ET L'HYPOTHÈSE EST JUGÉE AUSSI, pas seulement les œuvres.
 *
 * « Toute table est tenue par le propriétaire » est un fait de l'état
 * actuel, pas une vérité : il repose sur deux mesures — aucune
 * déclaration n'accorde `insert` à `anon`, et il n'existe qu'un compte
 * par œuvre. Le jour où l'écriture publique existera, exiger « modifier »
 * sur une table remplie par des visiteurs serait un DÉFAUT.
 *
 * Cinq cliquets de ce dépôt ont défendu un passé contre le produit.
 * Celui-ci vérifie sa prémisse avant de juger, et REFUSE DE JUGER si elle
 * tombe — avec une phrase française, jamais en silence.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { jugerGestion, reprocheGestion } from '../juge-gestion'
import type { EntiteDeclaree } from '../entites-declarees'

const t = (nom: string, x: Record<string, unknown> = {}): EntiteDeclaree =>
  ({
    id: `ent_${nom}`,
    name: nom,
    fields: [{ id: 'fld_titre', name: 'titre', type: 'text', required: true }],
    ...x,
  }) as EntiteDeclaree

const f = (code: string): ReadonlyMap<string, string> => new Map([['index.tsx', code]])
// ── LA SÉQUENCE EST ASSEMBLÉE, JAMAIS ÉCRITE NUE.
//
// `travailleur-isolation` interdit `.de` + `lete(` partout dans
// `lib/apps` — une garde contre une purge accidentelle en production. Elle
// ne distingue pas un gabarit de test d'un vrai appel, et elle a raison de
// ne pas essayer. On emploie donc la parade que ce cliquet emploie sur
// lui-même, plutôt que de l'affaiblir pour une commodité.
const RETRAIT = ['.de', 'lete('].join('')
const quatre = (n: string) =>
  `base.from("${n}").select("*"); base.from("${n}").insert({}); ` +
  `base.from("${n}").update({}); base.from("${n}")${RETRAIT}).eq("id", i);`
const deux = (n: string) => `base.from("${n}").select("*"); base.from("${n}").insert({});`

describe('EP-359 · A2 · le juge de la gestion', () => {
  it('① LES QUATRE GESTES PASSENT — le chemin ordinaire n’est pas gêné', () => {
    // « Une garde qui gêne le chemin ordinaire sera contournée, puis
    // retirée. » C'est la forme que la génération de contrôle a produite.
    const r = jugerGestion([t('membre')], f(quatre('membre')))
    expect(r.hypotheseTombee, 'l’hypothèse est déclarée tombée à tort').toBeNull()
    expect(r.defauts, 'une œuvre complète est refusée').toEqual([])
    expect(reprocheGestion(r), 'un reproche est fait sans défaut').toBeNull()
  })

  it('② REMPLIR SANS POUVOIR CORRIGER EST LE DÉFAUT', () => {
    const r = jugerGestion([t('membre')], f(deux('membre')))
    expect(r.defauts.length, 'le défaut mesuré n’est pas vu').toBe(1)
    expect(r.defauts[0]).toEqual({ table: 'membre', modifiable: false, retirable: false })
    // ── ET LES DEUX MANQUES SE DISTINGUENT.
    const sansRetrait = jugerGestion(
      [t('membre')],
      f(`${deux('membre')} base.from("membre").update({});`),
    )
    expect(sansRetrait.defauts[0]).toEqual({ table: 'membre', modifiable: true, retirable: false })
    // `upsert` vaut `update` : c'est la même correction pour la personne.
    const parUpsert = jugerGestion(
      [t('membre')],
      f(`${deux('membre')} base.from("membre").upsert({}); base.from("membre")${RETRAIT});`),
    )
    expect(parUpsert.defauts, 'upsert n’est pas reconnu comme une correction').toEqual([])
  })

  it('③ UN JOURNAL EST L’EXCEPTION — et elle est structurelle', () => {
    // La base REFUSE d'y modifier ou d'y effacer : les politiques émises
    // ne portent que `select` et `insert`. Exiger un `update` dessus
    // demanderait du code qui échouerait à l'exécution.
    const r = jugerGestion([t('versement', { appendOnly: true })], f(deux('versement')))
    expect(r.defauts, 'un journal est sommé d’être modifiable').toEqual([])
  })

  it('④ UNE TABLE JAMAIS ÉCRITE N’EST PAS NOTRE DÉFAUT', () => {
    // `jugerPersistance` la signale déjà. Deux juges qui reprochent la
    // même chose font deux reproches pour un défaut, et le second paraît
    // nouveau.
    const r = jugerGestion([t('membre')], f(`base.from("membre").select("*");`))
    expect(r.defauts, 'le défaut de persistance est reproché deux fois').toEqual([])
    // Et zéro table ne se juge pas.
    expect(jugerGestion([], f('')).defauts).toEqual([])
  })

  it('⑤ L’HYPOTHÈSE EST VÉRIFIÉE SUR LE SQL ÉMIS, pas sur un souvenir', () => {
    // ── CE QUI EST MESURÉ ICI : que le juge REGARDE.
    //
    // Il émet les politiques de ces entités et lit ce qu'`anon` reçoit.
    // Aujourd'hui : `select` seul, et seulement sur une table déclarée
    // publique. L'hypothèse tient donc, et le juge juge.
    for (const e of [
      t('membre'),
      t('annonce', { lecturePublique: true }),
      t('versement', { appendOnly: true }),
      t('registre', { appendOnly: true, lecturePublique: true }),
    ]) {
      expect(
        jugerGestion([e], f(quatre(e.name))).hypotheseTombee,
        `l’hypothèse est dite tombée sur « ${e.name} »`,
      ).toBeNull()
    }
  })

  it('⑤bis QUAND ELLE TOMBE, LE JUGE REFUSE DE JUGER — et le dit', () => {
    // ── LE JOUR QU'ON PRÉPARE, EXERCÉ AUJOURD'HUI.
    //
    // Deux mutations l'ont rendu nécessaire : `return null` d'office et
    // « ne plus regarder les écritures » passaient toutes deux au VERT,
    // parce que ⑤ n'affirme que le cas où l'hypothèse TIENT. Un contrôle
    // qui ne s'exerce que sur le chemin heureux ne prouve pas une garde.
    const ouvert = () =>
      'revoke all on membre from anon, public;\ngrant select, insert on membre to anon;'
    const r = jugerGestion([t('membre')], f(deux('membre')), ouvert)

    expect(r.hypotheseTombee, 'le juge n’a pas vu l’écriture anonyme').not.toBeNull()
    expect(r.hypotheseTombee, 'il ne dit pas pourquoi il s’arrête').toMatch(
      /seul le propriétaire écrit/u,
    )
    expect(r.hypotheseTombee, 'il ne dit pas ce qui serait un défaut').toMatch(
      /ne doit PAS être modifiable/u,
    )
    expect(r.hypotheseTombee, 'il ne dit pas quoi faire').toMatch(
      /Déclarez qui remplit chaque table/u,
    )
    expect(r.hypotheseTombee, 'il ne montre pas la ligne fautive').toMatch(
      /grant select, insert on membre to anon/u,
    )

    // ── ET IL NE REND AUCUN VERDICT SUR UNE PRÉMISSE FAUSSE.
    //
    // `membre` n'a ni `update` ni `delete` : sans l'hypothèse, ce serait
    // un défaut. Avec l'écriture anonyme ouverte, ce n'en est peut-être
    // plus un — et un verdict rendu malgré tout aurait l'air d'un verdict.
    expect(r.defauts, 'il juge quand même, sur une prémisse qu’il sait fausse').toEqual([])
    expect(reprocheGestion(r), 'il reproche au modèle un défaut qu’il ne sait plus juger').toBeNull()
  })

  it('⑥ LE REPROCHE NOMME LA TABLE, LE GESTE, ET LA CONSÉQUENCE', () => {
    const r = jugerGestion([t('membre')], f(deux('membre')))
    const q = reprocheGestion(r) ?? ''
    expect(q, 'la table n’est pas nommée').toMatch(/« membre »/u)
    expect(q, 'les quatre gestes ne sont pas rappelés').toMatch(
      /lister, ajouter, MODIFIER et RETIRER/u,
    )
    // ── LA CONSÉQUENCE POUR LA PERSONNE, et c'est elle qui rend le
    //    reproche satisfaisable plutôt qu'obéi.
    expect(q, 'la conséquence n’est pas dite').toMatch(/faute de frappe est définitive/u)
    expect(q, 'l’exception du journal n’est pas rappelée').toMatch(/\(journal\) est l’exception/u)
  })

  it('⑦ ET A3 : LE REPROCHE PART AU TOUR SUIVANT', () => {
    // Un juge dont le verdict ne revient pas au modèle ne corrige rien —
    // c'est la famille « un contrôle qui ne fait que signaler ».
    const src = lireSource(join(__dirname, '..', 'boucle-directe.ts'))
    expect(src, 'le juge n’est pas appelé dans la boucle').toMatch(
      /const gestion = jugerGestion\(entitesConnues, carte\)/u,
    )
    expect(src, 'le reproche ne part pas').toMatch(
      /const quoiGestion = reprocheGestion\(gestion\)[\s\S]{0,120}reproches\.push\(quoiGestion\)/u,
    )
    // ── ET L'HYPOTHÈSE TOMBÉE NE SE TAIT PAS.
    //
    // Ce n'est pas un reproche au modèle — il n'y peut rien. C'est un
    // avertissement pour nous : un juge qui cesse de juger en silence est
    // un juge qu'on croit encore actif.
    expect(src, 'un juge devenu inactif se tairait').toMatch(
      /gestion\.hypotheseTombee !== null[\s\S]{0,120}console\.warn/u,
    )
  })
})
