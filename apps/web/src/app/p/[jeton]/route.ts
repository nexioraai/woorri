/**
 * LA PAGE PUBLIEE — LA SEULE ROUTE PUBLIQUE DU GENERATEUR.
 *
 * ── POURQUOI UNE ROUTE ET PAS UNE PAGE NEXT.
 *
 * Ce qu'on sert n'est pas un composant React de Deribfy : c'est un document
 * HTML COMPLET, produit par `construireApercu`, avec sa propre balise
 * `<html>`, son propre `<head>` et son propre script. Le glisser dans une
 * page Next l'imbriquerait dans notre arbre — et c'est precisement ce qu'on
 * ne veut pas. Une route rend l'octet, et rien ne l'entoure.
 *
 * ── AUCUNE AUTHENTIFICATION, ET C'EST LE BUT.
 *
 * Le jeton EST l'autorisation : 160 bits d'entropie, cree pour ca et pour
 * rien d'autre. Toute la surface voisine passe par `requireAuthenticatedUser` ;
 * celle-ci ne le peut pas, puisqu'on publie justement pour montrer a quelqu'un
 * qui n'a pas de compte.
 *
 * En echange, trois choses sont dues, et elles sont tenues ici :
 *   ① la page tourne en origine OPAQUE (`sandbox` sans `allow-same-origin`) —
 *      elle ne peut pas toucher les cookies ni le stockage de Deribfy ;
 *   ② elle ne parle a personne (`default-src 'none'`, `connect-src 'none'`) ;
 *   ③ elle n'est pas indexee — un lien donne n'est pas une publication au
 *      monde, et le proprietaire a choisi un lien.
 *
 * ── CE QUI EST SERVI EST RECOMPILE, JAMAIS STOCKE.
 *
 * Meme regle que le zip : `document` est la seule verite. Republier n'ecrit
 * donc rien de nouveau, et un lien envoye hier montre l'application
 * d'aujourd'hui. Rien de derive ne peut se perimer parce que rien de derive
 * n'est garde.
 */
import { projectAirSchema } from '@deribfy/air-schema'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { construireApercu } from '@/lib/apps/apercu'
import { assembler } from '@/lib/apps/bac-a-sable'
import { pageAutonome } from '@/lib/apps/boucle-directe'
import { TITRE_SANS_NOM } from '@/lib/apps/nom-produit'
import { ENTETES_PAGE_PUBLIEE, jetonValide } from '@/lib/apps/publication'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * UNE SEULE REPONSE POUR TOUS LES REFUS, ET LA RAISON EST SERIEUSE.
 *
 * Jeton mal forme, jeton inconnu, document illisible : trois causes, UN seul
 * 404 au texte identique. Distinguer « mal forme » de « inconnu » dirait a
 * quelqu'un qui essaie des jetons lesquels ont la bonne forme — c'est lui
 * offrir un oracle, et un oracle divise le cout d'une recherche.
 */
const introuvable = (): Response =>
  new Response("Cette page n'existe pas, ou son lien a ete retire.", {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })

export async function GET(_req: Request, ctx: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await ctx.params
  if (!jetonValide(jeton)) return introuvable()

  const lu = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('document, nom')
    .eq('publication_jeton', jeton)
    .maybeSingle()
  if (lu.error !== null || lu.data === null) return introuvable()

  // ── L'ŒUVRE DU MOTEUR DIRECT SE PUBLIE AUSSI (EP-290, 2026-10-30).
  //
  // Cette route ne connaissait que le document AIR : une génération directe
  // range `{fichiers}` — du TSX brut — et le lien public rendait 404 sur une
  // application pourtant livrée et payée. On recompile les fichiers stockés,
  // comme « Revoir » : AUCUN modèle n'est appelé, publier reste gratuit.
  // Les en-têtes sont les mêmes : CSP `sandbox` (origine opaque), noindex.
  // ── LE TITRE VIENT DE LA BASE, PLUS D'UN LITTÉRAL.
  //
  // Cette ligne disait « Application » à tout le monde : l'onglet, le nom
  // d'installation du manifeste et le titre Apple. La page est recompilée à
  // chaque lecture, donc renommer en base suffit à les corriger tous les
  // trois — sans retoucher l'œuvre, sans rappeler un modèle.
  //
  // Le repli est NOMMÉ (`TITRE_SANS_NOM`) : les neuf œuvres nées avant ce
  // lot n'ont pas de nom, et en inventer un ici serait mentir. Le littéral,
  // lui, est interdit partout ailleurs par EP-309 ⑥.
  const titre = typeof lu.data.nom === 'string' && lu.data.nom.trim() !== ''
    ? lu.data.nom.trim()
    : TITRE_SANS_NOM
  const doc = lu.data.document as { fichiers?: Record<string, string> } | null
  if (doc?.fichiers !== undefined && Object.keys(doc.fichiers).length > 0) {
    const v = await assembler(new Map(Object.entries(doc.fichiers)))
    if (!v.ok) return introuvable()
    return new Response(pageAutonome(v.code, titre), {
      status: 200,
      headers: ENTETES_PAGE_PUBLIEE,
    })
  }

  const air = projectAirSchema.safeParse(lu.data.document)
  if (!air.success) return introuvable()

  try {
    const { html } = await construireApercu(air.data)
    return new Response(html, { status: 200, headers: ENTETES_PAGE_PUBLIEE })
  } catch {
    // Un document schema-valide peut etre incompilable. On ne montre ni la
    // trace ni le nom du module : la personne qui regarde n'est pas celle qui
    // peut reparer, et une trace de compilation chez un visiteur est une fuite.
    return introuvable()
  }
}
