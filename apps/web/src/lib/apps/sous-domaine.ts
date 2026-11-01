/**
 * UN SOUS-DOMAINE PAR APPLICATION — cpa-tchad.deribfy.com.
 *
 * ── LA DEMANDE DU PROPRIÉTAIRE, 2026-10-30.
 *
 * « chaque appli doit avoir appli.deribfy.com ». Le lien par jeton
 * (/p/8tdj8k3b…) fonctionne mais ne se retient pas, ne se dit pas au
 * téléphone, ne s'imprime pas sur une carte. Un nom, si.
 *
 * ── POURQUOI PAR L'API CLOUDFLARE, ET PAS UN WILDCARD VERCEL.
 *
 * Mesuré : les nameservers de deribfy.com sont chez Cloudflare
 * (june/emerson.ns.cloudflare.com). Un wildcard `*.deribfy.com` chez Vercel
 * exigerait d'y déménager le DNS entier — risqué, le proxy Cloudflare sert
 * le site. À la place, CHAQUE publication crée SON enregistrement :
 *
 *   ① CNAME `<nom>` → cname.vercel-dns.com chez Cloudflare (DNS only :
 *      proxied=false, sinon Vercel ne peut ni servir ni émettre le
 *      certificat) ;
 *   ② le domaine `<nom>.deribfy.com` est attaché au projet Vercel ;
 *   ③ le middleware route l'hôte vers l'œuvre.
 *
 * Les deux appels sont IDEMPOTENTS : republier un nom existant ne crée pas
 * de doublon et ne casse rien.
 *
 * ── LE JETON NE SORT JAMAIS D'ICI.
 *
 * `CLOUDFLARE_API_TOKEN` est borné à Zone/DNS/Edit sur deribfy.com — il ne
 * peut rien faire d'autre, et il vit dans l'environnement, jamais dans une
 * réponse ni un journal.
 */

/**
 * Les noms qu'une application ne peut PAS prendre.
 *
 * Deux familles : ceux qui désignent déjà le produit (www, api…) et ceux
 * qu'un escroc choisirait pour se faire passer pour nous (admin, login,
 * paiement…). Un sous-domaine d'application est servi en origine opaque,
 * mais l'ADRESSE, elle, est lue par des humains.
 */
/** Le domaine du contenu client — jamais la marque. Achete le 2026-10-30. */
export const DOMAINE_PUBLIC = 'deribfy.app'

/**
 * LE TÉMOIN DE LA SONDE — il prouve DEUX choses, et il a fallu une mesure
 * en production pour comprendre ce qu'il lui fallait.
 *
 * Il est ATTACHÉ au projet chez Vercel, en permanence, et il n'a AUCUN
 * enregistrement DNS propre. Donc :
 *   · s'il résout, c'est que le CNAME `*` vit — lui seul peut le faire
 *     répondre ;
 *   · si la poignée de main TLS passe, c'est que Vercel émet toujours les
 *     certificats à la demande.
 *
 * PREMIÈRE VERSION, FAUSSE, MESURÉE EN PRODUCTION LE 2026-11-01 : le témoin
 * n'était attaché nulle part. Il résolvait (le générique faisait son
 * travail) mais aucun certificat n'existait pour lui — `resout: true,
 * tls: false`. La sonde accusait l'infrastructure d'une panne qui venait
 * de MA conception du contrôle. Un contrôle faux est pire qu'un contrôle
 * absent : il fait chercher au mauvais endroit.
 *
 * Il est aussi RÉSERVÉ à la publication : publié, il recevrait son propre
 * nom chez Vercel et la sonde dirait « générique vivant » alors qu'il
 * serait mort.
 */
export const TEMOIN_GENERIQUE = 'sonde-generique-jamais-creee'

/**
 * LES NOMS QU'UNE ŒUVRE NE PEUT PAS PRENDRE.
 *
 * ── CE QUE CETTE LISTE NE POURRA JAMAIS FAIRE, ET QU'IL FAUT LIRE AVANT
 *    DE VOULOIR L'ALLONGER.
 *
 * Elle n'empêchera PAS quelqu'un de publier `orange-money.deribfy.app`, ni
 * le nom d'une vraie banque, ni celui d'un concurrent. AUCUNE liste ne le
 * peut : les marques du monde ne tiennent pas dans un fichier. Ce
 * problème-là relève des CONDITIONS D'UTILISATION et du RETRAIT — et le
 * retrait propre existe depuis le 2026-11-01 : suppression douce,
 * quarantaine définitive du nom, lien mort dans la seconde.
 *
 * Si vous êtes ici parce qu'un nom gênant est passé, n'allongez pas la
 * liste : retirez l'œuvre.
 *
 * ── CE QU'ELLE FAIT, ET POURQUOI ELLE A CHANGÉ DE STATUT.
 *
 * Elle empêche l'imitation des mots de CONFIANCE — `login`, `secure`,
 * `verification`. Elle était cosmétique tant qu'un nom inexistant ne
 * résolvait pas ; depuis que le CNAME générique fait répondre TOUT nom,
 * elle protège vraiment.
 *
 * La vraie protection de fond reste la SÉPARATION DES DOMAINES : le
 * produit vit sur deribfy.COM, les œuvres des clients sur deribfy.APP.
 * Une page à `login.deribfy.app` n'imite pas la connexion du produit.
 *
 * ── ELLE EST ADOPTÉE, PAS RÉDIGÉE.
 *
 * Une liste fermée qui grandit à chaque défaut révélé est la maladie que
 * ce dépôt soigne partout ailleurs. On prend donc celle que le monde
 * maintient — The Big Username Blacklist, 528 mots, MIT — et on n'écrit
 * que ce dont personne d'autre ne s'occupe : LE FRANÇAIS. Et même lui est
 * DÉRIVÉ : pour chaque mot de confiance déjà réservé en anglais, son
 * équivalent français. Mesuré le 2026-11-01 : sur vingt candidats
 * français, DIX-NEUF étaient absents de la liste anglaise.
 *
 * Rafraîchir : `node scripts/rafraichir-noms-reserves.mjs`.
 */
/**
 * LES NOMS QUI SONT À NOUS — et rien d'autre.
 *
 * ── L'INVERSION, DÉCIDÉE LE 2026-11-01, ET POURQUOI ELLE COMPTE.
 *
 * On avait adopté « The Big Username Blacklist » : 528 mots. Mais cette
 * liste protège des NOMS D'UTILISATEUR sur une plateforme sociale, où
 * n'importe quelle usurpation compte — @admin, @support, @shop. Ce n'est
 * PAS notre problème.
 *
 * Le nôtre est beaucoup plus petit : empêcher qu'une application publiée
 * se fasse passer pour DERIBFY. Rien d'autre. `panier.deribfy.app` ne
 * fait de mal à personne ; `connexion.deribfy.app`, si.
 *
 * Interdire 535 noms puis en exempter 11 était DEUX LISTES FERMÉES
 * EMPILÉES — et la seconde aurait grandi indéfiniment, au fil des clients
 * refusés (panier, devis, stock, rendez-vous…). La maladie était déplacée,
 * pas fermée.
 *
 * DONC : on interdit CE QUI EST À NOUS, on autorise TOUT LE RESTE. Le
 * défaut redevient « autorisé », et la question se vérifie par LECTURE —
 * « cette liste contient-elle autre chose que ce qui nous appartient ? » —
 * au lieu d'un échantillon de noms qu'on aurait choisis soi-même.
 *
 * ── ET ELLE EST DÉRIVÉE, PAS DEVINÉE.
 *
 * ① LES ROUTES DU PRODUIT, relevées dans `src/app/` le 2026-11-01 : un
 *   nom qui désigne une page de Deribfy prêterait à confusion.
 * ② LES SOUS-DOMAINES RÉELLEMENT POSÉS dans nos deux zones, relevés chez
 *   Cloudflare : www, mail, webmail, autoconfig, send, mailboxes.
 * ③ LES CONVENTIONS D'INFRASTRUCTURE qu'on pourrait employer demain.
 * ④ LES MOTS QUI N'ONT DE SENS QU'EN TANT QUE FONCTION DE LA PLATEFORME —
 *   seul endroit où l'on écrit, parce que personne ne peut le dériver.
 *
 * ── CE QU'AUCUNE LISTE NE FERA, et qu'il faut lire avant de l'allonger.
 *
 * Elle n'empêchera PAS `orange-money.deribfy.app`, ni le nom d'une vraie
 * banque, ni celui d'un concurrent. Les marques du monde ne tiennent pas
 * dans un fichier. Cela relève des CONDITIONS D'UTILISATION et du
 * RETRAIT — qui existe : suppression douce, quarantaine définitive du nom,
 * lien mort dans la seconde.
 *
 * Si vous êtes ici parce qu'un nom gênant est passé, n'allongez pas la
 * liste : retirez l'œuvre.
 */
export const NOMS_RESERVES: ReadonlySet<string> = new Set([
  // ① Les routes du produit (src/app/), relevées.
  'a', 'about', 'admin', 'api', 'blog', 'cookies', 'dashboard', 'documentation',
  'domaine', 'edit', 'login', 'onboarding-chat', 'p', 'parametres', 'preview',
  'pricing', 'privacy', 'reset-password', 'sites', 'terms', 'visibilite-ia',
  'welcome', 'cancel-order',

  // ② Les sous-domaines réellement posés dans nos zones (Cloudflare).
  'www', 'mail', 'webmail', 'mailboxes', 'autoconfig', 'send',

  // ③ Les conventions d'infrastructure qu'on pourrait employer demain.
  'app', 'apps', 'cdn', 'assets', 'static', 'staging', 'preprod', 'dev',
  'test', 'demo', 'status', 'docs', 'ns1', 'ns2', 'smtp', 'imap', 'ftp',

  // ④ Ce qui n'a de sens qu'en tant que FONCTION DE LA PLATEFORME.
  'connexion', 'login', 'signin', 'signup', 'inscription', 'motdepasse',
  'password', 'verification', 'verify', 'securite', 'secure', 'support',
  'aide', 'help', 'compte', 'account', 'deconnexion', 'logout',
  'confidentialite', 'mentions', 'auth', 'oauth', 'sso',

  // La marque elle-même.
  'deribfy',

  // Le témoin de la sonde : publié, il résoudrait par son propre
  // enregistrement et la sonde dirait « générique vivant » à tort.
  TEMOIN_GENERIQUE,
])

/**
 * Un nom valide : minuscules, chiffres, tirets intérieurs, 3 à 40 signes.
 * C'est la grammaire DNS, resserrée — pas de tiret en tête ni en queue,
 * pas de double tiret (lisibilité et homographes).
 */
export function nomValide(nom: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/u.test(nom)) return false
  if (nom.includes('--')) return false
  return !NOMS_RESERVES.has(nom)
}

/** Propose un nom à partir d'un texte libre — jamais imposé, toujours éditable. */
export function nomSuggere(texte: string): string {
  const brut = texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 40)
    .replace(/-+$/u, '')
  return nomValide(brut) ? brut : `app-${brut}`.slice(0, 40).replace(/-+$/u, '')
}

type Clefs = {
  readonly cloudflareToken: string
  readonly vercelToken: string
  readonly vercelProjectId: string
}

export type ResultatSousDomaine =
  | { readonly ok: true; readonly hote: string }
  | { readonly ok: false; readonly erreur: string }

/**
 * Crée (ou retrouve) `<nom>.deribfy.com` : DNS chez Cloudflare, domaine chez
 * Vercel. Idempotent des deux côtés.
 */
/**
 * LE CNAME GÉNÉRIQUE — la pièce invisible dont tout dépend.
 *
 * MESURÉ LE 2026-11-01, après qu'une publication a rendu un lien mort
 * (`ERR_NAME_NOT_RESOLVED`) : le nom n'existait pas encore au premier
 * clic, et le SOA de la zone met le NXDOMAIN en cache **1800 secondes**.
 * Trente minutes pendant lesquelles l'adresse qu'on vient de donner ne
 * répond pas — et aucun rafraîchissement ne les raccourcit.
 *
 * Un enregistrement `*` chez Cloudflare supprime le problème au lieu de
 * l'expliquer : TOUT nom résout immédiatement, il n'y a plus de vide à
 * mettre en mémoire. Mesuré sur un nom créé vingt secondes plus tôt :
 * `dig` → cname.vercel-dns.com, HTTPS → TLS 0 (certificat valide).
 *
 * ── POURQUOI PAS UN CERTIFICAT GÉNÉRIQUE : MESURÉ, ET REFUSÉ.
 *
 *     POST /v7/certs ["*.deribfy.app"] → HTTP 449
 *     dns_pretest_cns_not_using_vercel_ns_error
 *
 * Vercel n'émet un certificat générique que si le domaine est sur SES
 * nameservers. Le nôtre est chez Cloudflare, et déménager les NS serait un
 * gros geste pour un petit gain : le certificat du nom PRÉCIS est émis à
 * la demande dès qu'il est attaché au projet, puisqu'il résout.
 *
 * ── CONSÉQUENCE : PUBLIER N'ÉCRIT PLUS DE DNS.
 *
 * Un seul appel — attacher le nom chez Vercel — et l'adresse répond. Si
 * quelqu'un supprime le `*`, toutes les publications futures cesseront de
 * résoudre : la sonde d'après-déploiement interroge donc un nom JAMAIS
 * CRÉÉ à chaque fois. Un commentaire pour qui lit, un contrôle rouge pour
 * qui ne lit pas.
 */
export async function creerSousDomaine(nom: string, clefs: Clefs): Promise<ResultatSousDomaine> {
  if (!nomValide(nom)) return { ok: false, erreur: 'nom invalide ou réservé' }
  const hote = `${nom}.${DOMAINE_PUBLIC}`

  // LE DOMAINE CHEZ VERCEL, ET RIEN D'AUTRE. 409 = déjà attaché : succès.
  const vr = await fetch(`https://api.vercel.com/v10/projects/${clefs.vercelProjectId}/domains`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clefs.vercelToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: hote }),
  })
  if (!vr.ok && vr.status !== 409) {
    const corps = (await vr.json().catch(() => null)) as { error?: { message?: string } } | null
    return { ok: false, erreur: `Vercel refuse ${hote} : ${corps?.error?.message ?? String(vr.status)}` }
  }
  return { ok: true, hote }
}

/**
 * RETIRE L'ADRESSE D'UNE ŒUVRE — le DNS et le domaine, pas le NOM.
 *
 * ── CE QU'ELLE DÉFAIT, ET CE QU'ELLE NE DÉFAIT JAMAIS.
 *
 * Elle supprime le CNAME chez Cloudflare et détache le domaine de chez
 * Vercel : l'adresse cesse de répondre. Elle ne libère PAS le nom —
 * c'est la quarantaine (A1 du propriétaire, 2026-11-01), et elle est
 * tenue ailleurs, par la pierre tombale laissée en base.
 *
 * ── ÉCHOUER SANS EFFACER.
 *
 * Si le DNS refuse, l'appelant NE DOIT PAS effacer la ligne : un nom resté
 * pointé sur du vide, sans propriétaire connu, serait pire que l'échec
 * lui-même. C'est la quatrième fois ce week-end que « échouer sans
 * effacer » est la bonne réponse — après l'erreur de sous-domaine qui
 * n'avale pas la publication, le juge indisponible qui se déclare, et le
 * traçage amputé qui refuse le déploiement.
 *
 * Un enregistrement DÉJÀ absent est un SUCCÈS : supprimer deux fois doit
 * pouvoir se faire sans conséquence.
 */
export async function retirerSousDomaine(nom: string, clefs: Clefs): Promise<ResultatSousDomaine> {
  if (!nomValide(nom)) return { ok: false, erreur: 'nom invalide' }
  const hote = `${nom}.${DOMAINE_PUBLIC}`

  // ON NE TOUCHE PLUS AU DNS : le `*` sert TOUT LE MONDE, l'effacer
  // casserait toutes les autres adresses. Détacher le nom chez Vercel
  // suffit — le proxy rendra « application introuvable » à qui s'y rend,
  // ce qui vaut mieux qu'une erreur de résolution pour un lien périmé.
  //
  // 404 = déjà détaché : c'est un succès, comme 409 l'est à la création.
  const vr = await fetch(
    `https://api.vercel.com/v9/projects/${clefs.vercelProjectId}/domains/${hote}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${clefs.vercelToken}` } },
  )
  if (!vr.ok && vr.status !== 404) {
    return { ok: false, erreur: `Vercel refuse de détacher ${hote} (${String(vr.status)})` }
  }
  return { ok: true, hote }
}
