// ============================================================
// A2 d0/e0 -- COMMENT UN THEME APPREND QU'UN SITE PUBLIE DES AVIS.
//
// ── IL N'EXISTE QU'UNE SEULE ROUTE, ET C'EST STRUCTUREL.
//
// Exigence du proprietaire, 2026-11-06 : « ce flux doit etre LE chemin, pas
// un deuxieme. Si un theme peut encore apprendre autrement qu'un site publie
// des avis, on n'a rien ferme. »
//
// La garantie ne repose sur aucune convention :
//
//   ① LES THEMES SONT SYNCHRONES. `export default function EditorialTheme(
//      { site }: { site: Site })` -- les quatre. Un composant synchrone ne
//      peut pas `await`. Connaitre les avis exige une requete. Un theme ne
//      PEUT donc pas l'apprendre seul : il ne peut que le RECEVOIR.
//
//   ② UN SEUL LECTEUR. `fetchAvisEntries` est la seule fonction du depot qui
//      lise les avis pour une surface derivee, et elle passe par la VUE
//      `appels_offres_public` -- jamais par la table. Les deux rendeurs
//      l'appellent, elle ; ils ne reecrivent pas sa requete.
//
//   ③ FAIL-CLOSED. `hasAvis` est OPTIONNELLE et vaut `false` par defaut. Un
//      rendeur qui l'oublie n'affiche RIEN -- jamais quelque chose de faux.
//      Meme patron que `canTransact`, qui refuse par defaut « sans qu'aucune
//      ligne ait a le prevoir ».
//
//      Pourquoi pas OBLIGATOIRE : 31 sites de rendu existent, dont 29 dans
//      des tests qui n'ont rien a voir avec les avis. Les forcer tous aurait
//      noye le changement reel dans 29 fichiers de bruit. L'ecart laisse par
//      l'optionnalite est comble par un CLIQUET qui nomme les DEUX rendeurs
//      reels et exige qu'ils la passent -- voir `avisDuSite.test.ts`.
//
// ── CE QUE CE MODULE N'EST PAS.
//
// Ce n'est pas un second lecteur. Il ne contient AUCUNE requete : il nomme un
// contrat et derive un booleen. Toute lecture reste dans
// `appels-offres/fetchAvis.ts`.
// ============================================================

/**
 * Ce qu'un theme recoit au sujet des avis de marche.
 *
 * Un BOOLEEN, et pas un compte. Une section d'accueil se montre ou ne se
 * montre pas ; afficher « 0 avis » serait precisement la section vide que la
 * loi A2 ③ interdit. Le jour ou une surface aura besoin du compte, elle le
 * demandera -- et ce sera une decision, pas une derive.
 */
export type AvisDuSite = {
  /** `true` si ce site publie au moins un avis VISIBLE du public. */
  hasAvis?: boolean

  /**
   * L'HOTE REELLEMENT SERVI, pour resoudre une adresse absolue.
   *
   * Il est ICI pour la MEME raison que `hasAvis` : un theme synchrone ne peut
   * pas appeler `headers()`, pas plus qu'il ne peut `await` une requete. Ce
   * type ne nomme pas « les avis » -- il nomme **ce qu'un theme ne peut pas
   * atteindre seul**, et que seul un rendeur peut lui donner.
   *
   * SANS LUI, LA SEULE ISSUE EST UN CHEMIN PLATEFORME EN DUR -- le motif que
   * portent deja `ClickableProductCard` et `PageProduits`
   * (`/sites/${slug}/produits/...`), et que le lot blog nomme comme un
   * defaut. Sur un sous-domaine il est re-prefixe par le proxy et tombe en
   * 404 ; un lien RELATIF, lui, marche sur le sous-domaine et casse sur
   * l'origine plateforme. Aucun des deux raccourcis n'est bon : il faut
   * l'hote.
   *
   * `null` est fail-closed : `resolveSiteBaseUrl` retombe alors sur l'origine
   * plateforme, qui est correcte par defaut.
   */
  host?: string | null
}

/**
 * Derive le contrat depuis ce que `fetchAvisEntries` a rendu.
 *
 * `entrees` arrive d'un seul endroit. Une liste VIDE et une lecture RATEE ne
 * doivent pas se ressembler : `fetchAvisEntries` rend `[]` dans les deux cas
 * -- c'est son choix, documente -- donc ce module ne peut pas les distinguer
 * et il ne pretend pas le faire. Consequence assumee : une panne de lecture
 * masque la section au lieu d'en afficher une fausse. Fail-closed, encore.
 */
export function avisDuSite(entrees: readonly unknown[]): Pick<Required<AvisDuSite>, 'hasAvis'> {
  return { hasAvis: entrees.length > 0 }
}
