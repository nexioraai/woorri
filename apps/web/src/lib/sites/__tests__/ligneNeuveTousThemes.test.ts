/**
 * LOT 4c — UNE LIGNE NEUVE « À COMPLÉTER » N'EST JAMAIS SERVIE À UN VISITEUR,
 * SUR AUCUN THÈME (la CPA comprise). Seul le propriétaire vérifié la voit.
 *
 * Méthode : pour chaque bloc à lignes, on ajoute une ligne avec la VRAIE fonction
 * de l'éditeur (`ajouterLigne`), puis on rend avec le VRAI composant
 * (`BlocsDePage`, par où passent tous les thèmes et toutes les pages) :
 *   · visiteur : le HTML est IDENTIQUE, au caractère près, à celui d'avant l'ajout ;
 *   · propriétaire : la ligne « À compléter » est là.
 * Ce que ce fichier NE voit PAS : le cookie réel (la vérification du
 * propriétaire est éprouvée par ses ancres et ses mutations), et les pages
 * spéciales (espace, accès, catalogue…) où le propriétaire voit comme un visiteur.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { motifTexte } from '@/lib/apps/__tests__/motif-texte'
import BlocsDePage from '@/app/sites/[slug]/pages/BlocsDePage'
import type { Bloc } from '@/app/sites/[slug]/pages/blocs'
import { ajouterLigne } from '@/components/edit/champsDeBloc'
import { pagesLegalesInstitution } from '@/lib/sites/squeletteInstitution'

const lire = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
const rendu = (blocs: Bloc[], proprietaire?: boolean) => renderToStaticMarkup(createElement(BlocsDePage, { blocs, base: 'https://cpa-tchad.deribfy.app', primary: '#0b5', ...(proprietaire === undefined ? {} : { proprietaire }) }))

// Des blocs comme ceux de la CPA : un de chaque type à lignes, déjà remplis.
const BLOCS: Bloc[] = [
  { type: 'liste', items: ['Achats groupés', 'Distribution'] },
  { type: 'etapes', items: [{ titre: 'Déposer le dossier', texte: 'Au guichet.' }] },
  { type: 'frise', items: [{ date: '2019', titre: 'Création' }] },
  { type: 'chiffres', items: [{ valeur: '120', libelle: 'Structures servies' }] },
  { type: 'tableau', entetes: ['Produit', 'Délai'], lignes: [['Vaccins', '48 h']] },
  { type: 'documents', items: [{ nom: 'Rapport annuel', url: '/rapport.pdf', format: 'PDF' }] },
  { type: 'questions', items: [{ question: 'Qui peut commander ?', reponse: 'Les structures agréées.' }] },
  { type: 'liens', items: [{ libelle: 'Contact', chemin: 'contact' }] },
  { type: 'galerie', items: [{ url: 'https://x.supabase.co/a.jpg', alt: 'Entrepôt' }] },
  { type: 'partenaires', items: [{ nom: 'Ministère de la Santé' }] },
  { type: 'organigramme', items: [{ cle: 'dg', fonction: 'Direction générale' }] },
] as Bloc[]

describe('une ligne neuve, bloc par bloc', () => {
  for (const b of BLOCS) {
    it(`${b.type} : invisible du visiteur (HTML identique), visible du propriétaire`, () => {
      const avec = ajouterLigne(b)
      expect(avec, `${b.type} : la ligne est bien ajoutée`).not.toEqual(b)
      expect(rendu([avec])).toBe(rendu([b]))
      expect(rendu([avec], false)).toBe(rendu([b], false))
      expect(rendu([avec])).not.toMatch(/compléter/u)
      expect(rendu([avec], true)).toMatch(/À\scompléter/u)
    })
  }
  it('une ligne à MOITIÉ remplie reste cachée : chiffre écrit, libellé « À compléter »', () => {
    const b = { type: 'chiffres', items: [{ valeur: '120', libelle: 'Structures' }, { valeur: '40', libelle: 'À compléter' }] } as Bloc
    expect(rendu([b])).not.toMatch(/compléter|>40</u)
    expect(rendu([b], true)).toMatch(/À\scompléter/u)
  })
  it('une ligne neuve de partenaire ne recopie jamais l’adresse du SITE du partenaire précédent', () => {
    const b = ajouterLigne({ type: 'partenaires', items: [{ nom: 'Ministère de la Santé', url: 'https://sante.gouv.td', logo: 'https://x/l.png' }] } as Bloc)
    expect((b as unknown as { items: unknown[] }).items[1]).toEqual({ nom: 'À compléter' })
  })
  it('un bloc dont il ne reste rien n’est pas rendu du tout (jamais un titre au-dessus du vide)', () => {
    const vide = { type: 'liste', titre: 'Nos missions', items: ['À compléter'] } as Bloc
    expect(rendu([vide])).toBe('')
    expect(rendu([vide], true)).toMatch(/Nos\smissions/u)
  })
  it('les contenus EXISTANTS ne changent pas : un encadré qui PARLE de « à compléter » reste (cas réel de la CPA)', () => {
    const cpa = [
      { type: 'encadre', ton: 'attention', texte: 'Les mentions marquées « à compléter » sont obligatoires et doivent être renseignées par la Centrale.' },
      { type: 'encadre', ton: 'info', titre: 'Une liste à compléter', texte: 'Les partenaires ci-dessus sont génériques.' },
    ] as Bloc[]
    expect(rendu(cpa)).toBe(rendu(cpa, true))
    expect(rendu(cpa)).toMatch(/Une\sliste\sà\scompléter/u)
  })
})

describe('branché sur toutes les pages qui rendent des blocs', () => {
  it('par DÉFAUT, BlocsDePage filtre : un appelant qui oublie le propriétaire protège le visiteur', () => {
    expect(lire('src/app/sites/[slug]/pages/BlocsDePage.tsx')).toMatch(motifTexte('const blocs = proprietaire ? tousLesBlocs : blocsPourVisiteur(tousLesBlocs)'))
  })
  it('pages intérieures (tous thèmes), fiches et accueil Editorial reçoivent le propriétaire VÉRIFIÉ', () => {
    const rest = lire('src/app/sites/[slug]/[...rest]/page.tsx')
    expect(rest).toMatch(motifTexte('const proprietaire = institution !== null ? institution.donnees.proprietaire : await estProprietaireDuSite(site.id)'))
    expect(rest.split('proprietaire={proprietaire}').length - 1).toBe(2)
    const accueil = lire('src/app/sites/[slug]/page.tsx')
    expect(accueil).toMatch(motifTexte('const suiteHero = proprietaire ? suiteBrute : suiteBrute'))
    expect(accueil).toMatch(motifTexte('proprietaire={proprietaire} />'))
    expect(lire('src/app/sites/[slug]/themes/EditorialTheme.tsx')).toMatch(motifTexte('lang={site.lang} proprietaire={proprietaire} />'))
    expect(lire('src/app/sites/[slug]/pages/FicheResponsable.tsx')).toMatch(motifTexte('<BlocsDePage blocs={reste} base={base} primary={accent} proprietaire={proprietaire} />'))
  })
})

describe('les pages légales GÉNÉRÉES, rendues comme le site les sert', () => {
  for (const assistant of [false, true]) {
    const pages = pagesLegalesInstitution({ assistant })
    for (const chemin of ['mentions-legales', 'confidentialite']) {
      it(`${chemin}${assistant ? ' (assistant allumé)' : ''} : la note « Visible par vous seul » n’est jamais servie au visiteur ; le propriétaire la voit`, () => {
        const blocs = pages.find((p) => p.chemin === chemin)!.blocs as unknown as Bloc[]
        const visiteur = rendu(blocs)
        expect(visiteur).not.toMatch(/Visible\spar\svous\sseul|service\sjuridique|compléter/u)
        expect(rendu(blocs, true)).toMatch(/Visible\spar\svous\sseul/u)
        expect(rendu(blocs, true)).toMatch(/service\sjuridique/u)
        if (chemin === 'mentions-legales') {
          // Le visiteur voit l'hébergeur (rempli), jamais les cases « À compléter » de l'éditeur du site.
          expect(visiteur).toMatch(/Deribfy\s—\swww\.deribfy\.com/u)
          expect(visiteur).not.toMatch(/Directeur\sde\sla\spublication/u)
        }
      })
    }
  }
})

describe('la vue visiteur du propriétaire', () => {
  it('le cookie `deribfy_vue=visiteur` ne peut que RETIRER : il est lu AVANT le jeton, et rend « pas propriétaire »', () => {
    const f = lire('src/lib/sites/proprietaireDuSite.ts')
    expect(f).toMatch(motifTexte("return (await cookies()).get(COOKIE_VUE)?.value === 'visiteur'"))
    expect(f).toMatch(motifTexte("if (await vueVisiteur()) return false\n  const jeton = await jetonDApercu()"))
    expect(f).toMatch(motifTexte("export const COOKIE_VUE = 'deribfy_vue'"))
  })
})
