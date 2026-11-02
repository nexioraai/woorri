/**
 * SONDE JETABLE — QUELLE CONNEXION RÉPOND DEPUIS VERCEL.
 *
 * ── POURQUOI ELLE NE PEUT PAS ÊTRE MESURÉE AILLEURS.
 *
 * MESURÉ le 2026-11-02 : `db.<ref>.supabase.co` n'a AUCUNE adresse IPv4 —
 * il est joignable en IPv6 seulement. Les pooleurs, eux, ont de l'IPv4.
 *
 * Depuis ma machine les trois répondent, parce qu'elle a une sortie IPv6.
 * Mais la publication s'exécutera DEPUIS VERCEL, et je ne peux pas mesurer
 * sa sortie réseau d'ici. Une mesure prise au mauvais endroit ne dit rien de
 * l'endroit qui compte — c'est la même erreur que juger la production sur
 * une gate verte.
 *
 * ── ELLE N'A BESOIN D'AUCUN IDENTIFIANT, ET C'EST TOUT SON INTÉRÊT.
 *
 * Un `connect` TCP réussi prouve que le réseau porte jusqu'au port. Le mot
 * de passe de la base ne change rien à cette question-là : on peut donc
 * trancher l'IPv6 AVANT de réinitialiser quoi que ce soit.
 *
 * ── LE TÉMOIN EST DANS LA MESURE, PAS À CÔTÉ.
 *
 * Exigence du propriétaire, et elle vient d'une erreur de la même journée :
 * ma boucle `nc` annonçait « cinq ports injoignables » alors qu'elle passait
 * des arguments vides. Le témoin `github.com:443` l'a démasquée.
 *
 * « Une boucle qui dit cinq ports injoignables sans témoin ne distingue pas
 * un réseau fermé d'un script cassé. » C'est le même principe que la
 * mutation qui doit rester verte : on vérifie que l'instrument sait dire oui
 * avant de croire qu'il dit non.
 *
 * ── JETABLE, ET ÇA SE VOIT.
 *
 * Elle est authentifiée (elle ne révèle rien à un inconnu), elle n'écrit
 * rien, elle ne lit aucun secret, et elle est faite pour être SUPPRIMÉE dès
 * que la mesure est prise. Une sonde qu'on oublie devient une surface.
 */
import { NextResponse } from 'next/server'
import { connect } from 'node:net'
import { lookup } from 'node:dns/promises'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Les candidats. Le premier est le TÉMOIN : il DOIT répondre. */
const CIBLES: readonly { readonly nom: string; readonly hote: string; readonly port: number; readonly temoin?: true }[] = [
  { nom: 'TÉMOIN github.com:443', hote: 'github.com', port: 443, temoin: true },
  { nom: 'direct (IPv6 seul)', hote: 'db.psxbilpmnojtlzosokzz.supabase.co', port: 5432 },
  { nom: 'pooleur session', hote: 'aws-0-us-east-1.pooler.supabase.com', port: 5432 },
  { nom: 'pooleur transaction', hote: 'aws-0-us-east-1.pooler.supabase.com', port: 6543 },
  { nom: 'pooleur session (aws-1)', hote: 'aws-1-us-east-1.pooler.supabase.com', port: 5432 },
  { nom: 'pooleur transaction (aws-1)', hote: 'aws-1-us-east-1.pooler.supabase.com', port: 6543 },
]

const DELAI_MS = 6000

async function sonder(hote: string, port: number): Promise<string> {
  // LA FAMILLE D'ADRESSE EST DITE, parce que c'est elle qui décide : un hôte
  // qui ne résout qu'en AAAA est injoignable sans sortie IPv6.
  let familles = ''
  try {
    const a = await lookup(hote, { all: true })
    familles = [...new Set(a.map((x) => `IPv${String(x.family)}`))].sort().join('+')
  } catch (e) {
    return `DNS échoue : ${e instanceof Error ? e.message : String(e)}`
  }
  return new Promise<string>((resoudre) => {
    const t0 = Date.now()
    const s = connect({ host: hote, port })
    const fin = (quoi: string): void => {
      s.destroy()
      resoudre(`${quoi} · ${familles} · ${String(Date.now() - t0)} ms`)
    }
    s.setTimeout(DELAI_MS)
    s.on('connect', () => { fin('OUVERT') })
    s.on('timeout', () => { fin('DÉLAI DÉPASSÉ') })
    s.on('error', (e: NodeJS.ErrnoException) => { fin(`REFUSÉ ${e.code ?? e.message}`) })
  })
}

export async function GET(req: Request) {
  // ── DEUX VOIES, ET C'EST LE MOTIF QUE LE DÉPÔT EMPLOIE DÉJÀ.
  //
  // Le propriétaire par sa session ; l'opérateur par `CRON_SECRET` — le même
  // couple que `api/domains/provision`, mot pour mot. Je n'invente pas une
  // troisième garde : trois façons de s'authentifier, c'est deux de trop à
  // tenir d'accord.
  //
  // POURQUOI LA VOIE OPÉRATEUR ICI : cette sonde doit être lue depuis une
  // ligne de commande, et l'alternative était de faire passer les
  // identifiants du propriétaire par une conversation. Un secret de
  // serveur à serveur vaut mieux qu'un mot de passe de personne.
  //
  // `CRON_SECRET` n'est pas une identité : aucune primitive de propriété ne
  // s'y applique, et cette sonde n'en a pas besoin — elle ne lit aucune
  // donnée, elle ouvre des sockets.
  const jeton = req.headers.get('authorization')?.replace('Bearer ', '')
  const operateur =
    process.env.CRON_SECRET !== undefined &&
    process.env.CRON_SECRET !== '' &&
    jeton === process.env.CRON_SECRET
  if (!operateur) {
    const garde = await requireAuthenticatedUser(req)
    if (!garde.ok) return garde.response
  }

  const resultats: Record<string, string> = {}
  for (const c of CIBLES) resultats[c.nom] = await sonder(c.hote, c.port)

  // ── LE VERDICT NE SE PRONONCE PAS SI LE TÉMOIN EST MUET.
  //
  // Sans cette ligne, un réseau entièrement fermé rendrait « aucune
  // connexion ne répond », et on en conclurait que Supabase est injoignable
  // — alors que c'est la sonde qui ne sort pas.
  const temoin = resultats[CIBLES[0].nom]
  const temoinOk = temoin.startsWith('OUVERT')
  const ouverts = CIBLES.filter((c) => c.temoin !== true && resultats[c.nom].startsWith('OUVERT'))

  return NextResponse.json(
    {
      resultats,
      verdict: !temoinOk
        ? 'AUCUN VERDICT : le témoin ne répond pas, donc la sonde elle-même ne sort pas. ' +
          'Rien ne peut être conclu des autres lignes.'
        : ouverts.length === 0
          ? 'Le témoin répond et AUCUNE connexion Supabase ne répond : le réseau sortant de ' +
            'Vercel ne porte pas jusqu’à ces ports.'
          : `Le témoin répond. Connexions utilisables : ${ouverts.map((c) => c.nom).join(', ')}.`,
      // L'information qui décide, dite en clair plutôt que déduite d'un tableau.
      ipv6:
        resultats[CIBLES[1].nom].startsWith('OUVERT')
          ? 'Vercel atteint un hôte IPv6 SEUL : la connexion directe est utilisable.'
          : 'Vercel n’atteint PAS l’hôte IPv6 seul : la connexion directe est hors jeu, ' +
            'seuls les pooleurs restent.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
