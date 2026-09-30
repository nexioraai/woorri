import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PAGES } from '../../../documentation/manifeste'
import { slugDeFichier, identifiantDeAdresse, slug, adresses, type Langue } from './adresses'

export { slug, adresses }
export type { Langue }

// ============================================================
// LE CORPUS EXISTAIT, MAIS N'ÉTAIT NULLE PART.
//
// ── CE QUI A ÉTÉ MESURÉ LE 2026-09-29.
//
// Douze chapitres en français, douze en anglais, maintenus et protégés par un
// test qui les confronte au produit — et AUCUNE route ne les servait. `/docs`,
// `/documentation`, `/help`, `/aide`, `/faq` répondaient 404 en production.
// Ni Google ni une IA ne pouvait les lire : ils n'étaient pas sur le web.
//
// Seul `/llms.txt` en publiait un résumé de 85 lignes. Un résumé n'est pas la
// documentation : la FAQ, les limites, le glossaire, le dropshipping restaient
// invisibles.
//
// Ce module lit le corpus. Il ne le réécrit pas, ne le résume pas et ne le
// complète pas : la documentation reste le fichier Markdown, et cette
// couche n'en est que le passeur.
//
// ── POURQUOI LA LECTURE EST DÉFENSIVE.
//
// `documentation/` vit à côté de `src/`, pas dedans. Le chemin dépend donc du
// répertoire depuis lequel la construction est lancée — et ce répertoire n'est
// pas le même en local, sous Vitest et sur l'hébergeur. Une erreur de chemin
// ne se verrait pas à la compilation : elle produirait des pages vides, ce qui
// est PIRE que l'absence actuelle, car une page vide s'indexe.
//
// D'où : on essaie les emplacements possibles, et si aucun ne convient on
// ÉCHOUE BRUYAMMENT, avec la liste de ce qui a été tenté. Une construction qui
// s'arrête se répare ; un corpus vide publié ne se remarque pas.
// ============================================================

/** Un chapitre lu sur le disque. */
export type Chapitre = {
  /** L'identifiant stable du manifeste — le même en FR et en EN. */
  id: string
  /** L'adresse du chapitre dans sa langue, dérivée de son nom de fichier. */
  slug: string
  /** Le titre, pris du `# ` de tête. */
  titre: string
  /** Le résumé, pris de la citation de tête. Sert de description aux moteurs. */
  resume: string
  /** Le Markdown intégral, tel qu'il est écrit. */
  markdown: string
}

/** Les emplacements possibles du corpus, du plus probable au moins. */
const CANDIDATS = [
  join(process.cwd(), 'documentation'),
  join(process.cwd(), 'apps', 'web', 'documentation'),
]

function racine(): string {
  const trouve = CANDIDATS.find((c) => existsSync(join(c, 'fr')))
  if (!trouve) {
    throw new Error(
      'Corpus de documentation introuvable. Emplacements essayés :\n  ' +
        CANDIDATS.join('\n  ') +
        `\n(répertoire courant : ${process.cwd()})`
    )
  }
  return trouve
}

/** Le titre d'un chapitre : la première ligne de niveau 1. */
function titreDe(markdown: string, id: string): string {
  const ligne = markdown.split('\n').find((l) => l.startsWith('# '))
  if (!ligne) throw new Error(`Chapitre « ${id} » : aucun titre de niveau 1.`)
  return ligne.slice(2).trim()
}

/**
 * Le résumé d'un chapitre : la citation de tête.
 *
 * Les douze chapitres en portent une, et c'est délibéré — c'est la phrase que
 * les moteurs afficheront sous le lien. L'exiger plutôt que s'en passer évite
 * qu'un chapitre ajouté plus tard parte sans description.
 */
function resumeDe(markdown: string, id: string): string {
  const ligne = markdown.split('\n').find((l) => l.startsWith('> '))
  if (!ligne) throw new Error(`Chapitre « ${id} » : aucune citation de résumé.`)
  return ligne.slice(2).trim()
}

/** Lit un chapitre par son identifiant, ou rend `null`. */
export function chapitre(langue: Langue, id: string): Chapitre | null {
  const page = PAGES.find((p) => p.id === id)
  if (!page) return null
  const markdown = readFileSync(join(racine(), langue, page[langue]), 'utf-8')
  return {
    id,
    slug: slugDeFichier(page[langue]),
    titre: titreDe(markdown, id),
    resume: resumeDe(markdown, id),
    markdown,
  }
}

/** Lit un chapitre par son ADRESSE dans la langue demandée. */
export function chapitreParSlug(langue: Langue, adresse: string): Chapitre | null {
  const id = identifiantDeAdresse(langue, adresse)
  return id ? chapitre(langue, id) : null
}

/** Les douze chapitres d'une langue, dans l'ordre du manifeste. */
export function chapitres(langue: Langue): Chapitre[] {
  return PAGES.map((p) => {
    const c = chapitre(langue, p.id)
    if (!c) throw new Error(`Chapitre déclaré au manifeste mais absent : ${p.id}`)
    return c
  })
}


