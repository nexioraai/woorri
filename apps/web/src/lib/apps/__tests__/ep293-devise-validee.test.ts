/**
 * EP-293 — UNE RÉPONSE QUE LA QUESTION DÉCLARE INVALIDE N'EST JAMAIS UN FAIT.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-31 SUR UN TIR RÉEL.
 *
 * Cahier des charges de 40+ pages — plateforme B2B internationale. Question :
 * « Indiquez son code international à trois lettres (par exemple EUR, USD,
 * XAF). » Réponse : « les 3 ». Écran suivant :
 *
 *     « Déjà noté : vos montants s'afficheront en LES 3. »
 *
 * La réponse invalide a été ACCEPTÉE, STOCKÉE, et REJOUÉE comme un fait. Elle
 * serait partie telle quelle dans le document AIR, et tout prix en aurait
 * hérité.
 *
 * ── LA RACINE, LUE DANS LE CODE — pas supposée.
 *
 * `configurationADemander.repondu()` ne validait que les choix FERMÉS : « un
 * texte libre arrivé là serait compté comme répondu ». Les structures libres
 * (devise) comptaient pour répondues avec N'IMPORTE QUELLE chaîne. Et
 * `configurationDe` faisait `.trim().toUpperCase()` — aucune validation.
 * Le mécanisme de ré-interrogation existait (l'écran redemande au serveur à
 * chaque tour) ; il n'était jamais déclenché pour une réponse libre.
 *
 * ── ET LE CAS MULTI-PAYS N'AVAIT AUCUNE BRANCHE.
 *
 * « tchad comme base mais plateforme universel » → la question suivante
 * suppose UNE devise, sans dire ce qu'elle attend de qui opère en plusieurs.
 * Décision prise et DITE : le document AIR porte UNE devise de RÉFÉRENCE ;
 * la question le dit en toutes lettres au lieu de forcer en silence.
 */
import { describe, expect, it } from 'vitest'

const elicitation = await import(
  // eslint-disable-next-line import/no-relative-packages -- module de la chaîne AIR, source unique
  '../../../../../../benchmarks/air-emission/elicitation.mjs'
)
const { configurationADemander, configurationDe } = elicitation as unknown as {
  configurationADemander: (o: {
    interlocuteur: boolean
    reponses: Record<string, unknown>
  }) => { statut: string; questions: { code: string; texte: string }[] }
  configurationDe: (r: Record<string, unknown>) => { currency?: string }
}

/** Le tir réel : pays multi-pays en texte libre, devise « les 3 ». */
const TIR_REEL = {
  ARGENT_DANS_APP: 'paiements',
  MARCHE_VISE: 'tchad comme base mais plateforme universel',
  DEVISE_RETENUE: 'les 3',
  NUMERO_ENCAISSEUR: '+23566000000',
}

describe('EP-293 · la devise est validée, jamais crue', () => {
  it('① « les 3 » NE DEVIENT JAMAIS UNE DEVISE', () => {
    const c = configurationDe(TIR_REEL)
    expect(c.currency, '« LES 3 » est stocké comme devise : tout prix du document en hérite').not.toBe(
      'LES 3',
    )
    expect(c.currency ?? null, 'une réponse invalide a produit un fait').toBeNull()
  })

  it('② LA QUESTION REVIENT tant que la réponse est invalide', () => {
    const r = configurationADemander({ interlocuteur: true, reponses: TIR_REEL })
    const codes = r.questions.map((q) => q.code)
    expect(codes, 'la question devise est considérée répondue par « les 3 »').toContain(
      'DEVISE_RETENUE',
    )
    // Et la question RE-POSÉE dit pourquoi : sans cela, la personne retape
    // la même chose et tourne en rond.
    const q = r.questions.find((x) => x.code === 'DEVISE_RETENUE')
    expect(q?.texte ?? '', 'la ré-interrogation n’explique pas le refus').toMatch(/les 3/iu)
  })

  it('③ LES VRAIS CODES PASSENT, en toute casse — contrôle négatif', () => {
    for (const bon of ['EUR', 'usd', 'Xaf', 'cad']) {
      const c = configurationDe({ ...TIR_REEL, DEVISE_RETENUE: bon })
      expect(c.currency, `« ${bon} » devrait passer`).toBe(bon.toUpperCase())
      const r = configurationADemander({
        interlocuteur: true,
        reponses: { ...TIR_REEL, DEVISE_RETENUE: bon },
      })
      expect(
        r.questions.map((q) => q.code),
        `« ${bon} » est valide : la question ne doit PAS revenir`,
      ).not.toContain('DEVISE_RETENUE')
    }
  })

  it('④ TROIS LETTRES NE SUFFISENT PAS : le code doit EXISTER dans ISO 4217', () => {
    // « EUR » existe ; « EUU » a la bonne forme et n'existe pas. Accepter la
    // forme seule stockerait un code que personne ne peut afficher.
    for (const faux of ['EUU', 'ABC', 'XXX1'.slice(0, 3) === 'XXX' ? 'QQQ' : 'QQQ', 'LES']) {
      const c = configurationDe({ ...TIR_REEL, DEVISE_RETENUE: faux })
      expect(c.currency ?? null, `« ${faux} » n’est pas un code ISO 4217`).toBeNull()
    }
  })

  it('⑤ LE MULTI-PAYS EST DIT, pas forcé en silence', () => {
    // Décision explicite : UNE devise de RÉFÉRENCE. La question le porte en
    // toutes lettres — qui opère en plusieurs devises sait quoi répondre.
    const r = configurationADemander({
      interlocuteur: true,
      reponses: { ARGENT_DANS_APP: 'paiements', MARCHE_VISE: 'tchad comme base mais plateforme universel' },
    })
    const q = r.questions.find((x) => x.code === 'DEVISE_RETENUE')
    expect(q, 'un pays libre multi-pays ne déclenche plus la question devise').toBeDefined()
    expect(q?.texte ?? '', 'le cas multi-devises n’est pas nommé dans la question').toMatch(
      /référence/iu,
    )
  })
})
