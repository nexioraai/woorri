/**
 * É1 — LA LECTURE PAR CLÉ : UNE ligne pour qui connaît sa clé, jamais la liste.
 *
 * Le mécanisme SQL est prouvé sur base jetable (É0, 26/26 ; SQL émis, 8/8,
 * 2026-11-27). Ce fichier garde ce qui se vérifie sans base : la forme émise,
 * le refus par défaut, et le passage par la liste blanche du migrateur — y
 * compris le refus de toute variante qui ne serait pas le gabarit exact.
 */
import { describe, expect, it } from 'vitest'
import { emettrePolitiquesSql, emettreSchemaSql, lectureParCleEmise } from '@deribfy/compiler'
import { instructionsDe, verifierMigration } from '../migration-sql'
import { blocBase, lectureParCleLue, REGLE_LECTURE_PAR_CLE } from '../entites-declarees'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { eprouverParCle } from '../epreuve-par-cle'
import { fermerCeQuiFuit, jugerLecturePublique } from '../juge-lecture-publique'

const colis = {
  id: 'ent_colis',
  fields: [
    { id: 'fld_numero_suivi', type: 'text', unique: true },
    { id: 'fld_statut', type: 'text' },
    { id: 'fld_prix', type: 'number' },
  ],
}
const avecCle = { ...colis, lectureParCle: { cle: 'numero_suivi', champs: ['statut'] } }

describe('É1 · émission', () => {
  it('sans lectureParCle : rien de la lecture par clé, et le schéma ne change pas', () => {
    expect(emettrePolitiquesSql([colis], 'abc')).not.toMatch(/par_cle|deribfy\.cle/u)
    expect(emettreSchemaSql([avecCle])).toBe(emettreSchemaSql([colis]))
  })

  it('avec : politique anon sur le réglage, colonnes nommées, fonction invoker, aucun montant', () => {
    const sql = emettrePolitiquesSql([avecCle], 'abc')
    expect(sql).toContain("create policy colis_par_cle on colis for select to anon")
    expect(sql).toContain("using (numero_suivi = nullif(current_setting('deribfy.cle', true), ''))")
    expect(sql).toContain('grant select (numero_suivi, statut) on colis to anon;')
    expect(sql).toContain('security invoker')
    expect(sql).not.toMatch(/security definer/u)
    expect(sql).not.toMatch(/grant select \([^)]*prix/u)
  })

  it.each([
    ['clé inconnue', { cle: 'nope', champs: ['statut'] }],
    ['clé non unique', { cle: 'statut', champs: ['statut'] }],
    ['clé numérique', { cle: 'prix', champs: ['statut'] }],
    ['colonne inconnue', { cle: 'numero_suivi', champs: ['nope'] }],
    ['aucune colonne', { cle: 'numero_suivi', champs: [] }],
  ])('fermé par défaut : %s', (_nom, lpc) => {
    const e = { ...colis, lectureParCle: lpc }
    expect(lectureParCleEmise(e).ok).toBe(false)
    const sql = emettrePolitiquesSql([e], 'abc')
    expect(sql).toContain('-- LECTURE PAR CLÉ NON OUVERTE')
    expect(sql).not.toMatch(/to anon/u)
  })

  it('fermé si la table est déjà lisible par tous', () => {
    expect(lectureParCleEmise({ ...avecCle, lecturePublique: true, champsPublics: ['statut'] }).ok).toBe(false)
  })
})

describe('É1 · la copie côté web est ÉGALE au compilateur', () => {
  const cas: unknown[] = [
    { cle: 'numero_suivi', champs: ['statut'] },
    { cle: 'fld_numero_suivi', champs: ['fld_statut', 'statut'] },
    { cle: 'nope', champs: ['statut'] },
    { cle: 'statut', champs: ['statut'] },
    { cle: 'prix', champs: ['statut'] },
    { cle: 'numero_suivi', champs: ['nope'] },
    { cle: 'numero_suivi', champs: [] },
    { cle: 'numero_suivi' },
    null,
    'texte',
  ]
  it.each(cas.map((c) => [JSON.stringify(c), c]))('%s', (_n, lpc) => {
    const e = { ...colis, lectureParCle: lpc as never }
    expect(lectureParCleLue(e)).toEqual(lectureParCleEmise(e))
    expect(lectureParCleLue({ ...e, lecturePublique: true })).toEqual(lectureParCleEmise({ ...e, lecturePublique: true }))
  })
})

describe('É1 · le juge', () => {
  const declaree = { ...avecCle, name: 'colis', fields: avecCle.fields.map((f) => ({ ...f, name: f.id.slice(4), required: false })) }
  it('une page qui appelle la fonction : aucun défaut', () => {
    const f = new Map([['composants/Suivi.tsx', "const { data } = await base.rpc('colis_par_cle', { p_cle: n })"]])
    expect(jugerLecturePublique([declaree], f)).toEqual([])
  })
  it('aucune page ne l’appelle : défaut, et la livraison la retire', () => {
    const f = new Map([['composants/Suivi.tsx', "await base.from('colis').select('statut').eq('numero_suivi', n)"]])
    const d = jugerLecturePublique([declaree], f)
    expect(d.map((x) => x.genre)).toEqual(['par-cle-non-appelee'])
    expect(fermerCeQuiFuit([declaree], d).entites[0]?.lectureParCle).toBeUndefined()
  })
  it('une déclaration invalide : défaut nommé', () => {
    const e = { ...declaree, lectureParCle: { cle: 'statut', champs: ['statut'] } }
    expect(jugerLecturePublique([e], new Map()).map((x) => x.genre)).toEqual(['par-cle-refusee'])
  })
  it('le faux positif du 26 nov. : une constante de colonnes est une lecture bornée', () => {
    const pub = {
      id: 'ent_livraison', name: 'livraison', lecturePublique: true, champsPublics: ['numero', 'statut'],
      fields: [{ id: 'fld_numero', name: 'numero', type: 'text', required: true }, { id: 'fld_statut', name: 'statut', type: 'text', required: true }],
    }
    const code = "const COLONNES_PUBLIQUES = 'numero, statut';\nconst a = await base.from('livraison').select('*');\nconst b = await base\n  .from('livraison')\n  .select(COLONNES_PUBLIQUES)\n  .eq('numero', n);"
    expect(jugerLecturePublique([pub], new Map([['composants/P.tsx', code]]))).toEqual([])
  })
})

describe('É1 · l’épreuve du visiteur (fausse API)', () => {
  const declaree = { ...avecCle, name: 'colis', fields: avecCle.fields.map((f) => ({ ...f, name: f.id.slice(4), required: false })) }
  const api = (o: { liste: unknown[]; parCle: (k: string) => unknown }) =>
    (async (url: string, init?: { body?: string }) => {
      const corps = url.includes('/rpc/') ? o.parCle((JSON.parse(init?.body ?? '{}') as { p_cle: string }).p_cle) : o.liste
      return new Response(JSON.stringify(corps), { status: 200 })
    }) as unknown as typeof fetch
  const lancer = (n: number, frapper: typeof fetch) =>
    eprouverParCle({ url: 'https://x', clePubliable: 'k', schema: 'oeuvre_a', entites: [declaree], lire: async () => [{ n, k: n > 0 ? 'K1' : null }], frapper })

  it('porte tenue : 0 listée, la vraie clé lit sa ligne, la fausse rien', async () => {
    const r = await lancer(3, api({ liste: [], parCle: (k) => (k === 'K1' ? { numero_suivi: 'K1', statut: 'x' } : null) }))
    expect(r.map((x) => x.verdict)).toEqual(['tenue'])
    expect(r[0]?.phrase).not.toContain('K1')
  })
  it('fuite : la liste rend des lignes', async () => {
    const r = await lancer(3, api({ liste: [{}, {}], parCle: () => null }))
    expect(r[0]?.verdict).toBe('fuite')
  })
  it('fuite : une fausse clé rend une ligne', async () => {
    const r = await lancer(3, api({ liste: [], parCle: () => ({ numero_suivi: 'K1' }) }))
    expect(r[0]?.verdict).toBe('fuite')
  })
  it('table vide : NON éprouvée, jamais « tenue »', async () => {
    const r = await lancer(0, api({ liste: [], parCle: () => null }))
    expect(r[0]?.verdict).toBe('non-eprouvee')
  })
  it('la vraie clé ne rend rien : NON éprouvée (la page ne marcherait pas)', async () => {
    const r = await lancer(3, api({ liste: [], parCle: () => null }))
    expect(r[0]?.verdict).toBe('non-eprouvee')
  })
})

describe('É1 · la consigne', () => {
  it('génération ET modification portent la règle, et la règle nomme la fonction et interdit .from()', () => {
    const e = [{ id: 'ent_colis', name: 'colis', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }]
    for (const texte of [blocBase(e), CONSIGNE_RETOUCHE]) {
      for (const ligne of REGLE_LECTURE_PAR_CLE) expect(texte).toContain(ligne)
    }
    const r = REGLE_LECTURE_PAR_CLE.join('\n')
    expect(r).toContain("base.rpc('<table>_par_cle', { p_cle: saisie })")
    expect(r).toContain('ici colis_par_cle')
    expect(r).toMatch(/JAMAIS base\.from\(\)/u)
    expect(r).toMatch(/jamais un montant ni un téléphone/u)
  })
})

describe('É1 · liste blanche du migrateur', () => {
  it('le corps de la fonction reste UNE instruction', () => {
    const sql = emettrePolitiquesSql([avecCle], 'abc')
    const fonctions = instructionsDe(sql).filter((i) => i.startsWith('create or replace function'))
    expect(fonctions).toHaveLength(1)
    expect(fonctions[0]).toMatch(/end \$f\$$/u)
  })

  it('les politiques émises passent en entier', () => {
    expect(verifierMigration(emettrePolitiquesSql([avecCle], 'abc')).refus).toEqual([])
  })

  it.each([
    ['security definer', (s: string) => s.replace('security invoker', 'security definer')],
    ['instruction glissée dans le corps', (s: string) => s.replace('return r;', 'delete from colis; return r;')],
    ['autre table dans le corps', (s: string) => s.replace(' from colis x ', ' from autre x ')],
    ['grant execute à authenticated', (s: string) => s.replace('to anon;\n', 'to authenticated;\n')],
    ['tirage remplacé', (s: string) => s.replace("1, 12))", "1, 2))")],
  ])('refuse une variante : %s', (_nom, alterer) => {
    const sql = emettrePolitiquesSql([avecCle], 'abc')
    const forge = alterer(sql)
    expect(forge).not.toBe(sql)
    expect(verifierMigration(forge).ok).toBe(false)
  })
})
