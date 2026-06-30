-- ============================================================
-- Cuentas Claras — memoria de categorización manual
-- Guarda, por usuario, un mapeo "descripción → categoría" para autocompletar la categoría
-- de gastos futuros con la misma descripción. Pegar en Supabase → SQL Editor → Run.
-- Aditivo e idempotente. La policy "own profile" ya existente permite leer/escribir solo el propio.
-- ============================================================

alter table profiles add column if not exists cat_memory jsonb default '{}'::jsonb;
