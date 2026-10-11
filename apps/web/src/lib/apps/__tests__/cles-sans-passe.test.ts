/**
 * CLIQUET — AUCUNE CLE DU SCHEMA NE PEUT RESTER SANS PASSE D'EMISSION.
 *
 * ── L'OUBLI, DEUX FOIS.
 *
 * `repair-scope.ts` le raconte lui-meme pour 1.28.0 : « CONTROLE D'ACCES —
 * OUBLIE ICI a son ajout », avec deux consequences, le routage mort et la
 * protection anti-amputation absente. Le meme oubli s'est reproduit en
 * 1.34.0 avec `backend`.
 *
 * ── POURQUOI C'EST SILENCIEUX, ET DONC GRAVE.
 *
 * Chaque passe contraint la sortie du modele par une grammaire derivee de
 * `projectAirSchema.pick(keys)`. MESURE : le `pick` d'un `strictObject`
 * reste strict. Une cle qui n'appartient a aucune passe ne peut donc
 * JAMAIS etre emise — quoi qu'ordonne le prompt. Et le noyau l'ordonne :
 * regle 42 (`access`), regle 43 (`access.delegation`), regle 51
 * (`backend`, « DECLARE TOUJOURS ce noeud »). Trois fonctionnalites
 * documentees, mortes a la naissance, sans un seul message d'erreur.
 *
 * ── CE QUE CE TEST FAIT, ET CE QU'IL NE FAIT PAS.
 *
 * Il n'ouvre aucune passe : corriger le noyau scelle est une decision du
 * proprietaire, et elle ne se valide que par un tir payant. Il INTERDIT
 * qu'une QUATRIEME cle s'ajoute sans que personne le voie, et il nomme les
 * deux trous connus pour qu'ils ne se perdent pas.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), 'utf8')

/**
 * LES DEUX TROUS CONNUS AU 2026-10-11 — nommes, dates, et accompagnes de
 * ce qu'ils coutent. Retirer une entree d'ici EXIGE d'avoir ouvert la
 * passe correspondante : c'est le seul moyen de faire passer ce test.
 */
const TROUS_CONNUS: Readonly<Record<string, string>> = {
  // Regles 42 et 43 du noyau. Consequence : AUCUNE application generee ne
  // porte de controle d'acces, et `derive-rls.ts` lit
  // `air.access?.delegation?.subjectEntityId`, qui ne peut pas exister.
  access: 'aucune application generee ne porte de controle d acces',
  // Regle 51 du noyau (« DECLARE TOUJOURS ce noeud »). Consequence : la
  // fonctionnalite 1.34.0 « qui ecrit le serveur » ne s'exprime jamais.
  backend: 'aucune application generee ne declare qui ecrit son serveur',
}

function clesDuSchema(): string[] {
  const air = lire('packages', 'air-schema', 'src', 'air.ts')
  const bloc = air.slice(air.indexOf('export const projectAirSchema'))
  return [...new Set([...bloc.slice(0, bloc.indexOf('\n})')).matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9]*):/gmu)].map((m) => m[1] as string))]
}

function clesEmises(): Set<string> {
  const coeur = lire('benchmarks', 'air-emission', 'emission-coeur.mjs')
  const listes = [...coeur.matchAll(/keys: \[([^\]]*)\]/gu)]
  return new Set(listes.flatMap((m) => [...m[1].matchAll(/"([a-zA-Z][a-zA-Z0-9]*)"/gu)].map((x) => x[1] as string)))
}

describe('toute clé du schéma appartient à une passe — ou figure au registre', () => {
  it('le relevé est non vide des deux côtés (sinon le test ne prouve rien)', () => {
    expect(clesDuSchema().length).toBeGreaterThan(15)
    expect(clesEmises().size).toBeGreaterThan(15)
  })

  it('AUCUNE clé orpheline inattendue', () => {
    const emises = clesEmises()
    const orphelines = clesDuSchema().filter((k) => !emises.has(k))
    const inattendues = orphelines.filter((k) => !(k in TROUS_CONNUS))
    // Si ceci tombe : une cle a ete ajoutee au schema sans passe pour la
    // porter. Elle ne sera JAMAIS emise, et rien ne le dira. Ouvrez la
    // passe, ou inscrivez-la au registre ci-dessus EN DISANT CE QU'ELLE
    // COUTE — jamais en silence.
    expect(inattendues, `clé(s) sans passe d'émission : ${inattendues.join(', ')}`).toEqual([])
  })

  it('le registre ne garde que des trous RÉELS', () => {
    // L'envers du cliquet : le jour ou une passe s'ouvre, l'entree doit
    // disparaitre d'ici. Un registre qui garde des trous combles ment.
    const emises = clesEmises()
    for (const cle of Object.keys(TROUS_CONNUS)) {
      expect(emises.has(cle), `« ${cle} » est émis : retirez-le du registre`).toBe(false)
    }
  })

  it('les deux trous connus sont ceux qu’on croit', () => {
    expect(Object.keys(TROUS_CONNUS).sort()).toEqual(['access', 'backend'])
  })
})
