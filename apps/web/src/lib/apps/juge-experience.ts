/**
 * LE JUGE D'EXPÉRIENCE — il fait ce qu'un humain fait (3c-2, correction 4).
 *
 * LE LANCEUR CHROMIUM (`jugerExperience`) EST NON BRANCHÉ DANS LA BOUCLE : la
 * fonction de génération n'a pas de navigateur. Le SCRIPT, lui, y tourne, par
 * le juge d'exécution (mode écran dans la boucle d'un écran, mode application
 * après l'assemblage). Chromium sert la preuve, la CI et les tirs.
 *
 * ── LE DÉFAUT, VU PAR LE PROPRIÉTAIRE DANS 94cf0489.
 *
 * Les juges disaient « 17 écrans, 0 erreur, 0 contrôle muet » ; le
 * propriétaire a cliqué : Accueil mène à une page vide, « arabe » ne change
 * rien, des boutons mènent à des écrans sans sens. Les deux sont vrais : les
 * juges mesuraient que ça NE PLANTE PAS, pas que ça A DU SENS.
 *
 * ── CE QU'IL FAIT, SUR LA PAGE SERVIE.
 *
 *   ① chaque écran du plan s'ouvre (en prenant son rôle), et n'est ni vide
 *     ni « À compléter » ;
 *   ② chaque contrôle visible de l'écran est cliqué (champs remplis avant) :
 *     il doit mener à un écran NOMMÉ du plan, ou faire apparaître un
 *     changement visible ; un contrôle qui mène à « À compléter », à une page
 *     vide, hors du plan, ou qui ne change rien est REFUSÉ, nommé ;
 *   ③ chaque langue lue est choisie : `lang` et `dir` de la racine du
 *     document doivent changer, et le texte du squelette suivre ;
 *   ④ le parcours principal est traversé jusqu'au bout, à la main : à chaque
 *     écran on cherche le contrôle qui mène au suivant.
 *
 * ── UN SCRIPT, DEUX MOTEURS. `SCRIPT_EXPERIENCE` ne touche que le DOM et
 * l'adresse : il tourne dans Chromium (page servie, cadre isolé — la preuve
 * et le cliquet) et, en mode `ecran`, dans le simulateur du juge
 * d'exécution (dans la boucle d'un écran, où Chromium n'existe pas).
 */
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type LangueLue = { readonly code: string; readonly dir: 'ltr' | 'rtl'; readonly libelles: readonly string[] }
export type EcranJuge = { readonly nom: string; readonly slug: string; readonly role: string }
export type ArgsExperience = {
  readonly ecrans: readonly EcranJuge[]
  readonly langues: readonly LangueLue[]
  readonly parcours: readonly string[]
  /** `application` : tout ; `ecran` : un seul écran, les autres sont des « à compléter » attendus. */
  readonly mode: 'application' | 'ecran'
  readonly slug?: string
  readonly attenteMs?: number
  /** Borne de COÛT, pas de vérité : au-delà, le verdict dit « partiel ». */
  readonly controlesMax?: number
  /** La largeur du cadre, en px (390 : un téléphone) ; absente : 1 200. */
  readonly largeur?: number
}
export type RefusExperience = { readonly ecran: string; readonly controle: string; readonly quoi: string }
export type VerdictExperience = {
  readonly aTourne: boolean
  readonly motif: string | null
  readonly refus: readonly RefusExperience[]
  readonly ecransOuverts: number
  readonly controlesEssayes: number
  readonly partiel: boolean
  readonly langues: readonly { readonly code: string; readonly ok: boolean; readonly lang: string; readonly dir: string; readonly detail: string }[]
  readonly parcours: { readonly ok: boolean; readonly atteint: readonly string[]; readonly detail: string } | null
  readonly ms: number
}

/** LE SCRIPT, en JS pur, exécuté DANS le document de l'application. */
export const SCRIPT_EXPERIENCE = String.raw`async (o) => {
  const debut = Date.now()
  const att = (ms) => new Promise((r) => setTimeout(r, ms))
  const A = o.attenteMs || 300
  const racine = document.getElementById('racine')
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
  const texte = (el) => String((el && (el.innerText !== undefined ? el.innerText : el.textContent)) || '').replace(/\s+/g, ' ').trim()
  const zone = () => racine.querySelector('main') || racine
  const slugs = new Set(o.ecrans.map((e) => e.slug))
  const parSlug = new Map(o.ecrans.map((e) => [e.slug, e]))
  const slugCourant = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  const refus = []
  const vus = new Set()
  const refuser = (ecran, controle, quoi) => { const k = ecran + '|' + controle + '|' + quoi; if (vus.has(k)) return; vus.add(k); refus.push({ ecran, controle, quoi }) }
  const etatDe = () => { const t = texte(zone()); return { t, vide: t.length < 15, acompleter: /a completer/.test(norm(t)), garde: racine.querySelector('[data-deribfy="garde"]') !== null || /qui etes-vous/.test(norm(t)) } }
  const aller = async (slug) => {
    if (slugCourant() === slug) { location.hash = '#__deribfy__'; await att(60) }
    location.hash = '#' + slug
    await att(A)
  }
  const entrerComme = async (role) => {
    const parData = [...racine.querySelectorAll('[data-role]')].find((x) => x.getAttribute('data-role') === role)
    const b = (parData && parData.querySelector('button, a')) || [...racine.querySelectorAll('button, a')].find((x) => norm(texte(x)).startsWith(norm('Entrer comme ' + role)))
    if (b) { b.click(); await att(A); return true }
    return false
  }
  const ouvrir = async (e) => {
    await aller(e.slug)
    if (etatDe().garde && e.role) await entrerComme(e.role)
    return etatDe()
  }
  const remplir = () => {
    for (const c of zone().querySelectorAll('input, textarea, select')) {
      try {
        const type = (c.getAttribute('type') || '').toLowerCase()
        if (c.tagName === 'SELECT') { const opt = [...c.options].find((x) => x.value !== ''); if (opt) c.value = opt.value }
        else if (type === 'checkbox' || type === 'radio') { if (!c.checked) c.click(); continue }
        else if (type === 'number') c.value = '2'
        else if (type === 'date') c.value = '2026-12-01'
        else if (type === 'email') c.value = 'essai@exemple.td'
        else if (type === 'tel') c.value = '+23566000000'
        else if (type === 'password') c.value = 'MotDePasse123!'
        else if (type === 'hidden' || type === 'file' || type === 'submit' || type === 'button') continue
        else c.value = 'Essai'
        c.dispatchEvent(new Event('input', { bubbles: true }))
        c.dispatchEvent(new Event('change', { bubbles: true }))
      } catch (e) {}
    }
  }
  // Un choix DÉJÀ sélectionné (aria-pressed/aria-current) ne change rien, et c'est juste : il n'est pas essayé.
  const controles = () => [...zone().querySelectorAll('button, a[href], [role="button"]')].filter((c) => !c.disabled && c.getAttribute('aria-pressed') !== 'true' && c.getAttribute('aria-current') === null && !c.closest('[data-role]') && !c.closest('nav[aria-label="Navigation"]') && !/^Entrer comme /.test(texte(c)))
  const nomDe = (c) => (texte(c) || c.getAttribute('aria-label') || c.getAttribute('title') || '<' + c.tagName.toLowerCase() + '>').slice(0, 60)
  const juger = (e, nom, avant, slugAvant) => {
    const apres = etatDe()
    const s = slugCourant()
    if (s !== slugAvant && s !== '__deribfy__') {
      if (!slugs.has(s) && s !== 'compte') { refuser(e.nom, nom, 'mène hors du plan (#' + s + ')'); return s }
      if (o.mode === 'application' && apres.acompleter) { refuser(e.nom, nom, 'mène à « À compléter » (' + ((parSlug.get(s) || {}).nom || s) + ')'); return s }
      if (o.mode === 'application' && apres.vide) { refuser(e.nom, nom, 'mène à une page vide (' + ((parSlug.get(s) || {}).nom || s) + ')'); return s }
      return s
    }
    if (apres.t === avant.t) { refuser(e.nom, nom, 'ne change rien à l’écran'); return null }
    if (apres.acompleter) refuser(e.nom, nom, 'affiche « À compléter »')
    else if (apres.vide) refuser(e.nom, nom, 'vide l’écran')
    return null
  }

  // ① ② LES ÉCRANS ET LEURS CONTRÔLES
  const cibles = o.mode === 'ecran' ? o.ecrans.filter((e) => e.slug === o.slug) : o.ecrans
  let ouverts = 0, essayes = 0, partiel = false
  const max = o.controlesMax || 400
  for (const e of cibles) {
    const etat = await ouvrir(e)
    ouverts += 1
    if (etat.garde) { refuser(e.nom, '(écran)', 'reste derrière « Qui êtes-vous ? » même avec le rôle « ' + e.role + ' »'); continue }
    if (etat.acompleter) { refuser(e.nom, '(écran)', 'est « À compléter »'); continue }
    if (etat.vide) { refuser(e.nom, '(écran)', 'est vide'); continue }
    const n = controles().length
    for (let i = 0; i < n; i += 1) {
      if (essayes >= max) { partiel = true; break }
      const etat2 = await ouvrir(e)
      if (etat2.garde || etat2.acompleter) break
      remplir()
      await att(40)
      const liste = controles()
      const c = liste[i]
      if (!c) break
      const nom = nomDe(c)
      const avant = etatDe()
      const slugAvant = slugCourant()
      try { c.click() } catch (err) { refuser(e.nom, nom, 'jette au clic : ' + String(err && err.message || err).slice(0, 80)); continue }
      essayes += 1
      await att(A)
      juger(e, nom, avant, slugAvant)
    }
  }

  // ③ LES LANGUES
  const langues = []
  if (o.mode === 'application' && o.langues.length > 1) {
    const doc = document.documentElement
    const trouver = (l) => {
      const parData = racine.querySelector('[data-langue="' + l.code + '"]')
      if (parData) return parData
      const noms = [l.code, ...l.libelles].map(norm)
      return [...racine.querySelectorAll('button, a, [role="button"], option')].find((x) => noms.includes(norm(texte(x))))
    }
    const premier = o.ecrans[0]
    for (const l of o.langues) {
      let c = null
      if (premier) await ouvrir(premier)
      c = trouver(l)
      for (const e of o.ecrans) { if (c) break; await ouvrir(e); c = trouver(l) }
      if (!c) { langues.push({ code: l.code, ok: false, lang: doc.lang, dir: doc.dir, detail: 'aucun contrôle pour choisir cette langue' }); refuser('(langues)', l.code, 'aucun contrôle pour la choisir'); continue }
      const avant = texte(racine)
      if (c.tagName === 'OPTION') { const s = c.closest('select'); s.value = c.value; s.dispatchEvent(new Event('change', { bubbles: true })) } else c.click()
      await att(A)
      const lang = String(doc.lang || ''), dir = String(doc.dir || 'ltr')
      const langOk = norm(lang).startsWith(norm(l.code))
      const dirOk = (dir || 'ltr') === l.dir
      const texteSuit = l.code === (o.langues[0] && o.langues[0].code) || texte(racine) !== avant
      const ok = langOk && dirOk && texteSuit
      const detail = [langOk ? '' : 'lang="' + lang + '"', dirOk ? '' : 'dir="' + dir + '" au lieu de ' + l.dir, texteSuit ? '' : 'aucun texte ne change'].filter(Boolean).join(', ')
      langues.push({ code: l.code, ok, lang, dir, detail })
      if (!ok) refuser('(langues)', nomDe(c), 'choisir « ' + l.code + ' » : ' + detail)
    }
    const l0 = o.langues[0]
    if (l0) { const c0 = trouver(l0); if (c0) { c0.click(); await att(A) } }
  }

  // ④ LE PARCOURS — suivi comme un NOUVEL usager : le rôle choisi pendant la traversée ne
  // le suit pas (V4 : l'accueil d'un rôle ne montre que SES écrans). Une œuvre sans ce
  // crochet est suivie comme avant.
  let parcours = null
  if (o.mode === 'application' && o.parcours.length > 1 && window.__deribfy && typeof window.__deribfy.visiteur === 'function') { window.__deribfy.visiteur(); await att(A) }
  if (o.mode === 'application' && o.parcours.length > 1) {
    const atteint = [o.parcours[0]]
    const e0 = parSlug.get(o.parcours[0])
    let detail = ''
    if (!e0) detail = 'premier écran hors plan'
    else {
      await ouvrir(e0)
      let i = 0
      while (i < o.parcours.length - 1) {
        const ici = parSlug.get(o.parcours[i])
        const suivants = new Set(o.parcours.slice(i + 1))
        let avance = -1
        const n = controles().length
        for (let j = 0; j < n && avance < 0; j += 1) {
          if (slugCourant() !== ici.slug) await ouvrir(ici)
          remplir(); await att(40)
          const c = controles()[j]
          if (!c) break
          try { c.click() } catch (err) {}
          await att(A)
          const s = slugCourant()
          if (suivants.has(s)) avance = o.parcours.indexOf(s, i + 1)
        }
        if (avance < 0) { detail = 'bloqué à « ' + ici.nom + ' » : aucun contrôle ne mène plus loin'; break }
        i = avance
        atteint.push(o.parcours[i])
        // Un humain arrivé sur un écran réservé choisit son rôle, puis continue.
        if (etatDe().garde) { const cible = parSlug.get(o.parcours[i]); if (cible && cible.role) await entrerComme(cible.role) }
        const st = etatDe()
        if (st.acompleter || st.vide || st.garde) { detail = '« ' + parSlug.get(o.parcours[i]).nom + ' » est ' + (st.acompleter ? '« À compléter »' : st.garde ? 'derrière la garde' : 'vide'); break }
      }
    }
    const fin = atteint[atteint.length - 1] === o.parcours[o.parcours.length - 1] && detail === ''
    parcours = { ok: fin, atteint, detail: fin ? '' : detail }
    if (!fin) refuser('(parcours)', o.parcours.map((s) => (parSlug.get(s) || {}).nom || s).join(' → '), detail || 'inachevé')
  }
  return { refus, ecransOuverts: ouverts, controlesEssayes: essayes, partiel, langues, parcours, ms: Date.now() - debut }
}`

/** Le reproche, lisible par le modèle ou par le propriétaire — null quand l'expérience tient. */
export function reprocheExperience(v: VerdictExperience): string | null {
  if (!v.aTourne || v.refus.length === 0) return null
  return (
    'L’APPLICATION N’A PAS DE SENS À L’USAGE — un humain qui clique trouve :\n' +
    v.refus.slice(0, 25).map((r) => `- ${r.ecran} · « ${r.controle} » ${r.quoi}`).join('\n') +
    '\nChaque contrôle mène à un écran nommé ou fait apparaître un résultat visible.'
  )
}

const PLAFOND_MS = 240_000

/**
 * L'ATTENTE APRÈS UN CLIC DANS LE SIMULATEUR : 40 ms. happy-dom rend React sans
 * peinture ni réseau ; 120 ms faisait passer la route de 1,8 à 3,5 s pour rien
 * (mesuré, cliquet de marge). Chromium garde 300 ms (une vraie peinture).
 */
export const ATTENTE_SIMULATEUR_MS = 40

/** Lance le juge dans Chromium, sur la PAGE SERVIE (cadre isolé, srcdoc). */
export async function jugerExperience(page: string, args: ArgsExperience): Promise<VerdictExperience> {
  const debut = Date.now()
  const vide = (motif: string): VerdictExperience => ({ aTourne: false, motif, refus: [], ecransOuverts: 0, controlesEssayes: 0, partiel: false, langues: [], parcours: null, ms: Date.now() - debut })
  let dossier: string | null = null
  try {
    dossier = await mkdtemp(join(tmpdir(), 'deribfy-xp-'))
    const entree = join(dossier, 'entree.json')
    const sortie = join(dossier, 'verdict.json')
    await writeFile(entree, JSON.stringify({ page, args, script: SCRIPT_EXPERIENCE }), 'utf8')
    const corps = new URL('./juge-experience-enfant.mjs', import.meta.url).pathname
    const enfant = spawn(process.execPath, [corps, entree, sortie], {
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '', NODE_ENV: 'production' } as NodeJS.ProcessEnv,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let bruit = ''
    enfant.stderr.on('data', (d: Buffer) => { bruit += String(d) })
    let tue = false
    const minuteur = setTimeout(() => { tue = true; enfant.kill('SIGKILL') }, PLAFOND_MS)
    await new Promise<void>((res) => { enfant.on('exit', () => { res() }); enfant.on('error', () => { res() }) })
    clearTimeout(minuteur)
    if (tue) return vide(`le navigateur a dépassé ${String(PLAFOND_MS)} ms`)
    const brut = await readFile(sortie, 'utf8').catch(() => '')
    if (brut === '') return vide(`aucune sortie du juge${bruit === '' ? '' : ' : ' + bruit.slice(0, 200)}`)
    const v = JSON.parse(brut) as Omit<VerdictExperience, 'aTourne' | 'motif'> & { erreur?: string }
    if (typeof v.erreur === 'string') return vide(v.erreur)
    return { ...v, aTourne: true, motif: null, ms: Date.now() - debut }
  } catch (e) {
    return vide(`le juge n’a pas pu être lancé : ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    if (dossier !== null) await rm(dossier, { recursive: true, force: true }).catch(() => undefined)
  }
}
