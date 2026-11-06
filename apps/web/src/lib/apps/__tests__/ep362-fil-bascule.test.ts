/**
 * EP-362 · C1/C2 — LE FIL PASSE, ET IL REVIENT.
 *
 * ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-11-05.
 *
 * Le propriétaire écrit sa demande complète à l'accueil : une application
 * de gestion d'association, membres avec nom, téléphone, date
 * d'inscription, et une page publique d'annonces. Le modèle comprend que
 * c'est une application et demande confirmation. Il répond « oui c'est
 * bien une application ».
 *
 *   AU BASCULEMENT, TOUTE LA CONVERSATION EST PERDUE.
 *
 * Le chemin applicatif reçoit « oui c'est bien une application » comme
 * cahier des charges entier — et GÉNÈRE QUAND MÊME : une application de
 * relevés de compteur électrique, en kWh, que personne n'a demandée.
 *
 * ── CE N'ÉTAIT PAS UN OUBLI, C'ÉTAIT UNE CONTRADICTION DE DESSIN.
 *
 * L'aiguillage ne se déclenche QU'APRÈS confirmation — `doitAiguiller…`
 * exige `estApplication === true`, et le commentaire du code le dit :
 * « le modèle ne pose ce drapeau qu'une fois la personne d'accord ».
 *
 * Le tour où la bascule se produit est donc TOUJOURS celui de la
 * confirmation. Transmettre « la phrase que la personne vient d'écrire »
 * revenait à transmettre « oui », par construction, à chaque fois.
 *
 * Et le fil vivait à SIX LIGNES du point de passage :
 *
 *   445  const sendText = async (text: string, …)
 *   451  const newMessages = [...messages, { role:'user', content: text }]
 *   551  setDemandeBasculee(text)        ← seul `text` partait
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { demandeDuFil } from '../fil-accueil'

const ONB = join(__dirname, '..', '..', '..', 'components', 'onboarding')

describe('EP-362 · le fil de l’accueil', () => {
  it('① LA DEMANDE EST TOUT CE QUE LA PERSONNE A ÉCRIT, DANS L’ORDRE', () => {
    // Le cas exact, rejoué : la demande complète PUIS la confirmation.
    const fil = [
      { role: 'assistant' as const, content: 'Bonjour ! Que voulez-vous créer ?' },
      {
        role: 'user' as const,
        content: 'Une appli de gestion d’association : membres avec nom, téléphone.',
      },
      { role: 'assistant' as const, content: 'Est-ce bien une application ?' },
      { role: 'user' as const, content: 'oui c’est bien une application' },
    ]
    const d = demandeDuFil(fil)
    expect(d, 'la demande complète est perdue').toMatch(/gestion d’association/u)
    expect(d, 'la confirmation est perdue').toMatch(/oui c’est bien/u)
    expect(d.indexOf('gestion'), 'l’ordre est inversé').toBeLessThan(d.indexOf('oui c’est'))
  })

  it('② ET RIEN DE NOUS N’Y ENTRE', () => {
    // ── POURQUOI ON ÉCARTE NOS PROPRES MESSAGES.
    //
    // Les reprendre ferait passer nos questions pour des exigences : le
    // modèle construirait « Est-ce bien une application ? » au lieu de
    // ce qu'elle a répondu. C'est la même faute que le `releve` de la
    // consigne — notre texte devenu produit.
    const d = demandeDuFil([
      { role: 'assistant', content: 'Bonjour ! Que voulez-vous créer ?' },
      { role: 'user', content: 'une caisse pour mon kiosque' },
      { role: 'assistant', content: 'Est-ce bien une application ?' },
    ])
    expect(d, 'nos questions sont passées pour des exigences').toBe('une caisse pour mon kiosque')
  })

  it('③ UN FIL VIDE NE DÉMARRE RIEN', () => {
    // Un démarrage sur du vide, c'est exactement la génération qu'on
    // vient de payer pour rien.
    expect(demandeDuFil([])).toBe('')
    expect(demandeDuFil([{ role: 'assistant', content: 'Bonjour' }])).toBe('')
    expect(demandeDuFil([{ role: 'user', content: '   ' }])).toBe('')
  })

  it('④ L’ACCUEIL TRANSMET LE FIL, PAS LE DERNIER MESSAGE', () => {
    const src = lireSource(join(ONB, 'OnboardingChat.tsx'))
    // La bascule AUTOMATIQUE — celle qui a produit le compteur.
    expect(src, 'la bascule automatique ne transmet pas le fil').toMatch(
      /setFilBascule\(newMessages\)/u,
    )
    // Et l'ancienne forme a disparu : la garder laisserait deux chemins.
    expect(src, 'le dernier message seul part encore').not.toMatch(/setDemandeBasculee/u)
    expect(src, 'le fil n’arrive pas au chemin applicatif').toMatch(
      /filInitial=\{filBascule\}/u,
    )
  })

  it('⑤ ET LE RETOUR RAMÈNE CE QUI S’EST DIT', () => {
    const accueil = lireSource(join(ONB, 'OnboardingChat.tsx'))
    const appli = lireSource(join(ONB, 'ConversationApplication.tsx'))
    // Le composant REND son fil…
    expect(appli, 'le retour ne rend rien').toMatch(/onRetour\(repart\)/u)
    expect(appli, 'le retour ne prend plus d’argument').toMatch(
      /onRetour:\s*\(fil: FilAccueil\)\s*=>\s*void/u,
    )
    // …et l'accueil le REPREND. Rendre sans reprendre ne sert à rien :
    // c'est la famille « un contrôle qui ne fait que signaler ».
    expect(accueil, 'l’accueil jette ce que le retour lui rend').toMatch(
      /onRetour=\{\(fil\)[\s\S]{0,400}setMessages/u,
    )
  })

  it('⑥ LE CHEMIN APPLICATIF PRÉFÈRE LE FIL À LA CHAÎNE', () => {
    const appli = lireSource(join(ONB, 'ConversationApplication.tsx'))
    // `demandeInitiale` reste pour l'appelant qui n'a qu'un champ. Mais
    // dès qu'un fil existe, c'est lui qui fait le cahier — sinon les
    // deux coexisteraient et on ne saurait plus lequel sert.
    expect(appli, 'la chaîne l’emporte encore sur le fil').toMatch(
      /duFil !== ''\s*\?\s*duFil\s*:\s*demandeInitiale/u,
    )
  })
})
