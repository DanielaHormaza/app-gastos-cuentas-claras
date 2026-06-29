-- Limpieza de categorías "basura" auto-creadas (una por cada texto: "lomo", "stacy", etc.)
-- y consolidación en una única categoría "Sin categoría".
--
-- Contexto: antes, cada gasto no reconocido inventaba una categoría nueva (id 'c' + timestamp,
-- ej. 'c1719876543210'). Las categorías legítimas tienen ids semánticos ('super', 'salida'…).
-- A partir de ahora el código manda los no reconocidos a 'sincat' y guarda el texto en
-- `description`. Este script arregla los datos VIEJOS. Es idempotente: se puede correr de nuevo.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y Run.

begin;

-- 1) Asegurar la categoría "Sin categoría".
insert into categories (id, icon, name)
values ('sincat', '🏷️', 'Sin categoría')
on conflict (id) do nothing;

-- 2) Preservar la etiqueta: si el gasto no tiene descripción, copiamos el nombre de su
--    categoría basura como descripción (así "Lomo" sigue visible como título del movimiento).
update expenses e
set description = c.name
from categories c
where e.category_id = c.id
  and c.id ~ '^c[0-9]+$'
  and (e.description is null or e.description = '');

-- 3) Reasignar esos gastos a "Sin categoría".
update expenses
set category_id = 'sincat'
where category_id ~ '^c[0-9]+$';

-- 4) Borrar las categorías basura auto-creadas (ya nadie las referencia).
delete from categories
where id ~ '^c[0-9]+$';

commit;

-- Verificación opcional (debería devolver 0 filas):
-- select * from categories where id ~ '^c[0-9]+$';
