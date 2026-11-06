/**
 * EP-341 · L'APERÇU S'APERÇOIT, ET AUCUN MOT BRUT N'ATTEINT L'ÉCRAN.
 *
 * ── TROIS DÉFAUTS DU 2026-11-04, VUS PAR LE PROPRIÉTAIRE EN UNE SÉANCE.
 *
 * ① L'APERÇU REFUSAIT DE S'AFFICHER.
 *
 *    Son application affichait, sur le même écran :
 *      bandeau  « Votre base de données sera créée à la publication.
 *                 Pour l'instant c'est un aperçu… »
 *      contenu  « La configuration de la base de données est manquante.
 *                 L'application ne peut pas fonctionner. » — et rien.
 *
 *    Les deux phrases se contredisaient. Notre consigne apprenait au
 *    modèle à traiter l'absence de base comme une ERREUR FATALE, alors
 *    que dans l'aperçu c'est l'état NORMAL — c'est NOUS qui avons décidé
 *    que la base naît à la publication.
 *
 *      « Un aperçu qui ne s'aperçoit pas est pire qu'un aperçu sans
 *        base. »
 *
 *    Le propriétaire devait publier à l'aveugle une chose qu'il n'avait
 *    pas pu essayer.
 *
 * ② « terminated » S'EST AFFICHÉ EN ANGLAIS, SEUL, AU MILIEU DE L'ÉCRAN.
 *
 *    Troisième du genre après « Load failed » et « The string did not
 *    match the expected pattern ». La cause n'était pas le mot : c'était
 *    la FORME de la garde. `phraseLisible` reconnaissait TROIS phrases
 *    réseau et rendait le texte brut pour tout le reste — une LISTE
 *    NOIRE, qui ne pouvait que perdre.
 *
 * ③ LE TEXTE D'ACCUEIL PROMETTAIT DES QUESTIONS SUPPRIMÉES LA VEILLE.
 */
import { motifEntre } from './motif-texte'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { blocBase, type EntiteDeclaree } from '../entites-declarees'
import { phraseErreur, estUneDeNosPhrases, ECHEC_INCONNU } from '../phrase-erreur'
import { lireSource } from './lire-source'

const SRC = join(__dirname, '..', '..', '..')
const RELEVE: EntiteDeclaree = {
  id: 'ent_releve',
  name: 'releve',
  fields: [{ id: 'fld_date', name: 'date', type: 'date', required: true }],
}

describe('EP-341 · l’aperçu et les mots bruts', () => {
  it('① LA CONSIGNE DIT QUE L’APPLICATION MARCHE SANS BASE', () => {
    const b = blocBase([RELEVE])
    expect(b, 'rien ne dit au modèle que l’aperçu doit fonctionner').toMatch(
      /CE N’EST PAS UNE ERREUR/u,
    )
    // ── ET ELLE LUI INTERDIT L'ÉCRAN D'ERREUR, NOMMÉMENT.
    //
    // Sans cette ligne, le modèle refait exactement ce qu'il a fait :
    // un garde-fou raisonnable de son point de vue, et un cul-de-sac du
    // point de vue de la personne.
    expect(b, 'rien n’interdit l’écran « configuration manquante »').toMatch(
      /N’AFFICHE JAMAIS « configuration manquante »/u,
    )
    // ET ELLE DONNE LE GESTE, pas seulement l'interdiction.
    expect(b, 'la consigne interdit sans dire comment faire').toContain("b.url !== ''")
  })

  it('① bis L’ÉCRAN DE CONNEXION NE BARRE PAS L’APERÇU', () => {
    // Il n'y a personne à connecter avant publication : l'afficher
    // quand même remplacerait l'application par un formulaire inutile.
    // ── ET ELLE TENAIT ENCORE SUR UNE FORMULATION, mesuré le 2026-11-06.
    //
    // Elle exigeait la phrase exacte « CET ÉCRAN NE S'AFFICHE QUE SI
    // `enBase` », en capitales. La loi public/gestion a reformulé le même
    // fait en minuscules — la propriété INTACTE, l'ancre rouge. Une ancre
    // qui lit une casse d'emphase lit une décision d'éditeur, pas une
    // règle.
    //
    // La propriété : la consigne RELIE l'écran de connexion à `enBase`,
    // dans une même phrase. Ce qui s'écrit entre les deux est libre.
    const bloc = blocBase([RELEVE]).toLowerCase()
    expect(bloc, 'l’écran de connexion s’affiche aussi dans l’aperçu').toMatch(
      motifEntre('écran de connexion', 'enbase', 80),
    )
  })

  it('① ter ET LE TITRE DE LA RÈGLE NE CONTREDIT PAS SON PARAGRAPHE', () => {
    // Il disait « TES DONNÉES VIVENT EN BASE, PAS EN MÉMOIRE » juste
    // avant d'expliquer que l'aperçu vit en mémoire. Un modèle lit le
    // titre en premier.
    expect(blocBase([RELEVE]), 'le titre enseigne le contraire du paragraphe').not.toMatch(
      /PAS EN MÉMOIRE/u,
    )
  })

  it('② AUCUN MOT BRUT N’ATTEINT L’ÉCRAN — liste blanche', () => {
    // Les trois qui sont réellement passés, plus ceux qu'on n'a pas
    // encore vus : c'est le sens d'une liste blanche.
    for (const brut of [
      'terminated',
      'TypeError: terminated',
      'Load failed',
      'The string did not match the expected pattern',
      'ECONNRESET',
      'undefined is not an object (evaluating \'x.y\')',
      '{"error":"boom"}',
      'at Module._compile (node:internal/modules/cjs/loader:1828:20)',
    ]) {
      const p = phraseErreur(brut)
      expect(p, `« ${brut} » atteint l’écran tel quel`).not.toBe(brut)
      expect(p, `« ${brut} » produit une phrase sans accent`).toMatch(/[éèêàâîôûùç’]/u)
    }
  })

  it('② bis LES CAUSES CONNUES DISENT QUOI FAIRE, pas « quelque chose »', () => {
    // ── LA GARDE TIENT SANS ELLES, ET C'EST POURQUOI IL FAUT LES TESTER.
    //
    // Mutation faite : retirer « terminated » du motif réseau laisse le
    // contrôle VERT — la phrase retombe sur `ECHEC_INCONNU`, qui est
    // encore une des nôtres. La PROPRIÉTÉ « aucun mot brut » tient donc
    // toute seule. Mais la personne perd l'information utile : « vérifiez
    // votre réseau » n'est pas « quelque chose n'a pas abouti ».
    //
    // On assertionne donc la QUALITÉ, en plus de la garde.
    for (const [brut, attendu] of [
      ['terminated', /réseau/u],
      ['TypeError: terminated', /réseau/u],
      ['Load failed', /réseau/u],
      ['AbortError: The operation was aborted.', /plus long que prévu/u],
      ['429 Too Many Requests', /Trop de demandes/u],
    ] as const) {
      expect(phraseErreur(brut), `« ${brut} » perd sa cause connue`).toMatch(attendu)
      expect(phraseErreur(brut), `« ${brut} » retombe sur la phrase générique`).not.toBe(
        ECHEC_INCONNU,
      )
    }
  })

  it('② quater NOS PROPRES PHRASES TRAVERSENT', () => {
    // ── SINON LA GARDE DÉTRUIRAIT CE QU'ELLE PROTÈGE.
    //
    // Nos routes rendent des `error` écrits en français, parfois très
    // précis. Les remplacer par « quelque chose n'a pas abouti »
    // perdrait l'information qu'on avait pris la peine d'écrire.
    const nôtres = [
      'La publication a échoué : cette adresse est déjà prise.',
      'La connexion a été interrompue pendant la création. Votre boutique a ' +
        'peut-être été créée malgré tout : vérifiez dans « Mes boutiques » avant de relancer.',
    ]
    for (const p of nôtres) {
      expect(estUneDeNosPhrases(p), `« ${p.slice(0, 40)}… » n’est pas reconnue`).toBe(true)
      expect(phraseErreur(new Error(p)), 'une de nos phrases est écrasée').toBe(p)
    }
    expect(phraseErreur(''), 'le vide ne produit pas de phrase').toBe(ECHEC_INCONNU)
  })

  it('② ter ET L’ÉCRAN EMPLOIE BIEN LA LISTE BLANCHE', () => {
    // L'USAGE, PAS LA DÉFINITION : une fonction parfaite que personne
    // n'appelle est le défaut le plus fréquent de ce dépôt.
    const chat = lireSource(join(SRC, 'components', 'onboarding', 'OnboardingChat.tsx'))
    expect(chat, 'l’écran n’emploie pas la liste blanche').toMatch(/setError\(phraseErreur\(/u)
    expect(chat, 'l’ancienne liste noire est revenue').not.toMatch(/function phraseLisible/u)
  })

  it('③ LE TEXTE D’ACCUEIL NE PROMET PLUS LES QUESTIONS SUPPRIMÉES', () => {
    const ecran = lireSource(
      join(SRC, 'components', 'onboarding', 'ConversationApplication.tsx'),
    )
    expect(ecran, 'l’accueil promet encore des questions qui n’existent plus').not.toMatch(
      /posera des questions/u,
    )
    expect(ecran, 'l’accueil ne dit pas ce qui se passe vraiment').toMatch(
      /construit directement/u,
    )
  })
})
