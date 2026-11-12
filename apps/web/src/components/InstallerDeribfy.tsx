'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/translations'

// ============================================================================
// INSTALLER DERIBFY EN UN CLIC (2026-11-11).
//
// UN BOUTON, UN CLIC, C'EST INSTALLÉ — et rien d'autre. Exigence du
// propriétaire : « un bouton qui propose de télécharger automatiquement, on
// clique et ça se fait » ; un guide en étapes a été REFUSÉ (« il faut enlever
// ça »).
//
// D'OÙ CE QUE CE COMPOSANT NE FAIT PAS : sur iPhone, il n'affiche RIEN. Apple
// n'expose aucun moyen à une page web de déclencher l'installation : un
// bouton « Installer » y serait un bouton qui ne fait rien. L'installation en
// un clic sur iPhone passe par l'App Store (niveau 3 du plan).
//
// Il apparaît là où le navigateur le permet (Android : Chrome, Samsung
// Internet, Edge…), sur les pages de Deribfy seulement — jamais sur la
// boutique d'un marchand. Rien sur ordinateur, rien si déjà installé, rien
// pendant 30 jours après « Plus tard ». Il enregistre aussi le service worker
// minimal (page hors connexion de l'app installée).
// ============================================================================

type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const CLE_FERME = 'deribfy-installer-ferme'
const TRENTE_JOURS = 30 * 24 * 3600 * 1000

const TEXTES = {
  fr: { titre: 'Installer l’application Deribfy', installer: 'Installer', plusTard: 'Plus tard' },
  en: { titre: 'Install the Deribfy app', installer: 'Install', plusTard: 'Later' },
  es: { titre: 'Instalar la app Deribfy', installer: 'Instalar', plusTard: 'Más tarde' },
  ar: { titre: 'ثبّت تطبيق Deribfy', installer: 'تثبيت', plusTard: 'لاحقًا' },
}

function ferme(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(CLE_FERME) || 0) < TRENTE_JOURS
  } catch { return false }
}

export default function InstallerDeribfy() {
  const [visible, setVisible] = useState(false)
  // La langue de l'interface (mesuré : un Android en anglais avait la page en
  // anglais et ce bouton en français quand il lisait la balise <html>).
  const { lang } = useTranslation()
  const langue = lang === 'en' || lang === 'ar' || lang === 'es' ? lang : 'fr'
  const evenement = useRef<EvenementInstallation | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw-deribfy.js').catch(() => {})

    let minuterie: ReturnType<typeof setTimeout> | undefined
    // Ne pas se poser sur le bandeau des cookies (mesuré : il recouvrait le
    // bouton et en bloquait le clic) — attendre que le visiteur y ait répondu.
    const montrer = (delai = 2500) => {
      minuterie = setTimeout(() => {
        if (document.querySelector('[data-cookie-consent-panel]')) { montrer(1500); return }
        setVisible(true)
      }, delai)
    }
    const surProposition = (e: Event) => {
      e.preventDefault()
      evenement.current = e as EvenementInstallation
      // Téléphone ou tablette seulement : sur ordinateur, le navigateur a son icône.
      if (!ferme() && window.matchMedia?.('(pointer: coarse)').matches) montrer()
    }
    const surInstalle = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', surProposition)
    window.addEventListener('appinstalled', surInstalle)
    return () => {
      clearTimeout(minuterie)
      window.removeEventListener('beforeinstallprompt', surProposition)
      window.removeEventListener('appinstalled', surInstalle)
    }
  }, [])

  if (!visible) return null
  const t = TEXTES[langue]

  const fermer = () => {
    try { localStorage.setItem(CLE_FERME, String(Date.now())) } catch { /* navigation privée */ }
    setVisible(false)
  }
  const installer = async () => {
    const e = evenement.current
    if (!e) return
    await e.prompt()
    await e.userChoice.catch(() => null)
    evenement.current = null
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.titre}
      dir={langue === 'ar' ? 'rtl' : 'ltr'}
      data-installer-deribfy=""
      className="fixed inset-x-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-bg-deep/95 p-3 text-white shadow-2xl backdrop-blur-md"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- icône statique de public/ */}
      <img src="/apple-icon.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{t.titre}</p>
      <button type="button" onClick={fermer}
        className="shrink-0 rounded-full px-3 py-2 text-sm text-white/65 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        {t.plusTard}
      </button>
      <button type="button" onClick={installer}
        className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        {t.installer}
      </button>
    </div>
  )
}
