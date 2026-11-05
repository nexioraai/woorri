/**
 * LES DONNÉES DÉCLARÉES — le modèle les annonce AVANT d'écrire les écrans.
 *
 * ── POURQUOI DÉCLARER, ET NON DÉDUIRE.
 *
 * Déduire les données des fichiers rendus est IMPOSSIBLE, pas seulement
 * risqué. `unique`, `required` et une relation entre deux entités
 * n'existent nulle part dans du React : un `useState` ne dit pas qu'un
 * numéro de téléphone ne peut servir qu'une fois, ni qu'une cotisation
 * appartient à un membre. On obtiendrait un schéma VALIDE et FAUX — le
 * pire des deux mondes, parce qu'il s'appliquerait sans erreur.
 *
 * ── POURQUOI AVANT LES ÉCRANS, ET NON APRÈS.
 *
 * Déclarées d'abord, les données deviennent une structure CONNUE contre
 * laquelle les écrans s'écrivent, et qu'un juge peut vérifier. Déclarées
 * après, elles ne seraient qu'un commentaire sur ce qui existe déjà.
 *
 * ── CE QUE CE MODULE NE FAIT PAS : VALIDER.
 *
 * La validation contre `entitySchema` vit côté SERVEUR, et elle y reste.
 * Ce module est lu par un écran ; importer `@deribfy/air-schema` ici
 * tirerait le paquet dans le navigateur. Le validateur est donc INJECTÉ —
 * `lireEntites` reçoit la fonction qui juge, elle ne la connaît pas.
 */

/** Une entité telle qu'elle voyage, une fois validée. */
export type EntiteDeclaree = {
  readonly id: string
  readonly name: string
  readonly fields: readonly {
    readonly id: string
    readonly name: string
    readonly type: string
    readonly required: boolean
    readonly unique?: boolean
  }[]
  readonly appendOnly?: boolean
  /**
   * `required` N'EST PAS OBSERVABLE SUR CETTE DÉCLARATION.
   *
   * ── CE QU'ON PRÉTENDAIT COMPARER (2026-11-04).
   *
   * Une déclaration relue d'un SQL ne CONNAÎT pas l'obligation : elle ne
   * rend pas `false`, elle ne rend RIEN — c'est nous qui écrivions
   * `false` à la place. Comparer ce champ produisait alors N écarts
   * FAUX sur toute œuvre d'avant.
   *
   * Un champ qu'on ne peut pas récupérer ne se compare pas. Il s'exclut,
   * et l'exclusion se dit UNE FOIS. Taire serait cacher une
   * information ; déclarer non comparable, c'est dire ce qu'on sait.
   */
  readonly obligationInconnue?: boolean
  /**
   * SA LECTURE EST-ELLE PUBLIQUE ? (P1, 2026-11-05)
   *
   * ── CE QUE CE DRAPEAU OUVRE, ET CE QU'IL N'OUVRE JAMAIS.
   *
   * `true` ⇒ n'importe qui LIT cette table, sans compte et sans
   * connexion. L'ÉCRITURE reste réservée au compte de l'œuvre, toujours,
   * quelle que soit la valeur : ce drapeau ne commande que `select`, et
   * aucune valeur ne peut lui faire commander autre chose.
   *
   * ── ABSENT ⇒ PRIVÉE. L'OUBLI VA VERS LE SÛR.
   *
   * Un portail institutionnel a besoin de l'inverse de ce qu'on a bâti :
   * tout le monde lit les actualités, seul l'administrateur les publie.
   * Mais le défaut doit rester la fermeture — une table privée qu'on
   * croyait publique se voit tout de suite ; l'inverse ne se voit jamais.
   *
   * ── LE CAS QUI FAIT COMPRENDRE POURQUOI P5 EXISTE.
   *
   * Un modèle qui lit « les appels d'offres sont publics » dans un cahier
   * peut déclarer publique la table des SOUMISSIONS des fournisseurs.
   * Sur un marché public, ce serait une faute grave : les offres
   * concurrentes doivent rester SCELLÉES jusqu'à l'ouverture des plis.
   * Un appel d'offres est public ; ce qu'on y répond ne l'est pas.
   *
   * Rien dans la forme de la déclaration ne distingue ces deux tables —
   * d'où l'écran de P5, qui nomme au propriétaire, AVANT que l'adresse
   * existe, chaque table que n'importe qui pourra lire.
   */
  readonly lecturePublique?: boolean
  /**
   * SA PUBLICITÉ EST-ELLE INCONNAISSABLE ? — même raison qu'`obligation`.
   *
   * Une déclaration relue d'un SQL de schéma ne porte PAS ce drapeau : il
   * ne vit que dans les POLITIQUES. Écrire `false` à sa place produirait
   * un écart FAUX sur chaque table de chaque œuvre d'avant P1 — le défaut
   * exact déjà payé sur `required` le 2026-11-04.
   *
   * Un champ qu'on ne peut pas récupérer ne se compare pas. Il s'exclut,
   * et l'exclusion se dit UNE FOIS.
   */
  readonly publiciteInconnue?: boolean
}

/**
 * LA LECTURE DU DRAPEAU — stricte, et c'est tout l'intérêt (P3).
 *
 * `=== true` et rien d'autre. `'oui'`, `'true'`, `1`, `'public'`, un objet :
 * tout cela rend FAUX. Une déclaration qu'on ne comprend pas laisse la table
 * PRIVÉE — jamais l'inverse.
 *
 * JavaScript rendrait `'non'` vrai par coercition. C'est exactement le genre
 * de valeur qu'un modèle écrit quand on lui demande un booléen en français.
 */
export function lecturePubliqueDe(e: { readonly lecturePublique?: unknown }): boolean {
  return e.lecturePublique === true
}

/**
 * CE QU'ON REFUSE DE TRANSMETTRE, ET POURQUOI ON LE DIT.
 *
 * Un refus silencieux produirait une application à qui il manque une table,
 * sans que personne sache laquelle. La personne voit donc ce qui est passé
 * ET ce qui a été écarté, avec le motif.
 */
export type RefusEntite = { readonly quoi: string; readonly motif: string }

/**
 * DEUX SILENCES QUI SE RESSEMBLENT, ET C'EST ÇA QUI EST CASSÉ.
 *
 * ── CE QUE LA FORMULATION JUSTE CHANGE.
 *
 * J'avais d'abord écrit « le chemin des entités n'a aucun filet contre
 * l'humeur du fournisseur ». Le propriétaire a corrigé, et la correction est
 * la leçon : « la phrase "pas de filet" fait réparer un filet. La vraie
 * phrase fait réparer la DISTINCTION, qui est la seule chose qui compte et
 * qui est beaucoup moins de travail. »
 *
 * ── LA VRAIE PHRASE.
 *
 *   `illisible: true` et `entites: []` arrivent en aval sous la MÊME
 *   APPARENCE. Une application qui n'a pas besoin de base et une lecture de
 *   cahier qui a ÉCHOUÉ sont indiscernables.
 *
 *   La première est un RÉSULTAT. La seconde est une PERTE.
 *
 *   Et c'est la confusion qui rend la perte silencieuse.
 *
 * ── CE QUE ÇA DONNE CONCRÈTEMENT.
 *
 * `lire-brief` rend `{ deduites: {}, illisible: true, motif: … }` quand la
 * réponse du modèle ne porte aucun objet JSON. Mesuré le 2026-11-02 : le même
 * cahier, la même consigne, une réussite puis un échec — l'humeur du
 * fournisseur, vérifiée gratuitement par git (aucun des trois fichiers du
 * chemin n'avait changé).
 *
 * En aval, l'écran et la publication ne voient qu'une chose : pas d'entités.
 * Ils traitent donc une LECTURE PERDUE comme une application sans données —
 * et l'œuvre se génère, se publie, et ne conserve rien. Personne ne voit
 * d'erreur parce qu'il n'y en a pas : il y a une absence prise pour un choix.
 *
 * ── CE QU'IL FAUDRA RÉPARER, ET CE N'EST PAS UN FILET.
 *
 * Porter `illisible` jusqu'aux deux endroits qui décident, pour qu'ils
 * puissent dire « je n'ai pas pu lire » au lieu de « rien à conserver ». Un
 * réessai, une alerte ou une file sont des questions d'après ; la
 * distinction vient d'abord, et sans elle aucun filet ne sait quand se
 * déclencher.
 */
export const DEUX_SILENCES_INDISCERNABLES =
  '`illisible: true` et `entites: []` arrivent en aval sous la même ' +
  'apparence. Une application qui n’a pas besoin de base et une lecture de ' +
  'cahier qui a échoué sont indiscernables. La première est un résultat, la ' +
  'seconde est une perte — et c’est la confusion qui rend la perte ' +
  'silencieuse.'

/**
 * LES BORNES — et ce ne sont pas des précautions de style.
 *
 * ── LE NOMBRE DE TABLES.
 *
 * Douze tables pour une application qu'une personne décrit en trois phrases
 * n'est pas une lecture fidèle : c'est une invention qui coûtera un schéma
 * à appliquer et des écrans à câbler. On borne, et on le DIT quand ça mord.
 *
 * ── LE NOMBRE DE CHAMPS.
 *
 * Même raison, un étage plus bas. Trente champs sur une table veut dire que
 * le modèle a replié plusieurs entités dans une seule.
 */
export const TABLES_MAX = 12
export const CHAMPS_MAX = 30

/**
 * LES NOMS QU'ON REFUSE — nos propres remplissages, un étage plus bas.
 *
 * EP-309 refuse « Application » comme nom de produit. La même discipline
 * vaut ici : une table nommée `donnees`, `table` ou `element` ne dit rien
 * de ce qu'elle conserve, et un schéma dont on ne peut pas lire les noms
 * n'est pas vérifiable par la personne qui le reçoit.
 */
export const NOMS_REFUSES: readonly string[] = [
  'donnees',
  'donnee',
  'data',
  'table',
  'element',
  'elements',
  'item',
  'items',
  'objet',
  'entite',
  'chose',
  'truc',
  'divers',
  'autre',
  'autres',
  'test',
  'exemple',
]

/**
 * LE BLOC AJOUTÉ À LA CONSIGNE DE LECTURE DU BRIEF.
 *
 * ── IL ENTRE DANS `lire-brief`, PAS DANS LA CONSIGNE DE GÉNÉRATION.
 *
 * Exigence du propriétaire, et elle vient d'un chiffre : la consigne de
 * génération est passée de 1 363 à 5 904 signes en deux semaines, et on la
 * soupçonne d'avoir coûté un tir. Le chantier des données ne peut pas être
 * « cinq règles de plus » dans un texte qui déborde déjà.
 *
 * Ici, le modèle ne construit rien : il LIT, et il rend du JSON. C'est la
 * route faite pour ça, elle filtre déjà sa propre sortie contre une table,
 * et elle tourne avant la génération.
 */
export const CONSIGNE_ENTITES = [
  '',
  '── ET LES DONNÉES À CONSERVER, une clé de plus :',
  '  ENTITES : un tableau JSON des choses que l’application doit GARDER',
  '      d’une fois sur l’autre. Chaque élément :',
  '        { "id": "ent_membre", "name": "membre",',
  '          "fields": [ { "id": "fld_telephone", "name": "telephone",',
  '                        "type": "text", "required": true,',
  '                        "unique": true } ] }',
  '',
  '      `id` vaut EXACTEMENT `ent_` puis le `name` pour une table, et',
  '      `fld_` puis le `name` pour un champ. Ne répète pas le nom de la',
  '      table dans celui du champ : dans `membre`, le champ se dit',
  '      `fld_nom`, jamais `fld_membre_nom` — c’est ce nom-là qui devient',
  '      la colonne, et une colonne `membre_nom` dans la table `membre`',
  '      se relit mal.',
  '      `name` est en minuscules, sans accent ni espace (tirets bas admis).',
  '      `type` vaut : text, number, decimal, boolean, date, enum.',
  '      `required` dit si la SAISIE l’exige. `unique` seulement quand le',
  '      texte dit qu’une valeur ne peut servir qu’une fois.',
  '      Ajoute "appendOnly": true à une table qui ne se réécrit jamais',
  '      (un journal, un historique de versements).',
  '',
  '      NE DÉCLARE QUE CE QUE LE TEXTE DEMANDE DE CONSERVER. Si rien dans',
  '      le texte ne doit survivre à un rechargement, OMETS cette clé —',
  '      une table inventée coûte un schéma à appliquer et des écrans à',
  '      câbler pour rien.',
  `      Jamais plus de ${String(TABLES_MAX)} tables, jamais plus de ${String(CHAMPS_MAX)} champs par table.`,
  '      Jamais un nom vide de sens : pas « donnees », pas « table »,',
  '      pas « element » — le nom doit dire CE QUE la table conserve.',
].join('\n')

/**
 * LE BLOC DE BASE — il PREND LA PLACE de la règle 6, il ne s'y ajoute pas.
 *
 * ── LA TENSION QU'ON SUPPRIME AU LIEU DE LA GÉRER.
 *
 * La règle 6 de la consigne de génération dit : « tu écris des valeurs
 * d'exemple PLAUSIBLES quand il en faut ». Elle décrit une application en
 * mémoire, et c'était juste tant que les œuvres n'avaient pas de base.
 *
 * Ajouter un bloc de base À CÔTÉ d'elle produirait un code hybride : la
 * moitié des écrans sur la base, l'autre sur des valeurs en dur. Le modèle
 * obéirait aux deux, et aucun juge actuel ne le verrait.
 *
 * Décision du propriétaire : les deux branches NE COEXISTENT JAMAIS dans la
 * même consigne. Avec entités, ce bloc REMPLACE la règle 6. Sans entités, la
 * règle 6 reste telle quelle, inchangée. On échange du texte contre du
 * texte — la consigne ne grossit pas.
 *
 * ── ET LE BLOC EST STRUCTURÉ, PAS DE LA PROSE.
 *
 * La liste des tables et de leurs colonnes est une DONNÉE, dérivée des
 * entités déclarées. Ce qui l'entoure est le minimum pour qu'elle se lise :
 * comment joindre la base, pourquoi il faut se connecter, et l'interdit qui
 * remplace la règle 6.
 *
 * ── POURQUOI LA CONNEXION EST DANS LE BLOC.
 *
 * La porte n'autorise que les requêtes CONNECTÉES — mesuré : la clé publique
 * seule reçoit `42501`. Une application qui ne propose pas de se connecter
 * verrait des listes vides sans jamais savoir pourquoi. Le dire ici est
 * moins cher que de le découvrir en production.
 */
export function blocBase(entites: readonly EntiteDeclaree[]): string {
  const tables = entites.map((e) => `  ${phraseTable(e)}`).join('\n')
  return [
    '6. TES DONNÉES SE CONSERVENT EN BASE.',
    '',
    '   SI `window.DERIBFY_BASE.url` EST VIDE, CE N’EST PAS UNE ERREUR :',
    '   c’est l’aperçu, avant publication. L’application marche ALORS',
    '   ENTIÈREMENT en mémoire — on saisit, on calcule, on navigue. Seule la',
    '   conservation manque, et la page le dit.',
    '',
    '   N’AFFICHE JAMAIS « configuration manquante » ni aucun écran d’erreur',
    '   à sa place : on doit pouvoir l’ESSAYER avant de la publier. Écris',
    '   donc tes écrans UNE fois, et choisis où tu ranges :',
    '',
    "     import { createClient } from '@supabase/supabase-js'",
    '     const b = window.DERIBFY_BASE',
    "     const enBase = b.url !== '' && window.origin !== 'null'",
    '     const base = enBase ? createClient(b.url, b.clePubliable, b.options) : null',

    '',
    '   Emploie `b.options` TEL QUEL : il dirige lecture ET écriture vers le',
    '   bon endroit. Ne pose aucun en-tête à la main.',
    '',
    '   DEUX FACES, ET ELLES NE SE MÉLANGENT PAS.',
    '',
    '   · CE QUE TOUT LE MONDE VOIT : les listes déclarées publiques, en',
    '     LECTURE seule. Aucun bouton qui écrit.',
    '   · L’ESPACE DE GESTION, derrière la connexion : pour CHAQUE table,',
    '     lister, AJOUTER, MODIFIER une ligne existante, et la RETIRER.',
    '     Les quatre, pas seulement « ajouter ».',
    '',
    '   Sans « modifier », une faute de frappe est définitive. Sans',
    '   « retirer », une ligne de trop l’est aussi. Une application à',
    '   données dont le propriétaire ne peut que REMPLIR l’oblige à ouvrir',
    '   la base lui-même — écris donc toujours cet espace.',
    '',
    '   (Une table marquée (journal) est l’exception : voir plus bas.)',
    '',
    '   LA BASE N’OUVRE QU’AUX PERSONNES CONNECTÉES : écris un écran de',
    '   connexion (`base.auth.signInWithPassword`), affiché tant que',
    '   `base.auth.getSession()` ne rend rien — sinon tes listes seront',
    '   vides sans qu’on sache pourquoi. CET ÉCRAN NE S’AFFICHE QUE SI',
    '   `enBase` : dans l’aperçu il n’y a personne à connecter.',
    '',
    '   TES TABLES, avec leurs colonnes — ces noms exactement :',
    tables,
    '',
    '   CHAQUE TABLE A EN PLUS une colonne `id` que la base remplit seule.',
    '   NE L’ENVOIE PAS à l’écriture ; lis-la pour identifier une ligne.',
    ...(entites.some((e) => e.appendOnly === true)
      ? [
          '',
          '   UNE TABLE MARQUÉE (journal) N’ACCEPTE QUE DES AJOUTS. La base',
          '   REFUSE d’y modifier ou d’y supprimer une ligne — n’écris donc',
          '   aucun bouton qui le propose : il échouerait sans rien dire.',
        ]
      : []),
    '',
    '   INTERDIT : des valeurs d’exemple en dur. Ce qu’un écran montre vient',
    '   des données. Vide donne vide, et c’est la bonne réponse.',
    '',
    '   CHAQUE TABLE SE LIT ET S’ÉCRIT quelque part : une table que personne',
    '   n’interroge est une donnée perdue, et te sera renvoyée.',
    '',
    '   S’IL TE MANQUE UNE TABLE — un écran que la liste ne couvre pas —,',
    '   DÉCLARE-LA. Rends ce fichier EN PLUS des autres :',
    '',
    '   === DONNEES.json ===',
    '   [{ "name": "releve",',
    '      "fields": [{ "name": "date", "type": "date", "required": true }] }]',
    '',
    '   Types possibles : text, number, date, boolean. Ce fichier ne part PAS',
    '   dans l’application : c’est une déclaration.',
    '',
    '   AUCUN FICHIER : ni téléversement, ni PDF, ni image envoyée. ',
    '   `base.storage` est atteignable et ÉCHOUERAIT — aucun espace de',
    '   fichiers n’existe. Un lien vers un document se met en `text`.',
    '',
    '   LECTURE PUBLIQUE, si et seulement si le cahier la demande :',
    '     { "name": "actualite", "lecturePublique": true, "fields": [...] }',
    '   N’importe qui lit alors cette table, sans compte. L’écriture reste',
    '   au seul compte de l’application. OMETS par défaut : sans ce mot, la',
    '   table est privée.',
    '   « Les appels d’offres sont publics » rend public l’APPEL, JAMAIS les',
    '   SOUMISSIONS : des offres concurrentes restent scellées jusqu’à',
    '   l’ouverture des plis. Si tu hésites, OMETS.',
  ].join('\n')
}

/** Le nom lisible d'une table ou d'un champ, sans son préfixe. */
/**
 * LE NOM LISIBLE D'UNE TABLE OU D'UN CHAMP — sans son préfixe.
 *
 * ── CETTE RÈGLE EXISTE DEUX FOIS, ET C'EST INÉVITABLE.
 *
 * `nomTable` et `nomColonne` font la même chose dans
 * `@deribfy/compiler/schema-donnees.ts` — c'est elles qui nomment VRAIMENT
 * les tables du schéma. Mais ce module-ci est lu par un composant CLIENT, et
 * le compilateur importe `node:sqlite` : l'importer ici tirerait du code de
 * serveur dans le paquet navigateur, le défaut qu'EP-314 garde et qui a déjà
 * tué un build.
 *
 * Une duplication qu'on ne peut pas supprimer doit être PROUVÉE ÉGALE :
 * EP-319 ⑧ compare les deux fonctions sur une série d'identifiants. Si elles
 * divergent un jour, c'est lui qui le dira — pas un utilisateur qui cherche
 * une colonne qui n'existe pas.
 */
/**
 * LE TYPE DIT AU MODÈLE, dans les mots de ce que la base accepte.
 *
 * Aligné sur `typeSqlDe` du compilateur : `number`/`decimal` → `numeric`,
 * `boolean` → `boolean`, tout le reste → `text`. Une date est donc du
 * TEXTE, et le dire évite qu'un objet `Date` parte en base dans un format
 * que la relecture ne saura pas trier.
 */
const MOT_DU_TYPE: Readonly<Record<string, string>> = {
  number: 'nombre',
  decimal: 'nombre',
  boolean: 'vrai/faux',
  date: 'texte, date ISO aaaa-mm-jj',
  datetime: 'texte, date ISO',
}

const sansPrefixe = (id: string): string => id.replace(/^(ent_|fld_)/u, '')

/**
 * LE NOM DE LA TABLE, TEL QUE LE SCHÉMA LA CRÉE.
 *
 * Égal à `nomTable` de `@deribfy/compiler` — qu'on ne peut pas importer
 * ici : il tire `node:sqlite`, donc du code de serveur dans le paquet
 * navigateur (EP-314, un build déjà tué). L'égalité est donc PROUVÉE par
 * cliquet, pas supposée.
 */
export const nomTable = (e: { readonly id: string }): string => sansPrefixe(e.id)

/**
 * LE NOM DE LA COLONNE, TEL QUE LE SCHÉMA LA CRÉE.
 *
 * Même règle, même raison, même cliquet que `nomTable` : égal à
 * `nomColonne` de `@deribfy/compiler`, qu'on ne peut pas importer ici
 * (EP-314). M1 en a besoin pour comparer deux déclarations — et comparer
 * des noms AFFICHÉS plutôt que des identifiants ferait passer un
 * changement de libellé pour un abandon de colonne, donc arrêterait une
 * modification parfaitement sûre.
 */
export const nomColonne = (f: { readonly id: string }): string => sansPrefixe(f.id)

/**
 * LE TYPE TEL QUE LA BASE LE VERRA — et c'est le seul qui se compare.
 *
 * ── LE FAUX ARRÊT QUI AURAIT BLOQUÉ TOUT M4 (2026-11-04).
 *
 * L'ancienne déclaration d'une œuvre d'avant vient de la RELECTURE de son
 * SQL : un champ `date` en ressort `text`, parce que l'émetteur écrit les
 * deux pareil. La nouvelle vient du MODÈLE, et lui écrit `date`.
 *
 * M1 classe un changement de type en ARRÊT. Mesuré :
 *
 *     relue du SQL : fld_date:text   ·   du modèle : fld_date:date
 *     → type-change:date → peutAvancer : FALSE
 *
 * Toute œuvre portant un champ `date` se serait arrêtée à CHAQUE
 * modification, pour toujours. Même famille que le piège des
 * identifiants : garde étanche, produit inutilisable.
 *
 * On compare donc ce que la base verra, jamais le mot déclaré. Égal à
 * `typeSqlDe` de `@deribfy/compiler`, qu'on ne peut pas importer ici
 * (EP-314) — l'égalité est PROUVÉE par cliquet sur les 14 types connus,
 * pas supposée.
 */
export const typeSql = (t: string): string =>
  t === 'number' ? 'numeric' : t === 'boolean' ? 'boolean' : 'text'

/**
 * LIT ET FILTRE CE QUE LE MODÈLE A DÉCLARÉ.
 *
 * ── TROIS GARDES, ET AUCUNE N'EST REDONDANTE.
 *
 * ① `valider` — la forme, jugée par `entitySchema` lui-même, injecté. On
 *    ne réécrit pas sa grammaire ici : elle vit dans le paquet AIR, et
 *    deux grammaires auraient divergé.
 * ② LES BORNES — douze tables, trente champs. La forme peut être
 *    impeccable et la lecture délirante.
 * ③ LES NOMS VIDES DE SENS — `entitySchema` accepte `name: "donnees"`,
 *    puisqu'il juge la grammaire, pas le sens.
 *
 * Ce qui tombe est NOMMÉ. Un refus muet produirait une application à qui
 * il manque une table sans que personne sache laquelle.
 */
export function lireEntites(
  valeur: unknown,
  valider: (e: unknown) => boolean,
): { readonly entites: readonly EntiteDeclaree[]; readonly refus: readonly RefusEntite[] } {
  if (!Array.isArray(valeur)) return { entites: [], refus: [] }
  const entites: EntiteDeclaree[] = []
  const refus: RefusEntite[] = []
  const vues = new Set<string>()

  for (const brut of valeur) {
    const nom =
      typeof (brut as { name?: unknown })?.name === 'string'
        ? String((brut as { name: string }).name)
        : typeof (brut as { id?: unknown })?.id === 'string'
          ? sansPrefixe(String((brut as { id: string }).id))
          : '(sans nom)'

    if (entites.length >= TABLES_MAX) {
      refus.push({ quoi: nom, motif: `au-delà de ${String(TABLES_MAX)} tables` })
      continue
    }
    if (!valider(brut)) {
      refus.push({ quoi: nom, motif: 'forme refusée par le contrat de données' })
      continue
    }
    const e = brut as EntiteDeclaree
    if (e.fields.length > CHAMPS_MAX) {
      refus.push({ quoi: nom, motif: `${String(e.fields.length)} champs, au-delà de ${String(CHAMPS_MAX)}` })
      continue
    }
    if (NOMS_REFUSES.includes(e.name)) {
      refus.push({ quoi: nom, motif: 'ce nom ne dit pas ce que la table conserve' })
      continue
    }
    // DEUX TABLES DU MÊME NOM donneraient deux `create table` du même nom :
    // le schéma s'appliquerait à moitié, et en silence grâce au
    // `if not exists`.
    if (vues.has(e.name)) {
      refus.push({ quoi: nom, motif: 'une autre table porte déjà ce nom' })
      continue
    }
    vues.add(e.name)
    entites.push(e)
  }
  return { entites, refus }
}

/**
 * CE QUE LA PERSONNE LIT AVANT DE PAYER.
 *
 * Une phrase par table, dans ses mots à elle — pas `ent_membre` mais
 * « membre », et les champs à la suite. Un schéma qu'on ne peut pas relire
 * ne peut pas être refusé en connaissance de cause.
 */
export function phraseTable(e: EntiteDeclaree): string {
  // ── DÉFAUT TROUVÉ PAR LE PREMIER TIR RÉEL, 2026-11-02.
  //
  // Cette phrase lisait `f.name` pendant que le schéma écrivait `f.id` sans
  // son préfixe. Mesuré sur un tir à 0,004 $ : le modèle a déclaré
  // `name: "nom"` avec `id: "fld_membre_nom"`. L'écran annonçait donc
  // « membre — nom » et le fichier créait `membre_nom`.
  //
  // Personne n'aurait rien vu avant de chercher une colonne `nom` qui
  // n'existe pas. C'est « vérité écran vs moteur » : on ne présente jamais
  // une vérité de moteur autrement que le moteur ne l'écrit.
  //
  // LA RÈGLE DU SQL NE BOUGE PAS : `nomColonne` lit `f.id` depuis le
  // 2026-10-12, et les serveurs émis par le moteur AIR emploient ces
  // colonnes. La changer casserait ce qui est livré. C'est donc l'ÉCRAN qui
  // s'aligne — et la consigne qui, elle, pousse le modèle à nommer droit.
  // ── LE TYPE AUSSI, et c'est le diff du 2026-11-03 qui l'a montré.
  //
  // La consigne disait « membre — nom, telephone (unique), age, actif ».
  // Le schéma, lui, crée `age numeric` et `actif boolean`. Le modèle devait
  // donc DEVINER — et `actif: "oui"` dans une colonne booléenne est refusé
  // par la base, pas par nous.
  //
  // Depuis que la consigne dit « ces noms exactement », chaque chose
  // qu'elle TAIT est une chose que le modèle invente.
  const champs = e.fields
    .map(
      (f) =>
        `${sansPrefixe(f.id)} (${MOT_DU_TYPE[f.type] ?? 'texte'}${f.unique === true ? ', unique' : ''})`,
    )
    .join(', ')
  // ── ET LE NOM DE LA TABLE AUSSI, ce qui manquait.
  //
  // La correction du 2026-11-02 n'a aligné que les COLONNES. Le nom de la
  // table restait `e.name` pendant que le schéma écrivait `sansPrefixe(e.id)`
  // — et `nomTable` du compilateur fait littéralement la même chose.
  //
  // Mesuré le 2026-11-03 sur `id: 'ent_membre_cotisant', name: 'membre'` :
  // le SQL crée `membre_cotisant`, cette phrase annonçait `membre`.
  //
  // INOFFENSIF HIER, PORTEUR AUJOURD'HUI : cette phrase ne servait qu'à
  // informer un écran. Depuis que la consigne la donne au modèle sous
  // « ces noms exactement », elle DICTE le `base.from('…')` qu'il écrit —
  // donc un `PGRST205 table introuvable` sur chaque écran, en production.
  //
  // `e.name` ne s'affiche PAS à côté : « ces noms exactement » suivi de deux
  // noms rend le choix au modèle, et c'est le choix qu'on lui retire.
  return `${sansPrefixe(e.id)}${e.appendOnly === true ? ' (journal)' : ''} — ${champs}`
}

/** « 3 tables · 11 champs », pour dire la taille d'un coup d'œil. */
export function resumeEntites(entites: readonly EntiteDeclaree[]): string {
  const champs = entites.reduce((n, e) => n + e.fields.length, 0)
  return `${String(entites.length)} table${entites.length > 1 ? 's' : ''} · ${String(champs)} champ${champs > 1 ? 's' : ''}`
}

/**
 * LA PHRASE QUI DIT CE QUE DÉCLARER CHANGE — ET CE QUE ÇA NE CHANGE PAS.
 *
 * Au 2026-11-02, déclarer des données produit un `schema.sql` dans le zip
 * et rien d'autre : les écrans ne s'en servent pas encore (lot D5). Le
 * taire laisserait croire que l'application conserve déjà — et la personne
 * découvrirait le contraire en rechargeant la page, après avoir payé.
 */
export const CE_QUE_DECLARER_CHANGE =
  'Ces tables décrivent ce que votre application devra conserver. Elles ' +
  'partent dans le fichier schema.sql de votre téléchargement, ' +
  'et les écrans s’en servent : ce que vous saisissez est conservé.'
