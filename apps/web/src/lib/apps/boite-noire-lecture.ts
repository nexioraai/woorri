import 'server-only'
/**
 * LE FICHIER LISIBLE D'UNE BOÎTE NOIRE (2026-11-23). La porte (fondateur seul,
 * `estAdmin`) est écrite dans chaque route /api/admin/boite-noire ; la table
 * elle-même refuse anon et authenticated (boite_noire.sql).
 */

type PhraseLue = { phrase: string; verdict: string; etape: string | null; raison: string; methode: string }

type Ligne = {
  readonly id: string
  readonly cree_le: string
  readonly generation_id: string | null
  readonly nature: string
  readonly issue: string
  readonly tronquee: boolean
  readonly taille_octets: number
  readonly etapes: readonly { n: number; quand: string; type: string; titre: string; donnees: unknown }[]
  readonly analyse_phrases: {
    phrases?: readonly PhraseLue[]
    resume?: unknown
    fiabilite?: string
    constats?: readonly { quoi: string; preuve: string }[]
    origine?: { phrases?: readonly PhraseLue[] }
  } | null
}

const bloc = (texte: string): string => {
  const barres = (texte.match(/`{3,}/gu) ?? []).reduce((m, b) => Math.max(m, b.length), 2) + 1
  const clos = '`'.repeat(barres)
  return `${clos}\n${texte}\n${clos}`
}

/** Un texte long d'une étape : en bloc, tel quel ; le reste en JSON lisible. */
function rendreDonnees(d: unknown): string {
  if (d === null || typeof d !== 'object') return bloc(String(d))
  const morceaux: string[] = []
  const reste: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
    if (typeof v === 'string' && (v.length > 300 || v.includes('\n'))) morceaux.push(`**${k}** :\n\n${bloc(v)}`)
    else reste[k] = v
  }
  return [Object.keys(reste).length > 0 ? bloc(JSON.stringify(reste, null, 2)) : '', ...morceaux].filter((x) => x !== '').join('\n\n')
}

/** UN fichier lisible par un humain : la boîte noire entière, dans l'ordre. */
export function boiteEnTexte(l: Ligne, nomAppli: string | null): string {
  const a = l.analyse_phrases
  const lignes: string[] = [
    `# Boîte noire — ${nomAppli ?? 'application'} (${l.nature})`,
    '',
    `- Boîte : ${l.id}`,
    `- Application : ${l.generation_id ?? 'aucune (rien n’a été écrit)'}`,
    `- Date : ${l.cree_le}`,
    `- Issue : ${l.issue}`,
    `- Taille : ${String(l.taille_octets)} octets${l.tronquee ? ' — DES TEXTES ONT ÉTÉ COUPÉS (la coupe est marquée dans le texte)' : ''}`,
    '',
    '## Analyse phrase par phrase (diagnostic, jamais montrée au client)',
    '',
    a?.fiabilite !== undefined ? `> Fiabilité : ${a.fiabilite}` : '> Pas d’analyse.',
    '',
  ]
  const phrases = (liste: readonly PhraseLue[]): void => {
    for (const p of liste) {
      lignes.push(`- **[${p.verdict}]** ${p.phrase}`, `  - étape : ${p.etape ?? '—'} · méthode : ${p.methode}`, `  - ${p.raison}`)
    }
  }
  phrases(a?.phrases ?? [])
  if ((a?.origine?.phrases ?? []).length > 0) {
    lignes.push('', '### La demande d’origine, relue contre l’appli modifiée', '')
    phrases(a?.origine?.phrases ?? [])
  }
  if ((a?.constats ?? []).length > 0) {
    lignes.push('', '## Constats sur l’appli livrée', '')
    for (const c of a?.constats ?? []) lignes.push(`- **${c.quoi}**`, `  - ${c.preuve}`)
  }
  lignes.push('', '## Les étapes, dans l’ordre', '')
  for (const e of l.etapes) lignes.push(`### ${String(e.n)}. ${e.titre}`, '', `_${e.type} · ${e.quand}_`, '', rendreDonnees(e.donnees), '')
  return lignes.join('\n')
}
