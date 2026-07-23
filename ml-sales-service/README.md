# Titanium Sales ML Service

Microservicio Flask que carga el pipeline real `modelo_ventas_productos.joblib` y expone predicciones mensuales de unidades vendidas por producto.

## Arquitectura

```text
React admin
  -> Backend Node/Express /api/admin/sales-predictions
  -> Flask /predict
  -> model/modelo_ventas_productos.joblib
```

El frontend nunca debe llamar este servicio directamente. El servicio tampoco se conecta a PostgreSQL; recibe las variables ya calculadas por el backend.

## Modelo Detectado

- Archivo: `model/modelo_ventas_productos.joblib`
- Tipo: `Pipeline`
- Pasos: `preprocesamiento`, `modelo`
- Estimador final: `RandomForestRegressor`
- Variables:
  - `producto`
  - `ventas_mes_anterior`
  - `promedio_movil_ventas_3_meses`
  - `promedio_movil_ventas_6_meses`
  - `promedio_movil_ventas_12_meses`
  - `vistas_producto_mes_anterior`
  - `promedio_movil_vistas_3_meses`

`productId` solo viaja como referencia de respuesta y no entra al modelo.

## Variables

```text
MODEL_PATH=model/modelo_ventas_productos.joblib
ML_API_KEY=change_this_value
MODEL_VERSION=1.0
HOST=127.0.0.1
PORT=8001
LOG_LEVEL=INFO
OMP_NUM_THREADS=1
OPENBLAS_NUM_THREADS=1
MKL_NUM_THREADS=1
NUMEXPR_NUM_THREADS=1
```

`ML_API_KEY` es obligatoria para `/predict`. No la publiques en el frontend.

## Instalacion Local

Windows PowerShell:

```powershell
cd ml-sales-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:ML_API_KEY="dev-secret"
python scripts/inspect_model.py
python app.py
```

Linux/macOS:

```bash
cd ml-sales-service
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export ML_API_KEY="dev-secret"
python scripts/inspect_model.py
python app.py
```

## Endpoints

### Salud

```bash
curl http://127.0.0.1:8001/health
```

Respuesta:

```json
{
  "ok": true,
  "service": "titanium-sales-ml",
  "modelLoaded": true,
  "modelName": "RandomForestRegressor",
  "modelVersion": "1.0"
}
```

### Prediccion

```bash
curl -X POST http://127.0.0.1:8001/predict \
  -H "Content-Type: application/json" \
  -H "X-ML-API-Key: dev-secret" \
  -d '{
    "records": [
      {
        "productId": 15,
        "producto": "Creatina Monohidratada 300 g",
        "ventas_mes_anterior": 18,
        "promedio_movil_ventas_3_meses": 17.33,
        "promedio_movil_ventas_6_meses": 16.5,
        "promedio_movil_ventas_12_meses": 15.75,
        "vistas_producto_mes_anterior": 90,
        "promedio_movil_vistas_3_meses": 82.67
      }
    ]
  }'
```

## Pruebas

```bash
python -m pytest
```

Las pruebas unitarias inyectan modelos falsos pequenos. El modelo real se valida con:

```bash
python scripts/inspect_model.py
```

## Render

Usa `render.yaml.example` como referencia manual. Configuracion sugerida:

- Root directory: `ml-sales-service`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 1 --timeout 120`
- Variables secretas: `ML_API_KEY`
- Variables de control de hilos: `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `NUMEXPR_NUM_THREADS=1`

## Errores Comunes

- `ML_API_KEY no esta configurada`: define la variable antes de pedir `/predict`.
- `No existe el archivo de modelo`: coloca el `.joblib` en `model/modelo_ventas_productos.joblib` o configura `MODEL_PATH`.
- `No se pudieron generar las predicciones`: revisa que el payload use exactamente los nombres de variables del modelo.

## Seguridad

Los archivos `.joblib` ejecutan codigo Python durante la deserializacion. Carga solamente modelos generados por fuentes confiables del proyecto.
