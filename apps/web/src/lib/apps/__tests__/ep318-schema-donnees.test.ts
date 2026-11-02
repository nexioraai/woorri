/**
 * EP-318 · LE SCHÉMA DES DONNÉES — un livrable de premier rang (lot D2).
 *
 * ── CE QUE LE LOT LIVRE, ET CE QU'IL NE LIVRE PAS.
 *
 * Il livre l'ÉMETTEUR et la PLOMBERIE : le schéma est émis depuis des
 * entités, versionné avec les fichiers, et versé au zip. Il ne livre AUCUN
 * consommateur : les écrans ne s'en servent pas, et le LISEZ-MOI le dit en
 * toutes lettres. Un livrable en avance qui se présente comme fini est un
 * mensonge poli — le contrôle ⑤ garde cette phrase-là.
 *
 * ── LES TROIS CHEMINS OÙ LE SCHÉMA POUVAIT SE PERDRE.
 *
 * Trois routes écrivent la colonne `document` : la génération, la retouche,
 * le retour à une version. Deux d'entre elles la REMPLACENT entièrement.
 * Sans garde, la première retouche d'une œuvre effaçait son schéma, et le
 * zip repartait en « aucune donnée déclarée » alors que l'œuvre en
 * déclarait. Le contrôle ④ tient les trois.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  champsConserves,
  emettreSchemaSql,
  nomColonne,
  nomTable,
  SANS_ENTITE,
  typeSqlDe,
  type EntiteDonnees,
} from '@deribfy/compiler'
import { projetLivrable, SECTION_SCHEMA } from '../projet-livrable'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')
const lire = (...p: string[]): string => readFileSync(join(RACINE, ...p), 'utf8')
const WEB = ['apps', 'web', 'src']

/** Une tontine : l'exemple du propriétaire, et il porte les trois cas. */
const TONTINE: readonly EntiteDonnees[] = [
  {
    id: 'ent_membre',
    fields: [
      { id: 'fld_nom', type: 'text' },
      { id: 'fld_telephone', type: 'text', unique: true },
      { id: 'fld_part', type: 'decimal' },
      // CALCULÉ : rien à stocker, il se recalcule.
      { id: 'fld_total_verse', type: 'decimal', derived: { kind: 'sum' } },
      // SENSIBLE : une colonne absente ne fuit pas.
      { id: 'fld_code_secret', type: 'text', sensitive: true },
    ],
  },
  {
    id: 'ent_cotisation',
    appendOnly: true,
    fields: [
      { id: 'fld_montant', type: 'number' },
      { id: 'fld_recue', type: 'boolean' },
    ],
  },
]

describe('EP-318 · le schéma des données', () => {
  it('① IL S’ÉMET DEPUIS LES ENTITÉS, ET DIT CE QU’IL CONSERVE', () => {
    const sql = emettreSchemaSql(TONTINE)
    expect(sql).toContain('create table if not exists membre (')
    expect(sql).toContain('create table if not exists cotisation (')
    expect(sql).toContain('id text primary key')
    // Les trois types, et leur traduction.
    expect(sql).toContain('nom text')
    expect(sql).toContain('part numeric')
    expect(sql).toContain('montant numeric')
    expect(sql).toContain('recue boolean')
    // `unique` EST UNE CONTRAINTE, pas un commentaire : sans elle, deux
    // écritures simultanées passent toutes les deux, et une vérification
    // applicative ne protège pas d'une course.
    expect(sql).toMatch(/telephone text unique/u)
    // UN JOURNAL SE DIT.
    expect(sql).toMatch(/« cotisation » — JOURNAL/u)
  })

  it('② CE QUI NE DOIT PAS ÊTRE EN BASE N’Y EST PAS', () => {
    const sql = emettreSchemaSql(TONTINE)
    // ── LES DEUX EXCLUSIONS, ET ELLES NE SE RESSEMBLENT PAS.
    //
    // Un champ CALCULÉ stocké créerait une seconde vérité qui finirait par
    // contredire la première. Un champ SENSIBLE, lui, ne doit pas exister :
    // une colonne absente ne fuit pas — c'est la seule garantie qui tient.
    expect(sql, 'un champ calculé est stocké : seconde vérité').not.toContain('total_verse')
    expect(sql, 'un champ sensible est en base : il peut fuir').not.toContain('code_secret')
    expect(champsConserves(TONTINE[0]).map(nomColonne)).toEqual(['nom', 'telephone', 'part'])
  })

  it('③ AUCUNE ENTITÉ DÉCLARÉE SE DIT — ni vide, ni absent', () => {
    // Tant que D1 n'est pas livré, c'est le cas de TOUTES les œuvres. Un
    // fichier vide laisserait croire à une base sans tables ; un fichier
    // absent, que Deribfy n'en produit pas.
    const sql = emettreSchemaSql([])
    expect(sql).toBe(SANS_ENTITE)
    expect(sql, 'le fichier ne dit pas pourquoi il est vide').toMatch(/AUCUNE DONNÉE DÉCLARÉE/u)
    expect(sql, 'il ne dit pas ce que ça implique pour la personne').toMatch(/mémoire/u)
    expect(sql, 'il ne contient aucune table').not.toContain('create table')
    // ET LE ZIP LE PORTE QUAND MÊME. Un fichier qui apparaît et disparaît
    // selon l'état du produit apprend à ne pas être cherché.
    const zip = projetLivrable({ 'index.tsx': 'x' }, '<html></html>', undefined)
    expect([...zip.keys()], 'schema.sql manque au zip').toContain('schema.sql')
    expect(zip.get('schema.sql')).toBe(SANS_ENTITE)
  })

  it('④ LES TROIS ROUTES QUI ÉCRIVENT `document` EMPORTENT LE SCHÉMA', () => {
    // ── DÉFAUT ATTRAPÉ À L'ÉCRITURE DU LOT, PAS APRÈS.
    //
    // La retouche et le retour en arrière REMPLACENT la colonne `document`.
    // Sans garde, la première retouche effaçait le schéma de l'œuvre.
    const routes = [
      ['direct', ['app', 'api', 'generateur', 'direct', 'route.ts']],
      ['retoucher', ['app', 'api', 'generateur', 'retoucher', 'route.ts']],
      ['version', ['app', 'api', 'generateur', 'version', 'route.ts']],
    ] as const
    for (const [nom, chemin] of routes) {
      const src = lire(...WEB, ...chemin)
      // Toute écriture de `document: { fichiers … }` doit porter `schema`.
      // ── MA PREMIERE FORME NE MESURAIT RIEN, ET LA ROUTE DIRECTE L'A DIT.
      //
      // J'exigeais `document:` suivi d'une accolade. La route directe ecrit
      // `document: resultat.ok ? { fichiers … }` -- un ternaire. Zero
      // correspondance, donc un controle vert qui ne regardait rien.
      //
      // On prend desormais une FENETRE apres chaque `document:` qui ecrit
      // des fichiers, et on exige le schema dedans : la propriete, pas une
      // forme d'ecriture particuliere.
      const ecritures = [...src.matchAll(/document:[\s\S]{0,260}/gu)]
        .map((m) => m[0])
        .filter((e) => /fichiers\s*:/u.test(e))
      expect(ecritures.length, `${nom} n’écrit plus le document : le contrôle ne mesure rien`)
        .toBeGreaterThan(0)
      for (const e of ecritures) {
        expect(e, `${nom} écrit le document SANS le schéma : il l’efface`).toContain('schema')
        // LA PORTE SUIT LE MEME CHEMIN, et l'oublier est plus grave :
        // un schema perdu se reemet, une base laissee sans politiques est
        // ouverte en ecriture a qui connait son adresse.
        expect(e, `${nom} écrit le document SANS la porte : il l’efface`).toContain('politiques')
      }
    }
  })

  it('⑤ LE LISEZ-MOI DIT QUE LES ÉCRANS NE S’EN SERVENT PAS ENCORE', () => {
    // ── LA PHRASE DU PROPRIÉTAIRE, ET C'EST UNE EXIGENCE, PAS UN STYLE.
    //
    // « Un livrable en avance qui se présente comme fini est un mensonge
    // poli. » Sans cette section, quelqu'un applique `schema.sql` sur une
    // base puis cherche une heure pourquoi l'application n'écrit rien.
    expect(SECTION_SCHEMA, 'la note ne nomme pas le fichier').toContain('schema.sql')
    expect(SECTION_SCHEMA, 'la note ne dit pas que rien ne s’en sert')
      .toMatch(/ne s[’']en servent pas encore/u)
    expect(SECTION_SCHEMA, 'la note ne dit pas ce que ça fait à la personne')
      .toMatch(/disparaît quand la\s+page est rechargée/u)
    // Et elle est RÉELLEMENT dans le zip, pas seulement exportée.
    const zip = projetLivrable({ 'index.tsx': 'x' }, '<html></html>', 'create table x ();')
    // Les deux apostrophes existent dans ce depot : la droite et la
    // typographique. Un controle qui n'en accepte qu'une rougit sur une
    // difference qui ne change rien pour qui lit la note.
    expect(zip.get('README.md') ?? '', 'la section n’est pas dans le LISEZ-MOI livré')
      .toMatch(/ne s[’']en servent pas encore/u)
    expect(zip.get('schema.sql')).toBe('create table x ();')
  })

  it('⑨ LE PROJET LIVRÉ N’IMPORTE QUE CE QU’IL POSSÈDE', () => {
    // ── DÉFAUT QUE J'AI INTRODUIT EN ÉCRIVANT D2, ET QUI A ÉTÉ LIVRÉ.
    //
    // Un de mes scripts a inséré `import { SANS_ENTITE } from
    // '@deribfy/compiler'` À L'INTÉRIEUR du gabarit `vite.config.ts` — celui
    // qui part dans chaque zip. `tsc` ne pouvait pas le voir : à l'intérieur
    // d'un littéral de gabarit, c'est une CHAÎNE, pas du code.
    //
    // Conséquence pour la personne : `npm install && npm run build` échoue
    // sur un paquet qui n'existe que dans notre dépôt. La page autonome
    // s'ouvre encore en double-clic, mais le PROJET ne se construit plus —
    // et c'est précisément ce que le propriétaire a exigé le 2026-10-30 :
    // « de bonnes applis web téléchargeables, sinon je veux pas accepter ».
    //
    // CE CONTRÔLE LIT LE ZIP, pas la source : il résout chaque import des
    // fichiers d'outillage contre les dépendances réellement déclarées.
    const zip = projetLivrable({ 'index.tsx': 'x' }, '<html></html>', undefined, undefined)
    const paquets = JSON.parse(zip.get('package.json') ?? '{}') as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const possede = new Set([
      ...Object.keys(paquets.dependencies ?? {}),
      ...Object.keys(paquets.devDependencies ?? {}),
    ])
    expect(possede.size, 'le projet livré ne déclare aucune dépendance').toBeGreaterThan(2)

    // Les fichiers d'OUTILLAGE : ceux que la personne exécute avec npm.
    for (const nom of ['vite.config.ts', 'package.json', 'tsconfig.json']) {
      const contenu = zip.get(nom) ?? ''
      expect(contenu, `${nom} manque au projet livré`).not.toBe('')
      for (const m of contenu.matchAll(/^import .*?from '([^']+)'/gmu)) {
        const source = m[1]
        // Un chemin relatif et les modules de Node ne sont pas des paquets.
        if (source.startsWith('.') || source.startsWith('node:')) continue
        // Le nom du paquet : `@portee/nom` ou `nom`, sans sous-chemin.
        const paquet = source.startsWith('@')
          ? source.split('/').slice(0, 2).join('/')
          : source.split('/')[0]
        expect(
          possede.has(paquet),
          `${nom} importe « ${paquet} », que le projet livré ne possède pas : ` +
            '`npm run build` échouera chez la personne',
        ).toBe(true)
      }
    }
    // ET AUCUN PAQUET DE NOTRE DÉPÔT NE DOIT S'Y TROUVER, sous aucune forme.
    for (const [nom, contenu] of zip) {
      if (nom.startsWith('src/')) continue // le code du modèle, jugé ailleurs
      expect(contenu, `${nom} parle de @deribfy : ce paquet n’existe que chez nous`)
        .not.toContain('@deribfy/')
    }
  })

  it('⑥ UNE SEULE ÉMISSION DE DDL DANS TOUT LE DÉPÔT', () => {
    // Le moteur AIR et le moteur DIRECT émettent le MÊME schéma depuis la
    // MÊME fonction. La duplication est fermée avant d'exister — ce dépôt a
    // déjà payé trois copies de la règle de nommage, dont une ignorait les
    // noms réservés, et la publication échouait APRÈS le clic.
    const fastify = lire('packages', 'compiler', 'src', 'emit-fastify.ts')
    expect(fastify, 'emit-fastify a de nouveau son propre DDL')
      .not.toMatch(/create table if not exists \$\{/u)
    expect(fastify, 'emit-fastify ne délègue plus').toContain('emettreSchemaSql(air.entities)')
    // L'émetteur partagé ne connaît PAS AIR : c'est ce qui le rend appelable
    // par le moteur direct, qui n'a pas de ProjectAir et n'en aura pas.
    const emetteur = lire('packages', 'compiler', 'src', 'schema-donnees.ts')
    // ── ON JUGE LES IMPORTS, PAS LA PROSE.
    //
    // Ma premiere forme cherchait « air-schema » n'importe ou dans le
    // fichier -- et le commentaire qui EXPLIQUE pourquoi l'emetteur n'en
    // depend pas la faisait rougir. Un controle qui interdit de nommer le
    // probleme qu'il garde est un mauvais controle.
    const importes = [...emetteur.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/gu)].map((m) => m[1])
    expect(importes, 'l’émetteur s’est ressoudé à AIR').toEqual([])
  })

  it('⑦ LA FORME D’ENTRÉE RESTE CELLE QU’AIR ACCEPTE', () => {
    // Mesuré par exécution le 2026-11-02 : `{id, name, fields:[{id, name,
    // type, required}]}` est accepté par `entitySchema`. Si l'émetteur
    // exigeait davantage, D1 ne pourrait plus le nourrir depuis une
    // déclaration validée contre ce schéma-là.
    const minimal: EntiteDonnees = { id: 'ent_x', fields: [{ id: 'fld_a', type: 'text' }] }
    const sql = emettreSchemaSql([minimal])
    expect(sql).toContain('create table if not exists x (')
    expect(sql).toContain('a text')
    expect(nomTable(minimal)).toBe('x')
    expect(typeSqlDe({ id: 'fld_b', type: 'inconnu' }), 'un type inconnu doit retomber sur text')
      .toBe('text')
  })
})
