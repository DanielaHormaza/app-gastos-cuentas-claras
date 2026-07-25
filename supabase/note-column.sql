-- Descripción/nota por gasto (aparte del nombre).
-- El NOMBRE del movimiento sigue en la columna `description` (lo que se ve como título);
-- `note` es la descripción/nota opcional más larga que se edita en la hoja "Editar gasto".
-- Aditivo e idempotente. Correr una vez en Supabase → SQL Editor → Run.
--
-- IMPORTANTE: corré esto ANTES de deployar los cambios de "nombre + descripción". Sin la
-- columna, guardar un gasto que tenga nota fallaría al sincronizar (el resto sigue funcionando,
-- pero la nota no se guardaría en la nube).

alter table expenses add column if not exists note text;
