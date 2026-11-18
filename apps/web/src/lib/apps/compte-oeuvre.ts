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

/** La longueur GARANTIE d'un mot de passe d'œuvre. */
export const LONGUEUR_MOT_DE_PASSE = 30

/**
 * UN MOT DE PASSE LONG ET ALÉATOIRE — DE LONGUEUR GARANTIE.
 *
 * ── LE DÉFAUT MESURÉ LE 2026-11-04, PAR UN ROUGE DE GATE.
 *
 * La version précédente faisait `randomBytes(24).toString('base64url')`
 * puis retirait les tirets et soulignés. Son commentaire annonçait
 * « 32 signes, environ 192 bits ». Distribution réelle, 200 000 tirages :
 *
 *     32 signes 36,3 %   ·   31 → 37,4 %   ·   30 → 18,7 %
 *     29 →  5,95 %       ·   28 →  1,36 %  ·   27 →  0,25 %
 *     26 →  0,045 %      ·   25 →  0,005 %
 *
 * Le commentaire était donc faux 63,7 % du temps, et 0,3 % des tirages
 * passaient sous le plancher qu'EP-324 ④ exige. La gate en a tiré un —
 * c'est comme ça que ce défaut s'est découvert, après vingt heures de
 * production et plusieurs comptes réellement créés.
 *
 * ── UNE SOUSTRACTION NE SE DOCUMENTE PAS, ELLE SE COMPENSE.
 *
 * Tirer plus d'octets rendrait l'échec improbable, pas impossible — et
 * « improbable » est exactement ce que la version précédente croyait être.
 * On tire donc JUSQU'À avoir assez de signes, puis on coupe net. La
 * longueur est une GARANTIE, plus une espérance.
 *
 * Pas de signes ambigus : le propriétaire va recopier cette chaîne à la
 * main ou la coller depuis un message. `base64url` évite déjà `+` et `/` ;
 * on retire aussi les tirets et les soulignés pour qu'un double-clic la
 * sélectionne en entier. 30 signes sur 62 valeurs ≈ 178 bits.
 */
export function engendrerMotDePasse(): string {
  let chaine = ''
  while (chaine.length < LONGUEUR_MOT_DE_PASSE) {
    chaine += randomBytes(32).toString('base64url').replace(/[-_]/gu, '')
  }
  return chaine.slice(0, LONGUEUR_MOT_DE_PASSE)
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
 * L'ADRESSE LISIBLE — `admin@<nom>.deribfy.app` (décision du propriétaire, 2026-11-18).
 *
 * « Je ne peux pas montrer ça sur un stand » : l'adresse longue
 * (`oeuvre-<32 signes>@apps.deribfy.app`) ne se tape pas sur un téléphone.
 *
 * ── MAIS UN NOM EST RÉUTILISABLE, ET C'EST LE QUATRIÈME COSTUME.
 *
 * Une adresse dérivée du NOM n'est plus une identité : un nom peut changer
 * de main (une appli qui se renomme libère l'ancien ; une purge future des
 * pierres tombales libérerait celui d'une appli supprimée). Si l'adresse
 * restait l'identité, l'ancien mot de passe ouvrirait la nouvelle appli.
 * L'IDENTITÉ du compte est donc sa REVENDICATION (`app_metadata.oeuvre`) ;
 * l'adresse n'est qu'une ÉTIQUETTE qu'on déplace. Voir `identites-derivees.ts`.
 */
export const DOMAINE_LISIBLE = 'deribfy.app'

export function adresseLisible(nom: string): string {
  const n = nom.trim().toLowerCase()
  // Les noms publiés : minuscules, chiffres, tirets, 3 à 40 signes (`nomValide`).
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/u.test(n)) {
    throw new Error(`COMPTE_OEUVRE_NOM_INVALIDE: « ${nom} » ne fait pas une adresse`)
  }
  return `admin@${n}.${DOMAINE_LISIBLE}`
}

type UtilisateurAdmin = {
  readonly id: string
  readonly email?: string | null
  readonly app_metadata?: Record<string, unknown> | null
}

/** Le sous-ensemble de l'API d'administration dont ce module a besoin — injectable. */
export type AdminComptes = {
  listUsers(p: { page: number; perPage: number }): Promise<{ data: { users: readonly UtilisateurAdmin[] }; error: { message: string } | null }>
  createUser(a: Record<string, unknown>): Promise<{ error: { message: string } | null }>
  updateUserById(id: string, a: Record<string, unknown>): Promise<{ error: { message: string } | null }>
}

const adminDe = (o: { url: string; cleSecrete: string; admin?: AdminComptes }): AdminComptes =>
  o.admin ?? (administration(o.url, o.cleSecrete).auth.admin as unknown as AdminComptes)

const revendication = (u: UtilisateurAdmin): string => {
  const v = (u.app_metadata ?? {}).oeuvre
  return typeof v === 'string' ? v : ''
}

/** Le ban qu'on pose sur le compte d'une appli disparue : cent ans. */
const BAN_DEFINITIF = '876000h'

/**
 * LIBÈRE UNE ADRESSE OCCUPÉE PAR LE COMPTE D'UNE AUTRE APPLI — sans jamais le prendre.
 *
 * Le compte retrouve son adresse longue (unique, dérivée de SON identifiant).
 * Si son appli n'existe plus, son mot de passe est remplacé par un tirage jeté
 * et le compte est banni : l'ancien mot de passe n'ouvre plus RIEN. Si elle
 * existe encore (elle a changé de nom), on ne touche ni à son mot de passe ni
 * à sa revendication : son propriétaire garde sa clé.
 */
async function liberer(
  admin: AdminComptes,
  occupant: UtilisateurAdmin,
  oeuvreExiste: (id: string) => Promise<boolean>,
): Promise<void> {
  const porte = revendication(occupant)
  const existe = porte === '' ? false : await oeuvreExiste(porte)
  const ailleurs = porte === ''
    ? `libere-${occupant.id.replace(/[^a-z0-9]/giu, '').toLowerCase()}@${DOMAINE_COMPTES}`
    : adresseCompteOeuvre(porte)
  const maj = await admin.updateUserById(occupant.id, {
    email: ailleurs,
    email_confirm: true,
    ...(existe ? {} : { password: engendrerMotDePasse(), ban_duration: BAN_DEFINITIF }),
  })
  if (maj.error !== null) throw new Error(`COMPTE_OEUVRE_LIBERATION: ${maj.error.message}`)
}

/**
 * ASSURE LE COMPTE D'UNE ŒUVRE — sans jamais le recréer, et sans jamais en prendre un autre.
 *
 * ① On le cherche par sa REVENDICATION (puis, pour les comptes d'avant le
 *   2026-11-18, par l'adresse longue : revendication absente → réparée ;
 *   différente → REFUS, comme toujours).
 * ② L'adresse voulue est `admin@<nom>.deribfy.app` si l'appli a un nom.
 * ③ Si un AUTRE compte occupe cette adresse, il est déplacé (`liberer`).
 * ④ Le compte de l'œuvre prend l'adresse voulue, ou il est créé.
 */
export async function assurerCompteOeuvre(o: {
  readonly idOeuvre: string
  readonly url: string
  readonly cleSecrete: string
  /** Le nom publié de l'appli (`pharma`), s'il existe. */
  readonly nom?: string | null
  /** L'appli porteuse d'une revendication existe-t-elle encore ? Inconnu = oui (on n'enferme personne). */
  readonly oeuvreExiste?: (id: string) => Promise<boolean>
  readonly admin?: AdminComptes
}): Promise<Compte> {
  const admin = adminDe(o)
  const oeuvreExiste = o.oeuvreExiste ?? (() => Promise.resolve(true))
  const voulue = o.nom ? adresseLisible(o.nom) : adresseCompteOeuvre(o.idOeuvre)

  let mien = await trouver(admin, (u) => revendication(u) === o.idOeuvre)
  let revendicationReparee = false
  if (mien === null) {
    const ancienne = adresseCompteOeuvre(o.idOeuvre)
    const ancien = await trouver(admin, (u) => u.email === ancienne)
    if (ancien !== null) {
      const porte = (ancien.app_metadata ?? {}).oeuvre
      if (porte !== undefined && porte !== null && porte !== '' && porte !== o.idOeuvre) {
        throw new Error(
          `COMPTE_OEUVRE_APPARTIENT_AILLEURS: le compte « ${ancienne} » porte déjà ` +
            `l'œuvre « ${String(porte)} », pas « ${o.idOeuvre} ». Le réparer serait le ` +
            'prendre à une autre œuvre, dont le propriétaire ne pourrait plus ouvrir ' +
            'son application.',
        )
      }
      if (porte === undefined || porte === null || porte === '') {
        const r = await admin.updateUserById(ancien.id, {
          app_metadata: { ...(ancien.app_metadata ?? {}), oeuvre: o.idOeuvre },
        })
        if (r.error !== null) throw new Error(`COMPTE_OEUVRE_REVENDICATION: ${r.error.message}`)
        revendicationReparee = true
      }
      mien = ancien
    }
  }
  if (mien !== null && mien.email === voulue) {
    return { adresse: voulue, motDePasse: null, cree: false, revendicationReparee }
  }

  const occupant = await trouver(admin, (u) => u.email === voulue)
  if (occupant !== null && occupant.id !== mien?.id) await liberer(admin, occupant, oeuvreExiste)

  if (mien !== null) {
    const r = await admin.updateUserById(mien.id, { email: voulue, email_confirm: true })
    if (r.error !== null) throw new Error(`COMPTE_OEUVRE_ADRESSE: ${r.error.message}`)
    return { adresse: voulue, motDePasse: null, cree: false, revendicationReparee }
  }

  const motDePasse = engendrerMotDePasse()
  const cree = await admin.createUser({
    email: voulue,
    password: motDePasse,
    // SANS CECI, LE COMPTE RESTE NON CONFIRMÉ ET NE SE CONNECTE JAMAIS :
    // la confirmation partirait vers une boîte qui n'existe pas.
    email_confirm: true,
    app_metadata: { oeuvre: o.idOeuvre },
  })
  if (cree.error !== null) throw new Error(`COMPTE_OEUVRE_CREATION: ${cree.error.message}`)
  return { adresse: voulue, motDePasse, cree: true, revendicationReparee: false }
}

/**
 * REFAIT LE MOT DE PASSE — sur le compte retrouvé par sa REVENDICATION.
 * L'adresse est d'abord mise en place (`assurerCompteOeuvre`) : un
 * renouvellement est aussi le moment où un compte d'avant passe à son
 * adresse lisible.
 */
export async function renouvelerMotDePasse(o: {
  readonly idOeuvre: string
  readonly url: string
  readonly cleSecrete: string
  readonly nom?: string | null
  readonly oeuvreExiste?: (id: string) => Promise<boolean>
  readonly admin?: AdminComptes
}): Promise<Compte> {
  const admin = adminDe(o)
  const place = await assurerCompteOeuvre({ ...o, admin })
  if (place.motDePasse !== null) return place
  const mien = await trouver(admin, (u) => revendication(u) === o.idOeuvre)
  if (mien === null) throw new Error('COMPTE_OEUVRE_INTROUVABLE: le compte vient d’être placé et ne se retrouve pas')
  const motDePasse = engendrerMotDePasse()
  const maj = await admin.updateUserById(mien.id, { password: motDePasse })
  if (maj.error !== null) throw new Error(`COMPTE_OEUVRE_RENOUVELLEMENT: ${maj.error.message}`)
  return { adresse: place.adresse, motDePasse, cree: false, revendicationReparee: place.revendicationReparee }
}

/** L'adresse ACTUELLE du compte d'une œuvre, lue — jamais recalculée. */
export async function adresseActuelle(o: {
  readonly idOeuvre: string
  readonly url: string
  readonly cleSecrete: string
  readonly admin?: AdminComptes
}): Promise<string | null> {
  const admin = adminDe(o)
  const mien =
    (await trouver(admin, (u) => revendication(u) === o.idOeuvre)) ??
    (await trouver(admin, (u) => u.email === adresseCompteOeuvre(o.idOeuvre)))
  return mien?.email ?? null
}

/** `listUsers` est paginé : on parcourt, on ne suppose pas la première page. */
async function trouver(
  admin: AdminComptes,
  critere: (u: UtilisateurAdmin) => boolean,
): Promise<UtilisateurAdmin | null> {
  for (let page = 1; page <= 50; page += 1) {
    const r = await admin.listUsers({ page, perPage: 200 })
    if (r.error !== null) throw new Error(`COMPTE_OEUVRE_LISTE: ${r.error.message}`)
    const trouve = r.data.users.find(critere)
    if (trouve !== undefined) return trouve
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
