/**
 * EP-308 — SUPPRIMER SANS RECYCLER LE NOM, ET SANS PERDRE L'ARGENT.
 *
 * Le propriétaire a dû VIDER LE STOCKAGE DE SON NAVIGATEUR à la main pour
 * se débarrasser d'une ligne morte. Ce lot rend la suppression possible —
 * et il porte deux décisions qu'il a exigées, chacune contre un risque
 * nommé.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const nu = (p: string) =>
  readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/^\s*\/\/.*$/gmu, ' ')
const API = join(__dirname, '..', '..', '..', 'app', 'api')
const SUPPRIMER = nu(join(API, 'generateur', 'supprimer', 'route.ts'))
const PURGE = nu(join(API, 'cron', 'purge-supprimees', 'route.ts'))
const LISTE = nu(join(API, 'generateur', 'mes-applications', 'route.ts'))
const ECRAN = nu(join(__dirname, '..', '..', '..', 'app', 'dashboard', 'page.tsx'))

describe('EP-308 · le nom publié ne se recycle jamais', () => {
  it('① LA SUPPRESSION NE LIBÈRE PAS publication_slug', () => {
    // Libérer le nom rendrait nom.deribfy.app disponible : quelqu'un
    // d'autre le prend, et les anciens liens — courriel, signature, carte
    // de visite — résolvent vers l'application d'un INCONNU. Ce n'est pas
    // un 404, c'est une SUBSTITUTION SILENCIEUSE.
    expect(SUPPRIMER, 'le slug est remis à zéro : le nom redevient libre').not.toMatch(
      /publication_slug:\s*null/u,
    )
    expect(SUPPRIMER, 'le jeton doit être retiré : le lien cesse de répondre').toMatch(
      /publication_jeton:\s*null/u,
    )
  })

  it('② LA PURGE EFFACE LE DOCUMENT, PAS LA LIGNE — la pierre tombale tient', () => {
    expect(PURGE, 'la purge supprime des lignes : le nom serait libéré').not.toMatch(/\.delete\(/u)
    expect(PURGE).toMatch(/document:\s*null/u)
  })

  it('③ SANS DATE DE SUPPRESSION, ON NE PURGE PAS', () => {
    // Une ligne qu'on ne sait pas dater est une ligne qu'on ne peut pas
    // effacer : ce serait deviner sur de l'irréversible.
    expect(PURGE).toMatch(/Number\.isNaN\(Date\.parse\(quand\)\)/u)
  })
})

describe('EP-308 · la suppression est douce, et elle le dit', () => {
  it('④ TRENTE JOURS, et le nombre vit à UN seul endroit', () => {
    expect(SUPPRIMER).toMatch(/JOURS_AVANT_PURGE\s*=\s*30/u)
    expect(PURGE, 'la purge recopie le délai au lieu de le lire').toMatch(/JOURS_AVANT_PURGE/u)
  })

  it('⑤ UNE GÉNÉRATION EN VOL REFUSE, et dit pourquoi', () => {
    expect(SUPPRIMER).toMatch(/statut === 'en_attente'[\s\S]{0,500}doitArreter/u)
    // Le travailleur saisit par compare-and-set sur `en_attente` : en
    // sortir suffit à le neutraliser, sans verrou de plus.
    expect(SUPPRIMER).toMatch(/statut:\s*'annulee'/u)
    expect(SUPPRIMER).toMatch(/\.eq\('statut',\s*'en_attente'\)/u)
  })

  it('⑥ ÉCHOUER SANS EFFACER — le DNS d’abord, et son échec arrête tout', () => {
    expect(SUPPRIMER).toMatch(/retirerSousDomaine[\s\S]{0,400}rien n’a été supprimé/u)
  })

  it('⑦ L’ÉCRAN NE MONTRE PLUS L’ŒUVRE, et oublie le navigateur', () => {
    expect(LISTE).toMatch(/\.neq\('statut',\s*'supprimee'\)/u)
    expect(ECRAN, 'la mémoire locale garderait une œuvre effacée').toMatch(
      /oublierGeneration\(window\.localStorage\)/u,
    )
  })

  it('⑧ LA CONFIRMATION NOMME LES CONSÉQUENCES — pas « êtes-vous sûr ? »', () => {
    expect(ECRAN).toMatch(/cessera de répondre/u)
    expect(ECRAN, 'rien ne dit que le nom reste réservé').toMatch(/jamais réattribuée/u)
    expect(ECRAN, 'rien ne rassure sur le projet déjà téléchargé').toMatch(/reste à vous/u)
  })
})
