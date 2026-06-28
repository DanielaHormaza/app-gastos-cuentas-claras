-- ============================================================
-- Cuentas Claras — esquema + seguridad + datos iniciales
-- Generado por scripts/gen-supabase-sql.mjs. Pegar en Supabase → SQL Editor → Run.
-- ============================================================

-- ---------- TABLAS ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists categories (
  id text primary key,
  icon text,
  name text not null
);

create table if not exists groups (
  id text primary key,
  name text not null,
  initial text,
  gradient text,
  description text,
  personal boolean default false,
  created_at timestamptz default now()
);

create table if not exists group_members (
  id bigint generated always as identity primary key,
  group_id text references groups on delete cascade,
  member_key text not null,
  name text, short text, color text, initial text,
  user_id uuid references auth.users,
  unique (group_id, member_key)
);

create table if not exists split_history (
  id bigint generated always as identity primary key,
  group_id text references groups on delete cascade,
  from_date date not null,
  shares jsonb not null,
  changed_by text,
  changed_at timestamptz
);

create table if not exists expenses (
  id text primary key,
  group_id text references groups on delete cascade,
  kind text default 'expense',
  date date,
  time text,
  currency text default 'ARS',
  category_id text,
  description text,
  amount numeric,
  payer_key text,
  mode text default 'group',
  cuota jsonb,
  excluded jsonb,
  future boolean default false,
  from_key text, to_key text,
  created_by text, edited_by text, edited_at date,
  created_at timestamptz default now()
);
-- Para bases ya creadas (la columna de arriba solo aplica en instalaciones nuevas):
alter table expenses add column if not exists excluded jsonb;

-- Mensajes del chat: historial COMPARTIDO por grupo (todos ven lo mismo en tiempo real).
create table if not exists messages (
  id text primary key,
  group_id text references groups on delete cascade,
  role text,
  kind text,
  text text,
  exp_id text,
  by_name text,
  date text,
  time text,
  created_at timestamptz default now()
);
alter table messages enable row level security;
drop policy if exists "messages member access" on messages;
create policy "messages member access" on messages for all using (is_group_member(group_id)) with check (is_group_member(group_id));
-- Realtime para el chat (si ya estaba agregada, este ALTER da error inofensivo: ignoralo).
alter publication supabase_realtime add table messages;

-- Insignia "Usuario Fundador": número correlativo PERMANENTE por usuario.
alter table profiles add column if not exists founder_number int;
-- Backfill de los usuarios existentes por antigüedad (el más viejo = #1 → Dani #1, Juan #2).
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as n from profiles
)
update profiles p set founder_number = o.n from ordered o where p.id = o.id and p.founder_number is null;
create unique index if not exists profiles_founder_number_key on profiles(founder_number);
-- Asigna el siguiente número al primer login de un usuario sin número (atómico, sin huecos).
create or replace function ensure_founder_number() returns int
language plpgsql security definer as $$
declare n int;
begin
  select founder_number into n from profiles where id = auth.uid();
  if n is not null then return n; end if;
  update profiles set founder_number = (select coalesce(max(founder_number), 0) + 1 from profiles)
    where id = auth.uid() and founder_number is null;
  select founder_number into n from profiles where id = auth.uid();
  return n;
end $$;
grant execute on function ensure_founder_number() to authenticated;

-- ---------- SEGURIDAD (RLS) ----------
alter table profiles enable row level security;
alter table categories enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table split_history enable row level security;
alter table expenses enable row level security;

-- ¿el usuario logueado es miembro de este grupo?
create or replace function is_group_member(gid text)
returns boolean language sql security definer stable as $$
  select exists(select 1 from group_members gm where gm.group_id = gid and gm.user_id = auth.uid());
$$;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "cat read" on categories;
create policy "cat read" on categories for select using (auth.role() = 'authenticated');
drop policy if exists "cat write" on categories;
create policy "cat write" on categories for insert with check (auth.role() = 'authenticated');
drop policy if exists "cat update" on categories;
create policy "cat update" on categories for update using (auth.role() = 'authenticated');

drop policy if exists "member access" on groups;
create policy "member access" on groups for all using (is_group_member(id)) with check (is_group_member(id));
drop policy if exists "member access" on group_members;
create policy "member access" on group_members for all using (is_group_member(group_id)) with check (is_group_member(group_id));
drop policy if exists "member access" on split_history;
create policy "member access" on split_history for all using (is_group_member(group_id)) with check (is_group_member(group_id));
drop policy if exists "member access" on expenses;
create policy "member access" on expenses for all using (is_group_member(group_id)) with check (is_group_member(group_id));

-- ---------- DATOS ----------
-- Categorías
insert into categories (id, icon, name) values ('salida', '🍽️', 'Salida / Delivery') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('super', '🛒', 'Supermercado') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('servicios', '💡', 'Servicios') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('ocio', '🎬', 'Ocio') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('transporte', '🚕', 'Transporte') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('regalos', '🎁', 'Regalos') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('alquiler', '🏠', 'Alquiler') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('viaje', '✈️', 'Viaje') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('salud', '💊', 'Salud') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('otro', '🏷️', 'Otro') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('inicial', '⚖️', 'Saldo inicial') on conflict (id) do nothing;
insert into categories (id, icon, name) values ('transfer', '🔁', 'Pagos y transferencias') on conflict (id) do nothing;

-- Grupos
insert into groups (id, name, initial, gradient, description, personal) values ('pareja', 'Juan', 'J', 'linear-gradient(135deg,#3B82F6,#7C3AED)', 'Gastos compartidos con Juan.', false) on conflict (id) do nothing;
insert into groups (id, name, initial, gradient, description, personal) values ('personal', 'Mis gastos', '🧾', 'linear-gradient(135deg,#2ECCB1,#7C3AED)', 'Tus gastos individuales.', true) on conflict (id) do nothing;

-- Miembros (user_id queda NULL hasta que cada persona inicie sesión y reclame su lugar)
insert into group_members (group_id, member_key, name, short, color, initial) values ('pareja', 'dani', 'Dani (vos)', 'Dani', '#7C3AED', 'D') on conflict (group_id, member_key) do nothing;
insert into group_members (group_id, member_key, name, short, color, initial) values ('pareja', 'juan', 'Juan', 'Juan', '#3B82F6', 'J') on conflict (group_id, member_key) do nothing;
insert into group_members (group_id, member_key, name, short, color, initial) values ('personal', 'dani', 'Dani (vos)', 'Dani', '#7C3AED', 'D') on conflict (group_id, member_key) do nothing;

-- Reparto inicial (régimen vigente desde siempre)
insert into split_history (group_id, from_date, shares) values ('pareja', '2000-01-01', '{"dani":60,"juan":40}'::jsonb);
insert into split_history (group_id, from_date, shares) values ('personal', '2000-01-01', '{"dani":100}'::jsonb);

-- Movimientos
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc001', 'pareja', 'expense', '2026-10-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 6/6', 205533.33, 'dani', 'group', '{"n":6,"total":6}'::jsonb, true, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc002', 'pareja', 'expense', '2026-09-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 5/6', 205533.33, 'dani', 'group', '{"n":5,"total":6}'::jsonb, true, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc003', 'pareja', 'expense', '2026-08-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 4/6', 205533.33, 'dani', 'group', '{"n":4,"total":6}'::jsonb, true, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc004', 'pareja', 'expense', '2026-07-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 3/6', 205533.33, 'dani', 'group', '{"n":3,"total":6}'::jsonb, true, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc005', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'otro', 'ibuprofeno + gel', 15000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc006', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'salida', 'pizza', 8000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc007', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'ocio', 'cancha', 9000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc008', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'ocio', 'canchas', 9000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc009', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'servicios', 'edemsa', 48033, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc010', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'otro', 'lomo pedidos ya', 25000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc011', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'super', 'vea', 123000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc012', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'salida', 'Stacy', 25000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc013', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'salida', 'merienda faro bristo', 24600, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc014', 'pareja', 'expense', '2026-06-15', null, 'ARS', 'otro', 'bazar chino', 31500, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc015', 'pareja', 'expense', '2026-06-07', null, 'ARS', 'salida', 'cafesito shark', 24200, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc016', 'pareja', 'expense', '2026-06-07', null, 'ARS', 'super', 'queso rallado', 6000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc017', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'salida', 'empanadas', 28590, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc018', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'servicios', 'ecogas', 13201, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc019', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'ocio', 'cine', 20000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc020', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'salida', 'McDonald', 19700, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc021', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'super', 'vea', 85000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc022', 'pareja', 'expense', '2026-06-01', null, 'USD', 'salida', 'Lint chocolates chile', 31, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc023', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'transporte', 'taxi aeropuerto chile', 20000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc024', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'super', 'Forros/preservativos chile', 9000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc025', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'salida', 'cena chile', 63470, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc026', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'transporte', 'Uber aeropuerto chile', 19684, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc027', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'transporte', 'Uber ida outlet chile', 12614, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc028', 'pareja', 'expense', '2026-06-01', null, 'CLP', 'transporte', 'Uber vuelta outlet chile', 15797, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc029', 'pareja', 'expense', '2026-06-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 2/6', 205533.33, 'dani', 'group', '{"n":2,"total":6}'::jsonb, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc030', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'Pizza', 8000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc031', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'regalos', 'regalo Valen dables', 51000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc032', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'transporte', 'Uber', 9000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc033', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'transporte', 'Uber', 17000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc034', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'McDonald’s', 18100, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc035', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'helado', 20145, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc036', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'facturas', 2800, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc037', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'jugo', 4000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc038', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'servicios', 'ecogas', 13131, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc039', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'vea', 70700, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc040', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'Carniceria', 88000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc041', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'transporte', 'uber', 3300, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc042', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'ocio', 'cancha futbol', 8000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc043', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'pizza', 27000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc044', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'hamburguesas', 29400, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc045', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'alquiler', 'alquiler', 890000, 'dani', 'settled', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc046', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'Carrefour', 33525, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc047', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'servicios', 'edemsa', 76615, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc048', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'Carrefour', 94719, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc049', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'almacén', 8000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc050', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'comida', 37000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc051', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'postres', 19000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc052', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'tragos', 50000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc053', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'propina', 7000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc054', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'transporte', 'Uber', 4000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc055', 'pareja', 'expense', '2026-05-01', null, 'USD', 'transporte', 'Pasaje ida chile', 171, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc056', 'pareja', 'expense', '2026-05-01', null, 'USD', 'transporte', 'Pasaje vuelta chile', 94, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc057', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'el patio', 36500, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc058', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'burguers', 22225, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc059', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'servicios', 'ecogas', 15673, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc060', 'pareja', 'expense', '2026-05-01', null, 'USD', 'viaje', 'airbnb', 123, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc061', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'merienda parque', 32450, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc062', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'Carrefour', 20896, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc063', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'pizza', 8000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc064', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'McDonald’s', 18900, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc065', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'ocio', 'cine', 17000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc066', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'bebidas', 8500, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc067', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'transporte', 'Uber ida y vuelta', 12000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc068', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'super', 'Carrefour', 38000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc069', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'cookie pistacho', 3900, 'dani', 'full_theirs', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc070', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'sushi', 31200, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc071', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'salida', 'almuerzo', 44000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc072', 'pareja', 'expense', '2026-05-01', null, 'ARS', 'viaje', 'pases snowboard Ushuaia cuota 1/6', 205533.33, 'dani', 'group', '{"n":1,"total":6}'::jsonb, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc073', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'transporte', 'Uber', 12900, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc074', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'salida', 'citick + chocolate', 14700, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc075', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'medialunas', 3000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc076', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'Carniceria', 16645, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc077', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'queso', 8100, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc078', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'servicios', 'edemsa', 76615, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc079', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'salida', 'pizza', 26000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc080', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'salida', 'Stacy burguer', 29000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc081', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'medialunas', 4200, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc082', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'pollo', 9500, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc083', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'papas', 1400, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc084', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'medialunas', 4900, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc085', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'kiosco', 12200, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc086', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'queso almacén', 6270, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc087', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'cuadril', 18915, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc088', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'Carrefour', 96408, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc089', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'Vea', 20000, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc090', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'queso', 9900, 'dani', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc091', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'salida', 'café parque', 38000, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc092', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'salud', 'farmacia', 22468, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('cc093', 'pareja', 'expense', '2026-04-01', null, 'ARS', 'super', 'carnicería', 77450, 'juan', 'group', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('open-ars', 'pareja', 'expense', '2026-03-31', null, 'ARS', 'inicial', 'Saldo inicial (Splitwise)', 206990, 'dani', 'full_theirs', null, false, null, null, null, null, null) on conflict (id) do nothing;
insert into expenses (id, group_id, kind, date, time, currency, category_id, description, amount, payer_key, mode, cuota, future, from_key, to_key, created_by, edited_by, edited_at) values ('open-usd', 'pareja', 'expense', '2026-03-31', null, 'USD', 'inicial', 'Saldo inicial (Splitwise)', 115, 'dani', 'full_theirs', null, false, null, null, null, null, null) on conflict (id) do nothing;

-- Listo. Próximo paso: auth + reclamar tu lugar de miembro.