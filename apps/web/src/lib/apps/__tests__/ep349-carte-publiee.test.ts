/**
 * EP-349 · UNE ŒUVRE PUBLIÉE PORTE SON ADRESSE, ET « PUBLIÉE » N'EST PAS
 * « LIVRÉE ».
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-05.
 *
 * Six cartes à l'écran. Toutes titrées « Application », toutes marquées
 * « livrée », AUCUNE ne portant son adresse :
 *
 *     09:24  livrée · 0 table · non publiée
 *     04:14  livrée · 0 table · non publiée
 *     21:46  livrée · 4 tables · non publiée
 *     19:00  livrée · 1 table · PUBLIÉE → snenak        ← la seule
 *     18:52  livrée · 0 table · non publiée
 *     18:15  livrée · 1 table · non publiée
 *
 * Le propriétaire devait DEVINER laquelle était `snenak.deribfy.app`
 * pour faire la preuve qu'on attendait depuis trois jours.
 *
 * ── DEUX ÉTATS, DEUX MARQUES.
 *
 * « Livrée » dit que la machine a fini. « Publiée » dit que des gens
 * peuvent l'ouvrir. Les confondre fait perdre la seule information qui
 * distingue une carte des cinq autres.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { adressePubliee } from '../sous-domaine'

const SRC = join(__dirname, '..', '..', '..')
const LISTE = join(SRC, 'app', 'api', 'generateur', 'mes-applications', 'route.ts')
const CARTE = join(SRC, 'app', 'dashboard', 'page.tsx')

describe('EP-349 · la carte d’une œuvre publiée', () => {
  it('① LA LISTE REND L’ADRESSE — sinon l’écran ne peut pas la montrer', () => {
    const src = lireSource(LISTE)
    // Elle doit d'abord la LIRE : une colonne non sélectionnée n'arrive
    // jamais, et la carte resterait muette sans que rien ne rougisse.
    expect(src, 'la publication n’est pas lue en base').toMatch(
      /\.select\([^)]*publication_slug[^)]*publication_jeton/u,
    )
    expect(src, 'l’adresse n’est pas rendue').toMatch(/adresse: adressePubliee\(/u)

    // ── LES DEUX FORMES D'ADRESSE — ET ON LES EXERCE, on ne les lit pas.
    //
    // MON PREMIER JET ANCRAIT LE LITTÉRAL `.deribfy.app` DANS CETTE
    // ROUTE. Le lendemain l'atelier a eu besoin de la même adresse, la
    // construction est partie dans `sous-domaine.ts` — et ce contrôle a
    // rougi sur un changement JUSTE. Huitième fois cette semaine qu'une
    // ancre mesure un RANGEMENT au lieu d'une propriété.
    //
    // Une œuvre peut être publiée sous un sous-domaine OU sous son seul
    // jeton. N'en rendre qu'une laisserait la moitié des cartes muettes.
    expect(adressePubliee('snenak', 'jt-1'), 'le sous-domaine ne gagne pas').toBe(
      'https://snenak.deribfy.app',
    )
    expect(adressePubliee('', 'jt-1'), 'la publication par jeton est oubliée')?.toMatch(
      /\/p\/jt-1$/u,
    )
    // ── ET UNE ŒUVRE NON PUBLIÉE N'A PAS D'ADRESSE.
    //
    // `null`, pas une chaîne vide : une chaîne vide dans un `href`
    // recharge la page courante, et la carte aurait l'air cliquable.
    expect(adressePubliee('', ''), 'une œuvre non publiée reçoit une adresse').toBeNull()
    expect(adressePubliee(undefined, null), 'des valeurs absentes passent').toBeNull()
  })

  it('② LA CARTE AFFICHE L’ADRESSE, EN CLAIR ET CLIQUABLE', () => {
    const src = lireSource(CARTE)
    expect(src, 'l’adresse n’est pas affichée').toMatch(/href=\{a\.adresse\}/u)
    // ── ET LE CLIC N'OUVRE PAS L'ATELIER PAR-DESSUS.
    //
    // La carte entière est cliquable : sans l'arrêt de propagation, le
    // lien emmènerait vers l'application ET vers l'atelier à la fois.
    expect(src, 'le clic sur l’adresse déclenche aussi la carte').toMatch(
      /href=\{a\.adresse\}[\s\S]{0,220}stopPropagation/u,
    )
  })

  it('③ « PUBLIÉE » N’EST PAS « LIVRÉE » — deux états, deux marques', () => {
    const src = lireSource(CARTE)
    const i = src.indexOf("a.adresse != null ? 'publiée'")
    expect(i, 'la marque « publiée » n’existe pas').toBeGreaterThan(0)
    // LA MARQUE SUIT L'ADRESSE, pas le statut : une œuvre livrée ET
    // publiée doit dire « publiée », sinon on retombe sur six cartes
    // identiques.
    // ── L'ANCRE EST LA BALISE, PAS UNE FENÊTRE DE N SIGNES.
    //
    // Mon premier motif coupait 320 signes avant l'index : la condition
    // de style vit plus haut, et le contrôle rougissait sur du code
    // juste. Une fenêtre arbitraire mesure la mise en page, pas la
    // propriété.
    const span = src.slice(src.lastIndexOf('<span className=', i), i)
    expect(span, 'la marque de publication ne se distingue pas visuellement').toMatch(
      /a\.adresse != null/u,
    )
    expect(src, 'la marque « livrée » a disparu').toMatch(/'livrée'/u)
  })
})
