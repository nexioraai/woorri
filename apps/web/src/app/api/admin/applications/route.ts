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
    .select('id, created_at, owner_email, demande, nom, ok, cout_usd, duree_ms, jetons_entree, jetons_sortie, diagnostics, tirages')
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

  const lignes = r.data
  const somme = (f: (x: (typeof lignes)[number]) => number): number =>
    lignes.reduce((a, x) => a + f(x), 0)

  return NextResponse.json({
    tableAbsente: false,
    lignes,
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
