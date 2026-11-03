# Mercado Pago Checkout Pro: HTTPS y pagos remotos de prueba

> Estado más reciente: [auditoría final antes del commit](product-delivery-final-audit.md). Las cifras y configuraciones de este documento corresponden a su etapa de validación.

Fecha local: 2 de noviembre de 2026, America/Mexico_City. Repositorio `CASTROMJRM/pry_TinaniumSportGymWeb`, rama `feature/product-delivery-system`.

## Estado

**Validación terminada: tres pagos aprobados de prueba y un pago OXXO pendiente real**, recibidos con firmas auténticas, HTTP 200 y cuatro repeticiones sin duplicados. Se crearon preferencias en Mercado Pago real con un vendedor acreditado remotamente como `test_user`. El usuario completó compras con su comprador de prueba. No hubo reconciliación manual ni firmas fabricadas. Un intento previsto para rechazo también resultó aprobado y se conservó como tal; el caso no aprobado se completó con otro pedido y OXXO.

El coordinador terminó con `passed-remote-payments`, `browserResultsVerified=true` y `originalRecordsUnchanged=true`. Los procesos locales, navegador y túnel se cerraron al finalizar. **La URL siguiente identifica el túnel utilizado, que ya está cerrado.**

## URL y aislamiento

URL HTTPS utilizada:

`https://mature-preparing-nobody-strengths.trycloudflare.com/api/webhooks/mercadopago`

El origen público solo admite `GET /health`, `POST /api/webhooks/mercadopago` y el retorno acotado `GET /pago/resultado`, que redirige a la aplicación local con una orden de este run. Administración, login, `.env`, archivos y endpoints de simulación no se publican. Se comprobó HTTP 200 en salud, 404 en rutas privadas y 401 al intentar una notificación sin firma. Ese sondeo sin firma **no se cuenta como pago ni como webhook auténtico**.

API local: `http://127.0.0.1:5530`; frontend: `http://127.0.0.1:5188`. Ambos escuchan únicamente en loopback. La API usa controladores, servicios, autenticación, sesiones y modelos reales; no arranca el entrypoint con trabajos automáticos que podrían afectar registros anteriores.

Todas las conexiones comprueban la identidad SQL de Neon `pagos-test`, rama `br-lively-math-akwgzcsr`, endpoint `ep-long-snow-akwnltba`, con certificado TLS verificado. No se ejecutó DDL ni migración en esta etapa.

Se descargó `cloudflared` portátil 2026.10.7 desde la publicación oficial y se verificó el digest SHA-256 `2493dbc168923bb3e59e5e7716f71deced92992eea9acd6e9d74f84ac7751343`. HTTP/2 falló porque la inspección del antivirus presentaba un emisor **Untrusted Root**. No se aceptó ese emisor ni se desactivó TLS o el antivirus. El transporte QUIC oficial conectó y la URL pública se verificó por HTTPS. [Cloudflare documenta estos túneles como temporales para desarrollo](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Notificaciones y credenciales

`buildPreferenceBody` genera `notification_url` desde `BACKEND_PUBLIC_URL`. El proceso aislado fija ese valor al origen HTTPS anterior y el adaptador comprueba la igualdad exacta antes de llamar al SDK real. Se consultó la preferencia remota de B y el proveedor devolvió esa misma URL, sin destino productivo. Las URLs de retorno también apuntan al origen de pruebas. No se modificó la configuración global de Webhooks de ninguna aplicación de producción.

La aplicación de prueba asociada al token es `76403348839442`, vendedor `3558098908`. La primera clave configurada no validaba las firmas recibidas. El usuario consultó la clave de esa aplicación y la introdujo localmente con `SetProductDeliveryWebhookTestSecret.ps1`. Se comprobó que era diferente de la anterior. Se guarda mediante DPAPI, limitada al usuario de Windows y SYSTEM, dentro de la carpeta ignorada `backend/storage/test-reports/remote-test-secrets`. Se descifra únicamente en memoria del proceso de prueba. **Ningún `.env` fue modificado y ninguna clave se imprimió en informes o consola.**

El receptor exige `data.id` numérico en la URL, `x-request-id`, `x-signature` y un timestamp dentro de cinco minutos. Usa `WebhookSignatureValidator` del SDK oficial; después consulta `/v1/payments/{id}` con el token real y verifica vendedor, modo, referencias y que los IDs pertenezcan al manifiesto sintético. Solo entonces ejecuta el controlador y servicio existentes. No se crea ni aprueba un pago mediante API: las operaciones las realizó el usuario en Checkout Pro.

## Compras y PostgreSQL

Run activo: `bd8e4095-2dad-4f8a-aa13-9608743407fe`.

| Escenario | Orden | Pago remoto | Importe / envío | Resultado local comprobado |
|---|---|---|---|---|
| A: recogida | `d45b4af8-5926-432d-9537-8a514317f590` | `186394340401` | $100 / $0 | Order y Payment `paid`; fulfillment `payment_confirmed`; un recibo y una venta |
| B: domicilio | `f2a92fc7-f122-4033-b376-7c80b6c7a185` | `187448293840` | $175 / $75 | Order y Payment `paid`; fulfillment `payment_confirmed`; un recibo y una venta |
| Intento C original: aprobado inesperadamente | `96a02f85-dcfe-40f0-88ba-a762cae0053e` | `186394411023` | $100 / $0 | Se conserva aprobado; no se reporta como rechazo ni se reembolsa |
| Nuevo C: OXXO pendiente | `e5ba9434-715f-4d0a-9ffe-ac0d540fdd80` | `186398463873` | $100 / $0 | Proveedor `pending_waiting_payment`; Order `pending_payment`, Payment `pending`, fulfillment `awaiting_payment`, cero recibos y ventas |

Recibos internos emitidos: A `TSG-20261103-8006BAD9`, B `TSG-20261103-3C0E6B38`, tercer aprobado `TSG-20261103-04A0EE5A`. Los folios usan la fecha UTC del servicio existente. Se verificaron ID, folio y estado; no se acredita una descarga de PDF no ejecutada.

Para cada aprobado se comprobó reserva consumida, un movimiento `sale` de una unidad y dos eventos iniciales de fulfillment: `awaiting_payment → payment_confirmed`. El producto sintético pasó de stock 20 a 17 para los tres aprobados. OXXO conserva su reserva activa, un único evento inicial, cero recibos y cero ventas; no ofrece preparación. No se pagó la referencia ni se forzó una transición logística.

La consulta final independiente al proveedor confirmó que los tres aprobados usaron `account_money` del comprador de prueba. Por eso el nombre de titular de tarjeta `OTHE` no produjo un rechazo: no se estaba usando una tarjeta. OXXO se identificó remotamente como `payment_method_id=oxxo`, `payment_type_id=ticket`, `status=pending`, `status_detail=pending_waiting_payment`. **No se acredita un pago de tarjeta rechazado; se acredita el caso pendiente permitido por la solicitud.**

La inspección independiente abrió una transacción PostgreSQL **REPEATABLE READ READ ONLY**, comparó hashes de todas las columnas de las 46 tablas preexistentes excluyendo solo IDs sintéticos del manifiesto, y verificó registros originales intactos. Capturó los detalles reales del cliente y del administrador, incluidos importes, direcciones y timeline. Reutilizó únicamente sesiones creadas por los logins sintéticos reales, sin leer cuentas o sesiones personales.

## Firma auténtica e idempotencia

Se recibieron y procesaron firmas válidas para A y B a las `00:35:13 UTC`, para el tercer aprobado a las `00:40:30 UTC` y para OXXO a las `00:47:38 UTC` del 3 de noviembre (tarde del día 2 en México). Las cuatro respondieron HTTP 200. La evidencia guarda digest de firma, IDs, instante, resultado y estado del proveedor; no guarda el secreto ni el valor de `x-signature` en los informes.

Después de cada recepción se repitió en memoria **la misma notificación auténtica, con sus encabezados originales**, dentro de la ventana de validez. El servicio volvió a validar la firma y devolvió `duplicate=true`. No se fabricó una firma o un estado del proveedor para esta prueba remota.

En las repeticiones de aprobados permanecieron exactamente un recibo, una venta, dos eventos logísticos y el mismo stock observado antes y después. En la de OXXO permanecieron cero recibos, cero ventas y un evento inicial. Las cuatro repeticiones quedaron registradas. Las respuestas del proveedor siempre se consultan con el SDK real; no se usó el simulador de la suite Chrome anterior.

## Error monetario encontrado y corregido

La API real de B devolvió:

```json
{
  "transaction_amount": 100,
  "shipping_amount": 75,
  "transaction_details": { "total_paid_amount": 175, "net_received_amount": 163.27 }
}
```

El código anterior comparaba únicamente `transaction_amount` con `Order.total=175`, lo que habría rechazado una compra correctamente pagada con envío. Ahora valida en centavos exactos:

1. `transaction_amount + shipping_amount = Order.total = Payment.amount`.
2. `shipping_amount = Order.shippingTotal`.
3. Componentes válidos, no negativos, sin fracciones de centavo; importe de mercancía positivo.
4. Moneda, propietario, preferencia y referencias coincidentes, conservando las protecciones anteriores.

No se usa `net_received_amount`, que descuenta comisiones, ni se sustituye el principal por `total_paid_amount`, que puede incorporar ajustes del pagador. El evento de auditoría conserva componentes y total informado. Se corrigieron los fixtures para reproducir el desglose real en lugar de colocar el total con envío dentro de `transaction_amount`. La [documentación oficial de costos de envío](https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/additional-settings/shipping-cost?scope=prod) describe su presentación separada.

## Pruebas y correcciones del ejecutor

- Backend completo actual: **297 aprobadas, 0 fallidas, 0 omitidas**. Incluye seis regresiones de importes y doce comprobaciones de aislamiento/reanudación de la prueba remota.
- ESLint: 48 archivos JS modificados/nuevos, 0 errores y 0 advertencias después de corregir el contexto de `localStorage` de un callback del navegador.
- PowerShell del ingreso cifrado: parser sin errores; el usuario lo ejecutó y el proceso descifró su salida correctamente sin exponerla.
- Se corrigió una carrera de Playwright: Chrome descarta el cuerpo de la respuesta al redirigir; el ejecutor toma el resultado real ya registrado por el SDK, en vez de leer un cuerpo descartado.
- El límite público usa un bucket global y no confía en `X-Forwarded-For`; no se cambió el `trust proxy` productivo.
- Se agregó reanudación por el mismo run, URL y manifiesto; no recrea ni recobra A/B. Los identificadores ya existentes se preservan y solo se actualizan usuarios/sesiones sintéticos para el nuevo runtime.
- Las cifras previas de frontend, PowerShell, 27 escenarios Neon y 8 Chrome corresponden a la fase anterior; no se presentan como ejecuciones nuevas de esta etapa. Las pruebas reales del proveedor y PostgreSQL aquí descritas se acreditan mediante sus evidencias específicas.

Dos preparaciones iniciales crearon una preferencia cada una antes de fallar la lectura de respuesta de Chrome: runs `77199a3f-4626-4965-9250-b0def5cf72b9` y `9fa01594-ccf6-4c4b-bfcc-fab3980162e1`. La búsqueda remota final por sus referencias externas encontró cero pagos en ambos casos. Se conservaron sus manifiestos y filas sintéticas. No se cuentan como compras aprobadas ni se borran para ocultar los fallos. En total se crearon seis preferencias remotas: cuatro del run validado y dos de estas preparaciones sin pago.

## Evidencias y conservación

- [Manifiesto activo](../backend/storage/test-reports/product-delivery-neon/bd8e4095-2dad-4f8a-aa13-9608743407fe.json).
- [Consulta remota de pagos](../backend/storage/test-reports/product-delivery-neon/remote-bd8e4095-2dad-4f8a-aa13-9608743407fe/provider-readonly-search.json).
- [Estados finales verificados directamente en Mercado Pago](../backend/storage/test-reports/product-delivery-neon/remote-bd8e4095-2dad-4f8a-aa13-9608743407fe/provider-final-state.json).
- [Desglose real del envío](../backend/storage/test-reports/product-delivery-neon/remote-bd8e4095-2dad-4f8a-aa13-9608743407fe/provider-shipping-breakdown.json).
- [Inspección independiente con cliente/administrador](../backend/storage/test-reports/product-delivery-neon/remote-bd8e4095-2dad-4f8a-aa13-9608743407fe/inspection-1793666472459/results.json); capturas PNG en la misma carpeta.
- Capturas finales de los cuatro escenarios en ambos paneles: `*-client-result.png` y `*-admin-result.png` en la carpeta `remote-bd8e4095-2dad-4f8a-aa13-9608743407fe`.
- Resultados unitarios y ESLint: `backend/storage/test-reports/backend-remote-unit-results.txt` y `backend-eslint-remote-review.json`.

Los informes están ignorados por Git. Los registros se identifican por run, IDs y prefijos `PGDEL REMOTE`/`pgdel-remote`, con catálogo, ubicación, tarifa, usuarios y órdenes propios. El borrado genérico de fixtures rechaza `kind=remote-checkout` o `retainForAudit=true`. No se borran pagos, recibos o eventos de esta etapa. Las sesiones sintéticas se revocan al cerrar; el túnel tiene un supervisor que lo cierra al finalizar el coordinador. Ningún reembolso fue ejecutado.

## Intervención humana y pendientes

El usuario inició sesión como comprador de prueba y completó tres pagos. También proporcionó la clave de prueba de su aplicación mediante la entrada local oculta. Finalmente generó una referencia OXXO en un pedido nuevo, sin pagarla. El proveedor, la firma recibida y PostgreSQL confirmaron su estado pendiente. No es necesario repetir los pagos ni pagar la referencia OXXO.

Para futuras ejecuciones deben configurarse correctamente el secreto de firma y el origen HTTPS del entorno correspondiente. La clave correcta de esta prueba solo se inyectó en el proceso aislado: `.env` sigue intacto. Un despliegue requiere dominio persistente/staging, gestión de secretos, TLS verificado y registros sanitizados; el túnel temporal no es producción. La configuración general existente de Sequelize aún contiene `rejectUnauthorized:false`; este ejecutor no la usa y exige verificación completa. Revisar esa configuración antes del despliegue.

Los avisos de dependencias de la última auditoría documentada siguen pendientes: 10 moderadas backend, 14 frontend y la copia ZIP vulnerable incrustada en CLI de respaldos no utilizados. No se aplicaron actualizaciones incompatibles ni `audit fix --force` en esta etapa. No se acreditan nuevas pruebas de reembolsos, PDF, correo, recomendaciones ML o despliegue.

## Archivos de esta etapa

```text
backend/package.json
backend/services/mercadoPagoCheckoutService.js
backend/utils/mercadoPagoAmounts.js
backend/scripts/serveRemoteProductDelivery.js
backend/scripts/inspectRemoteProductDelivery.js
backend/scripts/SetProductDeliveryWebhookTestSecret.ps1
backend/tests/integration/productDeliveryNeonSupport.js
backend/tests/integration/productDeliveryNeonScenarios.js
backend/tests/integration/productDeliveryBrowserServer.js
backend/tests/integration/productDeliveryRemoteSafety.js
backend/tests/integration/productDeliveryRemoteServer.js
backend/tests/integration/productDeliveryRemoteBrowser.js
backend/tests/integration/productDeliveryRemoteSecrets.js
backend/tests/productDeliveryRemoteSafety.test.js
backend/tests/mercadoPagoAmounts.test.js
backend/tests/mercadoPagoConfirmation.test.js
backend/tests/helpers/productDeliveryFixture.js
docs/product-delivery-mercadopago-https-results.md
docs/product-delivery-browser-results.md
docs/product-delivery-system.md
docs/product-delivery-neon-results.md
```

No se cambió de rama ni se hizo commit, push, merge o despliegue. No se modificaron `.env`, credenciales productivas o datos anteriores.
