/**
 * LE COMPTE D'UNE ŒUVRE — une porte, une clé, qu'on peut renouveler.
 *
 * ── CE QU'IL EST, ET POURQUOI UN SEUL.
 *
 * Décision du propriétaire : « pas de rôles, pas de droits fins — ces
 * applications sont des outils internes, pas des sites publics. » Un compte
 * unique par œuvre est le pendant exact de cette décision. Le propriétaire
 * le partage avec son équipe comme il partagerait la clé d'un atelier.
 *
 * ── L'ADRESSE N'EST PAS UN SECRET. LE MOT DE PASSE, SI.
 *
 * `oeuvre-<identifiant entier>@apps.deribfy.app` se déduit de l'identifiant de
 * l'œuvre, qui est dans l'URL publique. TOUT le secret tient donc dans le mot de
 * passe : il est long et engendré par `randomBytes`, jamais par un
 * `Math.random` — un générateur de confort n'est pas un générateur de clé.
 *
 * ── LA BOÎTE AUX LETTRES N'EXISTE PAS, ET ÇA AURAIT TOUT CASSÉ.
 *
 * `apps.deribfy.app` ne reçoit aucun courrier. Si Supabase envoyait une
 * confirmation à cette adresse, elle n'arriverait jamais et le compte
 * resterait NON CONFIRMÉ — donc incapable de se connecter, sans que rien ne
 * l'explique. Le compte est donc créé avec `email_confirm: true` par l'API
 * d'administration, et une mesure vérifie qu'un compte frais se connecte du
 * premier coup. C'est le genre de défaut qui ne se voit qu'au premier
 * utilisateur réel.
 *
 * ── ET LA REVENDICATION SE RÉPARE, ELLE NE SE CONSTATE PAS.
 *
 * `app_metadata.oeuvre` est ce qui rend la porte franchissable : un compte
 * qui ne la porte pas ne peut pas ouvrir sa propre application, et personne
 * ne saurait pourquoi. Le serveur connaît l'identifiant de l'œuvre qu'il
 * publie — si la revendication manque, il la REPOSE. Ce n'est pas un
 * risque : c'est la même valeur, écrite par la même main.
 *
 * JAMAIS `user_metadata` : son porteur peut la réécrire et accéderait alors
 * à n'importe quelle autre œuvre. EP-320 ⑨ garde la politique, ce module
 * garde l'écriture.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

/** Le domaine des comptes d'œuvre. Aucune boîte n'y reçoit de courrier. */
export const DOMAINE_COMPTES = 'apps.deribfy.app'

/**
 * L'ADRESSE DU COMPTE D'UNE ŒUVRE — déterministe, donc retrouvable.
 *
 * Elle doit se recalculer à l'identique à chaque publication : c'est ce qui
 * permet de retrouver le compte au lieu d'en créer un second.
 *
 * ── ELLE PORTE L'IDENTIFIANT ENTIER, ET J'AVAIS ÉCRIT LE CONTRAIRE.
 *
 * Ma première version n'en gardait que HUIT SIGNES, « suffisants à
 * l'unicité pratique ». Trouvé le 2026-11-02 par un test que j'avais moi-même
 * mal écrit : deux œuvres dont les identifiants partageaient leur préfixe
 * obtenaient LA MÊME ADRESSE.
 *
 * Et la conséquence est pire qu'une collision : la seconde publication
 * RETROUVE le compte de la première, constate que la revendication ne
 * correspond pas, et la « répare » — c'est-à-dire la vole. Le propriétaire
 * de la première œuvre ne peut plus ouvrir sa propre application, et rien ne
 * l'explique.
 *
 * DÉRIVER UNE IDENTITÉ D'UNE TRONCATURE D'IDENTITÉ EST UNE COLLISION QUI
 * ATTEND SON TOUR. Même leçon que les 63 octets du nom de schéma : une garde
 * qui tient « en pratique » ne tient pas.
 *
 * L'identifiant entier donne 39 signes de partie locale, loin des 64
 * autorisés. L'adresse est moins jolie ; elle est juste.
 */
export function adresseCompteOeuvre(idOeuvre: string): string {
  const propre = idOeuvre.trim().toLowerCase().replace(/[^a-z0-9]/gu, '')
  if (propre.length < 8) {
    throw new Error(`COMPTE_OEUVRE_ID_INVALIDE: « ${idOeuvre} » est trop court`)
  }
  const locale = `oeuvre-${propre}`
  // La partie locale d'une adresse est bornée à 64 signes. On mesure CE QUI
  // PART, comme pour le nom de schéma.
  if (locale.length > 64) {
    throw new Error(
      `COMPTE_OEUVRE_ADRESSE_TROP_LONGUE: « ${locale} » fait ${String(locale.length)} signes, ` +
        'au-delà des 64 d’une partie locale — elle serait tronquée et deux œuvres ' +
        'partageraient un compte.',
    )
  }
  return `${locale}@${DOMAINE_COMPTES}`
}

/**
 * UN MOT DE PASSE LONG ET ALÉATOIRE.
 *
 * 24 octets de `randomBytes` en base64url : 32 signes, environ 192 bits.
 * L'adresse étant déductible, c'est la seule chose qui protège l'œuvre —
 * elle n'a pas le droit d'être devinable.
 *
 * Pas de signes ambigus : le propriétaire va recopier cette chaîne à la
 * main ou la coller depuis un message. `base64url` évite déjà `+` et `/` ;
 * on retire aussi les tirets et les soulignés pour qu'un double-clic la
 * sélectionne en entier.
 */
export function engendrerMotDePasse(): string {
  return randomBytes(24).toString('base64url').replace(/[-_]/gu, '')
}

export type Compte = {
  readonly adresse: string
  /**
   * Le mot de passe N'EST RENDU QUE lorsqu'il vient d'être écrit — création
   * ou renouvellement. Une republication ne le redonne pas : on ne peut pas
   * relire un mot de passe, et prétendre le contraire serait mentir.
   */
  readonly motDePasse: string | null
  readonly cree: boolean
  readonly revendicationReparee: boolean
}

const administration = (url: string, cleSecrete: string) =>
  createClient(url, cleSecrete, { auth: { persistSession: false, autoRefreshToken: false } })

/**
 * ASSURE LE COMPTE D'UNE ŒUVRE — sans jamais le recréer.
 *
 * Même discipline que le schéma : une republication retrouve le compte et
 * n'y touche pas. Le recréer donnerait au propriétaire de nouveaux
 * identifiants sans raison, et laisserait l'ancien compte dans `auth.users`
 * avec sa revendication.
 */
export async function assurerCompteOeuvre(o: {
  readonly idOeuvre: string
  readonly url: string
  readonly cleSecrete: string
}): Promise<Compte> {
  const adresse = adresseCompteOeuvre(o.idOeuvre)
  const admin = administration(o.url, o.cleSecrete)

  // ── ON CHERCHE AVANT DE CRÉER. `listUsers` est paginé : on filtre sur
  // l'adresse exacte plutôt que de supposer qu'elle est sur la première page.
  const existant = await trouverParAdresse(admin, adresse)

  if (existant === null) {
    const motDePasse = engendrerMotDePasse()
    const cree = await admin.auth.admin.createUser({
      email: adresse,
      password: motDePasse,
      // SANS CECI, LE COMPTE RESTE NON CONFIRMÉ ET NE SE CONNECTE JAMAIS :
      // la confirmation partirait vers une boîte qui n'existe pas.
      email_confirm: true,
      app_metadata: { oeuvre: o.idOeuvre },
    })
    if (cree.error !== null) {
      throw new Error(`COMPTE_OEUVRE_CREATION: ${cree.error.message}`)
    }
    return { adresse, motDePasse, cree: true, revendicationReparee: false }
  }

  // ── DEUX CAS QUI NE SE RESSEMBLENT PAS, ET C'EST LA DIFFÉRENCE ENTRE
  //    RÉPARER ET VOLER.
  //
  // ABSENTE : on répare. Le serveur connaît l'identifiant de l'œuvre qu'il
  // publie, il repose la même valeur de la même main. Un compte sans
  // revendication ne peut pas ouvrir son application, et le symptôme est un
  // écran vide sans message.
  //
  // DIFFÉRENTE : on REFUSE, bruyamment. Ce compte appartient à une AUTRE
  // œuvre, et le « réparer » le lui prendrait — son propriétaire ne pourrait
  // plus ouvrir sa propre application, sans rien pour l'expliquer.
  //
  // J'avais confondu les deux : une seule branche qui réparait dès que la
  // valeur ne correspondait pas. Le défaut s'est manifesté le 2026-11-02
  // quand deux œuvres ont partagé une adresse tronquée — la seconde
  // publication a volé le compte de la première, et ma mesure a lu le
  // résultat à l'envers avant que je comprenne.
  //
  // L'unicité de l'adresse est désormais garantie, mais elle peut se rompre
  // un jour par un autre chemin. C'EST CE REFUS-LÀ QUI TIENDRA ENCORE.
  const metadonnees = (existant.app_metadata ?? {}) as Record<string, unknown>
  const porte = metadonnees.oeuvre

  if (porte === o.idOeuvre) {
    return { adresse, motDePasse: null, cree: false, revendicationReparee: false }
  }

  if (porte !== undefined && porte !== null && porte !== '') {
    throw new Error(
      `COMPTE_OEUVRE_APPARTIENT_AILLEURS: le compte « ${adresse} » porte déjà ` +
        `l'œuvre « ${String(porte)} », pas « ${o.idOeuvre} ». Le réparer serait le ` +
        'prendre à une autre œuvre, dont le propriétaire ne pourrait plus ouvrir ' +
        'son application.',
    )
  }

  const maj = await admin.auth.admin.updateUserById(existant.id, {
    app_metadata: { ...metadonnees, oeuvre: o.idOeuvre },
  })
  if (maj.error !== null) {
    throw new Error(`COMPTE_OEUVRE_REVENDICATION: ${maj.error.message}`)
  }
  return { adresse, motDePasse: null, cree: false, revendicationReparee: true }
}

/**
 * REFAIT LE MOT DE PASSE — ce qui rend la limite du compte partagé vivable.
 *
 * Un mot de passe partagé ne se révoque pas individuellement : le jour où
 * quelqu'un quitte l'équipe, où la clé a traîné dans un groupe de
 * discussion, où l'on ne sait plus qui l'a, il faut pouvoir la changer.
 *
 * Sans ce geste, la seule réponse à une fuite serait « republiez » — et
 * personne ne le devinerait. Avec lui, la limite devient « un mot de passe
 * partagé qu'on renouvelle », ce qui est l'usage normal d'une clé d'atelier.
 */
export async function renouvelerMotDePasse(o: {
  readonly idOeuvre: string
  readonly url: string
  readonly cleSecrete: string
}): Promise<Compte> {
  const adresse = adresseCompteOeuvre(o.idOeuvre)
  const admin = administration(o.url, o.cleSecrete)
  const existant = await trouverParAdresse(admin, adresse)
  if (existant === null) {
    // Pas de compte : on en crée un. Renouveler ce qui n'existe pas serait
    // un refus incompréhensible pour qui vient de cliquer.
    return assurerCompteOeuvre(o)
  }
  // MÊME REFUS QU'À LA POSE : on ne renouvelle pas la clé d'une porte qui
  // n'est pas la nôtre. Sans cette ligne, le renouvellement serait le chemin
  // de vol que la pose refuse.
  const metadonnees = (existant.app_metadata ?? {}) as Record<string, unknown>
  const porte = metadonnees.oeuvre
  if (porte !== undefined && porte !== null && porte !== '' && porte !== o.idOeuvre) {
    throw new Error(
      `COMPTE_OEUVRE_APPARTIENT_AILLEURS: le compte « ${adresse} » porte l'œuvre ` +
        `« ${String(porte)} ». Renouveler son mot de passe le couperait de son ` +
        'application.',
    )
  }
  const motDePasse = engendrerMotDePasse()
  const maj = await administration(o.url, o.cleSecrete).auth.admin.updateUserById(existant.id, {
    password: motDePasse,
    // La revendication ABSENTE est reposée au passage : un renouvellement est
    // aussi une occasion de réparer. Une revendication DIFFÉRENTE a déjà fait
    // échouer ci-dessus.
    app_metadata: { ...metadonnees, oeuvre: o.idOeuvre },
  })
  if (maj.error !== null) {
    throw new Error(`COMPTE_OEUVRE_RENOUVELLEMENT: ${maj.error.message}`)
  }
  return { adresse, motDePasse, cree: false, revendicationReparee: false }
}

/**
 * CHERCHE UN COMPTE PAR SON ADRESSE, EN PARCOURANT LES PAGES.
 *
 * `listUsers` est paginé. Supposer que l'adresse est sur la première page
 * marcherait jusqu'au cinquante-et-unième compte, puis créerait des doublons
 * en silence — chacun avec sa revendication, et l'un des deux portant un
 * mot de passe que personne n'a.
 */
async function trouverParAdresse(
  admin: ReturnType<typeof administration>,
  adresse: string,
): Promise<{ id: string; app_metadata: Record<string, unknown> | null } | null> {
  for (let page = 1; page <= 50; page += 1) {
    const r = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (r.error !== null) throw new Error(`COMPTE_OEUVRE_LISTE: ${r.error.message}`)
    const trouve = r.data.users.find((u) => u.email === adresse)
    if (trouve !== undefined) {
      return {
        id: trouve.id,
        app_metadata: (trouve.app_metadata ?? null) as Record<string, unknown> | null,
      }
    }
    if (r.data.users.length < 200) return null
  }
  return null
}

/**
 * CE QUE L'ÉCRAN DIT DE CES IDENTIFIANTS.
 *
 * Le propriétaire les voit TOUJOURS dans l'atelier, pas une seule fois : ce
 * n'est pas un secret vis-à-vis de lui, c'est SON application. Et s'il perd
 * le mot de passe, il doit voir une porte qu'il peut franchir, pas un
 * formulaire qui le laisse chercher.
 *
 * Le mot de passe, lui, ne se relit pas — il se renouvelle.
 */
export const CE_QUE_LE_COMPTE_OUVRE =
  'Ces identifiants ouvrent votre application publiée. Partagez-les avec qui ' +
  'doit y accéder — ils donnent accès aux données de cette application, et ' +
  'd’aucune autre. Le mot de passe ne se relit pas : s’il a circulé plus ' +
  'qu’il ne devait, renouvelez-le.'
