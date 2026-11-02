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
import { pageAutonome } from '../boucle-directe'

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
