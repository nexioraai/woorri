import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { RenduMarkdown } from '@/lib/documentation/markdown'
import { chapitres, slug, type Chapitre, type Langue } from '@/lib/documentation/corpus'

// ============================================================
// LES DEUX ÉCRANS DE LA DOCUMENTATION, PARTAGÉS PAR LES DEUX LANGUES.
//
// Ces pages sont PUBLIQUES : elles portent donc la Navbar et le pied de page
// de la vitrine — « À propos », « Tarifs » et les pages légales y sont à leur
// place, contrairement à l'écran où un marchand modifie sa boutique.
//
// Le dossier `_composants` commence par un souligné : App Router ne le
// transforme pas en route. Rien ici n'est adressable.
// ============================================================

const MOTS = {
  fr: {
    titre: 'Documentation',
    intro:
      'Ce que Deribfy fait, comment il le fait, et ce qu’il ne fait pas. Douze chapitres, ' +
      'tenus à jour avec le produit.',
    autreLangue: 'English',
    retour: 'Accueil',
    chapitre: 'Chapitre',
    suivant: 'Chapitre suivant',
    precedent: 'Chapitre précédent',
  },
  en: {
    titre: 'Documentation',
    intro:
      'What Deribfy does, how it does it, and what it does not do. Twelve chapters, ' +
      'kept in step with the product.',
    autreLangue: 'Français',
    retour: 'Home',
    chapitre: 'Chapter',
    suivant: 'Next chapter',
    precedent: 'Previous chapter',
  },
} as const

/** La racine des chapitres d'une langue. */
export const racine = (langue: Langue) => (langue === 'fr' ? '/documentation' : '/documentation/en')

const autre = (langue: Langue): Langue => (langue === 'fr' ? 'en' : 'fr')

function Bouton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200 inline-block whitespace-nowrap">
      {children}
    </Link>
  )
}

/** Le sommaire : les douze chapitres, avec leur résumé. */
export function Sommaire({ langue }: { langue: Langue }) {
  const m = MOTS[langue]
  const liste = chapitres(langue)

  return (
    <main className="nexiora-bg min-h-screen text-white">
      <Navbar />
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Bouton href="/">← {m.retour}</Bouton>
          <Bouton href={racine(autre(langue))}>{m.autreLangue}</Bouton>
        </div>

        <div className="text-xs uppercase tracking-[0.2em] font-medium mb-3" style={{ color: '#FA5D1E' }}>
          Deribfy
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">{m.titre}</h1>
        <p className="text-lg text-slate-300 leading-relaxed mb-12">{m.intro}</p>

        <div className="space-y-3">
          {liste.map((c, k) => (
            <Link key={c.id} href={`${racine(langue)}/${c.slug}`}
              className="block p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 group">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="text-xs font-bold tabular-nums" style={{ color: '#FA5D1E' }}>
                  {String(k + 1).padStart(2, '0')}
                </span>
                <h2 className="text-lg font-bold text-white">{c.titre}</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed pl-8">{c.resume}</p>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  )
}

/** Un chapitre, rendu depuis son Markdown, avec la navigation de lecture. */
export function PageChapitre({ langue, chapitre: c }: { langue: Langue; chapitre: Chapitre }) {
  const m = MOTS[langue]
  const liste = chapitres(langue)
  const rang = liste.findIndex((x) => x.id === c.id)
  const precedent = rang > 0 ? liste[rang - 1] : null
  const suivant = rang < liste.length - 1 ? liste[rang + 1] : null
  // Le même chapitre dans l'autre langue a une AUTRE adresse : elle vient de
  // son nom de fichier. L'identifiant du manifeste est ce qui relie les deux.
  const jumeau = slug(c.id, autre(langue))

  return (
    <main className="nexiora-bg min-h-screen text-white">
      <Navbar />
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Bouton href={racine(langue)}>← {m.titre}</Bouton>
          {jumeau && <Bouton href={`${racine(autre(langue))}/${jumeau}`}>{m.autreLangue}</Bouton>}
        </div>

        <div className="text-xs uppercase tracking-[0.2em] font-medium mb-3" style={{ color: '#FA5D1E' }}>
          {m.chapitre} {String(rang + 1).padStart(2, '0')} / {liste.length}
        </div>

        <article>
          <RenduMarkdown markdown={c.markdown} />
        </article>

        <nav className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between">
          {precedent ? (
            <Link href={`${racine(langue)}/${precedent.slug}`}
              className="flex-1 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200">
              <div className="text-xs text-slate-500 mb-1">← {m.precedent}</div>
              <div className="text-sm font-semibold text-white">{precedent.titre}</div>
            </Link>
          ) : <div className="flex-1" />}
          {suivant ? (
            <Link href={`${racine(langue)}/${suivant.slug}`}
              className="flex-1 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 sm:text-right">
              <div className="text-xs text-slate-500 mb-1">{m.suivant} →</div>
              <div className="text-sm font-semibold text-white">{suivant.titre}</div>
            </Link>
          ) : <div className="flex-1" />}
        </nav>
      </section>
      <Footer />
    </main>
  )
}
