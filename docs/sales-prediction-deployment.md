# Despliegue de Prediccion de Ventas por Producto

## Estructura

```text
frontend/src/pages/admin/AdminSalesPredictionPage.tsx
frontend/src/services/admin/salesPredictionService.ts
backend/routes/admin/salesPredictionRoutes.js
backend/controllers/admin/salesPredictionController.js
backend/services/salesPredictionDataService.js
backend/services/salesPredictionService.js
ml-sales-service/app.py
ml-sales-service/model/modelo_ventas_productos.joblib
```

## Flujo

1. El administrador abre `/admin/sales-prediction`.
2. React llama `GET /api/admin/sales-predictions` con el token existente.
3. Node valida `requireAuth` y `requireAdmin`.
4. Node consulta PostgreSQL y calcula las variables del modelo por producto activo.
5. Node llama `POST {SALES_ML_URL}/predict` con `X-ML-API-Key`.
6. Flask carga el `.joblib`, predice por lote y devuelve unidades estimadas.
7. Node calcula estado, riesgo de stock, accion sugerida y tendencia.
8. React muestra las predicciones reales.

El frontend no conoce `SALES_ML_API_KEY` ni llama directamente a Python.

## Variables del Modelo

El modelo recibe exactamente:

```text
producto
ventas_mes_anterior
promedio_movil_ventas_3_meses
promedio_movil_ventas_6_meses
promedio_movil_ventas_12_meses
vistas_producto_mes_anterior
promedio_movil_vistas_3_meses
```

`productId` solo relaciona la respuesta. `mes_corte` no entra al modelo.

## Convencion Temporal

`mes_corte` es el ultimo mes calendario completamente terminado. Si hoy es julio de 2026:

- `cutoffMonth = 2026-06`
- `predictionMonth = 2026-07`
- ventas/vistas del mes anterior = junio de 2026
- promedio de 3 meses = abril, mayo y junio de 2026
- promedio de 6 meses = enero a junio de 2026
- promedio de 12 meses = julio de 2025 a junio de 2026

No se usan ventas ni vistas parciales del mes actual.

## Consultas Usadas

Ventas:

- `core."Orders"."status" = 'paid'`
- `core."Orders"."paidAt"` dentro de la ventana de 12 meses
- `core."OrderItems"."itemType" = 'product'`
- `core."OrderItems"."productId" = core."Products"."id_producto"`

Vistas:

- `core."BehaviorEvents"."eventType" = 'product_view'`
- `core."BehaviorEvents"."entityType" = 'product'`
- `core."BehaviorEvents"."entityId"` numerico convertido a `Products.id_producto`

Los productos activos se toman de `core."Products"` con `status = 'Activo'` e `id_producto` no nulo. Categorias y marcas usan las asociaciones reales con `Category` y `Brand`.

## Configuracion Local

Python:

```bash
cd ml-sales-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:ML_API_KEY="dev-secret"
$env:OMP_NUM_THREADS="1"
$env:OPENBLAS_NUM_THREADS="1"
$env:MKL_NUM_THREADS="1"
$env:NUMEXPR_NUM_THREADS="1"
python scripts/inspect_model.py
python app.py
```

Backend:

```bash
cd backend
# agregar en .env local:
# SALES_ML_URL=http://127.0.0.1:8001
# SALES_ML_API_KEY=dev-secret
# SALES_ML_TIMEOUT_MS=60000
# SALES_PREDICTION_CACHE_MS=600000
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Configuracion de Render

Microservicio Python:

- Root directory: `ml-sales-service`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 1 --timeout 120`
- Environment:
  - `MODEL_PATH=model/modelo_ventas_productos.joblib`
  - `ML_API_KEY=<secreto>`
  - `MODEL_VERSION=1.0`
  - `OMP_NUM_THREADS=1`
  - `OPENBLAS_NUM_THREADS=1`
  - `MKL_NUM_THREADS=1`
  - `NUMEXPR_NUM_THREADS=1`

Backend Node:

- `SALES_ML_URL=<url interna o publica del servicio Python>`
- `SALES_ML_API_KEY=<mismo secreto configurado en Python>`
- `SALES_ML_TIMEOUT_MS=60000`
- `SALES_PREDICTION_CACHE_MS=600000`

No configurar esas variables en el frontend.

## Pruebas de Extremo a Extremo

1. Levantar Python y abrir `/health`.
2. Levantar backend con `SALES_ML_URL` y `SALES_ML_API_KEY`.
3. Levantar frontend.
4. Iniciar sesion como administrador.
5. Abrir `/admin/sales-prediction`.
6. Confirmar que no aparecen productos demo.
7. Verificar productos reales, mes de corte, mes pronosticado y modelo.
8. Probar `Actualizar predicciones`.
9. Apagar Python y confirmar error controlado.
10. Reiniciar Python y actualizar nuevamente.

## Reemplazar el Modelo

1. Detener el microservicio.
2. Reemplazar `ml-sales-service/model/modelo_ventas_productos.joblib`.
3. Ejecutar `python scripts/inspect_model.py`.
4. Confirmar que las variables esperadas no cambiaron.
5. Reiniciar el servicio.
6. Probar `/health` y `/predict`.

Si cambian las variables del pipeline, primero hay que actualizar Node y React con una nueva version controlada.

## Cache

Node guarda una cache en memoria por `SALES_PREDICTION_CACHE_MS` milisegundos. Para invalidarla desde la interfaz, usa el boton de actualizar, que llama:

```http
GET /api/admin/sales-predictions?refresh=true
```

## Verificar Modelo Activo

```bash
curl http://127.0.0.1:8001/health
python ml-sales-service/scripts/inspect_model.py
```

## Errores Comunes

- `503` desde Node: Python apagado, URL incorrecta o clave faltante.
- `401` desde Python: falta o no coincide `X-ML-API-Key`.
- `400` desde Python: faltan variables o hay valores negativos.
- Predicciones en cero: el modelo devolvio valor negativo y el servicio lo ajusto a cero, o el historial del producto no tiene demanda.

## Seguridad

No subir secretos. El `.joblib` solo debe venir de una fuente confiable porque `joblib.load` deserializa objetos Python ejecutables.
