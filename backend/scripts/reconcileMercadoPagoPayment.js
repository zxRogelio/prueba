import { parseArgs } from "node:util";
import { sequelize } from "../config/sequelize.js";
import {
  getMercadoPagoErrorDiagnostics,
  reconcileMercadoPagoPayment,
} from "../services/mercadoPagoCheckoutService.js";
import { getReconciliationDatabaseId } from "../services/mercadoPagoReconciliationAuthorization.js";

async function readOperatorToken() {
  // Se recibe por una tuberia protegida, nunca por argv, .env ni entrada visible.
  if (process.stdin.isTTY) throw new Error("El token administrativo requiere stdin sin terminal.");
  let token = "";
  for await (const chunk of process.stdin) {
    token += chunk.toString();
    if (token.length > 16384) throw new Error("Entrada administrativa invalida.");
  }
  return token.trim();
}

try {
  const { values } = parseArgs({
    options: {
      "order-id": { type: "string" },
      "provider-payment-id": { type: "string" },
      actor: { type: "string" },
      apply: { type: "boolean", default: false },
      "operator-token-stdin": { type: "boolean", default: false },
      "confirm-order": { type: "string" },
      "confirm-database": { type: "string" },
      "show-database-id": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values["show-database-id"]) {
    if (values.apply) throw new Error("Mostrar el destino no permite aplicar cambios.");
    console.log(JSON.stringify({ databaseId: getReconciliationDatabaseId(sequelize.config) }));
  } else {
    if (values.apply && (!values["operator-token-stdin"] || !values["confirm-order"] || !values["confirm-database"])) {
      throw new Error("--apply requiere sesion por stdin y confirmacion de orden y base.");
    }
    if (!values.apply && values["operator-token-stdin"]) {
      throw new Error("La vista previa no necesita un token administrativo.");
    }
    const result = await reconcileMercadoPagoPayment({
      orderId: values["order-id"],
      providerPaymentId: values["provider-payment-id"],
      dryRun: !values.apply,
      requestedBy: values.actor,
      operatorToken: values.apply ? await readOperatorToken() : null,
      approval: values.apply ? { orderId: values["confirm-order"], databaseId: values["confirm-database"] } : null,
    });
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error("Reconciliacion no aplicada:", getMercadoPagoErrorDiagnostics(error));
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
