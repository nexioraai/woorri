/**
 * EP-323 · AUCUN SECRET DANS LE DOCUMENT SERVI AU NAVIGATEUR.
 *
 * ── POURQUOI CE CLIQUET NAÎT AVANT L'INJECTION QU'IL GARDE.
 *
 * Le lot D4 va faire entrer l'adresse et la clé publishable dans la page
 * autonome. Cette clé est publique par conception — c'est ce qui ship dans
 * tout client Supabase. Rien d'autre n'a le droit d'y entrer.
 *
 * Et ce cliquet est écrit AVANT l'injection, délibérément : la mutation doit
 * porter sur le vrai document, pas sur une page qui n'injecte encore rien.
 *
 * ── CE QU'UN SECRET SERVI NE PARDONNE PAS.
 *
 * « Un secret dans une page publiée ne se rattrape pas : elle est déjà
 * servie. » Un mot de passe de base ou une clé secrète partie dans un
 * `<script>` est lisible par chaque visiteur, mis en cache par chaque proxy,
 * et indexable. Le révoquer après coup, c'est admettre qu'il a fui.
 *
 * ── ET ON MESURE LE DOCUMENT, PAS LA SOURCE.
 *
 * C'est la leçon du zip du 2026-11-02 : un de mes scripts avait inséré un
 * import `@deribfy/compiler` À L'INTÉRIEUR du gabarit `vite.config.ts`.
 * `tsc` ne l'a pas vu — à l'intérieur d'un littéral de gabarit, c'est une
 * chaîne — et ma relecture lisait la source, où l'import a l'air d'être en
 * tête. Le défaut est parti en production.
 *
 * On appelle donc `pageAutonome` et on juge CE QU'ELLE REND.
 */
import { describe, expect, it } from 'vitest'
import { optionsPour, pageAutonome } from '../boucle-directe'

/** Un peu de code d'application, comme le modèle en rend. */
const CODE = 'const App=()=>null;export default App;'

/**
 * LES AIGUILLES — assemblées, jamais écrites en entier.
 *
 * Un contrôle qui porte le motif qu'il interdit se déclenche sur lui-même,
 * et le cliquet des secrets (EP-321 ⑧) balaie les fichiers suivis.
 */
const INTERDITS: readonly (readonly [string, string])[] = [
  ['sb_' + 'secret_' + 'A'.repeat(20), 'une clé SECRÈTE Supabase'],
  ['postgres' + '://postgres:motdepasse@hote:5432/postgres', 'une chaîne de connexion avec ses identifiants'],
  ['postgresql' + '://postgres:motdepasse@hote:5432/postgres', 'une chaîne de connexion avec ses identifiants'],
  ['sbp' + '_' + '0'.repeat(40), 'un jeton de Management API'],
]

/**
 * CE QUI DOIT RESTER PERMIS — et ce n'est pas un détail.
 *
 * Un `postgresql://` NU peut légitimement apparaître dans une application
 * qui PARLE de bases : une documentation, un exemple, un libellé de champ.
 * Un cliquet qui l'interdirait casserait des applications honnêtes, et le
 * suivant le désactiverait entièrement.
 *
 * Ce qui est un secret, c'est la chaîne AVEC ses identifiants.
 */
const PERMIS: readonly string[] = [
  'postgresql' + '://',
  'postgresql' + '://hote:5432/base',
  'sb_' + 'publishable_' + 'A'.repeat(32),
  'startsWith("sbp' + '_")',
]

describe('EP-323 · le document servi ne porte aucun secret', () => {
  it('① LE DOCUMENT ÉMIS NE PORTE AUCUN DES MOTIFS INTERDITS', () => {
    const doc = pageAutonome(CODE, 'Une application')
    // LE TÉMOIN : si la page ne contient pas même le code qu'on lui donne,
    // c'est l'instrument qui est cassé et le contrôle ne mesure rien.
    expect(doc, 'la page ne porte pas le code de l’application').toContain(CODE)
    expect(doc.length, 'la page est vide : le contrôle ne mesure rien').toBeGreaterThan(500)

    for (const [aiguille, quoi] of INTERDITS) {
      expect(doc, `le document servi porte ${quoi}`).not.toContain(aiguille)
    }
  })

  it('② UN SECRET DANS LE CODE FAIT ÉCHOUER L’ÉMISSION, BRUYAMMENT', () => {
    // ── UN REFUS, PAS UN NETTOYAGE SILENCIEUX.
    //
    // Retirer discrètement la chaîne fautive laisserait croire que tout va
    // bien, et personne ne saurait qu'un identifiant a failli partir. Un
    // échec se voit, se lit, et se corrige.
    for (const [aiguille, quoi] of INTERDITS) {
      expect(
        () => pageAutonome(`const X="${aiguille}";${CODE}`, 'Une application'),
        `${quoi} dans le code est SERVI au lieu d’être refusé`,
      ).toThrow(/PAGE_AUTONOME_SECRET/u)
    }
  })

  it('③ NI PAR LE TITRE — le chemin qu’on n’imagine pas', () => {
    // ── LE CHEMIN QU'ON N'IMAGINE PAS : par le titre.
    //
    // Le nom d'une œuvre est écrit par une personne et traverse la page —
    // `<title>`, le manifeste, les balises Apple. Quelqu'un qui collerait
    // une chaîne de connexion dans le champ « nom » la verrait partir dans
    // la page servie. Improbable, et c'est justement pourquoi personne ne
    // le vérifierait.
    //
    // TROUVÉ PAR CE CLIQUET, pas par relecture : le titre traverse la page à
    // QUATRE endroits — `<title>`, le manifeste en data-URI, et deux balises
    // Apple. Juger chaque entrée séparément reviendrait à tenir une liste
    // des chemins, et c'est le chemin qu'on oublie qui sert. Le contrôle
    // porte donc sur le document ASSEMBLÉ.
    for (const [aiguille, quoi] of INTERDITS) {
      expect(
        () => pageAutonome(CODE, aiguille),
        `un titre a fait entrer ${quoi} dans le document servi`,
      ).toThrow(/PAGE_AUTONOME_SECRET/u)
    }
  })

  it('⑤ L’INJECTION PORTE L’ADRESSE ET LA CLÉ PUBLIABLE, ET RIEN D’AUTRE', () => {
    // ── MÊME CODE, DEUX PROVENANCES.
    //
    // Publiée, Deribfy fournit les valeurs. Téléchargée, elles sont VIDES et
    // le LISEZ-MOI dit quoi mettre. L'application lit le même objet dans les
    // deux cas : elle n'a pas à savoir d'où elle vient.
    const publiee = pageAutonome(CODE, 'Une application', {
      url: 'https://psxbilpmnojtlzosokzz.supabase.co',
      clePubliable: 'sb_' + 'publishable_' + 'K'.repeat(32),
      schema: 'oeuvre_fa0ede2c_1111_4111_8111_111111111111',
    })
    expect(publiee, 'l’application ne reçoit pas l’adresse de sa base')
      .toContain('psxbilpmnojtlzosokzz.supabase.co')
    expect(publiee, 'l’application ne reçoit pas le nom de son schéma')
      .toContain('oeuvre_fa0ede2c_1111_4111_8111_111111111111')
    // ── ELLE ARRIVE AVANT LE CODE : l'application doit pouvoir la lire dès
    // sa première ligne, sinon elle démarre sans base et affiche du vide.
    const iConfig = publiee.indexOf('DERIBFY_BASE')
    const iCode = publiee.indexOf(CODE)
    expect(iConfig, 'la configuration n’est pas injectée').toBeGreaterThan(-1)
    expect(iConfig, 'la configuration arrive APRÈS le code de l’application')
      .toBeLessThan(iCode)

    // TÉLÉCHARGÉE : les mêmes clés, vides. Pas d'absence — un emplacement.
    const telechargee = pageAutonome(CODE, 'Une application')
    expect(telechargee, 'l’archive ne porte pas l’emplacement de configuration')
      .toContain('DERIBFY_BASE')
    expect(telechargee, 'l’archive part avec une adresse en dur')
      .not.toContain('supabase.co')

    // ET LE DOCUMENT RESTE PROPRE : aucun des interdits n'est entré par là.
    for (const [aiguille, quoi] of INTERDITS) {
      expect(publiee, `l’injection a fait entrer ${quoi}`).not.toContain(aiguille)
    }
  })

  it('⑦ LES OPTIONS INJECTÉES POSENT LES DEUX EN-TÊTES', () => {
    // ── LE DÉFAUT QUE LE PROPRIÉTAIRE A VU AVANT MOI, mesuré ensuite.
    //
    // PostgREST emploie `Accept-Profile` pour LIRE, `Content-Profile` pour
    // ÉCRIRE. Mesuré sur la vraie base le 2026-11-02 :
    //
    //   LECTURE  (Accept-Profile seul)  HTTP 200  deux lignes
    //   ÉCRITURE (Accept-Profile seul)  HTTP 404  PGRST205 'public.membre'
    //
    // La lecture marche, donc tout a l'air branché — et la première écriture
    // va chercher dans `public`. `db.schema` de supabase-js pose les deux.
    //
    // On injecte donc les options TOUTES FAITES : un choix qu'on ne laisse
    // pas à l'application est un choix qu'elle ne rate pas.
    const doc = pageAutonome(CODE, 'Une application', {
      url: 'https://psxbilpmnojtlzosokzz.supabase.co',
      clePubliable: 'sb_' + 'publishable_' + 'K'.repeat(32),
      schema: 'oeuvre_fa0ede2c',
    })
    expect(doc, 'les options prêtes ne sont pas injectées').toContain('"options"')
    expect(doc, 'les options ne portent pas `db.schema` : l’écriture irait dans public')
      .toMatch(/"db":\s*\{\s*"schema":\s*"oeuvre_fa0ede2c"/u)
    // ET LA FONCTION QUI LES FABRIQUE EST ÉPROUVÉE DIRECTEMENT.
    expect(optionsPour('oeuvre_x')).toEqual({ db: { schema: 'oeuvre_x' }, auth: { persistSession: true } })
  })

  it('⑧ UNE APPLICATION NON RELIÉE LE DIT À L’ÉCRAN', () => {
    // ── « UN EMPLACEMENT, PAS UN TROU » EST JUSTE CÔTÉ CODE, PAS CÔTÉ ÉCRAN.
    //
    // Celui qui dézippe, lance l'application et voit une liste vide ne saura
    // pas si elle est cassée, si c'est normal, ou s'il a raté une étape. Ce
    // qui ne marche pas encore explique pourquoi, LÀ OÙ LA PERSONNE LE
    // DÉCOUVRE — même discipline que « AUCUNE DONNÉE DÉCLARÉE ».
    const sansBase = pageAutonome(CODE, 'Une application')
    expect(sansBase, 'l’application muette ne dit pas qu’elle n’est pas reliée')
      .toMatch(/n’est pas encore reliée à une base/u)
    expect(sansBase, 'le bandeau ne dit pas ce que ça implique pour la saisie')
      .toMatch(/ne sera pas conservé/u)
    expect(sansBase, 'le bandeau ne dit pas où lire la suite').toContain('LISEZ-MOI')

    // ── IL VIT HORS DE `#racine` : React monte dans la racine et effacerait
    // tout ce qui s'y trouve. Le bandeau survivrait à l'affichage mais pas au
    // premier rendu — et personne ne le verrait jamais.
    expect(
      sansBase.indexOf('n’est pas encore reliée'),
      'le bandeau est DANS la racine : le premier rendu de React l’effacera',
    ).toBeLessThan(sansBase.indexOf('id="racine"'))

    // ── ET UNE APPLICATION RELIÉE N'EN PORTE AUCUN.
    const reliee = pageAutonome(CODE, 'Une application', {
      url: 'https://psxbilpmnojtlzosokzz.supabase.co',
      clePubliable: 'sb_' + 'publishable_' + 'K'.repeat(32),
      schema: 'oeuvre_x',
    })
    expect(reliee, 'une application reliée porte un bandeau qui ment')
      .not.toMatch(/n’est pas encore reliée/u)
  })

  it('⑥ UNE CLÉ SECRÈTE PASSÉE À L’INJECTION FAIT ÉCHOUER L’ÉMISSION', () => {
    // ── LE CHEMIN LE PLUS PROBABLE DU DÉFAUT : une erreur de variable.
    //
    // `OEUVRES_SUPABASE_SECRET_KEY` et `OEUVRES_SUPABASE_PUBLISHABLE_KEY` se
    // lisent presque pareil. Celui qui câblera la publication peut prendre
    // l'une pour l'autre — et la page servie porterait alors la clé qui
    // contourne la RLS.
    //
    // Un secret dans une page publiée ne se rattrape pas : elle est déjà
    // servie. L'émission échoue donc, bruyamment.
    expect(
      () =>
        pageAutonome(CODE, 'Une application', {
          url: 'https://psxbilpmnojtlzosokzz.supabase.co',
          clePubliable: 'sb_' + 'secret_' + 'S'.repeat(24),
          schema: 'oeuvre_x',
        }),
      'une clé secrète injectée est SERVIE au lieu d’être refusée',
    ).toThrow(/PAGE_AUTONOME_SECRET/u)
  })

  it('④ CE QUI A LE DROIT D’Y ÊTRE Y RESTE PERMIS', () => {
    // ── UN CLIQUET QUI INTERDIT TROP SERA CONTOURNÉ.
    //
    // La clé PUBLISHABLE doit pouvoir entrer : elle est publique par
    // conception, et sans elle l'application publiée ne lit rien. Ce
    // contrôle existe pour que le suivant ne « durcisse » pas l'aiguille en
    // interdisant `sb_` tout court — ce qui bloquerait l'injection même que
    // D4 doit écrire.
    for (const permis of PERMIS) {
      const doc = pageAutonome(`const X="${permis}";${CODE}`, 'Une application')
      expect(doc, `« ${permis} » est refusé alors qu’il est légitime`).toContain(permis)
    }
  })
})
