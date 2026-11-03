# Envío nacional con tarifa fija

Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama `feature/product-delivery-system`.

## Estado y alcance

La implementación existente de `ShippingRates` ya permite configurar un rango de `00000` a `99999` con importe fijo en MXN desde el formulario administrativo. No se añadió otro sistema de tarifas ni una migración.

**No se creó ni activó ninguna tarifa en una base de datos y no se eligió un precio comercial.** El importe queda a decisión del administrador. Los precios de las pruebas son ficticios y solo existen en adaptadores en memoria. No se contactó Neon ni Mercado Pago, no se ejecutaron pagos/reembolsos ni se modificaron órdenes, pagos, credenciales o `.env`. No se hicieron commit, push o merge. Se conservaron los cambios locales anteriores del rediseño.

La única carencia funcional encontrada fue la posibilidad de guardar tarifas duplicadas/ambiguas que después bloqueaban una cotización. Se añadió validación al endpoint administrativo existente y una explicación en el mismo panel.

## Pasos para activarla desde la web

1. Iniciar sesión como **administrador** en el entorno que corresponda y abrir **Pedidos → Tarifas y cobertura de envíos**.
2. Revisar las filas existentes. Si ya hay una tarifa con rango `00000–99999`, pulsar **Editar** en esa misma fila, aunque esté inactiva. No crear otra nacional.
3. Si no existe, utilizar **Agregar tarifa** e introducir:

   | Campo | Valor |
   | --- | --- |
   | Nombre | `Envío nacional` |
   | CP inicial | `00000` |
   | CP final | `99999` |
   | Importe MXN | **El importe que decidas**, sin símbolo `$`; admite hasta dos decimales |
   | Activa | Marcar para habilitarla; desmarcar para conservarla desactivada |

4. Pulsar **Guardar tarifa** y comprobar el mensaje de confirmación y la fila con su rango, importe y estado. La moneda está fijada a MXN por el backend; no requiere otro campo ni editar código.
5. Para cambiar el costo después, **Editar** esa fila, modificar **Importe MXN** y guardar. Para suspender el fallback nacional, desmarcar **Activa** y guardar.
6. Conservar las tarifas regionales que se desee mantener. Su rango más específico tiene prioridad sobre la tarifa nacional: donde exista una regional aplicable, se cobrará su importe. Para cobrar exactamente el mismo precio en todos los rangos, el administrador tendría que revisar/desactivar esas excepciones deliberadamente; esta revisión no las modifica.

No es necesario editar archivos o reiniciar la aplicación cada vez que cambie el importe. Los cambios del código de protección deben incorporarse mediante el procedimiento normal de revisión/despliegue; no se publicaron automáticamente.

## Qué significa cobertura nacional

`postalCodeFrom`, `postalCodeTo` y las direcciones permanecen como cadenas de cinco caracteres. `00000` y `99999` son límites del rango; `06000` conserva su cero inicial. No se convierten los códigos a números para almacenarlos o compararlos por pertenencia al rango.

**Solo se comprueba el formato de cinco dígitos y el rango configurado. No se consulta un catálogo postal ni un servicio de paquetería. Esto no demuestra que un código exista, que la dirección sea válida o que una paquetería tenga servicio allí.** Los códigos usados en las pruebas se consideran únicamente casos de formato/rango. La operación debe confirmar disponibilidad y condiciones con su paquetería.

## Protección de la configuración

- No se permite crear una segunda tarifa `00000–99999`, incluso si la anterior está inactiva. El error HTTP 409 indica que debe editarse la existente.
- Se rechaza guardar/activar una tarifa cuyo rango se solape con otro activo de igual amplitud. El error HTTP 409 explica la ambigüedad. Los solapamientos de diferente amplitud se permiten y mantienen la regla del rango más específico.
- Se permite desactivar una tarifa existente conflictiva para corregir datos históricos. No se eliminan ni se modifican automáticamente registros anteriores. Si ya hay duplicados nacionales, se deben revisar y desactivar los sobrantes; la cotización continúa rechazando empates activos.
- Los POST/PATCH existentes se serializan con un advisory lock transaccional compartido y aislamiento `READ COMMITTED`, incluyendo el primer INSERT. La comprobación se efectúa dentro de esa misma transacción, antes de crear/actualizar el registro.
- Esta protección corresponde a los endpoints de la aplicación; no es una nueva restricción física de PostgreSQL. Las modificaciones manuales de SQL o procesos externos que eludan esos endpoints no quedan cubiertas por el lock cooperativo. No se añadió una migración innecesaria.

## Checkout y Mercado Pago

Se reutiliza el flujo actual: dirección completa, código de cinco dígitos, selección de tarifa en el backend, cotización firmada, confirmación explícita del total y creación idempotente del checkout. El navegador no fija el importe definitivo.

Las regresiones verifican que una tarifa nacional se incluya en `Order.shippingTotal`, `Payment.amount`, snapshot de entrega y `shipments.cost` de la preferencia, manteniendo separados los productos. La confirmación existente de Mercado Pago conserva el desglose `transaction_amount` de productos más `shipping_amount`. No se alteraron sus servicios ni webhooks.

Modificar una tarifa invalida las cotizaciones anteriores para nuevas compras, que requieren consultar y confirmar de nuevo. No recalcula órdenes/pagos ya creados ni sus snapshots. La recogida sigue en `$0.00`, sin `shipments` en la preferencia. Las membresías conservan su flujo sin dirección ni entrega.

La compatibilidad se comprobó con pruebas locales y un proveedor simulado. **No constituye una compra remota nueva ni una validación real adicional del webhook.**

## Resultados ejecutados en esta revisión

| Verificación | Resultado |
| --- | --- |
| Suite backend completa | **327 aprobadas, 0 fallidas, 0 omitidas** |
| Pruebas nuevas de envío nacional, incluidas en las 327 | **17 aprobadas** |
| Suite frontend | **18 aprobadas, 0 fallidas, 0 omitidas** |
| ESLint frontend completo | Sin errores ni advertencias |
| ESLint recomendado sobre los 3 JS backend cambiados/nuevos | Sin errores ni advertencias |
| TypeScript de aplicación/Vite, `tsc -b` | Aprobado durante la compilación |
| Compilación Vite | Aprobada; permanece la advertencia de bundle mayor de 500 kB |
| `git diff --check` | Aprobado |

Casos específicos: `43000`, `06000`, `64000`, `22000`, `97000`, `4300` rechazado, `06A00` rechazado, recogida gratuita, nacional inactiva/reactivada, edición del importe, cotización anterior invalidada, snapshots anteriores intactos, prioridad regional, duplicados activos/inactivos, solapamientos ambiguos, configuración simultánea y precio manipulado desde el navegador.

La prueba simultánea utiliza el adaptador transaccional en memoria. **No se certifica con ella el bloqueo de dos conexiones PostgreSQL reales.** En esta revisión no se ejecutaron migraciones, pruebas con escrituras Neon, Playwright ni pagos remotos; las cifras anteriores de Chrome/PostgreSQL corresponden a etapas previas y no se suman aquí.

Para repetir las verificaciones locales:

```powershell
cd backend
npm.cmd test
# Solo casos nacionales:
node --experimental-vm-modules --test --test-isolation=none tests/nationalShipping.test.js
cd ../frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## Archivos de esta revisión

1. `backend/controllers/deliveryController.js`: serialización y comprobación de la configuración antes de guardar.
2. `backend/services/shippingService.js`: validación de duplicados nacionales y ambigüedad; cotización/cálculos existentes intactos.
3. `backend/tests/nationalShipping.test.js`: 17 pruebas nuevas, sin conexiones remotas.
4. `frontend/src/pages/admin/AdminOrdersPage.tsx`: instrucciones nacionales y límite de la validación postal.
5. `frontend/tests/deliveryViews.test.mjs`: dos regresiones adicionales sobre ceros iniciales e importe no preconfigurado.
6. `docs/product-delivery-national-shipping.md`: este informe y los pasos de activación.

No se inspeccionó la lista real de tarifas de ningún entorno. Antes de activar, el administrador debe revisar esa lista en su entorno y decidir el importe y las excepciones regionales.
