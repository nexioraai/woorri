/**
 * EP-319 · LES DONNÉES DÉCLARÉES (lot D1).
 *
 * ── LA DÉCISION QUE CE CLIQUET GARDE.
 *
 * Le modèle DÉCLARE ses données avant d'écrire les écrans. Il ne les déduit
 * pas après : `unique`, `required` et une relation entre entités n'existent
 * nulle part dans du React. On obtiendrait un schéma VALIDE et FAUX — le
 * pire des deux, parce qu'il s'appliquerait sans erreur.
 *
 * ── ET LA CONSIGNE DE GÉNÉRATION NE GROSSIT PAS.
 *
 * Elle est passée de 1 363 à 5 904 signes en deux semaines, et on la
 * soupçonne d'avoir coûté un tir. Le bloc entre dans `lire-brief`, la route
 * qui LIT et rend du JSON — pas dans celle qui construit. Le contrôle ⑥
 * tient cette frontière.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettreSchemaSql, nomColonne, typeSqlDe } from '@deribfy/compiler'
import {
  CE_QUE_DECLARER_CHANGE,
  CHAMPS_MAX,
  CONSIGNE_ENTITES,
  lireEntites,
  NOMS_REFUSES,
  phraseTable,
  resumeEntites,
  TABLES_MAX,
  DEUX_SILENCES_INDISCERNABLES,
} from '../entites-declarees'
import { CONSIGNE, consignePour, REGLE_6_SANS_BASE } from '../boucle-directe'
import { lireSource } from './lire-source'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), 'utf8')
const WEB = ['apps', 'web', 'src']

/** Le vrai juge, celui que le compilateur applique — jamais une copie. */
const schemaEntite = projectAirSchema.shape.entities.element
const valider = (e: unknown): boolean => schemaEntite.safeParse(e).success

const champ = (nom: string, extra: Record<string, unknown> = {}) => ({
  id: `fld_${nom}`,
  name: nom,
  type: 'text',
  required: true,
  ...extra,
})
const table = (nom: string, champs = [champ('nom')], extra: Record<string, unknown> = {}) => ({
  id: `ent_${nom}`,
  name: nom,
  fields: champs,
  ...extra,
})

describe('EP-319 · les données déclarées', () => {
  it('① CE QUE LE MODÈLE DÉCLARE DE BONNE FOI PASSE', () => {
    const { entites, refus } = lireEntites(
      [table('membre', [champ('nom'), champ('telephone', { unique: true })]), table('cotisation')],
      valider,
    )
    expect(refus, 'une déclaration honnête est refusée').toEqual([])
    expect(entites.map((e) => e.name)).toEqual(['membre', 'cotisation'])
    // ET ELLE TRAVERSE JUSQU'AU SQL : c'est tout l'objet du lot. Déclarer
    // des tables qui n'atteignent pas `schema.sql` ne servirait à rien.
    //
    // ── LE NOM A CHANGÉ LE 2026-11-04, LA PROPRIÉTÉ NON.
    //
    // La route émet désormais depuis `entitesCourantes` : le cahier amorce
    // la liste, et le CONSTRUCTEUR la complète quand il découvre, en
    // dessinant, un écran que la liste ne couvrait pas. Émettre depuis
    // l'entrée perdrait exactement ces tables-là.
    const sql = emettreSchemaSql(entites)
    expect(sql).toContain('create table if not exists membre (')
    expect(sql).toMatch(/telephone text unique/u)
  })

  it('② LE JUGE EST `entitySchema`, PAS UNE GRAMMAIRE RECOPIÉE', () => {
    // Deux grammaires auraient divergé, et c'est la nôtre qui aurait eu
    // tort : la sienne est celle que le compilateur applique.
    const malformees = [
      { id: 'membre', name: 'membre', fields: [champ('nom')] }, // id sans `ent_`
      { id: 'ent_membre', name: 'Membre', fields: [champ('nom')] }, // majuscule
      { id: 'ent_membre', name: 'membre', fields: [] }, // aucun champ
      { id: 'ent_membre', name: 'membre' }, // pas de champs du tout
      'une chaîne',
      null,
    ]
    const { entites, refus } = lireEntites(malformees, valider)
    expect(entites, 'une forme refusée par le contrat est passée').toEqual([])
    expect(refus.length, 'les refus ne sont pas tous nommés').toBe(malformees.length)
    for (const r of refus) {
      expect(r.motif.length, 'un refus sans motif est un mur').toBeGreaterThan(10)
    }
  })

  it('③ LA FORME PEUT ÊTRE IMPECCABLE ET LA LECTURE DÉLIRANTE', () => {
    // `entitySchema` juge la GRAMMAIRE, pas le sens. Trois gardes de plus,
    // et aucune n'est redondante avec lui.
    const trop = Array.from({ length: TABLES_MAX + 3 }, (_, i) => table(`t${String(i)}`))
    const r1 = lireEntites(trop, valider)
    expect(r1.entites.length, 'la borne de tables ne mord pas').toBe(TABLES_MAX)
    expect(r1.refus.length).toBe(3)

    const large = table(
      'membre',
      Array.from({ length: CHAMPS_MAX + 1 }, (_, i) => champ(`c${String(i)}`)),
    )
    const r2 = lireEntites([large], valider)
    expect(r2.entites, 'une table de trente-et-un champs est passée').toEqual([])
    expect(r2.refus[0].motif).toContain(String(CHAMPS_MAX))

    // UN NOM VIDE DE SENS : même discipline qu'EP-309 sur le nom de produit.
    // Un schéma dont on ne peut pas lire les noms n'est pas vérifiable par
    // la personne qui le reçoit.
    for (const mot of NOMS_REFUSES) {
      const { entites } = lireEntites([table(mot)], valider)
      expect(entites, `« ${mot} » est accepté comme nom de table`).toEqual([])
    }

    // DEUX TABLES DU MÊME NOM : le `if not exists` ferait appliquer le
    // schéma à moitié, et en silence.
    const r3 = lireEntites([table('membre'), table('membre', [champ('autre')])], valider)
    expect(r3.entites.length, 'un doublon de nom est passé').toBe(1)
    expect(r3.refus[0].motif).toContain('porte déjà ce nom')
  })

  it('④ LA ROUTE DE GÉNÉRATION REVALIDE — elle ne croit pas le navigateur', () => {
    // ── L'INVARIANT DU DÉPÔT, ET IL A DÉJÀ ÉTÉ PAYÉ.
    //
    // Le 2026-10-31, le pré-vol validait la devise et la route faisait
    // confiance : une plateforme tchadienne rendue en EUR. Un contrôle fait
    // en amont ne dispense jamais celui qui écrit. Et ici l'enjeu est plus
    // grand : une entité forgée deviendrait une table dans `schema.sql`.
    const src = lire(...WEB, 'app', 'api', 'generateur', 'direct', 'route.ts')
    expect(src, 'la route ne lit pas les entités du corps').toContain('.entites')
    expect(src, 'la route ne les revalide pas').toContain('lireEntites(')
    expect(src, 'la route n’emploie pas le vrai juge').toContain('projectAirSchema')
    // Elles doivent nourrir le schéma, pas dormir dans une variable.
    expect(src, 'les entités n’atteignent pas le schéma')
      .toMatch(/emettreSchemaSql\(entitesCourantes\)/u)
  })

  it('⑤ L’ÉCRAN MONTRE LES TABLES, ET DIT CE QUE ÇA NE FAIT PAS ENCORE', () => {
    // ── LA PHRASE PORTE LE TYPE DEPUIS LE 2026-11-03, et c'est le diff
    //    schéma/consigne qui l'a imposé : `age numeric` et `actif boolean`
    //    existaient en base, la phrase disait « age, actif », et le modèle
    //    devait deviner. `actif: "oui"` dans une colonne booléenne est
    //    refusé par la base — pas par nous.
    expect(phraseTable(table('membre', [champ('nom'), champ('tel', { unique: true })])))
      .toBe('membre — nom (texte), tel (texte, unique)')
    expect(
      phraseTable(table('m', [champ('age', { type: 'number' }), champ('actif', { type: 'boolean' })])),
      'le type n’est pas dit au modèle : il l’inventera',
    ).toBe('m — age (nombre), actif (vrai/faux)')
    expect(phraseTable(table('versement', [champ('montant')], { appendOnly: true })))
      .toContain('(journal)')
    expect(resumeEntites([table('a'), table('b', [champ('x'), champ('y')])]))
      .toBe('2 tables · 3 champs')

    // ── LA PHRASE EST UNE EXIGENCE, PAS UN ORNEMENT.
    //
    // Montrer des tables sans dire que les écrans ne s'en servent pas
    // laisserait croire que l'application conserve déjà. La personne le
    // découvrirait en rechargeant la page — après avoir payé.
    expect(CE_QUE_DECLARER_CHANGE, 'la phrase ne nomme pas le fichier')
      .toContain('schema.sql')
    // ── CES DEUX ASSERTIONS EXIGEAIENT UN MENSONGE (corrigé le 2026-11-04).
    //
    // Elles imposaient « ne s’en servent pas encore » et « disparaît quand
    // la page est rechargée ». C’était vrai le 2026-11-02 ; D5 ④ l’a rendu
    // FAUX le 2026-11-03 — membre inscrit depuis le formulaire de l’œuvre,
    // retrouvé après rechargement dans un processus neuf.
    //
    // Un cliquet qui exige une phrase sur l’état du produit la fige : il
    // transforme une description périmée en obligation. EP-335 ⑤ garde
    // désormais la règle — la phrase ne doit pas affirmer le contraire de
    // ce qui est mesuré.
    expect(CE_QUE_DECLARER_CHANGE, 'la phrase ne dit plus ce que deviennent les données')
      .toMatch(/conserv/u)

    const ecran = lire(...WEB, 'components', 'onboarding', 'ConversationApplication.tsx')
    expect(ecran, 'l’écran ne montre pas les tables').toContain('phraseTable(e)')
    // ── MA FORME NE MESURAIT RIEN : la ligne d'IMPORT contient déjà le
    // nom, donc retirer la phrase de l'écran laissait le contrôle vert.
    // On exige l'usage en JSX, qu'un import ne peut pas produire.
    expect(ecran, 'l’écran ne dit pas ce que déclarer change')
      .toMatch(/\{CE_QUE_DECLARER_CHANGE\}/u)
    expect(ecran, 'les écartées sont muettes').toContain('entitesRefusees')
    // ET ELLES VOYAGENT. Montrées puis oubliées, elles ne serviraient à rien.
    expect(ecran, 'les entités ne sont pas transmises à la génération')
      .toMatch(/body: JSON\.stringify\(\{[\s\S]{0,200}entites,/u)
  })

  it('⑥ LA CONSIGNE DE GÉNÉRATION N’A PAS GROSSI', () => {
    // ── LE CHIFFRE QUI A MOTIVÉ CETTE FRONTIÈRE.
    //
    // 1 363 signes il y a deux semaines, 5 904 aujourd'hui, et on soupçonne
    // cette croissance d'avoir coûté un tir. Le bloc des données entre donc
    // dans `lire-brief` — qui ne construit rien, LIT, et rend du JSON.
    // La consigne de lecture a quitté la route pour son propre module le
    // 2026-11-03 : un fichier de route n'exporte que ses verbes HTTP, et
    // une consigne qu'on ne peut pas rejouer est une consigne dont on
    // découvre les défauts sur l'écran d'un client.
    const brief = lire(...WEB, 'lib', 'apps', 'consigne-lire-brief.ts')
    expect(brief, 'le bloc n’est pas dans la route de lecture').toContain('CONSIGNE_ENTITES')
    // LA VALIDATION EST RESTÉE DANS LA ROUTE, et c'est normal : la consigne
    // DIT quoi rendre, la route JUGE ce qui revient. Les séparer n'a pas
    // déplacé le juge — il n'a rien à faire dans un texte d'instructions.
    const route = lire(...WEB, 'app', 'api', 'generateur', 'lire-brief', 'route.ts')
    expect(route, 'la lecture n’emploie pas le vrai juge').toContain('projectAirSchema')

    // ── ON MESURE LA CONSIGNE RÉSOLUE, PAS UNE TRANCHE DE SOURCE.
    //
    // Ma première forme découpait le fichier entre deux accents graves. Or
    // la consigne en contient des ÉCHAPPÉS dès sa première règle : la
    // tranche s'arrêtait au tiers, et une règle ajoutée plus bas n'y
    // entrait jamais. Le contrôle était vert parce qu'il ne regardait
    // presque rien.
    //
    // On importe donc la constante et on juge la CHAÎNE — ce que le modèle
    // reçoit vraiment, interpolations comprises.
    //
    // MESURÉ le 2026-11-02 : 5 904 signes, dont 2 853 viennent du bloc
    // interpolé de la bibliothèque d'interface et 3 051 de la prose. Plus
    // de la MOITIÉ de ce que le modèle lit n'est donc pas de la prose
    // ajoutée à la main — ce qui rend la croissance de la prose d'autant
    // plus surveillable.
    expect(
      CONSIGNE,
      'une règle sur les données est entrée dans la consigne de génération : ' +
        'elle fait déjà 5 904 signes, et le bloc structuré a sa place dans `lire-brief`',
    ).not.toMatch(/ENTITES|entité|create table|table SQL|schema\.sql/u)
    // LA BORNE EST LA MESURE PLUS UNE MARGE ÉTROITE : assez pour une
    // correction de formulation, pas pour un chantier de plus.
    expect(CONSIGNE.length, 'la consigne de génération a grossi').toBeLessThan(6200)
  })

  it('⑥ter LA DÉROGATION DE PORTABILITÉ EST BORNÉE À `blocBase`', () => {
    // ── POURQUOI UNE DÉROGATION, ET POURQUOI ELLE DOIT ÊTRE BORNÉE.
    //
    // `blocBase` ÉMET la ligne `const b = window.DERIBFY_BASE` dans la
    // consigne. Le cliquet de portabilité a donc rougi — à raison : il lit
    // du texte, et le texte dit `window`. Mais ce module n'APPELLE rien :
    // un client natif qui l'invoque reçoit une chaîne de caractères.
    //
    // C'est le même cas que `PRELUDE` dans `boucle-directe.ts`, et la même
    // discipline s'applique : une dérogation non bornée est un trou. Si un
    // vrai `window` était posé un jour AILLEURS dans ce fichier, la ligne
    // de dérogation le couvrirait en silence. Ce contrôle l'empêche.
    const src = lireSource(join(RACINE, ...WEB, 'lib', 'apps', 'entites-declarees.ts'))
    const debut = src.indexOf('export function blocBase')
    expect(debut, 'blocBase a disparu : ce contrôle ne borne plus rien').toBeGreaterThan(0)
    const fin = src.indexOf('\nexport ', debut + 10)
    const bloc = src.slice(debut, fin < 0 ? src.length : fin)
    const JETONS = /window|document\.|localStorage|sessionStorage|navigator\./gu
    for (const t of src.matchAll(JETONS)) {
      const dans = (t.index ?? 0) >= debut && (t.index ?? 0) < (fin < 0 ? src.length : fin)
      expect(
        dans,
        `« ${t[0]} » est employé hors de blocBase (position ${String(t.index)}) : ` +
          'la dérogation de portabilité ne couvre que le texte ÉMIS, pas un appel réel',
      ).toBe(true)
    }
    // ET LE DÉNOMINATEUR EST RÉEL : zéro occurrence passerait aussi.
    expect((bloc.match(JETONS) ?? []).length, 'blocBase ne nomme plus la base de la page')
      .toBeGreaterThan(0)
  })

  it('⑥bis LA RÈGLE 6 NE S’ABROGE PAS : ELLE S’ÉCHANGE', () => {
    // ── CE QUE CE CONTRÔLE GARDE, ET POURQUOI C'EST UN ÉCHANGE.
    //
    // La consigne cesse d'être universelle : avec des entités déclarées, le
    // bloc de base PREND LA PLACE de la règle 6 ; sans entités, la règle 6
    // telle quelle. JAMAIS LES DEUX.
    //
    // Si le bloc s'AJOUTAIT à côté de « écris des valeurs d'exemple
    // plausibles », le modèle obéirait aux deux consignes — il brancherait
    // la moitié des écrans sur la base et peuplerait l'autre moitié de
    // valeurs en dur. L'application serait à moitié amnésique, et le défaut
    // ressemblerait à un bug du modèle plutôt qu'à une consigne
    // contradictoire.
    //
    // ── ON JUGE LA CHAÎNE RÉSOLUE, pas le source qui l'assemble.
    //
    // C'est exactement ce que le modèle reçoit — aucune prose, aucun
    // gabarit, aucune concaténation ne peut tromper ce contrôle.
    const sansBase = consignePour([])
    const avecBase = consignePour([
      {
        id: 'ent_membre',
        name: 'membre',
        fields: [champ('nom', { required: true }), champ('telephone', { unique: true })],
      },
    ])

    // ① SANS ENTITÉS : IDENTIQUE À L'OCTET. La branche des données n'a pas
    //    le droit de modifier le chemin de ceux qui n'en déclarent pas.
    expect(sansBase, 'la consigne sans base a changé').toBe(CONSIGNE)
    expect(sansBase, 'la règle 6 a disparu du chemin sans base').toContain(REGLE_6_SANS_BASE)

    // ② AVEC ENTITÉS : LA RÈGLE 6 N'EST PLUS LÀ. C'est le cœur : la
    //    coexistence est ce qu'on interdit, pas l'absence du bloc.
    expect(avecBase, 'la règle des valeurs d’exemple coexiste avec le bloc de base').not.toContain(
      REGLE_6_SANS_BASE,
    )
    expect(
      avecBase,
      'les valeurs d’exemple survivent quelque part dans la consigne avec base',
    ).not.toMatch(/valeurs d’exemple PLAUSIBLES/u)

    // ③ ET LE BLOC A BIEN PRIS SA PLACE — au même rang, pas en annexe.
    //    Un bloc ajouté à la fin serait lu après seize autres règles.
    expect(avecBase, 'le bloc de base est absent').toContain('6. TES DONNÉES SE CONSERVENT EN BASE')
    expect(avecBase, 'la consigne ne nomme pas les tables déclarées').toMatch(/membre/u)
    expect(avecBase, 'le bloc n’interdit pas les valeurs en dur').toMatch(/INTERDIT/u)
    expect(
      avecBase,
      'le bloc ne demande pas d’écran de connexion : la base n’ouvre qu’aux connectés, ' +
        'donc une application sans écran de connexion lirait zéro ligne sans dire pourquoi',
    ).toContain('signInWithPassword')
    // UN SEUL RANG 6 : deux « 6. » voudraient dire que l'échange a échoué
    // et que les deux textes se suivent.
    expect(
      (avecBase.match(/^6\. /gmu) ?? []).length,
      'il y a deux règles numérotées 6 : l’échange n’a pas eu lieu',
    ).toBe(1)

    // ④ ET LA PROSE NE GROSSIT PAS PAR LA PORTE DES DONNÉES.
    //
    //    Mesuré le 2026-11-03. La borne vaut la mesure plus une marge
    //    étroite : le bloc est structuré, il n'a pas à s'expliquer.
    expect(avecBase.length, 'le bloc de base a enflé').toBeLessThan(7600)
  })

  it('⑧ L’ÉCRAN NOMME LES COLONNES COMME LE SCHÉMA LES CRÉE', () => {
    // ── DÉFAUT TROUVÉ PAR LE PREMIER TIR RÉEL, 2026-11-02, pour 0,004 $.
    //
    // Le modèle a déclaré `name: "nom"` avec `id: "fld_membre_nom"`.
    // L'écran annonçait « membre — nom » et le fichier créait `membre_nom` :
    // personne n'aurait rien vu avant de chercher une colonne absente.
    //
    // La règle de nommage existe DEUX FOIS — ici pour l'écran, dans le
    // compilateur pour le SQL — parce qu'un composant client ne peut pas
    // importer le compilateur (il tire `node:sqlite`). Une duplication
    // qu'on ne peut pas supprimer se PROUVE ÉGALE.
    const cas = [
      'fld_nom',
      'fld_membre_nom',
      'fld_telephone_du_membre',
      'fld_fld_double',
      'nom_sans_prefixe',
      'fld_',
    ]
    for (const id of cas) {
      const champ1 = { id, name: 'peu importe', type: 'text', required: true }
      // Ce que l'ÉCRAN affiche, extrait de la phrase qu'il rend.
      const vu = phraseTable({ id: 'ent_t', name: 't', fields: [champ1] }).split('— ')[1]
      // Ce que le SCHÉMA crée, dit par la fonction du compilateur. La phrase
      // porte désormais le type entre parenthèses : on compare le NOM, puis
      // le type séparément — plutôt que d'assouplir la comparaison, ce qui
      // aurait laissé passer n'importe quelle dérive du nom.
      expect(vu?.replace(/ \(.*\)$/u, ''), `l’écran et le schéma divergent sur « ${id} »`).toBe(
        nomColonne(champ1),
      )
    }

    // ── ET LE TYPE AUSSI EST PROUVÉ ÉGAL, pas seulement le nom.
    //
    // Le mot de la consigne doit correspondre à ce que `typeSqlDe` émet,
    // sinon on retombe exactement dans « vérité écran vs moteur » un cran
    // plus bas : un nom juste, un type inventé.
    const TYPES = [
      ['text', 'texte', 'text'],
      ['number', 'nombre', 'numeric'],
      ['decimal', 'nombre', 'numeric'],
      ['boolean', 'vrai/faux', 'boolean'],
      ['date', 'texte, date ISO aaaa-mm-jj', 'text'],
    ] as const
    for (const [type, mot, sql] of TYPES) {
      const f = { id: 'fld_x', name: 'x', type, required: true }
      expect(typeSqlDe(f), `le compilateur a changé le type SQL de « ${type} »`).toBe(sql)
      const vu = phraseTable({ id: 'ent_t', name: 't', fields: [f] })
      expect(vu, `la consigne ne dit pas le type de « ${type} »`).toContain(`(${mot})`)
      // Un mot qui annonce un nombre là où la base attend du texte (ou
      // l'inverse) ferait écrire au modèle une valeur que la base refuse.
      const annonceNombre = mot === 'nombre'
      expect(annonceNombre, `« ${mot} » et « ${sql} » ne disent pas la même chose`).toBe(
        sql === 'numeric',
      )
    }
    // ET LA CONSIGNE POUSSE LE MODÈLE À NOMMER DROIT, pour que l'alignement
    // ne soit pas seulement exact mais aussi lisible.
    expect(CONSIGNE_ENTITES, 'la consigne ne dit pas de ne pas répéter la table')
      .toMatch(/fld_membre_nom/u)
  })

  it('⑧ LES DEUX SILENCES SONT CONSIGNÉS, dans les bons mots', () => {
    // ── LA CORRECTION DU PROPRIÉTAIRE, ET POURQUOI ELLE COMPTE.
    //
    // J'avais écrit « pas de filet ». « La phrase pas de filet fait réparer
    // un filet. La vraie phrase fait réparer la DISTINCTION, qui est la
    // seule chose qui compte et qui est beaucoup moins de travail. »
    expect(DEUX_SILENCES_INDISCERNABLES, 'la note ne nomme plus les deux états')
      .toMatch(/illisible/u)
    expect(DEUX_SILENCES_INDISCERNABLES, 'la note ne dit plus qu’ils sont indiscernables')
      .toMatch(/indiscernables/u)
    expect(DEUX_SILENCES_INDISCERNABLES, 'la note ne distingue plus le résultat de la perte')
      // `[\s\S]` plutot que le drapeau `s` : le build cible une version de
    // TypeScript ou ce drapeau n'existe pas, et il a refuse la suite.
      .toMatch(/résultat[\s\S]*perte/u)
    expect(DEUX_SILENCES_INDISCERNABLES, 'la note ne dit plus ce qui rend la perte silencieuse')
      .toMatch(/confusion/u)
  })

  it('⑦ LE BLOC DEMANDÉ AU MODÈLE DIT SES BORNES ET SES REFUS', () => {
    // Un modèle à qui on ne dit pas la borne la franchit, et c'est nous qui
    // refusons ensuite — en ayant payé la sortie.
    expect(CONSIGNE_ENTITES).toContain('ENTITES')
    expect(CONSIGNE_ENTITES, 'la borne de tables n’est pas dite').toContain(String(TABLES_MAX))
    expect(CONSIGNE_ENTITES, 'la borne de champs n’est pas dite').toContain(String(CHAMPS_MAX))
    expect(CONSIGNE_ENTITES, 'les noms vides de sens ne sont pas nommés').toContain('donnees')
    // ET LE SILENCE EST AUTORISÉ : une application sans rien à conserver
    // existe. Forcer une table produirait un schéma inventé.
    expect(CONSIGNE_ENTITES, 'l’omission n’est pas permise').toMatch(/OMETS cette clé/u)
    // L'exemple donné au modèle doit lui-même passer le vrai juge, sinon on
    // enseigne une forme qu'on refuse ensuite.
    expect(valider({
      id: 'ent_membre',
      name: 'membre',
      fields: [{ id: 'fld_telephone', name: 'telephone', type: 'text', required: true, unique: true }],
    }), 'l’exemple de la consigne serait refusé').toBe(true)
  })
})
