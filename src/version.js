// Versión de la app (semver). Se actualiza bumpeando "version" en package.json.
// __APP_VERSION__ lo inyecta Vite en build/dev (ver vite.config.js).
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
