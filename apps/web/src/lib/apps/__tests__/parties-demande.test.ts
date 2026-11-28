/**
 * LES PARTIES DE LA DEMANDE (2026-11-28) — le lecteur, le message, et la face
 * publique d'une table lue par clé.
 *
 * ① `PARTIES.json` se lit comme `DONNEES.json` : tolérant (bloc de code, prose,
 *   objet `{parties}`), mais une partie sans « faite » booléen est refusée —
 *   la deviner serait dire « fait » à la place du modèle.
 * ② Le message porte TOUTES les parties, une ligne chacune, et la raison de
 *   chaque « non faite ». Une mesure de Deribfy rend la livraison partielle
 *   même si le modèle a tout coché. Sans liste : jamais « Fait ».
 * ③ La face publique d'une table lue par clé : lire la table au montage est un
 *   défaut `par-cle`, dont le remède est `base.rpc` — jamais « déclare-la
 *   publique », qui ouvrirait tous les colis. Et l'appel `rpc` lui-même n'est
 *   pas la lecture d'une table nommée « rpc ».
 * ④ Cliquets de branchement : la consigne de retouche et celle de génération
 *   l'enseignent ; la route rend les parties sur chaque livraison et sur la
 *   version mise en attente ; la boucle de génération ne livre jamais le fichier.
 */
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { jugerFaces, reprocheFaces, type VerdictFaces } from '../juge-faces'
import { type EntiteDeclaree } from '../entites-declarees'
import {
  FICHIER_PARTIES, faiteEnEntier, lireParties, messageRelanceParties, phraseParties, PHRASE_NON_DECOMPTEE, REGLE_PARTIES, type Partie,
} from '../parties-demande'
import { CONSIGNE_RETOUCHE } from '../retouche'
import { CONSIGNE } from '../boucle-directe'
import { messageDeRetouche } from '../message-de-retouche'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')
const p = (partie: string, faite: boolean, pourquoi: string | null = null): Partie => ({ partie, faite, pourquoi, source: 'modele' })

describe('① PARTIES.json se lit, tolérant mais jamais deviné', () => {
  it('une liste nue, un bloc de code avec prose, un objet { parties }', () => {
    expect(lireParties('[{"partie":"a","faite":true}]')).toEqual({ ok: true, parties: [p('a', true)] })
    const prose = 'Voici :\n```json\n[{"partie":"b","faite":false,"pourquoi":"pas de SMS"}]\n```\nVoilà.'
    expect(lireParties(prose)).toEqual({ ok: true, parties: [p('b', false, 'pas de SMS')] })
    expect(lireParties('{"parties":[{"partie":"c","faite":true}]}')).toEqual({ ok: true, parties: [p('c', true)] })
  })
  it('manque, illisible, vide, ou une partie sans "faite" booléen : refusé, avec la raison', () => {
    expect(lireParties(undefined)).toEqual({ ok: false, probleme: 'manque' })
    expect(lireParties('pas de json')).toMatchObject({ ok: false })
    expect(lireParties('[]')).toEqual({ ok: false, probleme: 'est vide' })
    expect(lireParties('[{"partie":"d","faite":"oui"}]')).toEqual({ ok: false, probleme: 'ne dit pas si « d » est faite ("faite": true ou false)' })
    expect(lireParties('[{"faite":true}]')).toMatchObject({ ok: false })
  })
  it('la relance nomme le problème et redonne le gabarit', () => {
    const m = messageRelanceParties('manque')
    expect(m).toMatch(motifTexte('Ton fichier PARTIES.json manque.'))
    expect(m).toMatch(motifTexte(`=== ${FICHIER_PARTIES} ===`))
  })
  it('le gabarit de la consigne se lit lui-même', () => {
    const i = REGLE_PARTIES.findIndex((l) => l.includes(`=== ${FICHIER_PARTIES} ===`))
    const gabarit = REGLE_PARTIES.slice(i + 1).join('\n')
    const lu = lireParties(gabarit)
    expect(lu.ok, JSON.stringify(lu)).toBe(true)
    if (lu.ok) expect(lu.parties.map((x) => x.faite)).toEqual([true, true, false])
  })
})

describe('② le message porte toutes les parties', () => {
  it('tout fait : chaque partie a sa ligne ✓, et le compte est juste', () => {
    const t = phraseParties([p('numéro', true), p('page publique', true), p('recherche', true)])
    expect(t.split('\n')).toEqual(['Fait — 3 partie(s) sur 3 :', '✓ numéro', '✓ page publique', '✓ recherche'])
  })
  it('une partie non faite : « Fait en partie », sa raison, et non décomptée', () => {
    const t = phraseParties([p('numéro', true), p('SMS', false, 'pas encore branché')])
    expect(t.split('\n')).toEqual([
      `Fait en partie — 1 partie(s) sur 2. ${PHRASE_NON_DECOMPTEE}`,
      '✓ numéro',
      '✗ SMS — non faite : pas encore branché',
    ])
  })
  it('une mesure de Deribfy l’emporte sur une déclaration « tout fait »', () => {
    const constat: Partie = { partie: 'page publique sans erreur', faite: false, pourquoi: 'elle lit « colis »', source: 'deribfy' }
    expect(faiteEnEntier([p('a', true)], [constat])).toBe(false)
    expect(phraseParties([p('a', true)], [constat])).toMatch(/^Fait\sen\spartie\s—\s1\spartie\(s\)\ssur\s2\./u)
  })
  it('sans liste : jamais « Fait », et les mesures se disent quand même', () => {
    expect(faiteEnEntier(null)).toBe(false)
    const constat: Partie = { partie: 'x', faite: false, pourquoi: null, source: 'deribfy' }
    const t = phraseParties(null, [constat])
    expect(t).toMatch(/^Je\sn’ai\spas\spu\sétablir/u)
    expect(t).not.toMatch(/^Fait/u)
    expect(t).toMatch(motifTexte('✗ x — non faite'))
  })
  it('une génération ne parle pas de décompte', () => {
    expect(phraseParties([p('a', false)], [], null)).not.toMatch(motifTexte(PHRASE_NON_DECOMPTEE))
  })
  it('l’écran de retouche montre la liste à la place de « Modifié »', () => {
    const m = messageDeRetouche({ ok: true, fichiers: ['index.tsx'], parties: [p('a', true), p('b', false)], constats: [], migration: 'Ajouté : la colonne numero_suivi.' }, true, ' Il vous en reste 36.')
    expect(m.texte).not.toMatch(/Modifié/u)
    expect(m.texte).toMatch(motifTexte('✓ a'))
    expect(m.texte).toMatch(motifTexte('✗ b — non faite'))
    expect(m.texte).toMatch(motifTexte('Ajouté : la colonne numero_suivi.'))
  })
})

const colis = {
  id: 'ent_colis', name: 'colis', lectureParCle: { cle: 'numero_suivi', champs: ['statut'] },
  fields: [{ id: 'fld_numero_suivi', name: 'numero_suivi', type: 'text', required: true }],
} as unknown as EntiteDeclaree

/** Une face publique qui lit (ou non) la table au montage, et appelle (ou non) la lecture par clé. */
const page = (o: { readonly lit: boolean; readonly rpc: boolean }) => `
const b = window.DERIBFY_BASE
const racine = document.getElementById('racine')
racine.innerHTML = '<h1>Suivre un colis</h1>'
${o.lit ? "fetch(b.url + '/rest/v1/colis?select=*', { headers: { apikey: b.clePubliable } })" : ''}
${o.rpc ? "fetch(b.url + '/rest/v1/rpc/colis_par_cle', { method: 'POST', headers: { apikey: b.clePubliable }, body: '{}' })" : ''}
`

describe('③ la face publique d’une table lue par clé', () => {
  let litTout: VerdictFaces
  let parCle: VerdictFaces
  beforeAll(async () => {
    litTout = await jugerFaces(page({ lit: true, rpc: false }), [colis], { attenteMs: 400 })
    parCle = await jugerFaces(page({ lit: false, rpc: true }), [colis], { attenteMs: 400 })
  }, 60_000)

  it('lire la table au montage est un défaut « par-cle », et le remède est base.rpc', () => {
    expect(litTout.aTourne, String(litTout.motif)).toBe(true)
    expect(litTout.defauts).toEqual([{ table: 'colis', forme: 'par-cle' }])
    const r = reprocheFaces(litTout) ?? ''
    expect(r).toMatch(motifTexte("base.rpc('colis_par_cle', { p_cle: saisie })"))
    expect(r).toMatch(motifTexte('Ne la déclare PAS publique'))
    expect(r).not.toMatch(/"lecturePublique":\strue/u)
  })
  it('l’appel rpc de la lecture par clé n’est pas la lecture d’une table « rpc »', () => {
    expect(parCle.aTourne, String(parCle.motif)).toBe(true)
    expect(parCle.montages[0]?.requetes.includes('POST rpc:colis_par_cle')).toBe(true)
    expect(parCle.defauts).toEqual([])
  })
})

describe('④ branché partout où une demande se livre', () => {
  it('les deux consignes l’enseignent', () => {
    for (const c of [CONSIGNE_RETOUCHE, CONSIGNE]) expect(c).toMatch(motifTexte(`=== ${FICHIER_PARTIES} ===`))
  })
  it('la route de retouche rend les parties sur la livraison ET sur la version mise en attente', () => {
    const route = lireSource(join(SRC, 'app', 'api', 'generateur', 'retoucher', 'route.ts'))
    expect(route).toMatch(motifTexte('parties, constats, faiteEnEntier: faiteEnEntier(parties, constats),'))
    expect(route).toMatch(motifTexte('parties, constats,\n'))
    expect(route).toMatch(motifTexte('parties: etat.parties, constats: etat.constats ?? [],'))
    // La version mise en attente garde les fichiers réparés, pas la déclaration brute.
    expect(route).toMatch(motifTexte('fichiers: Object.fromEntries(fichiersLivres),\n        parties, constats,'))
    expect(route).not.toMatch(motifTexte('fichiers: Object.fromEntries(declaration.fichiers)'))
    // La face publique est jugée APRÈS une retouche aussi.
    expect(route).toMatch(motifTexte('await jugerFaces(bundle.code, fusion.entites)'))
  })
  it('la boucle de génération retire le fichier et le document le range', () => {
    const boucle = lireSource(join(SRC, 'lib', 'apps', 'boucle-directe.ts'))
    expect(boucle).toMatch(motifTexte('lus = lus.filter((f) => f.chemin !== FICHIER_PARTIES)'))
    const direct = lireSource(join(SRC, 'app', 'api', 'generateur', 'direct', 'route.ts'))
    expect(direct).toMatch(motifTexte('parties: resultat.parties,\n          constats: resultat.constats,'))
    const ecran = lireSource(join(SRC, 'components', 'onboarding', 'ConversationApplication.tsx'))
    expect(ecran).toMatch(motifTexte('phraseParties(etatGen.parties.parties, etatGen.parties.constats, null)'))
  })
})
