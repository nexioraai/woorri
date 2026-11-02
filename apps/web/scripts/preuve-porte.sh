#!/usr/bin/env bash
# PREUVE DE LA PORTE — sur un VRAI Postgres, avec nettoyage garanti.
#
# ── POURQUOI CE SCRIPT EXISTE.
#
# EP-320 prouve une STRUCTURE : couverture, ordre, absence de rôle refusé.
# Il ne prouve pas qu'une politique protège — rien dans la gate ne touche un
# Postgres, et SQLite n'a pas de RLS.
#
# Ce script ferme ce trou SANS toucher à aucune base existante : il monte sa
# propre grappe Postgres dans un dossier temporaire, sur un port inhabituel,
# et la détruit en sortant — y compris en cas d'échec (`trap`).
#
# ── IL REPRODUIT LE PIÈGE DE SUPABASE, PAS UNE BASE IDÉALE.
#
# Un projet Supabase pose deux rôles (`anon`, `authenticated`) ET des
# privilèges par défaut qui donnent tout sur les tables à venir. C'est ce qui
# rend la RLS indispensable : sans elle, une table créée après ces privilèges
# naît lisible par n'importe qui. Le script pose donc les mêmes privilèges —
# une preuve sur une base propre ne prouverait rien de notre situation.
#
# ── ET IL MESURE L'AVANT, PAS SEULEMENT L'APRÈS.
#
# Montrer que la porte refuse ne vaut que si l'on montre d'abord qu'elle
# laissait passer. Une mesure sans son avant ne distingue pas « protégé » de
# « rien n'a jamais marché ».
#
#   usage : bash apps/web/scripts/preuve-porte.sh <schema.sql> <politiques.sql>
set -o pipefail
set -u

SCHEMA="${1:?chemin du schema.sql attendu}"
POLITIQUES="${2:?chemin du politiques.sql attendu}"
PORT=54399
GRAPPE="$(mktemp -d)/pg"
export PGHOST=127.0.0.1
export PGPORT=$PORT

nettoyer() {
  pg_ctl -D "$GRAPPE" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$(dirname "$GRAPPE")"
}
trap nettoyer EXIT

echo "── grappe temporaire : $GRAPPE (port $PORT)"
initdb -D "$GRAPPE" -U postgres --no-locale -E UTF8 >/dev/null
pg_ctl -D "$GRAPPE" -o "-p $PORT -k $GRAPPE -h 127.0.0.1" -l "$GRAPPE/journal" start >/dev/null
export PGUSER=postgres
createdb oeuvre

# ── LES DEUX RÔLES DE SUPABASE, ET SES PRIVILÈGES PAR DÉFAUT.
psql -q -d oeuvre <<'SQL'
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
-- LE PIÈGE, REPRODUIT : toute table créée APRÈS cette ligne naît accessible.
alter default privileges in schema public
  grant all on tables to anon, authenticated;
SQL
echo "   rôles anon + authenticated posés, privilèges par défaut compris"

echo
echo "── ① LE SCHÉMA S'APPLIQUE"
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$SCHEMA" && echo "   appliqué sans erreur"
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$SCHEMA" && echo "   RÉAPPLIQUÉ sans erreur (if not exists tient)"
TABLES=$(psql -At -d oeuvre -c "select count(*) from information_schema.tables where table_schema='public'")
echo "   tables créées : $TABLES"
PREMIERE=$(psql -At -d oeuvre -c "select table_name from information_schema.tables where table_schema='public' order by table_name limit 1")
echo "   table témoin : $PREMIERE"

echo
echo "── ② AVANT LA PORTE — la base est-elle ouverte ?"
psql -q -d oeuvre -c "insert into $PREMIERE (id) values ('temoin')" >/dev/null
AVANT=$(psql -At -d oeuvre -c "set role anon; select count(*) from $PREMIERE" 2>&1)
echo "   lecture ANONYME : $AVANT"
AVANT_W=$(psql -At -d oeuvre -c "set role anon; insert into $PREMIERE (id) values ('par-anon')" 2>&1 | tr '\n' ' ')
echo "   écriture ANONYME : ${AVANT_W:-réussie}"

echo
echo "── ③ LA PORTE S'APPLIQUE"
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$POLITIQUES" && echo "   appliquée sans erreur"
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$POLITIQUES" && echo "   RÉAPPLIQUÉE sans erreur (drop policy tient)"

echo
echo "── ④ APRÈS LA PORTE"
# LE CODE SQLSTATE, PAS LE MESSAGE : c'est lui qui nomme l'objet refusé.
APRES=$(psql -At -d oeuvre -c "set role anon; select count(*) from $PREMIERE" 2>&1 | tr '\n' ' ')
echo "   lecture ANONYME : $APRES"
APRES_W=$(psql -At -d oeuvre -c "set role anon; insert into $PREMIERE (id) values ('par-anon-2')" 2>&1 | tr '\n' ' ')
echo "   écriture ANONYME : $APRES_W"
CONNECTE=$(psql -At -d oeuvre -c "set role authenticated; select count(*) from $PREMIERE" 2>&1 | tr '\n' ' ')
echo "   lecture CONNECTÉE : $CONNECTE"
CONNECTE_W=$(psql -At -d oeuvre -c "set role authenticated; insert into $PREMIERE (id) values ('par-connecte')" 2>&1 | tr '\n' ' ')
echo "   écriture CONNECTÉE : ${CONNECTE_W:-réussie}"

echo
echo "── ⑤ VERDICT"
echo "$APRES" | grep -qi "permission denied\|42501" \
  && echo "   🟢 la lecture anonyme est REFUSÉE après la porte" \
  || { echo "   🔴 la lecture anonyme PASSE encore : la porte ne protège pas"; exit 1; }
# ── MON PREMIER VERDICT ETAIT FAUX, ET LES DONNEES DISAIENT L'INVERSE.
#
# J'exigeais un nombre SEUL. Or `psql -c "set role …; select …"` imprime le
# marqueur `SET` puis le resultat : la sortie valait « SET 2 », et mon motif
# `^[0-9]+$` la refusait. Le controle annoncait « la porte est muree » sur une
# porte qui fonctionnait.
#
# On juge donc sur ce qui compte : pas de refus, et un nombre quelque part.
if echo "$CONNECTE" | grep -qi "permission denied\|42501"; then
  echo "   🔴 la lecture connectée est REFUSÉE : la porte est murée"; exit 1
fi
echo "$CONNECTE" | grep -qE '[0-9]' \
  && echo "   🟢 la lecture connectée PASSE ($CONNECTE)" \
  || { echo "   🔴 la lecture connectée ne rend aucun compte"; exit 1; }
echo "$CONNECTE_W" | grep -q "INSERT" \
  && echo "   🟢 l’écriture connectée PASSE ($CONNECTE_W)" \
  || { echo "   🔴 l’écriture connectée est refusée"; exit 1; }
# ET L'AVANT DOIT AVOIR ETE OUVERT : sans ca, on ne distingue pas « protege »
# de « rien n'a jamais marche ».
echo "$AVANT" | grep -qi "permission denied" \
  && { echo "   🔴 la base etait DEJA fermee avant la porte : la mesure ne prouve rien"; exit 1; } \
  || echo "   🟢 l’avant était bien OUVERT ($AVANT) — la porte a donc fermé quelque chose"
