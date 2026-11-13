// CONTRAT V2 — les quatre décisions du 2026-11-14, chacune avec son cliquet.
//
//   ① CLÉS : le modèle n'écrit jamais de clé. Deribfy la fabrique, déterministe,
//      dans la grammaire, unique par emplacement — sur TOUTES les fixtures
//      (Hayine ×9, jeu aveugle ×24, base synthétique). Un `{ $t }` écrit par le
//      modèle est refusé ; CLE_INVALIDE n'existe plus.
//   ② CONNEXION : `emit connexion` porte une charge typée { identifiant, secret }.
//      L'écran 20 du jeu aveugle (08a20016 · Connexion) n'est plus refusé que
//      pour ses défauts réels (formulaire natif, Bouton `libellé`) ; sans eux,
//      il est accepté. Aucun CHAMP_SANS_EFFET sur un champ de connexion.
//   ③ LES DÉFAUTS DU JEU AVEUGLE QUI REVIENNENT AU CONTRAT, chacun sur son écran :
//      SUBMIT_SANS_LIGNE (9), DONNEE_PRIVEE_EXPOSEE (6), MENTION_DEMO (6, 14, 15),
//      MONTANT_EN_DUR (6), enfants d'un formulaire refusé jugés (20).
//   ④ LES NOMS RÉPARABLES (A3) : 1, 16px, 2rem, 14px, windowLocation, appeler ;
//      une couleur brute ne reçoit aucune proposition.
// Rouge-puis-vert : chaque règle de ③ désactivée → son cas rouge ; la clé
// fabriquée sans mise en camelCase → ① rouge ; la charge non lue → ② rouge ;
// l'échelle des pas retirée → ④ rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENEMENTS, FAIRE, JETONS, MOTIF, identifiantsDuCatalogue, schemaJsonDuContrat } from '../catalogue'
import { lePlusProche } from '../proche'
import { cleDe, textesDe } from '../textes'
import { CLASSES, validerFragment, type Contexte } from '../validateur'
import { base } from './specs-synthetiques'

type O = Record<string, unknown>
const F = join(__dirname, 'fixtures')
const json = (f: string) => JSON.parse(readFileSync(join(F, f), 'utf8'))
const AVEUGLE = json('aveugle-a1.specs.json') as { contextes: Record<string, Contexte>; ecrans: { n: number; oeuvre: string; fragment: O }[] }
const aveugle = (n: number) => AVEUGLE.ecrans.find((e) => e.n === n)!
const valider = (n: number, f?: O) => validerFragment(f ?? aveugle(n).fragment, AVEUGLE.contextes[aveugle(n).oeuvre]!, { complet: true })
const classes = (v: { refus: readonly { classe: string }[] }) => [...new Set(v.refus.map((r) => r.classe))].sort()
const tousLesEcrans = (): unknown[] => [
  ...AVEUGLE.ecrans.map((e) => e.fragment.ecran),
  ...['oeuvre-94cf0489.specs.json', 'oeuvre-5b1c20bc.specs.json'].flatMap((f) => (json(f).ecrans as { fragment: O }[]).map((e) => e.fragment.ecran)),
  ...(base().ecrans as unknown[]),
]
function parcourir(x: unknown, f: (o: O) => void) {
  if (Array.isArray(x)) for (const y of x) parcourir(y, f)
  else if (typeof x === 'object' && x !== null) { f(x as O); for (const v of Object.values(x)) parcourir(v, f) }
}

describe('contrat V2', () => {
  it('① clés fabriquées : déterministes, dans la grammaire, uniques — et jamais écrites par le modèle', () => {
    let n = 0
    for (const e of tousLesEcrans()) {
      const a = textesDe(e)
      const b = textesDe(structuredClone(e))
      expect(b).toEqual(a)
      for (const t of a) expect(MOTIF.cle.test(t.cle), t.cle).toBe(true)
      expect(new Set(a.map((t) => t.cle)).size).toBe(a.length)
      n += a.length
    }
    // Mesuré : 530 textes dans les fixtures.
    expect(n).toBeGreaterThan(500)
    expect(cleDe('ecran-public', 'corps[2].enfants[0].libelle')).toBe('ecranPublic.corps2.enfants0.libelle')
    expect(Object.keys(CLASSES)).not.toContain('CLE_INVALIDE')
    expect(identifiantsDuCatalogue().has('$t')).toBe(false)
    expect(JSON.stringify(schemaJsonDuContrat())).not.toContain('"$t"')
    const v = validerFragment({ ecran: { route: 'aide', acces: 'visiteur', titre: { $t: 'aide.titre' }, corps: [{ composant: 'Phrase', texte: 'Aide' }] } }, AVEUGLE.contextes.a13f8f9f!)
    expect(v.refus.map((r) => [r.classe, r.chemin])).toEqual([['TYPE_INVALIDE', 'ecran.titre']])
  })

  it('② connexion : l’écran 20 n’est refusé que pour ses défauts réels, puis accepté sans eux', () => {
    expect(classes(valider(20))).toEqual(['FORMULAIRE_NATIF', 'PROP_INCONNUE', 'PROP_MANQUANTE'])
    const f = structuredClone(aveugle(20).fragment)
    parcourir(f, (o) => {
      if (o.composant === 'Formulaire') o.composant = 'Pile'
      if ('libellé' in o) { o.libelle = o['libellé']; delete o['libellé'] }
    })
    expect(valider(20, f).refus).toEqual([])
    // Aucun champ de connexion « sans effet » sur les cinq écrans de connexion du jeu aveugle.
    for (const n of [2, 3, 5, 11, 20]) expect(valider(n).refus.filter((r) => r.classe === 'CHAMP_SANS_EFFET'), `écran ${String(n)}`).toEqual([])
    // La charge est typée : sans secret, refusée — et le mot de passe saisi n'est plus lu par rien.
    const g = structuredClone(f)
    parcourir(g, (o) => { if (o.evenement === 'connexion') o.charge = (o.charge as O[]).slice(0, 1) })
    expect(classes(valider(20, g))).toEqual(['CHAMP_SANS_EFFET', 'CHARGE_INVALIDE'])
  })

  it('③ les défauts du jeu aveugle revenus au contrat, chacun sur son écran', () => {
    const de = (n: number, classe: string) => valider(n).refus.filter((r) => r.classe === classe).map((r) => r.chemin)
    // 9 : « Enregistrer » en modification, hors de toute ligne (membres, puis annonces).
    expect(de(9, 'SUBMIT_SANS_LIGNE')).toHaveLength(2)
    // 6 : la liste des clientes et leurs mesures, montrées au visiteur.
    expect(de(6, 'DONNEE_PRIVEE_EXPOSEE').length).toBeGreaterThan(0)
    // 6, 14, 15 : « (démo) », « Démonstration ».
    for (const n of [6, 14, 15]) expect(de(n, 'MENTION_DEMO').length, `écran ${String(n)}`).toBeGreaterThan(0)
    // 6 : les huit fourchettes de prix du catalogue, écrites en dur.
    expect(de(6, 'MONTANT_EN_DUR')).toHaveLength(8)
    // 20 : le Bouton `libellé` d'un formulaire refusé est jugé.
    expect(de(20, 'PROP_INCONNUE')).toEqual(['ecran.corps[0].enfants[1].enfants[3].libellé'])
    // Une table publique se lit au visiteur ; une colonne secrète ne se lit nulle part.
    const ctx: Contexte = { ...AVEUGLE.contextes['44ca6bbe']!, tables: AVEUGLE.contextes['44ca6bbe']!.tables.map((t) => ({ ...t, publique: true })) }
    expect(validerFragment(aveugle(6).fragment, ctx, { complet: true }).refus.filter((r) => r.classe === 'DONNEE_PRIVEE_EXPOSEE')).toEqual([])
    const secret = { ecran: { route: 'espace-gestion', acces: 'gestion', titre: 'Utilisateurs', corps: [{ composant: 'Lignes', donnee: { $data: 'table.utilisateur' }, vide: 'Aucun', modele: [{ composant: 'Valeur', donnee: { $data: 'ligne.mot_de_passe' } }] }] } }
    expect(validerFragment(secret, AVEUGLE.contextes['35ed32c1']!, { complet: true }).refus.map((r) => r.classe)).toEqual(['COLONNE_SECRETE'])
  })

  it('④ les noms réparables reçoivent leur proposition ; une couleur brute, aucune', () => {
    expect(lePlusProche('1', ['page', 'section', 'encart'])).toBe('page')
    expect(lePlusProche('16px', JETONS.espace)).toBe('m')
    expect(lePlusProche('2rem', JETONS.espace)).toBe('xl')
    expect(lePlusProche('14px', JETONS.taille)).toBe('corps')
    expect(lePlusProche('windowLocation', FAIRE)).toBe('navigate')
    expect(lePlusProche('appeler', EVENEMENTS)).toBe('contacter')
    expect(lePlusProche('#ff0000', JETONS.couleur)).toBeNull()
    expect(lePlusProche('rgb(255, 0, 0)', JETONS.couleur)).toBeNull()
  })
})
