// 3c-2 · CORRECTIONS 1 ET 3 — le contrat des pièces s'enseigne, les contraintes se ferment.
//   ① « Kiswahili » dans l'écran de langue de 94cf0489 (tel que livré) est REFUSÉ
//      quand le cahier lit fr, en, ar ; « العربية » et « English » passent ;
//   ② moyens de paiement et pays : une valeur hors lecture est refusée, une lue
//      passe ; une liste lue vide ne ferme rien (sauf les langues : fr seul) ;
//   ③ le juge des jetons propose le nom valide le plus proche — sur les noms
//      réellement inventés dans 94cf0489 ;
//   ④ la consigne d'écran porte les contraintes fermées et le vocabulaire généré ;
//   ⑤ la langue du squelette : `langue.ts` porte les langues lues seulement, pose
//      dir/lang, et ses textes existent en fr, en, ar.
// Rouge-puis-vert : le contrôle des langues retiré de reprochesContraintes → ① rouge.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NOMS_VARIABLES, fichiersSysteme } from '../bibliotheque-ui'
import { reprochesContraintes } from '../boucle-ecran'
import { consigneEcran } from '../consigne-ecran'
import { plusProche, vocabulaireDe } from '../juge-jetons'
import { validerPlan } from '../plan-ecrans'
import { sourceLangue } from '../squelette'
import { motifTexte } from './motif-texte'

const C = { langues: ['fr', 'en', 'ar'], devises: ['XAF'], moyensPaiement: ['Airtel Money', 'carte bancaire'], pays: ['Tchad'] }

describe('3c-2 · contraintes fermées et contrat des pièces', () => {
  it('① « Kiswahili » de 94cf0489 est refusé ; les langues lues passent', () => {
    const f = JSON.parse(gunzipSync(readFileSync(join(__dirname, 'fixtures', 'oeuvre-94cf0489.json.gz'))).toString('utf8')) as Record<string, string>
    const r = reprochesContraintes(f['ecrans/demarrage-langue.tsx']!, C).join('\n')
    expect(r).toMatch(motifTexte('DES VALEURS QUE LE CAHIER NE NOMME PAS'))
    expect(r).toMatch(motifTexte('langue « Kiswahili » (lues : fr, en, ar)'))
    expect(r).not.toMatch(/English|العربية|Français/u)
  })

  it('② paiement et pays : hors lecture refusé, lu accepté, liste vide ne ferme rien', () => {
    expect(reprochesContraintes("const m = ['Airtel Money', 'Orange Money']", C).join('\n')).toMatch(motifTexte('moyen de paiement « Orange Money »'))
    expect(reprochesContraintes("const m = ['Airtel Money']", C)).toEqual([])
    expect(reprochesContraintes('<p>Livré au Cameroun et au Tchad</p>', C).join('\n')).toMatch(motifTexte('pays « Cameroun »'))
    expect(reprochesContraintes('<p>Orange Money au Cameroun</p>', { ...C, moyensPaiement: [], pays: [] })).toEqual([])
    expect(reprochesContraintes('<p>English</p>', { ...C, langues: [] }).join('\n')).toMatch(motifTexte('langue « English » (lues : fr)'))
    expect(reprochesContraintes('<p>English</p>', undefined)).toEqual([])
  })

  it('③ le nom valide le plus proche, sur les inventions réelles de 94cf0489', () => {
    expect(plusProche('var(--rayon)', NOMS_VARIABLES)).toBe('--radius')
    expect(plusProche('var(--bordure)', NOMS_VARIABLES)).toBe('--border')
    expect(plusProche('var(--primaire)', NOMS_VARIABLES)).toBe('--primary')
    expect(plusProche('var(--danger)', NOMS_VARIABLES)).toBe('--destructive')
    expect(plusProche('var(--texte-sm)', NOMS_VARIABLES)).toBe('--text-sm')
    expect(plusProche('var(--espace-4)', NOMS_VARIABLES)).toMatch(/ESPACE/u)
    const icones = vocabulaireDe(fichiersSysteme(undefined)).icones
    expect(plusProche('chargement', icones)).toBe('horloge')
    expect(plusProche('search', icones)).toBe('recherche')
  })

  it('④ la consigne d’écran porte les contraintes fermées et le vocabulaire généré', () => {
    const plan = validerPlan({ ECRANS: [{ nom: 'paiement', role: 'Particulier' }] }, { ecrans: ['paiement'], roles: ['Particulier'] }, [], 'x')
    const c = consigneEcran(plan.ecrans.find((e) => e.nom === 'paiement')!, plan, [], 'XAF', C)
    expect(c.user).toMatch(motifTexte('CONTRAINTES FERMÉES'))
    expect(c.user).toMatch(motifTexte('langues : fr, en, ar'))
    expect(c.user).toMatch(motifTexte('moyens de paiement : Airtel Money, carte bancaire'))
    expect(c.user).toMatch(motifTexte('pays : Tchad'))
    for (const v of NOMS_VARIABLES) expect(c.system, `variable non enseignée : ${v}`).toContain(v)
    for (const i of vocabulaireDe(fichiersSysteme(undefined)).icones) expect(c.system, `icône non enseignée : ${i}`).toContain(i)
  })

  it('⑤ la langue du squelette : les langues lues seulement, dir et lang posés, textes fr/en/ar', () => {
    const src = sourceLangue(['fr', 'en', 'ar'])
    expect(src).toMatch(motifTexte('"code":"ar","nom":"العربية","dir":"rtl"'))
    expect(src).not.toContain('Kiswahili')
    expect(src).toMatch(motifTexte('document.documentElement.dir = l.dir'))
    expect(src).toContain('"accueil":"Home"')
    expect(src).toContain('"accueil":"الرئيسية"')
    expect(sourceLangue([])).toMatch(motifTexte('"code":"fr"'))
  })
})
