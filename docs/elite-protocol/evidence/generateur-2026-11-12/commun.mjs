// OUTILS COMMUNS — chargement vérifié de l'instantané, découpage des motifs.
//
// Toute mesure passe par `charger()` : si le hachage de l'instantané ne
// correspond plus à brut/SHA256, la mesure S'ARRÊTE (une preuve dont la
// source a changé n'est plus la même preuve).
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ICI = dirname(fileURLToPath(import.meta.url))

export function charger() {
  const brut = gunzipSync(readFileSync(join(ICI, 'brut', 'generations-direct.json.gz')))
  const attendu = readFileSync(join(ICI, 'brut', 'SHA256'), 'utf8').split(/\s/)[0]
  const sha = createHash('sha256').update(brut).digest('hex')
  if (sha !== attendu) throw new Error(`instantané altéré : ${sha} ≠ ${attendu}`)
  const inst = JSON.parse(brut.toString('utf8'))
  return { ...inst, sha }
}

export function ecrire(nom, objet) {
  writeFileSync(join(ICI, 'sortie', nom), JSON.stringify(objet, null, 1) + '\n')
}

export const sansAnsi = (s) => String(s ?? '').replace(/\u001b\[[0-9;]*m/gu, '')

/** Les tours d'une génération — [] si la ligne n'en a pas enregistré. */
export const toursDe = (l) => l.sections_acquises?.tours ?? []

/**
 * LE DÉCOUPAGE D'UN MOTIF DE REFUS EN CLASSES D'ERREUR.
 *
 * Un motif est la concaténation des reproches d'un tour, séparés par une
 * ligne vide. DEUX EXCEPTIONS, constatées dans les données :
 *  · un échec de construction (« La construction a échoué : ») arrête le
 *    tour AVANT tout autre juge, et le message du compilateur contient
 *    lui-même des lignes vides : le motif entier est UNE classe ;
 *  · les refus d'avant l'assemblage (fichiers absents, imports interdits,
 *    texte tronqué…) sont gardés tels que leur première ligne les nomme.
 * La CLÉ d'une classe est l'intitulé du reproche : sa première ligne, coupée
 * au premier « — » ou « : ». Elle ne contient aucun détail variable.
 */
export function classesDuMotif(motif) {
  const m = sansAnsi(motif).trim()
  if (m === '') return []
  if (m.startsWith('La construction a échoué')) return [{ cle: 'CONSTRUCTION', texte: m }]
  return m.split(/\n\s*\n/u).map((bloc) => {
    const premiere = bloc.trim().split('\n')[0]
    const cle = premiere.split(/ — |:\s*$|: /u)[0].trim().replace(/\s+/gu, ' ').slice(0, 90)
    return { cle, texte: bloc.trim() }
  }).filter((c) => c.cle !== '')
}
