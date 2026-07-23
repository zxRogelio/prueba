import { sequelize } from "../../config/sequelize.js";
import {
  displayPath,
  loadActiveProductsFromDatabase,
  PRODUCT_EXPORT_HEADERS,
  PRODUCTS_EXPORT_FILE,
  writeCsv,
} from "./common.js";

async function main() {
  try {
    await sequelize.authenticate();

    const products = await loadActiveProductsFromDatabase();

    await writeCsv(PRODUCTS_EXPORT_FILE, PRODUCT_EXPORT_HEADERS, products);

    console.log("Exportacion de productos activos completada");
    console.log(`Productos activos encontrados: ${products.length}`);
    console.log(`Archivo generado: ${displayPath(PRODUCTS_EXPORT_FILE)}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error en exportActiveProducts:", error);
  process.exit(1);
});
