/**
 * DU MODÈLE MÉTIER À L'APPLICATION — LE CHAÎNON QUI MANQUAIT.
 *
 * ── LE DÉFAUT QUE CE FICHIER FERME.
 *
 * P0 comprenait déjà : il tirait d'une phrase les acteurs, les concepts, leurs
 * attributs, les parcours. Et ce qu'il comprenait NE SERVAIT À RIEN — le
 * document était bâti sur un squelette figé, « une liste de 8 éléments »,
 * identique que l'on demande une tontine ou une place de marché.
 *
 * Le propriétaire l'a dit en une phrase : « on peut pas construire un truc
 * qu'on a pas compris ». Il avait compris avant moi que la compréhension ne
 * servait à rien tant qu'elle ne commandait pas la construction.
 *
 * ── CE QUI REND LA DÉRIVATION POSSIBLE SANS RIEN INVENTER.
 *
 * `TABLE_GESTES` dit DÉJÀ, pour chaque geste du métier, quel bloc il exige :
 * `consulter` → une liste, `saisir` → un formulaire, `chercher` → une entrée
 * de recherche. Ce n'est pas moi qui décide ; je lis une table que le dépôt
 * tient depuis longtemps.
 *
 * ELLE EST REÇUE EN ARGUMENT, jamais recopiée. Le dépôt a quatre fois vu « une
 * liste écrite deux fois diverge » — c'est écrit dans `modele-metier.mjs` — et
 * une cinquième copie ici ne ferait pas exception.
 */
import type { ProjectAir } from '@deribfy/air-schema'

/** La forme que P0 rend. Seul ce qui sert à construire est décrit ici. */
export type ModeleMetier = {
  readonly acteurs?: { id?: string; nom?: string }[]
  readonly concepts?: {
    id?: string
    nom?: string
    donnees?: boolean
    attributs?: { id?: string; nature?: string; requis?: boolean }[]
  }[]
  readonly parcours?: {
    id?: string
    besoin?: string
    acteur?: string
    etapes?: { concept?: string; geste?: string }[]
  }[]
}

/** Ce que la table dit d'un geste. On n'en lit que le bloc. */
export type TableGestes = Record<string, { bloc: string | null }>

const fr = (text: string): { locale: string; text: string }[] => [{ locale: 'fr', text }]

/** `ordre de passage` → `ordre_de_passage`. Les identifiants AIR sont stricts. */
const jeton = (brut: string, repli: string): string => {
  const propre = brut
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const base = propre === '' ? repli : propre
  return (/^[0-9]/.test(base) ? `n${base}` : base).slice(0, 40)
}

/**
 * La nature d'un attribut métier devient un type AIR.
 *
 * `intervalle` et `duree` tombent sur des types EXISTANTS plutôt que d'en
 * inventer : un créneau est une date, une durée est un nombre. Prétendre
 * autrement obligerait à un type que le moteur ne sait pas rendre.
 */
const TYPE_PAR_NATURE: Record<string, string> = {
  texte: 'string',
  nombre: 'number',
  media: 'asset',
  date: 'datetime',
  intervalle: 'datetime',
  duree: 'number',
  booleen: 'boolean',
  reference: 'string',
}

export type Derivation = {
  readonly document: ProjectAir
  /** Ce qu'on a tiré du modèle, en français, pour le dire à l'utilisateur. */
  readonly compris: string[]
}

export function documentDepuisModele(
  modele: ModeleMetier,
  table: TableGestes,
  identite: { nom: string; description: string | null },
): Derivation | null {
  // SEULS LES CONCEPTS QUI PORTENT DES DONNÉES deviennent des entités. Un
  // concept sans données est une idée du métier, pas une table.
  const concepts = (modele.concepts ?? []).filter((c) => c.donnees === true && (c.nom ?? '') !== '')
  if (concepts.length === 0) return null

  const idEntite = new Map<string, string>()
  const entities = concepts.map((c, i) => {
    const nom = jeton(c.nom ?? '', `concept${String(i)}`)
    const eid = `ent_${nom}`
    idEntite.set(c.id ?? nom, eid)
    const champs = (c.attributs ?? []).filter((a) => (a.id ?? '') !== '')
    return {
      id: eid,
      name: nom,
      fields: [
        // UN NOM, TOUJOURS. Une entité sans champ affichable ne se rend pas,
        // et P0 ne garantit pas qu'un attribut textuel existe.
        {
          id: `fld_${nom}_nom`,
          name: 'nom',
          label: fr(c.nom ?? nom),
          type: 'string',
          required: true,
        },
        ...champs.map((a) => ({
          id: `fld_${nom}_${jeton(a.id ?? '', 'champ')}`,
          name: jeton(a.id ?? '', 'champ'),
          label: fr(a.id ?? ''),
          type: TYPE_PAR_NATURE[a.nature ?? 'texte'] ?? 'string',
          required: a.requis === true,
        })),
      ],
    }
  })

  // UN PARCOURS DEVIENT UN ÉCRAN. C'est le découpage du métier, pas le mien :
  // « le membre veut cotiser » est un écran parce que c'est un besoin, pas
  // parce qu'un gabarit prévoyait trois onglets.
  const parcours = (modele.parcours ?? []).filter((p) => (p.besoin ?? '') !== '')
  const screens = parcours.slice(0, 8).map((p, i) => {
    const nom = jeton(p.id ?? p.besoin ?? '', `ecran${String(i)}`)
    const blocs: unknown[] = [
      {
        id: `blk_${nom}_entete`,
        blockType: 'header',
        props: [{ key: 'title', value: (p.besoin ?? '').slice(0, 80) }],
      },
    ]
    // CHAQUE ÉTAPE APPELLE SON BLOC, et c'est la table qui le dit.
    const vus = new Set<string>()
    for (const [j, e] of (p.etapes ?? []).entries()) {
      const type = table[e.geste ?? '']?.bloc
      const eid = idEntite.get(e.concept ?? '')
      if (type === null || type === undefined || eid === undefined) continue
      // Deux étapes du même geste sur le même concept ne font qu'un bloc :
      // montrer deux fois la même liste serait du remplissage.
      const cle = `${type}:${eid}`
      if (vus.has(cle)) continue
      vus.add(cle)
      const champs = entities.find((x) => x.id === eid)?.fields ?? []
      blocs.push(
        type === 'form'
          ? {
              id: `blk_${nom}_saisie${String(j)}`,
              blockType: 'form',
              entityId: eid,
              props: [
                { key: 'fieldIds', value: champs.slice(0, 5).map((f) => f.id) },
                { key: 'submitLabel', value: 'Valider' },
                { key: 'title', value: (p.besoin ?? '').slice(0, 60) },
                { key: 'loadingTitle', value: 'Enregistrement…' },
                { key: 'emptyTitle', value: 'À compléter' },
              ],
            }
          : {
              id: `blk_${nom}_liste${String(j)}`,
              blockType: 'list',
              entityId: eid,
              props: [
                { key: 'titleFieldId', value: champs[0]?.id ?? '' },
                ...(champs[1] === undefined ? [] : [{ key: 'subtitleFieldId', value: champs[1].id }]),
                { key: 'emptyTitle', value: 'Rien pour l’instant' },
                { key: 'emptyMessage', value: 'Les éléments apparaîtront ici.' },
              ],
            },
      )
    }
    return {
      id: `scr_${nom}`,
      title: fr((p.besoin ?? '').slice(0, 60)),
      showsPrimaryNav: true,
      showsScreenTitle: false,
      presentation: 'card',
      blocks: blocs,
    }
  })
  if (screens.length === 0) return null

  const racine = jeton(identite.nom, 'application')
  const document = {
    airSchemaVersion: '1.34.0',
    projectId: `prj_${racine}`.slice(0, 64),
    app: {
      name: identite.nom,
      slug: jeton(identite.nom, 'application').replace(/_/g, '-').slice(0, 63),
      description: fr(identite.description ?? `L’application ${identite.nom}.`),
      locales: {
        userLanguage: 'fr',
        appLocales: ['fr'],
        defaultAppLocale: 'fr',
        contentLocales: ['fr'],
        rtlSupported: false,
      },
    },
    navigation: {
      entryScreenId: screens[0]?.id ?? '',
      routes: screens.map((s, i) => ({
        id: `nav_${jeton(s.id, `r${String(i)}`)}`,
        screenId: s.id,
        title: s.title,
      })),
    },
    entities,
    relations: [],
    datasets: entities.map((e) => ({
      id: `data_${e.name}`,
      entityId: e.id,
      rowCount: 6,
      contentHash: empreinte(`${racine}:${e.id}`),
    })),
    screens,
    actions: [],
    rules: [],
    slots: [],
    capabilities: [],
    permissions: [],
    design: { theme: 'boutique_clair', tokensVersion: '1.0.0' },
    integrations: [],
    network: { policy: 'deny_by_default', allowedDomains: [] },
    native: { minAndroidSdk: 26, minIosVersion: '16.0' },
    compliance: { accountDeletionRequired: false, commerceClass: 'none', dataCollected: [] },
    expectedTests: [],
  } as unknown as ProjectAir

  return {
    document,
    compris: [
      `Les personnes : ${(modele.acteurs ?? []).map((a) => a.nom ?? a.id).filter(Boolean).join(', ') || '—'}`,
      `Ce que l’application manipule : ${concepts.map((c) => c.nom).join(', ')}`,
      ...parcours.slice(0, 5).map((p) => `Un écran pour : ${p.besoin ?? ''}`),
    ],
  }
}

/** Empreinte stable, sans dépendance : même texte, même valeur. */
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
