// LOT 15.7 — PROUVE LA BARRE DU HAUT À L'ADRESSE PUBLIQUE, DANS UN VRAI
// NAVIGATEUR, À PLUSIEURS LARGEURS.
//
// POURQUOI UN NAVIGATEUR ET PAS LE HTML. Le défaut du 2026-11-09 n'est pas
// dans le balisage : « Qui sommes-nous » se replie sur deux lignes et
// « Contact » sort du cadre parce que les boîtes ne tiennent pas. Aucune
// lecture de chaîne ne voit ça — il faut MESURER des rectangles.
//
// GEN-D051 — on ne mesure qu'après déploiement. Le script compare d'abord le
// commit servi par `/api/version` à celui qu'on lui donne.
import { chromium } from 'playwright'

const BASE = process.env.SONDE_BASE ?? 'https://cpa-tchad.deribfy.app'
const ATTENDU = process.argv[2] ?? null
const LARGEURS = [1512, 1440, 1280, 1152, 1024, 820]

let n = 0, ko = 0
const p = (t, ok, detail = '') => {
  n++; if (!ok) ko++
  console.log(`  ${ok ? '🟢' : '🔴'} ${n}. ${t}${detail ? `\n       ${detail}` : ''}`)
}

if (ATTENDU) {
  const r = await fetch(`${BASE}/api/version`, { cache: 'no-store' }).catch(() => null)
  const servi = r ? (await r.json().catch(() => ({}))).commit : null
  // ON COMPARE SUR LA LONGUEUR LA PLUS COURTE DES DEUX.
  // `/api/version` rend SEPT caractères. Comparer un préfixe de huit à une
  // chaîne de sept ne peut jamais être vrai : le garde-fou refusait un
  // déploiement correct et aurait attendu pour toujours. Un verrou qui ne
  // peut pas s'ouvrir n'est pas un verrou prudent, c'est un verrou cassé.
  const court = Math.min(String(servi ?? '').length, ATTENDU.length, 12)
  if (!servi || court < 7 || String(servi).slice(0, court) !== ATTENDU.slice(0, court)) {
    console.log(`⏳ servi « ${servi} », attendu « ${ATTENDU} » — on ne mesure pas un ancien déploiement.`)
    process.exit(2)
  }
}

const navigateur = await chromium.launch()

for (const largeur of LARGEURS) {
  console.log(`\n── ${largeur} px`)
  const page = await navigateur.newPage({ viewport: { width: largeur, height: 900 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })

  const m = await page.evaluate(() => {
    const barre = [...document.querySelectorAll('header nav')]
      .find((e) => getComputedStyle(e).display !== 'none')
    if (!barre) return { barre: false }
    const entrees = [...barre.children].map((e) => {
      const r = e.getBoundingClientRect()
      const ligne = parseFloat(getComputedStyle(e).lineHeight) || 20
      return {
        texte: (e.textContent ?? '').trim().slice(0, 28),
        largeur: Math.round(r.width), hauteur: Math.round(r.height),
        droite: Math.round(r.right),
        lignes: Math.max(1, Math.round(r.height / (ligne * 1.25))),
        dessin: !!e.querySelector('svg'),
      }
    })
    const enTete = document.querySelector('header')
    const enseigne = barre.parentElement?.firstElementChild
    const re = enTete.getBoundingClientRect()
    const rn = enseigne?.getBoundingClientRect()
    return {
      barre: true,
      bord: Math.round(re.right),
      // L'ENSEIGNE NE DOIT PAS SORTIR DE L'EN-TÊTE. Mesuré le 2026-11-09 :
      // le nom de l'établissement, en serif 24 px, tombait sur trois lignes
      // dans la colonne que lui laissent sept entrées — 96 px pour un
      // en-tête de 80 — et se faisait trancher par le bas de la barre.
      enseigneBas: rn ? Math.round(rn.bottom) : 0,
      enTeteBas: Math.round(re.bottom),
      enseigneNom: (enseigne?.textContent ?? '').trim().slice(0, 30),
      debordeX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      hamburger: !!document.querySelector('header + div button, [aria-label*="menu" i]'),
      entrees,
    }
  })

  if (!m.barre) {
    // Pas de barre à cette largeur : alors il FAUT le hamburger. Une largeur
    // sans aucun menu est le pire des deux mondes.
    const rideau = await page.evaluate(() =>
      [...document.querySelectorAll('button')].some((b) => /menu/i.test(b.getAttribute('aria-label') ?? '')))
    p(`${largeur} px — pas de barre, mais le rideau du téléphone est là`, rideau)
    await page.close(); continue
  }

  const replie = m.entrees.filter((e) => e.lignes > 1)
  p(`${largeur} px — aucune entrée repliée sur deux lignes`, replie.length === 0,
    replie.map((e) => `« ${e.texte} » sur ${e.lignes} lignes`).join(' · '))

  const sortie = m.entrees.filter((e) => e.droite > m.bord + 1)
  p(`${largeur} px — aucune entrée ne sort de l'en-tête`, sortie.length === 0,
    sortie.map((e) => `« ${e.texte} » finit à ${e.droite} pour un bord à ${m.bord}`).join(' · '))

  p(`${largeur} px — la page ne défile pas latéralement`, !m.debordeX)

  p(`${largeur} px — l'enseigne tient dans l'en-tête`, m.enseigneBas <= m.enTeteBas + 1,
    `« ${m.enseigneNom} » finit à ${m.enseigneBas} pour un en-tête qui finit à ${m.enTeteBas}`)

  const nus = m.entrees.filter((e) => !e.dessin && e.texte.length > 0)
  p(`${largeur} px — les ${m.entrees.length} entrées portent un pictogramme`, nus.length === 0,
    nus.map((e) => `« ${e.texte} » nu`).join(' · '))

  await page.close()
}

await navigateur.close()
console.log(`\n${n - ko}/${n}${ko ? ` — ${ko} ROUGE(S)` : ''}`)
process.exit(ko ? 1 : 0)
