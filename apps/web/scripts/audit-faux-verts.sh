#!/usr/bin/env bash
# AUDIT DES FAUX VERTS — quels cliquets gardent une PROSE ?
#
# ── LA QUESTION, ET POURQUOI UNE SEULE MESURE SUFFIT.
#
# Neuf fois le 2026-11-02, une assertion sur du source a été satisfaite par
# un commentaire : une ligne d'import, un bloc de tête citant l'appel exigé,
# une phrase expliquant qu'on n'emploie pas `Math.random`. Neuf fois trouvées
# PAR HASARD, en écrivant la mutation suivante.
#
# « Combien dorment encore ? » est mesurable. On retire les commentaires des
# SOURCES — pas des tests — et on relance la suite. Un cliquet qui passe du
# VERT au ROUGE mentait depuis le jour où il a été écrit.
#
# ── POURQUOI ON MODIFIE LES FICHIERS AU LIEU D'INTERCEPTER LA LECTURE.
#
# J'ai d'abord essayé de remplacer `readFileSync`, puis d'aliaser `node:fs`.
# LE TÉMOIN A REFUSÉ LES DEUX : il passait sous l'audit comme sans lui.
# Vitest externalise les modules natifs, et un `import { readFileSync }` ESM
# est lié à l'évaluation du module — on ne le rebranche pas après coup.
#
# On retire donc les commentaires POUR DE VRAI, et on restaure par git. C'est
# brutal et c'est sans ambiguïté : la source n'a vraiment plus de prose.
#
# ── LE TÉMOIN EST OBLIGATOIRE.
#
# Sans lui, un audit qui ne trouve rien ne distingue pas « aucun faux vert »
# de « mon instrument ne retire rien ». Il cherche une phrase qui n'existe
# QUE dans un commentaire : il doit passer avant, échouer pendant.
#
#   usage : bash apps/web/scripts/audit-faux-verts.sh
set -o pipefail
set -u

cd "$(git rev-parse --show-toplevel)" || exit 1

if [ -n "$(git status --porcelain)" ]; then
  echo "🔴 arbre de travail SALE. L'audit modifie les sources et restaure par"
  echo "   git : il refuse de tourner s'il risque d'effacer du travail."
  exit 1
fi

restaurer() {
  git checkout -- . 2>/dev/null || true
  rm -f apps/web/src/lib/apps/__tests__/zz-temoin-faux-verts.test.ts
}
trap restaurer EXIT

echo "── LE TÉMOIN, d'abord sans l'audit"
cat > apps/web/src/lib/apps/__tests__/zz-temoin-faux-verts.test.ts <<'TEMOIN'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
describe('TÉMOIN · les commentaires sont-ils retirés ?', () => {
  it('une phrase qui ne vit QUE dans un commentaire est lisible', () => {
    const s = readFileSync(join(__dirname, '..', 'identites-derivees.ts'), 'utf8')
    expect(s, 'LE TÉMOIN NE VOIT PLUS LA PROSE : l’audit est en place').toContain('attend son tour')
  })
})
TEMOIN
(cd apps/web && npx vitest run src/lib/apps/__tests__/zz-temoin-faux-verts.test.ts 2>&1 \
  | grep -E "Tests " | sed 's/^/   avant : /')

echo
echo "── ON RETIRE LES COMMENTAIRES DES SOURCES (jamais des tests)"
python3 - <<'PY'
import re, subprocess
# ── ON NE RETIRE QUE CE QUI EST SANS AMBIGUITE.
#
# Ma premiere forme retirait tout `//` non precede de `: ' " \``. Elle a
# casse du JSX : un texte d'ecran peut contenir `//`, et les numeros de
# ligne de l'erreur portaient sur le fichier DEPOUILLE, donc introuvables.
#
# On ne retire donc que :
#   · les blocs /* ... */ (les blocs de tete, qui portent l'essentiel) ;
#   · les // qui COMMENCENT une ligne, seuls ou apres des espaces.
#
# UN COMMENTAIRE DE FIN DE LIGNE RESTE EN PLACE. L'audit sous-estime donc :
# un cliquet qui s'appuierait sur `code; // phrase` passerait inapercu. Dit,
# plutot que tu.
BLOC = re.compile(r'/\*[\s\S]*?\*/')
LIGNE = re.compile(r'^[ \t]*//.*$', re.M)
suivis = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout.decode().split('\0')
n = 0
for f in suivis:
    if not f or '__tests__' in f or '/tests/' in f: continue
    # ── LES `.tsx` SONT HORS DE L'AUDIT, ET C'EST MESURE.
    #
    # Un commentaire JSX s'ecrit `{/* ... */}`. Le retirer laisse `{}`, ce qui
    # casse l'arbre -- tsc l'a dit deux fois avant que je le localise.
    #
    # L'AUDIT NE COUVRE DONC PAS les cliquets qui lisent un ECRAN : EP-260
    # (Conversation.tsx), EP-287 (dashboard), EP-317 (atelier). Dit, plutot
    # que tu : ces trois-la restent a verifier a la main.
    if not re.search(r'^(apps/web/src|packages/[^/]+/src)/.*\.ts$', f): continue
    s = open(f, encoding='utf-8').read()
    d = LIGNE.sub('', BLOC.sub('', s))
    if d != s:
        open(f, 'w', encoding='utf-8').write(d)
        n += 1
print(f'   {n} fichier(s) source dépouillé(s)')
PY

echo
echo "── LE TYPECHECK DOIT SURVIVRE, sinon le dépouillage est fautif"
if ! (cd apps/web && npx tsc --noEmit -p tsconfig.json > /tmp/audit-tsc.txt 2>&1); then
  echo "   🔴 tsc échoue APRÈS dépouillage : mon retrait a cassé du code."
  echo "      L'audit ne mesure alors rien de fiable. Premières erreurs :"
  head -5 /tmp/audit-tsc.txt | sed 's/^/      /'
  exit 1
fi
echo "   tsc survit : le dépouillage est propre"

echo
echo "── LE TÉMOIN, sous l'audit (il DOIT échouer)"
(cd apps/web && npx vitest run src/lib/apps/__tests__/zz-temoin-faux-verts.test.ts 2>&1 \
  | grep -E "Tests " | sed 's/^/   pendant : /')

echo
echo "── LA SUITE ENTIÈRE, SANS PROSE"
(cd apps/web && npx vitest run --reporter=default 2>&1 | tee /tmp/audit-suite.txt \
  | grep -E "^ *Tests |^ *Test Files " | sed 's/^/   /')

echo
echo "── LES CLIQUETS QUI GARDAIENT UNE PROSE"
grep -E "^ *(×|FAIL)" /tmp/audit-suite.txt \
  | grep -v "zz-temoin-faux-verts" \
  | sed 's/^ *//' | sort -u | sed 's/^/   /' \
  || echo "   aucun"
