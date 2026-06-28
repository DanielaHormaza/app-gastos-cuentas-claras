# Propuestas para las tareas que necesitan tu decisión

Cada una espera una decisión tuya antes de implementar. Cuando vuelvas, elegimos y codeo.

---

## Sprint 4 — Modelo de datos (el backlog pide analizar y proponer antes de implementar)

### Modelo actual (resumen)
- **groups** → **group_members** (`member_key` ej. 'dani', `user_id` nullable, `email`, name/short/color/initial).
- **expenses** (`payer_key`, `mode`, `excluded[]`, `currency`, `cuota`, `future`) + **split_history** (reparto %
  por fecha) → la "parte" de cada uno se calcula con `shareFor()`.
- **categories**: globales (no por grupo).
- **messages**: chat compartido por grupo.
- `me` = `member_key` del usuario logueado (linkeado por email vía `claim_my_slots()`).
- Grupo **'personal'**: de un solo usuario, para gastos propios.

### Lo que el Sprint 4 ya tiene resuelto (parcial)
- **Personas sin cuenta:** el modelo YA lo soporta — un miembro es un slot con `user_id = null` y un `email`.
  Podés cargar gastos a su `payer_key` sin que tenga cuenta.
- **Vinculación automática:** YA existe vía `claim_my_slots()` — cuando esa persona se loguea con el email
  del slot, su `user_id` se linkea y "hereda" todos los gastos asociados a su `member_key`. ✅

### El gap real
- **Grupos y miembros NO se sincronizan a la nube todavía** (solo se sincronizan gastos, categorías, splits y
  chat). Hoy "añadir miembro" desde Config es **local**: no crea la fila en `group_members`, no le podés
  poner email, y por lo tanto esa persona no puede reclamar su lugar al loguearse.
- Crear un **grupo nuevo** tampoco persiste en la nube.

### Propuesta
1. **Sincronizar grupos + miembros** (cloud.js: `cloudUpsertGroup`, `cloudUpsertMember`; espejo en App.jsx).
   - Problema de RLS (huevo-gallina): la policy de `groups` es `is_group_member`, pero para crear un grupo
     todavía no sos miembro. Solución: función `create_group(...)` `security definer` que inserta el grupo y
     te agrega como primer miembro en una transacción. Lo mismo para invitar miembros (`add_member(gid, name, email)`).
2. **Alta de miembro con email** → habilita "persona sin cuenta" + vinculación automática end-to-end.
3. **Gastos personales:** ya andan con el grupo 'personal'. Falta sincronizarlo (hoy es per-device). Decidir:
   ¿los gastos personales son privados (solo vos) o parte del mismo modelo? Recomiendo privados → grupo
   'personal' por usuario con RLS `owner = auth.uid()`.
4. **Categorías por grupo** (resuelve Hallazgo 2 de seguridad): agregar `group_id` a `categories`.

**Decisiones que necesito de vos:**
- (a) ¿Gastos personales privados por usuario, o compartibles? (recomiendo privados)
- (b) ¿Categorías globales (como hoy) o por grupo? (recomiendo por grupo)
- (c) ¿Avanzamos con la sincronización de grupos/miembros vía funciones `security definer`?

---

## Sprint 2.4 — Invitaciones por link

**Opciones:**
- **A) Link de invitación a un grupo:** generás un link con un token; quien lo abre y se loguea se suma al
  grupo. Necesita tabla `invites` (token, group_id, member_key opcional, vencimiento) + función
  `redeem_invite(token)` `security definer` que linkea/crea el slot. Es la experiencia tipo Splitwise.
- **B) Link de instalación + unirse:** además del A, que el link instale la PWA y deje al usuario adentro.

**Recomiendo A** primero (B se apoya en A). **Necesito tu OK** para crear la tabla `invites` + función, y
decidir vencimiento (ej. 7 días) y si el invitado elige su slot o se crea uno nuevo.

---

## Sprint 2.5 — Recordatorios automáticos de deuda por email

**Qué necesita:** un proceso server-side (Supabase **Edge Function** + **cron**) que recorra deudas y mande
mails, más un proveedor SMTP propio (**Resend** es lo más simple y tiene free tier). El mail default de
Supabase es solo para auth, no sirve para esto.

**Decisiones:** frecuencia (¿semanal?), umbral de deuda mínima, y opt-out por usuario (columna en `profiles`).
**Necesito tu OK** para: crear cuenta Resend + API key, escribir la Edge Function y el cron.

---

## Sprint 5 — Rediseño tipo Splitwise (eje = persona, no grupo)

Cambio grande de navegación: hoy todo cuelga del **grupo**; el rediseño propone que el eje sea la **persona**
(ver "Juan" → chat, balance, gastos compartidos, grupos en común). Esto toca la navegación y varias pantallas.

**Mi recomendación:** hacerlo DESPUÉS del Sprint 4 (necesita el modelo de personas/membresía sincronizado).
Cuando lo encaremos, te llevo un wireframe de la nueva navegación antes de tocar código. **Necesita decisión
de diseño grande.**

---

## Sprint 6 — Inteligencia Artificial (en el chat)

Hoy el chat usa un **parser por reglas** (`parseChat`) que ya interpreta cosas como "8000 nafta pagó Juan",
detecta moneda, fecha, cuotas y maneja ambigüedad básica (pregunta el pagador). El Sprint 6 apunta a **IA
real (LLM)** para: lenguaje más libre, preguntar cuando falta info, gastos personales por chat, y varios
gastos en una conversación.

**Decisión clave:** usar un LLM (ej. Claude) implica una **API key** y costo por uso. Opciones:
- **A) Seguir mejorando el parser por reglas** (gratis, sin API): cubre más casos pero tiene techo.
- **B) Integrar un LLM** (Claude) con una API key tuya: mucho más flexible, pero hay que decidir dónde corre
  la key (Edge Function para no exponerla en el cliente) y el costo.

**Recomiendo B con la key en una Edge Function.** **Necesito tu decisión** (A o B) y, si es B, la API key
(personal, no la del trabajo) y el OK al costo.

---

## Resumen de decisiones pendientes
1. Sprint 4: (a) personales privados/compartibles, (b) categorías globales/por-grupo, (c) OK a sync de grupos/miembros.
2. Sprint 2.4: OK a tabla `invites` + parámetros.
3. Sprint 2.5: OK a Resend + Edge Function + frecuencia.
4. Sprint 5: sesión de diseño de la nueva navegación.
5. Sprint 6: parser-por-reglas (A) vs LLM (B) + API key.
