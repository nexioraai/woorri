/**
 * TEST-OR — L'ATTENTE DES TROIS MODES, AU CARACTERE PRES.
 *
 * `Attente` est PARTAGEE : OnboardingChat (les trois modes) et la creation
 * d'application s'en servent. On lui a ajoute une phrase pour la seconde ;
 * la premiere doit rester OCTET POUR OCTET ce qu'elle etait. Meme discipline
 * que l'Escalier et le Composeur.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Attente } from '../Conversation'

/** Le rendu des trois modes, releve avant la modification. */
const NU =
  '<div class="flex justify-start">' +
  '<div class="bg-white/[0.06] border border-white/10 rounded-[22px] rounded-bl-md px-5 py-4">' +
  '<div class="flex gap-1.5">' +
  '<span class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay:0ms"></span>' +
  '<span class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay:150ms"></span>' +
  '<span class="w-2 h-2 rounded-full bg-white/50 animate-bounce" style="animation-delay:300ms"></span>' +
  '</div></div></div>'

describe("test-or — l'attente des trois modes n'a pas le droit de bouger", () => {
  it('rendu nu : exactement ce qu’il était, au caractère près', () => {
    expect(renderToStaticMarkup(<Attente />)).toBe(NU)
  })

  it('avec une phrase : elle s’AJOUTE dans la bulle, elle ne remplace rien', () => {
    const phrase = 'Je lis votre demande depuis 2 min…'
    const avec = renderToStaticMarkup(<Attente libelle={phrase} />)
    // Le rendu attendu est le rendu NU, avec le paragraphe glisse APRES les
    // trois points et DANS la bulle. Rien d'autre n'a le droit de changer.
    expect(avec).toBe(
      NU.replace(
        '</div></div></div>',
        `</div><p class="mt-2 text-xs text-slate-400">${phrase}</p></div></div>`,
      ),
    )
  })

  it('la phrase ne laisse JAMAIS fuir un coût ni le jargon du fournisseur', () => {
    // Regle du proprietaire, posee le 2026-10-10 apres l'avoir vue violee.
    const avec = renderToStaticMarkup(<Attente libelle="Je lis votre cahier des charges…" />)
    expect(avec).not.toMatch(/jeton|token|\$|USD|crédit|credit|quota|anthropic/iu)
  })
})
