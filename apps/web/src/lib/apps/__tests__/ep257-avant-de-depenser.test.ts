/**
 * EP-257 · LOT 5 — ON DEMANDE AVANT DE DÉPENSER.
 *
 * ── LE DÉFAUT QUE CE FICHIER EXISTE POUR INTERDIRE, ET SON PRIX.
 *
 * Douze générations, ~29 $, aucune application vue. L'ordre réel était :
 * dépenser → faire juger → questionner. Les questions existaient depuis le
 * début — `QUESTIONS_DE_CONFIGURATION` (EP-201), dont l'en-tête dit qu'elles
 * « recueillent ce que l'humain SEUL peut fournir avant qu'un juge
 * n'existe ». Mesuré le 2026-10-17 : ZÉRO appelant en production.
 *
 * ── CE QUE REPLIT FAIT, CHRONOMÉTRÉ.
 *
 * Treize secondes entre la phrase et la première question. Trois boutons
 * radio PLUS un champ libre — et c'est le champ libre qui a tout changé :
 * l'option cochée disait « relevés seulement », le commentaire a transformé
 * l'application en reconnaissance d'image. Les options n'étaient pas les
 * bonnes. L'échappatoire a sauvé le cas réel.
 *
 * ── LES CINQ PROPRIÉTÉS TENUES ICI.
 *
 * ① ON NE DEVINE AUCUN DOMAINE. Demander « dans quel pays votre BOUTIQUE
 *    vend-elle » à un propriétaire de tontine serait l'erreur de v0
 *    retournée — lui a déduit « France » du français, puis affiché un tarif
 *    EDF. C'est l'humain qui aiguille, par un choix fermé.
 * ② UNE TONTINE N'EST JAMAIS INTERROGÉE SUR SES ACHETEURS.
 * ③ UNE RÉPONSE HORS TABLE N'EST PAS UNE RÉPONSE : la question revient.
 * ④ LA DEVISE EST UN DÉFAUT, JAMAIS UN VERROU — et un pays inconnu
 *    n'invente rien, il fait poser la question.
 * ⑤ RIEN N'EST DÉPENSÉ. Mesuré sur le texte source de la route, pas promis
 *    dans un commentaire.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { briefAvec, preVol } from '../avant-de-depenser'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')

const codes = async (reponses: Record<string, unknown>): Promise<string[]> =>
  (await preVol(reponses)).questions.map((q) => q.code)

describe('EP-257 · le pré-vol demande avant que ça coûte', () => {
  it('① DEUX QUESTIONS POUR TOUT LE MONDE, ET LA PREMIÈRE EST FERMÉE', async () => {
    const r = await preVol({})
    expect(r.questions.map((q) => q.code)).toEqual(['ARGENT_DANS_APP', 'MARCHE_VISE'])
    expect(r.complet, 'on croit pouvoir dépenser alors que rien n’est répondu').toBe(false)

    const argent = r.questions[0]
    // LES CHOIX VOYAGENT AVEC LA QUESTION. Sans eux l'écran devrait les
    // recopier, et une table recopiée est une seconde vérité qui dérive.
    expect(argent?.choix?.map((c) => c.valeur)).toEqual(['aucun', 'paiements', 'produits'])
    for (const c of argent?.choix ?? []) {
      expect(c.texte.length, 'un choix sans texte lisible n’est pas cliquable').toBeGreaterThan(10)
    }
    // Et le texte reste lisible sans connaître le moteur (critère EP-135).
    expect(argent?.texte).not.toMatch(/MODELE_|air|schema|P0/u)
  })

  it('② UNE TONTINE N’EST JAMAIS INTERROGÉE SUR SA BOUTIQUE', async () => {
    // ── LE CONTRÔLE QUI JUSTIFIE TOUT L'AIGUILLAGE.
    //
    // Les trois questions héritées parlent de « vos produits » et de « vos
    // acheteurs ». Posées à une tontine, elles sont fausses. Répondre
    // « elle affiche seulement des montants » doit les faire DISPARAÎTRE,
    // pas les reformuler.
    expect(await codes({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Tchad' })).toEqual([])
    const r = await preVol({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Tchad' })
    expect(r.complet, 'le dialogue continue alors qu’il n’y a plus rien à demander').toBe(true)
    expect(r.configuration.encaissement).toBe('aucun')
    expect(r.configuration.currency, 'la devise d’une tontine a été perdue').toBe('XAF')
    expect(
      r.configuration.numeroEncaisseur,
      'un numéro encaisseur existe sur une application qui n’encaisse pas',
    ).toBeUndefined()
  })

  it('② bis CEUX QUI ENCAISSENT, EUX, SONT INTERROGÉS — et par paliers', async () => {
    expect(await codes({ ARGENT_DANS_APP: 'paiements', MARCHE_VISE: 'Tchad' })).toEqual([
      'NUMERO_ENCAISSEUR',
    ])
    // « vend des produits » IMPLIQUE « encaisse » : les deux questions.
    expect(await codes({ ARGENT_DANS_APP: 'produits', MARCHE_VISE: 'Tchad' })).toEqual([
      'NUMERO_ENCAISSEUR',
      'LOGISTIQUE_PROPRE',
    ])
  })

  it('③ UNE RÉPONSE HORS TABLE N’EST PAS UNE RÉPONSE', async () => {
    // Sans ce contrôle, un texte libre arrivé dans un choix fermé compterait
    // comme répondu : l'aiguillage partirait sur rien, et le moteur
    // recevrait un fait que personne n'a dit.
    expect(await codes({ ARGENT_DANS_APP: 'je sais pas' })).toContain('ARGENT_DANS_APP')
    const r = await preVol({ ARGENT_DANS_APP: 'je sais pas' })
    expect(
      r.configuration.encaissement,
      'une valeur inventée est devenue un fait structurel',
    ).toBeUndefined()
  })

  it('④ LA DEVISE EST UN DÉFAUT, ET UN PAYS INCONNU N’INVENTE RIEN', async () => {
    // Le pays SUGGÈRE, et la suggestion voyage à part du texte : l'écran
    // peut la montrer comme un défaut modifiable.
    const connu = await preVol({ ARGENT_DANS_APP: 'aucun' })
    expect(connu.questions.find((q) => q.code === 'MARCHE_VISE')?.suggestion).toBeUndefined()

    // Pays connu : la devise n'est PAS re-demandée, elle est acquise.
    const r = await preVol({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Tchad' })
    expect(r.configuration.currency).toBe('XAF')

    // L'humain PRIME sur la suggestion — la diaspora vend en euros.
    const d = await preVol({
      ARGENT_DANS_APP: 'aucun',
      MARCHE_VISE: 'Tchad',
      DEVISE_RETENUE: 'eur',
    })
    expect(d.configuration.currency).toBe('EUR')

    // Pays INCONNU : aucun défaut n'est inventé, la question est posée.
    expect(await codes({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Atlantide' })).toEqual([
      'DEVISE_RETENUE',
    ])
    const inconnu = await preVol({ ARGENT_DANS_APP: 'aucun', MARCHE_VISE: 'Atlantide' })
    expect(inconnu.configuration.currency, 'une devise a été inventée').toBeUndefined()
  })

  it('④ bis AUCUN NOM DE PAYS N’ATTEINT LE MOTEUR (EP-201 B)', async () => {
    const r = await preVol({
      ARGENT_DANS_APP: 'produits',
      MARCHE_VISE: 'Tchad',
      NUMERO_ENCAISSEUR: '+235 66 00 00 00',
      LOGISTIQUE_PROPRE: true,
    })
    const tout = JSON.stringify(r.configuration)
    expect(tout.toLowerCase(), 'le nom du pays a fuité dans la configuration').not.toContain(
      'tchad',
    )
    expect(r.configuration.currency).toBe('XAF')
  })

  it('⑤ LA ROUTE DU PRÉ-VOL NE PEUT RIEN COÛTER — mesuré, pas promis', () => {
    // ── POURQUOI CE CONTRÔLE LIT LA SOURCE.
    //
    // « Ça ne coûte rien » est une propriété de ce que le fichier IMPORTE.
    // L'éprouver à l'exécution demanderait de lancer la route avec un faux
    // réseau — et un faux réseau prouve que le faux n'a pas été appelé, pas
    // que le vrai ne peut pas l'être.
    const route = readFileSync(
      join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'avant', 'route.ts'),
      'utf8',
    )
    // Sans les commentaires : ce fichier PARLE de P0 et des appels payants,
    // et mesurer la prose au lieu du code est un piège déjà payé trois fois.
    const code = route
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n')

    for (const interdit of [
      'documentPour',
      'emettreApplication',
      'anthropic',
      'Anthropic',
      'ANTHROPIC',
      'poursuivreEmission',
      'creerTravailleur',
      'GO_EMISSION_IA',
      'fetch(',
    ]) {
      expect(code, `la route du pré-vol atteint « ${interdit} » : elle peut coûter`).not.toContain(
        interdit,
      )
    }
    // Et elle DIT le coût, parce que c'est l'information que personne n'avait.
    expect(code, 'la route ne dit pas que rien n’est dépensé').toMatch(/coutUsd: 0/u)
  })

  it('⑤ bis LE MODULE DU PRÉ-VOL NON PLUS', () => {
    const mod = readFileSync(join(RACINE, 'apps', 'web', 'src', 'lib', 'apps', 'avant-de-depenser.ts'), 'utf8')
    const code = mod
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
      .join('\n')
    for (const interdit of ['fetch(', 'documentPour', 'anthropic', 'supabase']) {
      expect(code, `le module du pré-vol atteint « ${interdit} »`).not.toContain(interdit)
    }
  })

  it('LE BRANCHEMENT, PAS L’INTENTION — l’écran appelle vraiment le pré-vol', () => {
    // ── LA LEÇON DU LOT 3, PAYÉE UNE FOIS DÉJÀ.
    //
    // `QUESTIONS_DE_CONFIGURATION` existait depuis EP-201 avec ZÉRO appelant
    // en production. Une machine posée et débranchée ne demande rien à
    // personne. Ce contrôle vérifie les DEUX bouts de la chaîne.
    const ecran = readFileSync(
      join(RACINE, 'apps', 'web', 'src', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    expect(ecran, 'l’écran n’appelle pas le pré-vol').toContain('/api/generateur/avant')
    expect(ecran, 'les choix fermés ne sont pas rendus').toContain('ChoixFermes')
    // ET IL PASSE AVANT LA PORTE CHÈRE, pas après.
    expect(
      ecran.indexOf('/api/generateur/avant'),
      'le pré-vol est appelé après la route payante',
    ).toBeLessThan(ecran.indexOf('/api/generateur/comprendre'))

    // L'AUTRE BOUT : les réponses entrent dans le brief AVANT son scellement.
    const comprendre = readFileSync(
      join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'comprendre', 'route.ts'),
      'utf8',
    )
    expect(comprendre, 'le brief n’est pas composé avec les réponses').toContain('briefAvec')
    expect(comprendre, 'l’échappatoire ne voyage pas').toContain('autreChose')
    expect(comprendre, 'la configuration ne voyage pas').toContain('configuration')
  })

  it('LES PRÉCISIONS ATTEIGNENT P0 — sans qu’aucun pays ne les accompagne', async () => {
    const { precisionsStructurelles } = await import('../avant-de-depenser')
    const r = await preVol({
      ARGENT_DANS_APP: 'produits',
      MARCHE_VISE: 'Tchad',
      NUMERO_ENCAISSEUR: '+235 66 00 00 00',
      LOGISTIQUE_PROPRE: true,
    })
    const texte = precisionsStructurelles(r.configuration)
    expect(texte, 'la devise ne part pas à P0').toContain('XAF')
    expect(texte, 'ce que fait l’application de l’argent ne part pas').toMatch(/vend des produits/u)
    expect(texte, 'le numéro ne part pas').toContain('+235 66 00 00 00')

    // LA FRONTIÈRE EP-201 : le nom du pays ne traverse pas, et aucun
    // opérateur n'est nommé — la devise se déduit, l'opérateur jamais.
    expect(texte.toLowerCase(), 'le nom du pays a atteint le moteur').not.toContain('tchad')
    for (const op of ['orange', 'wave', 'mtn', 'airtel', 'stripe', 'mobile money']) {
      expect(texte.toLowerCase(), `« ${op} » a été déduit`).not.toContain(op)
    }

    // ET UN DOCUMENT MUET NE PRODUIT AUCUNE PRÉCISION : une phrase sans
    // fondement ferait lire à P0 quelque chose que personne n'a dit.
    expect(precisionsStructurelles({})).toBe('')
  })

  it('L’ÉCHAPPATOIRE EN TEXTE LIBRE — celle qui a sauvé le cas de Replit', () => {
    // Les trois options cochables n'étaient PAS les bonnes ; le champ libre
    // a changé le produit entier. Il entre dans le BRIEF, composé une fois
    // avant d'être scellé — jamais réécrit après, le hold-out l'exige.
    const avec = briefAvec(
      'Application de suivi de mon compteur',
      'je veux prendre mon compteur en photo',
    )
    expect(avec).toContain('Application de suivi de mon compteur')
    expect(avec, 'l’échappatoire a été perdue').toContain('photo')
    // L'ordre compte : la demande d'abord, la précision ensuite.
    expect(avec.indexOf('compteur')).toBeLessThan(avec.indexOf('photo'))

    // VIDE, ELLE NE LAISSE AUCUNE TRACE : un intitulé suivi de rien ferait
    // croire à une précision qui n'existe pas.
    expect(briefAvec('une tontine', '')).toBe('une tontine')
    expect(briefAvec('une tontine', null)).toBe('une tontine')
    expect(briefAvec('  une tontine  ', '   ')).toBe('une tontine')
  })
})
