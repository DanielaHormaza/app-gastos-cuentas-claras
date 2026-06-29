-- ============================================================
-- Cuentas Claras — archivar (persistente) y eliminar grupos
-- Pegar en Supabase → SQL Editor → Run (DESPUÉS de migration.sql y groups-sync.sql).
-- Es aditivo e idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

-- ---------- Columna nueva en groups ----------
-- archived : el grupo/1:1 está archivado (oculto de las listas activas, pero su saldo
--            sigue contando y sus movimientos se conservan). Antes era solo local; ahora
--            persiste y se sincroniza entre dispositivos.
alter table groups add column if not exists archived boolean default false;

-- ---------- Eliminar un grupo vacío ----------
-- La policy "member access" de groups ya permite DELETE si sos miembro, así que no hace falta
-- una función especial: la app borra con supabase.from('groups').delete().eq('id', gid).
-- El ON DELETE CASCADE de group_members / split_history / expenses / messages limpia el resto.
-- La app SOLO ofrece "Eliminar" cuando el grupo no tiene movimientos (si los tiene, se archiva).
