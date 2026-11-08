import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// LOT 8 — LE SUIVI D'UNE DEMANDE.
//
// ── UNE SEULE REPONSE POUR DEUX ECHECS.
//
// Reference inconnue ou courriel qui ne correspond pas : le MEME message.
// Distinguer les deux revelerait qu'une reference EXISTE a quelqu'un qui
// n'en est pas l'auteur -- c'est la regle de `fetchPage`, ou distinguer
// « cette page n'existe pas » de « elle existe mais n'est pas publiee »
// revelerait un brouillon par son code de retour.
//
// ── LE TEMPS DE REPONSE NE DOIT PAS REDIRE CE QUE LE MESSAGE CACHE.
//
// Si « reference inconnue » repond en 5 ms et « mauvais courriel » en 40 ms,
// l'attaquant lit la difference. Les deux chemins font donc la MEME lecture,
// et la comparaison du courriel se fait APRES, en memoire.
//
// ── SIX CARACTERES NE PROTEGENT QUE SI L'ON NE PEUT PAS TOUT ESSAYER.
//
// 31^6 = 1,07 milliard de possibilites. A mille tentatives par seconde, cela
// tombe en douze jours. La limite de tentatives est donc la VRAIE protection,
// pas la longueur de la reference.
//
// ── ANON NE LIT PAS `messages` (mesure : 42501). Cette route emploie le
// role de service APRES avoir verifie la reference ET le courriel.
// ============================================================

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

/** Trente tentatives par heure et par adresse : un humain en fait trois. */
const PLAFOND = 30
const FENETRE_MS = 3600_000
const tentatives = new Map<string, { n: number; debut: number }>()

function tropDeTentatives(ip: string): boolean {
  const t = tentatives.get(ip)
  const now = Date.now()
  if (!t || now - t.debut > FENETRE_MS) {
    tentatives.set(ip, { n: 1, debut: now })
    return false
  }
  t.n += 1
  return t.n > PLAFOND
}

/** Le message UNIQUE des deux echecs. Il ne dit jamais lequel s'est produit. */
const RIEN = { trouve: false as const, message: 'Aucune demande ne correspond à ces informations.' }

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnue'
  if (tropDeTentatives(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une heure.' },
      { status: 429 },
    )
  }

  let corps: { reference?: unknown; email?: unknown }
  try { corps = await req.json() } catch { return NextResponse.json(RIEN, { status: 200 }) }

  const reference = typeof corps.reference === 'string' ? corps.reference.trim().toUpperCase() : ''
  // Insensible a la casse ET aux espaces : « Alice@Test.TD » et
  // « alice@test.td » sont la meme personne, et lui refuser sa propre
  // demande pour une majuscule serait absurde.
  const email = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : ''

  if (!reference || !email) return NextResponse.json(RIEN, { status: 200 })

  const { data } = await admin
    .from('messages')
    .select('reference,email,etat,created_at,maj_le')
    .eq('reference', reference)
    .maybeSingle()

  // LA COMPARAISON SE FAIT EN MEMOIRE, APRES la meme lecture dans les deux
  // cas : la base ne voit jamais le courriel, donc son temps de reponse ne
  // depend pas de lui.
  const correspond = !!data && String(data.email ?? '').trim().toLowerCase() === email
  if (!correspond) return NextResponse.json(RIEN, { status: 200 })

  // ON NE REND PAS LE MESSAGE LUI-MEME. L'auteur l'a ecrit, il le connait ;
  // le renvoyer ferait d'une reference devinee une fuite de contenu.
  return NextResponse.json({
    trouve: true,
    reference: data.reference,
    etat: data.etat,
    deposee_le: data.created_at,
    maj_le: data.maj_le,
  })
}
