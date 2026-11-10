import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ouvreDesComptes } from '@/app/sites/[slug]/acces/ouvreDesComptes'
import { fetchSite, resolveSiteBaseUrl } from '@/app/sites/[slug]/themes/shared'

// ============================================================================
// LOT 19 — « MOT DE PASSE OUBLIÉ » QUI ARRIVE VRAIMENT.
//
// MESURÉ le 2026-11-10 : le courriel de l'authentification ne parvenait pas
// aux adresses des visiteurs (service d'envoi par défaut, réservé aux membres
// du projet). Quelqu'un qui oubliait son mot de passe était bloqué pour
// toujours. Le lien est désormais FABRIQUÉ ici et ENVOYÉ par Resend — le
// même service et le même domaine vérifié que les alertes de la plateforme.
//
// ── LA RÉPONSE EST LA MÊME, TOUJOURS. Adresse connue ou non, site qui ouvre
// des comptes ou non, envoi réussi ou non : `{ ok: true }`. Distinguer ferait
// de cette route un testeur d'adresses (règle des écrans d'accès, lot 11).
//
// ── PAS DE COURRIEL À UN INCONNU. On n'écrit qu'à une adresse qui a DÉJÀ un
// accès : la route ne peut pas servir à envoyer des messages à n'importe qui
// depuis notre domaine.
//
// ── UN ENVOI PAR ADRESSE ET PAR DEUX MINUTES, lu sur `recovery_sent_at` de
// l'accès lui-même : recliquer ne remplit pas une boîte aux lettres.
//
// ── LE LIEN PORTE UN JETON HACHÉ, vérifié par la page (`verifyOtp`) — le
// format que la plateforme emploie déjà sur `/reset-password`, insensible aux
// robots qui « ouvrent » les liens des courriels pour les analyser.
// ============================================================================

type Params = { params: Promise<{ slug: string }> }
const OK = () => NextResponse.json({ ok: true })
export const INTERVALLE_MS = 2 * 60 * 1000

const MOTS: Record<string, { objet: string; bonjour: string; corps: string; bouton: string; ignorer: string }> = {
  fr: { objet: 'Choisir un nouveau mot de passe', bonjour: 'Bonjour,', corps: 'Vous avez demandé à choisir un nouveau mot de passe pour votre compte sur le site de', bouton: 'Choisir mon nouveau mot de passe', ignorer: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe ne change pas.' },
  en: { objet: 'Choose a new password', bonjour: 'Hello,', corps: 'You asked to choose a new password for your account on the website of', bouton: 'Choose my new password', ignorer: 'If you did not make this request, ignore this message: your password does not change.' },
  ar: { objet: 'اختيار كلمة مرور جديدة', bonjour: 'مرحباً،', corps: 'طلبتم اختيار كلمة مرور جديدة لحسابكم على موقع', bouton: 'اختيار كلمة المرور الجديدة', ignorer: 'إذا لم تقدّموا هذا الطلب فتجاهلوا هذه الرسالة: كلمة المرور لا تتغيّر.' },
  es: { objet: 'Elegir una nueva contraseña', bonjour: 'Hola:', corps: 'Ha solicitado elegir una nueva contraseña para su cuenta en el sitio de', bouton: 'Elegir mi nueva contraseña', ignorer: 'Si no ha hecho esta solicitud, ignore este mensaje: su contraseña no cambia.' },
}

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params
  let corps: Record<string, unknown>
  try { corps = await req.json() } catch { return OK() }
  const email = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return OK()

  const site = await fetchSite(slug)
  if (!site || !(await ouvreDesComptes((site as { id: string }).id))) return OK()

  const { data: id } = await supabaseAdmin.rpc('identifiant_par_courriel', { courriel: email })
  if (typeof id !== 'string' || !id) return OK()

  const { data: u } = await supabaseAdmin.auth.admin.getUserById(id)
  const dernier = u?.user?.recovery_sent_at ? Date.parse(u.user.recovery_sent_at) : 0
  if (Date.now() - dernier < INTERVALLE_MS) return OK()

  const { data: lien, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })
  const jeton = lien?.properties?.hashed_token
  if (error || !jeton) { console.error('[mot-de-passe-oublie] lien refusé', error?.message); return OK() }

  const base = resolveSiteBaseUrl(site, req.headers.get('host'))
  const adresse = `${base}/nouveau-mot-de-passe?jeton=${encodeURIComponent(jeton)}`
  const lang = (site.lang ?? 'fr').slice(0, 2)
  const m = MOTS[lang] ?? MOTS.fr
  const nom = site.name
  const cle = process.env.RESEND_API_KEY ?? ''
  if (!cle) { console.error('[mot-de-passe-oublie] RESEND_API_KEY absente'); return OK() }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        // LE NOM DU SITE en expéditeur ; l'adresse est celle du domaine vérifié.
        from: `${nom.replace(/[<>"]/g, '')} <no-reply@deribfy.com>`,
        to: [email],
        subject: `${m.objet} — ${nom}`,
        text: `${m.bonjour}\n\n${m.corps} ${nom}.\n\n${adresse}\n\n${m.ignorer}`,
        html: `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${echapper(m.bonjour)}</p><p>${echapper(m.corps)} <strong>${echapper(nom)}</strong>.</p>
<p><a href="${echapper(adresse)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${echapper(site.primary_color || '#1F6B4A')};color:#fff;text-decoration:none;font-weight:600">${echapper(m.bouton)}</a></p>
<p style="color:#666;font-size:13px">${echapper(m.ignorer)}</p></div>`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) console.error('[mot-de-passe-oublie] resend', r.status, (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('[mot-de-passe-oublie] envoi', e instanceof Error ? e.message : e)
  }
  return OK()
}
