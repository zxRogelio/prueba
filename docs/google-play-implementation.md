# Reporte de implementación: Google Play, backend y web

8 de noviembre de 2026. Trabajo local; sin commit, push, merge, builds remotos o despliegues.

## Ramas y límites Git

- Web/backend: `feature/google-play-account-deletion`, creada después de fetch desde `origin/main` (`ff0b5c50272ad85fdb0f4b2c182582dc6179e11a`).
- Móvil: `feature/google-play-release-ready`, creada después de fetch desde `origin/develop` (`6babca4cd0981c064465bd54b531f076e9082bc0`).
- Ambos directorios estaban limpios al preparar ramas. No se ejecutaron operaciones Git desde el repositorio padre ni se editaron archivos del otro worktree. No se borraron ramas, worktrees ni carpetas Git.
- Los cambios están sin commit, en el repositorio al que pertenecen. El listado móvil está en `pry-app-tsg/docs/google-play-validation.md`.

## Funcionalidades implementadas

- Administración de solicitudes: bandeja filtrada/paginada, detalles de obligaciones, estados, decisiones auditables, autorización con rol almacenado, protección de autorrevisión y consulta propia.
- Bloqueo por fila, revisión incremental, claves idempotentes, transacciones y auditoría inmutable por trigger PostgreSQL. Se registra identificador/hash de la política aplicada.
- Compuerta de aprobación de conservación más compuerta operativa. No se distribuye una política aprobada. El ejecutor limitado prepara seudonimización de login, limpieza de nombre/teléfono y revocación de sesiones/QR; conserva relaciones únicamente dentro del alcance aprobado compatible.
- Página React adaptable `/eliminar-cuenta`, enlazada desde privacidad: login, verificación adicional, confirmación, folio, recuperación de solicitudes y manejo de respuestas inciertas. Panel `/admin/solicitudes-eliminacion`.
- Cuentas Google sin contraseña: sesión Google verificada más reto nuevo ligado al correo/factor configurado. No basta conocer un correo.
- En el móvil: estados administrativos, recuperación de folios desde servidor, enlace web sin credenciales, verificación Google y configuración AAB. Workflow manual nuevo, sin modificar CI ni preview existentes.

Contrato, procedimiento, límites del ejecutor y tratamiento posterior a revocación de sesiones: [documentación backend](../backend/docs/google-play-account-deletion.md).

## Migración

Nueva: `backend/migrations/20261108000100-account-cancellation-review.js`. Añade marca de baja, revisión/versiones, eventos, hash de política, trigger inmutable e índice de solicitudes abiertas. Conserva FKs y registros financieros. Se ensayó únicamente con clúster local desechable; no se aplicó a Neon Primary.

## Validaciones ejecutadas

| Comprobación | Resultado final |
| --- | --- |
| Backend `npm.cmd test` | **421/421**, 0 fallos, 0 omitidas. Incluye privacidad, membresías, Mercado Pago, entregas y QR con fixtures. |
| Backend `verify:privacy:postgres` | **Evidencia previa: 10/10**, 0 fallos, 0 omitidas; migración up/down/up, concurrencia, idempotencia, conservación y rechazo de UPDATE/DELETE de auditoría. No se repitió durante la auditoría final. |
| Frontend `npm.cmd test` | **23/23**, 0 fallos, 0 omitidas. |
| Frontend Playwright con `playwright.account-deletion.config.ts` | **10/10**, API completamente simulada; pantalla móvil/escritorio, contraseña, Google, 401, 409, política pendiente, reintentos, cambio de folio, regreso válido a revisión, prueba vencida y respuesta inválida. |
| Frontend `npm.cmd run build` | TypeScript y Vite aprobados. Advertencia de bundle JS de aproximadamente 1.71 MB; no se reestructuraron módulos ajenos al objetivo. |
| ESLint de los módulos frontend modificados y E2E | 0 errores, 0 advertencias. |
| Sintaxis Node y `git diff --check` | Aprobados. |

Las pruebas VM no cargan el backend productivo ni envían correo real. El ensayo PostgreSQL usa tablas mínimas de dominio, no una copia completa de Neon. El clúster terminó detenido; última evidencia sintética en la carpeta temporal `titanium-arco-test-OdN85k`. Captura pública móvil en `frontend/test-results/account-deletion/public-mobile.png`, ignorada por Git.

Los resultados móviles, Expo Doctor, Prebuild y auditoría de dependencias constan en el reporte móvil; no se mezclan sus archivos con este Git.

## Auditoría final antes de commits

Se revisaron los archivos nuevos y el diff completo de ambos repositorios, incluido el lockfile móvil. Se corrigieron estos errores:

- `capabilities` anunciaba disponibilidad sin comprobar el esquema instalado. Ahora consulta únicamente metadatos de PostgreSQL: columnas nuevas, índice único de solicitudes abiertas y trigger de auditoría habilitado. Devuelve `databaseReady=true` solo si están disponibles; ante ausencia o error responde 503. El preflight móvil lo exige en calidad y otra vez antes de solicitar un AAB.
- El panel administrativo conservaba el formulario anterior mientras cargaba otro folio. Ahora lo retira, bloquea acciones concurrentes y descarta respuestas de otra selección o sesión.
- El cliente web confiaba en cuerpos HTTP incompletos. Ahora valida estados, folios, comprobantes, fechas, conservación y detalles antes de mostrarlos como confirmados. Las peticiones quedan ligadas al token que inició la operación; un cambio de sesión previo al envío impide despacharla.
- Una prueba vencida podía dejar el formulario público sin una vía clara de recuperación. Ahora vuelve a verificación y permite reiniciarla sin enviar una solicitud con la prueba vencida.
- Al abrir un folio `awaiting_policy`, el selector administrativo retenía un destino que no pertenecía a sus opciones válidas. Ahora comienza en `under_review`; la prueba de navegador comprueba también el comando enviado al backend.

Se añadieron pruebas de política pendiente incluso con la compuerta operativa habilitada y hash correcto, suplantación Google, esquema ausente, cambio de sesión, respuestas inválidas y decisiones sobre un folio anterior. La política sigue pendiente y la ejecución efectiva permanece cerrada por defecto. El código productivo web llama exclusivamente a rutas reales; los transportes simulados están limitados a pruebas.

En esta auditoría no se ejecutaron migraciones, despliegues, builds remotos ni operaciones Git de incorporación/publicación. La migración no cambió: SHA-256 `97BB808EE65E11FB61A6A0F86F12E27EF49CD30C9CA232A75C55F9C3B114E95B`. Su compatibilidad se contrastó con las migraciones versionadas; falta validar el esquema completo del destino. La consulta nueva de metadatos se probó con fixtures, todavía no contra un PostgreSQL desplegado. El diagnóstico remoto 200/200/404 registrado abajo corresponde a la validación previa, no a una comprobación nueva de esta auditoría.

Ambas ramas pueden pasar a commits y PR separados para revisión del código con estos límites explícitos. Esto no habilita ejecutar el borrado ni publicar en Google Play. No se encontraron `.env`, claves, tokens reales o artefactos de compilación entre los archivos modificados/nuevos; los índices Git permanecen vacíos.

## Bloqueos, configuraciones manuales y publicación

1. **Política pendiente:** no activar eliminación efectiva sin aprobación por categoría y validación del ejecutor/procedimiento. El v1 no resuelve automáticamente toda la retención, medios, respaldos, exportaciones ni casos de pedidos pagados; revisar su alcance antes de usarlo.
2. **Infraestructura:** backend nuevo y página aún sin desplegar. Diagnóstico GET real: `/health=200`, `/api/privacy/notice=200`, `/api/privacy/capabilities=404`. El preflight AAB rechaza esa incompatibilidad.
3. **Migración:** pendiente de autorización, ensayo contra esquema completo aislado y revisión de permisos/rollback antes de cualquier despliegue.
4. **Operación:** validar notificación final al titular y resolución de obligaciones; controlar operaciones en curso antes de habilitar el ejecutor. Tras baja efectiva las sesiones dejan de servir para consultar; utilizar el canal verificado aprobado para entregar la resolución.
5. **EAS/Play:** configurar EXPO_TOKEN, confirmar credenciales existentes/versionCode y registrar el workflow en la rama predeterminada mediante revisión autorizada. No se ejecutó en GitHub ni se generó AAB.
6. **Evidencia:** faltan pruebas físicas del binario, 64 bits/16 KB, firma, permisos fusionados, pruebas internas/cerradas y aprobación de Seguridad de datos.
7. **Dependencias móviles:** npm audit reporta 31 avisos, sin altos/críticos; revisar alcanzabilidad y remediación compatible, sin forzar degradaciones de Expo/Jest.

La preparación de código no acredita que la aplicación esté lista para publicar.

## Archivos de este repositorio (34)

- `backend/config/accountDeletionPolicy.js`
- `backend/controllers/privacyController.js`
- `backend/docs/google-play-account-deletion.md`
- `backend/index.js`
- `backend/middleware/authMiddleware.js`
- `backend/middleware/privacySecurity.js`
- `backend/middleware/verifyToken.js`
- `backend/migrations/20261108000100-account-cancellation-review.js`
- `backend/models/Privacy.js`
- `backend/models/Session.js`
- `backend/models/User.js`
- `backend/routes/admin/accountCancellationRoutes.js`
- `backend/routes/privacyRoutes.js`
- `backend/routes/userPrivacyRoutes.js`
- `backend/services/accessService.js`
- `backend/services/accountCancellationAdminService.js`
- `backend/services/accountCancellationService.js`
- `backend/services/privacyService.js`
- `backend/tests/helpers/privacyFixture.js`
- `backend/tests/integration/accessPostgres.test.js`
- `backend/tests/integration/privacyPostgres.test.js`
- `backend/tests/privacyCancellationReview.test.js`
- `docs/google-play-implementation.md`
- `frontend/.gitignore`
- `frontend/e2e/account-deletion.spec.ts`
- `frontend/playwright.account-deletion.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/admin/AdminSidebar/AdminSidebar.tsx`
- `frontend/src/pages/AccountDeletionPage.tsx`
- `frontend/src/pages/PrivacyPolicyPage.tsx`
- `frontend/src/pages/admin/AdminAccountDeletionPage.tsx`
- `frontend/src/services/accountDeletionService.ts`
- `frontend/src/styles/account-deletion.css`
- `frontend/tests/accountDeletionService.test.mjs`

## Comandos de revisión y entrega posterior

No se ejecutaron los comandos de incorporación, commit o push siguientes. Revisar primero que el estado solo contenga los archivos anteriores.

```powershell
$webRepo = 'C:\Users\Roger\Desktop\TitaniumSportGym\pry_TinaniumSportGymWeb'
$mobileRepo = 'C:\Users\Roger\Desktop\TitaniumSportGym\pry-app-tsg'
git -C $webRepo status --short --branch
git -C $webRepo diff --check
git -C $webRepo diff
git -C $mobileRepo status --short --branch
git -C $mobileRepo diff --check
git -C $mobileRepo diff
```

Solo después de revisar y autorizar cada entrega, en su repositorio:

```powershell
git -C $webRepo add --all -- backend frontend docs/google-play-implementation.md
git -C $webRepo diff --cached
git -C $webRepo commit -m "feat: preparar revision y solicitudes de eliminacion de cuentas"
git -C $webRepo push -u origin feature/google-play-account-deletion

git -C $mobileRepo add --all
git -C $mobileRepo diff --cached
git -C $mobileRepo commit -m "feat: preparar ARCO y compilacion AAB para Google Play"
git -C $mobileRepo push -u origin feature/google-play-release-ready
```

Crear/revisar PRs separados hacia main web y develop móvil. Cualquier merge, migración remota, despliegue o compilación/publicación requiere la autorización correspondiente; no forma parte de los comandos ejecutados en esta tarea.
