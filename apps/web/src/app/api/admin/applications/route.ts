/**
 * LE COUT DE CHAQUE APPLICATION GENEREE.
 *
 * Ce que le plafond ne faisait pas. Il REFUSAIT a 6 $ ; ici on MESURE, et
 * l'administration voit. Les refus figurent au meme titre que les
 * reussites — trois tirages P0 refuses ont coute 0,8209 $ sans rien
 * produire, et c'est la depense qu'il faut voir en premier.
 *
 * LA TABLE PEUT NE PAS EXISTER ENCORE. Elle se pose en une fois, par le SQL
 * exporte avec le journal. Tant qu'elle manque, cette route rend une liste
 * vide ET LE DIT (`tableAbsente`) : une page qui affiche zero sans expliquer
 * pourquoi ferait croire que personne n'a rien genere.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { TABLE_TENTATIVES } from '@/lib/apps/tentatives'
// LA LISTE DES ADMINISTRATEURS VIENT D'UN SEUL ENDROIT. J'avais recopie une
// adresse en dur ici — exactement le defaut que `admin-emails.ts` a ferme le
// 2026-10-02, apres l'avoir trouve dans SIX routes. Le cliquet m'a attrape
// avant la mise en ligne, et c'est pour ca qu'il existe.
import { ADMIN_EMAILS } from '@/lib/admin-emails'

export const runtime = 'nodejs'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token === undefined || token === '') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAnon.auth.getUser(token)
  if (error !== null || data.user?.email === undefined || !ADMIN_EMAILS.includes(data.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const r = await supabaseAdmin
    .from(TABLE_GENERATIONS)
    .select('id, created_at, owner_email, demande, nom, ok, cout_usd, duree_ms, jetons_entree, jetons_sortie, diagnostics, tirages, sections_acquises')
    .order('created_at', { ascending: false })
    .limit(500)

  if (r.error !== null) {
    return NextResponse.json({
      tableAbsente: true,
      detail: r.error.message,
      lignes: [],
      total: { generations: 0, reussies: 0, coutUsd: 0, coutPerdu: 0 },
    })
  }

  // ── LE JOURNAL DU REFUS DEVIENT LISIBLE (defaut 2026-10-15).
  //
  // Le moteur garde desormais `path : message` pour chaque diagnostic
  // (EP-222) — mais cette route ne selectionnait pas la colonne qui les
  // porte. Une mesure que personne ne lit ne vaut rien : c'est elle qui
  // evite de RE-PAYER un tir pour savoir ou il a echoue.
  //
  // DEGRAISSE : on ne renvoie pas la colonne entiere (elle porte l'acquis
  // et les usages jeton par jeton), seulement le journal des tirages.
  const lignes = r.data.map((x) => {
    const sa = (x.sections_acquises ?? {}) as { tirages?: readonly Record<string, unknown>[] }
    const reste = { ...x }
    delete (reste as Record<string, unknown>).sections_acquises
    return { ...reste, journal: Array.isArray(sa.tirages) ? sa.tirages : [] }
  })
  // ── LES TENTATIVES DE CHAQUE ŒUVRE (manque 4, 2026-11-15).
  //
  // La ligne ne porte que la mesure de la tentative qui a produit l'œuvre
  // courante ; les échecs et les régénérations précédentes vivent dans
  // `app_generation_attempts`. Une lecture refusée (table pas encore posée)
  // ne casse pas la page : elle le DIT (`tentativesLisibles: false`).
  const ids = lignes.map((x) => x.id as string)
  const t = ids.length === 0
    ? { data: [] as Record<string, unknown>[], error: null }
    : await supabaseAdmin
        .from(TABLE_TENTATIVES)
        .select('generation_id, rang, nature, issue, debut_le, fin_le, version_rang, cout_usd, duree_ms, tirages, diagnostics, trace_tronquee')
        .in('generation_id', ids)
        .order('rang', { ascending: true })
  const parOeuvre = new Map<string, Record<string, unknown>[]>()
  for (const x of (t.error === null ? t.data ?? [] : []) as Record<string, unknown>[]) {
    const cle = String(x.generation_id)
    parOeuvre.set(cle, [...(parOeuvre.get(cle) ?? []), x])
  }
  const lignesAvecTentatives = lignes.map((x) => ({ ...x, tentatives: parOeuvre.get(x.id as string) ?? [] }))

  const somme = (f: (x: (typeof lignes)[number]) => number): number =>
    lignes.reduce((a, x) => a + f(x), 0)

  return NextResponse.json({
    tableAbsente: false,
    tentativesLisibles: t.error === null,
    lignes: lignesAvecTentatives,
    total: {
      generations: lignes.length,
      reussies: lignes.filter((x) => x.ok === true).length,
      coutUsd: Number(somme((x) => Number(x.cout_usd)).toFixed(4)),
      // CE QUI A ETE PAYE SANS RIEN RENDRE. Le chiffre le plus utile de la
      // page : c'est lui qui dit si le moteur passe ou s'il tourne a vide.
      coutPerdu: Number(
        somme((x) => (x.ok === true ? 0 : Number(x.cout_usd))).toFixed(4),
      ),
    },
  })
}
