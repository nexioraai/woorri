/**
 * LE JUGE ETIQUETTE, IL N'ANNULE PLUS.
 *
 * ── CE QUI A COMMANDE CE LOT.
 *
 * Comparaison du 2026-10-11 sur les quatre generateurs comparables :
 * AUCUN ne refuse de livrer. Lovable et Bolt rendent l'application et
 * signalent le defaut ; Replit boucle jusqu'a ce que ca passe. Deribfy
 * etait le seul a rendre ZERO — et pire, la garde `emission.ok` jetait les
 * documents PARFAITEMENT VALIDES sans meme les regarder, puisque les juges
 * de fond ne tournent qu'APRES un `safeParse` reussi.
 *
 * Ces tests tiennent les deux moities : la phrase que l'utilisateur lit, et
 * le fait que la source ne peut plus redevenir destructrice.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sansCommentaires } from './sans-commentaires'
import { direLImperfection } from '../pour'

const POUR = sansCommentaires(
  readFileSync(join(__dirname, '..', 'pour.ts'), 'utf8'),
)

describe('ce que l’utilisateur lit quand on livre quand même', () => {
  it('annonce une réserve, pas un échec — l’application EST à lui', () => {
    const p = direLImperfection(3, 0)
    expect(p).toContain('Votre application est prête')
    expect(p).toContain('3 points n’ont pas pu être réglés')
    expect(p).toContain('telle quelle')
  })

  it('accorde le singulier', () => {
    expect(direLImperfection(1, 0)).toContain('un point n’a pas pu être réglé')
    expect(direLImperfection(0, 0)).toContain('un point n’a pas pu être réglé')
  })

  it('dit ce qui a été retiré, et seulement si quelque chose l’a été', () => {
    expect(direLImperfection(2, 0)).not.toContain('retiré')
    expect(direLImperfection(2, 1)).toContain('Un élément en trop a été retiré')
    expect(direLImperfection(2, 4)).toContain('4 éléments en trop ont été retirés')
  })

  it('JAMAIS un code, un chemin, un montant ni le jargon du fournisseur', () => {
    const interdit = /SCHEMA|AIR_|@|\$|jeton|token|crédit|credit|anthropic|stagnation/iu
    for (const [d, r] of [[0, 0], [1, 1], [3, 2], [40, 9]] as const) {
      expect(direLImperfection(d, r)).not.toMatch(interdit)
    }
  })
})

describe('CLIQUET — la source ne peut plus détruire un document valide', () => {
  it('le sauvetage est tenté AVANT de déclarer « incompris »', () => {
    const sauvetage = POUR.indexOf('const sauve = sauverLivrable(')
    // Il y a DEUX refus « incompris » : le premier dit que l'IA n'est pas
    // activee sur ce serveur — rien n'a ete genere, il n'y a rien a sauver.
    // Celui qui nous occupe est le DERNIER : le refus apres generation.
    const incompris = POUR.lastIndexOf('incompris: true,')
    expect(sauvetage).toBeGreaterThan(-1)
    expect(sauvetage).toBeLessThan(incompris)
  })

  it('une QUESTION garde la priorité sur la livraison', () => {
    // Regle plus ancienne, et elle tient : on ne livre pas une application
    // pendant qu'on demande a l'humain de trancher.
    const questions = POUR.indexOf('if (questions.length > 0)')
    const sauvetage = POUR.indexOf('const sauve = sauverLivrable(')
    expect(questions).toBeGreaterThan(-1)
    expect(questions).toBeLessThan(sauvetage)
  })

  it('le sauvetage regarde le document SANS exiger `ok`', () => {
    // C'est toute l'erreur d'avant : `emission.ok && ...` ne regardait meme
    // pas un document que le schema aurait accepte.
    expect(POUR).toContain('sauverLivrable(emission.document)')
    expect(POUR).not.toMatch(/sauverLivrable\(\s*emission\.ok/u)
  })

  it('une livraison imparfaite se DIT, elle ne se déguise pas', () => {
    expect(POUR).toContain('imparfait: true')
    expect(POUR).toContain('echecIA: direLImperfection(')
  })

  it('le nettoyage mécanique ne fabrique rien', () => {
    // Le reparateur est injecte avec le vrai schema et ne traite que les
    // cles en trop — sa propre preuve le tient, ici on tient le cablage.
    expect(POUR).toContain('retirerClesInconnues(brut')
  })
})
