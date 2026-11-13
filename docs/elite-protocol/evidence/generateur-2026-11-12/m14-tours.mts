// M14 — PAR TOUR : durée, fichiers, taille du code, motif du refus, et ce que le
// tour suivant a RÉÉCRIT (part des lignes identiques au tour précédent).
//
// GRATUIT : lecture seule de quatre lignes du jour (e9e1803f, 9cc16d10,
// a13f8f9f, 44ca6bbe). Les jetons PAR TOUR ne sont pas enregistrés (la ligne ne
// porte que les totaux `jetons_entree` / `jetons_sortie`) : ils sont déduits
// de la taille du code au prorata des totaux, et dits comme tels.
// La question du propriétaire : combien des 370–624 s sont de la réécriture
// de code déjà accepté ? Réponse déduite : durée du tour × part de lignes
// identiques au tour précédent.
//   cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m14-tours.mts
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'

const env: Record<string, string> = {}
for (const ligne of readFileSync('/Users/yia/dev/woorri/apps/web/.env.local', 'utf8').split('\n')) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)
  if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/gu, '')
}
const U = env.NEXT_PUBLIC_SUPABASE_URL!, K = env.SUPABASE_SERVICE_ROLE_KEY!
const h = { apikey: K, Authorization: `Bearer ${K}` }
// Identifiants ENTIERS : la colonne est un uuid, `like` n'y est pas permis (mesuré : réponse vide).
const IDS = ['e9e1803f-4d8b-46f4-872b-c31523ec4faf', '9cc16d10-40f9-4c01-8ad6-6a8e6082758e', 'a13f8f9f-5571-4898-b60b-11454935f500', '44ca6bbe-65a0-4f47-994d-f2fc8db72978']

type Tour = { rang: number; ok: boolean; ms?: number; tronquee?: boolean; motif?: string; fichiers?: number; source?: Record<string, string> | string }
type Ligne = { id: string; created_at: string; duree_ms: number; cout_usd: number; jetons_entree: number | null; jetons_sortie: number | null; tirages: number | null; demande: string; sections_acquises: { tours?: Tour[]; execution?: { ecransDistincts?: number } } }

const lignesDe = (s: string) => s.split('\n').map((l) => l.trim()).filter((l) => l !== '')
const fichiersDe = (t: Tour): Record<string, string> => (typeof t.source === 'object' && t.source !== null ? t.source : {})
const classeDuMotif = (m: string | undefined) => (m ?? '').split('\n').filter((l) => /^[A-ZÀ-Ü][A-ZÀ-Ü’' ,-]{12,}/u.test(l.trim())).map((l) => l.trim().split(/ — |:/u)[0]!.trim().slice(0, 60))

const rows: Ligne[] = []
for (const id of IDS) {
  const r = (await (await fetch(`${U}/rest/v1/app_generations?select=id,created_at,duree_ms,cout_usd,jetons_entree,jetons_sortie,tirages,demande,sections_acquises&id=eq.${id}`, { headers: h })).json()) as Ligne[] | { message?: string }
  if (!Array.isArray(r)) throw new Error(`lecture refusée pour ${id} : ${String(r.message ?? '')}`)
  if (r[0]) rows.push(r[0]); else console.log('ligne absente :', id)
}
const sortie = []
for (const l of rows) {
  const tours = l.sections_acquises.tours ?? []
  // Le tour ACCEPTÉ n'a pas de `source` dans la ligne (boucle-directe.ts:690) :
  // ses fichiers sont ceux de la version livrée, sans la bibliothèque injectée.
  const v = (await (await fetch(`${U}/rest/v1/app_generation_versions?select=rang,etat&generation_id=eq.${l.id}&order=rang.desc&limit=1`, { headers: h })).json()) as { etat?: { fichiers?: Record<string, string> | [string, string][] } }[]
  const livres = v[0]?.etat?.fichiers
  const livresModele = Object.fromEntries(Object.entries(Array.isArray(livres) ? Object.fromEntries(livres) : (livres ?? {})).filter(([k]) => !k.startsWith('systeme/')))
  for (const t of tours) if (t.ok && (t.source === undefined || typeof t.source === 'string')) t.source = livresModele
  const totalSignes = tours.reduce((s, t) => s + Object.values(fichiersDe(t)).join('').length, 0)
  const parTour = []
  let precedent: Record<string, string> | null = null
  for (const t of tours) {
    const f = fichiersDe(t)
    const signes = Object.values(f).join('').length
    const lignes = Object.values(f).flatMap(lignesDe)
    let identiques = 0
    if (precedent !== null) {
      const avant = new Set(Object.values(precedent).flatMap(lignesDe))
      identiques = lignes.filter((x) => avant.has(x)).length
    }
    const part = lignes.length === 0 ? 0 : identiques / lignes.length
    const ms = t.ms ?? 0
    parTour.push({
      rang: t.rang, ok: t.ok, ms, s: Math.round(ms / 1000), tronquee: t.tronquee ?? null,
      fichiers: Object.keys(f).length, signes, lignes: lignes.length,
      jetonsSortieDeduits: l.jetons_sortie === null || totalSignes === 0 ? null : Math.round((l.jetons_sortie * signes) / totalSignes),
      lignesIdentiquesAuTourPrecedent: precedent === null ? null : identiques,
      partIdentique: precedent === null ? null : Number(part.toFixed(3)),
      secondesDeReecritureDeduites: precedent === null ? null : Math.round((ms * part) / 1000),
      motif: classeDuMotif(t.motif),
      fichiersChanges: precedent === null ? null : Object.keys(f).filter((k) => (precedent as Record<string, string>)[k] !== f[k]),
    })
    precedent = f
  }
  const reecriture = parTour.reduce((s, t) => s + (t.secondesDeReecritureDeduites ?? 0), 0)
  sortie.push({
    id: l.id.slice(0, 8), quand: l.created_at.slice(0, 16), dureeS: Math.round(l.duree_ms / 1000), coutUsd: l.cout_usd,
    jetonsEntree: l.jetons_entree, jetonsSortie: l.jetons_sortie, tours: tours.length,
    sommeMsTours: Math.round(tours.reduce((s, t) => s + (t.ms ?? 0), 0) / 1000),
    secondesDeReecritureDeduites: reecriture,
    partDeLaDuree: Number((reecriture / (l.duree_ms / 1000)).toFixed(2)),
    ecransDistincts: l.sections_acquises.execution?.ecransDistincts ?? null,
    parTour,
  })
}
writeFileSync(join(ICI, 'sortie', 'm14-tours.json'), JSON.stringify({ note: 'jetons par tour NON enregistrés : déduits au prorata des signes ; réflexion : voir rapport', lignes: sortie }, null, 1) + '\n')
for (const s of sortie) {
  console.log(`\n== ${s.id} (${s.quand}) · ${String(s.dureeS)} s · ${String(s.coutUsd)} $ · jetons ${String(s.jetonsEntree)} / ${String(s.jetonsSortie)} · ${String(s.tours)} tours (somme ${String(s.sommeMsTours)} s) · écrans distincts ${String(s.ecransDistincts)}`)
  console.log(`   réécriture déduite : ${String(s.secondesDeReecritureDeduites)} s = ${String(Math.round(s.partDeLaDuree * 100))} % de la durée`)
  for (const t of s.parTour) console.log(`   tour ${String(t.rang)} ${t.ok ? 'ok   ' : 'refus'} ${String(t.s).padStart(4)} s · ${String(t.fichiers)} fichiers · ${String(t.signes).padStart(6)} signes · ~${String(t.jetonsSortieDeduits)} jetons sortie · identique au précédent ${t.partIdentique === null ? '—' : String(Math.round(t.partIdentique * 100)) + ' %'} (${String(t.secondesDeReecritureDeduites ?? 0)} s) · fichiers changés ${t.fichiersChanges === null ? '—' : String(t.fichiersChanges.length)} · motif ${t.motif.join(' | ') || '—'}`)
}
