# Sprint 7 — Revisión de seguridad

Revisión de autenticación, permisos, reglas de acceso (RLS) y protección de datos.
Fecha: sesión jun 2026. Rama `redesign/cuentas-claras`.

## Resumen

| Área | Estado |
|---|---|
| Autenticación (OTP + sesión) | ✅ OK |
| Exposición en el cliente (secretos / XSS / logs) | ✅ OK |
| RLS — expenses / split_history / messages | ✅ OK (bien scopeadas por grupo) |
| RLS — `group_members` (escritura abierta a miembros) | ⚠️ Hardening recomendado |
| RLS — `categories` (lectura/escritura global) | ⚠️ Bajo riesgo |

No encontré vulnerabilidades críticas. Hay 2 oportunidades de endurecimiento (abajo) que requieren
correr SQL en Supabase **y** probar con 2 usuarios, por eso las dejo documentadas y no aplicadas.

---

## Lo que está bien

- **Auth:** login por código OTP de 6 dígitos (`verifyOtp`), sin contraseñas. `detectSessionInUrl:false`
  evita que el token viaje en la URL (mejor que magic link). Sesión persistida en localStorage con
  auto-refresh. Rate limiting lo maneja Supabase del lado server.
- **Anon key en el cliente:** es pública por diseño; el acceso real lo controla RLS. Correcto.
- **Sin secretos en el código:** `.env` gitignored, no hay service_role ni claves hardcodeadas.
- **Sin XSS:** no se usa `dangerouslySetInnerHTML`/`innerHTML`/`eval`. React escapa el texto de los
  mensajes del chat por defecto, así que el contenido que escriben los usuarios es seguro al renderizar.
- **Sin logs sensibles:** no se loguean tokens, sesiones ni emails a consola.
- **`is_group_member()`** es `security definer stable` → evita recursión de RLS. Correcto.
- **`claim_my_slots()`** solo vincula slots cuyo `email = auth.email()` y `user_id is null`: un usuario
  solo puede reclamar lugares pre-asignados a SU email. Correcto.
- **`profiles`:** policy `id = auth.uid()` → cada uno solo ve/edita su propio perfil. Los nombres de los
  demás se muestran desde `group_members.name`, no desde `profiles` (no hay fuga de perfiles ajenos).
- **`me` del cliente** se deriva del server (`group_members.user_id` linkeado por claim). Aunque un cliente
  malicioso falsee `state.me`, RLS sigue controlando el acceso real a los datos: `me` solo cambia la
  perspectiva de cálculo/visualización, no los permisos.
- **expenses / split_history / messages:** policy `is_group_member(group_id)` → cada uno accede solo a los
  datos de SUS grupos. Que cualquier miembro pueda editar/borrar gastos del grupo es esperado en una app
  de gastos compartidos (modelo tipo Splitwise) y queda registrado con `editedBy`.

---

## ⚠️ Hallazgo 1 — `group_members` permite que un miembro modifique la membresía (medio)

La policy actual es `for all` (SELECT/INSERT/UPDATE/DELETE) con `is_group_member(group_id)`. Eso significa
que **cualquier miembro del grupo** puede insertar, editar o borrar filas de `group_members` de ese grupo,
incluyendo cambiar el `user_id` o el `email` de OTRO miembro.

**Riesgo:** un miembro malicioso podría, por ejemplo, cambiar el `email` del slot de otra persona o
insertar slots; en combinación con el claim, podría intentar secuestrar un lugar. El impacto está acotado
a personas que YA son miembros del grupo (entorno semi-confiable: parejas/grupos chicos), pero conviene
endurecerlo.

**Remediación sugerida** (correr en Supabase, *probar con 2 usuarios después*): separar lectura de
escritura y bloquear que un miembro toque a otro. Ejemplo conservador — lectura para miembros, y escritura
solo del propio slot:

```sql
drop policy if exists "member access" on group_members;
-- leer: cualquier miembro del grupo ve la lista de miembros
create policy "gm read" on group_members for select using (is_group_member(group_id));
-- modificar: solo tu propio slot (el que ya está linkeado a vos)
create policy "gm update own" on group_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
```

> Nota: esto deja el ALTA de miembros nuevos en manos del flujo de "añadir miembro" (que hoy es local y
> todavía no sincroniza — ver Sprint 4). Cuando se implemente el alta sincronizada, conviene hacerla vía
> una función `security definer` controlada en vez de INSERT directo. Por eso recomiendo aplicar este
> hardening **junto con** el trabajo de Sprint 4, no aislado (podría bloquear el alta si se hace antes).

## ⚠️ Hallazgo 2 — `categories` es global y editable por cualquier autenticado (bajo)

Las policies `cat read/write/update` usan `auth.role() = 'authenticated'`: todas las categorías son globales
(no por grupo) y cualquier usuario logueado puede leerlas, crearlas y renombrarlas.

**Riesgo:** bajo. Las categorías son etiquetas genéricas (ícono + nombre), no datos financieros. Pero:
(a) un usuario ve nombres de categorías creadas por otros (que podrían ser descriptivos/sensibles, ej.
"Regalo sorpresa Juan"); (b) cualquiera puede renombrar una categoría que afecta a todos.

**Remediación:** la solución correcta es **scopear categorías por grupo** (agregar `group_id` y usar
`is_group_member`). Eso es un cambio de modelo que encaja con Sprint 4, así que lo dejo para ahí. Mitigación
mínima mientras tanto: quitar el UPDATE global para que nadie pueda renombrar categorías ajenas:

```sql
drop policy if exists "cat update" on categories;
-- (sin policy de update: nadie renombra categorías existentes; solo se crean/leen)
```

---

## Recomendaciones priorizadas

1. **Aplicar Hallazgo 1 junto con el alta de miembros sincronizada (Sprint 4).** Hoy el riesgo real es
   bajo porque el alta de miembros es local; pero antes de sincronizar membresía, dejar el hardening listo.
2. **Scopear `categories` por grupo (Sprint 4).** Resuelve el Hallazgo 2 de raíz.
3. **Mantener el flujo OTP** (ya hecho): es más seguro que magic link y más robusto en iOS.

Nada de esto bloquea el uso actual de la app.
