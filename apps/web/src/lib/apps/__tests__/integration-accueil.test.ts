// ============================================================
// CLIQUET — L'APPLICATION ENTRE PAR L'ACCUEIL, ET NE TOUCHE PAS AUX MODES.
//
// ── LA DEMANDE, ET CE QU'ELLE INTERDIT.
//
// « Je veux pas que les utilisateurs cherchent une 2eme interface. » Et :
// « le systeme qui genere les appli n'a RIEN A VOIR avec les 3 modes ».
//
// Les deux ensemble dessinent une contrainte precise : MEME ENTREE, CHEMIN
// SEPARE. L'accueil porte une quatrieme pastille ; mais rien de ce qui suit
// ne doit passer par `siteMode`, `/api/chat`, ou la table `sites` — 48
// fichiers lisent `site.mode`, et aucun ne doit voir passer une application.
//
// Ces tests lisent le SOURCE, parce que c'est la seule facon de tenir une
// propriete d'architecture : un test de rendu dirait que ca marche
// aujourd'hui, pas que la frontiere tient.
// ============================================================
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'src')
const lire = (...p: string[]): string => readFileSync(join(SRC, ...p), 'utf8')

/**
 * Le CODE seul, commentaires retires.
 *
 * SANS CECI, CE FICHIER SE PIEGE LUI-MEME. `ConversationApplication.tsx`
 * explique en tete qu il ne touche NI `siteMode` NI `/api/chat` — et le test
 * trouvait ces mots dans la prose. La documentation d une regle violait la
 * regle.
 *
 * Deja rencontre aujourd hui, a l identique, dans `emission-coeur.mjs` : un
 * commentaire citait le repere qu un instrument cherchait, et l instrument
 * lisait l explication au lieu du code. Dans un depot ou des controles lisent
 * le source comme du TEXTE, un commentaire n est pas inerte.
 */
const sansCommentaires = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^[ \t]*\/\/.*$/gmu, '')

const ACCUEIL = lire('components', 'onboarding', 'OnboardingChat.tsx')
const CONVERSATION = sansCommentaires(
  lire('components', 'onboarding', 'ConversationApplication.tsx'),
)

describe('CLIQUET — une seule entree', () => {
  it('LA PAGE SEPAREE N EXISTE PLUS', () => {
    // Elle a ete construite sans qu on la demande, deux fois. Ce test est la
    // pour qu une troisieme ne passe pas inapercue.
    expect(existsSync(join(SRC, 'app', 'generateur', 'page.tsx'))).toBe(false)
  })

  it('aucun lien de navigation ne pointe vers une seconde interface', () => {
    const barre = lire('components', 'Sidebar.tsx')
    expect(barre).not.toContain("'/generateur'")
  })

  it('l accueil porte la quatrieme pastille', () => {
    expect(ACCUEIL).toContain('home.mode.application')
  })
})

describe('CLIQUET — la frontiere avec les trois modes', () => {
  it('LA CONVERSATION APPLICATION NE CONNAIT NI `siteMode` NI `/api/chat`', () => {
    // C est la garantie que les 48 fichiers qui lisent `site.mode` ne verront
    // jamais passer une application.
    expect(CONVERSATION).not.toMatch(/siteMode/u)
    expect(CONVERSATION).not.toMatch(/api\/chat/u)
    expect(CONVERSATION).not.toMatch(/from\('sites'\)|\.mode\b/u)
  })

  it('elle n appelle QUE les routes du generateur', () => {
    const appels = [...CONVERSATION.matchAll(/fetch\('([^']+)'/gu)].map((m) => m[1])
    expect(appels.length).toBeGreaterThan(0)
    for (const a of appels) expect(a, a).toMatch(/^\/api\/generateur\//u)
  })

  it('L AIGUILLAGE SE FAIT AVANT TOUT, par un booleen a part', () => {
    // Volontairement pas une valeur de `siteMode` : si c en etait une, tout
    // ce qui lit `siteMode` devrait apprendre a la connaitre.
    expect(ACCUEIL).toContain('cibleApplication')
    expect(ACCUEIL).toMatch(/if \(cibleApplication\) \{/u)
  })

  it('le choix « Application » ne pose AUCUN mode', () => {
    // Dans la branche de la pastille, on ne doit trouver que l aiguillage.
    const i = ACCUEIL.indexOf('if (mode === 0)')
    expect(i).toBeGreaterThan(0)
    const branche = ACCUEIL.slice(i, ACCUEIL.indexOf('} else if', i))
    expect(branche).toContain('setCibleApplication(true)')
    expect(branche).not.toMatch(/setSiteMode|sendText/u)
  })

  it('les trois modes existants gardent leur chemin, intact', () => {
    // Le controle negatif : si ce test tombe, c est qu on a touche a ce qui
    // marchait — exactement ce qu on nous a demande d eviter.
    for (const attendu of ["setSiteMode(mode)", "sendText(label)", "setShowDropshipPicker(true)"]) {
      expect(ACCUEIL, attendu).toContain(attendu)
    }
  })
})

describe('CLIQUET — ON NE CONSTRUIT PAS CE QU ON N A PAS COMPRIS', () => {
  // « Il faut que le systeme comprenne l intention de l utilisateur avant de
  // faire quoi que ce soit, on peut pas construire un truc qu on n a pas
  // compris. » Ces trois tests tiennent cette phrase par la STRUCTURE, pas
  // par une consigne d affichage qu un bouton pourrait contourner.
  const COMPRENDRE = sansCommentaires(
    lire('app', 'api', 'generateur', 'comprendre', 'route.ts'),
  )
  const APERCU = sansCommentaires(lire('app', 'api', 'generateur', 'apercu', 'route.ts'))
  const PRODUIRE = sansCommentaires(lire('app', 'api', 'generateur', 'produire', 'route.ts'))

  it('LES BOUTONS DE CONSTRUCTION SUIVENT LE DOCUMENT, pas le fait d avoir parle', () => {
    // AVANT : `derniere !== undefined` — des qu on avait ecrit une phrase, on
    // pouvait lancer une construction, y compris sur une lecture refusee.
    expect(CONVERSATION).toContain('{document_ !== null && (')
    expect(CONVERSATION).not.toMatch(/\{derniere !== undefined && \(/u)
    // Et les deux actions se refusent elles-memes sans document : la garde ne
    // vit pas seulement dans le rendu.
    expect(CONVERSATION).toMatch(/const voir = async \(\) => \{\s*if \(document_ === null\) return;/u)
    expect(CONVERSATION).toMatch(/const telecharger = async \(\) => \{\s*if \(document_ === null\) return;/u)
  })

  it('UNE QUESTION OUVERTE EFFACE LE DOCUMENT PRECEDENT', () => {
    // Sans cela, une seconde demande mal comprise laisserait les boutons
    // actifs sur le document de la demande d avant.
    const i = CONVERSATION.indexOf('d.questions.length > 0')
    expect(i).toBeGreaterThan(0)
    expect(CONVERSATION.slice(i, i + 400)).toContain('setDocument(null)')
  })

  it('LES TROIS ROUTES REFUSENT DE CONSTRUIRE TANT QU UNE QUESTION EST OUVERTE', () => {
    // `comprendre` rend des questions SANS document : l ecran n a donc rien a
    // proposer de construire. Les deux autres refusent explicitement.
    expect(COMPRENDRE).toMatch(/if \('questions' in r\)/u)
    expect(APERCU).toMatch(/if \('questions' in r\)/u)
    expect(PRODUIRE).toMatch(/if \('questions' in r\)/u)
  })

  it('LES QUESTIONS VIENNENT DE LA PROJECTION, jamais d une liste locale', () => {
    // Le depot a vu quatre fois « une liste ecrite deux fois diverge ». Les
    // questions sont celles d EP-136, chargees ; aucun texte de question
    // n est ecrit dans le site.
    const DIALOGUE = sansCommentaires(lire('lib', 'apps', 'dialogue.ts'))
    expect(DIALOGUE).toContain('elicitation.mjs')
    expect(DIALOGUE).not.toMatch(/MODELE_TERME_AMBIGU\s*:/u)
    expect(CONVERSATION).not.toMatch(/MODELE_[A-Z_]+\s*:/u)
  })
})
