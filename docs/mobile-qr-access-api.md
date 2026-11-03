# Acceso al gimnasio mediante QR — API para móvil

Implementación exclusivamente de backend. Expo/React Native consume esta API y
convierte el token en una imagen QR. No se requieren cambios en Mercado Pago,
pagos manuales ni activación de membresías.

## Autenticación y flujo

Base: `https://TU-BACKEND/api/access`. Usar HTTPS en entornos publicados.
Enviar `Authorization: Bearer JWT_DE_SESION` en **todos** los endpoints.
El JWT debe pertenecer a una sesión existente, vigente y no revocada. Se usan
`requireAuth`, `checkBlacklist` y `authorizeRole` existentes, más una comprobación
de sesión que verifica que corresponde al mismo usuario. El rol se obtiene de
la base, no del JWT ni del JSON enviado por la aplicación.

1. El cliente inicia sesión con el flujo de autenticación actual.
2. Solicita `POST /qr` cuando abre su pase de acceso.
3. La aplicación representa únicamente el `token` como QR y muestra su caducidad.
4. El administrador inicia sesión en su propia cuenta, lee el QR y envía su
   contenido a `POST /scan` con el JWT **del administrador**.
5. Solo una respuesta `200` con `accessGranted: true` confirma una entrada.
6. Cada entrada requiere un token nuevo. No conceder acceso localmente si hay
   errores de red, de servidor o de autenticación.

El token QR es opaco, aleatorio (32 bytes/256 bits, base64url, 43 caracteres),
válido durante **60 segundos** desde su emisión y de **un solo uso**. No es un JWT
ni contiene nombre, correo, contraseña, datos de pago o información de sesión.
Solo se guarda su hash SHA-256 en la base. Todas las respuestas llevan
`Cache-Control: no-store`.

## Endpoints

| Método y ruta | Rol | Finalidad |
| --- | --- | --- |
| `POST /api/access/qr` | `cliente` | Obtener un token personal temporal |
| `POST /api/access/scan` | `administrador` | Validar el QR y registrar una entrada |
| `GET /api/access/me/history` | `cliente` | Consultar exclusivamente las entradas propias |
| `GET /api/access/admin/history` | `administrador` | Consultar todas las entradas |

`entrenador` no tiene acceso a estas rutas. Un administrador tampoco puede usar
el endpoint de generación para fabricar pases de otras cuentas.

### POST /api/access/qr

No requiere cuerpo; puede enviarse `{}`. El servidor toma el usuario del JWT.
`userId`, `subscriptionId`, estado y fechas que mande el cliente no se utilizan.

Respuesta **201**:

```json
{
  "ok": true,
  "token": "hG5Wa8zF1rD0vQ3uN9bK2sC7eL4mP6xT8yJ0aR5dVUw",
  "expiresAt": "2026-11-03T21:01:00.000Z",
  "subscription": {
    "status": "active",
    "endsAt": "2026-12-03"
  }
}
```

Sin membresía vigente: **403**, `MEMBERSHIP_REQUIRED`.
No guardar el token en almacenamiento persistente, analítica ni logs. Renovarlo
al caducar o al volver a abrir la pantalla; el backend no devuelve imágenes.
Obtener otro token no cambia los 60 segundos de validez de uno ya emitido.

### POST /api/access/scan

Enviar `Content-Type: application/json`:

```json
{ "token": "hG5Wa8zF1rD0vQ3uN9bK2sC7eL4mP6xT8yJ0aR5dVUw" }
```

Respuesta **200**:

```json
{
  "ok": true,
  "accessGranted": true,
  "message": "Acceso permitido",
  "access": {
    "id": "25ae449c-b5ab-4b45-9be3-3fd7602a659a",
    "userId": "b2ec5cc4-2186-4f87-bcff-b2240678f907",
    "scannedAt": "2026-11-03T21:00:20.000Z",
    "subscriptionStatus": "active"
  }
}
```

El backend busca el hash, bloquea la fila del token con `FOR UPDATE` y vuelve a
leer la suscripción original bajo bloqueo. Comprueba otra vez la caducidad
después de esperar los bloqueos. Inserta la entrada y marca `usedAt` dentro de
una transacción `READ COMMITTED`; responde con éxito después del commit.
Un índice único sobre `GymAccessLogs.qrTokenId` agrega protección contra duplicados.

Dos escaneos del mismo QR producen una entrada: el segundo recibe **409**.
Si la suscripción usada para emitirlo se canceló o venció, se rechaza el acceso;
no se sustituye silenciosamente por otra suscripción. No se permite autoescaneo.
Un fallo en cualquier escritura revierte tanto la entrada como el consumo del QR.

Si se pierde la respuesta después del commit, un reintento puede recibir
`QR_ALREADY_USED`; consultar el historial para confirmar la entrada. Un rechazo
no crea una entrada en el historial ni consume el token.

### GET /api/access/me/history

Parámetros opcionales: `page` (por defecto 1), `limit` (20, máximo 100), `from` y
`to` (`YYYY-MM-DD`). Los días del filtro son UTC e inclusivos.
El filtro de propietario siempre es el usuario autenticado: un `userId` enviado
en la consulta se ignora y jamás permite consultar a otra persona.

Ejemplo: `/api/access/me/history?page=1&limit=20`.

### GET /api/access/admin/history

Misma paginación y filtros. Por ejemplo:
`/api/access/admin/history?from=2026-11-01&to=2026-11-03&page=1&limit=50`.

Respuesta **200** de ambos historiales:

```json
{
  "ok": true,
  "history": [
    {
      "id": "25ae449c-b5ab-4b45-9be3-3fd7602a659a",
      "userId": "b2ec5cc4-2186-4f87-bcff-b2240678f907",
      "subscriptionId": "14257730-455a-4ea0-a989-dba527867b41",
      "scannedBy": "07489b9b-cf1f-41c9-b494-f17d63aa7810",
      "scannedAt": "2026-11-03T21:00:20.000Z",
      "result": "granted"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Orden: fecha descendente, luego UUID descendente para desempatar. Un historial
vacío devuelve `history: []`, `total: 0`, `totalPages: 0`. No incluye tokens,
hashes, `qrTokenId`, datos de pago ni relaciones de usuario completas.

## Membresías y fechas

Se reutiliza la regla de `GET /api/memberships/me/subscription`: fila individual
en `core.UserSubscriptions` con `status = active` y
`startsAt <= hoy UTC <= endsAt`. Ambos extremos son inclusivos; no se convierte
`endsAt` a medianoche local de México. También se rechaza `cancelledAt` informado.

| Estado o situación | ¿Genera QR / permite acceso? |
| --- | --- |
| `active`, dentro de fechas | Sí |
| `active`, pero inicio futuro o fin anterior a hoy | No |
| `pending`, `expired`, `cancelled`, sin suscripción | No |
| Pago web/móvil confirmado que ya activó la suscripción | Sí |
| Pago manual aprobado que ya activó la suscripción | Sí |
| Integrante de grupo aprobado y activado, con su propia suscripción | Sí |
| Grupo pagado pendiente de integrantes o aprobación | No, todavía no tiene suscripción individual activa |

El origen del pago (`online_checkout`, `admin_manual`, `group_package`) no
restringe el acceso. No se consultan ni modifican pagos. Las aprobaciones y
activaciones siguen siendo responsabilidad de los flujos existentes. Cada
integrante de un grupo usa su cuenta y sus propios tokens. Una renovación futura
no reemplaza la suscripción que está vigente hoy.

## Errores y límites

Los errores del módulo tienen esta forma:

```json
{
  "ok": false,
  "accessGranted": false,
  "code": "QR_EXPIRED",
  "error": "El código QR expiró. Genera uno nuevo."
}
```

| HTTP | `code` | Manejo en móvil |
| --- | --- | --- |
| 400 | `QR_INVALID` | Rechazar token ausente, malformado o inexistente |
| 400 | `INVALID_HISTORY_FILTER` | Corregir fechas o paginación |
| 401 | `UNAUTHORIZED` o error del middleware existente | Volver a autenticar |
| 403 | `MEMBERSHIP_REQUIRED` | Mostrar que se requiere membresía vigente |
| 403 | `QR_OWNER_INVALID` | La cuenta propietaria ya no es cliente |
| 403 | `SELF_SCAN_FORBIDDEN` | No autorizar acceso propio |
| 403 | error del middleware de rol existente | La cuenta no tiene permiso |
| 409 | `QR_ALREADY_USED` | Solicitar otro QR; no registrar una segunda entrada |
| 410 | `QR_EXPIRED` | Generar otro QR |
| 429 | `ACCESS_RATE_LIMITED` | Respetar `Retry-After` (segundos) |
| 503 | `ACCESS_SERVICE_UNAVAILABLE` | No conceder acceso; reintentar más tarde |

Los middleware heredados pueden responder únicamente `{ "error": "..." }` o
`{ "message": "Token revocado" }`, sin `code`. Comprobar primero HTTP.
Si falla la lectura del usuario en `requireAuth`, ese middleware devuelve 401;
los fallos posteriores de sesión, base de datos o transacción devuelven 503.
Ninguna de esas respuestas concede acceso ni revela SQL o credenciales.

Ventanas de un minuto:

| Límite | Alcance |
| --- | --- |
| 6 solicitudes de generación | Por usuario, incluso intentos rechazados |
| 120 solicitudes de escaneo | Por administrador, incluso tokens inválidos |
| 60 consultas de historial | Por usuario |
| 180 solicitudes al módulo | Por IP, antes de autenticar y consultar la base |

Los límites usan `express-rate-limit` y su almacenamiento en memoria, de acuerdo
con los limitadores existentes. Aplican por proceso y se reinician con él. Antes
de desplegar varias instancias, conectar un store compartido compatible o imponer
los mismos límites en el gateway. El bloqueo y el uso único sí se garantizan en
PostgreSQL entre todas las instancias. El proxy confiable se conserva como está
configurado en el backend; no se confía en cabeceras IP arbitrarias.

## Consumo desde Expo / React Native

Ejemplos de llamadas para integrar en la app del compañero (no son componentes
ni cambios al frontend). `API_URL` apunta al backend publicado o al equipo de
desarrollo accesible desde el dispositivo; `localhost` del teléfono es el propio
teléfono. El JWT proviene del inicio de sesión existente.

```js
const API_URL = "https://TU-BACKEND/api";

async function accessRequest(path, jwt, { method = "GET", body } = {}) {
  const response = await fetch(`${API_URL}/access${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || data.message || "No se pudo completar la solicitud");
    error.status = response.status;
    error.code = data.code;
    error.retryAfter = response.headers.get("Retry-After");
    throw error;
  }
  return data;
}

// Cuenta del cliente. Mostrar pase.token con la librería QR elegida por móvil.
const pase = await accessRequest("/qr", jwtCliente, { method: "POST" });
const venceEn = pase.expiresAt;

// Cuenta administrativa. Desactivar lecturas repetidas mientras llega la respuesta.
const resultado = await accessRequest("/scan", jwtAdministrador, {
  method: "POST",
  body: { token: contenidoEscaneado },
});
const permitirEntrada = resultado.accessGranted === true;

const misEntradas = await accessRequest("/me/history?page=1&limit=20", jwtCliente);
const entradasDelDia = await accessRequest(
  "/admin/history?from=2026-11-03&to=2026-11-03", jwtAdministrador
);
```

Mantener el pase solo en memoria, borrar al cerrar sesión o salir de la pantalla,
y solicitar otro cuando expire. Usar `expiresAt` para la cuenta regresiva de la
interfaz; el servidor siempre decide si sigue vigente. Evitar una solicitud por
segundo y respetar `Retry-After`. No enviar el JWT del cliente al escáner ni
codificarlo en el QR. El escáner envía el token exactamente como lo lee.

## Migración y operación del backend

Nueva migración: `backend/migrations/20261103000100-create-qr-gym-access.js`.
Crea únicamente `core.AccessQrTokens`, `core.GymAccessLogs`, restricciones e índices.
No cambia registros de membresía ni tablas de pagos. La migración se aplica
manualmente con el runner existente, primero en una base de desarrollo/pruebas
identificada; revisar migraciones pendientes y permisos del rol runtime sobre las
tablas nuevas antes del despliegue. No agregar llamadas al runner en el arranque.
Mantener `SEQUELIZE_SYNC_ON_START` desactivado en bases compartidas.

El `down` permite revertir un esquema sin entradas y **rechaza** borrar un historial
existente. Para retirar el módulo con historial, revertir código conservando las
tablas. Los tokens referenciados por entradas se conservan mediante claves foráneas;
no hay un proceso automático de purga ni cambios de credenciales.

## Pruebas

Desde `backend` (`npm.cmd` en Windows si PowerShell bloquea `npm.ps1`):

```bash
npm run test:access
npm test
```

Las pruebas unitarias y HTTP usan los servicios, controladores y middleware reales
con un adaptador aislado que simula bloqueos por fila y rollback. No leen `.env`,
no conectan a Neon y no llaman a Mercado Pago.

La prueba adicional con PostgreSQL real exige una base **local descartable**, sin
esquema `core`, llamada exactamente `titanium_access_test`. Nunca usa variables
`DATABASE_URL_*` de la aplicación, solo `ACCESS_TEST_DATABASE_URL` explícita.
Rechaza destinos remotos, nombres distintos y opciones adicionales en la URL.

```powershell
$env:ACCESS_TEST_DATABASE_URL = 'postgres://USUARIO_LOCAL@127.0.0.1:55473/titanium_access_test'
$env:ACCESS_TEST_ALLOW_LOCAL_DDL = 'true'
npm.cmd run test:access:postgres
```

Este comando crea tablas de dominio mínimas y aplica `up/down/up` de la migración
QR en la base local. Usa los modelos QR reales y verifica 20 escaneos concurrentes,
cancelación y expiración mientras espera bloqueos, fallo SQL con rollback,
historial privado, claves foráneas y protección del historial frente a `down`.
El esquema temporal creado por la prueba se elimina al terminar. Sin URL explícita,
el comando omite la prueba. No usarlo para validar una base compartida.

Validación ejecutada el 3 de noviembre de 2026:

- `npm.cmd test`: **360/360** correctas, incluidas las 327 pruebas previas y
  **33 nuevas** de acceso QR.
- `npm.cmd run test:access:postgres`: **7/7** correctas (prueba principal y seis
  escenarios) en PostgreSQL **18.6** portátil sobre loopback, con modelos QR reales.
- Los 20 escaneos concurrentes produjeron exactamente una entrada y 19 rechazos
  `QR_ALREADY_USED`. Los fallos SQL revirtieron la escritura del historial.
- No se conectó a Neon ni se ejecutaron migraciones sobre la base de la aplicación.
  No se cambió `.env`, frontend, Mercado Pago, pagos ni activación de membresías.

## Archivos de la implementación

| Archivos | Cambio |
| --- | --- |
| `backend/models/AccessQrToken.js`, `backend/models/GymAccessLog.js` | Nuevos modelos |
| `backend/models/index.js` | Exportaciones y asociaciones |
| `backend/migrations/20261103000100-create-qr-gym-access.js` | Esquema QR y guardia de rollback |
| `backend/services/accessService.js` | Generación, validación transaccional e historial |
| `backend/controllers/accessController.js` | Respuestas JSON y errores seguros |
| `backend/middleware/accessSecurity.js` | Sesión persistida y límites |
| `backend/routes/accessRoutes.js`, `backend/index.js` | Endpoints y montaje |
| `backend/package.json` | Comandos de pruebas QR |
| `backend/tests/access.test.js`, `backend/tests/helpers/accessFixture.js` | Pruebas unitarias/HTTP aisladas |
| `backend/tests/helpers/accessPostgresTarget.js`, `backend/tests/integration/accessPostgres.test.js` | Validación del destino y pruebas PostgreSQL |
| `docs/mobile-qr-access-api.md` | Contrato y ejemplos para el compañero de móvil |
