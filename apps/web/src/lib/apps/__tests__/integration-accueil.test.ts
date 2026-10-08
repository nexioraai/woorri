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
import { sansCommentaires } from './sans-commentaires'

const SRC = join(process.cwd(), 'src')
const lire = (...p: string[]): string => readFileSync(join(SRC, ...p), 'utf8')

// LE DECOUPEUR EST PARTAGE. Celui qui vivait ici procedait en DEUX passes —
// blocs puis lignes — et avalait donc tout code situe entre un `/**` ecrit
// dans un commentaire de ligne et le `*/` suivant. Il n'avait pas encore
// mordu, mais c'est exactement le defaut qui a fait tomber `tracage-cloture`.
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

describe('CLIQUET — IL N Y A QU UNE CONVERSATION, PAS DEUX', () => {
  // « Je t ai explicitement demande d utiliser celui qui etait la avant. »
  //
  // J avais refait une bulle, un champ et un bouton « Envoyer ». Resultat :
  // une SECONDE interface — bulles d une autre forme, composeur d une autre
  // forme, et une section sans hauteur d ecran, ce qui faisait remonter le
  // pied de page en plein milieu de la page.
  //
  // Ces tests tiennent l unicite par la STRUCTURE : les primitives vivent
  // dans un seul fichier, et les deux chemins y passent.
  const PARTAGE = sansCommentaires(lire('components', 'onboarding', 'Conversation.tsx'))
  const ACCUEIL_NU = sansCommentaires(ACCUEIL)

  it('LES PRIMITIVES VIVENT A UN SEUL ENDROIT', () => {
    // La forme de la bulle et celle du composeur ne sont ecrites qu ici.
    expect(PARTAGE).toContain('rounded-[22px] rounded-bl-md')
    expect(PARTAGE).toContain('rounded-[24px] pl-6 pr-16')
    for (const fichier of [ACCUEIL_NU, CONVERSATION]) {
      expect(fichier).not.toContain('rounded-[22px] rounded-bl-md')
      expect(fichier).not.toContain('rounded-[24px] pl-6 pr-16')
    }
  })

  it('LES DEUX CHEMINS PASSENT PAR LES MEMES COMPOSANTS', () => {
    for (const fichier of [ACCUEIL_NU, CONVERSATION]) {
      expect(fichier).toMatch(/from '\.\/Conversation'/u)
      expect(fichier).toContain('<Composeur')
      expect(fichier).toContain('<Bulle')
    }
  })

  it('LA VUE APPLICATION REMPLIT L ECRAN, comme les trois modes', () => {
    // C est ce qui empeche le pied de page de remonter : une section courte
    // laisse le reste de la page remonter sous elle.
    expect(PARTAGE).toContain('h-[calc(100vh-120px)]')
    // Les DEUX branches de l accueil utilisent ce cadre — celle des modes et
    // celle de l application.
    expect([...ACCUEIL_NU.matchAll(/CADRE_CONVERSATION/gu)].length).toBeGreaterThanOrEqual(3)
    // Et la conversation application pose bien la colonne qui defile.
    expect(CONVERSATION).toContain('flex-1 overflow-y-auto')
  })

  it('L ECRAN VIDE EST CENTRE, des deux cotes', () => {
    // Les trois modes centrent tant qu aucun message n est echange. Sans
    // l equivalent, la vue Application laissait le texte d accueil colle en
    // haut et un grand trou jusqu au composeur — le dernier ecart visible
    // entre les deux conversations.
    expect(ACCUEIL_NU).toContain("'justify-center'")
    expect(CONVERSATION).toMatch(/messages\.length === 0 \? '[^']*justify-center/u)
  })

  it('AUCUN CHROME EN PLUS PENDANT LA CONVERSATION', () => {
    // Le retour vivait AU-DESSUS de la conversation, a un endroit ou les
    // trois modes n ont rien. Il ne doit exister que sur l ecran vide —
    // la ou on se rend compte qu on s est trompe de pastille.
    //
    // Le supprimer tout court enfermerait : cliquer « Accueil » vers une
    // route identique ne remonte pas le composant, donc l etat survivrait.
    // L APPEL dans le rendu, pas la signature du composant — celle-ci est
    // en tete de fichier et ferait passer le test pour de mauvaises raisons.
    const i = CONVERSATION.indexOf('onClick={onRetour}')
    expect(i, 'le retour doit exister quelque part').toBeGreaterThan(0)
    expect(CONVERSATION.slice(0, i)).toContain('messages.length === 0')
  })

  it('AUCUN BOUTON « Envoyer » EN TEXTE : la fleche ronde, des deux cotes', () => {
    // Le signe le plus visible des deux interfaces sur la capture d ecran.
    expect(CONVERSATION).not.toMatch(/>\s*Envoyer\s*</u)
    expect(PARTAGE).toContain('ArrowUp')
  })
})
