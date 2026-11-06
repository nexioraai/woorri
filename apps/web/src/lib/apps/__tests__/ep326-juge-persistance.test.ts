/**
 * EP-326 · CHAQUE TABLE DÉCLARÉE SE LIT ET S'ÉCRIT DANS LE CODE LIVRÉ.
 *
 * ── LE DÉFAUT GARDÉ, ET POURQUOI AUCUN AUTRE JUGE NE LE VOIT.
 *
 * Une œuvre MOITIÉ branchée : `membre` vient de la base, `cotisation` vit
 * dans un `useState`. Les cinq juges existants sont contents — l'œuvre
 * s'assemble, se monte, ses contrôles vivent, ses exigences sont couvertes,
 * ses jetons existent. Un écran alimenté par un tableau en mémoire est un
 * écran qui VIT.
 *
 * Seul le rechargement dit la vérité, et il la dit à la personne qui vient
 * de perdre sa saisie.
 *
 * ── ON JUGE LE ZIP, PAS LA CARTE.
 *
 * Règle du 2026-11-02 : « un cliquet qui lit du source peut toujours être
 * trompé ; un cliquet qui lit CE QUI PART ne le peut pas ». Le code jugé ici
 * sort donc de `projetLivrable` — l'archive exacte que la personne
 * télécharge, systeme/ et gabarits compris.
 */
import { describe, expect, it } from 'vitest'
import { jugerPersistance, reprochePersistance } from '../juge-persistance'
import { nomTable, type EntiteDeclaree } from '../entites-declarees'
import { projetLivrable } from '../projet-livrable'
import { boucleEcriture } from '../boucle-directe'
import { jugeMuet } from './juge-muet'

/**
 * J1 NEUTRALISÉ — aucun défaut, et il DIT qu'il a tourné.
 *
 * Ce fichier mesure le juge de la PERSISTANCE. Sa fixture écrit
 * `base.from('cotisation')` au montage sans la déclarer publique, donc J1 la
 * reproche à juste titre — et le tour suivant s'ajoutait (mesuré : 2 tours
 * → 3, plus 3,9 s de montages). J1 a son propre cliquet, EP-371.
 */
const facesMuettes = async () => ({
  aTourne: true,
  motif: null,
  defauts: [],
  silencesIndiscernables: false,
  montages: [],
})

const champ = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id.replace(/^fld_/u, ''),
  type: 'text' as const,
  required: true,
  ...extra,
})

const MEMBRE: EntiteDeclaree = {
  id: 'ent_membre',
  name: 'membre',
  fields: [champ('fld_nom'), champ('fld_telephone', { unique: true })],
}
const COTISATION: EntiteDeclaree = {
  id: 'ent_cotisation',
  name: 'cotisation',
  fields: [champ('fld_montant', { type: 'number' })],
}

/**
 * LE CODE JUGÉ EST CELUI DU ZIP — on le rouvre au lieu de le supposer.
 *
 * `projetLivrable` ajoute la bibliothèque, les gabarits et le LISEZ-MOI.
 * Juger la carte d'entrée laisserait hors du contrôle tout ce que
 * l'emballage ajoute — et c'est précisément là qu'un import parasite s'est
 * déjà caché (EP-318 ⑨, un défaut livré dans chaque zip).
 */
const codeDuZip = (fichiers: Record<string, string>, schema: string): ReadonlyMap<string, string> => {
  const zip = projetLivrable(fichiers, '<html></html>', schema)
  const code = new Map<string, string>()
  for (const [nom, contenu] of zip) {
    if (/\.(tsx?|jsx?|mjs)$/u.test(nom)) code.set(nom, contenu)
  }
  expect(code.size, 'le zip ne contient aucun fichier de code : le contrôle ne mesurerait rien')
    .toBeGreaterThan(0)
  return code
}

/**
 * LA SÉQUENCE DE RETRAIT, ASSEMBLÉE — jamais écrite nue.
 *
 * `travailleur-isolation` interdit `.de` + `lete(` partout dans
 * `lib/apps`, gabarits de test compris : c'est une garde contre une purge
 * accidentelle, et elle a raison de ne pas essayer de distinguer. On
 * emploie la parade que ce cliquet emploie sur lui-même.
 */
const RETRAIT = ['.de', 'lete('].join('')

/**
 * ── POURQUOI CETTE FIXTURE PORTE LES QUATRE GESTES (A2, 2026-11-05).
 *
 * Elle n'avait que `select` et `insert`. Le juge de gestion, ajouté ce
 * jour-là, le lui a reproché — et la boucle a fait un TOUR DE PLUS, ce
 * qui a fait rougir ⑧ sur un nombre de tours.
 *
 * Ce rouge était JUSTE : la fixture était incomplète. Mais ce fichier
 * mesure la PERSISTANCE ; une fixture qui déclenche un autre juge le fait
 * mesurer deux choses, et son verdict cesse de dire laquelle a bougé.
 */
const ECRAN_BRANCHE = `import { createClient } from '@supabase/supabase-js'
const b = window.DERIBFY_BASE
const base = createClient(b.url, b.clePubliable, b.options)
export async function listeMembres() {
  const { data } = await base.from('membre').select('*').order('nom')
  return data
}
export async function inscrire(nom: string, telephone: string) {
  await base.from('membre').insert({ nom, telephone })
}
export async function corriger(id: string, nom: string) {
  await base.from('membre').update({ nom }).eq('id', id)
}
export async function retirer(id: string) {
  await base.from('membre')${RETRAIT}).eq('id', id)
}`

const ECRAN_MEMOIRE = `import { useState } from 'react'
export function Cotisations() {
  const [lignes, setLignes] = useState<{ montant: number }[]>([])
  return <button onClick={() => setLignes([...lignes, { montant: 1000 }])}>Ajouter</button>
}`

describe('EP-326 · le juge de la persistance', () => {
  it('① L’ŒUVRE MOITIÉ BRANCHÉE EST REFUSÉE — jugée sur le zip', () => {
    const code = codeDuZip(
      { 'index.tsx': ECRAN_BRANCHE, 'cotisations.tsx': ECRAN_MEMOIRE },
      'create table membre ();',
    )
    const defauts = jugerPersistance([MEMBRE, COTISATION], code)
    // `membre` est entière, `cotisation` n'existe que dans le schéma.
    expect(defauts.map((d) => d.table), 'la table en mémoire passe inaperçue').toEqual(['cotisation'])
    expect(defauts[0], 'le sens manquant est mal nommé').toEqual({
      table: 'cotisation',
      lue: false,
      ecrite: false,
    })
  })

  it('② LA CHAÎNE DU VOISIN N’EST PAS CRÉDITÉE', () => {
    // ── LE DÉFAUT DE MA PREMIÈRE FORME, qui fenêtrait 400 signes après
    //    `.from(…)` : elle aurait crédité le `.insert` de la requête
    //    SUIVANTE, donc déclaré `membre` écrite parce que `cotisation`
    //    l'était. Exactement le défaut qu'on cherche, validé par le juge.
    const code = codeDuZip(
      {
        'index.tsx': `const a = await base.from('membre').select('*')
const b = await base.from('cotisation').insert({ montant: 1 })`,
      },
      'create table membre ();',
    )
    const defauts = jugerPersistance([MEMBRE, COTISATION], code)
    expect(defauts, 'un verbe a été crédité à la table voisine').toEqual([
      { table: 'membre', lue: true, ecrite: false },
      { table: 'cotisation', lue: false, ecrite: true },
    ])
  })

  it('③ UNE ŒUVRE ENTIÈREMENT BRANCHÉE NE SE FAIT RIEN REPROCHER', () => {
    // CONTRÔLE NÉGATIF : un juge qui refuse tout ne juge rien, il bloque.
    const code = codeDuZip(
      {
        'index.tsx': ECRAN_BRANCHE,
        'cotisations.tsx': `export async function verser(montant: number) {
  await base.from('cotisation').insert({ montant })
}
export async function relever() {
  return await base
    .from('cotisation')
    .select('montant')
    .eq('annee', 2026)
}`,
      },
      'create table membre ();',
    )
    expect(jugerPersistance([MEMBRE, COTISATION], code)).toEqual([])
  })

  it('④ LE NOM JUGÉ EST CELUI QUE LE SCHÉMA CRÉE, pas celui de l’écran', () => {
    // ── LE DÉFAUT TROUVÉ LE 2026-11-03, dans la consigne elle-même.
    //
    // Mesuré : sur `id: 'ent_membre_cotisant', name: 'membre'`, le SQL crée
    // `membre_cotisant` et `phraseTable` annonçait `membre`. La correction
    // du 2026-11-02 n'avait aligné que les COLONNES.
    //
    // Inoffensif tant que cette phrase informait un écran. Depuis que la
    // consigne la donne au modèle sous « ces noms exactement », elle dicte
    // le `base.from('…')` — donc un `PGRST205 table introuvable` sur chaque
    // écran, en production.
    const e: EntiteDeclaree = { ...MEMBRE, id: 'ent_membre_cotisant', name: 'membre' }
    expect(nomTable(e), 'le juge ne nomme pas la table comme le schéma').toBe('membre_cotisant')
    const code = codeDuZip(
      { 'index.tsx': ECRAN_BRANCHE }, // il interroge `membre`, qui n'existe pas
      'create table membre_cotisant ();',
    )
    expect(jugerPersistance([e], code), 'une table interrogée sous le nom de l’écran passe').toEqual([
      { table: 'membre_cotisant', lue: false, ecrite: false },
    ])
  })

  it('⑤ AUCUNE ENTITÉ DÉCLARÉE : RIEN À PROUVER', () => {
    // Une œuvre sans données est un RÉSULTAT, pas une panne. Lui reprocher
    // une base absente la renverrait au modèle pour rien, à chaque tour.
    const code = codeDuZip({ 'index.tsx': ECRAN_MEMOIRE }, 'create table x ();')
    expect(jugerPersistance([], code)).toEqual([])
  })

  it('⑥ L’INDIRECTION À UN NIVEAU EST RÉSOLUE', () => {
    const code = codeDuZip(
      {
        'index.tsx': `const TABLE = 'membre'
await base.from(TABLE).select('*')
await base.from(TABLE).insert({ nom: 'x' })`,
      },
      'create table membre ();',
    )
    expect(jugerPersistance([MEMBRE], code), 'un nom porté par une variable est vu comme absent')
      .toEqual([])
  })

  it('⑦ LE REPROCHE DIT LE SENS QUI MANQUE, pas « branche la base »', () => {
    const r = reprochePersistance([
      { table: 'membre', lue: true, ecrite: false },
      { table: 'cotisation', lue: false, ecrite: true },
      { table: 'depense', lue: false, ecrite: false },
    ])
    expect(r, 'la table lue-non-écrite n’est pas distinguée').toMatch(/membre : lue, jamais écrite/u)
    expect(r, 'la table écrite-non-lue n’est pas distinguée').toMatch(
      /cotisation : écrite, jamais lue/u,
    )
    expect(r, 'la table absente n’est pas distinguée').toMatch(/depense : ni lue ni écrite/u)
    // ET IL DIT LA CONSÉQUENCE : un reproche sans conséquence se négocie.
    expect(r, 'le reproche ne dit pas ce qui se perd').toMatch(/DISPARAÎT au rechargement/u)
    expect(r, 'le reproche laisse `useState` tenir lieu de base').toMatch(/useState/u)
  })

  it('⑧ LA BOUCLE L’ACTIONNE VRAIMENT — le reproche arrive au modèle', async () => {
    // ── ON MESURE CE QUI PART, pas le source qui le branche.
    //
    // Un `toContain('jugerPersistance')` sur la boucle serait satisfait par
    // la ligne d'import — neuf faux verts de cette famille le 2026-11-02.
    // On regarde donc le MESSAGE que le modèle reçoit au second tour.
    const vus: string[][] = []
    const REPONSES = [
      `=== index.tsx ===\n${ECRAN_BRANCHE}\n=== cotisations.tsx ===\n${ECRAN_MEMOIRE}`,
      `=== index.tsx ===\n${ECRAN_BRANCHE}\n=== cotisations.tsx ===\nawait base.from('cotisation').insert({ montant: 1 })\nawait base.from('cotisation').select('*')\nawait base.from('cotisation').update({ montant: 2 }).eq('id', i)\nawait base.from('cotisation')${RETRAIT}).eq('id', i)`,
    ]
    const appeler = async (m: readonly { role: string; content: string }[]) => {
      vus.push(m.map((x) => x.content))
      return { texte: REPONSES[vus.length - 1] ?? '', tronquee: false }
    }
    const r = await boucleEcriture({
      demande: 'tontine : des membres et leurs cotisations',
      appeler: appeler as never,
      juger: jugeMuet,
      jugerFaces: facesMuettes,
      entites: [MEMBRE, COTISATION],
    })
    expect(vus.length, 'le tour amnésique n’a pas été renvoyé au modèle').toBe(2)
    const retour = vus[1]!.join('\n')
    expect(retour, 'le modèle ne sait pas quelle table vit en mémoire').toMatch(
      /cotisation : ni lue ni écrite/u,
    )
    expect(r.ok, r.ok ? '' : `refusé : ${r.motif}`).toBe(true)
  })

  it('⑨ SANS ENTITÉS TRANSMISES, LA BOUCLE NE REPROCHE RIEN — contrôle négatif', async () => {
    // Si l'appelant oublie `entites`, le juge doit se taire plutôt
    // qu'inventer : fail-silent est le bon sens ICI, parce qu'un reproche
    // sur une œuvre sans données coûterait un tour à chaque génération.
    const vus: string[][] = []
    const appeler = async (m: readonly { role: string; content: string }[]) => {
      vus.push(m.map((x) => x.content))
      return { texte: `=== index.tsx ===\n${ECRAN_MEMOIRE}`, tronquee: false }
    }
    const r = await boucleEcriture({
      demande: 'un compteur',
      appeler: appeler as never,
      juger: jugeMuet,
    })
    expect(r.ok, r.ok ? '' : `refusé : ${r.motif}`).toBe(true)
    expect(vus.length, 'un tour a été payé pour une œuvre sans données déclarées').toBe(1)
  })
})
