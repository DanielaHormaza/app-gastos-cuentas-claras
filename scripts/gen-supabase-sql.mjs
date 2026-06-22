/**
 * Genera supabase/migration.sql a partir del estado real de la app:
 * esquema (tablas) + seguridad (RLS) + tus datos (grupo, miembros, reparto, 95 movimientos).
 * Uso: node scripts/gen-supabase-sql.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { PAREJA_LEDGER } from '../src/cc/seedPareja.js'

// Datos espejo de initialState.js (inline para poder correr en Node sin resolver imports de Vite).
const s = {
  categories: [
    { id: 'salida', icon: '🍽️', name: 'Salida / Delivery' },
    { id: 'super', icon: '🛒', name: 'Supermercado' },
    { id: 'servicios', icon: '💡', name: 'Servicios' },
    { id: 'ocio', icon: '🎬', name: 'Ocio' },
    { id: 'transporte', icon: '🚕', name: 'Transporte' },
    { id: 'regalos', icon: '🎁', name: 'Regalos' },
    { id: 'alquiler', icon: '🏠', name: 'Alquiler' },
    { id: 'viaje', icon: '✈️', name: 'Viaje' },
    { id: 'salud', icon: '💊', name: 'Salud' },
    { id: 'otro', icon: '🏷️', name: 'Otro' },
    { id: 'inicial', icon: '⚖️', name: 'Saldo inicial' },
    { id: 'transfer', icon: '🔁', name: 'Pagos y transferencias' },
  ],
  groups: {
    pareja: {
      id: 'pareja', name: 'Juan', initial: 'J', gradient: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
      description: 'Gastos compartidos con Juan.', personal: false,
      members: [
        { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
        { id: 'juan', name: 'Juan', short: 'Juan', color: '#3B82F6', initial: 'J' },
      ],
    },
    personal: {
      id: 'personal', name: 'Mis gastos', initial: '🧾', gradient: 'linear-gradient(135deg,#2ECCB1,#7C3AED)',
      description: 'Tus gastos individuales.', personal: true,
      members: [{ id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' }],
    },
  },
  splits: { pareja: { dani: 60, juan: 40 }, personal: { dani: 100 } },
  ledgers: { pareja: PAREJA_LEDGER, personal: [] },
}
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const num = (v) => (v === null || v === undefined ? 'null' : Number(v))
const bool = (v) => (v ? 'true' : 'false')
const json = (v) => (v === null || v === undefined ? 'null' : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`)

const out = []
const P = (line = '') => out.push(line)

P(`-- ============================================================`)
P(`-- Cuentas Claras — esquema + seguridad + datos iniciales`)
P(`-- Generado por scripts/gen-supabase-sql.mjs. Pegar en Supabase → SQL Editor → Run.`)
P(`-- ============================================================`)
P()
P(`-- ---------- TABLAS ----------`)
P(`create table if not exists profiles (`)
P(`  id uuid primary key references auth.users on delete cascade,`)
P(`  name text not null,`)
P(`  created_at timestamptz default now()`)
P(`);`)
P()
P(`create table if not exists categories (`)
P(`  id text primary key,`)
P(`  icon text,`)
P(`  name text not null`)
P(`);`)
P()
P(`create table if not exists groups (`)
P(`  id text primary key,`)
P(`  name text not null,`)
P(`  initial text,`)
P(`  gradient text,`)
P(`  description text,`)
P(`  personal boolean default false,`)
P(`  created_at timestamptz default now()`)
P(`);`)
P()
P(`create table if not exists group_members (`)
P(`  id bigint generated always as identity primary key,`)
P(`  group_id text references groups on delete cascade,`)
P(`  member_key text not null,`)
P(`  name text, short text, color text, initial text,`)
P(`  user_id uuid references auth.users,`)
P(`  unique (group_id, member_key)`)
P(`);`)
P()
P(`create table if not exists split_history (`)
P(`  id bigint generated always as identity primary key,`)
P(`  group_id text references groups on delete cascade,`)
P(`  from_date date not null,`)
P(`  shares jsonb not null,`)
P(`  changed_by text,`)
P(`  changed_at timestamptz`)
P(`);`)
P()
P(`create table if not exists expenses (`)
P(`  id text primary key,`)
P(`  group_id text references groups on delete cascade,`)
P(`  kind text default 'expense',`)
P(`  date date,`)
P(`  time text,`)
P(`  currency text default 'ARS',`)
P(`  category_id text,`)
P(`  description text,`)
P(`  amount numeric,`)
P(`  payer_key text,`)
P(`  mode text default 'group',`)
P(`  cuota jsonb,`)
P(`  future boolean default false,`)
P(`  from_key text, to_key text,`)
P(`  created_by text, edited_by text, edited_at date,`)
P(`  created_at timestamptz default now()`)
P(`);`)
P()
P(`-- ---------- SEGURIDAD (RLS) ----------`)
P(`alter table profiles enable row level security;`)
P(`alter table categories enable row level security;`)
P(`alter table groups enable row level security;`)
P(`alter table group_members enable row level security;`)
P(`alter table split_history enable row level security;`)
P(`alter table expenses enable row level security;`)
P()
P(`-- ¿el usuario logueado es miembro de este grupo?`)
P(`create or replace function is_group_member(gid text)`)
P(`returns boolean language sql security definer stable as $$`)
P(`  select exists(select 1 from group_members gm where gm.group_id = gid and gm.user_id = auth.uid());`)
P(`$$;`)
P()
P(`drop policy if exists "own profile" on profiles;`)
P(`create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());`)
P()
P(`drop policy if exists "cat read" on categories;`)
P(`create policy "cat read" on categories for select using (auth.role() = 'authenticated');`)
P(`drop policy if exists "cat write" on categories;`)
P(`create policy "cat write" on categories for insert with check (auth.role() = 'authenticated');`)
P(`drop policy if exists "cat update" on categories;`)
P(`create policy "cat update" on categories for update using (auth.role() = 'authenticated');`)
P()
for (const t of ['groups', 'group_members', 'split_history', 'expenses']) {
  const col = t === 'groups' ? 'id' : 'group_id'
  P(`drop policy if exists "member access" on ${t};`)
  P(`create policy "member access" on ${t} for all using (is_group_member(${col})) with check (is_group_member(${col}));`)
}
P()
P(`-- ---------- DATOS ----------`)
P(`-- Categorías`)
for (const c of s.categories) {
  P(`insert into categories (id, icon, name) values (${q(c.id)}, ${q(c.icon)}, ${q(c.name)}) on conflict (id) do nothing;`)
}
P()
P(`-- Grupos`)
for (const gid of Object.keys(s.groups)) {
  const g = s.groups[gid]
  P(`insert into groups (id, name, initial, gradient, description, personal) values (${q(g.id)}, ${q(g.name)}, ${q(g.initial)}, ${q(g.gradient)}, ${q(g.description)}, ${bool(g.personal)}) on conflict (id) do nothing;`)
}
P()
P(`-- Miembros (user_id queda NULL hasta que cada persona inicie sesión y reclame su lugar)`)
for (const gid of Object.keys(s.groups)) {
  for (const m of s.groups[gid].members) {
    P(`insert into group_members (group_id, member_key, name, short, color, initial) values (${q(gid)}, ${q(m.id)}, ${q(m.name)}, ${q(m.short)}, ${q(m.color)}, ${q(m.initial)}) on conflict (group_id, member_key) do nothing;`)
  }
}
P()
P(`-- Reparto inicial (régimen vigente desde siempre)`)
for (const gid of Object.keys(s.splits)) {
  P(`insert into split_history (group_id, from_date, shares) values (${q(gid)}, '2000-01-01', ${json(s.splits[gid])});`)
}
P()
P(`-- Movimientos`)
for (const gid of Object.keys(s.ledgers)) {
  for (const e of s.ledgers[gid]) {
    const cols = ['id', 'group_id', 'kind', 'date', 'time', 'currency', 'category_id', 'description', 'amount', 'payer_key', 'mode', 'cuota', 'future', 'from_key', 'to_key', 'created_by', 'edited_by', 'edited_at']
    const vals = [
      q(e.id), q(gid), q(e.kind || 'expense'), q(e.date), q(e.time), q(e.currency || 'ARS'),
      q(e.categoryId), q(e.desc), num(e.amount), q(e.payerId), q(e.mode || 'group'),
      json(e.cuota), bool(e.future), q(e.from), q(e.to), q(e.createdBy), q(e.editedBy), q(e.editedAt),
    ]
    P(`insert into expenses (${cols.join(', ')}) values (${vals.join(', ')}) on conflict (id) do nothing;`)
  }
}
P()
P(`-- Listo. Próximo paso: auth + reclamar tu lugar de miembro.`)

mkdirSync('supabase', { recursive: true })
writeFileSync('supabase/migration.sql', out.join('\n'))
console.log('OK: supabase/migration.sql (' + out.length + ' líneas)')
