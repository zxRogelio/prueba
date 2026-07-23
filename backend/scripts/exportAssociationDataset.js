import { Op } from "sequelize";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "../config/sequelize.js";
import { Order, OrderItem, Product, User } from "../models/index.js";

const SEED_NAME = "association-rules-v1";
const ORDER_PREFIX = "AR-2026-";
const EXPECTED_SYNTHETIC_ORDERS = 2000;
const MAX_PRODUCTS_PER_TRANSACTION = 5;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.resolve(SCRIPT_DIR, "../storage/exports");

const EXPORT_FILES = Object.freeze({
  transactionsJson: path.join(EXPORT_DIR, "association_transactions.json"),
  transactionsCsv: path.join(EXPORT_DIR, "association_transactions.csv"),
  transactionsLongCsv: path.join(
    EXPORT_DIR,
    "association_transactions_long.csv"
  ),
  summaryJson: path.join(
    EXPORT_DIR,
    "association_transactions_summary.json"
  ),
});

function associationOrderWhere() {
  return {
    status: "paid",
    orderNumber: {
      [Op.like]: `${ORDER_PREFIX}%`,
    },
    metadata: {
      [Op.contains]: {
        seedName: SEED_NAME,
      },
    },
  };
}

function compareNames(left, right) {
  const normalizedLeft = left
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const normalizedRight = right
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cleanProductName(value) {
  return String(value ?? "").trim();
}

function isoDate(value) {
  return new Date(value).toISOString();
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(headers, rows) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  return `${lines.join("\n")}\n`;
}

async function atomicWriteUtf8(filePath, content) {
  const temporaryPath = `${filePath}.tmp`;

  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}

async function loadAssociationOrders() {
  return Order.findAll({
    attributes: ["id", "orderNumber", "userId", "createdAt"],
    where: associationOrderWhere(),
    include: [
      {
        model: OrderItem,
        as: "items",
        attributes: [
          "id",
          "orderId",
          "itemType",
          "productId",
          "itemNameSnapshot",
          "categorySnapshot",
          "brandSnapshot",
          "productTypeSnapshot",
          "quantity",
        ],
        required: false,
        where: {
          itemType: "product",
          productId: {
            [Op.ne]: null,
          },
        },
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id_producto", "name"],
            required: false,
          },
        ],
      },
    ],
    order: [
      ["createdAt", "ASC"],
      ["orderNumber", "ASC"],
      [{ model: OrderItem, as: "items" }, "itemNameSnapshot", "ASC"],
      [{ model: OrderItem, as: "items" }, "productId", "ASC"],
    ],
  });
}

function getItemProductName(item, order, warnings) {
  const snapshotName = cleanProductName(item.itemNameSnapshot);

  if (snapshotName) {
    return snapshotName;
  }

  const productName = cleanProductName(item.product?.name);

  if (productName) {
    return productName;
  }

  warnings.itemsWithoutProductName.push({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderItemId: item.id,
    productId: item.productId,
  });

  return null;
}

function buildDatasets(orders) {
  const warnings = {
    excludedEmptyOrders: [],
    itemsWithoutProductName: [],
  };
  const transactions = [];
  const groupedRows = [];
  const longRows = [];
  const customerIds = new Set();
  const productNames = new Set();
  const productTransactionCounts = new Map();
  let rawOrderItems = 0;

  for (const orderModel of orders) {
    const order = orderModel.get({ plain: true });
    const productsByName = new Map();

    for (const item of order.items ?? []) {
      rawOrderItems += 1;

      if (
        item.itemType !== "product" ||
        item.productId == null ||
        Number(item.quantity) !== 1
      ) {
        continue;
      }

      const productName = getItemProductName(item, order, warnings);

      if (!productName || productsByName.has(productName)) {
        continue;
      }

      productsByName.set(productName, {
        productId: item.productId,
        productName,
        category: cleanProductName(item.categorySnapshot),
        brand: cleanProductName(item.brandSnapshot),
        productType: cleanProductName(item.productTypeSnapshot),
        quantity: Number(item.quantity),
      });
    }

    const products = [...productsByName.values()].sort((left, right) =>
      compareNames(left.productName, right.productName)
    );

    if (products.length === 0) {
      warnings.excludedEmptyOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      continue;
    }

    if (products.length > MAX_PRODUCTS_PER_TRANSACTION) {
      throw new Error(
        `La orden ${order.orderNumber} contiene ${products.length} productos distintos; el maximo permitido es ${MAX_PRODUCTS_PER_TRANSACTION}.`
      );
    }

    const transaction = products.map((product) => product.productName);
    const createdAt = isoDate(order.createdAt);

    transactions.push(transaction);
    customerIds.add(order.userId);

    for (const productName of transaction) {
      productNames.add(productName);
      productTransactionCounts.set(
        productName,
        (productTransactionCounts.get(productName) ?? 0) + 1
      );
    }

    groupedRows.push({
      transaction_id: order.id,
      order_number: order.orderNumber,
      user_id: order.userId,
      created_at: createdAt,
      products: JSON.stringify(transaction),
      product_count: transaction.length,
    });

    for (const product of products) {
      longRows.push({
        transaction_id: order.id,
        order_number: order.orderNumber,
        user_id: order.userId,
        created_at: createdAt,
        product_id: product.productId,
        product_name: product.productName,
        category: product.category,
        brand: product.brand,
        product_type: product.productType,
        quantity: product.quantity,
      });
    }
  }

  return {
    transactions,
    groupedRows,
    longRows,
    warnings,
    customerIds,
    productNames,
    productTransactionCounts,
    rawOrderItems,
  };
}

function buildSummary({ orders, datasets, generatedAt }) {
  const transactionsByProductCount = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let totalProducts = 0;
  let minimumProductsPerTransaction = 0;
  let maximumProductsPerTransaction = 0;

  for (const transaction of datasets.transactions) {
    const productCount = transaction.length;

    totalProducts += productCount;
    transactionsByProductCount[productCount] =
      (transactionsByProductCount[productCount] ?? 0) + 1;

    if (
      minimumProductsPerTransaction === 0 ||
      productCount < minimumProductsPerTransaction
    ) {
      minimumProductsPerTransaction = productCount;
    }

    if (productCount > maximumProductsPerTransaction) {
      maximumProductsPerTransaction = productCount;
    }
  }

  const totalTransactions = datasets.transactions.length;
  const averageProductsPerTransaction =
    totalTransactions > 0
      ? Number((totalProducts / totalTransactions).toFixed(2))
      : 0;
  const mostFrequentProducts = [...datasets.productTransactionCounts.entries()]
    .map(([productName, transactionCount]) => ({
      productName,
      transactionCount,
      support:
        totalTransactions > 0
          ? Number((transactionCount / totalTransactions).toFixed(6))
          : 0,
    }))
    .sort((left, right) => {
      if (right.transactionCount !== left.transactionCount) {
        return right.transactionCount - left.transactionCount;
      }

      return compareNames(left.productName, right.productName);
    })
    .slice(0, 20);

  return {
    generatedAt,
    seedName: SEED_NAME,
    orderPrefix: ORDER_PREFIX,
    totalOrdersFound: orders.length,
    totalTransactionsExported: totalTransactions,
    totalOrderItems: datasets.rawOrderItems,
    uniqueProducts: datasets.productNames.size,
    uniqueCustomers: datasets.customerIds.size,
    minimumProductsPerTransaction,
    maximumProductsPerTransaction,
    averageProductsPerTransaction,
    transactionsByProductCount,
    excludedEmptyOrders: datasets.warnings.excludedEmptyOrders,
    itemsWithoutProductName: datasets.warnings.itemsWithoutProductName,
    mostFrequentProducts,
  };
}

function countCsvDataRows(content) {
  const records = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (insideQuotes && content[index + 1] === '"') {
        current += character;
        current += content[index + 1];
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      current += character;
      continue;
    }

    if (character === "\n" && !insideQuotes) {
      records.push(current.replace(/\r$/, ""));
      current = "";
      continue;
    }

    current += character;
  }

  if (insideQuotes) {
    throw new Error("CSV invalido: comillas sin cerrar.");
  }

  if (current.length > 0) {
    records.push(current.replace(/\r$/, ""));
  }

  return Math.max(0, records.filter((record) => record.length > 0).length - 1);
}

async function readProductSnapshot() {
  const products = await Product.findAll({
    attributes: ["id_producto", "stock", "updatedAt"],
    order: [["id_producto", "ASC"]],
    raw: true,
  });

  return products.map((product) => ({
    id_producto: product.id_producto,
    stock: Number(product.stock),
    updatedAt: isoDate(product.updatedAt),
  }));
}

async function captureDatabaseReadSnapshot(orderIds) {
  const [
    totalOrders,
    totalOrderItems,
    totalUsers,
    totalProducts,
    syntheticOrders,
    syntheticOrderItems,
    productSnapshot,
  ] = await Promise.all([
    Order.count(),
    OrderItem.count(),
    User.count(),
    Product.count(),
    Order.count({ where: associationOrderWhere() }),
    orderIds.length > 0
      ? OrderItem.count({
          where: {
            orderId: {
              [Op.in]: orderIds,
            },
          },
        })
      : 0,
    readProductSnapshot(),
  ]);

  return {
    totalOrders,
    totalOrderItems,
    totalUsers,
    totalProducts,
    syntheticOrders,
    syntheticOrderItems,
    productSnapshot,
  };
}

function assertDatabaseUnchanged(beforeSnapshot, afterSnapshot) {
  const before = JSON.stringify(beforeSnapshot);
  const after = JSON.stringify(afterSnapshot);

  if (before !== after) {
    throw new Error("La validacion detecto cambios en PostgreSQL durante la exportacion.");
  }
}

async function validateWrittenFiles(datasets) {
  const [
    transactionsContent,
    groupedCsvContent,
    longCsvContent,
    summaryContent,
  ] = await Promise.all([
    readFile(EXPORT_FILES.transactionsJson, "utf8"),
    readFile(EXPORT_FILES.transactionsCsv, "utf8"),
    readFile(EXPORT_FILES.transactionsLongCsv, "utf8"),
    readFile(EXPORT_FILES.summaryJson, "utf8"),
  ]);
  const parsedTransactions = JSON.parse(transactionsContent);

  if (!Array.isArray(parsedTransactions)) {
    throw new Error("association_transactions.json debe contener un arreglo.");
  }

  for (const [index, transaction] of parsedTransactions.entries()) {
    if (!Array.isArray(transaction)) {
      throw new Error(`La transaccion ${index + 1} no es un arreglo.`);
    }

    if (transaction.length === 0) {
      throw new Error(`La transaccion ${index + 1} esta vacia.`);
    }

    if (transaction.length > MAX_PRODUCTS_PER_TRANSACTION) {
      throw new Error(
        `La transaccion ${index + 1} contiene mas de ${MAX_PRODUCTS_PER_TRANSACTION} productos.`
      );
    }

    const uniqueNames = new Set(transaction);

    if (uniqueNames.size !== transaction.length) {
      throw new Error(`La transaccion ${index + 1} contiene nombres duplicados.`);
    }
  }

  const groupedRows = countCsvDataRows(groupedCsvContent);
  const longRows = countCsvDataRows(longCsvContent);
  const totalProducts = parsedTransactions.reduce(
    (sum, transaction) => sum + transaction.length,
    0
  );

  if (groupedRows !== parsedTransactions.length) {
    throw new Error(
      `El CSV agrupado tiene ${groupedRows} filas; se esperaban ${parsedTransactions.length}.`
    );
  }

  if (longRows !== totalProducts) {
    throw new Error(
      `El CSV largo tiene ${longRows} filas; se esperaban ${totalProducts}.`
    );
  }

  JSON.parse(summaryContent);

  if (parsedTransactions.length !== datasets.transactions.length) {
    throw new Error("El JSON leido no coincide con las transacciones generadas.");
  }

  return {
    jsonParseOk: true,
    mainJsonIsArray: true,
    everyTransactionIsArray: true,
    noEmptyTransactions: true,
    noTransactionAboveFiveProducts: true,
    noDuplicateNamesInsideTransaction: true,
    groupedCsvRows: groupedRows,
    longCsvRows: longRows,
    utf8ReadOk: true,
  };
}

async function writeExportFiles(datasets, summary) {
  await mkdir(EXPORT_DIR, { recursive: true });

  const groupedHeaders = [
    "transaction_id",
    "order_number",
    "user_id",
    "created_at",
    "products",
    "product_count",
  ];
  const longHeaders = [
    "transaction_id",
    "order_number",
    "user_id",
    "created_at",
    "product_id",
    "product_name",
    "category",
    "brand",
    "product_type",
    "quantity",
  ];

  await atomicWriteUtf8(
    EXPORT_FILES.transactionsJson,
    `${JSON.stringify(datasets.transactions, null, 2)}\n`
  );
  await atomicWriteUtf8(
    EXPORT_FILES.transactionsCsv,
    toCsv(groupedHeaders, datasets.groupedRows)
  );
  await atomicWriteUtf8(
    EXPORT_FILES.transactionsLongCsv,
    toCsv(longHeaders, datasets.longRows)
  );
  await atomicWriteUtf8(
    EXPORT_FILES.summaryJson,
    `${JSON.stringify(summary, null, 2)}\n`
  );
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath);
}

function printSummary(summary, validation) {
  console.log(`Ordenes sinteticas encontradas: ${summary.totalOrdersFound}`);

  if (summary.totalOrdersFound !== EXPECTED_SYNTHETIC_ORDERS) {
    console.warn(
      `Advertencia: se esperaban ${EXPECTED_SYNTHETIC_ORDERS} ordenes sinteticas y se encontraron ${summary.totalOrdersFound}.`
    );
  }

  console.log(`Transacciones exportadas: ${summary.totalTransactionsExported}`);
  console.log(`OrderItems procesados: ${summary.totalOrderItems}`);
  console.log(`Clientes unicos: ${summary.uniqueCustomers}`);
  console.log(`Productos unicos: ${summary.uniqueProducts}`);
  console.log(
    `Minimo de productos por transaccion: ${summary.minimumProductsPerTransaction}`
  );
  console.log(
    `Maximo de productos por transaccion: ${summary.maximumProductsPerTransaction}`
  );
  console.log(
    `Promedio de productos por transaccion: ${summary.averageProductsPerTransaction.toFixed(2)}`
  );
  console.log(
    `Transacciones con 1 producto: ${summary.transactionsByProductCount[1]}`
  );
  console.log(
    `Transacciones con 2 productos: ${summary.transactionsByProductCount[2]}`
  );
  console.log(
    `Transacciones con 3 productos: ${summary.transactionsByProductCount[3]}`
  );
  console.log(
    `Transacciones con 4 productos: ${summary.transactionsByProductCount[4]}`
  );
  console.log(
    `Transacciones con 5 productos: ${summary.transactionsByProductCount[5]}`
  );
  console.log(`Filas CSV agrupado: ${validation.groupedCsvRows}`);
  console.log(`Filas CSV largo: ${validation.longCsvRows}`);
  console.log("Validaciones: OK");
  console.log("\nArchivos generados:");

  for (const filePath of Object.values(EXPORT_FILES)) {
    console.log(relativePath(filePath));
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Conexion correcta");

    const orders = await loadAssociationOrders();
    const orderIds = orders.map((order) => order.id);
    const beforeSnapshot = await captureDatabaseReadSnapshot(orderIds);
    const datasets = buildDatasets(orders);
    const summary = buildSummary({
      orders,
      datasets,
      generatedAt: new Date().toISOString(),
    });

    await writeExportFiles(datasets, summary);

    const validation = await validateWrittenFiles(datasets);
    const afterSnapshot = await captureDatabaseReadSnapshot(orderIds);
    assertDatabaseUnchanged(beforeSnapshot, afterSnapshot);
    printSummary(summary, validation);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Error al exportar dataset de asociacion:", error);
  process.exit(1);
});
