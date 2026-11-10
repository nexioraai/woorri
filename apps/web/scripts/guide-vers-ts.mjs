// Recopie docs/cpa/GUIDE-EXPLOITATION.md dans src/lib/guides/guideExploitation.ts
// (le tableau de bord l'affiche ; un test vérifie que les deux sont identiques).
import { readFileSync, writeFileSync } from 'node:fs'
const md = readFileSync(new URL('../../../docs/cpa/GUIDE-EXPLOITATION.md', import.meta.url), 'utf8')
writeFileSync(new URL('../src/lib/guides/guideExploitation.ts', import.meta.url),
  '// GÉNÉRÉ depuis docs/cpa/GUIDE-EXPLOITATION.md — ne pas modifier à la main.\n' +
  '// Pour changer le guide : modifier le fichier .md, puis relancer\n' +
  '// `node scripts/guide-vers-ts.mjs`. Le test `guideExploitation.test.ts`\n' +
  '// échoue tant que les deux ne sont pas identiques.\n' +
  `export const GUIDE_EXPLOITATION: string = ${JSON.stringify(md)}\n`)
console.log('guide recopié')
