/**
 * CE QU'UNE SOUMISSION AUX MAGASINS EXIGE ENCORE — MESURÉ, JAMAIS PROMIS.
 *
 * ── POURQUOI CE MODULE EXISTE.
 *
 * Le propriétaire a choisi, le 2026-10-18, un « panneau d'exigences honnête »
 * plutôt qu'un bouton « Publier sur Google Play ». La raison tient en une
 * phrase : UN BOUTON QUI ÉCHOUERAIT EST PIRE QUE PAS DE BOUTON. Quelqu'un qui
 * clique croit tenir une publication ; il tient une erreur, et il ne sait pas
 * laquelle des sept causes l'a produite.
 *
 * ── CE QUE CE MODULE LIT, ET CE QU'IL NE LIT PAS.
 *
 * Il lit le PROJET ÉMIS — la carte de fichiers que `compileProject` rend, donc
 * `app.json` tel qu'il partira vraiment. Pas une liste d'exigences recopiée à
 * la main : une liste recopiée dérive, et c'est exactement le défaut que ce
 * dépôt passe son temps à fermer.
 *
 * Il ne lit AUCUN compte, AUCUN identifiant, AUCUN magasin. Ces choses vivent
 * chez le propriétaire, et ce module ne prétend pas les connaître — il dit
 * seulement qu'elles sont dues.
 *
 * ── TROIS ÉTATS, ET LA DISTINCTION EST LA VALEUR DU PANNEAU.
 *
 *   · `satisfait`     — le moteur le porte DÉJÀ, mesuré sur l'émission.
 *   · `moteur`        — il manque, et c'est À NOUS de le construire.
 *   · `proprietaire`  — il manque, et personne d'autre que lui ne peut le
 *                       fournir (un compte, une carte bancaire, une capture).
 *
 * Confondre les deux derniers serait le mensonge le plus utile et le plus
 * coûteux : « il vous manque un compte » quand il manque une icône que NOUS
 * n'émettons pas laisse quelqu'un payer 25 $ pour découvrir le vrai blocage.
 */

/** Qui doit agir pour lever l'exigence. */
export type QuiAgit = 'satisfait' | 'moteur' | 'proprietaire'

export type Exigence = {
  /** Ce qui est exigé, en clair, pour quelqu'un qui n'est pas développeur. */
  readonly quoi: string
  readonly qui: QuiAgit
  /** Où la chose se constate — une clé de manifeste, un chemin. Pas de prose. */
  readonly ou?: string
  /** Pourquoi ça bloque, quand ce n'est pas évident. */
  readonly pourquoi?: string
}

/** Le verdict d'ensemble : publiable ou non, et par la faute de qui. */
export type EtatMagasin = {
  readonly exigences: readonly Exigence[]
  /** Combien manquent côté moteur. Zéro = la balle est chez le propriétaire. */
  readonly manquantsMoteur: number
  /** Combien manquent côté propriétaire. */
  readonly manquantsProprietaire: number
}

type ManifesteExpo = {
  readonly name?: unknown
  readonly slug?: unknown
  readonly version?: unknown
  readonly icon?: unknown
  readonly android?: { readonly package?: unknown }
  readonly ios?: { readonly bundleIdentifier?: unknown }
}

const texteNonVide = (v: unknown): boolean => typeof v === 'string' && v.trim() !== ''

/**
 * L'IDENTIFIANT D'APERÇU N'EST PAS UN DÉFAUT — C'EST UNE PHASE NON CONSTRUITE.
 *
 * `previewIdentity` émet volontairement sous `com.deribfy.preview.*` : D-013
 * place l'aperçu sous le compte Deribfy, et l'identité du client (« BYO »)
 * arrive en Phase 12 par le canal App Identity. Le panneau doit donc le dire
 * comme une étape connue de la feuille de route, pas comme une surprise.
 */
const ESPACE_APERCU = 'com.deribfy.preview.'

/**
 * Les exigences d'une soumission, lues sur le projet NATIF réellement émis.
 *
 * `fichiers` est la carte que rend `compileProject` — on y cherche `app.json`
 * et les images. Si `app.json` est absent ou illisible, on ne devine pas : on
 * le DIT, parce qu'un panneau muet sur son propre aveuglement est pire qu'un
 * panneau qui manque.
 */
export function exigencesDuMagasin(fichiers: ReadonlyMap<string, string>): EtatMagasin {
  const brut = fichiers.get('app.json')
  let expo: ManifesteExpo | null = null
  if (brut !== undefined) {
    try {
      const lu = JSON.parse(brut) as { expo?: unknown }
      if (lu.expo !== null && typeof lu.expo === 'object') expo = lu.expo as ManifesteExpo
    } catch {
      expo = null
    }
  }

  if (expo === null) {
    return rendre([
      {
        quoi: "Le projet natif n'a pas de manifeste lisible",
        qui: 'moteur',
        ou: 'app.json',
        pourquoi:
          "Sans manifeste, aucune des autres exigences ne peut être mesurée : ce panneau " +
          'refuse de deviner.',
      },
    ])
  }

  const exigences: Exigence[] = []

  // ── CE QUE LE MOTEUR PORTE DÉJÀ, ET IL EN PORTE BEAUCOUP.
  exigences.push({
    quoi: "Un nom d'application",
    qui: texteNonVide(expo.name) ? 'satisfait' : 'moteur',
    ou: 'app.json › expo.name',
  })
  exigences.push({
    quoi: 'Un numéro de version',
    qui: texteNonVide(expo.version) ? 'satisfait' : 'moteur',
    ou: 'app.json › expo.version',
  })
  exigences.push({
    quoi: 'Un identifiant Android et un identifiant iOS',
    qui:
      texteNonVide(expo.android?.package) && texteNonVide(expo.ios?.bundleIdentifier)
        ? 'satisfait'
        : 'moteur',
    ou: 'app.json › expo.android.package · expo.ios.bundleIdentifier',
  })

  // ── L'IDENTIFIANT EST SOUS NOTRE ESPACE DE NOM, ET C'EST BLOQUANT.
  const sousApercu =
    (typeof expo.android?.package === 'string' && expo.android.package.startsWith(ESPACE_APERCU)) ||
    (typeof expo.ios?.bundleIdentifier === 'string' &&
      expo.ios.bundleIdentifier.startsWith(ESPACE_APERCU))
  if (sousApercu) {
    exigences.push({
      quoi: "Un identifiant qui vous appartienne, hors de l'espace d'aperçu Deribfy",
      qui: 'moteur',
      ou: `app.json › ${ESPACE_APERCU}…`,
      pourquoi:
        "L'application est émise sous notre espace de nom d'aperçu (décision D-013). " +
        "Un magasin la rattacherait à notre compte, pas au vôtre. L'identité qui vous " +
        'appartient est la Phase 12 du chantier, par le canal App Identity.',
    })
  }

  // ── L'ICÔNE : LES DEUX MAGASINS LA REFUSENT ABSENTE.
  const aIconeAuManifeste = texteNonVide(expo.icon)
  const aImageAuProjet = [...fichiers.keys()].some(
    (c) => c.endsWith('.png') && !c.startsWith('node_modules/'),
  )
  if (!aIconeAuManifeste || !aImageAuProjet) {
    exigences.push({
      quoi: "Une icône d'application",
      qui: 'moteur',
      ou: 'app.json › expo.icon',
      pourquoi:
        'Google Play exige une icône 512×512 et App Store une 1024×1024. Le projet émis ' +
        "n'en porte aucune : une construction partirait avec l'icône par défaut d'Expo, " +
        "que les deux magasins refusent pour une application qu'on vend.",
    })
  } else {
    exigences.push({ quoi: "Une icône d'application", qui: 'satisfait', ou: 'app.json › expo.icon' })
  }

  // ── CE QUE NOUS NE POURRONS JAMAIS FOURNIR À SA PLACE.
  //
  // Ces quatre-là ne sont pas des trous dans le moteur : ce sont des choses
  // qui n'existent que chez une personne. Les ranger avec les précédentes
  // ferait croire qu'on peut les construire.
  exigences.push({
    quoi: 'Un compte développeur Google Play',
    qui: 'proprietaire',
    pourquoi: '25 $ une seule fois. Sans lui, rien ne se dépose sur Android.',
  })
  exigences.push({
    quoi: 'Un compte développeur Apple',
    qui: 'proprietaire',
    pourquoi: "99 $ par an. Sans lui, rien ne se dépose sur iOS — et rien ne s'installe non plus.",
  })
  exigences.push({
    quoi: 'Les clés de signature (keystore Android, profil iOS)',
    qui: 'proprietaire',
    pourquoi:
      "Elles identifient l'éditeur auprès du magasin. Nous ne devons pas les détenir : " +
      "qui tient la clé peut publier une mise à jour à votre nom.",
  })
  exigences.push({
    quoi: 'La fiche du magasin : captures, description, politique de confidentialité',
    qui: 'proprietaire',
    pourquoi:
      "Les magasins la refusent incomplète, et son contenu parle de VOTRE activité — " +
      "le moteur ne l'inventera pas.",
  })

  return rendre(exigences)
}

const rendre = (exigences: readonly Exigence[]): EtatMagasin => ({
  exigences,
  manquantsMoteur: exigences.filter((e) => e.qui === 'moteur').length,
  manquantsProprietaire: exigences.filter((e) => e.qui === 'proprietaire').length,
})
