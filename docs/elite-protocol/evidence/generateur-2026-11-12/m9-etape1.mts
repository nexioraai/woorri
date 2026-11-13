// M9 — L'ŒUVRE DE PREUVE DE L'ÉTAPE 1 (44ca6bbe, prévisualisation 353a7t9xj).
//
// Gratuit, aucun modèle appelé. Sur les fichiers LIVRÉS (dernière version en
// base, copiés dans brut/m9/44ca6bbe.json.gz et hachés) :
//   ① l'instrument de M3/M5 : assembler + jugerExecution (accueil) ;
//   ② la page de l'aperçu reconstruite comme l'atelier la sert
//      (pageAutonome(code, titre)) → la ligne 22054, colonne 49 : la région
//      rolldown (fichier source) et l'instruction ;
//   ③ toutes les références à `process` / `require` dans le code livré :
//      fichier, ligne, et s'il est écrit par le modèle ou fourni (systeme/).
//   cd apps/web && npx tsx ../../docs/elite-protocol/evidence/generateur-2026-11-12/m9-etape1.mts
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// @ts-expect-error — module JS du même dossier
import { ICI } from './commun.mjs'
import { assembler } from '@/lib/apps/bac-a-sable'
import { jugerExecution } from '@/lib/apps/juge-execution'
import { pageAutonome } from '@/lib/apps/boucle-directe'

const brut = gunzipSync(readFileSync(join(ICI, 'brut', 'm9', '44ca6bbe.json.gz')))
const sha = createHash('sha256').update(brut).digest('hex')
const objet = JSON.parse(brut.toString('utf8')) as Record<string, string> | [string, string][]
const fichiers = new Map<string, string>(Array.isArray(objet) ? objet : Object.entries(objet))

const v = await assembler(fichiers)
if (!v.ok) throw new Error('assemblage : ' + v.erreur)
const ex = await jugerExecution(v.code)
const e = ex.ecrans ?? []
const mesure = {
  demarre: ex.monteDansSimulateur, erreurs: ex.erreurs.map((x) => `${x.quoi} : ${x.message.slice(0, 120)}`),
  ecransDistincts: ex.ecransDistincts ?? null, ecransVisites: ex.ecransVisites ?? null, signesAccueil: e[0] ? e[0].texte.length : null,
  sectionInconnue: e.filter((x) => /section inconnue|introuvable|page non trouvée|not found/iu.test(x.texte)).length,
  ecransVides: e.filter((x) => /\b(aucun|aucune|pas encore|vide|rien à)\b/iu.test(x.texte)).length,
}

// ② la ligne 22054 de la page servie à l'aperçu
const page = pageAutonome(v.code, 'Application')
const lignesPage = page.split('\n')
const L = 22054, C = 49
const cible = lignesPage[L - 1] ?? ''
let region = '(hors région)'
for (let i = L - 1; i >= 0; i--) { const m = lignesPage[i]!.match(/^\/\/#region (.+)$/u); if (m) { region = m[1]!; break } }
const localisation = { lignesDeLaPage: lignesPage.length, region, instruction: cible.trim().slice(0, 200), autourDeLaColonne: cible.slice(Math.max(0, C - 40), C + 40) }

// ③ process / require dans le code livré
const refs: { fichier: string; ligne: number; code: string; auteur: string }[] = []
for (const [chemin, src] of fichiers) {
  src.split('\n').forEach((l, i) => {
    if (/\bprocess\.|\brequire\(/u.test(l)) refs.push({ fichier: chemin, ligne: i + 1, code: l.trim().slice(0, 160), auteur: chemin.startsWith('systeme/') ? 'BIBLIOTHÈQUE FOURNIE' : 'MODÈLE' })
  })
}
const sortie = { fichiersSha256: sha, mesure, localisation, referencesProcessRequire: refs }
writeFileSync(join(ICI, 'sortie', 'm9-etape1.json'), JSON.stringify(sortie, null, 1) + '\n')
console.log(JSON.stringify(sortie, null, 1))
