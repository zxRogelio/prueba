# Documentacion: recomendacion de productos con similitud del coseno

## 1. Objetivo

El objetivo fue crear un sistema de recomendacion de productos usando la teoria de similitud del coseno.

Primero se preparo y valido una libreta para probar el metodo con un dataset exportado desde la base de datos. Despues, la misma logica se implemento en el backend y se conecto a la pagina de detalle del producto en el frontend.

El resultado final permite mostrar productos similares en la seccion:

```txt
Tambien puede interesarte
```

## 2. Dataset usado

El dataset se guardo en:

```txt
docs/similitud_de_coseno_Productos.csv
```

El archivo contiene 160 productos y estas columnas:

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

La columna mas importante para el modelo es:

```txt
texto_recomendacion
```

Esa columna une la informacion descriptiva de cada producto para poder convertirla en vectores.

## 3. Consulta SQL para construir el dataset

La consulta base recomendada fue:

```sql
SELECT
  p.id_producto,
  p.name AS producto,
  p."productType",
  c.name AS "categoryName",
  b.name AS "brandName",
  p.price,
  p.description,
  p.features,
  p."supplementFlavor",
  p."supplementPresentation",
  p."supplementServings",
  p."apparelSize",
  p."apparelColor",
  p."apparelMaterial",
  CONCAT_WS(' ',
    p.name,
    p."productType",
    c.name,
    b.name,
    p.price::text,
    p.description,
    p.features,
    p."supplementFlavor",
    p."supplementPresentation",
    p."supplementServings",
    p."apparelSize",
    p."apparelColor",
    p."apparelMaterial"
  ) AS texto_recomendacion
FROM core."Products" p
LEFT JOIN core."Brands" b
  ON p."brandId" = b.id_marca
LEFT JOIN core."Categories" c
  ON p."categoryId" = c.id_categoria
WHERE p.status = 'Activo'
ORDER BY p.id_producto ASC;
```

Esta consulta trae dos cosas:

```txt
Campos separados       -> sirven para mostrar informacion del producto
texto_recomendacion    -> sirve para calcular similitud
```

## 4. Libreta creada

La libreta se creo en:

```txt
docs/recomendacion_similitud_coseno.ipynb
```

La libreta hace lo siguiente:

1. Importa librerias.
2. Carga el CSV.
3. Limpia valores `NULL`.
4. Valida columnas requeridas.
5. Construye un campo `texto_modelo`.
6. Vectoriza los productos con `TfidfVectorizer`.
7. Calcula similitud del coseno con `cosine_similarity`.
8. Permite recomendar por `id_producto`.
9. Permite recomendar por texto libre.

Dependencias usadas en la libreta:

```bash
pip install pandas numpy scikit-learn
```

## 5. Como funciona el metodo

Cada producto se convierte en texto usando sus datos principales:

```txt
nombre
tipo de producto
categoria
marca
precio
descripcion
caracteristicas
sabor
presentacion
porciones
talla
color
material
```

Luego ese texto se convierte en un vector numerico usando TF-IDF.

Despues se compara el vector del producto actual contra los vectores de los demas productos usando similitud del coseno.

Conceptualmente:

```txt
similitud = coseno(vector_producto_actual, vector_otro_producto)
```

Mientras mas cercano a `1` sea el resultado, mas parecido es el producto.

## 6. Prueba hecha en la libreta

La libreta se valido con el dataset real:

```txt
Productos cargados: 160
Matriz TF-IDF: 160 productos x 2587 terminos
Matriz de similitud: 160 x 160
```

Tambien se probaron recomendaciones por producto y por busqueda.

Ejemplo de busqueda:

```python
recomendar_por_busqueda("proteina chocolate", top_n=5, product_type="Suplementacion")
```

## 7. Implementacion en backend

Para llevarlo al sistema real, no se uso el CSV directamente.

En su lugar, el backend toma los productos activos desde PostgreSQL y calcula las recomendaciones en vivo.

Archivo creado:

```txt
backend/services/productRecommendationService.js
```

Este servicio hace:

1. Consulta productos activos.
2. Incluye marca, categoria e imagenes.
3. Construye el texto de recomendacion.
4. Tokeniza el texto.
5. Elimina palabras comunes.
6. Crea terminos simples y bigramas.
7. Calcula TF-IDF.
8. Calcula similitud del coseno.
9. Ordena los productos por similitud.
10. Devuelve el top de recomendaciones.

Se uso JavaScript puro para evitar agregar dependencias nuevas al backend.

## 8. Endpoint creado

Se agrego un controlador publico en:

```txt
backend/controllers/productController.js
```

Funcion agregada:

```js
getPublicProductRecommendations
```

Se agrego la ruta en:

```txt
backend/routes/public/productRoutes.js
```

Endpoint para detalle de producto:

```txt
GET /api/products/:id/recommendations?limit=4
```

Ejemplo:

```txt
GET http://localhost:5000/api/products/1/recommendations?limit=4
```

Respuesta de ejemplo:

```json
[
  {
    "id_producto": 134,
    "name": "Optimum Nutrition Whey Gold Double Chocolate 2 lb",
    "productType": "Suplementacion",
    "score_similitud": 0.380635
  }
]
```

La respuesta real incluye tambien los datos necesarios para mostrar el producto en el frontend.

Tambien se agrego un endpoint para el carrito:

```txt
POST /api/products/recommendations
```

Body de ejemplo:

```json
{
  "productIds": [4],
  "limit": 2
}
```

Este endpoint toma los productos que ya estan en el carrito, excluye esos mismos productos de la respuesta y recomienda productos reales de la base de datos usando similitud promedio.

## 9. Implementacion en frontend

Se actualizo:

```txt
frontend/src/pages/visitor/catalogData.ts
```

Se agrego la funcion:

```ts
fetchCatalogProductRecommendations(productId, limit)
```

Esta funcion consume:

```txt
/products/:id/recommendations
```

Tambien se agrego el campo:

```ts
similarityScore
```

Ese campo viene desde:

```txt
score_similitud
```

Tambien se agrego:

```ts
fetchCartProductRecommendations(productIds, limit)
```

Esta funcion consume:

```txt
POST /products/recommendations
```

## 10. Conexion con la pagina de detalle

Se actualizo:

```txt
frontend/src/pages/visitor/CatalogProductPage.tsx
```

Antes solo cargaba el producto:

```ts
fetchCatalogProductById(productId)
```

Ahora carga producto y recomendaciones al mismo tiempo:

```ts
const [nextProduct, nextRecommendations] = await Promise.all([
  fetchCatalogProductById(productId),
  fetchCatalogProductRecommendations(productId, 4),
]);
```

Despues pasa las recomendaciones al componente:

```tsx
<CatalogProductDetail
  product={product}
  recommendations={recommendations}
  ...
/>
```

## 11. Vista donde se muestran

Se actualizo:

```txt
frontend/src/components/catalog/CatalogProductDetail.tsx
```

Antes la seccion `Tambien puede interesarte` usaba reglas locales del carrito.

Ahora recibe recomendaciones reales del backend:

```tsx
recommendations: CatalogProductView[]
```

Y muestra hasta 4 productos:

```ts
const visibleRecommendations = recommendations.slice(0, 4);
```

Cada recomendacion muestra:

```txt
imagen
categoria
nombre
precio
porcentaje de coincidencia
boton para agregar al carrito
```

## 12. Estilos agregados

Se actualizo:

```txt
frontend/src/components/catalog/CatalogProductDetail.module.css
```

Se agrego una lista responsive:

```css
.detailRecommendationList {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
```

En pantallas pequenas pasa a una columna:

```css
@media (max-width: 860px) {
  .detailRecommendationList {
    grid-template-columns: 1fr;
  }
}
```

## 13. Correccion en carrito de compras

El carrito tenia recomendaciones simuladas en:

```txt
frontend/src/data/cartRecommendations.ts
```

Ese archivo fue eliminado porque contenia productos falsos como:

```txt
rec-botella
rec-creatina
rec-shaker
```

Ahora el carrito usa el endpoint real:

```txt
POST /api/products/recommendations
```

Archivo actualizado:

```txt
frontend/src/components/cart/CartDrawer.tsx
```

La seccion del carrito ahora muestra:

```txt
Productos similares a los que agregaste.
```

Y cada recomendacion muestra:

```txt
imagen
nombre
precio
porcentaje de coincidencia
boton para agregar al carrito
```

Ejemplo probado con el producto `4`:

```txt
9  - Playera Fit Training
85 - Gymshark Apex Training Tee Blanco
```

## 14. Archivos modificados

Backend:

```txt
backend/services/productRecommendationService.js
backend/controllers/productController.js
backend/routes/public/productRoutes.js
```

Frontend:

```txt
frontend/src/pages/visitor/catalogData.ts
frontend/src/pages/visitor/CatalogProductPage.tsx
frontend/src/components/catalog/CatalogProductDetail.tsx
frontend/src/components/catalog/CatalogProductDetail.module.css
frontend/src/components/cart/CartDrawer.tsx
frontend/src/components/cart/CartDrawer.css
```

Libreta y documentacion:

```txt
docs/recomendacion_similitud_coseno.ipynb
docs/similitud_de_coseno_Productos.csv
docs/documentacion_recomendacion_similitud_coseno.md
```

Archivo eliminado:

```txt
frontend/src/data/cartRecommendations.ts
```

## 15. Validaciones realizadas

Se valido la sintaxis del backend:

```bash
node --check backend/services/productRecommendationService.js
node --check backend/controllers/productController.js
node --check backend/routes/public/productRoutes.js
```

Se valido el frontend:

```bash
npm run build
```

Se probo el endpoint:

```txt
http://localhost:5000/api/products/1/recommendations?limit=4
```

Resultado probado:

```txt
134 - Optimum Nutrition Whey Gold Double Chocolate 2 lb
136 - Optimum Nutrition Whey Gold Cookies Cream 5 lb
135 - Optimum Nutrition Whey Gold Vanilla Ice Cream 2 lb
141 - Optimum Nutrition Gold Standard Pre Workout Fruit Punch
```

Se probo el endpoint del carrito:

```txt
POST http://localhost:5000/api/products/recommendations
```

Con body:

```json
{
  "productIds": [4],
  "limit": 2
}
```

Resultado probado:

```txt
9  - Playera Fit Training
85 - Gymshark Apex Training Tee Blanco
```

## 16. Como probarlo en el sitio

Con backend y frontend encendidos:

```txt
Backend:  http://localhost:5000
Frontend: http://127.0.0.1:5174
```

Abrir:

```txt
http://127.0.0.1:5174/catalogue/1
```

En la parte inferior del detalle debe aparecer:

```txt
Tambien puede interesarte
```

con productos similares calculados desde la base de datos.

Tambien se puede abrir el carrito despues de agregar un producto. La recomendacion del carrito ya no viene de datos simulados del frontend, sino del backend.

## 17. Resumen final

La libreta sirvio para comprobar que el metodo funcionaba con el dataset.

Despues se paso la logica al backend para que el sistema use datos reales de PostgreSQL.

Finalmente, el frontend consume el endpoint y muestra las recomendaciones en la pagina de detalle del producto.
