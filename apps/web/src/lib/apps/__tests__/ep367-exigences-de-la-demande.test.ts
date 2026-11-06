/**
 * EP-367 · ②β — LES EXIGENCES VIENNENT DE LA DEMANDE, PAS D'UNE LISTE.
 *
 * ── LA PREUVE EXIGÉE : LES QUATRE, PAS UNE.
 *
 * Avant (lexique de dix-neuf familles, code livré `<div>bonjour</div>`) :
 *
 *   salon de coiffure        0 exigence → taux 1,00   « parfait »
 *   site institutionnel CPA  0 exigence → taux 1,00   « parfait »
 *   boutique simple          0 exigence → taux 1,00   « parfait »
 *   carnet de notes          0 exigence → taux 1,00   « parfait »
 *
 * Après :
 *
 *   salon de coiffure       18 exigences → 0,00
 *   site institutionnel CPA 17 exigences → 0,00
 *   boutique simple         10 exigences → 0,00
 *   carnet de notes          7 exigences → 0,00
 *
 * Et le même CPA avec un code qui RÉPOND vraiment : 0,88, deux muettes
 * (« site », « institutionnel » — le produit se nommant lui-même). Le juge
 * discrimine donc, au lieu de tout approuver ou tout refuser.
 *
 * ── ET SUR LE TIR RÉEL QUI A FONDÉ TOUT CECI (88c94164).
 *
 *   l'ancien juge : 13 familles
 *   celui-ci      : 34 exigences, 21 muettes, taux 0,38
 *
 *   fournisseur  56 fois au cahier →  0 dans le code
 *   plateforme   24 fois           →  0
 *   commission   11 fois           →  0
 *   langue        9 fois           →  0
 *
 * Une plateforme de fournisseurs qui ne parle jamais de fournisseurs. Le
 * défaut était là depuis le 31 octobre ; aucun juge ne pouvait le nommer,
 * parce qu'aucune famille écrite d'avance ne s'appelait « fournisseur ».
 *
 * ── CE QUE CE MODULE NE SAIT PAS FAIRE, DIT ICI.
 *
 * Le radical retire le pluriel et rien d'autre. « accès » finit par un `s`
 * au singulier : son radical devient `acce`, qui attrape aussi
 * « accessoire ». C'est un motif TROP LARGE, donc un risque de fausse
 * couverture — jamais de fausse absence. Entre les deux, on choisit celui
 * qui ne fait pas brûler un tour payant contre un mur. Un vrai lemmatiseur
 * demanderait un dictionnaire, donc une liste qui grandit, donc le piège
 * qu'on vient de quitter.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { jugerCouverture } from '../juge-couverture'
import { exigencesDeLaDemande, PLAFOND_EXIGENCES } from '../exigences-demande'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const SRC = join(__dirname, '..', '..', '..')
const lire = (rel: string): string => lireSource(join(SRC, rel))
const CODE_MUET = new Map([['App.tsx', 'export default function App(){return <div>bonjour</div>}']])

const SALON =
  "Je veux un site pour mon salon de coiffure à Abidjan. Présenter les prestations, " +
  "les photos des coupes, les horaires d'ouverture et l'adresse. Un formulaire pour " +
  "que les clientes prennent rendez-vous par téléphone. Les prestations : coupe, " +
  'tresses, défrisage, soins. Les tarifs doivent être visibles.'
const CPA =
  'Site institutionnel de la Centrale de production agricole. Présenter la mission, ' +
  "l'organigramme, les communiqués, les appels d'offres, les rapports annuels " +
  'téléchargeables et les actualités de la filière. Les visiteurs consultent sans compte.'
const BOUTIQUE =
  'Une boutique en ligne pour vendre mes pagnes. Les photos, le prix en FCFA, le panier, ' +
  'et le client me contacte sur WhatsApp pour finaliser.'
const CARNET =
  'Une application pour noter mes idées au quotidien, les classer par thème, et les ' +
  'retrouver par mot-clé.'

/** Ce que chaque demande DOIT faire sortir — nommé, pas compté. */
const ATTENDUS: readonly (readonly [string, string, readonly string[]])[] = [
  ['salon de coiffure', SALON, ['prestation', 'coupe', 'horaire', 'tarif', 'formulaire', 'tresse']],
  ['site institutionnel CPA', CPA, ['organigramme', 'communique', 'offre', 'rapport', 'filiere']],
  ['boutique simple', BOUTIQUE, ['pagne', 'panier', 'fcfa', 'whatsapp']],
  ['carnet de notes', CARNET, ['classer', 'theme', 'retrouver', 'quotidien']],
]

describe('EP-367 · ②β les exigences viennent de la demande', () => {
  it('① les quatre ne rendent PLUS « parfait » — et chacune nomme ses exigences', () => {
    for (const [nom, demande, attendus] of ATTENDUS) {
      const r = jugerCouverture(demande, CODE_MUET)
      expect(r.exigences.length, `${nom} : aucune exigence retenue`).toBeGreaterThan(5)
      expect(r.taux, `${nom} : un code qui ne dit rien ne couvre pas`).toBeLessThan(0.2)
      const noms = r.exigences.map((e) => e.exigence)
      for (const a of attendus) {
        expect(noms, `${nom} : « ${a} » est demandé et n'a pas été retenu`).toContain(a)
      }
    }
  })

  it('② et le CPA avec un code qui RÉPOND monte — sinon le juge refuse tout', () => {
    // ── SANS CE CAS, RENDRE 0 PARTOUT PASSERAIT ①.
    //
    // Un juge qui refuse tout est aussi inutile qu'un juge qui approuve
    // tout : il ne discrimine pas, donc il n'informe pas.
    const repond = new Map([
      [
        'App.tsx',
        'export default function App(){return <nav>Mission Organigramme Communiques ' +
          'Appels offres Rapports annuels Actualites filiere</nav>}',
      ],
      ['Mission.tsx', 'export const M = "Notre mission, la production agricole de la centrale"'],
      ['Rapports.tsx', 'export const R = "Rapports annuels telechargeables — visiteurs sans compte"'],
    ])
    const r = jugerCouverture(CPA, repond)
    expect(r.taux).not.toBeNull()
    expect(r.taux as number, 'un code qui répond doit monter nettement').toBeGreaterThan(0.75)
    const muet = jugerCouverture(CPA, CODE_MUET)
    expect(
      (r.taux as number) - (muet.taux as number),
      'le juge doit SÉPARER un code qui répond d’un code qui se tait',
    ).toBeGreaterThan(0.5)
  })

  it('③ les accents ne font pas de fausse absence', () => {
    // Les radicaux sortent SANS accent (`communique`, `theme`). Les chercher
    // dans un texte accentué ne trouverait jamais « communiqué » : le juge
    // rendrait « absente » sur une exigence que le code PORTE, et ferait
    // brûler un tour payant contre un mur.
    const r = jugerCouverture(CPA, new Map([['A.tsx', 'const x = "les communiqués de la filière"']]))
    const communique = r.exigences.find((e) => e.exigence === 'communique')
    expect(communique?.code, '« communiqués » accentué doit être trouvé').toBeGreaterThan(0)
  })

  it('④ le tir fondateur : fournisseur ×56 au cahier, zéro dans le code', () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, 'fixtures', 'tir-88c94164.json'), 'utf8'),
    ) as Record<string, string>
    const cahier = readFileSync(join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
    const r = jugerCouverture(cahier, new Map(Object.entries(fixture)))
    expect(r.exigences.length, 'l’ancien juge n’en voyait que 13').toBeGreaterThan(25)
    expect(r.taux as number).toBeLessThan(0.5)
    const f = r.muettesDerivees.find((e) => e.exigence === 'fournisseur')
    expect(f, 'le défaut fondateur doit être NOMMÉ').toBeDefined()
    expect(f?.cahier).toBeGreaterThan(40)
    expect(f?.code).toBe(0)
  })

  it('⑤ le seuil se lit par rapport au document, jamais dans l’absolu', () => {
    // MESURÉ : le CPA, la boutique et le carnet n'ont AUCUN terme répété. Un
    // seuil absolu à 3 les laisserait muets — le défaut qu'on ferme.
    expect(exigencesDeLaDemande(CPA).seuil, 'rien ne se répète : tout compte').toBe(1)
    const cahier = readFileSync(join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
    const gros = exigencesDeLaDemande(cahier)
    expect(gros.seuil, 'un cahier insistant resserre son propre seuil').toBeGreaterThan(3)
  })

  it('⑥ le plafond ne se tait pas — un cap silencieux se lit « tout couvert »', () => {
    const cahier = readFileSync(join(__dirname, 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
    const d = exigencesDeLaDemande(cahier)
    expect(d.termes.length).toBeLessThanOrEqual(PLAFOND_EXIGENCES)
    expect(d.ecartes, 'ce cahier dépasse le plafond, et ça se dit').toBeGreaterThan(0)
    // Et le rapport le porte jusqu'au bout, pas seulement l'extracteur.
    expect(jugerCouverture(cahier, CODE_MUET).ecartes).toBe(d.ecartes)
  })

  it('⑦ les deux listes fermées ne contiennent AUCUN mot de métier', () => {
    // ── LE TEST QUI LES SÉPARE DU PIÈGE, ET IL EST MÉCANIQUE.
    //
    // « Cette liste grandit-elle quand une nouvelle demande arrive ? » Les
    // mots-outils et les mots de structure documentaire : non. « mobile
    // money », « agences », « réservation » : oui — et c'est pour ça que les
    // dix-neuf familles ont échoué. Si un mot de métier entre dans ces
    // listes, le piège est de retour.
    const src = lire('lib/apps/exigences-demande.ts')
    const listes = src.slice(src.indexOf('MOTS_OUTILS'), src.indexOf('PLAFOND_EXIGENCES'))
    for (const metier of [
      'paiement', 'reservation', 'agence', 'entreprise', 'livraison', 'facture',
      'abonnement', 'panier', 'produit', 'client', 'boutique', 'mission',
      'organigramme', 'rapport', 'coiffure', 'airtel', 'orange', 'stripe',
    ]) {
      expect(
        listes.includes(metier),
        `« ${metier} » est un mot de MÉTIER : dans une liste fermée, il referait ` +
          'le défaut des dix-neuf familles',
      ).toBe(false)
    }
  })

  it('⑦bis le juge MESURE sans reprocher — aucun tour payant de plus', () => {
    // ── ARBITRAGE DU PROPRIÉTAIRE, 2026-11-06.
    //
    // « Tant que je n'ai pas lu la distribution réelle : le juge MESURE et
    // RAPPORTE, il ne reproche pas. Le chiffre voyage dans le rapport, il ne
    // relance aucun tour. »
    //
    // `TOURS_MAX = 3`, et `couverture.absentes.length > 0` relance un tour.
    // Dix-sept exigences dérivées sur une demande qui n'en reprochait aucune
    // auraient coûté jusqu'à deux tours payants par génération.
    const r = jugerCouverture(CPA, CODE_MUET)
    expect(r.exigences.length, 'le CPA se mesure').toBeGreaterThan(10)
    expect(
      r.absentes.length,
      'aucune famille nommée dans cette demande : donc aucun reproche, donc 0 $',
    ).toBe(0)
    expect(
      r.muettesDerivees.length,
      'et pourtant les muettes sont bien comptées, ailleurs',
    ).toBeGreaterThan(10)
    // La boucle ne lit QUE `absentes` pour reprocher.
    const boucle = lire('lib/apps/boucle-directe.ts')
    expect(boucle).toMatch(motifTexte('couverture.absentes.length > 0'))
    expect(boucle.includes('muettesDerivees'), 'la boucle ne doit PAS reprocher là-dessus').toBe(
      false,
    )
  })

  it('⑧ et le module est BRANCHÉ dans le juge, pas posé à côté', () => {
    // La leçon des vingt-six modules sans appelant (EP-365). Celui-ci serait
    // le vingt-septième.
    const juge = lire('lib/apps/juge-couverture.ts')
    expect(juge).toMatch(motifTexte('exigencesDeLaDemande(demande)'))
    expect(juge).toMatch(motifTexte('familles.push'))
  })
})
