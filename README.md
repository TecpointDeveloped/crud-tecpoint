# TECPOINT CRUD

Panel administrativo para catálogo, calidad de fichas, banners, promociones, integraciones, WhatsApp y ubicaciones de TECPOINT.

## Requisitos y desarrollo

- Node.js 20 LTS, pnpm 9 o superior y acceso autorizado a Firebase `tecpoint-2024`.
- Ejecute `pnpm install --frozen-lockfile` y `pnpm dev`.
- Abra `http://localhost:5173`; para OAuth use `localhost`, no `127.0.0.1`.

## Verificación obligatoria

Ejecute `pnpm lint` y `pnpm build`. La salida de producción se genera en `dist/`.

## Acceso y seguridad

- Firebase Authentication es la única fuente válida de sesión.
- Firestore y Storage vuelven a validar que el usuario sea administrador.
- Nunca agregue contraseñas, claves privadas, cuentas de servicio ni tokens secretos al repositorio.
- El `apiKey` del SDK web identifica el proyecto; la seguridad depende de Authentication, App Check y las reglas publicadas.

## Vercel

- Repositorio: `TecpointDeveloped/crud-tecpoint`.
- Producción: rama `main`, instalación `pnpm install`, compilación `pnpm build`, salida `dist`.
- Cada push genera un despliegue; confirme que finalice como **Ready**.

## Firebase

Las reglas están en `src/functions/firestore.rules` y `src/functions/storage.rules`. Una persona autenticada con permisos puede publicarlas con `firebase deploy --only firestore:rules,storage`. Este comando modifica los permisos reales: revise los cambios antes de ejecutarlo.

## Publicación de productos

Una ficha no está lista si falta SKU, UPC, nombre, slug, descripción suficiente, categoría, marca, precio o fotografía. Los SKU y UPC duplicados también se bloquean. El panel nunca debe inventar ni modificar automáticamente precios, existencias, SKU o UPC.
