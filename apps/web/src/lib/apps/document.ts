/**
 * LE DOCUMENT D'UNE BOUTIQUE DERIBFY, ÉCRIT POUR LE MOTEUR.
 *
 * ── CE QUE CE FICHIER FAIT, ET CE QU'IL NE FAIT PAS.
 *
 * Il traduit une boutique RÉELLE — son nom, sa couleur, ses articles — en un
 * document AIR que `compileWeb()` sait compiler. C'est le chaînon qui
 * manquait : le moteur produisait trente et une applications dans une porte de
 * vérification, et le site censé les livrer n'avait aucune dépendance vers lui.
 *
 * IL NE RECOPIE PAS UN MODÈLE DU CORPUS. Prendre `boutique-mode` et changer le
 * nom aurait été plus rapide, et aurait fait porter au marchand les INTENTIONS
 * d'une boutique fictive — ses exigences déclarées, ses tests attendus, ses
 * domaines réseau. Un document qui ment sur ce qu'on a demandé ne vaut rien,
 * même s'il compile.
 *
 * ── CE QUE LE MARCHAND REÇOIT, ET CE QU'IL NE REÇOIT PAS.
 *
 * Une application web autonome qui MONTRE SON CATALOGUE. Les données sont
 * celles de l'aperçu — le format AIR ne transporte PAS les lignes, par
 * décision (D-013) : un `dataset` ne porte qu'une empreinte et un nombre de
 * lignes. Les vraies données passent par un serveur, et ce chemin-là existe
 * (`backend.kind: "externe"`, protocole `/air/v1/…`) mais n'est pas branché
 * ici. C'est le lot suivant, et il faut le dire plutôt que de laisser croire.
 */
import type { ProjectAir } from '@deribfy/air-schema'

export type BoutiqueSource = {
  readonly slug: string
  readonly nom: string
  readonly couleur: string | null
  readonly description: string | null
  /** Le nombre d'articles réels — il donne sa taille au jeu d'aperçu. */
  readonly nombreArticles: number
}

/** `mon-shop-123` → `mon_shop_123`. Les identifiants AIR n'acceptent rien d'autre. */
/** Le slug tel que le schéma AIR l'exige : minuscules, chiffres, tirets. */
const ardoise = (brut: string): string => {
  const propre = brut
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Le schéma exige 2 à 63 caractères et refuse un chiffre en tête. Les trois
  // cas sont réels : une boutique peut s'appeler « 2048 », un slug peut être
  // réduit à une lettre après nettoyage, et un nom à rallonge dépasse.
  const cale = propre.length < 2 || /^[0-9]/.test(propre) ? `app-${propre}` : propre
  return cale.slice(0, 63).replace(/-+$/, '')
}

const jeton = (brut: string): string => {
  const propre =
    brut
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'boutique'
  // `prj_` + 61 caracteres au plus : le schema borne l'identifiant de projet,
  // et un slug a rallonge le faisait deborder. Trouve par un test, pas en
  // relisant le schema — c'est pour cela qu'il existe.
  const cale = /^[0-9]/.test(propre) ? `b${propre}` : propre
  return cale.slice(0, 61).replace(/_+$/, '')
}

const fr = (text: string): { locale: string; text: string }[] => [{ locale: 'fr', text }]

export function documentDeLaBoutique(b: BoutiqueSource): ProjectAir {
  const id = jeton(b.slug)
  // Le jeu d'aperçu porte le nombre RÉEL d'articles, borné : une vitrine à
  // trois articles ne doit pas s'afficher avec six lignes inventées, et une
  // à deux mille ne doit pas les rendre toutes dans un aperçu.
  const lignes = Math.max(1, Math.min(24, b.nombreArticles))

  return {
    // La version COURANTE du contrat. Les documents du corpus déclarent 1.0.0
    // et sont migrés en mémoire ; un document NEUF n'a aucune raison de naître
    // périmé.
    airSchemaVersion: '1.34.0',
    projectId: `prj_${id}`,
    app: {
      name: b.nom,
      // LE SLUG EST ASSAINI, pas recopié. Celui de la base est libre — il
      // peut porter un point, une majuscule, un espace — et le schéma AIR,
      // lui, impose sa forme. Mesuré par un test : « Ma Boutique.SY » faisait
      // tomber le document. Le vrai slug reste dans le NOM du fichier livré.
      slug: ardoise(b.slug),
      description: fr(b.description ?? `Le catalogue de ${b.nom}.`),
      locales: {
        userLanguage: 'fr',
        appLocales: ['fr'],
        defaultAppLocale: 'fr',
        contentLocales: ['fr'],
        rtlSupported: false,
      },
    },
    navigation: {
      entryScreenId: 'scr_catalogue',
      routes: [
        { id: 'nav_catalogue', screenId: 'scr_catalogue', title: fr('Catalogue') },
        { id: 'nav_article', screenId: 'scr_article', title: fr('Article') },
      ],
    },
    entities: [
      {
        id: 'ent_article',
        name: 'article',
        // Pas de `label` ici : le schéma d'ENTITÉ est strict et n'accepte que
        // `id`, `name`, `appendOnly`, `fields`. Le libellé vit sur les CHAMPS.
        fields: [
          { id: 'fld_article_nom', name: 'nom', label: fr('nom'), type: 'string', required: true },
          {
            id: 'fld_article_description',
            name: 'description',
            label: fr('description'),
            type: 'text',
            required: false,
          },
          {
            id: 'fld_article_prix',
            name: 'prix',
            label: fr('prix'),
            type: 'decimal',
            required: true,
          },
          {
            id: 'fld_article_photo',
            name: 'photo',
            label: fr('photo'),
            type: 'asset',
            required: false,
          },
        ],
      },
    ],
    relations: [],
    datasets: [
      {
        id: 'data_articles',
        entityId: 'ent_article',
        rowCount: lignes,
        // L'empreinte SÈME le générateur d'aperçu : deux boutiques
        // différentes n'obtiennent pas les mêmes lignes de démonstration.
        contentHash: empreinte(`${id}:${String(lignes)}`),
      },
    ],
    screens: [
      {
        id: 'scr_catalogue',
        title: fr('Catalogue'),
        showsPrimaryNav: true,
        showsScreenTitle: false,
        presentation: 'card',
        blocks: [
          {
            id: 'blk_catalogue_entete',
            blockType: 'header',
            props: [
              { key: 'title', value: b.nom },
              { key: 'subtitle', value: b.description ?? 'Notre catalogue' },
            ],
          },
          {
            id: 'blk_catalogue_liste',
            blockType: 'list',
            entityId: 'ent_article',
            props: [
              { key: 'titleFieldId', value: 'fld_article_nom' },
              { key: 'subtitleFieldId', value: 'fld_article_description' },
              { key: 'trailingFieldId', value: 'fld_article_prix' },
              { key: 'imageFieldId', value: 'fld_article_photo' },
              { key: 'emptyTitle', value: 'Catalogue vide' },
              { key: 'emptyMessage', value: 'Les articles arriveront très bientôt.' },
            ],
          },
        ],
      },
      {
        id: 'scr_article',
        title: fr('Article'),
        showsPrimaryNav: false,
        showsScreenTitle: true,
        presentation: 'card',
        blocks: [
          {
            id: 'blk_article_fiche',
            blockType: 'detail_header',
            entityId: 'ent_article',
            props: [
              { key: 'titleFieldId', value: 'fld_article_nom' },
              { key: 'imageFieldId', value: 'fld_article_photo' },
            ],
          },
        ],
      },
    ],
    actions: [],
    rules: [],
    slots: [],
    capabilities: [],
    permissions: [],
    design: { theme: 'boutique_clair', tokensVersion: '1.0.0' },
    integrations: [],
    network: { policy: 'deny_by_default', allowedDomains: [] },
    native: { minAndroidSdk: 26, minIosVersion: '16.0' },
    compliance: {
      accountDeletionRequired: false,
      commerceClass: 'physical_or_offapp',
      dataCollected: [],
    },
    expectedTests: [],
  } as unknown as ProjectAir
}

/** Une empreinte stable, sans dépendance : le même texte rend la même valeur. */
function empreinte(texte: string): string {
  let h1 = 0x12345678
  let h2 = 0x9abcdef0
  for (let i = 0; i < texte.length; i += 1) {
    h1 = (Math.imul(h1 ^ texte.charCodeAt(i), 2654435761) >>> 0) ^ (h2 >>> 3)
    h2 = (Math.imul(h2 + texte.charCodeAt(i), 1597334677) >>> 0) ^ (h1 >>> 5)
  }
  const bloc = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')
  return (bloc(h1) + bloc(h2)).repeat(4).slice(0, 64)
}
