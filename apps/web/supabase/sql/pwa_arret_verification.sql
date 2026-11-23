-- Vérification de pwa_arret.sql : lecture seule. Attendu : UNE ligne,
-- cle = pwa_arret, valeur vide ; et 18 clés au total.
select cle, valeur, (select count(*) from public.quota_reglages) as cles_au_total
  from public.quota_reglages where cle = 'pwa_arret';
