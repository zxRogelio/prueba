# API Flask de recomendaciones

Esta API carga artefactos exportados desde el dataset de productos y devuelve recomendaciones por similitud del coseno.

## Ejecutar local

Desde la raiz del proyecto:

```bash
cd ml_api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
python app.py
```

La API queda en:

```txt
http://localhost:5050
```

## Endpoints

```txt
GET /health
GET /recommendations/product/<id>?limit=4
POST /recommendations/cart
```

Body para carrito:

```json
{
  "productIds": [1, 3],
  "limit": 2
}
```

## Artefactos generados

```txt
ml_api/models/vectorizer.joblib
ml_api/models/matriz_tfidf.npz
ml_api/models/productos_recomendacion.json
ml_api/models/metadata.json
```

Estos archivos se generan con:

```bash
python ml_api/train_model.py
```

## Render

Crear un Web Service separado para esta API Flask.

Configuracion recomendada:

```txt
Environment: Python
Build Command: pip install -r ml_api/requirements.txt && python ml_api/train_model.py
Start Command: gunicorn --chdir ml_api app:app
```

Variable de entorno:

```txt
DATASET_PATH=docs/similitud_de_coseno_Productos.csv
```

Despues, en el backend Express configurar:

```txt
ML_RECOMMENDATION_API_URL=https://tu-api-flask.onrender.com
```
