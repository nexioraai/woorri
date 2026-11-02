/**
 * LE SCHÉMA DES DONNÉES D'UNE ŒUVRE — émis depuis les ENTITÉS, et rien d'autre.
 *
 * ── POURQUOI CE MODULE EXISTE, ET POURQUOI IL EST SI PETIT.
 *
 * Le dépôt savait déjà émettre un schéma : `emit-fastify.ts` le fait depuis
 * 2026-10-12. Mais sa fonction prenait un `ProjectAir` entier — MESURÉ le
 * 2026-11-02 : **19 clés requises** au sommet (`screens` avec au moins un
 * écran, `navigation`, `design`, `compliance`, `expectedTests`…).
 *
 * Or le DDL ne lit RIEN de tout ça. Mesuré ligne par ligne, il touche sept
 * propriétés : `e.id`, `e.appendOnly`, puis `f.id`, `f.type`, `f.derived`,
 * `f.sensitive`, `f.unique`. Deux sur l'entité, cinq sur le champ.
 *
 * La fonction n'était donc pas soudée au pipeline AIR par sa LOGIQUE, mais
 * par sa SIGNATURE. C'est une soudure accidentelle, et on la défait ici.
 *
 * ── CE QUE ÇA REND POSSIBLE.
 *
 * Le moteur direct — celui qui écrit du React en texte libre et que
 * l'atelier retouche — n'a pas de `ProjectAir` et n'en aura pas. Il peut
 * maintenant émettre le même schéma que le moteur AIR, depuis la même
 * fonction. **Une seule vérité pour deux moteurs**, posée avant que la
 * duplication existe plutôt qu'après l'avoir payée : ce dépôt a déjà vécu
 * trois copies de la règle de nommage, dont une ignorait les noms réservés,
 * et la publication échouait APRÈS le clic.
 *
 * ── LA FORME D'ENTRÉE EST CELLE QUE `entitySchema` ACCEPTE DÉJÀ.
 *
 * Mesuré par exécution le 2026-11-02 : `{ id, name, fields: [{ id, name,
 * type, required }] }` est ACCEPTÉ par le vrai schéma Zod. Ce module prend
 * donc exactement ça — structurellement, pas nominalement : il n'importe
 * pas `@deribfy/air-schema`, pour que le moteur direct puisse l'appeler
 * sans rien connaître d'AIR.
 */

/** Un champ, réduit à ce que le SQL en a besoin. */
export interface ChampDonnees {
  readonly id: string
  readonly type: string
  /** Posé quand la valeur est CALCULÉE : rien à stocker. */
  readonly derived?: unknown
  /** Posé quand la valeur ne doit jamais toucher la base. */
  readonly sensitive?: boolean
  readonly unique?: boolean
}

/** Une entité, réduite de même. */
export interface EntiteDonnees {
  readonly id: string
  readonly fields: readonly ChampDonnees[]
  /** Un JOURNAL : rien ne s'y réécrit ni s'y efface. */
  readonly appendOnly?: boolean
}

/** Le nom de table : l'identifiant, sans son préfixe. */
export const nomTable = (e: EntiteDonnees): string => e.id.replace(/^ent_/u, '')

/** Le nom de colonne, de même. */
export const nomColonne = (f: ChampDonnees): string => f.id.replace(/^fld_/u, '')

/**
 * CE QUI EST RÉELLEMENT CONSERVÉ EN BASE.
 *
 * Deux exclusions, et chacune a sa raison :
 *
 * · un champ DÉRIVÉ se recalcule — le stocker créerait une seconde vérité
 *   qui finirait par contredire la première ;
 * · un champ SENSIBLE ne doit pas s'y trouver du tout. C'est la seule
 *   garantie qui tient : une colonne absente ne fuit pas.
 */
export const champsConserves = (e: EntiteDonnees): readonly ChampDonnees[] =>
  e.fields.filter((f) => f.derived === undefined && f.sensitive !== true)

/**
 * LE TYPE SQL D'UN CHAMP — trois types, et c'est voulu.
 *
 * Ils ont le MÊME sens en SQLite et en Postgres. Un `timestamp` natif
 * aurait obligé à écrire deux schémas, puis à les tenir d'accord.
 */
export function typeSqlDe(f: ChampDonnees): string {
  switch (f.type) {
    case 'number':
    case 'decimal':
      return 'numeric'
    case 'boolean':
      return 'boolean'
    default:
      return 'text'
  }
}

/**
 * LE CAS « AUCUNE ENTITÉ DÉCLARÉE » — dit, jamais passé sous silence.
 *
 * Tant que le modèle ne déclare pas ses entités (lot D1), les œuvres n'en
 * ont aucune. Un fichier VIDE laisserait croire à une base sans tables ;
 * un fichier ABSENT laisserait croire que Deribfy n'en produit pas.
 *
 * Le fichier dit donc ce qui est vrai : il n'y a rien à créer PARCE QUE
 * rien n'a été déclaré. Même discipline que la note de livraison — un
 * livrable en avance qui se présente comme fini est un mensonge poli.
 */
export const SANS_ENTITE = [
  '-- AUCUNE DONNÉE DÉCLARÉE POUR CETTE APPLICATION.',
  '--',
  '-- Ce fichier est vide de tables, et ce n’est pas une erreur : cette',
  '-- version de l’application n’a déclaré aucune donnée à conserver. Elle',
  '-- fonctionne entièrement en mémoire — ce que vous saisissez disparaît',
  '-- quand la page est rechargée.',
  '--',
  '-- Il n’y a donc rien à appliquer sur une base pour l’instant.',
  '',
].join('\n')

/**
 * LE SCHÉMA, ÉMIS.
 *
 * `if not exists` partout : le fichier s'applique autant de fois qu'on veut
 * sans jamais rien détruire de ce qui est déjà là.
 */
export function emettreSchemaSql(entites: readonly EntiteDonnees[]): string {
  if (entites.length === 0) return SANS_ENTITE
  const l: string[] = [
    '-- ÉMIS PAR DERIBFY DEPUIS LES DONNÉES DÉCLARÉES — NE PAS ÉDITER À LA MAIN.',
    '--',
    '-- S’applique autant de fois qu’on veut : rien n’y est détruit.',
    '',
  ]
  for (const e of entites) {
    l.push(
      `-- « ${nomTable(e)} »${
        e.appendOnly === true ? ' — JOURNAL : rien ne s’y réécrit ni s’y efface.' : ''
      }`,
      `create table if not exists ${nomTable(e)} (`,
      '  id text primary key',
      // ── `unique` DEVIENT UNE CONTRAINTE, PAS UN COMMENTAIRE.
      //
      // Mesuré le 2026-10-12 : 72 champs `unique` dans 28 documents, et le
      // schéma émis n'en portait AUCUNE contrainte. Un cahier réel l'exige
      // mot pour mot — « une référence de transaction ne peut être utilisée
      // qu'une seule fois dans toute l'application ». Sans contrainte en
      // base, deux écritures simultanées passent toutes les deux : une
      // vérification applicative ne protège pas d'une course.
      ...champsConserves(e).map(
        (f) => `, ${nomColonne(f)} ${typeSqlDe(f)}${f.unique === true ? ' unique' : ''}`,
      ),
      ');',
      '',
    )
  }
  l.push(
    '-- `not null` n’est volontairement PAS posé : le contrat dit ce qui est',
    '-- requis À LA SAISIE, et c’est là qu’on le fait respecter. Une colonne',
    '-- obligatoire en base aurait bloqué la lecture des lignes déjà écrites',
    '-- avant qu’un champ devienne requis — une migration déguisée en schéma.',
    '',
  )
  return l.join('\n')
}
