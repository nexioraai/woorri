-- ============================================================
-- `contraintes_vivantes` — LIRE CE QUE LA BASE APPLIQUE VRAIMENT.
--
-- POURQUOI CE FICHIER EXISTE (2026-11-01). Une suppression a echoue devant
-- le proprietaire : la contrainte <table>_statut_valide n'acceptait pas le
-- statut « supprimee » que le code ecrivait. Le depot etait coherent AVEC
-- LUI-MEME, et rien ne comparait le depot a la base EN LIGNE.
--
-- PostgREST publie les colonnes (son OpenAPI porte type, nullabilite et
-- defaut) mais AUCUNE contrainte CHECK. La premiere parade les EXERCAIT, en
-- posant des temoins dans la table des vrais clients : mauvais marche. Les
-- exercer seulement sur la jumelle rendait aveugle sur la production — or
-- c'est la contrainte de PRODUCTION qui avait echoue.
--
-- Cette fonction est la troisieme voie : production en LECTURE SEULE, et
-- contraintes de production verifiees. Elle est appelee par
-- api/generateur/schema, dont le verdict est calcule par
-- scripts/verifier-schema.mjs.
--
-- POURQUOI ELLE EST SANS DANGER, point par point :
--   · `security invoker` (le DEFAUT, ecrit pour qu'on le lise) : elle tourne
--     avec les droits de l'appelant, elle n'en accorde aucun. Lire
--     pg_constraint ne demande aucun privilege — le catalogue est lisible
--     par tous — donc `definer` n'apporterait rien et ouvrirait une porte.
--   · `language sql` + `stable` + un seul SELECT : aucune ecriture possible,
--     pas meme par accident ; `stable` l'interdit au planificateur.
--   · AUCUNE DONNEE METIER : des noms et des DEFINITIONS de contraintes.
--     C'est du schema, pas du contenu — aucune ligne, aucun client.
--   · PAS DE SQL DYNAMIQUE : le nom de table est une VALEUR comparee dans un
--     WHERE, jamais concatenee. Aucune surface d'injection.
--   · REVOQUEE POUR `public`, ET PAS SEULEMENT POUR `anon`. MESURE DU
--     2026-11-01 : apres un collage ne revoquant que les roles nommes, la
--     clef ANONYME appelait quand meme la fonction (AUTORISE, 5 regles
--     rendues). Postgres accorde EXECUTE a PUBLIC par defaut sur toute
--     fonction neuve, et `anon` en HERITE. C'est une sortie de commande qui
--     l'a dit, pas un raisonnement.
--
-- 42P13 — SI POSTGRES REFUSE LE `create or replace` : c'est que le TYPE DE
-- RETOUR a change depuis la version en base. Alors, et alors seulement :
--   drop function public.contraintes_vivantes(text);
-- puis rejouer ce fichier ENTIER, droits compris — un drop les emporte.
-- ============================================================

-- ── LIRE LES CONTRAINTES VIVANTES, SANS ÉCRIRE UNE SEULE LIGNE.
--
-- PostgREST ne publie pas les contraintes CHECK : la première sonde de
-- schéma les EXERÇAIT donc, en posant des témoins. Sur la table des vrais
-- clients, c'était un mauvais marché ; en les exerçant seulement sur la
-- jumelle, on perdait de vue la contrainte de PRODUCTION — celle qui a
-- justement échoué le 2026-11-01.
--
-- Postgres, lui, les connaît. « pg_get_constraintdef » les REND. Cette
-- fonction est la troisième voie : production en lecture seule ET
-- contraintes de production vérifiées.
--
-- POURQUOI ELLE EST SANS DANGER, point par point :
--   · « security invoker » (le DÉFAUT, écrit ici pour qu'on le lise) : elle
--     tourne avec les droits de l'appelant, elle n'en accorde aucun. Lire
--     « pg_constraint » ne demande aucun privilège particulier — le catalogue
--     est lisible par tous —, donc « definer » n'apporterait rien et
--     ouvrirait une porte.
--   · « language sql » + « stable » + un seul SELECT : aucune écriture
--     possible, pas même par accident. « stable » l'interdit au planificateur.
--   · AUCUNE DONNÉE MÉTIER. Elle rend des noms et des DÉFINITIONS de
--     contraintes — « CHECK (statut = ANY (ARRAY['livree'…])) ». C'est du
--     schéma, pas du contenu : aucune ligne, aucun client, aucun montant.
--   · PAS DE SQL DYNAMIQUE. Le nom de table est une VALEUR comparée dans un
--     WHERE, jamais concaténée : il n'y a pas de surface d'injection.
--   · RÉVOQUÉE pour « anon » et « authenticated », accordée au seul
--     « service_role » : seul notre serveur l'appelle.
--
-- ── ET ELLE REND « convalidated », PARCE QUE « DÉCLARÉE » N'EST PAS
-- « APPLIQUÉE ».
--
-- Une contrainte posée NOT VALID existe, se lit, rend une définition
-- parfaite — et ne s'applique PAS aux lignes déjà présentes. Sans cette
-- colonne, le rapport dirait « la base déclare » pendant que le lecteur
-- comprendrait « la base applique ». C'est exactement la confusion qu'on
-- passe la journée à fermer, et elle tenait à un champ de la requête.
create or replace function public.contraintes_vivantes(nom_table text)
returns table (nom text, definition text, validee boolean)
language sql
security invoker
stable
as $FN$
  select c.conname::text, pg_get_constraintdef(c.oid)::text, c.convalidated
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = nom_table
     and c.contype in ('c', 'u', 'p')
  union all
  -- ── LES INDEX UNIQUES AUSSI, et ils vivent AILLEURS.
  --
  -- Un UNIQUE pose par « create unique index » n'est pas une contrainte :
  -- il n'apparait PAS dans pg_constraint. La premiere version de cette
  -- fonction ne le voyait donc pas, et un index unique disparu en
  -- production aurait laisse DEUX applications partager un jeton de
  -- publication — la route publique n'aurait eu aucun moyen de choisir
  -- laquelle servir.
  --
  -- « indisvalid » joue ici le role de « convalidated » : un index bati en
  -- arriere-plan et rate reste present mais INUTILISE par le planificateur.
  select i.relname::text, pg_get_indexdef(i.oid)::text, x.indisvalid
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = nom_table
     and x.indisunique
     and not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
$FN$;

-- ── REVOQUER « anon » NE SUFFIT PAS. MESURE DU 2026-11-01.
--
-- Premiere version : « revoke all ... from anon, authenticated ». Mesure a
-- la clef ANONYME, apres collage : AUTORISE, 5 regles rendues. Postgres
-- accorde EXECUTE a PUBLIC par defaut sur toute fonction neuve, et « anon »
-- en HERITE — revoquer le role nomme laisse l'heritage intact.
--
-- C'est PUBLIC qu'il faut revoquer. Et c'est une sortie de commande qui l'a
-- dit, pas un raisonnement : j'avais affirme la revocation efficace sans
-- l'avoir mesuree.
revoke all on function public.contraintes_vivantes(text) from public;
revoke all on function public.contraintes_vivantes(text) from anon, authenticated;
grant execute on function public.contraintes_vivantes(text) to service_role;
