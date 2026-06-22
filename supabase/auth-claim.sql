-- ============================================================
-- Auth: vincular cada email a su lugar de miembro + función para "reclamarlo" al loguearse.
-- Pegar en Supabase → SQL Editor → Run (después de migration.sql).
-- ============================================================

-- Cada slot de miembro queda asociado a un email.
alter table group_members add column if not exists email text;
update group_members set email = 'daniela.hormaza@gmail.com' where member_key = 'dani';
update group_members set email = 'juanmartintome@gmail.com' where member_key = 'juan';

-- Al loguearse, el usuario reclama los slots cuyo email coincide con el suyo.
-- SECURITY DEFINER: corre con permisos elevados para poder linkear (evita el bloqueo de RLS).
create or replace function claim_my_slots()
returns void language sql security definer as $$
  update group_members set user_id = auth.uid()
  where lower(email) = lower(auth.email()) and user_id is null;
$$;

grant execute on function claim_my_slots() to authenticated;
