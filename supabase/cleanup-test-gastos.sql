-- Limpieza one-time de gastos de PRUEBA en el grupo 'pareja' (Juan).
-- Objetivo: borrar el/los "Lavarropas" de $120.000 en 12 cuotas y el "Gasto" de $100.000
-- que se cargaron para probar. Correlo en Supabase → SQL Editor.
--
-- IMPORTANTE: corré PRIMERO el paso 1 (SELECT) y mirá que la lista sea EXACTAMENTE
-- lo que querés borrar. Recién ahí corré el paso 2 y el paso 3.

-- ─────────────────────────────────────────────────────────────
-- PASO 1 — PREVIEW: mostrá qué se va a borrar (no borra nada).
-- ─────────────────────────────────────────────────────────────
select id, date, description, amount, cuota, future
from expenses
where group_id = 'pareja'
  and (
    (description = 'Lavarropas' and amount = 120000) or
    (description = 'Gasto'      and amount = 100000)
  )
order by description, date;

-- ─────────────────────────────────────────────────────────────
-- PASO 2 — BORRAR los gastos (todas las cuotas de esos planes).
-- ─────────────────────────────────────────────────────────────
delete from expenses
where group_id = 'pareja'
  and (
    (description = 'Lavarropas' and amount = 120000) or
    (description = 'Gasto'      and amount = 100000)
  );

-- ─────────────────────────────────────────────────────────────
-- PASO 3 — Limpiar del chat las tarjetas ("Gasto guardado"/"Gasto eliminado")
-- que quedaron apuntando a gastos que ya no existen (evita tarjetas huérfanas).
-- Los mensajes de texto tuyos que escribiste ("120000 lavarropas…") NO se tocan;
-- si molestan, se borran con long-press en la app.
-- ─────────────────────────────────────────────────────────────
delete from messages m
where m.group_id = 'pareja'
  and m.exp_id is not null
  and not exists (select 1 from expenses e where e.id = m.exp_id);
