'use client'
import { useState } from 'react'
import { TYPES_DE_BLOC, type Bloc } from '@/app/sites/[slug]/pages/blocs'
import TeleverseurFichiers from './TeleverseurFichiers'

// ============================================================================
// LOT 4 — L'ÉDITEUR DES BLOCS.
//
// POURQUOI IL EXISTE. Le moteur GÉNÈRE le contenu d'un site ; le client le
// remplace par le sien. Sans cet écran, la CPA verrait des chiffres et des
// textes générés qu'elle ne pourrait PAS corriger — c'est exactement
// GEN-D044, un contenu qu'on peut poser mais pas retirer.
//
// IL NE RECOPIE PAS LE VOCABULAIRE. Les types viennent de `TYPES_DE_BLOC`,
// la même constante que le rendu, elle-même tenue par la CHECK en base. Trois
// endroits, une seule vérité.
//
// IL NE SAIT PAS ÉCRIRE EN BASE. Comme le reste de l'éditeur, il appelle la
// route — qui, elle, vérifie la propriété du site.
// ============================================================================

const ETIQUETTES: Record<string, string> = {
  titre: 'Sous-titre', texte: 'Paragraphe', liste: 'Liste à puces', etapes: 'Marche à suivre',
  frise: 'Frise datée', chiffres: 'Chiffres clés', tableau: 'Tableau', documents: 'Documents',
  questions: 'Questions', encadre: 'Encadré', liens: 'Pages liées', appel: "Bouton d'action",
  image: 'Photo', galerie: 'Galerie photos', citation: 'Citation',
  articles: 'Liste d’articles',
  organigramme: 'Organigramme',
  partenaires: 'Partenaires',
}

import { champsDuBloc, champEstUnFichier, poser, type Chemin } from './edit/champsDeBloc'

/** Les squelettes neufs — un par type, tous valides dès la création. */
const NEUF: Record<string, Bloc> = {
  titre: { type: 'titre', texte: 'Nouveau sous-titre' },
  texte: { type: 'texte', texte: 'Votre texte.' },
  liste: { type: 'liste', items: ['Premier point'] },
  etapes: { type: 'etapes', items: [{ titre: 'Première étape', texte: '' }] },
  frise: { type: 'frise', items: [{ date: '2020', titre: 'Un repère', texte: '' }] },
  chiffres: { type: 'chiffres', items: [{ valeur: '0', libelle: 'à renseigner' }] },
  tableau: { type: 'tableau', entetes: ['Colonne A', 'Colonne B'], lignes: [['', '']] },
  documents: { type: 'documents', items: [{ nom: 'Document', url: '/', format: 'PDF' }] },
  questions: { type: 'questions', items: [{ question: 'Votre question ?', reponse: 'La réponse.' }] },
  encadre: { type: 'encadre', texte: 'Information importante.' },
  liens: { type: 'liens', items: [{ libelle: 'Une page', chemin: 'contact' }] },
  appel: { type: 'appel', libelle: 'Nous contacter', chemin: 'contact' },
  image: { type: 'image', url: 'https://', alt: 'Décrivez la photo' },
  galerie: { type: 'galerie', items: [{ url: 'https://', alt: 'Décrivez la photo' }] },
  citation: { type: 'citation', texte: 'Votre citation.', auteur: '' },
  // Le bloc ne porte AUCUN contenu : il dit quelle catégorie montrer. Les
  // articles s'écrivent au seul endroit prévu pour ça.
  articles: { type: 'articles', categorie: 'communique', titre: 'Derniers communiqués' },
  // Un squelette à DEUX niveaux : un organigramme à une seule entrée ne
  // montre rien de ce qu'un organigramme sert à montrer.
  // Le logo est FACULTATIF : sans fichier, le nom s'affiche. Le bloc est
  // donc utilisable dès sa création, sans rien téléverser.
  partenaires: { type: 'partenaires', titre: 'Nos partenaires', items: [
    { nom: 'Premier partenaire' },
  ] },
  organigramme: { type: 'organigramme', titre: 'Organisation', items: [
    { cle: 'dg', fonction: 'Direction générale' },
    { cle: 'd1', parent: 'dg', fonction: 'Première direction' },
  ] },
}


/** Parcourt un bloc et rend un champ par TEXTE trouvé, quelle que soit sa profondeur. */
export default function EditeurBlocs({
  blocs, onChange, slug,
}: { blocs: Bloc[]; onChange: (b: Bloc[]) => void; slug?: string }) {
  const [ouvert, setOuvert] = useState<number | null>(null)
  /** Quel champ `url` attend qu'on lui choisisse un fichier. */
  const [choix, setChoix] = useState<string | null>(null)
  const maj = (i: number, chemin: Chemin, valeur: string) =>
    onChange(blocs.map((b, j) => (j === i ? (poser(b, chemin, valeur) as Bloc) : b)))
  const bouger = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= blocs.length) return
    const c = [...blocs]; [c[i], c[j]] = [c[j], c[i]]; onChange(c); setOuvert(j)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPES_DE_BLOC.map((t) => (
          <button key={t} type="button" onClick={() => { onChange([...blocs, NEUF[t]]); setOuvert(blocs.length) }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 transition">
            + {ETIQUETTES[t]}
          </button>
        ))}
      </div>

      {blocs.length === 0 && <p className="text-sm opacity-60">Aucun bloc. Ajoutez-en un ci-dessus.</p>}

      {blocs.map((b, i) => (
        <div key={i} className="rounded-xl border border-white/15">
          <div className="flex items-center gap-2 px-3 py-2">
            <button type="button" onClick={() => setOuvert(ouvert === i ? null : i)}
              className="flex-1 text-left text-sm font-medium">
              {i + 1}. {ETIQUETTES[b.type] ?? b.type}
            </button>
            <button type="button" aria-label="Monter" onClick={() => bouger(i, -1)} className="px-2 opacity-70 hover:opacity-100">↑</button>
            <button type="button" aria-label="Descendre" onClick={() => bouger(i, 1)} className="px-2 opacity-70 hover:opacity-100">↓</button>
            <button type="button" aria-label="Supprimer le bloc"
              onClick={() => { onChange(blocs.filter((_, j) => j !== i)); setOuvert(null) }}
              className="px-2 text-red-400 hover:text-red-300">✕</button>
          </div>
          {ouvert === i && (
            <div className="px-3 pb-3 space-y-2">
              {champsDuBloc(b).map(({ chemin, valeur }) => {
                const cle = `${i}.${chemin.join('.')}`
                // UN CHAMP DE FICHIER N'EST PAS UN CHAMP TEXTE.
                // Demander une adresse à un client, c'est lui demander
                // d'héberger son PDF ailleurs — c'est-à-dire de ne pas le
                // faire. Ici il téléverse, et l'adresse se remplit seule.
                //
                // MAIS LE NOM DU CHAMP NE SUFFIT PAS À DÉCIDER. Deux défauts
                // mesurés le 2026-11-09 sur le bloc « partenaires » : son
                // `logo` — un vrai fichier — n'avait aucun téléverseur, et son
                // `url` — l'adresse du SITE du partenaire, chez le partenaire —
                // s'en voyait proposer un. Le type du bloc décide avec le nom.
                const estFichier = champEstUnFichier(b.type, chemin[chemin.length - 1])
                return (
                <label key={cle} className="block">
                  <span className="text-[11px] uppercase tracking-wide opacity-55">{chemin.filter((s) => typeof s === 'string').join(' · ') || 'texte'}</span>
                  {valeur.length > 70 ? (
                    <textarea value={valeur} rows={3} onChange={(e) => maj(i, chemin, e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm" />
                  ) : (
                    <input value={valeur} onChange={(e) => maj(i, chemin, e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm" />
                  )}
                  {estFichier && slug && (
                    <div className="mt-1.5">
                      <button type="button" onClick={() => setChoix(choix === cle ? null : cle)}
                        className="text-[11px] px-2 py-1 rounded-md border border-white/15 hover:bg-white/10">
                        {choix === cle ? 'fermer' : 'téléverser ou choisir un fichier'}
                      </button>
                      {choix === cle && (
                        <div className="mt-2 rounded-lg border border-white/12 p-2">
                          <TeleverseurFichiers slug={slug}
                            dossier={b.type === 'documents' ? 'documents' : 'photos'}
                            onChoisir={(f) => { maj(i, chemin, f.url); setChoix(null) }} />
                        </div>
                      )}
                    </div>
                  )}
                </label>
              )})}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
