-- Moneda por defecto por usuario (la que se usa al cargar un gasto sin aclarar otra).
-- Se guarda en el perfil → sigue al usuario entre dispositivos. SIN conversión entre monedas.
-- Correr en Supabase → SQL Editor → Run. Aditivo e idempotente.

alter table profiles add column if not exists currency text default 'ARS';

-- Backfill: cualquier perfil sin moneda definida queda en ARS.
update profiles set currency = 'ARS' where currency is null;
