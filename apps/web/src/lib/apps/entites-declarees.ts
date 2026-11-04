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
    '6. TES DONNÉES VIVENT EN BASE, PAS EN MÉMOIRE.',
    '',
    '   La page te donne sa base dans `window.DERIBFY_BASE` :',
    '',
    "     import { createClient } from '@supabase/supabase-js'",
    '     const b = window.DERIBFY_BASE',
    '     const base = createClient(b.url, b.clePubliable, b.options)',
    '',
    '   Emploie `b.options` TEL QUEL — il dirige lecture ET écriture vers le',
    '   bon endroit. Ne pose aucun en-tête à la main.',
    '',
    '   LA BASE N’OUVRE QU’AUX PERSONNES CONNECTÉES. Écris donc un écran de',
    '   connexion (adresse + mot de passe, `base.auth.signInWithPassword`),',
    '   affiché tant que `base.auth.getSession()` ne rend rien. Sans lui,',
    '   toutes tes listes seront vides et personne ne saura pourquoi.',
    '',
    '   TES TABLES, avec leurs colonnes — ces noms exactement :',
    tables,
    '',
    '   CHAQUE TABLE A EN PLUS une colonne `id` que la base remplit toute',
    '   seule. NE L’ENVOIE PAS à l’écriture ; lis-la pour identifier une',
    '   ligne (clé de liste React, suppression, modification).',
    ...(entites.some((e) => e.appendOnly === true)
      ? [
          '',
          '   UNE TABLE MARQUÉE (journal) N’ACCEPTE QUE DES AJOUTS. La base',
          '   REFUSE d’y modifier ou d’y supprimer une ligne — n’écris donc',
          '   aucun bouton qui le propose : il échouerait sans rien dire.',
        ]
      : []),
    '',
    '   INTERDIT : des valeurs d’exemple écrites en dur. Ce qu’un écran',
    '   montre vient de la base, toujours. Une base vide donne une liste',
    '   vide, et c’est la bonne réponse — pas une raison d’inventer des',
    '   lignes.',
    '',
    '   CHAQUE TABLE SE LIT ET S’ÉCRIT quelque part : une table que personne',
    '   n’interroge est une donnée perdue, et elle te sera renvoyée.',
    '',
    '   ET S’IL TE MANQUE UNE TABLE — parce que tu construis un écran que la',
    '   liste ci-dessus ne couvre pas —, DÉCLARE-LA au lieu de t’en passer.',
    '   Rends ce fichier EN PLUS des autres, au même format :',
    '',
    '   === DONNEES.json ===',
    '   [{ "name": "releve",',
    '      "fields": [{ "name": "date", "type": "date", "required": true }] }]',
    '',
    '   Types possibles : text, number, date, boolean. Ce fichier ne part PAS',
    '   dans l’application : c’est une déclaration.',
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
