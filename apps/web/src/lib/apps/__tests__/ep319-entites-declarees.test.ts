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
import { motifEntre, motifTexte } from './motif-texte'
import { projectAirSchema } from '@deribfy/air-schema'
import { emettreSchemaSql, nomColonne, typeSqlDe } from '@deribfy/compiler'
import {
  blocBase,
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
    //
    // ── 6 200 → 6 600 LE 2026-11-05, et la raison est une CORRECTION.
    //
    // Deux interdictions GÉNÉRALES ne vivaient que dans la moitié AVEC
    // table : le bandeau et les fichiers. Une demande qui ne décrit rien
    // ne déclare aucune table, recevait donc la moitié courte — et le
    // modèle a écrit son propre bandeau en production. Elles entrent
    // ici par `REGLE_6_COMMUN`, composé des deux côtés (EP-360).
    //
    // Mesuré : 6 478. La borne vaut la mesure plus la même marge étroite.
    //
    // ── 6 600 → 7 650 LE 2026-11-12 : LE TABLEAU DE BORD EST ENSEIGNÉ.
    //
    // Ordre du propriétaire : « il faut apprendre à Deribfy à faire ce genre
    // de dashboard ». La bibliothèque fournit les pièces (CoqueGestion,
    // CarteVedette, Courbe, Anneau…) et ./systeme/donnees les calculs ; la
    // consigne dit QUAND les employer, en une règle compressée au minimum.
    // Mesuré : 7 524 (+1 046 signes ≈ 280 jetons par tour, ~850 par
    // génération à trois tours — marginal sur une médiane de 0,07 $, et dit).
    expect(CONSIGNE.length, 'la consigne de génération a grossi').toBeLessThan(7650)
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
    // ── LA DÉROGATION COUVRE DEUX ZONES DEPUIS C0a, et c'est la même.
    //
    // `REGLE_6_COMMUN` est du TEXTE ÉMIS, exactement comme `blocBase` :
    // il dit au modèle de ne pas employer `localStorage`. Ce module
    // n'appelle toujours aucune API de navigateur — la dérogation suit
    // le texte, elle ne s'élargit pas.
    const debutCommun = src.indexOf('export const REGLE_6_COMMUN')
    const finCommun = src.indexOf('\n]', debutCommun)
    const blocCommun = debutCommun < 0 ? '' : src.slice(debutCommun, finCommun)
    const debut = src.indexOf('export function blocBase')
    expect(debut, 'blocBase a disparu : ce contrôle ne borne plus rien').toBeGreaterThan(0)
    const fin = src.indexOf('\nexport ', debut + 10)
    const bloc = src.slice(debut, fin < 0 ? src.length : fin)
    const JETONS = /window|document\.|localStorage|sessionStorage|navigator\./gu
    for (const t of src.matchAll(JETONS)) {
      const dansCommun =
        debutCommun >= 0 && (t.index ?? 0) >= debutCommun && (t.index ?? 0) < finCommun
      if (dansCommun) continue
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
    //    Mesuré le 2026-11-03 : borne 7 600, soit la mesure plus une marge
    //    étroite. Le bloc est structuré, il n'a pas à s'expliquer.
    //
    // ── POURQUOI LA BORNE MONTE À 8 400 LE 2026-11-05.
    //
    // Ce cliquet garde contre la PROSE, et il a fait son travail deux fois
    // ce jour-là : il m'a refusé cinq lignes d'explication sur l'origine
    // opaque, que j'ai retirées — la condition seule suffisait.
    //
    // Ce qui entre maintenant n'est pas de l'explication, ce sont DEUX
    // RÈGLES, et chacune ferme un défaut mesuré :
    //
    //   ① AUCUN FICHIER. Le SDK est embarqué EN ENTIER dans chaque œuvre,
    //      donc `base.storage.from(…).upload()` est APPELABLE. Mesuré le
    //      2026-11-05 : aucun bucket par œuvre, aucune politique, zéro
    //      mention dans `poser-oeuvre`. Le modèle peut donc écrire ce
    //      code, il PARAÎTRA juste, et il mourra à l'exécution. Se taire
    //      ici, c'est laisser le défaut arriver par le chemin le plus
    //      coûteux : celui qui ressemble à du code correct.
    //
    //   ② LECTURE PUBLIQUE (P1). Sans elle, la porte reste à un seul
    //      régime et un portail institutionnel est impossible — mesuré :
    //      `revoke all from anon, public` et aucune politique `anon`.
    //      Et l'exemple des SOUMISSIONS y est, parce que c'est le cas où
    //      un modèle se trompe en ayant raison : « les appels d'offres
    //      sont publics » est vrai de l'appel, faux des offres reçues.
    //
    // ── ET UNE TROISIÈME, LE MÊME JOUR : 8 400 → 9 000 (lot A1).
    //
    // MESURÉ : « administr » ×0 et « visiteur » ×0 dans les 8 226 signes
    // émis. Conséquence pour TOUS les clients à données, pas pour un seul
    // site — le corpus le dit :
    //
    //   faa9f0c3 · 4 tables · insert ×4 · update ×4 · delete ×1
    //   15158240 · 1 table  · insert ×1 · update ×0 · delete ×0
    //   a85966bc · 1 table  · insert ×1 · update ×0 · delete ×0
    //
    // Le modèle écrit spontanément un formulaire de création. MODIFIER et
    // RETIRER manquent dans deux œuvres à tables sur trois : une faute de
    // frappe y est définitive, et le propriétaire doit ouvrir la base
    // lui-même pour la corriger.
    //
    // ── ET LA BORNE MESURE CE QUI PART, PLUS SON GABARIT (2026-11-05).
    //
    // DÉFAUT TROUVÉ EN TIRANT LA GÉNÉRATION DE CONTRÔLE DE A1 : cette
    // assertion lisait `avecBase`, une consigne à UNE table. La consigne
    // réellement émise, à trois tables, faisait 9 238 signes — AU-DESSUS
    // de la borne, et rien n'a rougi.
    //
    // Une garde qui mesure sa fixture au lieu de la production est pire
    // qu'absente : elle rassure à tort. Le pire cas réel n'est pas une
    // table, c'est TABLES_MAX × CHAMPS_MAX, et il est mesuré plus bas.
    //
    // DEUX BORNES, parce qu'il y a DEUX risques distincts :
    //
    //   ① LA PROSE, qui ne doit pas grossir — c'est la règle d'origine,
    //      et elle se mesure sur la part FIXE, indépendante des données.
    //   ② CE QUI PART AU PIRE, qui touche le plafond du modèle et le
    //      coût de chaque tour.
    //
    // Mesuré le 2026-11-05 : part fixe ≈ 9 009 · une table 9 035 ·
    // 12 tables × 3 champs 9 707 · 12 × 30 = 15 131.
    //
    // ── 9 200 → 11 100 LE 2026-11-06 : LA LOI PUBLIC/GESTION EST ENTRÉE.
    //
    // Mesuré après restitution : une table 11 183 · au pire 17 263. La loi
    // ajoute ~1 900 signes à la moitié AVEC base, soit ≈ 514 jetons PAR
    // TOUR, donc ~1 500 par génération à trois tours. Sur une médiane
    // mesurée de 0,07 $, c'est marginal — mais le chiffre se dit, parce
    // que cette prose part à chaque tour de chaque génération.
    //
    // Ces bornes gardent la PROSE, pas le contenu. Le contenu de la loi
    // est énuméré clause par clause dans EP-370, sur la consigne PRODUITE :
    // une borne mesure un volume, une énumération mesure un contenu.
    // Élever l'une en posant l'autre échange le faible contre le fort.
    // ── 11 400 → 12 300 LE 2026-11-12 : la même règle du tableau de bord
    // (voir ⑥). Mesuré : 12 155.
    expect(avecBase.length, 'la prose du bloc de base a enflé').toBeLessThan(12300)

    // ── ET LE BANDEAU N'EST PLUS DEMANDÉ À L'ŒUVRE (2026-11-05).
    //
    // DÉFAUT MESURÉ sur la génération de contrôle de A1. La consigne
    // disait : « SI `url` EST VIDE … l'application marche en mémoire …
    // et LA PAGE LE DIT. » Elle demandait donc le bandeau, en laissant sa
    // condition quatre lignes plus haut. Le modèle l'a écrit — et l'a
    // rattaché à `enBase` au lieu de `!enBase` :
    //
    //   enBase && <div>« Mode aperçu – données en mémoire, non
    //                    conservées. »</div>
    //
    // Un client aurait lu que son travail n'est pas sauvegardé ALORS
    // QU'IL L'EST, sur les trois écrans.
    //
    // La correction n'est pas de mieux expliquer la condition : c'est de
    // retirer la demande. `pageAutonome` pose DÉJÀ ce bandeau, et il dit
    // vrai dans les trois cas (aperçu, archive, servie). Deux auteurs
    // pour une même vérité, c'est une vérité qui se contredit.
    expect(avecBase, 'la consigne redemande un bandeau à l’œuvre').not.toMatch(
      /la page le dit/u,
    )
    // ── L'ANCRE LIT LA PROPRIÉTÉ, PLUS LA PHRASE.
    //
    // Mon motif exigeait « N'ÉCRIS AUCUN BANDEAU » suivi, à 120 signes,
    // de « La page en porte déjà un ». Le texte a été resserré en
    // déménageant dans `REGLE_6_COMMUN`, et le contrôle a rougi sur une
    // correction JUSTE. Une ancre qui enjambe un retour à la ligne
    // mesure la mise en page.
    //
    // La propriété est : l'interdiction est là, ET elle dit POURQUOI —
    // sans quoi le modèle la prend pour une lubie et la contourne.
    expect(avecBase, 'l’interdiction du bandeau a disparu').toMatch(/N’ÉCRIS AUCUN BANDEAU/u)
    expect(avecBase, 'l’interdiction ne dit pas pourquoi').toMatch(/la page en porte déjà/u)

    // ── ② LE PIRE CAS QUI PEUT PARTIR, et il part vraiment.
    const unChamp = (i: number) => ({
      id: `fld_champ${String(i)}`,
      name: `champ${String(i)}`,
      type: 'text',
      required: true,
    })
    const pire = Array.from({ length: TABLES_MAX }, (_, t) => ({
      id: `ent_table${String(t)}`,
      name: `table${String(t)}`,
      fields: Array.from({ length: CHAMPS_MAX }, (_, c) => unChamp(c)),
    })) as unknown as Parameters<typeof blocBase>[0]
    const auPire = consignePour(pire)
    expect(
      auPire.length,
      `la consigne au pire cas (${String(TABLES_MAX)} tables × ${String(CHAMPS_MAX)} champs) a enflé`,
      // ── 15 400 → 17 200 le 2026-11-06, même dossier que la borne de
      // prose ci-dessus. C'est CELLE-CI qui touche le plafond du modèle et
      // le coût du tour : mesurée à 17 194, marge de 206 signes.
      //
      // ET J'AI D'ABORD ANNONCÉ 15 574, qui était faux. J'avais mesuré MA
      // fixture — des noms de champs plus courts que `unChamp` — au lieu de
      // celle du cliquet. C'est mot pour mot la faute que ce fichier
      // dénonce douze lignes plus haut : « une garde qui mesure sa fixture
      // au lieu de la production est pire qu'absente ». Le chiffre juste
      // est celui que le cliquet rend lui-même, pas celui d'un script à
      // côté.
      //
      // ── 17 500 → 18 400 le 2026-11-12 : la règle du tableau de bord (⑥).
      // Mesurée PAR CE CLIQUET : 18 227 — la même hausse de 1 046 signes.
    ).toBeLessThan(18400)

    // ── ③ ET LA PORTE DES DONNÉES RESTE UNE PORTE ÉTROITE.
    //
    // Si une ligne de prose s'ajoutait PAR TABLE, les deux bornes
    // ci-dessus monteraient ensemble sans que rien ne dise d'où ça vient.
    // Le coût d'une table supplémentaire est mesuré : 26 signes.
    const uneTable = consignePour([
      { id: 'ent_a', name: 'a', fields: [unChamp(0)] },
    ] as unknown as Parameters<typeof blocBase>[0])
    const deuxTables = consignePour([
      { id: 'ent_a', name: 'a', fields: [unChamp(0)] },
      { id: 'ent_b', name: 'b', fields: [unChamp(0)] },
    ] as unknown as Parameters<typeof blocBase>[0])
    expect(
      deuxTables.length - uneTable.length,
      'une table coûte désormais plus qu’une ligne de description',
    ).toBeLessThan(60)
    // ── ET CE QU'ELLE LAISSE ENTRER EST EXIGÉ.
    //
    // Monter une borne sans exiger ce qu'elle laisse entrer, ce serait
    // échanger une garde contre un budget. Les quatre gestes, nommés :
    for (const geste of ['lister', 'AJOUTER', 'MODIFIER', 'RETIRER']) {
      expect(avecBase, `« ${geste} » n’est plus demandé au modèle`).toContain(geste)
    }
    // ── DEUX FAITS, DEUX ASSERTIONS — la fenêtre était une forme.
    //
    // Cette ancre exigeait « DEUX FACES » puis « LECTURE seule » à moins de
    // 200 signes. La loi public/gestion a inséré entre les deux la
    // définition de la face publique : la règle était INTACTE, la distance
    // dépassait la fenêtre. Élargir la fenêtre n'aurait fait que déplacer
    // le seuil au prochain ajout.
    //
    // C'est pourtant cette ancre qui a attrapé une VRAIE perte : en
    // réécrivant le bloc j'avais laissé tomber « en LECTURE seule, aucun
    // bouton qui écrit ». Toutes les ancres de forme ne sont pas mauvaises
    // — celle-ci lisait une phrase dont la disparition ÉTAIT la disparition
    // de la règle. On garde donc le fait, séparé de sa mise en page.
    expect(avecBase, 'les deux faces ne sont plus distinguées').toMatch(
      motifTexte('DEUX FACES'),
    )
    expect(avecBase, 'la face publique n’est plus en lecture seule').toMatch(
      motifEntre('LECTURE', 'aucun bouton qui écrit', 60),
    )
    expect(avecBase, 'la conséquence d’un espace de gestion absent n’est pas dite').toMatch(
      /ouvrir\s+la base lui-même/u,
    )
    // ── ET LES DEUX RÈGLES SONT LÀ, pas seulement la place qu'elles prennent.
    //
    // Monter la borne sans exiger ce qu'elle laisse entrer, ce serait
    // échanger une garde contre un budget.
    expect(avecBase, 'la règle du téléversement a disparu').toMatch(/AUCUN FICHIER/u)
    expect(avecBase, 'le modèle peut croire que `storage` marche').toMatch(
      /base\.storage[\s\S]{0,60}ÉCHOUERAIT/u,
    )
    expect(avecBase, 'la lecture publique n’est plus déclarable').toMatch(/lecturePublique/u)
    expect(avecBase.toLowerCase(), 'le défaut n’est plus la fermeture').toMatch(
      // La propriété, pas la phrase : omettre est le défaut, et le défaut
      // est privé. Même conversion qu'EP-352 ③ le 2026-11-06.
      motifEntre('omets', 'privée', 120),
    )
    // ── BORNÉ AU BLOC DE LECTURE PUBLIQUE.
    //
    // Mesuré : un `JAMAIS` vit ailleurs dans la consigne, donc chercher
    // dans le tout laissait passer la disparition du contre-exemple.
    //
    // ET LA FIN EST BORNÉE AUSSI : le bloc commun qui suit porte
    // « JAMAIS localStorage ». Sans cette borne, retirer le
    // contre-exemple restait VERT — mesuré deux fois.
    const debutPublic = avecBase.indexOf('LECTURE PUBLIQUE')
    const finPublic = avecBase.indexOf('N’ÉCRIS AUCUN BANDEAU', debutPublic)
    const regimePublic = avecBase.slice(debutPublic, finPublic < 0 ? undefined : finPublic)
    expect(regimePublic.length, 'le bloc de lecture publique a disparu').toBeGreaterThan(80)
    expect(regimePublic, 'le contre-exemple du voisin a disparu').toMatch(/\bJAMAIS\b/u)

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
