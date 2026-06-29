-- ============================================================
-- Cuentas Claras — sincronización de GRUPOS y MIEMBROS
-- Habilita crear grupos / espacios 1:1 y agregar miembros desde la app (con su email,
-- para "persona sin cuenta" + vinculación automática vía claim_my_slots()).
-- Pegar en Supabase → SQL Editor → Run (DESPUÉS de migration.sql y auth-claim.sql).
-- Es aditivo e idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

-- ---------- Columnas nuevas en groups ----------
-- is_group : el grupo fue creado con nombre (aunque sea de 2 personas, ej "Viaje a Chile") → NO es un 1:1.
-- direct   : espacio 1:1 creado al vuelo con una persona.
-- event_date : fecha del viaje/evento (opcional).
alter table groups add column if not exists is_group  boolean default false;
alter table groups add column if not exists direct    boolean default false;
alter table groups add column if not exists event_date date;

-- ---------- Crear grupo (resuelve el huevo-gallina de RLS) ----------
-- La policy de groups exige ser miembro para insertar, pero al crear todavía no lo sos.
-- Esta función corre con permisos elevados: inserta el grupo + sus miembros en una sola
-- transacción, y linkea al CREADOR (creator_key) con su user_id para que RLS lo deje entrar.
-- A los demás miembros se les guarda el email; cuando se logueen, claim_my_slots() los vincula.
-- Solo se puede setear user_id propio (el del que llama): nunca el de otra persona.
create or replace function create_group(g jsonb, mems jsonb, creator_key text)
returns void language plpgsql security definer as $$
declare m jsonb;
begin
  insert into groups (id, name, initial, gradient, description, personal, is_group, direct, event_date, created_at)
  values (
    g->>'id', g->>'name', g->>'initial', g->>'gradient', g->>'description',
    coalesce((g->>'personal')::boolean, false),
    coalesce((g->>'is_group')::boolean, false),
    coalesce((g->>'direct')::boolean, false),
    nullif(g->>'event_date', '')::date,
    now()
  )
  on conflict (id) do nothing;

  for m in select * from jsonb_array_elements(mems) loop
    insert into group_members (group_id, member_key, name, short, color, initial, email, user_id)
    values (
      g->>'id', m->>'member_key', m->>'name', m->>'short', m->>'color', m->>'initial',
      -- al creador se le asegura su email (auth.email()) aunque no venga en el payload
      case when m->>'member_key' = creator_key then coalesce(nullif(m->>'email',''), auth.email())
           else nullif(m->>'email','') end,
      -- solo el creador queda vinculado a esta cuenta; al resto se lo vincula su propio login
      case when m->>'member_key' = creator_key then auth.uid()
           when lower(coalesce(m->>'email','')) = lower(auth.email()) then auth.uid()
           else null end
    )
    on conflict (group_id, member_key) do nothing;
  end loop;
end $$;
grant execute on function create_group(jsonb, jsonb, text) to authenticated;

-- ---------- Alias por usuario (cómo VOS llamás a cada persona) ----------
-- Se guarda en el perfil del que mira (privado, no cambia el nombre real de nadie).
-- RLS "own profile" ya existente permite leer/escribir solo el propio.
alter table profiles add column if not exists aliases jsonb default '{}'::jsonb;

-- ---------- Realtime para grupos y miembros ----------
-- Para que al crear un grupo / sumar a alguien, el otro dispositivo lo vea en vivo.
-- (Si ya estaban en la publicación, estos ALTER dan un error inofensivo: ignoralo.)
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
