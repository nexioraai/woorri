-- LES MÉDIAS DES APPLICATIONS GÉNÉRÉES (2026-11-14) — photo, vidéo, document joint.
-- A executer manuellement dans l'editeur SQL Supabase, UNE fois pour toutes les
-- applications (meme convention que comptes_documents.sql). Rejouable sans risque.
--
-- Employe par src/lib/apps/contrat/rendu/base.ts (ESPACE_MEDIAS) : une application
-- PUBLIEE range chaque fichier sous `<oeuvre>/<table>/<nom>` et garde dans sa ligne
-- `media:<chemin>` ; elle le relit par un lien signe d'une heure.
--
-- LE SEAU EST PRIVE. La porte est CELLE DES TABLES de l'application (politiques
-- `<table>_porte`) : la personne connectee dont le jeton porte
-- app_metadata.oeuvre = <oeuvre> lit et depose dans le dossier <oeuvre>, et
-- nulle part ailleurs. Aucun acces pour anon. Ni modification ni retrait par le
-- client : « Retirer » vide la colonne, le fichier reste (trace).
--
-- TANT QUE CE SEAU N'EXISTE PAS : l'apercu marche (les medias restent dans la page) ;
-- une application publiee dit « Bucket not found » a l'enregistrement d'un fichier.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oeuvres-medias', 'oeuvres-medias', false,
  52428800,  -- 50 Mio : une video courte passe ; le moteur refuse au-dela avant l'envoi
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/plain', 'text/csv'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "oeuvres-medias lecture" on storage.objects;
drop policy if exists "oeuvres-medias depot"   on storage.objects;

create policy "oeuvres-medias lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'oeuvres-medias'
    and (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'oeuvre')
  );

create policy "oeuvres-medias depot" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'oeuvres-medias'
    and (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'oeuvre')
  );

notify pgrst, 'reload schema';

-- APRÈS — la preuve, dans la même exécution.
select
  (select public from storage.buckets where id = 'oeuvres-medias')          as seau_public,
  (select file_size_limit from storage.buckets where id = 'oeuvres-medias') as limite_octets,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'oeuvres-medias%')                                as politiques,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'oeuvres-medias%' and 'anon' = any(roles))        as politiques_anon;
