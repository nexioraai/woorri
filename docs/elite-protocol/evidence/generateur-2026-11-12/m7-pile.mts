// M7 — « object is not iterable » : la PILE COMPLÈTE, jusqu'au fichier et à la ligne.
//
// Gratuit, déterministe, aucun modèle appelé. Trois cas, même message :
//   · f1b753a6 — pharmacie livrée (instantané, document.fichiers) ;
//   · 88fc434f0e76 — rejeu M5 institution (brut/m5-rejeu, haché) ;
//   · 9ee1ca865053 — rejeu M5 réservation (brut/m5-rejeu, haché).
//
// MÉTHODE
//  ① assembler() — l'assembleur du générateur, INCHANGÉ. Le paquet produit
//    n'est pas minifié, et rolldown y pose des repères « //#region <fichier> ».
//  ② montage par m7-enfant.mjs : COPIE du processus enfant du juge, mêmes
//    drapeaux (--permission, environnement vide), qui garde la pile complète
//    (diff documenté en tête de la copie). Accueil, puis #gestion.
//  ③ chaque cadre de pile « :LIGNE:COLONNE » du paquet est ramené à la région
//    (le fichier source) qui la contient, avec la ligne relative et le code.
//   cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m7-pile.mts
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { charger, ICI } from './commun.mjs'
import { assembler } from '@/lib/apps/bac-a-sable'
import { ADRESSE_GESTION } from '@/lib/apps/entites-declarees'

const { lignes, sha } = charger() as { lignes: { id: string; document?: { fichiers?: Record<string, string> } }[]; sha: string }
const rejeu = JSON.parse(readFileSync(join(ICI, 'sortie', 'm5-rejeu.json'), 'utf8')) as { rejeu: { cahier: string; secteur: string; livree: boolean; fichiersSha256?: string }[] }
const depuisRejeu = (h: string) => {
  const brut = gunzipSync(readFileSync(join(ICI, 'brut', 'm5-rejeu', `${h}.json.gz`)))
  const attendu = rejeu.rejeu.find((r) => r.cahier === h && r.livree)?.fichiersSha256
  if (createHash('sha256').update(brut).digest('hex') !== attendu) throw new Error(`fichiers altérés : ${h}`)
  return new Map(Object.entries(JSON.parse(brut.toString('utf8')) as Record<string, string>))
}
const cas = [
  { nom: 'pharmacie f1b753a6 (livrée)', fichiers: new Map(Object.entries(lignes.find((l) => l.id.startsWith('f1b753a6'))!.document!.fichiers!)) },
  { nom: 'rejeu M5 institution 88fc434f0e76', fichiers: depuisRejeu('88fc434f0e76') },
  { nom: 'rejeu M5 réservation 9ee1ca865053', fichiers: depuisRejeu('9ee1ca865053') },
]

const ENFANT = join(ICI, 'm7-enfant.mjs')
function monter(code: string, adresse: string): Promise<{ erreurs: { quoi: string; message: string; pile?: string; arguments?: string[] }[] }> {
  const dossier = mkdtempSync(join(tmpdir(), 'm7-'))
  const bundle = join(dossier, 'oeuvre.js'), sortie = join(dossier, 'verdict.json')
  writeFileSync(bundle, code, 'utf8')
  return new Promise((ok, ko) => {
    const p = spawn(process.execPath, ['--permission', '--allow-fs-read=*', `--allow-fs-write=${dossier}`, ENFANT, bundle, sortie, '1500', adresse],
      { env: { PATH: '/usr/bin:/bin', NODE_ENV: 'production' } as NodeJS.ProcessEnv, cwd: dossier, stdio: ['ignore', 'pipe', 'pipe'] })
    const t = setTimeout(() => p.kill('SIGKILL'), 20_000)
    p.on('close', () => { clearTimeout(t); try { ok(JSON.parse(readFileSync(sortie, 'utf8'))) } catch (e) { ko(e) } })
  })
}

/** Ramène « :L:C » du paquet à « fichier source : ligne relative ». */
function situer(code: string, ligne: number) {
  const ls = code.split('\n')
  let region = '(hors région)', debut = 0
  for (let i = ligne - 1; i >= 0; i--) { const m = ls[i]!.match(/^\/\/#region (.+)$/u); if (m) { region = m[1]!; debut = i + 1; break } }
  return { region, ligneDansRegion: ligne - debut, code: (ls[ligne - 1] ?? '').trim().slice(0, 200) }
}

const resultats = []
for (const c of cas) {
  const v = await assembler(c.fichiers)
  if (!v.ok) { resultats.push({ cas: c.nom, erreur: v.erreur }); continue }
  for (const adresse of ['', ADRESSE_GESTION]) {
    const verdict = await monter(v.code, adresse)
    for (const e of verdict.erreurs.filter((x) => /not iterable/u.test(x.message))) {
      const cadres = (e.pile ?? '').split('\n').filter((l) => /:\d+:\d+\)?\s*$/u.test(l)).map((l) => {
        const m = l.match(/at (?:(.+?) \()?.*?:(\d+):(\d+)\)?\s*$/u)!
        return { fonction: m[1] ?? '(anonyme)', ligne: Number(m[2]), colonne: Number(m[3]), ...situer(v.code, Number(m[2])) }
      })
      resultats.push({ cas: c.nom, adresse: adresse || 'accueil', quoi: e.quoi, message: e.message, cadres: cadres.slice(0, 12), pileDeComposants: (e.arguments ?? []).filter((a) => /at |in /u.test(a)).map((a) => a.slice(0, 600)) })
    }
  }
}
writeFileSync(join(ICI, 'sortie', 'm7-pile.json'), JSON.stringify({ instantane_sha256: sha, resultats }, null, 1) + '\n')
for (const r of resultats as { cas: string; adresse?: string; quoi?: string; message?: string; cadres?: { fonction: string; region: string; ligneDansRegion: number; code: string }[] }[]) {
  console.log(`\n══ ${r.cas} · ${r.adresse} · ${r.quoi} : ${r.message?.slice(0, 90)}`)
  for (const f of (r.cadres ?? []).slice(0, 6)) console.log(`   ${f.fonction.padEnd(28)} ${f.region} : l.${f.ligneDansRegion}\n      ${f.code}`)
}
