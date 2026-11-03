# Auditoría final del sistema de entregas

Fecha: 2 de noviembre de 2026. Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama `feature/product-delivery-system`.

La rama puede presentarse en un **Pull Request de revisión** con los pendientes de seguridad descritos aquí. **El despliegue a producción sigue condicionado** a resolver o aceptar formalmente los riesgos pendientes, preparar sus configuraciones y validar el entorno de despliegue.

No se ejecutaron pagos, preferencias, reembolsos, migraciones, seeds ni escrituras en PostgreSQL durante esta auditoría. No se modificaron archivos `.env`, producción, ramas o el índice de Git. No se hicieron commit, push ni merge. Se conservaron las evidencias locales.

## Secretos y datos personales

Se revisaron los archivos modificados/nuevos y se amplió la búsqueda a los archivos versionados y a las evidencias locales de `backend/storage/test-reports/`. Se compararon en memoria los valores sensibles de ambos `.env`, las contraseñas extraídas de sus URLs y la clave de webhook cifrada localmente. Se buscaron también tokens Mercado Pago, JWT completos, claves privadas, URLs con credenciales, asignaciones de contraseñas y usuarios/correos de compradores de prueba. Los reportes de búsqueda contienen ubicaciones y categorías; nunca los valores encontrados.

**No se encontraron coincidencias de las credenciales actuales de Neon, Mercado Pago, JWT o webhook en los archivos publicables ni en las evidencias de texto examinadas.** También se inspeccionó el contenido textual de los ZIP incrustados en los reportes HTML de Playwright. Las capturas binarias se mantienen privadas; no se certifica mediante esta búsqueda una revisión OCR universal de imágenes ni todo el historial de Git.

Se encontraron contraseñas fijas en tres scripts anteriores a este cambio, ya presentes en Git. Se eliminaron sin ejecutar esos scripts:

- `backend/scripts/createTestUser.js`: ahora exige `SEED_TEST_USER_PASSWORD` mediante el entorno del proceso.
- `backend/scripts/createUsers.js`: exige `SEED_COACH_PASSWORD` y `SEED_CLIENT_PASSWORD`.
- `backend/scripts/seedMonthlySalesRegressionUsers.js`: genera una contraseña aleatoria para cada ejecución; permite una entrada privada opcional `REGRESSION_TEST_PASSWORD`.

La validación común exige al menos 16 caracteres y como máximo 72 bytes UTF-8 por compatibilidad con bcrypt. No imprime contraseñas. **Retirar estas constantes no cambia las cuentas ya creadas ni borra el historial**. Si se usaron esas contraseñas en cualquier entorno, deben tratarse como expuestas: identificar las cuentas semilla, cambiar sus contraseñas a valores únicos mediante el flujo administrativo autorizado y revocar sus sesiones, o deshabilitarlas. En producción, esa comprobación/rotación corresponde a una operación separada del responsable del entorno. No se realizó durante esta revisión. No se debe copiar una contraseña histórica a nuevas variables.

Las demás alertas revisadas son credenciales ficticias de pruebas sin conexión, placeholders documentales y correos públicos de mantenedores en lockfiles. No se publican datos de acceso del comprador de Mercado Pago. Los UUID, referencias de órdenes y el túnel archivado documentan pruebas sintéticas; no son claves de acceso.

Ambos `.env`, la clave DPAPI, logs, JSON privados, HTML, screenshots y binarios de compilación quedan fuera del manifiesto de commit. Se añadió protección global para `*.dpapi`, `playwright-report/` y `test-results/`. La clave local permanece cifrada para el usuario de Windows, con ACL limitada a ese usuario y SYSTEM. No se borró ninguna evidencia de pago.

Si apareciera otra credencial real publicada: revocarla/rotarla primero en el proveedor y guardar la sustituta en el gestor de secretos del entorno; actualizar únicamente los consumidores autorizados y comprobarlos antes de retirar la antigua. Cambiar el password/rol de Neon, regenerar el token de la aplicación Mercado Pago o su clave de firma, o rotar JWT y revocar sesiones según el secreto afectado. Limpiar el historial requiere una intervención coordinada posterior; borrar una línea no revoca una credencial. Aquí no se detectó exposición de esas credenciales de infraestructura.

## SSL de PostgreSQL

Se corrigieron dos problemas relacionados:

1. `backend/config/sequelize.js` desactivaba la comprobación del certificado con `rejectUnauthorized: false`.
2. El constructor URI de Sequelize 6 vuelve a interpretar `sslmode` y puede sustituir el objeto SSL completo. Cambiar solo el booleano no garantizaba la protección.

`backend/config/postgresConnection.js` construye ahora Sequelize con parámetros explícitos, TLS mínimo 1.2, `rejectUnauthorized: true` y nombre del servidor. Rechaza modos inseguros, opciones duplicadas y overrides de identidad. Conserva credenciales escapadas, límites de pool y las opciones de conexión admitidas; admite archivos CA/certificado/clave configurados explícitamente sin publicar sus contenidos. Las opciones nuevas no incluidas en la lista permitida requieren revisión. No hay fallback a certificados no verificados.

El cliente `pg` mantiene `enableChannelBinding: true`, opción que Sequelize 6 no transmite por sí solo. Esto habilita la negociación SCRAM-PLUS cuando el servidor la ofrece; no se afirma que equivalga a imponer todas las semánticas de `channel_binding=require` de libpq.

Se ejecutó `backend/scripts/verifyProductDeliverySsl.js --run --branch br-lively-math-akwgzcsr`. El script valida **los cuatro destinos antes de conectarse**, fija el endpoint autorizado de `pagos-test`, confirma rama/base/rol por SQL y usa `BEGIN READ ONLY`.

| Conexión real | Resultado | TLS | Certificado/hostname |
| --- | --- | --- | --- |
| RUNTIME | Aprobada | 1.3 | Verificados |
| IMPORTER | Aprobada | 1.3 | Verificados |
| REPORTS | Aprobada | 1.3 | Verificados |
| ADMIN_DIRECT | Aprobada | 1.3 | Verificados |

Las cuatro verificaron también que un hostname incorrecto se rechaza con `ERR_TLS_CERT_ALTNAME_INVALID` usando el certificado recibido y el verificador de Node. No se abrieron conexiones a producción ni se enviaron consultas de escritura. La ejecución sin argumentos solo presenta el plan.

Se repitió esa comprobación retirando `NODE_OPTIONS` únicamente del proceso verificador: las cuatro conexiones volvieron a pasar con la confianza predeterminada de Node. No necesitan desactivar TLS ni una excepción de certificados para funcionar en este equipo.

La verificación cubre las conexiones **Sequelize/pg de la aplicación**. El controlador antiguo de backups invoca `pg_dump` por separado y aún utiliza `PGSSLMODE=require` por defecto; ese modo no garantiza por sí solo la validación de CA y hostname en libpq. Antes del despliegue debe configurarse y validarse `verify-full` con una CA de confianza compatible con el binario/host de backups. No se cambió ese proceso sin poder validar un respaldo/restauración real. Tampoco se ejecutaron backups que pudieran copiar información sensible.

Referencia técnica: [advertencia oficial de node-postgres sobre URI y SSL](https://node-postgres.com/features/ssl). La producción debe contar con la cadena de confianza correcta; no usar `NODE_TLS_REJECT_UNAUTHORIZED=0` ni volver a `rejectUnauthorized: false`.

## Dependencias

Se ejecutaron auditorías npm nuevas en ambos proyectos y `npm audit fix --ignore-scripts`, respetando los rangos compatibles. No se usó `--force`, ni downgrades o saltos mayores sugeridos por audit. Se volvieron a ejecutar las pruebas y herramientas después de actualizar los lockfiles.

Cambios de esta revisión:

- Se retiró `archiver`, sin importaciones ni invocaciones activas en el repositorio. Los backups conservan su implementación nativa con `pg_dump`. Esto elimina su cadena de archivado sin sustituir el sistema de backups.
- Se aplicaron actualizaciones compatibles; entre ellas nodemon queda en 3.1.14, ESLint en 9.39.5 y typescript-eslint en 8.72.1. ESLint 9 ya aparece como no soportado en npm: su migración conjunta pendiente requiere revisar compatibilidad.
- Se mitigó la ruta vulnerable de importación CSV: ya no se utiliza `columns: true` de csv-parse; se procesan arrays, se rechazan cabeceras de prototipo y los registros tienen prototipo nulo. Se verificaron comillas, comas, acentos, filas malformadas y cabeceras peligrosas. La librería sigue señalada por npm hasta una actualización mayor revisada.

La rama ya incluía la retirada de nodemailer sin uso activo y el override de adm-zip 0.6.1 para el instalador de `@louisbm/pgdump`. La extracción de un archivo sintético con la implementación real del instalador volvió a aprobar en la suite backend.

| Proyecto | Antes de esta auditoría | Después | Altas/críticas en el árbol auditado |
| --- | --- | --- | --- |
| Backend | 10 moderadas | **5 moderadas** | 0 / 0 |
| Frontend | 14 moderadas | **14 moderadas** | 0 / 0 |

**Ambos `npm audit` terminan con código 1: no están aprobados.** Las cifras cuentan paquetes afectados, no avisos independientes.

| Dependencia pendiente | Gravedad npm y alcance | Solución pendiente |
| --- | --- | --- |
| Backend `csv-parse` 6.2.1 | Moderada, producción. [Prototype replacement por columnas](https://github.com/advisories/GHSA-8cw4-87c7-c6xx). Ruta de columnas mitigada en el consumidor. | Revisar y probar migración a 7.0.3 o posterior corregida. |
| Backend `nodemon` 3.1.14 → `minimatch` 10.2.6 | 2 moderadas, desarrollo. [Amplificación/DoS por patrones](https://github.com/advisories/GHSA-g3hv-75wg-m249). No forma parte del servidor de producción si se instalan solo dependencias de producción. | Esperar/validar versión compatible de nodemon que use minimatch corregido; no forzar minimatch 11 en consumidores anteriores ni degradar nodemon a 1.0.2. |
| Backend `sequelize` 6.37.8 → `uuid` 8.3.2 | 2 moderadas, producción. [Límites de buffer en UUID v3/v5/v6](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Los usos encontrados en Sequelize son v1/v4; eso limita la exposición observada y no elimina el aviso. | Actualización upstream o sustitución revisada; no degradar Sequelize a 3.30.0 ni imponer otra API mayor de uuid sin validar consumidores. |
| Frontend `react-router-dom` / `react-router` 6.30.6 | 2 moderadas, cliente. [Open redirect mediante backslash](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) y [deserialización SSR](https://github.com/advisories/GHSA-337j-9hxr-rhxg). La aplicación usa BrowserRouter y no hidrata errores SSR. | Revisar destinos de navegación derivados de entradas externas y migrar conjuntamente a una versión corregida; npm propone 7.18.5, cambio mayor. |
| Frontend herramientas de lint → `minimatch` 10.2.6 / 3.1.5 | 12 moderadas, desarrollo. Mismo aviso de amplificación/DoS. Incluye `eslint`, `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `eslint-plugin-react-refresh`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `parser`, `type-utils`, `typescript-estree`, `utils` y `minimatch`. | Migrar el conjunto de herramientas y sus plugins con pruebas. No aplicar el downgrade automático sugerido ni overrides mayores sin verificar API. |

**Riesgo adicional fuera de las cifras de npm:** los CLI empaquetados `@louisbm/pgdump/bin/pgdump.cjs` y `pgdump-fetch-binary.cjs` contienen una copia interna antigua de adm-zip 0.5.16; el override no recompila esos archivos. Conservan el riesgo de los avisos altos de adm-zip aunque npm no detecte ese código incrustado. Ni las rutas actuales de backups ni el instalador `dist/scripts/fetch-binary.js` probado invocan esos CLI. Evitar su uso y sustituirlos por PostgreSQL nativo o por un paquete corregido antes de habilitarlos; una auditoría de cero altos del árbol npm no certifica esa copia interna.

## Configuraciones temporales y límites

- La URL Cloudflare archivada solo aparece en documentación/evidencias; no es el valor predeterminado del servicio. No hay listeners de los arneses de pruebas en los puertos 5178, 5188, 5521, 5522 y 5530. Los scripts no crean un túnel automáticamente al iniciar la aplicación.
- Las rutas de entregas de producción conservan JWT, sesiones/blacklist y roles. Las rutas simuladas y el receptor acotado viven en arneses independientes; `backend/index.js` no los importa.
- Los comandos nuevos de pruebas remotas requieren flags explícitos, huella y rama fijadas, comprobación SQL y vendedor de prueba acreditado remotamente. El cleanup genérico rechaza los manifiestos de pagos retenidos para auditoría.
- `verify:delivery-postgres` ahora muestra un plan por defecto. Para su prueba local con DDL transaccional exige `--run --allow-local-ddl` y una base vacía dedicada en loopback. No se ejecutó ese modo en esta auditoría.
- Tarifas, direcciones y ubicación de prueba pertenecen a registros sintéticos identificados por manifiesto y slug. No se incorporan a migraciones, seeds de producción ni defaults del servicio. La configuración de recogida productiva debe completarse con datos reales del gimnasio por un administrador.
- El `.env` local conserva `NODE_ENV=production`, pero sus cuatro conexiones se comprobaron en `pagos-test`; ese texto no convierte la base en producción. Conserva también un vendedor de prueba, sandbox desactivado/live_mode activado y URLs públicas no locales. No se debe arrancar una nueva compra de pruebas con esos valores sin volver a aislar las URLs mediante el arnés autorizado. No se cambiaron los `.env`.
- La clave correcta de la aplicación de pruebas se aplicó en memoria desde DPAPI durante la etapa HTTPS. Su funcionamiento no acredita la clave antigua de `.env` ni la configuración de la aplicación productiva. Producción necesita su propia clave de firma y credenciales coherentes con su vendedor y URLs.

## Verificaciones finales

| Verificación ejecutada en esta auditoría | Resultado |
| --- | --- |
| Backend completo, servicios reales sobre fixtures/mocks y HTTP local | **310 aprobadas, 0 fallidas, 0 omitidas** |
| Frontend | **12 aprobadas, 0 fallidas, 0 omitidas** |
| PowerShell, protecciones del lanzador, sin PostgreSQL | **30 aprobadas, 0 fallidas** |
| TLS real de Sequelize en Neon `pagos-test`, transacciones de solo lectura | **4 conexiones aprobadas**, sin escrituras |
| ESLint frontend completo | 0 errores / 0 advertencias |
| ESLint: 60 JS backend modificados/nuevos, reglas recomendadas y globals Node | 0 errores / 0 advertencias |
| TypeScript aplicación y Vite, `tsc -b` | Aprobado dentro de `npm.cmd run build` |
| TypeScript estricto de E2E/configuración Playwright | Aprobado, sin ejecutar el navegador |
| Compilación frontend Vite | Aprobada; advertencia por bundle mayor de 500 kB |
| `git diff --check` y comprobación adicional de archivos nuevos | Sin errores |

Las pruebas nuevas cubren SSL sin downgrade por URI, opciones/credenciales escapadas, protecciones del verificador de destinos, CSV y contraseñas de seeds. Un primer intento del nuevo archivo SSL con aislamiento por proceso no pudo iniciar por `spawn EPERM` del sandbox; la ejecución posterior usó el modo sin aislamiento por proceso de la suite del proyecto. No se contó ese intento bloqueado como aprobado.

Las **27 pruebas Neon con escrituras/migraciones, las 8 de Chrome y los pagos/webhooks auténticos** pertenecen a las etapas anteriores: no se repitieron y no se agregan a las cifras nuevas. La compatibilidad Mercado Pago queda cubierta por las regresiones locales y la [evidencia HTTPS anterior](product-delivery-mercadopago-https-results.md), que registra tres aprobados y OXXO pendiente, cuatro firmas auténticas e idempotencia. No se reclama una nueva validación remota del código final.

Ambas migraciones permanecen aditivas y conservan las protecciones de rollback con datos. La primera añade tablas de entregas y `Orders.shippingTotal`; la segunda añade `AboutPages.pickupSettings`. No se cambió su DDL en esta auditoría ni se ejecutó su rollback o reaplicación. Con datos de auditoría/pagos existentes, revertir código conservando el esquema aditivo es la vía prevista; no forzar un `down` que borre evidencia.

## Archivos y evidencias

[Manifiesto exacto de archivos para el commit](product-delivery-commit-files.txt): todos los modificados/nuevos publicables, incluido este informe. Se generó a partir de `git diff --name-only` y `git ls-files --others --exclude-standard`. Es una lista de revisión; no se ejecutó `git add`. `git diff --stat` solo contabiliza archivos ya versionados; el manifiesto incluye también los nuevos.

Inventario final: **97 archivos: 29 modificados ya versionados y 68 nuevos**. El índice está vacío. No incluye `.env`, credenciales cifradas, logs, reportes privados ni artefactos temporales. La comprobación adicional de integridad corrigió finales de línea ausentes y espacios al final sin cambiar comportamiento.

Cambios hechos específicamente durante esta auditoría: `.gitignore`, configuración de Sequelize y nueva fábrica/verificador/tests SSL, paquete/lockfile backend y lockfile frontend, eliminación de contraseñas fijas en tres scripts y nueva utilidad/tests, protección CSV y pruebas, modo plan del verificador local, documentación técnica y manifiesto. El resto del manifiesto corresponde a la implementación/revisiones previas conservadas en el worktree.

Lista exacta de los 26 archivos tocados durante esta auditoría:

```text
.gitignore
backend/config/postgresConnection.js
backend/config/sequelize.js
backend/controllers/catalogImportExportController.js
backend/package-lock.json
backend/package.json
backend/scripts/createTestUser.js
backend/scripts/createUsers.js
backend/scripts/seedMonthlySalesRegressionUsers.js
backend/scripts/verifyProductDeliveryPostgres.js
backend/scripts/verifyProductDeliverySsl.js
backend/tests/postgresConnection.test.js
backend/tests/productImportCsv.test.js
backend/tests/testSeedPassword.test.js
backend/utils/productImportCsv.js
backend/utils/testSeedPassword.js
docs/product-delivery-browser-results.md
docs/product-delivery-commit-files.txt
docs/product-delivery-final-audit.md
docs/product-delivery-mercadopago-https-results.md
docs/product-delivery-neon-results.md
docs/product-delivery-neon-validation.md
docs/product-delivery-review.md
docs/product-delivery-system.md
frontend/package-lock.json
frontend/src/App.tsx
```

Evidencias privadas adicionales en `backend/storage/test-reports/`: `final-audit-secrets.json`, `final-audit-ssl.json`, `final-audit-backend-tests.log`, `final-audit-frontend-tests.log`, `final-audit-powershell.log`, `final-audit-backend-eslint.json`, `final-audit-frontend-lint.log`, `final-audit-build.log`, `final-audit-e2e-typescript.log` y auditorías npm antes/después. Son archivos ignorados; conservarlos con acceso limitado y una política de retención. No adjuntar el directorio completo a un PR público. Los manifiestos y evidencias históricas de pagos de prueba también se conservan separados.

## Antes de desplegar

1. Verificar y rotar/deshabilitar las cuentas que pudieran conservar contraseñas históricas de seeds; no confundir la corrección del código con la rotación de cuentas existentes.
2. Resolver o registrar una aceptación explícita de las dependencias pendientes, incluyendo el código incrustado no detectado por npm. Aislar las herramientas de desarrollo del runtime productivo y no invocar los CLI afectados.
3. Validar backups con libpq `verify-full` y CA confiable; comprobar respaldo/restauración en un entorno autorizado. Verificar también las cuatro conexiones de producción con la nueva configuración antes del cambio, mediante su procedimiento de despliegue autorizado.
4. Provisionar secretos productivos fuera de Git, URLs HTTPS definitivas, vendedor/modo correctos y la clave de webhook de esa aplicación. Mantener completamente separados el entorno de pagos-test y los registros sintéticos retenidos. No copiar la clave DPAPI ni el túnel temporal a producción.
5. Programar la aplicación de las dos migraciones revisadas por el procedimiento habitual, con copia de seguridad y límites de bloqueo, y completar ubicación, horarios, cobertura y tarifas reales. Este informe no ejecuta ni autoriza una migración productiva.
6. Comprobar el artefacto/configuración de staging final y seguimiento con los roles correspondientes; estas comprobaciones no se sustituyen por las pruebas locales ni requieren repetir los pagos ya auditados.

Recomendación: abrir el Pull Request para revisión del código y de estos riesgos; mantener el despliegue pendiente hasta completar las acciones anteriores.
