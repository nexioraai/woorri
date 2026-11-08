-- ============================================================================
-- LOT 5 — LE MOTEUR SAIT STOCKER UN FICHIER
--
-- LE DÉFAUT, VU À L'ÉCRAN. Le bloc « documents » n'affiche que des liens vers
-- des URL. Sur /fournisseurs/documents, les quatre liens ne mènent nulle part :
-- il n'existe AUCUN endroit où déposer un fichier. Promettre un téléchargement
-- qu'on ne peut pas livrer, c'est la classe de défaut qu'on ferme depuis deux
-- jours.
--
-- LE CLOISONNEMENT EST LE POINT CRITIQUE. Un site ne doit JAMAIS pouvoir
-- écrire dans le dossier d'un autre. Le premier segment du chemin est l'`id`
-- du site, et aucune écriture directe n'est accordée : tout dépôt passe par
-- la route serveur, qui vérifie la propriété AVANT d'employer le rôle de
-- service. La base n'accorde donc à personne d'autre que la lecture.
--
-- POURQUOI AUCUNE POLITIQUE D'ÉCRITURE. Accorder l'écriture à `authenticated`
-- obligerait à exprimer « ce site est à moi » dans une politique de storage,
-- qui ne voit ni `sites` ni son propriétaire sans jointure. Une politique
-- qu'on ne peut pas écrire simplement est une politique qu'on écrit mal.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. LE COMPARTIMENT
--    `public = true` ne rend PUBLIC que la LECTURE des objets ; il n'accorde
--    aucune écriture. Les deux plafonds sont posés ici parce qu'ils doivent
--    tenir même si la route est contournée.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-fichiers', 'site-fichiers', true,
  26214400,  -- 25 Mio : un dossier d'appel d'offres complet passe, un film non
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'text/csv',
    'image/jpeg', 'image/png', 'image/webp', 'image/avif'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. LES DROITS — LECTURE SEULE, ET RIEN D'AUTRE
--    On repart de zéro : une politique laissée d'une tentative précédente
--    accorderait un droit que personne ne relit.
-- ---------------------------------------------------------------------------
drop policy if exists "site-fichiers lecture publique" on storage.objects;
drop policy if exists "site-fichiers depot"            on storage.objects;
drop policy if exists "site-fichiers retrait"          on storage.objects;

create policy "site-fichiers lecture publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-fichiers');

-- Aucune politique INSERT, UPDATE ou DELETE n'est créée : le dépôt et le
-- retrait passent exclusivement par la route serveur, sous rôle de service,
-- après vérification de la propriété du site. `service_role` contourne RLS,
-- il n'a donc besoin d'aucune politique.

notify pgrst, 'reload schema';
