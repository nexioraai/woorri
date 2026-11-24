-- LE NUMÉRO DE TÉLÉPHONE VRAIMENT MASQUÉ (2026-11-23).
--
-- La contrainte d'avant (^[0-9•]{6,15}$) acceptait un numéro EN CLAIR
-- (« 23566000001 » : que des chiffres). La nouvelle exige la forme masquée :
-- au plus 3 chiffres devant, AU MOINS 4 points, au plus 2 chiffres derrière
-- (« 235••••••01 », « •••••• »). Le code masque avant d'écrire et applique la
-- même règle (demandes.ts, FORME_MASQUEE) ; la base refuse le reste.
--
-- Si une ligne déjà en base portait un numéro en clair, la contrainte
-- refuserait de se poser et la transaction entière serait annulée : la
-- vérification ① le dit avant (attendu : 0).
--
-- Idempotent. À APPLIQUER PAR LE PROPRIÉTAIRE dans nexiora-ai, APRÈS
-- mobile_money_demandes.sql. Vérification : mobile_money_telephone_masque_verification.sql.
-- Annulation : mobile_money_telephone_masque_annulation.sql.

begin;

alter table public.mm_demandes drop constraint if exists mm_demandes_telephone_masque_check;
alter table public.mm_demandes add constraint mm_demandes_telephone_masque_check
  check (telephone_masque ~ '^[0-9]{0,3}•{4,}[0-9]{0,2}$');

commit;
