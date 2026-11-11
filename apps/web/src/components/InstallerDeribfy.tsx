'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/translations'

// ============================================================================
// INSTALLER DERIBFY SUR TOUT TÉLÉPHONE (2026-11-11).
//
// LE DÉFAUT, SIGNALÉ PAR LE PROPRIÉTAIRE : « Samsung est okay mais pas
// iPhone ». La cause n'était pas un défaut de Deribfy : Chrome et Samsung
// Internet PROPOSENT d'eux-mêmes l'installation en lisant le manifeste ;
// l'iPhone ne le propose JAMAIS, pour aucun site — l'installation y est un
// geste manuel (Partager → « Sur l'écran d'accueil ») que presque personne ne
// connaît, et que Deribfy ne montrait nulle part.
//
// CE QUE FAIT CE COMPOSANT, sur les pages de Deribfy seulement (jamais sur la
// boutique d'un marchand — voir le layout) :
//   · iPhone / iPad : un guide en deux gestes, avec le dessin du bouton
//     Partager. Dans une application (Facebook, Instagram, TikTok…), où
//     l'installation est impossible, il dit d'ouvrir le lien dans Safari.
//   · Android et autres : un bouton « Installer » qui ouvre la boîte native,
//     au lieu d'attendre que le navigateur la propose de lui-même.
//   · Rien sur ordinateur, rien si Deribfy est déjà installé, rien pendant
//     30 jours après « Plus tard ».
// Il enregistre aussi le service worker minimal (page hors connexion).
// ============================================================================

type Cas = 'ios' | 'ios-appli' | 'android'
type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const CLE_FERME = 'deribfy-installer-ferme'
const TRENTE_JOURS = 30 * 24 * 3600 * 1000

const TEXTES = {
  fr: {
    titre: 'Installez Deribfy sur votre téléphone',
    sousTitre: 'Une icône sur votre écran d’accueil, ouverture en plein écran.',
    etape1: 'Touchez le bouton Partager',
    etape1b: 'en bas de Safari (ou en haut sur iPad)',
    etape2: 'Choisissez « Sur l’écran d’accueil »',
    etape2b: 'puis « Ajouter »',
    appli: 'Pour installer Deribfy, ouvrez cette page dans Safari : touchez ⋯ ou ↗ puis « Ouvrir dans Safari ».',
    installer: 'Installer',
    plusTard: 'Plus tard',
  },
  en: {
    titre: 'Install Deribfy on your phone',
    sousTitre: 'An icon on your home screen, opens full screen.',
    etape1: 'Tap the Share button',
    etape1b: 'at the bottom of Safari (top on iPad)',
    etape2: 'Choose “Add to Home Screen”',
    etape2b: 'then “Add”',
    appli: 'To install Deribfy, open this page in Safari: tap ⋯ or ↗ then “Open in Safari”.',
    installer: 'Install',
    plusTard: 'Later',
  },
  es: {
    titre: 'Instala Deribfy en tu teléfono',
    sousTitre: 'Un icono en tu pantalla de inicio, se abre a pantalla completa.',
    etape1: 'Toca el botón Compartir',
    etape1b: 'abajo en Safari (arriba en iPad)',
    etape2: 'Elige «Añadir a pantalla de inicio»',
    etape2b: 'y luego «Añadir»',
    appli: 'Para instalar Deribfy, abre esta página en Safari: toca ⋯ o ↗ y luego «Abrir en Safari».',
    installer: 'Instalar',
    plusTard: 'Más tarde',
  },
  ar: {
    titre: 'ثبّت Deribfy على هاتفك',
    sousTitre: 'أيقونة على الشاشة الرئيسية، وتفتح بملء الشاشة.',
    etape1: 'اضغط على زر المشاركة',
    etape1b: 'أسفل Safari (أو أعلاه على iPad)',
    etape2: 'اختر «إضافة إلى الشاشة الرئيسية»',
    etape2b: 'ثم «إضافة»',
    appli: 'لتثبيت Deribfy افتح هذه الصفحة في Safari: اضغط ⋯ أو ↗ ثم «فتح في Safari».',
    installer: 'تثبيت',
    plusTard: 'لاحقًا',
  },
}

function dejaInstalle(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function estIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function ferme(): boolean {
  try {
    const t = Number(localStorage.getItem(CLE_FERME) || 0)
    return Date.now() - t < TRENTE_JOURS
  } catch { return false }
}

/** Le dessin du bouton Partager d'iOS : un carré ouvert et une flèche vers le haut. */
function PictoPartager() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  )
}

function PictoAjouter() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" />
    </svg>
  )
}

export default function InstallerDeribfy() {
  const [cas, setCas] = useState<Cas | null>(null)
  // LA LANGUE DE L'INTERFACE, pas celle de la balise <html> : mesuré le
  // 2026-11-11, un Android réglé en anglais affichait la page en anglais et
  // ce guide en français.
  const { lang } = useTranslation()
  const langue = lang === 'en' || lang === 'ar' || lang === 'es' ? lang : 'fr'
  const evenement = useRef<EvenementInstallation | null>(null)

  useEffect(() => {
    // Le service worker minimal : page « hors connexion » pour l'app installée.
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw-deribfy.js').catch(() => {})

    if (dejaInstalle() || ferme()) return

    let minuterie: ReturnType<typeof setTimeout> | undefined
    // Laisser la page se poser avant de proposer quoi que ce soit — et NE PAS
    // se poser sur le bandeau des cookies : mesuré le 2026-11-11, à la première
    // visite il recouvrait le guide et en bloquait les boutons. On attend que
    // le visiteur y ait répondu.
    const montrer = (c: Cas, delai = 3500) => {
      minuterie = setTimeout(() => {
        if (document.querySelector('[data-cookie-consent-panel]')) { montrer(c, 1500); return }
        setCas(c)
      }, delai)
    }

    if (estIos()) {
      // Dans Facebook, Instagram, TikTok, Snapchat, Line… l'installation est impossible.
      montrer(/FBAN|FBAV|Instagram|TikTok|musical_ly|Snapchat|Line\//.test(navigator.userAgent) ? 'ios-appli' : 'ios')
      return () => clearTimeout(minuterie)
    }

    const surProposition = (e: Event) => {
      e.preventDefault()
      evenement.current = e as EvenementInstallation
      // Seulement sur un écran tactile : sur ordinateur, le navigateur a déjà son icône.
      if (window.matchMedia?.('(pointer: coarse)').matches) montrer('android')
    }
    const surInstalle = () => setCas(null)
    window.addEventListener('beforeinstallprompt', surProposition)
    window.addEventListener('appinstalled', surInstalle)
    return () => {
      clearTimeout(minuterie)
      window.removeEventListener('beforeinstallprompt', surProposition)
      window.removeEventListener('appinstalled', surInstalle)
    }
  }, [])

  if (!cas) return null
  const t = TEXTES[langue]

  const fermer = () => {
    try { localStorage.setItem(CLE_FERME, String(Date.now())) } catch { /* navigation privée */ }
    setCas(null)
  }
  const installer = async () => {
    const e = evenement.current
    if (!e) return
    await e.prompt()
    await e.userChoice.catch(() => null)
    evenement.current = null
    setCas(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="installer-deribfy-titre"
      dir={langue === 'ar' ? 'rtl' : 'ltr'}
      data-installer-deribfy=""
      className="fixed inset-x-3 z-[70] mx-auto max-w-md rounded-2xl border border-white/10 bg-bg-deep/95 p-5 text-white shadow-2xl backdrop-blur-md"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- icône statique de public/ */}
        <img src="/apple-icon.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p id="installer-deribfy-titre" className="text-[15px] font-semibold leading-snug">{t.titre}</p>
          <p className="mt-1 text-sm text-white/65">{t.sousTitre}</p>
        </div>
      </div>

      {cas === 'ios' && (
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent"><PictoPartager /></span>
            <span><strong className="font-semibold">1. {t.etape1}</strong> <span className="text-white/60">{t.etape1b}</span></span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent"><PictoAjouter /></span>
            <span><strong className="font-semibold">2. {t.etape2}</strong> <span className="text-white/60">{t.etape2b}</span></span>
          </li>
        </ol>
      )}
      {cas === 'ios-appli' && <p className="mt-4 text-sm text-white/80">{t.appli}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={fermer}
          className="rounded-full px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          {t.plusTard}
        </button>
        {cas === 'android' && (
          <button type="button" onClick={installer}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {t.installer}
          </button>
        )}
      </div>
    </div>
  )
}
