// ÉTAPE 1 · LA PREUVE À 0 $ — 300 specs fautives synthétiques, une faute chacune.
//
//   ① la base est acceptée par le validateur ET par le schéma Zod ;
//   ② chacune des 300 specs est refusée avec EXACTEMENT sa classe (aucune autre),
//      à la bonne couche, et le schéma Zod s'accorde : il refuse quand la
//      couche 1 refuse, il accepte quand seule la couche 2 refuse ;
//   ③ chaque classe nommée du validateur est exercée par au moins un cas ;
//   ④ chaque refus porte le nom valide le plus proche quand il en existe un —
//      sur les inventions réelles de 94cf0489 et 5b1c20bc.
// Rouge-puis-vert : la détection d'ACTION_SANS_EFFET retirée → ② rouge (③ garde
// la liste des cas elle-même : il rougit si une classe perd son dernier cas).
import { describe, expect, it } from 'vitest'
import { CLASSES, type Classe, validerSpec } from '../validateur'
import { lePlusProche } from '../proche'
import { COMPOSANTS, EVENEMENTS, FAIRE, ICONES, JETONS } from '../catalogue'
import { base, cas, CTX } from './specs-synthetiques'

const CAS = cas()

describe('étape 1 · 300 specs fautives synthétiques', () => {
  it('① la base est acceptée, par le validateur et par Zod', () => {
    const v = validerSpec(base(), CTX)
    expect(v.refus).toEqual([])
    expect(v.zodOk).toBe(true)
  })

  // En trois lots de 100 : un seul test de 300 validations frôlait le plafond de marge sous la charge de la gate.
  it.each([0, 100, 200])('② cas %i à +99 : refusés, chacun avec sa classe exacte, à sa couche, Zod d’accord', (debut) => {
    expect(CAS).toHaveLength(300)
    const ecarts: string[] = []
    for (const c of CAS.slice(debut, debut + 100)) {
      const v = validerSpec(c.spec, CTX)
      const classes = [...new Set(v.refus.map((r) => r.classe))]
      if (v.ok || classes.length !== 1 || classes[0] !== c.classe) ecarts.push(`${c.classe} · ${c.quoi} → ${classes.join(', ') || 'ACCEPTÉE'}`)
      else if (v.couche !== CLASSES[c.classe]) ecarts.push(`${c.classe} · ${c.quoi} → couche ${String(v.couche)}`)
      else if (v.zodOk !== (v.couche === 2)) ecarts.push(`${c.classe} · ${c.quoi} → Zod ${v.zodOk ? 'accepte' : 'refuse'} à la couche ${String(v.couche)}`)
    }
    expect(ecarts).toEqual([])
  })

  it('③ chaque classe nommée est exercée', () => {
    const exercees = new Set(CAS.map((c) => c.classe))
    expect((Object.keys(CLASSES) as Classe[]).filter((k) => !exercees.has(k))).toEqual([])
  })

  it('④ le nom valide le plus proche, sur les inventions mesurées', () => {
    expect(lePlusProche('var(--espace-m)', JETONS.espace)).toBe('m')
    expect(lePlusProche('var(--space-l, 1.5rem)', JETONS.espace)).toBe('l')
    expect(lePlusProche('JETONS.ESPACE.s', JETONS.espace)).toBe('s')
    expect(lePlusProche('var(--primary)', JETONS.couleur)).toBe('accent')
    expect(lePlusProche('muted-foreground', JETONS.couleur)).toBe('texteDiscret')
    expect(lePlusProche('chargement', ICONES)).toBe('horloge')
    expect(lePlusProche('search', ICONES)).toBe('recherche')
    expect(lePlusProche('Button', Object.keys(COMPOSANTS))).toBe('Bouton')
    expect(lePlusProche('CarteVedette', Object.keys(COMPOSANTS))).toBe('Encart')
    expect(lePlusProche('EtatVide', Object.keys(COMPOSANTS))).toBe('Message')
    expect(lePlusProche('recharger', FAIRE)).toBe('emit')
    expect(lePlusProche('offre_id', ['id', 'compte', 'offre', 'statut', 'date', 'montant_total', 'devise_debitee'])).toBe('offre')
    expect(lePlusProche('devise', ['id', 'compte', 'offre', 'statut', 'date', 'montant_total', 'devise_debitee'])).toBe('devise_debitee')
    // Trop loin : aucune proposition plutôt qu'une absurdité (l'ancien juge disait « ROLE_VISITEUR » pour « Reservation »).
    expect(lePlusProche('Reservation', ['ROLE_VISITEUR', 'TABLES'])).toBeNull()
    // Une proposition trompeuse est pire que pas de proposition (mesuré avant ce seuil).
    expect(lePlusProche('choisirTheme', EVENEMENTS)).toBeNull()
    expect(lePlusProche('arrow-left', ICONES)).toBe('retour')
    expect(lePlusProche('credit-card', ICONES)).toBe('paiement')
    expect(lePlusProche('shadow-lg', JETONS.elevation)).toBe('flottant')
    expect(lePlusProche('primary', ['principal', 'secondaire', 'discret', 'danger'])).toBe('principal')
    expect(lePlusProche('email', ['texte', 'nombre', 'date', 'courriel', 'telephone', 'secret', 'choix', 'case'])).toBe('courriel')
  })
})
