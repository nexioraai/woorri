'use client'
import { useState } from 'react'
import { TYPES_DE_BLOC, type Bloc } from '@/app/sites/[slug]/pages/blocs'

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
}

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
}

type Chemin = (string | number)[]

/** Parcourt un bloc et rend un champ par TEXTE trouvé, quelle que soit sa profondeur. */
function champs(v: unknown, base: Chemin = []): { chemin: Chemin; valeur: string }[] {
  if (typeof v === 'string') return [{ chemin: base, valeur: v }]
  if (Array.isArray(v)) return v.flatMap((e, i) => champs(e, [...base, i]))
  if (v && typeof v === 'object')
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => k !== 'type')
      .flatMap(([k, e]) => champs(e, [...base, k]))
  return []
}

function poser(obj: unknown, chemin: Chemin, valeur: string): unknown {
  if (chemin.length === 0) return valeur
  const [t, ...reste] = chemin
  if (Array.isArray(obj)) {
    const c = [...obj]; c[t as number] = poser(c[t as number], reste, valeur); return c
  }
  return { ...(obj as object), [t as string]: poser((obj as Record<string, unknown>)[t as string], reste, valeur) }
}

export default function EditeurBlocs({
  blocs, onChange,
}: { blocs: Bloc[]; onChange: (b: Bloc[]) => void }) {
  const [ouvert, setOuvert] = useState<number | null>(null)
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
              {champs(b).map(({ chemin, valeur }) => (
                <label key={chemin.join('.')} className="block">
                  <span className="text-[11px] uppercase tracking-wide opacity-55">{chemin.filter((s) => typeof s === 'string').join(' · ') || 'texte'}</span>
                  {valeur.length > 70 ? (
                    <textarea value={valeur} rows={3} onChange={(e) => maj(i, chemin, e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm" />
                  ) : (
                    <input value={valeur} onChange={(e) => maj(i, chemin, e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/15 text-sm" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
