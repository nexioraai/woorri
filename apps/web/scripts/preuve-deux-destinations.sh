#!/usr/bin/env bash
# PREUVE : UN SEUL SQL, DEUX DESTINATIONS — sur un vrai Postgres.
#
# ── LA DÉCISION QU'ELLE ÉPROUVE (propriétaire, 2026-11-02).
#
# « Si la plateforme range les tables dans `oeuvre_<id>` et que le zip les
# range dans `public`, tu as deux SQL à maintenir et ils divergeront. »
#
# Le fichier émis n'est donc qualifié par AUCUN schéma. Ce script applique
# LE MÊME OCTET pour OCTET :
#   ① dans un schéma d'œuvre, après `create schema` + `search_path` — ce que
#      fait la plateforme ;
#   ② dans `public`, tel quel — ce que fait celui qui télécharge.
#
# Si les deux réussissent et que les tables atterrissent au bon endroit, un
# seul fichier suffit. Nettoyage garanti par `trap`, grappe temporaire.
set -o pipefail
set -u
SCHEMA="${1:?schema.sql attendu}"
POLITIQUES="${2:?politiques.sql attendu}"
PORT=54400
GRAPPE="$(mktemp -d)/pg"
export PGHOST=127.0.0.1 PGPORT=$PORT
nettoyer() { pg_ctl -D "$GRAPPE" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$(dirname "$GRAPPE")"; }
trap nettoyer EXIT
initdb -D "$GRAPPE" -U postgres --no-locale -E UTF8 >/dev/null
pg_ctl -D "$GRAPPE" -o "-p $PORT -k $GRAPPE -h 127.0.0.1" -l "$GRAPPE/journal" start >/dev/null
export PGUSER=postgres
createdb oeuvre
psql -q -d oeuvre -c "create role anon nologin; create role authenticated nologin;" 

echo "── ① LA PLATEFORME : create schema + search_path, puis le fichier tel quel"
psql -q -d oeuvre -v ON_ERROR_STOP=1 <<SQL
create schema oeuvre_fa0ede2c;
grant usage on schema oeuvre_fa0ede2c to anon, authenticated;
set search_path to oeuvre_fa0ede2c;
\i $SCHEMA
\i $POLITIQUES
SQL
echo "   appliqué sans erreur"

echo "── ② CELUI QUI TÉLÉCHARGE : le MÊME fichier, sans rien devant"
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$SCHEMA" >/dev/null
psql -q -d oeuvre -v ON_ERROR_STOP=1 -f "$POLITIQUES" >/dev/null
echo "   appliqué sans erreur"

echo
echo "── OÙ LES TABLES ONT-ELLES ATTERRI ?"
psql -At -d oeuvre -c "select table_schema || ' : ' || string_agg(table_name, ', ' order by table_name)
  from information_schema.tables where table_schema in ('public','oeuvre_fa0ede2c')
  group by table_schema order by table_schema" | sed 's/^/   /'

echo
echo "── LA PORTE EST-ELLE POSÉE DES DEUX CÔTÉS ?"
psql -At -d oeuvre -c "select schemaname || ' : ' || count(*) || ' politique(s), rls forcée sur ' ||
  count(*) filter (where c.relforcerowsecurity) || ' table(s)'
  from pg_policies p join pg_class c on c.relname = p.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
  where p.schemaname in ('public','oeuvre_fa0ede2c') group by schemaname order by schemaname" | sed 's/^/   /'
