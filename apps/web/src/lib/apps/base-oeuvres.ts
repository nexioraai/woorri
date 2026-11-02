/**
 * LA BASE DES ŒUVRES — séparée de celle de Deribfy, et impossible à confondre.
 *
 * ── LA DÉCISION, ET SA RAISON EXACTE : LE RAYON D'EXPLOSION.
 *
 * Un schéma par œuvre, dans une base Supabase DÉDIÉE. Pas un projet par
 * œuvre — ni le coût ni le provisionnement ne tiennent. Pas non plus dans la
 * base de Deribfy : « hier la fuite était dans notre propre base. Si le
 * schéma d'une œuvre y vit et qu'une politique est fausse, `app_generations`
 * et `catalog_products` sont dans la ligne de mire. »
 *
 * Une base dédiée coûte un projet et borne les dégâts aux œuvres.
 *
 * ── POURQUOI CES NOMS, ET PAS `SUPABASE_URL`.
 *
 * Un nom qui pourrait désigner l'une ou l'autre base est une erreur qui
 * attend son heure. `OEUVRES_` préfixe donc chaque variable, et le mot vient
 * du vocabulaire du dépôt : une « œuvre » est une application générée. On ne
 * peut pas écrire `OEUVRES_SUPABASE_URL` en croyant parler de Deribfy.
 *
 * ── ET POURQUOI AUCUNE N'EST `NEXT_PUBLIC_`.
 *
 * La clé anonyme des œuvres SERA injectée dans les applications publiées —
 * mais au moment de servir la page, par le préambule, et par œuvre. La
 * préfixer `NEXT_PUBLIC_` la cuirait dans le paquet navigateur de Deribfy
 * lui-même : une valeur de plateforme figée au build, là où il faut une
 * valeur servie à l'exécution. Les deux clés restent donc côté serveur.
 *
 * ── MAIS UN NOM NE PROTÈGE DE RIEN. LA GARDE EST UNE ÉGALITÉ.
 *
 * Le défaut qu'on veut rendre impossible n'est pas « mal nommer » : c'est
 * POSER LE SCHÉMA D'UNE ŒUVRE DANS LA BASE DE DERIBFY. Et cela arrive sans
 * faute de frappe — il suffit qu'on recopie l'URL de Deribfy dans
 * `OEUVRES_SUPABASE_URL` un soir de mise en place.
 *
 * `configBaseOeuvres` REFUSE donc quand les deux URL sont les mêmes. C'est la
 * seule garde qui tienne, parce qu'elle regarde la valeur et pas l'étiquette.
 */

/**
 * LES TROIS NOMS — ET ILS DISENT CE QUE LES VALEURS SONT.
 *
 * ── CE PROJET EMPLOIE LE NOUVEAU MODÈLE DE CLÉS SUPABASE.
 *
 * « publishable » et « secret », pas « anon » et « service_role ». Ce ne sont
 * pas des synonymes : les anciennes étaient des JWT signés par une clé de
 * projet, les nouvelles sont des jetons opaques révocables un par un. La clé
 * de signature de ce projet a d'ailleurs été RÉVOQUÉE — les anciennes clés
 * sont mortes, y compris celle qui était écrite en dur dans
 * `slices/validation-appareil/App.tsx`.
 *
 * Garder les noms `ANON_KEY` / `SERVICE_ROLE_KEY` aurait été une étiquette
 * qui mente sur son contenu : exactement le défaut que le garde ci-dessous
 * combat, un étage plus bas. Un nom qui décrit mal ce qu'il porte finit par
 * faire traiter une clé secrète comme une clé publique.
 */
export const NOM_URL_OEUVRES = 'OEUVRES_SUPABASE_URL'
export const NOM_PUBLIABLE_OEUVRES = 'OEUVRES_SUPABASE_PUBLISHABLE_KEY'
export const NOM_SECRETE_OEUVRES = 'OEUVRES_SUPABASE_SECRET_KEY'

/** Celle de Deribfy, nommée ici UNIQUEMENT pour la comparaison de refus. */
export const NOM_URL_DERIBFY = 'NEXT_PUBLIC_SUPABASE_URL'

export type ConfigOeuvres = {
  readonly url: string
  /** Injectée dans les applications publiées, au moment de servir la page. */
  readonly clePubliable: string
  /** Applique le schéma et la porte. Ne quitte JAMAIS le serveur. */
  readonly cleSecrete: string
}

export type RefusConfig = { readonly motif: string; readonly quoiFaire: string }

/**
 * LIT LA CONFIGURATION, OU DIT PRÉCISÉMENT CE QUI MANQUE.
 *
 * `env` est passé en paramètre plutôt que lu dans `process.env` : c'est ce
 * qui rend la garde éprouvable sans toucher à l'environnement réel. Un
 * contrôle qui doit modifier `process.env` pour se vérifier finit par ne
 * plus être vérifié.
 */
export function configBaseOeuvres(
  env: Readonly<Record<string, string | undefined>>,
): { readonly ok: true; readonly config: ConfigOeuvres } | { readonly ok: false; readonly refus: RefusConfig } {
  const url = (env[NOM_URL_OEUVRES] ?? '').trim()
  const clePubliable = (env[NOM_PUBLIABLE_OEUVRES] ?? '').trim()
  const cleSecrete = (env[NOM_SECRETE_OEUVRES] ?? '').trim()
  const deribfy = (env[NOM_URL_DERIBFY] ?? '').trim()

  const absentes = [
    [NOM_URL_OEUVRES, url],
    [NOM_PUBLIABLE_OEUVRES, clePubliable],
    [NOM_SECRETE_OEUVRES, cleSecrete],
  ].filter(([, v]) => v === '').map(([n]) => n)
  if (absentes.length > 0) {
    return {
      ok: false,
      refus: {
        motif: `la base des œuvres n’est pas configurée : ${absentes.join(', ')} absente(s)`,
        quoiFaire:
          'Posez ces variables dans apps/web/.env.local, depuis le projet ' +
          'Supabase DÉDIÉ aux applications générées — jamais celui de Deribfy.',
      },
    }
  }

  // ── LE REFUS QUI COMPTE. Il regarde la VALEUR, pas l'étiquette.
  //
  // Si l'URL des œuvres est celle de Deribfy, poser un schéma d'œuvre
  // créerait des tables à côté de `app_generations` — et une politique
  // fausse sur l'une exposerait l'autre. C'est exactement le rayon
  // d'explosion que la base dédiée existe pour borner.
  if (deribfy !== '' && url === deribfy) {
    return {
      ok: false,
      refus: {
        motif:
          `${NOM_URL_OEUVRES} désigne la base de Deribfy elle-même. ` +
          'Les tables des œuvres se poseraient à côté des nôtres.',
        quoiFaire:
          'Employez le projet Supabase DÉDIÉ aux œuvres. Si vous n’en avez ' +
          'pas encore, n’en désignez aucun : rien ne vaut mieux qu’une base ' +
          'partagée avec la plateforme.',
      },
    }
  }

  // UNE URL DE PROJET A UNE FORME. Une valeur qui n'en a pas est une faute de
  // copie, et il vaut mieux la dire que de la découvrir à la première requête.
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/u.test(url)) {
    return {
      ok: false,
      refus: {
        motif: `${NOM_URL_OEUVRES} n’a pas la forme d’une URL de projet Supabase`,
        quoiFaire: 'Attendu : https://<vingt-caractères>.supabase.co',
      },
    }
  }

  return { ok: true, config: { url: url.replace(/\/$/u, ''), clePubliable, cleSecrete } }
}

/**
 * CE QU'ON NE FAIT PAS, ET IL FAUT QUE ÇA SE SACHE.
 *
 * `benchmarks/supabase-provisioning/` sait CRÉER un projet Supabase par la
 * Management API, le sonder, puis le détruire. Il a réellement tourné le
 * 2026-08-28 — trois exécutions journalisées dans `results/`.
 *
 * On ne s'en sert PAS : un projet par œuvre ne tient ni en coût ni en
 * provisionnement. L'isolement vrai, pour qui en a besoin, passe par le zip
 * branché sur la base du client — même code, autre base.
 *
 * Cette note existe pour que la mécanique ne soit ni oubliée ni redécouverte
 * dans six mois comme une nouveauté. Elle est écrite, mesurée, et en réserve.
 */
export const PROVISIONNEMENT_EN_RESERVE =
  'benchmarks/supabase-provisioning/ crée un projet par la Management API ' +
  '(éprouvé le 2026-08-28, 3 exécutions). Délibérément inemployé : un projet ' +
  'par œuvre ne tient pas en coût.'
