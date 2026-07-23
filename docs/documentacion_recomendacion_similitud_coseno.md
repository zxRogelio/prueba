# Documentacion: recomendaciones con libreta, Flask y pagina web

## 1. Objetivo

El objetivo es recomendar productos usando similitud del coseno, siguiendo un flujo de Machine Learning mas correcto:

```txt
Base de datos / CSV
        ↓
Libreta Jupyter
        ↓
Exportacion de artefactos del modelo
        ↓
API Flask de recomendaciones
        ↓
Backend Express del sistema
        ↓
Frontend React
```

La API Flask queda separada del backend principal. Flask se encarga del modelo; Express solo consulta Flask y completa los datos del producto desde PostgreSQL.

## 2. Dataset

Dataset usado:

```txt
docs/similitud_de_coseno_Productos.csv
```

Columnas:

```txt
id_producto
producto
productType
categoryName
brandName
price
description
features
supplementFlavor
supplementPresentation
supplementServings
apparelSize
apparelColor
apparelMaterial
texto_recomendacion
```

La columna `texto_recomendacion` une los datos importantes del producto para poder vectorizarlo.

## 3. Libreta

Libreta:

```txt
docs/recomendacion_similitud_coseno.ipynb
```

La libreta hace:

1. Carga el CSV.
2. Limpia valores `NULL`.
3. Valida columnas.
4. Construye `texto_modelo`.
5. Vectoriza con `TfidfVectorizer`.
6. Calcula similitud con `cosine_similarity`.
7. Prueba recomendaciones por producto y por texto.
8. Exporta artefactos para Flask.

Dependencias:

```bash
pip install pandas numpy scikit-learn scipy joblib
```

## 4. Artefactos exportados

La libreta y el script `ml_api/train_model.py` exportan:

```txt
ml_api/models/vectorizer.joblib
ml_api/models/matriz_tfidf.npz
ml_api/models/productos_recomendacion.json
ml_api/models/metadata.json
```

Esos archivos son el resultado del entrenamiento/vectorizacion:

```txt
vectorizer.joblib              -> vectorizador TF-IDF
matriz_tfidf.npz               -> matriz de productos vectorizados
productos_recomendacion.json   -> productos usados por el modelo
metadata.json                  -> resumen de exportacion
```

Los artefactos se generan con:

```bash
python ml_api/train_model.py
```

## 5. API Flask

Carpeta creada:

```txt
ml_api/
```

Archivos principales:

```txt
ml_api/app.py
ml_api/train_model.py
ml_api/requirements.txt
ml_api/README.md
ml_api/render.yaml
```

Flask carga los artefactos y expone endpoints de recomendacion.

Ejecutar local:

```bash
cd ml_api
pip install -r requirements.txt
python train_model.py
python app.py
```

URL local:

```txt
http://localhost:5050
```

## 6. Endpoints Flask

Health check:

```txt
GET /health
```

Recomendaciones por producto:

```txt
GET /recommendations/product/1?limit=4
```

Recomendaciones por carrito:

```txt
POST /recommendations/cart
```

Body:

```json
{
  "productIds": [4],
  "limit": 2
}
```

Flask devuelve IDs y score:

```json
{
  "recommendations": [
    {
      "id_producto": 9,
      "producto": "Playera Fit Training",
      "score_similitud": 0.255178
    }
  ]
}
```

## 7. Backend Express

El backend principal ya no calcula la similitud.

Archivo:

```txt
backend/services/productRecommendationService.js
```

Ahora ese servicio:

1. Llama a Flask.
2. Recibe `id_producto` y `score_similitud`.
3. Busca esos productos en PostgreSQL.
4. Devuelve productos completos al frontend.

Esto es importante porque Flask no tiene por que saber de imagenes, stock o relaciones de Sequelize. Flask solo recomienda; Express arma la respuesta final para la tienda.

Variable de entorno agregada:

```txt
ML_RECOMMENDATION_API_URL=
```

En local:

```txt
ML_RECOMMENDATION_API_URL=http://localhost:5050
```

En Render seria la URL publica del servicio Flask.

## 8. Endpoints Express usados por el frontend

Detalle de producto:

```txt
GET /api/products/:id/recommendations?limit=4
```

Carrito:

```txt
POST /api/products/recommendations
```

El frontend sigue usando Express. Express internamente consulta Flask.

## 9. Frontend React

Archivos actualizados:

```txt
frontend/src/pages/visitor/catalogData.ts
frontend/src/pages/visitor/CatalogProductPage.tsx
frontend/src/components/catalog/CatalogProductDetail.tsx
frontend/src/components/catalog/CatalogProductDetail.module.css
frontend/src/components/cart/CartDrawer.tsx
frontend/src/components/cart/CartDrawer.css
```

Funciones nuevas:

```ts
fetchCatalogProductRecommendations(productId, limit)
fetchCartProductRecommendations(productIds, limit)
```

La pagina de detalle muestra:

```txt
Tambien puede interesarte
```

El carrito muestra:

```txt
Recomendado para ti
Productos similares a los que agregaste.
```

## 10. Datos simulados eliminados

Se elimino:

```txt
frontend/src/data/cartRecommendations.ts
```

Ese archivo tenia recomendaciones simuladas como `rec-botella`, `rec-creatina`, `rec-shaker`, etc.

Ahora las recomendaciones del carrito vienen del modelo Flask.

## 11. Validaciones realizadas

Entrenamiento/exportacion:

```bash
python ml_api/train_model.py
```

Resultado:

```txt
products_count: 160
terms_count: 2619
```

Prueba Flask:

```txt
GET /health
GET /recommendations/product/1?limit=4
POST /recommendations/cart
```

Prueba backend:

```bash
node --check backend/services/productRecommendationService.js
node --check backend/controllers/productController.js
node --check backend/routes/public/productRoutes.js
```

Prueba frontend:

```bash
npm run build
```

## 12. Despliegue en Render

Si vas a subir esto a Render, debes subir el repositorio con estas carpetas:

```txt
backend/
frontend/
docs/
ml_api/
```

Para la API Flask debes crear un Web Service separado.

Configuracion recomendada en Render para Flask:

```txt
Environment: Python
Build Command: pip install -r ml_api/requirements.txt && python ml_api/train_model.py
Start Command: gunicorn --chdir ml_api app:app
```

Variable para Flask:

```txt
DATASET_PATH=docs/similitud_de_coseno_Productos.csv
```

Render dara una URL parecida a:

```txt
https://titanium-recommendations-api.onrender.com
```

Luego en el backend Express debes configurar:

```txt
ML_RECOMMENDATION_API_URL=https://titanium-recommendations-api.onrender.com
```

## 13. Que se sube y que no se sube

Si usas el build command anterior, debes subir:

```txt
ml_api/app.py
ml_api/train_model.py
ml_api/requirements.txt
docs/similitud_de_coseno_Productos.csv
```

No es obligatorio subir:

```txt
ml_api/models/
```

porque Render puede generar esos archivos durante el build con:

```bash
python ml_api/train_model.py
```

En este proyecto `ml_api/models/` esta ignorado por Git para evitar subir archivos generados.

## 14. Resumen

La libreta sirve para experimentar y exportar el modelo.

Flask sirve el modelo como API separada.

Express consume Flask y completa los productos desde PostgreSQL.

React muestra las recomendaciones en detalle de producto y carrito.

