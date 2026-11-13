// 2026-11-12 — M6 : le résultat de la lecture du brief était INCONNU 34 fois sur 34.
//
// Ce fichier verrouille :
//   ① la revalidation de ce que le navigateur transmet (une valeur douteuse
//      devient `non_transmise`, jamais un statut) ;
//   ② la route `lire-brief` nomme son résultat dans TOUTES ses branches ;
//   ③ la route de génération l'écrit en SUCCÈS et en ÉCHEC ;
//   ④ le client le transmet PAR ARGUMENT, jamais par l'état React.
// Ce que ces cliquets NE VOIENT PAS : qu'une vraie génération écrive la ligne.
// Celle-là se prouve par une génération (rapport, étape 1).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decouperEnTranches, fusionnerLectures, lectureAEnregistrer, noteDeLecture, FUSIBLE_SIGNES, RESULTATS_LECTURE, TAILLE_TRANCHE } from '../lecture-brief'
import { motifTexte } from './motif-texte'

const lire = (chemin: string) => readFileSync(join(__dirname, '..', '..', '..', chemin), 'utf8')

describe('le résultat de la lecture du brief est enregistré', () => {
  it('① une valeur douteuse ne devient jamais un statut', () => {
    const VIDES = { coutUsd: null, jetonsEntree: null, jetonsSortie: null, parTranche: [], roles: [], ecrans: [], questionsOuvertes: [], parcours: [], langues: [], devises: [], moyensPaiement: [], pays: [] }
    expect(lectureAEnregistrer(undefined, 0)).toEqual({ resultat: 'non_transmise', tablesLues: null, tablesRecues: 0, source: 'absente', tentatives: null, tranches: null, tranchesEchouees: null, signesLus: null, ...VIDES })
    expect(lectureAEnregistrer({ resultat: 'parfait' }, 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer('reussie', 2).resultat).toBe('non_transmise')
    expect(lectureAEnregistrer({ resultat: 'json_casse', tables: 0 }, 0))
      .toEqual({ resultat: 'json_casse', tablesLues: 0, tablesRecues: 0, source: 'client', tentatives: null, tranches: null, tranchesEchouees: null, signesLus: null, ...VIDES })
    expect(lectureAEnregistrer({ resultat: 'tronquee', tables: 0, tentatives: 2 }, 0).tentatives).toBe(2)
    // Les listes voyagent bornées et dédoublonnées ; une valeur qui n'est pas une chaîne est ignorée.
    const e = lectureAEnregistrer({ resultat: 'reussie', tables: 2, tentatives: 4, tranches: 3, tranchesEchouees: 0, signesLus: 28_000, coutUsd: 0.0041237, jetons: { entree: 12_400, sortie: 1_530 }, roles: ['gestionnaire', 'Gestionnaire', 7], ecrans: ['Accueil', ' Accueil ', 'Commandes'], questionsOuvertes: ['Tarification à préciser'] }, 2)
    expect(e).toMatchObject({ tranches: 3, tranchesEchouees: 0, signesLus: 28_000, coutUsd: 0.004124, jetonsEntree: 12_400, jetonsSortie: 1_530, roles: ['gestionnaire'], ecrans: ['Accueil', 'Commandes'], questionsOuvertes: ['Tarification à préciser'] })
    // Le coût est MESURÉ ou absent — jamais un texte, un négatif ou un infini déguisé en nombre.
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: 1, coutUsd: 'environ 0,005 $' }, 1).coutUsd).toBeNull()
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: 1, coutUsd: -1 }, 1).coutUsd).toBeNull()
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: 1, coutUsd: Number.POSITIVE_INFINITY, jetons: 'beaucoup' }, 1)).toMatchObject({ coutUsd: null, jetonsEntree: null, jetonsSortie: null })
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: 1, coutUsd: 0 }, 1).coutUsd).toBe(0)
    // Le détail par tranche voyage revalidé : une entrée sans signes, sans tentatives ou au résultat inconnu est écartée.
    const t = lectureAEnregistrer({ resultat: 'reussie', tables: 2, parTranche: [
      { signes: 22_866, tentatives: 1, resultat: 'reussie', tables: 6, nom: null, nomRefuse: 'Plateforme internationale de réservation et IA', ecrans: 16, roles: 4, questionsOuvertes: 8 },
      { signes: 20_658, tentatives: 2, resultat: 'reussie', tables: 7, nom: 'Plateforme numérique CPA-Tchad', nomRefuse: null, ecrans: 11, roles: 11, questionsOuvertes: 10 },
      { signes: 'beaucoup', tentatives: 1, resultat: 'reussie' },
      { signes: 10, tentatives: 2, resultat: 'parfaite' },
      'pas une tranche',
    ] }, 2).parTranche
    expect(t).toHaveLength(2)
    expect(t[0]).toEqual({ signes: 22_866, tentatives: 1, resultat: 'reussie', tables: 6, nom: null, nomRefuse: 'Plateforme internationale de réservation et IA', ecrans: 16, roles: 4, questionsOuvertes: 8 })
    expect(t[1]!.nom).toBe('Plateforme numérique CPA-Tchad')
    // Le nombre de tables REÇUES est celui que la route a compté, jamais celui qu'on lui dit.
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: 99 }, 3).tablesRecues).toBe(3)
    expect(lectureAEnregistrer({ resultat: 'reussie', tables: -1 }, 0).tablesLues).toBeNull()
  })

  // 2b (2026-11-13) — jamais silencieux : le mot visible, par résultat.
  it('①bis la lecture qui n’aboutit pas a un mot visible ; celle qui aboutit n’en a pas', () => {
    expect(noteDeLecture(undefined)).toBe('')
    expect(noteDeLecture({ resultat: 'reussie', tentatives: 1 })).toBe('')
    expect(noteDeLecture({ resultat: 'demande_vide' })).toBe('')
    // Ancres en motifTexte (EP-364) : la phrase, pas un regex à la main.
    expect(noteDeLecture({ resultat: 'tronquee', tentatives: 2 })).toMatch(motifTexte('Lecture du cahier incomplète : la réponse a été coupée avant la fin (2 tentatives).'))
    expect(noteDeLecture({ resultat: 'json_casse', tentatives: 2 })).toMatch(motifTexte('Lecture du cahier incomplète : rien d’exploitable n’a pu être lu (2 tentatives).'))
    expect(noteDeLecture({ resultat: 'illisible' })).toMatch(motifTexte('Lecture du cahier incomplète'))
    expect(noteDeLecture({ resultat: 'erreur' })).toMatch(motifTexte('Lecture du cahier impossible'))
    for (const r of ['tronquee', 'json_casse', 'illisible', 'erreur']) expect(noteDeLecture({ resultat: r })).toMatch(motifTexte('sans les tables déduites'))
  })

  // G30 élargi (2026-11-13) — par tranches, sans borne de lecture.
  it('①ter la découpe suit les paragraphes, ne perd rien, et ne borne rien', () => {
    expect(decouperEnTranches('')).toEqual([])
    expect(decouperEnTranches('  un seul paragraphe  ')).toEqual(['un seul paragraphe'])
    const p = (n: number, c: string) => `${c}`.repeat(n)
    // Trois paragraphes qui ne tiennent pas à trois dans une tranche : coupés ENTRE eux, jamais dedans.
    const t = decouperEnTranches([p(60, 'a'), p(50, 'b'), p(40, 'c')].join('\n\n'), 120)
    expect(t).toEqual([`${p(60, 'a')}\n\n${p(50, 'b')}`, p(40, 'c')])
    // Un paragraphe plus long qu'une tranche se coupe aux lignes, puis aux phrases, puis au signe.
    expect(decouperEnTranches(`${p(70, 'x')}\n${p(70, 'y')}`, 100)).toEqual([p(70, 'x'), p(70, 'y')])
    expect(decouperEnTranches(`Une phrase. ${p(90, 'z')}`, 100)).toEqual(['Une phrase.', p(90, 'z')])
    expect(decouperEnTranches(p(250, 'w'), 100)).toEqual([p(100, 'w'), p(100, 'w'), p(50, 'w')])
    // Un cahier de deux cents pages est entièrement lu : rien n'est borné.
    const long = Array.from({ length: 400 }, (_, i) => `Paragraphe ${String(i)} ${p(900, 'm')}`).join('\n\n')
    const tr = decouperEnTranches(long)
    expect(tr.length).toBeGreaterThan(10)
    for (const x of tr) expect(x.length).toBeLessThanOrEqual(TAILLE_TRANCHE)
    expect(tr.join('\n\n')).toBe(long)
    expect(FUSIBLE_SIGNES).toBeGreaterThan(long.length)
  })

  it('①quater la fusion dédoublonne les tables par nom, unit les champs, garde le premier nom', () => {
    const f = fusionnerLectures([
      { deduites: { ARGENT_DANS_APP: 'aucun' }, nomProduit: { nom: 'Hayine', dansLeDocument: true }, entites: [{ id: 'ent_membre', name: 'membre', fields: [{ id: 'fld_nom', name: 'nom', type: 'text', required: true }] }], questionsIA: [{ code: 'IA_0', texte: 'q1', choix: [] }], roles: ['membre'], ecrans: ['Accueil'], questionsOuvertes: ['Fournisseurs à nommer'] },
      { deduites: { ARGENT_DANS_APP: 'paiements', MARCHE_VISE: 'Tchad' }, nomProduit: { nom: 'Autre', dansLeDocument: false }, entites: [{ id: 'ent_membre2', name: 'Membre', fields: [{ id: 'fld_nom2', name: 'Nom', type: 'text', required: false }, { id: 'fld_tel', name: 'telephone', type: 'text', required: false }] }, { id: 'ent_cotisation', name: 'cotisation', fields: [] }], questionsIA: [{ code: 'IA_0', texte: 'q2', choix: [] }, { code: 'IA_1', texte: 'q3', choix: [] }, { code: 'IA_2', texte: 'q4', choix: [] }], roles: ['Membre', 'trésorier'], ecrans: ['accueil', 'Cotisations'], questionsOuvertes: ['fournisseurs à nommer', 'Tarif à fixer'] },
    ])
    expect(f.deduites).toEqual({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Tchad' })
    expect(f.nomProduit?.nom).toBe('Hayine')
    expect(f.entites.map((e) => e.name)).toEqual(['membre', 'cotisation'])
    expect((f.entites[0]!.fields as { name: string }[]).map((x) => x.name)).toEqual(['nom', 'telephone'])
    expect(f.questionsIA.map((q) => q.texte)).toEqual(['q1', 'q2', 'q3'])
    expect(f.roles).toEqual(['membre', 'trésorier'])
    expect(f.ecrans).toEqual(['Accueil', 'Cotisations'])
    expect(f.questionsOuvertes).toEqual(['Fournisseurs à nommer', 'Tarif à fixer'])
  })

  it('①quinquies la consigne demande rôles, écrans et questions ouvertes, et sait qu’elle lit une tranche', () => {
    const consigne = lire('lib/apps/consigne-lire-brief.ts')
    for (const cle of ['ROLES', 'ECRANS', 'QUESTIONS_OUVERTES']) expect(consigne, `la consigne ne demande plus ${cle}`).toMatch(motifTexte(`${cle} :`))
    expect(consigne).toMatch(motifTexte('CE TEXTE PEUT ÊTRE UNE TRANCHE'))
    expect(consigne).toMatch(motifTexte('décisions restant à préciser'))
  })

  it('② lire-brief nomme son résultat dans toutes ses branches', () => {
    const src = lire('app/api/generateur/lire-brief/route.ts')
    for (const r of RESULTATS_LECTURE) expect(src, `résultat jamais rendu : ${r}`).toContain(`'${r}'`)
    // Plus aucune réponse sans `lecture` : chaque `NextResponse.json({` de la route la porte.
    // Lecture à parenthèses ÉQUILIBRÉES : une expression non gourmande s'arrêtait
    // sur `{ nomProduit })` au milieu de la réponse de succès (faux positif mesuré).
    const reponses = [...src.matchAll(/NextResponse\.json\(/gu)].map((m) => {
      let prof = 0
      for (let i = m.index + m[0].length - 1; i < src.length; i++) {
        if (src[i] === '(') prof++
        else if (src[i] === ')' && --prof === 0) return src.slice(m.index, i + 1)
      }
      return src.slice(m.index)
    })
    // Quatre sorties depuis 2b (demande vide · échec après la reprise · succès · erreur) ;
    // c'était cinq avant, les branches illisible et JSON cassé étant fusionnées.
    expect(reponses.length).toBeGreaterThanOrEqual(4)
    for (const r of reponses) expect(r, `réponse sans statut : ${r.slice(0, 80)}`).toContain('lecture')
  })

  it('③ la route de génération l’écrit en succès ET en échec', () => {
    const src = lire('app/api/generateur/direct/route.ts')
    expect(src).toMatch(motifTexte('sections_acquises: { lectureBrief, deploiement },'))
    expect(src).toMatch(motifTexte('      configuration,\n      lectureBrief,\n      deploiement,\n      tours: resultat.tours,'))
  })

  it('④ le client le transmet par argument, jamais par l’état', () => {
    const src = lire('components/onboarding/ConversationApplication.tsx')
    expect(src).toMatch(motifTexte('lectureBrief: opts.lecture,'))
    expect(src.match(/lecture: lu\.lecture,/gu)?.length).toBe(3)
  })
})
