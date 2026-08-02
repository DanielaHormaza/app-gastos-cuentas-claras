# Cuentas Claras — contexto del proyecto

**Este es un proyecto PERSONAL.** No mezclar con nada de trabajo (Pura Mente / DanielaPuramente).

## Cuentas a usar (siempre las personales)

- **GitHub:** `DanielaHormaza` (repo privado `DanielaHormaza/app-gastos-cuentas-claras`).
  - `gh` suele quedar con `DanielaPuramente` (trabajo) activa. Antes de pushear o usar `gh`:
    ```bash
    gh auth switch --user DanielaHormaza
    ```
- **Vercel:** cuenta personal. App en producción: https://cuentas-claras-lovat.vercel.app
- **Supabase:** proyecto `eglksqqevwpfuvboxxkb` (región São Paulo), personal.
- **OpenAI (IA del chat, cuando se active):** cuenta personal + saldo prepago propio, NO la del trabajo.

## Git / deploy

- Rama de producción: **`redesign/cuentas-claras`**. Push a esa rama = auto-deploy en Vercel.
- Flujo preferido: **commits directos a `redesign/cuentas-claras`**, sin PRs (proyecto personal).
- Email de commits (obligatorio, si no Vercel bloquea el deploy):
  `84357671+DanielaHormaza@users.noreply.github.com` · nombre `Daniela Hormaza`.

## Stack

- Vite + React (sin framework). Código nuevo en `src/cc/`. `App.jsx` = máquina de estados.
- Persistencia: Supabase (con espejo desde localStorage). Cliente en `src/supabase.js` / `src/cloud.js`.
- `.env`, `.claude/` y `design_handoff*` están gitignoreados.
