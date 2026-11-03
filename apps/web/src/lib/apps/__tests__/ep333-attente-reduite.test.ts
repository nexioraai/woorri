/**
 * EP-333 · L'UTILISATEUR N'ATTEND QUE CE DONT IL A BESOIN.
 *
 * ── CE QUI A ÉTÉ MESURÉ, ET CE QUE LE FLUX SEUL NE SUFFISAIT PAS À FERMER.
 *
 * Après avoir écrit le site, `/api/chat` attendait encore DEUX appels IA en
 * série — `catalog/curate` puis `catalog/enhance`. Le commentaire les
 * disait « non bloquants » ; ils étaient pourtant `await`.
 *
 *   15:18:45 UTC  boutique ÉCRITE
 *   15:18:46 UTC  modèle FACTURÉ
 *   15:22    UTC  l'écran montrait encore « Load failed »
 *
 * Le flux rend l'attente VISIBLE. Les sortir la SUPPRIME. Une génération de
 * quelques secondes ne meurt pas sur un réseau faible.
 *
 * ── ET RIEN NE S'Y OPPOSAIT, C'EST MESURÉ.
 *
 * La réponse rend `{...parsed, slug, gallery}` : le catalogue n'y figure
 * pas. L'éditeur le lit en base. La page livrée en PROFITE, elle n'en
 * DÉPEND pas. Sur la boutique du 2026-11-03,
 * `site_catalog_selections` comptait d'ailleurs zéro ligne.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const ROUTE = lireSource(join(__dirname, '..', '..', '..', 'app', 'api', 'chat', 'route.ts'))

describe('EP-333 · l’attente est réduite, pas seulement montrée', () => {
  it('① LA CURATION EST HORS DE LA REQUÊTE', () => {
    const iAfter = ROUTE.indexOf('const apresLaReponse = async () => {')
    const iCurate = ROUTE.indexOf('/api/catalog/curate')
    const iReponse = ROUTE.indexOf('return NextResponse.json({ ...parsed, slug, gallery })')
    expect(iAfter, 'aucun travail d’après-réponse').toBeGreaterThan(0)
    // ── ET IL EST BIEN CONFIÉ À `after`, avec son repli.
    //
    // `after` lit le contexte de requête par stockage asynchrone, et ce
    // travail tourne dans le `start()` d un flux : la propagation n est pas
    // garantie. S il lève, la génération elle-même échouerait — exactement
    // ce qu on répare. Le repli lance le travail sans l attendre.
    expect(ROUTE, 'le travail n est pas confié à after').toMatch(/after\(apresLaReponse\)/u)
    expect(ROUTE, 'aucun repli si after refuse').toMatch(/void apresLaReponse\(\)/u)
    expect(iCurate, 'la curation a disparu : le contrôle ne mesure rien').toBeGreaterThan(0)
    // LA CURATION EST DANS LE BLOC `after`, ET LE BLOC EST AVANT LA RÉPONSE
    // — `after` enregistre, il n'exécute pas tout de suite.
    expect(iCurate > iAfter, 'la curation est hors du bloc d’après-réponse').toBe(true)
    expect(iCurate < iReponse, 'la curation est écrite après le `return` : elle ne s’exécutera jamais').toBe(true)
  })

  it('② LA RÉPONSE NE PORTE PAS LE CATALOGUE — donc rien ne l’attend', () => {
    // Si la réponse se mettait à porter la curation, la sortir deviendrait
    // faux : l'écran attendrait une donnée qui n'arrive plus.
    const ligne =
      ROUTE.slice(ROUTE.indexOf('return NextResponse.json({ ...parsed, slug, gallery })'))
        .split('\n')[0] ?? ''
    expect(ligne, 'la réponse porte désormais le catalogue').not.toMatch(/selection|catalog/iu)
  })

  it('③ SON ÉCHEC EST ALERTÉ — déplacer hors de vue sans alerter fabrique un silence', () => {
    // ── LE DÉFAUT QUE J'AI ÉCRIT PUIS CORRIGÉ DANS LA MÊME HEURE.
    //
    // Le `catch` interne faisait `console.error('Auto-curation failed
    // (non-blocking)')` et AVALAIT l'erreur avant que mon alerte la voie.
    // Tant que la curation vivait dans la requête, « non bloquant »
    // suffisait : l'utilisateur voyait au moins sa boutique. Après la
    // réponse, un `console.error` dans une fonction serverless EST un
    // silence.
    // ── UNE ANCRE INTROUVABLE DOIT LE DIRE, pas glisser.
    //
    // Ma première forme découpait sur `indexOf('after(async () => {')`.
    // J'ai ensuite nommé la fonction `apresLaReponse` pour pouvoir la
    // protéger — l'ancre a disparu, `indexOf` a rendu -1, et `slice(-1)`
    // n'a gardé QU'UN CARACTÈRE. Le contrôle a compté zéro alerte et
    // accusé le code.
    //
    // C'est le piège du -1, déjà payé le 2026-11-02 dans l'autre sens :
    // là il rendait vert, ici rouge. Dans les deux cas le contrôle ne
    // mesurait plus ce qu'il croyait. On vérifie donc l'ancre AVANT.
    const iBloc = ROUTE.indexOf('const apresLaReponse = async () => {')
    expect(iBloc, 'l’ancre du travail d’après-réponse a disparu : ce contrôle ne découpe plus rien')
      .toBeGreaterThan(0)
    const bloc = ROUTE.slice(iBloc)
    const iFin = bloc.indexOf('return NextResponse.json')
    expect(iFin, 'la réponse ne suit plus le bloc : le découpage est faux').toBeGreaterThan(0)
    const jusquAuReturn = bloc.slice(0, iFin)
    expect(
      (jusquAuReturn.match(/alerter\(\{/gu) ?? []).length,
      'le travail d’après-réponse peut échouer sans un mot',
    ).toBeGreaterThanOrEqual(2)
    expect(jusquAuReturn, 'l’alerte ne nomme pas l’œuvre concernée').toMatch(/sujetId: slug/u)
  })

  it('④ LE JALON ANNONCÉ NE PROMET PLUS CE QU’ON N’ATTEND PLUS', () => {
    // Annoncer « Sélection du catalogue… » pendant que le travail est sorti
    // de la requête serait le mensonge d'hier, déplacé d'un cran.
    expect(ROUTE, 'un jalon annonce encore une étape qui ne se passe plus là').not.toMatch(
      /progres\('Sélection et amélioration du catalogue/u,
    )
    expect(ROUTE, 'plus aucun jalon réel').toMatch(/progres\('Finalisation/u)
  })
})
