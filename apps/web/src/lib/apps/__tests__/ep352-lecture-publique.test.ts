/**
 * EP-352 · P1 — UNE TABLE DÉCLARE SI SA LECTURE EST PUBLIQUE.
 *
 * ── CE QUE P OUVRE, ET POURQUOI C'EST LE GESTE LE PLUS DANGEREUX DU LOT.
 *
 * Aujourd'hui la porte d'une œuvre a UN régime, mesuré le 2026-11-05 sur la
 * politique réellement stockée :
 *
 *     revoke all on releve from anon, public;
 *     create policy releve_lecture on releve for select to authenticated
 *
 * `anon` est révoqué, et aucune politique ne le nomme. Un portail
 * institutionnel a besoin de l'inverse : n'importe qui lit les actualités,
 * seul l'administrateur les publie.
 *
 * ── LE CAS QUI FAIT COMPRENDRE POURQUOI P5 EXISTE.
 *
 * Un modèle qui lit « les appels d'offres sont publics » peut déclarer
 * publique la table des SOUMISSIONS des fournisseurs. Sur un marché public
 * ce serait une faute grave : les offres concurrentes doivent rester
 * SCELLÉES jusqu'à l'ouverture des plis. Un appel d'offres est public ; ce
 * qu'on y répond ne l'est pas.
 *
 * Rien dans la FORME de la déclaration ne distingue ces deux tables. C'est
 * pourquoi la garde ne peut pas être seulement grammaticale, et pourquoi
 * l'écran doit nommer au propriétaire chaque table lisible par n'importe
 * qui AVANT que l'adresse existe.
 *
 * ── ET LE DÉFAUT VA VERS LE SÛR.
 *
 * Une table privée qu'on croyait publique se voit tout de suite : la page
 * est vide. L'inverse ne se voit JAMAIS.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource, lireSourceBrut } from './lire-source'
import { litPublique } from '@deribfy/compiler'
import { blocBase, lecturePubliqueDe, type EntiteDeclaree } from '../entites-declarees'

const APPS = join(__dirname, '..')
const table = (x: Record<string, unknown>): EntiteDeclaree =>
  ({
    id: 'ent_actualite',
    name: 'actualite',
    fields: [{ id: 'fld_titre', name: 'titre', type: 'text', required: true }],
    ...x,
  }) as EntiteDeclaree

describe('EP-352 · P1 · la lecture publique se déclare', () => {
  it('① ABSENT ⇒ PRIVÉE. L’oubli va vers le sûr', () => {
    expect(lecturePubliqueDe(table({})), 'une table sans déclaration est publique').toBe(false)
    expect(lecturePubliqueDe(table({ lecturePublique: false }))).toBe(false)
    expect(lecturePubliqueDe(table({ lecturePublique: true })), 'la déclaration n’ouvre rien').toBe(
      true,
    )
  })

  it('② UNE VALEUR MAL ÉCRITE LAISSE LA TABLE PRIVÉE — jamais l’inverse', () => {
    // ── POURQUOI CE CONTRÔLE N'EST PAS UNE FORMALITÉ.
    //
    // JavaScript rend `'non'` VRAI par coercition. Et `'non'` est
    // exactement ce qu'un modèle écrit quand on lui demande un booléen en
    // français. Un `if (e.lecturePublique)` aurait rendu publique une
    // table que la déclaration disait privée.
    //
    // D'où `=== true`, et rien d'autre.
    for (const mauvais of [
      'oui',
      'non',
      'true',
      'false',
      'public',
      1,
      0,
      -1,
      [],
      {},
      [true],
      { valeur: true },
      null,
      undefined,
      Number.NaN,
      ' ',
    ]) {
      expect(
        lecturePubliqueDe(table({ lecturePublique: mauvais })),
        `« ${JSON.stringify(mauvais) ?? String(mauvais)} » a ouvert la lecture`,
      ).toBe(false)
    }
  })

  it('③ LE MODÈLE SAIT LE DÉCLARER — et sait quand NE PAS le faire', () => {
    const bloc = blocBase([table({})])
    expect(bloc, 'la lecture publique n’est pas déclarable').toMatch(/"lecturePublique": true/u)
    // ── LE DÉFAUT EST DIT, pas seulement la possibilité.
    //
    // Une consigne qui apprend à ouvrir sans apprendre que le défaut est
    // fermé produirait des tables publiques par imitation.
    expect(bloc, 'le défaut n’est plus la fermeture').toMatch(/OMETS par défaut/u)
    expect(bloc, 'la conséquence n’est pas dite').toMatch(
      /N’importe qui lit alors cette table, sans\s+compte/u,
    )
    // ── ET L'ÉCRITURE N'EST JAMAIS OUVERTE, c'est dit au modèle aussi.
    expect(bloc, 'l’écriture pourrait sembler ouverte').toMatch(
      /L’écriture reste[\s\S]{0,60}compte de l’application/u,
    )
    // ── LE CAS DES PLIS SCELLÉS, textuellement.
    //
    // C'est le seul endroit du dépôt où ce piège est expliqué au modèle.
    // Le retirer rendrait la consigne muette là où elle se trompe en ayant
    // raison.
    // ── ON EXIGE LE CONTRE-EXEMPLE, PAS CELUI-CI (2026-11-06).
    //
    // Deux cliquets épinglaient « appels d'offres … SOUMISSIONS » et
    // « ouverture des plis » : le marché public, mot pour mot. Tant
    // qu'ils le tiennent, cet exemple est INCHANGEABLE — et c'est le
    // mécanisme qui a maintenu `releve_index_precedent` en vie jusqu'à
    // ce qu'un modèle le recopie et en fasse un produit.
    //
    // La propriété est qu'un contre-exemple existe : une chose publique
    // présentée À CÔTÉ d'une chose voisine qui ne l'est pas. Le
    // « JAMAIS » porte ce contraste.
    //
    // ET ON CHERCHE DANS LE BLOC, PAS DANS TOUTE LA CONSIGNE : un
    // `JAMAIS` vit ailleurs (« N'AFFICHE JAMAIS », « JAMAIS
    // localStorage »). Mesuré : sans cette borne, retirer le
    // contre-exemple restait VERT.
    //
    // ET LA FIN EST BORNÉE AUSSI : le bloc commun qui suit porte
    // « JAMAIS localStorage ». Sans cette borne, retirer le
    // contre-exemple restait VERT — mesuré deux fois.
    const debutPublic = bloc.indexOf('LECTURE PUBLIQUE')
    const finPublic = bloc.indexOf('N’ÉCRIS AUCUN BANDEAU', debutPublic)
    const regime = bloc.slice(debutPublic, finPublic < 0 ? undefined : finPublic)
    expect(regime.length, 'le bloc de lecture publique a disparu').toBeGreaterThan(80)
    expect(regime, 'le contre-exemple du voisin n’est plus enseigné').toMatch(/\bJAMAIS\b/u)
    expect(bloc, 'le modèle n’a plus de consigne en cas de doute').toMatch(/hésites, OMETS/u)
  })

  it('④ ET LE TÉLÉVERSEMENT EST INTERDIT TANT QUE F N’EXISTE PAS', () => {
    // ── LE PIÈGE, MESURÉ LE 2026-11-05.
    //
    // Le SDK Supabase est embarqué EN ENTIER dans chaque œuvre, donc
    // `base.storage.from(…).upload()` est APPELABLE. Et il n'existe :
    //
    //   aucun bucket par œuvre        createBucket : 0 occurrence
    //   aucune politique storage      emettrePolitiquesSql : tables seules
    //   aucune mention dans poser-oeuvre
    //
    // Le modèle peut donc écrire ce code, il PARAÎTRA juste, et il mourra
    // à l'exécution. C'est le chemin le plus coûteux : celui qui ressemble
    // à du code correct.
    const bloc = blocBase([table({})])
    expect(bloc, 'le téléversement n’est plus interdit').toMatch(/AUCUN FICHIER/u)
    expect(bloc, 'le modèle peut croire que `storage` marche').toMatch(
      /base\.storage[\s\S]{0,60}ÉCHOUERAIT/u,
    )
    // ET UNE SORTIE EST DONNÉE : interdire sans dire quoi faire à la place
    // fait inventer autre chose.
    // ── MÊME LEÇON, LE MÊME JOUR : l'ancre enjambait un retour à la
    //    ligne. « Un lien vers un » / « document se met en `text` » —
    //    le texte n'a pas changé de sens, seulement de largeur.
    expect(bloc, 'aucune solution de rechange n’est proposée').toMatch(
      /lien vers un\s+document/u,
    )
  })

  it('⑥ LES DEUX LECTURES DU DRAPEAU SONT PROUVÉES ÉGALES', () => {
    // ── UNE DUPLICATION QU'ON NE PEUT PAS SUPPRIMER SE PROUVE.
    //
    // `lecturePubliqueDe` vit ici ; `litPublique` vit dans le compilateur.
    // Les joindre tirerait `node:sqlite` dans le paquet navigateur — le
    // défaut qu'EP-314 garde et qui a déjà tué un build. C'est le même
    // arrangement que `nomTable`/`nomColonne`, et la même obligation.
    //
    // SI ELLES DIVERGENT, LE DÉFAUT EST SILENCIEUX ET GRAVE : l'écran de
    // P5 dirait « privée » pendant que le SQL émettrait une porte
    // anonyme. Deux vérités, et c'est celle du moteur qui sert.
    for (const v of [
      true,
      false,
      undefined,
      null,
      'oui',
      'non',
      'true',
      'false',
      'public',
      1,
      0,
      -1,
      [],
      {},
      [true],
      { valeur: true },
      Number.NaN,
      ' ',
    ]) {
      expect(
        lecturePubliqueDe({ lecturePublique: v }),
        `les deux lectures divergent sur ${JSON.stringify(v) ?? String(v)}`,
      ).toBe(litPublique({ lecturePublique: v }))
    }
  })

  it('⑤ LA PUBLICITÉ EST INCONNAISSABLE D’UN SQL DE SCHÉMA — et ça se dit', () => {
    // ── LE DÉFAUT DÉJÀ PAYÉ SUR `required`, LE 2026-11-04.
    //
    // Une déclaration relue d'un SQL ne CONNAÎT pas l'obligation : elle ne
    // rend pas `false`, elle ne rend RIEN — et écrire `false` à sa place
    // produisait N écarts FAUX sur toute œuvre d'avant.
    //
    // `lecturePublique` a exactement la même propriété : il ne vit pas
    // dans le schéma, il vit dans les POLITIQUES. Une œuvre d'avant P1 n'a
    // donc PAS de publicité connaissable, et la comparer inventerait un
    // écart sur chacune de ses tables.
    // ── LE CHAMP EXISTE, dans le CODE.
    expect(
      lireSource(join(APPS, 'entites-declarees.ts')),
      'l’inconnaissable n’est plus marqué',
    ).toMatch(/publiciteInconnue/u)

    // ── ET SA RAISON EST ÉCRITE. ICI LA PROSE *EST* L'OBJET DU CONTRÔLE.
    //
    // D'où `lireSourceBrut`, et il faut le dire : `lireSource` retire les
    // commentaires, parce que neuf faux verts sont venus d'assertions
    // satisfaites par de la prose. Mon premier jet cherchait la raison
    // dans la source NETTOYÉE et rendait une tranche vide — un rouge sur
    // du code juste.
    //
    // L'exclusion d'un champ de la comparaison est une DÉCISION, pas un
    // détail : non documentée, le prochain qui lira le diff croira à un
    // oubli et « réparera » en comparant — ce qui rouvrira N écarts faux
    // sur toute œuvre d'avant P1.
    const brut = lireSourceBrut(join(APPS, 'entites-declarees.ts'))
    const i = brut.indexOf('readonly publiciteInconnue')
    expect(i, 'le champ a disparu').toBeGreaterThan(0)
    const commentaire = brut.slice(brut.lastIndexOf('/**', i), i)
    expect(commentaire, 'la raison de l’exclusion n’est plus écrite').toMatch(/POLITIQUES/u)
    expect(commentaire, 'le précédent de `required` n’est plus rappelé').toMatch(/écart FAUX/u)
  })
})
