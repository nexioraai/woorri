import { describe, it, expect } from 'vitest'
import { lireIntitules } from '@/app/sites/[slug]/acces/intitulesFormulaire'
import { textesDepuisPage } from '@/app/sites/[slug]/themes/textesAssistant'

// LOT 17 — « tout ce qui est visible doit être éditable ». Ces deux lecteurs
// transforment une page de l'éditeur en textes du site ; ils ne doivent
// jamais faire PERDRE un texte à cause d'une modification maladroite.

describe('les intitulés du formulaire', () => {
  const tableau = (lignes: string[][]) => [{ type: 'tableau' as const, entetes: ['Champ', 'Texte affiché'], lignes }]

  it('🔴 la clé décide, pas l’ordre — et les accents/majuscules ne comptent pas', () => {
    expect(lireIntitules(tableau([['TELEPHONE', 'Numéro WhatsApp'], ['nom', 'Votre nom']])))
      .toEqual({ telephone: 'Numéro WhatsApp', nom: 'Votre nom' })
  })

  it('🔴 une ligne vide ou une clé inconnue ne retire rien : le mot par défaut reste', () => {
    expect(lireIntitules(tableau([['Nom', '  '], ['Couleur préférée', 'Bleu']]))).toEqual({})
  })

  it('🔴 sans tableau, aucun intitulé changé', () => {
    expect(lireIntitules([{ type: 'texte', texte: 'x' }])).toEqual({})
  })
})

describe('les textes de la bulle', () => {
  const connus = new Map([['/inscription', 'Créer un compte']])

  it('🔴 titre → en-tête, introduction → accueil, questions → boutons', () => {
    const t = textesDepuisPage({ titre: 'Assistant CPA', chapeau: 'Bonjour.', blocs: [
      { type: 'questions', items: [{ question: 'Créer un compte', reponse: 'Voici le lien : /inscription' }] },
    ] }, connus)
    expect(t).toEqual({ titre: 'Assistant CPA', accueil: 'Bonjour.', sujets: [
      { label: 'Créer un compte', reponse: 'Voici le lien : /inscription', liens: [{ chemin: '/inscription', titre: 'Créer un compte' }] },
    ] })
  })

  it('🔴 une adresse inconnue n’est jamais un lien', () => {
    const t = textesDepuisPage({ titre: null, chapeau: null, blocs: [
      { type: 'questions', items: [{ question: 'X', reponse: 'Voir /page-inventee' }] },
    ] }, connus)
    expect(t.sujets?.[0].liens).toEqual([])
  })

  it('🔴 page absente ou vide : la bulle garde ses mots par défaut', () => {
    expect(textesDepuisPage(null, connus)).toEqual({})
    expect(textesDepuisPage({ titre: ' ', chapeau: '', blocs: [] }, connus)).toEqual({})
  })
})
