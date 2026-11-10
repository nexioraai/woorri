import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveSiteBaseUrl } from '../themes/shared'
import HtmlLang from '../themes/HtmlLang'
import { siteDe } from '../acces/PageAcces'
import { ouvreDesComptes } from '../acces/ouvreDesComptes'
import NouveauMotDePasse, { type MotsNouveau } from '../acces/NouveauMotDePasse'

// LOT 19 — la page où mène le lien de « Mot de passe oublié ». Écran d'accès :
// jamais indexé, et absent pour un site qui n'ouvre pas de comptes.

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ jeton?: string }> }

const MOTS: Record<string, MotsNouveau> = {
  fr: { titre: 'Nouveau mot de passe', phrase: 'Choisissez votre nouveau mot de passe.', motDePasse: 'Nouveau mot de passe', confirmer: 'Confirmez le mot de passe', envoyer: 'Enregistrer', envoi: 'Enregistrement…', minimum: 'Huit caractères au minimum.', differents: 'Les deux mots de passe ne sont pas identiques.', lienInvalide: 'Ce lien n’est plus valable. Demandez-en un nouveau depuis « Mot de passe oublié ».', fait: 'Mot de passe enregistré.', afficher: 'Afficher le mot de passe', masquer: 'Masquer le mot de passe' },
  en: { titre: 'New password', phrase: 'Choose your new password.', motDePasse: 'New password', confirmer: 'Confirm the password', envoyer: 'Save', envoi: 'Saving…', minimum: 'Eight characters minimum.', differents: 'The two passwords do not match.', lienInvalide: 'This link is no longer valid. Request a new one from “Forgotten password”.', fait: 'Password saved.', afficher: 'Show password', masquer: 'Hide password' },
  ar: { titre: 'كلمة مرور جديدة', phrase: 'اختر كلمة مرورك الجديدة.', motDePasse: 'كلمة المرور الجديدة', confirmer: 'تأكيد كلمة المرور', envoyer: 'حفظ', envoi: 'جارٍ الحفظ…', minimum: 'ثمانية أحرف على الأقل.', differents: 'كلمتا المرور غير متطابقتين.', lienInvalide: 'هذا الرابط لم يعد صالحاً. اطلب رابطاً جديداً من «نسيت كلمة المرور».', fait: 'تم حفظ كلمة المرور.', afficher: 'إظهار كلمة المرور', masquer: 'إخفاء كلمة المرور' },
  es: { titre: 'Nueva contraseña', phrase: 'Elija su nueva contraseña.', motDePasse: 'Nueva contraseña', confirmer: 'Confirme la contraseña', envoyer: 'Guardar', envoi: 'Guardando…', minimum: 'Ocho caracteres como mínimo.', differents: 'Las dos contraseñas no coinciden.', lienInvalide: 'Este enlace ya no es válido. Solicite uno nuevo desde «Contraseña olvidada».', fait: 'Contraseña guardada.', afficher: 'Mostrar la contraseña', masquer: 'Ocultar la contraseña' },
}
const motsDe = (lang: string | null) => MOTS[(lang ?? 'fr').slice(0, 2)] ?? MOTS.fr

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s) return {}
  return { title: `${motsDe(s.lang).titre} — ${s.name}`, robots: { index: false, follow: false } }
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params
  const s = await siteDe(slug)
  if (!s || !(await ouvreDesComptes(s.id))) notFound()
  const { jeton = '' } = await searchParams
  const base = resolveSiteBaseUrl(s, (await headers()).get('host'))
  const accent = s.primary_color || '#1e4d8c'
  const m = motsDe(s.lang)
  return (
    <div lang={s.lang ?? 'fr'}>
      <HtmlLang lang={s.lang ?? 'fr'} />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 80px' }}>
        <p style={{ fontSize: 14, margin: '0 0 18px' }}><Link href={base} style={{ color: accent }}>← {s.name}</Link></p>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 10px' }}>{m.titre}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.78, margin: '0 0 28px' }}>{m.phrase}</p>
        <NouveauMotDePasse jeton={jeton} destination={`${base}/espace-client`} mots={m} primary={accent} />
      </main>
    </div>
  )
}
