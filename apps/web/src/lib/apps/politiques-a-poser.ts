/**
 * LES POLITIQUES QUI PARTENT EN BASE À LA PUBLICATION (2026-11-23) : réémises
 * depuis `entites` quand le document les porte, avec l'émetteur d'aujourd'hui ;
 * sinon le texte stocké (une œuvre d'avant la déclaration n'a que lui).
 *
 * Le texte stocké d'une appli générée avant ce jour ouvrait ses tables
 * publiques EN ENTIER. Le réémettre ferme ce que la déclaration ne dit pas
 * public — et une table publique sans `champsPublics` n'ouvre plus rien.
 */
import { emettrePolitiquesSql } from '@deribfy/compiler'

export function politiquesAPoser(doc: { readonly politiques?: string; readonly entites?: unknown } | null, id: string): string {
  if (Array.isArray(doc?.entites) && doc.entites.length > 0) {
    return emettrePolitiquesSql(doc.entites as Parameters<typeof emettrePolitiquesSql>[0], id)
  }
  return doc?.politiques ?? ''
}
